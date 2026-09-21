"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateDailyPlanAction } from "@/lib/actions/planning";
import { useTranslation } from "@/components/i18n/locale-provider";

export function GenerateDayButton({ dateStr, regenerate }: { dateStr: string; regenerate: boolean }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();

  return (
    <Button
      variant="primary"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => generateDailyPlanAction(dateStr))}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {pending ? t("Planning…") : regenerate ? t("Regenerate") : t("Plan my day")}
    </Button>
  );
}
