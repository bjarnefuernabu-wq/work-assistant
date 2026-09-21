"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { applyWeeklyPlan } from "@/lib/actions/planning";

export function ApplyWeekPlanButton({
  weekStartStr,
  assignments,
}: {
  weekStartStr: string;
  assignments: { taskId: string; plannedDate: Date }[];
}) {
  return (
    <ConfirmButton
      variant="secondary"
      label="Apply this plan"
      confirmLabel="Confirm & schedule"
      description={`This will set a planned date on ${assignments.length} task(s) as shown above.`}
      onConfirm={() =>
        applyWeeklyPlan(
          weekStartStr,
          assignments.map((a) => ({ taskId: a.taskId, plannedDate: new Date(a.plannedDate).toISOString() })),
        )
      }
    />
  );
}
