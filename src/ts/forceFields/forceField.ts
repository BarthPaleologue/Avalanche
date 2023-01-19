import {RigidBody} from "../rigidBody";
import {Vector3} from "@babylonjs/core";
import {Impulse} from "../impulse";

export interface ForceField {
    computeForce(body: RigidBody): Vector3;

    computeImpulse(body: RigidBody): Impulse;
}