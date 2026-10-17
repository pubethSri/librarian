# Librarian — Development Status

> **This file is the single source of truth for "where the project is now."**
> Roadmap / future scope lives in [`ROADMAP.md`](./ROADMAP.md); how to work in the repo lives in [`../CLAUDE.md`](../CLAUDE.md); product vision in [`context.md`](./context.md); design in [`design_direction.md`](./design_direction.md). Update _this_ file at every version bump.

## State as of 2026-10-16

- **Current version:** v0.3 — **in progress**, the **Bookfair release**: usable from a phone at the bookfair opening 2026-10-23 (attending 24–26). Deploy target **Oct 20**. **Plan changed 2026-10-16:** Insights (old v0.4 items 4.2–4.7) was pulled forward and is **built**, as is B3; B4–B7 remain — see the schedule below.
- **Machine:** moved from Arch Linux to **Windows 11** on 2026-10-13 (see Environment below).
- **Latest:** **B4 + B5 built** (2026-10-16): B4 (unattended run) = Field Mode's own phone shell (Find · Add · Hitlist tabs), the where-am-I-buying chip, the server duplicate guard, quick add with Undo, the Add tab for new series; **B5** = the Hitlist tab (watchlist next volumes by publisher, tag filter, copy with fallback, print). Claude's pre-checks on the scratch DB passed; **awaiting your visual pass of both, bundled** (script below — planned for Oct 17). Before that: Insights I1–I6 and B3 merged into `main` after your PC + phone passes.
- **Branches:** `main` = Insights + B3. **`feature/b4-quick-add`** = `main` + B4. **`feature/b5-hitlist`** = `feature/b4-quick-add` + B5 (stacked, so merging it brings both). **Not merged, not pushed.**
- **Next:** your **B4 + B5 visual pass** → merge `feature/b5-hitlist` into `main` → **B6 deploy + hardening** → B7 trial run → tag `v0.3`. v0.4 = Reading log flow (redesigned 2026-10-16) + Reading queue + insights polish.

### Next session — start here (B4 + B5 visual pass → B6 deploy)

**Schedule to the fair** (today is 2026-10-16; fair opens Oct 23, you attend 24–26):

