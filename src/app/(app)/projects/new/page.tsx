import { createProject } from "@/lib/actions/projects";
import { ProjectForm } from "@/components/projects/project-form";
import { requireUserT } from "@/lib/i18n/server";

export default async function NewProjectPage() {
  const { t } = await requireUserT();
  return (
    <div className="p-6">
      <h1 className="mb-5 text-lg font-semibold text-foreground">{t("New project")}</h1>
      <ProjectForm action={createProject} submitLabel={t("Create project")} />
    </div>
  );
}
