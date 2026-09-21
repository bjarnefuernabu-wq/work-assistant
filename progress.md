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
- [ ] **M4 — Planning**: not started.
- [ ] **M5 — AI tool layer**: not started.
- [ ] **M6 — Connectors**: not started.
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

1. M4 — Planning: `generate_daily_plan` / `generate_weekly_plan` logic (70-80% capacity rule),
   `/planning/day` and `/planning/week` pages, editable generated blocks (`DailyPlanBlock`).
2. M5 — AI tool layer: Zod-schema'd tools in `src/lib/ai/tools/`, `AIProvider` interface with
   `AnthropicProvider` + `MockProvider`, context retrieval (`src/lib/ai/context.ts`),
   `/assistant` chat UI, `AIActionLog` writes on every call.
3. M6 — Connectors: `src/lib/connectors/types.ts` interfaces + mock calendar/mail connectors
   with idempotent sync, `/settings` connector management UI.
4. M7 — Email assistant + follow-ups UI (`/email`, `/followups`) — data model already seeded,
   needs pages + draft workflow (generate → show → edit → confirm → send).
5. M8 — Morning briefing / weekly review generation.
6. Inbox page (`/inbox`) — model + seed data exist, needs a UI + triage actions.
7. Search (`/search`), Activity log (`/activity`), Settings (`/settings`) pages — all still
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
