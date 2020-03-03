import { decodeColorString, encodeColorString } from '../color';
import DocumentCore from '../DocumentCore';
import { f2, f3, hpf } from '../rounding';
import Matrix from '../Matrix';
import ShadingPattern from '../ShadingPattern';
import TilingPattern from '../TilingPattern';

interface PatternData {
    key: string;
    matrix?: Matrix;
    boundingBox?: number[];
    xStep?: number;
    yStep?: number;
}

declare module '../DocumentCore' {
    interface DocumentCore {
        rect(
            x: number,
            y: number,
            w: number,
            h: number,
            style?,
            patternKey?,
            patternData?
        ): DocumentCore;
        setDrawColor(ch1, ch2?, ch3?, ch4?);
        getFillColor();
        setFillColor(ch1, ch2?, ch3?, ch4?);
        setLineCap(style);
        setLineJoin(style);
        setMiterLimit(length);
        getLineHeight();
        setLineWidth(width: number);
        getDrawColor();
        path(lines, style, patternKey, patternData);
        triangle(x1, y1, x2, y2, x3, y3, style?, patternKey?, patternData?);
        roundedRect(x, y, w, h, rx, ry, style?, patternKey?, patternData?);
        ellipse(x, y, rx, ry, style?, patternKey?, patternData?);
        circle(x, y, r, style?, patternKey?, patternData?);
        line(x1, y1, x2, y2, style?);
        lines(lines, x, y, scale?, style?, closed?, patternKey?, patternData?);
        moveTo(x, y);
        lineTo(x, y);
        curveTo(x1, y1, x2, y2, x3, y3);
        discardPath();
        setDefaultPathOperation(operator);
        close();
        stroke();
        fill(pattern);
        fillEvenOdd(pattern);
        fillStroke(pattern);
        fillStrokeEvenOdd(pattern);
        fillWithOptionalPattern(style, pattern);
        clip(rule);
        clipEvenOdd();
        clipFixed(rule);
        setLineDashPattern(dashArray, dashPhase);
        beginTilingPattern(pattern);
        endTilingPattern(key, pattern);
        addShadingPattern(key, pattern);
    }
}

/**
 * Is an Object providing a mapping from human-readable to
 * integer flag values designating the varieties of line cap
 * and join styles.
 *
 * @memberof jsPDF#
 * @name CapJoinStyles
 */
const CapJoinStyles = {
    0: 0,
    butt: 0,
    but: 0,
    miter: 0,
    1: 1,
    round: 1,
    rounded: 1,
    circle: 1,
    2: 2,
    projecting: 2,
    project: 2,
    square: 2,
    bevel: 2,
};

/**
 * Adds a rectangle to PDF.
 *
 * @param {number} x Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} w Width (in units declared at inception of PDF document).
 * @param {number} h Height (in units declared at inception of PDF document).
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name rect
 */
DocumentCore.prototype.rect = function(
    this: DocumentCore,
    x,
    y,
    w,
    h,
    style?,
    patternKey?,
    patternData?
) {
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h) || !this.isValidStyle(style)) {
        throw new Error('Invalid arguments passed to jsPDF.rect');
    }

    this.out(
        [
            f2(this.getHorizontalCoordinate(x)),
            f2(this.getVerticalCoordinate(y)),
            f2(this.scale(w)),
            f2(this.scale(-h)),
            're',
        ].join(' ')
    );

    this.putStyle(style, patternKey, patternData);
    return this;
};

