import { ForceField } from "./forceField";
import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
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
        const d = this.point.subtract(body.positionRef).length();
        const dir = this.point.subtract(body.positionRef).scaleInPlace(1 / d);
        return new Force(dir.scale(this.strength / d ** 2));
    }
}