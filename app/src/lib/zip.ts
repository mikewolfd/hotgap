import table from "../data/zip3-state.json";

export function zipToState(zip: string): string | null {
  if (!/^\d{5}$/.test(zip)) return null;
  return (table as Record<string, string>)[zip.slice(0, 3)] ?? null;
}
