/**
 * @license
 * Copyright (c) 2014 Steven Spungin (TwelveTone LLC)  steven@twelvetone.tv
 *
 * Licensed under the MIT License.
 * http://opensource.org/licenses/mit-license
 */

import DocumentCore from '../DocumentCore';

interface Annotation {
    type: 'text' | 'freetext' | 'link';
    title?: string;
    bounds: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    contents: string;
    open?: boolean;
    color?: string;
    name?: string;
    top?: number;
    pageNumber?: number;
}

declare module '../DocumentCore' {
    interface DocumentCore {
        createAnnotation(options: Annotation): void;
        link(x: number, y: number, w: number, h: number, options: any): void;
        textWithLink(text: string, x: number, y: number, options: any): number;
    }
}

/**
 * jsPDF Annotations PlugIn
 *
 * There are many types of annotations in a PDF document. Annotations are placed
 * on a page at a particular location. They are not 'attached' to an object.
 * <br />
 * This plugin current supports <br />
 * <li> Goto Page (set pageNumber and top in options)
 * <li> Goto Name (set name and top in options)
 * <li> Goto URL (set url in options)
 * <p>
 * 	The destination magnification factor can also be specified when goto is a page number or a named destination. (see documentation below)
 *  (set magFactor in options).  XYZ is the default.
 * </p>
 * <p>
 *  Links, Text, Popup, and FreeText are supported.
 * </p>
 * <p>
 * Options In PDF spec Not Implemented Yet
 * <li> link border
 * <li> named target
 * <li> page coordinates
 * <li> destination page scaling and layout
 * <li> actions other than URL and GotoPage
 * <li> background / hover actions
 * </p>
 * @name annotations
 * @module
 */

/*
    Destination Magnification Factors
    See PDF 1.3 Page 386 for meanings and options

    [supported]
	XYZ (options; left top zoom)
	Fit (no options)
	FitH (options: top)
	FitV (options: left)

	[not supported]
	FitR
	FitB
	FitBH
	FitBV
 */

const notEmpty = function(obj) {
    if (typeof obj != 'undefined') {
        if (obj != '') {
            return true;
        }
    }
};

