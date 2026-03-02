# TASCK OS - Product Requirements Document

## Overview
**Product Name:** TASCK OS  
**Tagline:** "Creativity, Managed."  
**Updated:** March 2, 2026

## Problem Statement
Premium demo for TASCK -- a Nigerian creator economy company connecting Brands, Super Creatives, Creatives, Staff, and Admins.

## Design System (Light Theme -- V2)
- **Background:** #F8FAFC (page), #FFFFFF (cards, sidebar)
- **Text:** #0F172A (headings), #475569 (body), #94A3B8 (muted), #CBD5E1 (subtle)
- **Borders:** #E2E8F0 (standard), #F1F5F9 (light)
- **Primary:** #2F55FF, light: #EEF2FF
- **Success:** #22C55E, light: #ECFDF5
- **Warning:** #F59E0B, light: #FFFBEB
- **Error:** #EF4444, light: #FEF2F2
- **Fonts:** Playfair Display (display), DM Sans (UI + numbers)
- **Compact UI:** 22px numbers, 11px labels, 16px card padding
- **Welcome Banners:** Role-specific dark gradients with inline stats
- **References:** WeTransfer, Compound, SimilarWeb, Trafft, Morningscore

## What's Implemented

### Phase 1 -- Complete
- Split-screen login with 5-role demo login
- All 46+ pages populated with Nigerian creative economy data
- Full light theme across all pages

### Phase 2 -- Complete
- Staff Meetings (with transcript upload), Staff Contracts, Shared WalletPage
- Quick Action modals for all 5 portals

### Phase 3 -- Complete (Design Refresh)
- Welcome gradient banners on all 5 overview pages
- Compact metric cards (22px numbers, smaller padding/labels)
- Font size reduction across all pages

### Phase 4 -- Complete (Data Enrichment)
- **Staff Overview**: 8 metric cards + Top Deals (5) + Pipeline Summary + Upcoming Tasks (5) + Team Performance (4) + Money Movement (4 transactions) + Activity Feed + Upcoming Meetings (4) + Brand Relationships (6) — all clickable with detail popups
- **Brand Overview**: 7 metric cards + Campaign Performance table (4 campaigns with impressions/engagement) + Deliverables (4) + AI Talent Recommendations (4 with match %) + Spend Breakdown (5 categories with bars) — all clickable
- **Creative Overview**: 8 metric cards + AI-Matched Opportunities (5 with fit scores) + Tasks (5) + Earnings Trend (3 months) + Skill Demand (4 skills with rates/trends) + Recent Payments (4) + Portfolio Stats (4) — all clickable
- **Super Creative Overview**: 8 metric cards + Project Timeline (4 with progress bars) + Transactions + Team Members (5 with earnings/ratings) + Hiring Pipeline (4 open roles with applicant counts) — all clickable
- **Admin Overview**: 8 metric cards + Platform Health (4 KPIs) + Revenue Breakdown (5 streams ₦200M total) + Compliance Alerts (4) + Active Disputes (3) + User Growth (4 months with stacked bars) + Top Creatives (4) + Top Brands (4) + Recent Users (6) — all clickable with action buttons
- **Meetings**: Upload Transcript button + drag-drop upload modal + per-meeting upload + AI processing indicator
- **Wallet**: Accessible from ALL portal sidebars (staff, brand, super_creative, creative, admin)
- **DetailPopup**: Reusable component for all clickable items across portals

### Testing Results
- Iteration 7: 100% — 45/45 features verified across all 5 portals, 0 issues

## Backlog
### P0
- [ ] Connect frontend to backend API (replace mock data with live API calls)
- [ ] Deal Room detail view
- [ ] Deal Origination Wizard

### P1
- [ ] Functional task submission workflow
- [ ] Messaging with threads
- [ ] Contract auto-generation

### P2
- [ ] Charts (Recharts) for analytics pages
- [ ] Calendar integration
- [ ] Mobile responsive
- [ ] PDF export
