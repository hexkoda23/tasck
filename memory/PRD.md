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

## Core Requirements (Static)
- 5-role demo login system
- Deal management with Kanban pipeline
- Project and opportunity tracking
- Escrow and wallet simulation
- AI-powered recommendations (rule-based for demo)
- Nigerian creative economy data (real artists, real brands)
- tasck.org design aesthetic

## What's Been Implemented ✅

### Phase 1 - Foundation (March 2, 2026)
- ✅ Landing page with sky-blue gradient matching tasck.org
- ✅ 5 role-selection cards with demo login
- ✅ Staff Dashboard (Command Center):
  - Overview with metrics, activity feed, AI recommendations
  - Pipeline Kanban board (draggable deal cards)
  - Deals list with filters
  - Roster (Super Creative teams)
  - Brands CRM
- ✅ Creative Dashboard:
  - Overview with wallet, opportunities, tasks
  - AI-matched opportunities feed
  - Task management
- ✅ Super Creative Dashboard:
  - Wallet with escrow tracking
  - Active projects with progress
  - Transaction history
- ✅ Brand Dashboard:
  - AI talent recommendations
  - Active campaigns
- ✅ Admin Dashboard:
  - Platform metrics
  - User management
  - Disputes tracking
- ✅ TASCK Copilot (AI panel) with deal signals
- ✅ Command Palette (Ctrl+K)
- ✅ Backend API with comprehensive seed data

### Seed Data Included
- 12 Nigerian Brands (MTN, Guinness, Pepsi, Coca-Cola, Access Bank, etc.)
- 10 Super Creative Teams (Mavin Records, Spaceship, DMW, Starboy, Leading Vibes, etc.)
- 20 Freelance Creatives with skills and rates
- 14 Active Deals worth ₦847M pipeline value
- 7 Projects with opportunities and tasks
- AI-powered deal recommendations

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Deal Room detail view with documents, notes, checklist
- [ ] Deal Origination Wizard (step-by-step flow)
- [ ] Opportunity application flow for creatives
- [ ] Task submission and approval workflow

### P1 - High Priority
- [ ] Revenue Intelligence dashboard with charts
- [ ] Project Control Room with staffing and budget tracking
- [ ] Creative Portfolio (auto-generated site)
- [ ] Messaging system with threads
- [ ] Contract auto-generation

### P2 - Medium Priority
- [ ] Calendar integration
- [ ] Campaign analytics for brands
- [ ] Complete admin user verification flow
- [ ] Audit logs with filtering
- [ ] Mobile responsive improvements

### P3 - Nice to Have
- [ ] Real payment integration (Stripe/Paystack)
- [ ] Real AI integration for Copilot
- [ ] Email notifications
- [ ] Export reports to PDF

## Tech Stack
- **Frontend:** React 18, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI (Python)
- **Database:** MongoDB
- **Fonts:** DM Sans (headings), Inter (body), JetBrains Mono (numbers)

## Design System
- Primary Blue: #2F55FF
- Accent Green: #6BFF9A
- Deep Navy: #071426
- Sky gradient for landing, navy panels for dashboards

## Next Tasks
1. Implement Deal Room detail view
2. Add Deal Origination Wizard
3. Build creative opportunity application flow
4. Complete task submission workflow
5. Add Revenue Intelligence charts
