# Visual pass — Pile-height stories + Fun page

- **Status:** ⬜ Pending — after the fair (branch `feature/pile-stories`, deploy after Oct 26)
- **Feature:** STATUS.md → "Pile-height stories" and "Fun page + pile pace"; ROADMAP → Phase 6

Run it after the merge + push, on production (the fair's haul is the real story ②). Before that, the branch can be seen on the scratch dev server (`dev-test-db`, port 5174).

1. **Pile card (phone):** Field → **Queue** tab → scroll to the end. Below _Add a book to the queue_ a gold-bordered card reads **Your pile · N.NN m** and **N unread · Pile story**. _Red flag:_ the number looks wildly off (≈ 1.8 cm per LN, 1.2 cm per manga, Unread books only).
2. **Story ①:** tap the card → full screen black, two bars at the top, the story: MY UNREAD PILE, the height, "N books I own and haven't read", a comparison ("About as tall as a person"), the spine stack beside a 2 m door, Librarian + today's date at the bottom. Thai and Latin look right in Google Sans.
3. **Story ②:** tap the right side → the fair story: the fair's name in gold, **+N cm**, "N new books" (· "N already read" if you've read some), "The pile is now … — …", the fair's unread books in **gold** on top of the stack. It's the fair in the header chip, else the latest fair with books. Tap the left side → back to ①. Tapping right on ② closes it; ✕ closes too.
4. **Save both:** → the share sheet with **two images** → Instagram (story) or Save to Photos. Open them: 1080×1920, sharp, nothing cut off under Instagram's top bar or bottom reply box. **This one** shares only the story on screen.
5. **A13 speed:** opening the viewer takes about a second (the images are drawn on the phone). Note if it's slower than that.
6. **Desktop:** a bookfair page (e.g. มหกรรมหนังสือระดับชาติ 30) → **Pile story** (beside _Add books from your collection_) → the same two stories for **that** fair; ← → keys and Esc work. A fair without books has no button.
7. **Hitlist Save image** still works (its save code moved into a shared helper).
8. **Stack variety:** in either story the books differ in thickness and width (a series a bit thicker or wider than the next), and the stack still reaches the same height as before.

**Fun page (desktop)**

9. Sidebar → **Fun** (under Insights). _Unread pile_: the height, "N unread · N light novels, N manga", the comparison. The fair picker lists fairs with books, newest first; **Pile stories** opens the same viewer with the picked fair as story ②.
10. **My pace:** type your real pace — light novels in _days a volume_ or _volumes a day_, manga the same. The result updates as you type: days, ≈ months, finish day, Christmases and Songkrans, bookfairs before you finish, before / after the spring fair, "years older" past a year. Reload: your paces are remembered.
11. **Slow and never:** try 400 days a novel → the slow-pace joke; switch on **Keep buying like usual** → often **Never** ("you buy faster than you read"). Note any line that reads wrong or isn't funny.
12. **By the fair:** สัปดาห์หนังสือแห่งชาติ 55 guessed for 27 Mar 2027 (≈ 160 days from Oct 18); the novel pace needed (e.g. 1 light novel every 1.7 days) and your manga's days. Pick an early date (e.g. a month from now) → "Not humanly possible — even your best day was 2.5 novels". **Reset** brings the guess back.
