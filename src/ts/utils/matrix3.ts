import { Quaternion, Vector3 } from "@babylonjs/core";

export class Matrix3 {
    m00: number;
    m01: number;
    m02: number;
    m10: number;
    m11: number;
    m12: number;
    m20: number;
    m21: number;
    m22: number;

    constructor(m00?: number, m01?: number, m02?: number, m10?: number, m11?: number, m12?: number, m20?: number, m21?: number, m22?: number) {
        this.m00 = m00 || 0;
        this.m01 = m01 || 0;
        this.m02 = m02 || 0;
        this.m10 = m10 || 0;
        this.m11 = m11 || 0;
        this.m12 = m12 || 0;
        this.m20 = m20 || 0;
        this.m21 = m21 || 0;
        this.m22 = m22 || 0;
    }

    public static identity(): Matrix3 {
        return new Matrix3(
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        );
    }

    public static zero(): Matrix3 {
        return new Matrix3(
            0, 0, 0,
            0, 0, 0,
            0, 0, 0
        );
    }

    public static diag(a: number, b: number, c: number): Matrix3 {
        return new Matrix3(
            a, 0, 0,
            0, b, 0,
            0, 0, c
        );
    }

    public determinant(): number {
        return this.m00 * (this.m11 * this.m22 - this.m12 * this.m21) +
            this.m01 * (this.m12 * this.m20 - this.m10 * this.m22) +
            this.m02 * (this.m10 * this.m21 - this.m11 * this.m20);
    }

    public inverse(): Matrix3 {
        const det = this.determinant();
        if (det === 0) {
            throw new Error("Matrix is not invertible");
        }
        const invDet = 1 / det;
        return new Matrix3(
            invDet * (this.m11 * this.m22 - this.m12 * this.m21),
            invDet * (this.m02 * this.m21 - this.m01 * this.m22),
            invDet * (this.m01 * this.m12 - this.m02 * this.m11),
            invDet * (this.m12 * this.m20 - this.m10 * this.m22),
            invDet * (this.m00 * this.m22 - this.m02 * this.m20),
            invDet * (this.m02 * this.m10 - this.m00 * this.m12),
            invDet * (this.m10 * this.m21 - this.m11 * this.m20),
            invDet * (this.m01 * this.m20 - this.m00 * this.m21),
            invDet * (this.m00 * this.m11 - this.m01 * this.m10)
        );
    }

    applyTo(vector: Vector3) {
        return new Vector3(
            this.m00 * vector.x + this.m01 * vector.y + this.m02 * vector.z,
            this.m10 * vector.x + this.m11 * vector.y + this.m12 * vector.z,
            this.m20 * vector.x + this.m21 * vector.y + this.m22 * vector.z
        );
    }

    public static fromQuaternion(q: Quaternion): Matrix3 {
        return new Matrix3(
            1 - 2 * q.y * q.y - 2 * q.z * q.z, 2 * q.x * q.y - 2 * q.z * q.w, 2 * q.x * q.z + 2 * q.y * q.w,
            2 * q.x * q.y + 2 * q.z * q.w, 1 - 2 * q.x * q.x - 2 * q.z * q.z, 2 * q.y * q.z - 2 * q.x * q.w,
            2 * q.x * q.z - 2 * q.y * q.w, 2 * q.y * q.z + 2 * q.x * q.w, 1 - 2 * q.x * q.x - 2 * q.y * q.y
        );
    }

    public multiply(rhs: Matrix3): Matrix3 {
        return new Matrix3(
            this.m00 * rhs.m00 + this.m01 * rhs.m10 + this.m02 * rhs.m20,
            this.m00 * rhs.m01 + this.m01 * rhs.m11 + this.m02 * rhs.m21,
            this.m00 * rhs.m02 + this.m01 * rhs.m12 + this.m02 * rhs.m22,
            this.m10 * rhs.m00 + this.m11 * rhs.m10 + this.m12 * rhs.m20,
            this.m10 * rhs.m01 + this.m11 * rhs.m11 + this.m12 * rhs.m21,
            this.m10 * rhs.m02 + this.m11 * rhs.m12 + this.m12 * rhs.m22,
            this.m20 * rhs.m00 + this.m21 * rhs.m10 + this.m22 * rhs.m20,
            this.m20 * rhs.m01 + this.m21 * rhs.m11 + this.m22 * rhs.m21,
            this.m20 * rhs.m02 + this.m21 * rhs.m12 + this.m22 * rhs.m22
        );
    }

    public transpose(): Matrix3 {
        return new Matrix3(
            this.m00, this.m10, this.m20,
            this.m01, this.m11, this.m21,
            this.m02, this.m12, this.m22
        );
    }

    public addInPlace(rhs: Matrix3): Matrix3 {
        this.m00 += rhs.m00;
        this.m01 += rhs.m01;
        this.m02 += rhs.m02;
        this.m10 += rhs.m10;
        this.m11 += rhs.m11;
        this.m12 += rhs.m12;
        this.m20 += rhs.m20;
        this.m21 += rhs.m21;
        this.m22 += rhs.m22;
        return this;
    }

    public scaleInPlace(rhs: number): Matrix3 {
        this.m00 *= rhs;
        this.m01 *= rhs;
        this.m02 *= rhs;
        this.m10 *= rhs;
        this.m11 *= rhs;
        this.m12 *= rhs;
        this.m20 *= rhs;
        this.m21 *= rhs;
        this.m22 *= rhs;
        return this;
    }

    public subtractInPlace(rhs: Matrix3): Matrix3 {
        this.m00 -= rhs.m00;
        this.m01 -= rhs.m01;
        this.m02 -= rhs.m02;
        this.m10 -= rhs.m10;
        this.m11 -= rhs.m11;
        this.m12 -= rhs.m12;
        this.m20 -= rhs.m20;
        this.m21 -= rhs.m21;
        this.m22 -= rhs.m22;
        return this;
    }

    public trace(): number {
        return this.m00 + this.m11 + this.m22;
    }

    public clone(): Matrix3 {
        return new Matrix3(
            this.m00, this.m01, this.m02,
            this.m10, this.m11, this.m12,
            this.m20, this.m21, this.m22
        );
    }

    public copyFrom(rhs: Matrix3): Matrix3 {
        this.m00 = rhs.m00;
        this.m01 = rhs.m01;
        this.m02 = rhs.m02;
        this.m10 = rhs.m10;
        this.m11 = rhs.m11;
        this.m12 = rhs.m12;
        this.m20 = rhs.m20;
        this.m21 = rhs.m21;
        this.m22 = rhs.m22;
        return this;
    }
}