import { RigidBody } from "../rigidBody";
import { Impulse } from "../impulse";
import { Force } from "./force";

export interface ForceField {
    computeForce(body: RigidBody): Force;

    computeImpulse(body: RigidBody): Impulse;
}