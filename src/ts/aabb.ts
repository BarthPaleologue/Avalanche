import {
    AbstractMesh, Color3,
    Color4,
    LinesMesh,
    Mesh,
    MeshBuilder, StandardMaterial,
    Vector3,
    VertexBuffer
} from "@babylonjs/core";

export class AABB {
    min: Vector3;
    max: Vector3;
    isVisible = false;

    helperMesh: Mesh | null;
    color: Color3 = new Color3(1, 1, 1);

    constructor(min: Vector3, max: Vector3) {
        [this.min, this.max] = [min, max];

        this.helperMesh = null;
    }

    setVisible(isVisible: boolean) {
        this.isVisible = isVisible;
        if (this.isVisible) this.helperMesh = AABB.computeLinesMesh(this.min, this.max, this.color);
        else {
            this.helperMesh?.dispose();
            this.helperMesh = null;
        }
    }

    static FromMesh(mesh: AbstractMesh) {
        const [min, max] = AABB.getMinMax(mesh);
        return new AABB(min, max);
    }

    static getMinMax(mesh: AbstractMesh): [Vector3, Vector3] {
        // use the vertices of the mesh to compute the min and max
        const vertices = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (vertices == null) throw new Error(`Mesh ${mesh.name} has no vertices`);
        // the vertices are stored in an array of floats, so we need to convert them to Vector3
        const vectors: Vector3[] = [];
        for (let i = 0; i < vertices.length; i += 3) {
            let newVector = new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
            // we need to transform the vertices to world space
            newVector = Vector3.TransformCoordinates(newVector, mesh.getWorldMatrix());
            vectors.push(newVector);
        }

        // now we can compute the min and max
        let min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
        let max = min.negate();
        for (const vector of vectors) {
            min = Vector3.Minimize(min, vector);
            max = Vector3.Maximize(max, vector);
        }
        return [min, max];
    }

    static computeLinesMesh(min: Vector3, max: Vector3, color = new Color3(1, 1, 1)): Mesh {
        const box = MeshBuilder.CreateBox("aabb", {size: 1});
        box.scaling = max.subtract(min);
        box.position = max.add(min).scale(0.5);

        const boxMaterial = new StandardMaterial("aabb");
        boxMaterial.wireframe = true;
        boxMaterial.emissiveColor = color;
        boxMaterial.disableLighting = true;

        box.material = boxMaterial;

        return box;
    }

    /**
     * Returns a boolean indicating whether the AABB is intersecting with another AABB.
     * @param a
     * @param b
     * @constructor
     */
    static Intersects(a: AABB, b: AABB): boolean {
        const aMin = a.min;
        const aMax = a.max;
        const bMin = b.min;
        const bMax = b.max;

        const x = (aMin.x <= bMax.x && aMax.x >= bMin.x);
        const y = (aMin.y <= bMax.y && aMax.y >= bMin.y);
        const z = (aMin.z <= bMax.z && aMax.z >= bMin.z);

        return x && y && z;
    }

    /**
     * Returns whereas a and b are intersecting and the overlap between the 2
     * @param a
     * @param b
     * @constructor
     */
    static IntersectsAndOverlap(a: AABB, b: AABB): [boolean, AABB] {
        const min = Vector3.Maximize(a.min, b.min);
        const max = Vector3.Minimize(a.max, b.max);
        return [this.Intersects(a, b), new AABB(min, max)];
    }

    updateFromMesh(mesh: AbstractMesh) {
        [this.min, this.max] = AABB.getMinMax(mesh);

        if (this.helperMesh) {
            this.helperMesh.position = this.max.add(this.min).scaleInPlace(0.5);
            this.helperMesh.scaling = this.max.subtract(this.min);
            (this.helperMesh.material as StandardMaterial).emissiveColor = this.color;
        }
    }
}