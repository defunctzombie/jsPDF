/**
 * @license
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */

const TTFFont = require('../libs/ttffont').TTFFont;

/**
* @name ttfsupport
* @module
*/
module.exports = function (jsPDFAPI) {
    "use strict";

    var binaryStringToUint8Array = function (binary_string) {
        var len = binary_string.length;
        var bytes = new Uint8Array(len);
        for (var i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes;
    };

    var addFont = function (font, file) {
        // eslint-disable-next-line no-control-regex
        if (/^\x00\x01\x00\x00/.test(file)) {
            file = binaryStringToUint8Array(file);
        } else {
            file = binaryStringToUint8Array(atob(file));
        }
        font.metadata = new TTFFont(file);
        font.metadata.Unicode = font.metadata.Unicode || {encoding: {}, kerning: {}, widths: []};
        font.metadata.glyIdsUsed = [0];
    }

    jsPDFAPI.events.push([ 
        'addFont'
        ,function(data) {
            var file = undefined;
            var font = data.font;
            var instance = data.instance;
            if (typeof instance !== "undefined") {
                file = instance.getFileFromVFS(font.postScriptName);
                if (typeof file !== "string") {
                    throw new Error("Font is not stored as string-data in vFS, import fonts or remove declaration doc.addFont('" + font.postScriptName + "').");
                }
                addFont(font, file);
            } else if (font.isStandardFont === false) {
                throw new Error("Font does not exist in vFS, import fonts or remove declaration doc.addFont('" + font.postScriptName + "').");
            }
        }
    ]) // end of adding event handler
};
