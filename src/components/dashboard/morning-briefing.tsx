"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMorningBriefingAction } from "@/lib/actions/briefing";
import { formatTime } from "@/lib/utils/format";
import { useTranslation } from "@/components/i18n/locale-provider";
import type { MorningBriefing } from "@/lib/briefing/morning";

export function MorningBriefingPanel() {
  const { t } = useTranslation();
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [pending, startTransition] = useTransition();

  if (!briefing) {
    return (
      <button
        onClick={() => startTransition(async () => setBriefing(await getMorningBriefingAction()))}
        disabled={pending}
        className="mb-6 flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-left hover:border-accent"
      >
        <Sunrise className="h-4 w-4 text-warning" strokeWidth={1.75} />
        <span className="text-sm text-foreground">{pending ? t("Building your morning briefing…") : t("Generate morning briefing")}</span>
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-warning" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-foreground">{t("Morning Briefing")}</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setBriefing(null)}>
          {t("Dismiss")}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-muted">{t("Meetings:")}</span>{" "}
          {briefing.meetingsCount === 0
            ? t("none today")
            : t("{n}, first at {time}", { n: briefing.meetingsCount, time: briefing.firstMeeting ? formatTime(briefing.firstMeeting.time) : "" })}
        </p>
        <p>
          <span className="text-muted">{t("Due today:")}</span> {t("{n} task(s)", { n: briefing.deadlinesToday.length })}
        </p>
        <p>
          <span className="text-muted">{t("Follow-ups due:")}</span> {briefing.followUpsDue.length}
        </p>
        <p>
          <span className="text-muted">{t("Critical projects:")}</span> {briefing.criticalProjects.length}
        </p>
      </div>

      {briefing.prepNeeded.length > 0 && (
        <div className="mt-3 border-t border-warning/20 pt-3">
          <p className="mb-1 text-xs font-medium text-foreground">{t("Prep needed")}</p>
          {briefing.prepNeeded.map((p, i) => (
            <p key={i} className="text-xs text-muted">
              {p.title} ({formatTime(p.time)}){p.notes ? ` — ${p.notes}` : ""}
            </p>
          ))}
        </div>
      )}

      {briefing.criticalProjects.length > 0 && (
        <div className="mt-3 border-t border-warning/20 pt-3">
          <p className="mb-1 text-xs font-medium text-foreground">{t("Critical projects")}</p>
          {briefing.criticalProjects.map((p) => (
            <p key={p.id} className="text-xs text-muted">
              <Link href={`/projects/${p.id}`} className="text-foreground hover:text-accent">
                {p.name}
              </Link>{" "}
              — {p.reason}
            </p>
          ))}
        </div>
      )}

      {briefing.primaryFocus && (
        <div className="mt-3 border-t border-warning/20 pt-3">
          <p className="text-xs">
            <span className="font-semibold text-warning">{t("Recommended primary focus:")}</span>{" "}
            {briefing.primaryFocus.title} — <span className="text-subtle">{briefing.primaryFocus.reason}</span>
          </p>
        </div>
      )}
    </div>
  );
}
