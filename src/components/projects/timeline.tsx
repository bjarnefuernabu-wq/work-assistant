import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Locale, TranslateFn } from "@/lib/i18n/translate";

interface TimelineMilestone {
  id: string;
  title: string;
  targetDate: Date;
  status: "PLANNED" | "AT_RISK" | "DONE";
}

/**
 * Simple date-axis timeline: a horizontal line from the project start to target date, with
 * milestones plotted proportionally and a "today" marker. Deliberately simple (positions via
 * percentages, no external charting lib) — see ARCHITECTURE.md: written so a full Gantt view
 * can be layered on top of the same Milestone/Task data later without a data model change.
 */
export function ProjectTimeline({
  startDate,
  targetDate,
  milestones,
  t,
  locale,
}: {
  startDate: Date | null;
  targetDate: Date | null;
  milestones: TimelineMilestone[];
  t: TranslateFn;
  locale: Locale;
}) {
  if (!startDate && !targetDate && milestones.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-subtle">{t("No dates set for this project yet.")}</p>;
  }

  const allDates = [
    ...(startDate ? [startDate] : []),
    ...(targetDate ? [targetDate] : []),
    ...milestones.map((m) => m.targetDate),
    new Date(),
  ];
  const min = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const max = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const span = Math.max(max.getTime() - min.getTime(), 86_400_000);

  function pct(date: Date) {
    return Math.min(100, Math.max(0, ((date.getTime() - min.getTime()) / span) * 100));
  }

  const todayPct = pct(new Date());
  const toneClass: Record<TimelineMilestone["status"], string> = {
    PLANNED: "bg-accent border-accent",
    AT_RISK: "bg-critical border-critical",
    DONE: "bg-ok border-ok",
  };

  return (
    <div className="px-4 py-8">
      <div className="relative h-1 rounded-full bg-border-strong">
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-foreground/60"
          style={{ left: `${todayPct}%` }}
          title={t("Today")}
        />
        {milestones.map((m) => (
          <div
            key={m.id}
            className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pct(m.targetDate)}%` }}
          >
            <div className={cn("h-3 w-3 rounded-full border-2 bg-surface", toneClass[m.status])} />
            <div className="absolute top-4 left-1/2 w-max -translate-x-1/2 text-center text-[10px] text-muted opacity-0 transition-opacity group-hover:opacity-100">
              {m.title} — {formatDate(m.targetDate, locale)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-subtle">
        <span>{startDate ? formatDate(startDate, locale) : formatDate(min, locale)}</span>
        <span>{targetDate ? formatDate(targetDate, locale) : formatDate(max, locale)}</span>
      </div>
    </div>
  );
}
