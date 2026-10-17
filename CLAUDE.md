# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Librarian is a personal full-stack web app for cataloging a physical collection of light novels and manga, replacing a legacy Airtable setup. It serves a data-rich desktop dashboard plus (planned) a mobile PWA "Field Mode" for rapid data entry at bookstores/bookfairs.

**Current project state — always read these; they own the truth, not this file:**

- `docs/STATUS.md` — **single source of truth for current state**: version, what's done, decisions log, changelog, next step
- `docs/ROADMAP.md` — forward roadmap (phases, versioning, open-item recommendations); no completion checkboxes
- `docs/design_direction.md` — visual identity, layout, theming rules
- `docs/context.md` — original requirements / data model rationale

## Commands

```bash
npm run dev              # Vite dev server (localhost:5173)
npm run build            # Production build (adapter-node) — must pass with 0 errors before committing
npm run preview          # Serve the production build
npm run check            # svelte-kit sync + svelte-check (type checking)
npm run lint             # prettier --check . && eslint .
npm run format           # prettier --write .
npm test                 # vitest run (unit tests)
npm run test:watch       # vitest in watch mode
```

Tests: Vitest is scoped to `src/**/*.test.ts` (see `vite.config.ts`) — pure unit tests only, not Svelte component tests. Run a single file or test with:

```bash
npx vitest run src/lib/utils/booruParser.test.ts
npx vitest run -t "parses mixed include and exclude"   # by test name
```

Database (requires Docker; `DATABASE_URL` must be set — see `.env.example`):

```bash
npm run db:start         # docker compose up -d db  (Postgres 16)
npm run db:stop
npm run db:push          # drizzle-kit push — sync schema to DB (dev)
npm run db:generate      # generate a SQL migration from schema changes
npm run db:migrate       # apply migrations
npm run db:studio        # Drizzle Studio
npm run db:seed          # tsx scripts/seed.ts
npm run migrate:airtable # one-time Airtable CSV → Postgres import (:dry for dry-run)
```

## Stack

SvelteKit 2 + **Svelte 5 runes** (runes mode is forced in `svelte.config.js` for all non-`node_modules` files) · TypeScript (strict) · Tailwind CSS v4 (CSS-first — no `tailwind.config.js`; theme tokens live in `src/routes/layout.css`) · shadcn-svelte (`nova` style, `zinc` base color, OKLCH) · PostgreSQL + Drizzle ORM · TanStack Query v6 · adapter-node.

## Architecture

**Request flow:** Client component → TanStack Query hook (`src/lib/queries/<entity>.ts`) → `fetch` → SvelteKit API route (`src/routes/api/**/+server.ts`) → Drizzle → Postgres. There is no server `load`-based data fetching for entity data; the client owns it via Query. `QueryClientProvider` is set up in the root `src/routes/+layout.svelte` (staleTime 5min, no refetch on focus). Mutations call `queryClient.invalidateQueries` on the relevant keys (`['books']`, `['series']`, `['bookfairs']`, …) to keep the cache consistent — follow this pattern when adding mutations.

**Data model** (`src/lib/server/db/schema.ts`): `series` 1→many `books`; `books` 1→many `reading` (a separate row per read/re-read, so reading history is decoupled from the physical book); `bookfairs` 1→many `books` (via `books.sourceEventId`); `tags` ↔ `series` many-to-many through `seriesTags`. `books.isExtra` marks an extra volume (side story…): its `volumeNumber` is then only a sort position (4.5 sits between 4 and 5) and it is shown as an Extra chip — use `volumeLabel` / `volumeText` / `latestVolume` from `$lib/utils/volume`, never print the raw number. The DB client is exported as `db` from `src/lib/server/db/index.ts`.

**Types:** All client-facing types and enum label maps live in `src/lib/types.ts`, hand-kept in sync with the Drizzle schema — API response shapes must match these. Update both when the schema changes.

**Auth:** Single-user password gate. `src/hooks.server.ts` redirects any request without a valid session cookie to `/login`, except `PUBLIC_PATHS` (`/login`, `/api/health`) and static assets. The cookie (`librarian_session`) is an HMAC-SHA256-signed timestamp verified in `src/lib/server/auth.ts`; `AUTH_PASSWORD` / `AUTH_SECRET` come from env. `event.locals.authenticated` is set for downstream code.

**Routing:** Everything under the `src/routes/(app)/` group shares the authenticated sidebar shell (`+layout.svelte`). Field Mode (`/field`, `/field/add`, `/field/hitlist`) lives in `src/routes/(field)/field/` — its own phone shell with a bottom tab bar and no sidebar; its per-device settings (fair chip, location) come from `getFieldSettings()` (`$lib/field/settings.svelte`), set in that layout. `/login` sits outside both groups. API routes are under `src/routes/api/`.

