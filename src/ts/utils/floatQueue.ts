export class FloatQueue {
    private readonly _queue: number[];
    private _head = 0;
    private _tail = 0;
    private _size = 0;
    private _capacity: number;

    constructor(capacity: number) {
        this._capacity = capacity;
        this._queue = new Array<number>(capacity);
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
        let mean = 0;
        let mean2 = 0;
        for (let i = 0; i < this._size; i++) {
            const item = this._queue[(this._head + i) % this._capacity];
            mean += item;
            mean2 += item * item;
        }
        mean /= this._size;
        mean2 /= this._size;
        return mean2 - mean * mean;
    }

    enqueue(item: number): void {
        this._queue[this._tail] = item;
        this._tail = (this._tail + 1) % this._capacity;
        if (this._size < this._capacity) {
            this._size++;
        } else {
            this._head = (this._head + 1) % this._capacity;
        }
    }

    dequeue(): number | undefined {
        if (this._size === 0) {
            return undefined;
        }

        const item = this._queue[this._head];
        this._head = (this._head + 1) % this._capacity;
        this._size--;
        return item;
    }

    peek(): number | undefined {
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