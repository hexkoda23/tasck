# TASCK OS v1 Product Requirements Document

**Document version:** 1.0  
**Product version:** TASCK OS v1 Classic  
**Date:** 2026-06-02  
**Company:** The TASCK Agency  
**Primary audience:** Product, engineering, design, demo operations, leadership, investors, brand partners  
**Document purpose:** Define the full v1 product scope, experience model, role requirements, system behavior, data model, quality bar, and release criteria for the classic TASCK OS multi-portal operating platform.

---

## 1. Executive Summary

TASCK OS v1 is the classic operating platform for The TASCK Agency. It is designed to demonstrate how a premium African creator economy company can manage the complete lifecycle of brand and creative partnerships in one structured system. The product connects five role-based portals:

- TASCK Staff
- Brand
- Super Creative
- Creative
- Admin

The v1 product focuses on operational clarity. It gives each user type the views, workflows, and financial controls they need to originate deals, manage projects, track deliverables, coordinate talent, approve work, resolve disputes, and move money through wallet and escrow-style flows.

Unlike later AI-native versions of TASCK OS, v1 should feel like the dependable system of record: professional, readable, trust-building, and easy to demo. It should make the agency's business model understandable within minutes while still offering enough depth to prove that TASCK can support real campaign operations.

The product is built as a React and FastAPI demo application. The frontend presents polished role-based dashboards and workflows. The backend provides demo login, seeded Nigerian creative economy data, feedback capture, and core resource APIs for users, brands, deals, projects, opportunities, tasks, wallets, messages, stats, and recommendations.

---

## 2. Product Context

### 2.1 Company Context

The TASCK Agency operates in the African creator economy, connecting premium brands with high-value creatives, super creative teams, and freelance specialists. The platform should present TASCK as:

- A deal origination engine for brands and talent.
- A project operations layer for campaign execution.
- A payment and escrow coordination layer.
- A trusted intermediary for contracts, deliverables, approvals, and dispute handling.
- A culturally fluent platform built around Nigerian and broader African creative industry realities.

### 2.2 Problem Statement

Brand-creator partnerships are often managed across scattered channels: email, WhatsApp, spreadsheets, meeting notes, banking apps, contract tools, and informal talent networks. This creates several operational problems:

- Staff cannot easily see the full state of a deal, project, talent roster, contract, or payment.
- Brands lack transparent visibility into campaign spend, approvals, campaign progress, and ROI.
- Super creative teams need a structured way to manage projects, hire talent, and control funds.
- Freelance creatives need clear opportunities, task expectations, payment visibility, and portfolio credibility.
- Platform administrators need oversight of users, wallets, disputes, contracts, compliance, and audit history.

TASCK OS v1 solves this by centralizing the workflows into one role-aware operating system.

### 2.3 Product Vision

TASCK OS v1 should be the operational foundation for African creator commerce. It should help users answer:

- What deals are active?
- Who owns each next step?
- What needs approval?
- Which creatives are available and trusted?
- How much money is committed, escrowed, paid, or pending?
- What contracts are drafted, sent, signed, or blocked?
- Which projects, opportunities, and tasks are at risk?

### 2.4 V1 Product Positioning

TASCK OS v1 is the "Classic" version of the product. It should prioritize:

- Multi-portal role clarity.
- Dense but readable operational dashboards.
- Realistic Nigerian data and Naira-denominated commercial flows.
- End-to-end demo storytelling across staff, brand, talent, and admin roles.
- Familiar SaaS interaction patterns rather than experimental AI-first interfaces.

---

## 3. Goals And Non-Goals

### 3.1 Product Goals

1. Provide a complete multi-role demo of TASCK's operating model.
2. Show the full journey from deal origination to contract, project execution, deliverable approval, and payout.
3. Give each role a credible portal with metrics, navigation, and workflows tailored to that user.
4. Use realistic Nigerian brands, artists, creative teams, freelancers, campaign values, and transaction data.
5. Make the system feel enterprise-ready enough for investors and brand partners.
6. Allow the TASCK team to collect feedback from every page during demos.
7. Provide enough backend APIs and seed data to support future migration from static demo UI to live data-backed workflows.

### 3.2 Demo Goals

The v1 demo should support a guided walkthrough where a presenter can:

1. Enter the product from the landing page and choose TASCK OS v1.
2. Select a role and automatically enter that role's portal.
3. Show staff pipeline, contracts, meetings, and deal intelligence.
4. Switch to the brand portal to show campaign visibility and approvals.
5. Switch to the super creative portal to show project and hiring workflows.
6. Switch to the creative portal to show opportunities, tasks, portfolio, and wallet.
7. Switch to the admin portal to show governance, platform health, disputes, permissions, and treasury.

### 3.3 User Goals

TASCK Staff should be able to:

- Track pipeline value, deal stage, owners, meetings, contracts, and brand relationships.
- Quickly identify deals and tasks requiring attention.
- Manage opportunities for creatives.
- Review and send contracts.
- Use meeting summaries and action items to drive follow-up.

Brands should be able to:

- See campaign status, spend, ROI, and pending approvals.
- Discover credible creative talent.
- Review deliverables and campaign progress.
- Monitor wallet balance, escrow, and payment history.

Super Creatives should be able to:

- Track team projects, wallet balance, escrow, and hiring pipelines.
- Post and manage opportunities.
- Review applications from creatives.
- Showcase portfolio and team roster.

Creatives should be able to:

- Find opportunities matched to their skill set.
- Manage assigned projects and tasks.
- Track payment status, wallet balance, and earnings.
- Maintain a credible portfolio and rate card.

Admins should be able to:

- See platform-level health and commercial metrics.
- Manage users, KYC, contracts, disputes, wallets, permissions, and settings.
- Review audit logs and compliance alerts.

### 3.4 Non-Goals For V1

V1 is not required to ship:

- Real authentication beyond demo role login.
- Production-grade payment rails or bank transfers.
- Real digital signature integration.
- Real meeting recording, transcription, or AI processing.
- Real AI model integrations for recommendations.
- Real-time collaboration.
- Full production-grade notification delivery.
- Full mobile-first workflow parity.
- Public creator marketplace discovery outside role-protected portals.
- Self-serve onboarding for external customers.

These may be future roadmap items, but v1 should simulate them clearly where useful for demo storytelling.

---

## 4. Target Users And Personas

### 4.1 TASCK Staff

**Persona:** Senior agent, partnership manager, producer, operations lead.  
**Example user:** Tunde Balogun, TASCK staff agent focused on music and entertainment.  
**Primary motivation:** Close high-value partnerships and keep campaigns moving.  
**Primary pain:** Deal information is scattered across documents, calls, emails, and spreadsheets.  
**Success state:** Staff can see pipeline health, upcoming tasks, contract blockers, meeting notes, and next actions from one portal.

### 4.2 Brand User

**Persona:** Marketing lead, brand manager, head of culture, partnership lead.  
**Example user:** Adenike Ogunlesi, brand contact at Guinness Nigeria.  
**Primary motivation:** Prove campaign performance and manage spend responsibly.  
**Primary pain:** Brand partnerships feel opaque once work begins; approvals and payments can become unclear.  
**Success state:** Brand users can track active campaigns, deliverables, ROI, approvals, spend, wallet activity, and recommended talent.

### 4.3 Super Creative

**Persona:** Artist team, label, creative collective, manager, high-profile creator organization.  
**Example user:** Mavin Records Team.  
**Primary motivation:** Operate like a creative business with projects, subcontractors, and reliable payments.  
**Primary pain:** Managing freelance talent, budgets, and deliverables is operationally heavy.  
**Success state:** Super creative teams can view active projects, hire talent, track applications, manage escrow, and present their portfolio.

### 4.4 Creative

**Persona:** Freelance photographer, videographer, designer, social strategist, stylist, producer, writer.  
**Example user:** Kelechi Amadi-Obi.  
**Primary motivation:** Win quality gigs, understand expectations, submit work, and get paid reliably.  
**Primary pain:** Informal hiring makes scope, deadlines, approvals, and payments uncertain.  
**Success state:** Creatives can find opportunities, understand task requirements, monitor due dates, showcase work, and track payments.

