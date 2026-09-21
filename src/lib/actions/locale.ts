"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { isLocale, type Locale } from "@/lib/i18n/translate";

const GUEST_LOCALE_COOKIE = "guest_locale";

/** Pre-login language preference (login page has no user row to read a locale from yet). */
export async function getGuestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(GUEST_LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export async function setGuestLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/login");
}

/** Authenticated preference — persisted per user, takes over from the guest cookie after login. */
export async function setUserLocale(locale: Locale) {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { locale } });
  revalidatePath("/", "layout");
}
