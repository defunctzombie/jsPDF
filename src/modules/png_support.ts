/**
 * @license
 *
 * Copyright (c) 2014 James Robb, https://github.com/jamesbrobb
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

import PNG = require('../libs/png');

import * as adler32cs from '../libs/adler32cs';
import * as Deflater from '../libs/Deflater';

import { arrayBufferToBinaryString, isArrayBuffer, isArrayBufferView } from '../libs/array_buffer';

// TODO(roman) move to shared enum
const ImageCompression = {
    NONE: 'NONE',
    FAST: 'FAST',
    MEDIUM: 'MEDIUM',
    SLOW: 'SLOW',
};

// TODO(roman) move to shared
const Decode = {
    DCT_DECODE: 'DCTDecode',
    FLATE_DECODE: 'FlateDecode',
    LZW_DECODE: 'LZWDecode',
    JPX_DECODE: 'JPXDecode',
    JBIG2_DECODE: 'JBIG2Decode',
    ASCII85_DECODE: 'ASCII85Decode',
    ASCII_HEX_DECODE: 'ASCIIHexDecode',
    RUN_LENGTH_DECODE: 'RunLengthDecode',
    CCITT_FAX_DECODE: 'CCITTFaxDecode',
};

/**
 * COLOR SPACES
 */
const color_spaces = {
    DEVICE_RGB: 'DeviceRGB',
    DEVICE_GRAY: 'DeviceGray',
    DEVICE_CMYK: 'DeviceCMYK',
    CAL_GREY: 'CalGray',
    CAL_RGB: 'CalRGB',
    LAB: 'Lab',
    ICC_BASED: 'ICCBased',
    INDEXED: 'Indexed',
    PATTERN: 'Pattern',
    SEPARATION: 'Separation',
    DEVICE_N: 'DeviceN',
};

/*
 * @see http://www.w3.org/TR/PNG-Chunks.html
 *
 Color    Allowed      Interpretation
 Type     Bit Depths

   0       1,2,4,8,16  Each pixel is a grayscale sample.

   2       8,16        Each pixel is an R,G,B triple.

   3       1,2,4,8     Each pixel is a palette index;
                       a PLTE chunk must appear.

   4       8,16        Each pixel is a grayscale sample,
                       followed by an alpha sample.

   6       8,16        Each pixel is an R,G,B triple,
                       followed by an alpha sample.
*/

/*
 * PNG filter method types
 *
 * @see http://www.w3.org/TR/PNG-Filters.html
 * @see http://www.libpng.org/pub/png/book/chapter09.html
 *
 * This is what the value 'Predictor' in decode params relates to
 *
 * 15 is "optimal prediction", which means the prediction algorithm can change from line to line.
 * In that case, you actually have to read the first byte off each line for the prediction algorthim (which should be 0-4, corresponding to PDF 10-14) and select the appropriate unprediction algorithm based on that byte.
 *
   0       None
   1       Sub
   2       Up
   3       Average
   4       Paeth
 */

function compressBytes(bytes, lineLength, colorsPerPixel, compression?) {
    let level = 5;
    let filter_method = filterUp;

    switch (compression) {
        case ImageCompression.FAST:
            level = 3;
            filter_method = filterSub;
            break;

        case ImageCompression.MEDIUM:
            level = 6;
            filter_method = filterAverage;
            break;

        case ImageCompression.SLOW:
            level = 9;
            filter_method = filterPaeth;
            break;
    }

    bytes = applyPngFilterMethod(bytes, lineLength, colorsPerPixel, filter_method);

    const header = new Uint8Array(createZlibHeader(level));
    const checksum = adler32cs.fromBuffer(bytes.buffer);

    const deflate = new Deflater(level);
    const a = deflate.append(bytes);
    const cBytes = deflate.flush();

    let len = header.length + a.length + cBytes.length;

    const cmpd = new Uint8Array(len + 4);
    cmpd.set(header);
    cmpd.set(a, header.length);
    cmpd.set(cBytes, header.length + a.length);

    cmpd[len++] = (checksum >>> 24) & 0xff;
    cmpd[len++] = (checksum >>> 16) & 0xff;
    cmpd[len++] = (checksum >>> 8) & 0xff;
    cmpd[len++] = checksum & 0xff;

    return arrayBufferToBinaryString(cmpd);
}

const createZlibHeader = function(level) {
    /*
     * @see http://www.ietf.org/rfc/rfc1950.txt for zlib header
     */
    let hdr = 30720;
    const flevel = Math.min(3, ((level - 1) & 0xff) >> 1);

    hdr |= flevel << 6;
    hdr |= 0; // FDICT
    hdr += 31 - (hdr % 31);

    return [120, hdr & 0xff & 0xff];
};

