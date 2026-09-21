import "server-only";
import { prisma } from "@/lib/db/client";

interface LogActivityInput {
  userId: string;
  entityType: string;
  entityId?: string;
  action: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

/**
 * Records an audit-friendly activity entry. Never pass raw sensitive content (email bodies,
 * full drafts) into `summary`/`metadata` — summarize instead, per PRODUCT_SPEC.md §17.
 */
export async function logActivity(input: LogActivityInput) {
  await prisma.activityLogEntry.create({
    data: {
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      summary: input.summary,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}
