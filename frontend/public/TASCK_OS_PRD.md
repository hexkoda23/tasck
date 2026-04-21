# TASCK OS — Product Requirements Document (PRD)
### Complete Product Specification & Build Record
**Version:** 2.0 | **Date:** March 17, 2026 | **Company:** The TASCK Agency

---

## 1. Executive Summary

**TASCK OS** is a premium, fully functional product demo for **The TASCK Agency** — a Nigerian creator economy company that connects brands with Africa's top creative talent. The platform is an operating system for managing the entire lifecycle of brand-creative partnerships: from deal origination through project execution to payout.

The product ships with **two distinct versions** accessible from a single entry point:

- **TASCK OS v1** — A professional, light-themed, multi-portal platform with 5 user roles and 46+ fully populated pages.
- **TASCK OS v2** — A futuristic, AI-native, dark-themed command center with advanced data visualizations, a deal simulator, and a real-time mission control view.

**Live URL:** Accessible via the Emergent preview deployment.

---

## 2. Product Vision & Goals

| Dimension | Detail |
|---|---|
| **Target Audience** | Investors, brand partners, and creative talent evaluating the TASCK platform |
| **Primary Goal** | Demonstrate a world-class, funded-product-quality demo that showcases TASCK's vision for the African creative economy |
| **Key Differentiator** | Dual-version architecture showing evolution from functional platform (V1) to AI-powered operating system (V2) |
| **Data Philosophy** | All data uses real Nigerian brands, creatives, and culturally accurate names and currency (Naira) |

---

## 3. User Flow Architecture

```
Landing Page (/)
  "Creativity, Managed."
  [Enter Demo] button
       │
       ▼
Version Selector (/select)
  ┌──────────┬──────────┐
  │  V1      │  V2      │
  │  Classic  │  Next    │
  └────┬─────┴────┬─────┘
       │          │
       ▼          ▼
V1 Role Selector   V2 Role Selector
(/v1)              (/v2)
 5 roles:           3 roles:
 • Staff            • TASCK Command
 • Brand            • Brand Portal
 • Super Creative   • Talent Network
 • Creative
 • Admin
       │                │
       ▼                ▼
V1 Dashboards      V2 Dashboards
(Light theme)      (Dark theme)
```

**Additional Routes:**
- `/feedback` — Feedback admin panel (view all submitted comments)

---

## 4. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Tailwind CSS, React Router v6 |
| **Backend** | Python FastAPI, Motor (async MongoDB driver) |
| **Database** | MongoDB |
| **UI Components** | Shadcn/UI, Lucide React icons |
| **Data Viz** | react-force-graph-2d (network graph), custom SVG (Sankey flow) |
| **Fonts** | DM Sans (V1), Geist Sans/Mono (V2) |
| **State** | React Context API (AuthContext) |

---

## 5. TASCK OS v1 — Complete Specification

