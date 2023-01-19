import {ForceField} from "./forceField";
import {Vector3} from "@babylonjs/core";
import {RigidBody} from "../rigidBody";
import {Impulse} from "../impulse";
import {Murph} from "../murph";

export class UniformPonctualField implements ForceField {
    readonly point: Vector3;
    readonly strength: number;

    constructor(point: Vector3, strength: number, physicsEngine: Murph) {
        physicsEngine.addField(this);
        this.point = point;
        this.strength = strength;
    }

    computeForce(body: RigidBody): Vector3 {
        return this.point.subtract(body.position).normalize().scale(this.strength);
    }

    computeImpulse(body: RigidBody): Impulse {
        return new Impulse(this.computeForce(body));
    }
}