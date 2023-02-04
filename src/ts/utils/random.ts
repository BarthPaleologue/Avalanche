import {Vector3} from "@babylonjs/core";

export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomVector3(min: number, max: number): Vector3 {
    return new Vector3(
        randomFloat(min, max),
        randomFloat(min, max),
        randomFloat(min, max)
    );
}