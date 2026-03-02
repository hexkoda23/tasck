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
- **Fonts:** Playfair Display (display), DM Sans (UI), JetBrains Mono (numbers)
- **Big Numbers:** 32px JetBrains Mono bold #0F172A
- **Cards:** White bg, 1px #E2E8F0 border, 12px radius, hover shadow
- **Sidebar:** 240px white, blue active indicator bg
- **Landing:** Split-screen (dark left, white right with role cards)
- **References:** WeTransfer, Compound, SimilarWeb, Perk, Wiza, documentation.ai

## What's Implemented

### Phase 1 -- Complete (March 2, 2026)
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

### Phase 2 -- Complete (March 2, 2026)
- Staff Meetings page: meeting list, recording/transcription, AI summary, AI-generated action items, new meeting modal
- Staff Contracts page: contract list with parties, signature status tracking, send-to-all-parties modal
- Shared WalletPage: unified wallet with card visualization, balance, escrow, transactions for all roles (Creative, Super Creative, Brand, Admin)
- Quick Action modals: role-specific popups for "New" buttons across all 5 portals
- Navigation updated: Meetings + Contracts in Staff sidebar, Wallet in Brand sidebar
- Toaster updated to match light theme

### Testing Results
- Iteration 5: 100% -- 19/19 features verified across all 5 portals

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

## Architecture
```
/app/
  backend/ (FastAPI + MongoDB)
    server.py
  frontend/ (React + Tailwind + Shadcn)
    src/
      App.js (routes)
      components/layout/DashboardLayout.js (sidebar + header + quick actions)
      components/shared/ (MetricCard, Avatar, Logo, StatusBadge)
      pages/staff/ (10 pages including Meetings, Contracts)
      pages/brand/ (6 pages)
      pages/super-creative/ (5 pages)
      pages/creative/ (5 pages)
      pages/admin/ (8 pages)
      pages/shared/ (WalletPage, MessagesPage, CalendarPage, ReportsPage, SettingsPage)
      lib/api.js, utils.js
      context/AuthContext.js
```
