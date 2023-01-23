import {
    ArcRotateCamera, DirectionalLight,
    Engine,
    Scene, ShadowGenerator,
    Vector3
} from "@babylonjs/core";

import "../styles/index.scss";
import {Murph} from "./murph";
import {Impulse} from "./impulse";
import {RigidBodyFactory} from "./rigidBodyFactory";
import {UniformPonctualField} from "./forceFields/uniformPonctualField";

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
//const gravity = new UniformDirectionalField(new Vector3(0, -9.81, 0), physicsEngine);
const gravity = new UniformPonctualField(new Vector3(0, 3, 0), 5, physicsEngine);

const ground = RigidBodyFactory.CreatePlane("ground", 40, 40, 0, physicsEngine, scene);
ground.mesh.rotate(new Vector3(1, 0, 0), Math.PI / 2);
ground.position = new Vector3(0, -5, 0);
ground.mesh.receiveShadows = true;

const sphere = RigidBodyFactory.CreateSphere("sphere", 1, 1, physicsEngine, scene);
shadowGenerator.addShadowCaster(sphere.mesh);

const cuboid = RigidBodyFactory.CreateCuboid("cuboid", new Vector3(1, 1, 1), 1, physicsEngine, scene);
cuboid.position = new Vector3(0, 0, 3);
shadowGenerator.addShadowCaster(cuboid.mesh);

const cylinder = RigidBodyFactory.CreateCylinder("cylinder", 0.5, 1.5, 1, physicsEngine, scene);
cylinder.position = new Vector3(0, 0, -3);
shadowGenerator.addShadowCaster(cylinder.mesh);

const octahedron = RigidBodyFactory.CreateOctahedron("octahedron", 1, 1, physicsEngine, scene);
octahedron.position = new Vector3(0, 0, -6);
shadowGenerator.addShadowCaster(octahedron.mesh)

let I = 0;

function updateScene() {
    ground.aabb.updateFromMesh(ground.mesh);

    if (I == 1) {
        cuboid.applyImpulse(new Impulse(new Vector3(0, 100, 10), new Vector3(0.5, 0.1, -0.5)));
        cylinder.applyImpulse(new Impulse(new Vector3(20, 50, 100), new Vector3(0.3, 0.5, -0.1)));
        octahedron.applyImpulse(new Impulse(new Vector3(70, 10, 30), new Vector3(0.5, 0.1, -0.5)));
    }
    const deltaTime = Math.min(engine.getDeltaTime() / 1000, 0.017);
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

window.addEventListener("keydown", e => {
    if (e.key == " ") physicsEngine.togglePause();
});

