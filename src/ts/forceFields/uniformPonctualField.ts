import { ForceField } from "./forceField";
import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { Impulse } from "../impulse";
import { AvalancheEngine } from "../engine";
import { Force } from "./force";

export class UniformPonctualField implements ForceField {
    readonly point: Vector3;
    readonly strength: number;

    constructor(point: Vector3, strength: number, physicsEngine?: AvalancheEngine) {
        if (physicsEngine) physicsEngine.addField(this);
        this.point = point;
        this.strength = strength;
    }

    computeForce(body: RigidBody): Force {
        return new Force(this.point.subtract(body.positionRef).normalize().scale(this.strength));
    }
}