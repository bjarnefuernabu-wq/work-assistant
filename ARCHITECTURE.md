# Architecture

See [PRODUCT_SPEC.md](PRODUCT_SPEC.md) for *what* the product does. This document is *how* it's
built and *why*, as a running decision log. Append new decisions with the same
decision/rationale/alternatives/consequences shape rather than editing history away.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Database | SQLite (file-based), via Prisma ORM 7.10.0 |
| Prisma driver | `@prisma/adapter-libsql` + `@libsql/client` (native, prebuilt binaries) |
| Validation | Zod |
| Auth | Local single-user session (iron-session, encrypted cookie) |
| AI | Provider abstraction; `AnthropicProvider` (`@anthropic-ai/sdk`) + rule-based `MockProvider` fallback |
| Background jobs | In-process scheduler (`node-cron`-less, custom interval runner) — see §Background jobs |
| Testing | Vitest |

## Decision log

### D1 — Local dev environment had no toolchain at all
**Decision**: Installed Node.js LTS, Git, and the Microsoft VC++ Redistributable via `winget`
(user confirmed). No other system changes.
**Rationale**: The target machine had none of Node/npm/git/Python on PATH. Winget is the
official, unattended Windows package manager; the installs are standard user-level dev tooling.
**Alternatives considered**: Portable/zip Node install (more fragile PATH management, same net
effect). Docker (Docker itself wasn't installed either, and adds a much bigger footprint for a
single local app).
**Consequences**: Every new PowerShell process needs `$env:Path` primed with
`C:\Program Files\nodejs\` and `C:\Program Files\Git\cmd\` until the user's shells pick up the
updated system PATH (new terminal windows opened after install will have it automatically).

### D2 — SQLite instead of PostgreSQL
**Decision**: Use SQLite (single file, `dev.db`) instead of the spec's suggested PostgreSQL.
**Rationale**: This is explicitly a *personal, local-first, single-user* application (per the
product spec). PostgreSQL would require installing and running a separate database server
process on a machine that had no dev tooling at all — real operational overhead with no present
benefit. SQLite needs no service, no port, no credentials, and Prisma's schema/query layer is
provider-agnostic enough that a future move to Postgres (if the app ever becomes multi-user or
hosted) is a datasource + connector swap, not a rewrite.
**Alternatives considered**: PostgreSQL (rejected for now, see above — `DATABASE_URL` is the only
thing that would need to change plus swapping the Prisma driver adapter); Postgres via Docker
(rejected, Docker not present and adds a background service to a "just works locally" tool).
**Consequences**: No concurrent multi-writer access (fine — single user, single process). File
lives at the project root (`dev.db`), gitignored. If real multi-user/hosted use is ever needed,
revisit this decision explicitly.

### D3 — Prisma 7 requires a driver adapter; native `better-sqlite3` failed to build
**Decision**: Use `@prisma/adapter-libsql` (`@libsql/client`) instead of
`@prisma/adapter-better-sqlite3`.
**Rationale**: Prisma 7 removed the classic engine-managed `url`-in-schema connection model —
`PrismaClient` now requires an explicit driver `adapter`. `better-sqlite3`'s native addon needed
`node-gyp` compilation (no Python/MSVC build tools on this machine, and installing a full C++
build toolchain is a heavy, invasive ask for a personal app). `@libsql/client` ships **prebuilt**
native binaries as regular npm platform packages (no postinstall compile step), which installed
cleanly. It still needed the Visual C++ Redistributable to `dlopen` on Windows (see D1) but no
compiler.
**Alternatives considered**: `better-sqlite3` (native build failed, would need Python + Visual
Studio Build Tools — rejected as too heavy); Postgres (see D2).
**Consequences**: All DB access goes through `src/lib/db/client.ts`, the single place that
constructs `PrismaClient` with the libsql adapter. `prisma.config.ts` still carries a plain
`DATABASE_URL` for the CLI (`db push`, Prisma Studio); that's independent of the adapter used at
app runtime.

### D4 — No Cache Components (Next.js 16's new opt-in caching model)
**Decision**: Do **not** set `cacheComponents: true` in `next.config.ts`. Use the classic
dynamic-by-default rendering model (the one active unless explicitly opted in).
**Rationale**: Cache Components (Next 16's new PPR-based model) requires every dynamic read
(cookies, per-request DB queries) to be wrapped in `<Suspense>` or explicitly cached with `"use
cache"` / `cacheLife`, or the build fails validation. That's the right tradeoff for a
CDN-fronted, mostly-static public site; this app is the opposite — almost every screen is
per-user, per-request, frequently-mutated operational data with a single local user, where
static-shell prerendering buys nothing. Adopting it would add significant boilerplate for no
benefit here.
**Alternatives considered**: Cache Components (rejected — wrong fit, see above).
**Consequences**: Pages that need fresh data per request rely on the standard mechanism (reading
`cookies()`/DB inside a Server Component makes the route dynamic automatically). Revisit only if
this app is ever deployed multi-tenant behind a CDN.

