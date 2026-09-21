"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { PRIORITY_OPTIONS, PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import type { ProjectFormState } from "@/lib/actions/projects";
import type { Project } from "@/generated/prisma/client";

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

export function ProjectForm({
  action,
  project,
  submitLabel,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>;
  project?: Project & { tagsJson?: string };
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ProjectFormState, FormData>(action, undefined);
  const tags: string[] = project?.tagsJson ? JSON.parse(project.tagsJson) : [];

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={project?.name} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={project?.status ?? "ACTIVE"}>
            {PROJECT_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={project?.priority ?? "NORMAL"}>
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="objective">Objective</Label>
        <Textarea
          id="objective"
          name="objective"
          rows={2}
          defaultValue={project?.objective ?? ""}
          placeholder="What does 'done' look like for this project?"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={project?.description ?? ""} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={toInputDate(project?.startDate)}
          />
        </div>
        <div>
          <Label htmlFor="targetDate">Target date</Label>
          <Input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={toInputDate(project?.targetDate)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="responsiblePerson">Responsible person</Label>
          <Input
            id="responsiblePerson"
            name="responsiblePerson"
            defaultValue={project?.responsiblePerson ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="budget">Budget (optional)</Label>
          <Input id="budget" name="budget" type="number" step="0.01" defaultValue={project?.budget ?? ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Input id="tags" name="tags" defaultValue={tags.join(", ")} placeholder="event, partners" />
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={project?.notes ?? ""} />
      </div>

      {state?.error && <p className="text-xs text-critical">{state.error}</p>}

      <div className="flex gap-2">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