DocumentCore.addInitializer(function(this: DocumentCore) {
    this.events.subscribe('addPage', (addPageData) => {
        const pageInfo = this.getPageInfo(addPageData.pageNumber);
        pageInfo.pageContext.annotations = [];
    });

    this.events.subscribe('putPage', (putPageData) => {
        const pageInfo = this.getPageInfoByObjId(putPageData.objId);
        const pageAnnos = putPageData.pageContext.annotations;

        let anno, rect, line;
        let found = false;
        for (let a = 0; a < pageAnnos.length && !found; a++) {
            anno = pageAnnos[a];
            switch (anno.type) {
                case 'link':
                    if (notEmpty(anno.options.url) || notEmpty(anno.options.pageNumber)) {
                        found = true;
                    }
                    break;
                case 'reference':
                case 'text':
                case 'freetext':
                    found = true;
                    break;
            }
        }
        if (found == false) {
            return;
        }

        this.out('/Annots [');
        for (let i = 0; i < pageAnnos.length; i++) {
            anno = pageAnnos[i];

            switch (anno.type) {
                case 'reference':
                    // References to Widget Annotations (for AcroForm Fields)
                    this.out(' ' + anno.object.objId + ' 0 R ');
                    break;
                case 'text':
                    // Create a an object for both the text and the popup
                    const objText = this.newAdditionalObject();
                    const objPopup = this.newAdditionalObject();

                    const title = anno.title || 'Note';
                    rect =
                        '/Rect [' +
                        this.getHorizontalCoordinateString(anno.bounds.x) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.bounds.y + anno.bounds.h) +
                        ' ' +
                        this.getHorizontalCoordinateString(anno.bounds.x + anno.bounds.w) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.bounds.y) +
                        '] ';
                    line =
                        '<</Type /Annot /Subtype /' +
                        'Text' +
                        ' ' +
                        rect +
                        '/Contents (' +
                        anno.contents +
                        ')';
                    line += ' /Popup ' + objPopup.objId + ' 0 R';
                    line += ' /P ' + pageInfo.objId + ' 0 R';
                    line += ' /T (' + title + ') >>';
                    objText.content = line;

                    const parent = objText.objId + ' 0 R';
                    const popoff = 30;
                    rect =
                        '/Rect [' +
                        this.getHorizontalCoordinateString(anno.bounds.x + popoff) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.bounds.y + anno.bounds.h) +
                        ' ' +
                        this.getHorizontalCoordinateString(anno.bounds.x + anno.bounds.w + popoff) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.bounds.y) +
                        '] ';
                    line =
                        '<</Type /Annot /Subtype /' + 'Popup' + ' ' + rect + ' /Parent ' + parent;
                    if (anno.open) {
                        line += ' /Open true';
                    }
                    line += ' >>';
                    objPopup.content = line;

                    this.out([objText.objId, '0 R', objPopup.objId, '0 R'].join(' '));

                    break;
                case 'freetext':
                    rect =
                        '/Rect [' +
                        this.getHorizontalCoordinateString(anno.bounds.x) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.bounds.y) +
                        ' ' +
                        this.getHorizontalCoordinateString(anno.bounds.x + anno.bounds.w) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.bounds.y + anno.bounds.h) +
                        '] ';
                    const color = anno.color || '#000000';
                    line =
                        '<</Type /Annot /Subtype /' +
                        'FreeText' +
                        ' ' +
                        rect +
                        '/Contents (' +
                        anno.contents +
                        ')';
                    line +=
                        ' /DS(font: Helvetica,sans-serif 12.0pt; text-align:left; color:#' +
                        color +
                        ')';
                    line += ' /Border [0 0 0]';
                    line += ' >>';
                    this.out(line);
                    break;
                case 'link':
                    if (!anno.options.top) {
                        anno.options.top = 0;
                    }

                    rect =
                        '/Rect [' +
                        this.getHorizontalCoordinateString(anno.x) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.y) +
                        ' ' +
                        this.getHorizontalCoordinateString(anno.x + anno.w) +
                        ' ' +
                        this.getVerticalCoordinateString(anno.y + anno.h) +
                        '] ';

                    line = '';
                    if (anno.options.url) {
                        line =
                            '<</Type /Annot /Subtype /Link ' +
                            rect +
                            '/Border [0 0 0] /A <</S /URI /URI (' +
                            anno.options.url +
                            ') >>';
                    } else if (anno.options.pageNumber) {
                        // first page is 0
                        const info = this.getPageInfo(anno.options.pageNumber);
                        line =
                            '<</Type /Annot /Subtype /Link ' +
                            rect +
                            '/Border [0 0 0] /Dest [' +
                            info.objId +
                            ' 0 R';
                        anno.options.magFactor = anno.options.magFactor || 'XYZ';
                        switch (anno.options.magFactor) {
                            case 'Fit':
                                line += ' /Fit]';
                                break;
                            case 'FitH':
                                line += ' /FitH ' + anno.options.top + ']';
                                break;
                            case 'FitV':
                                anno.options.left = anno.options.left || 0;
                                line += ' /FitV ' + anno.options.left + ']';
                                break;
                            case 'XYZ':
                            default:
                                const top = this.getVerticalCoordinateString(anno.options.top);
                                anno.options.left = anno.options.left || 0;
                                // 0 or null zoom will not change zoom factor
                                if (typeof anno.options.zoom === 'undefined') {
                                    anno.options.zoom = 0;
                                }
                                line +=
                                    ' /XYZ ' +
                                    anno.options.left +
                                    ' ' +
                                    top +
                                    ' ' +
                                    anno.options.zoom +
                                    ']';
                                break;
                        }
                    }

                    if (line != '') {
                        line += ' >>';
                        this.out(line);
                    }
                    break;
            }
        }
        this.out(']');
    });
});

/**
 * @name createAnnotation
 * @function
 * @param {Object} options
 */
DocumentCore.prototype.createAnnotation = function(this: DocumentCore, options) {
    const pageInfo = this.getCurrentPageInfo();
    switch (options.type) {
        case 'link':
            this.link(
                options.bounds.x,
                options.bounds.y,
                options.bounds.w,
                options.bounds.h,
                options
            );
            break;
        case 'text':
        case 'freetext':
            pageInfo.pageContext.annotations.push(options);
            break;
    }
};

/**
 * Create a link
 *
 * valid options
 * <li> pageNumber or url [required]
 * <p>If pageNumber is specified, top and zoom may also be specified</p>
 * @name link
 * @function
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {Object} options
 */
DocumentCore.prototype.link = function(this: DocumentCore, x, y, w, h, options) {
    const pageInfo = this.getCurrentPageInfo();
    pageInfo.pageContext.annotations.push({
        x,
        y,
        w,
        h,
        options,
        type: 'link',
    });
};

/**
 * Currently only supports single line text.
 * Returns the width of the text/link
 *
 * @name textWithLink
 * @function
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {Object} options
 * @returns {number} width the width of the text/link
 */
DocumentCore.prototype.textWithLink = function(this: DocumentCore, text, x, y, options) {
    const width = this.getTextWidth(text);
    const height = this.getLineHeight() / this.scaleFactor;
    this.text(text, x, y, options);
    // TODO We really need the text baseline height to do this correctly.
    // Or ability to draw text on top, bottom, center, or baseline.
    y += height * 0.2;
    this.link(x, y - height, width, height, options);
    return width;
};
