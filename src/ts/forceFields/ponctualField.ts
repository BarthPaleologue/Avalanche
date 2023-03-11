import { ForceField } from "./forceField";
import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { Force } from "./force";

export class PonctualField implements ForceField {
    readonly point: Vector3;
    readonly strength: number;

    constructor(point: Vector3, strength: number) {
        this.point = point;
        this.strength = strength;
    }

    computeForce(body: RigidBody): Force {
        const d = this.point.subtract(body.positionRef).length();
        const dir = this.point.subtract(body.positionRef).scaleInPlace(1 / d);
        return new Force(dir.scale(body.mass * this.strength / d ** 2));
    }
}
