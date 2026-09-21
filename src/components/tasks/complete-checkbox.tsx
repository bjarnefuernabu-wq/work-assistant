"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { toggleTaskComplete } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils/cn";

export function CompleteCheckbox({ taskId, completed }: { taskId: string; completed: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleTaskComplete(taskId, !completed))}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        completed
          ? "border-ok bg-ok/20 text-ok"
          : "border-border-strong text-transparent hover:border-accent",
        pending && "opacity-50",
      )}
      aria-label={completed ? "Mark incomplete" : "Mark complete"}
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </button>
  );
}
