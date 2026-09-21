import Link from "next/link";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/session";
import { buildWeeklyReview } from "@/lib/briefing/weekly-review";
import { Panel, EmptyState } from "@/components/ui/panel";
import { formatDate } from "@/lib/utils/format";

export default async function WeeklyReviewPage() {
  const user = await requireUser();
  const review = await buildWeeklyReview(user.id);

  return (
    <div className="max-w-3xl p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Weekly Review</h1>
        <p className="text-sm text-muted">
          {format(review.weekStart, "MMM d")} – {format(review.weekEnd, "MMM d")}
        </p>
      </div>

      <div className="space-y-5">
        <Panel title={`Completed (${review.completedTasks.length})`}>
          {review.completedTasks.length === 0 ? (
            <EmptyState title="Nothing completed this week yet" />
          ) : (
            <div className="divide-y divide-border">
              {review.completedTasks.map((t) => (
                <div key={t.id} className="px-4 py-2 text-sm">
                  <span className="text-foreground line-through">{t.title}</span>
                  {t.projectName && <span className="ml-2 text-xs text-subtle">{t.projectName}</span>}
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Overdue (${review.overdueTasks.length})`}>
          {review.overdueTasks.length === 0 ? (
            <EmptyState title="Nothing overdue" />
          ) : (
            <div className="divide-y divide-border">
              {review.overdueTasks.map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between px-4 py-2 text-sm hover:bg-surface-raised">
                  <span className="text-foreground">{t.title}</span>
                  <span className="text-xs text-critical">due {formatDate(t.dueDate)}</span>
                </Link>
              ))}
            </div>
          )}
        </Panel>

        <Panel title={`Waiting on others (${review.openWaitingItems.length})`}>
          {review.openWaitingItems.length === 0 ? (
            <EmptyState title="Nothing outstanding" />
          ) : (
            <div className="divide-y divide-border">
              {review.openWaitingItems.map((w) => (
                <div key={w.id} className="px-4 py-2 text-sm">
                  <span className="text-foreground">{w.title}</span>
                  <span className="ml-2 text-xs text-subtle">{w.contact} · {w.ageDays}d</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {(review.newRisks.length > 0 || review.decisions.length > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <Panel title={`New risks (${review.newRisks.length})`}>
              {review.newRisks.length === 0 ? (
                <EmptyState title="None" />
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
            <Panel title={`Decisions (${review.decisions.length})`}>
              {review.decisions.length === 0 ? (
                <EmptyState title="None" />
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

        <Panel title="Next week">
          <div className="grid grid-cols-2 divide-x divide-border">
            <div>
              <p className="px-4 pt-2 text-[11px] font-semibold text-subtle uppercase">Deadlines</p>
              {review.nextWeekDeadlines.length === 0 ? (
                <p className="px-4 py-2 text-xs text-subtle">None</p>
              ) : (
                review.nextWeekDeadlines.map((t) => (
                  <div key={t.id} className="px-4 py-1.5 text-sm text-foreground">
                    {t.title} <span className="text-xs text-subtle">{formatDate(t.dueDate)}</span>
                  </div>
                ))
              )}
            </div>
            <div>
              <p className="px-4 pt-2 text-[11px] font-semibold text-subtle uppercase">Meetings</p>
              {review.nextWeekMeetings.length === 0 ? (
                <p className="px-4 py-2 text-xs text-subtle">None</p>
              ) : (
                review.nextWeekMeetings.map((e) => (
                  <div key={e.id} className="px-4 py-1.5 text-sm text-foreground">
                    {e.title} <span className="text-xs text-subtle">{formatDate(e.startTime)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Panel>

        <Panel title="Suggested priorities">
          <div className="divide-y divide-border">
            {review.suggestedPriorities.map((t, i) => (
              <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-surface-raised">
                <span className="text-xs text-subtle">{i + 1}</span>
                <span className="text-foreground">{t.title}</span>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
