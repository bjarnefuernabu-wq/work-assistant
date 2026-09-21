import { Inbox as InboxIcon, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { TriageActions } from "./triage-actions";
import { CaptureForm } from "./capture-form";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

const TYPE_LABEL: Record<string, string> = {
  NOTE: "Note",
  TASK_SUGGESTION: "Task suggestion",
  EMAIL: "Email",
  FOLLOWUP: "Follow-up",
  IDEA: "Idea",
  MEETING_PREP: "Meeting prep",
};

export default async function InboxPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const items = await prisma.inboxItem.findMany({
    where: { userId: user.id, status: "NEW" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-foreground">{t("Inbox")}</h1>
        <p className="text-sm text-muted">{t("{n} to triage", { n: items.length })}</p>
      </div>

      <CaptureForm />

      {items.length === 0 ? (
        <EmptyState icon={InboxIcon} title={t("Inbox zero")} description={t("Nothing waiting to be triaged.")} />
      ) : (
        <Panel>
          {items.map((item) => (
            <div key={item.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge tone="neutral">{t(TYPE_LABEL[item.type])}</Badge>
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                </div>
                {item.content && <p className="mt-1 text-xs text-muted">{item.content}</p>}
                {item.suggestedReason && (
                  <p className="mt-1.5 flex items-start gap-1 text-xs text-accent">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0" strokeWidth={1.75} />
                    {item.suggestedReason}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-subtle">{formatDate(item.createdAt, locale)}</p>
              </div>
              <TriageActions itemId={item.id} />
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
