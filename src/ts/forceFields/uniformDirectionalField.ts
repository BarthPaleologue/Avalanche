import { ForceField } from "./forceField";
import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { Impulse } from "../impulse";
import { Murph } from "../murph";
import { Force } from "./force";

export class UniformDirectionalField implements ForceField {
    readonly acceleration: Vector3;

    constructor(acceleration: Vector3, physicsEngine?: Murph) {
        if (physicsEngine) physicsEngine.addField(this);
        this.acceleration = acceleration;
    }

    computeForce(body: RigidBody): Force {
        return new Force(this.acceleration.scale(body.mass));
    }
}