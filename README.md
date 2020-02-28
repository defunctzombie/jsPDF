# jsPDF

**A library to generate PDFs in JavaScript.**

_Typescript type definitions included._

Install with yarn _or_ npm

```bash
yarn add @defunctzombie/jspdf
npm install @defunctzombie/jspdf
```

```typescript
import { Document } from '@defunctzombie/jspdf';
const doc = new Document();

doc.text('Hello world!', 10, 10);
const pdfDocument = doc.output();

console.log(pdfDocument);
```

## Credit

This work builds on top of https://github.com/MrRio/jsPDF.

## License

MIT
