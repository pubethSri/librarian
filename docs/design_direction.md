# Librarian — Design Direction

> **Last updated:** 2026-05-27T12:28+07:00 (Phase 3 planning)
> **Status:** Foundational — design tokens established in Phase 0, layout implementation in Phase 2, Console layout in Phase 3

---

## 1. Core Visual Identity: Interactive Editorial

The application adopts an **"Interactive Editorial"** (or Playful Documentation) aesthetic, treating the UI as a calm, structured canvas that respects the physical media it catalogs (manga and light novels).

### Spatial Architecture
- **CSS Grid layouts** with asymmetrical composition
- **Fixed, sticky side navbar** (20–25% desktop width) for constant spatial awareness
- Generous macro-whitespace; content width constrained for optimal readability
- Content hierarchy driven by spacing and typography, not by heavy card borders

### Typography Play (Structural Contrast)
- **Serif fonts** for book titles — evokes the tactile feel of ink and paper
- **Sans-serif or monospaced fonts** for metadata (volume numbers, dates, publishers)
- Oversized numbers for list anchors and volume indicators
- Typography defines the visual hierarchy; minimal reliance on heavy borders or cards

### State-Driven Interactivity
- Tactile micro-interactions using Svelte's native transitions (`fade`, `slide`, `fly`)
- Hover states directly manipulate UI elements (e.g., slight lift on cover art, color shift on badges)
- Smooth state transitions for inline editing (status badges, watchlist toggles)

### Theming
- **Current:** Monochromatic B&W via shadcn-svelte `zinc` palette (OKLCH color space)
- **Future (Phase 7):** Dynamic CSS variable injection for full palette swaps:
  - Warm "parchment" for day mode
  - "Dark slate" for night mode
  - System-level generation similar to Matugen

---

## 2. Keyboard-Driven Navigation & Shortcuts

The app prioritizes power-user efficiency, allowing complete library management without leaving the keyboard.

### Command Palette / Global Search
- `Ctrl + K` or `/`: Opens a centered, typography-focused quick launcher with background blur
- Search across series, books, and tags in a single unified input

### Grid & List Traversal
- `J` / `K` (or Arrow Keys): Moves focus across book grid / table rows with smooth highlight
- `Enter`: Opens detailed view for focused item
- `Esc`: Closes modals, palettes, and popovers

### Rapid Data Entry
- `Shift + N`: Triggers the "Add New Book" form globally from any page
- `E`: Toggles edit mode on a detail page
- `Ctrl + S`: Saves current form state (intercepts browser default)

### Discoverability
- `?` (`Shift + /`): Full-screen typographic overlay detailing all available shortcuts

### Technical Implementation: Shortcut Hijacking
Custom shortcuts bypass browser defaults using precise DOM event interception in SvelteKit:

- **Global Listener:** `<svelte:window>` with `onkeydown` handler in the `(app)` layout
- **Event Interception:** Evaluate `event.ctrlKey`, `event.metaKey`, `event.key`; call `event.preventDefault()` to block browser defaults (e.g., `Ctrl + S` save dialog)
- **Context Awareness:** Shortcuts are suppressed when focus is inside `<input>`, `<textarea>`, or `[contenteditable]` elements to avoid interference with text entry
- **Modal Stack:** `Esc` respects a modal stack — closes the topmost layer first

---

## 3. Phase 2 Layout Foundation

These design principles directly shape the Phase 2 implementation:

### Navigation Shell
- **Sidebar:** Fixed left sidebar (20–25% width on desktop), contains nav links + user/logout area
- **Collapsible:** Sidebar collapses to icon-only on medium viewports
- **Mobile:** Sheet/drawer overlay triggered by hamburger (not Field Mode — that's Phase 5)
- **Breadcrumbs:** Typographic breadcrumb trail in the content header area

### Table Design
- Clean, airy tables with generous row height and whitespace
- Sortable column headers with subtle directional indicators
- Monochromatic badges for status/type/location (no heavy color — zinc palette only)
- Inline editing uses subtle transitions: badge → dropdown → badge on save

### Form Design
- Dialog-based forms (not full-page navigations) for quick data entry
- Autocomplete/combobox for series search (cmdk-style)
- Large, clear action buttons; form state clearly communicated
- Success/error toasts (Sonner) for mutation feedback

### Data Density
- Tables prioritize scannability over density
- Key information (name, status, progress) visible at a glance
- Secondary information (publisher, dates, price) available but not dominant
- Progress bars for volumes owned vs. total — compact visual indicator

---

## 4. Phase 3 Console & Bookfairs Layout

These design principles shape the Phase 3 implementation — the unified Console and bookfair pages.

### Console: Two-Panel Layout
- **Full-page workspace** — not a dialog. The Console uses all available horizontal space.
- **Preview Panel** (left, ~55–60% width) — scrollable table showing books in the current scope
- **Command Panel** (right, ~40–45% width) — tabbed interface with "Add Books" and "Bulk Edit"
- **Scope bar** (top, full width) — shows current scope context (bookfair name, series name, or "All Books")
- Both panels scroll independently; the scope bar is sticky

### Staged Visual Language
The Preview Panel uses color-coded left borders and status indicators to distinguish entry states:

| State | Visual Cue | Meaning |
|---|---|---|
| **Existing** | No special styling | Already saved in DB |
| **Staged addition** | Green left border + "NEW" badge | Not yet committed — from Add Books tab |
| **Staged edit** | Amber left border + old→new indicator | Not yet applied — from Bulk Edit tab |
| **Removable** | ✕ button on staged rows only | Can discard before commit |

- Green and amber use subtle, muted tones from the zinc palette (not saturated) to stay consistent with the monochromatic identity
- Bottom bar shows aggregate counts: "📦 3 new · ✏️ 2 changes" with a single "Commit All (5)" button

### Bookfairs Pages
- **Card grid** — each event as a bordered card with name, date, book count. Clean, scannable layout.
- **Detail page** — follows series detail page pattern: header → stats row → table of linked books
- **"Open in Console" button** — prominent in the detail page header, navigates with pre-set scope

### Console Activity Log
- Collapsible section at the bottom of the Command Panel
- Compact log entries with action icon, description, count, relative timestamp
- Stays within the monochromatic theme — no bright colors for log entries

---

## 5. Design Decisions Log

| Date | Decision | Context |
|---|---|---|
| Phase 0 | shadcn-svelte `nova` style with `zinc` base color, OKLCH color space | Clean B&W monochromatic foundation |
| Phase 0 | Tailwind CSS v4 with CSS-first config | Modern approach, no `tailwind.config.js` needed |
| 2026-04-28 | Interactive Editorial as core visual identity | Calm, structured, respects physical media. Typography-driven hierarchy |
| 2026-04-28 | Keyboard shortcuts system planned | Power-user efficiency, command palette, vim-style traversal |
| 2026-04-28 | Client-side pagination for Phase 2 | Dataset is small (~44 series, ~300 books), avoids round-trip latency |
| 2026-04-28 | Inline editing: status + watchlist only | Other fields via detail page / edit dialog. Adjustable after user testing |
| 2026-04-28 | Decorative polish deferred to Phase 7 | Phase 2 focuses on functional, scannable UI with good whitespace |
| 2026-05-27 | Unified Console two-panel layout | Full-page workspace (not dialog) for bulk entry + editing. Preview (left) + Command (right) |
| 2026-05-27 | Green/amber staging visual cues | Muted tones consistent with zinc palette. Green = new, amber = modified |
| 2026-05-27 | Bookfairs as card grid → detail → Console | Informational pages link to Console for heavy work. Clean separation |
| 2026-05-27 | Scope-aware context bar | Console scope bar shows bookfair/series context. Sticky, always visible |

---

## 6. Typography Stack (Planned)

> **Note:** Exact font selections to be finalized in Phase 7 polish. Phase 2 uses system/shadcn defaults.

| Role | Category | Candidates |
|---|---|---|
| **Book titles** | Serif | Playfair Display, Cormorant Garamond, Libre Baskerville |
| **Body / UI** | Sans-serif | Inter, Geist Sans (shadcn default), Plus Jakarta Sans |
| **Metadata / Numbers** | Monospace | JetBrains Mono, Geist Mono, IBM Plex Mono |

---

## 7. Color Strategy

### Current (Phase 0–6): Monochromatic Zinc
Using shadcn-svelte's `zinc` palette in OKLCH color space. All theme tokens defined in `src/routes/layout.css`.

### Future (Phase 7): Dynamic Theming
- Light mode: Warm parchment tones
- Dark mode: Deep slate with subtle warm accents
- Potential accent colors for series types (subtle, not dominant)
- CSS custom property system already in place — swap is non-breaking