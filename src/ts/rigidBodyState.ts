import {Quaternion, Vector3} from "@babylonjs/core";
import {Matrix3} from "./matrix3";
import {AABB} from "./aabb";

export interface RigidBodyState {
    position: Vector3;
    rotationQuaternion: Quaternion;
    velocity: Vector3;
    omega: Vector3;
    momentum: Vector3;
    angularMomentum: Vector3;
    rotationMatrix: Matrix3;
    inverseInertiaTensor: Matrix3;
    aabb: AABB;
}

export function copyAintoB(a: RigidBodyState, b: RigidBodyState) {
    b.position.copyFrom(a.position);
    b.rotationQuaternion.copyFrom(a.rotationQuaternion);
    b.velocity.copyFrom(a.velocity);
    b.omega.copyFrom(a.omega);
    b.momentum.copyFrom(a.momentum);
    b.angularMomentum.copyFrom(a.angularMomentum);
    b.rotationMatrix.copyFrom(a.rotationMatrix);
    b.inverseInertiaTensor.copyFrom(a.inverseInertiaTensor);
    b.aabb.copyFrom(a.aabb);
}