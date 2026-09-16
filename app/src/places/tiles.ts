// The tile cartogram's layout (charts.md § 2): 51 equal squares, one per
// state including DC, each in roughly its geographic place on a 12-column
// grid. Equal area is the point — these are 51 sets of rules, not 51 land
// masses. This is layout, not data: the states themselves come from the
// sweep, and tiles.test.ts checks the two agree.
export const TILES: Record<string, readonly [row: number, col: number]> = {
  AK: [1, 1], ME: [1, 12], VT: [2, 11], NH: [2, 12],
  WA: [3, 1], ID: [3, 2], MT: [3, 3], ND: [3, 4], MN: [3, 5], IL: [3, 6], WI: [3, 7], MI: [3, 8], NY: [3, 9], MA: [3, 10],
  OR: [4, 1], NV: [4, 2], WY: [4, 3], SD: [4, 4], IA: [4, 5], IN: [4, 6], OH: [4, 7], PA: [4, 8], NJ: [4, 9], CT: [4, 10], RI: [4, 11],
  CA: [5, 1], UT: [5, 2], CO: [5, 3], NE: [5, 4], MO: [5, 5], KY: [5, 6], WV: [5, 7], VA: [5, 8], MD: [5, 9], DE: [5, 10],
  AZ: [6, 2], NM: [6, 3], KS: [6, 4], AR: [6, 5], TN: [6, 6], NC: [6, 7], SC: [6, 8], DC: [6, 9],
  OK: [7, 4], LA: [7, 5], MS: [7, 6], AL: [7, 7], GA: [7, 8],
  HI: [8, 1], TX: [8, 4], FL: [8, 9],
};

/** Postal codes in reading order — row by row, left to right — for the roving tab stop. */
export const TILE_ORDER: readonly string[] = Object.keys(TILES).sort((a, b) => TILES[a][0] - TILES[b][0] || TILES[a][1] - TILES[b][1]);

/**
 * The tile an arrow key lands on. Left and right walk the reading order, so
 * they never dead-end; up and down stay in the column and skip empty rows,
 * so from Washington "up" is Alaska and from Idaho "up" is nowhere. Home and
 * End are the first and last tile. Null means "stay".
 */
export function tileNeighbor(st: string, key: string): string | null {
  const i = TILE_ORDER.indexOf(st);
  if (i < 0) return null;
  if (key === "Home") return TILE_ORDER[0];
  if (key === "End") return TILE_ORDER[TILE_ORDER.length - 1];
  if (key === "ArrowLeft" || key === "ArrowRight") return TILE_ORDER[i + (key === "ArrowRight" ? 1 : -1)] ?? null;
  if (key === "ArrowUp" || key === "ArrowDown") {
    const [row, col] = TILES[st];
    const dir = key === "ArrowDown" ? 1 : -1;
    let best: string | null = null;
    for (const other of TILE_ORDER) {
      const [r, c] = TILES[other];
      if (c === col && (r - row) * dir > 0 && (best === null || Math.abs(r - row) < Math.abs(TILES[best][0] - row))) best = other;
    }
    return best;
  }
  return null;
}
