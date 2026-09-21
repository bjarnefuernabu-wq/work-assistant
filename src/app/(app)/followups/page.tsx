import Link from "next/link";
import { Clock } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { waitingItemAgeDays } from "@/lib/dashboard/scoring";
import { ResolveButton } from "./resolve-button";
import { NewWaitingItemForm } from "./new-form";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function FollowUpsPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const [open, resolved, contacts, projects] = await Promise.all([
    prisma.waitingItem.findMany({
      where: { userId: user.id, status: "OPEN" },
      include: { contact: true, project: { select: { id: true, name: true } } },
    }),
    prisma.waitingItem.findMany({
      where: { userId: user.id, status: "RESOLVED" },
      include: { contact: true, project: { select: { id: true, name: true } } },
      orderBy: { resolvedAt: "desc" },
      take: 10,
    }),
    prisma.contact.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const sorted = [...open].sort((a, b) => waitingItemAgeDays(b.since) - waitingItemAgeDays(a.since));

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("Waiting For")}</h1>
          <p className="text-sm text-muted">{t("{n} open", { n: open.length })}</p>
        </div>
        <NewWaitingItemForm contacts={contacts} projects={projects} />
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Clock} title={t("Nothing outstanding")} description={t("Follow-ups you're waiting on from others will show up here.")} />
      ) : (
        <Panel>
          {sorted.map((w) => {
            const age = waitingItemAgeDays(w.since);
            const overdueFollowUp = w.suggestedFollowUpAt && new Date(w.suggestedFollowUpAt) < new Date();
            return (
              <div key={w.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <Clock className={age >= 7 ? "h-4 w-4 shrink-0 text-critical" : "h-4 w-4 shrink-0 text-warning"} strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{w.title}</p>
                  <p className="text-xs text-muted">
                    {t("{contact} · since {date} ({n}d)", { contact: w.contact?.name ?? t("Unspecified"), date: formatDate(w.since, locale), n: age })}
                    {w.project && (
                      <>
                        {" · "}
                        <Link href={`/projects/${w.project.id}`} className="hover:text-accent">
                          {w.project.name}
                        </Link>
                      </>
                    )}
                  </p>
                  {w.notes && <p className="mt-0.5 text-xs text-subtle">{w.notes}</p>}
                </div>
                {overdueFollowUp && <Badge tone="critical">{t("Follow up overdue")}</Badge>}
                <ResolveButton id={w.id} />
              </div>
            );
          })}
        </Panel>
      )}

      {resolved.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-xs text-subtle hover:text-muted">{t("{n} recently resolved", { n: resolved.length })}</summary>
          <Panel className="mt-2">
            {resolved.map((w) => (
              <div key={w.id} className="flex items-center justify-between border-b border-border px-4 py-2 text-sm text-subtle last:border-0">
                <span className="line-through">{w.title}</span>
                <span className="text-xs">{w.resolvedAt && formatDate(w.resolvedAt, locale)}</span>
              </div>
            ))}
          </Panel>
        </details>
      )}
    </div>
  );
}
