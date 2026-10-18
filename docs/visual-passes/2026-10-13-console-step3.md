# Visual pass — Console overhaul Step 3 + follow-ups (A–H)

- **Status:** ✅ Passed 2026-10-13, merged
- **Feature:** STATUS.md → "Console overhaul — Step 3 + follow-ups (2026-10-13)"; branch `consolidation/console-step3`
- **Setup:** Use the test server at `localhost:5174` while it is up: it uses the scratch DB, so committing and bulk-editing there is harmless. (On `localhost:5173` you are on the real DB; commits are real — there is a backup at `temp/backups/local-20261013-2030.dump`.)

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
