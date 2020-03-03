import Matrix from './Matrix';
import Pattern from './Pattern';

/**
 * A pattern describing a shading pattern.
 *
 * Only available in "advanced" API mode.
 *
 * @param {String} type One of "axial" or "radial"
 * @param {Array<Number>} coords Either [x1, y1, x2, y2] for "axial" type describing the two interpolation points
 * or [x1, y1, r, x2, y2, r2] for "radial" describing inner and the outer circle.
 * @param {Array<Object>} colors An array of objects with the fields "offset" and "color". "offset" describes
 * the offset in parameter space [0, 1]. "color" is an array of length 3 describing RGB values in [0, 255].
 * @param {GState=} gState An additional graphics state that gets applied to the pattern (optional).
 * @param {Matrix=} matrix A matrix that describes the transformation between the pattern coordinate system
 * and the use coordinate system (optional).
 * @constructor
 * @extends API.Pattern
 */
class ShadingPattern extends Pattern {
    public type: number;
    public colors: string;
    public coords: number[];

    constructor(
        type: 'axial' | 'radial',
        coords: number[],
        colors: string,
        gState,
        matrix: Matrix
    ) {
        super(gState, matrix);

        this.type = type === 'axial' ? 2 : 3;
        this.coords = coords;
        this.colors = colors;
    }
}

export default ShadingPattern;
