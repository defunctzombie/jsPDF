import { DocumentCore } from '../DocumentCore';
import { FontEncodingType } from '../types';

declare module '../DocumentCore' {
    // tslint:disable-next-line:interface-name
    interface DocumentCore {
        /**
         * Sets font size for upcoming text elements.
         */
        setFontSize(size: number);

        getFontSize(): number;

        addFonts(arrayOfFonts: string[][]);

        /**
         * Gets text font face, variant for upcoming text elements.
         *
         * @function
         * @instance
         * @returns {Object}
         * @memberof jsPDF#
         * @name getFont
         */
        getFont(fontName?, fontStyle?, options?);

        /**
         * Sets text font face, variant for upcoming text elements.
         * See output of jsPDF.getFontList() for possible font names, styles.
         *
         * @param {string} fontName Font name or family. Example: "times".
         * @param {string} fontStyle Font style or variant. Example: "italic".
         * @function
         * @instance
         * @returns {jsPDF}
         * @memberof jsPDF#
         * @name setFont
         */
        setFont(fontName, fontStyle?);

        setFontType(style);

        addFont(
            postScriptName: string,
            fontName: string,
            fontStyle: string,
            encoding: FontEncodingType,
            isStandardFont: boolean
        );

        /**
         * Switches font style or variant for upcoming text elements,
         * while keeping the font face or family same.
         * See output of jsPDF.getFontList() for possible font names, styles.
         *
         * @param {string} style Font style or variant. Example: "italic".
         * @function
         * @instance
         * @returns {jsPDF}
         * @memberof jsPDF#
         * @deprecated
         * @name setFontStyle
         */
        setFontStyle(style);

        /**
         * Returns a document-specific font key - a label assigned to a
         * font name + font type combination at the time the font was added
         * to the font inventory.
         *
         * Font key is used as label for the desired font for a block of text
         * to be added to the PDF document stream.
         * @protected
         * @function
         * @param fontName {string} can be undefined on "falthy" to indicate "use current"
         * @param fontStyle {string} can be undefined on "falthy" to indicate "use current"
         * @returns {string} Font key.
         * @ignore
         */
        getFontKey(fontName, fontStyle, options?);

        addFontToFontDictionary(font);
    }
}

DocumentCore.prototype.setFontSize = function(this: DocumentCore, size: number) {
    this.activeFontSize = size;
    return this;
};

DocumentCore.prototype.getFontSize = function(this: DocumentCore): number {
    return this.activeFontSize;
};

DocumentCore.prototype.getFont = function(this: DocumentCore, fontName?, fontStyle?, options?) {
    return this.fonts[this.getFontKey(fontName, fontStyle, options)];
};

DocumentCore.prototype.setFont = function(this: DocumentCore, fontName, fontStyle?) {
    this.activeFontKey = this.getFontKey(fontName, fontStyle, {
        disableWarning: false,
    });
    return this;
};

DocumentCore.prototype.setFontType = function(this: DocumentCore, style) {
    return this.setFontStyle(style);
};

DocumentCore.prototype.addFont = function(
    this: DocumentCore,
    postScriptName: string,
    fontName: string,
    fontStyle: string,
    encoding: FontEncodingType = 'Identity-H',
    isStandardFont: boolean = false
): string {
    const font = {
        id: 'F' + (Object.keys(this.fonts).length + 1).toString(10),
        postScriptName,
        fontName,
        fontStyle,
        encoding,
        isStandardFont: isStandardFont || false,
        metadata: {},
    };
    const instance = this;

    this.events.publish('addFont', {
        font,
        instance,
    });

    this.fonts[font.id] = font;
    this.addFontToFontDictionary(font);
    return font.id;
};

DocumentCore.prototype.setFontStyle = function(this: DocumentCore, style) {
    this.activeFontKey = this.getFontKey(undefined, style);
    // if font is not found, the above line blows up and we never go further
    return this;
};

DocumentCore.prototype.addFontToFontDictionary = function(this: DocumentCore, font) {
    this.fontmap[font.fontName] = this.fontmap[font.fontName] || {};
    this.fontmap[font.fontName][font.fontStyle] = font.id;
};

DocumentCore.prototype.getFontKey = function(this: DocumentCore, fontName, fontStyle, options?) {
    let key;
    options = options || {};

    fontName = fontName !== undefined ? fontName : this.fonts[this.activeFontKey].fontName;
    fontStyle = fontStyle !== undefined ? fontStyle : this.fonts[this.activeFontKey].fontStyle;
    const fontNameLowerCase = fontName.toLowerCase();

    if (
        this.fontmap[fontNameLowerCase] !== undefined &&
        this.fontmap[fontNameLowerCase][fontStyle] !== undefined
    ) {
        key = this.fontmap[fontNameLowerCase][fontStyle];
    } else if (
        this.fontmap[fontName] !== undefined &&
        this.fontmap[fontName][fontStyle] !== undefined
    ) {
        key = this.fontmap[fontName][fontStyle];
    } else {
        if (options.disableWarning === false) {
            console.warn(
                "Unable to look up font label for font '" +
                    fontName +
                    "', '" +
                    fontStyle +
                    "'. Refer to getFontList() for available fonts."
            );
        }
    }

    if (!key && !options.noFallback) {
        key = this.fontmap.get('times')[fontStyle];
        if (key == null) {
            key = this.fontmap.get('times').normal;
        }
    }
    return key;
};

DocumentCore.addInitializer(function(this: DocumentCore) {
    this.setFontSize(this.options.fontSize || 16);
});
