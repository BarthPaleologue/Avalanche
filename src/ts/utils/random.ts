import { Vector3 } from "@babylonjs/core";

export function randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function randomVector3(min: number, max: number): Vector3 {
    return new Vector3(randomFloat(min, max), randomFloat(min, max), randomFloat(min, max));
}

export function randomSphere(minRadius: number, maxRadius: number): Vector3 {
    const r = randomFloat(minRadius, maxRadius);
    const theta = randomFloat(0, Math.PI);
    const phi = randomFloat(0, 2 * Math.PI);
    return new Vector3(r * Math.sin(theta) * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta));
}
