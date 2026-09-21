"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteDailyPlanBlock } from "@/lib/actions/planning";
import { useTranslation } from "@/components/i18n/locale-provider";

export function DeleteBlockButton({ blockId }: { blockId: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => deleteDailyPlanBlock(blockId))}
      className="shrink-0 rounded p-1 text-subtle hover:text-critical disabled:opacity-50"
      aria-label={t("Remove block")}
      title={t("Remove from plan")}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
