import {Vector3} from "@babylonjs/core";
import {AABB} from "./aabb";
import {Triangle} from "./utils/vertex";

export function pointIntersectsWithAABB(point: Vector3, aabb: AABB): boolean {
    return aabb.min.x <= point.x && point.x <= aabb.max.x
        && aabb.min.y <= point.y && point.y <= aabb.max.y
        && aabb.min.z <= point.z && point.z <= aabb.max.z;
}

export function triangleIntersectsWithAABB(triangle: Triangle, aabb: AABB): boolean {
    const min = Vector3.Minimize(Vector3.Minimize(triangle[0], triangle[1]), triangle[2]);
    const max = Vector3.Maximize(Vector3.Maximize(triangle[0], triangle[1]), triangle[2])
    return AABB.Intersects(aabb, new AABB(min, max));
}