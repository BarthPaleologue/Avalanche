import { AbstractMesh, Matrix, Quaternion, Vector3 } from "@babylonjs/core";
import { Matrix3 } from "./utils/matrix3";
import { AvalancheEngine } from "./engine";
import { Impulse } from "./impulse";
import { AABB } from "./aabb";
import { copyAintoB, RigidBodyState } from "./rigidBodyState";
import { Force } from "./forceFields/force";
import { Settings } from "./settings";

export class RigidBody {
    readonly mesh: AbstractMesh;
    readonly mass: number;

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
        worldMatrix: Matrix.Identity(),
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
        worldMatrix: Matrix.Identity(),
        aabb: new AABB(Vector3.Zero(), Vector3.Zero())
    };

    cumulatedImpulses: Impulse[] = [];
    cumulatedForces: Force[] = [];

    constructor(mesh: AbstractMesh, mass: number, inertiaTensor0: Matrix3, engine: AvalancheEngine) {
        engine.addBody(this);

        this.mesh = mesh;

        this.currentState.aabb.updateFromRigidBody(this);
        this.currentState.aabb.setVisible(Settings.DISPLAY_BOUNDING_BOXES);

        this.mesh.rotationQuaternion = Quaternion.Identity();

        this.mass = mass;

        this.inertiaTensor0 = inertiaTensor0;
        this.inverseInertiaTensor0 = this.mass != 0 ? inertiaTensor0.inverse() : Matrix3.identity();

        this.currentState.inverseInertiaTensor = Matrix3.identity();

        this.currentState.momentum = Vector3.Zero();
        this.currentState.angularMomentum = Vector3.Zero();

        this.currentState.rotationMatrix = Matrix3.identity();
    }

    get isStatic(): boolean {
        return this.mass == 0;
    }

    setInitialPosition(position: Vector3) {
        this.mesh.position = position;
        this.currentState.position = position;
        this.mesh.computeWorldMatrix(true);
        this.currentState.worldMatrix = this.mesh.getWorldMatrix();
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

    public applyForce(force: Force) {
        this.cumulatedForces.push(force);
    }

    /**
     * Resets the next state and recomputes it for t = t + deltaTime
     * @param deltaTime the time step in seconds
     */
    public computeNextStep(deltaTime: number) {
        copyAintoB(this.currentState, this.nextState);

        if (this.isStatic) return;

        for (const force of this.cumulatedForces) {
            this.nextState.momentum.addInPlace(force.vector.scale(deltaTime));
            this.nextState.angularMomentum.addInPlace(force.point.cross(force.vector).scale(deltaTime));
        }

        for (const impulse of this.cumulatedImpulses) {
            this.nextState.momentum.addInPlace(impulse.force);
            this.nextState.angularMomentum.addInPlace(impulse.point.cross(impulse.force));
        }

        this.nextState.velocity = this.nextState.momentum.scale(1 / this.mass);

        const omegaQuaternion = new Quaternion(this.currentState.omega.x, this.currentState.omega.y, this.currentState.omega.z, 0);

        this.nextState.rotationQuaternion.addInPlace(omegaQuaternion.multiplyInPlace(this.currentState.rotationQuaternion).scaleInPlace(deltaTime / 2));
        this.nextState.rotationQuaternion.normalize();

        this.nextState.position.addInPlace(this.currentState.velocity.scale(deltaTime));

        this.nextState.rotationMatrix = Matrix3.fromQuaternion(this.currentState.rotationQuaternion);

        this.nextState.worldMatrix = Matrix.Compose(
            this.mesh.scaling,
            this.nextState.rotationQuaternion,
            this.nextState.position
        );

        this.nextState.inverseInertiaTensor = this.nextState.rotationMatrix.multiply(this.inverseInertiaTensor0).multiply(this.nextState.rotationMatrix.transpose());
        this.nextState.omega = this.nextState.inverseInertiaTensor.applyTo(this.nextState.angularMomentum);
    }

    public applyNextStep() {
        copyAintoB(this.nextState, this.currentState);

        if (this.isStatic) return;

        this.mesh.position = this.currentState.position;
        this.mesh.rotationQuaternion = this.currentState.rotationQuaternion;

        this.currentState.aabb.updateFromRigidBody(this);

        // TODO
        this.cumulatedImpulses = [];
        this.cumulatedForces = [];
    }

    public getVelocityAtPoint(point: Vector3): Vector3 {
        return this.currentState.velocity.add(this.currentState.omega.cross(point));
    }

    /**
     * Returns the world matrix of the rigid body.
     */
    public getNextWorldMatrix(): Matrix {
        return this.nextState.worldMatrix;
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