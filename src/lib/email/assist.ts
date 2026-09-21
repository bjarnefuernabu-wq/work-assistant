import "server-only";
import { formatDistanceToNowStrict } from "date-fns";
import type { AIProvider } from "@/lib/ai/types";
import type { TranslateFn, Locale } from "@/lib/i18n/translate";
import type { EmailMessage, EmailThread } from "@/generated/prisma/client";

/**
 * Email assistant helpers (PRODUCT_SPEC.md §"Email assistant"). With a live provider these
 * call through to a real completion; with the mock fallback they use a plain, clearly-labeled
 * template instead of pretending to summarize/reason — see AIProvider.isLive.
 */

function threadTranscript(messages: EmailMessage[]): string {
  return messages
    .map((m) => `From: ${m.fromName ?? m.fromAddress} (${formatDistanceToNowStrict(m.sentAt, { addSuffix: true })})\n${m.bodyText}`)
    .join("\n\n---\n\n");
}

function languageInstruction(locale: Locale): string {
  return locale === "de" ? " Respond in German." : "";
}

export async function summarizeThread(
  provider: AIProvider,
  thread: EmailThread,
  messages: EmailMessage[],
  t: TranslateFn,
  locale: Locale,
): Promise<string> {
  if (!provider.isLive) {
    const last = messages[messages.length - 1];
    return t(
      '{n} message(s) in this thread. Latest from {from}, {when}. Subject: "{subject}".{action} (Template summary — add ANTHROPIC_API_KEY for a real one.)',
      {
        n: messages.length,
        from: last?.fromName ?? last?.fromAddress ?? t("unknown"),
        when: last ? formatDistanceToNowStrict(last.sentAt, { addSuffix: true }) : "",
        subject: thread.subject,
        action: thread.requiresAction ? t(" Marked as requiring action.") : "",
      },
    );
  }
  return provider.complete({
    system:
      "You summarize email threads for a busy person. Be factual and concise (3-4 sentences max). Do not invent anything not present in the thread." +
      languageInstruction(locale),
    prompt: `Subject: ${thread.subject}\n\n${threadTranscript(messages)}\n\nSummarize this thread.`,
  });
}

export async function identifyActionItems(
  provider: AIProvider,
  thread: EmailThread,
  messages: EmailMessage[],
  t: TranslateFn,
  locale: Locale,
): Promise<string> {
  if (!provider.isLive) {
    return t(
      "(Template mode) Look for direct questions or requests in the latest message above — unanswered-question detection needs a real ANTHROPIC_API_KEY.",
    );
  }
  return provider.complete({
    system:
      "You extract unanswered questions and commitments from an email thread. List them as short bullet points. If there are none, say so plainly. Never invent a commitment that isn't stated." +
      languageInstruction(locale),
    prompt: `Subject: ${thread.subject}\n\n${threadTranscript(messages)}\n\nList unanswered questions and any commitments made by either side.`,
  });
}

export async function draftReply(
  provider: AIProvider,
  thread: EmailThread,
  messages: EmailMessage[],
  t: TranslateFn,
  locale: Locale,
  instruction?: string,
): Promise<string> {
  if (!provider.isLive) {
    const last = messages[messages.length - 1];
    return t(
      'Hi {name},\n\nThanks for your message — following up on "{subject}".\n\n[Draft body — add ANTHROPIC_API_KEY in Settings for the assistant to write this for you based on the thread content.]\n\nBest,\n',
      { name: last?.fromName ?? t("there"), subject: thread.subject },
    );
  }
  return provider.complete({
    system:
      "You draft an email reply on behalf of the user, grounded only in the thread content. Keep it concise and professional unless told otherwise. Output only the email body, no subject line, no commentary." +
      languageInstruction(locale),
    prompt: `Subject: ${thread.subject}\n\n${threadTranscript(messages)}\n\n${instruction ? `Instruction: ${instruction}` : "Draft a reply."}`,
  });
}

export async function reviseDraft(
  provider: AIProvider,
  currentDraft: string,
  instruction: string,
  t: TranslateFn,
  locale: Locale,
): Promise<string> {
  if (!provider.isLive) {
    return t("{draft}\n\n(Requested: {instruction} — needs a real ANTHROPIC_API_KEY to actually apply.)", {
      draft: currentDraft,
      instruction,
    });
  }
  return provider.complete({
    system: "You revise an email draft per the user's instruction. Output only the revised email body." + languageInstruction(locale),
    prompt: `Current draft:\n${currentDraft}\n\nInstruction: ${instruction}`,
  });
}
