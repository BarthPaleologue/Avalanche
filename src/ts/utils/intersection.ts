import { Ray, Vector3 } from "@babylonjs/core";
import { getMeshUniqueVerticesWorldSpaceInAABB } from "./vertex";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";
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

    const pointsA = getMeshUniqueVerticesWorldSpaceInAABB(bodyA.mesh, worldMatrixA, overlap);
    const trianglesB = getMeshTrianglesWorldSpaceInAABB(bodyB.mesh, worldMatrixB, overlap);

    let maxPenetration = Number.NEGATIVE_INFINITY;

    const collisionPointsA: Vector3[] = [];
    const collisionPointsB: Vector3[] = [];
    const collisionNormals: Vector3[] = [];
    const penetrationDistances: number[] = [];

    for (const point of pointsA) {
        const collisionPointVertex = point;
        let collisionPointTriangle = Vector3.Zero();
        let collisionPenetration = Number.NEGATIVE_INFINITY;
        let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];

        const rayOrigin = bodyA.nextState.position;
        const rayDirection = point.subtract(rayOrigin).normalize();
        const rayLength = point.subtract(rayOrigin).length();

        for (const triangle of trianglesB) {
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
    const [penetrationDistance1, pointsA1, pointsB1, triangleNormals1, penetrationDistances1] = vertexToFacePenetration(contact.a, contact.b, contact.aabbOverlap);
    const [penetrationDistance2, pointsB2, pointsA2, triangleNormals2, penetrationDistances2] = vertexToFacePenetration(contact.b, contact.a, contact.aabbOverlap);

    // We need to negate the triangle normals because we need all the normals to point in the same direction
    for (const triangleNormal of triangleNormals2) triangleNormal.negateInPlace();

    const maxPenetration = Math.max(penetrationDistance1, penetrationDistance2);
    const pointsA = pointsA1.concat(pointsA2);
    const pointsB = pointsB1.concat(pointsB2);
    const triangleNormals = triangleNormals1.concat(triangleNormals2);
    const penetrationDistances = penetrationDistances1.concat(penetrationDistances2);

    return [maxPenetration, pointsA, pointsB, triangleNormals, penetrationDistances];
}