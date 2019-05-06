import { Document } from '../src/index';
import comparePdf from './utils/compare';

describe('Core: Initialization Options', () => {
    it('should make an empty document', () => {
        const doc = new Document();
        comparePdf(doc.output(), 'empty.pdf', 'init');
    });

    it('should make a compressed document', () => {
        const doc = new Document({
            compress: true,
        });
        doc.text('This is a test', 10, 10);
        comparePdf(doc.output(), 'compress.pdf', 'init');
    });

    it('should make a landscape document', () => {
        const doc = new Document({
            orientation: 'landscape',
        });
        doc.text('This is a test!', 10, 10);
        comparePdf(doc.output(), 'landscape.pdf', 'init');
    });

    it('should set document properties', () => {
        const doc = new Document();
        doc.setProperties({
            title: 'Title',
            subject: 'This is the subject',
            author: 'James Hall',
            keywords: 'generated, javascript, parallax',
            creator: 'jsPDF',
        });
        comparePdf(doc.output(), 'properties.pdf', 'init');
    });

    it('should return font list', () => {
        const doc = new Document();
        const fontList = doc.getFontList();
        expect(fontList).toEqual({
            helvetica: ['normal', 'bold', 'italic', 'bolditalic'],
            Helvetica: ['', 'Bold', 'Oblique', 'BoldOblique'],
            courier: ['normal', 'bold', 'italic', 'bolditalic'],
            Courier: ['', 'Bold', 'Oblique', 'BoldOblique'],
            times: ['normal', 'bold', 'italic', 'bolditalic'],
            Times: ['Roman', 'Bold', 'Italic', 'BoldItalic'],
            zapfdingbats: ['normal'],
            ZapfDingbats: [''],
            symbol: ['normal'],
            Symbol: [''],
        });
    });

    const renderBoxes = (doc: Document) => {
        for (let i = 0; i < 100; i++) {
            doc.rect(0, 0, i, i);
        }
    };

    it('should render text 100pt away from the top left', () => {
        const doc = new Document({ unit: 'pt' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'pt.pdf', 'init');
    });

    it('should render text 100mm away from the top left', () => {
        const doc = new Document({ unit: 'mm' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'mm.pdf', 'init');
    });

    it('should render text 100pt away from the top left', () => {
        const doc = new Document({ unit: 'cm' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'cm.pdf', 'init');
    });

    it('should render text 2in away from the top left', () => {
        const doc = new Document({ unit: 'in' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'in.pdf', 'init');
    });

    it('should render text 2px away from the top left', () => {
        const doc = new Document({ unit: 'px' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'px.pdf', 'init');
    });

    it('should render text 2pc away from the top left', () => {
        const doc = new Document({ unit: 'pc' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'pc.pdf', 'init');
    });

    it('should render text 2em away from the top left', () => {
        const doc = new Document({ unit: 'em' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'em.pdf', 'init');
    });

    it('should render text 2ex away from the top left with alternative syntax', () => {
        const doc = new Document({ unit: 'ex' });
        renderBoxes(doc);
        comparePdf(doc.output(), 'ex.pdf', 'init');
    });

    it('getCreationDate', () => {
        const doc = new Document();
        const creationDate = new Date();
        doc.setCreationDate(creationDate);
        expect(doc.getCreationDate('jsDate').getFullYear()).toEqual(creationDate.getFullYear());
        expect(doc.getCreationDate('jsDate').getMonth()).toEqual(creationDate.getMonth());
        expect(doc.getCreationDate('jsDate').getDate()).toEqual(creationDate.getDate());
        expect(doc.getCreationDate('jsDate').getHours()).toEqual(creationDate.getHours());
        expect(doc.getCreationDate('jsDate').getMinutes()).toEqual(creationDate.getMinutes());
        expect(doc.getCreationDate('jsDate').getSeconds()).toEqual(creationDate.getSeconds());
    });

    it('setCreationDate', () => {
        const doc = new Document();
        const creationDate = new Date(1987, 11, 10, 0, 0, 0);
        const pdfDateString = "D:19871210000000+00'00'";
        doc.setCreationDate(pdfDateString);
        expect(doc.getCreationDate('jsDate').getFullYear()).toEqual(creationDate.getFullYear());
        expect(doc.getCreationDate('jsDate').getMonth()).toEqual(creationDate.getMonth());
        expect(doc.getCreationDate('jsDate').getDate()).toEqual(creationDate.getDate());
        expect(doc.getCreationDate('jsDate').getHours()).toEqual(creationDate.getHours());
        expect(doc.getCreationDate('jsDate').getMinutes()).toEqual(creationDate.getMinutes());
        expect(doc.getCreationDate('jsDate').getSeconds()).toEqual(creationDate.getSeconds());
    });
});
