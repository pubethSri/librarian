# Visual pass — Field Mode B3 — "Do I own this?"

- **Status:** ✅ Passed (PC + phone) 2026-10-16
- **Feature:** STATUS.md → "Bookfair release progress" (B3)
- **Setup:** Best on your phone: `npm run dev -- --host` on the laptop, then `http://<laptop-IP>:5173/field` (Field Mode only reads, so the real DB is safe). On desktop: sidebar → Tools → **Field Mode**.

1. `/field` opens with the cursor in a big "Do I own…?" box and your **Watchlist** below it, each with its next volume. ✅ Silent Witch says **next 10**.
2. Type `sw` → Silent Witch (initials). Type `ดาบ` → เกิดใหม่เป็นดาบ (any part of a Thai name). Type `zzz` → "Not in the collection". The ✕ clears the box.
3. Tap **Silent Witch** → big black **Next to buy · Vol. 10**, "own 1–9", tiles 1–9 each marked **A** (Apartment) with a ✓ on read ones, an outlined **10 next** tile, and **Extras**: "Extra (after vol. 4)", "Extra (after vol. 9)".
4. Open **สัมพันธ์ลับสัปดาห์ละครั้ง** → "latest vol. 7", a dashed **Missing: vol. 4, 5** line and dashed _missing_ tiles 4 and 5. **Arifureta** → tile 8 reads **A ×2** (two copies), next 15.
5. Phone **back** (or ← Search) → the results come back with your query still typed.
6. Add a book on the laptop (any series), then switch back to the phone's tab → Field Mode shows it within a second (refetch on focus). ❌ Red flag: the phone still shows the old next volume after switching back.
7. Nothing scrolls sideways at phone width; the tiles are readable at arm's length.
