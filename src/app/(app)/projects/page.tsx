import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { listProjects } from "@/lib/data/projects";
import { Badge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { PROJECT_STATUS_TONE, PROJECT_STATUS_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/utils/format";
import { requireUserT } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/translate";

export default async function ProjectsPage() {
  const { user, t } = await requireUserT();
  const locale = isLocale(user.locale) ? user.locale : "en";
  const projects = await listProjects(user.id);

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{t("Projects")}</h1>
          <p className="text-sm text-muted">{t("{n} total", { n: projects.length })}</p>
        </div>
        <Link href="/projects/new">
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5" /> {t("New project")}
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t("No projects yet")}
          description={t("Create your first project to start tracking tasks, milestones, and follow-ups.")}
          action={
            <Link href="/projects/new" className="mt-2">
              <Button variant="primary" size="sm">
                {t("New project")}
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left text-xs text-subtle">
                <th className="px-4 py-2 font-medium">{t("Name")}</th>
                <th className="px-4 py-2 font-medium">{t("Status")}</th>
                <th className="px-4 py-2 font-medium">{t("Priority")}</th>
                <th className="px-4 py-2 font-medium">{t("Target date")}</th>
                <th className="px-4 py-2 font-medium">{t("Open tasks")}</th>
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
                    <Badge tone={PROJECT_STATUS_TONE[p.status]}>{t(PROJECT_STATUS_LABEL[p.status])}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <PriorityBadge priority={p.priority} t={t} />
                  </td>
                  <td className="px-4 py-2.5 text-muted">{formatDate(p.targetDate, locale)}</td>
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
