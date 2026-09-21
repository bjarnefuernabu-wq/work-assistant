import { Activity as ActivityIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/utils/format";

const ACTION_ICON_TONE: Record<string, string> = {
  task_completed: "text-ok",
  task_deleted: "text-critical",
  project_deleted: "text-critical",
  connector_synced: "text-info",
};

export default async function ActivityPage() {
  const user = await requireUser();
  const entries = await prisma.activityLogEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">Activity Log</h1>
        <p className="text-sm text-muted">Recent actions across projects, tasks, connectors, and the AI assistant.</p>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={ActivityIcon} title="No activity yet" />
      ) : (
        <Panel className="max-w-2xl">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACTION_ICON_TONE[e.action] ? "" : "bg-subtle"} ${ACTION_ICON_TONE[e.action]?.replace("text-", "bg-") ?? ""}`} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{e.summary}</span>
              <span className="shrink-0 text-xs text-subtle">{formatDateTime(e.createdAt)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
