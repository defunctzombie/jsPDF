// .text interface for Documents

import { decodeColorString, encodeColorString } from '../color';
import DocumentCore from '../DocumentCore';
import Matrix from '../Matrix';
import { f2, f3 } from '../rounding';

import './split_text_to_size';
import './standard_fonts';

declare module '../DocumentCore' {
    interface DocumentCore {
        text(
            text: any,
            x: number,
            y: number,
            options?: TextOptions,
            transform?: number | Matrix
        ): void;
        setTextColor(ch1?, ch2?, ch3?, ch4?): void;
        getTextColor(): string;
    }
}

interface TextOptions {
    align?: 'left' | 'center' | 'right' | 'justify';
    angle?: number;
    baseline?: 'alphabetic' | 'ideographic' | 'bottom' | 'top' | 'middle' | 'hanging';
    flags?: {
        noBOM: boolean;
        autoencode: boolean;
    };
    rotationDirection?: 0 | 1;
    charSpace?: number;
    lineHeightFactor?: number;
    maxWidth?: number;
    renderingMode?:
        | 'fill'
        | 'stroke'
        | 'fillThenStroke'
        | 'invisible'
        | 'fillAndAddForClipping'
        | 'strokeAndAddPathForClipping'
        | 'fillThenStrokeAndAddToPathForClipping'
        | 'addToPathForClipping';
    isInputVisual?: boolean;
    isOutputVisual?: boolean;
    isInputRtl?: boolean;
    isOutputRtl?: boolean;
    isSymmetricSwapping?: boolean;
    stroke?: boolean;
    R2L?: boolean;
}

/**
 * Sets the text color for upcoming elements.
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
 * @name setTextColor
 */
DocumentCore.prototype.setTextColor = function(this: DocumentCore, ch1?, ch2?, ch3?, ch4?) {
    const options = {
        ch1,
        ch2,
        ch3,
        ch4,
        pdfColorType: 'text',
        precision: 3,
    };
    this.textColor = encodeColorString(options);
    return this;
};

/**
 * Gets the text color for upcoming elements.
 *
 * @function
 * @instance
 * @returns {string} colorAsHex
 * @memberof jsPDF#
 * @name getTextColor
 */
DocumentCore.prototype.getTextColor = function(this: DocumentCore) {
    return decodeColorString(this.textColor);
};

