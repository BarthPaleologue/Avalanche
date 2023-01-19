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

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const physicsEngine = new Murph();

const camera = new ArcRotateCamera("camera", 0, 3.14 / 2.0, 15, Vector3.Zero(), scene);
camera.attachControl();

const light = new PointLight("light", new Vector3(-5, 5, 10), scene);

const sphere = MeshBuilder.CreateSphere("sphere", {segments: 32, diameter: 1}, scene);

const sphereRigidBody = new RigidBody(sphere, 1, physicsEngine);

function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    physicsEngine.update(deltaTime);
}

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
});

