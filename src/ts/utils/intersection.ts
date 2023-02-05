import { Ray, Vector3 } from "@babylonjs/core";
import { closestPointOnEdge, Edge, getMeshTrianglesWorldSpaceInAABB, getMeshVerticesWorldSpaceInAABB, Triangle } from "./vertex";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";
import { Impulse } from "../impulse";

export const EPSILON = 0.05;

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

export function vertexToFacePenetration(contact: Contact, reverse = false): [number, Vector3[], Vector3[], Triangle[], number[]] {
    // if reverse is false, we check if a point of A is inside B
    // if reverse is true, we check if a point of B is inside A
    const bodyA = contact.a;
    const bodyB = contact.b;

    const worldMatrixA = bodyA.getNextWorldMatrix();
    const worldMatrixB = bodyB.getNextWorldMatrix();

    const pointsToCheck = reverse ?
        getMeshVerticesWorldSpaceInAABB(bodyB.mesh, worldMatrixB, contact.aabbOverlap) :
        getMeshVerticesWorldSpaceInAABB(bodyA.mesh, worldMatrixA, contact.aabbOverlap);

    const trianglesToCheck = reverse ?
        getMeshTrianglesWorldSpaceInAABB(bodyA.mesh, worldMatrixA, contact.aabbOverlap) :
        getMeshTrianglesWorldSpaceInAABB(bodyB.mesh, worldMatrixB, contact.aabbOverlap);


    let maxPenetration = Number.NEGATIVE_INFINITY;

    let collisionPointsA: Vector3[] = [];
    let collisionPointsB: Vector3[] = [];
    let collisionTriangles: Triangle[] = [];
    let collisionPenetrations: number[] = [];

    let collisionPointA = Vector3.Zero(); // the vertex the most inside the other object
    let collisionPointB = Vector3.Zero(); // the point on the triangle that is closest to the vertex
    let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];

    for (const point of pointsToCheck) {
        collisionPointA = point;
        collisionPointB = Vector3.Zero();
        let collisionPenetration = Number.NEGATIVE_INFINITY;

        for (const triangle of trianglesToCheck) {
            const rayOrigin = reverse ? contact.b.nextState.position : contact.a.nextState.position;
            const rayDirection = point.subtract(rayOrigin).normalize();
            const rayLength = point.subtract(rayOrigin).length();

            const intersectDistance = intersectRayTriangle(rayOrigin, rayDirection, triangle);
            if (intersectDistance <= 0) continue;

            const penetration = rayLength - intersectDistance;

            if (penetration > maxPenetration) {
                maxPenetration = penetration;
            }

            if (penetration > collisionPenetration) {
                collisionPenetration = penetration;
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
            collisionPenetrations.push(collisionPenetration);

            //displayRay(collisionPointA, collisionPointB.subtract(collisionPointA).normalize(), Color3.Red(), 0);
            //displayPoint(collisionPointA, Color3.Red(), 0);
            //displayPoint(collisionPointB, Color3.Red(), 0);
            //displayTriangle(collisionTriangle, Color3.Green(), 0);
        }
    }

    console.assert(collisionPointsA.length == collisionPointsB.length && collisionPointsA.length == collisionTriangles.length && collisionPointsA.length == collisionPenetrations.length);

    if (reverse) return [maxPenetration, collisionPointsB, collisionPointsA, collisionTriangles, collisionPenetrations];
    return [maxPenetration, collisionPointsA, collisionPointsB, collisionTriangles, collisionPenetrations];
}

export function findCollisions(edges1: Edge[], edges2: Edge[]): [number, Vector3[], Vector3[], number[]] {
    const closestDistances: number[] = [];
    const intersectionPointsEdgesA: Vector3[] = [];
    const intersectionPointsEdgesB: Vector3[] = [];
    const distances: number[] = [];

    for (const edge1 of edges1) {
        for (const edge2 of edges2) {
            const closestPoint = closestPointOnEdge(edge1[0], edge2);
            const distanceSquared = Vector3.DistanceSquared(edge1[0], closestPoint);
            if (distanceSquared <= EPSILON ** 2) {
                closestDistances.push(Math.sqrt(distanceSquared));
                intersectionPointsEdgesA.push(edge1[0]);
                intersectionPointsEdgesB.push(closestPoint);
                distances.push(Vector3.Distance(edge1[0], closestPoint));
            }
        }
    }

    let closestDistance = Number.MAX_VALUE;
    for (const distance of closestDistances) {
        if (distance < closestDistance) {
            closestDistance = distance;
        }
    }

    return [closestDistance, intersectionPointsEdgesA, intersectionPointsEdgesB, distances];
}


export function testInterpenetration(contact: Contact): [number, Vector3[], Vector3[], Triangle[], number[]] {
    const [penetrationDistance, pointsA, pointsB, triangles, collisionPenetrations] = vertexToFacePenetration(contact, false);
    const [penetrationDistance2, pointsB2, pointsA2, triangles2, collisionPenetrations2] = vertexToFacePenetration(contact, true);

    return [Math.max(penetrationDistance, penetrationDistance2), pointsA.concat(pointsA2), pointsB.concat(pointsB2), triangles.concat(triangles2), collisionPenetrations.concat(collisionPenetrations2)];
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

    const va = a.getVelocityAtPointNext(ra);
    const vb = b.getVelocityAtPointNext(rb);
    // relative velocity
    const rv = Vector3.Dot(normal, vb.subtract(va));

    // if points are moving away from each other, no impulse is needed
    if (rv > 0) return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

    let denominator = 0;
    denominator += a.mass != 0 ? 1 / a.mass : 0;
    denominator += b.mass != 0 ? 1 / b.mass : 0;
    denominator += Vector3.Dot(normal, a.nextInverseInertiaTensor.applyTo(ra.cross(normal)).cross(ra));
    denominator += Vector3.Dot(normal, b.nextInverseInertiaTensor.applyTo(rb.cross(normal)).cross(rb));
    // calculate impulse scalar
    const restitution = 0.1;
    const j = -(1 + restitution) * rv / denominator;

    // calculate impulse vector
    return [new Impulse(normal.scale(-j), ra), new Impulse(normal.scale(j), rb)];
}