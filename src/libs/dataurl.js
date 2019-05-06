/**
 * Strips out and returns info from a valid base64 data URI
 *
 * @name extractImageFromDataUrl
 * @function 
 * @param {string} dataUrl a valid data URI of format 'data:[<MIME-type>][;base64],<data>'
 * @returns {object}an Object containing the following
 * [0] the complete data URI
 * [1] <MIME-type>
 * [2] format - the second part of the mime-type i.e 'png' in 'image/png'
 * [4] <data>
 */
const parseDataUrl = function (dataUrl) {
    dataUrl = dataUrl || '';
    var dataUrlParts = dataUrl.split('base64,');
    var result = null;

    if (dataUrlParts.length === 2) {
        var extractedInfo = /^data:(\w*\/\w*);*(charset=[\w=-]*)*;*$/.exec(dataUrlParts[0]);
        if (Array.isArray(extractedInfo)) {
            result = {
                mimeType: extractedInfo[1],
                charset: extractedInfo[2],
                data: dataUrlParts[1]
            };
        }
    }
    return result;
};

module.exports.parse = parseDataUrl;