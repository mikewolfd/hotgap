// Types for the parts of pdf.mjs a TypeScript proof reads.
export interface PdfObject { dict: string; stream: Buffer | null }
export function pdfObjects(buf: Buffer): Map<number, PdfObject>;
export function pdfPages(objects: Map<number, PdfObject>): PdfObject[];
export function pageContent(objects: Map<number, PdfObject>, page: PdfObject): Buffer;
export function textInks(content: Buffer): string[];
/** A form XObject drawn on a page: its resource name, where its origin landed (CSS px) and the last rectangle filled before it. */
export interface FormDrawn { name: string; x: number; y: number; ground: { x: number; y: number; w: number; h: number; fill: number[] | null } | null }
export function pageHeight(page: PdfObject): number;
export function formsDrawn(content: Buffer, pageHeight: number): FormDrawn[];
export function resource(objects: Map<number, PdfObject>, dict: string, name: string): PdfObject | undefined;
export function reachable(objects: Map<number, PdfObject>, dict: string): PdfObject[];
export function greyRowTransitions(o: PdfObject): number;
