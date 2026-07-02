# Librarian — Roadmap

> **Forward-looking plan only.** For **current state** (version, what's built, decisions, next step) see [`STATUS.md`](./STATUS.md) — it owns "where we are." This file owns "where we're going." Product vision lives in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md).
>
> This roadmap intentionally has **no completion checkboxes** — completion is tracked only in `STATUS.md` so the two can never disagree.

## Versioning

`v0.0` = init; each phase completion bumps `v0.x`. A Git tag is created per milestone.

| Version | Milestone |
|---|---|
| v0.0 | Scaffolding |
| v0.1 | Database & CSV fallback |
| v0.2 | Desktop core (tables, CRUD, data entry) |
| v0.2.x | Unified search & filter |
| v0.3 | Bookfair & bulk workflows |
| **v0.3.x** | **Consolidation / debt paydown — current focus** |
| v0.4 | Analytics & insights |
| v0.5 | Mobile Field Mode (PWA) |
| v0.6 | Social & playful features |
| v0.7 | Polish, decorative design, production hardening |

## Delivered

Phases 0–2, unified search/filter (2C), and most of Phase 3 (bookfairs CRUD + detail, source/event linking, Console *Add Books* + *Bulk Edit*) are shipped. `STATUS.md` has the authoritative breakdown and the decisions log.

## Now — Consolidation (v0.3.x)

The project was paused and is being revived. Before adding new features, pay down the debt surfaced on return so the codebase moves forward cleanly. Guiding theme — the same one driving this doc cleanup: **one fact, one home** (single source of truth), applied to both code and docs.

**Tier 1 — worth doing**
- **Decompose `console/+page.svelte`** (~1,000 lines) into panels (`AddBooksPanel`, `BulkEditPanel`, `PreviewTable`, `ScopeBar`) and extract logic into `.svelte.ts` rune modules (e.g. `stagingStore`, `bulkEdit`). Do this **before** Activity Log lands on the same page.
- **Wire the orphaned `queries/batch.ts` / `queries/bulk.ts` hooks.** The Console currently commits via raw `fetch` + manual `refetch()`; switch it to the hooks + `invalidateQueries`, matching the rest of the app.
- **Add unit tests for `filterEngine.ts`.** Its numeric-`=` edge case (`volumes:1` wrongly matching `10`) regressed once and has zero coverage today.
- **Single source of truth for types + validation via `drizzle-zod`.** Derive a base type from the schema, then layer the response transforms (dates/`numeric` → string, computed `bookCount`/`tags`). Replaces the hand-maintained `types.ts` mirroring and the manual per-route validation.

**Tier 2 — opportunistic, low-risk**
- Replace the manual `innerJoin` + `tagMap` building in `/api/books` with Drizzle relational queries (`with:`); relations are already defined.
- Move `filterEngine.ts` out of `components/` into `lib/` — it's a pure module.
- Reject session tokens older than the cookie `maxAge` in `verifySessionToken` (currently signature-only: a copied cookie stays valid until `AUTH_SECRET` rotates).

**Exit criteria:** Console files under ~300 lines each, batch/bulk go through hooks, `filterEngine` covered by tests, types/validation derived from the schema, build + tests green.

### Console follow-ups (found in the v0.3.x visual test, 2026-07-02)

Surfaced while verifying the `$derived.by` reactivity fix. Fold into the decompose/wire work rather than one-off patches where possible.

**Bugs**
- **Scope switch stalls the preview.** Opening the Console pre-scoped to a bookfair works, but *changing* scope via the dropdown leaves the preview stuck loading (no books shown). Root cause: `bookfairDetailId` is passed to `createBookfairDetailQuery`/`createBooksByEventQuery` by value, capturing only the initial value (svelte-check `state_referenced_locally` warnings at `console/+page.svelte:64–65`) — the queries never react to scope changes. Fix belongs with the **batch/bulk hook-wiring** item (pass a reactive getter / reconfigure the query on scope change).
- **Preview filter ignores series-level keys.** `location:` and `volumes:` work, but `publisher:`, `status:`, `type:`, `tag:` do nothing. Preview rows only carry `seriesShortName/volumeNumber/location/source/price/isDraft/seriesTags`, so the other fields aren't present to match, and `tag:` isn't a handled param (tags flow through include/exclude). Fix: enrich preview rows with the series fields (`publisher/status/type`) and map `tag:` in the Console remapping.

**Behavior**
- **Next-volume suggestion ignores out-of-scope ownership.** In a bookfair scope, selecting a series *not* in that event suggests volume 1 instead of the next unowned volume, because it reads `scopedBooks`. Compute next-unowned from *all* owned books, not just the in-scope set.

**Enhancements / polish**
- Add a **Location selector** to the Add Books form, defaulting to **Apartment**.
- **Bulk-edit confirm dialog** reuses `DeleteConfirmDialog`, so its button reads "Delete"/"Cancel" — misleading for an edit. Use an apply-styled confirm ("Apply"/"Confirm").
- Add **`volumes` (volumeNumber)** as a bulk-edit condition column.
- Let bulk-edit **conditions also scope the preview** (show only matched rows) — and, relatedly, a way to select rows directly from the preview.
- Keep the **preview count/summary bar always visible** (sticky) regardless of list length.
- Optional **series-grouping toggle** in the preview.

## Then — finish Phase 3 (→ v0.3)

- **Activity Log** — `activity_log` table, read-only "Recent Activity" on the Console.
- **Bookfair Hitlist** — shopping list from watchlist series with tag filters; print-friendly + copy-to-clipboard.
- Sidebar links, build verification, tag `v0.3`.

## Phase 4 — Analytics & Insights → v0.4

Tsundoku/backlog pressure, collection growth over time, bookfair-to-read funnel, reading pace, tag distribution, completion rates by tag/publisher, spending summary with a hidden-by-default "coward toggle."

## Phase 5 — Mobile "Field Mode" (PWA) → v0.5

Responsive Field Mode for one-handed bookfair entry: 3-button landing ("I bought a book" / "New title" / "Add to Watchlist"), persistent bookfair session toggle, fuzzy search (2–3 letter trigger), +/- volume steppers, large location toggles, skippable price, draft state ("Incomplete" badge), offline-tolerant mutations with a retry queue, installable PWA + service worker.

## Phase 6 — Social & Playful → v0.6

The Aesthetic Receipt (shareable haul image), shareable/printable Hitlist, collection-milestone toasts ("100th manga!").

## Phase 7 — Polish & Production → v0.7

Design-system pass (via `.agent/skills/ui-ux-pro-max/`), dark mode, micro-animations, loading/skeleton/error states, accessibility audit, performance (lazy loading, virtual scrolling), Zod validation client + server, Lighthouse PWA audit, production Docker hardening.

## Dependencies

Phases 3, 4, and 5 are independent after Phase 2. Phase 6 depends on 3 + 4 (Analytics); Phase 7 depends on 5 (Mobile) + 6. Consolidation precedes the Phase 3 remainder.

## Open-item recommendations (decide closer to implementation)

- **Charts (Phase 4):** Chart.js via `svelte-chartjs` — ~60KB gzipped, covers line/bar/pie/funnel; lighter than ECharts, simpler than Layerchart.
- **Aesthetic Receipt (Phase 6):** start client-side (`html2canvas` → PNG); upgrade to server-rendered (Satori + Sharp) only if shareable URLs are wanted.
- **Auth (only if multi-user is ever needed):** the hooks-based middleware pattern stays; swap the single password gate for a real user/session store. Not needed for single-user.

## Verification per phase

| Phase | Verification |
|---|---|
| Consolidation | Console split; batch/bulk via hooks; `filterEngine` tests pass; types derive from schema; build + tests green |
| v0.3 | Activity log records Console operations; hitlist generates from watchlist |
| v0.4 | Charts render with real data; spending toggle works; calculations verified |
| v0.5 | PWA installs on mobile; offline mutations queue and retry; forms are fast |
| v0.6 | Receipt image generates and downloads; milestones trigger |
| v0.7 | Lighthouse PWA ≥ 90; accessibility audit passes; production Docker works |
