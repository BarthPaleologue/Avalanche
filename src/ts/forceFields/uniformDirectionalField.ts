import {ForceField} from "./forceField";
import {Vector3} from "@babylonjs/core";
import {RigidBody} from "../rigidBody";
import {Impulse} from "../impulse";
import {Murph} from "../murph";

export class UniformDirectionalField implements ForceField {
    readonly acceleration: Vector3;

    constructor(acceleration: Vector3, physicsEngine: Murph) {
        physicsEngine.addField(this);
        this.acceleration = acceleration;
    }

    computeForce(body: RigidBody): Vector3 {
        return this.acceleration.scale(body.mass);
    }

    computeImpulse(body: RigidBody): Impulse {
        return new Impulse(this.computeForce(body));
    }
}