"use server";

import { requireUser } from "@/lib/auth/session";
import { runChatTurn, type ChatTurnResult } from "@/lib/ai/chat";
import { confirmPendingAction, rejectPendingAction } from "@/lib/ai/tool-runner";
import type { ChatMessage } from "@/lib/ai/types";

export async function sendAssistantMessage(history: ChatMessage[], message: string): Promise<ChatTurnResult> {
  const user = await requireUser();
  return runChatTurn(user.id, history, message);
}

export async function confirmAssistantAction(actionId: string) {
  const user = await requireUser();
  return confirmPendingAction(actionId, { userId: user.id });
}

export async function rejectAssistantAction(actionId: string) {
  const user = await requireUser();
  await rejectPendingAction(actionId, { userId: user.id });
}
