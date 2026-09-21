import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { updateTask } from "@/lib/actions/tasks";
import { TaskForm } from "@/components/tasks/task-form";
import { DeleteTaskButton } from "./delete-button";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const task = await prisma.task.findFirst({
    where: { id, userId: user.id },
    include: { dependsOn: { include: { dependsOnTask: true } } },
  });
  if (!task) notFound();

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const boundAction = updateTask.bind(null, task.id);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Edit task</h1>
        <DeleteTaskButton taskId={task.id} taskTitle={task.title} projectId={task.projectId} />
      </div>

      {task.dependsOn.length > 0 && (
        <div className="mb-4 max-w-2xl rounded-md border border-border bg-surface px-3 py-2 text-xs text-muted">
          Depends on:{" "}
          {task.dependsOn.map((d, i) => (
            <span key={d.id}>
              {i > 0 && ", "}
              <Link href={`/tasks/${d.dependsOnTask.id}`} className="text-accent hover:underline">
                {d.dependsOnTask.title}
              </Link>
              {d.dependsOnTask.status !== "COMPLETED" && (
                <span className="ml-1 text-critical">(not done)</span>
              )}
            </span>
          ))}
        </div>
      )}

      <TaskForm action={boundAction} task={task} projects={projects} submitLabel="Save changes" />
    </div>
  );
}
