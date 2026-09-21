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
- [x] **M7 — Email assistant & follow-ups**: `/followups` (`WaitingItem` list sorted by age,
      overdue-follow-up badge, add/resolve, recently-resolved history). `/email` (thread list)
      and `/email/[id]` (transcript + assistant panel: summarize, identify unanswered
      questions/commitments, generate reply draft, iterate tone shorter/friendlier/more
      formal, edit inline, send). `src/lib/email/assist.ts` calls through the `AIProvider` for
      real generation when live, and a clearly-labeled template fallback when not (never
      silently pretends a template is a real answer). `src/lib/email/send.ts` is the single
      send implementation shared by the direct UI action and the `send_email_draft` AI tool —
      one send path, not two. Verified in-browser end-to-end: summarize → identify action
      items → generate draft → "make it shorter/friendlier/more formal" → edit → confirm → send
      (simulated, no live mail connector) → thread's "needs action" flag clears. Caught and
      fixed a real bug during this pass: the generated draft's subject line wasn't round-tripped
      from the server action, so the confirmation dialog showed "Re:" instead of "Re: AV setup
      requirements" — fixed by returning `subject` from `generateDraftAction` instead of
      hardcoding it client-side.
- [x] **M8 — Briefings**: `src/lib/briefing/morning.ts` and `weekly-review.ts` are deterministic
      (no LLM call) — deliberate, since a briefing is exactly the output where inventing
      anything is worse than a plainer, reliable one (core principle #1). Morning Briefing is a
      dismissible panel at the top of the Dashboard (on-demand, not auto-run): meetings today,
      due count, follow-ups due, critical-project count, prep-needed list, and a "recommended
      primary focus" (highest-urgency open item, or the top critical-attention project if
      nothing's scheduled) with its reason shown. Weekly Review (`/review`, linked from
      `/planning/week`): completed-this-week, overdue, waiting-on-others, new risks/decisions
      from the last 7 days, next week's deadlines/meetings, and suggested priorities (reusing
      the urgency scorer). Verified in-browser against seed data — both grounded, both concise.
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

All nav-linked pages now exist and are functional (21 routes) — Dashboard, Projects, Tasks,
Inbox, Calendar, Daily/Weekly Planning, Weekly Review, Email Assistant, Waiting For, AI
Assistant, Search, Activity Log, Settings. Every application area in PRODUCT_SPEC.md §3 has a
real, working page against real seeded data; nothing 404s from the sidebar anymore.

- **Inbox** (`/inbox`): manual capture form, triage list showing AI classification suggestions
  with their reason (`suggestedReason`), "Convert to task" (uses the suggested project when
  present) and "Dismiss". Verified in-browser: converting the seeded "email about power
  requirements" item created a task correctly linked to Outdoor Action Day.
- **Search** (`/search`): cross-entity search (`src/lib/search/global-search.ts`) over
  Project/Task/Contact/Note/Decision/EmailThread/CalendarEvent, grouped by type with context
  per result. Verified in-browser: "Lisa" correctly returned her Contact and the meeting
  mentioning her.
- **Activity Log** (`/activity`): last 100 `ActivityLogEntry` rows, newest first. Verified
  in-browser showing a real mixed history (login, inbox conversion, connector syncs, task
  completions, project creation) — confirms the audit trail has been live and correct
  throughout the session, not just for one feature.

## M9 — hardening (in progress)

- [x] **Automated tests**: `vitest.config.mts` added (node environment, `@` alias resolved
      manually since this isn't a Vite app). 25 tests across
      `src/lib/dashboard/scoring.test.ts`, `src/lib/planning/generate-daily.test.ts`,
      `src/lib/planning/generate-weekly.test.ts`, `src/lib/db/fields.test.ts` — all pure-logic
      modules, no DB/network needed. Writing these caught one real bug and one real gap:
      - **Bug found & fixed**: `generateDailyPlan` never filtered `candidateTasks` by status
        itself — it relied entirely on the caller already excluding COMPLETED/CANCELLED tasks.
        A test passing a completed task directly proved it would still get scheduled. Fixed by
        filtering defensively inside the function (`src/lib/planning/generate-daily.ts`)
        instead of trusting the caller's contract.
      - **Gap documented, not fixed**: `generateWeeklyPlan`'s day buckets come from
        `startOfWeek`/`addDays` (local time) while task `dueDate`s set via `<input
        type="date">` parse as **UTC** midnight (per the HTML date input / `Date` spec). For a
        user in a timezone ahead of UTC, a deadline expressed near a day boundary could land in
        an unexpected local-time bucket. Not reproducible with this machine's local timezone in
        testing, and low-impact (off by at most one day, only near midnight-UTC deadlines), but
        worth a proper fix (store/compare dates consistently, e.g. always in UTC calendar days)
        before this app is used by someone outside UTC-adjacent timezones. Left as a known gap
        rather than a rushed fix.
- [ ] Remaining edge/empty/error states pass.
- [ ] Fresh re-read of every write path against the confirmation rules in PRODUCT_SPEC.md §20.
- [ ] First-time-user pass (no demo data) to check empty states end to end.
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
