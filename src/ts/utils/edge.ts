import { AbstractMesh, Matrix, Vector3 } from "@babylonjs/core";
import { getMeshAllVerticesWorldSpace } from "./vertex";

export type Edge = [Vector3, Vector3];

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

export function closestPointOnEdge(point: Vector3, edge: Edge): Vector3 {
    const [a, b] = edge;
    const ab = b.subtract(a);
    const ap = point.subtract(a);
    const t = Vector3.Dot(ap, ab) / Vector3.Dot(ab, ab);
    return a.add(ab.scale(t));
}