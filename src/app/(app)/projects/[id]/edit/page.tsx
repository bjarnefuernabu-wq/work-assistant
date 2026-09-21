import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { updateProject } from "@/lib/actions/projects";
import { ProjectForm } from "@/components/projects/project-form";
import { requireUserT } from "@/lib/i18n/server";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, t } = await requireUserT();
  const project = await prisma.project.findFirst({ where: { id, userId: user.id } });
  if (!project) notFound();

  const boundAction = updateProject.bind(null, project.id);

  return (
    <div className="p-6">
      <h1 className="mb-5 text-lg font-semibold text-foreground">{t("Edit project")}</h1>
      <ProjectForm action={boundAction} project={project} submitLabel={t("Save changes")} />
    </div>
  );
}
