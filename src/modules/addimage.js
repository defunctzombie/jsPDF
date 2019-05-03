/** @license
 * jsPDF addImage plugin
 * Copyright (c) 2012 Jason Siefken, https://github.com/siefkenj/
 *               2013 Chris Dowling, https://github.com/gingerchris
 *               2013 Trinh Ho, https://github.com/ineedfat
 *               2013 Edwin Alejandro Perez, https://github.com/eaparango
 *               2013 Norah Smith, https://github.com/burnburnrocket
 *               2014 Diego Casorran, https://github.com/diegocr
 *               2014 James Robb, https://github.com/jamesbrobb
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
 */

const arrayBufferToBinaryString = require('../libs/array_buffer').arrayBufferToBinaryString;
const isArrayBufferView = require('../libs/array_buffer').isArrayBufferView;

/**
* @name addImage
* @module
*/
module.exports = function (jsPDFAPI) {
    'use strict';

    var namespace = 'addImage_';

    // Image functionality ported from pdf.js
    var putImage = function (image) {

        var out = this.internal.write;
        var putStream = this.internal.putStream;
        var getFilters = this.internal.getFilters;

        var filter = getFilters();
        while (filter.indexOf('FlateEncode') !== -1) {
            filter.splice(filter.indexOf('FlateEncode'), 1);
        }

        image.objectId = this.internal.newObject();

        var additionalKeyValues = [];
        additionalKeyValues.push({ key: 'Type', value: '/XObject' });
        additionalKeyValues.push({ key: 'Subtype', value: '/Image' });
        additionalKeyValues.push({ key: 'Width', value: image.width });
        additionalKeyValues.push({ key: 'Height', value: image.height });

        if (image.colorSpace === color_spaces.INDEXED) {
            additionalKeyValues.push({
                key: 'ColorSpace', value: '[/Indexed /DeviceRGB '
                    // if an indexed png defines more than one colour with transparency, we've created a sMask
                    + (image.palette.length / 3 - 1) + ' ' + ('sMask' in image  && typeof image.sMask !== "undefined" ? image.objectId + 2 : image.objectId + 1)
                    + ' 0 R]'
            });
        } else {
            additionalKeyValues.push({ key: 'ColorSpace', value: '/' + image.colorSpace });
            if (image.colorSpace === color_spaces.DEVICE_CMYK) {
                additionalKeyValues.push({ key: 'Decode', value: '[1 0 1 0 1 0 1 0]' });
            }
        }
        additionalKeyValues.push({ key: 'BitsPerComponent', value: image.bitsPerComponent });
        if ('decodeParameters' in image && typeof image.decodeParameters !== "undefined") {
            additionalKeyValues.push({ key: 'DecodeParms', value: '<<' + image.decodeParameters + '>>' });
        }
        if ('transparency' in image && Array.isArray(image.transparency)) {
            var transparency = '',
                i = 0,
                len = image.transparency.length;
            for (; i < len; i++)
                transparency += (image.transparency[i] + ' ' + image.transparency[i] + ' ');

            additionalKeyValues.push({ key: 'Mask', value: '[' + transparency + ']' });
        }
        if (typeof image.sMask !== "undefined") {
            additionalKeyValues.push({ key: 'SMask', value: (image.objectId + 1) + ' 0 R' });
        }

        var alreadyAppliedFilters = (typeof image.filter !== "undefined") ? ['/' + image.filter] : undefined;

        putStream({ data: image.data, additionalKeyValues: additionalKeyValues, alreadyAppliedFilters: alreadyAppliedFilters });

        out('endobj');

        // Soft mask
        if ('sMask' in image && typeof image.sMask !== "undefined") {
            var decodeParameters = '/Predictor ' + image.predictor + ' /Colors 1 /BitsPerComponent ' + image.bitsPerComponent + ' /Columns ' + image.width;
            var sMask = { width: image.width, height: image.height, colorSpace: 'DeviceGray', bitsPerComponent: image.bitsPerComponent, decodeParameters: decodeParameters, data: image.sMask };
            if ('filter' in image) {
                sMask.filter = image.filter;
            }
            putImage.call(this, sMask);
        }

        //Palette
        if (image.colorSpace === color_spaces.INDEXED) {

            this.internal.newObject();
            //out('<< /Filter / ' + img['f'] +' /Length ' + img['pal'].length + '>>');
            //putStream(zlib.compress(img['pal']));
            putStream({ data: arrayBufferToBinaryString(new Uint8Array(image.palette)) });
            out('endobj');
        }
    };

    var putResourcesCallback = function () {
        var images = this.internal.collections[namespace + 'images'];
        for (var i in images) {
            putImage.call(this, images[i]);
        }
    };

    var putXObjectsDictCallback = function () {
        var images = this.internal.collections[namespace + 'images']
            , out = this.internal.write
            , image;
        for (var i in images) {
            image = images[i];
            out(
                '/I' + image.index
                , image.objectId
                , '0'
                , 'R'
            );
        }
    };

    var initialize = function () {
        if (!this.internal.collections[namespace + 'images']) {
            this.internal.collections[namespace + 'images'] = {};
            this.internal.events.subscribe('putResources', putResourcesCallback);
            this.internal.events.subscribe('putXobjectDict', putXObjectsDictCallback);
        }
    };

    var getImages = function () {
        var images = this.internal.collections[namespace + 'images'];
        initialize.call(this);
        return images;
    };

    var getImageIndex = function () {
        return Object.keys(this.internal.collections[namespace + 'images']).length;
    };

    var checkImagesForAlias = function (alias) {
        var images = this.internal.collections[namespace + 'images'];
        if (images) {
            for (var e in images) {
                if (alias === images[e].alias) {
                    return images[e];
                }
            }
        }
    };

    var determineWidthAndHeight = function (width, height, image) {
        if (!width && !height) {
            width = -96;
            height = -96;
        }
        if (width < 0) {
            width = (-1) * image.width * 72 / width / this.internal.scaleFactor;
        }
        if (height < 0) {
            height = (-1) * image.height * 72 / height / this.internal.scaleFactor;
        }
        if (width === 0) {
            width = height * image.width / image.height;
        }
        if (height === 0) {
            height = width * image.height / image.width;
        }

        return [width, height];
    };

    var writeImageToPDF = function (x, y, width, height, image, rotation) {
        var dims = determineWidthAndHeight.call(this, width, height, image),
            coord = this.internal.getCoordinateString,
            vcoord = this.internal.getVerticalCoordinateString;
        
        var images = getImages.call(this);

        width = dims[0];
        height = dims[1];
        images[image.index] = image;

        if (rotation) {
            rotation *= (Math.PI / 180);
            var c = Math.cos(rotation);
            var s = Math.sin(rotation);
            //like in pdf Reference do it 4 digits instead of 2
            var f4 = function (number) {
                return number.toFixed(4);
            };
            var rotationTransformationMatrix = [f4(c), f4(s), f4(s * -1), f4(c), 0, 0, 'cm'];
        }
        this.internal.write('q'); //Save graphics state
        if (rotation) {
            this.internal.write([1, '0', '0', 1, coord(x), vcoord(y + height), 'cm'].join(' '));  //Translate
            this.internal.write(rotationTransformationMatrix.join(' ')); //Rotate
            this.internal.write([coord(width), '0', '0', coord(height), '0', '0', 'cm'].join(' '));  //Scale
        } else {
            this.internal.write([coord(width), '0', '0', coord(height), coord(x), vcoord(y + height), 'cm'].join(' '));  //Translate and Scale
        }
        this.internal.write('/I' + image.index + ' Do'); //Paint Image
        this.internal.write('Q'); //Restore graphics state
    };

    /**
     * COLOR SPACES
     */
    var color_spaces = jsPDFAPI.color_spaces = {
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
        DEVICE_N: 'DeviceN'
    };

    /**
     * DECODE METHODS
     */
    jsPDFAPI.decode = {
        DCT_DECODE: 'DCTDecode',
        FLATE_DECODE: 'FlateDecode',
        LZW_DECODE: 'LZWDecode',
        JPX_DECODE: 'JPXDecode',
        JBIG2_DECODE: 'JBIG2Decode',
        ASCII85_DECODE: 'ASCII85Decode',
        ASCII_HEX_DECODE: 'ASCIIHexDecode',
        RUN_LENGTH_DECODE: 'RunLengthDecode',
        CCITT_FAX_DECODE: 'CCITTFaxDecode'
    };

    /**
     * IMAGE COMPRESSION TYPES
     */
    jsPDFAPI.image_compression = {
        NONE: 'NONE',
        FAST: 'FAST',
        MEDIUM: 'MEDIUM',
        SLOW: 'SLOW'
    };

    /**
    * @name sHashCode
    * @function 
    * @param {string} data
    * @returns {string} 
    */
    const sHashCode = function (data) {
        var hash = 0, i, len;

        if (typeof data === "string") {
            len = data.length;
            for (i = 0; i < len; i++) {
                hash = ((hash << 5) - hash) + data.charCodeAt(i);
                hash |= 0; // Convert to 32bit integer
            }
        } else if (isArrayBufferView(data)) {
            len = data.byteLength / 2;
            for (i = 0; i < len; i++) {
                hash = ((hash << 5) - hash) + data[i];
                hash |= 0; // Convert to 32bit integer
            }
        }
        return hash;
    };

    jsPDFAPI.image = function(image, x, y, w, h, opt) {
        initialize.call(this);

        opt = opt || {};
        const rotation = opt.rotation;

        const alias = sHashCode(image.data);

        // This is an optimization.
        // If we already stored the exact image in our resources, we can avoid storing it again
        const existing = checkImagesForAlias.call(this, alias);
        if (existing) {
            writeImageToPDF.call(this, x, y, w, h, existing, rotation);
            return;
        }

        const index = getImageIndex.call(this);

        // TODO(roman) instead of monkey-patching - pass as arguments?
        // note the optimization above
        image.alias = alias;
        image.index = index;

        writeImageToPDF.call(this, x, y, w, h, image, rotation);
    }
};