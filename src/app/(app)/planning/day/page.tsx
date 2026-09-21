import Link from "next/link";
import { addDays, format, startOfDay } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatMinutes, formatTime } from "@/lib/utils/format";
import { GenerateDayButton } from "./generate-button";
import { DeleteBlockButton } from "./delete-block-button";
import { cn } from "@/lib/utils/cn";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";
import type { PlanBlockType } from "@/generated/prisma/enums";

const BLOCK_TONE: Record<PlanBlockType, string> = {
  FOCUS: "border-accent/30 bg-accent/5",
  MEETING: "border-border-strong bg-surface-raised",
  BUFFER: "border-border bg-surface",
  TRIAGE: "border-border bg-surface",
  FOLLOWUP: "border-warning/30 bg-warning/5",
  PREP: "border-warning/30 bg-warning/5",
};

const BLOCK_LABEL: Record<PlanBlockType, string> = {
  FOCUS: "FOCUS",
  MEETING: "MEETING",
  BUFFER: "BUFFER",
  TRIAGE: "TRIAGE",
  FOLLOWUP: "FOLLOWUP",
  PREP: "PREP",
};

export default async function DailyPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const day = startOfDay(dateParam ? new Date(dateParam) : new Date());
  const dateStr = format(day, "yyyy-MM-dd");

  const plan = await prisma.dailyPlan.findUnique({
    where: { userId_date: { userId: user.id, date: day } },
    include: { blocks: { orderBy: { order: "asc" }, include: { task: true } } },
  });

  const capacity = plan?.capacityMinutes ?? (user.workHourEnd - user.workHourStart) * 60;
  const planned = plan?.plannedMinutes ?? 0;
  const loadPct = capacity > 0 ? Math.round((planned / capacity) * 100) : 0;
  const dateFnsLocale = locale === "de" ? deLocale : undefined;

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{format(day, "EEEE, MMM d", { locale: dateFnsLocale })}</h1>
          <p className="text-sm text-muted">
            {user.workHourStart}:00–{user.workHourEnd}:00 ·{" "}
            {plan
              ? t("{pct}% scheduled (~{planned} of ~{capacity})", { pct: loadPct, planned: formatMinutes(planned), capacity: formatMinutes(capacity) })
              : t("No plan generated yet")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/planning/day?date=${format(addDays(day, -1), "yyyy-MM-dd")}`}>
            <button className="rounded-md border border-border p-1.5 text-muted hover:text-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </Link>
          <Link href={`/planning/day?date=${format(addDays(day, 1), "yyyy-MM-dd")}`}>
            <button className="rounded-md border border-border p-1.5 text-muted hover:text-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </Link>
          <GenerateDayButton dateStr={dateStr} regenerate={!!plan} />
        </div>
      </div>

      {!plan ? (
        <EmptyState
          icon={Sparkles}
          title={t("No plan for this day yet")}
          description={t(
            "Generate a realistic schedule from your calendar, deadlines, and open tasks — about 70-80% of available time, with buffer left over.",
          )}
        />
      ) : plan.blocks.length === 0 ? (
        <EmptyState title={t("Nothing to schedule")} description={t("No open tasks or events found for this day.")} />
      ) : (
        <div className="max-w-2xl space-y-1.5">
          {plan.blocks.map((b) => (
            <div
              key={b.id}
              className={cn("flex items-center gap-3 rounded-md border px-3.5 py-2.5", BLOCK_TONE[b.type])}
            >
              <span className="w-28 shrink-0 text-xs text-muted">
                {formatTime(b.startTime)}–{formatTime(b.endTime)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">
                  {b.taskId ? (
                    <Link href={`/tasks/${b.taskId}`} className="hover:text-accent">
                      {b.title}
                    </Link>
                  ) : (
                    b.title
                  )}
                </p>
                {b.note && <p className="truncate text-xs text-subtle">{b.note}</p>}
              </div>
              <Badge tone="neutral">{t(BLOCK_LABEL[b.type])}</Badge>
              {b.type !== "MEETING" && <DeleteBlockButton blockId={b.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
