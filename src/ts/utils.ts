import {AbstractMesh, Color3, Mesh, MeshBuilder, StandardMaterial, Vector3, VertexBuffer} from "@babylonjs/core";
import {RigidBody} from "./rigidBody";
import {AABB} from "./aabb";

export type Tree<T> = Tree<T>[] | T;

export type Triangle = [Vector3, Vector3, Vector3];

export type Contact = {
    a: RigidBody, b: RigidBody,
    aabbOverlap: AABB
}

export function triangleIntersection(triangle1: Triangle, triangle2: Triangle): boolean {
    const [a1, b1, c1] = triangle1;
    const [a2, b2, c2] = triangle2;
    const ab1 = b1.subtract(a1);
    const ac1 = c1.subtract(a1);
    const ab2 = b2.subtract(a2);
    const ac2 = c2.subtract(a2);
    const n1 = Vector3.Cross(ab1, ac1);
    const n2 = Vector3.Cross(ab2, ac2);
    const p = Vector3.Cross(n1, n2);
    const d = Vector3.Dot(p, a1);
    const d1 = Vector3.Dot(p, a2);
    const d2 = Vector3.Dot(p, b2);
    const d3 = Vector3.Dot(p, c2);
    return d1 === d && d2 === d && d3 === d;
}

export function getMeshTriangles(mesh: AbstractMesh): Triangle[] {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
    const indices = mesh.getIndices() as number[];
    const vectors: Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        let newVector = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        // we need to transform the vertices to world space
        newVector = Vector3.TransformCoordinates(newVector, mesh.getWorldMatrix());
        vectors.push(newVector);
    }
    const triangles: Triangle[] = [];
    for (let i = 0; i < indices.length; i += 3) {
        triangles.push([
            vectors[indices[i]],
            vectors[indices[i + 1]],
            vectors[indices[i + 1]]
        ])
    }
    return triangles;
}

export function pointIntersectsWithAABB(point: Vector3, aabb: AABB): boolean {
    return aabb.min.x <= point.x && point.x <= aabb.max.x
        && aabb.min.y <= point.y && point.y <= aabb.max.y
        && aabb.min.z <= point.z && point.z <= aabb.max.z;
}

export function triangleIntersectsWithAABB(triangle: Triangle, aabb: AABB): boolean {
    return pointIntersectsWithAABB(triangle[0], aabb)
        || pointIntersectsWithAABB(triangle[1], aabb)
        || pointIntersectsWithAABB(triangle[2], aabb);
}

export function testInterpenetration(contact: Contact): boolean {
    // check triangle intersection inside the overlap of the two bounding boxes
    const trianglesA = getMeshTriangles(contact.a.mesh);
    const trianglesB = getMeshTriangles(contact.b.mesh);

    const trianglesAToCheck = trianglesA.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if(trianglesAToCheck.length == 0) return false;
    const trianglesBToCheck = trianglesB.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if(trianglesBToCheck.length == 0) return false;

    for(const triangleA of trianglesAToCheck) {
        for(const triangleB of trianglesBToCheck) {
            if(triangleIntersection(triangleA, triangleB)) return true;
        }
    }
    return false;
}

export function solveContact(contact: Contact) {
    // check triangle intersection inside the overlap of the two bounding boxes
    const trianglesA = getMeshTriangles(contact.a.mesh);
    const trianglesB = getMeshTriangles(contact.b.mesh);

    const trianglesAToCheck = trianglesA.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if(trianglesAToCheck.length == 0) return;
    const trianglesBToCheck = trianglesB.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if(trianglesBToCheck.length == 0) return;
}

export function arrowhead(start: Vector3, vec: Vector3, color: Color3) {
    const shape = [
        new Vector3(-0.25, 0, 0),
        new Vector3(0, -0.25, 0),
        new Vector3(0.25, 0, 0),
        new Vector3(0, 0.25, 0)
    ];

    const path = [
        start,
        start.add(vec)
    ];

    const scaling = function(i: number, distance: number) {
        return (1 - i);
    };

    const vecRep = MeshBuilder.ExtrudeShapeCustom("vecRep", {shape: shape, path: path, closeShape: true, scaleFunction: scaling, sideOrientation: Mesh.DOUBLESIDE});
    const mat = new StandardMaterial("");
    mat.diffuseColor = color;
    vecRep.material = mat
}