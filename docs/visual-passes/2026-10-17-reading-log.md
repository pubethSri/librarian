# Visual pass — Reading log flow (v0.4 item 4.2)

- **Status:** ✅ Checked on the dev server 2026-10-17, merged + live
- **Feature:** STATUS.md → "Reading log flow (v0.4 item 4.2)"
- **Setup:** 1. Series page → an Unread volume → ✓ → dialog shows Today selected → pick **Yesterday** → Mark read. Expect toast "…: read (<yesterday>)", the badge turns Read, the ✓ becomes ↻.

2. Same volume → ↻ → "Read it again" → Today → Log re-read. Expect the badge **Read ×2**.
3. Dropdown → **Reading history…** → two rows, newest first; change the older one's finish day → Save → toast. Try a finish before the start → red message, Save disabled. Delete the newer row (click twice) → badge back to Read (×1).
4. Dropdown on an Unread volume → **Reading…** → Pick a day → a date → Start reading. Then ✓ → leave the start hidden → Mark read: the start day is kept (check in Reading history).
5. Phone `/field` → a series → tap an owned tile → sheet: **Started today** → the tile gets a small book mark. Back to search → **Currently reading** lists it → **Finished** → toast, the strip empties, the tile shows ✓.
6. Phone: tile of a Read volume → **Re-read finished…** → Yesterday → Log re-read → desktop shows ×2.
7. Insights still load; reads you logged appear in this month's finished counts.
