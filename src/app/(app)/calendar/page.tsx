import Link from "next/link";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils/format";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function CalendarPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const dateFnsLocale = locale === "de" ? deLocale : undefined;
  const from = startOfDay(new Date());
  const to = addDays(from, 21);

  const events = await prisma.calendarEvent.findMany({
    where: { userId: user.id, startTime: { gte: from, lte: to } },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { startTime: "asc" },
  });

  const byDay = events.reduce<Record<string, typeof events>>((acc, e) => {
    const key = format(startOfDay(new Date(e.startTime)), "yyyy-MM-dd");
    (acc[key] ??= []).push(e);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort();

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">{t("Calendar")}</h1>
        <p className="text-sm text-muted">{t("Next 21 days · synced from connected calendars (Settings)")}</p>
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t("No upcoming events")}
          description={t("Connect a calendar in Settings and sync to see events here.")}
        />
      ) : (
        <div className="max-w-2xl space-y-4">
          {days.map((key) => {
            const date = new Date(key);
            return (
              <Panel
                key={key}
                title={
                  isSameDay(date, from)
                    ? t("Today — {date}", { date: format(date, "EEE, MMM d", { locale: dateFnsLocale }) })
                    : format(date, "EEEE, MMM d", { locale: dateFnsLocale })
                }
              >
                {byDay[key].map((e) => (
                  <div key={e.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
                    <span className="w-14 shrink-0 text-xs text-muted">{e.isAllDay ? t("All day") : formatTime(e.startTime)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{e.title}</span>
                    {e.project && (
                      <Link href={`/projects/${e.project.id}`} className="shrink-0 text-xs text-subtle hover:text-accent">
                        {e.project.name}
                      </Link>
                    )}
                    {e.requiresPrep && <Badge tone="warning">{t("Prep needed")}</Badge>}
                  </div>
                ))}
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
