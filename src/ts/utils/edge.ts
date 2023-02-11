import { AbstractMesh, Matrix, Vector3 } from "@babylonjs/core";
import { getMeshAllVerticesWorldSpace } from "./vertex";
import { AABB } from "../aabb";

export type Edge = [Vector3, Vector3];

export function isEdgeInArray(edge: Edge, edges: Edge[]): boolean {
    return edges.findIndex(edge2 => edge[0].equals(edge2[0]) && edge[1].equals(edge2[1])) !== -1;
}

export function getMeshEdgesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Edge[] {
    const vertices = getMeshAllVerticesWorldSpace(mesh, worldMatrix);
    const indices = mesh.getIndices() as number[];
    const edges: Edge[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        edges.push([
            vertices[indices[i]],
            vertices[indices[i + 1]]
        ]);
        edges.push([
            vertices[indices[i + 1]],
            vertices[indices[i + 2]]
        ]);
        edges.push([
            vertices[indices[i + 2]],
            vertices[indices[i]]
        ]);
    }
    return edges;
}

export function getUniqueEdgesWorldSpaceInAABB(mesh: AbstractMesh, worldMatrix: Matrix, aabb: AABB): Edge[] {
    const vertices = getMeshAllVerticesWorldSpace(mesh, worldMatrix);
    const indices = mesh.getIndices() as number[];
    const edges: Edge[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        const a = vertices[indices[i]];
        const b = vertices[indices[i + 1]];
        const c = vertices[indices[i + 2]];

        const ab: Edge = [a, b];
        const bc: Edge = [b, c];
        const ca: Edge = [c, a];

        if (aabb.intersects(AABB.FromEdge(ab)) && !isEdgeInArray(ab, edges)) edges.push(ab);
        if (aabb.intersects(AABB.FromEdge(bc)) && !isEdgeInArray(bc, edges)) edges.push(bc);
        if (aabb.intersects(AABB.FromEdge(ca)) && !isEdgeInArray(ca, edges)) edges.push(ca);

    }
    return edges;
}

/**
 * Returns the closest point on an edge to a given point. The point returned is between the two points of the edge.
 * @param point 
 * @param edge 
 * @returns 
 */
export function closestPointOnEdge(point: Vector3, edge: Edge): Vector3 {
    const [a, b] = edge;
    const ab = b.subtract(a);
    const ap = point.subtract(a);
    const abDotAp = Vector3.Dot(ab, ap);
    const abDotAb = Vector3.Dot(ab, ab);
    const t = abDotAp / abDotAb;
    return a.add(ab.scale(t));
}