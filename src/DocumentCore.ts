/// Licensed under the MIT License.
/// https://opensource.org/licenses/mit-license

import Matrix from './Matrix';
import PubSub from './PubSub';
import ShadingPattern from './ShadingPattern';
import TilingPattern from './TilingPattern';

import Pattern from './Pattern';
import { Decode as ASCII85Decode, Encode as ASCII85Encode } from './Ascii85';
import { Decode as ASCIIHexDecode, Encode as ASCIIHexEncode } from './AsciiHex';
import { Encode as FlateEncode } from './Flate';
import { f2, hpf } from './rounding';

import {
    DocumentOptions,
    Format,
    Orientation,
    RenderTarget,
    DocumentProperties,
    PageInfo,
} from './types';

// Size in pt of various paper formats
const pageFormats: { [key: string]: [number, number] } = {
    a0: [2383.94, 3370.39],
    a1: [1683.78, 2383.94],
    a2: [1190.55, 1683.78],
    a3: [841.89, 1190.55],
    a4: [595.28, 841.89],
    a5: [419.53, 595.28],
    a6: [297.64, 419.53],
    a7: [209.76, 297.64],
    a8: [147.4, 209.76],
    a9: [104.88, 147.4],
    a10: [73.7, 104.88],
    b0: [2834.65, 4008.19],
    b1: [2004.09, 2834.65],
    b2: [1417.32, 2004.09],
    b3: [1000.63, 1417.32],
    b4: [708.66, 1000.63],
    b5: [498.9, 708.66],
    b6: [354.33, 498.9],
    b7: [249.45, 354.33],
    b8: [175.75, 249.45],
    b9: [124.72, 175.75],
    b10: [87.87, 124.72],
    c0: [2599.37, 3676.54],
    c1: [1836.85, 2599.37],
    c2: [1298.27, 1836.85],
    c3: [918.43, 1298.27],
    c4: [649.13, 918.43],
    c5: [459.21, 649.13],
    c6: [323.15, 459.21],
    c7: [229.61, 323.15],
    c8: [161.57, 229.61],
    c9: [113.39, 161.57],
    c10: [79.37, 113.39],
    dl: [311.81, 623.62],
    letter: [612, 792],
    'government-letter': [576, 756],
    legal: [612, 1008],
    'junior-legal': [576, 360],
    ledger: [1224, 792],
    tabloid: [792, 1224],
    'credit-card': [153, 243],
};

function padd2(number: number): string {
    return ('0' + String(number)).slice(-2);
}

function padd2Hex(hexString: string): string {
    hexString = hexString.toString();
    return ('00' + hexString).substr(hexString.length);
}

function convertDateToPDFDate(parmDate: Date): string {
    let result = '';
    const tzoffset = parmDate.getTimezoneOffset(),
        tzsign = tzoffset < 0 ? '+' : '-',
        tzhour = Math.floor(Math.abs(tzoffset / 60)),
        tzmin = Math.abs(tzoffset % 60),
        timeZoneString = [tzsign, padd2(tzhour), "'", padd2(tzmin), "'"].join('');

    result = [
        'D:',
        parmDate.getFullYear(),
        padd2(parmDate.getMonth() + 1),
        padd2(parmDate.getDate()),
        padd2(parmDate.getHours()),
        padd2(parmDate.getMinutes()),
        padd2(parmDate.getSeconds()),
        timeZoneString,
    ].join('');
    return result;
}

function interpolateAndEncodeRGBStream(colors, numberSamples) {
    const tValues = [];
    let t;
    const dT = 1.0 / (numberSamples - 1);
    for (t = 0.0; t < 1.0; t += dT) {
        tValues.push(t);
    }
    tValues.push(1.0);
    // add first and last control point if not present
    if (colors[0].offset != 0.0) {
        const c0 = {
            offset: 0.0,
            color: colors[0].color,
        };
        colors.unshift(c0);
    }
    if (colors[colors.length - 1].offset != 1.0) {
        const c1 = {
            offset: 1.0,
            color: colors[colors.length - 1].color,
        };
        colors.push(c1);
    }
    let out = '';
    let index = 0;

    for (let i = 0; i < tValues.length; i++) {
        t = tValues[i];
        while (t > colors[index + 1].offset) {
            index++;
        }
        const a = colors[index].offset;
        const b = colors[index + 1].offset;
        const d = (t - a) / (b - a);

        const aColor = colors[index].color;
        const bColor = colors[index + 1].color;

        out +=
            padd2Hex(Math.round((1 - d) * aColor[0] + d * bColor[0]).toString(16)) +
            padd2Hex(Math.round((1 - d) * aColor[1] + d * bColor[1]).toString(16)) +
            padd2Hex(Math.round((1 - d) * aColor[2] + d * bColor[2]).toString(16));
    }
    return out.trim();
}

function convertPDFDateToDate(parmPDFDate: string): Date {
    const year = parseInt(parmPDFDate.substr(2, 4), 10);
    const month = parseInt(parmPDFDate.substr(6, 2), 10) - 1;
    const date = parseInt(parmPDFDate.substr(8, 2), 10);
    const hour = parseInt(parmPDFDate.substr(10, 2), 10);
    const minutes = parseInt(parmPDFDate.substr(12, 2), 10);
    const seconds = parseInt(parmPDFDate.substr(14, 2), 10);
    // var timeZoneHour = parseInt(parmPDFDate.substr(16, 2), 10);
    // var timeZoneMinutes = parseInt(parmPDFDate.substr(20, 2), 10);

    const resultingDate = new Date(year, month, date, hour, minutes, seconds, 0);
    return resultingDate;
}

/**
 * Creates new jsPDF document object instance.
 * @name jsPDF
 * @class
 * @param {Object} [options] - Collection of settings initializing the jsPDF-instance
 * @param {string} [options.orientation=portrait] - Orientation of the first page. Possible values are "portrait" or "landscape" (or shortcuts "p" or "l").<br />
 * @param {string} [options.unit=mm] Measurement unit (base unit) to be used when coordinates are specified.<br />
 * Possible values are "pt" (points), "mm", "cm", "m", "in" or "px".
 * @param {string/Array} [options.format=a4] The format of the first page. Can be:<ul><li>a0 - a10</li><li>b0 - b10</li><li>c0 - c10</li><li>dl</li><li>letter</li><li>government-letter</li><li>legal</li><li>junior-legal</li><li>ledger</li><li>tabloid</li><li>credit-card</li></ul><br />
 * Default is "a4". If you want to use your own format just pass instead of one of the above predefined formats the size as an number-array, e.g. [595.28, 841.89]
 * @param {boolean} [options.putOnlyUsedFonts=false] Only put fonts into the PDF, which were used.
 * @param {boolean} [options.compress=false] Compress the generated PDF.
 * @param {number} [options.precision=2] Precision of the element-positions.
 * @param {number} [options.userUnit=1.0] Not to be confused with the base unit. Please inform yourself before you use it.
 * @returns {jsPDF} jsPDF-instance
 * @description
 * ```
 * {
 *  orientation: 'p',
 *  unit: 'mm',
 *  format: 'a4',
 *  putOnlyUsedFonts:true
 * }
 * ```
 *
 * @constructor
 */
class DocumentCore {
    public static addInitializer(fn) {
        DocumentCore.initializers.push(fn);
    }

    public static ApplyFilterChain(origData, filterChain) {
        let i = 0;
        let data = origData || '';
        const reverseChain = [];
        filterChain = filterChain || [];

        if (typeof filterChain === 'string') {
            filterChain = [filterChain];
        }

        for (i = 0; i < filterChain.length; i += 1) {
            switch (filterChain[i]) {
                case 'ASCII85Decode':
                case '/ASCII85Decode':
                    data = ASCII85Decode(data);
                    reverseChain.push('/ASCII85Encode');
                    break;
                case 'ASCII85Encode':
                case '/ASCII85Encode':
                    data = ASCII85Encode(data);
                    reverseChain.push('/ASCII85Decode');
                    break;
                case 'ASCIIHexDecode':
                case '/ASCIIHexDecode':
                    data = ASCIIHexDecode(data);
                    reverseChain.push('/ASCIIHexEncode');
                    break;
                case 'ASCIIHexEncode':
                case '/ASCIIHexEncode':
                    data = ASCIIHexEncode(data);
                    reverseChain.push('/ASCIIHexDecode');
                    break;
                case 'FlateEncode':
                case '/FlateEncode':
                    data = FlateEncode(data);
                    reverseChain.push('/FlateDecode');
                    break;
                default:
                    throw new Error('The filter: "' + filterChain[i] + '" is not implemented');
            }
        }

        return { data, reverseChain: reverseChain.reverse().join(' ') };
    }

