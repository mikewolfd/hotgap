import strings from "./en.json";

export type StringKey = keyof typeof strings;

export function t(key: StringKey, params?: Record<string, string | number>): string {
  let s: string = strings[key];
  if (s === undefined) throw new Error(`missing string: ${key}`);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (!s.includes(`{${k}}`)) throw new Error(`string ${key} has no {${k}}`);
    s = s.replaceAll(`{${k}}`, String(v));
  }
  const leftover = s.match(/\{[a-zA-Z]+\}/);
  if (leftover) throw new Error(`string ${key} missing param ${leftover[0]}`);
  return s;
}
