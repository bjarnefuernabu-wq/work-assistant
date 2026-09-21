import { Activity as ActivityIcon } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/utils/format";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

const ACTION_ICON_TONE: Record<string, string> = {
  task_completed: "text-ok",
  task_deleted: "text-critical",
  project_deleted: "text-critical",
  connector_synced: "text-info",
};

export default async function ActivityPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const entries = await prisma.activityLogEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">{t("Activity Log")}</h1>
        <p className="text-sm text-muted">{t("Recent actions across projects, tasks, connectors, and the AI assistant.")}</p>
        {locale === "de" && (
          <p className="mt-1 text-xs text-subtle">
            {t("Note: individual activity entries below are recorded in English regardless of display language.")}
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={ActivityIcon} title={t("No activity yet")} />
      ) : (
        <Panel className="max-w-2xl">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACTION_ICON_TONE[e.action] ? "" : "bg-subtle"} ${ACTION_ICON_TONE[e.action]?.replace("text-", "bg-") ?? ""}`} />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{e.summary}</span>
              <span className="shrink-0 text-xs text-subtle">{formatDateTime(e.createdAt, locale)}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
