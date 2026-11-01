/**
 * ProjectHub – app.js
 * Searchable Listing Dashboard – Phase 3 (Premium UI, Saved View, Micro-interactions)
 * Author: Srihan | Internship Task 4
 *
 * ─── MODULE MAP ─────────────────────────────────────────────
 *  1.  State Management
 *  2.  DOM References
 *  3.  Data Loading (Fetch API + Retry)
 *  4.  Dataset Validation
 *  5.  Rendering Utilities (escapeHTML, badges, icons, date, highlight)
 *  6.  Stats Section (count-up animation)
 *  7.  Skills Filter Population
 *  8.  ★ CORE: updateResults()  ← single source of truth (Explore view)
 *  9.  Filter Logic (OR-within-group, AND-across-groups)
 * 10.  Search Logic (debounced, multi-field, multi-term)
 * 11.  Sort Logic (non-mutating)
 * 12.  ★ PAGINATION ENGINE (Explore)
 * 13.  Card Rendering (IntersectionObserver, DocumentFragment)
 * 14.  Active Filter Chips
 * 15.  Bookmarks (localStorage) — Phase 3 enhanced
 * 16.  ★ SAVED PROJECTS VIEW — Phase 3
 * 17.  Modal (View Details) — Phase 3 enhanced
 * 18.  Error / Loading / Empty States
 * 19.  Mobile Navigation
 * 20.  Mobile Filter Drawer
 * 21.  Collapsible Filter Groups
 * 22.  View Tabs (Explore / Saved) — Phase 3
 * 23.  Scroll Animations
 * 24.  SR Announcer — Phase 3
 * 25.  Init
 * ────────────────────────────────────────────────────────────
 */

'use strict';

/* ============================================================
   1. STATE MANAGEMENT
   ============================================================ */
const State = {
  /** Raw, immutable dataset loaded from JSON */
  allListings: [],

  /**
   * Result of applying search + filters (before pagination).
   * Sorted and ready. Pagination slices this array.
   */
  filteredListings: [],

  /**
   * Active filter values per group.
   * Logic: OR within a group, AND across groups.
   */
  activeFilters: {
    domain:     new Set(),
    experience: new Set(),
    workMode:   new Set(),
    skills:     new Set(),
  },

  /** Current search query — trimmed, lowercased. */
  searchQuery: '',

  /** Sort mode for explore view: 'newest' | 'alpha' */
  sortMode: 'newest',

  /** Set of bookmarked listing IDs, persisted via localStorage */
  savedIds: new Set(),

  /** Order in which listings were saved (for 'saved-order' sort) */
  savedOrder: [],

  /* ── Explore Pagination ── */
  PAGE_SIZE: 6,
  currentPage: 1,
  totalPages: 1,

  /* ── Saved View ── */
  savedSortMode: 'saved-order',
  savedCurrentPage: 1,
  savedTotalPages: 1,

  /** Current active view: 'explore' | 'saved' */
  currentView: 'explore',
};
window.State = State;

/* ============================================================
   2. DOM REFERENCES
   ============================================================ */
const DOM = {
  // Navbar
  hamburgerBtn:   document.getElementById('hamburger-btn'),
  mobileMenu:     document.getElementById('mobile-menu'),
  navSavedCount:  document.getElementById('nav-saved-count'),

  // Hero Search
  searchInput:    document.getElementById('main-search'),
  searchClearBtn: document.getElementById('search-clear-btn'),

  // Stats
  statTotal:    document.getElementById('stat-total'),
  statDomains:  document.getElementById('stat-domains'),
  statRemote:   document.getElementById('stat-remote'),
  statBeginner: document.getElementById('stat-beginner'),

  // Filters
  filterSidebar:     document.getElementById('filter-sidebar'),
  filterToggleBtn:   document.getElementById('filter-toggle-btn'),
  filterCloseBtn:    document.getElementById('filter-close-btn'),
  filterBackdrop:    document.getElementById('filter-backdrop'),
  resetFiltersBtn:   document.getElementById('reset-filters-btn'),
  activeFilterCount: document.getElementById('active-filter-count'),
  mobileResultsText: document.getElementById('mobile-results-text'),
  skillsOptions:     document.getElementById('skills-options'),
  filterChips:       document.getElementById('filter-chips'),

  // Listings
  listingsGrid:       document.getElementById('listings-grid'),
  listingsEmpty:      document.getElementById('listings-empty'),
  listingsError:      document.getElementById('listings-error'),
  resultsCount:       document.getElementById('results-count'),
  sortSelect:         document.getElementById('sort-select'),
  clearAllBtn:        document.getElementById('clear-all-btn'),
  clearSearchOnlyBtn: document.getElementById('clear-search-only-btn'),
  retryBtn:           document.getElementById('retry-btn'),

  // Explore Pagination
  pagination:      document.getElementById('pagination'),
  paginationInfo:  document.getElementById('pagination-info'),
  paginationPrev:  document.getElementById('pagination-prev'),
  paginationNext:  document.getElementById('pagination-next'),
  paginationPages: document.getElementById('pagination-pages'),

  // View Tabs
  tabExplore:       document.getElementById('tab-explore'),
  tabSaved:         document.getElementById('tab-saved'),
  viewExplore:      document.getElementById('view-explore'),
  viewSaved:        document.getElementById('view-saved'),
  tabExploreCount:  document.getElementById('tab-explore-count'),
  tabSavedCount:    document.getElementById('tab-saved-count'),

  // Saved View
  savedGrid:            document.getElementById('saved-grid'),
  savedEmpty:           document.getElementById('saved-empty'),
  savedSortSelect:      document.getElementById('saved-sort-select'),
  clearAllSavedBtn:     document.getElementById('clear-all-saved-btn'),
  exploreFromSavedBtn:  document.getElementById('explore-from-saved-btn'),
  savedPagination:      document.getElementById('saved-pagination'),
  savedPaginationInfo:  document.getElementById('saved-pagination-info'),
  savedPrevBtn:         document.getElementById('saved-prev-btn'),
  savedNextBtn:         document.getElementById('saved-next-btn'),
  savedPaginationPages: document.getElementById('saved-pagination-pages'),

  // Modal
  modalOverlay: document.getElementById('modal-overlay'),
  modalContent: document.getElementById('modal-content'),
  modalCloseBtn: document.getElementById('modal-close-btn'),

  // SR announcer
  srAnnouncer: document.getElementById('sr-announcer'),
};

/* ============================================================
   3. DATA LOADING (Fetch API + file:// Fallback + Retry)
   ============================================================ */
