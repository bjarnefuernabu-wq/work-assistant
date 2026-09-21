// SQLite has no native array/JSON column type in Prisma, so list-ish fields are stored as a
// JSON-encoded string (`tagsJson`, `participantsJson`, ...). These helpers keep that encoding
// in one place instead of ad hoc JSON.parse/stringify at call sites.

export function encodeStringList(values: string[]): string {
  return JSON.stringify(values.filter((v) => v.trim().length > 0));
}

export function decodeStringList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function parseTagsInput(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