/**
 * Sets the stroke color for upcoming elements.
 *
 * Depending on the number of arguments given, Gray, RGB, or CMYK
 * color space is implied.
 *
 * When only ch1 is given, "Gray" color space is implied and it
 * must be a value in the range from 0.00 (solid black) to to 1.00 (white)
 * if values are communicated as String types, or in range from 0 (black)
 * to 255 (white) if communicated as Number type.
 * The RGB-like 0-255 range is provided for backward compatibility.
 *
 * When only ch1,ch2,ch3 are given, "RGB" color space is implied and each
 * value must be in the range from 0.00 (minimum intensity) to to 1.00
 * (max intensity) if values are communicated as String types, or
 * from 0 (min intensity) to to 255 (max intensity) if values are communicated
 * as Number types.
 * The RGB-like 0-255 range is provided for backward compatibility.
 *
 * When ch1,ch2,ch3,ch4 are given, "CMYK" color space is implied and each
 * value must be a in the range from 0.00 (0% concentration) to to
 * 1.00 (100% concentration)
 *
 * Because JavaScript treats fixed point numbers badly (rounds to
 * floating point nearest to binary representation) it is highly advised to
 * communicate the fractional numbers as String types, not JavaScript Number type.
 *
 * @param {Number|String} ch1 Color channel value or {string} ch1 color value in hexadecimal, example: '#FFFFFF'.
 * @param {Number} ch2 Color channel value.
 * @param {Number} ch3 Color channel value.
 * @param {Number} ch4 Color channel value.
 *
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name setDrawColor
 */
DocumentCore.prototype.setDrawColor = function(this: DocumentCore, ch1, ch2, ch3, ch4) {
    const options = {
        ch1,
        ch2,
        ch3,
        ch4,
        pdfColorType: 'draw',
        precision: 2,
    };

    this.strokeColor = encodeColorString(options);
    this.out(this.strokeColor);
    return this;
};

/**
 * Gets the fill color for upcoming elements.
 *
 * @function
 * @instance
 * @returns {string} colorAsHex
 * @memberof jsPDF#
 * @name getFillColor
 */
DocumentCore.prototype.getFillColor = function(this: DocumentCore) {
    return decodeColorString(this.fillColor);
};

/**
 * Sets the fill color for upcoming elements.
 *
 * Depending on the number of arguments given, Gray, RGB, or CMYK
 * color space is implied.
 *
 * When only ch1 is given, "Gray" color space is implied and it
 * must be a value in the range from 0.00 (solid black) to to 1.00 (white)
 * if values are communicated as String types, or in range from 0 (black)
 * to 255 (white) if communicated as Number type.
 * The RGB-like 0-255 range is provided for backward compatibility.
 *
 * When only ch1,ch2,ch3 are given, "RGB" color space is implied and each
 * value must be in the range from 0.00 (minimum intensity) to to 1.00
 * (max intensity) if values are communicated as String types, or
 * from 0 (min intensity) to to 255 (max intensity) if values are communicated
 * as Number types.
 * The RGB-like 0-255 range is provided for backward compatibility.
 *
 * When ch1,ch2,ch3,ch4 are given, "CMYK" color space is implied and each
 * value must be a in the range from 0.00 (0% concentration) to to
 * 1.00 (100% concentration)
 *
 * Because JavaScript treats fixed point numbers badly (rounds to
 * floating point nearest to binary representation) it is highly advised to
 * communicate the fractional numbers as String types, not JavaScript Number type.
 *
 * @param {Number|String} ch1 Color channel value or {string} ch1 color value in hexadecimal, example: '#FFFFFF'.
 * @param {Number} ch2 Color channel value.
 * @param {Number} ch3 Color channel value.
 * @param {Number} ch4 Color channel value.
 *
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name setFillColor
 */
DocumentCore.prototype.setFillColor = function(this: DocumentCore, ch1, ch2, ch3, ch4) {
    const options = {
        ch1,
        ch2,
        ch3,
        ch4,
        pdfColorType: 'fill',
        precision: 2,
    };

    this.fillColor = encodeColorString(options);
    this.out(this.fillColor);
    return this;
};

/**
 * Sets the line cap styles.
 * See {jsPDF.CapJoinStyles} for variants.
 *
 * @param {String|Number} style A string or number identifying the type of line cap.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name setLineCap
 */
DocumentCore.prototype.setLineCap = function(this: DocumentCore, style) {
    const id = CapJoinStyles[style];
    if (id === undefined) {
        throw new Error(
            "Line cap style of '" +
                style +
                "' is not recognized. See or extend .CapJoinStyles property for valid styles"
        );
    }
    this.lineCapID = id;
    this.out(id + ' J');

    return this;
};

