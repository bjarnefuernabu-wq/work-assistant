"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { convertToTask, dismissInboxItem } from "@/lib/actions/inbox";

export function TriageActions({ itemId }: { itemId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex shrink-0 gap-1.5">
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => convertToTask(itemId))}>
        Convert to task
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => dismissInboxItem(itemId))}>
        Dismiss
      </Button>
    </div>
  );
}
