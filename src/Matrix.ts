import Point from './Point';
import Rectangle from './Rectangle';

function roundToPrecision(number, parmPrecision) {
    const tmpPrecision = parmPrecision;
    if (isNaN(number) || isNaN(tmpPrecision)) {
        throw new Error('Invalid argument passed to jsPDF.roundToPrecision');
    }
    if (tmpPrecision >= 16) {
        return number.toFixed(tmpPrecision).replace(/0+$/, '');
    }
    return number.toFixed(tmpPrecision);
}

function hpf(number: number) {
    return roundToPrecision(number, 16);
}

/**
 * A matrix object for 2D homogenous transformations: <br>
 * | a b 0 | <br>
 * | c d 0 | <br>
 * | e f 1 | <br>
 * pdf multiplies matrices righthand: v' = v x m1 x m2 x ...
 *
 * @class
 * @name Matrix
 * @param {number} sx
 * @param {number} shy
 * @param {number} shx
 * @param {number} sy
 * @param {number} tx
 * @param {number} ty
 * @constructor
 */
class Matrix {
    private matrix: number[] = [];
    private precision: number = 2;

    constructor(sx, shy, shx, sy, tx, ty, precision) {
        this.sx = !isNaN(sx) ? sx : 1;
        this.shy = !isNaN(shy) ? shy : 0;
        this.shx = !isNaN(shx) ? shx : 0;
        this.sy = !isNaN(sy) ? sy : 1;
        this.tx = !isNaN(tx) ? tx : 0;
        this.ty = !isNaN(ty) ? ty : 0;
        this.precision = precision;
    }

    /**
     * Join the Matrix Values to a String
     *
     * @function join
     * @param {string} separator Specifies a string to separate each pair of adjacent elements of the array. The separator is converted to a string if necessary. If omitted, the array elements are separated with a comma (","). If separator is an empty string, all elements are joined without any characters in between them.
     * @returns {string} A string with all array elements joined.
     * @memberof Matrix#
     */
    public join(separator?: string): string {
        return [this.sx, this.shy, this.shx, this.sy, this.tx, this.ty].join(separator);
    }

    /**
     * Multiply the matrix with given Matrix
     *
     * @function multiply
     * @param matrix
     * @returns {Matrix}
     * @memberof Matrix#
     */
    public multiply(matrix: Matrix): Matrix {
        const sx = matrix.sx * this.sx + matrix.shy * this.shx;
        const shy = matrix.sx * this.shy + matrix.shy * this.sy;
        const shx = matrix.shx * this.sx + matrix.sy * this.shx;
        const sy = matrix.shx * this.shy + matrix.sy * this.sy;
        const tx = matrix.tx * this.sx + matrix.ty * this.shx + this.tx;
        const ty = matrix.tx * this.shy + matrix.ty * this.sy + this.ty;

        return new Matrix(sx, shy, shx, sy, tx, ty, this.precision);
    }

    /**
     * @function decompose
     * @memberof Matrix#
     */
    public decompose(): {
        scale: Matrix;
        translate: Matrix;
        rotate: Matrix;
        skew: Matrix;
    } {
        let a = this.sx;
        let b = this.shy;
        let c = this.shx;
        let d = this.sy;
        const e = this.tx;
        const f = this.ty;

        let scaleX = Math.sqrt(a * a + b * b);
        a /= scaleX;
        b /= scaleX;

        let shear = a * c + b * d;
        c -= a * shear;
        d -= b * shear;

        const scaleY = Math.sqrt(c * c + d * d);
        c /= scaleY;
        d /= scaleY;
        shear /= scaleY;

        if (a * d < b * c) {
            a = -a;
            b = -b;
            shear = -shear;
            scaleX = -scaleX;
        }

        return {
            scale: new Matrix(scaleX, 0, 0, scaleY, 0, 0, this.precision),
            translate: new Matrix(1, 0, 0, 1, e, f, this.precision),
            rotate: new Matrix(a, b, -b, a, 0, 0, this.precision),
            skew: new Matrix(1, 0, shear, 1, 0, 0, this.precision),
        };
    }

