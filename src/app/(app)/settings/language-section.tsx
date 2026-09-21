"use client";

import { useTransition } from "react";
import { setUserLocale } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n/translate";
import { useTranslation } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils/cn";

export function LanguageSection({ current }: { current: Locale }) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {LOCALES.map((l) => (
        <button
          key={l.value}
          disabled={pending}
          onClick={() => startTransition(() => setUserLocale(l.value))}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm",
            l.value === current
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted hover:border-border-strong hover:text-foreground",
          )}
        >
          {l.label}
        </button>
      ))}
      {pending && <span className="self-center text-xs text-subtle">{t("Switching…")}</span>}
    </div>
  );
}
