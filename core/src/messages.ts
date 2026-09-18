// Every sentence core writes for a person to read is a code with parameters,
// rendered here in English from messages/en.json (app/README.md § Languages:
// "core's prose is a code, not a sentence"). The English travels beside the
// code — `note`, `detail`, `label` stay in summary.json, the API body and
// the CLI, so a CSV, a script or a reader of the file never needs the app —
// and a surface renders the same code in its own language from
// messages/<locale>.json, falling back to the English core sent. The
// messages are ICU MessageFormat, read by the same library the app renders
// with; a select's branches are whole sentences, so a translator meets a
// sentence, never a clause.
import { IntlMessageFormat } from "intl-messageformat";
import en from "./messages/en.json" with { type: "json" };

type Nest = { [k: string]: string | Nest };
type Paths<T> = T extends string ? "" : { [K in keyof T & string]: Paths<T[K]> extends "" ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];
/** A message id: its dotted path in messages/en.json, less the file's own `_` record. */
export type MessageCode = Paths<Omit<typeof en, "_">>;
export type MessageParams = Record<string, string | number>;
/** What a surface renders in its own language: the code and the values, every value a string or a count. */
export interface Coded { code: MessageCode; params?: MessageParams }

const compiled = new Map<string, IntlMessageFormat>();

/** The English for a code, as summary.json and the API carry it. Throws on a code the file does not have, so a typo cannot ship as a blank. */
export function message(code: MessageCode, params: MessageParams = {}): string {
  const src = code.split(".").reduce<Nest | string | undefined>((o, k) => (typeof o === "object" ? o[k] : undefined), en as unknown as Nest);
  if (typeof src !== "string") throw new Error(`no message for ${code}`);
  let mf = compiled.get(src);
  if (!mf) { mf = new IntlMessageFormat(src, "en-US", undefined, { ignoreTag: true }); compiled.set(src, mf); }
  return mf.format(params) as string;
}

/** A code with its params, and the English it renders to — the pair every note carries. */
export const coded = (code: MessageCode, params?: MessageParams): { message: Coded; text: string } =>
  ({ message: params ? { code, params } : { code }, text: message(code, params) });