    private static initializers = [];

    protected options: DocumentOptions;
    protected pdfVersion: string = '1.3';
    protected usedFonts: { [key: string]: boolean } = {};
    protected filters: string[] = [];
    protected pages: string[][] = [];
    protected events: PubSub = new PubSub(this);
    protected fileId: string = '00000000000000000000000000000000';
    protected format: string | number[] = 'a4';
    protected orientation: Orientation = 'p';
    protected putOnlyUsedFonts: boolean = false;
    protected userUnit: number = 1.0;
    protected unit: string = 'mm';
    protected precision: number;
    protected defaultPathOperation: string = 'S';
    protected R2L: boolean = false;
    protected collections = {};

    protected objectNumber: number = 0; // 'n' Current object number
    protected offsets: Function[] = []; // List of offsets. Activated and reset by buildDocument(). Pupulated by various calls buildDocument makes.
    protected contentLength: number = 0;
    protected additionalObjects: any[] = [];
    protected currentPage: number = 0;
    protected outputDestination: string[];
    protected scaleFactor: number = 1;
    protected lineHeightFactor: number = 1.15;
    protected activeFontSize: number = 16;
    protected activeCharSpace: number;

    // will be string representing the KEY of the font as combination of fontName + fontStyle
    protected activeFontKey: string = '';

    protected fonts = {}; // collection of font objects, where key is fontKey - a dynamically created label for a given font.
    protected fontmap: Map<string, any> = new Map<string, any>(); // mapping structure fontName > fontStyle > font key - performance layer. See addFont()
    protected fontStateStack = []; //
    protected patterns = {}; // collection of pattern objects
    protected patternMap = {}; // see fonts
    protected gStates = {}; // collection of graphic state objects
    protected gStatesMap = {}; // see fonts
    protected activeGState = null;
    protected page = 0;
    protected pagesContext: any[] = [];

    protected renderTargets = {};
    protected renderTargetMap = {};
    protected renderTargetStack = [];
    protected pageX;
    protected pageY;
    protected pageMatrix; // only used for FormObjects

    protected strokeColor: string = '0 G';
    protected fillColor: string = '0 g';
    protected textColor: string = '0 g';
    protected lineJoinID: number = 0;
    protected lineCapID: number = 0;
    protected lineWidth: number = 0.200025; // 2mm
    protected miterLimit;

    protected rootDictionaryObjId: number = 0;
    protected resourceDictionaryObjId: number = 0;

    protected creationDate: string;

    protected zoomMode: number | string;
    protected layoutMode: string = 'continuous';
    protected pageMode: string; // default 'UseOutlines'

    protected documentProperties: DocumentProperties = {
        title: '',
        subject: '',
        author: '',
        keywords: '',
        creator: '',
    };

    constructor(options?: DocumentOptions) {
        options = options || {};
        this.options = options;

        if (options.compress) {
            this.filters.push('FlateEncode');
        }

        this.unit = options.unit || this.unit;
        this.orientation = options.orientation || 'portrait';
        this.putOnlyUsedFonts = options.putOnlyUsedFonts || this.putOnlyUsedFonts;
        this.format = options.format || this.format;
        this.userUnit = options.userUnit || this.userUnit;
        this.filters =
            options.filters || (options.compress === true ? ['FlateEncode'] : this.filters);

        switch (this.unit) {
            case 'pt':
                this.scaleFactor = 1;
                break;
            case 'mm':
                this.scaleFactor = 72 / 25.4;
                break;
            case 'cm':
                this.scaleFactor = 72 / 2.54;
                break;
            case 'in':
                this.scaleFactor = 72;
                break;
            case 'px':
                this.scaleFactor = 72 / 96;
                break;
            case 'pc':
                this.scaleFactor = 12;
                break;
            case 'em':
                this.scaleFactor = 12;
                break;
            case 'ex':
                this.scaleFactor = 6;
                break;
            default:
                throw new Error(`Invalid unit: ${options.unit}`);
        }

        for (const initializer of DocumentCore.initializers) {
            initializer.call(this);
        }

        this.setCreationDate();
        this.setFileId();
        this.setLineHeightFactor(options.lineHeightFactor || this.lineHeightFactor);

        this.activeFontKey = 'F1';
        this.addPage(this.format, this.orientation);

        this.rootDictionaryObjId = this.newObjectDeferred();
        this.resourceDictionaryObjId = this.newObjectDeferred();

        this.events.publish('initialized');
    }

    public getPdfVersion(): string {
        return this.pdfVersion;
    }

    public setPdfVersion(value: string) {
        this.pdfVersion = value;
    }

    public setCreationDate(date?: Date | string) {
        let tmpCreationDateString;
        const regexPDFCreationDate = /^D:(20[0-2][0-9]|203[0-7]|19[7-9][0-9])(0[0-9]|1[0-2])([0-2][0-9]|3[0-1])(0[0-9]|1[0-9]|2[0-3])(0[0-9]|[1-5][0-9])(0[0-9]|[1-5][0-9])(\+0[0-9]|\+1[0-4]|-0[0-9]|-1[0-1])'(0[0-9]|[1-5][0-9])'?$/;
        if (date === undefined) {
            date = new Date();
        }

        if (date instanceof Date) {
            tmpCreationDateString = convertDateToPDFDate(date);
        } else if (regexPDFCreationDate.test(date)) {
            tmpCreationDateString = date;
        } else {
            throw new Error('Invalid argument passed to jsPDF.setCreationDate');
        }
        this.creationDate = tmpCreationDateString;
        return this.creationDate;
    }

    public getCreationDate(type?: string): Date | any {
        if (type === 'jsDate') {
            return convertPDFDateToDate(this.creationDate);
        }
        return this.creationDate;
    }

    public setFileId(value?: string) {
        if (/^[a-fA-F0-9]{32}$/.test(value)) {
            this.fileId = value.toUpperCase();
        } else {
            this.fileId = this.fileId
                .split('')
                .map(function() {
                    return 'ABCDEF0123456789'.charAt(Math.floor(Math.random() * 16));
                })
                .join('');
        }
        return this.fileId;
    }

    public getFileId(): string {
        return this.fileId;
    }

    public getDocumentProperty(key: string) {
        if (Object.keys(this.documentProperties).indexOf(key) === -1) {
            throw new Error('Invalid argument passed to jsPDF.getDocumentProperty');
        }
        return this.documentProperties[key];
    }

    public getDocumentProperties(): DocumentProperties {
        return this.documentProperties;
    }

    /**
     * Adds a properties to the PDF document.
     *
     * @param {Object} A property_name-to-property_value object structure.
     * @function
     * @instance
     * @returns {jsPDF}
     * @memberof jsPDF#
     * @name setDocumentProperties
     */
    public setDocumentProperties(properties: DocumentProperties) {
        // copying only those properties we can render.
        for (const property in this.documentProperties) {
            if (this.documentProperties.hasOwnProperty(property) && properties[property]) {
                this.documentProperties[property] = properties[property];
            }
        }
        return this;
    }

    public setProperties(properties: DocumentProperties) {
        this.setDocumentProperties(properties);
    }

    public setDocumentProperty(key: string, value: string) {
        if (Object.keys(this.documentProperties).indexOf(key) === -1) {
            throw new Error('Invalid arguments passed to jsPDF.setDocumentProperty');
        }
        return (this.documentProperties[key] = value);
    }

    /**
     * Inserts a debug comment into the generated pdf.
     * @function
     * @instance
     * @param {String} text
     * @returns {jsPDF}
     * @memberof jsPDF#
     * @name comment
     */
    public comment(text: string) {
        this.out('#' + text);
        return this;
    }

    public setLineHeightFactor(value: number) {
        this.lineHeightFactor = value;
    }

    public getLineHeightFactor(): number {
        return this.lineHeightFactor;
    }

    public getLineHeight(): number {
        return this.activeFontSize * this.lineHeightFactor;
    }

    /**
     * Adds (and transfers the focus to) new page to the PDF document.
     * @param format {String/Array} The format of the new page. Can be: <ul><li>a0 - a10</li><li>b0 - b10</li><li>c0 - c10</li><li>dl</li><li>letter</li><li>government-letter</li><li>legal</li><li>junior-legal</li><li>ledger</li><li>tabloid</li><li>credit-card</li></ul><br />
     * Default is "a4". If you want to use your own format just pass instead of one of the above predefined formats the size as an number-array, e.g. [595.28, 841.89]
     * @param orientation {string} Orientation of the new page. Possible values are "portrait" or "landscape" (or shortcuts "p" (Default), "l").
     * @function
     * @instance
     * @returns {jsPDF}
     *
     * @memberof jsPDF#
     * @name addPage
     */
    public addPage(format?: Format, orientation?: Orientation) {
        orientation = orientation || this.orientation;
        format = format || this.format;
        this.beginPage(format, orientation);
        // Set line width
        this.setLineWidth(this.lineWidth);
        // Set draw color
        this.out(this.strokeColor);
        // resurrecting non-default line caps, joins
        if (this.lineCapID !== 0) {
            this.out(this.lineCapID + ' J');
        }
        if (this.lineJoinID !== 0) {
            this.out(this.lineJoinID + ' j');
        }
        this.events.publish('addPage', {
            pageNumber: this.page,
        });
    }

