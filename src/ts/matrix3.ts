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
}