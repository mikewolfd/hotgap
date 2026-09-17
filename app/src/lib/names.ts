// The name registers (design/inventory.md M3): what the office calls a
// program, which the caseworker and journalist surfaces print and the
// citizen surface names after its plain phrase ("It is called SNAP"); and a
// state's name. Both are `shared.*` in the locale file — a program's acronym
// stays in every language, a state can translate ("Nueva York") — and
// neither is gated: the inventory says a name is the office's. The plain
// phrases are citizen copy (`citizen.program.*`, gated). A page never
// inlines a program phrasing.
import type { ProgramId } from "@hotgap/core";
import { catalog } from "./copy.js";

export const programName = (id: ProgramId): string => catalog.shared.program[id];

/** A state's name in the active language, or the code where the catalog has none. */
export const stateName = (code: string): string => (catalog.shared.state as Record<string, string>)[code] ?? code;
