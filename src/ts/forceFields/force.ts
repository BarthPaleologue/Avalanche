import { Vector3 } from "@babylonjs/core";

export class Force {
    readonly vector: Vector3;
    readonly point: Vector3;

    constructor(force: Vector3, point = Vector3.Zero()) {
        this.vector = force;
        this.point = point;
    }
}
