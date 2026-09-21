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
      PRODUCT_SPEC.md / ARCHITECTURE.md / CLAUDE.md / progress.md / tests.json written.
      Not yet done: git init + first commit (next step), auth foundation, app shell.
- [ ] **M2 — Projects & tasks**: not started.
- [ ] **M3 — Work dashboard**: not started.
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

1. `git init`, first commit of the foundation.
2. Auth foundation: `src/lib/auth/` (session cookie, password hash, seed a local user), app
   shell/layout with nav + command palette skeleton.
3. Seed script (`npm run db:seed`) with the "Outdoor Action Day" demo project per
   PRODUCT_SPEC.md's demo data requirements — build this alongside Projects/Tasks (M2) so every
   later milestone has real data to work against instead of empty states only.
4. Projects + Tasks CRUD (M2), then Dashboard (M3).

## Known gaps / deliberately deferred

- No real OAuth connector (Google Calendar/Gmail) — mock connectors only, per scope discipline.
- No background job process — anything described as "background jobs" in the spec runs via an
  in-process scheduler tied to the running Next.js server, not a detached worker.
- Prisma migrations: using `db push` (no migration history) since the schema is still moving
  fast pre-1.0; switch to `prisma migrate dev` once the schema stabilizes.
