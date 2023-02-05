import { RigidBody } from "./rigidBody";
import { ForceField } from "./forceFields/forceField";
import { Color3, Mesh, Vector3 } from "@babylonjs/core";
import { AABB } from "./aabb";
import { computeImpulse, Contact, EPSILON, testInterpenetration } from "./utils/intersection";
import { arrowhead, displayPoint, displayTriangle } from "./utils/display";
import { getMeshTrianglesWorldSpace, getMeshVerticesWorldSpace } from "./utils/vertex";
import { pointIntersectsWithAABB, triangleIntersectsWithAABB } from "./pointIntersectsWithAABB";

export class Murph {
    private readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];

    private contacts: Contact[] = [];

    private helperMeshes: Mesh[] = [];

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

        console.clear();

        for (const mesh of this.helperMeshes) mesh.dispose();

        for (const field of this.fields) {
            for (const body of this.bodies) {
                const impulse = field.computeImpulse(body);
                body.applyImpulse(impulse);
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
        const [penetrationDistance, pointsA, pointsB, triangles] = testInterpenetration(contact);

        /*this.helperMeshes.push(displayPoint(pointA, Color3.Blue(), 0));
        this.helperMeshes.push(displayPoint(pointB, Color3.Red(), 0));
        this.helperMeshes.push(displayTriangle(triangle, Color3.Green(), 0));*/

        /*const trianglesA = getMeshTrianglesWorldSpace(bodyA.mesh, bodyA.getNextWorldMatrix());
        const trianglesB = getMeshTrianglesWorldSpace(bodyB.mesh, bodyB.getNextWorldMatrix());

        const relevantTrianglesA = trianglesA.filter(triangle => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));
        const relevantTrianglesB = trianglesB.filter(triangle => triangleIntersectsWithAABB(triangle, contact.aabbOverlap));

        for (const triangle of relevantTrianglesA) this.helperMeshes.push(displayTriangle(triangle, Color3.Teal(), 0));
        for (const triangle of relevantTrianglesB) this.helperMeshes.push(displayTriangle(triangle, Color3.Yellow(), 0));
*/
        /*const pointsA = getMeshVerticesWorldSpace(bodyA.mesh, bodyA.getNextWorldMatrix());
        const pointsB = getMeshVerticesWorldSpace(bodyB.mesh, bodyB.getNextWorldMatrix());

        const relevantPointsA = pointsA.filter(point => pointIntersectsWithAABB(point, contact.aabbOverlap));
        const relevantPointsB = pointsB.filter(point => pointIntersectsWithAABB(point, contact.aabbOverlap));

        for (const point of relevantPointsA) this.helperMeshes.push(displayPoint(point, Color3.White(), 0));
        for (const point of relevantPointsB) this.helperMeshes.push(displayPoint(point, Color3.Black(), 0));

        contact.aabbOverlap.setVisible(true);*/

        console.warn(bodyA.mesh.name, bodyB.mesh.name, tmin * 1000, tmax * 1000, penetrationDistance, depth);
        console.log("There are", pointsA.length, "contact points");
        for (const point of pointsA) this.helperMeshes.push(displayPoint(point, Color3.White(), 0));
        for (const point of pointsB) this.helperMeshes.push(displayPoint(point, Color3.Black(), 0));

        //console.log(bodyA.mesh.name, bodyB.mesh.name, penetrationDistance);
        //console.log(bodyA.mesh.getWorldMatrix().m, bodyA.getNextWorldMatrix().m);
        if (Math.abs(penetrationDistance) < EPSILON || depth > 10) {
            // The interpenetration is below our threshold, so we can compute the impulses
            // and update the bodies
            console.log("resolution of contact");

            // first apply the first part of the trajectory until the collision
            bodyA.computeNextStep(tmax);
            bodyB.computeNextStep(tmax);

            bodyA.applyNextStep();
            bodyB.applyNextStep();

            //arrowhead(pointA, pointA.subtract(pointB), Color3.Green(), 0);

            //if (!this.isPaused) this.togglePause();

            //displayPoint(pointA, Color3.Blue(), 0);
            //displayPoint(pointB, Color3.Red(), 0);

            bodyA.nextState.aabb.color = new Color3(0, 1, 0);
            bodyB.nextState.aabb.color = new Color3(0, 1, 0);

            bodyA.cumulatedImpulses = [];
            bodyB.cumulatedImpulses = [];


            for (let i = 0; i < pointsA.length; i++) {
                const pointA = pointsA[i];
                const pointB = pointsB[i];
                const triangle = triangles[i];

                const triangleNormal = Vector3.Cross(triangle[1].subtract(triangle[0]), triangle[2].subtract(triangle[0])).normalize().negate();
                //arrowhead(pointA, triangleNormal, Color3.Green(), 0);

                const ra = pointA.subtract(bodyA.nextState.position);
                const rb = pointB.subtract(bodyB.nextState.position);
                const [impulseA, impulseB] = computeImpulse(bodyA, bodyB, ra, rb, triangleNormal);


                //arrowhead(bodyA.nextState.position, impulseA.force.normalizeToNew(), Color3.Blue());
                //arrowhead(bodyB.nextState.position, impulseB.force.normalizeToNew(), Color3.Green());

                //bodyA.currentState.momentum = Vector3.Zero();
                //bodyB.currentState.momentum = Vector3.Zero();

                //console.log(impulseA.force.length(), impulseB.force.length());

                bodyA.applyImpulse(impulseA);
                //console.log(contact.a.mesh.name);
                bodyB.applyImpulse(impulseB);
            }
            // Recompute the next step taking into account the new velocity
            bodyA.computeNextStep(initialIntervalLength);
            bodyB.computeNextStep(initialIntervalLength);

            console.log("momentum", bodyA.nextState.momentum.length(), bodyB.nextState.momentum.length());
            //arrowhead(bodyB.nextState.position, bodyB.nextState.momentum, Color3.Green(), 0);

            bodyA.nextState.aabb.color = new Color3(1, 1, 1);
            bodyB.nextState.aabb.color = new Color3(1, 1, 1);

        } else if (penetrationDistance > 0) {
            // the bodies are interpenetrating, we use bisection
            // to find the time of impact
            console.log("interpenetration: bisecting backward");

            bodyA.nextState.aabb.color = new Color3(1, 0, 1);
            bodyB.nextState.aabb.color = new Color3(1, 0, 1);

            const tmid = (tmin + tmax) / 2;
            console.log("computing for dt=", tmid);
            bodyA.computeNextStep(tmid);
            bodyB.computeNextStep(tmid);

            this.resolveContact(contact, tmin, tmid, initialIntervalLength, depth + 1);
        } else if (penetrationDistance < 0 && tmax - tmin < initialIntervalLength) {
            // the bodies are not interpenetrating, but we are using bisection
            // to find the time of impact, so we need to continue the bisection
            console.log("Interpenetration earlier. No interpenetration now: bisecting forward");

            bodyA.nextState.aabb.color = new Color3(1, 0, 1);
            bodyB.nextState.aabb.color = new Color3(1, 0, 1);

            const tmid = (tmin + tmax) / 2;

            console.log("computing for dt=", tmax + tmid);
            bodyA.computeNextStep(tmax + tmid);
            bodyB.computeNextStep(tmax + tmid);

            this.resolveContact(contact, tmax, tmax + tmid, initialIntervalLength, depth + 1);
        } else {
            // the bodies are not interpenetrating, we don't need to do anything

            console.log("No interpenetration, ending recursion");
            bodyA.nextState.aabb.color = new Color3(1, 0, 0);
            bodyB.nextState.aabb.color = new Color3(1, 0, 0);
        }
    }
}