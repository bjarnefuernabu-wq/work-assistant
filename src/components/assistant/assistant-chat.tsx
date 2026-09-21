"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Send, Wrench } from "lucide-react";
import { sendAssistantMessage, confirmAssistantAction, rejectAssistantAction } from "@/lib/actions/assistant";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useTranslation } from "@/components/i18n/locale-provider";
import type { ChatMessage } from "@/lib/ai/types";

// The message sent is always English (the offline MockProvider only recognizes English
// keywords); the button label is translated for display.
const SUGGESTIONS = [
  "What do I need to do today?",
  "What's critical this week?",
  "Who owes me a response?",
  "How is Outdoor Action Day going?",
];

export function AssistantChat({ isLive }: { isLive: boolean }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<{ id: string; description: string } | null>(null);
  const [isSending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(text: string) {
    if (!text.trim() || isSending) return;
    setInput("");
    setPending(null);
    startTransition(async () => {
      const result = await sendAssistantMessage(messages, text);
      setMessages(result.messages);
      if (result.pendingConfirmation) setPending(result.pendingConfirmation);
    });
  }

  function confirm() {
    if (!pending) return;
    const p = pending;
    setPending(null);
    startTransition(async () => {
      const outcome = await confirmAssistantAction(p.id);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            outcome.status === "SUCCESS"
              ? t("Done — {summary}", { summary: outcome.resultSummary ?? "" })
              : t("That failed: {summary}", { summary: outcome.resultSummary ?? "" }),
        },
      ]);
    });
  }

  function cancel() {
    if (!pending) return;
    const p = pending;
    setPending(null);
    startTransition(async () => {
      await rejectAssistantAction(p.id);
      setMessages((prev) => [...prev, { role: "assistant", content: t("Cancelled — I didn't make that change.") }]);
    });
  }

  return (
    <div className="flex h-full flex-col">
      {!isLive && (
        <div className="border-b border-warning/30 bg-warning/5 px-4 py-2 text-xs text-warning">
          {t(
            "Running in offline fallback mode (no ANTHROPIC_API_KEY set) — answers only cover a few question types. Add a key in Settings for full assistant capability.",
          )}
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs text-subtle">{t("Try asking:")}</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground"
                >
                  {t(s)}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "tool") return null;
          if (m.role === "assistant" && m.toolCallId) {
            return (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-subtle">
                <Wrench className="h-3 w-3" /> {t("checking {tool}…", { tool: m.toolName ?? "" })}
              </div>
            );
          }
          return (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-md rounded-lg px-3.5 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user" ? "bg-accent text-accent-foreground" : "border border-border bg-surface text-foreground",
                )}
              >
                {m.content}
              </div>
            </div>
          );
        })}

        {pending && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 px-3.5 py-2.5">
            <p className="mb-2 text-xs text-foreground">
              <span className="font-semibold text-warning">{t("Confirmation needed:")}</span> {pending.description}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" onClick={confirm} disabled={isSending}>
                {t("Confirm")}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={isSending}>
                {t("Cancel")}
              </Button>
            </div>
          </div>
        )}

        {isSending && !pending && <p className="text-xs text-subtle">{t("Thinking…")}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("Ask about your projects, tasks, or week…")}
          className="h-9 flex-1 rounded-md border border-border bg-surface-raised px-3 text-sm text-foreground placeholder:text-subtle focus:border-accent focus:outline-none"
        />
        <Button type="submit" variant="primary" disabled={isSending || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
