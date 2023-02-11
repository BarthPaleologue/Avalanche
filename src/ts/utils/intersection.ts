import { Ray, Vector3 } from "@babylonjs/core";
import { getMeshUniqueVerticesWorldSpaceInAABB } from "./vertex";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";
import { Impulse } from "../impulse";
import { Settings } from "../settings";
import { Triangle, getMeshTrianglesWorldSpaceInAABB, getTriangleNormal } from "./triangle";
import { Edge, closestPointOnEdge } from "./edge";

/**
 * Returns the distance between the ray and the triangle. Returns null if there is no intersection.
 * @param rayOrigin
 * @param rayDirection
 * @param triangle
 */
function intersectRayTriangle(rayOrigin: Vector3, rayDirection: Vector3, triangle: Triangle): number | null {
    const ray = new Ray(rayOrigin, rayDirection);
    const intersection = ray.intersectsTriangle(triangle[0], triangle[1], triangle[2]);
    if (intersection) return intersection.distance;
    return null;
}

export type Contact = {
    a: RigidBody, b: RigidBody,
    aabbOverlap: AABB;
};

/**
 * 
 * @param contact 
 * @param reverse 
 * @returns [maxPenetration, collisionVerticesA, collisionRayPointsB, collisionTriangles, collisionPenetrations]
 */
export function vertexToFacePenetration(bodyA: RigidBody, bodyB: RigidBody, overlap: AABB): [number, Vector3[], Vector3[], Vector3[], number[]] {
    const worldMatrixA = bodyA.getNextWorldMatrix();
    const worldMatrixB = bodyB.getNextWorldMatrix();

    const pointsToCheck = getMeshUniqueVerticesWorldSpaceInAABB(bodyA.mesh, worldMatrixA, overlap);
    const trianglesToCheck = getMeshTrianglesWorldSpaceInAABB(bodyB.mesh, worldMatrixB, overlap);

    let maxPenetration = Number.NEGATIVE_INFINITY;

    const collisionPointsA: Vector3[] = [];
    const collisionPointsB: Vector3[] = [];
    const collisionNormals: Vector3[] = [];
    const penetrationDistances: number[] = [];

    for (const point of pointsToCheck) {
        const collisionPointVertex = point;
        let collisionPointTriangle = Vector3.Zero();
        let collisionPenetration = Number.NEGATIVE_INFINITY;
        let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];

        const rayOrigin = bodyA.nextState.position;
        const rayDirection = point.subtract(rayOrigin).normalize();
        const rayLength = point.subtract(rayOrigin).length();

        for (const triangle of trianglesToCheck) {
            /*const rayDirection2 = reverse ? getTriangleNormal(triangle) : getTriangleNormal(triangle).negate();
            const intersectDistance2 = intersectRayTriangle(point, rayDirection2, triangle);
            if (intersectDistance2 == null || intersectDistance2 <= -rayLength) continue;

            const penetration2 = -intersectDistance2;*/

            const intersectDistance = intersectRayTriangle(rayOrigin, rayDirection, triangle);
            if (intersectDistance == null || intersectDistance <= 0) continue;

            const penetration = rayLength - intersectDistance;

            if (penetration > maxPenetration) maxPenetration = penetration;

            if (penetration > collisionPenetration) {
                collisionPenetration = penetration;
                collisionPointTriangle = rayDirection.scale(intersectDistance).addInPlace(rayOrigin);
                collisionTriangle = triangle;
            }
        }

        if (collisionPenetration == Number.NEGATIVE_INFINITY) continue;
        if (collisionPenetration > -Settings.EPSILON) {
            collisionPointsA.push(collisionPointVertex);
            collisionPointsB.push(collisionPointTriangle);

            const triangleNormal = getTriangleNormal(collisionTriangle);
            collisionNormals.push(triangleNormal);

            penetrationDistances.push(collisionPenetration);
        }
    }

    console.assert(collisionPointsA.length == collisionPointsB.length && collisionPointsA.length == collisionNormals.length && collisionPointsA.length == penetrationDistances.length);

    return [maxPenetration, collisionPointsA, collisionPointsB, collisionNormals, penetrationDistances];
}

