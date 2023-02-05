import { Color3, Ray, Vector3 } from "@babylonjs/core";
import { getMeshTrianglesWorldSpace, getMeshVerticesWorldSpace, Triangle } from "./vertex";
import { pointIntersectsWithAABB, triangleIntersectsWithAABB } from "../pointIntersectsWithAABB";
import { displayPoint, displayRay, displayTriangle } from "./display";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";
import { Impulse } from "../impulse";

export const EPSILON = 0.1;

/**
 * Returns [isIntersecting, penetration distance, normal, point]
 * @param rayOrigin
 * @param rayDirection
 * @param triangle
 */
function intersectRayTriangle(rayOrigin: Vector3, rayDirection: Vector3, triangle: Triangle): number {
    const ray = new Ray(rayOrigin, rayDirection);
    const intersection = ray.intersectsTriangle(triangle[0], triangle[1], triangle[2]);
    if (intersection) return intersection.distance;
    else return Number.NEGATIVE_INFINITY;
}

export type Contact = {
    a: RigidBody, b: RigidBody,
    aabbOverlap: AABB;
};

export function vertexToFacePenetration(contact: Contact, reverse = false): [number, Vector3[], Vector3[], Triangle[]] {
    // if reverse is false, we check if a point of A is inside B
    // if reverse is true, we check if a point of B is inside A
    const bodyA = contact.a;
    const bodyB = contact.b;

    const worldMatrixA = bodyA.getNextWorldMatrix();
    const worldMatrixB = bodyB.getNextWorldMatrix();

    const points = reverse ? getMeshVerticesWorldSpace(bodyB.mesh, worldMatrixB) : getMeshVerticesWorldSpace(bodyA.mesh, worldMatrixA);
    const triangles = reverse ? getMeshTrianglesWorldSpace(bodyA.mesh, worldMatrixA) : getMeshTrianglesWorldSpace(bodyB.mesh, worldMatrixB);

    const pointsToCheck = points.filter((point: Vector3) => pointIntersectsWithAABB(point, contact.aabbOverlap));
    const trianglesToCheck = triangles.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));

    //contact.aabbOverlap.setVisible(true);
    //contact.aabbOverlap.color = Color3.Black();

    let maxPenetration = Number.NEGATIVE_INFINITY;

    let collisionPointsA: Vector3[] = [];
    let collisionPointsB: Vector3[] = [];
    let collisionTriangles: Triangle[] = [];

    let collisionPointA = Vector3.Zero(); // the vertex the most inside the other object
    let collisionPointB = Vector3.Zero(); // the point on the triangle that is closest to the vertex
    let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];

    for (const point of pointsToCheck) {
        collisionPointA = point;
        collisionPointB = Vector3.Zero();
        for (const triangle of trianglesToCheck) {
            const rayOrigin = reverse ? contact.b.nextState.position : contact.a.nextState.position;
            const rayDirection = point.subtract(rayOrigin).normalize();
            const rayLength = point.subtract(rayOrigin).length();

            const intersectDistance = intersectRayTriangle(rayOrigin, rayDirection, triangle);
            if (intersectDistance <= 0) continue;

            const penetration = rayLength - intersectDistance;
            if (penetration > maxPenetration || maxPenetration == Number.NEGATIVE_INFINITY) {
                maxPenetration = penetration;

                collisionPointB = rayDirection.scale(intersectDistance).add(rayOrigin);
                collisionTriangle = triangle;
            }
        }

        if (maxPenetration == Number.NEGATIVE_INFINITY) continue;
        if (collisionPointB.lengthSquared() == 0) continue;
        if (Math.abs(maxPenetration) < EPSILON || maxPenetration > EPSILON) {
            collisionPointsA.push(collisionPointA);
            collisionPointsB.push(collisionPointB);
            collisionTriangles.push(collisionTriangle);

            //displayRay(collisionPointA, collisionPointB.subtract(collisionPointA).normalize(), Color3.Red(), 0);
            //displayPoint(collisionPointA, Color3.Red(), 0);
            //displayPoint(collisionPointB, Color3.Red(), 0);
            //displayTriangle(collisionTriangle, Color3.Green(), 0);
        }
    }

    console.assert(collisionPointsA.length == collisionPointsB.length && collisionPointsA.length == collisionTriangles.length);

    if (reverse) return [maxPenetration, collisionPointsB, collisionPointsA, collisionTriangles];
    return [maxPenetration, collisionPointsA, collisionPointsB, collisionTriangles];
}

export function testInterpenetration(contact: Contact): [number, Vector3[], Vector3[], Triangle[]] {
    const [penetrationDistance, pointsA, pointsB, triangles] = vertexToFacePenetration(contact, false);
    const [penetrationDistance2, pointsB2, pointsA2, triangles2] = vertexToFacePenetration(contact, true);

    return [Math.max(penetrationDistance, penetrationDistance2), pointsA.concat(pointsA2), pointsB.concat(pointsB2), triangles.concat(triangles2)];
    //if (penetrationDistance2 > penetrationDistance) return [penetrationDistance2, pointA2, pointB2, triangle2];
    //else return [penetrationDistance, pointA, pointB, triangle];
}

/**
 * Returns the impulse to apply to each body
 * @param a
 * @param b
 * @param pointA the point on body A (local space)
 * @param pointB the point on body B (local space)
 * @param normal the normal of the collision
 */
export function computeImpulse(a: RigidBody, b: RigidBody, pointA: Vector3, pointB: Vector3, normal: Vector3): [Impulse, Impulse] {
    const ra = pointA;
    const rb = pointB;

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
    const j = 1000.0 * -(1 + restitution) * rv / denominator;

    // calculate impulse vector
    return [new Impulse(normal.scale(-j), ra), new Impulse(normal.scale(j), rb)];
}