/**
 * Sets the line join styles.
 * See {jsPDF.CapJoinStyles} for variants.
 *
 * @param {String|Number} style A string or number identifying the type of line join.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name setLineJoin
 */
DocumentCore.prototype.setLineJoin = function(this: DocumentCore, style) {
    const id = CapJoinStyles[style];
    if (id === undefined) {
        throw new Error(
            "Line join style of '" +
                style +
                "' is not recognized. See or extend .CapJoinStyles property for valid styles"
        );
    }
    this.lineJoinID = id;
    this.out(id + ' j');

    return this;
};

/**
 * Sets the miterLimit property, which effects the maximum miter length.
 *
 * @param {number} length The length of the miter
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name setLineMiterLimit
 */
DocumentCore.prototype.setMiterLimit = function(this: DocumentCore, length) {
    length = length || 0;
    if (isNaN(length)) {
        throw new Error('Invalid argument passed to jsPDF.setLineMiterLimit');
    }
    this.miterLimit = parseFloat(f2(length * this.scaleFactor));
    this.out(this.miterLimit + ' M');

    return this;
};

DocumentCore.prototype.getLineHeight = function(this: DocumentCore) {
    return this.activeFontSize * this.lineHeightFactor;
};

DocumentCore.prototype.setLineWidth = function(this: DocumentCore, width: number) {
    this.out(f2(width * this.scaleFactor) + ' w');
    return this;
};

/**
 *  Gets the stroke color for upcoming elements.
 *
 * @function
 * @instance
 * @returns {string} colorAsHex
 * @memberof jsPDF#
 * @name getDrawColor
 */
DocumentCore.prototype.getDrawColor = function(this: DocumentCore) {
    return decodeColorString(this.strokeColor);
};

/**
 * Similar to {@link API.lines} but all coordinates are interpreted as absolute coordinates instead of relative.
 * @param {Array<Object>} lines An array of {op: operator, c: coordinates} object, where op is one of "m" (move to), "l" (line to)
 * "c" (cubic bezier curve) and "h" (close (sub)path)). c is an array of coordinates. "m" and "l" expect two, "c"
 * six and "h" an empty array (or undefined).
 * @param {String=} style  The style. Deprecated!
 * @param {String=} patternKey The pattern key for the pattern that should be used to fill the path. Deprecated!
 * @param {(Matrix|PatternData)=} patternData The matrix that transforms the pattern into user space, or an object that
 * will modify the pattern on use. Deprecated!
 * @function
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name path
 */
DocumentCore.prototype.path = function(this: DocumentCore, lines, style, patternKey, patternData) {
    for (let i = 0; i < lines.length; i++) {
        const leg = lines[i];
        const coords = leg.c;
        switch (leg.op) {
            case 'm':
                this.moveTo(coords[0], coords[1]);
                break;
            case 'l':
                this.lineTo(coords[0], coords[1]);
                break;
            case 'c':
                this.curveTo.apply(this, coords);
                break;
            case 'h':
                this.close();
                break;
        }
    }

    this.putStyle(style, patternKey, patternData);
    return this;
};

/**
 * Adds a triangle to PDF.
 *
 * @param {number} x1 Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y1 Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} x2 Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y2 Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} x3 Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y3 Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name triangle
 */
DocumentCore.prototype.triangle = function(
    this: DocumentCore,
    x1,
    y1,
    x2,
    y2,
    x3,
    y3,
    style,
    patternKey,
    patternData
) {
    if (
        isNaN(x1) ||
        isNaN(y1) ||
        isNaN(x2) ||
        isNaN(y2) ||
        isNaN(x3) ||
        isNaN(y3) ||
        !this.isValidStyle(style)
    ) {
        throw new Error('Invalid arguments passed to jsPDF.triangle');
    }
    this.lines(
        [
            [x2 - x1, y2 - y1], // vector to point 2
            [x3 - x2, y3 - y2], // vector to point 3
            [x1 - x3, y1 - y3], // closing vector back to point 1
        ],
        x1,
        y1, // start of path
        [1, 1],
        style,
        true,
        patternKey,
        patternData
    );
    return this;
};

