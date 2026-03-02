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

## What's Been Implemented

### Phase 1 - Foundation (March 2, 2026)
- Landing page with sky-blue gradient matching tasck.org
- 5 role-selection cards with demo login
- Staff Dashboard (Command Center):
  - Overview with metrics, activity feed, AI recommendations
  - Pipeline Kanban board (draggable deal cards)
  - Deals list with filters
  - Roster (Super Creative teams)
  - Brands CRM
  - Projects page with project cards and progress bars
  - Opportunities table with status tracking
  - Revenue Intelligence with artist revenue, category breakdown, donut chart
- Creative Dashboard:
  - Overview with wallet, opportunities, tasks
  - AI-matched opportunities feed with match scores
  - My Projects with earnings and task tracking
  - Tasks page with submission workflow (in progress/submitted/approved)
  - Wallet with transaction history
  - Portfolio with rate card, featured work, client reviews
- Super Creative Dashboard:
  - Overview with wallet and escrow tracking
  - Portfolio with team roster, featured projects, reviews
  - Projects management with budget and team tracking
  - Opportunities posting and hiring management
  - Applications review with accept/reject/shortlist workflow
  - Wallet with escrow funding and transaction history
- Brand Dashboard:
  - Overview with AI talent recommendations
  - Discover Talent with AI-matched profiles
  - My Campaigns with progress tracking
  - Approvals with deliverable review workflow
  - Campaign Analytics with engagement trends and social breakdown
  - Spend Tracking with budget utilization per campaign
- Admin Dashboard:
  - Platform metrics overview
  - Users & Verification management
  - Disputes tracking with resolution workflow
  - Contracts management
  - Audit Logs with activity filtering
  - Permissions (role-based access control)
  - Platform Wallets with transaction monitoring
  - Platform Settings (commission, escrow rules, KYC)
- Shared Pages:
  - Messages with conversation threads
  - Calendar with events and schedule
  - Reports with project analytics
  - Settings with profile, notifications, security, appearance
- TASCK Copilot (AI panel) with deal signals
- Command Palette (Ctrl+K)
- Backend API with comprehensive seed data
- ALL pages populated with rich Nigerian creative economy dummy data (NO placeholders)

### Seed Data Included
- 12 Nigerian Brands (MTN, Guinness, Pepsi, Coca-Cola, Access Bank, etc.)
- 10 Super Creative Teams (Mavin Records, Spaceship, DMW, Starboy, Leading Vibes, etc.)
- 20 Freelance Creatives with skills and rates
- 14 Active Deals worth ₦847M pipeline value
- 7 Projects with opportunities and tasks
- AI-powered deal recommendations

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Connect frontend to backend API (replace static data with live API calls)
- [ ] Deal Room detail view with documents, notes, checklist
- [ ] Deal Origination Wizard (step-by-step flow)

### P1 - High Priority
- [ ] Opportunity application flow for creatives
- [ ] Task submission and approval workflow (functional)
- [ ] Creative Portfolio auto-generated public site
- [ ] Messaging system with threads (functional, not just UI)
- [ ] Contract auto-generation

### P2 - Medium Priority
- [ ] Calendar integration (functional)
- [ ] Campaign analytics with real charts (Recharts)
- [ ] Complete admin user verification flow
- [ ] Mobile responsive improvements
- [ ] Export reports to PDF

### P3 - Nice to Have
- [ ] Real payment integration (Stripe/Paystack)
- [ ] Real AI integration for Copilot
- [ ] Email notifications

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
