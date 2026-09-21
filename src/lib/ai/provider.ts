import "server-only";
import { MockProvider } from "@/lib/ai/providers/mock";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import type { AIProvider } from "@/lib/ai/types";

let cached: AIProvider | undefined;

/** Picks AnthropicProvider when ANTHROPIC_API_KEY is set, else the offline MockProvider (see ARCHITECTURE.md D6). */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  cached = key ? new AnthropicProvider(key) : new MockProvider();
  return cached;
}
