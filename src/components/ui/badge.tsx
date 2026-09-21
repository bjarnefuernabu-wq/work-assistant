import { cn } from "@/lib/utils/cn";
import type { Priority } from "@/generated/prisma/enums";

const priorityClasses: Record<Priority, string> = {
  CRITICAL: "bg-critical/10 text-critical border-critical/30",
  HIGH: "bg-warning/10 text-warning border-warning/30",
  NORMAL: "bg-info/10 text-info border-info/30",
  LOW: "bg-subtle/10 text-subtle border-subtle/30",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
        priorityClasses[priority],
      )}
    >
      {priority}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "critical" | "warning" | "ok";
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    neutral: "bg-surface-raised text-muted border-border",
    accent: "bg-accent/10 text-accent border-accent/30",
    critical: "bg-critical/10 text-critical border-critical/30",
    warning: "bg-warning/10 text-warning border-warning/30",
    ok: "bg-ok/10 text-ok border-ok/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
