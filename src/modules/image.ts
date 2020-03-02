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

import { arrayBufferToBinaryString, isArrayBufferView } from '@vendor/array_buffer';

import DocumentCore from '../DocumentCore';

declare module '../DocumentCore' {
    interface DocumentCore {
        image(image, x: number, y: number, w: number, h: number, opt?: any): void;
    }
}

const namespace = 'addImage_';

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

// Image functionality ported from pdf.js
function putImage(this: DocumentCore, image) {
    const filter = this.getFilters();
    while (filter.indexOf('FlateEncode') !== -1) {
        filter.splice(filter.indexOf('FlateEncode'), 1);
    }

    image.objectId = this.newObject();

    const additionalKeyValues = [];
    additionalKeyValues.push({ key: 'Type', value: '/XObject' });
    additionalKeyValues.push({ key: 'Subtype', value: '/Image' });
    additionalKeyValues.push({ key: 'Width', value: image.width });
    additionalKeyValues.push({ key: 'Height', value: image.height });

    if (image.colorSpace === color_spaces.INDEXED) {
        additionalKeyValues.push({
            key: 'ColorSpace',
            value:
                '[/Indexed /DeviceRGB ' +
                // if an indexed png defines more than one colour with transparency, we've created a sMask
                (image.palette.length / 3 - 1) +
                ' ' +
                ('sMask' in image && typeof image.sMask !== 'undefined'
                    ? image.objectId + 2
                    : image.objectId + 1) +
                ' 0 R]',
        });
    } else {
        additionalKeyValues.push({ key: 'ColorSpace', value: '/' + image.colorSpace });
        if (image.colorSpace === color_spaces.DEVICE_CMYK) {
            additionalKeyValues.push({ key: 'Decode', value: '[1 0 1 0 1 0 1 0]' });
        }
    }
    additionalKeyValues.push({ key: 'BitsPerComponent', value: image.bitsPerComponent });
    if ('decodeParameters' in image && typeof image.decodeParameters !== 'undefined') {
        additionalKeyValues.push({
            key: 'DecodeParms',
            value: '<<' + image.decodeParameters + '>>',
        });
    }
    if ('transparency' in image && Array.isArray(image.transparency)) {
        let transparency = '',
            i = 0,
            len = image.transparency.length;
        for (; i < len; i++) {
            transparency += image.transparency[i] + ' ' + image.transparency[i] + ' ';
        }

        additionalKeyValues.push({ key: 'Mask', value: '[' + transparency + ']' });
    }
    if (typeof image.sMask !== 'undefined') {
        additionalKeyValues.push({ key: 'SMask', value: image.objectId + 1 + ' 0 R' });
    }

    const alreadyAppliedFilters =
        typeof image.filter !== 'undefined' ? ['/' + image.filter] : undefined;

    this.putStream({
        data: image.data,
        additionalKeyValues,
        alreadyAppliedFilters,
    });

    this.out('endobj');

    // Soft mask
    if ('sMask' in image && typeof image.sMask !== 'undefined') {
        const decodeParameters =
            '/Predictor ' +
            image.predictor +
            ' /Colors 1 /BitsPerComponent ' +
            image.bitsPerComponent +
            ' /Columns ' +
            image.width;
        const sMask = {
            width: image.width,
            height: image.height,
            colorSpace: 'DeviceGray',
            bitsPerComponent: image.bitsPerComponent,
            decodeParameters,
            data: image.sMask,
            filter: undefined,
        };
        if ('filter' in image) {
            sMask.filter = image.filter;
        }
        putImage.call(this, sMask);
    }

    // Palette
    if (image.colorSpace === color_spaces.INDEXED) {
        this.newObject();
        // out('<< /Filter / ' + img['f'] +' /Length ' + img['pal'].length + '>>');
        // putStream(zlib.compress(img['pal']));
        this.putStream({ data: arrayBufferToBinaryString(new Uint8Array(image.palette)) });
        this.out('endobj');
    }
}

