/* eslint-disable no-console */
/* global expect, fail */

import BinaryResource from './BinaryResource';

function cleanUpUnicode(value) {
    const byteArray = [];
    const StringFromCharCode = String.fromCharCode;
    for (let i = 0; i < value.length; i += 1) {
        // tslint:disable-next-line:no-bitwise
        byteArray.push(StringFromCharCode(value.charCodeAt(i) & 0xff));
    }
    return byteArray.join('');
}

function resetFile(pdfFile) {
    pdfFile = pdfFile.replace(
        /\/CreationDate \(D:(.*?)\)/,
        "/CreationDate (D:19871210000000+00'00')"
    );
    pdfFile = pdfFile.replace(
        /(\/ID \[ (<[0-9a-fA-F]+> ){2}\])/,
        '/ID [ <00000000000000000000000000000000> <00000000000000000000000000000000> ]'
    );
    pdfFile = pdfFile.replace(
        /(\/Producer \(jsPDF [1-9].[0-9].[0-9]\))/,
        '/Producer (jsPDF 0.0.0)'
    );
    return pdfFile;
}

export default function comparePdf(actual, expectedFile, suite?: string) {
    if (process.env.JSPDF_GENERATE_SPEC_REFERENCE_FILES) {
        BinaryResource.write('reference/' + expectedFile, actual);
    }

    let pdf;
    try {
        pdf = BinaryResource.load('reference/' + expectedFile);
        if (typeof pdf !== 'string') {
            throw new Error("Error loading 'reference/" + expectedFile + "'");
        }
    } catch (error) {
        fail(error.message);
        return;
    }
    const expected = cleanUpUnicode(resetFile(pdf.replace(/^\s+|\s+$/g, '')));
    actual = cleanUpUnicode(resetFile(actual.replace(/^\s+|\s+$/g, '')));

    expect(actual.replace(/[\r]/g, '').split('\n')).toEqual(
        expected.replace(/[\r]/g, '').split('\n')
    );
}
