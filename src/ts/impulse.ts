import {Vector3} from "@babylonjs/core";

export class Impulse {
    readonly force: Vector3;
    readonly point: Vector3;
    constructor(force: Vector3, point = Vector3.Zero()) {
        this.force = force;
        this.point = point;
    }
}