"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectConnector, disconnectConnector, syncConnectorNow } from "@/lib/actions/connectors";
import { useTranslation } from "@/components/i18n/locale-provider";
import type { ConnectorType } from "@/generated/prisma/enums";

export function ConnectButton({ type, provider, displayName }: { type: ConnectorType; provider: string; displayName: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();
  return (
    <Button size="sm" variant="primary" disabled={pending} onClick={() => startTransition(async () => { await connectConnector(type, provider, displayName); })}>
      {pending ? t("Connecting…") : t("Connect")}
    </Button>
  );
}

export function DisconnectButton({ connectorId }: { connectorId: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();
  return (
    <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => disconnectConnector(connectorId))}>
      {t("Disconnect")}
    </Button>
  );
}

export function SyncNowButton({ connectorId }: { connectorId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await syncConnectorNow(connectorId);
            setMessage(
              result.status === "OK"
                ? t("Synced {n} item(s)", { n: result.itemsSynced })
                : t("Failed: {error}", { error: result.error ?? "" }),
            );
          })
        }
      >
        <RefreshCw className={pending ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
        {pending ? t("Syncing…") : t("Sync now")}
      </Button>
      {message && <span className="text-[11px] text-muted">{message}</span>}
    </div>
  );
}
