import {AbstractMesh, Quaternion, Vector3, VertexBuffer} from "@babylonjs/core";
import {Matrix3} from "./matrix3";
import {Murph} from "./murph";
import {Impulse} from "./impulse";
import {AABB} from "./aabb";

export class RigidBody {
    readonly mesh: AbstractMesh;

    readonly aabb: AABB;

    readonly mass: number;
    private readonly inverseMass: number;

    private readonly inertiaTensor0: Matrix3;
    private readonly inverseInertiaTensor0: Matrix3;

    private inverseInertiaTensor: Matrix3;

    private momentum: Vector3;
    private angularMomentum: Vector3;

    private velocity: Vector3 = Vector3.Zero();
    private omega: Vector3 = Vector3.Zero();

    private rotationMatrix: Matrix3;

    private cumulatedImpulses: Impulse[] = [];

    constructor(mesh: AbstractMesh, mass: number, inertiaTensor0: Matrix3, engine: Murph) {
        engine.addBody(this);

        this.mesh = mesh;

        this.aabb = AABB.FromMesh(this.mesh);
        this.aabb.setVisible(true);

        this.rotationQuaternion = Quaternion.Identity();

        this.mass = mass;
        this.inverseMass = 1 / mass;

        this.inertiaTensor0 = inertiaTensor0;
        this.inverseInertiaTensor0 = this.mass > 0 ? inertiaTensor0.inverse() : Matrix3.identity();

        this.inverseInertiaTensor = Matrix3.identity();

        this.momentum = Vector3.Zero();
        this.angularMomentum = Vector3.Zero();

        this.rotationMatrix = Matrix3.identity();
    }

    set position(position: Vector3) {
        this.mesh.position = position;
    }

    get position(): Vector3 {
        return this.mesh.position;
    }

    set rotationQuaternion(quaternion: Quaternion) {
        this.mesh.rotationQuaternion = quaternion;
    }

    get rotationQuaternion(): Quaternion {
        return this.mesh.rotationQuaternion ?? Quaternion.Identity();
    }

    public applyImpulse(impulse: Impulse) {
        this.cumulatedImpulses.push(impulse);
    }

    public update(deltaTime: number) {
        if (this.mass === 0) return;

        for (const impulse of this.cumulatedImpulses) {
            this.momentum.addInPlace(impulse.force.scale(deltaTime));
            this.angularMomentum.addInPlace(impulse.point.cross(impulse.force).scale(deltaTime));
        }
        this.velocity = this.momentum.scale(this.inverseMass);

        const omegaQuaternion = new Quaternion(this.omega.x, this.omega.y, this.omega.z, 0);

        this.rotationQuaternion.addInPlace(omegaQuaternion.multiplyInPlace(this.rotationQuaternion).scaleInPlace(deltaTime / 2));
        this.rotationQuaternion.normalize();

        this.position.addInPlace(this.velocity.scale(deltaTime));

        this.rotationMatrix = Matrix3.fromQuaternion(this.rotationQuaternion);

        this.inverseInertiaTensor = this.rotationMatrix.multiply(this.inverseInertiaTensor0).multiply(this.rotationMatrix.transpose());
        this.omega = this.inverseInertiaTensor.applyTo(this.angularMomentum);

        this.aabb.updateFromMesh(this.mesh);

        // TODO
        this.cumulatedImpulses = [];
    }

    public getVelocityAtPoint(point: Vector3): Vector3 {
        return this.velocity.add(this.omega.cross(point));
    }

    public computeCollisionImpulse(other: RigidBody, normal: Vector3, point: Vector3): Impulse {
        const relativeVelocity = this.getVelocityAtPoint(point).subtract(other.getVelocityAtPoint(point));
        const normalVelocity = Vector3.Dot(relativeVelocity, normal);
        const impulse = normal.scale(-normalVelocity * (1 + 0.5));
        return new Impulse(impulse, point);
    }
}