### 4.5 Admin

**Persona:** Platform operator, finance admin, compliance lead, support manager.  
**Example user:** Platform Admin.  
**Primary motivation:** Keep the platform safe, financially accurate, and operationally healthy.  
**Primary pain:** Governance is difficult without centralized oversight across users, wallets, contracts, and disputes.  
**Success state:** Admins can monitor platform health, users, disputes, audit logs, permissions, treasury, and configuration.

---

## 5. Product Scope

### 5.1 In Scope

V1 includes:

- Landing page and version selection.
- V1 role selector with five portal choices.
- Demo login for each role.
- Protected routes by role.
- Shared dashboard layout with sidebar navigation, top search, quick actions, notifications, and logout.
- Staff portal pages.
- Brand portal pages.
- Super Creative portal pages.
- Creative portal pages.
- Admin portal pages.
- Shared wallet, messages, calendar, reports, and settings pages where applicable.
- Global feedback popup.
- Feedback admin panel.
- Backend seed data and read APIs.
- Demo stats APIs.
- Basic mutation APIs for deal creation, deal status updates, task status updates, recommendation dismissal, and feedback creation.

### 5.2 Out Of Scope

V1 excludes:

- Production identity provider integration.
- Role invitation flows.
- Production authorization policies beyond route-level role protection.
- Real document storage.
- Real payment processing.
- Real bank verification.
- Real calendar integration.
- Real email, SMS, or WhatsApp sending.
- Real contract signature provider integration.
- Real media hosting.
- Real AI transcription, extraction, or recommendation generation.

### 5.3 V1 Completion Criteria

V1 is considered complete when:

- Every listed v1 route renders without runtime errors.
- Each portal communicates a coherent role-specific workflow.
- Demo login works for all five roles.
- Protected routes redirect unauthenticated users.
- Global feedback can be submitted and viewed in the feedback admin panel.
- Seed data populates backend collections on startup.
- Primary dashboard metrics, tables, lists, modals, and detail views are visually complete.
- All interactive elements required by the demo have stable `data-testid` attributes.

---

## 6. Information Architecture

### 6.1 Entry Flow

```text
/                  Landing page
/select            Version selector
/v1                V1 role selector
  /staff           TASCK Staff portal
  /brand           Brand portal
  /super-creative  Super Creative portal
  /creative        Creative portal
  /admin           Admin portal
/feedback          Feedback admin
```

### 6.2 V1 Role Selector

The V1 role selector is the entry point for classic TASCK OS. It should:

- Show the TASCK logo.
- Display a clear "TASCK OS v1 - Demo Mode" indicator.
- Present five role cards.
- Explain each role in one short sentence.
- Trigger demo login when a role is selected.
- Navigate to the correct portal path after login.
- Show a loading spinner while login is in progress.
- Offer a back control to return to version selection.

Role cards:

| Role card | Demo role | Destination | Purpose |
|---|---|---|---|
| TASCK Staff | `staff` | `/staff` | Originate deals and manage agency operations. |
| Brand | `brand` | `/brand` | Track campaigns, approvals, ROI, and spend. |
| Super Creative | `super_creative` | `/super-creative` | Manage projects, hiring, and team wallet. |
| Creative | `creative` | `/creative` | Find work, manage tasks, and get paid. |
| Admin | `admin` | `/admin` | Govern users, wallets, contracts, disputes, and permissions. |

### 6.3 Protected Portal Structure

Each portal uses the shared dashboard layout. Protected route behavior:

- If the user is loading, show loading state.
- If unauthenticated, redirect to `/`.
- If authenticated but role is not allowed, redirect to `/`.
- If authenticated and role is allowed, render the portal layout and nested route.

### 6.4 Shared Dashboard Layout

The shared dashboard layout includes:

- Fixed left sidebar.
- Role label near logo.
- Role-specific navigation.
- User identity area with avatar, name, role, and logout.
- Sticky top bar.
- Search trigger and command palette.
- Role-specific quick action button.
- Notification icon.
- Staff-only TASCK Copilot panel.
- Main content outlet.

---

## 7. Role-Based Portal Requirements

## 7.1 Staff Portal

### 7.1.1 Staff Portal Purpose

The Staff portal is TASCK's internal command workspace for managing pipeline, deals, projects, opportunities, meetings, contracts, revenue, rosters, brand relationships, and operational follow-up.

### 7.1.2 Staff Navigation

| Route | Page | Requirement summary |
|---|---|---|
| `/staff` | Overview | Executive dashboard for active deals, pipeline, revenue, tasks, meetings, brand relationships, and activity. |
| `/staff/pipeline` | Pipeline | Kanban board for deal stage tracking with drag/drop style behavior. |
| `/staff/deals` | Deals | Table-based deal management with filters and deal metadata. |
| `/staff/projects` | Projects | Project status and completion tracking. |
| `/staff/opportunities` | Opportunities | Opportunity listings for creative staffing. |
| `/staff/roster` | Roster | Managed super creative roster and performance cards. |
| `/staff/brands` | Brands | Brand partner directory and relationship data. |
| `/staff/revenue` | Revenue Intelligence | Revenue progress, artist contribution, and category breakdowns. |
| `/staff/meetings` | Meetings | Meeting schedule, recording, transcript upload, AI summary, and action items. |
| `/staff/contracts` | Contracts | Contract list, detail view, parties, signature status, terms, and send modal. |
| `/staff/wallet` | Wallet | Staff note directing wallet management to Admin. |
| `/staff/messages` | Messages | Shared messaging interface. |
| `/staff/calendar` | Calendar | Shared calendar interface. |
| `/staff/reports` | Reports | Shared report library. |
| `/staff/settings` | Settings | Shared settings interface. |

### 7.1.3 Staff Overview Requirements

The Staff Overview must provide:

- Personalized welcome banner.
- Eight metric cards:
  - Active Deals
  - Pipeline Value
  - Revenue YTD
  - Average Deal Size
  - Win Rate
  - Deal Velocity
  - Artists Managed
  - Commission YTD
- Top Deals list with clickable detail popups.
- Pipeline Summary showing deal distribution across stages.
- Upcoming Tasks with due dates and status.
- Team performance snapshot.
- Money Movement list.
- Activity Feed list.
- Upcoming Meetings list.
- Brand Relationships summary.

Acceptance criteria:

- Metrics are visible above the fold on desktop.
- Each card has a title, value, and relevant subtitle or trend where available.
- Clickable lists open detail popups without navigating away.
- Staff-only copilot toggle appears in the layout.

### 7.1.4 Staff Pipeline Requirements

The Pipeline page must:

- Display deal columns for lead and later deal stages.
- Show each deal as a compact card with brand, title, value, and priority/status indicators.
- Support drag/drop style state transitions in the UI.
- Show stage counts.
- Keep columns horizontally scrollable on narrower desktop layouts.

Expected stages:

- Lead
- Discovery
- Scoping
- Awaiting NDA
- Awaiting Terms
- Active
- Closed

Acceptance criteria:

- Deal cards remain legible inside columns.
- Moving a card should update the local UI stage.
- Each column should have a clear label and count.

### 7.1.5 Staff Deals Requirements

The Deals page must:

- Show a page title and subtitle.
- Provide a "New Deal" CTA.
- Show high-level filters.
- Render deals in a data table.
- Include deal ID, brand, campaign/title, value, stage, probability, owner, and last activity where available.
- Use status badges and currency formatting.

Acceptance criteria:

- Staff can scan deals by stage and value.
- Deal rows include stable test IDs.
- Empty states should be graceful if no deals match a filter.

### 7.1.6 Staff Projects Requirements

The Projects page must:

- Show active projects with brand, creative team, budget, status, timeline, and completion.
- Use progress indicators for completion.
- Separate active, review, completed, and archived-style states through badges.
- Support a "New Project" or project creation CTA in the layout quick action.

Acceptance criteria:

- Each project card or row communicates status, owner, and progress.
- Budget values should be shown in compact Naira format.

