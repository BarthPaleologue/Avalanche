import { AbstractMesh, Matrix, Vector3, VertexBuffer } from "@babylonjs/core";
import { AABB } from "../aabb";

/**
 * Returns true if the vector is included in the array (compared with the equals method)
 * @param vector The vector to check
 * @param array The array to check
 * @returns True if the vector is included in the array
 */
export function doesVectorArrayIncludes(vector: Vector3, array: Vector3[]): boolean {
    for (const v of array) if (v.equals(vector)) return true;
    return false;
}

/**
 * Returns the vertices of the mesh in world space (with redundant vertices)
 * @param mesh The mesh to get the vertices from
 * @param worldMatrix The world matrix of the mesh
 * @returns An array of vectors
 */
export function getMeshAllVerticesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Vector3[] {
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

/**
 * Returns the unique vertices of the mesh in world space (without redundant vertices)
 * @param mesh The mesh to get the vertices from
 * @param worldMatrix The world matrix of the mesh
 * @returns An array of vectors
 */
export function getMeshUniqueVerticesWorldSpace(mesh: AbstractMesh, worldMatrix: Matrix): Vector3[] {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
    const vectors: Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        let newVector = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        // we need to transform the vertices to world space
        newVector = Vector3.TransformCoordinates(newVector, worldMatrix);
        if (!doesVectorArrayIncludes(newVector, vectors)) vectors.push(newVector);
    }
    return vectors;
}

/**
 * Returns the vertices of the mesh in world space that are inside the AABB (without redundant vertices)
 * @param mesh The mesh to get the vertices from
 * @param worldMatrix The world matrix of the mesh
 * @param aabb The AABB to check
 * @returns An array of vectors
 */
export function getMeshUniqueVerticesWorldSpaceInAABB(mesh: AbstractMesh, worldMatrix: Matrix, aabb: AABB) {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
    const vectors: Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        let newVector = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        newVector = Vector3.TransformCoordinates(newVector, worldMatrix);
        if (!doesVectorArrayIncludes(newVector, vectors) && aabb.containsPoint(newVector)) vectors.push(newVector);
    }
    return vectors;
}