/**
 * Adds a rectangle with rounded corners to PDF.
 *
 * @param {number} x Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} w Width (in units declared at inception of PDF document).
 * @param {number} h Height (in units declared at inception of PDF document).
 * @param {number} rx Radius along x axis (in units declared at inception of PDF document).
 * @param {number} ry Radius along y axis (in units declared at inception of PDF document).
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name roundedRect
 */
DocumentCore.prototype.roundedRect = function(
    this: DocumentCore,
    x,
    y,
    w,
    h,
    rx,
    ry,
    style,
    patternKey,
    patternData
) {
    if (
        isNaN(x) ||
        isNaN(y) ||
        isNaN(w) ||
        isNaN(h) ||
        isNaN(rx) ||
        isNaN(ry) ||
        !this.isValidStyle(style)
    ) {
        throw new Error('Invalid arguments passed to jsPDF.roundedRect');
    }
    const MyArc = (4 / 3) * (Math.SQRT2 - 1);
    this.lines(
        [
            [w - 2 * rx, 0],
            [rx * MyArc, 0, rx, ry - ry * MyArc, rx, ry],
            [0, h - 2 * ry],
            [0, ry * MyArc, -(rx * MyArc), ry, -rx, ry],
            [-w + 2 * rx, 0],
            [-(rx * MyArc), 0, -rx, -(ry * MyArc), -rx, -ry],
            [0, -h + 2 * ry],
            [0, -(ry * MyArc), rx * MyArc, -ry, rx, -ry],
        ],
        x + rx,
        y, // start of path
        [1, 1],
        style,
        true,
        patternKey,
        patternData
    );
    return this;
};

/**
 * Adds an ellipse to PDF.
 *
 * @param {number} x Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} rx Radius along x axis (in units declared at inception of PDF document).
 * @param {number} ry Radius along y axis (in units declared at inception of PDF document).
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name ellipse
 */
DocumentCore.prototype.ellipse = function(
    this: DocumentCore,
    x,
    y,
    rx,
    ry,
    style,
    patternKey,
    patternData
) {
    if (isNaN(x) || isNaN(y) || isNaN(rx) || isNaN(ry) || !this.isValidStyle(style)) {
        throw new Error('Invalid arguments passed to jsPDF.ellipse');
    }
    const lx = (4 / 3) * (Math.SQRT2 - 1) * rx,
        ly = (4 / 3) * (Math.SQRT2 - 1) * ry;

    this.out(
        [
            f2(this.getHorizontalCoordinate(x + rx)),
            f2(this.getVerticalCoordinate(y)),
            'm',
            f2(this.getHorizontalCoordinate(x + rx)),
            f2(this.getVerticalCoordinate(y - ly)),
            f2(this.getHorizontalCoordinate(x + lx)),
            f2(this.getVerticalCoordinate(y - ry)),
            f2(this.getHorizontalCoordinate(x)),
            f2(this.getVerticalCoordinate(y - ry)),
            'c',
        ].join(' ')
    );
    this.out(
        [
            f2(this.getHorizontalCoordinate(x - lx)),
            f2(this.getVerticalCoordinate(y - ry)),
            f2(this.getHorizontalCoordinate(x - rx)),
            f2(this.getVerticalCoordinate(y - ly)),
            f2(this.getHorizontalCoordinate(x - rx)),
            f2(this.getVerticalCoordinate(y)),
            'c',
        ].join(' ')
    );
    this.out(
        [
            f2(this.getHorizontalCoordinate(x - rx)),
            f2(this.getVerticalCoordinate(y + ly)),
            f2(this.getHorizontalCoordinate(x - lx)),
            f2(this.getVerticalCoordinate(y + ry)),
            f2(this.getHorizontalCoordinate(x)),
            f2(this.getVerticalCoordinate(y + ry)),
            'c',
        ].join(' ')
    );
    this.out(
        [
            f2(this.getHorizontalCoordinate(x + lx)),
            f2(this.getVerticalCoordinate(y + ry)),
            f2(this.getHorizontalCoordinate(x + rx)),
            f2(this.getVerticalCoordinate(y + ly)),
            f2(this.getHorizontalCoordinate(x + rx)),
            f2(this.getVerticalCoordinate(y)),
            'c',
        ].join(' ')
    );

    this.putStyle(style, patternKey, patternData);
    return this;
};

