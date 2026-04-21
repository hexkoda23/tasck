# TASCK OS — Product Requirements Document

## Original Problem Statement
Premium product demo for "TASCK OS" — a creator campaign management platform for the African market. Three versions:
- **V1 (Classic)**: Multi-portal operational platform (light theme) — COMPLETE
- **V2 (Next)**: AI-native command center (dark theme) — COMPLETE
- **V3 (TASCK)**: Greenfield PRD build with editorial design, 4-stage pipeline, 3 portals — COMPLETE

## PRD Coverage Status: ~95%

### V3 — 38 pages, zero placeholders

**Admin Control Centre (20 pages)**:
Overview, Pipeline, Projects, Project Detail (8-tab), Brainstorm/Campaign Workspace, CRM, Brand Detail, Creators, Creator Detail, Contracts, Templates, Insights, Reports, Wallet, Fees, Tasks (team task board), Users & Roles (user management), Feedback (brand/creator), Settings

**Brand Portal (8 pages)**:
Overview, Projects, Project Detail, Approvals, Documents vault, Invoices, Messages (interactive chat), Settings

**Creator Portal (8 pages)**:
Overview, Briefs, Projects, Deliverables (seeded historical), Wallet (seeded ₦142M+), Profile, Messages (interactive chat), Settings

**Standalone (2 pages)**:
Role Selector, Brand Inreach/Enquiry Form

### PRD Gap Closure (21 Apr 2026):
1. Brand Inreach Form (`/v3/enquiry`) — structured web form for brand-initiated enquiries
2. Campaign Brainstorming Workspace (`/v3/admin/projects/:id/brainstorm`) — strategic notes, AI suggestions, campaign angles, creator shortlist
3. Task Assignment (`/v3/admin/tasks`) — 16 tasks across 7 projects, status filters, RM assignment, priority badges
4. User & Role Management (`/v3/admin/users`) — 16 users across 3 portals, search, role filtering, invite button
5. Feedback Forms (`/v3/admin/projects/:id/feedback`) — brand feedback with 9.8/10 rating, highlights, improvements, creator feedback pending

### Remaining P1 Gaps (AI features — UI stubs):
- Generate buttons exist but don't call actual AI (pre-loaded content)
- Contact enrichment, contract risk flagging, scope creep detection, progress anomaly detection
- These are backend/AI integration features, not UI gaps

### Remaining P2:
- Mobile responsiveness pass
- WhatsApp notification integration
- Business card image interpreter
