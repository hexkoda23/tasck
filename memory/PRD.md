# TASCK OS - Product Requirements Document

## Overview
**Product Name:** TASCK OS  
**Tagline:** "Creativity, Managed."  
**Updated:** March 2, 2026

## Problem Statement
Premium demo for TASCK — a Nigerian creator economy company connecting Brands, Super Creatives, Creatives, Staff, and Admins.

## Design System (Light Theme — V2)
- **Background:** #F8FAFC (page), #FFFFFF (cards, sidebar)
- **Text:** #0F172A (headings), #475569 (body), #94A3B8 (muted), #CBD5E1 (subtle)
- **Borders:** #E2E8F0 (standard), #F1F5F9 (light)
- **Primary:** #2F55FF, light: #EEF2FF
- **Success:** #22C55E, light: #ECFDF5
- **Warning:** #F59E0B, light: #FFFBEB
- **Error:** #EF4444, light: #FEF2F2
- **Fonts:** Playfair Display (display), DM Sans (UI), JetBrains Mono (numbers)
- **Big Numbers:** 32px JetBrains Mono bold #0F172A
- **Cards:** White bg, 1px #E2E8F0 border, 12px radius, hover shadow
- **Sidebar:** 240px white, blue active indicator bg
- **Landing:** Split-screen (dark left, white right with role cards)
- **References:** WeTransfer, Compound, SimilarWeb, Perk

## What's Implemented

### Phase 1 — Complete (March 2, 2026)
- Split-screen login page (dark branding left, white role selector right)
- 5-role demo login system
- Staff Dashboard: metrics, activity feed, copilot, pipeline kanban, roster grid, brands CRM, revenue, projects, opportunities, deals
- Brand Portal: overview, discover, campaigns, approvals, analytics, spend
- Super Creative Portal: overview, portfolio, projects, opportunities, applications, wallet
- Creative Portal: overview, opportunities, projects, tasks, wallet, portfolio
- Admin Portal: overview, users, disputes, contracts, audit logs, permissions, wallets, settings
- Shared: messages, calendar, reports, settings
- Command palette (Ctrl+K)
- All 46 pages populated with Nigerian creative economy dummy data
- Full light theme conversion across all pages
- Backend: FastAPI + MongoDB with seed data

### Testing Results
- Iteration 4: 100% — all 46 pages, 5 portals, no invisible text, no "coming soon"

## Backlog
### P0
- [ ] Connect frontend to backend API
- [ ] Deal Room detail view
- [ ] Deal Origination Wizard

### P1
- [ ] Functional task submission workflow
- [ ] Messaging with threads
- [ ] Contract auto-generation

### P2
- [ ] Charts (Recharts)
- [ ] Calendar integration
- [ ] Mobile responsive
- [ ] PDF export
