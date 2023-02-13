import { Mesh, MeshBuilder, Vector3 } from "@babylonjs/core";
import { RigidBody } from "../rigidBody";
import { getBBMaterial } from "./materials";
import { Settings } from "../settings";

export class InfiniteSpatialHashGrid {
    private readonly cellSize: number;
    private readonly grid: Map<string, Set<RigidBody>>;

    private readonly helperMeshes: Mesh[] = [];

    constructor(cellSize: number) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    private getGridCellKey(position: Vector3): string {
        return `${Math.floor(position.x / this.cellSize)}|${Math.floor(position.y / this.cellSize)}|${Math.floor(position.z / this.cellSize)}`;
    }

    add(rigidBody: RigidBody): void {
        if (rigidBody.isStatic) return;
        const key = this.getGridCellKey(rigidBody.nextState.position);
        if (!this.grid.has(key)) {
            this.grid.set(key, new Set());
            if (Settings.DISPLAY_INFINITE_SPATIAL_HASH_GRID) this.createHelperMeshAt(rigidBody.nextState.position);
        }
        (this.grid.get(key) as Set<RigidBody>).add(rigidBody);
    }

    remove(rigidBody: RigidBody): void {
        const key = this.getGridCellKey(rigidBody.nextState.position);
        if (!this.grid.has(key)) {
            return;
        }
        (this.grid.get(key) as Set<RigidBody>).delete(rigidBody);
    }

    getCell(position: Vector3): Set<RigidBody> {
        const key = this.getGridCellKey(position);
        if (!this.grid.has(key)) {
            return new Set();
        }
        return this.grid.get(key) as Set<RigidBody>;
    }

    getNeighbors(rigidBody: RigidBody): RigidBody[] {
        const cell = this.getCell(rigidBody.nextState.position);
        const neighborCells: Set<RigidBody>[] = [cell];
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                for (let k = -1; k <= 1; k++) {
                    neighborCells.push(this.getCell(rigidBody.nextState.position.add(new Vector3(i, j, k).scale(this.cellSize))));
                }
            }
        }
        const neighbors = new Array<RigidBody>();
        for (const neighborCell of neighborCells) {
            for (const neighbor of neighborCell) {
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    }

    build(bodies: RigidBody[]): void {
        for (const body of bodies) {
            this.add(body);
        }
    }

    clear(): void {
        for (const helperMesh of this.helperMeshes) helperMesh.dispose();
        this.helperMeshes.length = 0;
        this.grid.clear();
    }

    setVisible(visible: boolean): void {
        if (visible) {
            for (const cell of this.grid.values()) {
                this.createHelperMeshAt(Array.from(cell)[0].nextState.position);
            }
        } else {
            for (const helperMesh of this.helperMeshes) helperMesh.dispose();
            this.helperMeshes.length = 0;
        }
    }

    private createHelperMeshAt(position: Vector3): Mesh {
        const key = this.getGridCellKey(position);
        const mesh = MeshBuilder.CreateBox(key, { size: this.cellSize });
        mesh.position = new Vector3(
            (Math.floor(position.x / this.cellSize) + 0.5) * this.cellSize,
            (Math.floor(position.y / this.cellSize) + 0.5) * this.cellSize,
            (Math.floor(position.z / this.cellSize) + 0.5) * this.cellSize,
        );
        mesh.material = getBBMaterial();
        this.helperMeshes.push(mesh);
        return mesh;
    }
}