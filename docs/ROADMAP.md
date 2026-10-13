# Librarian — Roadmap

> **Forward-looking plan only.** For **current state** (version, what's built, decisions, next step) see [`STATUS.md`](./STATUS.md) — it owns "where we are." This file owns "where we're going." Product vision lives in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md).
>
> This roadmap intentionally has **no completion checkboxes** — completion is tracked only in `STATUS.md` so the two can never disagree.

## Versioning

`v0.0` = init; each phase completion bumps `v0.x`. A Git tag is created per milestone.

| Version    | Milestone                                        |
| ---------- | ------------------------------------------------ |
| v0.0       | Scaffolding                                      |
| v0.1       | Database & CSV fallback                          |
| v0.2       | Desktop core (tables, CRUD, data entry)          |
| v0.2.x     | Unified search & filter                          |
| **v0.3.x** | **Consolidation / debt paydown — current focus** |
| v0.3       | Bookfair & bulk workflows (Hitlist, polish)      |
| v0.4       | Reading data + Analytics & insights              |
| v0.5       | Mobile Field Mode (PWA)                          |
| v0.6       | Social & playful features                        |
| v0.7       | Polish, decorative design, production hardening  |

## Delivered

Phases 0–2, unified search/filter (2C), and most of Phase 3 (bookfairs CRUD + detail, source/event linking, Console _Add Books_ + _Bulk Edit_) are shipped, along with most of the Consolidation milestone. `STATUS.md` has the authoritative breakdown and the decisions log.

## Now — finish Consolidation (v0.3.x)

Guiding theme: **one fact, one home** (single source of truth), applied to both code and docs. The Console overhaul and its follow-ups are done; what remains:

**Tier 1**

- **Single source of truth for types + validation via `drizzle-zod`.** Derive a base type from the schema, then layer the response transforms (dates/`numeric` → string, computed `bookCount`/`tags`/`seriesTags`). Replaces the hand-maintained `types.ts` mirroring and the manual per-route validation. Do it as its own session (touches every API route); do it **before** v0.4 adds columns (e.g. the reading queue), so new fields are declared once.

**Tier 2 — opportunistic, low-risk**

- Replace the manual `innerJoin` + `tagMap` building in `/api/books` with Drizzle relational queries (`with:`); relations are already defined.
- Move `filterEngine.ts` out of `components/` into `lib/` — it's a pure module.
- Reject session tokens older than the cookie `maxAge` in `verifySessionToken` (currently signature-only: a copied cookie stays valid until `AUTH_SECRET` rotates).
- The remaining `state_referenced_locally` warnings (29) in `ProgressBar` and the edit dialogs — `ProgressBar` in particular only reads its initial `owned`/`total`.
- `npm audit` (18 advisories, all dev tooling) — triage once, upgrade what's safe.

**Optional Console polish** (from the 2026-07-02 visual test — fold in only if they earn it)

- Let bulk-edit **conditions also scope the preview** (show only matched rows), and a way to select rows directly from the preview.
- **Series-grouping toggle** in the preview.

**Exit criteria:** types/validation derived from the schema, build + tests + `svelte-check` green.

## Then — finish Phase 3 (→ v0.3)

- **Bookfair Hitlist** — shopping list from watchlist series with tag filters; print-friendly + copy-to-clipboard (spec in `STATUS.md`, Phase 3 Decisions). _Open question:_ also list each watchlist series' next unowned volume, grouped by publisher (fair booths are organized that way)? Cheap to add, but `totalVolumes` is empty for every series today, so "missing volumes" can only mean "the next one after the highest owned".
- Sidebar links, build verification, tag `v0.3`.

The **Activity Log** was dropped on 2026-10-13 (single user; low value). See `STATUS.md`.

## Phase 4 — Reading data + Analytics & insights → v0.4 _(draft plan, awaiting approval)_

**Why "reading data" comes first.** A data check on 2026-10-13 found that nothing in the UI writes reading status — the `queries/reading.ts` hooks are unused. All 300 reading rows are `unread` with no dates, 10 books have no reading row at all, **0 of 310 books have a price**, only 15 have a source, and **no series has `totalVolumes`**. Only `boughtAt` is well populated (308/310). Built today, most insight charts would be empty. So v0.4 is split: **4A** makes the data real, **4B** visualizes it. One sub-feature per prompt, verified before the next, as usual.

### 4A — Reading data (prerequisite)

| #   | Sub-feature                     | Notes                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **Reading status on a book**    | Inline status control (Unread / Reading / Read / Dropped) on the series-detail volumes table and the Books table, through the existing reading hooks + `invalidateQueries`. Setting _Reading_ stamps `startedAt`, _Read_ stamps `finishedAt` (today, editable). A book with no reading row is treated as Unread everywhere. |
| 4.2 | **Bulk "Set reading status"**   | A Console Bulk Edit action, for backfilling history (e.g. `series = X`, `volume <= 12` → Read). Needs bulk-endpoint support, since reading is a separate table. Proposed semantics: update each book's _latest_ reading row (create one if missing); starting a re-read stays a per-book action.                            |
| 4.3 | **Reading queue**               | An ordered "read next" list with drag-to-reorder. Proposed model: nullable `queue_position` on `books` (the queue is about the physical book, not a reading event). A `/queue` page showing each book's location badge. Check Svelte 5 support before adopting a DnD library; native HTML5 DnD is the fallback.             |
| 4.4 | **Backfill helpers (optional)** | Bulk Edit actions for `price` and `source` only if you want spending insights in 4B — otherwise skip and let 4.9 wait for organically entered prices.                                                                                                                                                                       |

### 4B — Insights (`/insights`)

| #    | Sub-feature                        | Notes                                                                                                                                                                                                          |
| ---- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.5  | **Insights foundation**            | `GET /api/insights` loads rows and hands them to a pure, unit-tested `src/lib/insights/` module (same pattern as `console/logic.ts`). Chart wrapper + page skeleton with stat tiles.                           |
| 4.6  | **Backlog (tsundoku)**             | Unread pile size, oldest unread book, buy rate vs read rate per month, estimated time to clear the pile at the current pace, series owned but never started.                                                   |
| 4.7  | **Collection growth**              | Books added per month + cumulative. Works with today's data.                                                                                                                                                   |
| 4.8  | **Tags & completion**              | Tag distribution; buy vs read by tag; completion vs drop rates by tag and publisher.                                                                                                                           |
| 4.9  | **Spending**                       | By month and by source (bookfair vs bookstore vs online), money sitting unread, cost per book actually read. Totals hidden by default behind the "coward toggle". Only meaningful once prices exist (see 4.4). |
| 4.10 | **Reading pace & bookfair funnel** | Average time from purchase to finish; per-event purchased vs read. The funnel needs more than the one recorded bookfair to say much.                                                                           |
| 4.11 | **Polish → tag v0.4**              | Sidebar, empty states for thin data, build verification.                                                                                                                                                       |

**Charts:** Chart.js driven through a thin Svelte action (`use:chart`) rather than a wrapper library — `svelte-chartjs` predates Svelte 5 runes; verify before adopting any wrapper. LayerChart (Svelte-native) is the alternative if Chart.js feels foreign.

**Decisions needed before 4A starts:** (1) agree to put reading data before charts; (2) `queue_position` on `books` vs a separate queue table; (3) whether to backfill prices (4.4) or defer spending insights.

## Phase 5 — Mobile "Field Mode" (PWA) → v0.5

Responsive Field Mode for one-handed bookfair entry: 3-button landing ("I bought a book" / "New title" / "Add to Watchlist"), persistent bookfair session toggle, fuzzy search (2–3 letter trigger) that doubles as the **"do I own this?"** check (owned volumes + location), +/- volume steppers, large location toggles, skippable price, draft state ("Incomplete" badge), offline-tolerant mutations with a retry queue, installable PWA + service worker.

## Phase 6 — Social & Playful → v0.6

The Aesthetic Receipt (shareable haul image), shareable/printable Hitlist, collection-milestone toasts ("100th manga!").

## Phase 7 — Polish & Production → v0.7

Design-system pass (via `.agent/skills/ui-ux-pro-max/`), dark mode, micro-animations, loading/skeleton/error states, accessibility audit, performance (lazy loading, virtual scrolling), Zod validation client + server (builds on the `drizzle-zod` work), Lighthouse PWA audit, production Docker hardening.

## Parked — low priority, may never happen

- **Receipt photo → drafts.** Photo of a receipt → a vision-capable LLM extracts items, prices, store and date → items land as _staged_ entries in the Console's existing review screen. Runs as a SvelteKit endpoint (no separate Python service). Costs per receipt and needs an API key. Earliest sensible slot: after v0.5.

## Not adopted (decided 2026-10-13)

From the old feature brainstorm (`temp/additional-context.md`): ISBN barcode scanning, the "Bring" list, a volume-level Wishlist, the new-volume watcher, price watch, a Python/FastAPI processing service, a Streamlit dashboard (or prototyping in Streamlit), and series detection from title patterns. Gap detection and a store-name field were considered but not added to the roadmap. The **Activity Log** was dropped from Phase 3.

## Dependencies

v0.3 needs Consolidation's `drizzle-zod` step only loosely (the Hitlist adds no columns). v0.4's 4A precedes 4B. v0.5 is independent of v0.4. Phase 6 depends on 3 + 4; Phase 7 depends on 5 + 6.

## Open-item recommendations (decide closer to implementation)

- **Charts (Phase 4):** see the Charts note in Phase 4.
- **Aesthetic Receipt (Phase 6):** start client-side (`html2canvas` → PNG); upgrade to server-rendered (Satori + Sharp) only if shareable URLs are wanted.
- **Auth (only if multi-user is ever needed):** the hooks-based middleware pattern stays; swap the single password gate for a real user/session store. Not needed for single-user.

## Verification per phase

| Phase         | Verification                                                                                                                     |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Consolidation | Types derive from schema; build + tests + `svelte-check` green                                                                   |
| v0.3          | Hitlist generates from watchlist; prints cleanly; copy-to-clipboard works                                                        |
| v0.4          | Reading status editable singly + in bulk; queue reorders and persists; insight calculations unit-tested; charts render real data |
| v0.5          | PWA installs on mobile; offline mutations queue and retry; forms are fast                                                        |
| v0.6          | Receipt image generates and downloads; milestones trigger                                                                        |
| v0.7          | Lighthouse PWA ≥ 90; accessibility audit passes; production Docker works                                                         |
