import { prisma } from "@/lib/db/client";
import { createTask } from "@/lib/actions/tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { requireUserT } from "@/lib/i18n/server";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  const { user, t } = await requireUserT();
  const [projects, otherTasks] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.task.findMany({
      where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="p-6">
      <h1 className="mb-5 text-lg font-semibold text-foreground">{t("New task")}</h1>
      <TaskForm
        action={createTask}
        projects={projects}
        otherTasks={otherTasks}
        defaultProjectId={projectId}
        submitLabel={t("Create task")}
      />
    </div>
  );
}
