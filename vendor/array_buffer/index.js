const atob = require('abab/lib/atob');
const btoa = require('abab/lib/btoa');

/**
 * Convert the Buffer to a Binary String
 *
 * @name arrayBufferToBinaryString
 * @public
 * @function
 * @param {ArrayBuffer} ArrayBuffer with ImageData
 *
 * @returns {String}
 */
var arrayBufferToBinaryString = function(buffer) {
    return new Uint8Array(buffer)
        .reduce(function(data, byte) {
            return data.push(String.fromCharCode(byte)), data;
        }, [])
        .join('');
};

/**
 * Tests supplied object to determine if it implements the ArrayBufferView (TypedArray) interface
 *
 * @name isArrayBufferView
 * @function
 * @param {Object} object an Object
 * @returns {boolean}
 */
var isArrayBufferView = function(object) {
    return (
        typeof Uint32Array !== 'undefined' &&
        (object instanceof Int8Array ||
            object instanceof Uint8Array ||
            (typeof Uint8ClampedArray !== 'undefined' && object instanceof Uint8ClampedArray) ||
            object instanceof Int16Array ||
            object instanceof Uint16Array ||
            object instanceof Int32Array ||
            object instanceof Uint32Array ||
            object instanceof Float32Array ||
            object instanceof Float64Array)
    );
};

/**
 * Tests supplied object to determine if ArrayBuffer
 *
 * @name isArrayBuffer
 * @function
 * @param {Object} object an Object
 *
 * @returns {boolean}
 */
var isArrayBuffer = function(object) {
    return object instanceof ArrayBuffer;
};

module.exports.isArrayBuffer = isArrayBuffer;
module.exports.isArrayBufferView = isArrayBufferView;
module.exports.arrayBufferToBinaryString = arrayBufferToBinaryString;
