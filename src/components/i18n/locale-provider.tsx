"use client";

import { createContext, useContext, useMemo } from "react";
import { translate, type Locale, type TranslateFn } from "@/lib/i18n/translate";

const LocaleContext = createContext<{ locale: Locale; t: TranslateFn }>({
  locale: "en",
  t: (key) => key,
});

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(
    () => ({ locale, t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useTranslation() {
  return useContext(LocaleContext);
}
