# ProjectHub — Searchable Listing Dashboard

> **Internship Task 4 · Phase 4 (Final Submission)**  
> A fully client-side, responsive dashboard for discovering project internships, built with pure HTML 5, CSS 3, and Vanilla JavaScript — no frameworks, no build tools, no backend required.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Prerequisites & Running Locally](#5-prerequisites--running-locally)
6. [Dataset — `listings.json`](#6-dataset--listingsjson)
7. [Search Algorithm](#7-search-algorithm)
8. [Debounce Function](#8-debounce-function)
9. [Filter Logic — AND across groups, OR within a group](#9-filter-logic--and-across-groups-or-within-a-group)
10. [Sorting & Pagination](#10-sorting--pagination)
11. [UI States — Loading, Empty, Error](#11-ui-states--loading-empty-error)
12. [Bookmark Persistence — localStorage](#12-bookmark-persistence--localstorage)
13. [Responsive Design & Accessibility](#13-responsive-design--accessibility)
14. [Deployment](#14-deployment)
15. [GitHub — Initializing and Publishing](#15-github--initializing-and-publishing)
16. [Manual Testing Checklist](#16-manual-testing-checklist)
17. [Phase Roadmap](#17-phase-roadmap)

---

## 1. Project Overview

ProjectHub is a single-page dashboard that lets students and job seekers explore curated internship and project opportunities. All data is loaded from a local JSON file — no API key or internet connection (beyond the Google Fonts stylesheet) is required to run the application.

Users can:
- **Search** listings in real time using any keyword.
- **Filter** by domain, experience level, work mode, and required skills.
- **Sort** results newest-first or alphabetically.
- **Paginate** through results (6 cards per page).
- **Bookmark** listings and revisit them in a dedicated **Saved Projects** view.
- **View full details** for any listing in a modal overlay.

---

## 2. Key Features

| Feature | Detail |
|---|---|
| Live search | Debounced, multi-field, multi-term (AND logic) |
| Multi-category filters | OR within a group · AND across groups |
| Sorting | Newest first (ISO date) or A–Z |
| Pagination | 6 cards per page, smart ellipsis |
| Saved Projects view | localStorage persistence, own sort + pagination |
| Skeleton loading cards | 6 shimmer placeholders while data loads |
| Error state + Retry | Shown if `fetch()` fails |
| Empty state | Shown when no listings match current search/filters |
| Accessible modal | Details, stipend, company, skills for each listing |
| Responsive layout | Tested at 375 px, 430 px, 768 px, 1024 px, 1440 px, 1920 px |
| Mobile filter drawer | Slide-in sidebar, Escape key closes it |
| Reduced-motion safe | All animations disabled when the OS preference is set |
| No frameworks | Pure HTML5 · CSS3 · Vanilla JS (ES6+) |

---

## 3. Technology Stack

| Technology | Purpose |
|---|---|
| **HTML 5** | Semantic structure (`<header>`, `<main>`, `<aside>`, `<article>`, `<footer>`) |
| **CSS 3** | Custom properties (design tokens), Flexbox, Grid, animations, `@media` queries |
| **Vanilla JavaScript (ES6+)** | Fetch API, `IntersectionObserver`, `localStorage`, `DocumentFragment` |
| **JSON** | Static local data source — `data/listings.json` |
| **Google Fonts (Inter)** | Typography — loaded via `<link>` in the `<head>` |

No npm packages, no bundlers, no transpilers. The project works in any modern browser.

---

## 4. Project Structure

```
searchable-listing-dashboard/
├── index.html          ← Single HTML file; all semantic structure and ARIA
├── css/
│   └── style.css       ← All styles: tokens, layout, components, responsive, animations
├── js/
│   └── app.js          ← All application logic (~1 590 lines, 25 modules)
├── data/
│   └── listings.json   ← 20 realistic project/internship listings
├── assets/             ← Reserved for future images or icons
├── .gitignore          ← Excludes OS files, editor files, node_modules
└── README.md           ← This file
```

---

## 5. Prerequisites & Running Locally

### Why you need a local server

`app.js` uses the **Fetch API** to load `data/listings.json`:

```js
const response = await fetch('./data/listings.json');
```

Browsers block `fetch()` requests to `file://` URLs for security reasons (the CORS "same-origin" policy treats every `file://` path as a different origin). Opening `index.html` directly from your file system will fail with a network error.

You must serve the project through an **HTTP server**. Three easy options:

---

### Option 1 — VS Code Live Server (recommended)

1. Install the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code.
2. Open the `searchable-listing-dashboard` folder in VS Code.
3. Right-click `index.html` → **Open with Live Server**.
4. The browser opens automatically at `http://127.0.0.1:5500`.

---

### Option 2 — Python (built-in, no install required)

```bash
# Python 3
cd searchable-listing-dashboard
python -m http.server 8080
```

Open `http://localhost:8080` in your browser.

---

### Option 3 — Node.js `serve`

```bash
npx serve searchable-listing-dashboard
```

Open the URL printed in the terminal (usually `http://localhost:3000`).

---

## 6. Dataset — `listings.json`

The file `data/listings.json` is a JSON array of **20 listings** covering all five domains, all three experience levels, and all three work modes.

### Schema

```jsonc
{
  "id":          "proj-001",          // unique string identifier
  "title":       "E-Commerce Platform Redesign",
  "description": "Full description...",
  "domain":      "Web Development",   // Web Development | UI/UX Design | Data Science
                                      // Mobile Development | Digital Marketing
  "experience":  "Intermediate",      // Beginner | Intermediate | Advanced
  "workMode":    "Remote",            // Remote | Hybrid | On-site
  "skills":      ["HTML", "CSS", "JavaScript", "UI/UX", "REST APIs"],
  "postedDate":  "2026-10-28",        // ISO 8601 date (YYYY-MM-DD)
  "remote":      true,                // boolean — used for the "Remote Opportunities" stat
  "beginner":    false,               // boolean — used for the "Beginner Friendly" stat
  "details": {
    "duration":  "3 months",
    "stipend":   "$800/month",
    "openings":  2,
    "company":   "ShopWave Inc."
  }
}
```

### Coverage

| Dimension | Values present |
|---|---|
| Domains | Web Dev, UI/UX, Data Science, Mobile, Digital Marketing |
| Experience | Beginner (7), Intermediate (8), Advanced (5) |
| Work Mode | Remote (13), Hybrid (3), On-site (4) |
| Date range | 2026-10-10 to 2026-10-30 (spans 3 weeks for sort testing) |
| Skills | 25+ unique skills across all listings |

### Validation

On startup, `validateDataset()` checks that every record is a non-null object with all eight required fields and a proper `skills` array. Invalid records are silently removed rather than crashing the page.

---

## 7. Search Algorithm

```
search haystack = title + description + domain + experience + workMode + all skills
                  (joined into one lowercase string)

query → split on whitespace → [term1, term2, ...]

For each listing:
  pass = term1 ∈ haystack  AND  term2 ∈ haystack  AND  ...
```

**Key properties:**

| Property | Detail |
|---|---|
| **Case-insensitive** | Both the query and the haystack are lowercased before comparison |
| **Multi-field** | One search covers title, description, domain, experience, work mode, and every skill |
| **Multi-term AND** | `"python data"` matches only listings containing *both* words |
| **Highlight** | The first query term is wrapped in `<mark>` inside card titles using a safe regex (HTML is escaped first to prevent XSS) |

**Code location:** `updateResults()` in `app.js` — the search runs inside the single `.filter()` pass alongside the category filters.

---

## 8. Debounce Function

Typing quickly into the search box would trigger `updateResults()` on every keystroke — potentially dozens of calls per second, causing unnecessary DOM work.

```js
function debounce(fn, delay) {
  let timerId;
  return function debounced(...args) {
    clearTimeout(timerId);                        // cancel the pending call
    timerId = setTimeout(() => fn.apply(this, args), delay);  // reschedule
  };
}

// Wired with a 280 ms delay
const debouncedSearch = debounce(handleSearchInput, 280);
DOM.searchInput.addEventListener('input', debouncedSearch);
```

**How it works:**
- Every keystroke cancels the previous timer and starts a new 280 ms countdown.
- `updateResults()` fires **only once** — 280 ms after the user *stops* typing.
- 280 ms is short enough to feel instant but long enough to skip redundant calls for words like "javascript" (11 keystrokes).

---

## 9. Filter Logic — AND across groups, OR within a group

Checkboxes are grouped into four categories: **Domain**, **Experience Level**, **Work Mode**, and **Skills**.

```
Within a group  → OR  (any checked value in that group is acceptable)
Across groups   → AND (listing must satisfy every group that has a selection)
Skills group    → AND (listing must have ALL selected skills simultaneously)
```

### Example

Checked: Domain = `Web Development` OR `Data Science`, WorkMode = `Remote`

```
pass = (listing.domain === "Web Development" OR "Data Science")
       AND
       (listing.workMode === "Remote")
```

A listing that is Web Development + On-site would **fail** (wrong work mode), even though its domain matches.

### State representation

```js
State.activeFilters = {
  domain:     new Set(["Web Development", "Data Science"]),
  experience: new Set(),          // empty = no filter applied for this group
  workMode:   new Set(["Remote"]),
  skills:     new Set(["Python"]),
};
```

Empty Sets are ignored — only groups with at least one selection are enforced.

---

## 10. Sorting & Pagination

### Sorting

| Option | Implementation |
|---|---|
| **Newest First** | `arr.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate))` |
| **Alphabetical (A–Z)** | `arr.sort((a, b) => a.title.localeCompare(b.title))` |

`sortListings()` always operates on a **spread copy** (`[...listings]`) so `State.allListings` is never mutated.

### Pagination

```
State.PAGE_SIZE = 6          // cards per page

pageSlice = filteredListings.slice(
  (currentPage - 1) * PAGE_SIZE,
   currentPage      * PAGE_SIZE
)
```

- Any change to search, filters, or sort resets `currentPage` to 1.
- Changing the page **does not** reset filters or search.
- The `buildPageRange()` function generates a compact array like `[1, 2, 3, '…', 8]` to avoid rendering 20 individual page buttons.
- Prev / Next buttons are disabled when on the first / last page respectively.

Both the Explore view and the Saved Projects view have independent pagination engines sharing the same `buildPageRange()` helper.

---

## 11. UI States — Loading, Empty, Error

### Loading state

Six shimmer skeleton cards are **pre-rendered in the HTML** (`<div class="skeleton-card">`). They appear instantly on page load before the JSON fetch resolves. Once data is ready (or an error occurs), they are removed from the DOM.

### Empty state (`#listings-empty`)

Shown when `filteredListings.length === 0` after applying search + filters. Provides two action buttons:

- **Clear All Filters** — resets both `State.activeFilters` and the search query.
- **Clear Search Only** — resets only `State.searchQuery`; active category filters are preserved.

### Error state (`#listings-error`)

Shown if `fetch('./data/listings.json')` throws or returns a non-OK HTTP status. Contains a **Retry** button that re-runs the full `init()` flow (re-injects skeleton cards, re-fetches data).

### Saved view empty state (`#saved-empty`)

Shown when `State.savedIds.size === 0`. Contains an **Explore Projects** button that switches back to the Explore tab.

---

## 12. Bookmark Persistence — localStorage

```js
const SAVED_KEY       = 'projecthub_saved';       // stores Set → JSON array of IDs
const SAVED_ORDER_KEY = 'projecthub_saved_order'; // stores save order for default sort
```

### Lifecycle

| Event | Action |
|---|---|
| App starts | `loadSavedIds()` reads both keys from `localStorage` |
| User bookmarks a listing | `State.savedIds.add(id)` + `persistSavedIds()` writes both keys |
| User removes a bookmark | `State.savedIds.delete(id)` + `persistSavedIds()` |
| Page refresh | IDs survive; cards re-render with bookmark buttons already in "saved" state |
| localStorage unavailable | Silent `try/catch` — app continues without persistence |

### Saved Projects view

The **Saved** tab shows only bookmarked listings, sorted by:

| Sort option | Behaviour |
|---|---|
| Saved Order | The order in which the user bookmarked them (default) |
| Newest First | By `postedDate` descending |
| Alphabetical | By `title` ascending |

The saved view has its own independent 6-per-page pagination.

---

## 13. Responsive Design & Accessibility

### Breakpoints

| Width | Layout |
|---|---|
| ≥ 1024 px | Two-column (filter sidebar 272 px + listings grid) |
| ≤ 1024 px | Sidebar narrows to 240 px |
| ≤ 900 px | Sidebar becomes a slide-in drawer; hamburger menu shown |
| ≤ 640 px | Single-column listings; stacked stats (2×2) |
| ≤ 430 px | Compact tap targets; smaller stat icons |

### Mobile Filter Drawer

- Opens via the "Filters" button in the mobile filter bar.
- Closes via the × button inside the drawer, the backdrop overlay, or the **Escape** key.
- When open, `document.body.style.overflow = 'hidden'` prevents background scrolling.
- Focus moves to the close button when the drawer opens (`focus()`).

### Accessibility

| Feature | Implementation |
|---|---|
| Skip link | `<a href="#main-content" class="skip-link">` — visible on focus |
| Semantic HTML | `<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, `<footer>` |
| ARIA roles | `role="tablist/tab/tabpanel"` on view tabs; `role="dialog"` on modal; `role="list/listitem"` on card grid |
| Live regions | `aria-live="polite"` on results count, pagination info; `aria-live="assertive"` on SR announcer |
| Bookmark state | `aria-pressed="true/false"` toggled on every bookmark button |
| Form labels | All inputs have `<label>` or `aria-label`; filter groups use `<fieldset>/<legend>` |
| Focus management | Modal opens focus on the close button; filter drawer opens focus on its close button |
| Focus ring | `:focus-visible` outline on all interactive elements |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` collapses all animation durations to `0.01ms` |
| Colour contrast | All text on white or near-white backgrounds meets WCAG AA (4.5:1 minimum) |

---

## 14. Deployment

The project is a **static site** — just HTML, CSS, JS, and JSON. No server-side code.

### Netlify — Drag & Drop (easiest)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
2. Drag the entire `searchable-listing-dashboard/` **folder** into the drop zone.
3. Netlify assigns a random URL (e.g., `https://amazing-name-123.netlify.app`).
4. Optional: go to **Site settings → Domain management** to set a custom subdomain.

### Netlify — GitHub Integration (recommended for auto-deploy)

1. Push your repository to GitHub (see Section 15).
2. Log in to [netlify.com](https://netlify.com) → **Add new site → Import an existing project**.
3. Connect your GitHub account and select the repository.
4. Set:
   - **Base directory:** `searchable-listing-dashboard`
   - **Build command:** *(leave empty)*
   - **Publish directory:** `searchable-listing-dashboard`
5. Click **Deploy**. Every future push to `main` triggers an automatic redeploy.

### GitHub Pages

1. Push to GitHub (see Section 15).
2. Go to **Settings → Pages → Source → Deploy from branch**.
3. Select branch: `main`, folder: `/searchable-listing-dashboard` (or `/(root)` if the folder is the repo root).
4. Your site is available at `https://<username>.github.io/<repo-name>/`.

> **Important:** GitHub Pages serves the `index.html` through HTTPS so `fetch('./data/listings.json')` works correctly — unlike opening the file directly.

---

## 15. GitHub — Initializing and Publishing

Run these commands from your terminal inside the project's **parent folder** (`Internship task 4`):

```bash
# 1. Initialize a git repository inside the project folder
cd searchable-listing-dashboard
git init

# 2. Stage all files
git add .

# 3. Create the first commit
git commit -m "feat: ProjectHub Internship Task 4 — Phase 4 final submission"

# 4. Rename the default branch to 'main'
git branch -M main

# 5. Add the remote  (replace the URL with your actual GitHub repository URL after creating it)
git remote add origin https://github.com/<your-username>/<your-repo-name>.git

# 6. Push
git push -u origin main
```

### Creating the GitHub repository

1. Go to [github.com/new](https://github.com/new).
2. Repository name: e.g. `projecthub-dashboard`.
3. Set to **Public** (required for free GitHub Pages).
4. **Do not** initialize with a README or `.gitignore` (you already have both).
5. Click **Create repository** and copy the repository URL shown on the next screen.
6. Use that URL in step 5 of the commands above.

### Why file:// does not work

When you double-click `index.html`, the browser assigns it the `file:///` protocol. The Fetch API applies the same-origin policy:

```
Origin of page  : file:///C:/Users/sriha/Documents/…/index.html
Origin of fetch : file:///C:/Users/sriha/Documents/…/data/listings.json
```

Even though both files are in the same folder, browsers treat every `file://` URL as a separate origin and block the request. Serving through `http://localhost` gives both the page and the JSON the **same** HTTP origin, so the fetch succeeds.

---

## 16. Manual Testing Checklist

Work through every item below before submitting. Tick each one when verified.

### Data Loading
- [ ] Opening the app via a local server shows 6 skeleton cards, then replaces them with real listing cards.
- [ ] The four stat counters animate up to their correct values (20, 5, 13, 7).
- [ ] The Skills filter panel is populated dynamically from the dataset.

### Search
- [ ] Typing `python` returns only listings that contain "python" (case-insensitive).
- [ ] Typing `python data` returns only listings containing *both* words.
- [ ] The search highlights the first term in card titles with a yellow `<mark>`.
- [ ] The × clear button appears when text is present and disappears when cleared.
- [ ] Clearing search restores the full (filtered) listing without removing active checkboxes.
- [ ] Typing rapidly does NOT trigger a UI update on every keystroke (debounce is working — you can verify by opening DevTools Performance tab).

### Filters
- [ ] Checking "Web Development" shows only Web Development listings.
- [ ] Checking "Web Development" and "Data Science" shows listings from either domain (OR).
- [ ] Checking "Web Development" AND "Remote" shows only Web Dev + Remote listings (AND across groups).
- [ ] Selecting two skills (e.g. "JavaScript" and "React") shows only listings with BOTH skills.
- [ ] Active filter chips appear below the listings header for each selected filter.
- [ ] Clicking × on a filter chip removes that single filter and updates results.
- [ ] "Reset All" clears all checkboxes and chips, restoring all listings.
- [ ] Filters and search work together correctly.

### Sorting
- [ ] "Newest First" orders listings by `postedDate` descending (proj-013, 2026-10-30, should appear first).
- [ ] "Alphabetical (A–Z)" orders listings by title ascending.
- [ ] Changing sort resets pagination to page 1.

### Pagination
- [ ] With all listings shown, page 1 shows 6 cards; page 2 shows the next 6; page 4 shows 2.
- [ ] "Prev" is disabled on page 1; "Next" is disabled on the last page.
- [ ] Numbered page buttons appear with ellipsis when there are more than 7 pages.
- [ ] Clicking a page number scrolls smoothly to the listings section.
- [ ] Filtering to fewer than 7 results hides the pagination bar.

### Empty State
- [ ] Searching for a term that matches nothing (e.g. `xyzzyqwerty`) shows the empty state.
- [ ] "Clear All Filters" from the empty state restores all listings.
- [ ] "Clear Search Only" clears the query but keeps any active checkboxes.

### Error State
- [ ] To test: temporarily rename `data/listings.json` to `listings_bak.json`, refresh.
- [ ] The error panel appears with a "Retry" button.
- [ ] After renaming the file back, clicking Retry successfully loads the data.

### Bookmarks
- [ ] Clicking the bookmark icon on a card turns it amber/gold and marks it as saved.
- [ ] Refreshing the page keeps the saved state (localStorage is working).
- [ ] Clicking the bookmark again removes it, and the card returns to its default style.
- [ ] The "Saved" tab badge and navbar badge both update immediately.

### Saved Projects View
- [ ] Clicking the "Saved" tab shows only bookmarked listings.
- [ ] The saved view shows its own pagination if more than 6 listings are saved.
- [ ] Sort options in the saved view (Saved Order / Newest / A–Z) work correctly.
- [ ] "Clear All" in the saved view removes all bookmarks after confirmation.
- [ ] The saved empty state appears when no listings are bookmarked.
- [ ] "Explore Projects" button in the empty state switches back to the Explore tab.
- [ ] Removing a bookmark from the saved view immediately removes the card from the grid.

### Modal
- [ ] Clicking "View Details" opens the modal with title, badges, description, details, and skills.
- [ ] Clicking "Save Listing" inside the modal bookmarks the listing and updates the button text.
- [ ] Clicking outside the modal or clicking × closes it.
- [ ] Pressing Escape closes the modal.
- [ ] "Apply Now" shows a brief green confirmation animation (no browser `alert()`).

### Mobile (resize browser to ≤ 900 px)
- [ ] The hamburger button appears; clicking it opens the mobile menu.
- [ ] The mobile menu contains Explore, Explore Projects, and Saved Projects links.
- [ ] The "Filters" bar appears above the listings grid.
- [ ] Clicking "Filters" slides in the filter drawer from the left.
- [ ] The backdrop appears; clicking it closes the drawer.
- [ ] Pressing Escape closes the drawer.
- [ ] No horizontal overflow at 375 px, 430 px, or 768 px widths.
- [ ] All text is readable; tap targets are at least 36 × 36 px.

### Accessibility
- [ ] Tab through the page — focus rings are visible on all interactive elements.
- [ ] Activate the skip link (Tab from the browser address bar) — focus jumps to `#main-content`.
- [ ] Bookmark buttons announce "Project saved to bookmarks" / "Project removed from bookmarks" to a screen reader (use NVDA, VoiceOver, or the accessibility tree in DevTools).
- [ ] Filter checkboxes are navigable by keyboard; Space toggles them.

---

## 17. Phase Roadmap

| Phase | Status | Features |
|---|---|---|
| **Phase 1** | ✅ Complete | Full UI, responsive layout, card rendering, bookmarks, modal, animated stats |
| **Phase 2** | ✅ Complete | Debounced search, multi-category filters, sort, pagination (6/page), skeleton loading, error retry, empty state |
| **Phase 3** | ✅ Complete | Premium visual polish, micro-interactions, Saved Projects view with own pagination, enhanced bookmarks, tab navigation |
| **Phase 4** | ✅ Complete | Full code audit, debug cleanup, `.gitignore`, final README with algorithm explanations and testing checklist |
| **Phase 5** | 🟡 Planned | URL state sync (share current search/filters as a URL), dark mode toggle |

---

## Author

**Srihan** — Internship Task 4  
Built with ❤️ using pure web standards. No frameworks, no build tools, no magic.
