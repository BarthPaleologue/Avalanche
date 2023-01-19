import {
    ArcRotateCamera,
    Effect,
    Engine,
    FreeCamera,
    MeshBuilder,
    PointLight,
    PostProcess,
    Scene,
    Texture,
    Vector3
} from "@babylonjs/core";

import "../styles/index.scss";

import invert from "../shaders/invert.glsl";
import {RigidBody} from "./rigidBody";
import {Murph} from "./murph";
import {UniformDirectionalField} from "./forceFields/uniformDirectionalField";
import {Impulse} from "./impulse";

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const camera = new ArcRotateCamera("camera", 0, 3.14 / 2.0, 15, Vector3.Zero(), scene);
camera.attachControl();

const light = new PointLight("light", new Vector3(-5, 5, -20), scene);

const physicsEngine = new Murph();
const gravity = new UniformDirectionalField(new Vector3(0, -9.81, 0), physicsEngine);

const sphere = MeshBuilder.CreateSphere("sphere", {segments: 32, diameter: 1}, scene);
const sphereRigidBody = new RigidBody(sphere, 1, physicsEngine);

const cuboid = RigidBody.CreateBox("cuboid", new Vector3(1, 1, 1), 1, physicsEngine, scene);
cuboid.position = new Vector3(0, 1, 3);

let I = 0;

function updateScene() {
    if (I == 1) cuboid.applyImpulse(new Impulse(new Vector3(0, 100, 10), new Vector3(0.5, 0.5, 0.5)));
    const deltaTime = engine.getDeltaTime() / 1000;
    physicsEngine.update(deltaTime);
    I++;
}

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
});

