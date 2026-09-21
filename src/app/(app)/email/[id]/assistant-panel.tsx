"use client";

import { useState, useTransition } from "react";
import { Sparkles, ListChecks, FileText } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useTranslation } from "@/components/i18n/locale-provider";
import {
  summarizeThreadAction,
  identifyActionItemsAction,
  generateDraftAction,
  reviseDraftAction,
  updateDraftText,
  sendEmailDraftAction,
  discardDraft,
} from "@/lib/actions/email";
import type { EmailDraft } from "@/generated/prisma/client";

const TONES: { key: "shorter" | "friendlier" | "more formal"; label: string }[] = [
  { key: "shorter", label: "Make it shorter" },
  { key: "friendlier", label: "Make it friendlier" },
  { key: "more formal", label: "Make it more formal" },
];

export function EmailAssistantPanel({ threadId, existingDraft }: { threadId: string; existingDraft: EmailDraft | null }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailDraft | null>(existingDraft);
  const [subject, setSubject] = useState(existingDraft?.subject ?? "");
  const [body, setBody] = useState(existingDraft?.bodyText ?? "");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function syncDraftState(d: { draftId: string; bodyText: string; subject: string }) {
    setDraft((prev) => ({ ...(prev as EmailDraft), id: d.draftId, bodyText: d.bodyText, subject: d.subject }) as EmailDraft);
    setBody(d.bodyText);
    setSubject(d.subject);
  }

  return (
    <div className="space-y-4">
      <Panel title={t("Understand")}>
        <div className="space-y-3 p-4">
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(async () => setSummary(await summarizeThreadAction(threadId)))}>
            <Sparkles className="h-3.5 w-3.5" /> {t("Summarize thread")}
          </Button>
          {summary && <p className="text-xs text-muted">{summary}</p>}

          <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(async () => setActionItems(await identifyActionItemsAction(threadId)))}>
            <ListChecks className="h-3.5 w-3.5" /> {t("Unanswered questions & commitments")}
          </Button>
          {actionItems && <p className="text-xs whitespace-pre-wrap text-muted">{actionItems}</p>}
        </div>
      </Panel>

      <Panel title={t("Reply draft")}>
        <div className="space-y-3 p-4">
          {!draft ? (
            <Button
              size="sm"
              variant="primary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await generateDraftAction(threadId);
                  syncDraftState(result);
                })
              }
            >
              <FileText className="h-3.5 w-3.5" /> {t("Generate draft")}
            </Button>
          ) : (
            <>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                onBlur={() => draft && updateDraftText(draft.id, subject, body)}
                placeholder={t("Subject")}
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onBlur={() => draft && updateDraftText(draft.id, subject, body)}
                rows={10}
              />
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((tone) => (
                  <button
                    key={tone.key}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const revised = await reviseDraftAction(draft.id, `Make it ${tone.key}.`);
                        setBody(revised);
                      })
                    }
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted hover:border-accent hover:text-foreground"
                  >
                    {t(tone.label)}
                  </button>
                ))}
              </div>

              {sent ? (
                <p className="text-xs text-ok">{t("Sent (simulated — no live mail connector).")}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <ConfirmButton
                    label={t("Send")}
                    confirmLabel={t("Send now")}
                    description={t('Send this reply to the thread participants? Subject: "{subject}".', { subject })}
                    onConfirm={async () => {
                      await sendEmailDraftAction(draft.id);
                      setSent(true);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      startTransition(async () => {
                        await discardDraft(draft.id);
                        setDraft(null);
                        setBody("");
                        setSubject("");
                      })
                    }
                  >
                    {t("Discard")}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Panel>
    </div>
  );
}
