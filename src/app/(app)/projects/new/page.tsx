import { requireUser } from "@/lib/auth/session";
import { createProject } from "@/lib/actions/projects";
import { ProjectForm } from "@/components/projects/project-form";

export default async function NewProjectPage() {
  await requireUser();
  return (
    <div className="p-6">
      <h1 className="mb-5 text-lg font-semibold text-foreground">New project</h1>
      <ProjectForm action={createProject} submitLabel="Create project" />
    </div>
  );
}
