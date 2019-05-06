import RgbColor from './libs/RgbColor';
import { f2, f3 } from './rounding';

function encodeColorString(options) {
    let color;

    if (typeof options === 'string') {
        options = {
            ch1: options,
        };
    }
    let ch1 = options.ch1;
    let ch2 = options.ch2;
    let ch3 = options.ch3;
    const ch4 = options.ch4;
    const letterArray = options.pdfColorType === 'draw' ? ['G', 'RG', 'K'] : ['g', 'rg', 'k'];

    if (typeof ch1 === 'string' && ch1.charAt(0) !== '#') {
        const rgbColor = new RgbColor(ch1);
        if (rgbColor.ok) {
            ch1 = rgbColor.toHex();
        } else if (!/^\d*\.?\d*$/.test(ch1)) {
            throw new Error('Invalid color "' + ch1 + '" passed to jsPDF.encodeColorString.');
        }
    }
    // convert short rgb to long form
    if (typeof ch1 === 'string' && /^#[0-9A-Fa-f]{3}$/.test(ch1)) {
        ch1 = '#' + ch1[1] + ch1[1] + ch1[2] + ch1[2] + ch1[3] + ch1[3];
    }

    if (typeof ch1 === 'string' && /^#[0-9A-Fa-f]{6}$/.test(ch1)) {
        const hex = parseInt(ch1.substr(1), 16);
        ch1 = (hex >> 16) & 255;
        ch2 = (hex >> 8) & 255;
        ch3 = hex & 255;
    }

    if (typeof ch2 === 'undefined' || (typeof ch4 === 'undefined' && ch1 === ch2 && ch2 === ch3)) {
        // Gray color space.
        if (typeof ch1 === 'string') {
            color = ch1 + ' ' + letterArray[0];
        } else {
            switch (options.precision) {
                case 2:
                    color = f2(ch1 / 255) + ' ' + letterArray[0];
                    break;
                case 3:
                default:
                    color = f3(ch1 / 255) + ' ' + letterArray[0];
            }
        }
    } else if (typeof ch4 === 'undefined' || typeof ch4 === 'object') {
        // assume RGBA
        if (ch4 && !isNaN(ch4.a)) {
            // TODO Implement transparency.
            // WORKAROUND use white for now, if transparent, otherwise handle as rgb
            if (ch4.a === 0) {
                color = ['1.000', '1.000', '1.000', letterArray[1]].join(' ');
                return color;
            }
        }
        // assume RGB
        if (typeof ch1 === 'string') {
            color = [ch1, ch2, ch3, letterArray[1]].join(' ');
        } else {
            switch (options.precision) {
                case 2:
                    color = [f2(ch1 / 255), f2(ch2 / 255), f2(ch3 / 255), letterArray[1]].join(' ');
                    break;
                default:
                case 3:
                    color = [f3(ch1 / 255), f3(ch2 / 255), f3(ch3 / 255), letterArray[1]].join(' ');
            }
        }
    } else {
        // assume CMYK
        if (typeof ch1 === 'string') {
            color = [ch1, ch2, ch3, ch4, letterArray[2]].join(' ');
        } else {
            switch (options.precision) {
                case 2:
                    color = [f2(ch1), f2(ch2), f2(ch3), f2(ch4), letterArray[2]].join(' ');
                    break;
                case 3:
                default:
                    color = [f3(ch1), f3(ch2), f3(ch3), f3(ch4), letterArray[2]].join(' ');
            }
        }
    }
    return color;
}

function decodeColorString(color) {
    let colorEncoded = color.split(' ');
    if (colorEncoded.length === 2 && (colorEncoded[1] === 'g' || colorEncoded[1] === 'G')) {
        // convert grayscale value to rgb so that it can be converted to hex for consistency
        const floatVal = parseFloat(colorEncoded[0]);
        colorEncoded = [floatVal, floatVal, floatVal, 'r'];
    } else if (colorEncoded.length === 5 && (colorEncoded[4] === 'k' || colorEncoded[4] === 'K')) {
        // convert CMYK values to rbg so that it can be converted to hex for consistency
        const red = (1.0 - colorEncoded[0]) * (1.0 - colorEncoded[3]);
        const green = (1.0 - colorEncoded[1]) * (1.0 - colorEncoded[3]);
        const blue = (1.0 - colorEncoded[2]) * (1.0 - colorEncoded[3]);

        colorEncoded = [red, green, blue, 'r'];
    }
    let colorAsRGB = '#';
    for (let i = 0; i < 3; i++) {
        colorAsRGB += ('0' + Math.floor(parseFloat(colorEncoded[i]) * 255).toString(16)).slice(-2);
    }
    return colorAsRGB;
}

export { encodeColorString, decodeColorString };
