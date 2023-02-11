import {
    ArcRotateCamera, DirectionalLight,
    Engine,
    HemisphericLight,
    Scene, ShadowGenerator,
    Tools,
    Vector3
} from "@babylonjs/core";

import "../styles/index.scss";
import { AvalancheEngine } from "./engine";
import { RigidBodyFactory } from "./rigidBodyFactory";
import { UniformPonctualField } from "./forceFields/uniformPonctualField";
import { UniformDirectionalField } from "./forceFields/uniformDirectionalField";
import { randomVector3 } from "./utils/random";
import { Assets } from "./assets";
import { Settings } from "./settings";
import { Impulse } from "./utils/impulse";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas, true);

const scene = new Scene(engine);

await Assets.Init(scene);

const camera = new ArcRotateCamera("camera", 0, 3.14 / 2, 20, Vector3.Zero(), scene);
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(1, -1, 1), scene);
light.position = light.direction.negate().scaleInPlace(10);//new Vector3(0, 10, 0);
const shadowGenerator = new ShadowGenerator(1024, light);
shadowGenerator.usePercentageCloserFiltering = true;

const ambientLight = new HemisphericLight("ambientLight", new Vector3(0, 1, 0), scene);
ambientLight.intensity = 0.2;

const physicsEngine = new AvalancheEngine();
const gravityPonctual = new UniformPonctualField(new Vector3(0, -10, 0), 5, physicsEngine);

const ground = RigidBodyFactory.CreateSphere("ground", scene, 10, 0, 0.1);
ground.setInitialPosition(new Vector3(0, -10, 0));
ground.mesh.receiveShadows = true;
camera.target = ground.mesh.position;

const cuboid = RigidBodyFactory.CreateCuboid("cuboid", scene, new Vector3(1, 1, 1), 1);
cuboid.setInitialPosition(randomVector3(-3, 3));
shadowGenerator.addShadowCaster(cuboid.mesh);

const dodecahedron = RigidBodyFactory.CreateDodecahedron("dodecahedron", scene, 1, 1);
shadowGenerator.addShadowCaster(dodecahedron.mesh);
dodecahedron.setInitialPosition(randomVector3(-3, 3));

const octahedron = RigidBodyFactory.CreateOctahedron("octahedron", scene, 1, 1);
octahedron.setInitialPosition(randomVector3(-5, 5));
shadowGenerator.addShadowCaster(octahedron.mesh);

physicsEngine.addBodies(ground, cuboid, dodecahedron, octahedron);

if (!Settings.DISPLAY_SHADOWS) shadowGenerator.dispose();

// on mesh click, apply impulse
scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.pickInfo!.hit) {
        const mesh = pointerInfo.pickInfo!.pickedMesh!;
        const body = physicsEngine.bodies.find(b => b.mesh == mesh);
        if (body) {
            const point = pointerInfo.pickInfo!.pickedPoint!.subtract(body.positionRef).normalize();
            const direction = new Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5).scale(1 + Math.random() * 2);
            body.applyImpulse(new Impulse(direction, point));
        }
    }
});

let I = 0;

function updateScene() {
    if (I == 1) {
        cuboid.applyImpulse(new Impulse(new Vector3(0, 1, 0.1), new Vector3(Math.random(), Math.random(), Math.random())));
        octahedron.applyImpulse(new Impulse(new Vector3(0.7, 0.1, 0.3), new Vector3(Math.random(), Math.random(), Math.random())));
    }
    if (I % 50 == 0 && !physicsEngine.paused) {
        const newCube = RigidBodyFactory.CreateRandom("cuboid" + I, scene);
        newCube.setInitialPosition(new Vector3(Math.random() * 10 - 5, 10, Math.random() * 10 - 5));
        physicsEngine.addBody(newCube);

        if (Settings.DISPLAY_SHADOWS) shadowGenerator.addShadowCaster(newCube.mesh);
        newCube.applyImpulse(new Impulse(new Vector3(0, 1, 0), new Vector3(Math.random(), Math.random(), Math.random())));
    }

    for (const body of physicsEngine.bodies) {
        if (body.positionRef.length() > 100) {
            body.mesh.dispose();
            body.currentState.aabb.helperMesh?.dispose();
            physicsEngine.removeBody(body);
        }
        if (body.positionRef.y > 20 && body.currentState.velocity.length() > 10) {
            console.warn("body " + body.mesh.name + " is going too fast");
            body.mesh.dispose();
            body.currentState.aabb.helperMesh?.dispose();
            physicsEngine.removeBody(body);
        }
    }

    const deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.017 * 2);
    physicsEngine.update(deltaTime);
    I++;
}

// use zqsd to move the target of the camera
document.addEventListener("keydown", e => {
    if (e.key == "p") Tools.CreateScreenshotAsync(engine, camera, { precision: 2 }).then((data) => {
        const link = document.createElement("a");
        link.download = "screenshot.png";
        link.href = data;
        link.click();
    });
    if (e.key == "b") physicsEngine.toggleBoundingBoxes();
    if (e.key == "w") physicsEngine.toggleWireframe();
});

scene.executeWhenReady(() => {
    scene.registerBeforeRender(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    engine.resize();
});

window.addEventListener("keydown", e => {
    if (e.key == " ") physicsEngine.togglePause();
});