### 7.1.7 Staff Opportunities Requirements

The Opportunities page must:

- Display open and assigned opportunities.
- Include role name, project, client, budget, deadline, required skills, status, and assigned creative if any.
- Support scanning by open, shortlisted, accepted, and in-progress opportunities.
- Provide a route for staff to understand staffing gaps.

Acceptance criteria:

- Open opportunities should clearly indicate they need staffing.
- Assigned opportunities should show creative and progress details.

### 7.1.8 Staff Roster Requirements

The Roster page must:

- Show super creative teams managed or available in the network.
- Display team name, principal artist, genre, audience/follower signals, brand value, and rating/relationship signal where available.
- Use avatar or initial-based identity chips.
- Allow staff to visually compare talent.

Acceptance criteria:

- Roster cards are scannable and visually consistent.
- Each artist/team has a clear name and specialization.

### 7.1.9 Staff Brands Requirements

The Brands page must:

- Show brand partners in a table.
- Include category, contact person, marketing budget, relationship score, active deals, total revenue, and location where available.
- Use relationship score or activity data to signal account health.

Acceptance criteria:

- Staff can identify high-value and at-risk brand relationships.
- Table remains readable at desktop dashboard widths.

### 7.1.10 Staff Revenue Intelligence Requirements

The Revenue page must:

- Show annual revenue target progress.
- Show YTD revenue, target, commission, average deal size, and projected close rate where appropriate.
- Break down revenue by artist.
- Break down revenue by category.
- Use charts or visual bars for contribution.

Acceptance criteria:

- Revenue views should communicate where money is coming from and whether TASCK is on target.
- Charts must be readable without requiring tooltip-only information.

### 7.1.11 Staff Meetings Requirements

The Meetings page must:

- Show meeting stats:
  - This Week
  - Recordings
  - Transcribed
  - Action Items
- Provide tabs:
  - All
  - Upcoming
  - Transcribed
- Show a meeting list with status, date, time, duration, participants, and meeting ID.
- Let staff select a meeting to view detail.
- For transcribed meetings, show:
  - Participants
  - AI Summary
  - Transcript preview
  - AI-generated action items
  - Recording play button when available
  - Upload transcript action
- For scheduled meetings, show:
  - Scheduled state
  - Start Meeting Now CTA
  - Upload Transcript CTA
- Provide a New Meeting modal with:
  - Title
  - Date
  - Time
  - Participants
  - Agenda
  - Auto-record and transcribe toggle
- Provide an Upload Transcript modal with:
  - Drag/drop upload zone
  - Accepted formats: `.txt`, `.doc`, `.docx`, `.pdf`, `.srt`, `.vtt`
  - Uploaded file list
  - Delete file action
  - AI processing explanation
  - Process Transcripts CTA

Acceptance criteria:

- Meeting filters update the list.
- Selecting a meeting updates the detail panel.
- Uploading files updates the local uploaded files list.
- Uploaded files can be removed from the list.
- Scheduled meetings clearly differ from transcribed meetings.

### 7.1.12 Staff Contracts Requirements

The Contracts page must:

- Show contract stats:
  - Total Contracts
  - Pending Signature
  - Fully Signed
  - Total Value
- List contracts with:
  - Contract ID
  - Title
  - Type
  - Value
  - Status
- Let staff select a contract to see detail.
- Detail view must show:
  - Contract title
  - Contract type
  - Created date
  - Contract value
  - Parties
  - Each party's role
  - Signature status
  - Signed date where applicable
  - Terms including duration, deliverables, payment terms, escrow flag, and commission
- Provide actions:
  - Download PDF
  - Preview
  - Send to All Parties for unsigned contracts
- Send modal must:
  - List unsigned parties.
  - Explain email signature delivery.
  - Provide cancel and send actions.

Acceptance criteria:

- Fully signed contracts should not show "Send to All Parties."
- Pending or draft contracts should show signature CTA.
- Party signature status must be visible before sending.

---

## 7.2 Brand Portal

### 7.2.1 Brand Portal Purpose

The Brand portal gives brand partners visibility into campaigns, spend, approvals, talent discovery, performance, and reporting. It should make TASCK feel transparent, accountable, and premium.

### 7.2.2 Brand Navigation

| Route | Page | Requirement summary |
|---|---|---|
| `/brand` | Overview | Campaign metrics, performance, deliverables, talent recommendations, and spend breakdown. |
| `/brand/discover` | Discover Talent | Browse creative talent with filters and category chips. |
| `/brand/campaigns` | My Campaigns | Campaign list with budget, status, progress, talent, and timeline. |
| `/brand/approvals` | Approvals | Deliverable review queue with approval statuses and actions. |
| `/brand/analytics` | Campaign Analytics | Campaign metrics, engagement trend, platform breakdown, and performance table. |
| `/brand/spend` | Spend Tracking | Budget, escrow, payments, and campaign spend tracking. |
| `/brand/wallet` | Brand Wallet | Shared wallet view for brand funds and escrow. |
| `/brand/messages` | Messages | Shared messaging interface. |
| `/brand/reports` | Reports | Shared report library. |
| `/brand/settings` | Settings | Shared settings interface. |

### 7.2.3 Brand Overview Requirements

The Brand Overview must show:

- Personalized welcome banner.
- Seven metric cards:
  - Active Campaigns
  - Total Spend YTD
  - Artists Engaged
  - Average Campaign ROI
  - Total Impressions
  - Average Engagement
  - Pending Approvals
- Campaign Performance table.
- Recent Deliverables list.
- Recommended Talent list.
- Spend Breakdown chart or visual allocation.

Acceptance criteria:

- Brand can understand campaign status and ROI without entering another page.
- Pending approvals are visible as a key operational prompt.
- Recommended talent should present name, category, and match/relevance signal where available.

### 7.2.4 Discover Talent Requirements

The Discover Talent page must:

- Show available talent cards.
- Provide category filters.
- Present names, specialization, location, rate or brand value, rating, and availability.
- Include "View Profile" or equivalent card-level action.

Acceptance criteria:

- Category filters should visibly update active state.
- Talent cards should support quick comparison.
- Talent examples should be culturally relevant to Nigerian/African creative economy.

### 7.2.5 Campaigns Requirements

The Campaigns page must:

- Show campaign cards for active, review, and completed campaigns.
- Include campaign title, creative/talent, budget, status, timeline, deliverables, ROI, and progress.
- Provide campaign status badges.
- Include a CTA for new campaign creation or managed campaign request.

Acceptance criteria:

- Campaign cards show enough information for a marketing lead to know whether action is needed.
- Review/approval campaigns should stand out from completed campaigns.

### 7.2.6 Approvals Requirements

The Approvals page must:

- Show deliverables awaiting review.
- Include campaign, creator, deliverable type, due date, submitted date, status, asset preview placeholder, and notes.
- Support approval actions:
  - Approve
  - Request Changes
  - View Details
- Distinguish urgent, pending, approved, and revision states.

Acceptance criteria:

- Brand can quickly identify which deliverables need attention.
- Approval actions should be visible and consistent.
- Approved items should not look actionable in the same way as pending items.

### 7.2.7 Analytics Requirements

The Analytics page must:

- Show high-level campaign metrics such as impressions, engagement, reach, ROI, conversion, or earned media value.
- Show engagement trend over time.
- Show social platform breakdown.
- Show campaign performance table.

Acceptance criteria:

- Brand can compare campaigns and platforms.
- Trend visuals should be readable without hover dependencies.
- Metrics should support demo storytelling around campaign success.

### 7.2.8 Spend Tracking Requirements

The Spend page must:

- Show total budget, spent amount, remaining budget, escrowed amount, and pending payments.
- Break down spend by campaign.
- Show recent payments.
- Use consistent Naira formatting.
- Make escrowed and released funds visually distinct.

Acceptance criteria:

- Brand can see whether spend is within budget.
- Payment rows include amount, recipient, campaign, date, and status.

---

## 7.3 Super Creative Portal

### 7.3.1 Super Creative Portal Purpose

The Super Creative portal supports artist teams and high-value creative organizations managing commercial projects, team members, opportunities, applications, portfolio credibility, and wallet flows.

