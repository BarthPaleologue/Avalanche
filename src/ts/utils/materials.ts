import { Color3, StandardMaterial } from "@babylonjs/core";
import { Settings } from "../settings";

export function getBBMaterial(color = Color3.White()) {
    const boxMaterial = new StandardMaterial("bb");
    boxMaterial.wireframe = true;
    boxMaterial.emissiveColor = color;
    boxMaterial.disableLighting = true;
    boxMaterial.alpha = 0.2;

    return boxMaterial;
}

export function getRandomColorMaterial() {
    const material = new StandardMaterial("color");
    material.diffuseColor = Color3.Random();
    material.wireframe = Settings.WIREFRAME;
    material.backFaceCulling = false;

    return material;
}
