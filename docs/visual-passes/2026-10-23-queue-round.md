# Visual pass — Queue round: Just bought / Continue / Unread / Everything, options sheet, runs, Back to the queue

- **Status:** ⬜ Pending — your check (not needed at the fair, so it can wait until after the second visit)
- **Feature:** STATUS.md → "Fair round 2 plan" → ③ Queue round (built 2026-10-23); branch `feature/queue-round`; mock-ups at https://claude.ai/artifact/FgurrWqN1GtUg4TBRLLfoa
- **Setup:** `node .claude/dev-test-db.mjs --host` on the laptop (scratch DB, port 5174), phone at `http://<laptop-IP>:5174/field/queue`. No migration. Queueing on scratch is safe; Undo or remove what you add.

1. **Chips** — Queue tab → **Add a book to the queue**: four chips **Just bought · Continue · Unread · Everything** fit on one line. It opens on **Just bought** (scratch has recent buys); with nothing bought in 60 days it would open on Continue.
2. **Just bought** — groups by where, newest first: the fair (gold diamond, its name, "Oct 23 · N unread of M"), then shop days ("Bookstore · Oct 13", "Online · Sep 30"). Inside, series cards with their **unread** volumes only; extras show as title + EXTRA. No "Queue all". Type in the filter → only matching series stay.
3. **Continue** — one row per series you're partway through: the next unread volume as a gold chip, the series bar, and "**+N owned**" or "last one you own".
4. **Unread / Everything** — the A→Z pile as before; Everything adds read / dropped books with "read — queue as a re-read".
5. **Options sheet** — tap a volume's name (not the queue button): "Series vol. N", "Read 1–X · you own up to vol. Y · Apartment", the series bar. Options: **Queue vol. N** (or **Remove from the queue** if queued) · **Queue vol. N–M** (only when more unread volumes follow) · **Read from the start** with a gold ↻ ("Vol. 1–Y · Z books · K as re-reads"). Footer "Added at the end of the queue (after #Q) · one Undo".
6. **Several at once** — pick **Read from the start** on a long series (e.g. ดอกรัก) → toast "Queued ดอกรัก from the start · 22 books · #Q+1–…" with Undo → **Undo** → all gone ("Removed … from the queue"). Do it again for step 7.
7. **Runs** — Queue tab: consecutive volumes of one series are **one row**: "ดอกรัก" with **↻ Vol. 1–22** and a gold span on the bar; "ชิโนะกับเร็น Vol. 3–5" without ↻ (not from vol. 1). No "re-read" text on runs. Numbers count runs (1, 2, 3…); the header counts books.
8. **Move a run** — ▲ / ▼ on a run moves the whole run past its neighbour. Single books move as before.
9. **Open a run** — the chevron opens it: its volumes indented, each with ▲▼ that reorder **inside** the run (first ▲ and last ▼ greyed). Swipe a volume inside → Finished / Remove as usual. Chevron again closes it.
10. **Swipes on a closed run** — swipe right → the Finished sheet for its **first** volume; swipe left → removes only the first volume (the run gets one shorter).
11. **Back to the queue** — start a queued book (tap it → Started today) → it's in **Reading now** with a ↶ beside Finished → tap ↶ → toast "… back in the queue · #1", it's first in Up next again and **Unread** (on the desktop its reading history is empty again; a re-read goes back to Read). Also from Find: tap a tile you're reading → the sheet shows **Back to the queue** instead of Add to queue.
12. **Desktop** — `/queue` on the PC: a gold-tinted header row per run (chip, ↻, "N books", bar, run ▲▼) with its books under it (their ▲▼ move within the run). Reading now rows have **Back to the queue**.

Remove anything you queued on scratch when done (the run's books: open the run and swipe them, or Undo).
