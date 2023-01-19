import {RigidBody} from "./rigidBody";

export class Murph {
    private readonly bodies: RigidBody[] = [];
    private clock = 0;

    constructor() {
        // TODO
    }

    public addBody(body: RigidBody) {
        this.bodies.push(body);
    }

    public update(deltaTime: number) {
        this.clock += deltaTime;
        // TODO
    }
}