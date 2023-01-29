import {AbstractMesh, Matrix, Quaternion, Vector3} from "@babylonjs/core";
import {Matrix3} from "./matrix3";
import {Murph} from "./murph";
import {Impulse} from "./impulse";
import {AABB} from "./aabb";
import {copyAintoB, RigidBodyState} from "./rigidBodyState";

export class RigidBody {
    readonly mesh: AbstractMesh;
    readonly mass: number;
    private readonly inverseMass: number;

    private readonly inertiaTensor0: Matrix3;
    private readonly inverseInertiaTensor0: Matrix3;

    readonly currentState: RigidBodyState = {
        position: Vector3.Zero(),
        rotationQuaternion: Quaternion.Identity(),
        velocity: Vector3.Zero(),
        omega: Vector3.Zero(),
        momentum: Vector3.Zero(),
        angularMomentum: Vector3.Zero(),
        rotationMatrix: Matrix3.identity(),
        inverseInertiaTensor: Matrix3.identity(),
        aabb: new AABB(Vector3.Zero(), Vector3.Zero())
    }

    readonly nextState: RigidBodyState = {
        position: Vector3.Zero(),
        rotationQuaternion: Quaternion.Identity(),
        velocity: Vector3.Zero(),
        omega: Vector3.Zero(),
        momentum: Vector3.Zero(),
        angularMomentum: Vector3.Zero(),
        rotationMatrix: Matrix3.identity(),
        inverseInertiaTensor: Matrix3.identity(),
        aabb: new AABB(Vector3.Zero(), Vector3.Zero())
    }

    private cumulatedImpulses: Impulse[] = [];

    constructor(mesh: AbstractMesh, mass: number, inertiaTensor0: Matrix3, engine: Murph) {
        engine.addBody(this);

        this.mesh = mesh;

        this.currentState.aabb.updateFromMesh(this.mesh);
        this.currentState.aabb.setVisible(true);

        this.mesh.rotationQuaternion = Quaternion.Identity();

        this.mass = mass;
        this.inverseMass = 1 / mass;

        this.inertiaTensor0 = inertiaTensor0;
        this.inverseInertiaTensor0 = this.mass > 0 ? inertiaTensor0.inverse() : Matrix3.identity();

        this.currentState.inverseInertiaTensor = Matrix3.identity();

        this.currentState.momentum = Vector3.Zero();
        this.currentState.angularMomentum = Vector3.Zero();

        this.currentState.rotationMatrix = Matrix3.identity();
    }

    setInitialPosition(position: Vector3) {
        this.mesh.position = position;
        this.currentState.position = position;
        this.currentState.aabb.updateFromMesh(this.mesh);
    }

    get positionRef(): Vector3 {
        return this.currentState.position;
    }

    get positionCopy(): Vector3 {
        return this.currentState.position.clone();
    }

    get inverseInertiaTensor(): Matrix3 {
        return this.currentState.inverseInertiaTensor;
    }

    public applyImpulse(impulse: Impulse) {
        this.cumulatedImpulses.push(impulse);
    }

    /**
     * Resets the next state and recomputes it for t = t + deltaTime
     * @param deltaTime the time step in seconds
     */
    public computeNextStep(deltaTime: number) {
        if (this.mass === 0) return;

        copyAintoB(this.currentState, this.nextState);

        for (const impulse of this.cumulatedImpulses) {
            this.nextState.momentum.addInPlace(impulse.force.scale(deltaTime));
            this.nextState.angularMomentum.addInPlace(impulse.point.cross(impulse.force).scale(deltaTime));
        }
        this.nextState.velocity = this.nextState.momentum.scale(this.inverseMass);

        const omegaQuaternion = new Quaternion(this.currentState.omega.x, this.currentState.omega.y, this.currentState.omega.z, 0);

        this.nextState.rotationQuaternion.addInPlace(omegaQuaternion.multiplyInPlace(this.currentState.rotationQuaternion).scaleInPlace(deltaTime / 2));
        this.nextState.rotationQuaternion.normalize();

        this.nextState.position.addInPlace(this.currentState.velocity.scale(deltaTime));

        this.nextState.rotationMatrix = Matrix3.fromQuaternion(this.currentState.rotationQuaternion);

        this.nextState.inverseInertiaTensor = this.nextState.rotationMatrix.multiply(this.inverseInertiaTensor0).multiply(this.nextState.rotationMatrix.transpose());
        this.nextState.omega = this.nextState.inverseInertiaTensor.applyTo(this.nextState.angularMomentum);
    }

    public applyNextStep() {
        if(this.mass === 0) return;

        copyAintoB(this.nextState, this.currentState);

        this.mesh.position = this.currentState.position;
        this.mesh.rotationQuaternion = this.currentState.rotationQuaternion;

        this.currentState.aabb.updateFromMesh(this.mesh);

        // TODO
        this.cumulatedImpulses = [];
    }

    public getVelocityAtPoint(point: Vector3): Vector3 {
        return this.currentState.velocity.add(this.currentState.omega.cross(point));
    }

    /**
     * Returns the world matrix of the rigid body.
     */
    public static getWorldMatrix(position: Vector3, rotation: Quaternion): Matrix {
        const translationMatrix = Matrix.Translation(position.x, position.y, position.z);
        const rotationMatrix = Matrix.Identity();
        Matrix.FromQuaternionToRef(rotation, rotationMatrix);
        return translationMatrix.multiply(rotationMatrix);
    }

    public computeCollisionImpulse(other: RigidBody, normal: Vector3, point: Vector3): Impulse {
        const relativeVelocity = this.getVelocityAtPoint(point).subtract(other.getVelocityAtPoint(point));
        const normalVelocity = Vector3.Dot(relativeVelocity, normal);
        const impulse = normal.scale(-normalVelocity * (1 + 0.5));
        return new Impulse(impulse, point);
    }
}