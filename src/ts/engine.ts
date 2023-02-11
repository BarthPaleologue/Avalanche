import { RigidBody } from "./rigidBody";
import { ForceField } from "./forceFields/forceField";
import { Color3, Mesh, StandardMaterial, Vector3 } from "@babylonjs/core";
import { Contact, testInterpenetration } from "./utils/intersection";
import { displayPoint } from "./utils/display";
import { Settings } from "./settings";
import { computeCollisionImpulse, computeFrictionImpulse } from "./utils/impulse";

export class AvalancheEngine {
    readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];

    private contacts: Contact[] = [];

    private helperMeshes: Mesh[] = [];

    private isPaused = false;

    constructor() {
        //
    }

    public addBody(body: RigidBody): RigidBody {
        this.bodies.push(body);
        return body;
    }

    public addBodies(...bodies: RigidBody[]) {
        this.bodies.push(...bodies);
    }

    public removeBody(body: RigidBody) {
        const index = this.bodies.indexOf(body);
        if (index > -1) this.bodies.splice(index, 1);
        else throw new Error("Body not found");
    }

    public addField(field: ForceField) {
        this.fields.push(field);
    }

    public removeField(field: ForceField) {
        const index = this.fields.indexOf(field);
        if (index > -1) this.fields.splice(index, 1);
        else throw new Error("Field not found");
    }

    /*private buildBoundingVolumeHierarchy() {
        // creates a tree of bodies that are close to each other
        // bottom up
    }*/

    public togglePause() {
        this.isPaused = !this.isPaused;
    }

    get paused() {
        return this.isPaused;
    }

    public update(deltaTime: number) {
        if (this.isPaused) return;

        for (const mesh of this.helperMeshes) mesh.dispose();

        for (const field of this.fields) {
            for (const body of this.bodies) {
                const force = field.computeForce(body);
                body.applyForce(force);
            }
        }

        // Computing the next step, not updating the bodies yet,
        // We will use the computed position to compute the collisions
        for (const body of this.bodies) body.computeNextStep(deltaTime);

        //// BROAD PHASE

        for (const contact of this.contacts) contact.aabbOverlap.helperMesh?.dispose();
        this.contacts = [];

        // compute collisions O(n²) broad phase
        for (const body of this.bodies) {
            for (const otherBody of this.bodies) {
                if (body === otherBody) continue;

                const overlap = body.nextState.aabb.intersectionOverlap(otherBody.nextState.aabb);
                if (overlap) {
                    const contact: Contact = {
                        a: body, b: otherBody,
                        aabbOverlap: overlap
                    };
                    let isAlreadyInTheList = false;
                    for (const contact of this.contacts) {
                        if ((contact.a == body && contact.b == otherBody)
                            || (contact.a == otherBody && contact.b == body)) {
                            isAlreadyInTheList = true;
                            break;
                        }
                    }
                    if (!isAlreadyInTheList) this.contacts.push(contact);
                }
            }
        }

        /// NARROW PHASE

        // compute collisions O(n²) narrow phase
        for (const contact of this.contacts) this.resolveContactBisection(contact, 0, deltaTime, deltaTime, 0);

        // All collisions have been resolved, we can now update the bodies
        for (const body of this.bodies) body.applyNextStep();
    }

    private resolveContactBisection(contact: Contact, tmin: number, tmax: number, initialIntervalLength: number, depth: number) {
        const [bodyA, bodyB] = [contact.a, contact.b];
        if (bodyA.isStatic && bodyB.isStatic) return; // both bodies are static

        let [maxPenetrationDistance, pointsA, pointsB, triangleNormals, penetrationDistances] = testInterpenetration(contact);

        if ((maxPenetrationDistance < 0 && maxPenetrationDistance > -Settings.EPSILON) || depth > Settings.MAX_DEPTH) {
            // The interpenetration is below our threshold, so we can compute the impulses
            // and update the bodies

            // Display the contact points
            if (Settings.DISPLAY_CONTACT_POINTS) {
                for (const point of pointsA) this.helperMeshes.push(displayPoint(point, Color3.Red(), 0));
                for (const point of pointsB) this.helperMeshes.push(displayPoint(point, Color3.Blue(), 0));
            }

            // if the depth limit is reached, we repel the bodies as 
            // we couldn't find a t where the bodies are not interpenetrating
            if (depth > Settings.MAX_DEPTH) {
                this.repellBodies(contact);
                // recompute the interpenetration
                [maxPenetrationDistance, pointsA, pointsB, triangleNormals, penetrationDistances] = testInterpenetration(contact);
            }

            // first apply the first part of the trajectory before the collision
            // the next step was computed on the last iteration or during the broad phase
            bodyA.applyNextStep();
            bodyB.applyNextStep();

            for (let i = 0; i < pointsA.length; i++) {
                // the point might have been pushed out of the triangle
                if (Math.abs(penetrationDistances[i]) > Settings.EPSILON) continue;

                const pointA = pointsA[i];
                const pointB = pointsB[i];

                const triangleNormal = triangleNormals[i];

                // Collision Impulses

                // We go into body space to compute the impulses
                const ra = pointA.subtract(bodyA.nextState.position);
                const rb = pointB.subtract(bodyB.nextState.position);
                const [impulseA, impulseB] = computeCollisionImpulse(bodyA, bodyB, ra, rb, triangleNormal);

                bodyA.applyImpulse(impulseA);
                bodyB.applyImpulse(impulseB);

                // Friction Impulses

                const [frictionImpulseA, frictionImpulseB] = computeFrictionImpulse(bodyA, bodyB, ra, rb, triangleNormal);

                bodyA.applyImpulse(frictionImpulseA);
                bodyB.applyImpulse(frictionImpulseB);
            }

            // Recompute the next step taking into account the new momentum
            bodyA.computeNextStep(initialIntervalLength - tmax);
            bodyB.computeNextStep(initialIntervalLength - tmax);

            // If the bodies are still interpenetrating, we repel them
            this.repellBodies(contact);
        } else if (maxPenetrationDistance > 0) {
            // the bodies are interpenetrating too much, we use bisection backwards
            // to find the time of impact
            const tmid = (tmin + tmax) / 2;

            bodyA.computeNextStep(tmid);
            bodyB.computeNextStep(tmid);

            this.resolveContactBisection(contact, tmin, tmid, initialIntervalLength, depth + 1);

        } else if (maxPenetrationDistance < 0 && tmax - tmin < initialIntervalLength) {
            // the bodies are not interpenetrating enough, but they were interpenetrating earlier 
            // so we use bisection forward to find the time of impact
            const tmid = (tmin + tmax) / 2;

            bodyA.computeNextStep(tmax + tmid);
            bodyB.computeNextStep(tmax + tmid);

            this.resolveContactBisection(contact, tmax, tmax + tmid, initialIntervalLength, depth + 1);
        }
    }

    private repellBodies(contact: Contact) {
        const bodyA = contact.a;
        const bodyB = contact.b;
        const [finalInterpenetration, _, __, finalTriangleNormals, finalPenetrations] = testInterpenetration(contact);
        if (finalInterpenetration > 0) {
            // we push the bodies apart to avoid interpenetration
            const normal = Vector3.Zero();

            for (let i = 0; i < finalTriangleNormals.length; i++) {
                if (finalInterpenetration == finalPenetrations[i]) {
                    const triangleNormal = finalTriangleNormals[i];
                    normal.set(triangleNormal.x, triangleNormal.y, triangleNormal.z);
                    break;
                }
            }

            const pushDist = finalInterpenetration;
            // the push is a weighted average of the mass of the bodies
            const totalMass = bodyA.mass + bodyB.mass;
            const pushA = bodyB.isStatic ? 1 : bodyB.mass / totalMass;

            const distanceA = bodyA.isStatic ? 0 : pushA * pushDist;
            const distanceB = bodyB.isStatic ? 0 : pushDist - distanceA;

            bodyA.nextState.position.subtractInPlace(normal.scale(distanceA));
            bodyB.nextState.position.addInPlace(normal.scale(distanceB));
        }
    }

    public toggleBoundingBoxes() {
        Settings.DISPLAY_BOUNDING_BOXES = !Settings.DISPLAY_BOUNDING_BOXES;
        for (const body of this.bodies) body.currentState.aabb.setVisible(Settings.DISPLAY_BOUNDING_BOXES);
    }

    public toggleWireframe() {
        Settings.WIREFRAME = !Settings.WIREFRAME;
        for (const body of this.bodies) (body.mesh.material as StandardMaterial).wireframe = Settings.WIREFRAME;
    }
}