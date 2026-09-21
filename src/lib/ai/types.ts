import type { z } from "zod";
import type { TranslateFn } from "@/lib/i18n/translate";

export interface ToolContext {
  userId: string;
  t: TranslateFn;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  /** Sent to the model — describes when and how to use this tool. */
  description: string;
  inputSchema: z.ZodType<TInput>;
  /** Whether this tool mutates data (vs. a pure read). */
  isWrite: boolean;
  /**
   * True for consequential writes (send email, bulk-reschedule, delete). When true, `run` is
   * NOT called on the model's first request — the caller must persist a pending AIActionLog
   * and only invoke `run` after a separate, explicit user confirmation. See
   * src/lib/ai/tool-runner.ts.
   */
  requiresConfirmation: boolean;
  /** A one-line human-readable description of what THIS call would do, for the confirmation UI. */
  describeCall?: (input: TInput, ctx: ToolContext) => string;
  run: (input: TInput, ctx: ToolContext) => Promise<TOutput>;
}

export interface ChatMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  /** Present on an "assistant" message that requested a tool call, and on the matching "tool" result message. */
  toolCallId?: string;
  toolName?: string;
  /** Present only on the "assistant" tool-call message — the arguments the model sent. */
  toolInput?: unknown;
}

export type ProviderToolCall = {
  type: "tool_call";
  toolName: string;
  input: unknown;
  /** Provider-assigned call id (e.g. Anthropic's tool_use id). The orchestrator generates one if absent. */
  callId?: string;
  /** Optional natural-language lead-in the model wants to show before the tool result. */
  text?: string;
};

export type ProviderTextResponse = {
  type: "text";
  text: string;
};

export type ProviderResponse = ProviderToolCall | ProviderTextResponse;

export interface AIProvider {
  readonly name: string;
  /** True when this provider is a live model (affects how the UI labels responses). */
  readonly isLive: boolean;
  respond(input: {
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<ProviderResponse>;
  /** Plain text completion, no tools — for email summarization/drafting helpers. */
  complete(input: { system: string; prompt: string }): Promise<string>;
}
