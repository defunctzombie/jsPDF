import Matrix from './Matrix';
import Pattern from './Pattern';

/**
 * A PDF Tiling pattern.
 *
 * Only available in "advanced" API mode.
 *
 * @param {Array.<Number>} boundingBox The bounding box at which one pattern cell gets clipped.
 * @param {Number} xStep Horizontal spacing between pattern cells.
 * @param {Number} yStep Vertical spacing between pattern cells.
 * @param {API.GState=} gState An additional graphics state that gets applied to the pattern (optional).
 * @param {Matrix=} matrix A matrix that describes the transformation between the pattern coordinate system
 * and the use coordinate system (optional).
 * @constructor
 * @extends API.Pattern
 */
class TilingPattern extends Pattern {
    public boundingBox: number[];
    public xStep: number;
    public yStep: number;
    public stream: string;
    public cloneIndex: number;

    constructor(boundingBox: number[], xStep: number, yStep: number, gState, matrix: Matrix) {
        super(gState, matrix);

        this.boundingBox = boundingBox;
        this.xStep = xStep;
        this.yStep = yStep;

        this.stream = ''; // set by endTilingPattern();

        this.cloneIndex = 0;
    }
}

export default TilingPattern;
