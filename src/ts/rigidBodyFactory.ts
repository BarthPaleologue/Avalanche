import { AbstractMesh, AssetContainer, Color3, Mesh, MeshBuilder, Scene, SceneLoader, SimplificationType, StandardMaterial, Vector3 } from "@babylonjs/core";
import '@babylonjs/loaders/OBJ/objFileLoader';
import { AvalancheEngine } from "./engine";
import { Matrix3 } from "./utils/matrix3";
import { RigidBody } from "./rigidBody";
import { Settings } from "./settings";
import { Assets } from "./assets";
import { getMeshAllVerticesWorldSpace, getMeshUniqueVerticesWorldSpace } from "./utils/vertex";

export class RigidBodyFactory {

    static CreateCuboid(name: string, scaling: Vector3, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateBox(name, {
            width: scaling.x,
            height: scaling.y,
            depth: scaling.z
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;

        const inertiaTensor0 = Matrix3.diag(
            mass * (scaling.y * scaling.y + scaling.z * scaling.z) / 12,
            mass * (scaling.x * scaling.x + scaling.z * scaling.z) / 12,
            mass * (scaling.x * scaling.x + scaling.y * scaling.y) / 12
        );

        return new RigidBody(mesh, mass, inertiaTensor0, engine);
    }

    static CreateSphere(name: string, diameter: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateSphere(name, {
            diameter: diameter,
            segments: 2
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * diameter * diameter / 12,
            mass * diameter * diameter / 12,
            mass * diameter * diameter / 12
        ), engine);
    }

    static CreateCylinder(name: string, radius: number, height: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreateCylinder(name, {
            diameter: radius * 2,
            height: height
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;

        const inertiaTensor0 = Matrix3.diag(
            mass * (radius * radius + height * height) / 12,
            mass * radius * radius / 2,
            mass * (radius * radius + height * height) / 12
        );

        return new RigidBody(mesh, mass, inertiaTensor0, engine);
    }

    static CreatePlane(name: string, width: number, height: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePlane(name, {
            width: width,
            height: height,
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;
        return new RigidBody(mesh, mass, Matrix3.diag(
            mass * (height * height + width * width) / 12,
            mass * (height * height + width * width) / 12,
            mass * (height * height + width * width) / 12
        ), engine);
    }

    /**
     *  Creates a rigid body with a mesh of an octahedron.
     * @param name 
     * @param radius 
     * @param mass 
     * @param engine 
     * @param scene 
     * @returns 
     */
    static CreateOctahedron(name: string, radius: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(name, {
            type: 1,
            size: radius / Math.sqrt(2)
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR ?
            computeInertiaTensorFromMesh(mesh, mass) :
            Matrix3.diag(
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12
            );

        return new RigidBody(mesh, mass, inertiaTensor0, engine);
    }

    static CreateTetrahedron(name: string, radius: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(name, {
            type: 0,
            size: radius / Math.sqrt(2)
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR ?
            computeInertiaTensorFromMesh(mesh, mass) :
            Matrix3.diag(
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12
            );

        return new RigidBody(mesh, mass, inertiaTensor0, engine);
    }

    static CreateIcosahedron(name: string, radius: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(name, {
            type: 2,
            size: radius / Math.sqrt(2)
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR ?
            computeInertiaTensorFromMesh(mesh, mass) :
            Matrix3.diag(
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12
            );

        return new RigidBody(mesh, mass, inertiaTensor0, engine);
    }

    static CreateDodecahedron(name: string, radius: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(name, {
            type: 3,
            size: radius / Math.sqrt(2)
        }, scene);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        mesh.material = material;

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR ?
            computeInertiaTensorFromMesh(mesh, mass) :
            Matrix3.diag(
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12,
                mass * (radius * radius + radius * radius) / 12
            );

        return new RigidBody(mesh, mass, inertiaTensor0, engine);
    }

    /**
     *  Creates a random rigid body from the factory.
     * @param name 
     * @param radius 
     * @param mass 
     * @param engine 
     * @param scene 
     */
    static CreateRandom(name: string, radius: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {
        const random = Math.floor(Math.random() * 8);
        switch (random) {
            case 0:
                return this.CreateCuboid(name, Vector3.One().scaleInPlace(radius), mass, engine, scene);
            case 1:
                return this.CreateCuboid(name, Vector3.One().scaleInPlace(radius), mass, engine, scene);
            case 2:
                return this.CreateDodecahedron(name, radius, mass, engine, scene);
            case 3:
                return this.CreateOctahedron(name, radius, mass, engine, scene);
            case 4:
                return this.CreateOctahedron(name, radius, mass, engine, scene);
            case 5:
                return this.CreateCuboid(name, Vector3.One().scaleInPlace(radius), mass, engine, scene);
            case 6:
                return this.CreateIcosahedron(name, radius, mass, engine, scene);
            case 7:
                return this.CreateDodecahedron(name, radius, mass, engine, scene);
        }
        throw new Error("Invalid random number");
    }

    static CreateStanfordBunny(name: string, radius: number, mass: number, engine: AvalancheEngine, scene: Scene): RigidBody {

        const bunny = Assets.Bunny.clone(name);
        bunny.isVisible = true;
        bunny.scaling = new Vector3(radius, radius, radius);

        const material = new StandardMaterial("wireframe");
        material.diffuseColor = Color3.Random();
        material.wireframe = Settings.WIREFRAME;
        bunny.material = material;

        const inertiaTensor0 = computeInertiaTensorFromMesh(bunny, mass);

        return new RigidBody(bunny, mass, inertiaTensor0, engine);
    }


}


export function computeInertiaTensorFromMesh(mesh: Mesh, mass: number): Matrix3 {
    const vertices = getMeshAllVerticesWorldSpace(mesh, mesh.computeWorldMatrix(true));
    const indices = mesh.getIndices() as number[];

    // compute the weight of each triangle
    const weights = [];
    let totalWeight = 0;
    for (let i = 0; i < indices.length; i += 3) {
        const p0 = vertices[indices[i]];
        const p1 = vertices[indices[i + 1]];
        const p2 = vertices[indices[i + 2]];

        const triangleArea = Vector3.Cross(p1.subtract(p0), p2.subtract(p0)).length() / 2;
        weights.push(triangleArea);
        totalWeight += triangleArea;
    }

    const inertiaTensor = Matrix3.zero();

    for (let i = 0; i < indices.length; i += 3) {
        const p0 = vertices[indices[i]];
        const p1 = vertices[indices[i + 1]];
        const p2 = vertices[indices[i + 2]];

        const triangleInertiaTensor = computeInertiaTensorFromTriangle(p0, p1, p2, mass);

        inertiaTensor.addInPlace(triangleInertiaTensor);
    }

    return inertiaTensor.scaleInPlace(0.1);
}

/**
 * 
 * @param p0 
 * @param p1 
 * @param p2 
 * @param density 
 * @see https://web.archive.org/web/20161229044620/https://en.wikipedia.org/wiki/Inertia_tensor_of_triangle
 */
export function computeInertiaTensorFromTriangle(p0: Vector3, p1: Vector3, p2: Vector3, density: number): Matrix3 {
    const e0 = p1.subtract(p0);
    const e1 = p2.subtract(p0);

    const normalScaled = Vector3.Cross(e0, e1);

    const a = normalScaled.length();

    const S = new Matrix3(
        2, 1, 1,
        1, 2, 1,
        1, 1, 2
    ).scaleInPlace(1 / 24);

    const V = new Matrix3(
        p0.x, p1.x, p2.x,
        p0.y, p1.y, p2.y,
        p0.z, p1.z, p2.z
    );

    const C = V.multiply(S).multiply(V.transpose()).scaleInPlace(a);

    const J = Matrix3.identity().scaleInPlace(C.trace()).subtractInPlace(C);

    return J.scaleInPlace(density);
}