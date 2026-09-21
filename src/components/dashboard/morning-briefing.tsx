"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMorningBriefingAction } from "@/lib/actions/briefing";
import { formatTime } from "@/lib/utils/format";
import type { MorningBriefing } from "@/lib/briefing/morning";

export function MorningBriefingPanel() {
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
        <span className="text-sm text-foreground">{pending ? "Building your morning briefing…" : "Generate morning briefing"}</span>
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-warning/30 bg-warning/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sunrise className="h-4 w-4 text-warning" strokeWidth={1.75} />
          <h2 className="text-sm font-semibold text-foreground">Morning Briefing</h2>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setBriefing(null)}>
          Dismiss
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p>
          <span className="text-muted">Meetings:</span>{" "}
          {briefing.meetingsCount === 0
            ? "none today"
            : `${briefing.meetingsCount}, first at ${briefing.firstMeeting ? formatTime(briefing.firstMeeting.time) : ""}`}
        </p>
        <p>
          <span className="text-muted">Due today:</span> {briefing.deadlinesToday.length} task(s)
        </p>
        <p>
          <span className="text-muted">Follow-ups due:</span> {briefing.followUpsDue.length}
        </p>
        <p>
          <span className="text-muted">Critical projects:</span> {briefing.criticalProjects.length}
        </p>
      </div>

      {briefing.prepNeeded.length > 0 && (
        <div className="mt-3 border-t border-warning/20 pt-3">
          <p className="mb-1 text-xs font-medium text-foreground">Prep needed</p>
          {briefing.prepNeeded.map((p, i) => (
            <p key={i} className="text-xs text-muted">
              {p.title} ({formatTime(p.time)}){p.notes ? ` — ${p.notes}` : ""}
            </p>
          ))}
        </div>
      )}

      {briefing.criticalProjects.length > 0 && (
        <div className="mt-3 border-t border-warning/20 pt-3">
          <p className="mb-1 text-xs font-medium text-foreground">Critical projects</p>
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
            <span className="font-semibold text-warning">Recommended primary focus:</span>{" "}
            {briefing.primaryFocus.title} — <span className="text-subtle">{briefing.primaryFocus.reason}</span>
          </p>
        </div>
      )}
    </div>
  );
}
