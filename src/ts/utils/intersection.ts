import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { AABB } from "../aabb";
import { vertexToFacePenetration } from "./vertexToFace";

export type Contact = {
    a: RigidBody, b: RigidBody,
    aabbOverlap: AABB;
};

/**
 * 
 * @param contact 
 * @returns [maxPenetration, collisionPointsA, collisionPointsB, collisionTriangleNormals, collisionPenetrations]
 */
export function testInterpenetration(contact: Contact): [number, Vector3[], Vector3[], Vector3[], number[]] {
    const [penetrationDistance1, pointsA1, pointsB1, triangleNormals1, penetrationDistances1] = vertexToFacePenetration(contact.a, contact.b, contact.aabbOverlap);
    const [penetrationDistance2, pointsB2, pointsA2, triangleNormals2, penetrationDistances2] = vertexToFacePenetration(contact.b, contact.a, contact.aabbOverlap);

    //const [penetrationDistance3, pointsA3, pointsB3, triangleNormals3, penetrationDistances3] = findEdgeCollisions(contact.a, contact.b, contact.aabbOverlap);
    //const [penetrationDistance3, pointsA3, pointsB3, triangleNormals3, penetrationDistances3] = [Number.NEGATIVE_INFINITY, [], [], [], []];

    /*for (let i = 0; i < pointsA3.length; i++) {
        displayRay(pointsA3[i], pointsB3[i].subtract(pointsA3[i]).normalize(), Color3.Green(), 0);
    }*/
    /*if (penetrationDistance3 > penetrationDistance2 && penetrationDistance3 > penetrationDistance1) {
        //for (const point of pointsB3) displayPoint(point, Color3.Green(), 0);
        return [penetrationDistance3, pointsA3, pointsB3, triangleNormals3, penetrationDistances3];
    }*/

    // We need to negate the triangle normals because we need all the normals to point in the same direction
    for (const triangleNormal of triangleNormals2) triangleNormal.negateInPlace();

    const maxPenetration = Math.max(penetrationDistance1, penetrationDistance2);
    const pointsA = pointsA1.concat(pointsA2);
    const pointsB = pointsB1.concat(pointsB2);
    const triangleNormals = triangleNormals1.concat(triangleNormals2);
    const penetrationDistances = penetrationDistances1.concat(penetrationDistances2);

    return [maxPenetration, pointsA, pointsB, triangleNormals, penetrationDistances];
}