### 7.3.2 Super Creative Navigation

| Route | Page | Requirement summary |
|---|---|---|
| `/super-creative` | Overview | Team wallet, escrow, project, hiring, transaction, and team health overview. |
| `/super-creative/portfolio` | Portfolio | Team profile, roster, featured projects, and reviews. |
| `/super-creative/projects` | Projects | Active project cards with budget, staffing, tasks, and completion. |
| `/super-creative/opportunities` | Opportunities | Roles the team has posted or is managing. |
| `/super-creative/applications` | Applications | Candidate review and application pipeline. |
| `/super-creative/wallet` | Wallet | Team wallet and payment history. |
| `/super-creative/calendar` | Calendar | Shared calendar interface. |
| `/super-creative/messages` | Messages | Shared messaging interface. |
| `/super-creative/settings` | Settings | Shared settings interface. |

### 7.3.3 Super Creative Overview Requirements

The Super Creative Overview must show:

- Personalized welcome banner for team name.
- Eight metric cards:
  - Available balance
  - In Escrow
  - Total Earned
  - Active Projects
  - Team Members
  - Open Roles
  - Average Rating
  - Revenue YTD
- Project Timeline.
- Recent Transactions.
- Team Members.
- Hiring Pipeline.

Acceptance criteria:

- Super creative teams can understand money, project state, and hiring needs at a glance.
- Escrow must be visually distinct from available balance.

### 7.3.4 Super Creative Portfolio Requirements

The Portfolio page must:

- Show team profile identity.
- Include principal artist/team name, specialization, location, and audience signal.
- Show team roster.
- Show featured projects with brand/client, year, results, or value.
- Show client reviews.

Acceptance criteria:

- Portfolio should feel credible to brands reviewing talent.
- Featured projects should include campaign outcomes or commercial context.

### 7.3.5 Super Creative Projects Requirements

The Projects page must:

- Show project cards with title, client, budget, status, timeline, progress, open roles, tasks, and payment state.
- Distinguish active, review, completed, and staffing states.
- Provide a route to create or manage projects through quick actions.

Acceptance criteria:

- Project cards should make staffing gaps and delivery status obvious.
- Budget and completion should be visible on each card.

### 7.3.6 Super Creative Opportunities Requirements

The Opportunities page must:

- List opportunities posted by the super creative team.
- Include role, project, budget, required skills, deadline, status, applicants, and assigned creative where applicable.
- Support visibility into open and filled roles.

Acceptance criteria:

- Open roles should indicate applicant count and next decision.
- Filled roles should show assigned creative.

### 7.3.7 Super Creative Applications Requirements

The Applications page must:

- Show applications from creatives.
- Include applicant name, role, project, rating, rate, portfolio signal, cover note, status, and submitted date.
- Provide status actions such as shortlist, interview, offer, accept, reject, or review.
- Show application pipeline metrics.

Acceptance criteria:

- Super creative user can compare applicants quickly.
- Application status badges should be clear and consistent.

---

## 7.4 Creative Portal

### 7.4.1 Creative Portal Purpose

The Creative portal helps freelance talent find opportunities, manage projects and tasks, maintain a portfolio, and track earnings.

### 7.4.2 Creative Navigation

| Route | Page | Requirement summary |
|---|---|---|
| `/creative` | Overview | Wallet, projects, tasks, rating, opportunities, earnings, and portfolio metrics. |
| `/creative/opportunities` | Opportunities | Browse and apply for available gigs. |
| `/creative/projects` | My Projects | Track assigned projects and progress. |
| `/creative/tasks` | Tasks | Detailed task board with deliverables and payment amounts. |
| `/creative/wallet` | Wallet | Personal wallet and payment history. |
| `/creative/portfolio` | Portfolio | Profile, rate card, featured work, and client reviews. |
| `/creative/messages` | Messages | Shared messaging interface. |
| `/creative/settings` | Settings | Shared settings interface. |

### 7.4.3 Creative Overview Requirements

The Creative Overview must show:

- Personalized welcome banner.
- Eight metric cards:
  - Wallet Balance
  - Active Projects
  - Tasks Due
  - Completed Projects
  - Average Rating
  - Reliability
  - Earnings YTD
  - Pending Payments
- AI-Matched Opportunities list.
- My Tasks list.
- Earnings Trend.
- Skill Demand.
- Recent Payments.
- Portfolio Stats.

Acceptance criteria:

- Creative can see what to do next and what they are owed.
- Opportunities should indicate relevance or fit.
- Pending payments should be visible.

### 7.4.4 Creative Opportunities Requirements

The Opportunities page must:

- Show available opportunities with role, project, client, budget, skills, deadline, duration, and fit/match signal.
- Support apply CTA.
- Show badges for skill or status.
- Differentiate brand-originated and super-creative-originated work.

Acceptance criteria:

- Creative can decide whether to apply without leaving the card.
- Opportunity details should include both commercial and delivery context.

### 7.4.5 Creative Projects Requirements

The Projects page must:

- Show active, review, and completed projects.
- Include client, role, budget/payment, due date, completion, and status.
- Show task completion progress.

Acceptance criteria:

- Creative can identify project deadlines and payment status.
- Completed projects should remain visible as portfolio history.

### 7.4.6 Creative Tasks Requirements

The Tasks page must:

- Show assigned tasks with title, project, description, due date, status, deliverables, payment amount, and submission state.
- Distinguish:
  - Assigned
  - In Progress
  - Submitted
  - Revision Requested
  - Approved
  - Rejected
- Support visible actions such as Start, Submit, View Feedback, and Mark Done where appropriate for demo.

Acceptance criteria:

- Task cards should make urgency and payment amount clear.
- Revision requested tasks should stand out.
- Approved tasks should connect to payment/transaction story.

### 7.4.7 Creative Portfolio Requirements

The Portfolio page must:

- Show profile identity and tagline.
- Include specialties, rating, completed projects, reliability, and location.
- Show rate card.
- Show featured work.
- Show client reviews.

Acceptance criteria:

- Portfolio should serve as a brand-facing proof-of-work artifact.
- Rate card should be clear and tied to creative services.

---

## 7.5 Admin Portal

### 7.5.1 Admin Portal Purpose

The Admin portal gives TASCK operators platform-level oversight over users, compliance, contracts, wallets, disputes, audit logs, permissions, and configuration.

### 7.5.2 Admin Navigation

| Route | Page | Requirement summary |
|---|---|---|
| `/admin` | Overview | Platform health, revenue, users, disputes, compliance, and growth. |
| `/admin/users` | Users & Verification | User directory, roles, verification, and KYC status. |
| `/admin/disputes` | Disputes | Dispute queue and risk overview. |
| `/admin/contracts` | Contracts | Platform-wide contract oversight. |
| `/admin/audit` | Audit Logs | Activity and security event history. |
| `/admin/permissions` | Permissions | Role permission matrix. |
| `/admin/wallets` | Wallets | Platform treasury and transaction oversight. |
| `/admin/settings` | Platform Settings | Commission, escrow, KYC, and notification configuration. |

### 7.5.3 Admin Overview Requirements

The Admin Overview must show:

- Welcome banner.
- Eight metric cards:
  - Total Users
  - Platform Volume
  - Revenue YTD
  - Active Projects
  - Pending KYC
  - Active Disputes
  - Escrow Balance
  - Contracts MTD
- Platform Health list.
- Compliance & Alerts list.
- Revenue Breakdown.
- Active Disputes list.
- User Growth chart.
- Top Creatives.
- Top Brands.
- Recent Users.

Acceptance criteria:

- Admin can identify platform health, risk, and growth from the overview.
- Compliance and dispute issues should stand out visually.

### 7.5.4 Admin Users Requirements

The Users & Verification page must:

- Show user directory across roles.
- Include user name, role, email, location, verification status, KYC status, joined date, and activity where available.
- Provide filtering or segmentation by role/status.
- Provide user-level actions in the UI for review, verify, suspend, or view detail where appropriate for demo.

Acceptance criteria:

