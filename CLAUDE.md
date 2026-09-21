@AGENTS.md

# Work Assistant — engineering rules

Personal, local-first work assistant (projects/tasks/planning/email/follow-ups + an AI
assistant that acts through typed tools). Full product behavior lives in
[PRODUCT_SPEC.md](PRODUCT_SPEC.md); architecture and decision rationale live in
[ARCHITECTURE.md](ARCHITECTURE.md); current state and next steps live in
[progress.md](progress.md); acceptance scenarios live in [tests.json](tests.json).

**Read progress.md and the latest git log before starting work in a new session.** Don't rely on
conversational memory for architectural state — it's written down.

## Non-negotiable product rules

- **Facts / observations / recommendations stay visually and structurally separate.** Never
  invent a date, person, or commitment. Missing data is reported as missing.
- **Reads run free; consequential writes require explicit confirmation** (send email,
  delete/move a meeting or project, bulk task edits, external-system changes). Confirmation UI
  must show what will change before it happens.
- **The AI never gets direct DB/filesystem access.** It only calls the typed tools in
  `src/lib/ai/tools/`. Every tool call is authorized against the session user server-side —
  never trust model-provided identity/ids. Every call (args, confirmation status, result) is
  written to `AIActionLog`.
- **Connector-synced data carries `externalId`/`connectorId`/`lastSyncedAt`/`syncStatus`.** Sync
  is idempotent (upsert by external id); never silently overwrite a local edit that's newer than
  the last sync.

## Stack & conventions

- Next.js 16 (App Router) + React 19 + TypeScript, Tailwind v4. **Next.js 16 has real breaking
  changes from older training data** — check `node_modules/next/dist/docs/` before using an
  unfamiliar API. We deliberately do **not** enable `cacheComponents` (see ARCHITECTURE.md D4) —
  use the classic dynamic-rendering model, not `"use cache"`/`cacheLife`.
- Server Components for reads; Server Actions (`"use server"`) for mutations, called from forms
  or client event handlers — not ad-hoc `fetch` to hand-rolled API routes unless the AI tool
  layer or an external connector needs a real HTTP boundary.
- Prisma ORM (SQLite via `@prisma/adapter-libsql` — see ARCHITECTURE.md D2/D3). Always import the
  shared client from `src/lib/db/client.ts`; never `new PrismaClient()` elsewhere.
- All app code lives under `src/`. Path alias `@/*` → `src/*`.
- Zod validates every Server Action input and every AI tool input/output — validate at the
  boundary, trust internal calls.
- Money/JSON-ish list fields on SQLite models are stored as `*Json` string columns (no native
  array/enum-of-arrays support) — always go through the typed helpers in `src/lib/db/*-fields.ts`
  rather than `JSON.parse`/`stringify` ad hoc at call sites.
- **Every user-facing string goes through `t()` (see ARCHITECTURE.md D9)** — the app supports
  English/German and the English literal you write IS the translation key. In a Server
  Component, get it from `const { user, t } = await requireUserT()`
  (`src/lib/i18n/server.ts`). In a Client Component, `const { t } = useTranslation()`
  (`@/components/i18n/locale-provider`). Add the German translation to `src/lib/i18n/de.ts` in
  the same change — a string used via `t(...)` with no entry there silently renders in English,
  which is easy to miss without a deliberate look. Exceptions (deliberately never translated):
  user/contact-authored content (task titles, email bodies, contact names), and historical
  `ActivityLogEntry`/`AIActionLog` summary strings already written to the DB.

## Windows dev environment note

This machine had no Node/npm/git preinstalled; they were installed via `winget` this session.
New PowerShell processes may not inherit the updated PATH — if `node`/`npm`/`git` aren't found,
prefix commands with:
```powershell
$env:Path = "C:\Program Files\nodejs\;C:\Program Files\Git\cmd\;" + $env:Path
```

## Commands

```bash
npm run dev          # dev server
npm run build         # production build — run before considering a milestone done
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm test                # vitest
npx prisma studio        # inspect the local SQLite DB
npx prisma db push        # sync schema.prisma -> dev.db (no migration history; fine pre-1.0)
npm run db:seed            # load demo data
```

## Definition of done (per feature)

Main flow works end-to-end with real persistence · typecheck passes · relevant tests pass ·
loading/empty/error states exist · permissions enforced · no placeholder presented as working.
Connector-backed features handle: disconnected, auth failure, sync failure, duplicate
prevention, recoverable errors. Before calling a milestone done: typecheck, test, lint, build.

## Scope discipline

Don't add abstractions, providers, or config for hypothetical future needs. One simulated
calendar connector and one simulated mail connector prove the connector pattern — do not build
adapters for every provider listed in PRODUCT_SPEC.md §19.
