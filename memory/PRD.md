# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. The project encompasses three distinct versions:
- **V1 (Classic)**: Multi-portal operational platform (light theme) — COMPLETE
- **V2 (Next)**: AI-native command center (dark theme) — COMPLETE
- **V3 (TASCK)**: Greenfield PRD build with editorial design, 4-stage pipeline, 3 portals — IN PROGRESS

## Core Requirements (V3)
- **Strict Isolation**: V3 is purely additive — V1 and V2 must not be touched
- **Editorial Design**: Fraunces (headings) + JetBrains Mono (data). V3DocumentSurface is the core UI pattern (720px max-width, white surface)
- **Four-Stage Pipeline**: Connect → Frame → Plan → Deliver
- **Seed Content**: 10 projects with realistic Nigerian campaign content. 3 flagship projects (Coca-Cola, Guinness, MTN) use verbatim user-provided content
- **3 Portals**: Admin Control Centre, Brand Portal, Creator Portal

## Architecture
- React + Tailwind CSS + React Router (frontend)
- FastAPI + MongoDB (backend — V3 currently uses client-side data from v3data.js)
- craco for build tooling
- Fonts: Fraunces, JetBrains Mono, Inter via Google Fonts

## What's Been Implemented

### V1 — COMPLETE
- 5 portals (Staff, Brand, Creative, Super Creative, Admin)
- 46+ pages with full mock data
- Auth with JWT

### V2 — COMPLETE
- 3 portals (Command, Brand, Talent)
- AI-native dark theme
- Deal simulator, pipeline flow, network graph, live command

### Global Features — COMPLETE
- Landing page → Version Selector (/select)
- Feedback popup + /feedback admin panel
- PRD export to TASCK_OS_PRD.md

### V3 — IN PROGRESS (Current Focus)

**Completed (14 March 2026):**

#### Admin Control Centre (15 pages — ALL REAL, NO PLACEHOLDERS)
- Overview — today dashboard with pipeline stats, attention items, activity feed
- Pipeline — 4-stage Kanban (Connect/Frame/Plan/Deliver) with all 10 projects
- Projects — full project list with stage indicators
- Project Detail — tabbed interface (Overview, Timeline, Alignment, Plan, Contracts, Delivery, Financials, Closure) with:
  - Alignment Snapshot in V3DocumentSurface (Coca-Cola verbatim content)
  - Creative Snapshot with version history (Guinness × Rema)
  - Creator Match rationale, Brief Response
  - Deliverables tracking (MTN × Burna Boy — 8 deliverables)
  - Final Report with KPI table (MTN — all targets exceeded)
  - Stage Gate conditions panel
  - AI Assist panel
- CRM — 10 brands with lead scores, search, sort
- Brand Detail — contact info, decision makers, lead score factors, interaction history
- Creators — 10 creator cards with performance metrics
- Creator Detail — full profile, bio, rate card, projects
- Contracts — contract status tracker
- Templates — 6 document templates
- Insights — business analytics (pipeline value, stage distribution, engagement mix, top brands/creators)
- Reports — 6 generated reports with real data
- Wallet — financial overview with transaction history
- Fees — fee structure and per-project estimates
- Settings — organization, pipeline config, notifications, integrations

#### Brand Portal (7 pages — ALL REAL)
- Overview — "Welcome back, Folake" with active projects, pending approvals
- Projects — project list with progress bars
- Project Detail — tabbed (Summary, Documents, Deliverables, Invoices)
- Approvals — pending document approvals
- Documents — document vault
- Invoices — billing summary
- Messages — conversation threads with RM
- Settings — account preferences

#### Creator Portal (8 pages — ALL REAL)
- Overview — "Welcome back, Rema" with stats, performance metrics
- Briefs — brief inbox with responded briefs (Guinness × Rema concept)
- Projects — active projects with progress
- Deliverables — upload/review/approved status tracking
- Wallet — earnings, balance, transaction history
- Profile — full profile with metrics, rate card, platforms
- Messages — conversation threads
- Settings — account, notifications, payment info

## Remaining / Backlog
- P2: Mobile responsiveness pass for V3
- P2: Refactoring App.js route splitting if needed (currently ~360 lines)

## Technical Notes
- V3 data: All client-side from `/app/frontend/src/lib/v3data.js` (772 lines of verbatim content)
- V3 CSS: Tokens in `/app/frontend/src/index.css` (lines 791–1088)
- Git tag `v1v2-complete-checkpoint` marks pre-V3 state
- Testing: iteration_9.json (V2, 100% pass), iteration_10.json (V3 foundation, 100% pass — 27/27 routes)