**Filtering (two layers — don't conflate them):**

- _Coarse, server-side:_ `GET /api/books` filters on `seriesId`, `location`, `isDraft`, `sourceEventId` query params via Drizzle.
- _Rich, client-side:_ `src/lib/components/filterEngine.ts` defines `UnifiedFilterState`, the single source of truth applied in-memory over the already-fetched list. It's shared by `SeriesTable`, `BooksTable`, `TagChipsBar`, and `BooruSearchBar`. Booru-style query text (`isekai -harem status:ended volumes:>=4 type:ln`) is parsed by `src/lib/utils/booruParser.ts` (unit-tested) into include/exclude tags, `key:op value` params, and bare search terms. Note the param remapping in the engine (e.g. `volumes` → `bookCount`). Client-side filtering/pagination is a deliberate choice because the dataset is small (per `docs/design_direction.md`).

**Console** (`src/routes/(app)/console/+page.svelte`, panels in `src/lib/components/console/`, logic in `src/lib/console/`): a full-page two-panel bulk workbench for adding/editing many books. Additions are _staged_ in a rune store (`createStagingStore`, factory not singleton) and previewed before commit; bulk-edit form state lives in `createBulkEditStore`. Pure logic is in `src/lib/console/logic.ts` (unit-tested, no runes). Commits go through the `queries/batch.ts` / `queries/bulk.ts` mutation hooks (`POST /api/books/batch`, `PATCH /api/books/bulk`), which invalidate `['books']`/`['series']`/`['bookfairs']`. The bulk endpoint enforces an `ALLOWED_FIELDS` allowlist (incl. `price`, `boughtAt`), takes `readingStatus` separately (applied through the reading rules, undated) and clears `sourceEventId` when `source` moves off `bookfair`. A preview row selection, when present, replaces the bulk-edit conditions; actions in `requiresExplicitTarget` (Link to bookfair) never fall back to "every book in scope". `/console?link=<bookfairId>` opens Bulk Edit pre-set to link books to that fair. Queries whose key depends on changing state take a getter (`createBooksByEventQuery(() => id)`), never a captured value.

**Reading status:** rules live in `src/lib/reading.ts` (pure, tested): a book's current status is its newest `reading` row (none = Unread), times read = count of Read rows (derived, never stored), and only Read → Reading (a re-read) inserts a row. `src/lib/server/reading.ts` applies them for one or many books; bulk edits pass `now = null` (no dates) and never start a re-read. `GET /api/books` returns `readingStatus` + `timesRead`.

**Airtable export:** `GET /api/export/airtable` produces a CSV formatted for emergency re-import — the escape hatch back to the legacy setup.

## Conventions

- **Svelte 5 runes** throughout (`$state`, `$props`, `$derived`, `$effect`). Form dialogs use `$state` for form values and `$effect` to sync from props.
- **Formatting** (`.prettierrc`): tabs, single quotes, no trailing commas, printWidth 100; `prettier-plugin-tailwindcss` sorts classes.
- **shadcn-svelte primitives** live in `src/lib/components/ui/` — add/update them via the shadcn-svelte CLI (config in `components.json`) rather than editing by hand. App components sit directly in `src/lib/components/` (with `forms/` and `series/` subfolders).
- **Path aliases:** `$lib` plus the shadcn aliases (`$lib/components`, `$lib/components/ui`, `$lib/utils`, `$lib/hooks`).
- **State-style variants:** the nova components use `data-checked:` / `data-open:` / `data-active:` … while bits-ui emits `data-state` / `data-orientation`; `src/routes/layout.css` maps them with `@custom-variant`. Keep that block when regenerating `ui/` components, or Switches, tabs and open/close animations silently lose their state styles.
- **Client-side ids:** use `newId()` from `$lib/utils/id`, never `crypto.randomUUID()` — the latter is undefined outside secure contexts (the dev server opened by LAN IP over http).
- **bits-ui `Select` values are strings:** bind numeric ids through a getter/setter pair that converts to and from `number`.
- **Free-text fields with repeating values** (publisher, bookfair name/location) use `forms/SuggestInput.svelte`.
- **Purchase dates** are stored as UTC midnight; display them with `dayOf` / `formatDay` (`$lib/console/logic`), not `toLocaleDateString` on a raw `Date`, so no timezone shifts the day.

## Working agreement

This project follows a strict phased workflow (plan the phase → get approval → execute one sub-feature per prompt → verify before the next). The durable, non-negotiable rules:

- **The build must pass after every change** (`npm run build`, 0 errors) and tests must pass.
- **Update `docs/STATUS.md` at each version bump** — it is the _only_ file that tracks current state (record decisions there; `ROADMAP.md` changes only when the plan itself changes).

> Currently mid-`v0.3`. **Insights** (I1–I6; pure `src/lib/insights/` behind `GET /api/insights`, charts via the `use:chart` Chart.js action) and **Field Mode** B3–B5 + the 2026-10-17 feedback round (phone shell `src/routes/(field)/field/`, pure `src/lib/field/logic.ts`; quick add / select several / Undo with the `onlyIfMissing` guard; Hitlist with confirmed new volumes = `series.totalVolumes` "Released up to vol. N"; Save image) are merged into `main`. **B6 is deployed:** production = Vercel (`adapter-vercel` when `VERCEL` is set, else `adapter-node`) + Neon Postgres 18 at https://librarian-alpha.vercel.app — every push to `main` deploys, the real data lives in Neon (the laptop's `local` is a dev copy; never test against Neon), production values in untracked `.env.prod`, daily dumps via `scripts/backup.ps1`. Auth: tokens expire after 30 days, `/api/*` without a session → 401 JSON (client toast in `$lib/session.ts`), login rate-limited, pure helpers in `src/lib/server/authCore.ts`. Next is **B7** (bookstore trial run → tag `v0.3`). See `docs/STATUS.md` → "Next session — start here" for the handoff.

A design-reference skill is available at `.agent/skills/ui-ux-pro-max/` for UI/UX work (invoke its `scripts/search.py` from that directory).
