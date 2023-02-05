import { AbstractMesh, Matrix, Quaternion, Vector3 } from "@babylonjs/core";
import { Matrix3 } from "./matrix3";
import { Murph } from "./murph";
import { Impulse } from "./impulse";
import { AABB } from "./aabb";
import { copyAintoB, RigidBodyState } from "./rigidBodyState";

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
    };

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
    };

    cumulatedImpulses: Impulse[] = [];

    constructor(mesh: AbstractMesh, mass: number, inertiaTensor0: Matrix3, engine: Murph) {
        engine.addBody(this);

        this.mesh = mesh;

        this.currentState.aabb.updateFromRigidBody(this);
        this.currentState.aabb.setVisible(false);

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
        this.mesh.computeWorldMatrix(true);
        this.currentState.aabb.updateFromRigidBody(this);
    }

    get positionRef(): Vector3 {
        return this.currentState.position;
    }

    get positionCopy(): Vector3 {
        return this.currentState.position.clone();
    }

    get currentInverseInertiaTensor(): Matrix3 {
        return this.currentState.inverseInertiaTensor;
    }

    get nextInverseInertiaTensor(): Matrix3 {
        return this.nextState.inverseInertiaTensor;
    }

    public applyImpulse(impulse: Impulse) {
        this.cumulatedImpulses.push(impulse);
    }

    /**
     * Resets the next state and recomputes it for t = t + deltaTime
     * @param deltaTime the time step in seconds
     */
    public computeNextStep(deltaTime: number) {
        copyAintoB(this.currentState, this.nextState);

        if (this.mass === 0) return;

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
        copyAintoB(this.nextState, this.currentState);

        if (this.mass === 0) return;

        this.mesh.position = this.currentState.position;
        this.mesh.rotationQuaternion = this.currentState.rotationQuaternion;

        this.currentState.aabb.updateFromRigidBody(this);

        // TODO
        this.cumulatedImpulses = [];
    }

    public getVelocityAtPoint(point: Vector3): Vector3 {
        return this.currentState.velocity.add(this.currentState.omega.cross(point));
    }

    /**
     * Returns the world matrix of the rigid body.
     */
    public getNextWorldMatrix(): Matrix {
        const worldMatrix = Matrix.Identity();

        const rotationMatrix = Matrix.Identity();
        this.nextState.rotationQuaternion.toRotationMatrix(rotationMatrix);
        worldMatrix.multiplyToRef(rotationMatrix, worldMatrix);

        const scaleMatrix = Matrix.Scaling(this.mesh.scaling.x, this.mesh.scaling.y, this.mesh.scaling.z);
        worldMatrix.multiplyToRef(scaleMatrix, worldMatrix);

        const translationMatrix = Matrix.Translation(this.nextState.position.x, this.nextState.position.y, this.nextState.position.z);
        worldMatrix.multiplyToRef(translationMatrix, worldMatrix);

        return worldMatrix;
    }

    /**
     * 
     * @param point (in relative coordinates)
     * @returns 
     */
    public getVelocityAtPointNext(point: Vector3): Vector3 {
        return this.nextState.velocity.add(this.nextState.omega.cross(point));
    }
}