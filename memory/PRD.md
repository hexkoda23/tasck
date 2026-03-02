# TASCK OS - Product Requirements Document

## Overview
**Product Name:** TASCK OS (The TASCK Agency Operating System)  
**Tagline:** "Creativity, Managed."  
**Build Date:** March 2, 2026

## Problem Statement
Build a premium, mind-blowing demo for TASCK - a Nigerian creator economy company. The platform connects Brands (Guinness, MTN, Pepsi), Super Creatives (Don Jazzy, Burna Boy teams), Creatives (freelancers), TASCK Staff (internal operators), and Admins.

## User Personas
1. **TASCK Staff** - Internal agents who originate deals, manage pipelines, coordinate fulfillment
2. **Brands** - Corporate clients tracking campaigns, approving deliverables, measuring ROI
3. **Super Creatives** - Artist teams creating projects, funding opportunities, hiring talent
4. **Creatives** - Freelancers finding gigs, completing tasks, getting paid
5. **Admins** - Platform governance, disputes, verification

## Design System
- **Primary Blue:** #2F55FF
- **Accent Green:** #6BFF9A
- **Deep Navy:** #071426
- **Dashboard BG:** #0B1221
- **Sidebar:** #050E1C
- **Card Gradient:** linear-gradient(135deg, #0F1729, #131D33)
- **Status Badges:** 10-12% opacity bg + matching text color
- **Fonts:** Playfair Display (display/landing), DM Sans (UI body), JetBrains Mono (numbers)
- **Radius:** 6px badges, 12px cards, 16px modals, 9999px pills/buttons
- **Sidebar Width:** 220px, 3px blue active indicator
- **Big Numbers:** 36px JetBrains Mono bold white
- **Landing:** Multi-layered gradient, frosted glass cards, SVG arc lines

## What's Been Implemented

### Phase 1 - Foundation + Design Overhaul (March 2, 2026)

**Landing Page (Linear/tasck.org quality)**
- Playfair Display "Creativity, Managed." headline (clamp 48-96px)
- Multi-layered sky gradient with radial hazes
- SVG curved arc lines (TASCK signature element)
- Floating "Demo Mode" pill badge (frosted glass, dismissible)
- Pill-shaped CTAs: Enter Demo (blue glow) + Learn More (outlined)
- 5 frosted glass role cards in a row (all green accent #6BFF9A icons)
- Two-column section: Brands (blue bg) + Top Creators (navy bg) with arc lines
- Community section with arc decorations
- "Five Portals. One Platform." section title

**Dashboard Layout (Refined Sidebar + Header)**
- 220px sidebar with role-specific green label (e.g., "STAFF PORTAL")
- 3px blue left-border active nav indicator
- Grouped nav with dividers separating main items from utilities
- Frosted glass search bar with ⌘K badge
- "New Deal" button with blue glow shadow
- Copilot panel (staff only) with typing indicator dots, green-bordered insights, quick action pills

**Staff Portal (Command Center)**
- Overview: 6 gradient metric cards with 36px big numbers, 3-column layout (Live Activity with status dots + timeline, Today's Priorities with numbered circles, AI Copilot with typing animation + match bars + Pursue/Dismiss pills)
- Pipeline Kanban: 8 columns with colored top borders per stage, deal cards with 3px left priority borders (no garish badges), square brand avatars, large deal values, artist in green accent
- Roster: Gradient header cards per artist (Mavin blue→purple, Spaceship red→orange, DMW gold→amber, etc.), large monogram initials, genre pills, Spotify/Instagram stats, Brand Value + Wallet
- Brands CRM: Square avatars for brands, relationship score as horizontal gradient bar, muted revenue formatting
- Revenue Intelligence with artist revenue, category breakdown, visual charts
- Projects, Opportunities, Deals pages with loading states

**Creative Portal**
- Overview with wallet, opportunities, tasks
- Opportunities with AI match scores
- My Projects with earnings/task tracking
- Tasks with submission workflow (in progress/submitted/approved)
- Wallet with transaction history
- Portfolio with rate card, featured work, reviews

**Super Creative Portal**
- Overview with wallet/escrow tracking
- Portfolio with team roster, featured projects, reviews
- Projects management with budget/team tracking
- Opportunities posting and hiring
- Applications review (accept/reject/shortlist)
- Wallet with escrow and transaction history

**Brand Portal**
- Overview with AI talent recommendations
- Discover Talent with AI-matched profiles
- My Campaigns with progress tracking
- Approvals with deliverable review workflow
- Campaign Analytics with engagement trends + social breakdown
- Spend Tracking with budget utilization per campaign

**Admin Portal**
- Platform metrics overview
- Users & Verification
- Disputes tracking with resolution workflow
- Contracts management
- Audit Logs with activity filtering
- Permissions (RBAC)
- Platform Wallets
- Platform Settings

**Shared Pages**
- Messages, Calendar, Reports, Settings (all populated, no "coming soon")

**Backend**
- FastAPI with MongoDB seed data (12 brands, 10 Super Creative teams, 20 Creatives, 14 Deals, 7 Projects)

## Test Results
- Iteration 1: Initial testing
- Iteration 2: 98% pass (settings "coming soon" fixed → 100%)
- Iteration 3: 100% pass — all 17 design features verified across 38+ pages in 5 portals

## Prioritized Backlog

### P0 - Critical
- [ ] Connect frontend to backend API (replace static data.js with live API calls)
- [ ] Deal Room detail view
- [ ] Deal Origination Wizard

### P1 - High Priority
- [ ] Task submission + approval workflow (functional)
- [ ] Creative Portfolio public site
- [ ] Messaging with threads (functional)
- [ ] Contract auto-generation

### P2 - Medium Priority
- [ ] Recharts integration for Revenue Intelligence
- [ ] Calendar integration
- [ ] Admin verification flow
- [ ] Mobile responsive
- [ ] PDF export for reports

### P3 - Nice to Have
- [ ] Payment integration (Paystack)
- [ ] Real AI for Copilot
- [ ] Email notifications
