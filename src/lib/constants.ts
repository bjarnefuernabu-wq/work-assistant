import type { Priority, ProjectStatus, TaskStatus, RiskLevel } from "@/generated/prisma/enums";

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "AT_RISK", label: "At risk" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const TASK_STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "INBOX", label: "Inbox" },
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export const RISK_LEVEL_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

export const PROJECT_STATUS_TONE: Record<ProjectStatus, "neutral" | "accent" | "critical" | "warning" | "ok"> = {
  ACTIVE: "accent",
  ON_HOLD: "neutral",
  AT_RISK: "critical",
  COMPLETED: "ok",
  CANCELLED: "neutral",
};

export const TASK_STATUS_TONE: Record<TaskStatus, "neutral" | "accent" | "critical" | "warning" | "ok"> = {
  INBOX: "neutral",
  PLANNED: "accent",
  IN_PROGRESS: "warning",
  WAITING: "critical",
  COMPLETED: "ok",
  CANCELLED: "neutral",
};
