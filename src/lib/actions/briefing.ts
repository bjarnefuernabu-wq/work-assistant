"use server";

import { requireUserT } from "@/lib/i18n/server";
import { buildMorningBriefing, type MorningBriefing } from "@/lib/briefing/morning";
import { buildWeeklyReview, type WeeklyReview } from "@/lib/briefing/weekly-review";

export async function getMorningBriefingAction(): Promise<MorningBriefing> {
  const { user, t } = await requireUserT();
  return buildMorningBriefing(user.id, t);
}

export async function getWeeklyReviewAction(): Promise<WeeklyReview> {
  const { user } = await requireUserT();
  return buildWeeklyReview(user.id);
}
