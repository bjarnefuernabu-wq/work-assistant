import type { AIProvider, ChatMessage, ProviderResponse } from "@/lib/ai/types";

/**
 * Deterministic, rule-based fallback provider — no network calls, no API key required. It picks
 * one read tool via keyword matching, then turns that tool's result into a short text summary.
 * This exists so the app is fully demoable without an ANTHROPIC_API_KEY (see ARCHITECTURE.md
 * D6); it is intentionally not trying to approximate real reasoning, and says so in its replies.
 */
export class MockProvider implements AIProvider {
  readonly name = "mock";
  readonly isLive = false;

  async respond({ messages }: { messages: ChatMessage[] }): Promise<ProviderResponse> {
    const last = messages[messages.length - 1];

    if (last.role === "tool") {
      return { type: "text", text: summarizeToolResult(last) };
    }

    const text = last.content.toLowerCase();

    if (/\bweek\b/.test(text)) {
      return { type: "tool_call", toolName: "get_week_context", input: {} };
    }
    if (/waiting|follow.?up|owes? me/.test(text)) {
      return { type: "tool_call", toolName: "get_waiting_items", input: {} };
    }
    const projectMatch = text.match(/project\s+([a-z0-9 '-]+)/i) ?? text.match(/how is\s+([a-z0-9 '-]+?)\s+going/i);
    if (projectMatch) {
      return { type: "tool_call", toolName: "get_project", input: { nameOrId: projectMatch[1].trim() } };
    }
    if (/critical|urgent|overdue|what.?s next|priorit/.test(text)) {
      return { type: "tool_call", toolName: "get_tasks", input: {} };
    }
    if (/today/.test(text)) {
      return { type: "tool_call", toolName: "get_today_tasks", input: {} };
    }

    return {
      type: "text",
      text:
        "I'm running in fallback mode (no ANTHROPIC_API_KEY configured), so I can only answer a few specific question types right now: what's today, what's this week, who owes me a response, what's critical, or how a named project is going. Add a real key in Settings for full assistant capability.",
    };
  }

  async complete(): Promise<string> {
    return "(Offline fallback mode has no free-text generation — this feature needs a real ANTHROPIC_API_KEY. Showing a template result instead.)";
  }
}

function summarizeToolResult(msg: ChatMessage): string {
  let data: unknown;
  try {
    data = JSON.parse(msg.content);
  } catch {
    return "Here's what I found.";
  }
  const d = data as Record<string, unknown>;

  if (msg.toolName === "get_today_tasks" && d.today) {
    const t = d.today as { overdueTasks: unknown[]; dueTasks: unknown[]; events: unknown[]; followUpsDue: unknown[] };
    return `Today: ${t.events.length} event(s), ${t.overdueTasks.length} overdue task(s), ${t.dueTasks.length} due today, ${t.followUpsDue.length} follow-up(s) due. (Mock provider — see the Dashboard for full detail.)`;
  }
  if (msg.toolName === "get_week_context" && d.week) {
    const w = d.week as { dueTasks: unknown[]; milestones: unknown[]; events: unknown[]; isOverloaded: boolean };
    return `This week: ${w.milestones.length} milestone(s), ${w.dueTasks.length} task(s) due, ${w.events.length} meeting(s).${w.isOverloaded ? " The week looks overloaded relative to available time." : ""}`;
  }
  if (msg.toolName === "get_waiting_items") {
    const items = (d.waitingItems as { title: string; contact?: string; sinceDaysAgo: number }[]) ?? [];
    if (items.length === 0) return "Nothing outstanding right now.";
    return `Waiting on: ${items.map((i) => `"${i.title}" (${i.contact ?? "unknown"}, ${i.sinceDaysAgo}d)`).join("; ")}.`;
  }
  if (msg.toolName === "get_project") {
    if (!d.found) return "I couldn't find a project matching that name.";
    const p = d.project as { name: string; status: string; openTasks: unknown[]; waitingOn: unknown[] };
    return `${p.name} is ${p.status}, ${p.openTasks.length} open task(s), ${p.waitingOn.length} outstanding follow-up(s).`;
  }
  if (msg.toolName === "get_tasks") {
    const tasks = (d.tasks as { title: string; priority: string }[]) ?? [];
    if (tasks.length === 0) return "No matching open tasks.";
    return `Top items: ${tasks
      .slice(0, 5)
      .map((t) => `${t.title} (${t.priority})`)
      .join(", ")}.`;
  }
  return "Here's what I found.";
}
