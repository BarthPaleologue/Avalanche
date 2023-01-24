import {
    AbstractMesh,
    Color3,
    Mesh,
    MeshBuilder,
    StandardMaterial,
    Vector3,
    VertexBuffer,
    VertexData
} from "@babylonjs/core";
import {RigidBody} from "./rigidBody";
import {AABB} from "./aabb";

export type Tree<T> = Tree<T>[] | T;

export type Triangle = [Vector3, Vector3, Vector3];

export type Contact = {
    a: RigidBody, b: RigidBody,
    aabbOverlap: AABB
}

export function barycenter(triangle: Triangle): Vector3 {
    return triangle[0].add(triangle[1]).add(triangle[2]).scale(1 / 3);
}

export function displayTriangle(triangle: Triangle) {
    const mesh = new Mesh("triangle");

    //Set arrays for positions and indices
    const positions = [triangle[0].x, triangle[0].y, triangle[0].z,
        triangle[1].x, triangle[1].y, triangle[1].z,
        triangle[2].x, triangle[2].y, triangle[2].z];
    const indices = [0, 1, 2];

    //Create a vertexData object
    const vertexData = new VertexData();

    //Assign positions and indices to vertexData
    vertexData.positions = positions;
    vertexData.indices = indices;

    //Apply vertexData to custom mesh
    vertexData.applyToMesh(mesh);

    const material = new StandardMaterial("triangle");
    material.emissiveColor = Color3.Green();
    material.backFaceCulling = false;
    mesh.material = material;

    setTimeout(() => mesh.dispose(), 16);
}

export function displayPoint(point: Vector3) {
    const mesh = MeshBuilder.CreateBox("point", {size: 0.1});
    mesh.position = point;

    const material = new StandardMaterial("triangle");
    material.emissiveColor = Color3.Purple();
    material.backFaceCulling = false;
    mesh.material = material;

    setTimeout(() => mesh.dispose(), 16);
}

/*export function triangleIntersection(triangle1: Triangle, triangle2: Triangle): boolean {
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
}*/

/**
 * Computes the intersection and penetration distance of a ray inside a triangle
 * @param point
 * @param direction
 * @param triangle
 * @see https://courses.cs.washington.edu/courses/cse457/07sp/lectures/triangle_intersection.pdf
 */
export function segmentTriangleIntersection(pointA: Vector3, pointB: Vector3, triangle: Triangle): [boolean, number, Vector3] {
    const triangleNormal = Vector3.Normalize(
        triangle[2].subtract(triangle[0]).cross(triangle[1].subtract(triangle[0])));
    const rayDir = Vector3.Normalize(pointB.subtract(pointA));
    const rayLength = pointB.subtract(pointA).length();
    // n dot X = d
    const d = Vector3.Dot(triangleNormal, triangle[0]);
    const nd = Vector3.Dot(triangleNormal, rayDir);
    if (Math.abs(nd) < 1e-4) return [false, 0, Vector3.Zero()];
    // intersection along ray
    const t = (d - Vector3.Dot(triangleNormal, pointA)) / nd;

    if (t <= rayLength) {
        // there is interpenetration
        return [true, rayLength - t, triangleNormal];
    }
    // there is no interpenetration
    return [false, 0, Vector3.Zero()];
}

function intersectRayTriangle(rayOrigin: Vector3, rayEnd: Vector3, triangle: [Vector3, Vector3, Vector3]): [boolean, number, Vector3] {
    const edge1 = triangle[1].subtract(triangle[0]);
    const edge2 = triangle[2].subtract(triangle[0]);
    const rayDir = rayEnd.subtract(rayOrigin).normalize();
    const h = rayDir.cross(edge2);
    const a = Vector3.Dot(edge1, h);

    if (a > -0.00001 && a < 0.00001) {
        return [false, 0, h];
    }

    const f = 1 / a;
    const s = rayOrigin.subtract(triangle[0]);
    const u = f * Vector3.Dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return [false, 0, h];
    }

    const q = s.cross(edge1);
    const v = f * Vector3.Dot(rayDir, q);

    if (v < 0.0 || u + v > 1.0) {
        return [false, 0, h];
    }

    const t = f * Vector3.Dot(edge2, q);

    if (t > 0.00001 && t < rayEnd.subtract(rayOrigin).length()) {
        return [true, t, h];
    } else {
        return [false, 0, h];
    }
}


