import "server-only";
import { nanoid } from "nanoid";
import { getAIProvider } from "@/lib/ai/provider";
import { ALL_TOOLS } from "@/lib/ai/tools/registry";
import { executeToolCall } from "@/lib/ai/tool-runner";
import type { ChatMessage } from "@/lib/ai/types";

const MAX_TOOL_ITERATIONS = 4;

const SYSTEM_PROMPT = `You are the AI assistant inside a personal work-management app (projects, tasks, calendar, follow-ups). Ground every answer in tool results — never invent dates, people, or commitments. If information isn't available from a tool, say so explicitly instead of guessing. Separate stated facts from your own observations/recommendations when giving advice. Be concise and operational, not chatty. You can only act through the provided tools; some tools require the user's explicit confirmation before they take effect — when that happens, tell the user plainly what you're proposing and that you're waiting on their confirmation.`;

export interface ChatTurnResult {
  messages: ChatMessage[];
  pendingConfirmation?: { id: string; description: string; toolName: string };
}

export async function runChatTurn(userId: string, history: ChatMessage[], userMessage: string): Promise<ChatTurnResult> {
  const provider = getAIProvider();
  const messages: ChatMessage[] = [...history, { role: "user", content: userMessage }];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await provider.respond({ system: SYSTEM_PROMPT, messages, tools: ALL_TOOLS });

    if (response.type === "text") {
      messages.push({ role: "assistant", content: response.text || "(no response)" });
      return { messages };
    }

    const callId = response.callId ?? nanoid();
    messages.push({
      role: "assistant",
      content: response.text ?? "",
      toolCallId: callId,
      toolName: response.toolName,
      toolInput: response.input,
    });

    const outcome = await executeToolCall(response.toolName, response.input, { userId }, userMessage);

    if (outcome.status === "PENDING_CONFIRMATION") {
      messages.push({
        role: "tool",
        content: JSON.stringify({ pending: true, description: outcome.resultSummary }),
        toolCallId: callId,
        toolName: response.toolName,
      });
      messages.push({
        role: "assistant",
        content: `This needs your confirmation before I do it: **${outcome.resultSummary}**. Confirm below to proceed, or tell me to cancel.`,
      });
      return { messages, pendingConfirmation: { id: outcome.pendingActionId!, description: outcome.resultSummary, toolName: outcome.toolName } };
    }

    messages.push({
      role: "tool",
      content: JSON.stringify(outcome.status === "SUCCESS" ? outcome.data : { error: outcome.resultSummary }),
      toolCallId: callId,
      toolName: response.toolName,
    });
  }

  messages.push({
    role: "assistant",
    content: "I wasn't able to finish that within a reasonable number of steps — try narrowing the request.",
  });
  return { messages };
}
