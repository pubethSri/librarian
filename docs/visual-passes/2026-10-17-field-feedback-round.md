# Visual pass — Field Mode feedback round (select several, Released, Save image)

- **Status:** ✅ Passed 2026-10-17
- **Feature:** STATUS.md → "Field Mode feedback round (2026-10-17)"

Same setup as before: scratch server (`dev-test-db`, now started with `--host`) → phone at `http://172.16.10.13:5174/field`, or the pane / Chrome device mode at 375×812.

1. **Select several** — open a series with a gap (scratch: `/field?series=63`, missing 5). Tap **Select several** → the button turns black ("Done"), the grid shows 5 (missing) and 8 (next) … 19 plus **More**; the bar above the tabs says "Select volumes to add" (disabled). _Red flag:_ the bar covers the tabs or the last tile row.
2. Tap **5**, then **Next 3**, then **12** → tiles turn black with ✓; bar: **Add 5 volumes · vol. 5, 8–10, 12**. **More** → 20–31 appear. **Clear** empties it. Pick a few again.
3. Tap the bar → one save; toast "Added vol. 5, 8–10, 12 · <series> · Undo"; the grid shows them owned and select mode closes. **Undo** → "Removed vol. …", all gone.
4. **Skip on another device** — on the PC add vol. 9 to that series; on the phone (no refresh) select 9 + 10 → Add → "Added vol. 10 · already had vol. 9"; the grid shows both. Remove the test books afterwards.
5. **Price / location in select mode** — the hint says "(฿<price> each)"; switch Home, add two → both H with that price.
6. **Add tab picker** — type a new name → Create → vol. **1** is preselected; tap 2, 5, 6, 7 (or **1–5** then untap 3, 4) → label "5 (vol. 1–2, 5–7)", button **Save · 5 volumes** (after picking a type) → Save → the series opens in Find with 1, 2, 5, 6, 7 and "Missing: vol. 3, 4"; desktop Drafts = 5. Delete it afterwards.
7. **Released (phone)** — in a watchlist series: the **Released** card says "Seen a newer volume in a shop?" → tap **Vol. N is out** → "Out up to vol. N — vol. N to buy"; **+** → N+1 ("vol. N–N+1 to buy"); **−** back; reload → kept. **Clear (unknown)** resets.
8. **Hitlist — Confirmed (inside the publisher groups)** — set Released on one watchlist series and one series **not** on the watchlist (search it in Find). Hitlist → summary "… · 2 confirmed"; each shows as a **black card first in its own publisher group** ("VOL. N–M"; the non-watchlist one says "not on the watchlist" and may create its publisher's group); no separate section on top. Buy the volume (quick add) → the card becomes a normal row (watchlist) or disappears (not watchlist). _Red flag:_ a series listed twice, or a confirmed card outside its publisher.
9. **Released (desktop)** — Edit Series on that series → "Released up to vol." shows the phone's value; change / clear it → the Hitlist follows.
10. **Copy** — Copy → pasted text has one heading per publisher; confirmed lines read "- Name — vol. 10–11 out".
11. **Save image** — tap **Save image**: over the phone's plain-HTTP address it **downloads** `hitlist-<today>.png` (Android: notification / Downloads; iPhone: Files → Downloads, or a preview to long-press → Save to Photos). Open it: title + "N series · M confirmed · date", publisher groups with their black confirmed cards first, volumes right-aligned, Thai names readable, nothing cut off at the bottom. (After B6's HTTPS it opens the share sheet instead.)
12. **Old flows still fine** — single + Vol. N, missing-tile tap, Undo, 409 message (B4 steps 5–8) behave as before.
