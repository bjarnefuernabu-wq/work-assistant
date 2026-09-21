import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { searchAll } from "@/lib/search/global-search";
import { Panel, EmptyState } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const { q } = await searchParams;
  const results = q ? await searchAll(user.id, q) : [];

  const grouped = results.reduce<Record<string, typeof results>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="mb-4 text-lg font-semibold text-foreground">Search</h1>
      <form className="mb-6 max-w-xl">
        <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface-raised px-3">
          <SearchIcon className="h-4 w-4 text-subtle" strokeWidth={1.75} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search projects, tasks, contacts, notes, decisions, email, meetings…"
            autoFocus
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>
      </form>

      {!q ? (
        <p className="text-sm text-subtle">Type at least 2 characters and press enter.</p>
      ) : results.length === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for "${q}".`} />
      ) : (
        <div className="max-w-2xl space-y-5">
          {Object.entries(grouped).map(([type, items]) => (
            <Panel key={type} title={`${type} (${items.length})`}>
              {items.map((r) => (
                <Link key={`${r.type}-${r.id}`} href={r.href} className="flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-0 hover:bg-surface-raised">
                  <Badge tone="neutral">{r.type}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{r.title}</span>
                  {r.context && <span className="shrink-0 truncate text-xs text-subtle" style={{ maxWidth: 240 }}>{r.context}</span>}
                </Link>
              ))}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
