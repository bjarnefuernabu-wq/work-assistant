import "server-only";
import { subDays } from "date-fns";
import { prisma } from "@/lib/db/client";
import { encodeStringList } from "@/lib/db/fields";
import type { MailConnector, SyncResult } from "@/lib/connectors/types";

interface FixtureThread {
  externalId: string;
  subject: string;
  fromAddress: string;
  fromName: string;
  daysAgo: number;
  bodyText: string;
  requiresAction: boolean;
}

const FIXTURE_THREADS: FixtureThread[] = [
  {
    externalId: "demo-thread-3",
    subject: "Insurance certificate — still need a copy",
    fromAddress: "venue@example.com",
    fromName: "Venue Coordination",
    daysAgo: 1,
    bodyText: "Reminder: we still need a copy of your event insurance certificate before the walkthrough.",
    requiresAction: true,
  },
];

export class MockMailConnector implements MailConnector {
  readonly provider = "mock-mail";

  async syncMail(userId: string, connectorId: string): Promise<SyncResult> {
    const connector = await prisma.connector.findUnique({ where: { id: connectorId } });
    if (!connector || connector.userId !== userId) {
      return { status: "ERROR", itemsSynced: 0, error: "Connector not found." };
    }

    try {
      let synced = 0;
      for (const fx of FIXTURE_THREADS) {
        const lastMessageAt = subDays(new Date(), fx.daysAgo);
        const thread = await prisma.emailThread.upsert({
          where: { connectorId_externalId: { connectorId, externalId: fx.externalId } },
          create: {
            userId,
            connectorId,
            externalId: fx.externalId,
            subject: fx.subject,
            participantsJson: encodeStringList([fx.fromAddress]),
            lastMessageAt,
            isUnread: true,
            requiresAction: fx.requiresAction,
            snippet: fx.bodyText.slice(0, 120),
            lastSyncedAt: new Date(),
          },
          update: { lastSyncedAt: new Date() },
        });

        await prisma.emailMessage.upsert({
          where: { threadId_externalId: { threadId: thread.id, externalId: `${fx.externalId}-msg-1` } },
          create: {
            threadId: thread.id,
            externalId: `${fx.externalId}-msg-1`,
            fromAddress: fx.fromAddress,
            fromName: fx.fromName,
            toAddressesJson: encodeStringList([]),
            sentAt: lastMessageAt,
            bodyText: fx.bodyText,
            isFromUser: false,
          },
          update: {},
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