- Pending verification users are easy to identify.
- Roles should use consistent labels and badges.

### 7.5.5 Admin Disputes Requirements

The Disputes page must:

- Show dispute queue.
- Include project, parties, amount at risk, issue type, severity, status, opened date, and owner.
- Provide actions such as Review, Assign, Resolve, or Escalate.
- Use severity styling.

Acceptance criteria:

- Admin can prioritize disputes by severity and value at risk.
- Dispute status must be visible on every item.

### 7.5.6 Admin Contracts Requirements

The Admin Contracts page must:

- Show platform-wide contracts.
- Include contract ID, parties, value, status, signed state, and risk signal where available.
- Allow admin to identify unsigned or blocked contracts.

Acceptance criteria:

- Admin view should not duplicate staff contract workflow exactly; it should emphasize oversight.
- Blocked or pending contracts should be easy to scan.

### 7.5.7 Admin Audit Logs Requirements

The Audit Logs page must:

- Show timestamped platform events.
- Include actor, action, entity type, entity ID, IP/device or metadata where available, and severity.
- Support filtering by event type or severity in the UI where appropriate.

Acceptance criteria:

- Logs should read like a trustworthy audit trail.
- Security-relevant events should be visually distinct.

### 7.5.8 Admin Permissions Requirements

The Permissions page must:

- Show role permission cards or matrix.
- Include roles:
  - Staff
  - Brand
  - Super Creative
  - Creative
  - Admin
- Display permissions such as view deals, edit deals, view wallet, manage users, approve deliverables, manage contracts, resolve disputes, and configure platform settings.

Acceptance criteria:

- Admin can understand role boundaries.
- Permissions should be grouped by domain.

### 7.5.9 Admin Wallets Requirements

The Wallets page must:

- Show platform treasury balances.
- Include available, escrowed, pending, and total processed values.
- Show recent transactions.
- Distinguish credits, debits, escrow holds, escrow releases, and withdrawals.

Acceptance criteria:

- Admin can understand money movement and escrow exposure.
- Transactions should show type, description, date, amount, and balance.

### 7.5.10 Admin Settings Requirements

The Platform Settings page must include:

- Commission Settings.
- Escrow Rules.
- KYC Requirements.
- Notifications.

Acceptance criteria:

- Settings are clearly grouped and presented as platform controls.
- Demo controls should look configurable even if persistence is mocked.

---

## 8. Shared Feature Requirements

### 8.1 Wallet

The shared Wallet page adapts by role.

Brand wallet:

- Available balance.
- Escrowed funds.
- Total spent.
- Linked bank.
- Virtual card.
- Transaction history.
- Fund Wallet CTA.
- Withdraw CTA where applicable.

Super Creative wallet:

- Available balance.
- Escrowed funds.
- Pending payments.
- Total earned.
- Linked bank.
- Virtual card.
- Transaction history.

Creative wallet:

- Available balance.
- Pending payments.
- Total earned.
- Linked bank.
- Virtual card.
- Transaction history.

Admin wallet:

- Platform treasury available balance.
- Escrow exposure.
- Total processed.
- Linked bank.
- Virtual card.
- Transaction history.

Staff wallet:

- Staff users should see a note that wallet management is handled through Admin.

Acceptance criteria:

- Balance visibility can be toggled.
- Credits and debits are visually distinct.
- Escrow and pending states are not confused with available balance.
- Transaction history can be exported in demo UI.

### 8.2 Messages

The shared Messages page must:

- Show thread list.
- Show selected conversation.
- Display participants, snippets, unread state, timestamps, and message bubbles.
- Provide a compose input area.

Acceptance criteria:

- Selecting a thread changes visible conversation.
- Thread list supports scanning by sender and recent message.

### 8.3 Calendar

The shared Calendar page must:

- Show month view.
- Mark days with events.
- Show upcoming events.
- Show today's schedule.
- Use event type styling.

Acceptance criteria:

- Calendar communicates dates, times, event titles, and event categories clearly.
- Events relevant to deals, approvals, shoots, and meetings should be represented.

### 8.4 Reports

The shared Reports page must:

- Show report cards.
- Include report type, title, description, generated date, owner, and status.
- Provide actions such as View, Download, or Export.

Acceptance criteria:

- Reports should support brand, staff, and admin demo narratives.
- Report cards should be easy to scan by type and date.

### 8.5 Settings

The shared Settings page must:

- Show Profile settings.
- Show Notification settings.
- Show Security settings.
- Show Appearance settings.
- Use role-aware user data where available.

Acceptance criteria:

- Settings controls should be grouped and legible.
- Profile data should reflect the authenticated demo user when available.

### 8.6 Command Palette

The shared dashboard command palette must:

- Open from top search trigger.
- Open with Cmd+K or Ctrl+K.
- Close with Escape.
- Show role-specific quick actions.
- Use the same action list as the role quick action modal.

Acceptance criteria:

- Keyboard shortcut opens the palette.
- Escape closes the palette.
- Search input auto-focuses when opened.

### 8.7 Quick Actions

Each role must have a primary quick action label and action menu.

Staff quick actions:

- Create New Deal.
- Schedule Meeting.
- Create Contract.
- Post Opportunity.

Brand quick actions:

- Launch Campaign.
- Discover Talent.
- Request Approval.

Super Creative quick actions:

- Create Project.
- Post Opportunity.
- Fund Wallet.

Creative quick actions:

- Browse Opportunities.
- Update Portfolio.
- Withdraw Funds.

Admin quick actions:

- Manage Users.
- Review Disputes.
- Generate Report.

Acceptance criteria:

- Quick action button label changes by role.
- Modal opens with actions and closes after selecting/canceling.
- Each action has icon, title, and description.

### 8.8 Staff Copilot Panel

The Staff-only Copilot panel should:

- Toggle from top bar.
- Shift main content to make room when open.
- Show insight cards such as deal attention, counter-offer, and staffing gap.
- Show quick suggestion chips.
- Use AI-inspired styling while remaining part of the v1 classic interface.

Acceptance criteria:

- Copilot is visible only for staff role.
- Panel can be opened and closed.
- Insights must be concise and tied to staff workflows.

### 8.9 Feedback System

The global feedback system must:

- Show a floating feedback trigger on every page.
- Open a compact feedback form.
- Collect name, email, comment, and current page path.
- Submit to `POST /api/feedback`.
- Show success state after submission.
- Reset and close after successful submission.
- Store feedback in MongoDB.
- Make feedback available in `/feedback`.

Acceptance criteria:

- Name, email, and comment are required.
- Feedback includes `page_url`.
- Submission should not require authentication.
- Feedback admin can list submitted feedback.

---

## 9. Backend Requirements

### 9.1 Backend Stack

The backend is a FastAPI application using:

- Python FastAPI.
- Motor async MongoDB client.
- MongoDB for data persistence.
- Pydantic models and enums.
- Environment variables for `MONGO_URL`, `DB_NAME`, and `CORS_ORIGINS`.

### 9.2 Startup Behavior

On startup, the backend must:

- Load environment variables.
- Connect to MongoDB.
- Seed v1 demo data if core collections are empty.
- Register all `/api` routes.
- Include CORS middleware.
- Return a healthy root or health response.

### 9.3 Authentication API

`POST /api/auth/demo-login`

Purpose:

- Accept a role and return one seeded demo user for that role plus a generated demo token.

Request:

```json
{
  "role": "staff"
}
```

Supported role values:

- `staff`
- `brand`
- `super_creative`
- `creative`
- `admin`

Response:

```json
{
  "user": {},
  "token": "demo-token-role-random"
}
```

Acceptance criteria:

- Invalid roles return HTTP 400.
- Missing demo user returns HTTP 404.
- Successful login returns user without Mongo `_id`.

### 9.4 Core Resource APIs

The backend must expose read APIs for:

- Users
- Staff
- Brands
- Deals
- Projects
- Opportunities
- Tasks
- Activities
- Copilot recommendations
- Wallets
- Wallet transactions
- Messages
- Message threads
- Stats
- Feedback

