"use server";

import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";
import { runChatTurn, type ChatTurnResult } from "@/lib/ai/chat";
import { confirmPendingAction, rejectPendingAction } from "@/lib/ai/tool-runner";
import type { ChatMessage } from "@/lib/ai/types";

export async function sendAssistantMessage(history: ChatMessage[], message: string): Promise<ChatTurnResult> {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  return runChatTurn(user.id, history, message, t, locale);
}

export async function confirmAssistantAction(actionId: string) {
  const { user, t } = await requireUserT();
  return confirmPendingAction(actionId, { userId: user.id, t });
}

export async function rejectAssistantAction(actionId: string) {
  const { user, t } = await requireUserT();
  await rejectPendingAction(actionId, { userId: user.id, t });
}
