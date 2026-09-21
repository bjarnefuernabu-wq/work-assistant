"use client";

import { useTransition } from "react";
import { setGuestLocale } from "@/lib/actions/locale";
import { LOCALES, type Locale } from "@/lib/i18n/translate";
import { cn } from "@/lib/utils/cn";

export function GuestLocaleSwitcher({ current }: { current: Locale }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-1 text-xs text-neutral-500">
      {LOCALES.map((l, i) => (
        <span key={l.value} className="flex items-center gap-1">
          {i > 0 && <span>·</span>}
          <button
            disabled={pending}
            onClick={() => startTransition(() => setGuestLocale(l.value))}
            className={cn("hover:text-neutral-200", l.value === current && "font-medium text-neutral-200")}
          >
            {l.value.toUpperCase()}
          </button>
        </span>
      ))}
    </div>
  );
}