    public getPageInfo(pageNumberOneBased: number): PageInfo {
        if (isNaN(pageNumberOneBased) || pageNumberOneBased % 1 !== 0) {
            throw new Error('Invalid argument passed to jsPDF.getPageInfo');
        }
        const objId = this.pagesContext[pageNumberOneBased].objId;
        return {
            objId,
            pageNumber: pageNumberOneBased,
            pageContext: this.pagesContext[pageNumberOneBased],
        };
    }

    public getPageInfoByObjId(objId: number): PageInfo | null {
        if (isNaN(objId) || objId % 1 !== 0) {
            throw new Error('Invalid argument passed to jsPDF.getPageInfoByObjId');
        }

        let idx = 0;
        for (const context of this.pagesContext) {
            if (context && context.objId === objId) {
                return this.getPageInfo(idx);
            }
            idx = idx + 1;
        }
        return null;
    }

    /**
     * Returns an object - a tree of fontName to fontStyle relationships available to
     * active PDF document.
     *
     * @public
     * @function
     * @instance
     * @returns {Object} Like {'times':['normal', 'italic', ... ], 'arial':['normal', 'bold', ... ], ... }
     * @memberof jsPDF#
     * @name getFontList
     */
    public getFontList(): { [key: string]: string[] } {
        let list = {},
            fontName,
            fontStyle;

        for (fontName in this.fontmap) {
            if (this.fontmap.hasOwnProperty(fontName)) {
                list[fontName] = [];
                for (fontStyle in this.fontmap[fontName]) {
                    if (this.fontmap[fontName].hasOwnProperty(fontStyle)) {
                        list[fontName].push(fontStyle);
                    }
                }
            }
        }
        return list;
    }

    /**
     * Set the display mode options of the page like zoom and layout.
     *
     * @name setDisplayMode
     * @memberof jsPDF#
     * @function
     * @instance
     * @param {integer|String} zoom   You can pass an integer or percentage as
     * a string. 2 will scale the document up 2x, '200%' will scale up by the
     * same amount. You can also set it to 'fullwidth', 'fullheight',
     * 'fullpage', or 'original'.
     *
     * Only certain PDF readers support this, such as Adobe Acrobat.
     *
     * @param {string} layout Layout mode can be: 'continuous' - this is the
     * default continuous scroll. 'single' - the single page mode only shows one
     * page at a time. 'twoleft' - two column left mode, first page starts on
     * the left, and 'tworight' - pages are laid out in two columns, with the
     * first page on the right. This would be used for books.
     * @param {string} pmode 'UseOutlines' - it shows the
     * outline of the document on the left. 'UseThumbs' - shows thumbnails along
     * the left. 'FullScreen' - prompts the user to enter fullscreen mode.
     *
     * @returns {jsPDF}
     */
    public setDisplayMode(
        zoom: number | 'fullheight' | 'fullwidth' | 'fullpage' | 'original' | string,
        layout?: 'continuous' | 'single' | 'twoleft' | 'tworight' | 'two',
        pmode?: 'UseOutlines' | 'UseThumbs' | 'FullScreen'
    ) {
        this.setZoomMode(zoom);
        this.setLayoutMode(layout);
        this.setPageMode(pmode);
        return this;
    }

    /**
     * @name setPrecision
     * @memberof jsPDF#
     * @function
     * @instance
     * @param {string} precision
     * @returns {jsPDF}
     */
    public setPrecision(value: number | string) {
        if (typeof value === 'string' && typeof parseInt(value, 10) === 'number') {
            this.precision = parseInt(value, 10);
        }
    }

    /**
     * Set value of R2L functionality.
     *
     * @param {boolean} value
     * @function
     * @instance
     * @returns {jsPDF} jsPDF-instance
     * @memberof jsPDF#
     * @name setR2L
     */
    public setR2L(value) {
        this.R2L = value;
        return this;
    }

    /**
     * Get value of R2L functionality.
     *
     * @function
     * @instance
     * @returns {boolean} jsPDF-instance
     * @memberof jsPDF#
     * @name getR2L
     */
    public getR2L(): boolean {
        return this.R2L;
    }

    public isValidStyle(style) {
        const validStyleVariants = [
            undefined,
            null,
            'S',
            'D',
            'F',
            'DF',
            'FD',
            'f',
            'f*',
            'B',
            'B*',
            'n',
        ];
        let result = false;
        if (validStyleVariants.indexOf(style) !== -1) {
            result = true;
        }
        return result;
    }

    public getStyle(style: string): string {
        // see path-painting operators in PDF spec
        let op = this.defaultPathOperation; // stroke

        switch (style) {
            case 'D':
            case 'S':
                op = 'S'; // stroke
                break;
            case 'F':
                op = 'f'; // fill
                break;
            case 'FD':
            case 'DF':
                op = 'B';
                break;
            case 'f':
            case 'f*':
            case 'B':
            case 'B*':
                /*
                 Allow direct use of these PDF path-painting operators:
                 - f    fill using nonzero winding number rule
                 - f*    fill using even-odd rule
                 - B    fill then stroke with fill using non-zero winding number rule
                 - B*    fill then stroke with fill using even-odd rule
                 */
                op = style;
                break;
        }
        return op;
    }

    public getPageWidth(pageNumber: number = this.currentPage): number {
        return (
            (this.pagesContext[pageNumber].mediaBox.topRightX -
                this.pagesContext[pageNumber].mediaBox.bottomLeftX) /
            this.scaleFactor
        );
    }

    public getPageHeight(pageNumber: number = this.currentPage): number {
        return (
            (this.pagesContext[pageNumber].mediaBox.topRightY -
                this.pagesContext[pageNumber].mediaBox.bottomLeftY) /
            this.scaleFactor
        );
    }

    public setPageWidth(pageNumber, value: number) {
        this.pagesContext[pageNumber].mediaBox.topRightX =
            value * this.scaleFactor + this.pagesContext[pageNumber].mediaBox.bottomLeftX;
    }

    public setPageHeight(pageNumber, value: number) {
        this.pagesContext[pageNumber].mediaBox.topRightY =
            value * this.scaleFactor + this.pagesContext[pageNumber].mediaBox.bottomLeftY;
    }

    /**
     * Adds (and transfers the focus to) new page to the PDF document.
     * @function
     * @instance
     * @returns {jsPDF}
     *
     * @memberof jsPDF#
     * @name setPage
     * @param {number} page Switch the active page to the page number specified.
     * @example
     * doc = jsPDF()
     * doc.addPage()
     * doc.addPage()
     * doc.text('I am on page 3', 10, 10)
     * doc.setPage(1)
     * doc.text('I am on page 1', 10, 10)
     */
    public setPage(pageNum: number) {
        if (pageNum > 0 && pageNum <= this.page) {
            this.currentPage = pageNum;
        }

        this.setOutputDestination(this.pages[this.currentPage]);
        return this;
    }

    /**
     * @name insertPage
     * @memberof jsPDF#
     *
     * @function
     * @instance
     * @param {Object} beforePage
     * @returns {jsPDF}
     */
    public insertPage(beforePage) {
        this.addPage();
        this.movePage(this.currentPage, beforePage);
        return this;
    }

    /**
     * @name movePage
     * @memberof jsPDF#
     * @function
     * @instance
     * @param {number} targetPage
     * @param {number} beforePage
     * @returns {jsPDF}
     */
    public movePage(targetPage, beforePage) {
        let tmpPages, tmpPagesContext;
        if (targetPage > beforePage) {
            tmpPages = this.pages[targetPage];
            tmpPagesContext = this.pagesContext[targetPage];
            for (let i = targetPage; i > beforePage; i--) {
                this.pages[i] = this.pages[i - 1];
                this.pagesContext[i] = this.pagesContext[i - 1];
            }
            this.pages[beforePage] = tmpPages;
            this.pagesContext[beforePage] = tmpPagesContext;
            this.setPage(beforePage);
        } else if (targetPage < beforePage) {
            tmpPages = this.pages[targetPage];
            tmpPagesContext = this.pagesContext[targetPage];
            for (let j = targetPage; j < beforePage; j++) {
                this.pages[j] = this.pages[j + 1];
                this.pagesContext[j] = this.pagesContext[j + 1];
            }
            this.pages[beforePage] = tmpPages;
            this.pagesContext[beforePage] = tmpPagesContext;
            this.setPage(beforePage);
        }
        return this;
    }