### 5.1 Design Language
- **Theme:** Light, clean, professional (inspired by WeTransfer/Compound)
- **Background:** White/Slate (#F8FAFC)
- **Primary accent:** Blue (#2F55FF)
- **Cards:** White with subtle borders and shadows
- **Typography:** DM Sans, compact sizing for data density

### 5.2 Portal: TASCK Staff (`/staff`)
The command center for TASCK's internal team.

| Page | Route | Features |
|---|---|---|
| **Overview** | `/staff` | Welcome banner, 8 metric cards (₦847.2M pipeline, 15 active deals, etc.), activity feed, charts, clickable detail popups |
| **Pipeline** | `/staff/pipeline` | Kanban board with deal stages (Lead → Discovery → Scoping → NDA → Terms → Active → Closed) |
| **Deals** | `/staff/deals` | Deal list with filters, stage badges, value display |
| **Projects** | `/staff/projects` | Project management view with status tracking |
| **Opportunities** | `/staff/opportunities` | Opportunity listings for creative matching |
| **Roster** | `/staff/roster` | Team member directory with roles and avatars |
| **Brands** | `/staff/brands` | Brand partner directory with industry/spend data |
| **Revenue** | `/staff/revenue` | Revenue analytics and financial reporting |
| **Meetings** | `/staff/meetings` | Meeting system with transcript upload, recording simulation, action items |
| **Contracts** | `/staff/contracts` | Contract management with sending flow to all parties |
| **Wallet** | `/staff/wallet` | Shared wallet (Conflux-inspired design) with balance, transactions, escrow |
| **Messages** | `/staff/messages` | In-app messaging interface |
| **Calendar** | `/staff/calendar` | Event calendar |
| **Reports** | `/staff/reports` | Reporting dashboard |
| **Settings** | `/staff/settings` | Account and portal settings |

### 5.3 Portal: Brand (`/brand`)
For brand partners managing campaigns and spend.

| Page | Route | Features |
|---|---|---|
| **Overview** | `/brand` | Welcome banner, campaign metrics, spend summary, active campaigns |
| **Discover** | `/brand/discover` | Browse available creatives with filters |
| **Campaigns** | `/brand/campaigns` | Campaign management and tracking |
| **Approvals** | `/brand/approvals` | Deliverable approval queue |
| **Analytics** | `/brand/analytics` | ROI and performance analytics |
| **Spend** | `/brand/spend` | Budget tracking and spend breakdown |
| **Wallet** | `/brand/wallet` | Shared wallet component |
| **Messages** | `/brand/messages` | Messaging |
| **Reports** | `/brand/reports` | Reporting |
| **Settings** | `/brand/settings` | Settings |

### 5.4 Portal: Super Creative (`/super-creative`)
For top-tier creatives who originate projects and hire talent.

| Page | Route | Features |
|---|---|---|
| **Overview** | `/super-creative` | Welcome banner, earnings metrics, project stats |
| **Portfolio** | `/super-creative/portfolio` | Showcase of work and achievements |
| **Projects** | `/super-creative/projects` | Project management |
| **Opportunities** | `/super-creative/opportunities` | Available deals and opportunities |
| **Applications** | `/super-creative/applications` | Application tracking |
| **Wallet** | `/super-creative/wallet` | Wallet with earnings and payouts |
| **Calendar** | `/super-creative/calendar` | Calendar |
| **Messages** | `/super-creative/messages` | Messaging |
| **Settings** | `/super-creative/settings` | Settings |

### 5.5 Portal: Creative (`/creative`)
For individual creatives finding gigs and getting paid.

| Page | Route | Features |
|---|---|---|
| **Overview** | `/creative` | Welcome banner, task metrics, earnings summary |
| **Opportunities** | `/creative/opportunities` | Browse available gigs |
| **Projects** | `/creative/projects` | Active project list |
| **Tasks** | `/creative/tasks` | Task management and progress tracking |
| **Portfolio** | `/creative/portfolio` | Work portfolio |
| **Wallet** | `/creative/wallet` | Wallet with payout tracking |
| **Messages** | `/creative/messages` | Messaging |
| **Settings** | `/creative/settings` | Settings |

### 5.6 Portal: Admin (`/admin`)
Platform administration and oversight.

| Page | Route | Features |
|---|---|---|
| **Overview** | `/admin` | Platform health metrics, user stats, activity log |
| **Users** | `/admin/users` | User management directory |
| **Disputes** | `/admin/disputes` | Dispute resolution queue |
| **Contracts** | `/admin/contracts` | Contract oversight |
| **Audit Logs** | `/admin/audit` | System audit trail |
| **Permissions** | `/admin/permissions` | Role and permission management |
| **Wallets** | `/admin/wallets` | Platform wallet administration |
| **Settings** | `/admin/settings` | System settings |

### 5.7 Shared Components (V1)

| Component | Description |
|---|---|
| **DashboardLayout** | Main wrapper with sidebar navigation, header, and content area |
| **WelcomeBanner** | Gradient hero banner with personalized greeting on each overview page |
| **MetricCard** | Compact stat card with value, label, and trend indicator |
| **Avatar** | Color-coded initials avatar based on name |
| **DetailPopup** | Click-to-open modal for drilling into any data point |
| **StatusBadge** | Colored badge for deal/task/project statuses |
| **Logo** | TASCK branded logo with dark blue circle |

---

## 6. TASCK OS v2 — Complete Specification

### 6.1 Design Language
- **Theme:** Dark, command-center aesthetic
- **Background:** Deep navy (#06080F / #0A0D14)
- **Primary accent:** Electric blue (#2F55FF / #6B8AFF)
- **Cards:** Semi-transparent with thin borders (`v2-card` class)
- **Typography:** Geist Sans (headings), Geist Mono (data/numbers)
- **Information density:** High — small fonts (9-12px), dense layouts
- **Navigation:** Slim icon-only sidebar (60px) + top command bar

### 6.2 V2 Layout System

| Element | Behavior |
|---|---|
| **Sidebar** | 60px collapsed (icon-only), expands to 200px on hover, pushes content right with smooth transition |
| **Command Bar** | Top bar with search input ("Ask anything... Try: Show me deals closing this week") |
| **Content Area** | Full-width with 24px padding, scrollable |
| **Live Button** | Red pulsing "LIVE" button at sidebar bottom |

### 6.3 Portal: TASCK Command (`/v2/command`)
The AI-native command center — the heart of V2.

| Page | Route | Status | Features |
|---|---|---|---|
| **Command Center** | `/v2/command` | BUILT | AI-driven briefing: priority actions, deal alerts, pipeline health radar, team pulse, market signals summary. Not a static dashboard — an intelligent briefing screen. |
| **Intelligence Center** | `/v2/command/signals` | BUILT | AI-detected market signals feed with confidence scores (%), industry tags, signal types (Opportunity/Threat/Trend), detailed analytics panel with source information |
| **Pipeline** | `/v2/command/pipeline` | BUILT | **3 views:** Kanban (7-stage board with 15 deals), Flow (Sankey-style SVG visualization with conversion rates, drop-off indicators, stage transitions), Timeline (monthly Gantt-like bars with deadline tracking) |
| **Deal Room** | `/v2/command/deals` | BUILT | **2 tabs:** Deals list (7 active deals with type/stage badges) + **Simulator** (5 interactive sliders for value/commission/creative-split/probability/timeline, real-time output with TASCK Revenue, Expected Value, Creative Payout, Monthly Velocity, value distribution bar, AI recommendation, 3 quick scenario presets) |
| **Network** | `/v2/command/network` | BUILT | **Force-directed graph** (react-force-graph-2d): 21 nodes (10 brands + 10 creatives + TASCK hub), 30 connections, animated particles on active deals. 4 filter modes (All/Brands/Creatives/Active Deals). Click nodes for detail popup. Canvas-rendered with custom drawing. |
| **Live Command** | `/v2/command/live` | BUILT | **Mission control:** LIVE badge with pulsing red indicator, real-time clock, 6 metric tiles with animated progress bars, 3-column layout (Active Deals feed with 6 deals, Event Feed with 10 timestamped events, Team Activity with 8 members and online status), Revenue Target progress (₦234.8M / ₦500M = 47%), Copilot Status panel. Auto-refreshes every 3 seconds. |
| **Projects** | `/v2/command/projects` | Placeholder | — |
| **Talent** | `/v2/command/talent` | Placeholder | — |
| **Revenue** | `/v2/command/revenue` | Placeholder | — |
| **Messages** | `/v2/command/messages` | Placeholder | — |
| **Automations** | `/v2/command/automations` | Placeholder | — |
| **Settings** | `/v2/command/settings` | Placeholder | — |

### 6.4 Portal: Brand (`/v2/brand`)
| All pages | Placeholder | Planned for Phase C |

### 6.5 Portal: Talent Network (`/v2/talent`)
| All pages | Placeholder | Planned for Phase C |

---

## 7. Global Features

### 7.1 Feedback System
A global comment/feedback popup available on every page of the application.

| Feature | Detail |
|---|---|
| **Trigger** | Small chat icon button, fixed bottom-right corner |
| **Form Fields** | Name, Email, Comment |
| **Auto-captured** | Page URL (which page the comment was left on), timestamp |
| **Storage** | MongoDB `feedback` collection |
| **Admin View** | `/feedback` — lists all comments with name, email, page, timestamp. Filterable by page. |
| **API** | `POST /api/feedback` (create), `GET /api/feedback` (list, optional `?page_url=` filter) |

### 7.2 Authentication (Demo Mode)
No real authentication. Role-based demo access via card selection:
- V1: Click any of 5 role cards → auto-login via AuthContext → navigate to portal
- V2: Click any of 3 role cards → navigate to portal (no auth required)

---

## 8. Backend API

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/feedback` | POST | Submit feedback (name, email, comment, page_url) |
| `/api/feedback` | GET | List all feedback (optional `?page_url=` filter) |
| `/api/demo/login` | POST | Demo login by role |
| `/api/users` | GET | List users |
| `/api/brands` | GET | List brands |
| `/api/deals` | GET | List deals |
| `/api/projects` | GET | List projects |
| `/api/opportunities` | GET | List opportunities |
| `/api/tasks` | GET | List tasks |
| `/api/contracts` | GET | List contracts |
| `/api/wallets` | GET | List wallets |

**Note:** The frontend currently uses static mock data from `lib/data.js` for V1 and inline data in V2 components. Backend APIs exist but are not yet connected to the frontend.

---

## 9. Database Schema (MongoDB)

| Collection | Key Fields |
|---|---|
| `users` | id, name, email, role, title, department, avatar |
| `brands` | id, name, industry, contact_person, total_spend, active_deals |
| `deals` | id, brand_id, creative_id, title, value, stage, probability, owner |
| `projects` | id, deal_id, title, status, budget, timeline |
| `opportunities` | id, project_id, title, budget, skills_required, applications |
| `tasks` | id, opportunity_id, assignee_id, title, status, deadline |
| `contracts` | id, deal_id, parties, value, status, signed_date |
| `wallets` | id, user_id, balance, currency, transactions |
| `feedback` | id, name, email, comment, page_url, created_at |

---

## 10. File Architecture

```
/app/
├── backend/
│   ├── .env                    # MONGO_URL, DB_NAME, CORS_ORIGINS
│   ├── server.py               # FastAPI app (610 lines) — routes, seed data, feedback API
│   ├── models.py               # Pydantic models and enums
│   ├── seed_data.py            # Comprehensive Nigerian demo data generator
│   └── requirements.txt
│
└── frontend/
    ├── .env                    # REACT_APP_BACKEND_URL
    ├── package.json
    ├── craco.config.js         # Webpack alias configuration (@/ → src/)
    │
    └── src/
        ├── App.js              # All routes (297 lines)
        ├── index.css           # Global styles + V2 styles + Geist fonts (782 lines)
        ├── App.css             # V1 component styles
        │
        ├── components/
        │   ├── layout/
        │   │   └── DashboardLayout.js     # V1 main layout wrapper
        │   ├── shared/
        │   │   ├── Avatar.js              # Initials-based avatar
        │   │   ├── DetailPopup.js         # Click-to-open detail modal
        │   │   ├── FeedbackPopup.js       # Global feedback form
        │   │   ├── Logo.js                # TASCK logo
        │   │   ├── MetricCard.js          # Stat card
        │   │   ├── StatusBadge.js         # Status indicator
        │   │   └── WelcomeBanner.js       # Gradient banner
        │   ├── ui/                        # 40+ Shadcn/UI components
        │   └── v2/
        │       └── V2Layout.js            # V2 layout (sidebar + command bar)
        │
        ├── context/
        │   └── AuthContext.js             # Auth state management
        │
        ├── lib/
        │   ├── data.js                    # V1 static mock data
        │   ├── api.js                     # API helper (unused currently)
        │   └── utils.js                   # formatNaira, cn(), helpers
        │
        └── pages/
            ├── LandingPage.js             # Full-screen hero ("Creativity, Managed.")
            ├── VersionSelector.js         # V1/V2 split-screen choice
            ├── FeedbackAdmin.js           # Feedback viewer at /feedback
            │
            ├── v1/
            │   └── V1RoleSelector.js      # 5-role card selector
            │
            ├── v2/
            │   ├── V2RoleSelector.js      # 3-role card selector
            │   ├── V2Placeholder.js       # Placeholder for unbuilt pages
            │   └── command/
            │       ├── CommandCenter.js    # AI briefing home
            │       ├── IntelligenceCenter.js  # Market signals feed
            │       ├── V2Pipeline.js      # Kanban + Flow + Timeline
            │       ├── V2DealRoom.js      # Deal list + Simulator
            │       ├── V2Network.js       # Force-directed relationship graph
            │       └── V2LiveCommand.js   # Real-time mission control
            │
            ├── staff/         (10 pages)
            ├── brand/         (6 pages)
            ├── super-creative/ (5 pages)
            ├── creative/      (5 pages)
            ├── admin/         (8 pages)
            └── shared/        (5 pages — Wallet, Messages, Calendar, Reports, Settings)
```

**Total custom pages:** 55+
**Total lines of frontend code:** ~10,800+

---

## 11. What Is Mocked vs. Real

| Feature | Status |
|---|---|
| Feedback system (submit + view) | **REAL** — saved to MongoDB, served via API |
| V1 dashboard data | **MOCKED** — static data in `lib/data.js` |
| V2 dashboard data | **MOCKED** — inline data in each component |
| AI Briefing / Copilot | **MOCKED** — UI simulation only |
| Market Signals | **MOCKED** — static signal data |
| Deal Simulator calculations | **REAL** — live math based on slider inputs |
| Network Graph | **REAL** — live force-directed physics simulation |
| Live Command clock | **REAL** — updates every 3 seconds |
| Authentication | **MOCKED** — demo role selection, no real auth |

---

## 12. Testing Record

| Iteration | Scope | Result |
|---|---|---|
| iteration_5 | V1 feature completion | 100% pass |
| iteration_6 | V1 design refresh | 100% pass |
| iteration_7 | V1 data enrichment | 100% pass |
| iteration_8 | V2 Phase A (foundation) | 100% pass |
| iteration_9 | V2 Phase B (4 must-have features) | 100% pass |

---

## 13. Remaining Backlog

### P0 — Critical
- [ ] Connect frontend to backend API (replace all mock data with live API calls)

### P1 — V2 Phase C (Should Have)
- [ ] Revenue Intelligence — Forecast tab with scenario modeling
- [ ] Automations Engine — Visual workflow automation builder
- [ ] Money Flow Visualization — Sankey diagram for wallet/revenue
- [ ] V2 Brand Portal — Enhanced analytics and health dashboard
- [ ] V2 Talent Network — Unified view with performance analytics
- [ ] Inline Copilot Suggestions — AI recommendations woven through V2 UI

### P2 — Nice to Have
- [ ] Analytics Playground
- [ ] Gantt timeline view
- [ ] Conversational Copilot (chat interface)
- [ ] Match radar charts
- [ ] Command Palette functional search (Cmd+K)
- [ ] In-app messaging system
- [ ] Full mobile responsiveness
- [ ] PDF export for reports

---

## 14. Key Metrics (Demo Data)

| Metric | Value |
|---|---|
| Pipeline Value | ₦847.2M |
| Active Deals | 15 |
| Revenue YTD | ₦234.8M |
| Revenue Target | ₦500M (47% achieved) |
| Brand Partners | 10 (Coca-Cola, MTN, Guinness, Access Bank, Star Lager, Pepsi, UBA, Dangote, Airtel, GTBank) |
| Creatives | 10 (Mavin Records, Tems, Burna Boy, Davido, Rema, Ayra Starr, Fireboy DML, Don Jazzy, Wizkid, Adekunle Gold) |
| Team Members | 8 |
| Market Signals | 12 active |

---

*Document generated March 17, 2026. For the latest version, visit `/feedback` to leave comments or contact The TASCK Agency.*
