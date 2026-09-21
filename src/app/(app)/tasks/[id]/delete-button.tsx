"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { deleteTask } from "@/lib/actions/tasks";

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
  return (
    <ConfirmButton
      label="Delete"
      confirmLabel="Delete"
      description={`Delete task '${taskTitle}'? This cannot be undone.`}
      onConfirm={async () => {
        await deleteTask(taskId);
        router.push(projectId ? `/projects/${projectId}` : "/tasks");
      }}
    />
  );
}