export function findEdgeCollisions(edges1: Edge[], edges2: Edge[]): [number, Vector3[], Vector3[], number[]] {
    const closestDistances: number[] = [];
    const intersectionPointsEdgesA: Vector3[] = [];
    const intersectionPointsEdgesB: Vector3[] = [];
    const distances: number[] = [];

    for (const edge1 of edges1) {
        for (const edge2 of edges2) {
            const closestPoint = closestPointOnEdge(edge1[0], edge2);
            const distanceSquared = Vector3.DistanceSquared(edge1[0], closestPoint);
            if (distanceSquared <= Settings.EPSILON ** 2) {
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

/**
 * 
 * @param contact 
 * @returns [maxPenetration, collisionPointsA, collisionPointsB, collisionTriangleNormals, collisionPenetrations]
 */
export function testInterpenetration(contact: Contact): [number, Vector3[], Vector3[], Vector3[], number[]] {
    const [penetrationDistance1, pointsA1, pointsB1, triangleNormals1, collisionPenetrations1] = vertexToFacePenetration(contact.a, contact.b, contact.aabbOverlap);
    const [penetrationDistance2, pointsB2, pointsA2, triangleNormals2, collisionPenetrations2] = vertexToFacePenetration(contact.b, contact.a, contact.aabbOverlap);

    for (const triangleNormal of triangleNormals2) triangleNormal.negateInPlace();

    const maxPenetration = Math.max(penetrationDistance1, penetrationDistance2);
    const pointsA = pointsA1.concat(pointsA2);
    const pointsB = pointsB1.concat(pointsB2);
    const triangleNormals = triangleNormals1.concat(triangleNormals2);
    const collisionPenetrations = collisionPenetrations1.concat(collisionPenetrations2);

    return [maxPenetration, pointsA, pointsB, triangleNormals, collisionPenetrations];
}

/**
 * Returns the impulse to apply to each body due to a collision
 * @param a The first rigid body
 * @param b The second rigid body
 * @param pointA the point on body A (local space)
 * @param pointB the point on body B (local space)
 * @param normal the normal of the collision
 */
export function computeCollisionImpulse(a: RigidBody, b: RigidBody, pointA: Vector3, pointB: Vector3, normal: Vector3): [Impulse, Impulse] {
    const ra = pointA;
    const rb = pointB;

    const va = a.getVelocityAtPointNext(ra);
    const vb = b.getVelocityAtPointNext(rb);
    // relative velocity
    const rv = Vector3.Dot(normal, vb.subtract(va));

    // if points are moving away from each other, no impulse is needed
    if (rv > 0 || Math.abs(rv) < Settings.EPSILON) return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

    let denominator = 0;
    denominator += !a.isStatic ? 1 / a.mass : 0;
    denominator += !b.isStatic ? 1 / b.mass : 0;
    denominator += !a.isStatic ? Vector3.Dot(normal, a.nextInverseInertiaTensor.applyTo(ra.cross(normal)).cross(ra)) : 0;
    denominator += !b.isStatic ? Vector3.Dot(normal, b.nextInverseInertiaTensor.applyTo(rb.cross(normal)).cross(rb)) : 0;
    // calculate impulse scalar
    const restitution = a.restitution * b.restitution;
    const j = -(1 + restitution) * rv / denominator;

    // calculate impulse vector
    return [new Impulse(normal.scale(-j), ra), new Impulse(normal.scale(j), rb)];
}

/**
 * Returns the impulse to apply to each body due to friction
 * @param a The first rigid body
 * @param b The second rigid body
 * @param pointA the point on body A (local space)
 * @param pointB the point on body B (local space)
 * @param normal the normal of the collision
 * @returns the impulse to apply to each body
 */
export function computeFrictionImpulse(a: RigidBody, b: RigidBody, pointA: Vector3, pointB: Vector3, normal: Vector3): [Impulse, Impulse] {
    const ra = pointA;
    const rb = pointB;

    const va = a.getVelocityAtPointNext(ra);
    const vb = b.getVelocityAtPointNext(rb);

    // relative velocity
    const rv = vb.subtract(va);
    if (Vector3.Dot(rv, normal) > 0 || rv.lengthSquared() < Settings.EPSILON ** 2) return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

    // tangent vector
    const tangent = rv.subtract(normal.scale(Vector3.Dot(normal, rv))).normalize();

    let denominator = 0;
    denominator += !a.isStatic ? 1 / a.mass : 0;
    denominator += !b.isStatic ? 1 / b.mass : 0;
    denominator += Vector3.Dot(tangent, a.nextInverseInertiaTensor.applyTo(ra.cross(tangent)).cross(ra));
    denominator += Vector3.Dot(tangent, b.nextInverseInertiaTensor.applyTo(rb.cross(tangent)).cross(rb));

    // calculate impulse scalar
    const j = -Vector3.Dot(rv, tangent) / denominator;

    // calculate impulse vector
    return [new Impulse(tangent.scale(-j), ra), new Impulse(tangent.scale(j), rb)];
}