    /**
     * Deletes a page from the PDF.
     * @name deletePage
     * @memberof jsPDF#
     * @function
     * @param {number} targetPage
     * @instance
     * @returns {jsPDF}
     */
    public deletePage(n) {
        if (n > 0 && n <= this.page) {
            this.pages.splice(n, 1);
            this.pagesContext.splice(n, 1);
            this.page--;
            if (this.currentPage > this.page) {
                this.currentPage = this.page;
            }
            this.setPage(this.currentPage);
        }

        return this;
    }

    /**
     * Appends this matrix to the left of all previously applied matrices.
     *
     * @param {Matrix} matrix
     * @function
     * @returns {jsPDF}
     * @memberof jsPDF#
     * @name setCurrentTransformationMatrix
     */
    public setCurrentTransformationMatrix(matrix) {
        this.out(matrix.toString() + ' cm');
        return this;
    }

    /**
     * Generate the PDF document
     * @return pdf document as a string
     */
    public output(): string {
        const content: string[] = [];
        this.resetDocument();
        this.setOutputDestination(content);

        this.events.publish('buildDocument');

        this.putHeader();
        this.putPages();
        this.putAdditionalObjects();
        this.putResources();
        this.putInfo();
        this.putCatalog();

        const offsetOfXRef = this.contentLength;
        this.putXRef();
        this.putTrailer();
        this.out('startxref');
        this.out('' + offsetOfXRef);
        this.out('%%EOF');

        this.setOutputDestination(this.pages[this.currentPage]);
        return content.join('\n');
    }

    /// protected api ///

    protected setZoomMode(zoom) {
        const validZoomModes = [undefined, null, 'fullwidth', 'fullheight', 'fullpage', 'original'];

        if (/^\d*\.?\d*%$/.test(zoom)) {
            this.zoomMode = zoom;
        } else if (!isNaN(zoom)) {
            this.zoomMode = parseInt(zoom, 10);
        } else if (validZoomModes.indexOf(zoom) !== -1) {
            this.zoomMode = zoom;
        } else {
            throw new Error(
                'zoom must be Integer (e.g. 2), a percentage Value (e.g. 300%) or fullwidth, fullheight, fullpage, original. "' +
                    zoom +
                    '" is not recognized.'
            );
        }
    }

    protected getZoomMode() {
        return this.zoomMode;
    }

    protected setPageMode(pmode) {
        const validPageModes = [
            undefined,
            null,
            'UseNone',
            'UseOutlines',
            'UseThumbs',
            'FullScreen',
        ];

        if (validPageModes.indexOf(pmode) == -1) {
            throw new Error(
                'Page mode must be one of UseNone, UseOutlines, UseThumbs, or FullScreen. "' +
                    pmode +
                    '" is not recognized.'
            );
        }
        this.pageMode = pmode;
    }

    protected getPageMode() {
        return this.pageMode;
    }

    protected setLayoutMode(layout) {
        const validLayoutModes = [
            undefined,
            null,
            'continuous',
            'single',
            'twoleft',
            'tworight',
            'two',
        ];

        if (validLayoutModes.indexOf(layout) == -1) {
            throw new Error(
                'Layout mode must be one of continuous, single, twoleft, tworight. "' +
                    layout +
                    '" is not recognized.'
            );
        }
        this.layoutMode = layout;
    }

    protected getLayoutMode() {
        return this.layoutMode;
    }

    protected newRenderTarget(): RenderTarget {
        const newRenderTarget: RenderTarget = {
            page: this.page,
            currentPage: this.currentPage,
            pages: this.pages.slice(0),
            pagesContext: this.pagesContext.slice(0),
            x: this.pageX,
            y: this.pageY,
            matrix: this.pageMatrix,
            width: this.getPageWidth(this.currentPage),
            height: this.getPageHeight(this.currentPage),
            outputDestination: this.outputDestination,

            id: '', // set by endFormObject()
            objectNumber: -1, // will be set by putXObject()
        };
        return newRenderTarget;
    }

    // pushes current state for a render target
    protected beginNewRenderTarget(x, y, width, height, matrix) {
        const newRenderTarget = this.newRenderTarget();

        // save current state
        this.renderTargetStack.push(newRenderTarget);

        // clear pages
        this.page = this.currentPage = 0;
        this.pages = [];
        this.pageX = x;
        this.pageY = y;

        this.pageMatrix = matrix;

        this.beginPage([width, height], this.orientation);
    }

    protected restoreRenderTarget() {
        const state = this.renderTargetStack.pop();
        this.page = state.page;
        this.currentPage = state.currentPage;
        this.pagesContext = state.pagesContext;
        this.pages = state.pages;
        this.pageX = state.x;
        this.pageY = state.y;
        this.pageMatrix = state.matrix;
        this.setPageWidth(state.currentPage, state.width);
        this.setPageHeight(state.currentPage, state.height);
        this.outputDestination = state.outputDestination;
    }

    protected scale(number: number) {
        return number * this.scaleFactor;
    }

    protected getHorizontalCoordinate(value) {
        return this.scale(value);
    }

    protected getVerticalCoordinate(value) {
        const pageHeight =
            this.pagesContext[this.currentPage].mediaBox.topRightY -
            this.pagesContext[this.currentPage].mediaBox.bottomLeftY;
        return pageHeight - this.scale(value);
    }

    protected getHorizontalCoordinateString(value) {
        return f2(this.getHorizontalCoordinate(value));
    }

    protected getVerticalCoordinateString(value) {
        return f2(this.getVerticalCoordinate(value));
    }

    protected getCurrentPageInfo() {
        return {
            objId: this.pagesContext[this.currentPage].objId,
            pageNumber: this.currentPage,
            pageContext: this.pagesContext[this.currentPage],
        };
    }

    /**
     * Get global value of CharSpace.
     *
     * @function
     * @instance
     * @returns {number} charSpace
     * @memberof jsPDF#
     * @name getCharSpace
     */
    protected getCharSpace() {
        return this.activeCharSpace;
    }

    /**
     * Set global value of CharSpace.
     *
     * @param {number} charSpace
     * @function
     * @instance
     * @returns {jsPDF} jsPDF-instance
     * @memberof jsPDF#
     * @name setCharSpace
     */
    protected setCharSpace(charSpace: number) {
        this.activeCharSpace = charSpace;
        return this;
    }

    protected beginPage(parmFormat: string | number[], orientation: string) {
        let dimensions, width, height;

        if (typeof parmFormat === 'string') {
            dimensions = this.getPageFormat(parmFormat.toLowerCase());
            if (Array.isArray(dimensions)) {
                width = dimensions[0];
                height = dimensions[1];
            }
        }

        if (Array.isArray(parmFormat)) {
            width = parmFormat[0] * this.scaleFactor;
            height = parmFormat[1] * this.scaleFactor;
        }

        if (isNaN(width)) {
            width = this.format[0];
            height = this.format[1];
        }

        if (width > 14400 || height > 14400) {
            console.warn(
                'A page in a PDF can not be wider or taller than 14400 userUnit. jsPDF limits the width/height to 14400'
            );
            width = Math.min(14400, width);
            height = Math.min(14400, height);
        }

        let format = [width, height];

        switch (orientation.substr(0, 1)) {
            case 'l':
                if (height > width) {
                    format = [height, width];
                }
                break;
            case 'p':
                if (width > height) {
                    format = [height, width];
                }
                break;
        }

        ++this.page;
        this.pages[this.page] = [];
        this.pagesContext[this.page] = {
            objId: 0,
            contentsObjId: 0,
            userUnit: Number(this.userUnit),
            artBox: null,
            bleedBox: null,
            cropBox: null,
            trimBox: null,
            mediaBox: {
                bottomLeftX: 0,
                bottomLeftY: 0,
                topRightX: Number(format[0]),
                topRightY: Number(format[1]),
            },
        };
        this.setPage(this.page);
    }

    protected getPageFormat(format: string) {
        return pageFormats[format];
    }

    protected getPageFormats() {
        return pageFormats;
    }

    protected getNumberOfPages() {
        return this.pages.length - 1;
    }

    protected resetDocument() {
        // reset fields relevant for objectNumber generation and xref.
        this.objectNumber = 0;
        this.contentLength = 0;
        this.outputDestination = null;
        this.offsets = [];
        this.additionalObjects = [];

        this.rootDictionaryObjId = this.newObjectDeferred();
        this.resourceDictionaryObjId = this.newObjectDeferred();
    }