    /**
     * @function toString
     * @memberof Matrix#
     */
    public toString(parmPrecision?: number): string {
        const tmpPrecision = this.precision || parmPrecision || 5;
        const round = function(number) {
            if (tmpPrecision >= 16) {
                return hpf(number);
            } else {
                return Math.round(number * Math.pow(10, tmpPrecision)) / Math.pow(10, tmpPrecision);
            }
        };

        return [
            round(this.sx),
            round(this.shy),
            round(this.shx),
            round(this.sy),
            round(this.tx),
            round(this.ty),
        ].join(' ');
    }

    public inversed(): Matrix {
        const a = this.sx,
            b = this.shy,
            c = this.shx,
            d = this.sy,
            e = this.tx,
            f = this.ty;

        const quot = 1 / (a * d - b * c);

        const aInv = d * quot;
        const bInv = -b * quot;
        const cInv = -c * quot;
        const dInv = a * quot;
        const eInv = -aInv * e - cInv * f;
        const fInv = -bInv * e - dInv * f;

        return new Matrix(aInv, bInv, cInv, dInv, eInv, fInv, this.precision);
    }

    /**
     * @function applyToPoint
     * @memberof Matrix#
     */
    public applyToPoint(pt: Point): Point {
        const x = pt.x * this.sx + pt.y * this.shx + this.tx;
        const y = pt.x * this.shy + pt.y * this.sy + this.ty;
        return new Point(x, y);
    }

    /**
     * @function applyToRectangle
     * @memberof Matrix#
     */
    public applyToRectangle(rect: Rectangle): Rectangle {
        const pt1 = this.applyToPoint(rect);
        const pt2 = this.applyToPoint(new Point(rect.x + rect.w, rect.y + rect.h));
        return new Rectangle(pt1.x, pt1.y, pt2.x - pt1.x, pt2.y - pt1.y);
    }

    /**
     * Clone the Matrix
     *
     * @function clone
     * @memberof Matrix#
     * @name clone
     * @instance
     */
    public clone(): Matrix {
        const sx = this.sx;
        const shy = this.shy;
        const shx = this.shx;
        const sy = this.sy;
        const tx = this.tx;
        const ty = this.ty;

        return new Matrix(sx, shy, shx, sy, tx, ty, this.precision);
    }

    private round(number: number) {
        if (this.precision >= 16) {
            return number;
        }

        return Math.round(number * 100000) / 100000;
    }

    get sx(): number {
        return this.matrix[0];
    }

    set sx(value: number) {
        this.matrix[0] = this.round(value);
    }

    get shy(): number {
        return this.matrix[1];
    }

    set shy(value: number) {
        this.matrix[1] = this.round(value);
    }

    get shx(): number {
        return this.matrix[2];
    }

    set shx(value: number) {
        this.matrix[2] = this.round(value);
    }

    get sy(): number {
        return this.matrix[3];
    }

    set sy(value: number) {
        this.matrix[3] = this.round(value);
    }

    get tx(): number {
        return this.matrix[4];
    }

    set tx(value: number) {
        this.matrix[4] = this.round(value);
    }

    get ty(): number {
        return this.matrix[5];
    }

    set ty(value: number) {
        this.matrix[5] = this.round(value);
    }

    get a(): number {
        return this.matrix[0];
    }

    get b(): number {
        return this.matrix[1];
    }

    get c(): number {
        return this.matrix[2];
    }

    get d(): number {
        return this.matrix[3];
    }

    get e(): number {
        return this.matrix[4];
    }

    get f(): number {
        return this.matrix[5];
    }

    get rotation(): number {
        return Math.atan2(this.shx, this.sx);
    }

    get scaleX(): number {
        return this.decompose().scale.sx;
    }

    get scaleY(): number {
        return this.decompose().scale.sy;
    }

    get isIdentity(): boolean {
        if (this.sx !== 1) {
            return false;
        }
        if (this.shy !== 0) {
            return false;
        }
        if (this.shx !== 0) {
            return false;
        }
        if (this.sy !== 1) {
            return false;
        }
        if (this.tx !== 0) {
            return false;
        }
        if (this.ty !== 0) {
            return false;
        }
        return true;
    }
}

export default Matrix;
