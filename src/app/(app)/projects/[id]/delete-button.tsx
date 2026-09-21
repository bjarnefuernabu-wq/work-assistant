"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteProject } from "@/lib/actions/projects";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  return (
    <ConfirmButton
      label="Delete"
      confirmLabel="Delete permanently"
      description={`Delete '${projectName}' and all its tasks, milestones, notes, and links? This cannot be undone.`}
      onConfirm={() => deleteProject(projectId)}
    />
  );
}
