import { AssetsManager, Color3, Mesh, MeshAssetTask, Scene, StandardMaterial, Texture } from "@babylonjs/core";

import bunny from "../assets/simplify_bunny4.obj";

export class Assets {
    static IS_READY = false;

    //static Character: AbstractMesh;
    static Bunny: Mesh;

    private static manager: AssetsManager;

    static Init(scene: Scene): Promise<void> {
        return new Promise((resolve) => {
            Assets.manager = new AssetsManager(scene);
            console.log("Initializing assets...");

            const bunnyTask = Assets.manager.addMeshTask("bunnyTask", "", "", bunny);
            bunnyTask.onSuccess = function (task: MeshAssetTask) {
                Assets.Bunny = task.loadedMeshes[0] as Mesh;
                Assets.Bunny.createNormals(true);
                Assets.Bunny.isVisible = false;
                console.log("Bunny loaded");
            };

            Assets.manager.onProgress = (remainingCount, totalCount) => {
                scene.getEngine().loadingUIText = `Loading assets... ${totalCount - remainingCount}/${totalCount}`;
            };
            Assets.manager.load();

            Assets.manager.onFinish = () => {
                console.log("Assets loaded");
                Assets.IS_READY = true;
                resolve();
            };
        });
    }

    static DebugMaterial(name: string) {
        const mat = new StandardMaterial(`${name}DebugMaterial`);
        mat.emissiveColor = Color3.Random();
        return mat;
    }
}