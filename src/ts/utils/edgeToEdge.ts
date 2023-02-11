import { Vector3 } from "@babylonjs/core";
import { Settings } from "../settings";
import { Edge, closestPointOnEdge, getMeshEdgesWorldSpace, getUniqueEdgesWorldSpaceInAABB } from "./edge";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";

/*export function findEdgeCollisions(edges1: Edge[], edges2: Edge[]): [number, Vector3[], Vector3[], number[]] {
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
}*/

export function findEdgeCollisions(bodyA: RigidBody, bodyB: RigidBody, overlap: AABB): [number, Vector3[], Vector3[], Vector3[], number[]] {
    const edgesA = getUniqueEdgesWorldSpaceInAABB(bodyA.mesh, bodyA.mesh.getWorldMatrix(), overlap);
    const edgesB = getUniqueEdgesWorldSpaceInAABB(bodyB.mesh, bodyB.mesh.getWorldMatrix(), overlap);

    const closestDistances: number[] = [];
    const intersectionPointsEdgesA: Vector3[] = [];
    const intersectionPointsEdgesB: Vector3[] = [];
    const normals: Vector3[] = [];
    const distances: number[] = [];

    for (const edgeA of edgesA) {
        for (const edgeB of edgesB) {
            const closestPoint = closestPointOnEdge(edgeA[0], edgeB);
            const distanceSquared = Vector3.DistanceSquared(edgeA[0], closestPoint);
            if (distanceSquared <= Settings.EPSILON ** 2) {
                closestDistances.push(Math.sqrt(distanceSquared));
                intersectionPointsEdgesA.push(edgeA[0]);
                intersectionPointsEdgesB.push(closestPoint);
                const normal = Vector3.Cross(edgeA[1].subtract(edgeA[0]), edgeB[1].subtract(edgeB[0])).normalize();
                normals.push(normal);
                distances.push(Vector3.Distance(edgeA[0], closestPoint));
            }
        }
    }

    let closestDistance = Number.MAX_VALUE;
    for (const distance of closestDistances) {
        if (distance < closestDistance) {
            closestDistance = distance;
        }
    }

    return [closestDistance, intersectionPointsEdgesA, intersectionPointsEdgesB, normals, distances];
}