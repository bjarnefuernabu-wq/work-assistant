import "server-only";
import { MockProvider } from "@/lib/ai/providers/mock";
import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import { GeminiProvider } from "@/lib/ai/providers/gemini";
import type { AIProvider } from "@/lib/ai/types";

let cached: AIProvider | undefined;

/**
 * Picks a live provider when its API key is set (ANTHROPIC_API_KEY takes priority over
 * GEMINI_API_KEY when both are present), else the offline MockProvider (see ARCHITECTURE.md D6).
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (anthropicKey) {
    cached = new AnthropicProvider(anthropicKey);
  } else if (geminiKey) {
    cached = new GeminiProvider(geminiKey);
  } else {
    cached = new MockProvider();
  }
  return cached;
}
