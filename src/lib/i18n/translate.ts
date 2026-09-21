import { DE } from "./de";

export type Locale = "en" | "de";

export const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "de";
}

/**
 * Flat translation strategy: English UI text is the lookup key, so most components never need
 * a made-up key name — `t("Save changes")` is already self-documenting and falls back to the
 * English string automatically for locale "en" or for any string not yet in the German
 * dictionary. Missing German entries degrade to English rather than showing a blank/broken
 * string. See src/lib/i18n/de.ts for the dictionary.
 */
export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const base = locale === "de" ? (DE[key] ?? key) : key;
  if (!vars) return base;
  return Object.entries(vars).reduce((str, [k, v]) => str.replaceAll(`{${k}}`, String(v)), base);
}

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

export function getT(locale: Locale): TranslateFn {
  return (key, vars) => translate(locale, key, vars);
}