const FALLBACK_DATASET = [
  {
    "id": "proj-001",
    "title": "E-Commerce Platform Redesign",
    "description": "Revamp the UI/UX of an existing e-commerce platform. Improve navigation, product discovery, and checkout flows to boost conversion rates. Collaborate with the backend team via REST APIs.",
    "domain": "Web Development",
    "experience": "Intermediate",
    "workMode": "Remote",
    "skills": [
      "HTML",
      "CSS",
      "JavaScript",
      "UI/UX",
      "REST APIs"
    ],
    "postedDate": "2026-10-28",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$800/month",
      "openings": 2,
      "company": "ShopWave Inc."
    }
  },
  {
    "id": "proj-002",
    "title": "Personal Finance Tracker App",
    "description": "Build a mobile-first web app that lets users log income and expenses, visualize spending patterns with charts, and set monthly budgets. Great beginner-friendly project with real-world impact.",
    "domain": "Web Development",
    "experience": "Beginner",
    "workMode": "Remote",
    "skills": [
      "HTML",
      "CSS",
      "JavaScript",
      "Chart.js"
    ],
    "postedDate": "2026-10-27",
    "remote": true,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$400/month",
      "openings": 3,
      "company": "FinTrack Labs"
    }
  },
  {
    "id": "proj-003",
    "title": "Data Pipeline for E-Learning Analytics",
    "description": "Design and implement an ETL pipeline that collects learner activity data from an e-learning platform, processes it in batch, and loads it into a PostgreSQL warehouse for BI dashboards.",
    "domain": "Data Science",
    "experience": "Advanced",
    "workMode": "Hybrid",
    "skills": [
      "Python",
      "SQL",
      "ETL",
      "PostgreSQL",
      "Pandas"
    ],
    "postedDate": "2026-10-25",
    "remote": false,
    "beginner": false,
    "details": {
      "duration": "4 months",
      "stipend": "$1200/month",
      "openings": 1,
      "company": "EduMetrics Co."
    }
  },
  {
    "id": "proj-004",
    "title": "Design System & Component Library",
    "description": "Create a cohesive design system from scratch including a comprehensive component library with atoms, molecules, and organisms. Deliver Figma files and CSS/HTML reference implementations.",
    "domain": "UI/UX Design",
    "experience": "Intermediate",
    "workMode": "Remote",
    "skills": [
      "UI/UX",
      "Figma",
      "CSS",
      "HTML",
      "Design Systems"
    ],
    "postedDate": "2026-10-26",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$700/month",
      "openings": 2,
      "company": "PixelCraft Studio"
    }
  },
  {
    "id": "proj-005",
    "title": "Fitness Tracking iOS Application",
    "description": "Develop a native iOS app for workout logging, step counting, and progress visualization. Integrate HealthKit for biometric data. Requires Swift knowledge and familiarity with UIKit or SwiftUI.",
    "domain": "Mobile Development",
    "experience": "Intermediate",
    "workMode": "On-site",
    "skills": [
      "Swift",
      "iOS",
      "HealthKit",
      "UI/UX"
    ],
    "postedDate": "2026-10-22",
    "remote": false,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$900/month",
      "openings": 1,
      "company": "FitPulse Technologies"
    }
  },
  {
    "id": "proj-006",
    "title": "Social Media Content Calendar Tool",
    "description": "Build a web-based content planning tool for digital marketers. Features include drag-and-drop scheduling, multi-platform post management, hashtag suggestions, and analytics integration.",
    "domain": "Digital Marketing",
    "experience": "Beginner",
    "workMode": "Remote",
    "skills": [
      "HTML",
      "CSS",
      "JavaScript",
      "REST APIs"
    ],
    "postedDate": "2026-10-24",
    "remote": true,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$500/month",
      "openings": 4,
      "company": "SocialPulse Agency"
    }
  },
  {
    "id": "proj-007",
    "title": "Machine Learning Sentiment Analysis Dashboard",
    "description": "Train a sentiment analysis model on customer reviews using scikit-learn and NLTK, then build an interactive dashboard with Streamlit to visualize sentiment trends over time.",
    "domain": "Data Science",
    "experience": "Advanced",
    "workMode": "Remote",
    "skills": [
      "Python",
      "Machine Learning",
      "NLP",
      "Pandas",
      "Streamlit"
    ],
    "postedDate": "2026-10-20",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "4 months",
      "stipend": "$1100/month",
      "openings": 2,
      "company": "Insightful AI"
    }
  },
  {
    "id": "proj-008",
    "title": "Restaurant Booking & Menu Web App",
    "description": "Create a full-featured restaurant website with table reservation, dynamic menu display, and an admin panel for managing reservations and menu items. A great React project for intermediates.",
    "domain": "Web Development",
    "experience": "Intermediate",
    "workMode": "Hybrid",
    "skills": [
      "React",
      "JavaScript",
      "CSS",
      "REST APIs",
      "SQL"
    ],
    "postedDate": "2026-10-18",
    "remote": false,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$750/month",
      "openings": 2,
      "company": "TasteBud Ventures"
    }
  },
  {
    "id": "proj-009",
    "title": "UX Research & Usability Testing",
    "description": "Conduct comprehensive UX research for a SaaS product: user interviews, competitive analysis, heuristic evaluations, and moderated usability tests. Synthesize findings into actionable design recommendations.",
    "domain": "UI/UX Design",
    "experience": "Beginner",
    "workMode": "Remote",
    "skills": [
      "UI/UX",
      "User Research",
      "Figma",
      "Prototyping"
    ],
    "postedDate": "2026-10-29",
    "remote": true,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$450/month",
      "openings": 3,
      "company": "ClearPath UX"
    }
  },
  {
    "id": "proj-010",
    "title": "Cross-Platform Chat Application",
    "description": "Build a real-time chat application using React Native for iOS and Android. Implement WebSocket-based messaging, push notifications, read receipts, and media sharing capabilities.",
    "domain": "Mobile Development",
    "experience": "Advanced",
    "workMode": "Remote",
    "skills": [
      "React",
      "JavaScript",
      "WebSockets",
      "Mobile Dev",
      "REST APIs"
    ],
    "postedDate": "2026-10-15",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "4 months",
      "stipend": "$1000/month",
      "openings": 2,
      "company": "Connectly Inc."
    }
  },
  {
    "id": "proj-011",
    "title": "SEO Optimization & Content Strategy Audit",
    "description": "Perform a technical SEO audit for a growing startup's website. Identify on-page and off-page issues, develop keyword strategies, create content briefs, and implement structured data markup.",
    "domain": "Digital Marketing",
    "experience": "Intermediate",
    "workMode": "Remote",
    "skills": [
      "SEO",
      "Content Strategy",
      "Google Analytics",
      "HTML"
    ],
    "postedDate": "2026-10-21",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "2 months",
      "stipend": "$600/month",
      "openings": 2,
      "company": "RankBoost Digital"
    }
  },
  {
    "id": "proj-012",
    "title": "SQL Database Performance Optimization",
    "description": "Analyze and optimize a legacy MySQL database for a high-traffic web application. Tasks include query profiling, index tuning, normalization review, and implementing caching strategies with Redis.",
    "domain": "Data Science",
    "experience": "Advanced",
    "workMode": "On-site",
    "skills": [
      "SQL",
      "MySQL",
      "Redis",
      "Python",
      "Database Design"
    ],
    "postedDate": "2026-10-10",
    "remote": false,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$1050/month",
      "openings": 1,
      "company": "DataScale Systems"
    }
  },
  {
    "id": "proj-013",
    "title": "Beginner Portfolio Website Builder",
    "description": "Develop a drag-and-drop portfolio builder where users can select templates, customize colors and fonts, add project showcases, and publish their site. Perfect for beginner developers learning JavaScript.",
    "domain": "Web Development",
    "experience": "Beginner",
    "workMode": "Remote",
    "skills": [
      "HTML",
      "CSS",
      "JavaScript"
    ],
    "postedDate": "2026-10-30",
    "remote": true,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$350/month",
      "openings": 5,
      "company": "PortfolioPress"
    }
  },
  {
    "id": "proj-014",
    "title": "Healthcare Appointment Booking App",
    "description": "Build a Progressive Web App that enables patients to search for doctors, view availability calendars, book appointments, and receive SMS reminders. Focus on accessibility and HIPAA-friendly design.",
    "domain": "Web Development",
    "experience": "Intermediate",
    "workMode": "Hybrid",
    "skills": [
      "JavaScript",
      "React",
      "CSS",
      "REST APIs",
      "Accessibility"
    ],
    "postedDate": "2026-10-17",
    "remote": false,
    "beginner": false,
    "details": {
      "duration": "4 months",
      "stipend": "$850/month",
      "openings": 2,
      "company": "MedBook Solutions"
    }
  },
  {
    "id": "proj-015",
    "title": "Brand Identity & Marketing Campaign Design",
    "description": "Design a complete brand identity package — logo, color palette, typography, brand guidelines — and create digital marketing assets for social media, email newsletters, and paid ad campaigns.",
    "domain": "UI/UX Design",
    "experience": "Intermediate",
    "workMode": "On-site",
    "skills": [
      "UI/UX",
      "Figma",
      "Adobe Illustrator",
      "Branding",
      "Design Systems"
    ],
    "postedDate": "2026-10-23",
    "remote": false,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$800/month",
      "openings": 1,
      "company": "BrandCraft Agency"
    }
  },
  {
    "id": "proj-016",
    "title": "Email Marketing Automation Platform",
    "description": "Build and run automated email marketing campaigns using Mailchimp and custom HTML email templates. Track open rates, click-through rates, and A/B test subject lines to maximize engagement.",
    "domain": "Digital Marketing",
    "experience": "Beginner",
    "workMode": "Remote",
    "skills": [
      "HTML",
      "Email Marketing",
      "Copywriting",
      "Analytics"
    ],
    "postedDate": "2026-10-26",
    "remote": true,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$400/month",
      "openings": 3,
      "company": "InboxFirst Agency"
    }
  },
  {
    "id": "proj-017",
    "title": "React Native Expense Manager",
    "description": "Create a cross-platform mobile expense management app with category tagging, receipt photo capture, monthly summaries, and CSV export. Uses Redux for state management and SQLite for local storage.",
    "domain": "Mobile Development",
    "experience": "Intermediate",
    "workMode": "Remote",
    "skills": [
      "React",
      "JavaScript",
      "SQL",
      "Mobile Dev",
      "Redux"
    ],
    "postedDate": "2026-10-14",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "3 months",
      "stipend": "$850/month",
      "openings": 2,
      "company": "SpendSmart Labs"
    }
  },
  {
    "id": "proj-018",
    "title": "Open Source Contribution Dashboard",
    "description": "Build a developer productivity dashboard that aggregates GitHub activity — PRs, issues, commits — using the GitHub API. Display contribution graphs, streak tracking, and repository health metrics.",
    "domain": "Web Development",
    "experience": "Beginner",
    "workMode": "Remote",
    "skills": [
      "JavaScript",
      "HTML",
      "CSS",
      "REST APIs",
      "GitHub API"
    ],
    "postedDate": "2026-10-29",
    "remote": true,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$450/month",
      "openings": 4,
      "company": "DevPulse Community"
    }
  },
  {
    "id": "proj-019",
    "title": "Predictive Customer Churn Model",
    "description": "Develop a machine learning model to predict customer churn for a subscription SaaS company. Use Python, scikit-learn, and feature engineering on CRM data. Deliver an interactive report with SHAP explanations.",
    "domain": "Data Science",
    "experience": "Advanced",
    "workMode": "Remote",
    "skills": [
      "Python",
      "Machine Learning",
      "SQL",
      "Pandas",
      "Data Visualization"
    ],
    "postedDate": "2026-10-12",
    "remote": true,
    "beginner": false,
    "details": {
      "duration": "4 months",
      "stipend": "$1300/month",
      "openings": 1,
      "company": "RetainIQ Analytics"
    }
  },
  {
    "id": "proj-020",
    "title": "Accessibility Audit & Remediation",
    "description": "Evaluate a government web portal against WCAG 2.1 AA standards. Document all violations, prioritize fixes, implement remediation in HTML/CSS, and produce a detailed accessibility conformance report.",
    "domain": "UI/UX Design",
    "experience": "Beginner",
    "workMode": "On-site",
    "skills": [
      "HTML",
      "CSS",
      "UI/UX",
      "Accessibility",
      "WCAG"
    ],
    "postedDate": "2026-10-16",
    "remote": false,
    "beginner": true,
    "details": {
      "duration": "2 months",
      "stipend": "$500/month",
      "openings": 2,
      "company": "GovTech Solutions"
    }
  }
];

