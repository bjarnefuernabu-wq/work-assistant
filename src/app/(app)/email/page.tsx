import Link from "next/link";
import { Mail } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function EmailPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const threads = await prisma.emailThread.findMany({
    where: { userId: user.id },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">{t("Email Assistant")}</h1>
        <p className="text-sm text-muted">{t("{n} thread(s) need action", { n: threads.filter((t) => t.requiresAction).length })}</p>
      </div>

      {threads.length === 0 ? (
        <EmptyState icon={Mail} title={t("No email threads")} description={t("Connect and sync Demo Mail in Settings to see threads here.")} />
      ) : (
        <Panel>
          {threads.map((thread) => (
            <Link key={thread.id} href={`/email/${thread.id}`} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface-raised">
              <Mail className={thread.isUnread ? "h-4 w-4 shrink-0 text-accent" : "h-4 w-4 shrink-0 text-subtle"} strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className={thread.isUnread ? "truncate text-sm font-medium text-foreground" : "truncate text-sm text-foreground"}>{thread.subject}</p>
                {thread.snippet && <p className="truncate text-xs text-muted">{thread.snippet}</p>}
              </div>
              {thread.project && <span className="shrink-0 text-xs text-subtle">{thread.project.name}</span>}
              {thread.requiresAction && <Badge tone="warning">{t("Needs action")}</Badge>}
              <span className="shrink-0 text-xs text-subtle">{formatDate(thread.lastMessageAt, locale)}</span>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  );
}
