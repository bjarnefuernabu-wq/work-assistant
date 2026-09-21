"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { captureInboxItem, type CaptureFormState } from "@/lib/actions/inbox";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="sm" disabled={pending}>
      Capture
    </Button>
  );
}

export function CaptureForm() {
  const [state, formAction] = useActionState<CaptureFormState, FormData>(captureInboxItem, undefined);
  return (
    <form action={formAction} className="mb-4 flex gap-2">
      <Input name="title" placeholder="Capture a thought, idea, or reminder…" required className="flex-1" />
      <SubmitButton />
      {state?.error && <p className="text-xs text-critical">{state.error}</p>}
    </form>
  );
}