/**
 * Adds an circle to PDF.
 *
 * @param {number} x Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} r Radius (in units declared at inception of PDF document).
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name circle
 */
DocumentCore.prototype.circle = function(
    this: DocumentCore,
    x,
    y,
    r,
    style,
    patternKey,
    patternData
) {
    if (isNaN(x) || isNaN(y) || isNaN(r) || !this.isValidStyle(style)) {
        throw new Error('Invalid arguments passed to jsPDF.circle');
    }
    return this.ellipse(x, y, r, r, style, patternKey, patternData);
};

/**
 * Draw a line on the current page.
 *
 * @name line
 * @function
 * @instance
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument. default: 'S'
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.line = function(this: DocumentCore, x1, y1, x2, y2, style) {
    style = style || 'S';
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2) || !this.isValidStyle(style)) {
        throw new Error('Invalid arguments passed to jsPDF.line');
    }
    return this.lines([[x2 - x1, y2 - y1]], x1, y1);
};

/**
 * Adds series of curves (straight lines or cubic bezier curves) to canvas, starting at `x`, `y` coordinates.
 * All data points in `lines` are relative to last line origin.
 * `x`, `y` become x1,y1 for first line / curve in the set.
 * For lines you only need to specify [x2, y2] - (ending point) vector against x1, y1 starting point.
 * For bezier curves you need to specify [x2,y2,x3,y3,x4,y4] - vectors to control points 1, 2, ending point. All vectors are against the start of the curve - x1,y1.
 *
 * @example .lines([[2,2],[-2,2],[1,1,2,2,3,3],[2,1]], 212,110, [1,1], 'F', false) // line, line, bezier curve, line
 * @param {Array} lines Array of *vector* shifts as pairs (lines) or sextets (cubic bezier curves).
 * @param {number} x Coordinate (in units declared at inception of PDF document) against left edge of the page.
 * @param {number} y Coordinate (in units declared at inception of PDF document) against upper edge of the page.
 * @param {number} scale (Defaults to [1.0,1.0]) x,y Scaling factor for all vectors. Elements can be any floating number Sub-one makes drawing smaller. Over-one grows the drawing. Negative flips the direction.
 * @param {string} style A string specifying the painting style or null.  Valid styles include: 'S' [default] - stroke, 'F' - fill,  and 'DF' (or 'FD') -  fill then stroke. A null value postpones setting the style so that a shape may be composed using multiple method calls. The last drawing method call used to define the shape should not have a null style argument.
 * @param {boolean} closed If true, the path is closed with a straight line from the end of the last curve to the starting point.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name lines
 */
