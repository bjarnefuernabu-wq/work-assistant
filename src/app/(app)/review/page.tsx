import Link from "next/link";
import { format } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { buildWeeklyReview } from "@/lib/briefing/weekly-review";
import { Panel, EmptyState } from "@/components/ui/panel";
import { formatDate } from "@/lib/utils/format";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function WeeklyReviewPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const dateFnsLocale = locale === "de" ? deLocale : undefined;
  const review = await buildWeeklyReview(user.id);

  return (
    <div className="max-w-3xl p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">{t("Weekly Review")}</h1>
        <p className="text-sm text-muted">
          {format(review.weekStart, "MMM d", { locale: dateFnsLocale })} – {format(review.weekEnd, "MMM d", { locale: dateFnsLocale })}
        </p>
      </div>

      <div className="space-y-5">
        <Panel title={t("Completed ({n})", { n: review.completedTasks.length })}>
          {review.completedTasks.length === 0 ? (
            <EmptyState title={t("Nothing completed this week yet")} />
          ) : (
            <div className="divide-y divide-border">
              {review.completedTasks.map((t2) => (
                <div key={t2.id} className="px-4 py-2 text-sm">
                  <span className="text-foreground line-through">{t2.title}</span>
                  {t2.projectName && <span className="ml-2 text-xs text-subtle">{t2.projectName}</span>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t("Overdue ({n})", { n: review.overdueTasks.length })}>
          {review.overdueTasks.length === 0 ? (
            <EmptyState title={t("Nothing overdue")} />
          ) : (
            <div className="divide-y divide-border">
              {review.overdueTasks.map((t2) => (
                <Link key={t2.id} href={`/tasks/${t2.id}`} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-surface-raised">
                  <span className="text-foreground">{t2.title}</span>
                  <span className="text-xs text-critical">{t("due")} {formatDate(t2.dueDate, locale)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={t("Waiting on others ({n})", { n: review.openWaitingItems.length })}>
          {review.openWaitingItems.length === 0 ? (
            <EmptyState title={t("Nothing outstanding")} />
          ) : (
            <div className="divide-y divide-border">
              {review.openWaitingItems.map((w) => (
                <div key={w.id} className="px-4 py-2 text-sm">
                  <span className="text-foreground">{w.title}</span>
                  <span className="ml-2 text-xs text-subtle">{w.contact} · {t("{n}d", { n: w.ageDays })}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {(review.newRisks.length > 0 || review.decisions.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <Panel title={t("New risks ({n})", { n: review.newRisks.length })}>
              {review.newRisks.length === 0 ? (
                <EmptyState title={t("None")} />
              ) : (
                <div className="divide-y divide-border">
                  {review.newRisks.map((r) => (
                    <div key={r.id} className="px-4 py-2 text-sm text-foreground">
                      {r.title} <span className="text-xs text-subtle">{r.projectName}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
            <Panel title={t("Decisions ({n})", { n: review.decisions.length })}>
              {review.decisions.length === 0 ? (
                <EmptyState title={t("None")} />
              ) : (
                <div className="divide-y divide-border">
                  {review.decisions.map((d) => (
                    <div key={d.id} className="px-4 py-2 text-sm text-foreground">
                      {d.title} <span className="text-xs text-subtle">{d.projectName}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        )}

        <Panel title={t("Next week")}>
          <div className="grid grid-cols-2 divide-x divide-border">
            <div>
              <p className="px-4 pt-2 text-[11px] font-semibold text-subtle uppercase">{t("Deadlines")}</p>
              {review.nextWeekDeadlines.length === 0 ? (
                <p className="px-4 py-2 text-xs text-subtle">{t("None")}</p>
              ) : (
                review.nextWeekDeadlines.map((t2) => (
                  <div key={t2.id} className="px-4 py-1.5 text-sm text-foreground">
                    {t2.title} <span className="text-xs text-subtle">{formatDate(t2.dueDate, locale)}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="px-4 pt-2 text-[11px] font-semibold text-subtle uppercase">{t("Meetings")}</p>
              {review.nextWeekMeetings.length === 0 ? (
                <p className="px-4 py-2 text-xs text-subtle">{t("None")}</p>
              ) : (
                review.nextWeekMeetings.map((e) => (
                  <div key={e.id} className="px-4 py-1.5 text-sm text-foreground">
                    {e.title} <span className="text-xs text-subtle">{formatDate(e.startTime, locale)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>

        <Panel title={t("Suggested priorities")}>
          {review.suggestedPriorities.length === 0 ? (
            <EmptyState title={t("No open tasks")} />
          ) : (
            <div className="divide-y divide-border">
              {review.suggestedPriorities.map((t2, i) => (
                <Link key={t2.id} href={`/tasks/${t2.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-raised">
                  <span className="text-xs text-subtle">{i + 1}</span>
                  <span className="text-foreground">{t2.title}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
