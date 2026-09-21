"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { captureInboxItem, type CaptureFormState } from "@/lib/actions/inbox";
import { useTranslation } from "@/components/i18n/locale-provider";

function SubmitButton() {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" variant="primary" size="sm" disabled={pending}>
      {t("Capture")}
    </Button>
  );
}

export function CaptureForm() {
  const { t } = useTranslation();
  const [state, formAction] = useActionState<CaptureFormState, FormData>(captureInboxItem, undefined);
  return (
    <form action={formAction} className="mb-4 flex gap-2">
      <Input name="title" placeholder={t("Capture a thought, idea, or reminder…")} required className="flex-1" />
      <SubmitButton />
      {state?.error && <p className="text-xs text-critical">{t(state.error)}</p>}
    </form>
  );
}
