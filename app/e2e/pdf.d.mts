// Types for the parts of pdf.mjs a TypeScript proof reads.
export interface PdfObject { dict: string; stream: Buffer | null }
export function pdfObjects(buf: Buffer): Map<number, PdfObject>;
export function pdfPages(objects: Map<number, PdfObject>): PdfObject[];
export function pageContent(objects: Map<number, PdfObject>, page: PdfObject): Buffer;
export function textInks(content: Buffer): string[];
