import Matrix from './Matrix';

class Pattern {
    public id: string;
    public objectNumber: number;
    public gState: any;
    public matrix: Matrix;

    constructor(gState, matrix: Matrix) {
        this.gState = gState;
        this.matrix = matrix;

        this.id = ''; // set by addPattern()
        this.objectNumber = -1; // will be set by putPattern()
    }
}

export default Pattern;
