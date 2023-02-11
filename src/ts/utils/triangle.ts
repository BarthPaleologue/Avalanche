import { AbstractMesh, Matrix, Vector3 } from "@babylonjs/core";
import { getMeshAllVerticesWorldSpace } from "./vertex";
import { AABB } from "../aabb";

export type Triangle = [Vector3, Vector3, Vector3];

export function getTriangleNormal(triangle: Triangle): Vector3 {
    const [a, b, c] = triangle;
    const ab = b.subtract(a);
    const ac = c.subtract(a);
    return Vector3.Cross(ab, ac).normalize();
}

export function getMeshTrianglesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Triangle[] {
    const vertices = getMeshAllVerticesWorldSpace(mesh, worldMatrix);
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
    const vertices = getMeshAllVerticesWorldSpace(mesh, worldMatrix);
    const indices = mesh.getIndices() as number[];
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        const triangle: Triangle = [
            vertices[indices[i]],
            vertices[indices[i + 1]],
            vertices[indices[i + 2]]
        ];
        if (aabb.intersects(AABB.FromTriangle(triangle))) triangles.push(triangle);
    }
    return triangles;
}
