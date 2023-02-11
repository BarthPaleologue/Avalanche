import { Color3, Vector3 } from "@babylonjs/core";
import { Settings } from "../settings";
import { Edge, closestPointOnEdge, getMeshEdgesWorldSpace, getUniqueEdgesWorldSpaceInAABB } from "./edge";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";
import { displayEdge } from "./display";

export function findEdgeCollisions(bodyA: RigidBody, bodyB: RigidBody, overlap: AABB): [number, Vector3[], Vector3[], Vector3[], number[]] {
    const edgesA = getUniqueEdgesWorldSpaceInAABB(bodyA.mesh, bodyA.mesh.getWorldMatrix(), overlap);
    const edgesB = getUniqueEdgesWorldSpaceInAABB(bodyB.mesh, bodyB.mesh.getWorldMatrix(), overlap);

    const penetrationDistances: number[] = [];
    const intersectionPointsEdgesA: Vector3[] = [];
    const intersectionPointsEdgesB: Vector3[] = [];
    const normals: Vector3[] = [];

    let maxPenetration = Number.NEGATIVE_INFINITY;

    const intersectingEdges: [Edge, Edge][] = [];

    for (const edgeA of edgesA) {
        const middleEdgeA = edgeA[0].add(edgeA[1]).scale(0.5);
        for (const edgeB of edgesB) {
            const middleEdgeB = edgeB[0].add(edgeB[1]).scale(0.5);

            const projectedA0 = closestPointOnEdge(edgeA[0], edgeB);
            const projectedA1 = closestPointOnEdge(edgeA[1], edgeB);
            const projectedAMiddle = projectedA0.add(projectedA1).scale(0.5);

            const distToCenter1 = projectedAMiddle.subtract(bodyA.nextState.position).length();
            const distToCenter2 = middleEdgeA.subtract(bodyA.nextState.position).length();

            const penetrationDistance = distToCenter2 - distToCenter1;

            if (penetrationDistance > -Settings.EPSILON) {
                const projectedB0 = closestPointOnEdge(edgeB[0], edgeA);
                const projectedB1 = closestPointOnEdge(edgeB[1], edgeA);
                const projectedBMiddle = projectedB0.add(projectedB1).scale(0.5);

                const distToCenter3 = projectedBMiddle.subtract(bodyB.nextState.position).length();
                const distToCenter4 = middleEdgeB.subtract(bodyB.nextState.position).length();

                const penetrationDistance2 = distToCenter4 - distToCenter3;

                if (penetrationDistance2 > -Settings.EPSILON) {
                    const penetration = Math.min(penetrationDistance, penetrationDistance2);
                    if (penetration > maxPenetration) {
                        maxPenetration = penetration;
                    }

                    penetrationDistances.push(penetration);
                    if (!intersectionPointsEdgesA.includes(middleEdgeA)) intersectionPointsEdgesA.push(middleEdgeA);
                    if (!intersectionPointsEdgesB.includes(middleEdgeB)) intersectionPointsEdgesB.push(middleEdgeB);

                    const normal = edgeA[0].subtract(edgeA[1]).cross(edgeB[0].subtract(edgeB[1])).normalize();

                    normals.push(normal);

                    intersectingEdges.push([edgeA, edgeB]);
                }
            }
        }
    }

    for (const [edgeA, edgeB] of intersectingEdges) {
        //displayEdge(edgeA, Color3.Red(), 16);
        //displayEdge(edgeB, Color3.Red());
    }

    return [maxPenetration, intersectionPointsEdgesA, intersectionPointsEdgesB, normals, penetrationDistances];
}