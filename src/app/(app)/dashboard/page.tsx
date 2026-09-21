import Link from "next/link";
import { AlertTriangle, CalendarClock, Clock, Mail } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/dashboard/data";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { TaskRow } from "@/components/tasks/task-row";
import { formatDate, formatDateTime, formatMinutes, formatTime } from "@/lib/utils/format";
import { waitingItemAgeDays } from "@/lib/dashboard/scoring";
import { cn } from "@/lib/utils/cn";

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user.id);
  const { today, week, attention, emailRequiringAction } = data;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted">
          {formatDate(new Date())} — {today.overdueTasks.length > 0 ? `${today.overdueTasks.length} overdue` : "nothing overdue"}
        </p>
      </div>

      {/* -------------------------------------------------------------- */}
      <section>
        <SectionHeading title="Today" />
        <div className="grid grid-cols-3 gap-4">
          <Panel title="Schedule" className="col-span-1">
            {today.events.length === 0 ? (
              <EmptyState title="No events today" />
            ) : (
              <div className="divide-y divide-border">
                {today.events.map((e) => (
                  <div key={e.id} className="px-4 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{e.title}</span>
                      <span className="text-xs text-muted">{e.isAllDay ? "All day" : formatTime(e.startTime)}</span>
                    </div>
                    {e.requiresPrep && (
                      <Badge tone="warning" className="mt-1">
                        Prep: {e.prepNotes ?? "needed"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={`Due / overdue (${today.overdueTasks.length + today.dueTasks.length})`} className="col-span-1">
            {today.overdueTasks.length + today.dueTasks.length === 0 ? (
              <EmptyState title="Nothing due today" />
            ) : (
              <div>
                {today.overdueTasks.map((t) => (
                  <TaskRow key={t.id} task={t} projectName={t.project?.name} showProject />
                ))}
                {today.dueTasks.map((t) => (
                  <TaskRow key={t.id} task={t} projectName={t.project?.name} showProject />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Follow-ups due" className="col-span-1">
            {today.followUpsDue.length === 0 ? (
              <EmptyState title="Nothing due for follow-up" />
            ) : (
              <div className="divide-y divide-border">
                {today.followUpsDue.map((w) => (
                  <Link key={w.id} href={`/followups`} className="block px-4 py-2.5 hover:bg-surface-raised">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-critical" strokeWidth={1.75} />
                      <span className="text-sm text-foreground">{w.title}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {w.contact?.name} · waiting {waitingItemAgeDays(w.since)}d
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {today.plannedTasks.length > 0 && (
          <Panel title="Planned for today" className="mt-4">
            {today.plannedTasks.map((t) => (
              <TaskRow key={t.id} task={t} projectName={t.project?.name} showProject />
            ))}
          </Panel>
        )}
      </section>

      {/* -------------------------------------------------------------- */}
      <section>
        <SectionHeading title="This week" />
        {week.isOverloaded && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            Planned work + meetings (~{formatMinutes(week.committedMinutes)}) exceed realistic remaining capacity (~
            {formatMinutes(week.capacityMinutes)}) for the rest of this week.
          </div>
        )}
        <div className="grid grid-cols-3 gap-4">
          <Panel title="Deadlines & milestones">
            {week.dueTasks.length + week.milestones.length === 0 ? (
              <EmptyState title="Nothing due this week" />
            ) : (
              <div className="divide-y divide-border">
                {week.milestones.map((m) => (
                  <div key={m.id} className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm text-foreground">{m.title}</span>
                    <span className="text-xs text-muted">{m.projectName} · {formatDate(m.targetDate)}</span>
                  </div>
                ))}
                {week.dueTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm text-foreground">{t.title}</span>
                    <span className="text-xs text-muted">{formatDate(t.dueDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Meetings this week">
            {week.events.length === 0 ? (
              <EmptyState title="No meetings" />
            ) : (
              <div className="divide-y divide-border">
                {week.events.map((e) => (
                  <div key={e.id} className="px-4 py-2">
                    <p className="text-sm text-foreground">{e.title}</p>
                    <p className="text-xs text-muted">{formatDateTime(e.startTime)}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Planned work">
            {week.plannedTasks.length === 0 ? (
              <EmptyState title="Nothing planned yet" />
            ) : (
              <div className="divide-y divide-border">
                {week.plannedTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-4 py-2">
                    <span className="truncate text-sm text-foreground">{t.title}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      <section>
        <SectionHeading title="Projects requiring attention" />
        {attention.length === 0 ? (
          <EmptyState title="Nothing needs attention right now" />
        ) : (
          <div className="space-y-3">
            {attention.map((a) => (
              <Link
                key={a.projectId}
                href={`/projects/${a.projectId}`}
                className={cn(
                  "block rounded-lg border px-4 py-3 hover:border-border-strong",
                  a.severity === "critical" ? "border-critical/30 bg-critical/5" : "border-warning/30 bg-warning/5",
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <AlertTriangle
                    className={cn("h-4 w-4 shrink-0", a.severity === "critical" ? "text-critical" : "text-warning")}
                    strokeWidth={1.75}
                  />
                  <span className="text-sm font-semibold text-foreground">{a.projectName}</span>
                </div>
                <ul className="mb-1.5 ml-6 list-disc text-xs text-muted">
                  {a.facts.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <p className="ml-6 text-xs text-subtle">
                  <span className="font-medium text-muted">Recommendation:</span> {a.recommendation}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {emailRequiringAction.length > 0 && (
        <section>
          <SectionHeading title="Email requiring action" />
          <Panel>
            <div className="divide-y divide-border">
              {emailRequiringAction.map((t) => (
                <Link key={t.id} href={`/email/${t.id}`} className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-raised">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-subtle" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.subject}</span>
                  <span className="shrink-0 text-xs text-muted">{formatDate(t.lastMessageAt)}</span>
                </Link>
              ))}
            </div>
          </Panel>
        </section>
      )}
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <CalendarClock className="h-4 w-4 text-subtle" strokeWidth={1.75} />
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{title}</h2>
    </div>
  );
}
