import Link from "next/link";
import { Mail } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";

export default async function EmailPage() {
  const user = await requireUser();
  const threads = await prisma.emailThread.findMany({
    where: { userId: user.id },
    include: { project: { select: { id: true, name: true } } },
    orderBy: { lastMessageAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Email Assistant</h1>
        <p className="text-sm text-muted">{threads.filter((t) => t.requiresAction).length} thread(s) need action</p>
      </div>

      {threads.length === 0 ? (
        <EmptyState icon={Mail} title="No email threads" description="Connect and sync Demo Mail in Settings to see threads here." />
      ) : (
        <Panel>
          {threads.map((t) => (
            <Link key={t.id} href={`/email/${t.id}`} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0 hover:bg-surface-raised">
              <Mail className={t.isUnread ? "h-4 w-4 shrink-0 text-accent" : "h-4 w-4 shrink-0 text-subtle"} strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className={t.isUnread ? "truncate text-sm font-medium text-foreground" : "truncate text-sm text-foreground"}>{t.subject}</p>
                {t.snippet && <p className="truncate text-xs text-muted">{t.snippet}</p>}
              </div>
              {t.project && <span className="shrink-0 text-xs text-subtle">{t.project.name}</span>}
              {t.requiresAction && <Badge tone="warning">Needs action</Badge>}
              <span className="shrink-0 text-xs text-subtle">{formatDate(t.lastMessageAt)}</span>
            </Link>
          ))}
        </Panel>
      )}
    </div>
  );
}
