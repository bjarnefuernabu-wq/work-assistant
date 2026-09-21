import "server-only";
import { MockCalendarConnector } from "@/lib/connectors/mock-calendar";
import { MockMailConnector } from "@/lib/connectors/mock-mail";
import type { CalendarConnector, MailConnector } from "@/lib/connectors/types";

const calendarConnectors: Record<string, CalendarConnector> = {
  "mock-calendar": new MockCalendarConnector(),
};

const mailConnectors: Record<string, MailConnector> = {
  "mock-mail": new MockMailConnector(),
};

export function getCalendarConnector(provider: string): CalendarConnector | undefined {
  return calendarConnectors[provider];
}

export function getMailConnector(provider: string): MailConnector | undefined {
  return mailConnectors[provider];
}
