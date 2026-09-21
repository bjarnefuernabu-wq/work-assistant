# Progress

Last updated: 2026-09-21 (session 1, foundation).

## Environment

Machine started with **no dev tooling at all** (no Node/npm/git/Python). Installed via winget
(user-approved): Node.js LTS (24.19.0), Git (2.55), VC++ Redistributable (needed for native npm
addons to `dlopen` on Windows — see ARCHITECTURE.md D3). New PowerShell processes in this
environment don't inherit the updated PATH; every command in this repo's session logs prefixes
`$env:Path = "C:\Program Files\nodejs\;C:\Program Files\Git\cmd\;" + $env:Path`. A real user
terminal opened after the installs won't need this.

## Milestone status

- [x] **M1 — Foundation**: repo scaffolded (Next.js 16 / React 19 / TS / Tailwind v4), Prisma
      7.10.0 + SQLite (libsql adapter) wired end-to-end and verified with a real write/read,
      full domain schema written (`prisma/schema.prisma`) and pushed to `dev.db`,
      PRODUCT_SPEC.md / ARCHITECTURE.md / CLAUDE.md / progress.md / tests.json written, git
      initialized with a foundation commit. Local auth (password + iron-session), app shell
      (sidebar nav, top bar, ⌘K command palette) all working end-to-end in the browser.
- [x] **M2 — Projects & tasks**: full CRUD for both via Server Actions + Zod validation.
      Project detail page: status/priority, progress bar, next milestone, next recommended
      action (urgency-scored), simple date-axis timeline, tasks/risks/decisions/waiting
      items/contacts/meetings/linked email all rendered from real relations. Task model has
      distinct `dueDate`/`plannedDate`, dependencies (`TaskDependency`), quick-complete
      checkbox. Delete (project/task) gated behind a two-step `ConfirmButton`. Demo data seed
      (`npm run db:seed`) populates a coherent "Outdoor Action Day" project exercising every
      relation. Verified in-browser (login → projects → project detail → tasks → complete
      toggle) and via `npm run build`/`lint`/`typecheck` (all clean).
- [x] **M3 — Work dashboard**: `src/lib/dashboard/data.ts` aggregates Today (events, due/
      overdue tasks, planned-today, follow-ups due, meeting prep), This week (deadlines,
      milestones, meetings, planned work, a capacity-vs-committed overload check), and
      "Projects requiring attention" — each attention card is explicit **facts → observation →
      recommendation** (never a bare score), built from real waiting-item age, overdue tasks,
      near-term milestones with open work, and explicit `AT_RISK` status. Verified in-browser
      against seeded data — matches the spec's worked examples almost verbatim.
- [x] **M4 — Planning**: `src/lib/planning/generate-daily.ts` and `generate-weekly.ts` are pure
      functions (unit-testable, no I/O) implementing the spec's rules: daily plan targets ~75%
      of free work time (computed as work hours minus meetings), reserves a triage block, a
      prep block before each meeting that needs one, fills focus blocks with the most urgent
      open tasks, and a follow-ups block at the end — verified in-browser producing exactly the
      shape from the spec's worked example, including a genuine leftover buffer gap. Daily
      plans persist (`DailyPlan`/`DailyPlanBlock`) and are editable (remove a block,
      regenerate). Weekly plan is a **live, unpersisted proposal** (greedy day-by-day capacity
      fill respecting due dates, flags overloaded days / unscheduled important tasks /
      deadline risks) with an explicit two-step `ConfirmButton` "Apply this plan" — only on
      confirm does it bulk-write `plannedDate` on the proposed tasks and persist a `WeeklyPlan`
      summary. This is the reference implementation of the "bulk task edits require
      confirmation" rule (PRODUCT_SPEC.md §20) — verified in-browser end to end (generate →
      preview → confirm → tasks now show up as planned).
