import "server-only";
import { addDays, set } from "date-fns";
import { prisma } from "@/lib/db/client";
import { encodeStringList } from "@/lib/db/fields";
import type { CalendarConnector, SyncResult } from "@/lib/connectors/types";

interface FixtureEvent {
  externalId: string;
  title: string;
  startsInDays: number;
  hour: number;
  minute: number;
  durationMinutes: number;
  requiresPrep?: boolean;
  prepNotes?: string;
}

/** What a real Google/Microsoft calendar sync would hand back. Stable across runs (relative to "today") so re-syncing is idempotent. */
const FIXTURE_EVENTS: FixtureEvent[] = [
  { externalId: "demo-evt-1", title: "Partner sync call — Lisa Vogel", startsInDays: 1, hour: 10, minute: 0, durationMinutes: 30, requiresPrep: true, prepNotes: "Bring the updated sponsorship tiers doc." },
  { externalId: "demo-evt-2", title: "Internal planning stand-up", startsInDays: 0, hour: 9, minute: 0, durationMinutes: 15 },
  { externalId: "demo-evt-3", title: "Site walkthrough", startsInDays: 4, hour: 14, minute: 0, durationMinutes: 90 },
  { externalId: "demo-evt-6", title: "Weekly team sync", startsInDays: 2, hour: 11, minute: 0, durationMinutes: 30 },
];

export class MockCalendarConnector implements CalendarConnector {
  readonly provider = "mock-calendar";

  async syncEvents(userId: string, connectorId: string): Promise<SyncResult> {
    const connector = await prisma.connector.findUnique({ where: { id: connectorId } });
    if (!connector || connector.userId !== userId) {
      return { status: "ERROR", itemsSynced: 0, error: "Connector not found." };
    }

    try {
      const today = new Date();
      let synced = 0;
      for (const fx of FIXTURE_EVENTS) {
        const start = set(addDays(today, fx.startsInDays), { hours: fx.hour, minutes: fx.minute, seconds: 0, milliseconds: 0 });
        const end = new Date(start.getTime() + fx.durationMinutes * 60_000);

        await prisma.calendarEvent.upsert({
          where: { connectorId_externalId: { connectorId, externalId: fx.externalId } },
          create: {
            userId,
            connectorId,
            externalId: fx.externalId,
            title: fx.title,
            startTime: start,
            endTime: end,
            requiresPrep: fx.requiresPrep ?? false,
            prepNotes: fx.prepNotes,
            attendeesJson: encodeStringList([]),
            lastSyncedAt: new Date(),
            syncStatus: "OK",
          },
          // Local edits (title/time) are NOT overwritten by re-sync — only sync bookkeeping
          // fields update. This is the "don't silently overwrite local changes" rule from
          // PRODUCT_SPEC.md §19; a real provider would additionally compare updatedAt/etag.
          update: { lastSyncedAt: new Date(), syncStatus: "OK" },
        });
        synced++;
      }

      await prisma.connector.update({
        where: { id: connectorId },
        data: { status: "CONNECTED", lastSyncedAt: new Date(), lastSyncStatus: "OK", lastSyncError: null },
      });
      return { status: "OK", itemsSynced: synced };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown sync error";
      await prisma.connector.update({
        where: { id: connectorId },
        data: { lastSyncStatus: "ERROR", lastSyncError: message },
      });
      return { status: "ERROR", itemsSynced: 0, error: message };
    }
  }
}
