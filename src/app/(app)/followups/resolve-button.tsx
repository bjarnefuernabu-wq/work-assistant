"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveWaitingItem } from "@/lib/actions/waiting";
import { useTranslation } from "@/components/i18n/locale-provider";

export function ResolveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();
  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => resolveWaitingItem(id))}>
      <Check className="h-3.5 w-3.5" /> {t("Resolved")}
    </Button>
  );
}
