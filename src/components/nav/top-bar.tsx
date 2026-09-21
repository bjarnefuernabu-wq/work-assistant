"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { useTranslation } from "@/components/i18n/locale-provider";

export function TopBar({ userName }: { userName: string }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-7 w-64 items-center gap-2 rounded-md border border-border bg-surface-raised px-2.5 text-xs text-subtle hover:border-border-strong"
      >
        {t("Search or run a command…")}
        <kbd className="ml-auto rounded border border-border px-1 font-mono">⌘K</kbd>
      </button>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted">{userName}</span>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-1 text-xs text-subtle hover:text-foreground"
            title={t("Sign out")}
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          </button>
        </form>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </header>
  );
}
