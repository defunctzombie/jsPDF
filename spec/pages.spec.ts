import { Document } from '../src/index';
import comparePdf from './utils/compare';

describe('Core: Paging', () => {
    it('should add new page', () => {
        const doc = new Document();
        doc.addPage();
        doc.addPage();
        doc.text('Text that will end up on page 3', 20, 20);
        doc.setPage(1);
        doc.text('Text that will end up on page 1', 20, 20);
        doc.setPage(2);
        doc.text('Text that will end up on page 2', 20, 20);

        comparePdf(doc.output(), '3pages.pdf', 'pages');
    });

    // @TODO: Document
    it('should insert new page at the beginning', () => {
        const doc = new Document();
        doc.text('Text that will end up on page 2', 20, 20);
        doc.addPage();
        doc.text('Text that will end up on page 3', 20, 20);
        doc.insertPage(1);
        doc.text('Text that will end up on page 1', 20, 20);

        comparePdf(doc.output(), '3pages.pdf', 'pages');
    });

    // @TODO: Document
    it('should insert new page in the middle', () => {
        const doc = new Document();
        doc.text('Text that will end up on page 1', 20, 20);
        doc.addPage();
        doc.text('Text that will end up on page 3', 20, 20);
        doc.insertPage(2);
        doc.text('Text that will end up on page 2', 20, 20);

        comparePdf(doc.output(), '3pages.pdf', 'pages');
    });

    // @TODO: Document
    it('should delete a page in the middle', () => {
        const doc = new Document();
        doc.text('Text that will end up on page 1', 20, 20);
        doc.addPage();
        doc.text('Text that will end up on page 2', 20, 20);
        doc.addPage();
        doc.text('This page is being deleted', 20, 20);
        doc.addPage();
        doc.text('Text that will end up on page 3', 20, 20);
        doc.deletePage(3);
        comparePdf(doc.output(), '3pages.pdf', 'pages');
    });

    // @TODO: Document
    it('should insert two pages and make them swap places 2 to 1', () => {
        const doc = new Document();
        doc.text('Text that will end up on page 2', 20, 20);
        doc.addPage();
        doc.text('Text that will end up on page 1', 20, 20);
        doc.movePage(2, 1);

        comparePdf(doc.output(), '2pages.pdf', 'pages');
    });

    it('should insert two pages and make them swap places 1 to 2', () => {
        const doc = new Document();
        doc.text('Text that will end up on page 2', 20, 20);
        doc.addPage();
        doc.text('Text that will end up on page 1', 20, 20);
        doc.movePage(1, 2);

        comparePdf(doc.output(), '2pages.pdf', 'pages');
    });

    it('portrait mode and landscape mode should not switch', () => {
        const doc = new Document({ orientation: 'landscape' });
        doc.addPage();
        expect(doc.getPageWidth(1)).toEqual(doc.getPageWidth(2));
        expect(doc.getPageHeight(1)).toEqual(doc.getPageHeight(2));
    });
});
