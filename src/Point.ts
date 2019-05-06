class Point {
    private _x: number = 0;
    private _y: number = 0;
    private _type: string = 'pt';

    constructor(ax: number, ay: number) {
        this.x = ax;
        this.y = ay;
    }

    get x(): number {
        return this._x;
    }

    set x(value: number) {
        this._x = value;
    }

    get y(): number {
        return this._y;
    }

    set y(value: number) {
        this._y = value;
    }

    get type(): string {
        return this._type;
    }

    set type(value: string) {
        this._type = value;
    }
}

export default Point;
