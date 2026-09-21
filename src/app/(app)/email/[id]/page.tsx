import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/lib/utils/format";
import { EmailAssistantPanel } from "./assistant-panel";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function EmailThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const thread = await prisma.emailThread.findFirst({
    where: { id, userId: user.id },
    include: {
      messages: { orderBy: { sentAt: "asc" } },
      project: { select: { id: true, name: true } },
      drafts: { where: { status: "DRAFT" }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!thread) notFound();

  return (
    <div className="grid grid-cols-3 gap-6 p-6">
      <div className="col-span-2">
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-foreground">{thread.subject}</h1>
          {thread.project && (
            <Link href={`/projects/${thread.project.id}`} className="text-xs text-subtle hover:text-accent">
              {thread.project.name}
            </Link>
          )}
        </div>
        <Panel>
          {thread.messages.map((m) => (
            <div key={m.id} className="border-b border-border px-4 py-3 last:border-0">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{m.fromName ?? m.fromAddress}</span>
                <span className="text-xs text-subtle">{formatDateTime(m.sentAt, locale)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted">{m.bodyText}</p>
            </div>
          ))}
        </Panel>
      </div>

      <div className="col-span-1">
        <EmailAssistantPanel threadId={thread.id} existingDraft={thread.drafts[0] ?? null} />
      </div>
    </div>
  );
}
