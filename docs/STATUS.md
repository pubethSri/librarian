# Librarian — Development Status

> **This file is the single source of truth for "where the project is now."**
> Roadmap / future scope lives in [`ROADMAP.md`](./ROADMAP.md); how to work in the repo lives in [`../CLAUDE.md`](../CLAUDE.md); product vision in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md). Update *this* file at every version bump.

## State as of 2026-07-02

- **Current version:** v0.3 — **in progress** (Phase 3; Consolidation milestone underway, revived after a multi-month pause).
- **Direction:** *Consolidation first.* Before finishing Phase 3, pay down debt found on return (see the Consolidation milestone in `ROADMAP.md`). Theme: single source of truth, in code and docs.
- **Latest:** `filterEngine` now has unit tests; Console overhaul Step 1 (`$derived.by` fix) done and browser-verified. Next: Step 2 (decompose the Console).
- **Docs reconciled** this date: `STATUS.md` is now the only state tracker; `PLAN.md` became `ROADMAP.md` (no completion checkboxes); `HANDOFF.md` (a one-time Antigravity→Claude Code migration artifact) and `note_to_self.txt` (a stale, already-fixed bug note) were retired.

### Phase 3 progress

| # | Sub-feature | Status |
|---|---|---|
| 1 | TanStack Query hooks for bookfairs + types | ✅ Done |
| 2 | Bookfairs management page (card grid + CRUD dialogs) | ✅ Done |
| 3 | Bookfair detail page (header, stats, books table) | ✅ Done |
| 4 | Source tracking with event linking | ✅ Done |
| 5 | Console — Preview Panel + Add Books tab | ✅ Done |
| 6 | Console — Bulk Edit tab | ✅ Done |
| — | **Consolidation milestone** (debt paydown) | 🔵 **In progress** (see below) |
| 7 | Activity Log | ⬜ Pending |
| 8 | Bookfair Hitlist | ⬜ Pending |
| 9 | Polish, sidebar links, build verification → tag `v0.3` | ⬜ Pending |

### Consolidation progress (v0.3.x)

| Item | Status |
|---|---|
| `filterEngine` unit tests (26 characterization tests, incl. numeric-`=` regression guard) | ✅ Done |
| Console overhaul — Step 1: fix `$derived` misuse (`$derived.by`), svelte-check 31 → 0 | ✅ Done (browser-verified) |
| Console overhaul — Step 2: decompose into panels + `.svelte.ts` rune modules | ⬜ Next |
| Console overhaul — Step 3: wire `batch`/`bulk` hooks + `invalidateQueries` (fold in scope-switch query-reactivity bug) | ⬜ Pending |
| Types + validation via `drizzle-zod` (Tier 1) | ⬜ Pending |
| Tier 2 (relational `/api/books`, move `filterEngine` to `lib/`, session token expiry) | ⬜ Pending |

A visual test on 2026-07-02 confirmed the Step 1 reactivity fix and surfaced a set of Console bugs/polish items — logged as **"Console follow-ups"** in `ROADMAP.md`.

## Completed Phases

### Phase 0 — Project Init & Scaffolding ✅ `v0.0`
- SvelteKit + TypeScript + Tailwind CSS v4 (shadcn-svelte nova/zinc)
- Docker Compose (PostgreSQL + SvelteKit app)
- Auth middleware (HMAC-SHA256 cookie), login/logout
- TanStack Query + TanStack Table installed
- Route stubs, PWA manifest, Dockerfile

### Phase 1 — Database & Emergency Fallback ✅ `v0.1`
- Full Drizzle schema: 6 tables (`series`, `books`, `reading`, `bookfairs`, `tags`, `series_tags`), 5 enums
- `volume_number` is `numeric(4,1)` — supports half-volumes (4.5)
- Airtable migration: **44 series + 300 books imported, 0 warnings**
- CSV export API (`/api/export/airtable`) — Airtable-compatible format
- Seed script with 5 series, 15 books, 5 tags, 3 bookfairs
- Full CRUD API routes for all entities (12 endpoints)

### Phase 2 — Desktop: Core Data Management ✅ `v0.2`
- Navigation shell: sidebar (fixed, collapsible, mobile sheet) + breadcrumbs
- Dashboard home with stats grid and recent additions
- Series table: search, type/status filters, column sorting, client-side pagination
- Series detail: header, stats, volumes table, tags editor, edit/delete dialogs
- Books table: search, location/source/draft filters, sorting, pagination
- Tags management page with usage count and create/delete
- Data entry forms: NewVolumeDialog (with series autocomplete), NewSeriesDialog (two-step)
- Inline editing: status badge dropdown, watchlist star toggle
- Shared components: StatusBadge, TypeBadge, ProgressBar, EmptyState, DeleteConfirmDialog
- TanStack Query v6 hooks for all CRUD operations with automatic cache invalidation
- Enhanced `/api/tags` with usage count (LEFT JOIN + GROUP BY)
- Toast notifications (Sonner) for all mutations
- Error page (+error.svelte)

