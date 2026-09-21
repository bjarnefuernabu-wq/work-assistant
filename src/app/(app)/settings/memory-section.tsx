"use client";

import { useActionState, useState, useTransition } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { createMemoryEntry, updateMemoryEntry, deleteMemoryEntry, type MemoryFormState } from "@/lib/actions/memory";
import type { MemoryEntry } from "@/generated/prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  PREFERENCE: "Preference",
  PROJECT_KNOWLEDGE: "Project knowledge",
  CONTACT: "Contact",
  DECISION: "Decision",
  WORKING_PATTERN: "Working pattern",
};

export function MemorySection({ entries }: { entries: MemoryEntry[] }) {
  const [state, formAction] = useActionState<MemoryFormState, FormData>(createMemoryEntry, undefined);

  const byCategory = entries.reduce<Record<string, MemoryEntry[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <form action={formAction} className="flex items-start gap-2 rounded-md border border-border bg-surface p-3">
        <Select name="category" defaultValue="PREFERENCE" className="w-44 shrink-0">
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Textarea name="content" rows={1} placeholder="e.g. Monday mornings are for focused work" className="flex-1" required />
        <Button type="submit" variant="secondary" size="sm">
          Add
        </Button>
      </form>
      {state?.error && <p className="text-xs text-critical">{state.error}</p>}

      {Object.keys(byCategory).length === 0 ? (
        <p className="px-1 text-xs text-subtle">No memory entries yet.</p>
      ) : (
        Object.entries(byCategory).map(([category, items]) => (
          <div key={category}>
            <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-subtle uppercase">{CATEGORY_LABELS[category]}</p>
            <div className="space-y-1.5">
              {items.map((entry) => (
                <MemoryRow key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MemoryRow({ entry }: { entry: MemoryEntry }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(entry.content);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-accent/40 bg-surface p-2.5">
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={2} className="flex-1" />
        <div className="flex flex-col gap-1">
          <button
            disabled={pending}
            onClick={() => startTransition(async () => { await updateMemoryEntry(entry.id, value); setEditing(false); })}
            className="rounded p-1 text-ok hover:bg-ok/10"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => { setValue(entry.content); setEditing(false); }} className="rounded p-1 text-subtle hover:bg-surface-raised">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2">
      <p className="flex-1 text-sm text-foreground">{entry.content}</p>
      <div className="flex shrink-0 gap-1">
        <button onClick={() => setEditing(true)} className="rounded p-1 text-subtle hover:text-foreground">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          disabled={pending}
          onClick={() => startTransition(() => deleteMemoryEntry(entry.id))}
          className="rounded p-1 text-subtle hover:text-critical"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