function putResourcesCallback(this: DocumentCore) {
    const images = this.collections[namespace + 'images'];
    for (const i in images) {
        putImage.call(this, images[i]);
    }
}

function putXObjectsDictCallback(this: DocumentCore) {
    const images = this.collections[namespace + 'images'];
    for (const image of images) {
        this.out(`/I${image.index} ${image.objectId} 0 R`);
    }
}

function getImages(this: DocumentCore) {
    return this.collections[namespace + 'images'];
}

function getImageIndex(this: DocumentCore) {
    return Object.keys(this.collections[namespace + 'images']).length;
}

function checkImagesForAlias(this: DocumentCore, alias) {
    const images = this.collections[namespace + 'images'];
    if (images) {
        for (const e in images) {
            if (alias === images[e].alias) {
                return images[e];
            }
        }
    }
}

function determineWidthAndHeight(this: DocumentCore, width, height, image) {
    if (!width && !height) {
        width = -96;
        height = -96;
    }
    if (width < 0) {
        width = (-1 * image.width * 72) / width / this.scaleFactor;
    }
    if (height < 0) {
        height = (-1 * image.height * 72) / height / this.scaleFactor;
    }
    if (width === 0) {
        width = (height * image.width) / image.height;
    }
    if (height === 0) {
        height = (width * image.height) / image.width;
    }

    return [width, height];
}

function writeImageToPDF(this: DocumentCore, x, y, width, height, image, rotation) {
    const dims = determineWidthAndHeight.call(this, width, height, image);
    const coord = this.getHorizontalCoordinateString.bind(this);
    const vcoord = this.getVerticalCoordinateString.bind(this);

    const images = getImages.call(this);

    width = dims[0];
    height = dims[1];
    images[image.index] = image;

    let rotationTransformationMatrix;
    if (rotation) {
        rotation *= Math.PI / 180;
        const c = Math.cos(rotation);
        const s = Math.sin(rotation);
        // like in pdf Reference do it 4 digits instead of 2
        const f4 = function(number) {
            return number.toFixed(4);
        };
        rotationTransformationMatrix = [f4(c), f4(s), f4(s * -1), f4(c), 0, 0, 'cm'];
    }
    this.out('q'); // Save graphics state
    if (rotation) {
        this.out([1, '0', '0', 1, coord(x), vcoord(y + height), 'cm'].join(' ')); // Translate
        this.out(rotationTransformationMatrix.join(' ')); // Rotate
        this.out([coord(width), '0', '0', coord(height), '0', '0', 'cm'].join(' ')); // Scale
    } else {
        this.out(
            [coord(width), '0', '0', coord(height), coord(x), vcoord(y + height), 'cm'].join(' ')
        ); // Translate and Scale
    }
    this.out('/I' + image.index + ' Do'); // Paint Image
    this.out('Q'); // Restore graphics state
}

/**
 * @name sHashCode
 * @function
 * @param {string} data
 * @returns {string}
 */
function sHashCode(data) {
    let hash = 0,
        i,
        len;

    if (typeof data === 'string') {
        len = data.length;
        for (i = 0; i < len; i++) {
            hash = (hash << 5) - hash + data.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
    } else if (isArrayBufferView(data)) {
        len = data.byteLength / 2;
        for (i = 0; i < len; i++) {
            hash = (hash << 5) - hash + data[i];
            hash |= 0; // Convert to 32bit integer
        }
    }
    return hash;
}

DocumentCore.prototype.image = function(this: DocumentCore, image, x, y, w, h, opt) {
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
};

DocumentCore.addInitializer(function(this: DocumentCore) {
    if (!this.collections[namespace + 'images']) {
        this.collections[namespace + 'images'] = [];
        this.events.subscribe('putResources', putResourcesCallback);
        this.events.subscribe('putXobjectDict', putXObjectsDictCallback);
    }
});
