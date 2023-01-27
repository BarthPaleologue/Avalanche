import {RigidBody} from "./rigidBody";
import {ForceField} from "./forceFields/forceField";
import {Color3} from "@babylonjs/core";
import {AABB} from "./aabb";
import {arrowhead, computeImpulse, Contact, testInterpenetration, Tree} from "./utils";

export class Murph {
    private readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];

    private bodyHierarchy: Tree<RigidBody> = [];

    private contacts: Contact[] = [];

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

        for(const contact of this.contacts) contact.aabbOverlap.helperMesh?.dispose();
        this.contacts = [];

        for (const field of this.fields) {
            for (const body of this.bodies) {
                const impulse = field.computeImpulse(body);
                body.applyImpulse(impulse);
            }
        }

        // compute collisions O(n²) broad phase
        for (const body of this.bodies) {
            for (const otherBody of this.bodies) {
                if (body === otherBody) continue;

                const [intersects, overlap] = AABB.IntersectsAndOverlap(body.aabb, otherBody.aabb)
                if (intersects) {
                    // check the intersection of triangles inside the overlap
                    const contactSet: Contact = {
                        a: body, b: otherBody,
                        aabbOverlap: overlap
                    }//new Set<RigidBody>([body, otherBody]);
                    let isAlreadyInTheList = false;
                    for (const contact of this.contacts) {
                        if ((contact.a == body || contact.b == body) && (contact.a == otherBody && contact.b == otherBody)) {
                            isAlreadyInTheList = true;
                            break
                        }
                    }
                    if (!isAlreadyInTheList) this.contacts.push(contactSet);
                }
            }
        }

        // compute collisions O(n²) narrow phase
        for (const body of this.bodies) {
            let isInContact = false;
            let isInterpenetrating = false;
            for (const contact of this.contacts) {
                if (contact.a == body || contact.b == body) {
                    isInContact = true;
                    const [intersect, penetrationDistance, pointA, pointB] = testInterpenetration(contact);
                    if(intersect) {
                        isInterpenetrating = true;
                        body.aabb.color = new Color3(0, 1, 0);

                        const [impulseA, impulseB] = computeImpulse(contact.a, contact.b, pointA.subtract(contact.a.position), pointB.subtract(contact.b.position), pointA.subtract(pointB).normalize());

                        contact.a.applyImpulse(impulseA);
                        //console.log(contact.a.mesh.name);
                        //arrowhead(pointA, impulseA.force.normalizeToNew(), Color3.Blue());
                        contact.b.applyImpulse(impulseB);

                        break;
                    } else body.aabb.color = new Color3(1, 0, 0);
                }
            }
            if (!isInContact && !isInterpenetrating) body.aabb.color = new Color3(1, 1, 1);
        }

        for (const body of this.bodies) {
            body.update(deltaTime);
        }
    }
}