Key endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Health check. |
| `/api/auth/demo-login` | POST | Demo role login. |
| `/api/users` | GET | List users, optionally filtered by role. |
| `/api/users/{user_id}` | GET | Get user detail. |
| `/api/staff` | GET | List staff users. |
| `/api/super-creatives` | GET | List super creatives. |
| `/api/creatives` | GET | List creatives. |
| `/api/brands` | GET | List brands. |
| `/api/brands/{brand_id}` | GET | Get brand detail. |
| `/api/deals` | GET | List deals with optional filters. |
| `/api/deals/{deal_id}` | GET | Get deal detail. |
| `/api/deals/pipeline/summary` | GET | Pipeline summary and deals grouped by status. |
| `/api/deals` | POST | Create a new deal. |
| `/api/deals/{deal_id}/status` | PATCH | Update deal status. |
| `/api/projects` | GET | List projects with optional filters. |
| `/api/projects/{project_id}` | GET | Get project detail. |
| `/api/opportunities` | GET | List opportunities with optional filters. |
| `/api/opportunities/open` | GET | List open or shortlisted opportunities. |
| `/api/opportunities/{opportunity_id}` | GET | Get opportunity detail. |
| `/api/tasks` | GET | List tasks with optional filters. |
| `/api/tasks/{task_id}` | GET | Get task detail. |
| `/api/tasks/{task_id}/status` | PATCH | Update task status. |
| `/api/activities` | GET | List recent activity. |
| `/api/copilot/recommendations` | GET | List recommendations. |
| `/api/copilot/recommendations/{rec_id}/dismiss` | POST | Dismiss a recommendation. |
| `/api/wallet/{user_id}` | GET | Get wallet balance and transactions. |
| `/api/wallet/{user_id}/transactions` | GET | Get wallet transactions. |
| `/api/messages` | GET | List messages. |
| `/api/messages/threads` | GET | List grouped message threads. |
| `/api/stats/staff/{staff_id}` | GET | Staff dashboard stats. |
| `/api/stats/super-creative/{sc_id}` | GET | Super creative dashboard stats. |
| `/api/stats/creative/{creative_id}` | GET | Creative dashboard stats. |
| `/api/stats/admin` | GET | Admin dashboard stats. |
| `/api/feedback` | POST | Create feedback. |
| `/api/feedback` | GET | List feedback, optional page filter. |

### 9.5 Data Seeding Requirements

Seeded data must include:

- Staff users.
- Brand contacts.
- Brand records.
- Super creative teams.
- Creative freelancers.
- Deals.
- Projects.
- Opportunities.
- Tasks.
- Activities.
- Copilot recommendations.
- Messages.
- Wallet transactions.
- Admin user.

The seed data must use:

- Nigerian names and locations.
- Naira-denominated commercial values.
- Realistic creative industry roles.
- Recognizable brand categories such as telecoms, beverages, banking, fintech, e-commerce, entertainment, and music platforms.
- Deals and projects that create coherent cross-portal stories.

### 9.6 Data Entity Requirements

Core entities:

| Entity | Key fields |
|---|---|
| User | id, email, name, role, avatar, phone, location, verified, bio. |
| Staff User | artists managed, revenue YTD, focus. |
| Brand Contact | brand ID, title. |
| Super Creative User | team name, principal artist, genre, audience metrics, brand value, wallet balance, escrowed. |
| Creative User | skills, day rate, rating, reliability, completed projects, wallet balance, tagline. |
| Brand | name, category, marketing budget, contact, relationship score, revenue, active deals, location. |
| Deal | deal ID, title, brand, super creative, agent, status, value, commission, priority, campaign type, deliverables, timeline. |
| Project | project ID, title, brand, super creative, deal, status, budget, escrowed, released, dates, completion, staffing, tasks. |
| Opportunity | project, role, description, budget, status, skills, creative assignment, deadline, duration, client. |
| Task | opportunity, project, title, description, creative, status, due date, deliverables, submission, payment, feedback. |
| Contract | contract ID, deal/project/opportunity, parties, status, terms, signed date. |
| Wallet Transaction | user, transaction type, amount, description, reference, balance after. |
| Message | thread, sender, recipient, content, read state. |
| Activity | entity type, entity ID, action, description, metadata. |
| Copilot Recommendation | type, title, description, confidence, brand, budget, recommended artists, signal, actions. |
| Feedback | name, email, comment, page URL, created date. |

---

## 10. Frontend Requirements

### 10.1 Frontend Stack

The v1 frontend uses:

- React.
- React Router.
- Tailwind CSS.
- Shadcn-style UI primitives where relevant.
- Lucide React icons.
- Axios/fetch for API calls.
- Sonner toasts.
- Local storage for demo session persistence.

### 10.2 Routing Requirements

The route structure must:

- Keep v1 routes separate from v2 and v3.
- Use `/v1` only for role selection.
- Use root role paths for v1 portals:
  - `/staff`
  - `/brand`
  - `/super-creative`
  - `/creative`
  - `/admin`
- Protect nested portal routes.
- Redirect unknown routes to `/`.

### 10.3 Auth Context Requirements

The auth context must:

- Store `user`, `token`, and `loading`.
- On app load, restore `tasck_user` and `tasck_token` from local storage.
- Provide `login(role)`.
- Provide `logout()`.
- Expose `isAuthenticated`.
- Store successful login data in local storage.
- Remove session data on logout.

Acceptance criteria:

- Refreshing a portal route preserves demo session if local storage exists.
- Logout returns user to landing page.
- Login errors are handled without leaving stale loading state.

### 10.4 Component Requirements

Shared components must include:

- `DashboardLayout`
- `Logo`
- `Avatar`
- `MetricCard`
- `MetricCardSkeleton`
- `WelcomeBanner`
- `StatusBadge`
- `DetailPopup`
- `FeedbackPopup`

Acceptance criteria:

- Components are reusable across v1 portals.
- Role-specific configuration lives in a single navigation/action model where practical.
- Components use consistent spacing, typography, and status color rules.

### 10.5 Test IDs

Interactive and critical elements must have stable `data-testid` attributes.

Examples:

- Role cards.
- Dashboard root.
- Navigation items.
- Logout button.
- Search trigger.
- Command palette.
- Quick action modal.
- Feedback trigger/form.
- Page roots.
- Data rows/cards.
- Modal action buttons.

Acceptance criteria:

- Automated UI tests can select primary elements without relying on visual text only.

---

## 11. Design Requirements

### 11.1 Visual Direction

TASCK OS v1 should use a polished, light SaaS aesthetic:

- Background: light slate or white.
- Primary accent: electric blue.
- Positive accent: green.
- Warning accent: amber.
- Error accent: red.
- Cards: white, subtle border, soft shadow.
- Typography: compact, modern, readable.
- Layout: dense but calm, with enough spacing for high-value business data.

### 11.2 Experience Principles

1. **Operational clarity first.** Users should understand state, ownership, value, and next action quickly.
2. **Role specificity.** Each portal must feel designed for that user's job, not a generic dashboard.
3. **Premium trust.** The interface should look credible for enterprise brand partners.
4. **Cultural relevance.** Demo data, names, brands, and campaign examples should feel Nigerian/African.
5. **Financial transparency.** Wallet, escrow, spend, and revenue values must be consistently visible and clearly separated.
6. **Demo resilience.** Pages should render with seeded/static data even if future live APIs are incomplete.

### 11.3 Layout Requirements

Dashboard layout:

- Sidebar width: approximately 240px.
- Sidebar fixed to viewport height.
- Main content offset by sidebar width.
- Top bar sticky.
- Main content padded.
- Cards arranged in responsive grids.
- Tables and kanban boards must support overflow handling.

### 11.4 Typography Requirements

- Use compact headings inside dashboards.
- Avoid oversized marketing type inside operational pages.
- Use monospaced styling for key financial numbers where useful.
- Keep labels short and scannable.

### 11.5 Color And Status Requirements

Status colors should be consistent:

- Positive/signed/approved/paid: green.
- Pending/review/attention: amber.
- Draft/neutral: slate.
- Urgent/error/dispute/rejected: red.
- Primary action/active navigation: electric blue.

