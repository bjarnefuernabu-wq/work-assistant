"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { applyWeeklyPlan } from "@/lib/actions/planning";
import { useTranslation } from "@/components/i18n/locale-provider";

export function ApplyWeekPlanButton({
  weekStartStr,
  assignments,
}: {
  weekStartStr: string;
  assignments: { taskId: string; plannedDate: Date }[];
}) {
  const { t } = useTranslation();
  return (
    <ConfirmButton
      variant="secondary"
      label={t("Apply this plan")}
      confirmLabel={t("Confirm & schedule")}
      description={t("This will set a planned date on {n} task(s) as shown above.", { n: assignments.length })}
      onConfirm={() =>
        applyWeeklyPlan(
          weekStartStr,
          assignments.map((a) => ({ taskId: a.taskId, plannedDate: new Date(a.plannedDate).toISOString() })),
        )
      }
    />
  );
}
