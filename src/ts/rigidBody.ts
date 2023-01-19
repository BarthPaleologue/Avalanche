import {AbstractMesh, Mesh, MeshBuilder, Quaternion, Scene, Vector3} from "@babylonjs/core";
import {Matrix3} from "./matrix3";
import {Murph} from "./murph";
import {Impulse} from "./impulse";

export class RigidBody {
    readonly mesh: AbstractMesh;

    readonly mass: number;
    private readonly inverseMass: number;

    private inertiaTensor0: Matrix3;
    private inverseInertiaTensor0: Matrix3;

    private inverseInertiaTensor: Matrix3;

    private momentum: Vector3;
    private angularMomentum: Vector3;

    private velocity: Vector3 = Vector3.Zero();
    private omega: Vector3 = Vector3.Zero();

    private rotationMatrix: Matrix3;

    private cumulatedImpulses: Impulse[] = [];

    constructor(mesh: AbstractMesh, mass: number, engine: Murph) {
        engine.addBody(this);

        this.mesh = mesh;
        this.rotationQuaternion = Quaternion.Identity();

        this.mass = mass;
        this.inverseMass = 1 / mass;

        this.inertiaTensor0 = Matrix3.identity();
        this.inverseInertiaTensor0 = Matrix3.identity();

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
        for (const impulse of this.cumulatedImpulses) {
            this.momentum.addInPlace(impulse.force.scale(deltaTime));
            this.angularMomentum.addInPlace(impulse.point.cross(impulse.force).scale(deltaTime));
        }
        this.velocity = this.momentum.scale(this.inverseMass);

        const omegaQuaternion = new Quaternion(this.omega.x, this.omega.y, this.omega.z, 0);

        this.rotationQuaternion.addInPlace(omegaQuaternion.multiply(this.rotationQuaternion).scale(deltaTime / 2));
        this.rotationQuaternion.normalize();

        this.position.addInPlace(this.velocity.scale(deltaTime));

        this.rotationMatrix = Matrix3.fromQuaternion(this.rotationQuaternion);

        this.inverseInertiaTensor = this.rotationMatrix.multiply(this.inverseInertiaTensor0).multiply(this.rotationMatrix.transpose());
        this.omega = this.inverseInertiaTensor.applyTo(this.angularMomentum);

        // TODO
        this.cumulatedImpulses = [];
    }

    static CreateBox(name: string, scaling: Vector3, mass: number, engine: Murph, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateBox(name, {
            width: scaling.x,
            height: scaling.y,
            depth: scaling.z
        }, scene);
        mesh.scaling = scaling;
        const rigidBody = new RigidBody(mesh, mass, engine);
        rigidBody.inertiaTensor0 = Matrix3.diag(
            1 / 12 * mass * (scaling.y * scaling.y + scaling.z * scaling.z),
            1 / 12 * mass * (scaling.x * scaling.x + scaling.z * scaling.z),
            1 / 12 * mass * (scaling.x * scaling.x + scaling.y * scaling.y)
        )
        rigidBody.inverseInertiaTensor0 = rigidBody.inertiaTensor0.inverse();
        return rigidBody;
    }
}