- [x] **M5 — AI tool layer**: `src/lib/ai/types.ts` defines the provider-neutral contract
      (`AIProvider`, `ToolDefinition` with Zod input schema + `isWrite`/`requiresConfirmation`
      flags). 13 tools in `src/lib/ai/tools/{reads,writes,confirmed}.ts` — reads
      (`get_projects`, `get_project`, `get_tasks`, `get_today_tasks`, `get_week_context`,
      `get_waiting_items`, `find_free_time`), single-entity writes (`create_task`,
      `update_task`, `complete_task`, `create_email_draft`), and consequential writes
      (`send_email_draft`, `apply_weekly_plan`) that require confirmation.
      `src/lib/ai/tool-runner.ts` is the **sole place model output can touch the database**:
      every call re-validates args with the tool's own Zod schema (never trusts the model's
      JSON), authorizes against `ctx.userId` from the real session (never from model input),
      and writes an `AIActionLog` row for every attempt. Confirmation-required tools don't run
      on first request — they persist a `PENDING_CONFIRMATION` log row and only execute from a
      separate `confirmPendingAction` call triggered by an explicit user click.
      `src/lib/ai/chat.ts` runs the agentic loop (provider ↔ tool-runner, capped at 4
      iterations). Two providers: `AnthropicProvider` (real Claude tool-use, used when
      `ANTHROPIC_API_KEY` is set) and `MockProvider` (deterministic keyword-routed fallback, no
      network) — picked by `src/lib/ai/provider.ts`. `/assistant` chat UI built and verified
      in-browser end-to-end: "How is Outdoor Action Day going?" → real `get_project` tool call
      against the live DB → grounded summary. Security properties verified via a temporary
      route-handler test (removed after): (1) a `requiresConfirmation` tool does **not** mutate
      data on the first call — confirmed via `send_email_draft` leaving the draft `DRAFT` until
      `confirmPendingAction` was called, then `SENT`; (2) double-confirming the same action
      fails cleanly; (3) a tool call for another user's task is rejected server-side
      (`"Task not found or not yours"`) regardless of what was requested — the auth-bypass
      scenario from tests.json.
      Known gap: `MockProvider` only implements read-intent keyword routing (no write
      intents), so the write/confirmation UX in `/assistant` itself is only exercisable with a
      real `ANTHROPIC_API_KEY` configured; it *is* fully exercised without a key via the
      `/planning/week` "Apply this plan" button, which shares the same `ConfirmButton` pattern.
      Chat history is client-side React state only (not persisted) — acceptable for MVP, noted
      as a gap.
- [x] **M6 — Connectors**: `src/lib/connectors/types.ts` defines `CalendarConnector`/
      `MailConnector`; `mock-calendar.ts`/`mock-mail.ts` implement them against a fixed fixture
      set (what a real API would hand back), upserting by `(connectorId, externalId)` — added
      real `@@unique` DB constraints for this (required a `prisma db push --accept-data-loss`
      on the local dev-only `dev.db`; Prisma's CLI has a built-in AI-agent safety gate for that
      flag, so this went through `AskUserQuestion` first even though the data was disposable
      seed data). `/settings` has full connector lifecycle: connect, sync now, disconnect,
      and visible sync-error state with the actual error message — verified in-browser
      end-to-end including a real (accidental, then fixed) sync failure surfacing correctly as
      "Sync error" with the error text, and two consecutive "Sync now" clicks both reporting
      the same item count with zero duplicates on `/calendar` (idempotency confirmed). Added
      `/calendar` (agenda view, next 21 days) since the nav already linked there. Settings also
      surfaces AI provider status (live/mock) and full memory CRUD (add/edit/delete
      `MemoryEntry`, grouped by category) — satisfies the "visible, editable, deletable, never
      silent" memory requirement.
- [ ] **M7 — Email & follow-ups**: not started.
- [ ] **M8 — Briefings**: not started.
- [ ] **M9 — Hardening**: not started.

## Key decisions this session (full rationale in ARCHITECTURE.md)

- SQLite instead of Postgres (D2) — local single-user tool, no server process to manage.
- `@prisma/adapter-libsql` instead of `better-sqlite3` (D3) — the latter needs a native C++
  build toolchain this machine doesn't have; libsql ships prebuilt binaries.
- Cache Components (Next 16's new opt-in caching/PPR model) deliberately **not** enabled (D4) —
  wrong fit for per-user dynamic data.
- Minimal local password auth instead of full OAuth/NextAuth for now (D5), behind an interface
  that can take a real OAuth provider later.
- AI provider abstraction ships with a mock/rule-based fallback; user deferred adding a real
  `ANTHROPIC_API_KEY` (D6) — assistant features work out of the box, just not "real LLM" quality,
  until a key is added in Settings/`.env.local`.

## Immediate next steps (pick up here)

1. M7 — Email assistant + follow-ups UI (`/email`, `/followups`) — data model already seeded,
   needs pages + draft workflow (generate → show → edit → confirm → send).
2. M8 — Morning briefing / weekly review generation.
3. Inbox page (`/inbox`) — model + seed data exist, needs a UI + triage actions.
4. Search (`/search`) and Activity log (`/activity`) pages — still 404 gaps; nav already links
   to them.
6. Search (`/search`), Activity log (`/activity`), Settings (`/settings`) pages — all still
   placeholder-free gaps; nav links to them already exist and currently 404.

## Known rough edges to revisit

- Turbopack dev-mode HMR occasionally left the login form's client bundle stale after many
  rapid file edits (clicking "Sign in" silently no-opped); a hard navigate/reload fixed it.
  Not reproduced from a cold `npm run dev` — likely a Turbopack fast-refresh quirk, not an app
  bug, but worth a second look if it recurs outside heavy edit sessions.
- Root layout metadata/font setup is still the create-next-app default aside from title/colors —
  fine for a local tool, revisit if this is ever deployed publicly.

## Known gaps / deliberately deferred

- No real OAuth connector (Google Calendar/Gmail) — mock connectors only, per scope discipline.
- No background job process — anything described as "background jobs" in the spec runs via an
  in-process scheduler tied to the running Next.js server, not a detached worker.
- Prisma migrations: using `db push` (no migration history) since the schema is still moving
  fast pre-1.0; switch to `prisma migrate dev` once the schema stabilizes.
