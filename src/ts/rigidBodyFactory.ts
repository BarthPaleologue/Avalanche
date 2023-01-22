import {MeshBuilder, Scene, Vector3} from "@babylonjs/core";
import {Murph} from "./murph";
import {Matrix3} from "./matrix3";
import {RigidBody} from "./rigidBody";

export class RigidBodyFactory {

    static CreateCuboid(name: string, scaling: Vector3, mass: number, engine: Murph, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateBox(name, {
            width: scaling.x,
            height: scaling.y,
            depth: scaling.z
        }, scene);
        mesh.scaling = scaling;
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * (scaling.y * scaling.y + scaling.z * scaling.z) / 12,
            mass * (scaling.x * scaling.x + scaling.z * scaling.z) / 12,
            mass * (scaling.x * scaling.x + scaling.y * scaling.y) / 12
        ), engine);
    }

    static CreateSphere(name: string, diameter: number, mass: number, engine: Murph, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateSphere(name, {
            diameter: diameter
        }, scene);
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * diameter * diameter / 12,
            mass * diameter * diameter / 12,
            mass * diameter * diameter / 12
        ), engine);
    }

    static CreateCylinder(name: string, radius: number, height: number, mass: number, engine: Murph, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateCylinder(name, {
            diameter: radius * 2,
            height: height
        }, scene);
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * (radius * radius + height * height) / 12,
            mass * radius * radius / 2,
            mass * (radius * radius + height * height) / 12
        ), engine);
    }

    static CreatePlane(name: string, width: number, height: number, mass: number, engine: Murph, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePlane(name, {
            width: width,
            height: height,
        }, scene);
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * (height * height + width * width) / 12,
            mass * (height * height + width * width) / 12,
            mass * (height * height + width * width) / 12
        ), engine);
    }

    static CreateOctahedron(name: string, radius:number, mass: number, engine: Murph, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(name, {
            type: 1,
            size: radius
        }, scene);
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * (radius * radius + radius * radius) / 12,
            mass * (radius * radius + radius * radius) / 12,
            mass * (radius * radius + radius * radius) / 12
        ), engine);
    }
}