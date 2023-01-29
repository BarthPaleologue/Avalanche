import {Vector3} from "@babylonjs/core";
import {getMeshTriangles, getMeshVerticesWorldSpace, Triangle} from "./vertex";
import {pointIntersectsWithAABB, triangleIntersectsWithAABB} from "../pointIntersectsWithAABB";
import {displayPoint, displayTriangle} from "./display";
import {RigidBody} from "../rigidBody";
import {AABB} from "../aabb";
import {Impulse} from "../impulse";

/**
 * Returns [isIntersecting, penetration distance, normal, point]
 * @param rayOrigin
 * @param rayEnd
 * @param triangle
 */
function intersectRayTriangle(rayOrigin: Vector3, rayEnd: Vector3, triangle: Triangle): [boolean, number, Vector3, Vector3] {
    const edge1 = triangle[1].subtract(triangle[0]);
    const edge2 = triangle[2].subtract(triangle[0]);
    const triangleNormal = Vector3.Cross(edge1, edge2).normalize();
    const rayDir = rayEnd.subtract(rayOrigin).normalize();
    const h = rayDir.cross(edge2);
    const a = Vector3.Dot(edge1, h);

    if (a > -0.00001 && a < 0.00001) {
        return [false, 0, triangleNormal, Vector3.Zero()];
    }

    const f = 1 / a;
    const s = rayOrigin.subtract(triangle[0]);
    const u = f * Vector3.Dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return [false, 0, triangleNormal, Vector3.Zero()];
    }

    const q = s.cross(edge1);
    const v = f * Vector3.Dot(rayDir, q);

    if (v < 0.0 || u + v > 1.0) {
        return [false, 0, triangleNormal, Vector3.Zero()];
    }

    const t = f * Vector3.Dot(edge2, q);

    if (t > 0.00001 && t < rayEnd.subtract(rayOrigin).length()) {
        return [true, t, h.normalize(), rayOrigin.add(rayDir.scale(t))];
    } else {
        return [false, t, triangleNormal, Vector3.Zero()];
    }
}

export type Contact = {
    a: RigidBody, b: RigidBody,
    aabbOverlap: AABB
}

export function vertexToFacePenetration(contact: Contact, reverse = false): [boolean, number, Vector3, Vector3] {
    // if reverse is false, we check if a point of A is inside B
    // if reverse is true, we check if a point of B is inside A
    const points = reverse ? getMeshVerticesWorldSpace(contact.b.mesh) : getMeshVerticesWorldSpace(contact.a.mesh);
    const triangles = reverse ? getMeshTriangles(contact.a.mesh) : getMeshTriangles(contact.b.mesh);

    const pointsToCheck = points.filter((point: Vector3) => pointIntersectsWithAABB(point, contact.aabbOverlap));
    const trianglesToCheck = triangles.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));

    let minPenetration = Number.POSITIVE_INFINITY;
    let collisionNormal = Vector3.Zero();
    let collisionPointA = Vector3.Zero();
    let collisionPointB = Vector3.Zero();
    let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];
    for (const point of pointsToCheck) {
        for (const triangle of trianglesToCheck) {
            const [intersect, penetration, normal, pointOnTriangle] = intersectRayTriangle(reverse ? contact.b.positionRef : contact.a.positionRef, point, triangle);
            if (intersect && penetration < minPenetration) {
                minPenetration = penetration;
                collisionNormal = normal;
                collisionPointA = point;
                collisionPointB = pointOnTriangle;
                collisionTriangle = triangle;
            }
        }
    }
    if (collisionNormal.lengthSquared() == 0) {
        return [false, 0, Vector3.Zero(), Vector3.Zero()];
    }
    displayTriangle(collisionTriangle);
    displayPoint(collisionPointA);

    if (reverse) return [true, minPenetration, collisionPointB, collisionPointA];
    return [true, minPenetration, collisionPointA, collisionPointB];
}

export function testInterpenetration(contact: Contact): [boolean, number, Vector3, Vector3] {
    const [interpenetrates, penetrationDistance, pointA, pointB] = vertexToFacePenetration(contact, false);
    if (interpenetrates) return [true, penetrationDistance, pointA, pointB];

    const [interpenetrates2, penetrationDistance2, pointB2, pointA2] = vertexToFacePenetration(contact, true);
    if (interpenetrates2) return [true, penetrationDistance2, pointA2, pointB2];

    return [false, 0, Vector3.Zero(), Vector3.Zero()];
}

export function computeImpulse(a: RigidBody, b: RigidBody, pointA: Vector3, pointB: Vector3, normal: Vector3): [Impulse, Impulse] {
    const ra = pointA.subtract(a.positionRef);
    const rb = pointB.subtract(b.positionRef);

    const va = a.currentState.velocity.add(a.currentState.omega.cross(ra));
    const vb = b.currentState.velocity.add(b.currentState.omega.cross(rb));
    // relative velocity
    const rv = Vector3.Dot(normal, vb.subtract(va));

    let denominator = 0;
    denominator += a.mass > 0 ? 1 / a.mass : 0;
    denominator += b.mass > 0 ? 1 / b.mass : 0;
    denominator += Vector3.Dot(normal, a.inverseInertiaTensor.applyTo(ra.cross(normal)).cross(ra));
    denominator += Vector3.Dot(normal, b.inverseInertiaTensor.applyTo(rb.cross(normal)).cross(rb));
    // calculate impulse scalar
    const restitution = 0.7;
    const j = 40 * -(1 + restitution) * rv / denominator;

    // calculate impulse vector
    return [new Impulse(normal.scale(j), pointA), new Impulse(normal.scale(-j), pointB)];
}