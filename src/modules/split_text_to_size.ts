/** @license
 * MIT license.
 * Copyright (c) 2012 Willow Systems Corporation, willow-systems.com
 *               2014 Diego Casorran, https://github.com/diegocr
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * ====================================================================
 */

import DocumentCore from '../DocumentCore';

import './font';

declare module '../DocumentCore' {
    interface DocumentCore {
        getCharWidthsArray(text: string, options?: any): any[];
        getStringUnitWidth(text: string, options?: any): number;
        splitTextToSize(text: string, maxlen: number, options?: any): any;
        getTextWidth(text: string): number;
    }
}

/**
 * Returns an array of length matching length of the 'word' string, with each
 * cell occupied by the width of the char in that position.
 *
 * @name getCharWidthsArray
 * @function
 * @param {string} text
 * @param {Object} options
 * @returns {Array}
 */
DocumentCore.prototype.getCharWidthsArray = function(this: DocumentCore, text, options) {
    options = options || {};

    const activeFont = options.font || this.getFont();
    const fontSize = options.fontSize || this.getFontSize();
    const charSpace = options.charSpace || this.getCharSpace();

    const widths = options.widths ? options.widths : activeFont.metadata.Unicode.widths;
    const widthsFractionOf = widths.fof ? widths.fof : 1;
    const kerning = options.kerning ? options.kerning : activeFont.metadata.Unicode.kerning;
    const kerningFractionOf = kerning.fof ? kerning.fof : 1;
    const doKerning = options.doKerning === false ? false : true;
    let kerningValue = 0;

    let i;
    const length = text.length;
    let char_code;
    let prior_char_code = 0; // for kerning
    const default_char_width = widths[0] || widthsFractionOf;
    const output = [];

    for (i = 0; i < length; i++) {
        char_code = text.charCodeAt(i);

        if (typeof activeFont.metadata.widthOfString === 'function') {
            output.push(
                (activeFont.metadata.widthOfGlyph(activeFont.metadata.characterToGlyph(char_code)) +
                    charSpace * (1000 / fontSize) || 0) / 1000
            );
        } else {
            if (
                doKerning &&
                typeof kerning[char_code] === 'object' &&
                !isNaN(parseInt(kerning[char_code][prior_char_code], 10))
            ) {
                kerningValue = kerning[char_code][prior_char_code] / kerningFractionOf;
            }
            output.push(
                (widths[char_code] || default_char_width) / widthsFractionOf + kerningValue
            );
        }
        prior_char_code = char_code;
    }

    return output;
};

/**
 * Returns a widths of string in a given font, if the font size is set as 1 point.
 *
 * In other words, this is "proportional" value. For 1 unit of font size, the length
 * of the string will be that much.
 *
 * Multiply by font size to get actual width in *points*
 * Then divide by 72 to get inches or divide by (72/25.6) to get 'mm' etc.
 *
 * @name getStringUnitWidth
 * @public
 * @function
 * @param {string} text
 * @param {string} options
 * @returns {number} result
 */
DocumentCore.prototype.getStringUnitWidth = function(this: DocumentCore, text, options) {
    options = options || {};

    const fontSize = options.fontSize || this.getFontSize();
    const font = options.font || this.getFont();
    const charSpace = options.charSpace || this.getCharSpace();
    let result = 0;

    // TODO(roman) process Arabic dependency?
    /*
    if ('processArabic' in DocumentCore.prototype) {
        text = DocumentCore.prototype.processArabic.call(this, text);
    }
    */

    if (typeof font.metadata.widthOfString === 'function') {
        result = font.metadata.widthOfString(text, fontSize, charSpace) / fontSize;
    } else {
        result = this.getCharWidthsArray(text, options).reduce(function(pv, cv) {
            return pv + cv;
        }, 0);
    }
    return result;
};

/**
 * @name getTextWidth
 * @function
 * @param {string} text
 * @returns {number} txtWidth
 */
DocumentCore.prototype.getTextWidth = function(this: DocumentCore, text) {
    const fontSize = this.getFontSize();
    const txtWidth = (this.getStringUnitWidth(text) * fontSize) / this.scaleFactor;
    return txtWidth;
};

/**
returns array of lines
*/
const splitLongWord = function(word, widths_array, firstLineMaxLen, maxLen) {
    const answer = [];

    // 1st, chop off the piece that can fit on the hanging line.
    let i = 0,
        l = word.length,
        workingLen = 0;
    while (i !== l && workingLen + widths_array[i] < firstLineMaxLen) {
        workingLen += widths_array[i];
        i++;
    }
    // this is first line.
    answer.push(word.slice(0, i));

    // 2nd. Split the rest into maxLen pieces.
    let startOfLine = i;
    workingLen = 0;
    while (i !== l) {
        if (workingLen + widths_array[i] > maxLen) {
            answer.push(word.slice(startOfLine, i));
            workingLen = 0;
            startOfLine = i;
        }
        workingLen += widths_array[i];
        i++;
    }
    if (startOfLine !== i) {
        answer.push(word.slice(startOfLine, i));
    }

    return answer;
};

