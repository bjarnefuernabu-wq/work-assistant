import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";
import { de as deLocale } from "date-fns/locale";
import { translate, type Locale } from "@/lib/i18n/translate";

function dateFnsLocale(locale: Locale) {
  return locale === "de" ? deLocale : undefined;
}

export function formatDate(date: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isToday(d)) return translate(locale, "Today");
  if (isTomorrow(d)) return translate(locale, "Tomorrow");
  if (isYesterday(d)) return translate(locale, "Yesterday");
  return format(d, "MMM d", { locale: dateFnsLocale(locale) });
}

export function formatDateLong(date: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy", { locale: dateFnsLocale(locale) });
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "HH:mm");
}

export function formatDateTime(date: Date | string | null | undefined, locale: Locale = "en"): string {
  if (!date) return "—";
  return `${formatDate(date, locale)} · ${formatTime(date)}`;
}

export function formatRelativeAge(date: Date | string, locale: Locale = "en"): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true, locale: dateFnsLocale(locale) });
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes === 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
