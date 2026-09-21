"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { convertToTask, dismissInboxItem } from "@/lib/actions/inbox";
import { useTranslation } from "@/components/i18n/locale-provider";

export function TriageActions({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 gap-1.5">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => convertToTask(itemId))}>
        {t("Convert to task")}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => dismissInboxItem(itemId))}>
        {t("Dismiss")}
      </Button>
    </div>
  );
}