// TODO(roman) change text from any type to string or array of strings
DocumentCore.prototype.text = function(
    this: DocumentCore,
    text: any,
    x: number,
    y: number,
    options?: TextOptions,
    transform?: number | Matrix
): DocumentCore {
    /*
     * Inserts something like this into PDF
     *   BT
     *    /F1 16 Tf  % Font name + size
     *    16 TL % How many units down for next line in multiline text
     *    0 g % color
     *    28.35 813.54 Td % position
     *    (line one) Tj
     *    T* (line two) Tj
     *    T* (line three) Tj
     *   ET
     */
    options = options || {};
    let payload, da, angle, align, charSpace, maxWidth, flags;

    let transformationMatrix;

    if (arguments[3] instanceof Matrix === false) {
        flags = arguments[3];
        angle = arguments[4];
        align = arguments[5];

        if (typeof flags !== 'object' || flags === null) {
            if (typeof angle === 'string') {
                align = angle;
                angle = null;
            }
            if (typeof flags === 'string') {
                align = flags;
                flags = null;
            }
            if (typeof flags === 'number') {
                angle = flags;
                flags = null;
            }
            options = {
                flags,
                angle,
                align,
            };
        }
    } else {
        transformationMatrix = transform;
    }

    if (isNaN(x) || isNaN(y) || typeof text === 'undefined' || text === null) {
        throw new Error('Invalid arguments passed to jsPDF.text');
    }

    if (text.length === 0) {
        return this;
    }

    let xtra = '';
    let isHex = false;
    const lineHeight = options.lineHeightFactor || this.getLineHeightFactor();
    const scaleFactor = this.scaleFactor;

    const ESC = (str) => {
        str = str.split('\t').join(Array(9).join(' '));
        return this.pdfEscape(str, flags);
    };

    function transformTextToSpecialArray(text) {
        // we don't want to destroy original text array, so cloning it
        const sa = text.concat();
        const da = [];
        let len = sa.length;
        let curDa;
        // we do array.join('text that must not be PDFescaped")
        // thus, pdfEscape each component separately
        while (len--) {
            curDa = sa.shift();
            if (typeof curDa === 'string') {
                da.push(curDa);
            } else {
                if (
                    Array.isArray(text) &&
                    (curDa.length === 1 || (curDa[1] === undefined && curDa[2] === undefined))
                ) {
                    da.push(curDa[0]);
                } else {
                    da.push([curDa[0], curDa[1], curDa[2]]);
                }
            }
        }
        return da;
    }

    function processTextByFunction(text, processingFunction) {
        let result;
        if (typeof text === 'string') {
            result = processingFunction(text)[0];
        } else if (Array.isArray(text)) {
            // we don't want to destroy original text array, so cloning it
            const sa = text.concat();
            const da = [];
            let len = sa.length;
            let curDa;
            let tmpResult;
            // we do array.join('text that must not be PDFescaped")
            // thus, pdfEscape each component separately
            while (len--) {
                curDa = sa.shift();
                if (typeof curDa === 'string') {
                    da.push(processingFunction(curDa)[0]);
                } else if (Array.isArray(curDa) && typeof curDa[0] === 'string') {
                    tmpResult = processingFunction(curDa[0], curDa[1], curDa[2]);
                    da.push([tmpResult[0], tmpResult[1], tmpResult[2]]);
                }
            }
            result = da;
        }
        return result;
    }

    let len;

    // Check if text is of type String
    let textIsOfTypeString = false;
    let tmpTextIsOfTypeString = true;

    if (typeof text === 'string') {
        textIsOfTypeString = true;
    } else if (Array.isArray(text)) {
        // we don't want to destroy original text array, so cloning it
        const sa = text.concat();
        da = [];
        len = sa.length;
        let curDa;
        // we do array.join('text that must not be PDFescaped")
        // thus, pdfEscape each component separately
        while (len--) {
            curDa = sa.shift();
            if (
                typeof curDa !== 'string' ||
                (Array.isArray(curDa) && typeof curDa[0] !== 'string')
            ) {
                tmpTextIsOfTypeString = false;
            }
        }
        textIsOfTypeString = tmpTextIsOfTypeString;
    }
    if (textIsOfTypeString === false) {
        throw new Error('Type of text must be string or Array. "' + text + '" is not recognized.');
    }

    // If there are any newlines in text, we assume
    // the user wanted to print multiple lines, so break the
    // text up into an array. If the text is already an array,
    // we assume the user knows what they are doing.
    // Convert text into an array anyway to simplify
    // later code.

    if (typeof text === 'string') {
        if (text.match(/[\r?\n]/)) {
            text = text.split(/\r\n|\r|\n/g);
        } else {
            text = [text];
        }
    }

    // baseline
    const height = this.getFontSize() / this.scaleFactor;
    const descent = height * (this.getLineHeightFactor() - 1);
    switch (options.baseline) {
        case 'bottom':
            y -= descent;
            break;
        case 'top':
            y += height - descent;
            break;
        case 'hanging':
            y += height - 2 * descent;
            break;
        case 'middle':
            y += height / 2 - descent;
            break;
        case 'ideographic':
        case 'alphabetic':
        default:
            // do nothing, everything is fine
            break;
    }

    // multiline
    maxWidth = options.maxWidth || 0;

    if (maxWidth > 0) {
        if (typeof text === 'string') {
            text = this.splitTextToSize(text, maxWidth);
        } else if (Object.prototype.toString.call(text) === '[object Array]') {
            text = this.splitTextToSize(text.join(' '), maxWidth);
        }
    }

    // creating Payload-Object to make text byRef
    payload = {
        text,
        x,
        y,
        options,
        mutex: {
            pdfEscape: this.pdfEscape,
            activeFontKey: this.activeFontKey,
            fonts: this.fonts,
            activeFontSize: this.getFontSize(),
        },
    };
    this.events.publish('preProcessText', payload);

    text = payload.text;
    options = payload.options;

    // angle
    angle = options.angle;

    if (transformationMatrix instanceof Matrix === false && angle && typeof angle === 'number') {
        angle *= Math.PI / 180;

        if (options.rotationDirection === 0) {
            angle = -angle;
        }

        const c = Math.cos(angle);
        const s = Math.sin(angle);
        transformationMatrix = new Matrix(f2(c), f2(s), f2(s * -1), f2(c), 0, 0, this.precision);
    } else if (angle && angle instanceof Matrix) {
        transformationMatrix = angle;
    }

    // charSpace

    charSpace = options.charSpace || this.activeCharSpace;

    if (typeof charSpace !== 'undefined') {
        xtra += f3(charSpace * scaleFactor) + ' Tc\n';
        this.setCharSpace(this.getCharSpace() || 0);
    }

    // renderingMode
    let renderingMode = -1;
    const parmRenderingMode: any = options.renderingMode || options.stroke;
    const pageContext = this.getCurrentPageInfo().pageContext;

    switch (parmRenderingMode) {
        case 0:
        case false:
        case 'fill':
            renderingMode = 0;
            break;
        case 1:
        case true:
        case 'stroke':
            renderingMode = 1;
            break;
        case 2:
        case 'fillThenStroke':
            renderingMode = 2;
            break;
        case 3:
        case 'invisible':
            renderingMode = 3;
            break;
        case 4:
        case 'fillAndAddForClipping':
            renderingMode = 4;
            break;
        case 5:
        case 'strokeAndAddPathForClipping':
            renderingMode = 5;
            break;
        case 6:
        case 'fillThenStrokeAndAddToPathForClipping':
            renderingMode = 6;
            break;
        case 7:
        case 'addToPathForClipping':
            renderingMode = 7;
            break;
    }

    const usedRenderingMode =
        typeof pageContext.usedRenderingMode !== 'undefined' ? pageContext.usedRenderingMode : -1;

    // if the coder wrote it explicitly to use a specific
    // renderingMode, then use it
    if (renderingMode !== -1) {
        xtra += renderingMode + ' Tr\n';
        // otherwise check if we used the rendering Mode already
        // if so then set the rendering Mode...
    } else if (usedRenderingMode !== -1) {
        xtra += '0 Tr\n';
    }

    if (renderingMode !== -1) {
        pageContext.usedRenderingMode = renderingMode;
    }

    // align
    align = options.align || 'left';
    const leading = this.activeFontSize * lineHeight;
    const pageWidth = this.getPageWidth();
    const activeFont = this.fonts[this.activeFontKey];
    charSpace = options.charSpace || this.activeCharSpace;
    maxWidth = options.maxWidth || 0;

    let lineWidths;
    flags = {};
    const wordSpacingPerLine = [];

    if (Object.prototype.toString.call(text) === '[object Array]') {
        da = transformTextToSpecialArray(text);
        let newY;
        if (align !== 'left') {
            lineWidths = da.map((v) => {
                return (
                    (this.getStringUnitWidth(v, {
                        font: activeFont,
                        charSpace,
                        fontSize: this.activeFontSize,
                        doKerning: false,
                    }) *
                        this.activeFontSize) /
                    scaleFactor
                );
            });
        }
        // The first line uses the "main" Td setting,
        // and the subsequent lines are offset by the
        // previous line's x coordinate.
        let prevWidth = 0;
        let newX;
        if (align === 'right') {
            // The passed in x coordinate defines the
            // rightmost point of the text.
            x -= lineWidths[0];
            text = [];
            len = da.length;
            for (let i = 0; i < len; i++) {
                if (i === 0) {
                    newX = this.getHorizontalCoordinate(x);
                    newY = this.getVerticalCoordinate(y);
                } else {
                    newX = (prevWidth - lineWidths[i]) * scaleFactor;
                    newY = -leading;
                }
                text.push([da[i], newX, newY]);
                prevWidth = lineWidths[i];
            }
        } else if (align === 'center') {
            // The passed in x coordinate defines
            // the center point.
            x -= lineWidths[0] / 2;
            text = [];
            len = da.length;
            for (let j = 0; j < len; j++) {
                if (j === 0) {
                    newX = this.getHorizontalCoordinate(x);
                    newY = this.getVerticalCoordinate(y);
                } else {
                    newX = ((prevWidth - lineWidths[j]) / 2) * scaleFactor;
                    newY = -leading;
                }
                text.push([da[j], newX, newY]);
                prevWidth = lineWidths[j];
            }
        } else if (align === 'left') {
            text = [];
            len = da.length;
            for (let h = 0; h < len; h++) {
                text.push(da[h]);
            }
        } else if (align === 'justify') {
            text = [];
            len = da.length;
            maxWidth = maxWidth !== 0 ? maxWidth : pageWidth;

            for (let l = 0; l < len; l++) {
                newY = l === 0 ? this.getVerticalCoordinate(y) : -leading;
                newX = l === 0 ? this.getHorizontalCoordinate(x) : 0;
                if (l < len - 1) {
                    wordSpacingPerLine.push(
                        f2(
                            ((maxWidth - lineWidths[l]) / (da[l].split(' ').length - 1)) *
                                scaleFactor
                        )
                    );
                }
                text.push([da[l], newX, newY]);
            }
        } else {
            throw new Error(
                'Unrecognized alignment option, use "left", "center", "right" or "justify".'
            );
        }
    }

    // R2L
    const doReversing = options.R2L || this.R2L;
    if (doReversing === true) {
        text = processTextByFunction(text, function(text, posX, posY) {
            return [
                text
                    .split('')
                    .reverse()
                    .join(''),
                posX,
                posY,
            ];
        });
    }

    // creating Payload-Object to make text byRef
    payload = {
        text,
        x,
        y,
        options,
        mutex: {
            pdfEscape: this.pdfEscape,
            activeFontKey: this.activeFontKey,
            fonts: this.fonts,
            activeFontSize: this.activeFontSize,
        },
    };
    this.events.publish('postProcessText', payload);

    text = payload.text;
    isHex = payload.mutex.isHex || false;

    // Escaping
    const activeFontEncoding = this.fonts[this.activeFontKey].encoding;

    if (activeFontEncoding === 'WinAnsiEncoding' || activeFontEncoding === 'StandardEncoding') {
        text = processTextByFunction(text, function(text, posX, posY) {
            return [ESC(text), posX, posY];
        });
    }

    da = transformTextToSpecialArray(text);

    text = [];
    const STRING = 0;
    const ARRAY = 1;
    const variant = Array.isArray(da[0]) ? ARRAY : STRING;
    let posX;
    let posY;
    let content;
    let wordSpacing = '';

    const generatePosition = function(parmPosX, parmPosY, parmTransformationMatrix?: Matrix) {
        let position = '';
        if (parmTransformationMatrix instanceof Matrix) {
            parmTransformationMatrix.tx = parseFloat(f2(parmPosX));
            parmTransformationMatrix.ty = parseFloat(f2(parmPosY));
            position = parmTransformationMatrix.join(' ') + ' Tm\n';
        } else {
            position = f2(parmPosX) + ' ' + f2(parmPosY) + ' Td\n';
        }
        return position;
    };

    for (let lineIndex = 0; lineIndex < da.length; lineIndex++) {
        wordSpacing = '';

        switch (variant) {
            case ARRAY:
                content = (isHex ? '<' : '(') + da[lineIndex][0] + (isHex ? '>' : ')');
                posX = parseFloat(da[lineIndex][1]);
                posY = parseFloat(da[lineIndex][2]);
                break;
            case STRING:
                content = (isHex ? '<' : '(') + da[lineIndex] + (isHex ? '>' : ')');
                posX = this.getHorizontalCoordinate(x);
                posY = this.getVerticalCoordinate(y);
                break;
        }

        if (
            typeof wordSpacingPerLine !== 'undefined' &&
            typeof wordSpacingPerLine[lineIndex] !== 'undefined'
        ) {
            wordSpacing = wordSpacingPerLine[lineIndex] + ' Tw\n';
        }

        if (lineIndex === 0) {
            text.push(wordSpacing + generatePosition(posX, posY, transformationMatrix) + content);
        } else if (variant === STRING) {
            text.push(wordSpacing + content);
        } else if (variant === ARRAY) {
            text.push(wordSpacing + generatePosition(posX, posY) + content);
        }
    }

    text = variant === STRING ? text.join(' Tj\nT* ') : text.join(' Tj\n');
    text += ' Tj\n';

    let result = 'BT\n/';
    result += this.activeFontKey + ' ' + this.activeFontSize + ' Tf\n'; // font face, style, size
    result += f2(this.activeFontSize * lineHeight) + ' TL\n'; // line spacing
    result += this.textColor + '\n';
    result += xtra;
    result += text;
    result += 'ET';

    this.out(result);
    this.usedFonts[this.activeFontKey] = true;
    return this;
};