export function getMeshPointsInAABB(mesh: AbstractMesh, aabb: AABB) {
    const points = getMeshVerticesWorldSpace(mesh);
    return points.filter((point: Vector3) => pointIntersectsWithAABB(point, aabb));
}

export function getMeshVerticesWorldSpace(mesh: AbstractMesh): Vector3[] {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
    const vectors: Vector3[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        let newVector = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        // we need to transform the vertices to world space
        newVector = Vector3.TransformCoordinates(newVector, mesh.getWorldMatrix());
        vectors.push(newVector);
    }
    return vectors;
}

export function getMeshTriangles(mesh: AbstractMesh): Triangle[] {
    const vertices = getMeshVerticesWorldSpace(mesh);
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

export function pointIntersectsWithAABB(point: Vector3, aabb: AABB): boolean {
    return aabb.min.x <= point.x && point.x <= aabb.max.x
        && aabb.min.y <= point.y && point.y <= aabb.max.y
        && aabb.min.z <= point.z && point.z <= aabb.max.z;
}

export function triangleIntersectsWithAABB(triangle: Triangle, aabb: AABB): boolean {
    const min = Vector3.Minimize(Vector3.Minimize(triangle[0], triangle[1]), triangle[2]);
    const max = Vector3.Maximize(Vector3.Maximize(triangle[0], triangle[1]), triangle[2])
    return AABB.Intersects(aabb, new AABB(min, max));
}

/*export function testInterpenetration2(contact: Contact): boolean {
    // check triangle intersection inside the overlap of the two bounding boxes
    const trianglesA = getMeshTriangles(contact.a.mesh);
    const trianglesB = getMeshTriangles(contact.b.mesh);

    const trianglesAToCheck = trianglesA.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if (trianglesAToCheck.length == 0) return false;
    const trianglesBToCheck = trianglesB.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if (trianglesBToCheck.length == 0) return false;

    for (const triangleA of trianglesAToCheck) {
        for (const triangleB of trianglesBToCheck) {
            if (triangleIntersection(triangleA, triangleB)) return true;
        }
    }
    return false;
}*/

export function testInterpenetration(contact: Contact): [boolean, number] {
    //let maxInterpenetration = 0;
    const pointsA = getMeshVerticesWorldSpace(contact.a.mesh);
    const trianglesB = getMeshTriangles(contact.b.mesh);

    const pointsAToCheck = pointsA.filter((point: Vector3) => pointIntersectsWithAABB(point, contact.aabbOverlap));
    const trianglesBToCheck = trianglesB.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));

    let minPenetration = Number.POSITIVE_INFINITY;
    let collisionNormal = Vector3.Zero();
    let collisionPoint = Vector3.Zero();
    let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];
    for (const point of pointsAToCheck) {
        for (const triangle of trianglesBToCheck) {
            const [intersect, penetrationDistance, triangleNormal] = intersectRayTriangle(contact.a.mesh.position, point, triangle);
            if (intersect && penetrationDistance < minPenetration) {
                minPenetration = penetrationDistance;
                collisionTriangle = triangle;
                collisionPoint = point;
                collisionNormal = triangleNormal;
            }
        }
    }
    if (collisionNormal.lengthSquared() > 0) {
        //console.log(minPenetration, collisionNormal, collisionTriangle);
        displayTriangle(collisionTriangle);
        displayPoint(collisionPoint);
        //arrowhead(contact.a.mesh.position, collisionPoint.subtract(contact.a.mesh.position), Color3.Red());
        return [true, minPenetration];
    }
    return [false, 0];
}

export function solveContact(contact: Contact) {
    // check triangle intersection inside the overlap of the two bounding boxes
    const trianglesA = getMeshTriangles(contact.a.mesh);
    const trianglesB = getMeshTriangles(contact.b.mesh);

    const trianglesAToCheck = trianglesA.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if (trianglesAToCheck.length == 0) return;
    const trianglesBToCheck = trianglesB.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
    if (trianglesBToCheck.length == 0) return;
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

    const scaling = function (i: number, distance: number) {
        return (1 - i);
    };

    const vecRep = MeshBuilder.ExtrudeShapeCustom("vecRep", {
        shape: shape,
        path: path,
        closeShape: true,
        scaleFunction: scaling,
        sideOrientation: Mesh.DOUBLESIDE
    });
    const mat = new StandardMaterial("");
    mat.diffuseColor = color;
    vecRep.material = mat
}