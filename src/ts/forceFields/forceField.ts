import { RigidBody } from "../rigidBody";
import { Force } from "./force";

export interface ForceField {
    computeForce(body: RigidBody): Force;
}
