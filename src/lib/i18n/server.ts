import "server-only";
import { requireUser } from "@/lib/auth/session";
import { getT, isLocale } from "@/lib/i18n/translate";
import type { User } from "@/generated/prisma/client";

/** Combines requireUser() with resolving its locale into a bound t() — the common case for every protected Server Component page. */
export async function requireUserT(): Promise<{ user: User; t: ReturnType<typeof getT> }> {
  const user = await requireUser();
  const t = getT(isLocale(user.locale) ? user.locale : "en");
  return { user, t };
}
