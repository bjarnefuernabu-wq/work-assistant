"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteDailyPlanBlock } from "@/lib/actions/planning";

export function DeleteBlockButton({ blockId }: { blockId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteDailyPlanBlock(blockId))}
      className="shrink-0 rounded p-1 text-subtle hover:text-critical disabled:opacity-50"
      aria-label="Remove block"
      title="Remove from plan"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
