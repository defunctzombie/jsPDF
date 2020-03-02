/**
 * @license
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */

import { arrayBufferToBinaryString, isArrayBuffer, isArrayBufferView } from '@vendor/array_buffer';

/**
 * 0xc0 (SOF) Huffman  - Baseline DCT
 * 0xc1 (SOF) Huffman  - Extended sequential DCT
 * 0xc2 Progressive DCT (SOF2)
 * 0xc3 Spatial (sequential) lossless (SOF3)
 * 0xc4 Differential sequential DCT (SOF5)
 * 0xc5 Differential progressive DCT (SOF6)
 * 0xc6 Differential spatial (SOF7)
 * 0xc7
 */
const markers = [0xc0, 0xc1, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7];

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

// takes a string imgData containing the raw bytes of
// a jpeg image and returns [width, height]
// Algorithm from: http://www.64lines.com/jpeg-width-height
const getJpegInfo = function(imgData) {
    let width, height, numcomponents;
    let blockLength = imgData.charCodeAt(4) * 256 + imgData.charCodeAt(5);
    const len = imgData.length;
    let result = { width: 0, height: 0, numcomponents: 1 };
    for (let i = 4; i < len; i += 2) {
        i += blockLength;
        if (markers.indexOf(imgData.charCodeAt(i + 1)) !== -1) {
            height = imgData.charCodeAt(i + 5) * 256 + imgData.charCodeAt(i + 6);
            width = imgData.charCodeAt(i + 7) * 256 + imgData.charCodeAt(i + 8);
            numcomponents = imgData.charCodeAt(i + 9);
            result = { width, height, numcomponents };
            break;
        } else {
            blockLength = imgData.charCodeAt(i + 2) * 256 + imgData.charCodeAt(i + 3);
        }
    }
    return result;
};

export default function ProcessJPEG(data) {
    let filter = Decode.DCT_DECODE,
        bpc = 8,
        dims,
        result = null;

    if (typeof data === 'string' || isArrayBuffer(data) || isArrayBufferView(data)) {
        // if we already have a stored binary string rep use that
        data = isArrayBuffer(data) ? new Uint8Array(data) : data;
        data = isArrayBufferView(data) ? arrayBufferToBinaryString(data) : data;

        let colorSpace;
        dims = getJpegInfo(data);
        switch (dims.numcomponents) {
            case 1:
                colorSpace = color_spaces.DEVICE_GRAY;
                break;
            case 4:
                colorSpace = color_spaces.DEVICE_CMYK;
                break;
            case 3:
                colorSpace = color_spaces.DEVICE_RGB;
                break;
        }

        result = {
            data,
            width: dims.width,
            height: dims.height,
            colorSpace,
            bitsPerComponent: bpc,
            filter,
        };
    }
    return result;
}
