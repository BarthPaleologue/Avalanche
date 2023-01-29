import {Color3, Mesh, MeshBuilder, StandardMaterial, Vector3, VertexData} from "@babylonjs/core";
import {Triangle} from "./vertex";

export function displayTriangle(triangle: Triangle, duration=16) {
    const mesh = new Mesh("triangle");

    //Set arrays for positions and indices
    const positions = [triangle[0].x, triangle[0].y, triangle[0].z,
        triangle[1].x, triangle[1].y, triangle[1].z,
        triangle[2].x, triangle[2].y, triangle[2].z];
    const indices = [0, 1, 2];

    //Create a vertexData object
    const vertexData = new VertexData();

    //Assign positions and indices to vertexData
    vertexData.positions = positions;
    vertexData.indices = indices;

    //Apply vertexData to custom mesh
    vertexData.applyToMesh(mesh);

    const material = new StandardMaterial("triangle");
    material.emissiveColor = Color3.Green();
    material.backFaceCulling = false;
    mesh.material = material;

    if(duration === 0) return;
    setTimeout(() => mesh.dispose(), duration);
}

export function displayPoint(point: Vector3, duration=16) {
    const mesh = MeshBuilder.CreateBox("point", {size: 0.1});
    mesh.position = point;

    const material = new StandardMaterial("triangle");
    material.emissiveColor = Color3.Purple();
    material.backFaceCulling = false;
    mesh.material = material;

    if(duration === 0) return;
    setTimeout(() => mesh.dispose(), duration);
}

export function arrowhead(start: Vector3, vec: Vector3, color: Color3, duration=16) {
    const shape = [
        new Vector3(-0.25, 0, 0),
        new Vector3(0, -0.25, 0),
        new Vector3(0.25, 0, 0),
        new Vector3(0, 0.25, 0)
    ];

    const path = [
        start,
        start.add(vec)
    ];

    const scaling = function (i: number, distance: number) {
        return (1 - i);
    };

    const vecRep = MeshBuilder.ExtrudeShapeCustom("vecRep", {
        shape: shape,
        path: path,
        closeShape: true,
        scaleFunction: scaling,
        sideOrientation: Mesh.DOUBLESIDE
    });
    const mat = new StandardMaterial("");
    mat.diffuseColor = color;
    vecRep.material = mat

    if(duration === 0) return;
    setTimeout(() => vecRep.dispose(), duration);
}