import { ForceField } from "./forceField";
import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { Force } from "./force";

export class UniformDirectionalField implements ForceField {
    readonly acceleration: Vector3;

    constructor(acceleration: Vector3) {
        this.acceleration = acceleration;
    }

    computeForce(body: RigidBody): Force {
        return new Force(this.acceleration.scale(body.mass));
    }
}
