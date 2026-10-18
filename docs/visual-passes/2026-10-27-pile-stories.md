# Visual pass — Pile-height stories

- **Status:** ⬜ Pending — after the fair (branch `feature/pile-stories`, deploy after Oct 26)
- **Feature:** STATUS.md → "Pile-height stories"; ROADMAP → Phase 6

Run it after the merge + push, on production (the fair's haul is the real story ②). Before that, the branch can be seen on the scratch dev server (`dev-test-db`, port 5174).

1. **Pile card (phone):** Field → **Queue** tab → scroll to the end. Below _Add a book to the queue_ a gold-bordered card reads **Your pile · N.NN m** and **N unread · Pile story**. _Red flag:_ the number looks wildly off (≈ 1.8 cm per LN, 1.2 cm per manga, Unread books only).
2. **Story ①:** tap the card → full screen black, two bars at the top, the story: MY UNREAD PILE, the height, "N books I own and haven't read", a comparison ("About as tall as a person"), the spine stack beside a 2 m door, Librarian + today's date at the bottom. Thai and Latin look right in Google Sans.
3. **Story ②:** tap the right side → the fair story: the fair's name in gold, **+N cm**, "N new books" (· "N already read" if you've read some), "The pile is now … — …", the fair's unread books in **gold** on top of the stack. It's the fair in the header chip, else the latest fair with books. Tap the left side → back to ①. Tapping right on ② closes it; ✕ closes too.
4. **Save both:** → the share sheet with **two images** → Instagram (story) or Save to Photos. Open them: 1080×1920, sharp, nothing cut off under Instagram's top bar or bottom reply box. **This one** shares only the story on screen.
5. **A13 speed:** opening the viewer takes about a second (the images are drawn on the phone). Note if it's slower than that.
6. **Desktop:** a bookfair page (e.g. มหกรรมหนังสือระดับชาติ 30) → **Pile story** (beside _Add books from your collection_) → the same two stories for **that** fair; ← → keys and Esc work. A fair without books has no button.
7. **Hitlist Save image** still works (its save code moved into a shared helper).
