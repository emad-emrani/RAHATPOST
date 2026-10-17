import builtin from "./dict.json";

/** Built-in dictionary (server only): Arabic UI string → { he, en, … }. */
export const BUILTIN_DICT = builtin as Record<string, Record<string, string>>;
export const UI_KEYS = Object.keys(BUILTIN_DICT);
