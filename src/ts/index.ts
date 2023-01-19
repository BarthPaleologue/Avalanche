import {
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

const canvas = document.getElementById("renderer") as HTMLCanvasElement;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const engine = new Engine(canvas);

const scene = new Scene(engine);

const camera = new FreeCamera("camera", Vector3.Zero(), scene);
camera.attachControl();

const light = new PointLight("light", new Vector3(-5, 5, 10), scene);

const sphere = MeshBuilder.CreateSphere("sphere", {segments: 32, diameter: 1}, scene);
sphere.position = new Vector3(0, 0, 10);

Effect.ShadersStore[`InvertFragmentShader`] = invert;
const invertPostProcess = new PostProcess("invert", "Invert", [], ["textureSampler"], 1, camera, Texture.BILINEAR_SAMPLINGMODE, engine);

let clock = 0;

function updateScene() {
    const deltaTime = engine.getDeltaTime() / 1000;
    clock += deltaTime;

    sphere.position.x = Math.cos(clock);
    sphere.position.z = 5 + Math.sin(clock);
}

scene.executeWhenReady(() => {
    engine.loadingScreen.hideLoadingUI();
    scene.registerBeforeRender(() => updateScene());
    engine.runRenderLoop(() => scene.render());
});

window.addEventListener("resize", () => {
    engine.resize();
});

