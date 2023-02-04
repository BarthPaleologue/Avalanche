import {AbstractMesh, Matrix, Vector3, VertexBuffer} from "@babylonjs/core";

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

export type Triangle = [Vector3, Vector3, Vector3];

export function getMeshTrianglesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Triangle[] {
    const vertices = getMeshVerticesWorldSpace(mesh, worldMatrix);
    const indices = mesh.getIndices() as number[];
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        triangles.push([
            vertices[indices[i]],
            vertices[indices[i + 1]],
            vertices[indices[i + 2]]
        ])
    }
    return triangles;
}