"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import { useTranslation } from "@/components/i18n/locale-provider";
import type { TaskFormState } from "@/lib/actions/tasks";
import type { Task } from "@/generated/prisma/client";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  const { t } = useTranslation();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? t("Saving…") : label}
    </Button>
  );
}

function toInputDate(date: Date | null | undefined) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export function TaskForm({
  action,
  task,
  defaultProjectId,
  projects,
  otherTasks,
  submitLabel,
}: {
  action: (state: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  task?: Task & { tagsJson?: string };
  defaultProjectId?: string;
  projects: { id: string; name: string }[];
  otherTasks?: { id: string; title: string }[];
  submitLabel: string;
}) {
  const { t } = useTranslation();
  const [state, formAction] = useActionState<TaskFormState, FormData>(action, undefined);
  const tags: string[] = task?.tagsJson ? JSON.parse(task.tagsJson) : [];

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div>
        <Label htmlFor="title">{t("Title")}</Label>
        <Input id="title" name="title" required defaultValue={task?.title} autoFocus />
      </div>

      <div>
        <Label htmlFor="description">{t("Description")}</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={task?.description ?? ""} />
      </div>

      <div>
        <Label htmlFor="projectId">{t("Project")}</Label>
        <Select id="projectId" name="projectId" defaultValue={task?.projectId ?? defaultProjectId ?? ""}>
          <option value="">{t("— No project (goes to Inbox context) —")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">{t("Status")}</Label>
          <Select id="status" name="status" defaultValue={task?.status ?? "INBOX"}>
            {TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">{t("Priority")}</Label>
          <Select id="priority" name="priority" defaultValue={task?.priority ?? "NORMAL"}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dueDate">{t("Due date")}</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={toInputDate(task?.dueDate)} />
          <p className="mt-1 text-[11px] text-subtle">{t("When it must be finished by.")}</p>
        </div>
        <div>
          <Label htmlFor="plannedDate">{t("Planned date")}</Label>
          <Input id="plannedDate" name="plannedDate" type="date" defaultValue={toInputDate(task?.plannedDate)} />
          <p className="mt-1 text-[11px] text-subtle">{t("When you intend to work on it.")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimatedDuration">{t("Estimated duration (minutes)")}</Label>
          <Input
            id="estimatedDuration"
            name="estimatedDuration"
            type="number"
            min={0}
            defaultValue={task?.estimatedDuration ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="assignee">{t("Assignee")}</Label>
          <Input id="assignee" name="assignee" defaultValue={task?.assignee ?? ""} placeholder={t("You, by default")} />
        </div>
      </div>

      {!task && otherTasks && otherTasks.length > 0 && (
        <div>
          <Label htmlFor="dependsOnId">{t("Depends on (optional)")}</Label>
          <Select id="dependsOnId" name="dependsOnId" defaultValue="">
            <option value="">{t("— None —")}</option>
            {otherTasks.map((t2) => (
              <option key={t2.id} value={t2.id}>
                {t2.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="tags">{t("Tags (comma-separated)")}</Label>
        <Input id="tags" name="tags" defaultValue={tags.join(", ")} />
      </div>

      {state?.error && <p className="text-xs text-critical">{t(state.error)}</p>}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