async function loadListings() {
  showLoadingState();

  try {
    const response = await fetch('./data/listings.json');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const raw = await response.json();

    if (!validateDataset(raw)) {
      throw new Error('Dataset failed schema validation');
    }

    State.allListings = raw;
    return true;

  } catch (err) {
    // When opened directly as a file:// URL in browsers, fetch() is blocked by browser CORS policy.
    // Gracefully fallback to the bundled dataset so everything works out of the box even without a server.
    console.warn('[ProjectHub] Fetch from ./data/listings.json blocked (' + err.message + '). Using bundled dataset.');
    if (typeof FALLBACK_DATASET !== 'undefined' && Array.isArray(FALLBACK_DATASET) && FALLBACK_DATASET.length > 0) {
      const copy = JSON.parse(JSON.stringify(FALLBACK_DATASET));
      if (validateDataset(copy)) {
        State.allListings = copy;
        return true;
      }
    }
    return false;
  }
}

/* ============================================================
   4. DATASET VALIDATION
   ============================================================ */
function validateDataset(data) {
  if (!Array.isArray(data)) return false;
  if (data.length === 0)    return false;

  const REQUIRED = ['id', 'title', 'description', 'domain', 'experience', 'workMode', 'skills', 'postedDate'];

  const valid = data.filter((item, i) => {
    if (typeof item !== 'object' || item === null) {
      console.warn(`[ProjectHub] Skipping record at index ${i}: not an object`);
      return false;
    }
    for (const field of REQUIRED) {
      if (item[field] === undefined || item[field] === null) {
        console.warn(`[ProjectHub] Skipping record "${item.id ?? i}": missing field "${field}"`);
        return false;
      }
    }
    if (!Array.isArray(item.skills)) {
      console.warn(`[ProjectHub] Skipping record "${item.id}": skills must be an array`);
      return false;
    }
    return true;
  });

  data.splice(0, data.length, ...valid);
  return valid.length > 0;
}

/* ============================================================
   5. RENDERING UTILITIES
   ============================================================ */

/** Escapes HTML special characters to prevent XSS. */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/** Returns domain badge HTML */
function getDomainBadge(domain) {
  const map = {
    'Web Development':    { cls: 'badge--web',       label: 'Web Dev' },
    'UI/UX Design':       { cls: 'badge--uiux',      label: 'UI/UX' },
    'Data Science':       { cls: 'badge--data',      label: 'Data Science' },
    'Mobile Development': { cls: 'badge--mobile',    label: 'Mobile' },
    'Digital Marketing':  { cls: 'badge--marketing', label: 'Marketing' },
  };
  const { cls = '', label = domain } = map[domain] || {};
  const icons = {
    'Web Development':    `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><circle cx="5" cy="5" r="4" stroke="currentColor" stroke-width="1.25"/><path d="M5 1c-1 0-2 1.8-2 4s1 4 2 4M5 1c1 0 2 1.8 2 4s-1 4-2 4M1 5h8" stroke="currentColor" stroke-width="1"/></svg>`,
    'UI/UX Design':       `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><rect x="1" y="1" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.25"/><circle cx="5" cy="5" r="1.5" fill="currentColor"/></svg>`,
    'Data Science':       `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 8L4 5l2 2 2-4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    'Mobile Development': `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><rect x="2.5" y="0.5" width="5" height="9" rx="1.5" stroke="currentColor" stroke-width="1.25"/><circle cx="5" cy="8" r="0.75" fill="currentColor"/></svg>`,
    'Digital Marketing':  `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 7V4l4-3v9L1 7z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M5 4h3l1 3H5" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg>`,
  };
  return `<span class="badge ${cls}" title="${escapeHTML(domain)}">${icons[domain] ?? ''}${escapeHTML(label)}</span>`;
}

/** Returns experience badge HTML */
function getExperienceBadge(level) {
  const map = {
    'Beginner':     { cls: 'badge--beginner',     icon: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M5 1l1.2 3.3H9.5l-2.7 2 1 3.2L5 7.5l-2.8 2 1-3.2-2.7-2H3.8L5 1Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>` },
    'Intermediate': { cls: 'badge--intermediate', icon: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 7h2V4H1v3zM4 7h2V2H4v5zM7 7h2V5H7v2z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>` },
    'Advanced':     { cls: 'badge--advanced',     icon: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M5 1l1.5 3h3l-2.5 2 1 3L5 7.5 2 9l1-3L.5 4h3L5 1Z" fill="currentColor" opacity="0.5"/><path d="M5 1l1.5 3h3l-2.5 2 1 3L5 7.5 2 9l1-3L.5 4h3L5 1Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>` },
  };
  const { cls = '', icon = '' } = map[level] || {};
  return `<span class="badge ${cls}">${icon}${escapeHTML(level)}</span>`;
}

/** Returns work-mode badge HTML */
function getWorkModeBadge(mode) {
  const map = {
    'Remote':  { cls: 'badge--remote', icon: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><rect x="1" y="6" width="8" height="3.5" rx="1" stroke="currentColor" stroke-width="1.25"/><path d="M3.5 6V4.5a1.5 1.5 0 0 1 3 0V6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><circle cx="5" cy="7.75" r=".65" fill="currentColor"/></svg>` },
    'Hybrid':  { cls: 'badge--hybrid', icon: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M1 5a4 4 0 1 0 8 0A4 4 0 0 0 1 5Z" stroke="currentColor" stroke-width="1.25"/><path d="M5 3v2l1.5 1.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>` },
    'On-site': { cls: 'badge--onsite', icon: `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M5 1a3 3 0 0 1 3 3c0 2-3 5-3 5S2 6 2 4a3 3 0 0 1 3-3Z" stroke="currentColor" stroke-width="1.25"/><circle cx="5" cy="4" r="1" fill="currentColor"/></svg>` },
  };
  const { cls = '', icon = '' } = map[mode] || {};
  return `<span class="badge ${cls}">${icon}${escapeHTML(mode)}</span>`;
}

/**
 * Formats an ISO date string into a human-readable label.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  try {
    const date     = new Date(dateStr + 'T00:00:00');
    const now      = new Date();
    const diffDays = Math.floor((now - date) / 86_400_000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7)  return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Wraps search term matches in <mark> for visual highlighting.
 * XSS-safe: escapes before injecting regex matches.
 */
function highlightText(text, query) {
  if (!query) return escapeHTML(text);

  const firstTerm = query.split(/\s+/)[0];
  if (!firstTerm) return escapeHTML(text);

  const escaped = firstTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex   = new RegExp(`(${escaped})`, 'gi');

  return escapeHTML(text).replace(
    regex,
    '<mark style="background:#FEF08A;border-radius:3px;padding:0 2px;font-weight:inherit">$1</mark>'
  );
}

/* ============================================================
   6. STATS SECTION
   ============================================================ */
function renderStats() {
  const listings = State.allListings;
  animateCount(DOM.statTotal,    listings.length);
  animateCount(DOM.statDomains,  new Set(listings.map(l => l.domain)).size);
  animateCount(DOM.statRemote,   listings.filter(l => l.remote === true).length);
  animateCount(DOM.statBeginner, listings.filter(l => l.beginner === true).length);

  // Update tab count
  if (DOM.tabExploreCount) DOM.tabExploreCount.textContent = listings.length;
}

function animateCount(el, target, duration = 900) {
  if (!el) return;

  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(step);
    else              el.textContent = target;
  }
  requestAnimationFrame(step);
}

