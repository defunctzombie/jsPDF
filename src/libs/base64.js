const atob = require('atob');

/**
* Convert Binary String to ArrayBuffer
*
* @name binaryStringToUint8Array
* @public
* @function
* @param {string} BinaryString with ImageData
* @returns {Uint8Array}
*/
const binaryStringToUint8Array = function (binary_string) {
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
};

const toUint8Array = function (b64Str) {
    const binaryStr = atob(b64Str);
    return binaryStringToUint8Array(binaryStr);
}


module.exports.toUint8Array = toUint8Array;