DocumentCore.prototype.lines = function(
    this: DocumentCore,
    lines,
    x,
    y,
    scale,
    style,
    closed,
    patternKey,
    patternData
) {
    let scalex, scaley, i, l, leg, x2, y2, x3, y3, x4, y4, tmp;

    // Pre-August-2012 the order of arguments was function(x, y, lines, scale, style)
    // in effort to make all calls have similar signature like
    //   function(content, coordinateX, coordinateY , miscellaneous)
    // this method had its args flipped.
    // code below allows backward compatibility with old arg order.
    if (typeof lines === 'number') {
        tmp = y;
        y = x;
        x = lines;
        lines = tmp;
    }

    scale = scale || [1, 1];
    closed = closed || false;

    if (
        isNaN(x) ||
        isNaN(y) ||
        !Array.isArray(lines) ||
        !Array.isArray(scale) ||
        !this.isValidStyle(style) ||
        typeof closed !== 'boolean'
    ) {
        throw new Error('Invalid arguments passed to jsPDF.lines');
    }

    // starting point
    this.out(f3(this.getHorizontalCoordinate(x)) + ' ' + f3(this.getVerticalCoordinate(y)) + ' m');

    scalex = scale[0];
    scaley = scale[1];
    l = lines.length;
    // , x2, y2 // bezier only. In page default measurement "units", *after* scaling
    // , x3, y3 // bezier only. In page default measurement "units", *after* scaling
    // ending point for all, lines and bezier. . In page default measurement "units", *after* scaling
    x4 = x; // last / ending point = starting point for first item.
    y4 = y; // last / ending point = starting point for first item.

    for (i = 0; i < l; i++) {
        leg = lines[i];
        if (leg.length === 2) {
            // simple line
            x4 = leg[0] * scalex + x4; // here last x4 was prior ending point
            y4 = leg[1] * scaley + y4; // here last y4 was prior ending point
            this.out(
                f3(this.getHorizontalCoordinate(x4)) +
                    ' ' +
                    f3(this.getVerticalCoordinate(y4)) +
                    ' l'
            );
        } else {
            // bezier curve
            x2 = leg[0] * scalex + x4; // here last x4 is prior ending point
            y2 = leg[1] * scaley + y4; // here last y4 is prior ending point
            x3 = leg[2] * scalex + x4; // here last x4 is prior ending point
            y3 = leg[3] * scaley + y4; // here last y4 is prior ending point
            x4 = leg[4] * scalex + x4; // here last x4 was prior ending point
            y4 = leg[5] * scaley + y4; // here last y4 was prior ending point
            this.out(
                f3(this.getHorizontalCoordinate(x2)) +
                    ' ' +
                    f3(this.getVerticalCoordinate(y2)) +
                    ' ' +
                    f3(this.getHorizontalCoordinate(x3)) +
                    ' ' +
                    f3(this.getVerticalCoordinate(y3)) +
                    ' ' +
                    f3(this.getHorizontalCoordinate(x4)) +
                    ' ' +
                    f3(this.getVerticalCoordinate(y4)) +
                    ' c'
            );
        }
    }

    if (closed) {
        this.close();
    }

    // stroking / filling / both the path
    this.putStyle(style, patternKey, patternData);
    return this;
};

/**
 * Begin a new subpath by moving the current point to coordinates (x, y). The PDF "m" operator.
 * @param {number} x
 * @param {number} y
 * @name moveTo
 * @function
 * @instance
 * @memberof jsPDF#
 * @returns {jsPDF}
 */
DocumentCore.prototype.moveTo = function(this: DocumentCore, x, y) {
    this.out(hpf(this.scale(x)) + ' ' + hpf(this.scale(y)) + ' m');
    return this;
};

/**
 * Append a straight line segment from the current point to the point (x, y). The PDF "l" operator.
 * @param {number} x
 * @param {number} y
 * @memberof jsPDF#
 * @name lineTo
 * @function
 * @instance
 * @memberof jsPDF#
 * @returns {jsPDF}
 */
DocumentCore.prototype.lineTo = function(this: DocumentCore, x, y) {
    this.out(hpf(this.scale(x)) + ' ' + hpf(this.scale(y)) + ' l');
    return this;
};

/**
 * Append a cubic Bézier curve to the current path. The curve shall extend from the current point to the point
 * (x3, y3), using (x1, y1) and (x2, y2) as Bézier control points. The new current point shall be (x3, x3).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3
 * @param {number} y3
 * @memberof jsPDF#
 * @name curveTo
 * @function
 * @instance
 * @memberof jsPDF#
 * @returns {jsPDF}
 */