/* ============================================================
   7. SKILLS FILTER POPULATION
   ============================================================ */
function populateSkillsFilter() {
  const PRIORITY = ['JavaScript', 'HTML', 'CSS', 'React', 'Python', 'SQL', 'UI/UX'];
  const allSkills = new Set();

  State.allListings.forEach(listing =>
    listing.skills.forEach(skill => allSkills.add(skill))
  );

  const extras   = [...allSkills]
    .filter(s => !PRIORITY.includes(s))
    .sort((a, b) => a.localeCompare(b));

  const finalList = [
    ...PRIORITY.filter(s => allSkills.has(s)),
    ...extras,
  ];

  DOM.skillsOptions.innerHTML = finalList.map(skill => `
    <label class="filter-checkbox">
      <input
        type="checkbox"
        name="skills"
        value="${escapeHTML(skill)}"
        class="filter-checkbox__input"
        aria-label="Filter by skill: ${escapeHTML(skill)}"
      />
      <span class="filter-checkbox__custom" aria-hidden="true"></span>
      <span class="filter-checkbox__label">${escapeHTML(skill)}</span>
    </label>
  `).join('');

  DOM.skillsOptions
    .querySelectorAll('input[type="checkbox"]')
    .forEach(cb => cb.addEventListener('change', handleFilterChange));
}

/* ============================================================
   8. ★ CORE — updateResults()
   ============================================================ */
function updateResults({ resetPage = true } = {}) {
  const { domain, experience, workMode, skills } = State.activeFilters;
  const query = State.searchQuery;

  let result = State.allListings.filter(listing => {
    if (domain.size > 0 && !domain.has(listing.domain)) return false;
    if (experience.size > 0 && !experience.has(listing.experience)) return false;
    if (workMode.size > 0 && !workMode.has(listing.workMode)) return false;

    if (skills.size > 0) {
      const listingSkillsLower = new Set(listing.skills.map(s => s.toLowerCase()));
      for (const skill of skills) {
        if (!listingSkillsLower.has(skill.toLowerCase())) return false;
      }
    }

    if (query) {
      const haystack = [
        listing.title,
        listing.description,
        listing.domain,
        listing.experience,
        listing.workMode,
        ...(Array.isArray(listing.skills) ? listing.skills : []),
      ].join(' ').toLowerCase();

      const terms = query.split(/\s+/).filter(Boolean);
      if (!terms.every(term => haystack.includes(term))) return false;
    }

    return true;
  });

  result = sortListings(result);
  State.filteredListings = result;

  if (resetPage) State.currentPage = 1;

  State.totalPages = Math.max(1, Math.ceil(result.length / State.PAGE_SIZE));
  if (State.currentPage > State.totalPages) State.currentPage = State.totalPages;

  // Micro-animation: brief flash on grid update
  triggerGridUpdateAnimation(DOM.listingsGrid);

  renderCards();
  renderPagination();
  updateResultsCount(result.length);
  updateFilterChips();
  updateActiveFilterCount();
}

/* ============================================================
   9. FILTER LOGIC
   ============================================================ */
function handleFilterChange(e) {
  const { name, value, checked } = e.target;
  const filterSet = State.activeFilters[name];
  if (!filterSet) return;

  checked ? filterSet.add(value) : filterSet.delete(value);
  updateResults({ resetPage: true });
}

function attachFilterListeners() {
  document
    .querySelectorAll('input[name="domain"], input[name="experience"], input[name="workMode"]')
    .forEach(cb => cb.addEventListener('change', handleFilterChange));
}

function resetAllFilters() {
  Object.keys(State.activeFilters).forEach(key => {
    State.activeFilters[key].clear();
  });

  document.querySelectorAll('.filter-checkbox__input').forEach(cb => {
    cb.checked = false;
  });

  updateResults({ resetPage: true });
}

/* ============================================================
   10. SEARCH LOGIC
   ============================================================ */
function debounce(fn, delay) {
  let timerId;
  return function debounced(...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}

function handleSearchInput() {
  State.searchQuery = DOM.searchInput.value.trim().toLowerCase();
  DOM.searchClearBtn.hidden = (State.searchQuery === '');
  updateResults({ resetPage: true });
}

function clearSearch() {
  DOM.searchInput.value   = '';
  State.searchQuery       = '';
  DOM.searchClearBtn.hidden = true;
  DOM.searchInput.focus();
  updateResults({ resetPage: true });
}

/* ============================================================
   11. SORT LOGIC
   ============================================================ */
function sortListings(listings) {
  const arr = [...listings];
  switch (State.sortMode) {
    case 'alpha':
      return arr.sort((a, b) => a.title.localeCompare(b.title));
    case 'newest':
    default:
      return arr.sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
  }
}

function handleSortChange() {
  State.sortMode = DOM.sortSelect.value;
  updateResults({ resetPage: true });
}

/* ============================================================
   12. ★ PAGINATION ENGINE (Explore)
   ============================================================ */
function getPageSlice() {
  const start = (State.currentPage - 1) * State.PAGE_SIZE;
  const end   = start + State.PAGE_SIZE;
  return State.filteredListings.slice(start, end);
}

function renderPagination() {
  const total = State.filteredListings.length;
  const { currentPage, totalPages, PAGE_SIZE } = State;

  if (totalPages <= 1) {
    DOM.pagination.hidden = true;
    return;
  }

  DOM.pagination.hidden = false;

  const start = (currentPage - 1) * PAGE_SIZE + 1;
  const end   = Math.min(currentPage * PAGE_SIZE, total);
  DOM.paginationInfo.textContent = `Showing ${start}–${end} of ${total} project${total !== 1 ? 's' : ''}`;

  DOM.paginationPrev.disabled = (currentPage === 1);
  DOM.paginationNext.disabled = (currentPage === totalPages);

  const pages = buildPageRange(currentPage, totalPages);
  DOM.paginationPages.innerHTML = pages.map(p => {
    if (p === '…') return `<span class="pagination__ellipsis" aria-hidden="true">…</span>`;
    const isCurrent = p === currentPage;
    return `
      <button
        class="pagination__page${isCurrent ? ' pagination__page--active' : ''}"
        data-page="${p}"
        role="listitem"
        aria-label="Page ${p}${isCurrent ? ', current page' : ''}"
        ${isCurrent ? 'aria-current="page"' : ''}
      >${p}</button>
    `;
  }).join('');

  DOM.paginationPages.querySelectorAll('.pagination__page').forEach(btn => {
    btn.addEventListener('click', () => goToPage(Number(btn.dataset.page)));
  });
}

function buildPageRange(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const WINDOW = 1;
  const pages  = new Set([1, total]);

  for (let p = current - WINDOW; p <= current + WINDOW; p++) {
    if (p >= 1 && p <= total) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('…');
    result.push(sorted[i]);
  }

  return result;
}

function goToPage(page) {
  if (page < 1 || page > State.totalPages || page === State.currentPage) return;
  State.currentPage = page;
  renderCards();
  renderPagination();
  scrollToListings();
}

function initPaginationButtons() {
  DOM.paginationPrev?.addEventListener('click', () => goToPage(State.currentPage - 1));
  DOM.paginationNext?.addEventListener('click', () => goToPage(State.currentPage + 1));
}

function scrollToListings() {
  const section = document.getElementById('listings');
  if (section) {
    const top = section.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

/* ============================================================
   13. CARD RENDERING
   ============================================================ */
let cardObserver = null;

function initCardObserver() {
  if (!('IntersectionObserver' in window)) return;

  cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const card     = entry.target;
      const siblings = Array.from(card.parentElement?.children ?? []);
      const idx      = siblings.indexOf(card);

      card.style.animationDelay = `${Math.min(idx * 55, 280)}ms`;
      card.classList.add('is-visible');
      cardObserver.unobserve(card);
    });
  }, { threshold: 0.06 });
}

