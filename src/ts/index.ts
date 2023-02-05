import {
    ArcRotateCamera, DirectionalLight,
    Engine,
    Scene, ShadowGenerator,
    Vector3
} from "@babylonjs/core";

import "../styles/index.scss";
import { Murph } from "./murph";
import { Impulse } from "./impulse";
import { RigidBodyFactory } from "./rigidBodyFactory";
import { UniformPonctualField } from "./forceFields/uniformPonctualField";
import { UniformDirectionalField } from "./forceFields/uniformDirectionalField";
import { randomVector3 } from "./utils/random";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 0, 3.14 / 4.0, 15, Vector3.Zero(), scene);
camera.attachControl();

const light = new DirectionalLight("light", new Vector3(1, -1, 1), scene);
const shadowGenerator = new ShadowGenerator(1024, light);
shadowGenerator.usePercentageCloserFiltering = true;

const physicsEngine = new Murph();
const gravity = new UniformDirectionalField(new Vector3(0, -9.81, 0), physicsEngine);
//const gravity = new UniformPonctualField(new Vector3(0, 3, 0), 5, physicsEngine);

const ground = RigidBodyFactory.CreateCuboid("ground", new Vector3(20, 5, 20), 0, physicsEngine, scene);
ground.setInitialPosition(new Vector3(0, -10, 0));
ground.mesh.receiveShadows = true;
camera.target = ground.mesh.position;

const sphere = RigidBodyFactory.CreateSphere("sphere", 1, 1, physicsEngine, scene);
shadowGenerator.addShadowCaster(sphere.mesh);
sphere.setInitialPosition(randomVector3(-3, 3));

const cuboid = RigidBodyFactory.CreateCuboid("cuboid", new Vector3(1, 1, 1), 1, physicsEngine, scene);
cuboid.setInitialPosition(randomVector3(-3, 3));
shadowGenerator.addShadowCaster(cuboid.mesh);

const cylinder = RigidBodyFactory.CreateCylinder("cylinder", 0.5, 1.5, 1, physicsEngine, scene);
cylinder.setInitialPosition(randomVector3(-5, 5));
shadowGenerator.addShadowCaster(cylinder.mesh);

const octahedron = RigidBodyFactory.CreateOctahedron("octahedron", 1, 1, physicsEngine, scene);
octahedron.setInitialPosition(randomVector3(-5, 5));
shadowGenerator.addShadowCaster(octahedron.mesh);

// on mesh click, center the camera on it
scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.pickInfo!.hit) {
        camera.target = pointerInfo.pickInfo!.pickedMesh!.position;
    }
});

let I = 0;

function updateScene() {
    ground.currentState.aabb.updateFromRigidBody(ground);

    if (I == 1) {
        cuboid.applyImpulse(new Impulse(new Vector3(0, 1, 0.1), new Vector3(Math.random(), Math.random(), Math.random())));
        cylinder.applyImpulse(new Impulse(new Vector3(0.2, 0.5, 1), new Vector3(Math.random(), Math.random(), Math.random())));
        octahedron.applyImpulse(new Impulse(new Vector3(0.7, 0.1, 0.3), new Vector3(Math.random(), Math.random(), Math.random())));
    }
    const deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.017);
    physicsEngine.update(deltaTime / 2);
    I++;
}

// use zqsd to move the target of the camera
document.addEventListener("keydown", e => {
    if (e.key == "z") camera.target.addInPlace(camera.getDirection(new Vector3(0, 0, 1)));
    if (e.key == "s") camera.target.addInPlace(camera.getDirection(new Vector3(0, 0, -1)));
    if (e.key == "q") camera.target.addInPlace(camera.getDirection(new Vector3(-1, 0, 0)));
    if (e.key == "d") camera.target.addInPlace(camera.getDirection(new Vector3(1, 0, 0)));
    if (e.key == "a") camera.target.addInPlace(camera.getDirection(new Vector3(0, 1, 0)));
    if (e.key == "e") camera.target.addInPlace(camera.getDirection(new Vector3(0, -1, 0)));
});

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
});

window.addEventListener("keydown", e => {
    if (e.key == " ") physicsEngine.togglePause();
});

