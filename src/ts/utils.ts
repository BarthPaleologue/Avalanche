import {Vector3} from "@babylonjs/core";

export type Triangle = [Vector3, Vector3, Vector3];

export function triangleIntersection(triangle1: Triangle, triangle2: Triangle): [boolean, Vector3] {
    const [a1, b1, c1] = triangle1;
    const [a2, b2, c2] = triangle2;
    const ab1 = b1.subtract(a1);
    const ac1 = c1.subtract(a1);
    const ab2 = b2.subtract(a2);
    const ac2 = c2.subtract(a2);
    const n1 = Vector3.Cross(ab1, ac1);
    const n2 = Vector3.Cross(ab2, ac2);
    const p = Vector3.Cross(n1, n2);
    const d = Vector3.Dot(p, a1);
    const d1 = Vector3.Dot(p, a2);
    const d2 = Vector3.Dot(p, b2);
    const d3 = Vector3.Dot(p, c2);
    if (d1 === d && d2 === d && d3 === d) {
        return [true, a1];
    }
    return [false, Vector3.Zero()];
}