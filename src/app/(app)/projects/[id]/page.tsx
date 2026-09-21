import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, AlertTriangle, Clock } from "lucide-react";
import { getProjectDetail } from "@/lib/data/projects";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { ProjectTimeline } from "@/components/projects/timeline";
import { TaskRow } from "@/components/tasks/task-row";
import { DeleteProjectButton } from "./delete-button";
import { formatDate, formatDateLong, formatDateTime } from "@/lib/utils/format";
import { PROJECT_STATUS_TONE, PROJECT_STATUS_LABEL, RISK_LEVEL_LABEL } from "@/lib/constants";
import { sortByUrgency, waitingItemAgeDays } from "@/lib/dashboard/scoring";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const project = await getProjectDetail(user.id, id);
  if (!project) notFound();

  const openTasks = project.tasks.filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED");
  const completedTasks = project.tasks.filter((t) => t.status === "COMPLETED");
  const progress = project.tasks.length > 0 ? Math.round((completedTasks.length / project.tasks.length) * 100) : 0;
  const nextMilestone = project.milestones.find((m) => m.status !== "DONE");
  const nextAction = sortByUrgency(openTasks)[0];
  const openWaiting = project.waitingItems.filter((w) => w.status === "OPEN");
  const upcomingEvents = project.calendarEvents.filter((e) => new Date(e.startTime) >= new Date());

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <h1 className="text-lg font-semibold text-foreground">{project.name}</h1>
            <Badge tone={PROJECT_STATUS_TONE[project.status]}>{t(PROJECT_STATUS_LABEL[project.status])}</Badge>
            <PriorityBadge priority={project.priority} t={t} />
          </div>
          {project.objective && <p className="max-w-2xl text-sm text-muted">{project.objective}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={`/projects/${project.id}/edit`}>
            <Button variant="secondary" size="sm">
              {t("Edit")}
            </Button>
          </Link>
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-3">
        <StatCard label={t("Target date")} value={formatDate(project.targetDate, locale)} />
        <StatCard label={t("Progress")} value={`${progress}%`} sub={t("{done}/{total} tasks", { done: completedTasks.length, total: project.tasks.length })} />
        <StatCard label={t("Next milestone")} value={nextMilestone?.title ?? "—"} sub={nextMilestone ? formatDate(nextMilestone.targetDate, locale) : undefined} />
        <StatCard label={t("Responsible")} value={project.responsiblePerson ?? "—"} />
      </div>

      {nextAction && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm">
          <span className="text-xs font-semibold tracking-wide text-accent uppercase">{t("Next recommended action")}</span>
          <Link href={`/tasks/${nextAction.id}`} className="text-foreground hover:text-accent">
            {nextAction.title}
          </Link>
        </div>
      )}

      <Panel title={t("Timeline")} className="mb-6">
        <ProjectTimeline
          startDate={project.startDate}
          targetDate={project.targetDate}
          milestones={project.milestones.map((m) => ({ id: m.id, title: m.title, targetDate: m.targetDate, status: m.status }))}
          t={t}
          locale={locale}
        />
      </Panel>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Panel
            title={t("Tasks ({n} open)", { n: openTasks.length })}
            action={
              <Link href={`/tasks/new?projectId=${project.id}`}>
                <Button variant="ghost" size="sm">
                  <Plus className="h-3.5 w-3.5" /> {t("Add")}
                </Button>
              </Link>
            }
          >
            {project.tasks.length === 0 ? (
              <EmptyState title={t("No tasks yet")} description={t("Break this project down into tasks to track progress.")} />
            ) : (
              <div>
                {sortByUrgency(openTasks).map((task) => (
                  <TaskRow key={task.id} task={task} t={t} locale={locale} />
                ))}
                {completedTasks.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer px-4 py-2 text-xs text-subtle hover:text-muted">
                      {t("{n} completed", { n: completedTasks.length })}
                    </summary>
                    {completedTasks.map((task) => (
                      <TaskRow key={task.id} task={task} t={t} locale={locale} />
                    ))}
                  </details>
                )}
              </div>
            )}
          </Panel>

          <Panel title={t("Risks")}>
            {project.risks.length === 0 ? (
              <EmptyState title={t("No risks logged")} />
            ) : (
              <div className="divide-y divide-border">
                {project.risks.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
                      <span className="text-sm font-medium text-foreground">{r.title}</span>
                      {!r.isConfirmed && <Badge tone="accent">{t("AI suggested — unconfirmed")}</Badge>}
                      <Badge tone={r.impact === "HIGH" ? "critical" : r.impact === "MEDIUM" ? "warning" : "neutral"}>
                        {t("{prob} prob / {impact} impact", { prob: t(RISK_LEVEL_LABEL[r.probability]), impact: t(RISK_LEVEL_LABEL[r.impact]) })}
                      </Badge>
                    </div>
                    {r.description && <p className="mt-1 text-xs text-muted">{r.description}</p>}
                    {r.mitigation && (
                      <p className="mt-1 text-xs text-subtle">
                        <span className="font-medium text-muted">{t("Mitigation:")}</span> {r.mitigation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t("Decisions")}>
            {project.decisions.length === 0 ? (
              <EmptyState title={t("No decisions logged")} />
            ) : (
              <div className="divide-y divide-border">
                {project.decisions.map((d) => (
                  <div key={d.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{d.title}</span>
                      <span className="text-xs text-subtle">{formatDate(d.date, locale)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{d.description}</p>
                    {d.consequences && (
                      <p className="mt-1 text-xs text-subtle">
                        <span className="font-medium text-muted">{t("Consequence:")}</span> {d.consequences}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title={t("Waiting for")}>
            {openWaiting.length === 0 ? (
              <EmptyState title={t("Nothing outstanding")} />
            ) : (
              <div className="divide-y divide-border">
                {openWaiting.map((w) => {
                  const age = waitingItemAgeDays(w.since);
                  return (
                    <div key={w.id} className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-critical" strokeWidth={1.75} />
                        <span className="text-sm text-foreground">{w.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {t("{contact} · since {date} ({n}d)", { contact: w.contact?.name ?? t("Unknown"), date: formatDate(w.since, locale), n: age })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title={t("Milestones")}>
            <div className="divide-y divide-border">
              {project.milestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-foreground">{m.title}</span>
                  <Badge tone={m.status === "DONE" ? "ok" : m.status === "AT_RISK" ? "critical" : "neutral"}>
                    {formatDate(m.targetDate, locale)}
                  </Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("Upcoming meetings")}>
            {upcomingEvents.length === 0 ? (
              <EmptyState title={t("None scheduled")} />
            ) : (
              <div className="divide-y divide-border">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="px-4 py-2.5">
                    <p className="text-sm text-foreground">{e.title}</p>
                    <p className="text-xs text-muted">{formatDateTime(e.startTime, locale)}</p>
                    {e.requiresPrep && <Badge tone="warning" className="mt-1">{t("Prep needed")}</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t("Contacts")}>
            {project.contacts.length === 0 ? (
              <EmptyState title={t("No contacts linked")} />
            ) : (
              <div className="divide-y divide-border">
                {project.contacts.map((pc) => (
                  <div key={pc.id} className="px-4 py-2.5">
                    <p className="text-sm text-foreground">{pc.contact.name}</p>
                    <p className="text-xs text-muted">
                      {pc.roleOnProject ?? pc.contact.role} · {pc.contact.organization}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t("Linked email")}>
            {project.emailThreads.length === 0 ? (
              <EmptyState title={t("No linked threads")} />
            ) : (
              <div className="divide-y divide-border">
                {project.emailThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/email/${thread.id}`}
                    className="block px-4 py-2.5 hover:bg-surface-raised"
                  >
                    <p className="truncate text-sm text-foreground">{thread.subject}</p>
                    <p className="text-xs text-muted">{formatDate(thread.lastMessageAt, locale)}</p>
                  </Link>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <p className="mt-6 text-xs text-subtle">{t("Created {date}", { date: formatDateLong(project.createdAt, locale) })}</p>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <p className="text-[10px] font-semibold tracking-wide text-subtle uppercase">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
