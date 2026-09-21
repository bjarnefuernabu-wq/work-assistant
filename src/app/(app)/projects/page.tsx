import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/projects";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_TONE } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listProjects(user.id);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Projects</h1>
          <p className="text-sm text-muted">{projects.length} total</p>
        </div>
        <Link href="/projects/new">
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> New project
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start tracking tasks, milestones, and follow-ups."
          action={
            <Link href="/projects/new" className="mt-2">
              <Button variant="primary" size="sm">
                New project
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-subtle">
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Priority</th>
                <th className="px-4 py-2 font-medium">Target date</th>
                <th className="px-4 py-2 font-medium">Open tasks</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface/60">
                  <td className="px-4 py-2.5">
                    <Link href={`/projects/${p.id}`} className="font-medium text-foreground hover:text-accent">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={PROJECT_STATUS_TONE[p.status]}>{p.status.replace("_", " ")}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <PriorityBadge priority={p.priority} />
                  </td>
                  <td className="px-4 py-2.5 text-muted">{formatDate(p.targetDate)}</td>
                  <td className="px-4 py-2.5 text-muted">{p._count.tasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
