// The copy shape every surface's copy module builds to, and the one
// implementation that reads it (audit D13, decided 2026-09-17 for the
// ICU-MessageFormat migration in app/README.md § Languages).
//
// THE SHAPE. A copy module exports one `copy`: a nest of strings and nothing
// else — no function, no number, no formatter. A leaf is a whole message: a
// sentence, a label, a heading, with its values as named slots ({pay},
// {state}). Where a message has variants, they are an object of whole
// messages keyed by what chooses between them — a CLDR plural category
// (`one`, `other`; `pluralKey(n)`), or a select value the model names
// (`few`/`some`/`most`, `on`/`off`, `named`/`unnamed`) — and the caller
// picks the key: `t(\`x.y.${pluralKey(n)}\`, { n })`. That is the shape a
// locale file can hold: a leaf becomes an ICU message with the same slots,
// a variant object becomes one ICU `plural` or `select` with the same keys,
// the key path becomes the message id, and the code that picks the key is
// the code that will hand ICU its argument.
//
// WHAT THE CODE DOES, NEVER THE COPY. Formatting: every slot value arrives
// formatted — money, a date, a list, a pay figure in the person's unit — by
// lib/format.ts through Intl in LOCALE. Composition: only whole sentences
// are ever joined (with a space, in the order the surface reads them) and
// only lists are ever joined (through Intl.ListFormat); a clause is never a
// slot. A slot may carry another message's rendering only when that message
// is a name or a phrase — a program's, a county's — the way a value would.
//
// THE READER. `fill` puts params into {slots} and throws on a slot left
// unfilled, a param with no slot, so a sentence can never reach the page
// half-filled (the archive's t.ts, design/PORT-FROM-ARCHIVE-2026-09-16.md
// M1); `parts` is the same for a renderer that marks a slot up; `bind`
// gives a module its `t(key, params)` over dotted keys. The readability
// gate (scripts/readability.mjs) walks the same nest.
export const LOCALE = "en-US";

export type Params = Record<string, string | number>;
export type Part = { text: string } | { slot: string; text: string };

/** Fill {slots} in a message; every slot must be given and every param must be a slot. */
export function fill(text: string, params: Params = {}): string {
  const out = text.replace(/\{([A-Za-z]+)\}/g, (_, k: string) => {
    if (!(k in params)) throw new Error(`missing param {${k}} in "${text}"`);
    return String(params[k]);
  });
  for (const k in params) if (!text.includes(`{${k}}`)) throw new Error(`unknown param ${k} for "${text}"`);
  return out;
}

/** A message as parts, each slot its own part, so a renderer can mark a slot up; the same checks as fill(). */
export function parts(text: string, params: Params = {}): Part[] {
  fill(text, params);
  const out: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(/\{([A-Za-z]+)\}/g)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ slot: m[1], text: String(params[m[1]]) });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** The message at a dotted key ("steps.ends") in `copy`, filled; a key that is not a message throws. */
export function bind(copy: object): (key: string, params?: Params) => string {
  return (key, params) => {
    const s = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], copy);
    if (typeof s !== "string") throw new Error(`missing string ${key}`);
    return fill(s, params);
  };
}

const pluralRules = new Intl.PluralRules(LOCALE);
/** The CLDR plural category a count falls in, the key of a plural variant: "one" or "other" in English. */
export const pluralKey = (n: number): "one" | "other" => (pluralRules.select(n) === "one" ? "one" : "other");