### 11.6 Accessibility Requirements

V1 should meet a practical demo accessibility baseline:

- Buttons must be keyboard-focusable.
- Modals must be visually clear and dismissible.
- Text contrast should be sufficient on light backgrounds.
- Icon-only controls should have accessible labels or clear adjacent context.
- Tables should use readable text sizes.
- Focus states should be visible on inputs.

---

## 12. Permissions And Role Access

### 12.1 Access Matrix

| Domain | Staff | Brand | Super Creative | Creative | Admin |
|---|---:|---:|---:|---:|---:|
| Staff pipeline | Full | None | None | None | Oversight/future |
| Brand campaigns | Staff view | Full own brand view | Limited project view | Assigned task view | Oversight |
| Talent discovery | Full | Browse | Hiring view | Opportunity view | Oversight |
| Projects | Full | Own campaigns | Own projects | Assigned projects | Oversight |
| Opportunities | Create/manage | View related | Create/manage own | Browse/apply | Oversight |
| Tasks | Manage | Approve deliverables | Manage own team tasks | Complete assigned | Oversight |
| Contracts | Create/send/manage | View/sign own | View/sign own | View/sign own where party | Oversight |
| Wallet | Limited note | Own wallet | Own wallet | Own wallet | Platform treasury |
| Messages | Own threads | Own threads | Own threads | Own threads | Oversight/future |
| Reports | Staff reports | Brand reports | Own reports | Own reports | Platform reports |
| Users | Limited roster | None | Team view | Own profile | Full |
| Disputes | Create/escalate | Participate | Participate | Participate | Resolve |
| Settings | Own settings | Own settings | Own settings | Own settings | Platform settings |

### 12.2 V1 Authorization Behavior

V1 route authorization is demo-level:

- It uses authenticated user role to protect portals.
- It does not enforce resource-level object permissions.
- It does not use production JWT verification.

Future production versions should add:

- Server-side authorization checks.
- Organization/team membership.
- Brand-specific access.
- Contract party-level access.
- Wallet transaction ownership rules.

---

## 13. Analytics And Success Metrics

### 13.1 Product Success Metrics

For v1 demo/product validation:

- Demo completion rate across all five role portals.
- Time to understand TASCK's business model.
- Number of feedback submissions per demo.
- Investor/brand clarity rating after demo.
- Number of pages visited per role in a guided demo.
- Number of identified product objections or questions.

### 13.2 Operational Metrics Displayed In Product

Staff:

- Active deals.
- Pipeline value.
- Weighted pipeline.
- Revenue YTD.
- Average deal size.
- Win rate.
- Deal velocity.
- Commission YTD.

Brand:

- Active campaigns.
- Total spend YTD.
- Artists engaged.
- Campaign ROI.
- Impressions.
- Engagement.
- Pending approvals.

Super Creative:

- Available balance.
- Escrowed balance.
- Total earned.
- Active projects.
- Team members.
- Open roles.
- Average rating.
- Revenue YTD.

Creative:

- Wallet balance.
- Active projects.
- Tasks due.
- Completed projects.
- Rating.
- Reliability.
- Earnings YTD.
- Pending payments.

Admin:

- Total users.
- Platform volume.
- Revenue YTD.
- Active projects.
- Pending KYC.
- Active disputes.
- Escrow balance.
- Contracts MTD.

### 13.3 Demo Quality Metrics

- All route smoke tests pass.
- Role login success rate is 100%.
- No blank pages.
- No visible broken assets.
- No uncaught runtime errors during guided demo.
- Feedback submission works.
- Pages load within acceptable demo threshold on local or preview deployment.

---

## 14. Non-Functional Requirements

### 14.1 Performance

V1 should:

- Render dashboard pages quickly with static or seeded data.
- Avoid expensive client-side operations on initial page load.
- Keep lists and tables sized for demo usage.
- Avoid blocking UI while demo login is in flight.

Acceptance criteria:

- Portal dashboard should visibly render within 2 seconds in local preview under normal conditions.
- Role selector interaction should feel immediate after backend response.

### 14.2 Reliability

V1 should:

- Seed database if empty.
- Handle missing optional fields gracefully.
- Preserve session across refresh.
- Avoid crashing if API data is unavailable by using fallback or static data where implemented.

### 14.3 Security

V1 is a demo and should not be treated as production secure. However, it should:

- Avoid exposing secrets in frontend code.
- Store only demo token/user in local storage.
- Use CORS configuration from environment.
- Keep feedback endpoint data minimal.

Future production security requirements:

- Secure JWT or session auth.
- Role and object authorization on backend.
- Input validation and sanitization.
- Audit logging for mutations.
- Rate limiting.
- Secure payment provider integration.
- PII handling and data retention controls.

### 14.4 Privacy

V1 should:

- Use demo data only.
- Avoid storing real user credentials.
- Make feedback submitter aware through context that they are submitting name, email, and comment.

### 14.5 Browser Support

V1 should support:

- Current Chrome.
- Current Edge.
- Current Safari for demo viewing.
- Current Firefox where practical.

### 14.6 Responsiveness

V1 should prioritize desktop demo quality. It should still:

- Avoid content overflow on common laptop widths.
- Allow horizontal scroll where dense tables or kanban boards require it.
- Keep modals within viewport height where practical.
- Maintain readable text on tablet-width screens.

Full mobile optimization is a post-v1 enhancement unless specifically required for a demo.

---

## 15. Content Requirements

### 15.1 Voice

Product copy should be:

- Concise.
- Professional.
- Operational.
- Confident.
- Specific to creative commerce.

Avoid:

- Generic SaaS filler.
- Lorem ipsum.
- Overly futuristic copy in v1 pages.
- Technical explanations inside the UI.

### 15.2 Data Realism

Demo data should include:

- Nigerian cities and names.
- Naira values.
- Recognizable industry categories.
- Brand campaign examples.
- Specific deliverables.
- Realistic deadlines.
- Relationship scores, ratings, reliability, wallet balances, and escrow amounts.

### 15.3 Currency Formatting

Currency should:

- Use Naira in the UI.
- Use compact format for dashboard cards and card summaries.
- Use full format where transaction precision matters.
- Clearly distinguish available, escrowed, pending, spent, earned, and processed amounts.

For ASCII documentation, write Naira values as `NGN` or `Naira`. In the UI, the Naira symbol may be used where encoding is reliable.

---

## 16. QA And Testing Requirements

### 16.1 Smoke Test Routes

Smoke tests must verify these routes render:

Staff:

- `/staff`
- `/staff/pipeline`
- `/staff/deals`
- `/staff/projects`
- `/staff/opportunities`
- `/staff/roster`
- `/staff/brands`
- `/staff/revenue`
- `/staff/meetings`
- `/staff/contracts`
- `/staff/wallet`
- `/staff/messages`
- `/staff/calendar`
- `/staff/reports`
- `/staff/settings`

Brand:

- `/brand`
- `/brand/discover`
- `/brand/campaigns`
- `/brand/approvals`
- `/brand/analytics`
- `/brand/spend`
- `/brand/wallet`
- `/brand/messages`
- `/brand/reports`
- `/brand/settings`

Super Creative:

- `/super-creative`
- `/super-creative/portfolio`
- `/super-creative/projects`
- `/super-creative/opportunities`
- `/super-creative/applications`
- `/super-creative/wallet`
- `/super-creative/calendar`
- `/super-creative/messages`
- `/super-creative/settings`

Creative:

- `/creative`
- `/creative/opportunities`
- `/creative/projects`
- `/creative/tasks`
- `/creative/wallet`
- `/creative/portfolio`
- `/creative/messages`
- `/creative/settings`

Admin:

- `/admin`
- `/admin/users`
- `/admin/disputes`
- `/admin/contracts`
- `/admin/audit`
- `/admin/permissions`
- `/admin/wallets`
- `/admin/settings`

Global:

- `/`
- `/select`
- `/v1`
- `/feedback`

### 16.2 Auth Tests

Auth test cases:

- Selecting each v1 role successfully logs in and navigates to correct portal.
- Protected route without login redirects to `/`.
- Wrong role attempting to access another portal redirects to `/`.
- Logout clears local storage and redirects.
- Refreshing after login preserves session.

### 16.3 Interaction Tests

Interaction test cases:

- Command palette opens and closes.
- Quick action modal opens and closes for each role.
- Staff copilot opens and closes.
- Staff meeting tabs filter the list.
- Staff meeting selection updates detail.
- Staff transcript upload accepts files and shows uploaded file row.
- Staff contracts selection updates detail.
- Staff contracts send modal opens for unsigned contract.
- Wallet balance visibility toggles.
- Feedback form submits and shows success state.

### 16.4 API Tests

Backend test cases:

- Health endpoint returns healthy status.
- Demo login succeeds for all five roles.
- Demo login rejects invalid role.
- Users endpoint lists users.
- Brands endpoint lists brands.
- Deals endpoint lists deals and supports filters.
- Pipeline summary returns grouped deal data.
- Projects endpoint lists projects.
- Opportunities endpoint lists opportunities and open opportunities.
- Tasks endpoint lists tasks and supports status update.
- Wallet endpoint returns balance and transactions for seeded user.
- Feedback create and list endpoints work.

### 16.5 Visual QA

Visual QA must confirm:

- Sidebar active states are clear.
- Top bar remains sticky.
- Cards do not overlap.
- Text fits in buttons and cards.
- Tables remain readable.
- Modals are centered and not clipped.
- Status badges are legible.
- Dashboard metrics align in grids.
- Empty and loading states are polished.

---

## 17. Release Plan

### 17.1 V1 Release Definition

V1 is a demo-ready release, not a production deployment. It should be stable enough for:

- Investor walkthroughs.
- Brand partner previews.
- Internal product alignment.
- Design and feature validation.
- Backend/API exploration for later production scope.

### 17.2 Release Phases

Phase 1: Foundation

- React app setup.
- FastAPI backend setup.
- MongoDB connection.
- Seed data.
- Landing page and version selector.
- V1 role selector.
- Auth context.
- Protected routes.
- Dashboard layout.

Phase 2: Core Portals

- Staff overview, pipeline, deals, projects, opportunities, roster, brands, revenue.
- Brand overview, discover, campaigns, approvals, analytics, spend.
- Super creative overview, portfolio, projects, opportunities, applications.
- Creative overview, opportunities, projects, tasks, portfolio.
- Admin overview, users, disputes, contracts, audit, permissions, wallets, settings.

Phase 3: Shared Workflows

- Wallet.
- Messages.
- Calendar.
- Reports.
- Settings.
- Feedback popup.
- Feedback admin.
- Staff meetings.
- Staff contracts.
- Quick action modal.
- Command palette.
- Staff copilot panel.

Phase 4: QA And Demo Hardening

- Route smoke tests.
- Auth tests.
- Backend endpoint tests.
- Visual QA.
- Copy pass.
- Demo data consistency pass.
- Browser preview verification.

### 17.3 Launch Checklist

- All five demo role logins work.
- All v1 routes render.
- Feedback create/list works.
- Backend health check works.
- Seeded data present.
- No blocking console/runtime errors in guided flow.
- Critical buttons and modals work.
- PRD and demo documentation are available.
- Demo script is aligned to routes.

---

## 18. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Demo data feels unrealistic | Weakens investor/brand credibility | Use specific Nigerian names, brands, values, campaign contexts, and dates. |
| Frontend and backend data drift | Confusing product story | Document mocked vs live data and align seed data with UI examples. |
| Too many pages dilute narrative | Demo feels unfocused | Use guided route script and emphasize core journey. |
| Wallet flows imply production payments | Legal/compliance confusion | Label as demo/escrow simulation and document production gap. |
| Auth appears production-ready but is demo-only | Security misunderstanding | Clearly document demo login and future auth requirements. |
| Meeting AI and contract signatures are simulated | Overclaiming risk | Position as v1 demo workflows and future integration points. |
| Dense UI hurts readability | Lower demo quality | Keep compact typography but preserve spacing, hierarchy, and contrast. |
| Mobile responsiveness incomplete | Poor mobile demo | Prioritize desktop demos and define mobile as post-v1 unless required. |

---

## 19. Future Roadmap After V1

Post-v1 improvements may include:

- Connect every v1 frontend page to live backend APIs.
- Add production authentication and resource authorization.
- Add organization and team management.
- Add real campaign creation workflow.
- Add real application submission workflow.
- Add file storage for deliverables and contracts.
- Add document generation and digital signature integration.
- Add payment provider integration and real escrow ledger.
- Add notification delivery via email, SMS, and WhatsApp.
- Add calendar integration.
- Add messaging persistence and thread creation.
- Add AI meeting transcription and action extraction.
- Add AI talent recommendations based on skills, reliability, budget, and availability.
- Add mobile responsive redesign.
- Add exportable reports and PDFs.
- Add admin audit and compliance persistence for all mutations.
- Add analytics event tracking.

---

## 20. Open Questions

1. Should v1 remain a demo-only classic portal, or should it become the production foundation while v2/v3 stay concept layers?
2. Which role should own campaign creation in production: brand self-serve, TASCK staff, or both?
3. Should super creatives be treated as organizations with multiple internal users?
4. What is the real escrow/payment provider strategy for Nigerian and pan-African transactions?
5. Should contracts be generated from templates inside TASCK OS or imported from external legal tooling?
6. Which data should brands be allowed to see about creative reliability, rates, and past performance?
7. What approval chain is required before funds are released?
8. What dispute resolution SLA should the Admin portal enforce?
9. Should feedback remain global in production or become an internal demo-only feature?
10. What minimum mobile experience is required for creatives?

---

## 21. Appendix A: Demo Narrative

Recommended v1 demo path:

1. Open `/`.
2. Enter the version selector and choose v1.
3. Select TASCK Staff.
4. Show Staff Overview to establish pipeline, revenue, and deal context.
5. Open Staff Pipeline to show deal stages.
6. Open Staff Meetings to show transcript/action item workflow.
7. Open Staff Contracts to show party signature tracking.
8. Logout and select Brand.
9. Show Brand Overview, Campaigns, Approvals, Analytics, and Spend.
10. Logout and select Super Creative.
11. Show Projects, Opportunities, Applications, Portfolio, and Wallet.
12. Logout and select Creative.
13. Show Opportunities, Tasks, Portfolio, and Wallet.
14. Logout and select Admin.
15. Show Platform Overview, Disputes, Permissions, Wallets, and Audit Logs.
16. Submit feedback through the global feedback widget.
17. Open `/feedback` to show captured feedback.

---

## 22. Appendix B: Current Implementation References

Primary v1 files:

- `frontend/src/pages/v1/V1RoleSelector.js`
- `frontend/src/App.js`
- `frontend/src/context/AuthContext.js`
- `frontend/src/components/layout/DashboardLayout.js`
- `frontend/src/components/shared/FeedbackPopup.js`
- `frontend/src/pages/staff/*`
- `frontend/src/pages/brand/*`
- `frontend/src/pages/super-creative/*`
- `frontend/src/pages/creative/*`
- `frontend/src/pages/admin/*`
- `frontend/src/pages/shared/*`
- `backend/server.py`
- `backend/models.py`
- `backend/seed_data.py`

Existing product context files:

- `memory/PRD.md`
- `frontend/public/TASCK_OS_PRD.md`
- `frontend/public/TASCK_OS_Complete_PRD.md`

---

## 23. Appendix C: V1 Definition Of Done

V1 is done when:

- The product has a working v1 role selector.
- All five roles have functional protected portals.
- Each portal has meaningful, realistic, role-specific pages.
- Shared layout, search trigger, quick actions, notifications, logout, and staff copilot operate without breaking navigation.
- Meeting upload and contract send modals work at demo level.
- Wallet pages accurately vary by role.
- Feedback can be submitted and reviewed.
- Backend seed data supports demo login and core API exploration.
- The product can be presented end-to-end without requiring hidden setup beyond running the frontend, backend, and database.