    protected newObject(): number {
        const oid = this.newObjectDeferred();
        this.newObjectDeferredBegin(oid, true);
        return oid;
    }

    // Does not output the object. The caller must call newObjectDeferredBegin(oid) before outputing any data
    protected newObjectDeferred() {
        this.objectNumber++;
        const contentLength = this.contentLength;
        this.offsets[this.objectNumber] = () => {
            return contentLength;
        };
        return this.objectNumber;
    }

    protected newObjectDeferredBegin(oid: number, doOutput: boolean) {
        const contentLength = this.contentLength;
        this.offsets[oid] = () => {
            return contentLength;
        };
        if (doOutput) {
            this.out(oid + ' 0 obj');
        }
        return oid;
    }

    // Does not output the object until after the pages have been output.
    // Returns an object containing the objectId and content.
    // All pages have been added so the object ID can be estimated to start right after.
    // This does not modify the current objectNumber;  It must be updated after the newObjects are output.
    protected newAdditionalObject() {
        const objId = this.newObjectDeferred();
        const obj = {
            objId,
            content: '',
        };
        this.additionalObjects.push(obj);
        return obj;
    }

    protected setOutputDestination(destination: string[]) {
        this.outputDestination = destination;
    }

    protected getFilters() {
        return this.filters;
    }

    protected to8bitStream(text: string, flags?) {
        /**
         * PDF 1.3 spec:
         * "For text strings encoded in Unicode, the first two bytes must be 254 followed by
         * 255, representing the Unicode byte order marker, U+FEFF. (This sequence conflicts
         * with the PDFDocEncoding character sequence thorn ydieresis, which is unlikely
         * to be a meaningful beginning of a word or phrase.) The remainder of the
         * string consists of Unicode character codes, according to the UTF-16 encoding
         * specified in the Unicode standard, version 2.0. Commonly used Unicode values
         * are represented as 2 bytes per character, with the high-order byte appearing first
         * in the string."
         *
         * In other words, if there are chars in a string with char code above 255, we
         * recode the string to UCS2 BE - string doubles in length and BOM is prepended.
         *
         * HOWEVER!
         * Actual *content* (body) text (as opposed to strings used in document properties etc)
         * does NOT expect BOM. There, it is treated as a literal GID (Glyph ID)
         *
         * Because of Adobe's focus on "you subset your fonts!" you are not supposed to have
         * a font that maps directly Unicode (UCS2 / UTF16BE) code to font GID, but you could
         * fudge it with "Identity-H" encoding and custom CIDtoGID map that mimics Unicode
         * code page. There, however, all characters in the stream are treated as GIDs,
         * including BOM, which is the reason we need to skip BOM in content text (i.e. that
         * that is tied to a font).
         *
         * To signal this "special" PDFEscape / to8bitStream handling mode,
         * API.text() function sets (unless you overwrite it with manual values
         * given to API.text(.., flags) )
         * flags.autoencode = true
         * flags.noBOM = true
         *
         * ===================================================================================
         * `flags` properties relied upon:
         *   .sourceEncoding = string with encoding label.
         *                     "Unicode" by default. = encoding of the incoming text.
         *                     pass some non-existing encoding name
         *                     (ex: 'Do not touch my strings! I know what I am doing.')
         *                     to make encoding code skip the encoding step.
         *   .outputEncoding = Either valid PDF encoding name
         *                     (must be supported by jsPDF font metrics, otherwise no encoding)
         *                     or a JS object, where key = sourceCharCode, value = outputCharCode
         *                     missing keys will be treated as: sourceCharCode === outputCharCode
         *   .noBOM
         *       See comment higher above for explanation for why this is important
         *   .autoencode
         *       See comment higher above for explanation for why this is important
         */

        let i, l, sourceEncoding, encodingBlock, outputEncoding, newtext, isUnicode, ch, bch;

        flags = flags || {};
        sourceEncoding = flags.sourceEncoding || 'Unicode';
        outputEncoding = flags.outputEncoding;

        // This 'encoding' section relies on font metrics format
        // attached to font objects by, among others,
        // "Willow Systems' standard_font_metrics plugin"
        // see jspdf.plugin.standard_font_metrics.js for format
        // of the font.metadata.encoding Object.
        // It should be something like
        //   .encoding = {'codePages':['WinANSI....'], 'WinANSI...':{code:code, ...}}
        //   .widths = {0:width, code:width, ..., 'fof':divisor}
        //   .kerning = {code:{previous_char_code:shift, ..., 'fof':-divisor},...}
        if (
            (flags.autoencode || outputEncoding) &&
            this.fonts[this.activeFontKey].metadata &&
            this.fonts[this.activeFontKey].metadata[sourceEncoding] &&
            this.fonts[this.activeFontKey].metadata[sourceEncoding].encoding
        ) {
            encodingBlock = this.fonts[this.activeFontKey].metadata[sourceEncoding].encoding;

            // each font has default encoding. Some have it clearly defined.
            if (!outputEncoding && this.fonts[this.activeFontKey].encoding) {
                outputEncoding = this.fonts[this.activeFontKey].encoding;
            }

            // Hmmm, the above did not work? Let's try again, in different place.
            if (!outputEncoding && encodingBlock.codePages) {
                outputEncoding = encodingBlock.codePages[0]; // let's say, first one is the default
            }

            if (typeof outputEncoding === 'string') {
                outputEncoding = encodingBlock[outputEncoding];
            }
            // we want output encoding to be a JS Object, where
            // key = sourceEncoding's character code and
            // value = outputEncoding's character code.
            if (outputEncoding) {
                isUnicode = false;
                newtext = [];
                for (i = 0, l = text.length; i < l; i++) {
                    ch = outputEncoding[text.charCodeAt(i)];
                    if (ch) {
                        newtext.push(String.fromCharCode(ch));
                    } else {
                        newtext.push(text[i]);
                    }

                    // since we are looping over chars anyway, might as well
                    // check for residual unicodeness
                    if (newtext[i].charCodeAt(0) >> 8) {
                        /* more than 255 */
                        isUnicode = true;
                    }
                }
                text = newtext.join('');
            }
        }

        i = text.length;
        // isUnicode may be set to false above. Hence the triple-equal to undefined
        while (isUnicode === undefined && i !== 0) {
            if (text.charCodeAt(i - 1) >> 8) {
                /* more than 255 */
                isUnicode = true;
            }
            i--;
        }
        if (!isUnicode) {
            return text;
        }

        newtext = flags.noBOM ? [] : [254, 255];
        for (i = 0, l = text.length; i < l; i++) {
            ch = text.charCodeAt(i);
            bch = ch >> 8; // divide by 256
            if (bch >> 8) {
                /* something left after dividing by 256 second time */
                throw new Error(
                    'Character at position ' +
                        i +
                        " of string '" +
                        text +
                        "' exceeds 16bits. Cannot be encoded into UCS-2 BE"
                );
            }
            newtext.push(bch);
            newtext.push(ch - (bch << 8));
        }
        return String.fromCharCode.apply(undefined, newtext);
    }

