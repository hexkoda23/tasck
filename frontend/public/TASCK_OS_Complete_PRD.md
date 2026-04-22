# TASCK OS — Complete Product Requirements Document

**Version:** 3.0
**Date:** 21 April 2026
**Author:** The TASCK Agency
**Status:** Production Demo

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Strategy](#2-product-vision--strategy)
3. [System Architecture](#3-system-architecture)
4. [Global Platform Features](#4-global-platform-features)
5. [V1 — Classic (Multi-Portal Operational Platform)](#5-v1--classic)
6. [V2 — Next (AI-Native Command Center)](#6-v2--next)
7. [V3 — TASCK (The Definitive Build)](#7-v3--tasck)
8. [Data Architecture](#8-data-architecture)
9. [Design System](#9-design-system)
10. [Testing & Quality](#10-testing--quality)
11. [Appendix: Complete Route Map](#11-appendix-complete-route-map)

---

## 1. Executive Summary

TASCK OS is a creator campaign management platform purpose-built for the African market. It connects brands, creators, and campaign managers through a structured four-stage pipeline: **Connect, Frame, Plan, Deliver.** The platform manages the entire lifecycle of creator-brand campaigns — from initial CRM outreach through strategic alignment, creative planning, production management, and post-campaign reporting.

The product demo contains three distinct versions within a single application:

| Version | Theme | Status | Pages |
|---------|-------|--------|-------|
| V1 (Classic) | Light, multi-portal | Complete | 46+ pages |
| V2 (Next) | Dark, AI-native command center | Complete | 12+ pages |
| V3 (TASCK) | Editorial light, Notion/Craft style | Complete | 40+ pages |

**Total application:** 93 page components, 400-line routing file, 772-line seed data file, full backend with MongoDB.

---

## 2. Product Vision & Strategy

### Problem Statement
African brands commissioning creator campaigns lack a structured system for managing the end-to-end workflow. Creator agencies operate on spreadsheets, WhatsApp groups, and email chains. There is no single platform that provides:
- CRM for brand relationships
- Structured campaign pipelines
- AI-assisted document generation (Alignment Snapshots, Creative Snapshots, Final Reports)
- Creator matching and brief management
- Deliverable tracking with escrow payments
- Multi-stakeholder portals (admin, brand, creator)

### Target Market
- **Primary:** Nigerian creator agencies and brand marketing teams
- **Secondary:** Pan-African markets (Kenya, South Africa, Ghana, Cameroon)
- **Tertiary:** Global brands with African market presence (Diageo, Coca-Cola, Puma)

### Key Differentiators
1. **Four-stage pipeline** — not just a CRM or project manager, but an end-to-end campaign engine
2. **AI-generated documents** — Alignment Snapshots, Creative Snapshots, Final Reports produced from structured data
3. **Three-portal architecture** — Admin, Brand, and Creator each see their own tailored view of the same campaign
4. **Nigerian-first** — built with Naira currency, Nigerian decision-makers, Lagos/Abuja/PH locations, and authentic creator culture

---

## 3. System Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, React Router v6, Shadcn/UI |
| Build Tool | CRACO (Create React App Configuration Override) |
| Backend | FastAPI (Python 3.11), Motor (async MongoDB driver) |
| Database | MongoDB |
| Fonts | Fraunces (headings), JetBrains Mono (data), Inter (UI) |
| Icons | Lucide React |
| Charts | Custom SVG sparklines, react-force-graph-2d (V2) |
| Notifications | Sonner toast library |

### Frontend Architecture

```
/app/frontend/src/
  App.js                        — 400 lines, all route definitions
  index.css                     — 1,112 lines, all CSS tokens + dark mode
  context/AuthContext.js         — JWT authentication context (V1)
  components/
    layout/DashboardLayout.js    — V1 sidebar layout
    shared/Logo.js, FeedbackPopup.js
    v2/V2Layout.js               — V2 dark sidebar layout
    v3/
      V3Layout.js                — V3 editorial layout + topbar
      V3DocumentSurface.js       — Core document rendering (720px, editorial)
      V3StageGate.js             — Stage advancement conditions
      V3Typewriter.js            — AI generation animation
      V3NotificationCenter.js    — Bell + notification panel
      V3CommandK.js              — Command+K search overlay
      V3BrandOnboarding.js       — 3-step brand onboarding wizard
  lib/
    v3data.js                    — 772 lines of verbatim Nigerian seed data
  pages/
    93 page components across all versions
```

### Backend Architecture

```
/app/backend/
  server.py     — FastAPI app, API router, MongoDB connection, seed data
  models.py     — Pydantic models (UserRole, DealStatus, ProjectStatus, etc.)
  seed_data.py  — V1/V2 seed data generator
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/demo-login | Demo authentication (V1) |
| GET | /api/dashboard/staff | Staff dashboard data |
| GET | /api/dashboard/brand | Brand dashboard data |
| GET | /api/dashboard/creative | Creative dashboard data |
| GET | /api/dashboard/super-creative | Super creative dashboard data |
| GET | /api/dashboard/admin | Admin dashboard data |
| GET | /api/deals | Deal pipeline data |
| GET | /api/opportunities | Opportunity listings |
| GET | /api/projects | Project listings |
| POST | /api/feedback | Submit feedback |
| GET | /api/feedback | Get all feedback (admin) |

---

## 4. Global Platform Features

### 4.1 Landing Page (`/`)
Clean hero screen introducing TASCK OS. Single CTA leading to the Version Selector. Animated background with gradient mesh.

### 4.2 Version Selector (`/select`)
Three version cards (V1 Classic, V2 Next, V3 TASCK) with descriptions, feature highlights, and visual previews. Each card navigates to the respective version's entry point.

### 4.3 Feedback System
- **Floating feedback popup** — available on every page, minimalist design
- **Feedback admin panel** (`/feedback`) — lists all submitted feedback with timestamps
- **Backend storage** — MongoDB `feedback` collection

---

## 5. V1 — Classic

**Theme:** Light, professional, multi-portal operational platform
**Authentication:** JWT-based demo login with role selection
**Layout:** Fixed sidebar with role-specific navigation

### 5.1 Portals & Pages

#### Staff Portal (`/staff`) — 15 pages
| Page | Route | Description |
|------|-------|-------------|
| Overview | /staff | KPI dashboard, pipeline summary, upcoming meetings |
| Pipeline | /staff/pipeline | Deal pipeline with stages, drag-and-drop feel |
| Deals | /staff/deals | Active deal management |
| Projects | /staff/projects | Active project tracking |
| Opportunities | /staff/opportunities | New business opportunities |
| Roster | /staff/roster | Creator roster management |
| Brands | /staff/brands | Brand CRM |
| Revenue | /staff/revenue | Revenue analytics and forecasting |
| Meetings | /staff/meetings | Meeting scheduler and notes |
| Contracts | /staff/contracts | Contract management |
| Wallet | /staff/wallet | Payment tracking |
| Messages | /staff/messages | Internal messaging |
| Calendar | /staff/calendar | Calendar integration |
| Reports | /staff/reports | Report generation |
| Settings | /staff/settings | Account settings |

#### Brand Portal (`/brand`) — 10 pages
| Page | Route | Description |
|------|-------|-------------|
| Overview | /brand | Brand dashboard with active campaigns |
| Discover | /brand/discover | Discover creators |
| Campaigns | /brand/campaigns | Campaign management |
| Approvals | /brand/approvals | Deliverable approvals |
| Analytics | /brand/analytics | Campaign performance analytics |
| Spend | /brand/spend | Budget tracking |
| Wallet | /brand/wallet | Payment management |
| Messages | /brand/messages | Communication hub |
| Reports | /brand/reports | Campaign reports |
| Settings | /brand/settings | Account settings |

#### Creative Portal (`/creative`) — 8 pages
| Page | Route | Description |
|------|-------|-------------|
| Overview | /creative | Creator dashboard |
| Opportunities | /creative/opportunities | Available briefs |
| Projects | /creative/projects | Active projects |
| Tasks | /creative/tasks | Task management |
| Portfolio | /creative/portfolio | Portfolio showcase |
| Wallet | /creative/wallet | Earnings and payments |
| Messages | /creative/messages | Communication |
| Settings | /creative/settings | Profile settings |

#### Super Creative Portal (`/super-creative`) — 8 pages
| Page | Route | Description |
|------|-------|-------------|
| Overview | /super-creative | Premium creator dashboard |
| Portfolio | /super-creative/portfolio | Showcase |
| Projects | /super-creative/projects | Active projects |
| Opportunities | /super-creative/opportunities | Premium opportunities |
| Applications | /super-creative/applications | Application management |
| Wallet | /super-creative/wallet | Earnings |
| Messages | /super-creative/messages | Communication |
| Settings | /super-creative/settings | Settings |

#### Admin Portal (`/admin`) — 8 pages
| Page | Route | Description |
|------|-------|-------------|
| Overview | /admin | System dashboard |
| Users | /admin/users | User management |
| Disputes | /admin/disputes | Dispute resolution |
| Contracts | /admin/contracts | Contract oversight |
| Audit Logs | /admin/audit | System audit trail |
| Permissions | /admin/permissions | Role permissions |
| Wallets | /admin/wallets | Financial oversight |
| Settings | /admin/settings | System settings |

### 5.2 Authentication
- Demo login with 5 role cards (Staff, Brand, Creative, Super Creative, Admin)
- JWT tokens stored in context
- Protected routes via `ProtectedRoute` wrapper
- No real credentials — demo-mode only

---

## 6. V2 — Next

**Theme:** Dark, AI-native, cyberpunk-inspired command center
**Authentication:** None (public access)
**Layout:** Collapsible dark sidebar with glow effects

### 6.1 Portals & Pages

#### TASCK Command (`/v2/command`) — 12 routes
| Page | Route | Description |
|------|-------|-------------|
| Command Center | /v2/command | Real-time metrics dashboard with animated cards |
| Intelligence | /v2/command/signals | AI intelligence feed and market signals |
| Pipeline | /v2/command/pipeline | Interactive pipeline flow with timeline view |
| Deal Room | /v2/command/deals | Deal simulator with scenario modeling |
| Network | /v2/command/network | Force-directed graph visualization (react-force-graph-2d) |
| Live Command | /v2/command/live | Real-time feed with system pulse |
| Projects | /v2/command/projects | Project overview |
| Talent | /v2/command/talent | Talent network |
| Revenue | /v2/command/revenue | Revenue analytics |
| Messages | /v2/command/messages | Communication |
| Automations | /v2/command/automations | Workflow automation |
| Settings | /v2/command/settings | Configuration |

#### Brand Portal (`/v2/brand`) — 8 routes
Overview, Campaigns, Approvals, Discover, Analytics, Spend, Messages, Settings

#### Talent Network (`/v2/talent`) — 8 routes
Overview, Opportunities, Projects, Wallet, Portfolio, Analytics, Messages, Settings

### 6.2 Key V2 Features
- **Force-directed network graph** — creators and brands as interactive nodes
- **Deal Simulator** — model campaign scenarios with variable sliders
- **Pipeline Flow** — timeline visualization of all deals across stages
- **Live Command** — real-time system feed simulating operational activity
- **Dark theme** — custom CSS with glow effects, neon accents, glass-morphism

---

## 7. V3 — TASCK (The Definitive Build)

**Theme:** Calm editorial light theme (Notion/Craft aesthetic)
**Authentication:** None (portal-based access)
**Layout:** Clean sidebar + topbar with search, notifications, dark mode
**Fonts:** Fraunces (serif headings), JetBrains Mono (data/numbers)
**Core UI Pattern:** `V3DocumentSurface` — 720px max-width white surface for AI-generated documents

### 7.1 The Four-Stage Pipeline

```
CONNECT ──► FRAME ──► PLAN ──► DELIVER
```

| Stage | Purpose | Key AI Moment | Key Output |
|-------|---------|---------------|------------|
| **Connect** | CRM, lead scoring, outreach | Lead Score + Follow-up Draft | Brand added to pipeline |
| **Frame** | Strategic alignment, scoping | Alignment Snapshot | Scope confirmed, engagement model set |
| **Plan** | Creator matching, creative planning | Creator Match + Creative Snapshot | Campaign plan approved, contracts signed |
| **Deliver** | Production, deliverables, closure | Final Report | Campaign closed, feedback collected |

### 7.2 Admin Control Centre — 22 Pages

| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Overview | /v3/admin | Today dashboard with sparkline charts, pipeline at a glance, needs attention items, recent activity |
| 2 | Pipeline | /v3/admin/pipeline | 4-stage Kanban board (Connect/Frame/Plan/Deliver) with all 10 projects |
| 3 | Projects | /v3/admin/projects | Full project list with stage indicators, engagement badges, value, health |
| 4 | Project Detail | /v3/admin/projects/:id | 8-tab interface (Overview, Timeline, Alignment, Plan, Contracts, Delivery, Financials, Closure) |
| 5 | Campaign Workspace | /v3/admin/projects/:id/brainstorm | Strategic notes feed (RM + AI), campaign angle voting, creator shortlist, imported alignment context |
| 6 | Feedback | /v3/admin/projects/:id/feedback | Brand/Creator post-project feedback forms. MTN shows 9.8/10 with 5 sub-scores |
| 7 | Scope Changes | /v3/admin/projects/:id/scope-changes | Scope change request/approval workflow. MTN: approved ₦4M addendum. Star Lager: Ibadan show under review |
| 8 | Contract Preview | /v3/admin/projects/:id/contract | Full 10-clause Campaign Services Agreement in V3DocumentSurface with signature blocks |
| 9 | CRM | /v3/admin/crm | 10 brand records with lead scores, search, sort, interaction counts |
| 10 | Brand Detail | /v3/admin/crm/:id | Contact info, decision makers, lead score factors, 5-entry interaction history (Coca-Cola verbatim) |
| 11 | Creators | /v3/admin/creators | 10 creator cards in 2-column grid with fit scores, bios, 5 metrics, rate cards, platform tags |
| 12 | Creator Detail | /v3/admin/creators/:id | Full profile, performance metrics, rate card, project history |
| 13 | Contracts | /v3/admin/contracts | Contract status tracker across all projects |
| 14 | Templates | /v3/admin/templates | 6 document templates (Alignment Snapshot, Creative Snapshot, Creator Brief, Final Report, Retainer Agreement, Direct Contract) |
| 15 | Insights | /v3/admin/insights | Business analytics: pipeline distribution, engagement mix, project health, top brands/creators by value |
| 16 | Reports | /v3/admin/reports | 6 generated reports (Pipeline, RM Performance, Brand Engagement, Creator Roster, Financial, Delivery) |
| 17 | Wallet | /v3/admin/wallet | Financial overview: pipeline value, invoiced, escrow, collected, outstanding. Invoice breakdown table, transaction history |
| 18 | Fees | /v3/admin/fees | Fee structure: retainer (15%) vs direct (12%), per-project estimates, total fee projection |
| 19 | Tasks | /v3/admin/tasks | 16 seeded tasks across 7 projects, status filters (To Do/In Progress/Done), RM assignee filter, priority badges |
| 20 | Users | /v3/admin/users | 16 users across 3 portal types, role filter tabs, search, avatar table with last active |
| 21 | Settings | /v3/admin/settings | Organization config, 6 interactive automated reminder toggles with configurable day counts, notification channels, integrations |

### 7.3 Brand Portal — 8 Pages

| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Overview | /v3/brand | "Welcome back, Folake" — active projects, pending approvals, investment total. Replay Onboarding button |
| 2 | Projects | /v3/brand/projects | Project list with progress bars, stage indicators, engagement badges |
| 3 | Project Detail | /v3/brand/projects/:id | Tabbed view (Summary, Documents, Deliverables, Invoices) |
| 4 | Approvals | /v3/brand/approvals | Pending document approvals (Alignment Snapshots, Creative Snapshots) |
| 5 | Documents | /v3/brand/documents | Document vault — all generated documents with version tracking |
| 6 | Invoices | /v3/brand/invoices | Billing summary (consultancy fees, project fees) with status |
| 7 | Messages | /v3/brand/messages | Interactive split-pane chat with 3 threaded conversations, message bubbles, reply input |
| 8 | Settings | /v3/brand/settings | Profile, notification preferences |

### 7.4 Creator Portal — 8 Pages

| # | Page | Route | Description |
|---|------|-------|-------------|
| 1 | Overview | /v3/creator | "Welcome back, Rema" — 4 stat cards, active projects, performance metrics |
| 2 | Briefs | /v3/creator/briefs | Brief inbox with responded briefs (Guinness concept response verbatim) |
| 3 | Projects | /v3/creator/projects | Active projects with progress bars and stage indicators |
| 4 | Deliverables | /v3/creator/deliverables | 14 deliverables across 3 projects (8 upcoming Guinness, 4 approved Puma, 2 approved Browns) |
| 5 | Wallet | /v3/creator/wallet | ₦142M balance, ₦88M pending, monthly earnings chart, 3 project breakdowns, 7 transactions |
| 6 | Profile | /v3/creator/profile | Full profile with fit score, reliability, satisfaction, rate card, platforms |
| 7 | Messages | /v3/creator/messages | Interactive chat with 3 threads (Guinness active, Puma closed, Browns closed) |
| 8 | Settings | /v3/creator/settings | Account, notification, payment preferences |

### 7.5 Standalone Pages

| Page | Route | Description |
|------|-------|-------------|
| Role Selector | /v3 | 3 portal cards + brand enquiry link |
| Brand Inreach | /v3/enquiry | Public enquiry form (company, contact, campaign goals, budget, timeline, creator preferences) |

### 7.6 Premium Features

#### Notification Center
- Bell icon in topbar with unread badge
- Dropdown panel with 8 seeded notifications (escalations, overdue items, approvals, milestones)
- Click navigates to relevant page

#### Command+K Search
- Keyboard shortcut (Cmd+K / Ctrl+K) or click search bar
- Real-time search across projects, brands, and creators
- Quick action shortcuts (Pipeline, CRM, Creators, Reports)

#### Dark Mode
- Moon/Sun toggle in topbar
- Full CSS theme applied via `.v3-dark` class
- Covers cards, sidebar, text, inputs, tables, document surfaces

#### Sparkline Charts
- SVG sparklines on Admin Overview dashboard cards
- 6-month trend data with current dot indicator
- Monthly change callouts ("+2 this month", "+₦245M this month")

#### Brand Onboarding Wizard
- 3-step overlay (Welcome, Document Vault, Stay in the Loop)
- Progress dots, back/next navigation
- "Replay Onboarding" button on Brand Overview

#### Scope Change Workflow
- Log scope change requests with budget/timeline/scope impact
- Approval workflow (Approve / Request Changes / Reject)
- Seeded: MTN approved ₦4M addendum, Star Lager Ibadan show under review

#### Contract Generation
- Full 10-clause Campaign Services Agreement
- Rendered in V3DocumentSurface with editorial typography
- Dynamic content from project data (parties, fees, usage rights, creative control, termination)
- Signature blocks for Client, TASCK, and Creator

#### AI Typewriter Animation
- Reusable V3Typewriter component
- Section-by-section reveal with blinking cursor
- Variable speed, skip button
- For use on Alignment Snapshots, Creative Snapshots, Final Reports

#### Interactive Workflow Configuration
- 6 toggleable automated reminders (inactive lead, budget confirmation, deliverable review, feedback collection, escalation, re-engagement)
- Configurable day thresholds per reminder
- Visual toggle switches, inputs disable when reminder is off

#### Task Board
- 16 seeded tasks across 7 projects
- Status columns: To Do (7), In Progress (7), Done (2)
- Filters: status + RM assignee
- Priority badges (high/medium), due dates, project attribution

### 7.7 Seeded Content — The Three Flagship Projects

#### Project 1: Coca-Cola x Tems
- **Stage:** Frame | **Engagement:** Retainer | **Value:** ₦120M
- **Campaign:** "Share a Coke, Share a Story"
- **Content included:** Full brand record, 5-entry interaction log (verbatim emails/call notes), complete Alignment Snapshot with scope ambiguity flags
- **Key personas:** Folake Adeniran (Head of Marketing), Chidi Okafor (budget approver), Ngozi Eze-Williams (creative sign-off)

#### Project 2: Guinness x Rema
- **Stage:** Plan | **Engagement:** Retainer | **Value:** ₦180M
- **Campaign:** "Made of More: Africa"
- **Content included:** Brand record, Alignment Snapshot, Creator Match (Rema, Fit Score 93 with rationale), Creator Brief (sent to Rema), Rema's brief response (concept, fee ₦88M, availability), Creative Snapshot v1 (concept, 8 deliverables, ₦180M budget breakdown, production plan, timeline, KPIs)
- **Key personas:** Tunde Adeola (Marketing Director), Sophia Karimi (Regional CMO, Nairobi)

#### Project 3: MTN x Burna Boy
- **Stage:** Deliver (near closure) | **Engagement:** Direct | **Value:** ₦150M
- **Campaign:** "Lagos Unlimited"
- **Content included:** Brand record, Alignment Snapshot, Creative Snapshot (v2 approved), 8 deliverables (all approved), scope change (₦4M for 3 additional cutdowns), full Final Report with KPI performance table (all targets exceeded: reach +42%, app installs +43.5%, EMV +37.3%, UGC +370%), creator performance summary, closure checklist
- **Key personas:** Kemi Adebayo (GM Brand & Comms), Burna Boy (reliability score: 9.4/10)

#### Projects 4–10 (Supporting Cast)
7 additional projects seeded with realistic Nigerian campaign content:
- Access Bank x Davido — "Access More" (Plan, ₦140M)
- Star Lager x Ayra Starr — "Star Nights Tour" (Deliver, ₦95M)
- Dangote Cement x Wizkid — "Building Africa" (Connect, ₦200M)
- Pepsi x Fireboy DML — "Pepsi Naija" (Frame, ₦85M)
- GTBank x Tiwa Savage — "Fashion Weekend" (Connect, ₦65M)
- Airtel x CKay — "Airtel Vibes" (Frame, ₦75M)
- Fidelity Bank x Olamide — "Fidelity Street" (Plan, ₦55M)

---

## 8. Data Architecture

### V1/V2 Data
- MongoDB collections: `users`, `deals`, `projects`, `opportunities`, `tasks`, `transactions`, `applications`, `feedback`
- Seeded via `seed_data.py` on server startup
- API-driven via FastAPI endpoints

### V3 Data
- Client-side JavaScript module: `/app/frontend/src/lib/v3data.js` (772 lines)
- Exports: `v3Brands` (10), `v3Creators` (10), `v3Projects` (10), `v3RMs` (4), `v3Stages` (4), `v3AlignmentSnapshots`, `v3CreativeSnapshots`, `v3BriefResponses`, `v3FinalReports`, `v3Deliverables`, `v3InteractionLogs`
- Helper functions: `getBrand()`, `getCreator()`, `getRM()`, `formatNairaV3()`, `getProjectsForCreator()`

### Data Models (V3)

**Brand Record:**
company, industry, website, hq, primaryContact, role, email, phone, decisionMakers[], status, leadScore, leadScoreFactors[], lastInteraction

**Creator Record:**
name, genre, location, tier (super/rising), platforms[], bio, fitScore, reliability, onTimeRate, brandSatisfaction, repeatBrandCount, rateCard

**Project Record:**
title, brandId, creatorId, rmId, stage (connect/frame/plan/deliver), engagement (retainer/direct), estimatedValue, daysInStage, health, nextAction, createdAt

**Alignment Snapshot:**
title, meta, status, generatedAt, sections[] (heading, prose, bullets, kpis, flags)

**Creative Snapshot:**
versions[] (version, status, approved, generatedAt, content: {title, meta, concept, deliverables[], budget[], timeline[], kpis[]})

**Final Report:**
title, meta, sections[] (executive summary, KPI table with target/actual/variance, deliverables, timeline adherence, budget adherence, creator performance, recommendations, closure checklist)

---

## 9. Design System

### V1 — Classic Theme
- **Colors:** Dark navy backgrounds (#0F172A), white cards, blue accents
- **Typography:** System fonts (Inter)
- **Layout:** Fixed sidebar, card-based content
- **Components:** Shadcn/UI base

### V2 — Dark Theme
- **Colors:** Near-black (#0A0A1A), neon accents (cyan, purple), glass-morphism
- **Typography:** System fonts with monospace data
- **Layout:** Collapsible sidebar with glow effects
- **Components:** Custom dark cards with hover glow

### V3 — Editorial Theme
- **Background:** Off-white (#FAFAF7)
- **Cards:** White with 1px #E8E4DB border
- **Typography:** Fraunces (serif, headings), JetBrains Mono (data), Inter (body)
- **Accent colors:** Forest green (#1F4A3A), warm gold (#C49B5F), sage (#567B3F), warm grey (#9B9380)
- **DocumentSurface:** 720px max-width, white background, generous padding, editorial spacing
- **Dark mode:** Full alternate theme via `.v3-dark` CSS class

### CSS Token Reference (V3)
```css
--v3-bg: #FAFAF7;
--v3-card: #FFFFFF;
--v3-border: #E8E4DB;
--v3-text: #1A1A1A;
--v3-text-secondary: #5C5C5C;
--v3-text-muted: #8A8A8A;
--v3-accent-green: #1F4A3A;
--v3-accent-gold: #C49B5F;
--v3-accent-sage: #567B3F;
--v3-accent-warm: #9B9380;
--v3-badge-retainer: green background, dark text;
--v3-badge-direct: bordered, muted text;
```

---

## 10. Testing & Quality

### Test Reports
| Iteration | Scope | Result |
|-----------|-------|--------|
| iteration_9.json | V2 Phase B (Deal Simulator, Pipeline, Network, Live) | 100% pass |
| iteration_10.json | V3 Foundation (27 route/nav scenarios) | 100% pass |
| iteration_11.json | V3 Premium Features (18 scenarios) | 100% pass |

### Test Coverage
- All routes verified for 200 status codes
- Navigation flows tested (sidebar clicks, tab switching)
- Interactive elements tested (notification panel, search, dark mode toggle, filter tabs)
- V1/V2 regression verified after every V3 change
- No backend tests required (V3 is frontend-only demo data)

### Known Cosmetic Issue
React hydration warnings from preview environment's visual-edit instrumentation (`<span data-ve-dynamic>` wrapping `.map()` output). Zero functional impact — display:contents makes spans invisible to layout. Only appears in dev console.

---

## 11. Appendix: Complete Route Map

### Global Routes
| Route | Component | Access |
|-------|-----------|--------|
| / | LandingPage | Public |
| /select | VersionSelector | Public |
| /feedback | FeedbackAdmin | Public |

### V1 Routes (46+ pages across 5 portals)
| Route | Portal |
|-------|--------|
| /v1 | V1RoleSelector |
| /staff/* | Staff Portal (15 pages) |
| /brand/* | Brand Portal (10 pages) |
| /creative/* | Creative Portal (8 pages) |
| /super-creative/* | Super Creative Portal (8 pages) |
| /admin/* | Admin Portal (8 pages) |

### V2 Routes (28 routes across 3 portals)
| Route | Portal |
|-------|--------|
| /v2 | V2RoleSelector |
| /v2/command/* | TASCK Command (12 routes) |
| /v2/brand/* | Brand Portal (8 routes) |
| /v2/talent/* | Talent Network (8 routes) |

### V3 Routes (40+ pages across 3 portals + standalone)
| Route | Component |
|-------|-----------|
| /v3 | V3RoleSelector |
| /v3/enquiry | V3BrandInreach |
| /v3/admin | V3AdminOverview |
| /v3/admin/pipeline | V3AdminPipeline |
| /v3/admin/projects | V3AdminProjects |
| /v3/admin/projects/:id | V3AdminProjectDetail |
| /v3/admin/projects/:id/brainstorm | V3AdminBrainstorm |
| /v3/admin/projects/:id/feedback | V3AdminFeedback |
| /v3/admin/projects/:id/scope-changes | V3AdminScopeChange |
| /v3/admin/projects/:id/contract | V3AdminContractPreview |
| /v3/admin/crm | V3AdminCRM |
| /v3/admin/crm/:id | V3AdminBrandDetail |
| /v3/admin/creators | V3AdminCreators |
| /v3/admin/creators/:id | V3AdminCreatorDetail |
| /v3/admin/contracts | V3AdminContracts |
| /v3/admin/templates | V3AdminTemplates |
| /v3/admin/insights | V3AdminInsights |
| /v3/admin/reports | V3AdminReports |
| /v3/admin/wallet | V3AdminWallet |
| /v3/admin/fees | V3AdminFees |
| /v3/admin/tasks | V3AdminTasks |
| /v3/admin/users | V3AdminUsers |
| /v3/admin/settings | V3AdminSettings |
| /v3/brand | V3BrandOverview |
| /v3/brand/projects | V3BrandProjects |
| /v3/brand/projects/:id | V3BrandProjectDetail |
| /v3/brand/approvals | V3BrandApprovals |
| /v3/brand/documents | V3BrandDocuments |
| /v3/brand/invoices | V3BrandInvoices |
| /v3/brand/messages | V3BrandMessages |
| /v3/brand/settings | V3BrandSettings |
| /v3/creator | V3CreatorOverview |
| /v3/creator/briefs | V3CreatorBriefs |
| /v3/creator/projects | V3CreatorProjects |
| /v3/creator/deliverables | V3CreatorDeliverables |
| /v3/creator/wallet | V3CreatorWallet |
| /v3/creator/profile | V3CreatorProfile |
| /v3/creator/messages | V3CreatorMessages |
| /v3/creator/settings | V3CreatorSettings |

---

*Document generated 21 April 2026. TASCK OS v3.0.*
*For the latest version, visit the application at the deployment URL.*
