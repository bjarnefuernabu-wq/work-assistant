# Product Specification — Personal Work Assistant

## 1. Purpose

A personal operational assistant for someone managing multiple projects, partners, deadlines,
meetings, and communications at once. It is not a generic to-do app or a chatbot demo. It exists
to answer, at a glance and on demand:

- What needs my attention?
- What should I work on next?
- Which deadlines are approaching, and which projects are at risk?
- What am I waiting on (and who is waiting on me)?
- Which emails require action?
- What must happen before an upcoming meeting?
- What can I realistically get done today / this week?

## 2. Core principles (non-negotiable)

1. **Facts, observations, and recommendations are always separated.** A fact is a stored
   record (deadline, task, event). An observation is a derived statement about facts ("3
   prerequisite tasks are still open"). A recommendation is a suggested action ("schedule them
   this week"). The UI and the assistant must never blur these together, and must never invent
   a date, person, or commitment that isn't in the data — missing information is reported as
   missing, not filled in.
2. **Automation stays controllable.** Reads run freely. Writes that have real-world consequence
   (sending an email, deleting a project/event, bulk task edits, changing an external system)
   require an explicit, visible confirmation step that shows what will change before it happens.
3. **Recommendations are explained.** Anything marked urgent, critical, or at-risk must be able
   to show *why* (which fact(s) triggered it).
4. **No overengineering.** Build extensible seams, not speculative implementations. One real
   connector proves the pattern; we do not write adapters for every provider in the spec.
5. **Daily usefulness over feature breadth.** Dashboard, daily/weekly planning, follow-ups, and
   project overview matter more than peripheral screens.

## 3. Application areas

Dashboard · Projects · Tasks · Inbox · Calendar context · Daily Planning · Weekly Planning ·
Email Assistant · Follow-ups ("Waiting For") · AI Assistant (chat) · Search · Activity Log ·
Settings / Connectors.

## 4. Dashboard

The primary work surface. Must answer "what's happening today / this week / where do I need to
act" within seconds.

- **Today**: calendar events, planned tasks, due tasks, overdue tasks, important follow-ups,
  prep required for upcoming meetings.
- **This week**: deadlines, milestones, meetings, planned and unplanned-but-important work,
  overload warnings.
- **Projects requiring attention**: computed, explained callouts, e.g. "Partner response
  outstanding 8 days", "Deadline Friday, ~4h of work remains", "Briefing materials incomplete
  for tomorrow's meeting."

Prioritization is not chronological sort. It weighs: deadline, urgency, importance, project
priority, dependencies, available time, calendar load, waiting dependencies, prep requirements.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the scoring approach.

## 5. Domain model (summary — see `prisma/schema.prisma` for the authoritative version)

- **Project**: name, description, objective, status, priority, startDate, targetDate,
  responsiblePerson, tags, budget?, notes, timestamps. Contains tasks, milestones, meetings,
  notes, contacts, linked emails, decisions, risks, waiting items, activity.
- **Task**: title, description, projectId?, status (Inbox / Planned / In Progress / Waiting /
  Completed / Cancelled), priority (Low/Normal/High/Critical), **dueDate and plannedDate are
  distinct fields** ("must finish by Friday" vs "I plan to work on it Wednesday"),
  estimatedDuration, actualDuration, assignee, dependencies, tags, source, sourceReference,
  timestamps.
- **Milestone**, **Contact**, **Note**, **Decision**, **ProjectRisk**, **WaitingItem** (follow-up
  tracking: waiting on whom, since when, suggested follow-up date, related project/task).
- **CalendarEvent**, **EmailThread/EmailMessage/EmailDraft**: connector-synced entities carrying
  `externalId` / `connectorId` / `lastSyncedAt` / `syncStatus` for idempotent sync.
- **InboxItem**: universal capture point for anything unprocessed (manual notes, detected
  follow-ups, connector events); AI may suggest classification but suggestions stay
  provisional until a user accepts them.
- **MemoryEntry**: durable assistant memory (Preference / Project Knowledge / Contact /
  Decision / Working Pattern), always visible, editable, deletable — never silent/opaque.
- **DailyPlan/DailyPlanBlock**, **WeeklyPlan**: generated, editable planning artifacts.
- **Connector** + **ConnectorCredential**: provider-neutral sync configuration; secrets are
  never stored in plaintext.
- **AIActionLog**: full audit trail of assistant tool calls — what was suggested, what data
  backed it, whether confirmation was required/given, what actually executed.

## 6. Task planning semantics

`dueDate` (external deadline) and `plannedDate` (when the user intends to work on it) are always
stored and reasoned about separately. A task can have one, both, or neither.

## 7. Daily planning ("Plan my day")

Inputs: calendar availability, existing planned tasks, deadlines, priority, project importance,
estimated duration, dependencies, overdue tasks, waiting items, meeting prep needs.

Rule: **plan ~70–80% of realistically available work time**, leaving the rest as buffer. Output
is a sequence of concrete time blocks (e.g. `09:00–09:20 Inbox triage`, `09:20–10:30 Project A —
finalize proposal`), always user-editable after generation.

## 8. Weekly planning ("Plan my week")

Distributes work across the week from the same inputs, additionally surfacing: overloaded days,
unscheduled important tasks, deadline risk, conflicting priorities. Stays a concrete, editable
plan — not a high-level summary.

## 9. Email assistant

Workflows: summarize email/thread, list unanswered questions, list commitments/required actions,
infer project relationship, draft a reply, and iterate the draft (shorter / friendlier / more
formal).

**Send workflow is always**: read thread → resolve project context → generate draft → show user
→ user edits/approves → **send only on explicit confirmation.** The assistant never sends
autonomously.

## 10. Follow-ups / "Waiting For"

First-class entity (`WaitingItem`), not a tag on tasks. Captures: what we're waiting for, who
from, since when, related project, and a suggested follow-up date. Detection (unanswered
outgoing email, a promise made in a thread, a blocked task) produces provisional suggestions;
turning a suggestion into a tracked item is a user action. The assistant never sends a follow-up
message on its own.

## 11. Morning Briefing / Weekly Review

- **Morning Briefing**: today's meetings, important tasks, deadlines, follow-ups, critical
  projects, important incoming email, prep requirements, one recommended primary focus. Concise
  and operational, not a wall of text.
- **Weekly Review**: completed work, project progress, unfinished/overdue tasks, waiting items,
  new risks, decisions made, next week's deadlines/meetings, suggested priorities.

## 12. Assistant chat

Natural-language interface operating strictly through the typed AI tool layer (§13) — never
direct DB access from model output. Supports queries like "what's critical this week", "how is
Project X going", "plan tomorrow", "who owes me a response", "draft a reply to this email". Every
write the assistant proposes follows the same confirmation rule as the rest of the app.

## 13. AI tool layer

Schema-validated (Zod) tools, e.g. `get_projects`, `get_project`, `get_tasks`, `get_today_tasks`,
`create_task`, `update_task`, `complete_task`, `get_calendar_events`, `find_free_time`,
`create_calendar_event`, `search_email`, `get_email_thread`, `create_email_draft`,
`send_email_draft`, `generate_daily_plan`, `generate_weekly_plan`, `get_waiting_items`,
`get_project_risks`, `get_project_activity`. Every write tool re-validates authorization and
input server-side — the model's arguments are never trusted directly. See
[ARCHITECTURE.md](ARCHITECTURE.md) §AI tool layer for the enforcement mechanism.

## 14. Context retrieval

The model is never handed the whole database. A context-retrieval layer loads only what a given
question needs (e.g. "How is Project X going?" loads that project's metadata, open tasks,
milestones, upcoming meetings, recent activity, open decisions, waiting items, risks, and linked
emails) and preserves source references so statements are traceable.

## 15. Working memory

Categories: User Preferences, Project Knowledge, Contacts, Decisions, Working Patterns. Always
visible/editable/deletable via Settings → Memory. Never accumulates silently — every write is
either user-authored or an explicitly accepted AI suggestion, and is logged.

## 16. Decisions and risks

`Decision`: projectId, title, description, date, participants, source, consequences.
`ProjectRisk`: title, description, probability, impact, mitigation, owner, status, source.
AI-suggested risks/decisions are flagged `source: AI_SUGGESTED` / `isConfirmed: false` until a
user confirms them.

## 17. Activity log

Audit-friendly timeline of state changes (task created/completed, deadline changed, email
linked, project status changed, connector sync, AI suggestion accepted, email sent). Stores
summaries and metadata, not full sensitive content.

## 18. Search

Global search across projects, tasks, contacts, notes, decisions, emails, meetings — grouped by
type, with enough context per result to show why it matched.

## 19. Connector architecture

Provider-neutral interfaces: `CalendarConnector`, `MailConnector`, `TaskConnector`,
`FileConnector`, `CommunicationConnector`. MVP ships one real pattern proven with **simulated**
calendar and mail connectors seeded with coherent demo data; the interfaces are written so a real
OAuth-backed provider (Google, Microsoft 365, etc.) can be added later without touching domain
logic. Synced entities carry `externalId` / `connectorId` / `sourceSystem` / `lastSyncedAt` /
`syncStatus` and sync jobs are idempotent; conflicts between local and external edits are surfaced,
never silently overwritten.

## 20. Security & confirmation rules

- No plaintext credentials; connector secrets are encrypted at rest.
- Read actions (calendar/task/email read, project analysis) run without confirmation.
- Write actions with real consequence (send email, delete/move a meeting, delete a project, bulk
  edits, external-system changes) always show a before/after preview and require explicit
  confirmation.
- Every AI-driven action is logged: what was suggested, what data supported it, what executed,
  whether confirmation was required and given, and when.
- Email bodies and other connector content are treated as untrusted input and can never grant
  themselves extra authorization.

## 21. Out of scope for MVP

Real OAuth integrations beyond the interfaces/mocks, a full Gantt view (timeline is built so one
can be added later without a data model rewrite), multi-user/team features, mobile apps (the web
UI is responsive), notifications/push.
