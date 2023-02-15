import { Mesh, MeshBuilder, Scene, Vector3, VertexBuffer } from "@babylonjs/core";
import { Matrix3 } from "./utils/matrix3";
import { RigidBody } from "./rigidBody";
import { Settings } from "./settings";
import { Assets } from "./assets";
import { getMeshAllVerticesWorldSpace } from "./utils/vertex";

import heightmap from "../assets/heightMap.png";
import { getRandomColorMaterial } from "./utils/materials";

/**
 * A factory class for creating rigid bodies
 */
export class RigidBodyFactory {
    static CreateCuboid(
        name: string,
        scene: Scene,
        scaling = Vector3.One(),
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreateBox(
            name,
            {
                width: scaling.x,
                height: scaling.y,
                depth: scaling.z
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Matrix3.diag(
            (mass * (scaling.y * scaling.y + scaling.z * scaling.z)) / 12,
            (mass * (scaling.x * scaling.x + scaling.z * scaling.z)) / 12,
            (mass * (scaling.x * scaling.x + scaling.y * scaling.y)) / 12
        );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreateSphere(
        name: string,
        scene: Scene,
        diameter = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreateSphere(
            name,
            {
                diameter: diameter,
                segments: 1
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Matrix3.diag(
            (mass * diameter * diameter) / 12,
            (mass * diameter * diameter) / 12,
            (mass * diameter * diameter) / 12
        );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreateIcoSphere(
        name: string,
        scene: Scene,
        diameter = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreateIcoSphere(
            name,
            {
                radius: diameter / 2,
                subdivisions: 2
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Matrix3.diag(
            (mass * diameter * diameter) / 12,
            (mass * diameter * diameter) / 12,
            (mass * diameter * diameter) / 12
        );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreateCylinder(
        name: string,
        scene: Scene,
        radius = 0.5,
        height = 1.5,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreateCylinder(
            name,
            {
                diameter: radius * 2,
                height: height,
                tessellation: 6
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Matrix3.diag(
            (mass * (radius * radius + height * height)) / 12,
            (mass * radius * radius) / 2,
            (mass * (radius * radius + height * height)) / 12
        );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreatePlane(
        name: string,
        scene: Scene,
        width = 1,
        height = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreatePlane(
            name,
            {
                width: width,
                height: height
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        return new RigidBody(
            mesh,
            mass,
            Matrix3.diag(
                (mass * (height * height + width * width)) / 12,
                (mass * (height * height + width * width)) / 12,
                (mass * (height * height + width * width)) / 12
            ),
            restitution,
            friction
        );
    }

    static CreateGroundFromHeightMap(
        name: string,
        scene: Scene,
        width = 1,
        height = 1,
        subdivisions = 16,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreateGroundFromHeightMap(
            name,
            heightmap,
            {
                width: width,
                height: height,
                subdivisions: subdivisions,
                minHeight: 0,
                maxHeight: 8
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        return new RigidBody(
            mesh,
            mass,
            Matrix3.diag(
                (mass * (height * height + width * width)) / 12,
                (mass * (height * height + width * width)) / 12,
                (mass * (height * height + width * width)) / 12
            ),
            restitution,
            friction
        );
    }

    static CreateWavyCarpet(
        name: string,
        scene: Scene,
        width = 1,
        height = 1,
        subdivisions = 16,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        // create a plane that moves up and down like a wavy carpet
        const mesh = MeshBuilder.CreateGround(
            name,
            {
                width: width,
                height: height,
                subdivisions: subdivisions
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const body = new RigidBody(
            mesh,
            mass,
            Matrix3.diag(
                (mass * (height * height + width * width)) / 12,
                (mass * (height * height + width * width)) / 12,
                (mass * (height * height + width * width)) / 12
            ),
            restitution,
            friction
        );

        const update = () => {
            const time = performance.now() / 1000;
            const vertices = mesh.getVerticesData(VertexBuffer.PositionKind) as number[];
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i + 1] = Math.sin(5 * time + vertices[i] * 50 + vertices[i + 2] * 50) * 1.0;
            }
            mesh.setVerticesData(VertexBuffer.PositionKind, vertices);
            mesh.createNormals(true);
            body.currentState.aabb.updateFromMesh(mesh, body.currentState.worldMatrix);
        };

        mesh.registerBeforeRender(update);

        return body;
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
    static CreateOctahedron(
        name: string,
        scene: Scene,
        radius = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(
            name,
            {
                type: 1,
                size: radius / Math.sqrt(2)
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR
            ? computeInertiaTensorFromMesh(mesh, mass)
            : Matrix3.diag(
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12
              );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreateTetrahedron(
        name: string,
        scene: Scene,
        radius = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(
            name,
            {
                type: 0,
                size: radius / 2
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR
            ? computeInertiaTensorFromMesh(mesh, mass)
            : Matrix3.diag(
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12
              );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreateIcosahedron(
        name: string,
        scene: Scene,
        radius = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(
            name,
            {
                type: 2,
                size: radius / Math.sqrt(2)
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR
            ? computeInertiaTensorFromMesh(mesh, mass)
            : Matrix3.diag(
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12
              );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    static CreateDodecahedron(
        name: string,
        scene: Scene,
        radius = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const mesh = MeshBuilder.CreatePolyhedron(
            name,
            {
                type: 3,
                size: radius / Math.sqrt(2)
            },
            scene
        );

        mesh.material = getRandomColorMaterial();

        const inertiaTensor0 = Settings.USE_DYNAMIC_INERTIA_TENSOR
            ? computeInertiaTensorFromMesh(mesh, mass)
            : Matrix3.diag(
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12,
                  (mass * (radius * radius + radius * radius)) / 12
              );

        return new RigidBody(mesh, mass, inertiaTensor0, restitution, friction);
    }

    /**
     *  Creates a random rigid body from the factory.
     * @param name
     * @param radius
     * @param mass
     * @param engine
     * @param scene
     */
    static CreateRandom(
        name: string,
        scene: Scene,
        radius = 1,
        mass = 1,
        restitution = Settings.DEFAULT_RESTITUTION,
        friction = Settings.DEFAULT_FRICTION
    ): RigidBody {
        const random = Math.floor(Math.random() * 8);
        switch (random) {
            case 0:
                return this.CreateCuboid(name, scene, Vector3.One().scaleInPlace(radius), mass, restitution, friction);
            case 1:
                return this.CreateCuboid(name, scene, Vector3.One().scaleInPlace(radius), mass, restitution, friction);
            case 2:
                return this.CreateSphere(name, scene, radius, mass, restitution, friction);
            case 3:
                return this.CreateOctahedron(name, scene, radius, mass, restitution, friction);
            case 4:
                return this.CreateOctahedron(name, scene, radius, mass, restitution, friction);
            case 5:
                return this.CreateSphere(name, scene, radius, mass, restitution, friction);
            case 6:
                return this.CreateDodecahedron(name, scene, radius, mass, restitution, friction);
            case 7:
                return this.CreateDodecahedron(name, scene, radius, mass, restitution, friction);
            //case 8:
            //    return this.CreateCylinder(name, radius / 2, radius, mass, restitution, scene);
        }
        throw new Error("Invalid random number");
    }

    static CreateStanfordBunny(name: string, radius: number, mass: number, restitution: number): RigidBody {
        const bunny = Assets.Bunny.clone(name);
        bunny.isVisible = true;
        bunny.scaling = new Vector3(radius, radius, radius);

        bunny.material = getRandomColorMaterial();

        const inertiaTensor0 = computeInertiaTensorFromMesh(bunny, mass);

        return new RigidBody(bunny, mass, inertiaTensor0, restitution);
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

    const S = new Matrix3(2, 1, 1, 1, 2, 1, 1, 1, 2).scaleInPlace(1 / 24);

    const V = new Matrix3(p0.x, p1.x, p2.x, p0.y, p1.y, p2.y, p0.z, p1.z, p2.z);

    const C = V.multiply(S).multiply(V.transpose()).scaleInPlace(a);

    const J = Matrix3.identity().scaleInPlace(C.trace()).subtractInPlace(C);

    return J.scaleInPlace(density);
}
