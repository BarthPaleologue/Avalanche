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
import {Impulse} from "./impulse";

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

function intersectRayTriangle(rayOrigin: Vector3, rayEnd: Vector3, triangle: Triangle): [boolean, number, Vector3, Vector3] {
    const edge1 = triangle[1].subtract(triangle[0]);
    const edge2 = triangle[2].subtract(triangle[0]);
    const rayDir = rayEnd.subtract(rayOrigin).normalize();
    const h = rayDir.cross(edge2);
    const a = Vector3.Dot(edge1, h);

    if (a > -0.00001 && a < 0.00001) {
        return [false, 0, h, Vector3.Zero()];
    }

    const f = 1 / a;
    const s = rayOrigin.subtract(triangle[0]);
    const u = f * Vector3.Dot(s, h);

    if (u < 0.0 || u > 1.0) {
        return [false, 0, h, Vector3.Zero()];
    }

    const q = s.cross(edge1);
    const v = f * Vector3.Dot(rayDir, q);

    if (v < 0.0 || u + v > 1.0) {
        return [false, 0, h, Vector3.Zero()];
    }

    const t = f * Vector3.Dot(edge2, q);

    if (t > 0.00001 && t < rayEnd.subtract(rayOrigin).length()) {
        return [true, t, h, rayOrigin.add(rayDir.scale(t))];
    } else {
        return [false, 0, h, Vector3.Zero()];
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

export function testInterpenetration(contact: Contact): [boolean, number, Vector3, Vector3] {
    //let maxInterpenetration = 0;
    const pointsA = getMeshVerticesWorldSpace(contact.a.mesh);
    const trianglesB = getMeshTriangles(contact.b.mesh);

    const pointsAToCheck = pointsA.filter((point: Vector3) => pointIntersectsWithAABB(point, contact.aabbOverlap));
    const trianglesBToCheck = trianglesB.filter((triangle: Triangle) => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));

    let minPenetration = Number.POSITIVE_INFINITY;
    let collisionNormal = Vector3.Zero();
    let collisionPointA = Vector3.Zero();
    let collisionPointB = Vector3.Zero();
    let collisionTriangle: Triangle = [Vector3.Zero(), Vector3.Zero(), Vector3.Zero()];
    for (const point of pointsAToCheck) {
        for (const triangle of trianglesBToCheck) {
            const [intersect, penetrationDistance, triangleNormal, intersectionPoint] = intersectRayTriangle(contact.a.mesh.position, point, triangle);
            if (intersect && penetrationDistance < minPenetration) {
                minPenetration = penetrationDistance;
                collisionTriangle = triangle;
                collisionPointA = point;
                collisionPointB = intersectionPoint;
                collisionNormal = triangleNormal;
            }
        }
    }
    if (collisionNormal.lengthSquared() > 0) {
        //console.log(minPenetration, collisionNormal, collisionTriangle);
        displayTriangle(collisionTriangle);
        displayPoint(collisionPointA);
        //arrowhead(contact.a.mesh.position, collisionPointA.subtract(contact.a.mesh.position), Color3.Red());
        return [true, minPenetration, collisionPointA, collisionPointB];
    }
    return [false, 0, Vector3.Zero(), Vector3.Zero()];
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

export function computeImpulse(a: RigidBody, b: RigidBody, pointA: Vector3, pointB: Vector3, normal: Vector3): [Impulse, Impulse] {
    const ra = pointA.subtract(a.position);
    const rb = pointB.subtract(b.position);

    const va = a.velocity.add(a.omega.cross(ra));
    const vb = b.velocity.add(b.omega.cross(rb));
    // relative velocity
    const rv = Vector3.Dot(normal, vb.subtract(va));

    let denominator = 0;
    denominator += a.mass > 0 ? 1 / a.mass : 0;
    denominator += b.mass > 0 ? 1 / b.mass : 0;
    denominator += Vector3.Dot(normal, a.inverseInertiaTensor.applyTo(ra.cross(normal)).cross(ra));
    denominator += Vector3.Dot(normal, b.inverseInertiaTensor.applyTo(rb.cross(normal)).cross(rb));
    // calculate impulse scalar
    const restitution = 0.7;
    const j = 40 * -(1 + restitution) * rv / denominator;

    // calculate impulse vector
    return [new Impulse(normal.scale(j), pointA), new Impulse(normal.scale(-j), pointB)];
}