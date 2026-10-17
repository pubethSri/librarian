# Librarian — Roadmap

> **Forward-looking plan only.** For **current state** (version, what's built, decisions, next step) see [`STATUS.md`](./STATUS.md) — it owns "where we are." This file owns "where we're going." Product vision lives in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md).
>
> This roadmap intentionally has **no completion checkboxes** — completion is tracked only in `STATUS.md` so the two can never disagree.

## Versioning

`v0.0` = init; each phase completion bumps `v0.x`. A Git tag is created per milestone.

| Version  | Milestone                                       |
| -------- | ----------------------------------------------- |
| v0.0     | Scaffolding                                     |
| v0.1     | Database & CSV fallback                         |
| v0.2     | Desktop core (tables, CRUD, data entry)         |
| v0.2.x   | Unified search & filter                         |
| v0.3.x   | Consolidation / debt paydown (mostly done)      |
| **v0.3** | **Insights + Bookfair release — current focus** |
| v0.4     | Reading log flow + reading queue + polish       |
| v0.5     | Phone app: Field Mode full (PWA, offline)       |
| v0.6     | Social & playful features                       |
| v0.7     | Polish, decorative design, production hardening |

## Delivered

Phases 0–2, unified search/filter (2C), and most of Phase 3 (bookfairs CRUD + detail, source/event linking, Console _Add Books_ + _Bulk Edit_) are shipped, along with most of the Consolidation milestone. `STATUS.md` has the authoritative breakdown and the decisions log.

## Now — Insights, then the Bookfair release (→ v0.3), deadline 2026-10-20

### Insights (pulled forward from v0.4 on 2026-10-16)

The backfill is done, so the data is worth charting. Insights comes first (user's call); B3–B7 follow in the time left before the Oct 20 deploy. Read-only — no new tables. Data facts and caveats (read dates are backfill stamps) are in `STATUS.md` → Handoff Decisions 2026-10-16.

| #   | Sub-feature                        | Notes                                                                                                                                                                                                         |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | **Insights foundation**            | `GET /api/insights` → pure, unit-tested `src/lib/insights/` module. Chart action + stat tiles; `/insights` page in the sidebar.                                                                               |
| I2  | **Backlog (tsundoku)**             | Unread pile, oldest unread, buy rate vs read rate, time to clear the pile, series owned but never started. Reads with no date are excluded from rates.                                                        |
| I3  | **Collection growth**              | Books per month + cumulative.                                                                                                                                                                                 |
| I4  | **Tags & completion**              | Tag distribution; buy vs read by tag; completion vs drop by tag and publisher.                                                                                                                                |
| I5  | **Spending**                       | By month / source, money sitting unread, cost per book read; "coward toggle". Price rules in `STATUS.md`: a price is a lower bound, unpriced books are never ฿0, figures show coverage ("from N of M books"). |
| I6  | **Reading pace & bookfair funnel** | Purchase → finish time (dated reads only); per-event purchased vs read.                                                                                                                                       |

**Charts:** Chart.js through a thin Svelte action (`use:chart`) rather than a wrapper library — `svelte-chartjs` predates Svelte 5 runes. LayerChart (Svelte-native) is the alternative.

### Bookfair release

The next bookfair opens **2026-10-23** (attending 24–26 Oct). Everything below exists to make the app usable from a phone at that fair; the rest of the old plan moves after it. Target: deployed by **Oct 20**, a trial run at a bookstore on **Oct 21–22**. One sub-feature per step, verified before the next.

| #   | Item                                    | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | **Reading status per book**             | _Mark read_ / _Re-read_ (and a status control) on the series-detail volumes table and the Books table. Rules in `STATUS.md` → Bookfair-release Decisions: current status = newest reading row; times read = count of Read rows; re-read = new row.                                                                                                                                                                                                                                                                                                                                                    |
| B2  | **Backfill tools in Console Bulk Edit** | _Set reading status_ (backfilled reads get **no date**) and _Set price_ (e.g. `series = X` → 175), so reading history and prices can be filled in one pass. Grew during the backfill (row selection, Link to bookfair, Set purchase date, …) — see `STATUS.md`.                                                                                                                                                                                                                                                                                                                                       |
| B3  | **Field Mode 1 — "Do I own this?"**     | Mobile `/field`: type 2–3 letters → series → owned volumes with location, next volume highlighted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| B4  | **Field Mode 2 — quick add**            | Choose the bookfair once (remembered); tap + volume, optional price, saved immediately with undo; location defaults to Apartment. Minimal _new series_ (name + type, saved as draft to finish on desktop). **Also fix cross-device staleness** (audit #9 below): the phone and laptop must not add the same volume twice. **Phone shell** (added 2026-10-16): Field Mode gets its own phone layout — no sidebar or breadcrumb, a bottom tab bar **Find · Add · Hitlist** in thumb reach, full-screen, large tap targets; opening the app on a phone offers Field Mode. B4 and B5 are built inside it. |
| B5  | **Bookfair Hitlist (simple)**           | Watchlist series with the next unowned volume, grouped by publisher; tag filter; print-friendly + copy. Doubles as the offline fallback (screenshot/print). Copy needs a fallback: `navigator.clipboard` is HTTPS-only (audit #2).                                                                                                                                                                                                                                                                                                                                                                    |
| B6  | **Deploy + hardening**                  | **Open choice:** laptop + **Tailscale** (decided 2026-10-13) vs **Vercel Hobby + Neon Free** (recommended 2026-10-15: always on, nothing to keep awake; needs `adapter-vercel`, Neon pooled URL with `prepare: false`, data migration, own `pg_dump` backups). Either way: production `ORIGIN`, daily `pg_dump`, and the hardening list below.                                                                                                                                                                                                                                                        |
| B7  | **Trial run + fixes → tag `v0.3`**      | Use it at a bookstore before the fair; fix what hurts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

The **Activity Log** was dropped on 2026-10-13 (single user; low value). See `STATUS.md`.

### LAN / deploy audit (2026-10-15) — fold into B4–B6

Found while checking for other secure-context problems after the `crypto.randomUUID` LAN bug (fixed). Severities as agreed.

| #   | Finding                                                                                                                                                                                                               | Severity / slot                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2   | `navigator.clipboard` is HTTPS-only — the Hitlist's copy button needs a fallback.                                                                                                                                     | B5                                                                  |
| 3   | Service worker / PWA install need HTTPS.                                                                                                                                                                              | v0.5                                                                |
| 4   | **Login redirect loop:** `/login`'s `load` redirects to `/` whenever _any_ session cookie exists, unverified; `/` sends an invalid cookie back to `/login`. Will trigger once tokens expire or `AUTH_SECRET` changes. | 🔴 B6                                                               |
| 5   | Expired session mid-use: API calls get the login page's HTML, surfacing as a cryptic JSON-parse toast instead of "sign in again".                                                                                     | 🟠 B6                                                               |
| 6   | Production `ORIGIN` must match the address used (IP / Tailscale name / Vercel URL) or adapter-node rejects the login form.                                                                                            | 🟠 B6                                                               |
| 7   | Cookie `secure` follows `NODE_ENV`, not the request: plain-HTTP production silently fails login; HTTPS without `NODE_ENV` sends a non-secure cookie. Decide from the request protocol.                                | 🟠 B6                                                               |
| 8   | The Vite dev server blocks hostnames (`laptop.local`, Tailscale names) by default; IPs work.                                                                                                                          | 🟢 if needed                                                        |
| 9   | **Cross-device staleness:** 5-min `staleTime`, no refetch on focus — another device's changes stay invisible, and the Console/Field Mode duplicate check runs on stale data → duplicate volumes possible.             | 🟠 B4 (refetch-on-focus done in B3; save-time duplicate guard left) |
| 10  | **Open redirect:** login follows `redirectTo` unchecked (`?redirectTo=https://evil…`). Accept same-origin paths only.                                                                                                 | 🟠 B6                                                               |
| 11  | Missing `AUTH_PASSWORD` / `AUTH_SECRET` silently fall back to `librarian` / a known secret. Refuse to start instead.                                                                                                  | 🟠 B6                                                               |
| 12  | No login rate limiting; session tokens never expire.                                                                                                                                                                  | B6                                                                  |
| 13  | `manifest.json` isn't linked, its icons are missing from `static/`, and it sits behind auth.                                                                                                                          | v0.5                                                                |

## After the fair

### Consolidation leftovers

- **Types + validation via `drizzle-zod`** — deferred past the fair (no user-facing value, touches every route). Do it before the reading-queue table lands.
- Tier 2: Drizzle relational queries in `/api/books`; move `filterEngine.ts` to `lib/`; the 20 `state_referenced_locally` warnings (edit dialogs); rename `series.total_volumes` → `released_volumes` (it's "Released up to vol. N" since 2026-10-17 — owned counts stay derived); `npm audit` triage.
- Optional Console polish: series-grouping toggle. (Row selection from the preview shipped 2026-10-13.)
- **Spreadsheet-style inline editing of the Console preview** (cell edits become staged rows, committed together) — proposed 2026-10-13. Decide after the backfill shows how often per-book edits are needed; a lighter "click a price cell, save immediately" variant is an hour or two.

### v0.4 — Reading log flow + reading queue + insights polish

Insights items 4.2–4.7 moved to "Now" as I1–I6 on 2026-10-16.

| #   | Sub-feature           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **Reading queue**     | Separate `reading_queue` table (book, position, added at; a book at most once). Behaves as a **pool**: order is a preference, finishing _any_ queued book removes it, so skipping needs no rule. A Read book in the queue means a planned re-read. `/queue` page with location badges; drag to reorder.                                                                                                                                             |
| 4.2 | **Reading log flow**  | Log a read **after the fact**, whenever you remember, with the date you pick (rules in `STATUS.md` → Reading-flow Decisions 2026-10-16): one "I read this" action (finish _Today · Yesterday · Pick a day · Don't know_, optional start), a re-read logged in one step, reading dates as calendar days, a per-book **reading-history editor**, and in **Field Mode** volume-tile actions + a "Currently reading" strip with a one-tap **Finished**. |
| 4.8 | **Polish → tag v0.4** |                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## v0.5 — Phone app: Field Mode, full (PWA)

The phone is its own experience, not a squeezed desktop (decided 2026-10-16): the desktop pages (Console, tables, Insights) stay desktop tools that only need to not break on a phone; everything meant for the phone lives in the Field Mode shell that B4 introduces. v0.5 grows that shell into the full phone app: the reading-log tile actions and "Currently reading" strip (v0.4 item 4.2) if not already there, possibly a small Insights summary, and the design pass for the phone (via `.agent/skills/ui-ux-pro-max/`).

Builds on the B3/B4 MVP: 3-button landing ("I bought a book" / "New title" / "Add to Watchlist"), fuzzy search, +/- steppers, draft "Incomplete" badges, offline-tolerant mutations with a retry queue, installable PWA + service worker.

## Phase 6 — Social & Playful → v0.6

The Aesthetic Receipt (shareable haul image), shareable/printable Hitlist, collection-milestone toasts ("100th manga!").

## Phase 7 — Polish & Production → v0.7

Design-system pass (via `.agent/skills/ui-ux-pro-max/`), dark mode, micro-animations, loading/skeleton/error states, accessibility audit, performance (lazy loading, virtual scrolling), Zod validation client + server (builds on the `drizzle-zod` work), Lighthouse PWA audit, production Docker hardening.

## Parked — low priority, may never happen

- **Receipt photo → drafts.** Photo of a receipt → a vision-capable LLM extracts items, prices, store and date → items land as _staged_ entries in the Console's existing review screen. Runs as a SvelteKit endpoint (no separate Python service). Costs per receipt and needs an API key. Earliest sensible slot: after v0.5.

## Not adopted (decided 2026-10-13)

From the old feature brainstorm (`temp/additional-context.md`): ISBN barcode scanning, the "Bring" list, a volume-level Wishlist, the new-volume watcher, price watch, a Python/FastAPI processing service, a Streamlit dashboard (or prototyping in Streamlit), and series detection from title patterns. Gap detection and a store-name field were considered but not added to the roadmap. The **Activity Log** was dropped from Phase 3.

## Dependencies

Insights and the Bookfair release add no tables, so they do not wait for `drizzle-zod`; the reading-queue table (4.1) does. v0.5 builds on the B3/B4 Field Mode MVP. Phase 6 depends on 3 + 4; Phase 7 depends on 5 + 6.

## Open-item recommendations (decide closer to implementation)

- **Charts (Insights):** see the Charts note under "Now" → Insights.
- **Aesthetic Receipt (Phase 6):** start client-side (`html2canvas` → PNG); upgrade to server-rendered (Satori + Sharp) only if shareable URLs are wanted.
- **Auth (only if multi-user is ever needed):** the hooks-based middleware pattern stays; swap the single password gate for a real user/session store. Not needed for single-user.

## Verification per phase

| Phase         | Verification                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consolidation | Types derive from schema; build + tests + `svelte-check` green                                                                                                                                 |
| v0.3          | Insight calculations unit-tested, charts render real data; phone reaches the deployed app; own-check + quick add work in a bookstore trial; reading status + prices backfilled; Hitlist prints |
| v0.4          | A read (and a re-read) can be logged days later with a picked date, from the phone; history dates editable; queue reorders and persists                                                        |
| v0.5          | PWA installs on mobile; offline mutations queue and retry; forms are fast                                                                                                                      |
| v0.6          | Receipt image generates and downloads; milestones trigger                                                                                                                                      |
| v0.7          | Lighthouse PWA ≥ 90; accessibility audit passes; production Docker works                                                                                                                       |