function renderCards() {
  const grid = DOM.listingsGrid;

  // Remove previous real cards
  grid.querySelectorAll('.listing-card').forEach(c => c.remove());

  const pageSlice = getPageSlice();
  const isEmpty   = pageSlice.length === 0;

  DOM.listingsEmpty.hidden = !isEmpty;
  DOM.listingsError.hidden = true;
  grid.setAttribute('aria-busy', 'false');

  if (isEmpty) return;

  const fragment = document.createDocumentFragment();

  pageSlice.forEach(listing => {
    const wrapper     = document.createElement('div');
    wrapper.innerHTML = createCardHTML(listing);
    const card        = wrapper.firstElementChild;
    fragment.appendChild(card);
  });

  grid.appendChild(fragment);

  if (cardObserver) {
    grid.querySelectorAll('.listing-card').forEach(card => cardObserver.observe(card));
  } else {
    grid.querySelectorAll('.listing-card').forEach(card => card.classList.add('is-visible'));
  }

  attachCardListeners();
}

/**
 * Builds the HTML string for a single listing card.
 * @param {Object} listing
 * @param {boolean} [inSavedView=false]
 * @returns {string}
 */
function createCardHTML(listing, inSavedView = false) {
  const isSaved   = State.savedIds.has(listing.id);
  const bkmClass  = isSaved ? 'listing-card__bookmark is-saved' : 'listing-card__bookmark';
  const bkmTitle  = isSaved ? 'Remove bookmark' : 'Save listing';
  const bkmFill   = isSaved ? 'fill="currentColor"' : '';

  // Limit skill tags to keep card layout clean
  const MAX_SKILLS = 4;
  const skills     = listing.skills ?? [];
  const visSkills  = skills.slice(0, MAX_SKILLS);
  const moreCount  = skills.length - MAX_SKILLS;

  const skillsHTML = visSkills
    .map(skill => `<span class="skill-tag">${escapeHTML(skill)}</span>`)
    .join('') + (moreCount > 0
      ? `<span class="skill-tag" style="opacity:0.7">+${moreCount}</span>`
      : '');

  const titleHTML = highlightText(listing.title, State.searchQuery);
  const cardClass = `listing-card${isSaved ? ' is-saved-card' : ''}${inSavedView ? ' saved-view-card' : ''}`;

  return `
    <article
      class="${cardClass}"
      role="listitem"
      data-id="${escapeHTML(listing.id)}"
      aria-label="Project: ${escapeHTML(listing.title)}"
    >
      <div class="listing-card__header">
        <div class="listing-card__header-left">
          <div class="listing-card__badges">${getDomainBadge(listing.domain)}</div>
          <h3 class="listing-card__title">${titleHTML}</h3>
        </div>
        <button
          class="${bkmClass}"
          data-id="${escapeHTML(listing.id)}"
          aria-label="${bkmTitle}"
          title="${bkmTitle}"
          aria-pressed="${isSaved}"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 2h8a1 1 0 0 1 1 1v10.5l-5-3-5 3V3a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linejoin="round"
              ${bkmFill}
            />
          </svg>
        </button>
      </div>

      <p class="listing-card__description">${escapeHTML(listing.description)}</p>

      <div class="listing-card__badges">
        ${getExperienceBadge(listing.experience)}
        ${getWorkModeBadge(listing.workMode)}
      </div>

      <div class="listing-card__skills" aria-label="Required skills">
        ${skillsHTML}
      </div>

      <div class="listing-card__footer">
        <span class="listing-card__date" aria-label="Posted ${formatDate(listing.postedDate)}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
            <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
          </svg>
          ${formatDate(listing.postedDate)}
        </span>
        <button
          class="listing-card__view-btn"
          data-id="${escapeHTML(listing.id)}"
          aria-label="View details for ${escapeHTML(listing.title)}"
        >View Details</button>
      </div>
    </article>
  `;
}

function attachCardListeners(container) {
  const grid = container || DOM.listingsGrid;

  grid.querySelectorAll('.listing-card__bookmark').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleBookmark(e.currentTarget.dataset.id, e.currentTarget);
    });
  });

  grid.querySelectorAll('.listing-card__view-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openModal(e.currentTarget.dataset.id);
    });
  });
}

function updateResultsCount(count) {
  const text = count === 1 ? '1 result' : `${count} results`;
  if (DOM.resultsCount)      DOM.resultsCount.textContent      = text;
  if (DOM.mobileResultsText) DOM.mobileResultsText.textContent = text;
}

/** Triggers a brief opacity pulse on the grid to signal a data update. */
function triggerGridUpdateAnimation(grid) {
  if (!grid) return;
  grid.classList.remove('listings__grid--updating');
  // Force reflow to restart animation
  void grid.offsetWidth;
  grid.classList.add('listings__grid--updating');
  grid.addEventListener('animationend', () => {
    grid.classList.remove('listings__grid--updating');
  }, { once: true });
}

/* ============================================================
   14. ACTIVE FILTER CHIPS
   ============================================================ */
function updateFilterChips() {
  const chips = [];
  for (const [key, set] of Object.entries(State.activeFilters)) {
    set.forEach(value => chips.push({ key, value }));
  }

  if (chips.length === 0) {
    DOM.filterChips.hidden = true;
    DOM.filterChips.innerHTML = '';
    return;
  }

  DOM.filterChips.hidden = false;
  DOM.filterChips.innerHTML = chips.map(({ key, value }) => `
    <span class="filter-chip">
      ${escapeHTML(value)}
      <button
        class="filter-chip__remove"
        data-key="${escapeHTML(key)}"
        data-value="${escapeHTML(value)}"
        aria-label="Remove ${escapeHTML(key)} filter: ${escapeHTML(value)}"
        title="Remove filter"
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </button>
    </span>
  `).join('');

  DOM.filterChips.querySelectorAll('.filter-chip__remove').forEach(btn => {
    btn.addEventListener('click', () => removeFilter(btn.dataset.key, btn.dataset.value));
  });
}

function removeFilter(key, value) {
  State.activeFilters[key]?.delete(value);

  const selector = `.filter-checkbox__input[name="${CSS.escape(key)}"][value="${CSS.escape(value)}"]`;
  const cb = document.querySelector(selector);
  if (cb) cb.checked = false;

  updateResults({ resetPage: true });
}

function updateActiveFilterCount() {
  const total = Object.values(State.activeFilters)
    .reduce((sum, set) => sum + set.size, 0);

  DOM.activeFilterCount.textContent = total;
  DOM.activeFilterCount.hidden      = total === 0;
}

/* ============================================================
   15. BOOKMARKS (localStorage) — Phase 3 Enhanced
   ============================================================ */
const SAVED_KEY       = 'projecthub_saved';
const SAVED_ORDER_KEY = 'projecthub_saved_order';

function loadSavedIds() {
  try {
    const raw   = localStorage.getItem(SAVED_KEY);
    const order = localStorage.getItem(SAVED_ORDER_KEY);
    if (raw) State.savedIds   = new Set(JSON.parse(raw));
    if (order) State.savedOrder = JSON.parse(order);
  } catch {
    State.savedIds   = new Set();
    State.savedOrder = [];
  }
}

function persistSavedIds() {
  try {
    localStorage.setItem(SAVED_KEY,       JSON.stringify([...State.savedIds]));
    localStorage.setItem(SAVED_ORDER_KEY, JSON.stringify(State.savedOrder));
  } catch (e) {
    console.warn('[ProjectHub] localStorage write failed:', e);
  }
}

/**
 * Toggles bookmark state with enhanced Phase 3 micro-interactions.
 * @param {string} id
 * @param {HTMLButtonElement} btn
 */
