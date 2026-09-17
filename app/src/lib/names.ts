// The name registers (design/inventory.md M3): what the office calls a
// program, which the caseworker and journalist surfaces print and the
// citizen surface names after its plain phrase ("It is called SNAP"); and a
// state's name. Both are `shared.*` in the locale file — a program's acronym
// stays in every language, a state can translate ("Nueva York") — and
// neither is gated: the inventory says a name is the office's. The plain
// phrases are citizen copy (`citizen.program.*`, gated). A page never
// inlines a program phrasing.
import type { ProgramId } from "@hotgap/core";
import { catalog, fill } from "./copy.js";

export const programName = (id: ProgramId): string => catalog.shared.program[id];

/** A state's name in the active language, or the code where the catalog has none. */
export const stateName = (code: string): string => (catalog.shared.state as Record<string, string>)[code] ?? code;

/*
 * A county's kind, as core's county-names table writes it: 3,007 "County",
 * 78 Puerto Rico "Municipio", 64 Louisiana "Parish", 40 Virginia independent
 * "city" (the Census's lower case), and Alaska's boroughs, census areas and
 * municipalities. The name is a name and stays; the kind is a common noun and
 * the catalog says it (`shared.county.*`). "City" capitalised is not a kind —
 * Carson City is called Carson City — and neither is "District of Columbia":
 * a name the pattern does not match prints as the table has it.
 */
const KINDS = { "County": "county", "Parish": "parish", "Municipio": "municipio", "Municipality": "municipality", "City and Borough": "cityAndBorough", "Borough": "borough", "Census Area": "censusArea", "city": "city" } as const;
const COUNTY_KIND = /^(.+?) (County|Parish|Municipio|Municipality|City and Borough|Borough|Census Area|city)$/;

/** A county as a page names it, in the active language: "El Paso County", "Condado de El Paso". */
export function countyWords(name: string): string {
  const m = COUNTY_KIND.exec(name);
  if (!m) return name;
  return fill((catalog.shared.county as Record<string, string>)[KINDS[m[2] as keyof typeof KINDS]], { name: m[1] });
}

/** A county with no kind at all, for a line too tight to carry one ("Colorado · El Paso"). */
export const countyBare = (name: string): string => COUNTY_KIND.exec(name)?.[1] ?? name;
