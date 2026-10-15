# Librarian — Development Status

> **This file is the single source of truth for "where the project is now."**
> Roadmap / future scope lives in [`ROADMAP.md`](./ROADMAP.md); how to work in the repo lives in [`../CLAUDE.md`](../CLAUDE.md); product vision in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md). Update _this_ file at every version bump.

## State as of 2026-10-15

- **Current version:** v0.3 — **in progress**, re-scoped as the **Bookfair release**: usable from a phone at the bookfair opening 2026-10-23 (attending 24–26). Deploy target **Oct 20**; plan B1–B7 in `ROADMAP.md`.
- **Machine:** moved from Arch Linux to **Windows 11** on 2026-10-13 (see Environment below).
- **Latest:** **Real-data backfill in progress** (you, on `localhost:5173`, also from a second PC over the LAN). It drove a round of Console / dialog improvements, each browser-checked by Claude on the scratch DB and used in the backfill: LAN fix, publisher + bookfair-name suggestions, New Series "Add volumes", app-wide Switch/tab state fix, Link to bookfair, Add Books Source + Purchase Date, Purchased column + bulk Set purchase date (details: Backfill-session Decisions 2026-10-15). Branch `bookfair-release` (`main` has everything up to B1).
- **Next:** finish the backfill → B3/B4 Field Mode → B5 Hitlist → B6 deploy + hardening (hosting choice open: laptop + Tailscale vs Vercel + Neon) → B7 trial run → tag `v0.3`. `drizzle-zod` after the fair.

### Bookfair release progress (v0.3)

| #   | Item                                                         | Status                           |
| --- | ------------------------------------------------------------ | -------------------------------- |
| B1  | Reading status per book (mark read, re-read)                 | ✅ Done (visual pass 2026-10-13) |
| B2  | Bulk Set reading status + Set price                          | ✅ Done (checked 2026-10-13)     |
| B2+ | Backfill ergonomics (selection, autocomplete, series picker) | ✅ Done (checked 2026-10-13)     |
| B2+ | Backfill-session additions (2026-10-15, list below)          | ✅ Done (Claude-checked, in use) |
| B3  | Field Mode 1 — "Do I own this?"                              | ⬜ Next                          |
| B4  | Field Mode 2 — quick add                                     | ⬜                               |
| B5  | Bookfair Hitlist (simple)                                    | ⬜                               |
| B6  | Deploy on the laptop (Tailscale)                             | ⬜                               |
| B7  | Trial run + fixes → tag `v0.3`                               | ⬜                               |

- **Direction reset 2026-10-13:** Activity Log dropped; old feature-brainstorm items triaged (see Direction Decisions below and `ROADMAP.md` → "Not adopted").

### Phase 3 progress

| #   | Sub-feature                                            | Status                         |
| --- | ------------------------------------------------------ | ------------------------------ |
| 1   | TanStack Query hooks for bookfairs + types             | ✅ Done                        |
| 2   | Bookfairs management page (card grid + CRUD dialogs)   | ✅ Done                        |
| 3   | Bookfair detail page (header, stats, books table)      | ✅ Done                        |
| 4   | Source tracking with event linking                     | ✅ Done                        |
| 5   | Console — Preview Panel + Add Books tab                | ✅ Done                        |
| 6   | Console — Bulk Edit tab                                | ✅ Done                        |
| —   | **Consolidation milestone** (debt paydown)             | 🔵 **In progress** (see below) |
| 7   | ~~Activity Log~~                                       | ❌ Dropped 2026-10-13          |
| 8   | Bookfair Hitlist                                       | ⬜ Pending                     |
| 9   | Polish, sidebar links, build verification → tag `v0.3` | ⬜ Pending                     |

### Consolidation progress (v0.3.x)

| Item                                                                                                                   | Status                                |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `filterEngine` unit tests (26 characterization tests, incl. numeric-`=` regression guard)                              | ✅ Done                               |
| Console overhaul — Step 1: fix `$derived` misuse (`$derived.by`), svelte-check 31 → 0                                  | ✅ Done (browser-verified)            |
| Console overhaul — Step 2: decompose into panels + `.svelte.ts` rune modules                                           | ✅ Done (browser-verified 2026-10-13) |
| Console overhaul — Step 3: wire `batch`/`bulk` hooks + `invalidateQueries` (fold in scope-switch query-reactivity bug) | ✅ Done (awaiting your visual pass)   |
| Console follow-ups (filter keys, owned-volume awareness, location selector, volume condition, Apply confirm, layout)   | ✅ Done (awaiting your visual pass)   |
| `svelte-check` errors 6 → 0                                                                                            | ✅ Done (awaiting your visual pass)   |
| Types + validation via `drizzle-zod` (Tier 1)                                                                          | ⬜ Next (own session)                 |
| Tier 2 (relational `/api/books`, move `filterEngine` to `lib/`, session token expiry)                                  | ⬜ Pending                            |