### Phase 2C — Unified Search & Filter ✅ `v0.2.3`
- **Unified filter engine** (`filterEngine.ts`) — single `UnifiedFilterState` object shared across all filter UIs
- **Tag chips bar** (`TagChipsBar.svelte`) — toggleable tag badges on Series and Books pages, active-first sorting, clear button
- **Booru-style search bar** (`BooruSearchBar.svelte`) — monospace input with structured search syntax:
  - Bare words search both tag names and series names (hybrid OR)
  - `-tag` excludes by tag
  - `status:ended`, `type:ln`, `volumes:>=4` etc. with operators `=`, `!=`, `>`, `<`, `>=`, `<=`
  - Value aliases: `ln`→`light_novel`, `m`→`manga`, `apt`→`apartment`, `store`→`bookstore`, `fair`→`bookfair`, `yes`/`no`→`true`/`false`
  - Quoted strings: `"slice of life"`
- **Autocomplete dropdown** — suggests tag names (T), parameter keys (P), parameter values (V) with keyboard navigation
- **Booru parser** (`booruParser.ts`) — pure function with unit tests (vitest), includes `buildBooruQuery()` for reverse conversion
- **Books API** updated to include `seriesTags` per book for tag chip filtering
- Old `AdvancedFilter.svelte` and `advancedFilterUtils.ts` removed (replaced by unified system)

### Phase 3 — Bookfair & Bulk Workflows 🔵 `v0.3` (in progress)
Delivered: bookfairs CRUD + card grid, bookfair detail page, source/event linking, and the unified Console (`/console`) with *Add Books* (staged batch create) and *Bulk Edit* (condition builder → bulk PATCH) tabs. Remaining: Consolidation milestone, then Activity Log, Bookfair Hitlist, and polish. See the progress table above and `ROADMAP.md`.

## Decisions Log

### Phase 2 Decisions (2026-04-28)
- **Design identity:** "Interactive Editorial" — typography-driven, monochromatic zinc, generous whitespace
- **Pagination:** Client-side (dataset fits in memory: ~44 series, ~300 books)
- **Inline editing:** Status badge + watchlist toggle only; all other fields via detail page / edit dialog
- **Keyboard shortcuts:** Command palette (`Ctrl+K`), `Shift+N` for new book, vim-style traversal
- **Layout:** Fixed sidebar (20–25% width), collapsible, mobile sheet drawer
- **Table engine:** Pure Svelte 5 reactivity ($derived/$state) instead of TanStack Table v9 alpha

### v0.2.1 Decisions (2026-04-29)
- **Sidebar:** Compact, grouped nav with section labels (COLLECTION / TOOLS / ANALYTICS). Text-only links, no icons.
- **Advanced filtering:** Airtable-style multi-field condition builder, toggleable panel. In-memory only (resets on navigation).
- **Book editing:** EditBookDialog added — core CRUD was incomplete without it.
- **Delete confirmation:** Series deletion requires typing confirmation text.
- **Phase 3 expansion:** Phase 3 split into 3A (Bookfair & Bulk Entry) and 3B (Command Console — visual bulk editing query builder).

### v0.2.2 Decisions (2026-05-06)
- **Sidebar polish:** Collapse/expand button consistently at bottom, removed book logo, nav content vertically centered.
- **Books edit access:** EditBookDialog now accessible from both series detail page and global Books page.
- **Phase 2C added:** Unified Search & Filter — tag chips toggle, booru-style search DSL, unified filter state.
- **Booru-style search:** Structured text syntax (`isekai -harem status:ended volumes:>=4`). Separate from visual advanced filter but shares underlying filter state.
- **Workflow change:** Atomic execution with upfront planning — plan the full phase first (get approval), then execute one sub-feature per prompt, verify each before moving to next.

