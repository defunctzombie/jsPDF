import { Document } from '../src/index';

describe('Module: Filters', () => {
    it('ASCIIHexDecode', () => {
        expect(Document.ApplyFilterChain('61 62 2e6364 65', 'ASCIIHexDecode').data).toEqual(
            'ab.cde'
        );
        expect(Document.ApplyFilterChain('61 62 2e6364 657>', 'ASCIIHexDecode').data).toEqual(
            'ab.cdep'
        );
        expect(Document.ApplyFilterChain('7>', 'ASCIIHexDecode').data).toEqual('p');
        expect(Document.ApplyFilterChain('eRROR', 'ASCIIHexDecode').data).toEqual('');
    });

    it('ASCIIHexEncode', () => {
        expect(Document.ApplyFilterChain('ab.cde', 'ASCIIHexEncode').data).toEqual('61622e636465>');
        expect(Document.ApplyFilterChain('ab.cdep', 'ASCIIHexEncode').data).toEqual(
            '61622e63646570>'
        );
        expect(Document.ApplyFilterChain('p', 'ASCIIHexEncode').data).toEqual('70>');
    });

    it('ASCII85Encode', () => {
        expect(Document.ApplyFilterChain('Man is distinguished', 'ASCII85Encode').data).toEqual(
            '9jqo^BlbD-BleB1DJ+*+F(f,q~>'
        );
    });

    it('ASCII85Decode', () => {
        expect(Document.ApplyFilterChain('E,9)oF*2M7/c~>', 'ASCII85Decode').data).toEqual(
            'pleasure.'
        );
        expect(Document.ApplyFilterChain('E,9  )oF*2M  7/c~>', 'ASCII85Decode').data).toEqual(
            'pleasure.'
        );
    });

    it('Invalid', () => {
        expect(() => {
            Document.ApplyFilterChain('Man is distinguished', ['invalid']);
        }).toThrow(new Error('The filter: "invalid" is not implemented'));
    });

    it('FlateEncode', () => {
        expect(
            Document.ApplyFilterChain('Man is distinguished', ['FlateEncode', 'ASCIIHexEncode'])
                .data
        ).toEqual('789cf34dcc53c82c5648c92c2ec9cc4b2fcd2cce484d0100ad079c4c>');
    });
});
