# Visual pass — Field Mode B4 + B5 (phone shell, quick add, Add tab, Hitlist)

- **Status:** ✅ Passed 2026-10-17
- **Feature:** STATUS.md → "B4 checklist" and "B5 — Hitlist"

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
