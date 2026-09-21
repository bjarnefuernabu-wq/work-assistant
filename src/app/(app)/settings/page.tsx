import { prisma } from "@/lib/db/client";
import { getAIProvider } from "@/lib/ai/provider";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format";
import { ConnectButton, DisconnectButton, SyncNowButton } from "./connector-actions";
import { MemorySection } from "./memory-section";
import { AccountSection } from "./account-section";
import { LanguageSection } from "./language-section";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

const AVAILABLE_CONNECTORS = [
  { type: "CALENDAR" as const, provider: "mock-calendar", displayName: "Demo Calendar" },
  { type: "MAIL" as const, provider: "mock-mail", displayName: "Demo Mail" },
];

export default async function SettingsPage() {
  const { user, t } = await requireUserT();
  const [connectors, memoryEntries] = await Promise.all([
    prisma.connector.findMany({ where: { userId: user.id } }),
    prisma.memoryEntry.findMany({ where: { userId: user.id, isVisible: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const provider = getAIProvider();
  const locale = isLocale(user.locale) ? user.locale : "en";

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{t("Settings")}</h1>
        <p className="text-sm text-muted">{t("Account, language, connectors, AI provider, and assistant memory.")}</p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Account")}</h2>
        <AccountSection currentEmail={user.email} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Language")}</h2>
        <LanguageSection current={locale} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Connectors")}</h2>
        <div className="space-y-2">
          {AVAILABLE_CONNECTORS.map((available) => {
            const existing = connectors.find((c) => c.provider === available.provider);
            return (
              <Panel key={available.provider}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{available.displayName}</span>
                      {!existing || existing.status === "DISCONNECTED" ? (
                        <Badge tone="neutral">{t("Disconnected")}</Badge>
                      ) : existing.lastSyncStatus === "ERROR" ? (
                        <Badge tone="critical">{t("Sync error")}</Badge>
                      ) : (
                        <Badge tone="ok">{t("Connected")}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      {available.type === "CALENDAR" ? t("Simulated calendar connector") : t("Simulated mail connector")}
                      {existing?.lastSyncedAt && ` · ${t("last synced")} ${formatDateTime(existing.lastSyncedAt, locale)}`}
                    </p>
                    {existing?.lastSyncError && <p className="mt-0.5 text-xs text-critical">{existing.lastSyncError}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {existing && existing.status === "CONNECTED" ? (
                      <>
                        <SyncNowButton connectorId={existing.id} />
                        <DisconnectButton connectorId={existing.id} />
                      </>
                    ) : (
                      <ConnectButton type={available.type} provider={available.provider} displayName={available.displayName} />
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-subtle">
          {t(
            "These simulate real calendar/mail providers end-to-end (idempotent sync, disconnect, sync failure states) so the connector architecture is proven without needing a real OAuth app registration. See ARCHITECTURE.md for how a real provider plugs in.",
          )}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("AI provider")}</h2>
        <Panel>
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{provider.isLive ? t("Anthropic (live)") : t("Offline fallback")}</span>
                <Badge tone={provider.isLive ? "ok" : "warning"}>{provider.isLive ? t("Live") : t("Mock")}</Badge>
              </div>
              <p className="text-xs text-muted">
                {provider.isLive
                  ? t("ANTHROPIC_API_KEY is configured — the assistant uses real Claude tool-use.")
                  : t("No ANTHROPIC_API_KEY configured. Add one to .env and restart the server to enable full assistant capability.")}
              </p>
            </div>
          </div>
        </Panel>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("Assistant memory")}</h2>
        <p className="mb-3 text-xs text-muted">
          {t(
            "What the assistant remembers about your preferences, working patterns, and project context. Fully visible, editable, and deletable — nothing is stored silently.",
          )}
        </p>
        <MemorySection entries={memoryEntries} />
      </section>
    </div>
  );
}
