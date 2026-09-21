"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { requireUser } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity/log";
import { getCalendarConnector, getMailConnector } from "@/lib/connectors/registry";
import type { ConnectorType } from "@/generated/prisma/enums";

export async function connectConnector(type: ConnectorType, provider: string, displayName: string) {
  const user = await requireUser();
  const connector = await prisma.connector.upsert({
    where: { userId_type_provider: { userId: user.id, type, provider } },
    create: { userId: user.id, type, provider, displayName, status: "CONNECTED" },
    update: { status: "CONNECTED" },
  });
  await logActivity({ userId: user.id, entityType: "Connector", entityId: connector.id, action: "connector_connected", summary: `Connected ${displayName}` });
  revalidatePath("/settings");
  return connector.id;
}

export async function disconnectConnector(connectorId: string) {
  const user = await requireUser();
  const connector = await prisma.connector.findFirst({ where: { id: connectorId, userId: user.id } });
  if (!connector) return;
  await prisma.connector.update({ where: { id: connectorId }, data: { status: "DISCONNECTED" } });
  await logActivity({ userId: user.id, entityType: "Connector", entityId: connectorId, action: "connector_disconnected", summary: `Disconnected ${connector.displayName}` });
  revalidatePath("/settings");
}

export async function syncConnectorNow(connectorId: string) {
  const user = await requireUser();
  const connector = await prisma.connector.findFirst({ where: { id: connectorId, userId: user.id } });
  if (!connector) return { status: "ERROR" as const, error: "Connector not found." };
  if (connector.status === "DISCONNECTED") return { status: "ERROR" as const, error: "Connector is disconnected." };

  const impl = connector.type === "CALENDAR" ? getCalendarConnector(connector.provider) : connector.type === "MAIL" ? getMailConnector(connector.provider) : undefined;
  if (!impl) return { status: "ERROR" as const, error: `No implementation registered for provider '${connector.provider}'.` };

  const result = "syncEvents" in impl ? await impl.syncEvents(user.id, connectorId) : await impl.syncMail(user.id, connectorId);

  await logActivity({
    userId: user.id,
    entityType: "Connector",
    entityId: connectorId,
    action: "connector_synced",
    summary: result.status === "OK" ? `${connector.displayName} synced (${result.itemsSynced} item(s))` : `${connector.displayName} sync failed: ${result.error}`,
  });

  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/email");
  revalidatePath("/dashboard");
  return result;
}
