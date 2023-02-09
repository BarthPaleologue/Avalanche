import { RigidBody } from "./rigidBody";
import { ForceField } from "./forceFields/forceField";
import { Color3, Mesh, Vector3 } from "@babylonjs/core";
import { AABB } from "./aabb";
import { computeCollisionImpulse, computeFrictionImpulse, Contact, testInterpenetration } from "./utils/intersection";
import { displayPoint, displayRay, displayTriangle } from "./utils/display";
import { Settings } from "./settings";

export class Murph {
    readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];

    private contacts: Contact[] = [];

    private helperMeshes: Mesh[] = [];

    private isPaused = false;

    constructor() {
        //
    }

    public addBody(body: RigidBody) {
        this.bodies.push(body);
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

        //console.clear();

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

                const [intersects, overlap] = AABB.IntersectsAndOverlap(body.nextState.aabb, otherBody.nextState.aabb);
                if (intersects) {
                    // check the intersection of triangles inside the overlap
                    const contactSet: Contact = {
                        a: body, b: otherBody,
                        aabbOverlap: overlap
                    };
                    let isAlreadyInTheList = false;
                    for (const contact of this.contacts) {
                        if ((contact.a == body || contact.b == body) && (contact.a == otherBody || contact.b == otherBody)) {
                            isAlreadyInTheList = true;
                            break;
                        }
                    }
                    if (!isAlreadyInTheList) this.contacts.push(contactSet);
                }
            }
        }

        //for(const contact of this.contacts) console.log(contact.a.mesh.name, contact.b.mesh.name);

        /// NARROW PHASE

        // compute collisions O(n²) narrow phase
        for (const contact of this.contacts) this.resolveContact(contact, 0, deltaTime, deltaTime, 0);

        // All collisions have been resolved, we can now update the bodies
        for (const body of this.bodies) body.applyNextStep();
    }

    private resolveContact(contact: Contact, tmin: number, tmax: number, initialIntervalLength: number, depth: number) {
        const [bodyA, bodyB] = [contact.a, contact.b];
        if (bodyA.isStatic && bodyB.isStatic) return; // both bodies are static

        const [maxPenetrationDistance, pointsA, pointsB, triangleNormals, penetrationDistances] = testInterpenetration(contact);

        //console.warn(bodyA.mesh.name, bodyB.mesh.name, tmin * 1000, tmax * 1000, maxPenetrationDistance, depth);
        //console.log("There are", pointsA.length, "contact points");

        if ((maxPenetrationDistance < 0 && maxPenetrationDistance > -Settings.EPSILON) || depth > Settings.MAX_DEPTH) {
            // The interpenetration is below our threshold, so we can compute the impulses
            // and update the bodies
            //console.log("resolution of contact");

            //console.warn(bodyA.mesh.name, bodyB.mesh.name, tmin * 1000, tmax * 1000, maxPenetrationDistance, depth);
            /*console.log("There are", pointsA.length, "contact points");
            for (const point of pointsA) this.helperMeshes.push(displayPoint(point, Color3.Red(), 0));
            for (const point of pointsB) this.helperMeshes.push(displayPoint(point, Color3.Blue(), 0));
            for (let i = 0; i < pointsA.length; i++) {
                this.helperMeshes.push(displayRay(pointsA[i], pointsB[i].subtract(pointsA[i]),
                    penetrationDistances[i] > -Settings.EPSILON ? Color3.Green() : Color3.Red(), 0));
            }*/
            //if (!this.isPaused) this.togglePause();

            if (depth > Settings.MAX_DEPTH) this.repellBodies(contact);

            // first apply the first part of the trajectory until the collision

            bodyA.applyNextStep();
            bodyB.applyNextStep();

            for (let i = 0; i < pointsA.length; i++) {
                if (Math.abs(penetrationDistances[i]) > Settings.EPSILON) continue; // the point might have been pushed out of the triangle

                const pointA = pointsA[i];
                const pointB = pointsB[i];

                const triangleNormal = triangleNormals[i];

                const ra = pointA.subtract(bodyA.nextState.position);
                const rb = pointB.subtract(bodyB.nextState.position);
                const [impulseA, impulseB] = computeCollisionImpulse(bodyA, bodyB, ra, rb, triangleNormal);

                bodyA.applyImpulse(impulseA);
                bodyB.applyImpulse(impulseB);

                const [frictionImpulseA, frictionImpulseB] = computeFrictionImpulse(bodyA, bodyB, ra, rb, triangleNormal);

                bodyA.applyImpulse(frictionImpulseA);
                bodyB.applyImpulse(frictionImpulseB);
            }

            // Recompute the next step taking into account the new velocity
            bodyA.computeNextStep(initialIntervalLength - tmax);
            bodyB.computeNextStep(initialIntervalLength - tmax);

            this.repellBodies(contact);

            //console.log("momentum", bodyA.nextState.momentum.length(), bodyB.nextState.momentum.length());
            //arrowhead(bodyB.nextState.position, bodyB.nextState.momentum, Color3.Green(), 0);
        } else if (maxPenetrationDistance > 0) {
            // the bodies are interpenetrating, we use bisection backwards
            // to find the time of impact
            //console.log("interpenetration: bisecting backward");

            const tmid = (tmin + tmax) / 2;
            //console.log("computing for dt=", tmid);
            bodyA.computeNextStep(tmid);
            bodyB.computeNextStep(tmid);

            this.resolveContact(contact, tmin, tmid, initialIntervalLength, depth + 1);
        } else if (maxPenetrationDistance < 0 && tmax - tmin < initialIntervalLength) {
            // the bodies are not interpenetrating, but they were interpenetrating earlier 
            // so we use bisection forward to find the time of impact
            //console.log("Interpenetration earlier. No interpenetration now: bisecting forward");

            const tmid = (tmin + tmax) / 2;

            //console.log("computing for dt=", tmax + tmid);
            bodyA.computeNextStep(tmax + tmid);
            bodyB.computeNextStep(tmax + tmid);

            this.resolveContact(contact, tmax, tmax + tmid, initialIntervalLength, depth + 1);
        } else {
            // the bodies are not interpenetrating, we don't need to do anything
            //console.log("No interpenetration, no recursion");
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
            console.assert(normal.length() > 0);

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
}