function toggleBookmark(id, btn) {
  const nowSaved = !State.savedIds.has(id);

  if (nowSaved) {
    State.savedIds.add(id);
    if (!State.savedOrder.includes(id)) State.savedOrder.push(id);
    btn.classList.add('is-saved');
    btn.setAttribute('aria-label', 'Remove bookmark');
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('title', 'Remove bookmark');
    btn.querySelector('path').setAttribute('fill', 'currentColor');
    // Update card saved class
    btn.closest('.listing-card')?.classList.add('is-saved-card');
  } else {
    State.savedIds.delete(id);
    State.savedOrder = State.savedOrder.filter(sid => sid !== id);
    btn.classList.remove('is-saved');
    btn.setAttribute('aria-label', 'Save listing');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('title', 'Save listing');
    btn.querySelector('path').removeAttribute('fill');
    btn.closest('.listing-card')?.classList.remove('is-saved-card');
  }

  persistSavedIds();

  // Announce to screen readers
  announce(nowSaved ? 'Project saved to bookmarks' : 'Project removed from bookmarks');

  // CSS animation via class toggle (Web Animations API fallback)
  btn.classList.remove('animate-pop');
  void btn.offsetWidth; // force reflow
  btn.classList.add('animate-pop');
  btn.addEventListener('animationend', () => btn.classList.remove('animate-pop'), { once: true });

  // Update saved count badges
  updateSavedCountBadges();

  // If we're in saved view, re-render it
  if (State.currentView === 'saved') {
    renderSavedView();
  }
}

function updateSavedCountBadges() {
  const count = State.savedIds.size;
  const countStr = String(count);

  if (DOM.tabSavedCount)  DOM.tabSavedCount.textContent  = countStr;
  if (DOM.navSavedCount) {
    DOM.navSavedCount.textContent = count > 0 ? countStr : '';
    DOM.navSavedCount.setAttribute('data-count', countStr);
  }
  const profileModalSaved = document.getElementById('profile-modal-saved-count');
  if (profileModalSaved) profileModalSaved.textContent = `${count} Project${count === 1 ? '' : 's'}`;
  const profileModalSavedBtn = document.getElementById('profile-modal-saved-btn-count');
  if (profileModalSavedBtn) profileModalSavedBtn.textContent = countStr;
}

/* ============================================================
   16. ★ SAVED PROJECTS VIEW — Phase 3
   ============================================================ */

/**
 * Returns saved listings sorted according to savedSortMode.
 */
function getSortedSavedListings() {
  const saved = State.allListings.filter(l => State.savedIds.has(l.id));

  switch (State.savedSortMode) {
    case 'alpha':
      return [...saved].sort((a, b) => a.title.localeCompare(b.title));
    case 'newest':
      return [...saved].sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));
    case 'saved-order':
    default: {
      // Sort by position in savedOrder array
      return [...saved].sort((a, b) => {
        const ai = State.savedOrder.indexOf(a.id);
        const bi = State.savedOrder.indexOf(b.id);
        return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
      });
    }
  }
}

/**
 * Renders the Saved Projects view: grid, empty state, pagination.
 */
function renderSavedView() {
  const sorted = getSortedSavedListings();
  const total  = sorted.length;
  const PAGE   = State.PAGE_SIZE;

  State.savedTotalPages  = Math.max(1, Math.ceil(total / PAGE));
  if (State.savedCurrentPage > State.savedTotalPages) {
    State.savedCurrentPage = State.savedTotalPages;
  }

  const start = (State.savedCurrentPage - 1) * PAGE;
  const slice = sorted.slice(start, start + PAGE);

  // Clear previous cards
  DOM.savedGrid.querySelectorAll('.listing-card').forEach(c => c.remove());

  // Empty state
  if (total === 0) {
    DOM.savedEmpty.hidden    = false;
    DOM.savedPagination.hidden = true;
    return;
  }

  DOM.savedEmpty.hidden = true;

  // Build cards
  const fragment = document.createDocumentFragment();
  slice.forEach(listing => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = createCardHTML(listing, true);
    const card = wrapper.firstElementChild;
    // Cards in saved view appear immediately (no IntersectionObserver needed)
    card.classList.add('is-visible');
    fragment.appendChild(card);
  });

  DOM.savedGrid.appendChild(fragment);
  attachCardListeners(DOM.savedGrid);

  // Pagination
  if (State.savedTotalPages <= 1) {
    DOM.savedPagination.hidden = true;
  } else {
    DOM.savedPagination.hidden = false;

    const end = Math.min(start + PAGE, total);
    DOM.savedPaginationInfo.textContent = `Showing ${start + 1}–${end} of ${total} saved project${total !== 1 ? 's' : ''}`;

    DOM.savedPrevBtn.disabled = (State.savedCurrentPage === 1);
    DOM.savedNextBtn.disabled = (State.savedCurrentPage === State.savedTotalPages);

    const pages = buildPageRange(State.savedCurrentPage, State.savedTotalPages);
    DOM.savedPaginationPages.innerHTML = pages.map(p => {
      if (p === '…') return `<span class="pagination__ellipsis" aria-hidden="true">…</span>`;
      const isCurrent = p === State.savedCurrentPage;
      return `
        <button
          class="pagination__page${isCurrent ? ' pagination__page--active' : ''}"
          data-page="${p}"
          role="listitem"
          aria-label="Saved page ${p}${isCurrent ? ', current' : ''}"
          ${isCurrent ? 'aria-current="page"' : ''}
        >${p}</button>
      `;
    }).join('');

    DOM.savedPaginationPages.querySelectorAll('.pagination__page').forEach(btn => {
      btn.addEventListener('click', () => {
        State.savedCurrentPage = Number(btn.dataset.page);
        renderSavedView();
        DOM.savedGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }
}

function initSavedView() {
  // Sort change
  DOM.savedSortSelect?.addEventListener('change', () => {
    State.savedSortMode  = DOM.savedSortSelect.value;
    State.savedCurrentPage = 1;
    renderSavedView();
  });

  // Prev / Next
  DOM.savedPrevBtn?.addEventListener('click', () => {
    if (State.savedCurrentPage > 1) {
      State.savedCurrentPage--;
      renderSavedView();
    }
  });
  DOM.savedNextBtn?.addEventListener('click', () => {
    if (State.savedCurrentPage < State.savedTotalPages) {
      State.savedCurrentPage++;
      renderSavedView();
    }
  });

  // Clear all saved
  DOM.clearAllSavedBtn?.addEventListener('click', () => {
    if (!State.savedIds.size) return;
    if (confirm('Remove all saved projects? This cannot be undone.')) {
      State.savedIds.clear();
      State.savedOrder = [];
      persistSavedIds();
      // Update all visible bookmark buttons
      document.querySelectorAll('.listing-card__bookmark.is-saved').forEach(btn => {
        btn.classList.remove('is-saved');
        btn.setAttribute('aria-label', 'Save listing');
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('title', 'Save listing');
        btn.querySelector('path')?.removeAttribute('fill');
        btn.closest('.listing-card')?.classList.remove('is-saved-card');
      });
      updateSavedCountBadges();
      renderSavedView();
    }
  });

  // Explore from saved empty state
  DOM.exploreFromSavedBtn?.addEventListener('click', () => switchView('explore'));
}

/* ============================================================
   17. MODAL (View Details) — Phase 3 Enhanced
   ============================================================ */
function openModal(id) {
  const listing = State.allListings.find(l => l.id === id);
  if (!listing) return;

  const isSaved  = State.savedIds.has(id);
  const bkmLabel = isSaved ? '★ Saved' : '☆ Save Listing';
  const bkmClass = isSaved ? 'btn btn--ghost btn--saved' : 'btn btn--ghost';

  const detailsHTML = listing.details ? `
    <div class="modal__detail-item">
      <p class="modal__detail-label">Company</p>
      <p class="modal__detail-value">${escapeHTML(listing.details.company || '—')}</p>
    </div>
    <div class="modal__detail-item">
      <p class="modal__detail-label">Duration</p>
      <p class="modal__detail-value">${escapeHTML(listing.details.duration || '—')}</p>
    </div>
    <div class="modal__detail-item">
      <p class="modal__detail-label">Stipend</p>
      <p class="modal__detail-value">${escapeHTML(listing.details.stipend || '—')}</p>
    </div>
    <div class="modal__detail-item">
      <p class="modal__detail-label">Openings</p>
      <p class="modal__detail-value">${escapeHTML(String(listing.details.openings ?? '—'))}</p>
    </div>
  ` : '';

  DOM.modalContent.innerHTML = `
    <div class="modal__header-band">
      <button class="modal__close" id="modal-close-band-btn" aria-label="Close details" title="Close">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
      <div class="modal__badge-row">
        ${getDomainBadge(listing.domain)}
        ${getExperienceBadge(listing.experience)}
        ${getWorkModeBadge(listing.workMode)}
      </div>
      <h2 class="modal__title" id="modal-title">${escapeHTML(listing.title)}</h2>
    </div>

    <div class="modal__body">
      <p class="modal__description">${escapeHTML(listing.description)}</p>

      <p class="modal__section-title">Project Details</p>
      <div class="modal__details">
        ${detailsHTML}
        <div class="modal__detail-item">
          <p class="modal__detail-label">Posted</p>
          <p class="modal__detail-value">${formatDate(listing.postedDate)}</p>
        </div>
        <div class="modal__detail-item">
          <p class="modal__detail-label">Work Mode</p>
          <p class="modal__detail-value">${escapeHTML(listing.workMode)}</p>
        </div>
      </div>

      <p class="modal__section-title">Required Skills</p>
      <div class="modal__skills">
        ${(listing.skills ?? []).map(s => `<span class="skill-tag">${escapeHTML(s)}</span>`).join('')}
      </div>
    </div>

    <div class="modal__actions">
      <button
        class="btn btn--primary"
        id="modal-apply-btn"
        aria-label="Apply for ${escapeHTML(listing.title)}"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M2 7l4 4L12 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Apply Now
      </button>
      <button
        class="${bkmClass}"
        id="modal-bookmark-btn"
        data-id="${escapeHTML(id)}"
        aria-label="${isSaved ? 'Remove Bookmark' : 'Save Listing'}"
        aria-pressed="${isSaved}"
      >${bkmLabel}</button>
      <button
        type="button"
        class="btn btn--ghost"
        id="modal-cancel-btn"
        aria-label="Close dialog"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
        </svg>
        Close
      </button>
    </div>
  `;

  // Close / Cancel button handlers
  document.getElementById('modal-cancel-btn')?.addEventListener('click', closeModal);
  document.getElementById('modal-close-band-btn')?.addEventListener('click', closeModal);

  // Apply Now placeholder — shows an accessible inline toast instead of alert()
  document.getElementById('modal-apply-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('modal-apply-btn');
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.textContent = '✓ Application sent!';
    btn.disabled = true;
    btn.style.background = '#16A34A';
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled  = false;
      btn.style.background = '';
    }, 2500);
    announce('Application submitted! This feature will be fully implemented soon.');
  });

  // Modal bookmark button
  document.getElementById('modal-bookmark-btn')?.addEventListener('click', (e) => {
    const modalBtn = e.currentTarget;
    const cardBtn  = DOM.listingsGrid.querySelector(
      `.listing-card__bookmark[data-id="${CSS.escape(id)}"]`
    );

    if (cardBtn) {
      toggleBookmark(id, cardBtn);
    } else {
      const nowSaved = !State.savedIds.has(id);
      if (nowSaved) {
        State.savedIds.add(id);
        if (!State.savedOrder.includes(id)) State.savedOrder.push(id);
      } else {
        State.savedIds.delete(id);
        State.savedOrder = State.savedOrder.filter(sid => sid !== id);
      }
      persistSavedIds();
      updateSavedCountBadges();
      announce(nowSaved ? 'Project saved to bookmarks' : 'Project removed from bookmarks');
    }

    const nowSaved  = State.savedIds.has(id);
    modalBtn.textContent = nowSaved ? '★ Saved' : '☆ Save Listing';
    modalBtn.setAttribute('aria-pressed', String(nowSaved));
    modalBtn.setAttribute('aria-label', nowSaved ? 'Remove Bookmark' : 'Save Listing');
    modalBtn.className = nowSaved ? 'btn btn--ghost btn--saved' : 'btn btn--ghost';
  });

  DOM.modalOverlay.hidden = false;
  DOM.modalOverlay.removeAttribute('aria-hidden');
  DOM.modalOverlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';

  // Always reset scroll positions to top when opening
  const modalEl = document.getElementById('modal');
  if (modalEl) modalEl.scrollTop = 0;
  const modalBodyEl = DOM.modalContent.querySelector('.modal__body');
  if (modalBodyEl) modalBodyEl.scrollTop = 0;

  requestAnimationFrame(() => DOM.modalCloseBtn?.focus({ preventScroll: true }));
}

