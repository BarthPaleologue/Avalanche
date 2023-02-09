import { AbstractMesh, Matrix, Vector3, VertexBuffer } from "@babylonjs/core";
import { AABB } from "../aabb";
import { pointIntersectsWithAABB, triangleIntersectsWithAABB } from "../aabbIntersection";

export function getMeshVerticesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Vector3[] {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
    const vectors: Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        let newVector = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        // we need to transform the vertices to world space
        newVector = Vector3.TransformCoordinates(newVector, worldMatrix);
        vectors.push(newVector);
    }
    return vectors;
}

export function getMeshVerticesWorldSpaceInAABB(mesh: AbstractMesh, worldMatrix: Matrix, aabb: AABB) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
    const vectors: Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        let newVector = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        newVector = Vector3.TransformCoordinates(newVector, worldMatrix);
        if (pointIntersectsWithAABB(newVector, aabb)) vectors.push(newVector);
    }
    return vectors;
}

export type Triangle = [Vector3, Vector3, Vector3];

export type Edge = [Vector3, Vector3];

export function getTriangleNormal(triangle: Triangle): Vector3 {
    const [a, b, c] = triangle;
    const ab = b.subtract(a);
    const ac = c.subtract(a);
    return Vector3.Cross(ab, ac).normalize();
}

export function getMeshTrianglesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Triangle[] {
    const vertices = getMeshVerticesWorldSpace(mesh, worldMatrix);
    const indices = mesh.getIndices() as number[];
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        triangles.push([
            vertices[indices[i]],
            vertices[indices[i + 1]],
            vertices[indices[i + 2]]
        ]);
    }
    return triangles;
}

export function getMeshTrianglesWorldSpaceInAABB(mesh: AbstractMesh, worldMatrix: Matrix, aabb: AABB): Triangle[] {
    const vertices = getMeshVerticesWorldSpace(mesh, worldMatrix);
    const indices = mesh.getIndices() as number[];
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        const triangle: Triangle = [
            vertices[indices[i]],
            vertices[indices[i + 1]],
            vertices[indices[i + 2]]
        ];
        if (triangleIntersectsWithAABB(triangle, aabb)) triangles.push(triangle);
    }
    return triangles;
}

export function getMeshEdgesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Edge[] {
    const vertices = getMeshVerticesWorldSpace(mesh, worldMatrix);
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