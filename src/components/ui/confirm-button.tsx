"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * Two-step confirmation for consequential writes (delete project, delete meeting, etc).
 * First click reveals what will happen and a real confirm button; nothing executes until
 * that second explicit click, per PRODUCT_SPEC.md §2/§20.
 */
export function ConfirmButton({
  onConfirm,
  label,
  confirmLabel,
  description,
  variant = "danger",
  className,
}: {
  onConfirm: () => Promise<void>;
  label: string;
  confirmLabel: string;
  description: string;
  variant?: "danger" | "secondary";
  className?: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant={variant} size="sm" className={className} onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className={cn("flex items-center gap-2 rounded-md border border-critical/30 bg-critical/5 px-3 py-2", className)}>
      <span className="text-xs text-foreground">{description}</span>
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => { await onConfirm(); })}
      >
        {pending ? "Working…" : confirmLabel}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
