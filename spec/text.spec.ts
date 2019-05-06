import { Document } from '../src/index';
import comparePdf from './utils/compare';

describe('Core: Standard Text', () => {
    it('should generate blank page', () => {
        const doc = new Document();
        comparePdf(doc.output(), 'blank.pdf', 'text');
    });

    it('should allow text insertion', () => {
        const doc = new Document();
        doc.text('This is a test!', 10, 10);
        comparePdf(doc.output(), 'standard.pdf', 'text');
    });

    it('should allow text insertion at an angle', () => {
        const doc = new Document();
        doc.text('This is a test!', 20, 20, null, 20);
        comparePdf(doc.output(), 'angle.pdf', 'text');
    });

    it('should render different font faces', () => {
        const doc = new Document();

        doc.text('This is the default font.', 20, 20);

        doc.setFont('courier');
        doc.setFontType('normal');
        doc.text('This is courier normal.', 20, 30);

        doc.setFont('times');
        doc.setFontType('italic');
        doc.text('This is times italic.', 20, 40);

        doc.setFont('helvetica');
        doc.setFontType('bold');
        doc.text('This is helvetica bold.', 20, 50);

        doc.setFont('courier');
        doc.setFontType('bolditalic');
        doc.text('This is courier bolditalic.', 20, 60);

        comparePdf(doc.output(), 'font-faces.pdf', 'text');
    });

    it('should support multiple pages', () => {
        const doc = new Document();
        doc.text('Hello world!', 20, 20);
        doc.text('This is client-side JavaScript, pumping out a PDF.', 20, 30);
        doc.addPage();
        doc.text('Do you like that?', 20, 20);
        comparePdf(doc.output(), 'two-page.pdf', 'text');
    });

    it('should support different size fonts', () => {
        const doc = new Document();
        doc.setFontSize(22);
        doc.text('This is a title', 20, 20);

        doc.setFontSize(16);
        doc.text('This is some normal sized text underneath.', 20, 30);
        comparePdf(doc.output(), 'different-sizes.pdf', 'text');
    });

    it('should support multiline text', () => {
        const doc = new Document();
        doc.text(
            `This is a line
break`,
            20,
            20
        );
        comparePdf(doc.output(), 'line-break.pdf', 'text');
    });

    it('should support strokes', () => {
        const doc = new Document();
        doc.text('Stroke on', 20, 20, { stroke: true });
        doc.text('Stroke on', 20, 40, { stroke: true });
        doc.text('Stroke off', 20, 60, { stroke: false });
        doc.text('Stroke on', 20, 80, { stroke: true });

        comparePdf(doc.output(), 'stroke.pdf', 'text');
    });

    it('should display two red lines of text by rgb', () => {
        const doc = new Document();
        doc.setTextColor('#FF0000');
        doc.text('Red on', 20, 20);
        doc.setTextColor(255, 0, 0);
        doc.text('Red on', 20, 40);

        comparePdf(doc.output(), 'color.pdf', 'text');
    });

    it('should display two red lines of text by colorname', () => {
        const doc = new Document();
        doc.setTextColor('red');
        doc.text('Red on', 20, 20);
        doc.setTextColor(255, 0, 0);
        doc.text('Red on', 20, 40);

        comparePdf(doc.output(), 'color.pdf', 'text');
    });

    it('should display one line of red, one black by rgb', () => {
        const doc = new Document();
        doc.setTextColor('#FF0000');
        doc.text('Red', 20, 20);
        doc.setTextColor('#000000');
        doc.text('Black', 20, 40);

        comparePdf(doc.output(), 'red-black.pdf', 'text');
    });

    it('should display one line of red, one black by colorname', () => {
        const doc = new Document();
        doc.setTextColor('red');
        doc.text('Red', 20, 20);
        doc.setTextColor('black');
        doc.text('Black', 20, 40);

        comparePdf(doc.output(), 'red-black.pdf', 'text');
    });

    it('should display alternating styles when using getter functions', () => {
        const doc = new Document();
        doc.setTextColor('#FF0000');
        doc.setFontSize(20);
        doc.text('Red', 20, 20);
        {
            const previousColor = doc.getTextColor();
            const previousSize = doc.getFontSize();
            doc.setTextColor('#000000');
            doc.setFontSize(10);
            doc.text('Black', 20, 40);
            doc.setTextColor(previousColor);
            doc.setFontSize(previousSize);
            doc.text('Red', 20, 60);
            // test grayscale and text styles
            doc.setTextColor(200);
            doc.setFontType('bold');
            doc.text('Bold Gray', 20, 80);
        }
        {
            const previousColor = doc.getTextColor();
            const previousStyle = doc.getFont().fontStyle;
            doc.setTextColor(155);
            doc.setFontType('italic');
            doc.text('Italic Dark Gray', 20, 100);
            doc.setTextColor(previousColor);
            doc.setFontType(previousStyle);
            doc.text('Bold Gray', 20, 120);
        }
        comparePdf(doc.output(), 'alternating-text-styling.pdf', 'text');
    });

    // @TODO: Document alignment
    it('should center align text', () => {
        const doc = new Document();
        doc.setFont('times');
        doc.setFontType('normal');
        doc.text('This is centred text.', 105, 80, { align: 'center' });
        doc.text('And a little bit more underneath it.', 105, 90, { align: 'center' });
        doc.text('This is right aligned text', 200, 100, { align: 'right' });
        doc.text('And some more', 200, 110, { align: 'right' });
        doc.text('Back to left', 20, 120);

        comparePdf(doc.output(), 'alignment.pdf', 'text');
    });
});
