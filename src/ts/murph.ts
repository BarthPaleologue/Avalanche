import {RigidBody} from "./rigidBody";
import {ForceField} from "./forceFields/forceField";
import {Color3, Mesh} from "@babylonjs/core";
import {AABB} from "./aabb";
import {Tree} from "./utils";

export class Murph {
    private readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];

    private bodyHierarchy: Tree<RigidBody> = [];

    private contacts: Set<RigidBody>[] = [];

    private clock = 0;
    private isPaused = false;

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

    public togglePause() {
        this.isPaused = !this.isPaused;
    }

    public update(deltaTime: number) {
        if (this.isPaused) return;
        this.clock += deltaTime;

        this.contacts = [];

        //this.buildBoundingVolumeHierarchy();

        for (const field of this.fields) {
            for (const body of this.bodies) {
                const impulse = field.computeImpulse(body);
                body.applyImpulse(impulse);
            }
        }

        // compute collisions O(n²)
        for (const body of this.bodies) {
            for (const otherBody of this.bodies) {
                if (body === otherBody) continue;

                const [intersects, overlap] = AABB.IntersectsAndOverlap(body.aabb, otherBody.aabb)
                if (intersects) {
                    // check the intersection of triangles inside the overlap
                    const contactSet = new Set<RigidBody>([body, otherBody]);
                    let isAlreadyInTheList = false;
                    for (const contact of this.contacts) {
                        if (contact.has(body) && contact.has(otherBody)) {
                            isAlreadyInTheList = true;
                            break
                        }
                    }
                    if (!isAlreadyInTheList) this.contacts.push(contactSet);
                }
            }
        }

        for (const body of this.bodies) {
            let isInContact = false;
            for (const contact of this.contacts) {
                if (contact.has(body)) {
                    isInContact = true;
                    body.aabb.color = new Color3(1, 0, 0);
                    break;
                }
            }
            if (!isInContact) body.aabb.color = new Color3(1, 1, 1);
        }

        for (const body of this.bodies) {
            body.update(deltaTime);
        }
    }
}