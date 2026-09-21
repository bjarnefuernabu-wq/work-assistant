"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteProject } from "@/lib/actions/projects";
import { useTranslation } from "@/components/i18n/locale-provider";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const { t } = useTranslation();
  return (
    <ConfirmButton
      label={t("Delete")}
      confirmLabel={t("Delete permanently")}
      description={t("Delete '{name}' and all its tasks, milestones, notes, and links? This cannot be undone.", { name: projectName })}
      onConfirm={() => deleteProject(projectId)}
    />
  );
}