function closeModal() {
  DOM.modalOverlay.hidden = true;
  DOM.modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  const modalEl = document.getElementById('modal');
  if (modalEl) modalEl.scrollTop = 0;
}

/* ============================================================
   18. ERROR / LOADING / EMPTY STATES
   ============================================================ */
function showLoadingState() {
  DOM.listingsEmpty.hidden = true;
  DOM.listingsError.hidden = true;
  if (DOM.listingsGrid) DOM.listingsGrid.setAttribute('aria-busy', 'true');
}

function showErrorState() {
  DOM.listingsGrid.querySelectorAll('.skeleton-card').forEach(c => c.remove());
  DOM.listingsError.hidden  = false;
  DOM.listingsEmpty.hidden  = true;
  DOM.pagination.hidden     = true;
  if (DOM.resultsCount) DOM.resultsCount.textContent = '0 results';
}

/* ============================================================
   19. MOBILE NAVIGATION
   ============================================================ */
function initMobileNav() {
  if (!DOM.hamburgerBtn || !DOM.mobileMenu) return;

  DOM.hamburgerBtn.addEventListener('click', () => {
    const isOpen = !DOM.mobileMenu.hidden;
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  DOM.mobileMenu.querySelectorAll('.mobile-menu__link').forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
      // Handle saved view switching from mobile menu
      if (link.dataset.view === 'saved') {
        switchView('saved');
      }
    });
  });

  document.addEventListener('click', e => {
    if (
      !DOM.mobileMenu.hidden &&
      !DOM.mobileMenu.contains(e.target) &&
      !DOM.hamburgerBtn.contains(e.target)
    ) {
      closeMobileMenu();
    }
  });
}

function openMobileMenu() {
  DOM.mobileMenu.hidden = false;
  DOM.hamburgerBtn.setAttribute('aria-expanded', 'true');
  DOM.hamburgerBtn.classList.add('is-open');
}

function closeMobileMenu() {
  DOM.mobileMenu.hidden = true;
  DOM.hamburgerBtn.setAttribute('aria-expanded', 'false');
  DOM.hamburgerBtn.classList.remove('is-open');
}

/* ============================================================
   19b. CANDIDATE PROFILE MODAL
   ============================================================ */
function openProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  const modal = document.getElementById('profile-modal');
  const countEl = document.getElementById('profile-modal-saved-count');
  const btnCountEl = document.getElementById('profile-modal-saved-btn-count');
  const savedCount = State.savedIds ? State.savedIds.size : 0;

  if (countEl) countEl.textContent = `${savedCount} Project${savedCount === 1 ? '' : 's'}`;
  if (btnCountEl) btnCountEl.textContent = savedCount;

  if (overlay) {
    overlay.hidden = false;
    overlay.removeAttribute('aria-hidden');
    overlay.scrollTop = 0;
    if (modal) modal.scrollTop = 0;
    const modalBody = overlay.querySelector('.modal__body');
    if (modalBody) modalBody.scrollTop = 0;

    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => {
      const closeBtn = document.getElementById('profile-modal-close');
      closeBtn?.focus({ preventScroll: true });
    });
  }
}
window.openProfileModal = openProfileModal;

function closeProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  if (overlay) {
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  document.getElementById('profile-btn')?.focus({ preventScroll: true });
}
window.closeProfileModal = closeProfileModal;

function initProfileModal() {
  const profileBtn = document.getElementById('profile-btn');
  const mobileProfileBtn = document.getElementById('mobile-profile-btn');
  const overlay = document.getElementById('profile-modal-overlay');
  const closeBtn = document.getElementById('profile-modal-close');
  const cancelBtn = document.getElementById('profile-modal-cancel');
  const viewSavedBtn = document.getElementById('profile-modal-view-saved');

  profileBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openProfileModal();
  });

  mobileProfileBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileMenu();
    openProfileModal();
  });

  closeBtn?.addEventListener('click', closeProfileModal);
  cancelBtn?.addEventListener('click', closeProfileModal);

  viewSavedBtn?.addEventListener('click', () => {
    closeProfileModal();
    switchView('saved');
    document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' });
  });

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeProfileModal();
    }
  });
}

/* ============================================================
   20. MOBILE FILTER DRAWER
   ============================================================ */
function initMobileFilter() {
  if (!DOM.filterToggleBtn || !DOM.filterSidebar) return;

  DOM.filterToggleBtn.addEventListener('click', () => {
    DOM.filterSidebar.classList.contains('is-open')
      ? closeFilterSidebar()
      : openFilterSidebar();
  });

  DOM.filterCloseBtn?.addEventListener('click', closeFilterSidebar);
  DOM.filterBackdrop?.addEventListener('click', closeFilterSidebar);

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const profileOverlay = document.getElementById('profile-modal-overlay');
    if (profileOverlay && !profileOverlay.hidden)        { closeProfileModal();   return; }
    if (!DOM.modalOverlay.hidden)                       { closeModal();          return; }
    if (DOM.filterSidebar.classList.contains('is-open')){ closeFilterSidebar(); return; }
    if (!DOM.mobileMenu.hidden)                          { closeMobileMenu();    return; }
  });
}