// Note, all sizing inputs for this function must be in "font measurement units"
// By default, for PDF, it's "point".
function splitParagraphIntoLines(this: DocumentCore, text, maxlen, options) {
    // at this time works only on Western scripts, ones with space char
    // separating the words. Feel free to expand.

    if (!options) {
        options = {};
    }

    let line = [],
        lines = [line],
        line_length = options.textIndent || 0,
        separator_length = 0,
        current_word_length = 0,
        word,
        widths_array,
        words = text.split(' '),
        spaceCharWidth = this.getCharWidthsArray.apply(this, [' ', options])[0],
        i,
        l,
        tmp,
        lineIndent;

    if (options.lineIndent === -1) {
        lineIndent = words[0].length + 2;
    } else {
        lineIndent = options.lineIndent || 0;
    }
    let pad = '';
    if (lineIndent) {
        pad = Array(lineIndent).join(' ');
        let wrds = [];
        words.map(function(wrd) {
            wrd = wrd.split(/\s*\n/);
            if (wrd.length > 1) {
                wrds = wrds.concat(
                    wrd.map(function(wrd, idx) {
                        return (idx && wrd.length ? '\n' : '') + wrd;
                    })
                );
            } else {
                wrds.push(wrd[0]);
            }
        });
        words = wrds;
        lineIndent = this.getStringUnitWidth.apply(this, [pad, options]);
    }

    for (i = 0, l = words.length; i < l; i++) {
        let force = 0;

        word = words[i];
        if (lineIndent && word[0] == '\n') {
            word = word.substr(1);
            force = 1;
        }
        widths_array = this.getCharWidthsArray.apply(this, [word, options]);
        current_word_length = widths_array.reduce(function(pv, cv) {
            return pv + cv;
        }, 0);

        if (line_length + separator_length + current_word_length > maxlen || force) {
            if (current_word_length > maxlen) {
                // this happens when you have space-less long URLs for example.
                // we just chop these to size. We do NOT insert hiphens
                tmp = splitLongWord.apply(this, [
                    word,
                    widths_array,
                    maxlen - (line_length + separator_length),
                    maxlen,
                ]);
                // first line we add to existing line object
                line.push(tmp.shift()); // it's ok to have extra space indicator there
                // last line we make into new line object
                line = [tmp.pop()];
                // lines in the middle we apped to lines object as whole lines
                while (tmp.length) {
                    lines.push([tmp.shift()]); // single fragment occupies whole line
                }
                current_word_length = widths_array
                    .slice(word.length - (line[0] ? line[0].length : 0))
                    .reduce(function(pv, cv) {
                        return pv + cv;
                    }, 0);
            } else {
                // just put it on a new line
                line = [word];
            }

            // now we attach new line to lines
            lines.push(line);
            line_length = current_word_length + lineIndent;
            separator_length = spaceCharWidth;
        } else {
            line.push(word);

            line_length += separator_length + current_word_length;
            separator_length = spaceCharWidth;
        }
    }

    let postProcess;
    if (lineIndent) {
        postProcess = function(ln, idx) {
            return (idx ? pad : '') + ln.join(' ');
        };
    } else {
        postProcess = function(ln) {
            return ln.join(' ');
        };
    }

    return lines.map(postProcess);
}

/**
 * Splits a given string into an array of strings. Uses 'size' value
 * (in measurement units declared as default for the jsPDF instance)
 * and the font's "widths" and "Kerning" tables, where available, to
 * determine display length of a given string for a given font.
 *
 * We use character's 100% of unit size (height) as width when Width
 * table or other default width is not available.
 *
 * @name splitTextToSize
 * @public
 * @function
 * @param {string} text Unencoded, regular JavaScript (Unicode, UTF-16 / UCS-2) string.
 * @param {number} size Nominal number, measured in units default to this instance of jsPDF.
 * @param {Object} options Optional flags needed for chopper to do the right thing.
 * @returns {Array} array Array with strings chopped to size.
 */
DocumentCore.prototype.splitTextToSize = function(this: DocumentCore, text, maxlen, options?) {
    options = options || {};

    const fsize = options.fontSize || this.getFontSize(),
        newOptions = function(this: DocumentCore, options) {
            const widths = {
                    0: 1,
                },
                kerning = {};

            if (!options.widths || !options.kerning) {
                const f = this.getFont(options.fontName, options.fontStyle),
                    encoding = 'Unicode';
                // NOT UTF8, NOT UTF16BE/LE, NOT UCS2BE/LE
                // Actual JavaScript-native String's 16bit char codes used.
                // no multi-byte logic here

                if (f.metadata[encoding]) {
                    return {
                        widths: f.metadata[encoding].widths || widths,
                        kerning: f.metadata[encoding].kerning || kerning,
                    };
                } else {
                    return {
                        font: f.metadata,
                        fontSize: this.getFontSize(),
                        charSpace: this.getCharSpace(),
                    };
                }
            } else {
                return {
                    widths: options.widths,
                    kerning: options.kerning,
                };
            }
        }.call(this, options);

    // first we split on end-of-line chars
    let paragraphs;
    if (Array.isArray(text)) {
        paragraphs = text;
    } else {
        paragraphs = text.split(/\r?\n/);
    }

    // now we convert size (max length of line) into "font size units"
    // at present time, the "font size unit" is always 'point'
    // 'proportional' means, "in proportion to font size"
    const fontUnit_maxLen = (1.0 * this.scaleFactor * maxlen) / fsize;
    // at this time, fsize is always in "points" regardless of the default measurement unit of the doc.
    // this may change in the future?
    // until then, proportional_maxlen is likely to be in 'points'

    // If first line is to be indented (shorter or longer) than maxLen
    // we indicate that by using CSS-style "text-indent" option.
    // here it's in font units too (which is likely 'points')
    // it can be negative (which makes the first line longer than maxLen)
    newOptions.textIndent = options.textIndent
        ? (options.textIndent * 1.0 * this.scaleFactor) / fsize
        : 0;
    newOptions.lineIndent = options.lineIndent;

    let i,
        l,
        output = [];
    for (i = 0, l = paragraphs.length; i < l; i++) {
        output = output.concat(
            splitParagraphIntoLines.apply(this, [paragraphs[i], fontUnit_maxLen, newOptions])
        );
    }

    return output;
};
