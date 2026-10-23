# Librarian — Roadmap

> **Forward-looking plan only.** For **current state** (version, what's built, decisions, next step) see [`STATUS.md`](./STATUS.md) — it owns "where we are." This file owns "where we're going." Product vision lives in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md).
>
> This roadmap intentionally has **no completion checkboxes** — completion is tracked only in `STATUS.md` so the two can never disagree.

## Versioning

`v0.0` = init; each phase completion bumps `v0.x`. A Git tag is created per milestone.

| Version  | Milestone                                          |
| -------- | -------------------------------------------------- |
| v0.0     | Scaffolding                                        |
| v0.1     | Database & CSV fallback                            |
| v0.2     | Desktop core (tables, CRUD, data entry)            |
| v0.2.x   | Unified search & filter                            |
| v0.3.x   | Consolidation / debt paydown (mostly done)         |
| v0.3     | Insights + Bookfair release (B7 passed 2026-10-18) |
| **v0.4** | **Reading queue + polish — current focus**         |
| v0.5     | Phone app: Field Mode full (PWA, offline)          |
| v0.6     | Social & playful features                          |
| v0.7     | Polish, decorative design, production hardening    |

## Delivered

Phases 0–2, unified search/filter (2C), and most of Phase 3 (bookfairs CRUD + detail, source/event linking, Console _Add Books_ + _Bulk Edit_) are shipped, along with most of the Consolidation milestone. `STATUS.md` has the authoritative breakdown and the decisions log.

## Done — Insights, then the Bookfair release (→ v0.3), deadline 2026-10-20

Deployed 2026-10-17, B7 trial run passed 2026-10-18 (see `STATUS.md`). Kept below for the record of what the release contained.

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
| 13  | ✅ 2026-10-17 — `manifest.json` isn't linked, its icons are missing from `static/`, and it sits behind auth. (Install works; no service worker yet — that stays v0.5.)                                                | v0.5                                                                |

## After the fair

### Consolidation leftovers

- **Types + validation via `drizzle-zod`** — deferred past the fair (no user-facing value, touches every route). Do it before the reading-queue table lands.
- Tier 2: Drizzle relational queries in `/api/books`; move `filterEngine.ts` to `lib/`; the 20 `state_referenced_locally` warnings (edit dialogs); rename `series.total_volumes` → `released_volumes` (it's "Released up to vol. N" since 2026-10-17 — owned counts stay derived); `npm audit` triage.
- Optional Console polish: series-grouping toggle. (Row selection from the preview shipped 2026-10-13.)
- **Spreadsheet-style inline editing of the Console preview** (cell edits become staged rows, committed together) — proposed 2026-10-13. Decide after the backfill shows how often per-book edits are needed; a lighter "click a price cell, save immediately" variant is an hour or two.

### v0.4 — Reading queue + polish

Insights items 4.2–4.7 moved to "Now" as I1–I6 on 2026-10-16. The **reading log flow (4.2) shipped early, 2026-10-17** (see `STATUS.md`). Order decided 2026-10-18: **request validation with `drizzle-zod` first** (the gate for the queue table; queue + reading routes first), then the queue — **built before the B7 trial run (Oct 18–20) so B7 tests both together** — then polish after the fair; the step-by-step plan is in `STATUS.md` → "v0.4 handoff".

| #    | Sub-feature                                                        | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | **Reading queue**                                                  | Separate `reading_queue` table (book, position, added at; a book at most once). Behaves as a **pool**: order is a preference, finishing _any_ queued book removes it, so skipping needs no rule. A Read book in the queue means a planned re-read. `/queue` page with location badges; drag to reorder.                                                                                                                                             |
| 4.2  | **Reading log flow** ✅ shipped early (2026-10-17)                 | Log a read **after the fact**, whenever you remember, with the date you pick (rules in `STATUS.md` → Reading-flow Decisions 2026-10-16): one "I read this" action (finish _Today · Yesterday · Pick a day · Don't know_, optional start), a re-read logged in one step, reading dates as calendar days, a per-book **reading-history editor**, and in **Field Mode** volume-tile actions + a "Currently reading" strip with a one-tap **Finished**. |
| 4.9  | **Extras in Field Mode + extra titles** (fair feedback 2026-10-23) | Before the second fair visit (≈ Oct 30). A **+ Extra** tile in Find and the Hitlist's Bought sheet (after vol. N, sort position computed) and an optional **`books.title`** (migration `0004`; general column, UI for extras only): an extra reads "Extra · รวมตอนสั้น". Design in `STATUS.md` → "Fair round 2 plan".                                                                                                                               |
| 4.10 | **Queue round** (fair feedback 2026-10-23)                         | Add to queue: chips **Just bought** (grouped by fair / day) · **Continue** · **Unread** · **Everything**; tap a volume → **Queue vol. N · Queue vol. N–M · Read from the start** (any series); consecutive same-series entries shown and moved as one **run**. Mock-ups first.                                                                                                                                                                      |
| 4.8  | **Polish → tag v0.4**                                              |                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

## v0.5 — Phone app: Field Mode, full (PWA)

**Not a separate native app:** the phone app is this same SvelteKit web app, installed from Chrome (PWA) — one codebase, one deploy; Install already works since 2026-10-17. v0.5 is about what it does on the phone (offline, the phone screens), not a new build target.

The phone is its own experience, not a squeezed desktop (decided 2026-10-16): the desktop pages (Console, tables, Insights) stay desktop tools that only need to not break on a phone; everything meant for the phone lives in the Field Mode shell that B4 introduces. v0.5 grows that shell into the full phone app: the reading-log tile actions and "Currently reading" strip (v0.4 item 4.2) if not already there, possibly a small Insights summary, and the design pass for the phone (via `.agent/skills/ui-ux-pro-max/`).

Builds on the B3/B4 MVP: 3-button landing ("I bought a book" / "New title" / "Add to Watchlist"), fuzzy search, +/- steppers, draft "Incomplete" badges, offline-tolerant mutations with a retry queue, a service worker for offline use (the install part is done).

## Phase 6 — Social & Playful → v0.6

Original scope: the Aesthetic Receipt (shareable haul image), shareable/printable Hitlist, collection-milestone toasts ("100th manga!"). The **shareable Hitlist is already delivered** (Copy + Save image, 2026-10-17).

**Where it lives (2026-10-18):** a **Fun** page (`/fun`, below Insights) holds the fun features — "analytics with a gimmick" — with shortcuts where they help (Queue tab pile card, bookfair page). Desktop first; a phone / story version only when wanted or when the feature is made for stories (the pile height). Built so far: pile-height stories, **pile pace** ("how long to clear the pile?").

**Social here means sharing outward** — images and, at most, a read-only link. The app stays single-user: no accounts, followers or feeds.

### Proposals (2026-10-18) — pick before building, nothing decided

Each one fits the existing pieces: the canvas PNG renderer behind the Hitlist's Save image (`$lib/field/hitlistImage`, Thai OK, no dependency), the pure `$lib/insights` calculations, the reading days (real since 2026-10-17) and the queue. Effort: **S** ≈ one session, **M** ≈ two or three.

**Core (recommended):**

| #   | Feature                                                                                                                                      | What it is                                                                                                                                                                                                                                                                                                                                                                                                      | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 6.1 | **Haul receipt**                                                                                                                             | A thermal-receipt-style PNG of one fair or one day: the fair's name and date at the top, one line per series ("Silent Witch vol. 8–9 … ฿350"), item count, total (with the "n of m priced" rule), and a playful footer — "pile +12 · est. 9 weeks to read". From the fair page and from Field Mode ("Today's haul"). The Oct 2026 fair's data will already be there, so its receipt can be made any time after. | S      |
| 6.2 | **Milestones**                                                                                                                               | Toasts when a write crosses a line: 100th / 400th / 500th book, 100th manga or LN, first book from a new publisher, a **series complete** (own every volume up to "Released up to vol. N"), a series **finished** (read all you own), 50th read. Pure `milestonesCrossed(before, after)` on the counts the client already holds; a **Milestones** shelf on Insights lists the ones reached, with the day.       | S–M    |
| 6.3 | **Year in review ("Wrapped")** — **built before year-end 2026** (decided 2026-10-18; ready by mid-December so the 2026 review can be posted) | A swipeable set of story cards on the phone each December (and on demand): books bought / read, busiest month, the biggest fair haul, top publisher and tag, the series you read most, the longest unread book, money (respecting **Hide ฿**). Each card saves as an image. Reading cards say "since Oct 2026" until a full year of dated reads exists.                                                         | M      |
| 6.4 | **Read-only share link**                                                                                                                     | A signed link (`/share/<token>`) to a **read-only** page — your Hitlist ("what I'm still missing", for a friend at the fair or a gift) or the owned-volumes list of chosen series (so nobody buys you a duplicate). Revocable, expiry like the session token, no prices or locations unless switched on. The only proposal that touches auth (`PUBLIC_PATHS`), so it gets the most care.                        | M      |

**6.3 add-on — Claude's notes (your call 2026-10-18; part of 6.3, to be built — not the Ideas shelf).** One or two playful Wrapped cards written by **Claude in a session**, not by an AI API inside the app: a reader type ("The Bookfair Dragon: hoards at fairs, reads 72%") and a few lines about the year. It happens once a year (maybe once per fair), so a live API isn't worth the key, the cost and a feature that can fail on the day. Flow: Wrapped gets an **Export stats** button (JSON of exactly the numbers its cards show; no money when **Hide ฿** is on) → you paste it into a session → Claude writes the notes → they're saved with the year and the export's date. No session needs production access, the notes quote only numbers from the export (so text and cards always agree), and you read them before they go live. The same flow can make a **per-fair** card (Fair vs fair, or the 6.1 receipt footer line) if one is picked. Open question for the 6.3 session: where notes live — a file in the repo (no migration, live on the next push to `main`; leaning this way) or a small table filled through a paste box (no deploy, handy mid-season).

**Playful extras (pick any, each S):**

- **Pile height** — **pulled forward 2026-10-18 for the Oct 2026 fair** (your idea): 1–2 Instagram-story images (1080×1920) — ① how tall the unread pile is now, ② how much a bookfair added to it. Design round first (mock-ups), then build; it also becomes the first story card style that 6.3 reuses. **Live since 2026-10-23.**
- **Fair stories (planning session before the second Oct 2026 fair visit, decided 2026-10-23):** better-looking fair Instagram stories than "poster + haul on a table" — photo ideas to take at the fair, challenges (a **color hunt**: covers matching a color picked beforehand; the **stamp rally** / hall-sweep route ending at the manga / LN section), and **story templates** that lay out your own photos with the fair's name, date and haul numbers on the pile stories' canvas. Planning first; what's picked is built after.
- **"What should I read next?"** — a spin from the unread pile **at this device's location** (Apartment / Home), weighted toward series in progress; the pick drops into the queue with one tap. A taste-based version (ranked by similarity, with an AI-written reason) is on the **Ideas shelf** below — not part of this item.
- **On this day** — on the dashboard: "a year ago you bought X at <fair>", "you finished Y two years ago".
- **Fair vs fair** — after a fair, a card comparing it with the previous edition (มหกรรมหนังสือระดับชาติ 30 → 31): books, spend, series started, how much of last year's haul is read.
- **Small celebrations** — a burst of gold diamonds (the app's tile motif) on a series complete or the last owned volume finished; off with "reduce motion", light on the Samsung A13.
- **Monthly reading goal** — "read 6 this month" with a ring on the Queue tab and a streak of months met. Only once dated reads have built up (after a few months).

**Order (2026-10-18):** **pile-height stories first** (around the fair) → 6.1 → 6.2 → **6.3 before year-end** → 6.4 only if sharing turns out to be wanted. Each new screen gets a mock-up round before code, as usual. Open questions for that session: which milestones count; whether milestones need a table (to record the day reached) or can be derived each time; receipt style (plain monochrome thermal vs the gold / blue app style); what a share link may show.

## Phase 7 — Polish & Production → v0.7

Design-system pass (via `.agent/skills/ui-ux-pro-max/`), dark mode, micro-animations, loading/skeleton/error states, accessibility audit, performance (lazy loading, virtual scrolling), Zod validation client + server (builds on the `drizzle-zod` work), Lighthouse PWA audit, production Docker hardening.

## Parked — low priority, may never happen

- **Receipt photo → drafts.** Photo of a receipt → a vision-capable LLM extracts items, prices, store and date → items land as _staged_ entries in the Console's existing review screen. Runs as a SvelteKit endpoint (no separate Python service). Costs per receipt and needs an API key. Earliest sensible slot: after v0.5.

## Ideas shelf — lowest priority, not confirmed

> **💡 Idea only — not confirmed to build.** Interesting ideas kept so they aren't lost; they rank **below everything above, Parked included**. Nothing here is scheduled. An idea moves into a phase only when you pick it, and then gets a mock-up round like any new screen.

From the Applied AI brainstorm (2026-10-18). A course project would be built in the course folder (Streamlit + Python, which this app doesn't adopt — see "Not adopted"); the app would get a slim version afterwards.

| Idea                                      | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Waiting on                                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AniList lookup** (enables the next two) | An English / romanized name per series (e.g. "Sousou no Frieren" for "Frieren"; Thai titles won't match) used as the key to look the series up once on [AniList](https://anilist.co)'s free public API: its **genres, fine-grained tags (hundreds, ranked), synopsis and cover image**. You confirm each match (the series type picks the light novel or manga entry, since a title often has both); the result is stored on the series (AniList id + the fields), so nothing is fetched at runtime. | A name field and a place to store the lookup (a migration). Check AniList's terms and rate limit before a bulk run.                                                                  |
| **Taste Map**                             | Every series as a dot on a 2D map, close dots = similar series; clusters show your reading "eras" (isekai phase, slow-life phase). First version from the tags alone (each series a yes/no vector over the 22 tags, squashed to 2D with PCA). With **AniList tags** the map gets much finer (e.g. overpowered-hero isekai apart from slow-life isekai); a further step embeds the AniList synopsis. A Fun card, and a story image through the canvas renderer behind Save image.                     | Nothing for the tags version. The finer versions need the AniList lookup.                                                                                                            |
| **Your shelf in X colors**                | The collection as a palette: the main colors of each cover (k-means on the image's pixels), rolled up into "your shelf in 5 colors", per year or per fair. Covers from the **AniList lookup**, so no photos to take; your own photo only where the Thai edition or a special cover differs. Only the color codes are stored (a few bytes a series), never the images, so there's no storage problem.                                                                                                 | The AniList lookup (or your photos).                                                                                                                                                 |
| **Smarter "What should I read next?"**    | The Phase 6 spin, ranked by taste: a taste vector from the series you've read most of, the unread pile sorted by how close each book is to it, and an optional one-line reason ("same tags as two series you finished"). The reason could be written by an AI model through an API (SvelteKit endpoint), which sees **only** the ranked candidates and only writes the words — it never picks titles itself.                                                                                         | The plain Phase 6 spin first. For the AI reason: an API key and a cost decision.                                                                                                     |
| **Pile-risk meter**                       | At quick-add, a tongue-in-cheek "chance this is still unread a year from now", from a classifier trained on your read / unread books (series progress, type, how long similar buys sat on the pile).                                                                                                                                                                                                                                                                                                 | **More dated reads** — only 7 reads had a finish date on 2026-10-18. Watch for class imbalance and for features that give the answer away (e.g. "share of the series already read"). |

## Not adopted (decided 2026-10-13)

From the old feature brainstorm (`temp/additional-context.md`): ISBN barcode scanning, the "Bring" list, a volume-level Wishlist, the new-volume watcher, price watch, a Python/FastAPI processing service, a Streamlit dashboard (or prototyping in Streamlit), and series detection from title patterns. Gap detection and a store-name field were considered but not added to the roadmap. The **Activity Log** was dropped from Phase 3.

## Dependencies

Insights and the Bookfair release add no tables, so they do not wait for `drizzle-zod`; the reading-queue table (4.1) does. v0.5 builds on the B3/B4 Field Mode MVP. Phase 6 depends on 3 + 4; Phase 7 depends on 5 + 6.

## Open-item recommendations (decide closer to implementation)

- **Charts (Insights):** see the Charts note under "Now" → Insights.
- **Aesthetic Receipt (Phase 6):** draw it on a canvas like the Hitlist's Save image (`$lib/field/hitlistImage` — no dependency, Thai OK, share sheet → Photos) instead of `html2canvas`; server-rendered (Satori + Sharp) only if the share link (6.4) needs preview images.
- **Auth (only if multi-user is ever needed):** the hooks-based middleware pattern stays; swap the single password gate for a real user/session store. Not needed for single-user.

## Verification per phase

| Phase         | Verification                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Consolidation | Types derive from schema; build + tests + `svelte-check` green                                                                                                                                 |
| v0.3          | Insight calculations unit-tested, charts render real data; phone reaches the deployed app; own-check + quick add work in a bookstore trial; reading status + prices backfilled; Hitlist prints |
| v0.4          | A read (and a re-read) can be logged days later with a picked date, from the phone; history dates editable; queue reorders and persists                                                        |
| v0.5          | PWA installs on mobile; offline mutations queue and retry; forms are fast                                                                                                                      |
| v0.6          | Receipt image generates and saves from the phone; milestones trigger once each (unit-tested crossings); the chosen extras pass a visual pass on the A13                                        |
| v0.7          | Lighthouse PWA ≥ 90; accessibility audit passes; production Docker works                                                                                                                       |
