import "server-only";

/**
 * Provider-neutral connector interfaces (PRODUCT_SPEC.md §19). A real OAuth-backed provider
 * (Google Calendar, Gmail, Microsoft 365, ...) implements the same interface as the mock
 * connectors in this directory — swapping providers is a matter of adding a new
 * implementation and registering it in `src/lib/connectors/registry.ts`, not touching domain
 * logic or the sync call sites.
 */

export interface SyncResult {
  status: "OK" | "ERROR";
  itemsSynced: number;
  error?: string;
}

export interface CalendarConnector {
  readonly provider: string;
  /** Pulls events from the external system and idempotently upserts local CalendarEvent rows. */
  syncEvents(userId: string, connectorId: string): Promise<SyncResult>;
}

export interface MailConnector {
  readonly provider: string;
  /** Pulls threads/messages from the external system and idempotently upserts local rows. */
  syncMail(userId: string, connectorId: string): Promise<SyncResult>;
}

export interface ConnectorFailureSimulation {
  /** For demoing/testing the disconnected + sync-failure states without a real integration. */
  forceFailureOnce?: boolean;
}
