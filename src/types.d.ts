import Matrix from './Matrix';

type Format = string | number[];
type Orientation = 'p' | 'portrait' | 'l' | 'landscape';
type Unit = 'pt' | 'px' | 'in' | 'mm' | 'cm' | 'ex' | 'em' | 'pc';

interface DocumentProperties {
    title?: string;
    subject?: string;
    author?: string;
    keywords?: string;
    creator?: string;
}

interface PageInfo {
    objId: number;
    pageNumber: number;
    pageContext: any;
}

interface DocumentOptions {
    orientation?: Orientation;
    unit?: Unit;
    format?: string | number[];
    putOnlyUsedFonts?: boolean;
    compress?: boolean;
    precision?: number;
    userUnit?: number;
    lineHeightFactor?: number;
    fontSize?: number;
    filters?: string[];
}

interface RenderTarget {
    page: number;
    currentPage: number;
    pages: string[][];
    pagesContext: any;
    x: number;
    y: number;
    matrix: Matrix;
    width: number;
    height: number;
    outputDestination: string[];
    id: string;
    objectNumber: number;
}

type FontEncodingType = 'StandardEncoding' | 'MacRomanEncoding' | 'Identity-H' | 'WinAnsiEncoding';
