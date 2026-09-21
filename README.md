# Work Assistant

A personal, local-first work assistant: projects, tasks, daily/weekly planning, email drafting,
follow-up tracking, an AI assistant that acts through typed tools, and connector interfaces
proven with simulated calendar/mail providers.

Start here:

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) — what it does
- [ARCHITECTURE.md](ARCHITECTURE.md) — how it's built, and why (decision log)
- [progress.md](progress.md) — current state, what's done, what's next
- [CLAUDE.md](CLAUDE.md) — engineering rules for working on this repo
- [tests.json](tests.json) — acceptance scenarios and their status

## Getting started

```bash
npm install
cp .env.example .env   # fill in AUTH_SECRET (see the comment in .env.example)
npx prisma db push     # create the local SQLite database
npm run db:seed        # seed demo data + a login user (prints the credentials)
npm run dev
```

Open http://localhost:3000 and sign in with the credentials the seed script printed.

## Commands

```bash
npm run dev         # dev server
npm run build       # production build
npm run lint         # eslint
npm run typecheck     # tsc --noEmit
npm test               # vitest
npx prisma studio        # inspect the local database
npm run db:seed            # reset demo data
```

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma 7 + SQLite
(`@prisma/adapter-libsql`) · Zod · Anthropic SDK (with a deterministic offline fallback provider)
· Vitest.

See [ARCHITECTURE.md](ARCHITECTURE.md) for why each of these was chosen over the more common
default (e.g. SQLite over PostgreSQL, a local password session over full OAuth) — every
non-obvious choice is logged there with rationale and consequences.