### D5 — Minimal local auth instead of full OAuth/NextAuth
**Decision**: Single local user, password-based login, `iron-session` encrypted cookie. No
NextAuth/Auth.js, no OAuth provider wired up yet.
**Rationale**: The spec calls for "secure authentication with OAuth support," but this is a
single-person local tool with no other users and no external identity provider registered.
Standing up NextAuth+OAuth now means fabricating OAuth app registrations with no real callback
target. A minimal, correctly-hashed (scrypt via Node's `crypto`), signed-cookie session satisfies
"secure authentication" for the actual current use case.
**Alternatives considered**: NextAuth with Credentials provider only (rejected — extra
dependency and abstraction with no functional gain over a direct implementation); full OAuth now
(rejected — no real provider app to register against, would be a non-functional stub).
**Consequences**: The session/auth module (`src/lib/auth/`) is isolated behind a small interface
(`getSession`, `requireUser`) specifically so an OAuth provider can be dropped in later without
touching route/page code. Documented as a known gap in `progress.md`.

### D6 — AI provider abstraction, no live key required to run
**Decision**: `AIProvider` interface with `AnthropicProvider` (real, used when
`ANTHROPIC_API_KEY` is set) and `MockProvider` (deterministic, rule-based, no network) behind a
factory that picks based on env. User explicitly chose to defer wiring a real key.
**Rationale**: Product spec requires the app not be hard-coded to one model provider, and the
user wants the app fully runnable/demoable before deciding on API cost.
**Alternatives considered**: Require a key at startup (rejected — blocks first run and demoing);
hard-code Anthropic only (rejected — spec explicitly requires a swappable provider).
**Consequences**: With no key configured, assistant chat and drafting use the mock provider,
which is explicit about being a fallback in its own responses so the user is never misled into
thinking a rule-based answer is a real model's reasoning.

### D7 — Modular monolith, not microservices
**Decision**: Single Next.js app; Server Actions/Route Handlers for mutations; no separate
backend service, queue, or job runner process.
**Rationale**: Spec explicitly says to avoid microservices unless clearly justified, and nothing
about a personal local tool justifies them. Background jobs (sync, briefing generation) run via
a small in-process interval scheduler started from a Next.js instrumentation hook, not a
separate worker process.
**Consequences**: If this ever needs to run 24/7 detached from an open browser tab, the
scheduler would need to move to a real process — noted as a future concern, not solved now.

## AI tool layer (enforcement)

Implemented in `src/lib/ai/`. Model-facing tools live in `src/lib/ai/tools/{reads,writes,
confirmed}.ts`, each a `ToolDefinition`: name, description (sent to the model), a Zod
`inputSchema`, `isWrite`, `requiresConfirmation`, and `run(input, ctx)`. `ctx.userId` always
comes from `requireUser()`'s session, **never** from model-provided input.

`src/lib/ai/tool-runner.ts::executeToolCall` is the **only** path from model output to the
database:
1. Re-validates the model's arguments against the tool's own Zod schema (never trusts the
   model's JSON as-is).
2. If `requiresConfirmation` is true, it does **not** call `run()` — it persists a
   `PENDING_CONFIRMATION` `AIActionLog` row and returns that to the caller. `run()` only
   executes later, from `confirmPendingAction(logId, ctx)`, itself only reachable from an
   explicit user click (`confirmAssistantAction` Server Action) — `ctx.userId` is re-checked
   against the log row's owner at that point too.
3. Every attempt (validation failure, immediate success, or deferred-then-confirmed) writes an
   `AIActionLog` row: args, whether confirmation was required/given, and a result summary.

Verified (see tests.json `ai-tool-write-confirmation` / `ai-tool-auth-bypass-blocked`): a
`requiresConfirmation` tool leaves data untouched until confirmed; a tool call targeting another
user's record is rejected server-side regardless of what was requested.

`src/lib/ai/chat.ts::runChatTurn` drives the agentic loop: call the provider, if it requests a
tool run `executeToolCall`, append the result, call the provider again — capped at 4 iterations.
The model never gets direct database or filesystem access; it can only call these tools.

## Context retrieval

Rather than a separate manual "fetch everything relevant" layer, context bounding happens
through the tool layer itself: each read tool (`get_project`, `get_today_tasks`, `get_tasks`,
...) returns only the slice of data its name implies, and a real model (Anthropic tool-use)
decides which to call based on the question — "How is Project X going?" calls `get_project`,
not a dump of the whole database. This is the standard shape for a tool-using agent and avoids a
redundant, hard-to-keep-in-sync second retrieval system. The `MockProvider` fallback (no API
key) does its own light keyword routing to the same tools, documented in
`src/lib/ai/providers/mock.ts`.

## Connector architecture

`src/lib/connectors/types.ts` defines the provider-neutral interfaces (`CalendarConnector`,
`MailConnector`, `TaskConnector`). `src/lib/connectors/mock-calendar.ts` and
`mock-mail.ts` implement them against seeded demo data, exercising the exact same sync path
(`externalId`/`lastSyncedAt`/`syncStatus`, idempotent upsert) a real OAuth connector would use.
Connector credentials, when present, are encrypted at rest with a key derived from
`AUTH_SECRET`; the mock connectors don't need any.

## Dashboard prioritization

Attention-worthy items are scored, not just sorted by date. See
`src/lib/dashboard/scoring.ts` for the current weights (deadline proximity, priority, project
priority, dependency blocking, waiting-item age, meeting prep gaps). Documented inline in that
file since the weights are expected to be tuned, not architectural.
