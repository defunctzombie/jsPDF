
/* global describe, it */
/**
 * Standard spec tests
 *
 * These tests return the datauristring so that reference files can be generated.
 * We compare the exact output.
 */
const jsPDF = require('../');
const comparePdf = require('./utils/compare');
const loadBinaryResource = require('./utils/loadBinaryResource');

describe('Module: Unicode: Russian', function () {
  var PTSans = loadBinaryResource('reference/PTSans.ttf')

  it('simple pdf with russian text (1 line)', function () {
    const doc = new jsPDF({ filters: ['ASCIIHexEncode'], putOnlyUsedFonts: true });

    doc.addFileToVFS("PTSans.ttf", PTSans);
    doc.addFont('PTSans.ttf', 'PTSans', 'normal');

    doc.setFont('PTSans'); // set font
    doc.setFontSize(10);
    doc.text("А ну чики брики и в дамки!", 10, 10);

    comparePdf(doc.output(), 'russian-1line.pdf', 'unicode')
  })

  it('simple pdf with russian text (2 line)', function () {

    const doc = new jsPDF({ filters: ['ASCIIHexEncode'], putOnlyUsedFonts: true });

    doc.addFileToVFS("PTSans.ttf", PTSans);
    doc.addFont('PTSans.ttf', 'PTSans', 'normal');

    doc.setFont('PTSans'); // set font
    doc.setFontSize(10);
    doc.text(["А ну чики брики", "и в дамки!"], 10, 10);

    comparePdf(doc.output(), 'russian-2line.pdf', 'unicode')
  });
})
