import "server-only";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/activity/log";

/**
 * The actual mutation behind "send an email draft". Shared by the direct UI action
 * (`sendEmailDraftAction`, gated by a `ConfirmButton`) and the AI tool
 * (`send_email_draft`, gated by `requiresConfirmation`) so there's exactly one send path.
 * No live mail connector is wired up (mock-mail is read/sync only) — this simulates delivery
 * so the confirm-then-send flow is real end-to-end without actually reaching a real inbox.
 */
export async function performSendEmailDraft(draftId: string, userId: string) {
  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, userId } });
  if (!draft) return { ok: false as const, error: "Draft not found or not yours." };
  if (draft.status === "SENT") return { ok: false as const, error: "Already sent." };

  await prisma.emailDraft.update({ where: { id: draft.id }, data: { status: "SENT", sentAt: new Date() } });
  if (draft.threadId) {
    await prisma.emailThread.update({ where: { id: draft.threadId }, data: { requiresAction: false } });
  }
  await logActivity({
    userId,
    entityType: "EmailDraft",
    entityId: draft.id,
    action: "email_sent",
    summary: `Sent email '${draft.subject}' (simulated — no live mail connector)`,
  });
  return { ok: true as const };
}
