import {RigidBody} from "./rigidBody";
import {ForceField} from "./forceFields/forceField";
import {BoundingBox, Color3} from "@babylonjs/core";
import {AABB} from "./aabb";

type Tree<T> = Tree<T>[] | T;

export class Murph {
    private readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];

    private bodyHierarchy: Tree<RigidBody> = [];

    private clock = 0;

    constructor() {
        //
    }

    public addBody(body: RigidBody) {
        this.bodies.push(body);
    }

    public addField(field: ForceField) {
        this.fields.push(field);
    }

    /*private buildBoundingVolumeHierarchy() {
        // creates a tree of bodies that are close to each other
        // bottom up
    }*/

    public update(deltaTime: number) {
        this.clock += deltaTime;

        //this.buildBoundingVolumeHierarchy();

        for (const field of this.fields) {
            for (const body of this.bodies) {
                const impulse = field.computeImpulse(body);
                body.applyImpulse(impulse);
            }
        }

        // compute collisions
        for (const body of this.bodies) {
            for (const otherBody of this.bodies) {
                if (body === otherBody) {
                    continue;
                }

                if (AABB.Intersects(body.aabb, otherBody.aabb)) {
                    body.aabb.color = new Color3(1, 0, 0).toColor4(1);
                    otherBody.aabb.color = new Color3(1, 0, 0).toColor4(1);

                    // there is maybe a collision
                    // check the triangles of the two bodies
                    // if there is a collision, apply the impulse
                    /*const [point, normal] = body.computeCollisionPointAndNormal(otherBody);
                    if(point.lengthSquared() > 0) {
                        // there is a collision
                        //const impulse = body.computeCollisionImpulse(otherBody, point, normal);
                        //body.applyImpulse(impulse);
                    }*/

                } else {
                    body.aabb.color = new Color3(1, 1, 1).toColor4(1);
                    otherBody.aabb.color = new Color3(1, 1, 1).toColor4(1);
                }
            }
        }

        for (const body of this.bodies) {
            body.update(deltaTime);
        }
    }
}