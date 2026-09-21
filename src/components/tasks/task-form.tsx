"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import type { TaskFormState } from "@/lib/actions/tasks";
import type { Task } from "@/generated/prisma/client";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? "Saving…" : label}
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
  const [state, formAction] = useActionState<TaskFormState, FormData>(action, undefined);
  const tags: string[] = task?.tagsJson ? JSON.parse(task.tagsJson) : [];

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required defaultValue={task?.title} autoFocus />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={task?.description ?? ""} />
      </div>

      <div>
        <Label htmlFor="projectId">Project</Label>
        <Select id="projectId" name="projectId" defaultValue={task?.projectId ?? defaultProjectId ?? ""}>
          <option value="">— No project (goes to Inbox context) —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={task?.status ?? "INBOX"}>
            {TASK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={task?.priority ?? "NORMAL"}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={toInputDate(task?.dueDate)} />
          <p className="mt-1 text-[11px] text-subtle">When it must be finished by.</p>
        </div>
        <div>
          <Label htmlFor="plannedDate">Planned date</Label>
          <Input id="plannedDate" name="plannedDate" type="date" defaultValue={toInputDate(task?.plannedDate)} />
          <p className="mt-1 text-[11px] text-subtle">When you intend to work on it.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="estimatedDuration">Estimated duration (minutes)</Label>
          <Input
            id="estimatedDuration"
            name="estimatedDuration"
            type="number"
            min={0}
            defaultValue={task?.estimatedDuration ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="assignee">Assignee</Label>
          <Input id="assignee" name="assignee" defaultValue={task?.assignee ?? ""} placeholder="You, by default" />
        </div>
      </div>

      {!task && otherTasks && otherTasks.length > 0 && (
        <div>
          <Label htmlFor="dependsOnId">Depends on (optional)</Label>
          <Select id="dependsOnId" name="dependsOnId" defaultValue="">
            <option value="">— None —</option>
            {otherTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" defaultValue={tags.join(", ")} />
      </div>

      {state?.error && <p className="text-xs text-critical">{state.error}</p>}

      <SubmitButton label={submitLabel} />
    </form>
  );
}
