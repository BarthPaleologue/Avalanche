import { Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { Settings } from "../settings";

export class Impulse {
    readonly force: Vector3;
    readonly point: Vector3;

    /**
     *
     * @param force
     * @param point (local coordinates)
     */
    constructor(force: Vector3, point = Vector3.Zero()) {
        this.force = force;
        this.point = point;
    }
}

/**
 * Returns the impulse to apply to each body due to a collision
 * @param a The first rigid body
 * @param b The second rigid body
 * @param pointA the point on body A (local space)
 * @param pointB the point on body B (local space)
 * @param normal the normal of the collision
 */
export function computeCollisionImpulse(
    a: RigidBody,
    b: RigidBody,
    pointA: Vector3,
    pointB: Vector3,
    normal: Vector3
): [Impulse, Impulse] {
    const ra = pointA;
    const rb = pointB;

    const va = a.getVelocityAtPointNext(ra);
    const vb = b.getVelocityAtPointNext(rb);
    // relative velocity
    const rv = Vector3.Dot(normal, vb.subtract(va));

    // if points are moving away from each other, no impulse is needed
    if (rv > 0 || Math.abs(rv) < Settings.EPSILON)
        return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

    let denominator = 0;
    denominator += !a.isStatic ? 1 / a.mass : 0;
    denominator += !b.isStatic ? 1 / b.mass : 0;
    denominator += !a.isStatic
        ? Vector3.Dot(normal, a.nextInverseInertiaTensor.applyTo(ra.cross(normal)).cross(ra))
        : 0;
    denominator += !b.isStatic
        ? Vector3.Dot(normal, b.nextInverseInertiaTensor.applyTo(rb.cross(normal)).cross(rb))
        : 0;
    // calculate impulse scalar
    const restitution = a.restitution * b.restitution;
    const j = (-(1 + restitution) * rv) / denominator;

    // calculate impulse vector
    return [new Impulse(normal.scale(-j), ra), new Impulse(normal.scale(j), rb)];
}

/**
 * Returns the impulse to apply to each body due to friction
 * @param a The first rigid body
 * @param b The second rigid body
 * @param pointA the point on body A (local space)
 * @param pointB the point on body B (local space)
 * @param normal the normal of the collision
 * @returns the impulse to apply to each body
 */
export function computeFrictionImpulse(
    a: RigidBody,
    b: RigidBody,
    pointA: Vector3,
    pointB: Vector3,
    normal: Vector3
): [Impulse, Impulse] {
    const ra = pointA;
    const rb = pointB;

    const va = a.getVelocityAtPointNext(ra);
    const vb = b.getVelocityAtPointNext(rb);

    // relative velocity
    const rv = vb.subtract(va);
    if (Vector3.Dot(rv, normal) > 0 || rv.lengthSquared() < Settings.EPSILON ** 2)
        return [new Impulse(Vector3.Zero(), Vector3.Zero()), new Impulse(Vector3.Zero(), Vector3.Zero())];

    // tangent vector (relative velocity projected on the plane orthogonal to the normal)
    const tangent = rv.subtract(normal.scale(Vector3.Dot(normal, rv))).normalize();

    let denominator = 0;
    denominator += !a.isStatic ? 1 / a.mass : 0;
    denominator += !b.isStatic ? 1 / b.mass : 0;
    denominator += Vector3.Dot(tangent, a.nextInverseInertiaTensor.applyTo(ra.cross(tangent)).cross(ra));
    denominator += Vector3.Dot(tangent, b.nextInverseInertiaTensor.applyTo(rb.cross(tangent)).cross(rb));

    const friction = Math.max(a.friction, b.friction);

    // calculate impulse scalar
    const j = (-friction * Vector3.Dot(rv, tangent)) / denominator;

    // calculate impulse vector
    return [new Impulse(tangent.scale(-j), ra), new Impulse(tangent.scale(j), rb)];
}
