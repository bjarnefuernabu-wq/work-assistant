"use server";

import { requireUser } from "@/lib/auth/session";
import { buildMorningBriefing, type MorningBriefing } from "@/lib/briefing/morning";
import { buildWeeklyReview, type WeeklyReview } from "@/lib/briefing/weekly-review";

export async function getMorningBriefingAction(): Promise<MorningBriefing> {
  const user = await requireUser();
  return buildMorningBriefing(user.id);
}

export async function getWeeklyReviewAction(): Promise<WeeklyReview> {
  const user = await requireUser();
  return buildWeeklyReview(user.id);
}