| Day       | Work                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------- |
| Oct 16    | ~~B4 built~~ ✅ · ~~B5 built~~ ✅ (both a day or two early)                                                               |
| Oct 17    | **B4 + B5 visual pass → merge.** **Decide B6 hosting.** Create the Oct 2026 fair.                                         |
| Oct 18–20 | **B6** deploy + hardening (audit 🔴 #4, 🟠 #5–7, #10–11; daily `pg_dump`) → **deployed by Oct 20** — now with a spare day |
| Oct 21–22 | **B7** trial run at a bookstore, fix what hurts → tag `v0.3`                                                              |

B6 is still the one that can't slip (no deploy = no phone at the fair). With B4 + B5 done early, B6 can start as soon as hosting is decided.

1. **B4 + B5 visual pass** — run the "Field Mode (B4 + B5) visual-pass script" below. Pass → merge **`feature/b5-hitlist`** into `main` (it contains B4). Fixes go on that branch first.
2. **Create the real fair** (มหกรรมหนังสือระดับชาติ 31, 2026-10-23) on the Bookfairs page of the real app before the fair. The chip suggests it automatically **from Oct 23 through Nov 2**; before the 23rd it says Not at a fair (right for the Oct 21–22 bookstore trial).
3. **B6 deploy + hardening** — decide hosting first (item 4). Then the hardening list in `ROADMAP.md` (LAN / deploy audit #4–7, #10–12) and a daily `pg_dump`. Note for the deploy: Copy on the Hitlist works over plain HTTP through its fallback, but a real HTTPS origin (Tailscale `serve` or Vercel) gives the clean clipboard path and is needed later for the PWA (audit #3).
4. **Still open:** your visual pass of the **extra volumes** change (Silent Witch reads 1–4, Extra, 5–9, Extra; Latest Volume 9; Console suggests vol. 10). **B6 hosting** — laptop + Tailscale vs Vercel Hobby + Neon Free (`ROADMAP.md` B6 has both); **decide by Oct 18** so B6 can start on the 19th.
5. **Reading flow is being redesigned — but after the fair** (Reading-flow Decisions 2026-10-16; `ROADMAP.md` v0.4 item 4.2). Until then: missed backfill reads go through Console → Bulk Edit → Set reading status → Read (undated); per-book Mark read stamps _now_ (finish only). Field Mode has **no reading actions**: owned tiles are inert, kept free for the v0.4 tile actions.
6. **Found during B4 (not fixed — outside B4/B5):** the desktop **Books table prints regular volumes raw** ("10.0", `BooksTable.svelte:298`) since the extra-volumes change — a one-line `volumeLabel(row)` fix. The Books table also has no price / fair column; a phone-added book's price and fair show on the fair page (By series) and in Edit Book.
7. **Working agreement:** Claude runs build / check / lint / tests and browser pre-checks on the **scratch DB only** (`librarian_test`, test server on port 5174 — see Environment); you do the visual pass. Back up the real DB before risky work (`temp/backups/`). Field Mode writes data: test it on 5174 only.

### B4 checklist — phone shell + quick add (pre-approved for an unattended run)

**Run rules.** **Ask first, then build.** Before B4.0, read this whole checklist (and the code it touches) and collect **every** question that needs the user's decision before building — anything unclear, missing or in conflict, including the pre-made decisions below if one looks wrong. Ask them **all at once, in a single batch** (one AskUserQuestion call, up to 4 questions; a second batch only if there are more), record the answers here under "Pre-made decisions", then build. If there is nothing to ask, say so and start. The user approved this plan on 2026-10-16 and may be away once the build starts: from then on work through B4.0 → B4.6 in order **without waiting for approval**, one commit per sub-step on branch `feature/b4-quick-add` (**never merge, never push**). After each sub-step: `npm test`, `npm run check` (0 errors), `npm run lint`, `npm run build` must pass before committing. Write data **only to the scratch DB** (`librarian_test`, dev server config `dev-test-db` on port 5174); the real DB (`local`) is only ever backed up. If the browser pane shows the login page, skip browser checks (Claude never types the password), note it in STATUS and keep going with tests + API checks. A blocker or a new question found **while building** is not asked: record it (and the choice you made, if any) under that sub-step in STATUS and move on to the next one that doesn't depend on it. Before ending, update this checklist's boxes, the progress table and the changelog, and leave a visual-pass script for the user. Conventions: `CLAUDE.md` (runes, `newId()`, `resolve()`, `dayOf`/`formatDay`, invalidate query keys on mutations).

- [x] **B4.0 Setup.** Branch `feature/b4-quick-add` from `main`. Back up `local` to `temp/backups/local-before-b4-<stamp>.dump`. Re-clone `librarian_test` from `local`. If the Oct 2026 fair doesn't exist there, create a stand-in **on the scratch DB only**: "มหกรรมหนังสือระดับชาติ 31", 2026-10-23 (location left empty). Start `dev-test-db`.
  - _Done 2026-10-16:_ backup `temp/backups/local-before-b4-20261016-2311.dump`; scratch re-cloned (385 books). Scratch fairs added: **#12 มหกรรมหนังสือระดับชาติ 31 (2026-10-23)** and **#13 "B4 test fair (scratch only)" dated 2026-10-16** — with the fair-day → +10 window the Oct 23 fair can't be suggested before Oct 23, so #13 is what the browser check sees suggested today.
- [x] **B4.1 Phone shell.** Move Field Mode out of the sidebar shell: a `src/routes/(field)/field/` route group with its own `+layout.svelte` (auth still via `hooks.server.ts`; it still needs the root `QueryClientProvider`, which lives in `src/routes/+layout.svelte`, so nothing to add). Full-screen, no sidebar / breadcrumb; a fixed **bottom tab bar** with three tabs: **Find** (`/field` — today's B3 screen, unchanged behaviour incl. `?series=`), **Add** (`/field/add`), **Hitlist** (`/field/hitlist`, placeholder "Coming in B5"). Tabs ≥ 56px tall, icons + labels, active tab marked, `padding-bottom: env(safe-area-inset-bottom)` (add `viewport-fit=cover` to the viewport meta in `src/app.html`). A small **Desktop** link (top corner) back to `/`. On the desktop shell, a phone-width visitor (`matchMedia('(max-width: 640px)')`) sees a dismissible banner "Open Field Mode" on `/` (no auto-redirect). The sidebar's Field Mode link stays. Design with `.agent/skills/ui-ux-pro-max/` (monochrome zinc, big type, thumb reach). **Done when:** at 375×812, `/field` shows no sidebar or breadcrumb, the three tabs switch routes, B3 search / series view / back button still work, nothing scrolls sideways.
  - _Done:_ route group `src/routes/(field)/field/` (layout + `add/` + `hitlist/`); header = fair chip + Desktop link; tabs 64 px with an active bar and `aria-current`; content padded for the bar + safe area. The banner on `/` is remembered via `librarian.field.bannerDismissed`. Pre-check at 375×812: no sidebar, tabs switch, search → series → back works, no sideways scroll.
- [x] **B4.2 Current fair + defaults (per device).** A "where am I buying" chip at the top of the shell, shared by Find and Add: **a bookfair** (picker, newest first) or **Not at a fair** (source = Bookstore). Default: a fair whose date is within ±3 days of today, else Not at a fair. Remember the choice, the **location** (Apartment default / Home) in `localStorage` (keys `librarian.field.*`, every read/write in try/catch — private mode must still work). Purchase date = the fair's date (fair) or today (not at a fair), via the existing UTC-midnight convention. Pure helpers in `src/lib/field/logic.ts` (`suggestFair(fairs, today)`), unit-tested. **Done when:** the chip survives a reload and the suggestion picks the stand-in fair on the scratch DB.
  - _Done, with the answers above:_ window = fair day → +10, choice remembered for the day, purchases dated today. `suggestFair` / `currentFairId` / `purchaseFields` in `$lib/field/logic`; state in `$lib/field/settings.svelte.ts` (context, shared by the tabs; re-reads "today" when the tab becomes visible again). The chip opens a bottom sheet (Not at a fair + fairs newest first). Pre-check: suggests scratch fair #13 (dated today); a pick survives a reload.
  - _Found while building:_ until the stored choice and the fair list load, the chip briefly showed "Not at a fair" — a tap then could have saved a Bookstore book. Added `settings.ready`: the chip shows "…" and nothing can be saved until both are in.
- [x] **B4.3 Duplicate guard (server).** `POST /api/books` accepts an opt-in `onlyIfMissing: true`: if the series already has a book with the same `volumeNumber` and `isExtra`, return **409** with the existing book (no insert). Opt-in so the desktop Add Volume dialog (which may add a real second copy) is unchanged. The matching rule is a pure, unit-tested function. **Done when:** two quick adds of the same volume (two tabs) produce one book and one "already added on another device" message.
  - _Done:_ `findSameVolume` in `$lib/utils/volume` (tested); check + insert run in one transaction under `pg_advisory_xact_lock(4201, seriesId)`, so two simultaneous requests can't both pass. Pre-check: two parallel POSTs → one 201 + one 409 (with the existing book); without the flag a second copy is still allowed; an extra never collides with a regular volume. Also: POST now stores price 0 as 0 (it nulled it, like the batch bug of 2026-10-15).
- [x] **B4.4 Quick add on Find.** In a series' Field view: the **next** tile becomes **+ Vol. N** and each **missing** tile becomes tappable to add that volume; **owned tiles stay inert** (reserved for the v0.4 reading actions). Above the grid, a compact add bar: **price** (number, optional, **pre-filled with the price of this series' most recent priced book**, blank allowed) and the location toggle. Tap → saved immediately (`onlyIfMissing: true`, source/fair/date from B4.2, `isDraft: false`) → toast "Added Vol. N" with **Undo** (deletes the book via `DELETE /api/books/[id]`) — sonner action button, ~6 s. Invalidate `['books']`, `['series']`, `['bookfairs']`, `['insights']`. A 409 shows "Vol. N was just added on another device" and refetches. A true second copy is not offered here (desktop dialog). **Done when:** add → the tile turns owned with its location; Undo → it's missing/next again; the book shows the fair, date, price and location in the desktop Books table.
  - _Done:_ mutations in `$lib/queries/field.ts` (they wait for the refetch, so a tile turns owned without flickering); `lastPrice` / `parsePrice` in `$lib/field/logic` (tested). The next tile is two columns wide (**+ Vol. N**); missing tiles read "+ missing"; a series with no regular volume owned still gets **+ Vol. 1**. One add at a time. Toasts sit under the header (the bottom belongs to the tabs). Pre-check: add → tile owned with A/H; Undo → next again; 409 → "Vol. 11 was just added on another device" + refetch; missing tile + Home + typed ฿99 stored. The desktop **Books table** shows location, source Bookfair and the date but has **no price or fair column**, so price + fair were checked on the fair page (By series: ฿510, Home).
- [x] **B4.5 Add tab — new series.** One screen: type a name → existing matches (same `searchSeries`) shown first, tapping one opens it in Find; else **Create "<name>"** → type (LN / Manga, big toggle) → first volume number (default 1) → **Save**: creates the series (`shortName` = `fullName` = name; publisher empty) and the book **as a draft** (`isDraft: true`, same fair/location/price rules), then opens the new series in Find. Drafts are finished on desktop (the dashboard Drafts tile counts them). **Done when:** a new series + vol. 1 is created as a draft from the phone layout and appears on the desktop Series page.
  - _Done:_ the type has **no default** (Save reads "Pick a type" until chosen — a wrong type costs more than one tap); first volume −/+ (`parseVolume`, tested); optional price; location. An exact-name match gets an "already exists" hint. If the book insert fails, the just-created series is deleted again. Pre-check: "silent witch" lists Silent Witch first; "B4 Phone Test Series" → Manga → Save → series (short = full, no publisher) + vol. 1 draft (fair, today, ฿120, Apartment) → opens in Find; listed on the Series page; Drafts tile 1. Test series deleted afterwards.
- [x] **B4.6 Wrap-up.** Browser pre-check on 5174 at 375×812 of every "done when" above (incl. Undo and the 409 path). Update STATUS: tick these boxes, progress table (B4 → built, awaiting visual pass), changelog, a **Field Mode (B4) visual-pass script** for the user's phone (LAN: `npm run dev -- --host`, but test writes on 5174 / scratch, or accept that real adds are real), and the "Next session — start here" block pointing at B5 (Hitlist = the shell's third tab).
  - _Done:_ every "done when" pre-checked on 5174 (the pane was already signed in). Scratch is back to 385 books / 58 series (+ the two stand-in fairs); the real DB was never written (7 fairs, no new books).

**Pre-made decisions (from the 2026-10-16 session; change them before starting if you disagree):** Not-at-a-fair = Bookstore; price pre-fills from the series' most recent priced book; Undo window ≈ 6 s; new series are created with the first volume as a draft; owned tiles stay inert until v0.4; no auto-redirect from `/` on phones, only a banner.

**Answers before the build (2026-10-16, these override the checklist where they differ):**

- **Purchase date at a fair = the day of the tap** (today), not the fair's date — the fair runs for days (opens Oct 23, you buy 24–26); the book is still linked to the fair via source + event. (Edit Bookfair's "move linked books" only moves books dated exactly the fair day, so these won't move — fine, they carry their real day.)
- **Fair suggestion window = from the fair's day through +10 days** (never before it opens), replacing ±3 days — so the Oct 21–22 bookstore trial doesn't default to the fair.
- **A picked fair / Not at a fair is remembered for the rest of that day**; the next day the chip re-suggests from the dates. Location is remembered until changed.

### B5 — Hitlist (built 2026-10-16, in this session on the user's request)

- [x] **B5 Hitlist** in the shell's third tab (`src/routes/(field)/field/hitlist/+page.svelte`): every watchlist series with its **next volume** and gaps, **grouped by publisher** (A→Z, "Unknown publisher" last), names A→Z; **tag chips** in one horizontally scrolling row (AND, like the rest of the app; Clear); a row **opens the series in Find** for a one-tap quick add; **Copy** (plain text, publishers as headings) via `navigator.clipboard` → textarea + `execCommand` → a manual-copy panel (audit #2); **Print** hides the shell and prints a compact dated list (the offline fallback). Pure `buildHitlist` / `hitlistTags` / `hitlistText` in `$lib/field/logic` (tested); copy in `$lib/field/clipboard.ts`.
  - _Pre-check (scratch, 375×812):_ 14 watchlist series in 3 publisher groups (Animag 2 · Phoenix Next 11 · Siam Inter Comic 1), gaps shown (สัมพันธ์ลับสัปดาห์ละครั้ง: missing 4, 5); Romance → 9 of 14, Romance + Yuri → 5; chip row 40 px and scrolls, no page sideways scroll; a real tap on Copy copied ("Copied 14 series"); with the clipboard API removed and `execCommand` failing, the manual-copy panel showed the right text; Silent Witch row → `/field?series=18` with + Vol. 10. Print CSS is generated (`print:hidden` etc.); the print preview itself is for your pass.
  - _Decisions:_ a series' status is shown when not Ongoing (an Ended series still lists next = latest + 1 — there is no published count); the filter isn't remembered; the Hitlist reads the fresh queries, so it reflects adds from Find immediately.

### Visual-pass finding (2026-10-17) — phone froze after several adds + undos (fixed)

- **Seen by you at step 10:** on the phone (LAN, scratch server) the page froze after several quick adds and Undos; reload only worked again after ~1–2 min. Desktop on the same server kept working.
- **Cause (diagnosed, not reproduced on the phone itself):** every quick add / Undo refetched the books (~200 KB, uncompressed on the dev server), series and fairs lists — 4 requests per tap — and a superseded refetch wasn't aborted (no `signal`), so a burst of taps reached **6 requests in flight**, Chrome's per-host limit on plain HTTP. Over Wi-Fi those queued requests (and the reload behind them) stalled until they finished or timed out. DB side was clean (no stuck transactions or advisory locks).
- **Fix:** quick add / Undo now **patch the cached lists** from the server's reply (`toBookListItem` / `withBook` / `withoutBook` / `withBookCount` in `$lib/field/logic`, tested) — **1 request per tap**; fair pages, insights and series details are only marked stale. A 409 still refetches. The list fetchers take TanStack's abort `signal`. Field's fresh queries now trust data for **15 s** (`FRESH_MS`) instead of 0, so switching tabs doesn't re-download every list (focus after 15 s still refetches; the server guard still blocks duplicates). Re-check: 5 adds + 5 Undos = 10 small requests, max 1 in flight (was 20 / 6).
- **Re-test:** repeat step 5 on the phone with a burst of quick adds and Undos (e.g. 5 adds, then Undo each toast).

### Field Mode (B4 + B5) visual-pass script

Planned for Oct 17 — one run covers both. Where:

- **Phone, scratch data (recommended):** run `node .claude/dev-test-db.mjs --host` in a terminal (the scratch server on port 5174, now also on the LAN), then open `http://<laptop-IP>:5174/field` on the phone and sign in. Test adds stay out of the real collection.
- **Or** the Claude browser pane / desktop Chrome device mode at 375×812 on `http://localhost:5174` (the `dev-test-db` launch config).
- Over `npm run dev -- --host` (port **5173**) you are on the **real DB**: every add is real (Undo removes it).

Scratch has a fair dated Oct 16, "B4 test fair (scratch only)" — still inside its +10-day window on the 17th, so the chip suggests it.

Where: the **scratch server** keeps test adds out of real data — start `dev-test-db` (port 5174) and use the Claude browser pane or desktop Chrome device mode at 375×812. On the real phone over LAN (`npm run dev -- --host`, port 5173) you are on the **real DB**: every add is real (Undo removes it). Scratch has a fair dated today, "B4 test fair (scratch only)", so the chip has something to suggest.

**B4 — shell, chip, quick add, Add tab**

1. **Banner** — `/` at phone width → "Open Field Mode" banner on the dashboard. ✕ hides it; it stays hidden after a reload. At desktop width: no banner. _Red flag:_ a redirect, or the banner back after reload.
2. **Shell** — tap the banner → `/field`: no sidebar / breadcrumb; top = fair chip + "Desktop"; bottom = Find · Add · Hitlist with Find marked. Tap each tab; Desktop → dashboard. Nothing scrolls sideways; the tab bar clears the phone's home indicator. _Red flag:_ the end of a long list hidden under the tab bar.
3. **Fair chip** — shows "B4 test fair (scratch only)" (suggested; a pick from today is forgotten tomorrow, by design). Tap → sheet: Not at a fair + fairs newest first (มหกรรม 31 on top). Pick **Not at a fair** → chip changes; reload → still Not at a fair. Pick the test fair again.
4. **Find still works** — type `sw` / `silent` → Silent Witch; open it; the phone's back button returns to the results with the query kept.
5. **Quick add** — in Silent Witch: price pre-filled (510), Apartment selected. Tap **+ Vol. 10** → spinner, then tile 10 shows **A**, the next tile becomes **+ Vol. 11**, toast "Added Vol. 10 · Silent Witch · Undo" under the header. Tap **Undo** within 6 s → "Removed Vol. 10", tile 10 gone, + Vol. 10 back. _Red flag:_ the tile flickers back to missing, the toast covers the chip, no Undo.
6. **Owned tiles are inert** — tapping vols. 1–9 does nothing.
7. **Missing tile** — a series with a gap (scratch: `/field?series=63`, missing 4 and 5). Switch to **Home**, type `฿99`, tap **4 / + missing** → tile 4 shows **H**. Type `abc` as the price → red hint, tiles disabled. Clear it → blank = no price, tiles enabled again.
8. **Two devices (409)** — open the same series in two tabs. Add + Vol. N in tab A; in tab B (no refresh) tap + Vol. N → "Vol. N was just added on another device" and tab B's grid updates. Only one book exists.
9. **Desktop check** — `/bookfairs/13` (the test fair) lists the added books with price and location; the Books table shows Source Bookfair and today's date. Remove the test books afterwards (Undo, or delete on desktop).
10. **Add tab** — type `silent witch` → Silent Witch under "Already in the collection" with the "already exists" hint; tap it → opens in Find. Back to Add, type a new name → **Create "…"** → Save says "Pick a type" (disabled) → **Manga**, vol. 1 (−/+ work), optional price → **Save** → toast "Created … · saved as a draft"; the new series opens in Find with vol. 1. Desktop: listed on the Series page; dashboard **Drafts** = 1. Delete the test series afterwards.
11. **Private window** (optional) — Field Mode works; choices just aren't remembered.

**B5 — Hitlist**

12. **List** — Hitlist tab: "14 watchlist series · next volume to buy"; groups **Animag · 2**, **Phoenix Next · 11**, **Siam Inter Comic · 1**, names A→Z; each row shows **VOL. N** big on the right, gaps underneath (สัมพันธ์ลับสัปดาห์ละครั้ง: "missing 4, 5"). The last row clears the tab bar. _Red flag:_ a non-watchlist series, a wrong next volume (compare 2–3 with Find).
13. **Tag filter** — the chip row scrolls sideways on its own (the page doesn't). Tap **Romance** → "9 of 14"; add **Yuri** → 5 (only series with both); **Clear** → 14.
14. **Row → Find** — tap Silent Witch → Find opens it with **+ Vol. 10**; add it (step 5), go back to Hitlist → Silent Witch now says **VOL. 11**. Undo / delete afterwards.
15. **Copy** — on the phone over `http://<IP>:5174` (not HTTPS) tap **Copy** → either "Copied 14 series" (paste into Notes/LINE to check: title line, publishers as headings, "- Name — vol. N (missing …)") or a panel "This browser won't copy here" with the text to select. Both are OK; nothing at all is the red flag.
16. **Print** — tap the printer (phone: Print / Save as PDF; desktop: Ctrl+P) → only the list: title with today's date, publisher headings, compact rows; **no** header chip, tab bar, chips or buttons. Save it as a PDF — that's the offline fallback for the fair.
17. **Empty states** (optional, desktop) — un-star every watchlist series on scratch → "The watchlist is empty" with the hint; re-star after.

### Bookfair release progress (v0.3)

| #     | Item                                                         | Status                               |
| ----- | ------------------------------------------------------------ | ------------------------------------ |
| B1    | Reading status per book (mark read, re-read)                 | ✅ Done (visual pass 2026-10-13)     |
| B2    | Bulk Set reading status + Set price                          | ✅ Done (checked 2026-10-13)         |
| B2+   | Backfill ergonomics (selection, autocomplete, series picker) | ✅ Done (checked 2026-10-13)         |
| B2+   | Backfill-session additions (2026-10-15, see Decisions below) | ✅ Done (Claude-checked, in use)     |
| B2+   | Real-data backfill (you)                                     | ✅ Done 2026-10-16                   |
| B2+   | Extra volumes (`is_extra`, Extra chip)                       | ✅ Done (awaiting your visual pass)  |
| I1–I6 | **Insights** (pulled forward from v0.4 on 2026-10-16)        | ✅ Done (PC visual pass 2026-10-16)  |
| B3    | Field Mode 1 — "Do I own this?"                              | ✅ Done (PC + phone pass 2026-10-16) |
| B4    | Field Mode 2 — phone shell + quick add                       | ✅ Built (awaiting visual pass)      |
| B5    | Bookfair Hitlist (simple)                                    | ✅ Built (awaiting visual pass)      |
| B6    | Deploy on the laptop (Tailscale)                             | ⬜                                   |
| B7    | Trial run + fixes → tag `v0.3`                               | ⬜                                   |

### Insights progress (I1–I6, merged 2026-10-16)

Timebox: through **Oct 17** (user's call 2026-10-16); whatever is done then ships and B3 starts. Cut order if short: I6 → I4 → I5.

| #   | Item                                                    | Status                                 |
| --- | ------------------------------------------------------- | -------------------------------------- |
| I1  | Foundation (`/api/insights`, `$lib/insights`, overview) | ✅ Done (Claude-checked on scratch DB) |
| I2  | Backlog (tsundoku)                                      | ✅ Done (Claude-checked on scratch DB) |
| I3  | Collection growth                                       | ✅ Done (Claude-checked on scratch DB) |
| I4  | Tags & completion                                       | ✅ Done (Claude-checked on scratch DB) |
| I5  | Spending                                                | ✅ Done (Claude-checked on scratch DB) |
| I6  | Reading pace & bookfair funnel                          | ✅ Done (Claude-checked on scratch DB) |

**Your visual pass — Insights.** Use `localhost:5174` (scratch DB) or your real dev server; Insights only reads, so either is safe. Numbers below are from the scratch DB (= your real data on 2026-10-16).

1. Sidebar → **Insights**. ✅ Overview tiles: Books 385 (incl. 5 extras), Series 57, Read 264 (69%), Reading 0, Unread pile 121, Spent ≥ ฿95,533 "from 369 of 385 books". Chart _Books by type and reading state_: Light Novel mostly grey, Manga mostly blue. ❌ Red flag: "Loading" skeleton that never ends, or a ฿0 where prices exist.
2. **Hide ฿** (top right) on → every baht amount on the page reads "฿ •••" (tiles, by-source table, fair table, spend chart axis and tooltip); chart bar shapes stay. Off → amounts back. Reload the page → it starts **shown** again.
3. **Backlog:** Buying 6.8 / month; Reading "—" ("0 dated reads so far"); Time to clear "—". The bought-vs-read chart's last 12 months match what you remember buying; note under it says reads need dating. _Waiting longest_ lists your five oldest unread purchases (links open the series). _Owned but never started_: 8 series, Strange Fake first; World Teacher carries a Dropped chip.
4. **Growth:** Since Dec 2020; busiest month Dec 2023 (98 books). Bars stacked violet (LN) / yellow (manga); _Books owned over time_ climbs to ~381; note says 4 books without a purchase date.
5. **Tags & completion:** tags sorted by books (Contemporary top, ~214 books, 145 read). Completion by tag / publisher: 100% bars, blue = Finished, green = In progress, grey = Not started, orange = Abandoned (series you dropped). Does each publisher's picture match your sense of it?
6. **Spending:** Sitting unread ≥ ฿39,634 (105 of 121 unread priced); Cost per book read ≥ ฿362; Average ฿371 per LN · ฿177 per manga. By source: Bookfair 190 / ฿42,069, Unknown 124 (108 priced), Online 68, Bookstore 3.
7. **Pace & fairs:** _Time from purchase to finish_ shows the dashed "needs 5+ dated reads" box. Funnel: 7 fairs oldest first, each label with its read %; the table's Bought column sums to 190 and links open each fair.
8. **Show data** under any chart opens a table of the same numbers. Hovering a bar shows a dark tooltip.
9. On **5174 (scratch DB)**, **mark one book Read** from a series page and come back to Insights → Read goes up by one and _Reading_ under Backlog says "1 dated read so far" (the page refetches on every visit).

**Your visual pass — Field Mode (B3).** Best on your phone: `npm run dev -- --host` on the laptop, then `http://<laptop-IP>:5173/field` (Field Mode only reads, so the real DB is safe). On desktop: sidebar → Tools → **Field Mode**.

1. `/field` opens with the cursor in a big "Do I own…?" box and your **Watchlist** below it, each with its next volume. ✅ Silent Witch says **next 10**.
2. Type `sw` → Silent Witch (initials). Type `ดาบ` → เกิดใหม่เป็นดาบ (any part of a Thai name). Type `zzz` → "Not in the collection". The ✕ clears the box.
3. Tap **Silent Witch** → big black **Next to buy · Vol. 10**, "own 1–9", tiles 1–9 each marked **A** (Apartment) with a ✓ on read ones, an outlined **10 next** tile, and **Extras**: "Extra (after vol. 4)", "Extra (after vol. 9)".
4. Open **สัมพันธ์ลับสัปดาห์ละครั้ง** → "latest vol. 7", a dashed **Missing: vol. 4, 5** line and dashed _missing_ tiles 4 and 5. **Arifureta** → tile 8 reads **A ×2** (two copies), next 15.
5. Phone **back** (or ← Search) → the results come back with your query still typed.
6. Add a book on the laptop (any series), then switch back to the phone's tab → Field Mode shows it within a second (refetch on focus). ❌ Red flag: the phone still shows the old next volume after switching back.
7. Nothing scrolls sideways at phone width; the tiles are readable at arm's length.

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
  - **Backfilled reads carry no dates** ("read, date unknown"); reads marked from now on get today's date (editable). Insights that need dates skip undated reads. _(Dates "editable" was never built; the v0.4 reading log flow replaces "stamp now" with a picked date — see Reading-flow Decisions 2026-10-16.)_
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
- **Editing a bookfair's date does not touch its books by itself.** Edit Bookfair offers "Also move N linked books dated <old> → <new>" only when the date changes and some linked books sit exactly on the old day; **on by default** (the user is correcting the fair's date). Books with any other purchase date never move. Done server-side in the same transaction (`PATCH /api/bookfairs/[id]` `moveBookDates`), matched on the UTC calendar day; the response's `movedBooks` drives the toast and a `['books']` refresh.
- **Extra volumes are a flag, not a decimal** (user's call: a `.5` number claimed a position the book doesn't really have). `books.is_extra` (migration `0001_extra_volumes`, which also flagged every existing fractional volume — 5 on the real DB). `volume_number` stays the **sort position**, so ordering is unchanged (4.5 still sits between 4 and 5); an extra is shown as an **Extra** chip (`ExtraBadge`, hover "Extra (after vol. 4)") instead of its number. Labels come from `$lib/utils/volume` (`volumeLabel` / `volumeText`); **extras don't count toward Latest Volume or the Console's next-volume suggestion** (`latestVolume`). Add Volume / Edit Book have an "Extra volume" switch; with it on, the number field reads "Sort position". The Airtable export still writes the raw number (re-import fidelity). Edit Book also stopped silently failing on any volume-number change (a number input binds a number; the old code called `.trim()` on it).

### Handoff Decisions (2026-10-16)

- **Insights pulled forward** (user's call): the next session builds the insights items (old v0.4 4.2–4.7, now **I1–I6** in `ROADMAP.md` → "Now") **before** Field Mode; B3–B7 follow in the time left, Oct 20 deploy target kept. The **Reading queue** (4.1) stays in v0.4 — Insights adds no tables, so it still doesn't wait for `drizzle-zod`.
- **Data at the end of the backfill** (real DB, 2026-10-16): 58 series (26 LN, 32 manga; 43 ongoing, 8 ended, 7 dropped; 5 on the watchlist), **385 books** (5 extras, 0 drafts), 7 bookfairs, 22 tags / 244 series-tag links, 356 reading rows.
  - **Prices:** 369 / 385 books priced. **Purchase dates:** 381 / 385, spanning 2020-12 → 2026-10. **Source:** bookfair 190, online 68, bookstore 3, unknown 124.
  - **Reading:** 269 Read rows, 87 Unread rows (Airtable import), 35 books with no row (= Unread). Current status = newest row (`src/lib/reading.ts`).
  - **Read dates are not real.** All 241 dated reads have `finished_at` on **2026-10-15** (188 imported rows marked read during the backfill, 53 rows created that day). The per-book status control stamps "now" by design (B1), so backfilling through it dated every read to the backfill day, against the rule "backfilled reads carry no dates". Decide before any date-based reading insight (recommended: clear those dates). Purchase dates and prices are real.
- **Extras in insights:** an extra is a real book — it counts in owned / bought / spent / read totals. It never counts as a "latest volume" or a next-volume gap (`latestVolume` in `$lib/utils/volume`).

### Insights Decisions (2026-10-16)

- **Backfill read dates cleared** (user's call). All 241 dated reading rows were stamped during the backfill session (2026-10-15 19:16 → 10-16 00:33 Bangkok); their `started_at` / `finished_at` were set to null in one transaction on `local`, after a backup (`temp/backups/local-before-insights-20261016-0053.dump`). There are now **0 dated reads**: every rate / pace figure shows an empty state until reads are marked through the per-book control (which dates them).
- **Architecture:** `GET /api/insights?tz=<IANA zone>` loads five flat tables (`$lib/server/insights.ts`) and returns `computeInsights()` from the pure, tested `$lib/insights/`. Query key `['insights']` with `staleTime: 0` (refetch every visit) instead of adding `['insights']` to every mutation's invalidation. Purchase days bucket by `dayOf` (UTC calendar day); dated reads by the viewer's time zone (the `tz` param; unknown → UTC).
- **Read state for insights:** a book is **Read** once read at least once (a re-read stays Read); otherwise its current status (Reading / Dropped / Unread). The **unread pile** = Unread books.
- **Backlog rates:** buying = dated purchases in the last 365 days ÷ 12; reading = dated Read rows (re-reads included) per month over the last 365 days or since the first dated read, and **unknown below 5 dated reads or a 30-day span** (never a guessed number). Time to clear = pile ÷ (read − buy rate); "Never" when buying keeps pace. "Never started" = series whose every owned book is still Unread (a dropped series is listed with a Dropped chip).
- **Series completion** (I4): **Abandoned** = series status Dropped (wins over everything); else **Finished** = every owned book read, **In progress** = any book read / reading / dropped, **Not started** = all unread. Shown as % of a tag's / publisher's series; a series counts under every tag it has; publishers with a single series (and unknown ones) fold into **Other**.
- **Spending** (I5): **cost per book read** = everything spent (priced books) ÷ books read at least once — a lower bound while some books are unpriced; **sitting unread** = priced Unread books, with coverage; a missing source counts as **Unknown**; averages use priced books only. With "Hide ฿" on, chart bars keep their shape but the money axis, tooltips and tables are masked.
- **Series status Dropped = "I dropped it"** (user's answer): counts as _abandoned_ in completion insights.
- **"Hide ฿" (the coward toggle), flipped by the user:** money is **shown** by default; the switch hides every baht figure on the page for that visit (not remembered).
- **Charts:** Chart.js 4 through `use:chart` (`$lib/actions/chart.ts`), configs from `$lib/components/insights/charts.ts` (thin bars, 2px stack gaps, hairline grid, legend only for ≥ 2 series, **never a second y-axis**). Colours checked with the dataviz palette validator: read states Read blue / Reading aqua / Dropped orange / Unread neutral grey (deliberately recessive), series types violet / yellow — no hue means two things. Every chart has a "Show data" table.

### Phone-shell Decisions (2026-10-16)

- **The phone gets its own design, not a responsive desktop** (user's call). The desktop pages (Console, tables, Insights) stay desktop tools that only need to not break on a phone; everything meant for the phone lives in the **Field Mode shell**.
- **Before the fair, folded into B4:** a minimal shell — own layout (no sidebar / breadcrumb), bottom tabs **Find · Add · Hitlist**, full-screen, thumb-reach controls; a phone opening `/` is offered Field Mode. B4 quick add and B5 Hitlist are built inside it rather than in the desktop shell, so nothing is built twice. Not a separate pre-fair item: it would push B6, and no deploy means no phone at the fair.
- **After the fair, v0.5 = the "Phone app" phase:** PWA install + offline, the reading-log tile actions / "Currently reading" strip (v0.4 item 4.2), maybe a small Insights summary, a full phone design pass.
- **Field Mode's real-phone pass passed** (2026-10-16), so the B4 shell starts from a B3 screen that works on the phone.

### Reading-flow Decisions (2026-10-16) — build after the fair (v0.4, item 4.2)

Why: reads don't happen at a screen. A book grabbed in a rush is started and finished away from the app, so "stamp _now_ at each click" both misses reads and mis-dates them, and a finished re-read can't be logged at all (Read → Read is a no-op). The new rule: **log it once, when you remember, with the date you choose.**

- **One "I read this" action** records a finished read-through at any time. It asks for the **finish day** — quick picks _Today · Yesterday · Pick a day · Don't know_ (Today preselected) — and an **optional start day** with the same picks.
  - On an **Unread / Reading / Dropped** book it completes the current row (status Read, the picked finish; a start already recorded is kept and offered as the default).
  - On a **Read** book it **inserts a new Read row** = a re-read logged in one step. No "Reading" step is required.
- **Starting stays optional.** _Reading_ can still be set when you think of it (start day picked, default Today); a re-read start (Read → Reading) still inserts a row. Skipping it costs nothing: read rate, time to clear and purchase → finish pace use the **finish day only**. A start→finish "days to read" figure, if ever added, uses only reads with both days.
- **Reading dates are calendar days**, stored like purchase dates: UTC midnight in the existing `timestamptz` columns (no column-type change), shown with `dayOf` / `formatDay`. Insights then bucket finish days with `dayOf` instead of the viewer's time zone (the `tz` parameter of `/api/insights` can go). The few reads dated with real instants before this ships are converted to their Bangkok calendar day.
- **Validation:** finish ≥ start; neither in the future. A finish before the purchase date is allowed (a re-bought copy) — the pace insight already skips it.
- **Reading-history editor** on the book (desktop: series page / Books table): every read-through with its status, start and finish; edit the days, delete a mistaken row. Times read and current status follow automatically (still derived).
- **Field Mode gets the fast path:** tap a volume tile → _Started today · Finished… · Re-read finished…_ (Finished opens the day picks); a **"Currently reading"** strip at the top of `/field` lists Reading books with one big **Finished** button each.
- **Unchanged:** bulk edits stay undated and never start a re-read; times read = count of Read rows; current status = newest row; the per-book status dropdown keeps working (its Mark read becomes "I read this" with Today preselected).
- **Timing:** user's call — documented now, **built after the fair** (v0.4 item 4.2). B4 leaves the plain volume tiles free for these actions.

### Field Mode Decisions (2026-10-16)

- **B3 built in the Insights session** (user's call), on `feature/field-mode` branched from `feature/insights` so the docs don't conflict.
- **Search** (`searchSeries` in `$lib/field/logic.ts`): short or full name, ranked name prefix → any word's prefix → initials ("mt" → Mushoku Tensei) → anywhere (spaces ignored); ties go to the series with more books. NFKC + lower-case, punctuation ignored; Thai matches by substring. An empty box shows the **watchlist**.
- **Volume grid** (`ownedVolumes`): regular volumes **1 … latest**, unowned ones shown as **missing** (display only — no gap tracking was added), copies (`×2`) and each copy's location (A / H), ✓ = read at least once; extras listed apart and never the latest; **next = latest + 1** even for an Ended series (its status is shown; there is no published-volume count).
- **The open series is in the URL** (`/field?series=<id>`), so the phone's back button returns to the results with the query kept.
- **`createSeriesListQuery` / `createBooksListQuery` take `{ fresh: true }`** (staleTime 0 + refetch on window focus). Only Field Mode uses it; the rest of the app keeps the 5-minute cache. First half of audit #9; the save-time duplicate guard is B4.
- Field Mode stays inside the app shell (sidebar sheet on phones); a separate full-screen shell belongs to v0.5 (PWA).

### B4 Decisions (2026-10-16)

- **Pre-build answers** (user): a purchase from the phone is dated **today**, even at a fair; a fair is suggested from its day through **+10 days**; a chip pick lasts **the rest of the day** (see the B4 checklist).
- **Phone shell = route group `(field)`** with its own layout (QueryClient still from the root). Supersedes the B3 note "Field Mode stays inside the app shell". The sidebar link stays; the dashboard offers Field Mode on phones (banner, no redirect).
- **Per-device memory** in `localStorage` under `librarian.field.*` (`purchase` = `{day, fairId}`, `location`, `bannerDismissed`), every access try/catch'd (`$lib/field/storage`). Nothing is saved until the choice and the fair list have loaded (`settings.ready`).
- **Duplicate guard** is opt-in (`onlyIfMissing`), keyed on series + volume number + extra flag, under a per-series advisory lock. Field Mode never offers a second copy (the desktop dialog does).
- **Quick add** is never a draft; the **Add tab's** first volume always is. Phone writes refresh `['books']`, `['series']`, `['bookfairs']`, `['insights']`.
- **A new series' type has no default** on the phone (explicit LN / Manga).

## Environment

- **Windows 11** since 2026-10-13 (was Arch Linux). Repo at `C:\librarian`; `core.autocrlf=input` + `.gitattributes` force LF. Shell: PowerShell, Git Bash also available.
- **Node v24.18 / npm 12** here; Linux had Node v26.11. Everything passes on 24 — install 26 only if the machines should match.
- **Database:** Docker container `librarian-db-1` (Postgres 16, volume `librarian_pgdata`, port 5432), restored from the Linux dump. Row counts matched at migration (bookfairs 1 · books 310 · reading 300 · series 46 · series_tags 188 · tags 20). Data entered on Linux after 2026-10-13 18:15 is not included; the Linux copy is the fallback.
- **LAN dev:** `npm run dev -- --host`, then `http://<laptop-IP>:5173` from another device (allow Node.js through Windows Firewall on private networks). Home network only.
- **Backups / scratch DB:** `temp/backups/*.dump` (untracked `temp/`). A scratch database `librarian_test` in the same container is used for browser testing; drop it any time (`DROP DATABASE librarian_test`). Re-clone from the real DB: `pg_dump -Fc` of `local` → `CREATE DATABASE librarian_test` → `pg_restore --no-owner`.
- **Scratch test server:** `.claude/launch.json` config `dev-test-db` runs `.claude/dev-test-db.mjs` — the Vite dev server on **port 5174** with `DATABASE_URL` swapped to `librarian_test` (reads `.env`, changes only the DB name). Both files are local (untracked). Extra arguments go to Vite: `node .claude/dev-test-db.mjs --host` also serves the scratch server to the LAN (`http://<laptop-IP>:5174`) for phone tests. Sign in once in the browser pane; the password is never entered by Claude.
- **npm install** blocks esbuild's install scripts; harmless, the build works.
- **`npm audit`:** 18 advisories (1 low, 11 moderate, 6 high), all dev tooling — not yet triaged (Tier 2 in `ROADMAP.md`).

## Key Files

| File                                                   | Purpose                                                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `ROADMAP.md`                                           | Forward roadmap (phases, versioning, open-item recommendations)                              |
| `context.md`                                           | Original project requirements                                                                |
| `design_direction.md`                                  | Visual identity, keyboard shortcuts, layout foundation                                       |
| `../CLAUDE.md`                                         | How to work in the repo (commands, architecture, conventions)                                |
| `src/hooks.server.ts`                                  | Auth middleware                                                                              |
| `src/lib/server/auth.ts`                               | Auth utilities (HMAC-SHA256)                                                                 |
| `src/lib/server/db/schema.ts`                          | Full Drizzle schema (6 tables, 5 enums)                                                      |
| `src/lib/server/db/index.ts`                           | Database connection                                                                          |
| `src/lib/utils.ts`                                     | `cn()` utility + shadcn-svelte type helpers                                                  |
| `src/lib/utils/booruParser.ts` (+ `.test.ts`)          | Booru-style search query parser + builder, with unit tests                                   |
| `src/lib/types.ts`                                     | Shared TypeScript types (API shapes, enums, mutation payloads)                               |
| `src/lib/queries/*.ts`                                 | TanStack Query hooks (series, books, bookfairs, reading, batch, bulk, tags)                  |
| `src/lib/components/filterEngine.ts` (+ `.test.ts`)    | Unified filter state types + `applyUnifiedFilter()`, with unit tests                         |
| `src/lib/console/{types,logic}.ts` (+ `logic.test.ts`) | Console types + pure logic (staging, bulk-edit matching, preview rows/filter), unit-tested   |
| `src/lib/console/{staging,bulkEdit}.svelte.ts`         | Console rune stores (factories returning getter-backed objects)                              |
| `src/lib/reading.ts` (+ `.test.ts`)                    | Reading rules: current status, times read, `planReadingChange`                               |
| `src/lib/insights/*.ts` (+ tests)                      | Pure insights: `computeInsights()` = overview, backlog, growth, tags, spending, pace/funnel  |
| `src/lib/server/insights.ts`                           | `loadInsightsInput()` — the rows `/api/insights` computes from                               |
| `src/lib/actions/chart.ts`                             | `use:chart` — Chart.js 4 Svelte action                                                       |
| `src/lib/components/insights/*`                        | Chart builders (`charts.ts`), `ChartCard` (chart + data table), `StatTile`, `InsightSection` |
| `src/lib/field/logic.ts` (+ `.test.ts`)                | Field Mode: search, owned volumes, fair suggestion + purchase fields, price / volume parsing |
| `src/lib/field/{settings.svelte,storage}.ts`           | Field Mode per-device settings (fair chip, location; via context) + safe `localStorage`      |
| `src/routes/(field)/field/*`                           | Field Mode phone shell (layout + bottom tabs) · Find · Add · Hitlist                         |
| `src/lib/components/field/*`                           | `FairPicker` (header chip + sheet), `LocationToggle`                                         |
| `src/lib/field/clipboard.ts`                           | `copyText()` — clipboard API, then textarea + `execCommand` (plain HTTP)                     |
| `src/lib/queries/field.ts`                             | Quick add (409 → `AlreadyAddedError`), undo, new series + first volume                       |
| `src/lib/server/reading.ts`                            | `applyReadingStatus(tx, bookIds, status, now)` — applies the rules for one or many books     |
| `src/lib/utils/{id,suggest,bookfairNames}.ts`          | `newId()` (LAN-safe ids); suggestion helpers; fair-name suggestions — all unit-tested        |
| `src/lib/components/forms/SuggestInput.svelte`         | Shared free-text combobox (`PublisherInput` wraps it; bookfair name/location use it)         |
| `src/lib/components/ReadingStatusControl.svelte`       | Status dropdown + one-tap Mark read / Re-read on book rows                                   |
| `src/lib/components/console/*.svelte`                  | Console panels: `ScopeBar`, `PreviewPanel`, `AddBooksPanel`, `BulkEditPanel`                 |
| `src/lib/components/BooruSearchBar.svelte`             | Search input with autocomplete                                                               |
| `src/lib/components/TagChipsBar.svelte`                | Toggleable tag filter badges                                                                 |
| `src/lib/components/{SeriesTable,BooksTable}.svelte`   | Entity tables with booru search/sort/pagination                                              |
| `src/routes/(app)/console/+page.svelte`                | Unified bulk entry + editing workbench (Console)                                             |
| `src/routes/layout.css`                                | Global CSS: Tailwind v4 theme tokens + bits-ui state-variant mapping (`@custom-variant`)     |
| `scripts/{seed,migrate-airtable}.ts`                   | Dev seed + Airtable CSV → PostgreSQL migration                                               |

## API Routes

| Route                                 | Methods            | Description                                                                                                          |
| ------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `/api/series`                         | GET, POST          | List/create series (search, filter, includes tags + book count)                                                      |
| `/api/series/[id]`                    | GET, PATCH, DELETE | Single series with nested books/tags                                                                                 |
| `/api/series/[id]/tags`               | PUT                | Replace tags for series                                                                                              |
| `/api/books`                          | GET, POST          | List/create books (filters; + seriesTags, readingStatus, timesRead); POST `onlyIfMissing` → 409 if the volume exists |
| `/api/books/[id]`                     | GET, PATCH, DELETE | Single book with reading history                                                                                     |
| `/api/books/batch`                    | POST               | Batch-create books (Console commit, New Series volumes)                                                              |
| `/api/books/bulk`                     | PATCH              | Bulk-update books: allowlisted fields incl. `price`, `boughtAt`; `readingStatus` via the reading rules (undated)     |
| `/api/books/[id]/reading/status`      | PUT                | Set a book's current reading status (mark read / re-read / correct), dated now                                       |
| `/api/books/[id]/reading`             | GET, POST          | Reading history + re-reads                                                                                           |
| `/api/books/[id]/reading/[readingId]` | PATCH              | Update reading entry                                                                                                 |
| `/api/bookfairs`                      | GET, POST          | List/create bookfairs                                                                                                |
| `/api/bookfairs/[id]`                 | GET, PATCH, DELETE | Bookfair detail / update / delete                                                                                    |
| `/api/tags`                           | GET, POST          | List/create tags (includes seriesCount)                                                                              |
| `/api/tags/[id]`                      | DELETE             | Delete tag                                                                                                           |
| `/api/export/airtable`                | GET                | CSV download (Airtable format)                                                                                       |
| `/api/insights`                       | GET                | Every Insights figure (`?tz=` = the viewer's time zone for dated reads)                                              |
| `/api/health`                         | GET                | Health check (public)                                                                                                |
| `/api/logout`                         | POST               | Clear session cookie                                                                                                 |

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
| 2026-10-15 | Edit Bookfair: changing the date can also move linked books still dated the old fair day ("Also move N linked books…", on by default; other dates untouched).                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-10-15 | **Extra volumes:** `books.is_extra` + migration `0001` (existing `.5` volumes flagged; order unchanged); Extra chip in place of the number across series page, books table, Console preview, home, bookfair page and haul chips; Extra switch in Add Volume / Edit Book; extras skipped by Latest Volume and next-volume suggestions. Edit Book volume-number save fixed. Add Volume / New Series default location → Apartment; Add Volume / Edit Book date follows the picked fair.                                                                                                             |
| 2026-10-17 | Visual-pass fix: phone froze after bursts of quick add / Undo (each tap refetched ~230 KB in 4 requests; un-aborted refetches hit Chrome's 6-connection limit). Now 1 request per tap (cache patched from the reply), abort signals on list fetches, Field lists fresh for 15 s. Tests 272 → 276.                                                                                                                                                                                                                                                                                                |
| 2026-10-16 | **B5 Hitlist built** (branch `feature/b5-hitlist`, stacked on B4): watchlist next volumes + gaps by publisher, AND tag filter, row → Find, Copy with HTTP fallback, print-only list. Visual-pass script bundled with B4's for Oct 17. `.claude/dev-test-db.mjs` passes extra args (`--host` → scratch server on the LAN for phone tests). Tests 266 → 272.                                                                                                                                                                                                                                       |
| 2026-10-16 | **B4 Field Mode 2 built** (branch `feature/b4-quick-add`, unattended run): phone shell `(field)` with Find · Add · Hitlist tabs + dashboard banner; where-am-I-buying chip (fair from its day → +10, remembered for the day, purchases dated today); `POST /api/books` `onlyIfMissing` → 409 under an advisory lock; quick add on next / missing tiles with price pre-fill, location toggle, 6 s Undo and the 409 message; Add tab creates a series + draft first volume. Tests 246 → 266. Awaiting visual pass.                                                                                 |
| 2026-10-16 | B3 **phone pass passed**. B4 run rules: ask every pre-build question in one batch first, then build unattended (questions found mid-build are noted, not asked).                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-10-16 | **Phone shell folded into B4** (docs): Field Mode gets its own phone layout with Find · Add · Hitlist tabs before the fair; v0.5 becomes the "Phone app" phase. `main` pushed.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-16 | **Insights + B3 merged into `main`** after the user's PC visual pass; Field Mode phone pass still open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-10-16 | **Reading flow redesigned (docs only, build in v0.4):** log a read once, when you remember, with a picked finish day (optional start); a re-read in one step; reading dates as calendar days; reading-history editor; Field Mode tile actions + "Currently reading" strip. `ROADMAP.md` v0.4 gains item 4.2.                                                                                                                                                                                                                                                                                     |
| 2026-10-16 | **B3 Field Mode 1 — "Do I own this?"** (branch `feature/field-mode`): `/field` search (prefix / word / initials / anywhere, Thai OK, watchlist when empty) → series view with Next to buy, volume tiles 1…latest (missing gaps, copies, A/H location, ✓ read), extras; `?series=` URL for the back button; fresh queries (refetch on focus); sidebar link. Pure `$lib/field/logic`. Tests 231 → 246.                                                                                                                                                                                             |
| 2026-10-16 | **Insights I6 — Pace & bookfair funnel:** purchase → finish median + banded histogram (dated reads only; empty state until 5+), per-fair haul by reading state with read % and spend. **Insights I1–I6 built** inside the timebox. Tests 226 → 231.                                                                                                                                                                                                                                                                                                                                              |
| 2026-10-16 | **Insights I5 — Spending:** spent, sitting unread, cost per book read, average price by type; spent per month; by-source table (books, spent, average). "Hide ฿" masks every amount (tiles, tables, chart axis and tooltips). Tests 221 → 226.                                                                                                                                                                                                                                                                                                                                                   |
| 2026-10-16 | **Insights I4 — Tags & completion:** books per tag split read / not yet; series completion (finished / in progress / not started / abandoned) by tag and by publisher as 100% bars. Tests 215 → 221.                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-16 | **Insights I3 — Collection growth:** books bought per month by type (stacked) and books owned over time (separate chart — never a second y-axis); since / busiest-month tiles; undated books footnoted. Tests 212 → 215.                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-10-16 | **Insights I2 — Backlog:** pile by type, buy rate, read rate (unknown until 5+ dated reads over a month), time to clear, bought vs read per month (last 12), the five unread books waiting longest, series owned but never started. Tests 198 → 212.                                                                                                                                                                                                                                                                                                                                             |
| 2026-10-16 | **Insights I1** (branch `feature/insights`): backfill read dates cleared (241 rows, backed up first); `GET /api/insights` over pure `$lib/insights` (common facts, money coverage, month/time-zone helpers); `use:chart` Chart.js action + chart builders; `/insights` overview tiles, books by type × read state, "Hide ฿". Tests 177 → 198.                                                                                                                                                                                                                                                    |
| 2026-10-16 | Backfill done; real DB backed up (`local-end-of-backfill-20261016-0038.dump`); `bookfair-release` merged into `main` and pushed. Plan change: Insights (I1–I6) pulled forward ahead of B3–B7. Found: all 241 read dates are 2026-10-15 backfill stamps (decide before date-based insights).                                                                                                                                                                                                                                                                                                      |
