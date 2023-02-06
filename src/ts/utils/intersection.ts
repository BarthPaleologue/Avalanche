import { Ray, Vector3 } from "@babylonjs/core";
import { closestPointOnEdge, Edge, getMeshTrianglesWorldSpaceInAABB, getMeshVerticesWorldSpaceInAABB, getTriangleNormal, Triangle } from "./vertex";
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

/**
 * 
 * @param contact 
 * @param reverse 
 * @returns [maxPenetration, collisionVerticesA, collisionRayPointsB, collisionTriangles, collisionPenetrations]
 */
export function vertexToFacePenetration(contact: Contact, reverse = false): [number, Vector3[], Vector3[], Vector3[], number[]] {
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

    const collisionPointsVertex: Vector3[] = [];
    const collisionPointsTriangle: Vector3[] = [];
    const collisionTriangleNormals: Vector3[] = [];
    const collisionPenetrations: number[] = [];

    for (const point of pointsToCheck) {
        const collisionPointVertex = point;
        let collisionPointTriangle = Vector3.Zero();
        let collisionPenetration = Number.NEGATIVE_INFINITY;
        let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];

        for (const triangle of trianglesToCheck) {
            const rayOrigin = reverse ? contact.b.nextState.position : contact.a.nextState.position;
            const rayDirection = point.subtract(rayOrigin).normalize();
            const rayLength = point.subtract(rayOrigin).length();

            const intersectDistance = intersectRayTriangle(rayOrigin, rayDirection, triangle);
            if (intersectDistance <= 0) continue;

            const penetration = rayLength - intersectDistance;

            if (penetration > maxPenetration) maxPenetration = penetration;


            if (penetration > collisionPenetration) {
                collisionPenetration = penetration;
                collisionPointTriangle = rayDirection.scale(intersectDistance).add(rayOrigin);
                collisionTriangle = triangle;
            }
        }

        if (maxPenetration == Number.NEGATIVE_INFINITY) continue;
        if (collisionPointTriangle.lengthSquared() == 0) continue;
        if (Math.abs(maxPenetration) < EPSILON || maxPenetration > EPSILON) {
            collisionPointsVertex.push(collisionPointVertex);
            collisionPointsTriangle.push(collisionPointTriangle);

            const triangleNormal = reverse ? getTriangleNormal(collisionTriangle).negate() : getTriangleNormal(collisionTriangle);
            collisionTriangleNormals.push(triangleNormal);

            collisionPenetrations.push(collisionPenetration);
        }
    }

    console.assert(collisionPointsVertex.length == collisionPointsTriangle.length && collisionPointsVertex.length == collisionTriangleNormals.length && collisionPointsVertex.length == collisionPenetrations.length);

    return [maxPenetration, collisionPointsVertex, collisionPointsTriangle, collisionTriangleNormals, collisionPenetrations];
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

/**
 * 
 * @param contact 
 * @returns [maxPenetration, collisionPointsA, collisionPointsB, collisionTriangleNormals, collisionPenetrations]
 */
export function testInterpenetration(contact: Contact): [number, Vector3[], Vector3[], Vector3[], number[]] {
    const [penetrationDistance1, pointsA1, pointsB1, triangleNormals1, collisionPenetrations1] = vertexToFacePenetration(contact, false);
    const [penetrationDistance2, pointsB2, pointsA2, triangleNormals2, collisionPenetrations2] = vertexToFacePenetration(contact, true);

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
    if (rv > 0 || Math.abs(rv) < EPSILON) return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

    let denominator = 0;
    denominator += !a.isStatic ? 1 / a.mass : 0;
    denominator += !b.isStatic ? 1 / b.mass : 0;
    denominator += Vector3.Dot(normal, a.nextInverseInertiaTensor.applyTo(ra.cross(normal)).cross(ra));
    denominator += Vector3.Dot(normal, b.nextInverseInertiaTensor.applyTo(rb.cross(normal)).cross(rb));
    // calculate impulse scalar
    const restitution = 0.4;
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
    if (Vector3.Dot(rv, normal) > 0 || rv.lengthSquared() < EPSILON * EPSILON) return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

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