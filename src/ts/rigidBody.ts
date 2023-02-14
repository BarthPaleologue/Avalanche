import { Matrix, Mesh, Quaternion, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Matrix3 } from "./utils/matrix3";
import { Impulse } from "./utils/impulse";
import { AABB } from "./aabb";
import { copyAintoB, RigidBodyState } from "./rigidBodyState";
import { Force } from "./forceFields/force";
import { Settings } from "./settings";
import { VectorQueue } from "./utils/vectorQueue";

export class RigidBody {
    readonly mesh: Mesh;
    readonly mass: number;

    readonly restitution: number;
    readonly friction: number;

    private internalCounter = 0;
    readonly velocityQueue = new VectorQueue(100);
    readonly omegaQueue = new VectorQueue(100);

    readonly contactingBodies: RigidBody[] = [];

    private readonly inverseInertiaTensor0: Matrix3;

    readonly currentState: RigidBodyState = {
        isResting: false,
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
        isResting: false,
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

    constructor(mesh: Mesh, mass: number, inertiaTensor0: Matrix3, restitution = 0.7, friction = 0.9) {
        this.mesh = mesh;

        this.restitution = restitution;
        this.friction = friction;

        this.mesh.onMeshReadyObservable.addOnce(() => {
            this.currentState.aabb.updateFromMesh(this.mesh, this.mesh.computeWorldMatrix(true));
            this.currentState.aabb.setVisible(Settings.DISPLAY_BOUNDING_BOXES);
        });

        this.mesh.rotationQuaternion = Quaternion.Identity();

        this.mass = mass;
        this.currentState.isResting = this.isStatic;

        this.inverseInertiaTensor0 = this.mass != 0 ? inertiaTensor0.inverse() : Matrix3.identity();

        this.currentState.inverseInertiaTensor = Matrix3.identity();

        this.currentState.momentum = Vector3.Zero();
        this.currentState.angularMomentum = Vector3.Zero();

        this.currentState.rotationMatrix = Matrix3.identity();
    }

    get isStatic(): boolean {
        return this.mass == 0;
    }

    get isResting(): boolean {
        return this.nextState.isResting;
    }

    computeResting(): boolean {
        if (this.isStatic) return true; // Static bodies are always resting
        if (this.contactingBodies.length == 0) return false; // No contact, not resting because forces are applied

        // if the variance in the velocity queue is too high, we are not resting
        if (this.velocityQueue.variance.length() > 1e-18) return false;
        if (this.omegaQueue.variance.length() > 1e-18) return false;

        const linearThreshold = 0.4;
        const angularThreshold = 0.4;

        for (const neighbor of this.contactingBodies) {
            if (neighbor.isStatic || neighbor.currentState.isResting || neighbor.nextState.isResting) continue;
            const relativeVelocity = this.currentState.velocity.subtract(neighbor.currentState.velocity);
            if (relativeVelocity.length() > linearThreshold || neighbor.currentState.omega.length() > angularThreshold) {
                return false;
            }
        }
        return this.currentState.velocity.length() < linearThreshold && this.currentState.omega.length() < angularThreshold;
    }

    setInitialPosition(position: Vector3) {
        this.mesh.position = position;
        this.currentState.position = position;
        this.mesh.computeWorldMatrix(true);
        this.mesh.onMeshReadyObservable.addOnce(() => {
            this.currentState.worldMatrix = this.mesh.getWorldMatrix();
            this.currentState.aabb.updateFromMesh(this.mesh, this.mesh.getWorldMatrix());
        });
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

        for (const impulse of this.cumulatedImpulses) {
            this.nextState.momentum.addInPlace(impulse.force);
            this.nextState.angularMomentum.addInPlace(impulse.point.cross(impulse.force));
        }

        if (this.isResting) return;

        for (const force of this.cumulatedForces) {
            this.nextState.momentum.addInPlace(force.vector.scale(deltaTime));
            this.nextState.angularMomentum.addInPlace(force.point.cross(force.vector).scale(deltaTime));
        }

        this.nextState.velocity = this.nextState.momentum.scale(1 / this.mass);
        this.nextState.omega = this.nextState.inverseInertiaTensor.applyTo(this.nextState.angularMomentum);

        this.nextState.isResting = this.computeResting();

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

        this.nextState.aabb.updateFromMesh(this.mesh, this.nextState.worldMatrix);
    }

    public applyNextStep() {
        copyAintoB(this.nextState, this.currentState);

        this.currentState.isResting = this.computeResting();

        this.mesh.position = this.currentState.position;
        this.mesh.rotationQuaternion = this.currentState.rotationQuaternion;

        if (this.internalCounter % 20 == 0) {
            this.velocityQueue.enqueue(this.currentState.velocity);
            this.omegaQueue.enqueue(this.currentState.omega);
        }

        if (this.isResting) (this.mesh.material as StandardMaterial).alpha = Settings.DISPLAY_RESTING ? 0.2 : 1;
        else (this.mesh.material as StandardMaterial).alpha = 1;

        this.cumulatedImpulses = [];
        this.cumulatedForces = [];

        this.internalCounter++;
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