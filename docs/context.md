# Project Overview: Personal Book Collection Tracker

## 1. High-Level Summary

A custom full-stack web application designed to replace and extend an existing Airtable setup for managing a large physical collection of Light Novels and Manga. The application serves two distinct frontend experiences from a single domain: a comprehensive data-rich desktop dashboard for management/insights, and a highly optimized mobile Progressive Web App (PWA) "Field Mode" for rapid, one-handed data entry at bookstores or bookfairs.

## 2. Technology Stack

- **Framework:** SvelteKit (Unified full-stack approach handling both API routes and UI).
- **Database:** PostgreSQL.
- **ORM:** Drizzle ORM (Lightweight, type-safe SQL-like queries).
- **State & Data Fetching:** TanStack Query for Svelte (Crucial for mobile "Field Mode" caching and offline-tolerant capabilities during poor bookfair internet).
- **Data Grids:** TanStack Table for Svelte (For handling complex multi-column filtering, sorting, and pagination on the desktop dashboard).
- **Styling:** Tailwind CSS (paired with a component library like shadcn-svelte).
- **Deployment & PWA:** Configured as a PWA for native-like mobile installation.

## 3. Database Schema (PostgreSQL)

The schema is designed to cleanly separate the physical book from the reading event to allow for re-reads, and incorporates event-tracking for deep insights.

- **`Series` (Replaces legacy "Dictionary")**
  - `id` (PK)
  - `short_name` (String)
  - `full_name` (String)
  - `status` (Enum: Ongoing, Ended, Dropped)
  - `type` (Enum: Light Novel, Manga)
  - `publisher` (String)
  - `total_volumes` (Int)
  - `watchlist` (Boolean)
- **`Books`**
  - `id` (PK)
  - `series_id` (FK -> Series)
  - `volume_number` (Int)
  - `location` (Enum: Home, Apartment)
  - `bought_at` (Date/Timestamp)
  - `price` (Decimal, Nullable - Opt-in tracking)
  - `source` (Enum: Bookstore, Bookfair, Online)
  - `source_event_id` (FK -> Bookfairs, Nullable)
- **`Reading` (One-to-Many with Books for re-reads)**
  - `id` (PK)
  - `book_id` (FK -> Books)
  - `status` (Enum: Unread, Reading, Read, Dropped)
  - `started_at` (Date, Nullable)
  - `finished_at` (Date, Nullable)
  - `rating` (Int/Decimal, 1-10 or 5-star)
  - `notes` (Text)
- **`Bookfairs`**
  - `id` (PK)
  - `name` (String)
  - `date` (Date)
  - `location` (String)
- **`Tags` & `Series_Tags` (Many-to-Many)**
  - `id` (PK), `name` (String) - e.g., Yuri, Fantasy, Slice of Life, Stressful.

## 4. Key Features & Workflows

### A. Emergency Fallback

- **CSV Export API:** A Day-1 endpoint (`/api/export/airtable`) that generates a CSV formatted perfectly for emergency re-import back to Airtable.
- **Initial Migration:** A one-time script to parse and seed the new PostgreSQL DB from the legacy Airtable CSV.

### B. Data Entry Flows (Desktop)

1.  **New Volume:** Fast entry for existing series. Autocomplete search, auto-suggests next volume number, location, source, date, and price.
2.  **New Title + First Volume:** Two-step form. Fill metadata first (name, type, tags), then seamlessly drop into the first volume's physical details.
3.  **Bookfair Mode (Bulk):** Select/create an Event to lock in context. Rapidly add books where fair/date are pre-filled. "Add another" retains the event context.

### C. Mobile "Field Mode" (PWA)

- **UX:** Optimized for one-handed use. No dashboard, opens straight to action (3 large buttons: "I bought a book", "New title", "Add to Watchlist").
- **Bookfair Session Toggle:** Top-level switch to lock all new entries to a specific fair.
- **Form Optimizations:** Instant fuzzy search (2-3 letters), +/- steppers for volumes, large toggle buttons for location, skippable price field.
- **Draft State:** Users can log bare minimums (Series + Volume + Source) and save. Records get an "Incomplete" badge to be filled out later on Desktop.

## 5. Insights & Data Visualizations (Desktop Dashboard)

- **Tsundoku / Backlog Pressure:** Unread pile size, and identifying series with high ownership but zero reading progress.
- **Collection Growth:** Line/Bar charts tracking the expansion of the library over time.
- **The Bookfair-to-Read Funnel:** A side-by-side comparison of 4-5 events showing volumes purchased vs. actual read completion rate from those specific hauls.
- **Reading Pace:** Average time taken to finish a book after its acquisition date.
- **Tag Distribution:** Breakdown of the collection by genre/tags.
- **Completion Rates:** Abandoned vs. finished patterns grouped by tags or publishers.
- **Spending Summary:** Financial insights with a strict "coward toggle" to hide the total amount by default.

## 6. Playful / Social Features

- **Bookfair Hitlist:** Generates a specific shopping list from the Watchlist tags prior to an event.
- **The Aesthetic Receipt:** Generates a highly stylized, shareable "shopping receipt" graphic summarizing a bookfair haul (total volumes, titles, fun customized header) for social media posting.
