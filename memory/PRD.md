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
- **Big Numbers:** 22px DM Sans bold #0F172A (reduced from 32px)
- **Metric Label:** 11px uppercase, letter-spacing 0.03em
- **Cards:** White bg, 1px border, 10px radius, 16px padding (compact)
- **Welcome Banners:** Role-specific gradients (dark navy to accent color), 16px radius, 28px padding
- **Sidebar:** 240px white, blue active indicator
- **References:** WeTransfer, Compound, SimilarWeb, Trafft, Morningscore, documentation.ai

## What's Implemented

### Phase 1 -- Complete
- Split-screen login page (dark branding left, white role selector right)
- 5-role demo login system
- Staff Dashboard: metrics, activity feed, copilot, pipeline kanban, roster grid, brands CRM, revenue, projects, opportunities, deals
- Brand Portal: overview, discover, campaigns, approvals, analytics, spend
- Super Creative Portal: overview, portfolio, projects, opportunities, applications, wallet
- Creative Portal: overview, opportunities, projects, tasks, wallet, portfolio
- Admin Portal: overview, users, disputes, contracts, audit logs, permissions, wallets, settings
- Shared: messages, calendar, reports, settings
- Command palette (Ctrl+K)
- All 46+ pages populated with Nigerian creative economy data
- Full light theme conversion

### Phase 2 -- Complete
- Staff Meetings page: meeting list, recording/transcription, AI summary, action items, new meeting modal
- Staff Contracts page: contract list with parties, signature tracking, send-to-all modal
- Shared WalletPage: unified wallet with card visualization, escrow, transactions
- Quick Action modals: role-specific popups for all 5 portals

### Phase 3 -- Complete (Design Refresh)
- Welcome gradient banners on all 5 portal overviews (Trafft/Morningscore inspired)
- Compact metric cards: reduced from 32px to 22px numbers, smaller padding
- Smaller font sizes across all dashboard cards and content (text-sm, text-xs, text-[10px])
- Pipeline card values reduced from text-xl to text-base
- Page headers reduced from text-2xl to text-lg
- Section headers reduced from text-lg to text-sm
- Card padding reduced from p-6 to p-5 globally

### Testing Results
- Iteration 6: 100% -- 27/27 features verified across all 5 portals

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
