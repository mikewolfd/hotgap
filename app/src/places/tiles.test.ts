import { describe, expect, it } from "vitest";
import { STATE_CODES } from "@hotgap/core";
import { TILE_ORDER, TILES, tileNeighbor } from "./tiles.js";

describe("the cartogram", () => {
  it("has exactly one tile per state core models, no two on the same square, within twelve columns", () => {
    expect(Object.keys(TILES).sort()).toEqual([...STATE_CODES].sort());
    const squares = new Set(Object.values(TILES).map(([r, c]) => `${r},${c}`));
    expect(squares.size).toBe(STATE_CODES.length);
    for (const [, c] of Object.values(TILES)) expect(c).toBeGreaterThanOrEqual(1), expect(c).toBeLessThanOrEqual(12);
  });
  it("reads row by row, left to right", () => {
    expect(TILE_ORDER.slice(0, 4)).toEqual(["AK", "ME", "VT", "NH"]);
    expect(TILE_ORDER[TILE_ORDER.length - 1]).toBe("FL");
  });
  it("arrows: left and right walk the reading order, up and down stay in the column and skip empty rows", () => {
    expect(tileNeighbor("WA", "ArrowUp")).toBe("AK");
    expect(tileNeighbor("ID", "ArrowUp")).toBeNull();
    expect(tileNeighbor("AK", "ArrowDown")).toBe("WA");
    expect(tileNeighbor("TX", "ArrowUp")).toBe("OK");
    expect(tileNeighbor("ME", "ArrowRight")).toBe("VT");
    expect(tileNeighbor("AK", "ArrowLeft")).toBeNull();
    expect(tileNeighbor("FL", "ArrowRight")).toBeNull();
    expect(tileNeighbor("CO", "Home")).toBe("AK");
    expect(tileNeighbor("CO", "End")).toBe("FL");
    expect(tileNeighbor("CO", "Enter")).toBeNull();
    expect(tileNeighbor("XX", "ArrowUp")).toBeNull();
  });
});
