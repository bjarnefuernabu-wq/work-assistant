import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns";

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return format(new Date(date), "HH:mm");
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return `${formatDate(date)} · ${formatTime(date)}`;
}

export function formatRelativeAge(date: Date | string): string {
  return formatDistanceToNowStrict(new Date(date), { addSuffix: true });
}

export function formatMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  if (minutes === 0) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
