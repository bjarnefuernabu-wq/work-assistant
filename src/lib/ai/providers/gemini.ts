import { z } from "zod";
import type { AIProvider, ChatMessage, ProviderResponse, ToolDefinition } from "@/lib/ai/types";

const MODEL = "gemini-flash-latest";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  /** Gemini-specific: required on subsequent requests, see ai.google.dev/gemini-api/docs/thought-signatures. */
  extra_content?: unknown;
};

type OpenAIMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
};

/** Talks to Gemini via its OpenAI-compatible endpoint (ai.google.dev/gemini-api/docs/openai) — no extra SDK dependency. */
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly isLive = true;

  constructor(private apiKey: string) {}

  private async chat(messages: OpenAIMessage[], tools?: ToolDefinition[]) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        ...(tools && tools.length > 0
          ? {
              tools: tools.map((t) => ({
                type: "function" as const,
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: z.toJSONSchema(t.inputSchema, { target: "draft-7" }),
                },
              })),
            }
          : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${body}`);
    }
    const data = await res.json();
    return data.choices[0].message as {
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }

  async respond({
    system,
    messages,
    tools,
  }: {
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
  }): Promise<ProviderResponse> {
    const openaiMessages: OpenAIMessage[] = [
      { role: "system", content: system },
      ...messages.map((m): OpenAIMessage => {
        if (m.role === "tool") {
          return { role: "tool", content: m.content, tool_call_id: m.toolCallId ?? "unknown" };
        }
        if (m.role === "assistant" && m.toolCallId) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: [
              {
                id: m.toolCallId,
                type: "function",
                function: { name: m.toolName ?? "unknown", arguments: JSON.stringify(m.toolInput ?? {}) },
                ...(m.toolCallExtra ? { extra_content: m.toolCallExtra } : {}),
              },
            ],
          };
        }
        return { role: m.role, content: m.content };
      }),
    ];

    const message = await this.chat(openaiMessages, tools);
    const call = message.tool_calls?.[0];
    if (call) {
      return {
        type: "tool_call",
        toolName: call.function.name,
        input: JSON.parse(call.function.arguments),
        callId: call.id,
        text: message.content ?? undefined,
        extra: call.extra_content,
      };
    }
    return { type: "text", text: message.content ?? "" };
  }

  async complete({ system, prompt }: { system: string; prompt: string }): Promise<string> {
    const message = await this.chat([
      { role: "system", content: system },
      { role: "user", content: prompt },
    ]);
    return message.content ?? "";
  }
}
