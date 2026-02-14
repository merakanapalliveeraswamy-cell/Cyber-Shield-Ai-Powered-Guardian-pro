import { en } from "./locales/en";
import { hi } from "./locales/hi";
import { bn } from "./locales/bn";
import { te } from "./locales/te";
import { mr } from "./locales/mr";
import { ta } from "./locales/ta";
import { gu } from "./locales/gu";
import { kn } from "./locales/kn";
import { ml } from "./locales/ml";
import { or_ } from "./locales/or";
import { pa } from "./locales/pa";
import { ur } from "./locales/ur";
import type { Language } from "./languages";

export type TranslationKey = keyof typeof en;

const translations: Record<Language, Record<string, string>> = {
  en, hi, bn, te, mr, ta, ur, gu, kn, ml, or: or_, pa,
  as: hi, // Assamese fallback to Hindi
  mai: hi, // Maithili fallback
  sat: en, // Santali fallback
  ks: hi, // Kashmiri fallback
  ne: hi, // Nepali fallback
  sd: ur, // Sindhi fallback to Urdu
  kok: mr, // Konkani fallback to Marathi
  doi: hi, // Dogri fallback
  mni: bn, // Manipuri fallback to Bengali
  brx: hi, // Bodo fallback
  sa: hi, // Sanskrit fallback
};

export { translations };
export type { Language } from "./languages";
