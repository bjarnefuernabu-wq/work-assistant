"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PALETTE_ACTIONS } from "./actions";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/components/i18n/locale-provider";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevOpen, setPrevOpen] = useState(open);
  const router = useRouter();
  const { t } = useTranslation();

  // Reset the query/selection when the palette transitions to open. Adjusting state during
  // render (React's recommended pattern) instead of an effect, since this must happen
  // synchronously before the reset paint, not after.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PALETTE_ACTIONS;
    return PALETTE_ACTIONS.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        t(a.label).toLowerCase().includes(q) ||
        a.group.toLowerCase().includes(q) ||
        t(a.group).toLowerCase().includes(q) ||
        a.keywords?.toLowerCase().includes(q),
    );
  }, [query, t]);

  function execute(index: number) {
    const action = results[index];
    if (!action) return;
    router.push(action.href);
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIndex((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              execute(activeIndex);
            }
          }}
          placeholder={t("Type a command or search…")}
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:outline-none"
        />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-subtle">{t("No matches")}</div>
          )}
          {results.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => execute(i)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm",
                  i === activeIndex ? "bg-surface-raised text-foreground" : "text-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{t(action.label)}</span>
                <span className="ml-auto text-[10px] text-subtle">{t(action.group)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
