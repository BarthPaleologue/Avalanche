import {RigidBody} from "./rigidBody";
import {ForceField} from "./forceFields/forceField";

export class Murph {
    private readonly bodies: RigidBody[] = [];
    private readonly fields: ForceField[] = [];
    private clock = 0;

    constructor() {
        // TODO
    }

    public addBody(body: RigidBody) {
        this.bodies.push(body);
    }

    public addField(field: ForceField) {
        this.fields.push(field);
    }

    public update(deltaTime: number) {
        this.clock += deltaTime;

        for(const field of this.fields) {
            for(const body of this.bodies) {
                const impulse = field.computeImpulse(body);
                body.applyImpulse(impulse);
            }
        }
        // TODO

        for(const body of this.bodies) {
            body.update(deltaTime);
        }
    }
}