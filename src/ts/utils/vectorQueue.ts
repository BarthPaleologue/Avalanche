import { Vector3 } from "@babylonjs/core";

/**
 * A queue of Vector3 (Written by Copilot)
 */
export class VectorQueue {
    private readonly _queue: Vector3[];
    private _head = 0;
    private _tail = 0;
    private _size = 0;
    private _capacity: number;

    constructor(capacity: number) {
        this._capacity = capacity;
        this._queue = new Array<Vector3>(capacity);
    }

    get size(): number {
        return this._size;
    }

    get capacity(): number {
        return this._capacity;
    }

    set capacity(capacity: number) {
        this._capacity = capacity;
        this._queue.length = capacity;
    }

    get variance() {
        let mean = Vector3.Zero();
        let mean2 = Vector3.Zero();
        for (let i = 0; i < this._size; i++) {
            const item = this._queue[(this._head + i) % this._capacity];
            mean.addInPlace(item);
            mean2.addInPlace(item.scale(item.lengthSquared()));
        }
        mean.scaleInPlace(1 / this._size);
        mean2.scaleInPlace(1 / this._size);
        return mean2.subtract(mean.scale(mean.lengthSquared()));
    }

    enqueue(item: Vector3): void {
        this._queue[this._tail] = item;
        this._tail = (this._tail + 1) % this._capacity;
        if (this._size < this._capacity) {
            this._size++;
        } else {
            this._head = (this._head + 1) % this._capacity;
        }
    }

    dequeue(): Vector3 | undefined {
        if (this._size === 0) {
            return undefined;
        }

        const item = this._queue[this._head];
        this._head = (this._head + 1) % this._capacity;
        this._size--;
        return item;
    }

    peek(): Vector3 | undefined {
        if (this._size === 0) {
            return undefined;
        }

        return this._queue[this._head];
    }

    clear(): void {
        this._head = 0;
        this._tail = 0;
        this._size = 0;
    }
}