DocumentCore.prototype.curveTo = function(this: DocumentCore, x1, y1, x2, y2, x3, y3) {
    this.out(
        [
            hpf(this.scale(x1)),
            hpf(this.scale(y1)),
            hpf(this.scale(x2)),
            hpf(this.scale(y2)),
            hpf(this.scale(x3)),
            hpf(this.scale(y3)),
            'c',
        ].join(' ')
    );
    return this;
};

/**
 * Consumes the current path without any effect. Mainly used in combination with {@link clip} or
 * {@link clipEvenOdd}. The PDF "n" operator.
 * @name discardPath
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.discardPath = function(this: DocumentCore) {
    this.out('n');
    return this;
};

DocumentCore.prototype.setDefaultPathOperation = function(this: DocumentCore, operator) {
    if (this.isValidStyle(operator)) {
        this.defaultPathOperation = operator;
    }
    return this;
};

/**
 * Close the current path. The PDF "h" operator.
 * @name close
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.close = function(this: DocumentCore) {
    this.out('h');
    return this;
};

/**
 * Stroke the path. The PDF "S" operator.
 * @name stroke
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.stroke = function(this: DocumentCore) {
    this.out('S');
    return this;
};

/** @private */
DocumentCore.prototype.fillWithOptionalPattern = function(
    this: DocumentCore,
    style,
    pattern: PatternData
) {
    if (typeof pattern === 'object') {
        this.fillWithPattern(pattern, style);
    } else {
        this.out(style);
    }
};

/**
 * Fill the current path using the nonzero winding number rule. If a pattern is provided, the path will be filled
 * with this pattern, otherwise with the current fill color. Equivalent to the PDF "f" operator.
 * @name fill
 * @function
 * @instance
 * @param {PatternData=} pattern If provided the path will be filled with this pattern
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.fill = function(this: DocumentCore, pattern) {
    this.fillWithOptionalPattern('f', pattern);
    return this;
};

/**
 * Fill the current path using the even-odd rule. The PDF f* operator.
 * @see API.fill
 * @name fillEvenOdd
 * @function
 * @instance
 * @param {PatternData=} pattern If provided the path will be filled with this pattern
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.fillEvenOdd = function(this: DocumentCore, pattern: PatternData) {
    this.fillWithOptionalPattern('f*', pattern);
    return this;
};

/**
 * Fill using the nonzero winding number rule and then stroke the current Path. The PDF "B" operator.
 * @see API.fill
 * @name fillStroke
 * @function
 * @instance
 * @param {PatternData=} pattern If provided the path will be stroked with this pattern
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.fillStroke = function(this: DocumentCore, pattern: PatternData) {
    this.fillWithOptionalPattern('B', pattern);
    return this;
};

/**
 * Fill using the even-odd rule and then stroke the current Path. The PDF "B" operator.
 * @see API.fill
 * @name fillStrokeEvenOdd
 * @function
 * @instance
 * @param {PatternData=} pattern If provided the path will be fill-stroked with this pattern
 * @returns {jsPDF}
 * @memberof jsPDF#
 */
DocumentCore.prototype.fillStrokeEvenOdd = function(this: DocumentCore, pattern: PatternData) {
    this.fillWithOptionalPattern('B*', pattern);
    return this;
};

// PDF supports these path painting and clip path operators:
//
// S - stroke
// s - close/stroke
// f (F) - fill non-zero
// f* - fill evenodd
// B - fill stroke nonzero
// B* - fill stroke evenodd
// b - close fill stroke nonzero
// b* - close fill stroke evenodd
// n - nothing (consume path)
// W - clip nonzero
// W* - clip evenodd
//
// In order to keep the API small, we omit the close-and-fill/stroke operators and provide a separate close()
// method.
/**
 *
 * @name clip
 * @function
 * @instance
 * @param {string} rule Only possible value is 'evenodd'
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @description All .clip() after calling drawing ops with a style argument of null.
 */
DocumentCore.prototype.clip = function(this: DocumentCore, rule?: 'evenodd') {
    // Call .clip() after calling drawing ops with a style argument of null
    // W is the PDF clipping op
    if ('evenodd' === rule) {
        this.out('W*');
    } else {
        this.out('W');
    }
    return this;
};

