"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createWaitingItem, type WaitingFormState } from "@/lib/actions/waiting";

export function NewWaitingItemForm({
  contacts,
  projects,
}: {
  contacts: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<WaitingFormState, FormData>(createWaitingItem, undefined);

  if (!open) {
    return (
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> New waiting item
      </Button>
    );
  }

  return (
    <form
      action={(fd) => {
        formAction(fd);
        setOpen(false);
      }}
      className="mb-4 space-y-3 rounded-lg border border-border bg-surface p-4"
    >
      <div>
        <Label htmlFor="title">What are you waiting for?</Label>
        <Input id="title" name="title" required autoFocus placeholder="Confirmation from..." />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label htmlFor="contactId">From</Label>
          <Select id="contactId" name="contactId" defaultValue="">
            <option value="">— Unspecified —</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="projectId">Project</Label>
          <Select id="projectId" name="projectId" defaultValue="">
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="suggestedFollowUpAt">Follow up by</Label>
          <Input id="suggestedFollowUpAt" name="suggestedFollowUpAt" type="date" />
        </div>
      </div>
      {state?.error && <p className="text-xs text-critical">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">
          Add
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