    /**
     * Replace '/', '(', and ')' with pdf-safe versions
     *
     * Doing to8bitStream does NOT make this PDF display unicode text. For that
     * we also need to reference a unicode font and embed it - royal pain in the rear.
     *
     * There is still a benefit to to8bitStream - PDF simply cannot handle 16bit chars,
     * which JavaScript Strings are happy to provide. So, while we still cannot display
     * 2-byte characters property, at least CONDITIONALLY converting (entire string containing)
     * 16bit chars to (USC-2-BE) 2-bytes per char + BOM streams we ensure that entire PDF
     * is still parseable.
     * This will allow immediate support for unicode in document properties strings.
     */
    protected pdfEscape(text: string, flags?) {
        return this.to8bitStream(text, flags)
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)');
    }

    protected clipRuleFromStyle(style: string) {
        switch (style) {
            case 'f':
            case 'F':
                return 'W n';
            case 'f*':
                return 'W* n';
            case 'B':
                return 'W S';
            case 'B*':
                return 'W* S';

            // these two are for compatibility reasons (in the past, calling any primitive method with a shading pattern
            // and "n"/"S" as style would still fill/fill and stroke the path)
            case 'S':
                return 'W S';
            case 'n':
                return 'W n';
        }
    }

    /**
     * Sets a either previously added {@link GState} (via {@link addGState}) or a new {@link GState}.
     * @param {String|GState} gState If type is string, a previously added GState is used, if type is GState
     * it will be added before use.
     * @function
     * @returns {jsPDF}
     * @memberof jsPDF#
     * @name setGState
     */
    protected setGState(gState) {
        if (typeof gState === 'string') {
            gState = this.gStates[this.gStatesMap[gState]];
        } else {
            gState = this.addGState(null, gState);
        }

        if (!gState.equals(this.activeGState)) {
            this.out('/' + gState.id + ' gs');
            this.activeGState = gState;
        }
    }

    /**
     * Adds a new Graphics State. Duplicates are automatically eliminated.
     * @param {String} key Might also be null, if no later reference to this gState is needed
     * @param {Object} gState The gState object
     */
    protected addGState(key: string | null, gState) {
        // only add it if it is not already present (the keys provided by the user must be unique!)
        if (key && this.gStatesMap[key]) {
            return;
        }
        let duplicate = false;
        let s;
        for (s in this.gStates) {
            if (this.gStates.hasOwnProperty(s)) {
                if (this.gStates[s].equals(gState)) {
                    duplicate = true;
                    break;
                }
            }
        }

        if (duplicate) {
            gState = this.gStates[s];
        } else {
            const gStateKey = 'GS' + (Object.keys(this.gStates).length + 1).toString(10);
            this.gStates[gStateKey] = gState;
            gState.id = gStateKey;
        }

        // several user keys may point to the same GState object
        key && (this.gStatesMap[key] = gState.id);

        this.events.publish('addGState', gState);

        return gState;
    }

    /**
     * Adds a new pattern for later use.
     * @param {String} key The key by it can be referenced later. The keys must be unique!
     * @param {API.Pattern} pattern The pattern
     */
    protected addPattern(key: string, pattern: Pattern) {
        // only add it if it is not already present (the keys provided by the user must be unique!)
        if (this.patternMap[key]) {
            return;
        }

        const prefix = pattern instanceof ShadingPattern ? 'Sh' : 'P';
        const patternKey = prefix + (Object.keys(this.patterns).length + 1).toString(10);
        pattern.id = patternKey;

        this.patternMap[key] = patternKey;
        this.patterns[patternKey] = pattern;
        this.events.publish('addPattern', pattern);
    }

    protected clonePattern(srcPattern, patternKey, boundingBox, xStep, yStep, matrix) {
        const clone = new TilingPattern(
            boundingBox || srcPattern.boundingBox,
            xStep || srcPattern.xStep,
            yStep || srcPattern.yStep,
            srcPattern.gState,
            matrix || srcPattern.matrix
        );
        clone.stream = srcPattern.stream;
        const key = patternKey + '$$' + srcPattern.cloneIndex++ + '$$';

        this.addPattern(key, clone);
        return clone;
    }

    protected fillWithPattern(patternData, style) {
        const identityMatrix = new Matrix(1, 0, 0, 1, 0, 0, this.precision);
        let patternId = this.patternMap[patternData.key];
        const pattern = this.patterns[patternId];

        if (pattern instanceof ShadingPattern) {
            this.out('q');

            this.out(this.clipRuleFromStyle(style));

            if (pattern.gState) {
                this.setGState(pattern.gState);
            }
            this.out(patternData.matrix.toString() + ' cm');
            this.out('/' + patternId + ' sh');
            this.out('Q');
        } else if (pattern instanceof TilingPattern) {
            // pdf draws patterns starting at the bottom left corner and they are not affected by the global transformation,
            // so we must flip them
            let matrix = new Matrix(1, 0, 0, -1, 0, this.getPageHeight(), this.precision);

            if (patternData.matrix) {
                matrix = (patternData.matrix || identityMatrix).multiply(matrix);
                // we cannot apply a matrix to the pattern on use so we must abuse the pattern matrix and create new instances
                // for each use
                patternId = this.clonePattern(
                    pattern,
                    patternData.key,
                    patternData.boundingBox,
                    patternData.xStep,
                    patternData.yStep,
                    matrix
                ).id;
            }

            this.out('q');
            this.out('/Pattern cs');
            this.out('/' + patternId + ' scn');

            if (pattern.gState) {
                this.setGState(pattern.gState);
            }

            this.out(style);
            this.out('Q');
        }
    }

    protected putHeader() {
        this.out('%PDF-' + this.getPdfVersion());
        this.out('%\xBA\xDF\xAC\xE0');
    }

    protected putStyle(style, patternKey, patternData) {
        const identityMatrix = new Matrix(1, 0, 0, 1, 0, 0, this.precision);
        if (style === null) {
            return;
        }

        style = this.getStyle(style);

        // stroking / filling / both the path
        if (!patternKey) {
            if (style !== 'n') {
                this.out(style);
            }
            return;
        }

        if (!patternData) {
            patternData = { matrix: identityMatrix };
        }

        if (patternData instanceof Matrix) {
            patternData = { matrix: patternData };
        }

        patternData.key = patternKey;

        patternData || (patternData = identityMatrix);

        this.fillWithPattern(patternData, style);
    }

    protected putPage(page) {
        const pageNumber = page.number;
        const data = page.data;
        const pageObjectNumber = page.objId;
        const pageContentsObjId = page.contentsObjId;

        this.newObjectDeferredBegin(pageObjectNumber, true);
        this.out('<</Type /Page');
        this.out('/Parent ' + page.rootDictionaryObjId + ' 0 R');
        this.out('/Resources ' + page.resourceDictionaryObjId + ' 0 R');
        this.out(
            '/MediaBox [' +
                parseFloat(f2(page.mediaBox.bottomLeftX)) +
                ' ' +
                parseFloat(f2(page.mediaBox.bottomLeftY)) +
                ' ' +
                f2(page.mediaBox.topRightX) +
                ' ' +
                f2(page.mediaBox.topRightY) +
                ']'
        );
        if (page.cropBox !== null) {
            this.out(
                '/CropBox [' +
                    f2(page.cropBox.bottomLeftX) +
                    ' ' +
                    f2(page.cropBox.bottomLeftY) +
                    ' ' +
                    f2(page.cropBox.topRightX) +
                    ' ' +
                    f2(page.cropBox.topRightY) +
                    ']'
            );
        }

        if (page.bleedBox !== null) {
            this.out(
                '/BleedBox [' +
                    f2(page.bleedBox.bottomLeftX) +
                    ' ' +
                    f2(page.bleedBox.bottomLeftY) +
                    ' ' +
                    f2(page.bleedBox.topRightX) +
                    ' ' +
                    f2(page.bleedBox.topRightY) +
                    ']'
            );
        }

        if (page.trimBox !== null) {
            this.out(
                '/TrimBox [' +
                    f2(page.trimBox.bottomLeftX) +
                    ' ' +
                    f2(page.trimBox.bottomLeftY) +
                    ' ' +
                    f2(page.trimBox.topRightX) +
                    ' ' +
                    f2(page.trimBox.topRightY) +
                    ']'
            );
        }

        if (page.artBox !== null) {
            this.out(
                '/ArtBox [' +
                    f2(page.artBox.bottomLeftX) +
                    ' ' +
                    f2(page.artBox.bottomLeftY) +
                    ' ' +
                    f2(page.artBox.topRightX) +
                    ' ' +
                    f2(page.artBox.topRightY) +
                    ']'
            );
        }

        if (typeof page.userUnit === 'number' && page.userUnit !== 1.0) {
            this.out('/UserUnit ' + page.userUnit);
        }

        this.events.publish('putPage', {
            objId: pageObjectNumber,
            pageContext: this.pagesContext[pageNumber],
            pageNumber,
            page: data,
        });
        this.out('/Contents ' + pageContentsObjId + ' 0 R');
        this.out('>>');
        this.out('endobj');
        // Page content
        const pageContent = data.join('\n');
        this.newObjectDeferredBegin(pageContentsObjId, true);
        this.putStream({
            data: pageContent,
            filters: this.getFilters(),
        });
        this.out('endobj');
        return pageObjectNumber;
    }

    protected putStream(options) {
        options = options || {};
        const data = options.data || '';
        let filters = options.filters || this.getFilters();
        const alreadyAppliedFilters = options.alreadyAppliedFilters || [];
        const addLength1 = options.addLength1 || false;
        const valueOfLength1 = data.length;

        if (filters === true) {
            filters = ['FlateEncode'];
        }
        const keyValues = options.additionalKeyValues || [];

        const processedData = DocumentCore.ApplyFilterChain(data, filters);

        const filterAsString =
            processedData.reverseChain +
            (Array.isArray(alreadyAppliedFilters)
                ? alreadyAppliedFilters.join(' ')
                : alreadyAppliedFilters.toString());

        if (processedData.data.length !== 0) {
            keyValues.push({
                key: 'Length',
                value: processedData.data.length,
            });
            if (addLength1 === true) {
                keyValues.push({
                    key: 'Length1',
                    value: valueOfLength1,
                });
            }
        }

        if (filterAsString.length != 0) {
            if (filterAsString.split('/').length - 1 === 1) {
                keyValues.push({
                    key: 'Filter',
                    value: filterAsString,
                });
            } else {
                keyValues.push({
                    key: 'Filter',
                    value: '[' + filterAsString + ']',
                });

                for (let j = 0; j < keyValues.length; j += 1) {
                    if (keyValues[j].key === 'DecodeParms') {
                        const decodeParmsArray = [];

                        for (
                            let i = 0;
                            i < processedData.reverseChain.split('/').length - 1;
                            i += 1
                        ) {
                            decodeParmsArray.push('null');
                        }

                        decodeParmsArray.push(keyValues[j].value);
                        keyValues[j].value = '[' + decodeParmsArray.join(' ') + ']';
                    }
                }
            }
        }

        this.out('<<');
        for (let k = 0; k < keyValues.length; k++) {
            this.out('/' + keyValues[k].key + ' ' + keyValues[k].value);
        }
        this.out('>>');
        if (processedData.data.length !== 0) {
            this.out('stream');
            this.out(processedData.data);
            this.out('endstream');
        }
    }

    protected putPages() {
        let n,
            i,
            pageObjectNumbers = [];

        for (n = 1; n <= this.page; n++) {
            this.pagesContext[n].objId = this.newObjectDeferred();
            this.pagesContext[n].contentsObjId = this.newObjectDeferred();
        }

        for (n = 1; n <= this.page; n++) {
            const pageContext = this.pagesContext[n];
            pageObjectNumbers.push(
                this.putPage({
                    number: n,
                    data: this.pages[n],
                    objId: pageContext.objId,
                    contentsObjId: pageContext.contentsObjId,
                    mediaBox: pageContext.mediaBox,
                    cropBox: pageContext.cropBox,
                    bleedBox: pageContext.bleedBox,
                    trimBox: pageContext.trimBox,
                    artBox: pageContext.artBox,
                    userUnit: pageContext.userUnit,
                    rootDictionaryObjId: this.rootDictionaryObjId,
                    resourceDictionaryObjId: this.resourceDictionaryObjId,
                })
            );
        }
        this.newObjectDeferredBegin(this.rootDictionaryObjId, true);
        this.out('<</Type /Pages');
        let kids = '/Kids [';
        for (i = 0; i < this.page; i++) {
            kids += pageObjectNumbers[i] + ' 0 R ';
        }
        this.out(kids + ']');
        this.out('/Count ' + this.page);
        this.out('>>');
        this.out('endobj');
        this.events.publish('postPutPages');
    }

    protected putAdditionalObjects() {
        this.events.publish('putAdditionalObjects');
        for (let i = 0; i < this.additionalObjects.length; i++) {
            const obj = this.additionalObjects[i];
            this.newObjectDeferredBegin(obj.objId, true);
            this.out(obj.content);
            this.out('endobj');
        }
        this.events.publish('postPutAdditionalObjects');
    }

    protected putFont(font) {
        const pdfEscapeWithNeededParanthesis = (text, flags) => {
            const addParanthesis = text.indexOf(' ') !== -1;
            return addParanthesis
                ? '(' + this.pdfEscape(text, flags) + ')'
                : this.pdfEscape(text, flags);
        };

        this.events.publish('putFont', {
            font,
            out: this.out,
            newObject: this.newObject,
            putStream: this.putStream,
            pdfEscapeWithNeededParanthesis,
        });

        if (font.isAlreadyPutted !== true) {
            font.objectNumber = this.newObject();
            this.out('<<');
            this.out('/Type /Font');
            this.out('/BaseFont /' + pdfEscapeWithNeededParanthesis(font.postScriptName, {}));
            this.out('/Subtype /Type1');
            if (typeof font.encoding === 'string') {
                this.out('/Encoding /' + font.encoding);
            }
            this.out('/FirstChar 32');
            this.out('/LastChar 255');
            this.out('>>');
            this.out('endobj');
        }
    }

    protected putFonts() {
        for (const fontKey in this.fonts) {
            if (this.fonts.hasOwnProperty(fontKey)) {
                if (
                    this.putOnlyUsedFonts === false ||
                    (this.putOnlyUsedFonts === true && this.usedFonts.hasOwnProperty(fontKey))
                ) {
                    this.putFont(this.fonts[fontKey]);
                }
            }
        }
    }

    protected putXObject(xObject) {
        xObject.objectNumber = this.newObject();

        const options = [];
        options.push({ key: 'Type', value: '/XObject' });
        options.push({ key: 'Subtype', value: '/Form' });
        options.push({
            key: 'BBox',
            value:
                '[' +
                [
                    hpf(xObject.x),
                    hpf(xObject.y),
                    hpf(xObject.x + xObject.width),
                    hpf(xObject.y + xObject.height),
                ].join(' ') +
                ']',
        });
        options.push({ key: 'Matrix', value: '[' + xObject.matrix.toString() + ']' });

        const stream = xObject.pages[1].join('\n');
        this.putStream({
            data: stream,
            additionalKeyValues: options,
        });
        this.out('endobj');
    }

    protected putResources() {
        this.putFonts();
        this.putGStates();
        this.putXObjects();
        this.putPatterns();
        this.events.publish('putResources');
        this.putResourceDictionary();
        this.events.publish('postPutResources');
    }

    protected putFontDict() {
        this.out('/Font <<');

        for (const fontKey in this.fonts) {
            if (this.fonts.hasOwnProperty(fontKey)) {
                if (
                    this.putOnlyUsedFonts === false ||
                    (this.putOnlyUsedFonts === true && this.usedFonts.hasOwnProperty(fontKey))
                ) {
                    this.out('/' + fontKey + ' ' + this.fonts[fontKey].objectNumber + ' 0 R');
                }
            }
        }
        this.out('>>');
    }

    protected putShadingPatternDict() {
        if (Object.keys(this.patterns).length > 0) {
            this.out('/Shading <<');
            for (const patternKey in this.patterns) {
                if (
                    this.patterns.hasOwnProperty(patternKey) &&
                    this.patterns[patternKey] instanceof ShadingPattern &&
                    this.patterns[patternKey].objectNumber >= 0
                ) {
                    this.out(
                        '/' + patternKey + ' ' + this.patterns[patternKey].objectNumber + ' 0 R'
                    );
                }
            }

            this.events.publish('putShadingPatternDict');
            this.out('>>');
        }
    }

    protected putTilingPatternDict() {
        if (Object.keys(this.patterns).length > 0) {
            this.out('/Pattern <<');
            for (const patternKey in this.patterns) {
                if (
                    this.patterns.hasOwnProperty(patternKey) &&
                    this.patterns[patternKey] instanceof TilingPattern &&
                    this.patterns[patternKey].objectNumber >= 0
                ) {
                    this.out(
                        '/' + patternKey + ' ' + this.patterns[patternKey].objectNumber + ' 0 R'
                    );
                }
            }
            this.events.publish('putTilingPatternDict');
            this.out('>>');
        }
    }

    protected putXObjects() {
        for (const xObjectKey in this.renderTargets) {
            if (this.renderTargets.hasOwnProperty(xObjectKey)) {
                this.putXObject(this.renderTargets[xObjectKey]);
            }
        }
    }

    protected putPatterns() {
        let patternKey;
        for (patternKey in this.patterns) {
            if (this.patterns.hasOwnProperty(patternKey)) {
                if (this.patterns[patternKey] instanceof ShadingPattern) {
                    this.putShadingPattern(this.patterns[patternKey]);
                } else if (this.patterns[patternKey] instanceof TilingPattern) {
                    this.putTilingPattern(this.patterns[patternKey]);
                }
            }
        }
    }

    protected putShadingPattern(pattern, numberSamples?: number) {
        /*
         Axial patterns shade between the two points specified in coords, radial patterns between the inner
         and outer circle.
         The user can specify an array (colors) that maps t-Values in [0, 1] to RGB colors. These are now
         interpolated to equidistant samples and written to pdf as a sample (type 0) function.
         */
        // The number of color samples that should be used to describe the shading.
        // The higher, the more accurate the gradient will be.
        numberSamples || (numberSamples = 21);
        const funcObjectNumber = this.newObject();
        const stream = interpolateAndEncodeRGBStream(pattern.colors, numberSamples);

        const options = [];
        options.push({ key: 'FunctionType', value: '0' });
        options.push({ key: 'Domain', value: '[0.0 1.0]' });
        options.push({ key: 'Size', value: '[' + numberSamples + ']' });
        options.push({ key: 'BitsPerSample', value: '8' });
        options.push({ key: 'Range', value: '[0.0 1.0 0.0 1.0 0.0 1.0]' });
        options.push({ key: 'Decode', value: '[0.0 1.0 0.0 1.0 0.0 1.0]' });

        this.putStream({
            data: stream,
            additionalKeyValues: options,
            alreadyAppliedFilters: ['/ASCIIHexDecode'],
        });
        this.out('endobj');

        pattern.objectNumber = this.newObject();
        this.out('<< /ShadingType ' + pattern.type);
        this.out('/ColorSpace /DeviceRGB');
        let coords =
            '/Coords [' +
            hpf(parseFloat(pattern.coords[0])) +
            ' ' + // x1
            hpf(parseFloat(pattern.coords[1])) +
            ' '; // y1
        if (pattern.type === 2) {
            // axial
            coords +=
                hpf(parseFloat(pattern.coords[2])) +
                ' ' + // x2
                hpf(parseFloat(pattern.coords[3])); // y2
        } else {
            // radial
            coords +=
                hpf(parseFloat(pattern.coords[2])) +
                ' ' + // r1
                hpf(parseFloat(pattern.coords[3])) +
                ' ' + // x2
                hpf(parseFloat(pattern.coords[4])) +
                ' ' + // y2
                hpf(parseFloat(pattern.coords[5])); // r2
        }
        coords += ']';
        this.out(coords);

        if (pattern.matrix) {
            this.out('/Matrix [' + pattern.matrix.toString() + ']');
        }
        this.out('/Function ' + funcObjectNumber + ' 0 R');
        this.out('/Extend [true true]');
        this.out('>>');
        this.out('endobj');
    }

    protected putTilingPattern(pattern) {
        const resourcesObjectNumber = this.newObject();
        this.putResourceDictionary();
        this.out('endobj');
        pattern.objectNumber = this.newObject();
        const options = [];
        options.push({ key: 'Type', value: '/Pattern' });
        options.push({ key: 'PatternType', value: '1' }); // tiling pattern
        options.push({ key: 'PaintType', value: '1' }); // colored tiling pattern
        options.push({ key: 'TilingType', value: '1' }); // constant spacing
        options.push({ key: 'BBox', value: '[' + pattern.boundingBox.map(hpf).join(' ') + ']' });
        options.push({ key: 'XStep', value: hpf(pattern.xStep) });
        options.push({ key: 'YStep', value: hpf(pattern.yStep) });
        options.push({ key: 'Resources', value: resourcesObjectNumber + ' 0 R' });
        if (pattern.matrix) {
            options.push({ key: 'Matrix', value: '[' + pattern.matrix.toString() + ']' });
        }

        this.putStream({
            data: pattern.stream,
            additionalKeyValues: options,
        });
        this.out('endobj');
    }

    protected putGState(gState) {
        gState.objectNumber = this.newObject();
        this.out('<<');
        for (const p in gState) {
            switch (p) {
                case 'opacity':
                    this.out('/ca ' + f2(gState[p]));
                    break;
                case 'stroke-opacity':
                    this.out('/CA ' + f2(gState[p]));
                    break;
            }
        }
        this.out('>>');
        this.out('endobj');
    }

    protected putGStates() {
        let gStateKey;
        for (gStateKey in this.gStates) {
            if (this.gStates.hasOwnProperty(gStateKey)) {
                this.putGState(this.gStates[gStateKey]);
            }
        }
    }

    protected putXobjectDict() {
        this.out('/XObject <<');
        for (const xObjectKey in this.renderTargets) {
            if (
                this.renderTargets.hasOwnProperty(xObjectKey) &&
                this.renderTargets[xObjectKey].objectNumber >= 0
            ) {
                this.out(
                    '/' + xObjectKey + ' ' + this.renderTargets[xObjectKey].objectNumber + ' 0 R'
                );
            }
        }

        // Loop through images, or other data objects
        this.events.publish('putXobjectDict');
        this.out('>>');
    }

    protected putGStatesDict() {
        if (Object.keys(this.gStates).length > 0) {
            let gStateKey;
            this.out('/ExtGState <<');
            for (gStateKey in this.gStates) {
                if (
                    this.gStates.hasOwnProperty(gStateKey) &&
                    this.gStates[gStateKey].objectNumber >= 0
                ) {
                    this.out('/' + gStateKey + ' ' + this.gStates[gStateKey].objectNumber + ' 0 R');
                }
            }

            this.events.publish('putGStateDict');
            this.out('>>');
        }
    }

    protected putResourceDictionary() {
        this.newObjectDeferredBegin(this.resourceDictionaryObjId, true);
        this.out('<<');
        this.out('/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
        this.putFontDict();
        this.putShadingPatternDict();
        this.putTilingPatternDict();
        this.putGStatesDict();
        this.putXobjectDict();
        this.out('>>');
        this.out('endobj');
    }

    protected putInfo() {
        this.newObject();
        this.out('<<');
        this.out('/Producer (jsPDF 0.0.0)');
        for (const key in this.documentProperties) {
            if (this.documentProperties.hasOwnProperty(key) && this.documentProperties[key]) {
                this.out(
                    '/' +
                        key.substr(0, 1).toUpperCase() +
                        key.substr(1) +
                        ' (' +
                        this.pdfEscape(this.documentProperties[key]) +
                        ')'
                );
            }
        }
        this.out('/CreationDate (' + this.creationDate + ')');
        this.out('>>');
        this.out('endobj');
    }

    protected putCatalog(options?) {
        options = options || {};
        const tmpRootDictionaryObjId = options.rootDictionaryObjId || this.rootDictionaryObjId;
        this.newObject();
        this.out('<<');
        this.out('/Type /Catalog');
        this.out('/Pages ' + tmpRootDictionaryObjId + ' 0 R');
        // PDF13ref Section 7.2.1
        if (!this.zoomMode) {
            this.zoomMode = 'fullwidth';
        }
        switch (this.zoomMode) {
            case 'fullwidth':
                this.out('/OpenAction [3 0 R /FitH null]');
                break;
            case 'fullheight':
                this.out('/OpenAction [3 0 R /FitV null]');
                break;
            case 'fullpage':
                this.out('/OpenAction [3 0 R /Fit]');
                break;
            case 'original':
                this.out('/OpenAction [3 0 R /XYZ null null 1]');
                break;
            default:
                const pcn = '' + this.zoomMode;
                if (pcn.substr(pcn.length - 1) === '%') {
                    this.zoomMode = +this.zoomMode / 100;
                }
                if (typeof this.zoomMode === 'number') {
                    this.out('/OpenAction [3 0 R /XYZ null null ' + f2(this.zoomMode) + ']');
                }
        }
        if (!this.layoutMode) {
            this.layoutMode = 'continuous';
        }
        switch (this.layoutMode) {
            case 'continuous':
                this.out('/PageLayout /OneColumn');
                break;
            case 'single':
                this.out('/PageLayout /SinglePage');
                break;
            case 'two':
            case 'twoleft':
                this.out('/PageLayout /TwoColumnLeft');
                break;
            case 'tworight':
                this.out('/PageLayout /TwoColumnRight');
                break;
        }
        if (this.pageMode) {
            /**
             * A name object specifying how the document should be displayed when opened:
             * UseNone      : Neither document outline nor thumbnail images visible -- DEFAULT
             * UseOutlines  : Document outline visible
             * UseThumbs    : Thumbnail images visible
             * FullScreen   : Full-screen mode, with no menu bar, window controls, or any other window visible
             */
            this.out('/PageMode /' + this.pageMode);
        }
        this.events.publish('putCatalog');
        this.out('>>');
        this.out('endobj');
    }

    protected putXRef() {
        const p = '0000000000';

        this.out('xref');
        this.out('0 ' + (this.objectNumber + 1));
        this.out('0000000000 65535 f');
        for (let i = 1; i <= this.objectNumber; i++) {
            const offset = this.offsets[i];
            if (typeof offset === 'function') {
                this.out((p + offset()).slice(-10) + ' 00000 n');
            } else {
                if (typeof offset !== 'undefined') {
                    this.out((p + offset).slice(-10) + ' 00000 n');
                } else {
                    this.out('0000000000 00000 n');
                }
            }
        }
    }

    protected putTrailer() {
        this.out('trailer');
        this.out('<<');
        this.out('/Size ' + (this.objectNumber + 1));
        this.out('/Root ' + this.objectNumber + ' 0 R');
        this.out('/Info ' + (this.objectNumber - 1) + ' 0 R');
        this.out('/ID [ <' + this.fileId + '> <' + this.fileId + '> ]');
        this.out('>>');
    }

    protected out(str: string) {
        const string = str.toString();
        this.contentLength += string.length + 1;
        this.outputDestination.push(string);
        return this.outputDestination;
    }
}

export default DocumentCore;
export { DocumentCore };