### v0.2.3 Decisions (2026-05-26)
- **Booru search architecture:** Bare words match BOTH tag names and name fields (hybrid OR per term, AND across terms). This replaces the old simple text search entirely.
- **Filter engine:** Numeric `=` operator uses exact equality (not substring match) to prevent `volumes:1` matching `10`, `15`.
- **`volumes:` param** maps to `bookCount` column, `name:` param searches across `shortName`/`fullName`/`seriesShortName`/`seriesFullName`.
- **Edit dialog pattern:** Parent controls `open` state exclusively via `showEditBookDialog` boolean. Dialog calls `onclose()` instead of setting `open = false` internally. Prevents re-open bug after Cancel/Save. *(This resolved the bug formerly tracked in `note_to_self.txt`.)*
- **Vitest added** for unit testing (`npm test`, `npm run test:watch`).
- **Command palette (`Ctrl+K`):** Deferred to Phase 7 (Polish) since booru search bar covers the filtering use case.

### Phase 3 Decisions (2026-05-27)
- **Unified Console (`/console`):** Single two-panel page replaces both the bookfair entry dialog and the separate command console page. Zero redundancy — one system handles adding books AND bulk editing.
- **Console two-panel layout:** Preview Panel (left) + Command Panel (right). Command Panel has two tabs: "Add Books" and "Bulk Edit".
- **Preview Panel — full context view:** Shows ALL existing books in scope by default. Staged additions appear with green left border + "NEW" badge. Staged edits appear with amber highlight + old→new value indicator. Both coexist in the same view.
- **Staged workflow:** New entries are staged (not saved immediately) until "Commit All" is clicked. This allows reviewing and removing mistakes before saving. Batch creates use a single transaction.
- **Console scope system:** Scope selector at top controls context — "All Books" / "Specific Bookfair" / "Filter by Series". URL params (`?scope=bookfair&id=3`) pre-set the scope. Bookfair detail pages link to Console with pre-set scope.
- **Bookfair defaults:** When scope = bookfair: `source` locked to "bookfair", `sourceEventId` auto-set, `location` defaults to "apartment", `boughtAt` defaults to bookfair date.
- **Volume range entry:** Add Books tab supports volume ranges (e.g., "4 to 9") that auto-expand to individual entries. Price is shared by default but overridable per-volume in the preview table.
- **Bookfairs page architecture:** Card grid listing → detail page (header + stats + books table) → "Open in Console" button. Detail page is informational; heavy work happens in Console.
- **Reading status management:** Deferred from Phase 3 — will be implemented in a later phase.
- **Bulk Edit — books only:** Command Console targets books only for v0.3. Series bulk operations deferred (no use case yet).
- **Bookfair Hitlist:** Shows all watchlist series by default with optional tag filters to narrow down. Print-friendly layout + copy-to-clipboard.
- **Activity log:** Simple `activity_log` table records Console bulk operations (batch creates, bulk edits). Read-only log shown as collapsible "Recent Activity" on Console page. No undo capability in v0.3 — full audit system deferred to later phases.
- **Sidebar updates:** Console added to TOOLS section. Hitlist accessible from bookfairs.

### Consolidation Decisions (2026-07-01)
- **Consolidation before features:** On revival, decompose the Console, wire the orphaned batch/bulk query hooks, add `filterEngine` tests, and derive types/validation from the schema (`drizzle-zod`) before building Activity Log. Rationale + full item list in `ROADMAP.md`.
- **Docs single-source-of-truth:** `STATUS.md` owns current state; `ROADMAP.md` owns forward plan (no checkboxes); `CLAUDE.md` owns how-to-work. `HANDOFF.md` and `note_to_self.txt` retired.

### Consolidation Decisions (2026-07-02)
- **Console overhaul is staged, one variable per step:** (1) fix the `$derived` reactivity/type bug in place, (2) decompose behavior-preserving, (3) wire the hooks. Each step is verified (svelte-check + build + tests + a browser smoke test) before the next, so any regression is attributable. Step 1 is done and browser-verified.
- **`$derived` vs `$derived.by`:** `$derived(() => x)` stores the *function*; use `$derived.by(() => x)` (or `$derived(x)` for a plain expression) when the body is a closure. This was the root cause of the Console's 31 svelte-check errors.
- **Tests are committed to the repo:** executable specs travel with the code (matches the already-tracked `booruParser.test.ts`); they don't ship in the build. This is distinct from the local-only `docs/`-style context.
- **Console scope-switch bug** traced to query args captured by value (`state_referenced_locally` at `console/+page.svelte:64–65`); scheduled to be fixed with the batch/bulk hook-wiring step. See "Console follow-ups" in `ROADMAP.md`.