/**
 * @name clipEvenOdd
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @description Modify the current clip path by intersecting it with the current path using the even-odd rule. Note
 * that this will NOT consume the current path. In order to only use this path for clipping call
 * {@link API.discardPath} afterwards.
 */
DocumentCore.prototype.clipEvenOdd = function(this: DocumentCore) {
    return this.clip('evenodd');
};

/**
 * This fixes the previous function clip(). Perhaps the 'stroke path' hack was due to the missing 'n' instruction?
 * We introduce the fixed version so as to not break API.
 * @param fillRule
 * @deprecated
 * @ignore
 */
DocumentCore.prototype.clipFixed = function(this: DocumentCore, rule?: 'evenodd') {
    return this.clip(rule);
};

/**
 * Sets the dash pattern for upcoming lines.
 *
 * To reset the settings simply call the method without any parameters.
 * @param {Array<number>} dashArray An array containing 0-2 numbers. The first number sets the length of the
 * dashes, the second number the length of the gaps. If the second number is missing, the gaps are considered
 * to be as long as the dashes. An empty array means solid, unbroken lines.
 * @param {number} dashPhase The phase lines start with.
 * @function
 * @instance
 * @returns {jsPDF}
 * @memberof jsPDF#
 * @name setLineDashPattern
 */
DocumentCore.prototype.setLineDashPattern = function(
    this: DocumentCore,
    dashArray: number[],
    dashPhase: number
) {
    dashArray = dashArray || [];
    dashPhase = dashPhase || 0;

    if (isNaN(dashPhase) || !Array.isArray(dashArray)) {
        throw new Error('Invalid arguments passed to jsPDF.setLineDash');
    }

    const dashArrayStr: string = dashArray
        .map((x) => {
            return f3(x * this.scaleFactor);
        })
        .join(' ');
    const dashPhaseStr: string = f3(dashPhase * this.scaleFactor);

    this.out('[' + dashArrayStr + '] ' + dashPhaseStr + ' d');
    return this;
};

/**
 * Begins a new tiling pattern. All subsequent render calls are drawn to this pattern until {@link API.endTilingPattern}
 * gets called. Only available in "advanced" API mode.
 * @param {API.Pattern} pattern
 * @methodOf jsPDF#
 * @name beginTilingPattern
 */
DocumentCore.prototype.beginTilingPattern = function(this: DocumentCore, pattern: TilingPattern) {
    this.beginNewRenderTarget(
        pattern.boundingBox[0],
        pattern.boundingBox[1],
        pattern.boundingBox[2] - pattern.boundingBox[0],
        pattern.boundingBox[3] - pattern.boundingBox[1],
        pattern.matrix
    );
};

/**
 * Ends a tiling pattern and sets the render target to the one active before {@link API.beginTilingPattern} has been called.
 *
 * Only available in "advanced" API mode.
 *
 * @param {string} key A unique key that is used to reference this pattern at later use.
 * @param {API.Pattern} pattern The pattern to end.
 * @methodOf jsPDF#
 * @name endTilingPattern
 */
DocumentCore.prototype.endTilingPattern = function(
    this: DocumentCore,
    key: string,
    pattern: TilingPattern
) {
    // retrieve the stream
    pattern.stream = this.pages[this.currentPage].join('\n');

    this.addPattern(key, pattern);

    this.events.publish('endTilingPattern', pattern);

    // restore state from stack
    this.restoreRenderTarget();
};

/**
 * Adds a new {@link ShadingPattern} for later use. Only available in "advanced" API mode.
 * @param {String} key
 * @param {Pattern} pattern
 * @function
 * @returns {jsPDF}
 * @methodOf jsPDF#
 * @name addPattern
 */
DocumentCore.prototype.addShadingPattern = function(
    this: DocumentCore,
    key: string,
    pattern: ShadingPattern
) {
    this.addPattern(key, pattern);
    return this;
};
