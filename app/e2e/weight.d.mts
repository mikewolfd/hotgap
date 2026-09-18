// The two browser functions weight.mjs exports, for a proof that weighs a
// page with the same code the owner runs from the command line.
export interface Weight {
  /** Words in prose, words inside the picture, and the two added up. */
  html: number;
  svg: number;
  total: number;
  /** The first <figure>'s distance from the top of the document, or null when there is none. */
  figureTop: number | null;
  /** How much of the FIRST viewport that figure covers, 0–1 — not how tall it is. */
  figureShare: number;
  figureHeight: number | null;
}
export declare const MEASURE: () => Weight;
export declare const OPEN_ALL: () => void;
