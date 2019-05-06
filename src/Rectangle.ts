import Point from './Point';

class Rectangle extends Point {
    private _w: number = 0;
    private _h: number = 0;

    constructor(x: number, y: number, w: number, h: number) {
        super(x, y);
        this.type = 'rect';
        this.w = w;
        this.h = h;
    }

    get w(): number {
        return this._w;
    }

    set w(value: number) {
        this._w = value;
    }

    get h(): number {
        return this._h;
    }

    set h(value: number) {
        this._h = value;
    }
}

export default Rectangle;
