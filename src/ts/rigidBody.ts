import {AbstractMesh, Quaternion, Vector3} from "@babylonjs/core";
import {Matrix3} from "./matrix3";
import {Murph} from "./murph";

export class RigidBody {
    readonly mesh: AbstractMesh;

    private readonly mass: number;
    private readonly inverseMass: number;

    private readonly inertiaTensor0: Matrix3;
    private readonly inverseInertiaTensor0: Matrix3;

    private inertiaTensor: Matrix3;
    private inverseInertiaTensor: Matrix3;

    private momentum: Vector3;
    private angularMomentum: Vector3;

    private rotationQuaternion: Quaternion;
    private rotationMatrix: Matrix3;

    constructor(mesh: AbstractMesh, mass: number, engine: Murph) {
        engine.addBody(this);

        this.mesh = mesh;
        this.mass = mass;
        this.inverseMass = 1 / mass;

        this.inertiaTensor0 = Matrix3.identity();
        this.inverseInertiaTensor0 = Matrix3.identity();

        this.inertiaTensor = Matrix3.identity();
        this.inverseInertiaTensor = Matrix3.identity();

        this.momentum = Vector3.Zero();
        this.angularMomentum = Vector3.Zero();

        this.rotationQuaternion = Quaternion.Identity();
        this.rotationMatrix = Matrix3.identity();
    }

    get position(): Vector3 {
        return this.mesh.position;
    }
}