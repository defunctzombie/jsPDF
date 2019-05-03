/* eslint-disable no-console */
/* global expect, fail */

const fs = require('fs');
const path = require('path');

function cleanUpUnicode(value) {
  var i = 0;
  var byteArray = [];
  var StringFromCharCode = String.fromCharCode;
  for (i = 0; i < value.length; i += 1) {
    byteArray.push(StringFromCharCode(value.charCodeAt(i) & 0xff))
  }
  return byteArray.join("");
}

const sendReference = function () {
};

const prefix = global.isNode ? '/../' : '/base/spec/';

//if (globalVar.isNode === true) {

function loadBinaryResource(url) {
  try {
    return fs.readFileSync((path.resolve(__dirname + prefix + url)), { encoding: 'latin1' });
  } catch (ex) {
    console.log(ex);
  }
  return '';
}

/*
} else {
globalVar.sendReference = function (filename, data) {
  var req = new XMLHttpRequest();
  req.open('POST', 'http://localhost:9090/' + filename, true);
  req.send(data);
}

globalVar.loadBinaryResource = function (url) {
  const req = new XMLHttpRequest()
  req.open('GET', prefix + url, false);
  // XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
  req.overrideMimeType('text/plain; charset=x-user-defined');
  req.send(null);
  if (req.status !== 200) {
    throw new Error('Unable to load file');
  }

  return req.responseText;
}
}
*/

function resetFile(pdfFile) {
  pdfFile = pdfFile.replace(/\/CreationDate \(D:(.*?)\)/, '/CreationDate (D:19871210000000+00\'00\')');
  pdfFile = pdfFile.replace(/(\/ID \[ (<[0-9a-fA-F]+> ){2}\])/, '/ID [ <00000000000000000000000000000000> <00000000000000000000000000000000> ]');
  pdfFile = pdfFile.replace(/(\/Producer \(jsPDF [1-9].[0-9].[0-9]\))/, '/Producer (jsPDF 0.0.0)');
  return pdfFile;
}

module.exports = function comparePdf(actual, expectedFile, suite, unicodeCleanUp) {
  unicodeCleanUp = unicodeCleanUp || true;
  let pdf;
  try {
    pdf = loadBinaryResource('reference/' + expectedFile, unicodeCleanUp);
    if (typeof pdf !== 'string') {
      throw Error("Error loading 'reference/" + expectedFile + "'");
    }
  } catch (error) {
    fail(error.message);
    sendReference('/spec/reference/' + expectedFile, cleanUpUnicode(resetFile(actual.replace(/^\s+|\s+$/g, ''))));
    return;
  }
  const expected = cleanUpUnicode(resetFile(pdf.replace(/^\s+|\s+$/g, '')));
  actual = cleanUpUnicode(resetFile(actual.replace(/^\s+|\s+$/g, '')));

  expect(actual.replace(/[\r]/g, '').split('\n')).toEqual(expected.replace(/[\r]/g, '').split('\n'));
}
