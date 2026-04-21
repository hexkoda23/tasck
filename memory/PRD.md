# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. Three versions:
- **V1 (Classic)**: Multi-portal operational platform (light theme) — COMPLETE
- **V2 (Next)**: AI-native command center (dark theme) — COMPLETE
- **V3 (TASCK)**: Greenfield PRD build with editorial design, 4-stage pipeline, 3 portals — COMPLETE

## V3 Feature Coverage: ~98% of PRD

### Core (38 pages + 10 premium features)

**Admin Control Centre (22 pages):**
Overview (sparklines), Pipeline, Projects, Project Detail (8-tab + contract/scope-change/brainstorm/feedback links), Brainstorm/Campaign Workspace, CRM, Brand Detail, Creators, Creator Detail, Contracts, Contract Preview (document), Scope Changes, Templates, Insights, Reports, Wallet, Fees, Tasks, Users & Roles, Feedback, Settings (interactive workflow config)

**Brand Portal (8 pages):**
Overview (with onboarding wizard), Projects, Project Detail, Approvals, Documents, Invoices, Messages (interactive chat), Settings

**Creator Portal (8 pages):**
Overview, Briefs, Projects, Deliverables (seeded), Wallet (seeded), Profile, Messages (interactive chat), Settings

**Standalone (2 pages):**
Role Selector (with enquiry link), Brand Inreach/Enquiry Form

### Premium Features (21 Apr 2026)
1. AI Typewriter animation component (V3Typewriter.js)
2. Scope Change Workflow (MTN approved + Star Lager under review)
3. Notification Center (8 items, 3 unread, navigation)
4. Contract Generation Preview (10-clause document in V3DocumentSurface)
5. Brand Onboarding Wizard (3-step flow)
6. Interactive Workflow Configuration (6 toggleable reminders with day counts)
7. Invoice PDF button (on contract preview)
8. Dashboard Sparkline Charts (SVG, 4 cards)
9. Dark Mode Toggle (full CSS theme)
10. Command+K Search (keyboard + click, searches projects/brands/creators)

### Testing
- iteration_9.json: V2 — 100% pass
- iteration_10.json: V3 foundation — 100% pass (27/27)
- iteration_11.json: V3 premium features — 100% pass (18/18)

### Remaining P2 Gaps
- Mobile responsiveness pass
- AI generation backend (buttons exist, content pre-loaded)
- WhatsApp integration
