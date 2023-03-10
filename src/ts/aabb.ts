import { Color3, Matrix, Mesh, MeshBuilder, StandardMaterial, Vector3, VertexBuffer } from "@babylonjs/core";
import { Settings } from "./settings";
import { Triangle } from "./utils/triangle";
import { Edge } from "./utils/edge";
import { getBBMaterial } from "./utils/materials";

/**
 * Axis Aligned Bounding Box
 */
export class AABB {
    min: Vector3;
    max: Vector3;
    private isVisible = false;

    helperMesh: Mesh | null;
    color: Color3 = new Color3(1, 1, 1);

    constructor(min: Vector3, max: Vector3) {
        [this.min, this.max] = [min, max];

        this.helperMesh = this.isVisible ? this.computeLinesMesh() : null;
    }

    /**
     * Sets the visibility of the AABB.
     */
    public setVisible(isVisible: boolean) {
        this.isVisible = isVisible;
        if (this.isVisible && this.helperMesh == null) this.helperMesh = this.computeLinesMesh(this.color);
        else if (!this.isVisible) {
            this.helperMesh?.dispose();
            this.helperMesh = null;
        }
    }

    /**
     * Gets the min and max of the AABB from a mesh.
     * @param mesh The mesh to get the AABB from
     * @param worldMatrix The world matrix of the mesh
     * @returns An array containing the min and max
     */
    static getMinMaxFromMesh(mesh: Mesh, worldMatrix: Matrix): [Vector3, Vector3] {
        // use the vertices of the mesh to compute the min and max
        const vertices = mesh.getVerticesData(VertexBuffer.PositionKind);
        if (vertices == null) throw new Error(`Mesh ${mesh.name} has no vertices`);
        // the vertices are stored in an array of floats, so we need to convert them to Vector3
        const vectors: Vector3[] = [];
        for (let i = 0; i < vertices.length; i += 3) {
            let newVector = new Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
            // we need to transform the vertices to world space
            newVector = Vector3.TransformCoordinates(newVector, worldMatrix);
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

    /**
     * Computes the line mesh used for displaying the AABB.
     * @param color The color of the lines
     * @returns The line mesh
     */
    private computeLinesMesh(color = new Color3(1, 1, 1)): Mesh {
        const box = MeshBuilder.CreateBox("aabb", { size: 1 });
        box.scaling = this.max.subtract(this.min);
        box.position = this.max.add(this.min).scaleInPlace(0.5);

        box.material = getBBMaterial(color);

        return box;
    }

    /**
     * Returns a boolean indicating whether the given point is inside the AABB.
     * @param point The point to test
     * @returns True if the point is inside the AABB, false otherwise
     */
    public containsPoint(point: Vector3): boolean {
        return (
            this.min.x <= point.x &&
            point.x <= this.max.x &&
            this.min.y <= point.y &&
            point.y <= this.max.y &&
            this.min.z <= point.z &&
            point.z <= this.max.z
        );
    }

    /**
     * Creates an AABB from a triangle.
     * @param triangle The triangle to use to create the AABB
     * @returns The AABB created from the triangle
     */
    static FromTriangle(triangle: Triangle): AABB {
        const min = Vector3.Minimize(Vector3.Minimize(triangle[0], triangle[1]), triangle[2]);
        const max = Vector3.Maximize(Vector3.Maximize(triangle[0], triangle[1]), triangle[2]);
        return new AABB(min, max);
    }

    /**
     * Creates an AABB from an edge.
     * @param edge The edge to use to create the AABB
     * @returns The AABB created from the edge
     */
    static FromEdge(edge: Edge): AABB {
        const min = Vector3.Minimize(edge[0], edge[1]);
        const max = Vector3.Maximize(edge[0], edge[1]);
        return new AABB(min, max);
    }

    /**
     * Returns a boolean indicating whether the AABB is intersecting with another AABB.
     * @param b The other AABB
     */
    public intersects(b: AABB): boolean {
        const aMin = this.min;
        const aMax = this.max;
        const bMin = b.min;
        const bMax = b.max;

        const x = aMin.x <= bMax.x && aMax.x >= bMin.x;
        const y = aMin.y <= bMax.y && aMax.y >= bMin.y;
        const z = aMin.z <= bMax.z && aMax.z >= bMin.z;

        return x && y && z;
    }

    /**
     * Returns whereas a and b are intersecting and the overlap between the 2 AABBs.
     * @param b The other AABB
     */
    public intersectionOverlap(b: AABB): AABB | null {
        const min = Vector3.Maximize(this.min, b.min);
        const max = Vector3.Minimize(this.max, b.max);

        if (this.intersects(b)) return new AABB(min, max);
        return null;
    }

    /**
     * Updates the AABB using a mesh and an epsilon-offset.
     * @param mesh The mesh to use to update the AABB
     * @param worldMatrix The world matrix of the mesh
     */
    public updateFromMesh(mesh: Mesh, worldMatrix: Matrix) {
        [this.min, this.max] = AABB.getMinMaxFromMesh(mesh, worldMatrix);

        // add a small offset to the min and max (Epsilon)
        this.min.subtractInPlace(Vector3.One().scaleInPlace(7 * Settings.EPSILON));
        this.max.addInPlace(Vector3.One().scaleInPlace(7 * Settings.EPSILON));

        if (this.helperMesh) {
            this.helperMesh.position = this.max.add(this.min).scaleInPlace(0.5);
            this.helperMesh.scaling = this.max.subtract(this.min);
            (this.helperMesh.material as StandardMaterial).emissiveColor = this.color;
        }
    }

    /**
     * Copy the values of another AABB into this one.
     * @param aabb the AABB to copy from
     */
    public copyFrom(aabb: AABB) {
        this.min.copyFrom(aabb.min);
        this.max.copyFrom(aabb.max);
        this.color.copyFrom(aabb.color);

        if (this.helperMesh) {
            this.helperMesh.position = this.max.add(this.min).scaleInPlace(0.5);
            this.helperMesh.scaling = this.max.subtract(this.min);
            (this.helperMesh.material as StandardMaterial).emissiveColor = this.color;
        }
    }
}
