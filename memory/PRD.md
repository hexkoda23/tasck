# TASCK OS - Product Requirements Document

## Overview
**Product Name:** TASCK OS  
**Tagline:** "Creativity, Managed."  
**Updated:** March 17, 2026

## Problem Statement
Premium demo for TASCK -- a Nigerian creator economy company connecting Brands, Super Creatives, Creatives, Staff, and Admins. The product has two versions: V1 (solid functional platform) and V2 (futuristic AI-powered operating system).

## What's Implemented

### V1 -- Complete
- Full-screen "Creativity, Managed." landing page → Enter Demo → Version Selector → V1 Role Selector (5 roles)
- All 46+ pages populated with Nigerian creative economy data
- Full light theme across all pages
- Welcome gradient banners on all 5 overview pages
- Compact metric cards, font size optimization
- Data-rich dashboards with clickable detail popups
- Meetings (transcript upload), Contracts, Shared Wallet
- Quick Action modals for all 5 portals

### V2 Phase A -- Complete
- Version Selector (V1 vs V2) at /select
- V2 Role Selector (3 roles: TASCK Command, Brand Portal, Talent Network)
- V2 Layout with slim icon-only sidebar, command bar, Geist fonts
- Command Center (AI briefing dashboard) at /v2/command
- Intelligence Center (market signals feed) at /v2/command/signals
- Command Bar (Cmd+K) with quick actions

### V2 Phase B -- Complete (March 17, 2026)
- **Pipeline** (/v2/command/pipeline): Kanban/Flow/Timeline views, 15 deals across 7 stages, Sankey-style flow visualization, stage transitions, monthly timeline with deadlines
- **Deal Room** (/v2/command/deals): Deal list + interactive Simulator with 5 sliders, scenario modeling, AI recommendations, quick scenario presets
- **Network** (/v2/command/network): Force-directed relationship graph (react-force-graph-2d), 10 brands + 10 creatives + TASCK hub, 30 connections, filter by type/active deals
- **Live Command** (/v2/command/live): Mission control with 6 live metric tiles, 3-column layout (Active Deals, Event Feed, Team Activity), revenue target tracker, Copilot status

### Testing Results
- Iteration 8: 100% -- V2 Phase A (40+ features)
- Iteration 9: 100% -- V2 Phase B (60+ features, all 4 new pages verified)

## Backlog

### P0
- [ ] Connect frontend to backend API (replace mock data with live API calls)

### P1 (V2 Phase C -- Should Have)
- [ ] Revenue Intelligence (Forecast tab with scenario modeling)
- [ ] Automations Engine (Visual workflow automation)
- [ ] Money Flow Visualization (Sankey diagram for wallet/revenue)
- [ ] V2 Brand Portal (Enhanced analytics & health dashboard)
- [ ] V2 Talent Network (Unified view with performance analytics)
- [ ] Inline Copilot suggestions throughout V2

### P2 (Nice to Have)
- [ ] Analytics Playground
- [ ] Gantt timeline
- [ ] Conversational Copilot
- [ ] Match radar charts
- [ ] Command Palette functional search
- [ ] Messaging system
- [ ] Mobile responsive