## Key Files
| File | Purpose |
|---|---|
| `ROADMAP.md` | Forward roadmap (phases, versioning, open-item recommendations) |
| `context.md` | Original project requirements |
| `design_direction.md` | Visual identity, keyboard shortcuts, layout foundation |
| `../CLAUDE.md` | How to work in the repo (commands, architecture, conventions) |
| `src/hooks.server.ts` | Auth middleware |
| `src/lib/server/auth.ts` | Auth utilities (HMAC-SHA256) |
| `src/lib/server/db/schema.ts` | Full Drizzle schema (6 tables, 5 enums) |
| `src/lib/server/db/index.ts` | Database connection |
| `src/lib/utils.ts` | `cn()` utility + shadcn-svelte type helpers |
| `src/lib/utils/booruParser.ts` (+ `.test.ts`) | Booru-style search query parser + builder, with unit tests |
| `src/lib/types.ts` | Shared TypeScript types (API shapes, enums, mutation payloads) |
| `src/lib/queries/*.ts` | TanStack Query hooks (series, books, bookfairs, reading, batch, bulk, tags) |
| `src/lib/components/filterEngine.ts` | Unified filter state types + `applyUnifiedFilter()` |
| `src/lib/components/BooruSearchBar.svelte` | Search input with autocomplete |
| `src/lib/components/TagChipsBar.svelte` | Toggleable tag filter badges |
| `src/lib/components/{SeriesTable,BooksTable}.svelte` | Entity tables with booru search/sort/pagination |
| `src/routes/(app)/console/+page.svelte` | Unified bulk entry + editing workbench (Console) |
| `src/routes/layout.css` | Global CSS with Tailwind v4 theme tokens |
| `scripts/{seed,migrate-airtable}.ts` | Dev seed + Airtable CSV → PostgreSQL migration |

## API Routes
| Route | Methods | Description |
|---|---|---|
| `/api/series` | GET, POST | List/create series (search, filter, includes tags + book count) |
| `/api/series/[id]` | GET, PATCH, DELETE | Single series with nested books/tags |
| `/api/series/[id]/tags` | PUT | Replace tags for series |
| `/api/books` | GET, POST | List/create books (filter by series/location/draft/event, includes seriesTags) |
| `/api/books/[id]` | GET, PATCH, DELETE | Single book with reading history |
| `/api/books/batch` | POST | Batch-create books (Console commit) |
| `/api/books/bulk` | PATCH | Bulk-update books (allowlisted fields) |
| `/api/books/[id]/reading` | GET, POST | Reading history + re-reads |
| `/api/books/[id]/reading/[readingId]` | PATCH | Update reading entry |
| `/api/bookfairs` | GET, POST | List/create bookfairs |
| `/api/bookfairs/[id]` | GET, PATCH, DELETE | Bookfair detail / update / delete |
| `/api/tags` | GET, POST | List/create tags (includes seriesCount) |
| `/api/tags/[id]` | DELETE | Delete tag |
| `/api/export/airtable` | GET | CSV download (Airtable format) |
| `/api/health` | GET | Health check (public) |
| `/api/logout` | POST | Clear session cookie |

## Changelog
| Date | Change |
|---|---|
| 2026-04-20 | Phase 0 completed — scaffolding, Docker, auth, tooling |
| 2026-04-27 | Phase 1 completed — schema, migration, CRUD API, CSV export |
| 2026-04-28 | Phase 2 completed — navigation shell, series/books/tags pages, data entry, inline editing |
| 2026-04-29 | v0.2.1 — compact grouped sidebar, advanced filter, book editing, delete confirmation |
| 2026-05-06 | v0.2.2 — sidebar polish, books edit from global page, Phase 2C planned, atomic workflow adopted |
| 2026-05-06 | v0.2.3 start — unified filter engine, tag chips (series + books) |
| 2026-05-22 | v0.2.3 — booru parser + booru search bar with autocomplete |
| 2026-05-26 | v0.2.3 done — numeric `=` fix, edit dialog re-open fix, Phase 2 complete |
| 2026-05-27 | Phase 3 begun — bookfairs CRUD + detail, source/event linking, unified Console (Add Books + Bulk Edit) |
| 2026-07-01 | **Project revived after pause.** Docs consolidated (STATUS = single source of truth; PLAN → ROADMAP, no checkboxes; HANDOFF + note_to_self retired). Consolidation milestone inserted before the Phase 3 remainder. |
| 2026-07-02 | Consolidation started — `filterEngine` unit tests added (58 tests total); Console overhaul Step 1 (`$derived.by` fix, svelte-check 31 → 0, browser-verified). Visual-test findings logged as Console follow-ups in `ROADMAP.md`. |