A visual test on 2026-07-02 confirmed the Step 1 reactivity fix and surfaced a set of Console bugs/polish items ("Console follow-ups"). All bug and behavior items were fixed on 2026-10-13 (below); the two optional polish items left are listed under Consolidation in `ROADMAP.md`.

### Console overhaul — Step 2 result (2026-07-27)

`console/+page.svelte`: **978 → 244 lines**. It now owns only the queries, scope state, `activeTab`, the two commit functions and the layout.

| File                                              | Lines | Role                                                                     |
| ------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| `src/routes/(app)/console/+page.svelte`           | 244   | Orchestration: queries, scope, tabs, commit, confirm dialog              |
| `src/lib/console/types.ts`                        | 44    | `ScopeType`, `BulkAction`, `Condition`, `PreviewRow`, `BookfairDefaults` |
| `src/lib/console/logic.ts` (+ `.test.ts`)         | 239   | Pure logic — no runes, no `crypto`, no toasts. 49 tests                  |
| `src/lib/console/staging.svelte.ts`               | 33    | `createStagingStore()`                                                   |
| `src/lib/console/bulkEdit.svelte.ts`              | 78    | `createBulkEditStore(getBooks, getIsActive)`                             |
| `src/lib/components/console/PreviewPanel.svelte`  | 223   | Filter bar + table + commit bar                                          |
| `src/lib/components/console/BulkEditPanel.svelte` | 196   | Action/value selectors + condition builder                               |
| `src/lib/components/console/AddBooksPanel.svelte` | 141   | Series picker, volume range, price                                       |
| `src/lib/components/console/ScopeBar.svelte`      | 79    | Scope selector + bookfair chip                                           |

Test count 58 → **107**. svelte-check: 6 errors (all pre-existing, none in `console/`); warnings 34 → 31, with the Console's own down 5 → 2 — those two are the captured-by-value query args at `+page.svelte:35–36`, i.e. the Step 3 bug markers.

