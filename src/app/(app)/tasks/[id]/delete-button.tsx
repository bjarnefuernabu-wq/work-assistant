"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTask } from "@/lib/actions/tasks";
import { useTranslation } from "@/components/i18n/locale-provider";

export function DeleteTaskButton({
  taskId,
  taskTitle,
  projectId,
}: {
  taskId: string;
  taskTitle: string;
  projectId: string | null;
}) {
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <ConfirmButton
      label={t("Delete")}
      confirmLabel={t("Delete")}
      description={t("Delete task '{title}'? This cannot be undone.", { title: taskTitle })}
      onConfirm={async () => {
        await deleteTask(taskId);
        router.push(projectId ? `/projects/${projectId}` : "/tasks");
      }}
    />
  );
}