function openFilterSidebar() {
  DOM.filterSidebar.classList.add('is-open');
  DOM.filterBackdrop.hidden = false;
  DOM.filterToggleBtn.setAttribute('aria-expanded', 'true');
  DOM.filterToggleBtn.setAttribute('aria-label', 'Close filters');
  document.body.style.overflow = 'hidden';
  DOM.filterCloseBtn?.focus();
}

function closeFilterSidebar() {
  DOM.filterSidebar.classList.remove('is-open');
  DOM.filterBackdrop.hidden = true;
  DOM.filterToggleBtn.setAttribute('aria-expanded', 'false');
  DOM.filterToggleBtn.setAttribute('aria-label', 'Open filters');
  document.body.style.overflow = '';
  DOM.filterToggleBtn?.focus();
}

/* ============================================================
   21. COLLAPSIBLE FILTER GROUPS
   ============================================================ */
function initCollapsibleFilters() {
  document.querySelectorAll('.filter-group__toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      const targetEl = document.getElementById(btn.getAttribute('aria-controls'));
      btn.setAttribute('aria-expanded', String(!expanded));
      targetEl?.classList.toggle('is-collapsed', expanded);
    });
  });
}

/* ============================================================
   22. VIEW TABS (Explore / Saved) — Phase 3
   ============================================================ */

/**
 * Switches the active view between 'explore' and 'saved'.
 * @param {'explore'|'saved'} view
 */
function switchView(view) {
  State.currentView = view;

  const isExplore = view === 'explore';

  // Tab active states
  DOM.tabExplore?.classList.toggle('is-active', isExplore);
  DOM.tabSaved?.classList.toggle('is-active', !isExplore);
  DOM.tabExplore?.setAttribute('aria-selected', String(isExplore));
  DOM.tabSaved?.setAttribute('aria-selected', String(!isExplore));

  // Show/hide panels
  DOM.viewExplore.hidden = !isExplore;
  DOM.viewSaved.hidden   = isExplore;

  // Update navbar active link
  document.querySelectorAll('.navbar__nav-link').forEach(l => {
    l.classList.remove('navbar__nav-link--active');
    l.removeAttribute('aria-current');
  });
  if (isExplore) {
    DOM.navSavedCount && null; // no-op
    document.getElementById('nav-explore')?.classList.add('navbar__nav-link--active');
    document.getElementById('nav-explore')?.setAttribute('aria-current', 'page');
  } else {
    document.getElementById('nav-saved')?.classList.add('navbar__nav-link--active');
    document.getElementById('nav-saved')?.setAttribute('aria-current', 'page');
    // Render saved view fresh when switching to it
    State.savedCurrentPage = 1;
    renderSavedView();
  }

  // Update mobile nav active state
  document.querySelectorAll('.mobile-menu__link').forEach(l => l.classList.remove('mobile-menu__link--active'));
  if (isExplore) {
    document.getElementById('mobile-nav-explore')?.classList.add('mobile-menu__link--active');
  } else {
    document.getElementById('mobile-nav-saved')?.classList.add('mobile-menu__link--active');
  }

  // Scroll to top of main
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.switchView = switchView;

function initViewTabs() {
  // Desktop tab buttons
  DOM.tabExplore?.addEventListener('click', () => switchView('explore'));
  DOM.tabSaved?.addEventListener('click', () => switchView('saved'));

  // Navbar saved link
  document.getElementById('nav-saved')?.addEventListener('click', e => {
    e.preventDefault();
    switchView('saved');
    closeMobileMenu();
  });

  // Navbar explore / dashboard link
  document.getElementById('nav-explore')?.addEventListener('click', e => {
    e.preventDefault();
    switchView('explore');
  });

  // Mobile nav saved link
  document.getElementById('mobile-nav-saved')?.addEventListener('click', e => {
    e.preventDefault();
    switchView('saved');
    closeMobileMenu();
  });

  // Explore Projects nav link (smooth scroll to listings)
  document.getElementById('nav-listings')?.addEventListener('click', e => {
    e.preventDefault();
    if (State.currentView !== 'explore') switchView('explore');
    setTimeout(() => {
      document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  });

  // Mobile listings link
  document.getElementById('mobile-nav-listings')?.addEventListener('click', e => {
    e.preventDefault();
    closeMobileMenu();
    if (State.currentView !== 'explore') switchView('explore');
    setTimeout(() => {
      document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  });
}

/* ============================================================
   23. SCROLL ANIMATIONS
   ============================================================ */
function initScrollAnimations() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: show all
    document.querySelectorAll('[data-animate]').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
}

/* ============================================================
   24. SR ANNOUNCER — Phase 3
   ============================================================ */

/** Announces a message to screen readers via the live region. */
function announce(message) {
  if (!DOM.srAnnouncer) return;
  DOM.srAnnouncer.textContent = '';
  // Tiny timeout ensures the change is detected by AT
  setTimeout(() => { DOM.srAnnouncer.textContent = message; }, 60);
}

/* ============================================================
   25. INIT — Entry Point
   ============================================================ */

/**
 * Bootstraps the entire application.
 */
async function init() {
  // ── Restore saved bookmarks ──
  loadSavedIds();
  updateSavedCountBadges();

  // ── Candidate Profile Modal ──
  initProfileModal();

  // ── Fetch + validate data ──
  const success = await loadListings();

  // ── Remove skeleton cards ──
  DOM.listingsGrid.querySelectorAll('.skeleton-card').forEach(c => c.remove());

  if (!success) {
    showErrorState();

    DOM.retryBtn?.addEventListener('click', () => {
      DOM.listingsError.hidden = true;
      const skeletonHTML = Array.from({ length: 6 }, () => `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-card__header">
            <div class="skeleton skeleton--badge"></div>
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--title skeleton--title-short"></div>
          </div>
          <div class="skeleton skeleton--text"></div>
          <div class="skeleton skeleton--text skeleton--text-short"></div>
          <div class="skeleton-card__tags">
            <div class="skeleton skeleton--tag"></div>
            <div class="skeleton skeleton--tag"></div>
            <div class="skeleton skeleton--tag"></div>
          </div>
        </div>
      `).join('');
      DOM.listingsGrid.insertAdjacentHTML('afterbegin', skeletonHTML);
      init();
    });

    return;
  }

  // ── Render stats ──
  renderStats();

  // ── Populate Skills filter ──
  populateSkillsFilter();

  // ── Init card entrance observer ──
  initCardObserver();

  // ── Wire pagination buttons ──
  initPaginationButtons();

  // ── Initial render ──
  updateResults({ resetPage: true });

  // ── Event: debounced live search ──
  const debouncedSearch = debounce(handleSearchInput, 280);
  DOM.searchInput?.addEventListener('input', debouncedSearch);
  DOM.searchClearBtn?.addEventListener('click', clearSearch);

  // ── Event: filter checkboxes ──
  attachFilterListeners();

  // ── Event: sort dropdown ──
  DOM.sortSelect?.addEventListener('change', handleSortChange);

  // ── Event: collapsible filter groups ──
  initCollapsibleFilters();

  // ── Event: mobile navigation ──
  initMobileNav();

  // ── Event: mobile filter drawer ──
  initMobileFilter();

  // ── Event: modal ──
  DOM.modalCloseBtn?.addEventListener('click', closeModal);
  DOM.modalOverlay?.addEventListener('click', e => {
    if (e.target === DOM.modalOverlay) closeModal();
  });

  // ── Event: reset all filters ──
  DOM.resetFiltersBtn?.addEventListener('click', resetAllFilters);

  // ── Event: clear all (empty state) ──
  DOM.clearAllBtn?.addEventListener('click', () => {
    resetAllFilters();
    clearSearch();
  });

  // ── Event: clear search only ──
  DOM.clearSearchOnlyBtn?.addEventListener('click', clearSearch);

  // ── Phase 3: View Tabs ──
  initViewTabs();

  // ── Phase 3: Saved View ──
  initSavedView();

  // ── Scroll animations ──
  initScrollAnimations();

  // Phase 4: replace debug console.log with a named custom event
  // so developers can hook into it without polluting the console in production.
  document.dispatchEvent(new CustomEvent('projecthub:ready', {
    detail: {
      listings: State.allListings.length,
      pageSize: State.PAGE_SIZE,
      saved:    State.savedIds.size,
    }
  }));
}

// ── Boot ────────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