const applyPngFilterMethod = function(bytes, lineLength, colorsPerPixel, filter_method) {
    let lines = bytes.length / lineLength,
        result = new Uint8Array(bytes.length + lines),
        filter_methods = getFilterMethods(),
        line,
        prevLine,
        offset;

    for (let i = 0; i < lines; i += 1) {
        offset = i * lineLength;
        line = bytes.subarray(offset, offset + lineLength);

        if (filter_method) {
            result.set(filter_method(line, colorsPerPixel, prevLine), offset + i);
        } else {
            const len = filter_methods.length,
                results = [];

            for (let j; j < len; j += 1) {
                results[j] = filter_methods[j](line, colorsPerPixel, prevLine);
            }

            const ind = getIndexOfSmallestSum(results.concat());

            result.set(results[ind], offset + i);
        }

        prevLine = line;
    }

    return result;
};

const filterNone = function(line) {
    /*var result = new Uint8Array(line.length + 1);
  result[0] = 0;
  result.set(line, 1);*/

    const result = Array.apply([], line);
    result.unshift(0);

    return result;
};

const filterSub = function(line, colorsPerPixel) {
    let result = [],
        len = line.length,
        left;

    result[0] = 1;

    for (let i = 0; i < len; i += 1) {
        left = line[i - colorsPerPixel] || 0;
        result[i + 1] = (line[i] - left + 0x0100) & 0xff;
    }

    return result;
};

const filterUp = function(line, colorsPerPixel, prevLine) {
    let result = [],
        len = line.length,
        up;

    result[0] = 2;

    for (let i = 0; i < len; i += 1) {
        up = (prevLine && prevLine[i]) || 0;
        result[i + 1] = (line[i] - up + 0x0100) & 0xff;
    }

    return result;
};

const filterAverage = function(line, colorsPerPixel, prevLine) {
    let result = [],
        len = line.length,
        left,
        up;

    result[0] = 3;

    for (let i = 0; i < len; i += 1) {
        left = line[i - colorsPerPixel] || 0;
        up = (prevLine && prevLine[i]) || 0;
        result[i + 1] = (line[i] + 0x0100 - ((left + up) >>> 1)) & 0xff;
    }

    return result;
};

const filterPaeth = function(line, colorsPerPixel, prevLine) {
    let result = [],
        len = line.length,
        left,
        up,
        upLeft,
        paeth;

    result[0] = 4;

    for (let i = 0; i < len; i += 1) {
        left = line[i - colorsPerPixel] || 0;
        up = (prevLine && prevLine[i]) || 0;
        upLeft = (prevLine && prevLine[i - colorsPerPixel]) || 0;
        paeth = paethPredictor(left, up, upLeft);
        result[i + 1] = (line[i] - paeth + 0x0100) & 0xff;
    }

    return result;
};

const paethPredictor = function(left, up, upLeft) {
    if (left === up && up === upLeft) {
        return left;
    }
    const pLeft = Math.abs(up - upLeft),
        pUp = Math.abs(left - upLeft),
        pUpLeft = Math.abs(left + up - upLeft - upLeft);
    return pLeft <= pUp && pLeft <= pUpLeft ? left : pUp <= pUpLeft ? up : upLeft;
};

const getFilterMethods = function() {
    return [filterNone, filterSub, filterUp, filterAverage, filterPaeth];
};

const getIndexOfSmallestSum = function(arrays) {
    const sum = arrays.map(function(value) {
        return value.reduce(function(pv, cv) {
            return pv + Math.abs(cv);
        }, 0);
    });
    return sum.indexOf(Math.min.apply(null, sum));
};

const getPredictorFromCompression = function(compression) {
    let predictor;
    switch (compression) {
        case ImageCompression.FAST:
            predictor = 11;
            break;

        case ImageCompression.MEDIUM:
            predictor = 13;
            break;

        case ImageCompression.SLOW:
            predictor = 14;
            break;

        default:
            predictor = 12;
            break;
    }
    return predictor;
};

/**
 * This takes raw image data and returns an object suitable for adding as an image to a pdf
 * @name processPNG
 * @function
 * @ignore
 */
