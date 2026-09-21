import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { AIProvider, ChatMessage, ProviderResponse, ToolDefinition } from "@/lib/ai/types";

const MODEL = "claude-sonnet-4-5-20250929";

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly isLive = true;
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
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
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => {
      if (m.role === "tool") {
        return {
          role: "user",
          content: [{ type: "tool_result" as const, tool_use_id: m.toolCallId ?? "unknown", content: m.content }],
        };
      }
      if (m.role === "assistant" && m.toolCallId) {
        const blocks: Anthropic.ContentBlockParam[] = [];
        if (m.content) blocks.push({ type: "text", text: m.content });
        blocks.push({ type: "tool_use", id: m.toolCallId, name: m.toolName ?? "unknown", input: m.toolInput ?? {} });
        return { role: "assistant", content: blocks };
      }
      return { role: m.role, content: m.content };
    });

    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: anthropicMessages,
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: z.toJSONSchema(t.inputSchema, { target: "draft-7" }) as Anthropic.Tool.InputSchema,
      })),
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (toolUse && toolUse.type === "tool_use") {
      const text = response.content.find((b) => b.type === "text");
      return {
        type: "tool_call",
        toolName: toolUse.name,
        input: toolUse.input,
        callId: toolUse.id,
        text: text && text.type === "text" ? text.text : undefined,
      };
    }

    const text = response.content.find((b) => b.type === "text");
    return { type: "text", text: text && text.type === "text" ? text.text : "" };
  }
}