The Step 2 browser smoke test (8 steps) was run by Claude on 2026-10-13 against a scratch copy of the database and **passed in full**, including the then-still-broken scope switch (step 8's control), which reproduced before the Step 3 fix.

### Console overhaul — Step 3 + follow-ups (2026-10-13)

Branch `consolidation/console-step3`, one commit per item:

| Commit    | Change                                                                                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ae0e7b2` | **Step 3.** Commit All / Bulk Edit go through `createBatchBookMutation` / `createBulkBookUpdateMutation`; `createBookfairDetailQuery` / `createBooksByEventQuery` take a getter → scope switch fixed |
| `823e8e8` | Preview filter matches `publisher:` / `status:` / `type:`; `tag:` is a booru key everywhere (`tag:isekai`, `tag:!=harem`)                                                                            |
| `94d233e` | Add Books: next-volume + duplicate check read **all** owned books; Location selector (default Apartment); "Maximum 50" means 50; price 0 kept                                                        |
| `2439153` | Bulk Edit: `volume` condition with `= != > < >= <=`; confirm says **Apply** (not red "Delete"); Console bounded to the viewport so the commit bar stays on screen; bar always shows a count          |
| `69dc7f0` | `svelte-check` 6 errors → 0 (`vitest/config`, `sourceEventId: null` in `UpdateBookPayload`, string-valued bookfair `Select` in the two book dialogs)                                                 |

Gate: 116 tests (was 107) · `svelte-check` 0 errors / 29 warnings (was 6 / 31) · lint clean · build ✅. Claude browser-checked each item on a scratch DB (`librarian_test`, served on `localhost:5174`); counts were cross-checked with SQL.

**Your visual pass — run before merging the branch.** Use the test server at `localhost:5174` while it is up: it uses the scratch DB, so committing and bulk-editing there is harmless. (On `localhost:5173` you are on the real DB; commits are real — there is a backup at `temp/backups/local-20261013-2030.dump`.)

**A. Scope switching (the Step 3 bug)**

1. `/console` (All Books) → scope dropdown → pick the bookfair. ✅ The preview shows that fair's books within a second, the 📍 chip and the "Bookfair mode" banner appear. ❌ Red flag: endless skeleton rows.
2. Switch back to All Books, then to the bookfair again. ✅ Each switch updates the list; the URL follows (`?scope=bookfair&id=…` / none).

**B. Commits refresh everything (hooks + cache invalidation)**

3. In bookfair scope, stage one volume → **Commit All**. ✅ Toast "Created 1 book", the row appears in the scoped list without a reload.
4. Click the home icon (client-side navigation, no reload) → dashboard. ✅ _Total Books_ and _Recent Additions_ already include it.
5. Bulk Edit in bookfair scope: _Set draft status → Draft_, no conditions → Execute → Apply. ✅ "Draft" badges appear on the rows; dashboard _Drafts_ count goes up.

**C. Preview filter keys**

6. Type each into the preview filter and compare with what you know of your collection: `publisher:"Phoenix Next"`, `type:manga status:ended`, `tag:romance`, `tag:!=romance`. ✅ Each narrows the list sensibly; the bottom bar reads "x / y shown". ❌ Red flag: zero rows for a key you know matches.
7. Autocomplete: type `ta` → `tag:` is suggested.

**D. Add Books**

8. Bookfair scope → pick a series that is **not** part of that fair but that you own (e.g. Arifureta). ✅ Volume box suggests _one past your highest owned volume_, not 1.
9. Set From/To to a volume you already own → Add to Preview. ✅ Toast "Volume N … already exists", nothing staged.
10. Location buttons: Apartment is preselected; click Home, stage a volume. ✅ The staged row says Home; the next one staged after clicking Apartment says Apartment.
11. Price `0` → stage. ✅ Row shows ฿0 (not "—"). Blank price still shows "—".
12. Range 1 → 50 is accepted; 1 → 51 gives "Maximum 50 volumes per batch". (Clear All afterwards.)

**E. Bulk Edit**

13. Add a condition, switch its column to **volume**. ✅ Operator list offers `= != > < >= <=`; value box is numeric. Set `>= 15`. ✅ "N affected" matches your expectation.
14. Switch that condition's column back to **location**. ✅ Value clears; an ordering operator resets to `=`.
15. Execute. ✅ Dialog button says **Apply** in the normal dark style (not red "Delete"); "Applying..." while running.

**F. Layout**

16. `/console` in All Books scope (300+ rows). ✅ The page itself does not scroll — the preview scrolls inside its panel, and the bottom bar ("N books") stays visible at the bottom. The right-hand panel scrolls independently.
17. Narrow the window to tablet width. Note anything cramped (the condition row is tight) — polish candidate, not a blocker.

**G. Book dialogs (type-error fix)**

18. Dashboard → _Add Book_ → Source _Bookfair_ → the event dropdown lists the fair; choosing it shows its name in the trigger. Cancel.
19. Open _Edit_ on a book that came from the bookfair (Books page or a series page). ✅ The event dropdown is pre-filled with the fair's name; change nothing, Save → no error.

**H. Regressions**

20. Console tab switching: amber EDIT badges disappear on the Add tab and return on Bulk Edit; the Add form keeps its values (Step 2 checks 5–6).
21. Any delete dialog (e.g. delete a book) still shows a red **Delete** button.

Report back pass/fail per letter; anything failing gets fixed on the branch before merge.

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

Delivered: bookfairs CRUD + card grid, bookfair detail page, source/event linking, and the unified Console (`/console`) with _Add Books_ (staged batch create) and _Bulk Edit_ (condition builder → bulk PATCH) tabs. Remaining: the rest of Consolidation (`drizzle-zod`), then Bookfair Hitlist and polish. (Activity Log dropped 2026-10-13.) See the progress table above and `ROADMAP.md`.

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
- **Edit dialog pattern:** Parent controls `open` state exclusively via `showEditBookDialog` boolean. Dialog calls `onclose()` instead of setting `open = false` internally. Prevents re-open bug after Cancel/Save. _(This resolved the bug formerly tracked in `note_to_self.txt`.)_
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
- **`$derived` vs `$derived.by`:** `$derived(() => x)` stores the _function_; use `$derived.by(() => x)` (or `$derived(x)` for a plain expression) when the body is a closure. This was the root cause of the Console's 31 svelte-check errors.
- **Tests are committed to the repo:** executable specs travel with the code (matches the already-tracked `booruParser.test.ts`); they don't ship in the build. This is distinct from the local-only `docs/`-style context.
- **Console scope-switch bug** traced to query args captured by value (`state_referenced_locally`, now at `console/+page.svelte:35–36` after the Step 2 decomposition); scheduled to be fixed with the batch/bulk hook-wiring step. See "Console follow-ups" in `ROADMAP.md`.

### Consolidation Decisions (2026-07-27)

- **Rune stores are factories, not module singletons.** `createStagingStore()` / `createBulkEditStore()` return objects with getters instead of exporting module-level `$state`. A module singleton would survive client-side navigation away from `/console` and back, silently resurrecting staged entries. Two-way-bound fields expose getter/setter pairs; `conditions` returns the live array so `bind:value={cond.column}` still writes through. This is the repo's first `.svelte.ts` convention — there were none before.
- **Cross-module reactivity travels as getters.** `createBulkEditStore(() => scopedBooks, () => activeTab === 'edit')` — the same technique Step 3 needs for the query args. Passing values would freeze them, which is exactly the open scope-switch bug.
- **Pure logic separated from rune modules.** `logic.ts` has no runes, no `crypto`, no toasts, so it is unit-testable without the Svelte compiler (vitest here has no `svelteTesting` plugin). Rule: pure logic never imports a `.svelte.ts`, and no `.test.ts` imports one.
- **Console modules live in `$lib`, not the route folder.** `src/lib/console/` for pure + rune modules, `src/lib/components/console/` for components — matching `CLAUDE.md`'s "app components sit in `src/lib/components/`" and the Tier 2 direction of keeping pure modules out of `components/`. There is no route-folder colocation precedent in this repo.
- **Step 2 was a pure refactor.** No logged Console follow-up was fixed, so any regression is attributable. Known quirks were preserved deliberately and pinned by tests rather than corrected: the "Maximum 50" guard that admits 51 volumes, a zero price dropping to `undefined`, blank condition values matching nothing, series-level params (`publisher:`/`status:`/`type:`) matching nothing in the preview, and the `activeTab === 'edit'` gate on `affectedBooks`.
- **`npm run lint` is broken repo-wide, and predates this work.** `prettier` crashes on _every_ `.svelte` file (`TypeError: getVisitorKeys is not a function`), so `npm run format` cannot touch components either. `npx eslint <path>` does work and was used as the unused-import net. Worth fixing as its own task; **not** folded into the refactor. _(Fixed 2026-10-13. The cause was `prettier-plugin-tailwindcss`, not `prettier-plugin-svelte`. See Tooling Decisions.)_

### Tooling Decisions (2026-10-13)

- **`npm run lint` passes, both halves.** The Prettier crash came from `prettier-plugin-tailwindcss@0.5.x`. That version predates Tailwind v4: it ignored `tailwindStylesheet` and crashed on `.svelte` files. Upgraded to `0.8.1`, then ran `npm run format` repo-wide in its own commit (cosmetic only). The 84 ESLint errors were then fixed by hand.
- **shadcn-svelte output is exempt from Prettier** (`/src/lib/components/ui/` in `.prettierignore`), so it stays byte-identical to what the CLI generates. `svelte/no-navigation-without-resolve` is also off for `ui/`: callers pass an already-resolved `href` through `Button`.
- **Navigation goes through `resolve()` from `$app/paths`.** Use `resolve('/books')` or ``resolve(`/series/${id}`)``. Query strings are accepted (``resolve(`/console?scope=…`)``). The rule cannot trace an href through an object property, so the Sidebar resolves its paths where `sections` is defined and scopes a disable/enable around the links. Hrefs built from `page.url`, which already includes the base path, must **not** be resolved again (breadcrumb, Console URL sync), so those lines carry a reasoned `eslint-disable`.
- **`_`-prefixed bindings are allowed to go unused** (`no-unused-vars` ignore pattern), as in skeleton loops: `{#each Array(5) as _, i (i)}`. Every `{#each}` now has a key, and data loops key on `id`/`href`/`key`.
- **`$effect` dependency reads use `void`** (`void filterState.quickFilters;`), so `no-unused-expressions` accepts them. Tracking is unchanged: shallow, per field.
- **`npm run check` reported 6 pre-existing type errors** (`vite.config.ts`, `EditBookDialog.svelte` ×3, `NewVolumeDialog.svelte` ×2). _(Fixed later the same day — see Consolidation Decisions 2026-10-13.)_
- **`.gitattributes` forces LF** so that Windows checkouts pass Prettier's line-ending check.

### Direction Decisions (2026-10-13)

Taken in the post-migration review of the project and an old feature brainstorm (`temp/additional-context.md`, local only).

- **Activity Log dropped** from Phase 3. Single user; the Console's toasts and the data itself are enough. No `activity_log` table.
- **Not adopted** from the brainstorm: ISBN barcode scanning, the "Bring" list, a volume-level Wishlist, the new-volume watcher, price watch, a Python/FastAPI service, Streamlit (dashboard or prototype), series detection from title patterns. Gap detection and a store-name field were considered and not added.
- **Kept for the roadmap:** a **reading queue** and the **extra insights** (money sitting unread, cost per book read, time to clear the pile, buy vs read by tag) — both in the v0.4 draft.
- **Parked:** Receipt photo → Console drafts (low priority, maybe never).
- **Data reality check:** nothing in the UI writes reading status (the reading hooks are unused); all 300 reading rows are `unread` with no dates; 0/310 books have a price; 15/310 a source; 0/46 series a `totalVolumes`. Hence the v0.4 draft puts **reading data (4A) before charts (4B)** — pending your approval.

### Consolidation Decisions (2026-10-13)

- **Query factories that depend on changing ids take a getter** (`createBookfairDetailQuery(() => id)`), read inside TanStack Query's options thunk so the query re-keys. This was the scope-switch bug. `createSeriesDetailQuery` still takes a value — fine while its page reads the id once, but it would need the same change before any client-side navigation between series pages.
- **Mutation invalidation is by prefix:** `['books']` and `['bookfairs']` also cover `['books','event',id]` and `['bookfairs',id]`, so the Console needs no manual `refetch()`.
- **The preview borrows series fields from the series list query** (`seriesById`) rather than widening `/api/books`. The series type lives on rows as `seriesType`, because `PreviewRow.type` already means existing-vs-staged (a test caught the collision); the Console remap sends `type:` there.
- **`tag:` is a first-class booru key**, matched in `applyUnifiedFilter` against `getTagNames`, so it works on every filtered page, not only the Console.
- **Add Books reads all owned books**, not the scoped ones, for both the next-volume suggestion and duplicate detection. This intentionally blocks re-staging a volume owned outside a bookfair scope (owning a true duplicate now needs the single-book dialog).
- **The Add Books form owns `location`** (default Apartment, per the follow-up); `BookfairDefaults` no longer carries it.
- **Quirks pinned in Step 2 were corrected** now that the refactor is verified: the 50-volume limit admits exactly 50; a price of 0 is kept; an ordering operator on a text bulk-edit condition matches nothing instead of everything. Still deliberate: a blank condition value matches nothing, and the `activeTab === 'edit'` gate on highlighting.
- **The Console is bounded to the viewport** (`h-[calc(100dvh-…)]`, matching the layout's header + padding) so its panels scroll independently, per `design_direction.md`. If the app shell's header height or padding changes, update that calc.
- **`DeleteConfirmDialog` takes `confirmLabel` / `loadingLabel` / `destructive`.** Defaults keep it a delete dialog; the Console's bulk edit passes "Apply". (Renaming the component was not worth the churn.)
- **bits-ui `Select` values are strings.** Numeric ids are bound through a getter/setter pair converting to and from `number`.
- **`drizzle-zod` deferred to its own session** rather than squeezed into the end of an unattended run: it rewrites `types.ts` and touches every API route.

### Bookfair-release Decisions (2026-10-13)

- **Re-scope:** v0.3 becomes the _Bookfair release_ (B1–B7 in `ROADMAP.md`): reading status + backfill tools, a Field Mode MVP ("do I own this?" + quick add), a simple Hitlist, laptop deployment. The reading queue, Analytics, `drizzle-zod` and full Field Mode (offline) move after the fair. Side project, so speed over ceremony.
- **Reading rules** (agreed; backfilled data depends on them):
  - A book's **current status** is its newest reading row; a book with no rows is Unread.
  - **Times read** = number of its rows with status Read — derived, never stored.
  - _Mark read_ on an Unread/Reading book updates the current row. _Re-read_ on a Read book creates a **new** row (status Reading, `startedAt` today).
  - **Backfilled reads carry no dates** ("read, date unknown"); reads marked from now on get today's date (editable). Insights that need dates skip undated reads.
- **Reading queue** (after the fair): a **separate `reading_queue` table**. It is a pool: order is a preference, finishing any queued book removes it; a Read book in the queue is a planned re-read. Adding the table later needs no change to existing data.
- **Price** means "**at least this much**": enter the book's list price even when it came in a pricier set with extras. Analytics never treat an empty price as ฿0 — totals read "at least ฿X, from N of M books", averages use priced books only. A clearly-labelled series-average estimate may come later.
- **Bulk _Set price_ is in scope** (B2), so prices and reading history are backfilled in one pass.
- **Remote access via Tailscale** (private network, `tailscale serve` HTTPS); no public exposure, no Cloudflare Tunnel.
- **`drizzle-zod` deferred past the fair** — reverses the earlier "before new columns" ordering; the Bookfair release adds no tables.
- **Bulk edits never start a re-read** (a Read book set to Reading in bulk is skipped) and stamp no dates. Re-reads are a deliberate per-book act.
- **Bulk-edit target:** a preview row selection, when present, replaces the conditions. The series condition matches by series id (picked), no longer by typed name.
- **Spreadsheet-style inline editing of the preview** (edits become staged rows) — proposed 2026-10-13, under discussion; not scheduled.

### Backfill-session Decisions (2026-10-15)

Requested while backfilling real data; each was browser-checked by Claude on the scratch DB.

- **LAN access:** `npm run dev -- --host` serves the real DB to other devices on the home network (`http://<laptop-IP>:5173`); the session cookie is not `secure` in dev, so login works over plain HTTP. **Client ids come from `newId()` (`$lib/utils/id`), never `crypto.randomUUID()`** — the latter exists only in secure contexts (HTTPS/localhost) and broke Add to Preview + Add condition over the LAN. A wider secure-context / deploy audit is in `ROADMAP.md` (LAN / deploy audit).
- **State styles:** the nova shadcn components style state with `data-checked:` / `data-open:` / `data-active:` / `data-horizontal:` … variants, but bits-ui 2.18 emits `data-state` / `data-orientation`. `layout.css` maps each with `@custom-variant` (also accepting the bare attribute). Before the fix every Switch looked the same on and off, active tabs were unmarked and open/close animations never ran. **Keep the mapping** if regenerating `ui/` components.
- **Suggestion inputs:** `SuggestInput` is the shared free-text combobox (focus lists all, substring narrowing, arrows/Enter/click, Escape keeps the dialog open, optional snap-to-existing-spelling). Publisher (New/Edit Series) and bookfair Location snap case variants to the existing spelling, so one value keeps one spelling. Bookfair **Name** suggests each recurring event **without its edition number** (user's choice) — picking fills `"<name> "` with focus kept to type the number, nearest-month event first, and fills Location from where it was last held.
- **New Series** step 2 is "Add Volumes (Optional)": owned count (−/+, 1–50) → Vol. 1…N via one batch request; location, source (+ fair picker, date follows the fair), purchase date; **no price**. _(Superseded the same day — see the next bullet.)_
- **Volume counts are derived, never typed in** (user's workflow: the app is updated when buying or editing books, not when a publisher releases one). The manual `series.total_volumes` field (published count; unused — 0 of 49 series had it) is gone from the UI: Edit Series no longer offers it, the series list's Volumes column shows the **owned count**, and the series page shows Volumes Owned / Latest Volume / Read / Unread, all computed from the books. The owned/total `ProgressBar` was removed. The DB column remains, unused, until the post-fair schema cleanup.
- **Link to bookfair** (Bulk Edit action): sets `source = bookfair` **and** `sourceEventId` together; "Also set purchase date to the fair's date" is **off by default** (never overwrite dates unasked). It **never defaults to every book in scope** (`requiresExplicitTarget`): no selection and no condition affects nothing — the Console opens pre-set to it from a fair page (`/console?link=<id>`), where one careless Apply would otherwise link the whole collection. **Set source** no longer offers Bookfair (it set no event). Fair page: "Add books from your collection" and per-row "Remove from this fair" (clears source + event, keeps the date).
- **Add Books** (outside bookfair scope) has Source and Purchase Date. A Bookfair source **requires a fair** ("Pick which bookfair"). Purchase Date **starts empty = unknown** (a default of today would mis-date backfilled books), with a Today button. Both persist between batches.
- **Purchase dates** are stored as UTC midnight and displayed by calendar day (`dayOf` / `formatDay`), never via the browser timezone. Bulk **Set purchase date** takes a day, Today, or Unknown (clears). `pendingPurchaseDay()` is the one source for the preview arrow, the PATCH body and the confirm text.
- **Bulk endpoint:** accepts `boughtAt` (validated) and returns 400 "Bookfair not found" for a missing event (was an FK 500). **Batch endpoint:** price 0 is stored as 0 (`|| null` had nulled it, undoing the Console's price-0 fix).

## Environment

- **Windows 11** since 2026-10-13 (was Arch Linux). Repo at `C:\librarian`; `core.autocrlf=input` + `.gitattributes` force LF. Shell: PowerShell, Git Bash also available.
- **Node v24.18 / npm 12** here; Linux had Node v26.11. Everything passes on 24 — install 26 only if the machines should match.
- **Database:** Docker container `librarian-db-1` (Postgres 16, volume `librarian_pgdata`, port 5432), restored from the Linux dump. Row counts matched at migration (bookfairs 1 · books 310 · reading 300 · series 46 · series_tags 188 · tags 20). Data entered on Linux after 2026-10-13 18:15 is not included; the Linux copy is the fallback.
- **LAN dev:** `npm run dev -- --host`, then `http://<laptop-IP>:5173` from another device (allow Node.js through Windows Firewall on private networks). Home network only.
- **Backups / scratch DB:** `temp/backups/*.dump` (untracked `temp/`). A scratch database `librarian_test` in the same container is used for browser testing; drop it any time (`DROP DATABASE librarian_test`).
- **npm install** blocks esbuild's install scripts; harmless, the build works.
- **`npm audit`:** 18 advisories (1 low, 11 moderate, 6 high), all dev tooling — not yet triaged (Tier 2 in `ROADMAP.md`).

## Key Files

| File                                                   | Purpose                                                                                    |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `ROADMAP.md`                                           | Forward roadmap (phases, versioning, open-item recommendations)                            |
| `context.md`                                           | Original project requirements                                                              |
| `design_direction.md`                                  | Visual identity, keyboard shortcuts, layout foundation                                     |
| `../CLAUDE.md`                                         | How to work in the repo (commands, architecture, conventions)                              |
| `src/hooks.server.ts`                                  | Auth middleware                                                                            |
| `src/lib/server/auth.ts`                               | Auth utilities (HMAC-SHA256)                                                               |
| `src/lib/server/db/schema.ts`                          | Full Drizzle schema (6 tables, 5 enums)                                                    |
| `src/lib/server/db/index.ts`                           | Database connection                                                                        |
| `src/lib/utils.ts`                                     | `cn()` utility + shadcn-svelte type helpers                                                |
| `src/lib/utils/booruParser.ts` (+ `.test.ts`)          | Booru-style search query parser + builder, with unit tests                                 |
| `src/lib/types.ts`                                     | Shared TypeScript types (API shapes, enums, mutation payloads)                             |
| `src/lib/queries/*.ts`                                 | TanStack Query hooks (series, books, bookfairs, reading, batch, bulk, tags)                |
| `src/lib/components/filterEngine.ts` (+ `.test.ts`)    | Unified filter state types + `applyUnifiedFilter()`, with unit tests                       |
| `src/lib/console/{types,logic}.ts` (+ `logic.test.ts`) | Console types + pure logic (staging, bulk-edit matching, preview rows/filter), unit-tested |
| `src/lib/console/{staging,bulkEdit}.svelte.ts`         | Console rune stores (factories returning getter-backed objects)                            |
| `src/lib/reading.ts` (+ `.test.ts`)                    | Reading rules: current status, times read, `planReadingChange`                             |
| `src/lib/server/reading.ts`                            | `applyReadingStatus(tx, bookIds, status, now)` — applies the rules for one or many books   |
| `src/lib/utils/{id,suggest,bookfairNames}.ts`          | `newId()` (LAN-safe ids); suggestion helpers; fair-name suggestions — all unit-tested      |
| `src/lib/components/forms/SuggestInput.svelte`         | Shared free-text combobox (`PublisherInput` wraps it; bookfair name/location use it)       |
| `src/lib/components/ReadingStatusControl.svelte`       | Status dropdown + one-tap Mark read / Re-read on book rows                                 |
| `src/lib/components/console/*.svelte`                  | Console panels: `ScopeBar`, `PreviewPanel`, `AddBooksPanel`, `BulkEditPanel`               |
| `src/lib/components/BooruSearchBar.svelte`             | Search input with autocomplete                                                             |
| `src/lib/components/TagChipsBar.svelte`                | Toggleable tag filter badges                                                               |
| `src/lib/components/{SeriesTable,BooksTable}.svelte`   | Entity tables with booru search/sort/pagination                                            |
| `src/routes/(app)/console/+page.svelte`                | Unified bulk entry + editing workbench (Console)                                           |
| `src/routes/layout.css`                                | Global CSS: Tailwind v4 theme tokens + bits-ui state-variant mapping (`@custom-variant`)   |
| `scripts/{seed,migrate-airtable}.ts`                   | Dev seed + Airtable CSV → PostgreSQL migration                                             |

## API Routes

| Route                                 | Methods            | Description                                                                                                      |
| ------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `/api/series`                         | GET, POST          | List/create series (search, filter, includes tags + book count)                                                  |
| `/api/series/[id]`                    | GET, PATCH, DELETE | Single series with nested books/tags                                                                             |
| `/api/series/[id]/tags`               | PUT                | Replace tags for series                                                                                          |
| `/api/books`                          | GET, POST          | List/create books (filter by series/location/draft/event; + seriesTags, readingStatus, timesRead)                |
| `/api/books/[id]`                     | GET, PATCH, DELETE | Single book with reading history                                                                                 |
| `/api/books/batch`                    | POST               | Batch-create books (Console commit, New Series volumes)                                                          |
| `/api/books/bulk`                     | PATCH              | Bulk-update books: allowlisted fields incl. `price`, `boughtAt`; `readingStatus` via the reading rules (undated) |
| `/api/books/[id]/reading/status`      | PUT                | Set a book's current reading status (mark read / re-read / correct), dated now                                   |
| `/api/books/[id]/reading`             | GET, POST          | Reading history + re-reads                                                                                       |
| `/api/books/[id]/reading/[readingId]` | PATCH              | Update reading entry                                                                                             |
| `/api/bookfairs`                      | GET, POST          | List/create bookfairs                                                                                            |
| `/api/bookfairs/[id]`                 | GET, PATCH, DELETE | Bookfair detail / update / delete                                                                                |
| `/api/tags`                           | GET, POST          | List/create tags (includes seriesCount)                                                                          |
| `/api/tags/[id]`                      | DELETE             | Delete tag                                                                                                       |
| `/api/export/airtable`                | GET                | CSV download (Airtable format)                                                                                   |
| `/api/health`                         | GET                | Health check (public)                                                                                            |
| `/api/logout`                         | POST               | Clear session cookie                                                                                             |

## Changelog

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-20 | Phase 0 completed — scaffolding, Docker, auth, tooling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-04-27 | Phase 1 completed — schema, migration, CRUD API, CSV export                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-04-28 | Phase 2 completed — navigation shell, series/books/tags pages, data entry, inline editing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-04-29 | v0.2.1 — compact grouped sidebar, advanced filter, book editing, delete confirmation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-05-06 | v0.2.2 — sidebar polish, books edit from global page, Phase 2C planned, atomic workflow adopted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-05-06 | v0.2.3 start — unified filter engine, tag chips (series + books)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-05-22 | v0.2.3 — booru parser + booru search bar with autocomplete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-05-26 | v0.2.3 done — numeric `=` fix, edit dialog re-open fix, Phase 2 complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-05-27 | Phase 3 begun — bookfairs CRUD + detail, source/event linking, unified Console (Add Books + Bulk Edit)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-07-01 | **Project revived after pause.** Docs consolidated (STATUS = single source of truth; PLAN → ROADMAP, no checkboxes; HANDOFF + note_to_self retired). Consolidation milestone inserted before the Phase 3 remainder.                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-07-02 | Consolidation started — `filterEngine` unit tests added (58 tests total); Console overhaul Step 1 (`$derived.by` fix, svelte-check 31 → 0, browser-verified). Visual-test findings logged as Console follow-ups in `ROADMAP.md`.                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-07-27 | Console overhaul Step 2 — decomposed into 4 panels + 2 rune stores + tested pure logic. `+page.svelte` 978 → 244 lines; 107 tests (was 58); Console svelte-check warnings 5 → 2. Behavior-preserving; browser smoke test pending.                                                                                                                                                                                                                                                                                                                                                                |
| 2026-10-13 | Lint green — `prettier-plugin-tailwindcss` 0.5 → 0.8 (fixes the `.svelte` crash), repo-wide format, 84 ESLint errors fixed (`resolve()` navigation, `{#each}` keys, dead imports). `.gitattributes` forces LF for the Windows move.                                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-13 | Moved to Windows 11 (DB restored, baseline green). Direction review: Activity Log dropped, brainstorm features triaged, v0.4 drafted as reading data → insights.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-13 | Step 2 browser-verified; **Console Step 3** (hooks + scope-switch fix) and Console follow-ups (filter keys, owned-volume awareness, location selector, volume condition, Apply confirm, bounded layout); `svelte-check` 6 → 0 errors; tests 107 → 116. Branch `consolidation/console-step3`, awaiting visual pass.                                                                                                                                                                                                                                                                               |
| 2026-10-13 | Bookfair release begun: visual pass A–I → merged to `main`. **B1** reading status per book (rules in `$lib/reading`); **B2** bulk Set reading status (undated) + Set price; preview row selection (click / Shift+click / select visible), filter value autocomplete (`tag:`/`publisher:`/`name:`), series-picker condition. Tests 116 → 141.                                                                                                                                                                                                                                                     |
| 2026-10-15 | Backfill-session fixes: Console works over LAN by IP (`crypto.randomUUID` is HTTPS/localhost-only → `$lib/utils/id` fallback); publisher field suggests existing publishers (New/Edit Series); New Series step 2 adds Vol. 1→N (count stepper, no price; Total Volumes left to Edit Series); **every Switch/tab/open-close state style was dead** (bits-ui `data-state` vs nova `data-checked:` variants) — mapped in `layout.css`; batch endpoint stored price 0 as null — fixed. LAN/deploy audit findings recorded in `ROADMAP.md` (LAN / deploy audit; slotted into B4–B6). Tests 141 → 149. |
| 2026-10-15 | Bookfair name/location suggestions (`SuggestInput`; names without edition number); **Link to bookfair** bulk action + fair-page "Add books from your collection" / "Remove from this fair" (explicit target required); Add Books Source + Purchase Date; preview Purchased column + bulk **Set purchase date**. Tests 149 → 165.                                                                                                                                                                                                                                                                 |
| 2026-10-15 | Volume counts derived from owned books: manual Total Volumes removed from Edit Series; series list shows owned count; series page shows Volumes Owned / Latest Volume / Read / Unread; `ProgressBar` deleted (`svelte-check` warnings 29 → 20).                                                                                                                                                                                                                                                                                                                                                  |
| 2026-10-15 | Bookfair page: **By series** tab (default) — one card per series with a chip per volume (`×2` for duplicate copies), count, locations and spend (lower bound, "n/m priced") — plus the **Haul** tab with the full list and Remove-from-fair. Pure `$lib/utils/haul` (`groupHaulBySeries`, `volumeChips`), tested. Tests 165 → 170.                                                                                                                                                                                                                                                               |
