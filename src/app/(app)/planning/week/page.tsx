import Link from "next/link";
import { addDays, format, startOfWeek } from "date-fns";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { computeWeeklyPlanPreview } from "@/lib/actions/planning";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatMinutes } from "@/lib/utils/format";
import { ApplyWeekPlanButton } from "./apply-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export default async function WeeklyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  await requireUser();
  const weekStart = startOfWeek(week ? new Date(week) : new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  const plan = await computeWeeklyPlanPreview(weekStartStr);
  const hasNewAssignments = plan.proposedAssignments.length > 0;

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 4), "MMM d")}
          </h1>
          <p className="text-sm text-muted">
            {hasNewAssignments
              ? `Proposed: ${plan.proposedAssignments.length} unplanned task(s) fit into open capacity this week.`
              : "All open tasks are already planned or don't fit this week."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/review">
            <Button variant="ghost" size="sm">
              Weekly review
            </Button>
          </Link>
          <Link href={`/planning/week?week=${format(addDays(weekStart, -7), "yyyy-MM-dd")}`}>
            <button className="rounded-md border border-border p-1.5 text-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </Link>
          <Link href={`/planning/week?week=${format(addDays(weekStart, 7), "yyyy-MM-dd")}`}>
            <button className="rounded-md border border-border p-1.5 text-muted hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
          {hasNewAssignments && (
            <ApplyWeekPlanButton weekStartStr={weekStartStr} assignments={plan.proposedAssignments} />
          )}
        </div>
      </div>

      {(plan.deadlineRisks.length > 0 || plan.unscheduledImportant.length > 0) && (
        <div className="mb-5 space-y-2">
          {plan.deadlineRisks.map((r) => (
            <div key={r.taskId} className="flex items-center gap-2 rounded-md border border-critical/30 bg-critical/5 px-3 py-2 text-xs text-critical">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span>
                <Link href={`/tasks/${r.taskId}`} className="font-medium hover:underline">
                  {r.title}
                </Link>{" "}
                — due {format(r.dueDate, "MMM d")}. {r.reason}
              </span>
            </div>
          ))}
          {plan.unscheduledImportant
            .filter((u) => !plan.deadlineRisks.some((r) => r.taskId === u.taskId))
            .map((u) => (
              <div key={u.taskId} className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                <span>
                  <Link href={`/tasks/${u.taskId}`} className="font-medium hover:underline">
                    {u.title}
                  </Link>{" "}
                  ({u.priority}) doesn&apos;t fit anywhere in this week&apos;s open capacity.
                </span>
              </div>
            ))}
        </div>
      )}

      <div className="grid grid-cols-5 gap-3">
        {plan.days.map((day) => (
          <Panel
            key={day.date.toISOString()}
            className={cn(day.overloaded && "border-critical/40")}
            title={format(day.date, "EEE d")}
          >
            <div className="px-3.5 py-2.5">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className={cn("text-muted", day.overloaded && "font-medium text-critical")}>
                  {formatMinutes(day.committedMinutes)} / {formatMinutes(day.capacityMinutes)}
                </span>
                {day.overloaded && <Badge tone="critical">Overloaded</Badge>}
              </div>
              <div className="space-y-1">
                {day.meetingMinutes > 0 && (
                  <div className="rounded border border-border bg-surface-raised px-2 py-1 text-[11px] text-muted">
                    {formatMinutes(day.meetingMinutes)} meetings
                  </div>
                )}
                {day.alreadyPlanned.map((t) => (
                  <Link
                    key={t.taskId}
                    href={`/tasks/${t.taskId}`}
                    className="block truncate rounded border border-border px-2 py-1 text-[11px] text-foreground hover:border-accent"
                  >
                    {t.title}
                  </Link>
                ))}
                {day.newlyAssigned.map((t) => (
                  <Link
                    key={t.taskId}
                    href={`/tasks/${t.taskId}`}
                    className="block truncate rounded border border-accent/30 bg-accent/5 px-2 py-1 text-[11px] text-accent hover:border-accent"
                  >
                    {t.title}
                  </Link>
                ))}
                {day.alreadyPlanned.length === 0 && day.newlyAssigned.length === 0 && day.meetingMinutes === 0 && (
                  <p className="px-2 py-1 text-[11px] text-subtle">Nothing planned</p>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