export default function ProcessPNG(imageData, compression) {
    let colorSpace,
        filter = Decode.FLATE_DECODE,
        bitsPerComponent,
        image,
        decodeParameters = '',
        trns,
        colors,
        pal,
        smask,
        pixels,
        len,
        alphaData,
        imgData,
        hasColors,
        pixel,
        i,
        n;

    image = new PNG(imageData);
    imageData = image.imgData;
    bitsPerComponent = image.bits;
    colorSpace = image.colorSpace;
    colors = image.colors;

    /*
     * colorType 6 - Each pixel is an R,G,B triple, followed by an alpha sample.
     *
     * colorType 4 - Each pixel is a grayscale sample, followed by an alpha sample.
     *
     * Extract alpha to create two separate images, using the alpha as a sMask
     */
    if ([4, 6].indexOf(image.colorType) !== -1) {
        /*
         * processes 8 bit RGBA and grayscale + alpha images
         */
        if (image.bits === 8) {
            pixels =
                image.pixelBitlength == 32
                    ? new Uint32Array(image.decodePixels().buffer)
                    : image.pixelBitlength == 16
                    ? new Uint16Array(image.decodePixels().buffer)
                    : new Uint8Array(image.decodePixels().buffer);
            len = pixels.length;
            imgData = new Uint8Array(len * image.colors);
            alphaData = new Uint8Array(len);
            const pDiff = image.pixelBitlength - image.bits;
            i = 0;
            n = 0;
            let pbl;

            for (; i < len; i++) {
                pixel = pixels[i];
                pbl = 0;

                while (pbl < pDiff) {
                    imgData[n++] = (pixel >>> pbl) & 0xff;
                    pbl = pbl + image.bits;
                }

                alphaData[i] = (pixel >>> pbl) & 0xff;
            }
        }

        /*
         * processes 16 bit RGBA and grayscale + alpha images
         */
        if (image.bits === 16) {
            pixels = new Uint32Array(image.decodePixels().buffer);
            len = pixels.length;
            imgData = new Uint8Array(len * (32 / image.pixelBitlength) * image.colors);
            alphaData = new Uint8Array(len * (32 / image.pixelBitlength));
            hasColors = image.colors > 1;
            i = 0;
            n = 0;
            let a = 0;

            while (i < len) {
                pixel = pixels[i++];

                imgData[n++] = (pixel >>> 0) & 0xff;

                if (hasColors) {
                    imgData[n++] = (pixel >>> 16) & 0xff;

                    pixel = pixels[i++];
                    imgData[n++] = (pixel >>> 0) & 0xff;
                }

                alphaData[a++] = (pixel >>> 16) & 0xff;
            }
            bitsPerComponent = 8;
        }

        if (compression !== ImageCompression.NONE) {
            imageData = compressBytes(
                imgData,
                image.width * image.colors,
                image.colors,
                compression
            );
            smask = compressBytes(alphaData, image.width, 1, compression);
        } else {
            imageData = imgData;
            smask = alphaData;
            filter = undefined;
        }
    }

    /*
     * Indexed png. Each pixel is a palette index.
     */
    if (image.colorType === 3) {
        colorSpace = color_spaces.INDEXED;
        pal = image.palette;

        if (image.transparency.indexed) {
            const trans = image.transparency.indexed;
            let total = 0;
            i = 0;
            len = trans.length;

            for (; i < len; ++i) {
                total += trans[i];
            }

            total = total / 255;

            /*
             * a single color is specified as 100% transparent (0),
             * so we set trns to use a /Mask with that index
             */
            if (total === len - 1 && trans.indexOf(0) !== -1) {
                trns = [trans.indexOf(0)];

                /*
                 * there's more than one colour within the palette that specifies
                 * a transparency value less than 255, so we unroll the pixels to create an image sMask
                 */
            } else if (total !== len) {
                pixels = image.decodePixels();
                alphaData = new Uint8Array(pixels.length);
                i = 0;
                len = pixels.length;

                for (; i < len; i++) {
                    alphaData[i] = trans[pixels[i]];
                }

                smask = compressBytes(alphaData, image.width, 1);
            }
        }
    }

    const predictor = getPredictorFromCompression(compression);

    if (filter === Decode.FLATE_DECODE) {
        decodeParameters = '/Predictor ' + predictor + ' ';
    }
    decodeParameters +=
        '/Colors ' + colors + ' /BitsPerComponent ' + bitsPerComponent + ' /Columns ' + image.width;

    if (isArrayBuffer(imageData) || isArrayBufferView(imageData)) {
        imageData = arrayBufferToBinaryString(imageData);
    }

    if ((smask && isArrayBuffer(smask)) || isArrayBufferView(smask)) {
        smask = arrayBufferToBinaryString(smask);
    }

    return {
        data: imageData,
        filter,
        decodeParameters,
        transparency: trns,
        palette: pal,
        sMask: smask,
        predictor,
        width: image.width,
        height: image.height,
        bitsPerComponent,
        colorSpace,
    };
}
