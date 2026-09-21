"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { getAIProvider } from "@/lib/ai/provider";
import { summarizeThread, identifyActionItems, draftReply, reviseDraft } from "@/lib/email/assist";
import { performSendEmailDraft } from "@/lib/email/send";

async function loadThread(threadId: string, userId: string) {
  return prisma.emailThread.findFirst({
    where: { id: threadId, userId },
    include: { messages: { orderBy: { sentAt: "asc" } } },
  });
}

export async function summarizeThreadAction(threadId: string): Promise<string> {
  const user = await requireUser();
  const thread = await loadThread(threadId, user.id);
  if (!thread) return "Thread not found.";
  return summarizeThread(getAIProvider(), thread, thread.messages);
}

export async function identifyActionItemsAction(threadId: string): Promise<string> {
  const user = await requireUser();
  const thread = await loadThread(threadId, user.id);
  if (!thread) return "Thread not found.";
  return identifyActionItems(getAIProvider(), thread, thread.messages);
}

export async function generateDraftAction(threadId: string, instruction?: string): Promise<{ draftId: string; bodyText: string; subject: string }> {
  const user = await requireUser();
  const thread = await loadThread(threadId, user.id);
  if (!thread) throw new Error("Thread not found.");
  const bodyText = await draftReply(getAIProvider(), thread, thread.messages, instruction);

  const draft = await prisma.emailDraft.create({
    data: {
      userId: user.id,
      threadId: thread.id,
      projectId: thread.projectId,
      subject: thread.subject.startsWith("Re:") ? thread.subject : `Re: ${thread.subject}`,
      bodyText,
      generatedByAI: true,
      status: "DRAFT",
    },
  });
  revalidatePath(`/email/${threadId}`);
  return { draftId: draft.id, bodyText, subject: draft.subject };
}

export async function reviseDraftAction(draftId: string, instruction: string): Promise<string> {
  const user = await requireUser();
  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, userId: user.id } });
  if (!draft) throw new Error("Draft not found.");
  const revised = await reviseDraft(getAIProvider(), draft.bodyText, instruction);
  await prisma.emailDraft.update({ where: { id: draftId }, data: { bodyText: revised } });
  if (draft.threadId) revalidatePath(`/email/${draft.threadId}`);
  return revised;
}

export async function updateDraftText(draftId: string, subject: string, bodyText: string) {
  const user = await requireUser();
  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, userId: user.id } });
  if (!draft) return;
  await prisma.emailDraft.update({ where: { id: draftId }, data: { subject, bodyText } });
  if (draft.threadId) revalidatePath(`/email/${draft.threadId}`);
}

/** Consequential write — UI gates this behind a ConfirmButton. */
export async function sendEmailDraftAction(draftId: string) {
  const user = await requireUser();
  const result = await performSendEmailDraft(draftId, user.id);
  revalidatePath("/email");
  revalidatePath("/dashboard");
  return result;
}

export async function discardDraft(draftId: string) {
  const user = await requireUser();
  const draft = await prisma.emailDraft.findFirst({ where: { id: draftId, userId: user.id } });
  if (!draft) return;
  await prisma.emailDraft.update({ where: { id: draftId }, data: { status: "DISCARDED" } });
  if (draft.threadId) revalidatePath(`/email/${draft.threadId}`);
}
