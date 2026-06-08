# TASCK OS Production Rebuild Blueprint

Document status: Production rebuild structure  
Date: June 2, 2026  
Target product: TASCK OS production platform  
Production stack: React, FastAPI, PostgreSQL, Azure  
Primary goal: Rebuild the V3 product into one stable production platform, incorporating the strongest missing features from V1 and V2 without keeping V1, V2, and V3 as separate user-facing versions.

---

## 1. Executive Summary

The production rebuild should focus on one product:

TASCK OS

The production product should not expose V1, V2, and V3 as separate experiences. Those versions were useful for exploration, concept validation, and demo development. For production, they should be merged into one stable platform with V3 as the foundation.

Recommended production strategy:

1. Use V3 as the core product architecture.
2. Use the Business Case lifecycle as the main operating workflow.
3. Bring missing V1 features into V3 where they improve role coverage, wallet/payment visibility, admin governance, tasks, disputes, and creative ecosystem structure.
4. Bring missing V2 features into V3 where they improve intelligence, opportunity scanning, creative discovery, Super Creative discovery, command dashboards, market signals, deal simulation, and ecosystem visibility.
5. Build one login system with role-based access.
6. Build one database model around Business Cases, brands, creators, super creatives, discovery candidates, meetings, transcripts, documents, contracts, invoices, deliverables, messages, tasks, and audit history.
7. Deploy the production system on Azure using React frontend, FastAPI backend, PostgreSQL database, Blob Storage, Key Vault, and monitoring.

The final product should feel like this:

1. Public users see the TASCK website.
2. Brands can request access or submit campaign enquiries.
3. Creatives and Super Creatives can apply to join the network.
4. TASCK reviews and approves external users.
5. Approved users receive email invitations and create passwords.
6. Logged-in users enter a role-specific portal.
7. Admin users control the full Business Case workflow.
8. Brands see only their client-facing projects, approvals, documents, invoices, and messages.
9. Individual Creatives see their briefs, deliverables, wallet, projects, profile, and messages.
10. Super Creatives see everything an individual creative sees, plus team management, assignment, and payout-split tools.
11. TASCK can use discovery/scraper agents to find opportunities, brands, grants, individual creatives, Super Creatives, creative organizations, cultural signals, and market signals, then review them before converting them into records.
12. TASCK can turn discovered opportunities into structured meetings, use AI to prepare agendas and questions, capture transcripts, identify missing information, and draft Alignment Snapshots from real conversations.

The core workflow is:

Discovery Candidate -> Contact Research -> Meeting Intelligence -> Business Case -> Connect -> Frame -> Plan -> Deliver -> Closure

This workflow lives mainly inside:

Admin Control Centre -> Business Cases

Meeting Intelligence lives mainly inside:

Admin Control Centre -> Meetings

But the Business Case is also the underlying system object that powers Brand Portal, Creative Partner Portal, invoices, documents, deliverables, tasks, messages, reports, and dashboards.

---

## 2. Main Product Decision

### 2.1 Do Not Build V1, V2, And V3 As Separate Production Versions

Do not create production routes like:

1. `/v1`
2. `/v2`
3. `/v3`

Do not let users choose a version after login.

Do not make users complete V1 before accessing V2 or V3.

That would confuse users and make the product feel like an unfinished prototype.

### 2.2 Build One Production TASCK OS

The production product should have one identity:

TASCK OS

It should use:

1. V3 for lifecycle execution.
2. V2 for intelligence, command features, and scraper/discovery agents.
3. V1 for role coverage, wallet/payment concepts, admin governance, and creative ecosystem support.

### 2.3 Recommended Version Interpretation

| Version | Production Interpretation |
|---|---|
| V1 | Feature source for role-based portals, wallet/payment visibility, tasks, admin governance, and broad creative ecosystem thinking |
| V2 | Feature source for intelligence center, opportunity scanner, creative discovery, Super Creative discovery, market signals, deal simulator, command dashboard, ecosystem graph, and AI briefing |
| V3 | Main production architecture, Business Case workflow, admin/brand/creative portals, approvals, contracts, deliverables, reports, and paid/grant tracks |

### 2.4 Final Product Principle

Production TASCK OS should not feel like:

"Here are three versions of our product."

It should feel like:

"Here is one operating system for running creator-led brand and grant work."

---

## 3. Recommended Technology Stack

### 3.1 Frontend

Recommended:

1. React
2. TypeScript
3. Vite
4. React Router
5. TanStack Query for server data
6. React Hook Form for forms
7. Zod for client-side validation
8. Zustand or Redux Toolkit for small global UI/session state
9. Tailwind CSS or a consistent design system layer
10. Lucide React for icons

Why:

1. React is suitable for admin dashboards, portals, forms, tables, workflow pages, and document review screens.
2. TypeScript reduces mistakes in a complex product with many entities.
3. TanStack Query helps manage API state, caching, invalidation, loading states, and mutation refreshes.
4. Zod keeps frontend form validation aligned with backend schemas.

### 3.2 Backend

Recommended:

1. FastAPI
2. Python 3.12 or current supported production version
3. Pydantic v2
4. SQLAlchemy 2.x
5. Alembic for migrations
6. asyncpg for PostgreSQL connection
7. PyJWT or python-jose for JWT handling
8. Passlib or Argon2/Bcrypt password hashing
9. Celery/RQ/Arq or Azure worker service for background jobs
10. Pytest for tests

Why:

1. FastAPI is strong for typed APIs and OpenAPI documentation.
2. Pydantic aligns well with request/response validation.
3. SQLAlchemy and Alembic are mature for relational production systems.
4. Background jobs will be needed for email, reports, AI tasks, discovery/scraper scans, candidate enrichment, and notification fanout.

### 3.3 Database

Recommended:

PostgreSQL

Azure service:

Azure Database for PostgreSQL Flexible Server

Why PostgreSQL is best for TASCK:

1. TASCK has many related entities.
2. Business Cases need strong relational integrity.
3. Approvals, contracts, invoices, payments, deliverables, and audit logs benefit from constraints and transactions.
4. Reporting is important.
5. PostgreSQL supports JSONB, so flexible document sections and AI outputs can still be stored cleanly.
6. PostgreSQL is a better fit than MongoDB for finance, workflows, approvals, access control, and reporting.

### 3.4 File Storage

Recommended:

Azure Blob Storage

Use for:

1. Contract PDFs
2. Uploaded deliverables
3. Brand assets
4. Creator portfolio files
5. Final reports
6. Strategy documents
7. Invoice PDFs
8. Profile images
9. Exported documents
10. Meeting recordings
11. Uploaded meeting transcripts

Do not store large files directly in PostgreSQL. Store metadata in PostgreSQL and actual files in Blob Storage.

### 3.5 Cloud Platform

Recommended Azure services:

1. Azure Static Web Apps for React frontend.
2. Azure Container Apps for FastAPI API and background workers.
3. Azure Database for PostgreSQL Flexible Server.
4. Azure Blob Storage.
5. Azure Key Vault for secrets.
6. Azure Service Bus for background job queues and event queues where needed.
7. Azure Monitor and Application Insights for observability.
8. Azure Communication Services Email or another transactional email provider for invitations, password resets, and notifications.
9. Azure Front Door with WAF when traffic, security, and custom domain needs mature.
10. External meeting provider integrations such as Google Calendar/Google Meet, Microsoft Teams, or Zoom where approved by TASCK.

Simple alternative:

Use Azure App Service for the FastAPI backend if you want a simpler first production deployment without container orchestration. Container Apps is usually cleaner when you want separate API and worker services.

---

## 4. Production Product Structure

## 4.1 Top-Level Application Areas

Production TASCK OS should be structured like this:

```text
TASCK OS
├── Public Website
├── Auth / Signup / Onboarding
├── Admin Control Centre
├── Brand Portal
├── Creative Partner Portal
└── Shared System Services
```

The Business Case workflow is not a separate public portal. It is a core system workflow that appears mainly inside Admin Control Centre, while feeding controlled views into Brand Portal and Creative Partner Portal.

## 4.2 Public Website

Purpose:

Represent TASCK publicly and capture inbound interest from brands, creatives, and super creatives.

Pages:

1. Home
2. About TASCK
3. Services
4. For Brands
5. For Creatives
6. For Super Creatives / Creative Leads
7. Case Studies
8. Creator Network
9. Grant / Impact Work
10. Contact
11. Brand Enquiry
12. Creative Application
13. Super Creative Application
14. Login

Production requirements:

1. Public pages must be SEO-ready.
2. Public forms must validate input.
3. Brand enquiries should create CRM records or opportunity candidates.
4. Creative applications should create applicant records, not active user accounts.
5. Super Creative applications should create applicant records with team/company details.
6. Public users should not access the portal without approval or invitation.

## 4.3 Auth, Signup, And Onboarding

Purpose:

Control who gets access to TASCK OS and route each user into the correct portal.

Core principle:

External users should not get instant full portal access just by filling a signup form. TASCK should curate brand accounts, creators, and super creatives.

Primary flows:

1. Brand enquiry flow
2. Brand invited account flow
3. Individual Creative application flow
4. Super Creative application flow
5. Creative team member invitation flow
6. Internal admin invitation flow
7. Password reset flow
8. Email verification flow
9. Role-based login routing

Login routing:

| User Type | Destination |
|---|---|
| Super Admin | Admin Control Centre |
| Admin | Admin Control Centre |
| Relationship Manager | Admin Control Centre |
| Strategy Lead | Admin Control Centre |
| Finance User | Admin Control Centre finance views |
| Legal/Ops User | Admin Control Centre contracts and operations |
| Brand Owner | Brand Portal |
| Brand Member | Brand Portal |
| Individual Creative | Creative Partner Portal |
| Super Creative | Creative Partner Portal with team features |
| Creative Team Member | Creative Partner Portal with limited team-member features |

## 4.4 Admin Control Centre

Purpose:

Let TASCK internal users run the entire business.

Recommended sections:

```text
Admin Control Centre
|-- Dashboard
|-- Intelligence Center
|-- Opportunity Scanner
|-- Creative Discovery
|-- Super Creative Discovery
|-- Discovery Candidate Review
|-- CRM / Brands
|-- Meetings
|-- Business Cases
|   |-- Connect
|   |-- Frame
|   |-- Plan
|   |-- Deliver
|   `-- Closure
|-- Pipeline
|-- Projects
|-- Creators / Super Creatives
|-- Creative Applications
|-- Contracts
|-- Documents
|-- Invoices / Fees
|-- Wallet / Payments
|-- Tasks
|-- Messages
|-- Reports
|-- Audit Logs
|-- Users / Roles
`-- Settings
```

Important note:

The Business Case lifecycle belongs inside the Admin Control Centre UI because admin users control the full internal workflow. But the underlying Business Case record also powers brand and creative views.

## 4.5 Brand Portal

Purpose:

Give brand users a focused client-facing workspace.

Recommended sections:

```text
Brand Portal
├── Dashboard
├── Projects
├── Approvals
├── Documents
├── Invoices
├── Messages
├── Team / Users
└── Settings
```

Brand users should see:

1. Their own projects.
2. Their own Business Case summaries.
3. Pending approvals.
4. Alignment Snapshots sent to them.
5. Strategy Snapshots sent to them.
6. Contracts shared with them.
7. Invoices addressed to them.
8. Final reports shared with them.
9. Messages involving their brand.
10. Meetings they are invited to.
11. Approved agendas, meeting links, and shared meeting summaries.
12. Follow-up actions that TASCK has intentionally shared with the brand.

Brand users should not see:

1. Other brands.
2. Internal creator scoring.
3. Raw brainstorms unless explicitly shared.
4. Admin notes.
5. Internal fee margin.
6. Internal relationship intelligence.
7. Other creators' private information.
8. Raw transcripts unless explicitly shared.
9. Internal-only meeting notes.
10. AI readiness scoring or missing-information checklists unless TASCK chooses to share a simplified version.

Brand meeting access should be limited and contextual. A brand user should not need a full meeting command center. They should see meeting links, calendar details, agenda, shared notes, and agreed follow-up actions inside their project or meetings view.

## 4.6 Creative Partner Portal

Purpose:

Support individual creatives, super creatives, and team members in one portal with role-based feature visibility.

Recommended sections:

```text
Creative Partner Portal
├── Dashboard
├── Briefs
├── Projects
├── Deliverables
├── Tasks
├── Wallet
├── Profile
├── Portfolio
├── Messages
├── Team Management
│   └── Super Creative only
├── Assignment Board
│   └── Super Creative and team members
└── Settings
```

### Individual Creative

An Individual Creative is a single talent partner who works directly with TASCK.

They can:

1. View briefs sent to them.
2. Respond to briefs.
3. View assigned projects.
4. Submit deliverables.
5. Track payment status.
6. Manage profile and portfolio.
7. Message TASCK.
8. View tasks assigned directly to them.
9. View meetings they are invited to, including briefing calls, delivery check-ins, revision calls, and closure calls.

### Super Creative

A Super Creative is a creative lead, production lead, creative director, agency, studio, collective, or senior talent partner who can manage a team.

They can:

1. Do everything an Individual Creative can do.
2. Manage a team profile.
3. Add managed team members.
4. Invite team members to create limited accounts.
5. Assign deliverables or tasks to team members.
6. Review team submissions before TASCK sees them.
7. Manage payout splits where enabled.
8. Submit work on behalf of the team.
9. See team-level project progress.
10. Respond to larger briefs as a creative lead or production unit.
11. Join and manage team-related project meetings where invited by TASCK.
12. Assign internal team members to meeting follow-up actions where enabled.

### Creative Team Member

A Creative Team Member is someone working under a Super Creative.

They can either be:

1. Managed only, with no login.
2. Invited, with limited login access.

Limited login team members can see:

1. Their assigned tasks.
2. Their assigned deliverables.
3. Messages related to their assignments.
4. Payment status if TASCK pays them directly.
5. Their profile.
6. Meetings they are directly invited to.
7. Meeting action items assigned to them.

They should not see:

1. Full Business Case economics.
2. Brand invoices.
3. Super Creative payout margin.
4. Other team members' private payment details.
5. Admin-only project notes.
6. Raw meeting transcripts unless explicitly shared.
7. Internal-only AI meeting analysis.

---

## 5. Core Workflow Structure

## 5.1 Business Case As The Core Object

The Business Case is the main production object.

It connects:

1. Opportunity
2. Brand or funder
3. Creator or Super Creative
4. Relationship Manager
5. Meetings and transcripts
6. Strategy
7. Approvals
8. Contracts
9. Invoices
10. Payments
11. Deliverables
12. Scope changes
13. Reports
14. Feedback
15. Messages
16. Tasks
17. Audit logs

Every important campaign or grant opportunity should become a Business Case.

## 5.2 Business Case Lifecycle

Production lifecycle:

```text
Opportunity
  -> Business Case
    -> Connect
    -> Frame
    -> Plan
    -> Deliver
    -> Closure
```

### Opportunity

Purpose:

Capture a potential brand, grant, or creator-led commercial signal before it becomes a formal Business Case.

Sources:

1. Public brand enquiry.
2. Admin manual entry.
3. CRM follow-up.
4. Market signal.
5. Grant opportunity.
6. V2-style opportunity scanner and broader discovery/scraper agents.
7. Referral.
8. Existing brand expansion.
9. Creator pitch.

Required features:

1. Capture source.
2. Capture brand/funder.
3. Capture contact.
4. Capture campaign goal.
5. Capture estimated budget or value.
6. Capture timeline.
7. Capture fit notes.
8. Accept or reject as Business Case.

### Meeting Intelligence

Purpose:

Turn discovered or researched opportunities into structured conversation data that can feed CRM, qualification, Alignment Snapshots, and Business Case creation.

Meeting Intelligence is the bridge between:

```text
Discovery Candidate
-> Contact Research
-> Meeting
-> Transcript
-> AI Summary
-> Missing Information Check
-> Alignment Snapshot Draft
-> Business Case / Frame
```

Primary use cases:

1. Admin finds an opportunity through the scraper/discovery agent.
2. Admin manually researches or enriches contact information.
3. Admin schedules a discovery or qualification meeting.
4. System generates or stores a meeting link.
5. System sends meeting invite to the brand/contact.
6. AI prepares suggested agenda and questions.
7. Admin uses those questions during the meeting.
8. Meeting transcript or recording is captured.
9. AI summarizes the conversation.
10. AI extracts objectives, KPIs, audience, budget, timeline, decision-maker details, scope assumptions, blockers, and next actions.
11. AI checks whether enough information exists for an Alignment Snapshot.
12. If enough information exists, AI drafts the Alignment Snapshot for RM review.
13. If information is missing, AI suggests a follow-up meeting, follow-up email, and missing questions.

Meeting types:

1. Discovery Call.
2. Qualification Call.
3. Alignment Call.
4. Clarification Call.
5. Strategy Review.
6. Brand Approval Call.
7. Creator Briefing Call.
8. Delivery Check-in.
9. Scope Change Call.
10. Closure Call.

Meeting providers:

1. Google Meet.
2. Microsoft Teams.
3. Zoom.
4. Manual meeting link.
5. Phone call.
6. In-person meeting.

Production recommendation:

Start with meeting records, manual meeting links, invite sending, manual transcript upload, and AI summary. Then add Google Calendar/Google Meet integration and automated transcript capture when integration credentials and consent rules are ready.

Pre-meeting AI should generate:

1. Opportunity summary.
2. Brand/company background.
3. Why this opportunity matters.
4. What is already known.
5. What is missing.
6. Suggested questions.
7. Suggested agenda.
8. Risk flags.
9. KPI questions.
10. Budget questions.
11. Timeline questions.
12. Decision-maker questions.
13. Scope questions.
14. Clarification prompts.

Alignment Snapshot readiness checklist:

1. Brand objective.
2. Target audience.
3. Campaign problem or opportunity.
4. Success metrics/KPIs.
5. Timeline.
6. Budget range or budget expectation.
7. Decision-maker and approval process.
8. Scope expectations.
9. Engagement model.
10. Risks or constraints.
11. Next steps.

Readiness behavior:

1. If required information is sufficient, the system should draft an Alignment Snapshot.
2. If required information is missing, the system should not force the Alignment Snapshot.
3. It should suggest a clarification meeting or follow-up email.
4. It should list missing fields clearly.
5. It should generate questions for the next meeting.

Transcript and sharing rules:

1. Raw transcripts are internal-only by default.
2. AI summaries are internal-only by default.
3. Brands and creatives see only approved shared summaries.
4. Recording/transcription requires consent handling.
5. Admin can choose whether a meeting summary is shared.
6. Private admin notes must never be exposed to brand or creative portals.

### Connect

Purpose:

Qualify the opportunity and understand intent.

Admin actions:

1. Log interaction.
2. Ingest transcript.
3. Add contact notes.
4. Update qualification status.
5. Assign relationship manager.
6. Mark qualified.
7. Advance to Frame.
8. Schedule discovery, qualification, or alignment meetings.
9. Use meeting transcripts to update CRM and qualification context.
10. Review AI missing-information check before advancing.

Gate:

Connect can advance to Frame only when the opportunity is qualified.

### Frame

Purpose:

Align TASCK and the brand/funder before detailed planning begins.

Admin actions:

1. Generate Alignment Snapshot.
2. Edit Alignment Snapshot.
3. Identify scope flags.
4. Send Alignment Snapshot to brand.
5. Resolve brand comments.
6. Resolve scope flags.
7. Capture approval.
8. Advance to Plan.
9. Use meeting transcripts and summaries as source material for the Alignment Snapshot.
10. Schedule clarification meetings if Alignment Snapshot readiness is incomplete.

Brand actions:

1. Review Alignment Snapshot.
2. Add section comments.
3. Approve or request changes.

Gate:

Frame can advance to Plan only when:

1. Alignment Snapshot is approved.
2. Required scope flags are resolved.
3. Track-specific requirements are satisfied.

### Plan

Purpose:

Select creative partner, create strategy, confirm commercial model, and prepare agreements.

Admin actions:

1. Run creator/super creative matching.
2. Run brainstorm.
3. Select individual creative or Super Creative.
4. Create Creative Brief.
5. Send brief.
6. Receive or capture creative response.
7. Issue Strategy Development Fee where applicable.
8. Mark invoice paid where applicable.
9. Generate Strategy Snapshot.
10. Send Strategy Snapshot to brand.
11. Resolve comments.
12. Capture brand approval.
13. Generate contracts.
14. Send contracts.
15. Mark contracts signed.
16. Advance to Deliver.

Brand actions:

1. Review Strategy Snapshot.
2. Comment by section.
3. Approve strategy.
4. Review/sign contract where enabled.
5. View/pay invoices where enabled.

Creative/Super Creative actions:

1. Review brief.
2. Respond to brief.
3. Accept or decline opportunity.
4. Provide execution notes.
5. Review/sign contract where enabled.

Gate:

Plan can advance to Deliver only when:

1. Strategy Snapshot is approved.
2. Required contracts are signed.
3. Required paid-track fees are handled.
4. Creative partner is confirmed.

### Deliver

Purpose:

Execute the project and manage deliverables.

Admin actions:

1. Create deliverables.
2. Assign deliverables to creative or Super Creative.
3. Review submissions.
4. Approve deliverables.
5. Request revisions.
6. Create scope changes.
7. Approve scope changes.
8. Track milestones.
9. Monitor payment and payout state.
10. Advance to Closure.

Brand actions:

1. View delivery progress.
2. Review shared deliverables where enabled.
3. Approve deliverables where brand approval is required.
4. Message TASCK.

Creative actions:

1. View deliverables.
2. Submit work.
3. Respond to revision requests.
4. Track payment state.

Super Creative actions:

1. Assign internal team work.
2. Review team member submissions.
3. Submit final work to TASCK.
4. Manage team progress.

Gate:

Deliver can advance to Closure only when:

1. Required deliverables are approved.
2. Open scope changes are resolved.
3. Payment state is not blocking closeout.
4. Final report is ready to be generated or generated.

### Closure

Purpose:

Close the Business Case with reporting, feedback, and learning.

Admin actions:

1. Generate final report.
2. Review KPI variance.
3. Collect brand feedback.
4. Collect creative feedback.
5. Confirm finance closeout.
6. Archive documents.
7. Mark Business Case closed.

Brand actions:

1. View final report.
2. Submit feedback.
3. Confirm closeout where required.

Creative/Super Creative actions:

1. Submit feedback.
2. Confirm completion.
3. View final payment status.

Gate:

Business Case can close when:

1. Final report is generated.
2. Feedback requirements are complete or waived.
3. Deliverables are complete.
4. Finance state is resolved or intentionally marked as exception.

---

## 6. Role And Permission Model

## 6.1 Core Roles

Recommended roles:

1. `super_admin`
2. `admin`
3. `relationship_manager`
4. `strategy_lead`
5. `creator_manager`
6. `finance`
7. `legal_ops`
8. `brand_owner`
9. `brand_member`
10. `individual_creative`
11. `super_creative`
12. `creative_team_member`

## 6.2 Permission Matrix

| Feature | Super Admin | Admin | RM | Strategy | Finance | Legal/Ops | Brand | Creative | Super Creative | Team Member |
|---|---|---|---|---|---|---|---|---|---|---|
| Manage users | Yes | Limited | No | No | No | No | Brand team only | No | Team only | No |
| View all Business Cases | Yes | Yes | Assigned/all by policy | Assigned/all by policy | Finance view | Contract view | No | No | No | No |
| Create Business Case | Yes | Yes | Yes | Limited | No | No | No | No | No | No |
| Advance stages | Yes | Yes | Yes | Limited | No | Contract-only gate | No | No | No | No |
| Generate alignment | Yes | Yes | Yes | Yes | No | No | No | No | No | No |
| Approve brand documents | No | Internal only | Internal only | Internal only | No | No | Yes | No | No | No |
| Manage invoices | Yes | Yes | No | No | Yes | No | View/pay own | No | View own | View own if enabled |
| Manage contracts | Yes | Yes | No | No | No | Yes | Own contracts | Own contracts | Own contracts/team | Assigned only |
| Submit deliverables | No | On behalf | No | No | No | No | No | Yes | Yes/team | Assigned only |
| Manage team | No | Oversight | No | No | No | No | Brand users only | No | Yes | No |
| View wallet | Yes | Yes | No | No | Yes | No | Own invoices | Own wallet | Own/team wallet | Own only if enabled |
| View audit logs | Yes | Yes | Limited | Limited | Finance only | Legal only | No | No | No | No |
| Manage meetings | Yes | Yes | Assigned/all by policy | Assigned strategy meetings | No | Contract meetings only | View invited/shared only | View invited/shared only | View invited/team meetings | View invited only |
| View raw meeting transcripts | Yes | Yes | Assigned/all by policy | Assigned strategy meetings | No | Contract meetings only | No by default | No by default | No by default | No |

## 6.3 Access Rules

Rules:

1. Internal users are invited by Super Admin or Admin.
2. Brand users are invited after TASCK creates or approves a brand account.
3. Individual creatives apply publicly but receive portal access only after approval.
4. Super Creatives apply publicly but receive portal access only after approval.
5. Team members are added by a Super Creative or Admin.
6. Team members get login access only if invited.
7. Every user can have one primary role and optional additional permissions.
8. Production authorization must be enforced by the backend, not only frontend route hiding.
9. Meeting transcripts, recordings, and internal notes are internal by default.
10. Brand, creative, Super Creative, and team member meeting visibility must be invitation-based and sharing-based, not automatic.

---

## 7. User Access Flows

## 7.1 Brand Access Flow

Recommended flow:

```text
Brand visits website
-> submits brand enquiry
-> TASCK reviews in Admin
-> TASCK creates/approves brand account
-> TASCK invites brand owner
-> brand owner sets password
-> brand owner logs into Brand Portal
```

Brand owner can then invite brand members if allowed.

## 7.2 Individual Creative Access Flow

Recommended flow:

```text
Creative visits website
-> submits creative application
-> TASCK reviews profile, portfolio, fit, risk, and availability
-> TASCK approves application
-> system sends invite email
-> creative sets password
-> creative logs into Creative Partner Portal
```

## 7.3 Super Creative Access Flow

Recommended flow:

```text
Super Creative visits website
-> submits super creative application
-> includes team/company profile, portfolio, capabilities, categories, past campaigns
-> TASCK reviews
-> TASCK approves as Super Creative
-> system sends invite email
-> Super Creative sets password
-> Super Creative logs into Creative Partner Portal with team features
```

## 7.4 Team Member Access Flow

There should be two team-member modes.

### Managed Only

```text
Super Creative adds team member record
-> team member has no login
-> Super Creative manages assignments and submissions internally
```

Use when:

1. TASCK contracts the Super Creative directly.
2. TASCK does not need direct team member communication.
3. Team member should not access TASCK portal.

### Invited Team Member

```text
Super Creative or Admin adds team member
-> sends invite
-> team member sets password
-> team member logs into limited Creative Partner Portal
-> team member sees only assigned tasks and deliverables
```

Use when:

1. TASCK needs direct oversight.
2. Team member submits work directly.
3. TASCK pays team member directly.
4. The project is large or complex.

---

## 8. PostgreSQL Data Model

This is the recommended production schema structure. Names can be adjusted during implementation, but the entity coverage should remain.

## 8.1 Identity And Access Tables

### users

Purpose:

Stores all platform users.

Important fields:

1. `id`
2. `email`
3. `password_hash`
4. `first_name`
5. `last_name`
6. `phone`
7. `status`
8. `email_verified_at`
9. `last_login_at`
10. `created_at`
11. `updated_at`

Statuses:

1. invited
2. active
3. suspended
4. deactivated

### roles

Fields:

1. `id`
2. `name`
3. `description`

### permissions

Fields:

1. `id`
2. `key`
3. `description`

### user_roles

Fields:

1. `user_id`
2. `role_id`

### role_permissions

Fields:

1. `role_id`
2. `permission_id`

### invitations

Purpose:

Stores email invitations.

Fields:

1. `id`
2. `email`
3. `role`
4. `token_hash`
5. `invited_by_user_id`
6. `brand_id`
7. `creator_id`
8. `creative_org_id`
9. `expires_at`
10. `accepted_at`
11. `created_at`

### password_reset_tokens

Fields:

1. `id`
2. `user_id`
3. `token_hash`
4. `expires_at`
5. `used_at`
6. `created_at`

## 8.2 Brand And CRM Tables

### brands

Fields:

1. `id`
2. `name`
3. `industry`
4. `website`
5. `description`
6. `status`
7. `account_tier`
8. `relationship_manager_id`
9. `created_at`
10. `updated_at`

### brand_contacts

Fields:

1. `id`
2. `brand_id`
3. `name`
4. `email`
5. `phone`
6. `role_title`
7. `is_primary`
8. `created_at`

### brand_users

Purpose:

Connects platform users to brand accounts.

Fields:

1. `brand_id`
2. `user_id`
3. `brand_role`
4. `created_at`

### brand_enquiries

Fields:

1. `id`
2. `company_name`
3. `industry`
4. `website`
5. `contact_name`
6. `contact_email`
7. `contact_phone`
8. `campaign_goal`
9. `budget_range`
10. `timeline`
11. `creator_preferences`
12. `notes`
13. `status`
14. `assigned_to_user_id`
15. `created_at`

## 8.3 Creative Network Tables

### creators

Purpose:

Stores individual creative profiles.

Fields:

1. `id`
2. `user_id`
3. `display_name`
4. `legal_name`
5. `category`
6. `location`
7. `bio`
8. `portfolio_url`
9. `instagram_url`
10. `tiktok_url`
11. `youtube_url`
12. `website_url`
13. `availability_status`
14. `profile_status`
15. `commercial_fit_score`
16. `grant_fit_score`
17. `brand_safety_status`
18. `conversion_behavior_score`
19. `created_at`
20. `updated_at`

### creative_organizations

Purpose:

Stores Super Creative organizations, studios, collectives, production teams, or creative leads.

Fields:

1. `id`
2. `owner_user_id`
3. `name`
4. `type`
5. `description`
6. `website`
7. `location`
8. `team_size`
9. `capabilities`
10. `portfolio_url`
11. `status`
12. `created_at`
13. `updated_at`

### creative_org_members

Purpose:

Connects team members to Super Creative organizations.

Fields:

1. `id`
2. `creative_org_id`
3. `user_id`
4. `creator_id`
5. `name`
6. `email`
7. `role_title`
8. `member_type`
9. `login_enabled`
10. `status`
11. `created_at`

Member types:

1. owner
2. manager
3. team_member
4. contractor
5. managed_only

### creative_applications

Fields:

1. `id`
2. `application_type`
3. `name`
4. `email`
5. `phone`
6. `location`
7. `category`
8. `portfolio_url`
9. `social_links`
10. `experience_level`
11. `team_size`
12. `capabilities`
13. `notes`
14. `status`
15. `reviewed_by_user_id`
16. `reviewed_at`
17. `created_at`

Application types:

1. individual_creative
2. super_creative

## 8.4 Opportunity And Business Case Tables

Production recommendation:

Use a generalized discovery model as the canonical scraper/discovery data model. The older `opportunity_candidates` and `opportunity_scans` tables can either be retained as compatibility views or implemented as specialized records inside `discovery_candidates` and `discovery_scans`.

The discovery model should cover:

1. Brand opportunity signals.
2. Grant and funder opportunities.
3. Public campaign signals.
4. Cultural moments.
5. Market signals.
6. Individual creative candidates.
7. Super Creative candidates.
8. Creative organization, studio, collective, agency, and production-team candidates.
9. Potential brand partner leads.
10. Creator collaboration signals.

### discovery_sources

Purpose:

Stores configured public sources that scraper agents can scan.

Fields:

1. `id`
2. `name`
3. `source_type`
4. `base_url`
5. `platform`
6. `country`
7. `category`
8. `is_active`
9. `requires_manual_review`
10. `rate_limit_per_hour`
11. `last_scanned_at`
12. `created_at`
13. `updated_at`

Source types:

1. brand_website
2. grant_database
3. news_site
4. events_site
5. social_profile
6. creator_directory
7. agency_directory
8. portfolio_site
9. manual_source
10. other

Platforms:

1. web
2. instagram
3. tiktok
4. youtube
5. linkedin
6. x
7. facebook
8. grant_portal
9. news
10. events
11. manual

### discovery_scans

Purpose:

Stores each scraper/discovery run.

Fields:

1. `id`
2. `scan_type`
3. `source_id`
4. `query`
5. `target_country`
6. `target_category`
7. `status`
8. `started_by_user_id`
9. `results_count`
10. `accepted_count`
11. `rejected_count`
12. `error_message`
13. `started_at`
14. `completed_at`
15. `created_at`

Scan types:

1. opportunity
2. grant
3. brand_signal
4. market_signal
5. cultural_signal
6. individual_creative
7. super_creative
8. creative_org
9. creator_collaboration_signal
10. mixed

Statuses:

1. queued
2. running
3. completed
4. failed
5. cancelled

### discovery_candidates

Purpose:

Stores discovered candidates before admin review. Scraper agents must create candidates first. They should not automatically create approved brands, creatives, Super Creatives, or Business Cases.

Fields:

1. `id`
2. `scan_id`
3. `candidate_type`
4. `source_id`
5. `source_url`
6. `evidence_urls`
7. `name`
8. `title`
9. `summary`
10. `description`
11. `country`
12. `city`
13. `category`
14. `industry`
15. `platform`
16. `website_url`
17. `portfolio_url`
18. `social_links_json`
19. `contact_email`
20. `contact_phone`
21. `capabilities_json`
22. `audience_json`
23. `estimated_value`
24. `recommended_track`
25. `fit_score`
26. `confidence_score`
27. `risk_score`
28. `risk_notes`
29. `ai_summary`
30. `raw_payload_json`
31. `status`
32. `reviewed_by_user_id`
33. `reviewed_at`
34. `accepted_entity_type`
35. `accepted_entity_id`
36. `created_at`
37. `updated_at`

Candidate types:

1. opportunity
2. brand_lead
3. grant_opportunity
4. market_signal
5. cultural_signal
6. individual_creative
7. super_creative
8. creative_org
9. agency
10. production_team
11. studio
12. creator_collective
13. creator_collaboration_signal

Candidate statuses:

1. new
2. needs_review
3. accepted
4. rejected
5. duplicate
6. archived
7. converted

Accepted entity types:

1. business_case
2. brand
3. brand_enquiry
4. creator
5. creative_application
6. creative_org
7. super_creative_application
8. opportunity_candidate
9. none

### discovery_candidate_notes

Purpose:

Stores admin review notes and research notes for discovered candidates.

Fields:

1. `id`
2. `candidate_id`
3. `author_user_id`
4. `note`
5. `created_at`

### discovery_candidate_matches

Purpose:

Stores deduplication and relationship suggestions discovered by the scraper or AI review layer.

Fields:

1. `id`
2. `candidate_id`
3. `matched_entity_type`
4. `matched_entity_id`
5. `match_score`
6. `match_reason`
7. `created_at`

### opportunity_candidates

Fields:

1. `id`
2. `source_type`
3. `source_url`
4. `title`
5. `brand_name`
6. `funder_name`
7. `summary`
8. `recommended_track`
9. `estimated_value`
10. `confidence_score`
11. `status`
12. `accepted_by_user_id`
13. `business_case_id`
14. `created_at`

### opportunity_scans

Fields:

1. `id`
2. `scan_type`
3. `query`
4. `status`
5. `results_count`
6. `created_by_user_id`
7. `created_at`
8. `completed_at`

### business_cases

Fields:

1. `id`
2. `title`
3. `brand_id`
4. `creator_id`
5. `creative_org_id`
6. `relationship_manager_id`
7. `stage`
8. `track`
9. `source_type`
10. `stated_intent`
11. `estimated_value`
12. `currency`
13. `health_status`
14. `connect_status`
15. `next_action`
16. `days_in_stage`
17. `started_at`
18. `closed_at`
19. `created_at`
20. `updated_at`

Tracks:

1. paid
2. grant

Stages:

1. connect
2. frame
3. plan
4. deliver
5. closed

### business_case_stage_history

Fields:

1. `id`
2. `business_case_id`
3. `from_stage`
4. `to_stage`
5. `changed_by_user_id`
6. `reason`
7. `created_at`

### business_case_assignments

Fields:

1. `id`
2. `business_case_id`
3. `user_id`
4. `assignment_role`
5. `created_at`

## 8.5 Interaction And CRM Activity Tables

### interactions

Fields:

1. `id`
2. `business_case_id`
3. `brand_id`
4. `contact_id`
5. `interaction_type`
6. `summary`
7. `notes`
8. `transcript_text`
9. `ai_summary`
10. `created_by_user_id`
11. `occurred_at`
12. `created_at`

Interaction types:

1. call
2. meeting
3. email
4. whatsapp
5. note
6. transcript

## 8.6 Meeting Intelligence Tables

### meetings

Purpose:

Stores scheduled, completed, cancelled, and follow-up meetings.

Fields:

1. `id`
2. `title`
3. `meeting_type`
4. `status`
5. `provider`
6. `provider_meeting_id`
7. `meeting_url`
8. `calendar_event_id`
9. `discovery_candidate_id`
10. `brand_id`
11. `brand_contact_id`
12. `business_case_id`
13. `creator_id`
14. `creative_org_id`
15. `relationship_manager_id`
16. `scheduled_start_at`
17. `scheduled_end_at`
18. `actual_start_at`
19. `actual_end_at`
20. `timezone`
21. `purpose`
22. `internal_notes`
23. `shared_notes`
24. `consent_status`
25. `recording_consent_captured_at`
26. `transcription_consent_captured_at`
27. `created_by_user_id`
28. `created_at`
29. `updated_at`

Meeting types:

1. discovery_call
2. qualification_call
3. alignment_call
4. clarification_call
5. strategy_review
6. brand_approval_call
7. creator_briefing_call
8. delivery_check_in
9. scope_change_call
10. closure_call

Statuses:

1. draft
2. scheduled
3. invite_sent
4. completed
5. cancelled
6. no_show
7. needs_follow_up
8. transcript_pending
9. summary_pending
10. snapshot_ready

Providers:

1. google_meet
2. microsoft_teams
3. zoom
4. manual_link
5. phone_call
6. in_person

### meeting_attendees

Purpose:

Stores internal and external meeting participants.

Fields:

1. `id`
2. `meeting_id`
3. `user_id`
4. `brand_contact_id`
5. `creator_id`
6. `creative_org_member_id`
7. `external_name`
8. `external_email`
9. `external_phone`
10. `attendee_type`
11. `role_title`
12. `required`
13. `invite_status`
14. `attendance_status`
15. `created_at`

Attendee types:

1. admin
2. relationship_manager
3. brand_contact
4. brand_user
5. individual_creative
6. super_creative
7. creative_team_member
8. external_guest

### meeting_agenda_items

Fields:

1. `id`
2. `meeting_id`
3. `title`
4. `description`
5. `sort_order`
6. `is_ai_generated`
7. `created_at`

### meeting_questions

Purpose:

Stores suggested, asked, answered, and follow-up questions.

Fields:

1. `id`
2. `meeting_id`
3. `question`
4. `question_category`
5. `source`
6. `priority`
7. `answered`
8. `answer_summary`
9. `needs_follow_up`
10. `created_at`

Question categories:

1. business_objective
2. audience
3. kpi
4. budget
5. timeline
6. decision_maker
7. approval_process
8. scope
9. risk
10. creative_direction
11. grant_impact
12. next_steps

Sources:

1. ai_generated
2. admin_added
3. template
4. follow_up

### meeting_recordings

Fields:

1. `id`
2. `meeting_id`
3. `file_id`
4. `provider_recording_id`
5. `duration_seconds`
6. `recording_status`
7. `created_at`

### meeting_transcripts

Fields:

1. `id`
2. `meeting_id`
3. `source`
4. `transcript_text`
5. `speaker_map_json`
6. `transcription_status`
7. `confidence_score`
8. `created_at`

Sources:

1. uploaded_file
2. google_meet
3. teams
4. zoom
5. manual_entry
6. audio_transcription

### meeting_summaries

Fields:

1. `id`
2. `meeting_id`
3. `summary_text`
4. `objectives_json`
5. `kpis_json`
6. `audience_json`
7. `budget_json`
8. `timeline_json`
9. `decision_makers_json`
10. `scope_assumptions_json`
11. `risks_json`
12. `next_actions_json`
13. `ai_model`
14. `review_status`
15. `reviewed_by_user_id`
16. `reviewed_at`
17. `created_at`

Review statuses:

1. draft
2. reviewed
3. approved_internal
4. shared

### meeting_missing_info

Purpose:

Stores the information the system still needs before drafting or sending an Alignment Snapshot.

Fields:

1. `id`
2. `meeting_id`
3. `business_case_id`
4. `field_key`
5. `field_label`
6. `importance`
7. `status`
8. `suggested_question`
9. `resolved_at`
10. `created_at`

Importance values:

1. required
2. recommended
3. optional

Statuses:

1. missing
2. unclear
3. answered
4. waived

### meeting_alignment_readiness

Purpose:

Stores readiness scoring for Alignment Snapshot generation.

Fields:

1. `id`
2. `meeting_id`
3. `business_case_id`
4. `readiness_score`
5. `ready_for_alignment_snapshot`
6. `required_fields_complete`
7. `missing_required_fields_json`
8. `recommended_next_action`
9. `created_at`

Recommended next actions:

1. draft_alignment_snapshot
2. schedule_clarification_meeting
3. send_follow_up_email
4. update_crm_only
5. mark_not_qualified

### meeting_action_items

Fields:

1. `id`
2. `meeting_id`
3. `business_case_id`
4. `assigned_to_user_id`
5. `assigned_to_external_email`
6. `title`
7. `description`
8. `status`
9. `due_at`
10. `created_at`

### meeting_followups

Fields:

1. `id`
2. `meeting_id`
3. `follow_up_type`
4. `status`
5. `scheduled_for`
6. `message_draft`
7. `created_by_user_id`
8. `created_at`

Follow-up types:

1. meeting
2. email
3. call
4. task

### meeting_provider_integrations

Purpose:

Stores provider connection metadata for meeting tools.

Fields:

1. `id`
2. `provider`
3. `connected_by_user_id`
4. `external_account_email`
5. `status`
6. `scopes_json`
7. `last_synced_at`
8. `created_at`
9. `updated_at`

## 8.7 Document, Approval, And Comment Tables

### documents

Purpose:

General document metadata table.

Fields:

1. `id`
2. `business_case_id`
3. `document_type`
4. `title`
5. `status`
6. `version`
7. `content_json`
8. `created_by_user_id`
9. `sent_at`
10. `approved_at`
11. `created_at`
12. `updated_at`

Document types:

1. alignment_snapshot
2. strategy_snapshot
3. creative_brief
4. contract
5. final_report
6. invoice_pdf
7. general

Use `content_json` as JSONB for sectioned documents.

### document_comments

Fields:

1. `id`
2. `document_id`
3. `business_case_id`
4. `section_key`
5. `comment_text`
6. `author_user_id`
7. `author_role`
8. `status`
9. `resolved_by_user_id`
10. `resolved_at`
11. `created_at`

### approvals

Fields:

1. `id`
2. `business_case_id`
3. `document_id`
4. `approval_type`
5. `approver_user_id`
6. `approver_party`
7. `status`
8. `approved_at`
9. `created_at`

Approval types:

1. alignment
2. strategy
3. contract
4. deliverable
5. final_report

## 8.8 Brief, Brainstorm, And Matching Tables

### creative_briefs

Fields:

1. `id`
2. `business_case_id`
3. `creator_id`
4. `creative_org_id`
5. `title`
6. `brief_json`
7. `status`
8. `sent_at`
9. `response_due_at`
10. `created_by_user_id`
11. `created_at`

### creative_brief_responses

Fields:

1. `id`
2. `brief_id`
3. `creator_id`
4. `creative_org_id`
5. `response_json`
6. `status`
7. `submitted_at`
8. `created_at`

### brainstorm_rounds

Fields:

1. `id`
2. `business_case_id`
3. `round_name`
4. `status`
5. `input_json`
6. `output_json`
7. `created_by_user_id`
8. `created_at`

### creator_matches

Fields:

1. `id`
2. `business_case_id`
3. `creator_id`
4. `creative_org_id`
5. `score`
6. `fit_rationale`
7. `risk_notes`
8. `elimination_reason`
9. `selected`
10. `created_at`

## 8.9 Contracts, Finance, Wallet, And Payment Tables

### contracts

Fields:

1. `id`
2. `business_case_id`
3. `party_type`
4. `brand_id`
5. `creator_id`
6. `creative_org_id`
7. `status`
8. `contract_json`
9. `file_id`
10. `sent_at`
11. `signed_at`
12. `created_at`

Party types:

1. brand
2. individual_creative
3. super_creative
4. team_member

### invoices

Fields:

1. `id`
2. `business_case_id`
3. `brand_id`
4. `invoice_number`
5. `invoice_type`
6. `amount`
7. `currency`
8. `status`
9. `due_at`
10. `paid_at`
11. `file_id`
12. `created_at`

Invoice types:

1. strategy_development_fee
2. campaign_fee
3. creator_fee
4. grant_disbursement
5. reimbursement
6. other

### payments

Fields:

1. `id`
2. `invoice_id`
3. `business_case_id`
4. `payer_type`
5. `payee_type`
6. `amount`
7. `currency`
8. `status`
9. `provider`
10. `provider_reference`
11. `paid_at`
12. `created_at`

### wallet_accounts

Fields:

1. `id`
2. `owner_type`
3. `owner_user_id`
4. `brand_id`
5. `creator_id`
6. `creative_org_id`
7. `currency`
8. `status`
9. `created_at`

### wallet_transactions

Fields:

1. `id`
2. `wallet_account_id`
3. `business_case_id`
4. `transaction_type`
5. `amount`
6. `currency`
7. `status`
8. `reference`
9. `created_at`

### payout_splits

Purpose:

Supports Super Creative team payment splits.

Fields:

1. `id`
2. `business_case_id`
3. `creative_org_id`
4. `recipient_user_id`
5. `creator_id`
6. `percentage`
7. `fixed_amount`
8. `status`
9. `created_at`

## 8.10 Deliverables, Tasks, And Scope Tables

### deliverables

Fields:

1. `id`
2. `business_case_id`
3. `creator_id`
4. `creative_org_id`
5. `assigned_to_user_id`
6. `title`
7. `description`
8. `status`
9. `due_at`
10. `approved_at`
11. `created_at`

Statuses:

1. not_started
2. pending_upload
3. submitted
4. pending_rm_review
5. revision_requested
6. approved
7. cancelled

### deliverable_submissions

Fields:

1. `id`
2. `deliverable_id`
3. `submitted_by_user_id`
4. `file_id`
5. `notes`
6. `status`
7. `submitted_at`

### scope_changes

Fields:

1. `id`
2. `business_case_id`
3. `requested_by_user_id`
4. `description`
5. `timeline_impact`
6. `fee_impact`
7. `operational_impact`
8. `status`
9. `approved_by_user_id`
10. `approved_at`
11. `created_at`

### tasks

Fields:

1. `id`
2. `business_case_id`
3. `assigned_to_user_id`
4. `created_by_user_id`
5. `title`
6. `description`
7. `priority`
8. `status`
9. `due_at`
10. `created_at`

## 8.11 Messaging, Notifications, Files, And Audit Tables

### message_threads

Fields:

1. `id`
2. `business_case_id`
3. `brand_id`
4. `creator_id`
5. `creative_org_id`
6. `thread_type`
7. `created_at`

### messages

Fields:

1. `id`
2. `thread_id`
3. `sender_user_id`
4. `body`
5. `file_id`
6. `created_at`

### notifications

Fields:

1. `id`
2. `user_id`
3. `type`
4. `title`
5. `body`
6. `link_url`
7. `read_at`
8. `created_at`

### files

Fields:

1. `id`
2. `owner_user_id`
3. `business_case_id`
4. `blob_container`
5. `blob_name`
6. `original_filename`
7. `content_type`
8. `size_bytes`
9. `visibility`
10. `created_at`

### final_reports

Fields:

1. `id`
2. `business_case_id`
3. `report_json`
4. `file_id`
5. `status`
6. `generated_by_user_id`
7. `created_at`

### feedback

Fields:

1. `id`
2. `business_case_id`
3. `submitted_by_user_id`
4. `party_type`
5. `rating`
6. `comments`
7. `created_at`

### audit_logs

Fields:

1. `id`
2. `actor_user_id`
3. `action`
4. `entity_type`
5. `entity_id`
6. `before_json`
7. `after_json`
8. `ip_address`
9. `user_agent`
10. `created_at`

### system_settings

Fields:

1. `id`
2. `key`
3. `value_json`
4. `updated_by_user_id`
5. `updated_at`

---

## 9. Backend API Structure

## 9.1 API Design Principles

1. Use REST endpoints for core CRUD and workflow mutations.
2. Use explicit action endpoints for stage transitions and approval actions.
3. Keep authorization in backend dependencies.
4. Return role-scoped data.
5. Use Pydantic schemas for all request and response bodies.
6. Use pagination for list endpoints.
7. Use filtering for admin list views.
8. Use audit logging for important mutations.
9. Use background jobs for email, file processing, AI generation, report generation, discovery scans, scraper jobs, and candidate enrichment.

## 9.2 Backend Folder Structure

Recommended FastAPI structure:

```text
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   ├── permissions.py
│   │   ├── database.py
│   │   ├── logging.py
│   │   └── exceptions.py
│   ├── api/
│   │   ├── deps.py
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── users.py
│   │       ├── brands.py
│   │       ├── creatives.py
│   │       ├── applications.py
│   │       ├── opportunities.py
│   │       ├── business_cases.py
│   │       ├── documents.py
│   │       ├── approvals.py
│   │       ├── briefs.py
│   │       ├── contracts.py
│   │       ├── invoices.py
│   │       ├── payments.py
│   │       ├── deliverables.py
│   │       ├── tasks.py
│   │       ├── messages.py
│   │       ├── reports.py
│   │       ├── notifications.py
│   │       ├── files.py
│   │       └── admin.py
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── workers/
│   ├── integrations/
│   │   ├── email.py
│   │   ├── storage.py
│   │   ├── ai.py
│   │   └── payments.py
│   └── tests/
├── alembic/
├── alembic.ini
├── Dockerfile
├── pyproject.toml
└── README.md
```

Required discovery modules:

1. Add `app/api/routes/discovery.py` for discovery sources, scans, candidates, review, and conversion endpoints.
2. Add `app/services/discovery_service.py` for scan orchestration, candidate review logic, deduplication, and conversion.
3. Add `app/services/scraper_service.py` for source-specific scraping and public web extraction.
4. Add `app/services/candidate_enrichment_service.py` for AI summaries, scoring, duplicate detection, and evidence normalization.
5. Add `app/workers/discovery_worker.py` for queued scraper and enrichment jobs.
6. Add discovery models and schemas for `discovery_sources`, `discovery_scans`, `discovery_candidates`, `discovery_candidate_notes`, and `discovery_candidate_matches`.

Required meeting modules:

1. Add `app/api/routes/meetings.py` for meeting scheduling, attendees, agendas, transcripts, summaries, follow-ups, and readiness endpoints.
2. Add `app/services/meeting_service.py` for meeting orchestration and workflow state.
3. Add `app/services/meeting_provider_service.py` for Google Meet, Microsoft Teams, Zoom, manual links, and phone/in-person meeting handling.
4. Add `app/services/transcription_service.py` for transcript generation or transcript file processing.
5. Add `app/services/meeting_intelligence_service.py` for suggested questions, AI summaries, missing-information checks, and Alignment Snapshot readiness scoring.
6. Add `app/workers/meeting_worker.py` for queued transcription, summarization, follow-up drafting, and Alignment Snapshot draft generation.
7. Add meeting models and schemas for `meetings`, `meeting_attendees`, `meeting_agenda_items`, `meeting_questions`, `meeting_recordings`, `meeting_transcripts`, `meeting_summaries`, `meeting_missing_info`, `meeting_alignment_readiness`, `meeting_action_items`, `meeting_followups`, and `meeting_provider_integrations`.

## 9.3 Core Endpoint Groups

### Auth

Endpoints:

1. `POST /api/auth/login`
2. `POST /api/auth/logout`
3. `POST /api/auth/refresh`
4. `POST /api/auth/forgot-password`
5. `POST /api/auth/reset-password`
6. `POST /api/auth/accept-invitation`
7. `GET /api/auth/me`

### Public Intake

Endpoints:

1. `POST /api/public/brand-enquiries`
2. `POST /api/public/creative-applications`
3. `POST /api/public/super-creative-applications`

### Admin Users And Roles

Endpoints:

1. `GET /api/admin/users`
2. `POST /api/admin/users/invite`
3. `PATCH /api/admin/users/{user_id}`
4. `GET /api/admin/roles`
5. `PATCH /api/admin/users/{user_id}/roles`

### Brands And CRM

Endpoints:

1. `GET /api/brands`
2. `POST /api/brands`
3. `GET /api/brands/{brand_id}`
4. `PATCH /api/brands/{brand_id}`
5. `GET /api/brands/{brand_id}/contacts`
6. `POST /api/brands/{brand_id}/contacts`
7. `GET /api/brands/{brand_id}/business-cases`
8. `POST /api/brands/{brand_id}/invite-user`

### Creative Network

Endpoints:

1. `GET /api/creatives`
2. `POST /api/creatives`
3. `GET /api/creatives/{creator_id}`
4. `PATCH /api/creatives/{creator_id}`
5. `GET /api/super-creatives`
6. `POST /api/super-creatives`
7. `GET /api/super-creatives/{creative_org_id}`
8. `PATCH /api/super-creatives/{creative_org_id}`
9. `GET /api/super-creatives/{creative_org_id}/members`
10. `POST /api/super-creatives/{creative_org_id}/members`
11. `POST /api/super-creatives/{creative_org_id}/members/invite`

### Applications

Endpoints:

1. `GET /api/applications/creatives`
2. `GET /api/applications/creatives/{application_id}`
3. `POST /api/applications/creatives/{application_id}/approve`
4. `POST /api/applications/creatives/{application_id}/reject`
5. `GET /api/applications/brand-enquiries`
6. `POST /api/applications/brand-enquiries/{enquiry_id}/convert`

### Discovery Intelligence And Scraper Agents

These endpoints power opportunity scraping, brand signal discovery, grant discovery, individual creative discovery, Super Creative discovery, creative organization discovery, and cultural/market signal discovery.

Endpoints:

1. `GET /api/discovery/sources`
2. `POST /api/discovery/sources`
3. `PATCH /api/discovery/sources/{source_id}`
4. `POST /api/discovery/scans`
5. `GET /api/discovery/scans`
6. `GET /api/discovery/scans/{scan_id}`
7. `POST /api/discovery/scans/{scan_id}/cancel`
8. `GET /api/discovery/candidates`
9. `GET /api/discovery/candidates/{candidate_id}`
10. `PATCH /api/discovery/candidates/{candidate_id}`
11. `POST /api/discovery/candidates/{candidate_id}/notes`
12. `POST /api/discovery/candidates/{candidate_id}/accept`
13. `POST /api/discovery/candidates/{candidate_id}/reject`
14. `POST /api/discovery/candidates/{candidate_id}/archive`
15. `POST /api/discovery/candidates/{candidate_id}/mark-duplicate`
16. `POST /api/discovery/candidates/{candidate_id}/convert/business-case`
17. `POST /api/discovery/candidates/{candidate_id}/convert/brand-lead`
18. `POST /api/discovery/candidates/{candidate_id}/convert/creative-application`
19. `POST /api/discovery/candidates/{candidate_id}/convert/creator-profile`
20. `POST /api/discovery/candidates/{candidate_id}/convert/super-creative-application`
21. `POST /api/discovery/candidates/{candidate_id}/convert/creative-organization`
22. `POST /api/discovery/candidates/{candidate_id}/enrich`
23. `GET /api/discovery/candidates/{candidate_id}/matches`

Required scan request fields:

1. `scan_type`
2. `query`
3. `source_ids`
4. `target_country`
5. `target_category`
6. `max_results`
7. `review_required`

Supported scan types:

1. `opportunity`
2. `grant`
3. `brand_signal`
4. `market_signal`
5. `cultural_signal`
6. `individual_creative`
7. `super_creative`
8. `creative_org`
9. `creator_collaboration_signal`
10. `mixed`

Important rule:

Scraper agents must never automatically approve external users or create active Business Cases without admin review. They create candidates, then admin users accept, reject, archive, or convert them.

### Opportunities

These endpoints can be retained for compatibility, but the production system should prefer the generalized `/api/discovery/*` endpoints.

Endpoints:

1. `GET /api/opportunities/candidates`
2. `POST /api/opportunities/scans`
3. `POST /api/opportunities/candidates/{candidate_id}/accept`
4. `POST /api/opportunities/candidates/{candidate_id}/reject`

### Meetings

These endpoints power Admin Meeting Intelligence and limited brand/creative meeting views.

Endpoints:

1. `GET /api/meetings`
2. `POST /api/meetings`
3. `GET /api/meetings/{meeting_id}`
4. `PATCH /api/meetings/{meeting_id}`
5. `DELETE /api/meetings/{meeting_id}`
6. `POST /api/meetings/{meeting_id}/send-invite`
7. `POST /api/meetings/{meeting_id}/cancel`
8. `POST /api/meetings/{meeting_id}/mark-completed`
9. `POST /api/meetings/{meeting_id}/attendees`
10. `PATCH /api/meetings/{meeting_id}/attendees/{attendee_id}`
11. `DELETE /api/meetings/{meeting_id}/attendees/{attendee_id}`
12. `POST /api/meetings/{meeting_id}/agenda/generate`
13. `POST /api/meetings/{meeting_id}/agenda-items`
14. `POST /api/meetings/{meeting_id}/questions/generate`
15. `POST /api/meetings/{meeting_id}/questions`
16. `PATCH /api/meetings/{meeting_id}/questions/{question_id}`
17. `POST /api/meetings/{meeting_id}/recordings`
18. `POST /api/meetings/{meeting_id}/transcripts`
19. `POST /api/meetings/{meeting_id}/transcripts/{transcript_id}/process`
20. `POST /api/meetings/{meeting_id}/summary/generate`
21. `GET /api/meetings/{meeting_id}/summary`
22. `PATCH /api/meetings/{meeting_id}/summary`
23. `POST /api/meetings/{meeting_id}/missing-info/check`
24. `GET /api/meetings/{meeting_id}/missing-info`
25. `PATCH /api/meetings/{meeting_id}/missing-info/{missing_info_id}`
26. `POST /api/meetings/{meeting_id}/alignment-readiness/check`
27. `GET /api/meetings/{meeting_id}/alignment-readiness`
28. `POST /api/meetings/{meeting_id}/alignment-snapshot/draft`
29. `POST /api/meetings/{meeting_id}/follow-ups`
30. `POST /api/meetings/{meeting_id}/follow-ups/{follow_up_id}/send`
31. `POST /api/meetings/{meeting_id}/action-items`
32. `PATCH /api/meetings/{meeting_id}/action-items/{action_item_id}`
33. `GET /api/meetings/calendar`
34. `GET /api/meetings/follow-ups`
35. `GET /api/meeting-provider-integrations`
36. `POST /api/meeting-provider-integrations`
37. `DELETE /api/meeting-provider-integrations/{integration_id}`

Required create-meeting request fields:

1. `title`
2. `meeting_type`
3. `provider`
4. `scheduled_start_at`
5. `scheduled_end_at`
6. `timezone`
7. `brand_id`
8. `brand_contact_id`
9. `discovery_candidate_id`
10. `business_case_id`
11. `creator_id`
12. `creative_org_id`
13. `attendees`
14. `purpose`

Important rules:

1. Meetings can be linked to discovery candidates before a Business Case exists.
2. Meetings can be linked to Business Cases after a case is created.
3. Meeting transcripts are internal-only by default.
4. AI-generated summaries require admin review before sharing.
5. Recording and transcription require consent status to be stored.
6. Only internal users can run AI missing-information and Alignment Snapshot draft actions.

### Business Cases

Endpoints:

1. `GET /api/business-cases`
2. `POST /api/business-cases`
3. `GET /api/business-cases/{business_case_id}`
4. `PATCH /api/business-cases/{business_case_id}`
5. `POST /api/business-cases/{business_case_id}/advance`
6. `GET /api/business-cases/{business_case_id}/timeline`
7. `GET /api/business-cases/{business_case_id}/audit`

### Connect Stage

Endpoints:

1. `POST /api/business-cases/{business_case_id}/interactions`
2. `POST /api/business-cases/{business_case_id}/interactions/ingest-transcript`
3. `PATCH /api/business-cases/{business_case_id}/connect-status`
4. `POST /api/business-cases/{business_case_id}/qualify`

### Frame Stage

Endpoints:

1. `POST /api/business-cases/{business_case_id}/alignment-snapshot/generate`
2. `PATCH /api/documents/{document_id}`
3. `POST /api/documents/{document_id}/send`
4. `POST /api/documents/{document_id}/comments`
5. `POST /api/documents/{document_id}/comments/{comment_id}/resolve`
6. `POST /api/business-cases/{business_case_id}/scope-flags/{flag_id}/resolve`
7. `POST /api/documents/{document_id}/approve`

### Plan Stage

Endpoints:

1. `POST /api/business-cases/{business_case_id}/creator-matches/generate`
2. `POST /api/business-cases/{business_case_id}/brainstorm-rounds`
3. `POST /api/business-cases/{business_case_id}/select-creative`
4. `POST /api/business-cases/{business_case_id}/briefs`
5. `POST /api/briefs/{brief_id}/send`
6. `POST /api/briefs/{brief_id}/responses`
7. `POST /api/business-cases/{business_case_id}/strategy-snapshot/generate`
8. `POST /api/contracts`
9. `POST /api/contracts/{contract_id}/send`
10. `POST /api/contracts/{contract_id}/sign`

### Deliver Stage

Endpoints:

1. `GET /api/business-cases/{business_case_id}/deliverables`
2. `POST /api/business-cases/{business_case_id}/deliverables`
3. `POST /api/deliverables/{deliverable_id}/submissions`
4. `POST /api/deliverables/{deliverable_id}/approve`
5. `POST /api/deliverables/{deliverable_id}/request-revision`
6. `POST /api/business-cases/{business_case_id}/scope-changes`
7. `POST /api/scope-changes/{scope_change_id}/approve`

### Closure Stage

Endpoints:

1. `POST /api/business-cases/{business_case_id}/final-report/generate`
2. `GET /api/business-cases/{business_case_id}/final-report`
3. `POST /api/business-cases/{business_case_id}/feedback`
4. `POST /api/business-cases/{business_case_id}/close`

### Finance

Endpoints:

1. `GET /api/invoices`
2. `POST /api/invoices`
3. `GET /api/invoices/{invoice_id}`
4. `POST /api/invoices/{invoice_id}/mark-paid`
5. `GET /api/wallets/me`
6. `GET /api/payments`
7. `POST /api/payout-splits`

### Files

Endpoints:

1. `POST /api/files/presigned-upload`
2. `POST /api/files/complete-upload`
3. `GET /api/files/{file_id}/download`
4. `DELETE /api/files/{file_id}`

### Dashboards And Reports

Endpoints:

1. `GET /api/dashboard/admin`
2. `GET /api/dashboard/brand`
3. `GET /api/dashboard/creative`
4. `GET /api/reports`
5. `GET /api/reports/business-cases`
6. `GET /api/reports/finance`
7. `GET /api/reports/creatives`

---

## 10. Frontend Structure

## 10.1 Frontend Folder Structure

Recommended React structure:

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── providers.tsx
│   │   └── routeGuards.tsx
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── businessCases.ts
│   │   ├── brands.ts
│   │   ├── creatives.ts
│   │   ├── documents.ts
│   │   ├── finance.ts
│   │   ├── messages.ts
│   │   └── reports.ts
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── documents/
│   │   ├── workflow/
│   │   └── charts/
│   ├── features/
│   │   ├── publicSite/
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── brandPortal/
│   │   ├── creativePortal/
│   │   ├── businessCases/
│   │   ├── crm/
│   │   ├── intelligence/
│   │   ├── finance/
│   │   ├── documents/
│   │   ├── messages/
│   │   └── reports/
│   ├── hooks/
│   ├── lib/
│   ├── styles/
│   ├── types/
│   └── main.tsx
├── public/
├── package.json
├── vite.config.ts
└── tsconfig.json
```

Required frontend discovery modules:

1. Add `src/api/discovery.ts` for discovery source, scan, candidate, and conversion API calls.
2. Add `src/features/intelligence/discovery/` for discovery dashboards and candidate review pages.
3. Add `src/features/intelligence/scans/` for scan creation, scan history, scan detail, and scan status UI.
4. Add `src/features/intelligence/candidates/` for candidate list, candidate detail, evidence review, notes, accept/reject/archive, duplicate handling, and conversion flows.
5. Add candidate cards for `opportunity`, `grant_opportunity`, `brand_lead`, `individual_creative`, `super_creative`, `creative_org`, `market_signal`, and `cultural_signal`.
6. Add conversion modals for Business Case, brand lead, creative application, creator profile, Super Creative application, and creative organization.

Required frontend meeting modules:

1. Add `src/api/meetings.ts` for meeting, attendee, agenda, question, transcript, summary, missing-info, readiness, follow-up, and provider integration API calls.
2. Add `src/features/admin/meetings/` for the Admin Meetings page, meeting detail, meeting calendar, follow-up queue, and meeting creation flow.
3. Add `src/features/admin/meetings/components/MeetingPrepPanel.tsx` for AI agenda, suggested questions, and known/missing information.
4. Add `src/features/admin/meetings/components/TranscriptPanel.tsx` for transcript upload, transcript display, speaker map, and processing status.
5. Add `src/features/admin/meetings/components/MeetingSummaryPanel.tsx` for AI summary, extracted objectives, KPIs, budget, timeline, risks, and next actions.
6. Add `src/features/admin/meetings/components/AlignmentReadinessPanel.tsx` for readiness score, missing fields, and suggested follow-up.
7. Add `src/features/admin/meetings/components/FollowUpPanel.tsx` for follow-up meeting and email drafts.
8. Add limited `src/features/brandPortal/meetings/` for brand-visible meetings, join links, approved agendas, and shared summaries.
9. Add limited `src/features/creativePortal/meetings/` for creative-visible meetings and assigned action items.

## 10.2 Route Structure

Recommended production routes:

```text
/
/about
/services
/brands
/creatives
/super-creatives
/case-studies
/contact
/brand-enquiry
/creative-application
/super-creative-application
/login
/forgot-password
/reset-password
/accept-invitation

/admin
/admin/dashboard
/admin/intelligence
/admin/opportunities
/admin/discovery
/admin/discovery/scans
/admin/discovery/candidates
/admin/discovery/candidates/:candidateId
/admin/discovery/creatives
/admin/discovery/super-creatives
/admin/discovery/brands
/admin/discovery/grants
/admin/discovery/market-signals
/admin/meetings
/admin/meetings/calendar
/admin/meetings/follow-ups
/admin/meetings/:meetingId
/admin/crm
/admin/brands
/admin/brands/:brandId
/admin/business-cases
/admin/business-cases/:businessCaseId
/admin/pipeline
/admin/projects
/admin/creatives
/admin/creatives/:creatorId
/admin/super-creatives
/admin/super-creatives/:creativeOrgId
/admin/applications
/admin/contracts
/admin/documents
/admin/invoices
/admin/wallet
/admin/tasks
/admin/messages
/admin/reports
/admin/audit-logs
/admin/users
/admin/settings

/brand
/brand/dashboard
/brand/projects
/brand/projects/:projectId
/brand/meetings
/brand/meetings/:meetingId
/brand/approvals
/brand/documents
/brand/invoices
/brand/messages
/brand/team
/brand/settings

/creative
/creative/dashboard
/creative/briefs
/creative/briefs/:briefId
/creative/projects
/creative/meetings
/creative/meetings/:meetingId
/creative/deliverables
/creative/tasks
/creative/wallet
/creative/profile
/creative/portfolio
/creative/messages
/creative/team
/creative/settings
```

## 10.3 Shared UI Components

Required shared components:

1. App shell
2. Admin layout
3. Brand layout
4. Creative layout
5. Public layout
6. Sidebar navigation
7. Header
8. Command menu
9. Notification center
10. User menu
11. Role guard
12. Data table
13. Filter bar
14. Status badge
15. Stage badge
16. Track badge
17. Empty state
18. Loading state
19. Error boundary
20. Confirmation dialog
21. Modal
22. Drawer
23. File uploader
24. Document viewer
25. Section comment component
26. Approval panel
27. Timeline
28. Audit log list
29. KPI card
30. Chart card
31. Message thread
32. Form field components
33. Meeting card
34. Meeting calendar
35. Agenda editor
36. Suggested questions panel
37. Transcript viewer
38. Meeting summary panel
39. Missing information checklist
40. Alignment readiness score
41. Follow-up composer

## 10.4 Frontend State Management

Recommended approach:

1. Use TanStack Query for server data.
2. Use local component state for form UI and page UI.
3. Use Zustand or a small global store for session UI state, sidebar state, theme, and command menu.
4. Do not store important server data permanently in frontend global state.
5. Use backend as the source of truth for workflow state.

## 10.5 Frontend Validation

Use Zod schemas for:

1. Login
2. Invitation acceptance
3. Brand enquiry
4. Creative application
5. Super Creative application
6. New Business Case
7. Brand creation
8. Creator profile
9. Super Creative profile
10. Document comments
11. Approval actions
12. Deliverable submission
13. Scope change
14. Invoice creation
15. Feedback
16. Meeting creation
17. Meeting attendee invitation
18. Meeting agenda item
19. Meeting question
20. Transcript upload
21. Meeting follow-up
22. Meeting action item

---

## 11. Azure Production Architecture

## 11.1 Recommended Azure Services

| Layer | Azure Service |
|---|---|
| Frontend | Azure Static Web Apps |
| Backend API | Azure Container Apps or Azure App Service |
| Backend worker | Azure Container Apps worker |
| Database | Azure Database for PostgreSQL Flexible Server |
| File storage | Azure Blob Storage |
| Secrets | Azure Key Vault |
| Queue/events | Azure Service Bus |
| Monitoring | Azure Monitor and Application Insights |
| Email | Azure Communication Services Email or approved transactional email provider |
| CDN/WAF | Azure Front Door when needed |
| Cache | Azure Cache for Redis when needed |

## 11.2 Recommended Production Deployment Shape

```text
Azure Resource Group: tasck-prod-rg
├── Static Web App: tasck-web-prod
├── Container App: tasck-api-prod
├── Container App: tasck-worker-prod
├── PostgreSQL Flexible Server: tasck-postgres-prod
├── Storage Account: tasckstorageprod
├── Blob Containers
│   ├── documents
│   ├── deliverables
│   ├── profile-assets
│   └── exports
├── Key Vault: tasck-keyvault-prod
├── Service Bus Namespace: tasck-servicebus-prod
├── Application Insights: tasck-appinsights-prod
└── Log Analytics Workspace: tasck-logs-prod
```

## 11.3 Environments

Use at least three environments:

1. Development
2. Staging
3. Production

Recommended resource groups:

1. `tasck-dev-rg`
2. `tasck-staging-rg`
3. `tasck-prod-rg`

Each environment should have its own:

1. Database
2. Storage containers
3. API service
4. Worker service
5. Secrets
6. Monitoring

Never use production data in development without strict anonymization.

## 11.4 Backend Deployment Options

### Recommended: Azure Container Apps

Use Azure Container Apps if:

1. You want API and worker containers.
2. You want scalable background processing.
3. You want containerized deployments.
4. You want future AI/report jobs to run separately from the API.

### Simpler Alternative: Azure App Service

Use Azure App Service if:

1. You want the simplest FastAPI deployment.
2. You are not ready for containerized workers.
3. Background work is still light.

Long-term production recommendation:

Use Container Apps for API and worker.

## 11.5 Security Architecture

Required:

1. Store secrets in Azure Key Vault.
2. Do not commit secrets to Git.
3. Use environment variables injected from Key Vault.
4. Restrict database access.
5. Use TLS everywhere.
6. Use HTTPS-only frontend and backend.
7. Use secure cookies for refresh tokens if using browser session cookies.
8. Use short-lived access tokens.
9. Use password hashing.
10. Use role-based authorization on backend.
11. Log important mutations to audit logs.
12. Protect file downloads with authorization checks.
13. Store meeting recording and transcription consent status.
14. Keep raw meeting transcripts internal-only by default.
15. Require explicit sharing action before meeting summaries are visible to brand or creative users.
16. Audit all transcript access, transcript processing, summary sharing, and Alignment Snapshot generation from meeting data.

## 11.6 Storage Architecture

Blob containers:

1. `documents`
2. `deliverables`
3. `profile-assets`
4. `exports`
5. `contracts`
6. `invoices`
7. `meeting-recordings`
8. `meeting-transcripts`

Storage rules:

1. Files are private by default.
2. Backend generates short-lived signed URLs for download/upload.
3. File metadata is stored in PostgreSQL.
4. Every file should have owner, visibility, and entity relationship metadata.
5. Deleted records should not immediately delete files unless policy allows.

## 11.7 Observability

Track:

1. API latency.
2. API errors.
3. Database errors.
4. Worker failures.
5. Email delivery failures.
6. Login failures.
7. Stage advancement failures.
8. File upload failures.
9. AI job failures.
10. Background queue depth.
11. Meeting provider sync failures.
12. Transcript processing failures.
13. Meeting summary generation failures.
14. Alignment readiness check failures.

Use:

1. Application Insights traces.
2. Structured logs.
3. Correlation IDs.
4. Error alerts.
5. Uptime checks.

---

## 12. Business Case Gate Rules

## 12.1 Stage Gate Summary

| Transition | Required Gate |
|---|---|
| Opportunity -> Business Case | Admin accepts or creates Business Case |
| Connect -> Frame | Opportunity is qualified |
| Frame -> Plan | Alignment approved and scope flags resolved |
| Plan -> Deliver | Strategy approved, creative confirmed, contracts signed, fee rules satisfied |
| Deliver -> Closure | Required deliverables approved and scope changes resolved |
| Closure -> Closed | Final report, feedback, and finance closeout complete or waived |

## 12.2 Paid Track Rules

Paid-track Business Cases should support:

1. Strategy Development Fee.
2. Campaign invoice.
3. Creator payment.
4. TASCK fee/margin.
5. Brand contract.
6. Creator or Super Creative contract.

Recommended SDF rule:

SDF should be issued during Plan after the creative planning path is defined and before the Strategy Snapshot is externally finalized or delivered as paid strategy output.

The exact business rule should be confirmed by TASCK leadership, but the backend and frontend must match.

## 12.3 Grant Track Rules

Grant-track Business Cases should support:

1. SDF waiver.
2. Grant/funder context.
3. Mission alignment.
4. Impact reporting.
5. Creator direct-payment notes where applicable.
6. No blocked progression caused by unpaid SDF.

## 12.4 Super Creative Rules

When a Super Creative is assigned:

1. The Business Case can reference `creative_org_id`.
2. Deliverables can be assigned to the Super Creative or internal team members.
3. Super Creative can manage internal assignments.
4. TASCK can choose whether team members have login access.
5. Payout can go to Super Creative only or be split across team members.
6. Admin must still have visibility into team structure and assignment status.

---

## 13. Intelligence Features To Bring From V2

## 13.1 Intelligence Center

Purpose:

Give admins a daily operating brain.

Features:

1. Daily briefing.
2. Top opportunities.
3. At-risk Business Cases.
4. Pending approvals.
5. Overdue invoices.
6. Creator response delays.
7. Market signals.
8. Grant signals.
9. Recommended actions.

## 13.2 Opportunity Scanner

Purpose:

Detect potential brand, campaign, cultural, market, and grant opportunities that can become Business Cases or CRM leads.

Flow:

```text
Scan signal
-> create discovery candidate with candidate_type opportunity, grant_opportunity, brand_lead, market_signal, or cultural_signal
-> admin reviews
-> accept candidate
-> convert into Business Case, brand lead, brand enquiry, or archived market signal
```

Required opportunity scanner capabilities:

1. Scan public brand websites for campaign, sponsorship, product, partnership, hiring, and activation signals.
2. Scan public grant/funder sources for relevant creative, cultural, media, advocacy, creator, and impact opportunities.
3. Scan public news and event sources for cultural moments TASCK can convert into brand or grant opportunities.
4. Detect repeated brand activity that suggests budget, category movement, or partnership timing.
5. Identify source URLs and evidence for every candidate.
6. Assign confidence scores and risk notes.
7. Suggest paid or grant track.
8. Suggest estimated value where enough public context exists.
9. Flag duplicates against existing brands, opportunities, and Business Cases.
10. Require admin review before conversion.

## 13.3 Creative Discovery Scraper

Purpose:

Find individual creative talent from public sources and convert strong candidates into creative applications or creator profiles after admin review.

Sources:

1. Portfolio websites.
2. Creator directories.
3. Public social profiles.
4. Public creator press.
5. Award pages.
6. Festival/event lineups.
7. Brand campaign credits.
8. Public collaboration announcements.
9. Manual admin-added URLs.

Candidate data to capture:

1. Name or stage name.
2. Category.
3. Location.
4. Portfolio URL.
5. Social links.
6. Public work examples.
7. Audience indicators where public and allowed.
8. Brand/campaign history.
9. Commercial fit notes.
10. Grant/impact fit notes.
11. Brand safety notes.
12. Contact route if public.
13. Confidence score.
14. Risk score.
15. Evidence URLs.

Flow:

```text
Run Creative Discovery scan
-> create discovery candidate with candidate_type individual_creative
-> admin reviews candidate
-> accept as creative application, sourced creator profile, or outreach lead
-> TASCK contacts/invites creative when appropriate
```

Conversion options:

1. Convert to `creative_application`.
2. Convert to `creator` with status `sourced`.
3. Convert to outreach task.
4. Mark duplicate of existing creator.
5. Reject or archive.

Important rule:

Discovered creatives should not automatically receive portal accounts. Admin must approve and invite them.

## 13.4 Super Creative Discovery Scraper

Purpose:

Find Super Creatives, creative leads, studios, production teams, creative agencies, collectives, directors, photographers, filmmakers, production designers, and other team-based creative partners.

Sources:

1. Studio websites.
2. Creative agency websites.
3. Production company websites.
4. Public social profiles.
5. Festival and award pages.
6. Public campaign credits.
7. Public directories.
8. Event speaker pages.
9. Portfolio platforms.
10. Manual admin-added URLs.

Candidate data to capture:

1. Organization or lead name.
2. Owner/lead contact if public.
3. Team size where public.
4. Capabilities.
5. Location.
6. Portfolio URL.
7. Website.
8. Social links.
9. Past campaigns.
10. Brand categories served.
11. Production capabilities.
12. Commercial fit.
13. Grant/impact fit.
14. Risk notes.
15. Evidence URLs.

Flow:

```text
Run Super Creative Discovery scan
-> create discovery candidate with candidate_type super_creative, creative_org, agency, studio, production_team, or creator_collective
-> admin reviews candidate
-> accept as Super Creative application, creative organization, or outreach lead
-> TASCK contacts/invites Super Creative when appropriate
```

Conversion options:

1. Convert to `super_creative_application`.
2. Convert to `creative_organization` with status `sourced`.
3. Convert to outreach task.
4. Mark duplicate of existing creative organization.
5. Reject or archive.

Important rule:

Discovered Super Creatives should not automatically receive portal accounts. Admin must approve and invite them.

## 13.5 Discovery Candidate Review

Purpose:

Give TASCK a single review queue for all scraper outputs.

Candidate review filters:

1. Candidate type.
2. Scan type.
3. Source.
4. Status.
5. Country.
6. Category.
7. Confidence score.
8. Risk score.
9. Recommended track.
10. Duplicate status.

Candidate review actions:

1. View evidence URLs.
2. View raw scraped summary.
3. Edit candidate details.
4. Add admin note.
5. Accept candidate.
6. Reject candidate.
7. Archive candidate.
8. Mark duplicate.
9. Convert to Business Case.
10. Convert to brand lead.
11. Convert to creative application.
12. Convert to creator profile.
13. Convert to Super Creative application.
14. Convert to creative organization.
15. Create outreach task.

Review principle:

Scraping is discovery, not approval. Human review is required before any candidate becomes an active platform entity.

## 13.6 Meeting Intelligence

Purpose:

Use meetings as a structured intelligence layer that converts discovered opportunities, CRM relationships, and human conversations into Business Case context and Alignment Snapshot drafts.

Admin meeting use cases:

1. Schedule a meeting from a Discovery Candidate.
2. Schedule a meeting from a brand or CRM contact.
3. Schedule a meeting from a Business Case.
4. Schedule a meeting with a creator or Super Creative.
5. Generate meeting agenda and suggested questions.
6. Capture transcript or recording.
7. Generate meeting summary.
8. Extract objectives, KPIs, budget, timeline, audience, decision makers, scope, and risks.
9. Check Alignment Snapshot readiness.
10. Draft Alignment Snapshot if information is complete.
11. Suggest follow-up meeting if information is incomplete.

Pre-meeting AI outputs:

1. Company/contact context.
2. Opportunity summary.
3. Known facts.
4. Missing facts.
5. Suggested agenda.
6. Suggested questions.
7. KPI questions.
8. Budget questions.
9. Timeline questions.
10. Decision-maker questions.
11. Scope questions.
12. Risk questions.
13. Grant-impact questions where relevant.

Post-meeting AI outputs:

1. Transcript summary.
2. Objectives extracted.
3. KPIs extracted.
4. Audience extracted.
5. Budget and fee context extracted.
6. Timeline extracted.
7. Decision-maker and approval process extracted.
8. Scope assumptions extracted.
9. Risks and blockers extracted.
10. Action items extracted.
11. CRM update suggestions.
12. Business Case update suggestions.
13. Alignment Snapshot readiness score.
14. Missing information list.
15. Suggested follow-up meeting agenda.
16. Follow-up email draft.
17. Alignment Snapshot draft when ready.

Meeting Intelligence readiness rule:

The system should not automatically send an Alignment Snapshot after a meeting. It should draft it for RM review. If required information is missing, it should recommend a clarification meeting or follow-up email.

## 13.7 Scraper Compliance And Safety Rules

Production scraper agents must follow clear safety and compliance rules.

Rules:

1. Use public sources only.
2. Respect robots.txt and source terms where applicable.
3. Rate-limit requests per source.
4. Store source URLs and evidence.
5. Avoid scraping private, gated, or personal data that is not intentionally public.
6. Do not collect sensitive personal data unless TASCK has a lawful and necessary reason.
7. Mark uncertain data as unverified.
8. Allow admin users to delete or archive candidates.
9. Keep raw payloads for debugging only where legally appropriate.
10. Use enrichment carefully and separately from source extraction.
11. Do not auto-contact candidates without an approved outreach workflow.
12. Do not auto-create active user accounts.
13. Do not auto-create approved creator or Super Creative records.
14. Do not auto-create active Business Cases without admin acceptance.

## 13.8 Deal Simulator

Purpose:

Help TASCK model deal economics before committing.

Inputs:

1. Estimated brand budget.
2. TASCK fee.
3. Creator payout.
4. Production cost.
5. Close probability.
6. Timeline.
7. Payment terms.

Outputs:

1. Estimated gross value.
2. Expected value.
3. TASCK margin.
4. Creator payout.
5. Risk level.
6. Recommendation.

## 13.9 Ecosystem Graph

Purpose:

Show relationships between brands, creators, Super Creatives, campaigns, sectors, and opportunities.

Use cases:

1. Find connected creators for a brand.
2. See which creators have worked in an industry.
3. Identify relationship gaps.
4. Understand brand/creator network strength.
5. Show discovered candidates alongside approved network records.
6. Reveal whether a candidate already matches an existing brand, creator, or Super Creative.

## 13.10 Command Menu

Purpose:

Let internal users quickly navigate and take actions.

Actions:

1. Search Business Cases.
2. Search brands.
3. Search creatives.
4. Create Business Case.
5. Open pending approvals.
6. Open overdue invoices.
7. Open deliverables needing review.
8. Run opportunity scan.
9. Run creative discovery scan.
10. Run Super Creative discovery scan.
11. Open discovery candidate review queue.
12. Create meeting from discovery candidate.
13. Open meetings needing follow-up.
14. Open meetings ready for Alignment Snapshot draft.

---

## 14. Features To Bring From V1

## 14.1 Stronger Role-Based Portal Thinking

Keep:

1. Clear role entry.
2. Brand-specific workspace.
3. Creative-specific workspace.
4. Admin governance.
5. Internal staff roles.

## 14.2 Wallet And Payment Visibility

Keep:

1. Brand invoice visibility.
2. Creator wallet visibility.
3. Super Creative team payout visibility.
4. Admin finance oversight.
5. Payment status tracking.

## 14.3 Task Management

Keep and improve:

1. Admin tasks.
2. Business Case tasks.
3. Creator tasks.
4. Team member tasks.
5. Overdue task alerts.

## 14.4 Admin Governance

Keep and improve:

1. User management.
2. Role management.
3. Audit logs.
4. Dispute handling.
5. Platform health.
6. Finance oversight.

## 14.5 Dispute Handling

Production V3 should include at least a simple dispute model.

Use cases:

1. Brand disputes deliverable.
2. Creator disputes payment.
3. Scope disagreement.
4. Contract issue.
5. Missed deadline.

Suggested table:

`disputes`

Fields:

1. `id`
2. `business_case_id`
3. `opened_by_user_id`
4. `party_type`
5. `category`
6. `description`
7. `status`
8. `resolution`
9. `resolved_by_user_id`
10. `resolved_at`
11. `created_at`

---

## 15. Production Build Phases

This is not saying to delay planning for features. It is a build order so the work does not collapse under its own weight.

## Phase 1: Foundation

Build:

1. React app shell.
2. FastAPI app shell.
3. PostgreSQL connection.
4. Alembic migrations.
5. Auth.
6. Roles and permissions.
7. Public website pages.
8. Login.
9. Invitation acceptance.
10. Basic admin layout.
11. Basic brand layout.
12. Basic creative layout.
13. File storage integration.
14. Audit logging foundation.

Exit criteria:

1. User can log in.
2. User is routed by role.
3. Backend can read/write PostgreSQL.
4. Frontend can call authenticated API.
5. Files can upload to Blob Storage.

## Phase 2: Core Business Case System

Build:

1. Brands.
2. Creatives.
3. Super Creatives.
4. Business Cases.
5. Business Case list.
6. Business Case detail.
7. Connect stage.
8. Frame stage.
9. Plan stage.
10. Deliver stage.
11. Closure stage.
12. Stage gate enforcement.
13. Stage history.
14. Tasks.
15. Notifications.
16. Basic meeting records.
17. Manual meeting links.
18. Meeting attendees.
19. Meeting notes.
20. Transcript upload.

Exit criteria:

1. Admin can create Business Case.
2. Admin can move it through stages with gates.
3. Brand and creative records connect to it.
4. Audit logs record major actions.
5. Admin can schedule and link meetings to discovery candidates, brands, contacts, and Business Cases.

## Phase 3: Brand And Creative Portals

Build:

1. Brand dashboard.
2. Brand projects.
3. Brand approvals.
4. Brand documents.
5. Brand invoices.
6. Brand messages.
7. Creative dashboard.
8. Creative briefs.
9. Creative deliverables.
10. Creative wallet.
11. Creative profile.
12. Creative messages.
13. Super Creative team management.
14. Team member limited portal.

Exit criteria:

1. Brand sees only their data.
2. Creative sees only their data.
3. Super Creative manages team data.
4. Team member only sees assigned work.

## Phase 4: Documents, Contracts, And Finance

Build:

1. Alignment Snapshot.
2. Strategy Snapshot.
3. Document comments.
4. Document approvals.
5. Contract generation.
6. Contract send/sign state.
7. Invoices.
8. SDF.
9. Payments.
10. Wallet.
11. Payout splits.
12. Finance reports.

Exit criteria:

1. Brand can approve documents.
2. Contracts block delivery until signed.
3. Paid and grant finance logic works.
4. Wallet/payment views are scoped correctly.

## Phase 5: Intelligence And Advanced Operations

Build:

1. Intelligence Center.
2. Opportunity Scanner.
3. Creative Discovery Scraper.
4. Super Creative Discovery Scraper.
5. Grant Discovery Scraper.
6. Brand Signal Scraper.
7. Cultural and market signal scraper.
8. Discovery sources.
9. Discovery scans.
10. Discovery candidate review queue.
11. Candidate deduplication and matching.
12. Candidate conversion into Business Cases, brand leads, creative applications, creator profiles, Super Creative applications, or creative organizations.
13. Market signals.
14. Deal simulator.
15. Ecosystem graph.
16. AI daily briefing.
17. AI alignment generation.
18. AI creator matching.
19. AI strategy snapshot draft.
20. AI final report generation.
21. Live command dashboard.
22. Meeting Intelligence.
23. Google Meet/Calendar or approved meeting provider integration.
24. AI meeting agenda generation.
25. AI suggested questions.
26. Transcript processing.
27. AI meeting summaries.
28. Missing-information detection.
29. Alignment Snapshot readiness scoring.
30. Follow-up meeting and email suggestion.
31. Alignment Snapshot draft from meeting transcript.

Exit criteria:

1. Intelligence features create or influence Business Cases.
2. AI outputs are reviewable and editable.
3. Admin can use command features without leaving the production workflow.
4. Scraper agents create discovery candidates, not approved records.
5. Admin can accept, reject, archive, mark duplicate, and convert candidates.
6. Creative candidates can convert into applications, sourced creator profiles, or outreach tasks.
7. Super Creative candidates can convert into Super Creative applications, creative organizations, or outreach tasks.
8. Opportunity and grant candidates can convert into Business Cases or brand leads.
9. Meetings can produce AI summaries and readiness checks.
10. Incomplete meetings can create follow-up suggestions.
11. Complete meetings can draft Alignment Snapshots for RM review.

## Phase 6: Production Hardening

Build and verify:

1. Security review.
2. Authorization tests.
3. Load testing.
4. Backup and restore process.
5. Monitoring alerts.
6. Error reporting.
7. Data retention policy.
8. Privacy review.
9. Accessibility review.
10. Production runbook.
11. CI/CD pipeline.
12. Staging environment.
13. Production deployment.

Exit criteria:

1. Product is deployable.
2. Product is observable.
3. Product is secure enough for controlled production use.
4. Critical workflows pass automated and manual QA.

---

## 16. CI/CD And DevOps

## 16.1 Repository Structure

Recommended monorepo:

```text
tasck/
├── frontend/
├── backend/
├── infra/
│   ├── bicep/
│   └── terraform/
├── docs/
├── scripts/
└── README.md
```

Use either Bicep or Terraform for infrastructure as code. Do not manually create production services without documenting them.

## 16.2 Git Branches

Recommended:

1. `main` for production-ready code.
2. `develop` for integration.
3. Feature branches for individual work.

## 16.3 Pipeline Steps

Frontend pipeline:

1. Install dependencies.
2. Typecheck.
3. Lint.
4. Run tests.
5. Build.
6. Deploy to Static Web Apps.

Backend pipeline:

1. Install dependencies.
2. Lint.
3. Typecheck if using mypy.
4. Run tests.
5. Build Docker image.
6. Push image.
7. Run migrations.
8. Deploy API container.
9. Deploy worker container.

## 16.4 Database Migrations

Rules:

1. Every schema change uses Alembic.
2. Migrations are reviewed before production.
3. Production migrations are backed up.
4. Destructive migrations require explicit approval.
5. Seed data is separate from production data.

---

## 17. Testing Plan

## 17.1 Backend Tests

Required:

1. Auth tests.
2. Role permission tests.
3. Business Case create/read/update tests.
4. Stage advancement tests.
5. Brand scoping tests.
6. Creative scoping tests.
7. Super Creative team tests.
8. Document approval tests.
9. Contract gate tests.
10. Invoice/payment tests.
11. Deliverable tests.
12. Scope change tests.
13. Final report tests.
14. File upload authorization tests.
15. Audit log tests.
16. Discovery source tests.
17. Discovery scan tests.
18. Discovery candidate review tests.
19. Discovery candidate conversion tests.
20. Creative scraper candidate tests.
21. Super Creative scraper candidate tests.
22. Opportunity/grant scraper candidate tests.
23. Candidate deduplication tests.
24. Meeting create/read/update tests.
25. Meeting attendee tests.
26. Meeting agenda/question generation tests.
27. Transcript upload and processing tests.
28. Meeting summary generation tests.
29. Missing-information detection tests.
30. Alignment readiness scoring tests.
31. Alignment Snapshot draft-from-meeting tests.
32. Meeting follow-up generation tests.

## 17.2 Frontend Tests

Required:

1. Login route tests.
2. Role routing tests.
3. Admin Business Case list tests.
4. Business Case detail stage tests.
5. Brand approval tests.
6. Creative brief tests.
7. Super Creative team management tests.
8. Invoice display tests.
9. Form validation tests.
10. Empty state tests.
11. Discovery dashboard tests.
12. Discovery scan creation tests.
13. Candidate review queue tests.
14. Candidate accept/reject/archive tests.
15. Candidate conversion UI tests.
16. Admin meetings list tests.
17. Meeting detail tests.
18. Meeting calendar tests.
19. Meeting creation form tests.
20. Suggested questions panel tests.
21. Transcript viewer tests.
22. Meeting summary panel tests.
23. Alignment readiness panel tests.
24. Follow-up composer tests.
25. Brand limited meeting view tests.
26. Creative limited meeting view tests.

## 17.3 End-To-End Tests

Required E2E flows:

1. Brand enquiry -> admin review -> create Business Case.
2. Creative application -> admin approval -> invitation -> login.
3. Super Creative application -> approval -> invite -> team setup.
4. Create Business Case -> Connect -> Frame.
5. Alignment Snapshot -> brand comment -> approval.
6. Plan -> brief -> creative response -> Strategy Snapshot.
7. Paid track -> SDF invoice -> mark paid.
8. Contract creation -> sign -> Deliver.
9. Deliverable submission -> review -> approval.
10. Scope change -> approval.
11. Final report -> feedback -> close.
12. Opportunity scan -> candidate review -> convert to Business Case.
13. Creative discovery scan -> candidate review -> convert to creative application.
14. Super Creative discovery scan -> candidate review -> convert to Super Creative application.
15. Creative organization discovery -> candidate review -> convert to creative organization.
16. Duplicate candidate -> match existing record -> mark duplicate.
17. Discovery candidate -> contact added -> meeting scheduled -> invite sent.
18. Meeting transcript uploaded -> AI summary generated -> CRM updated.
19. Meeting missing required info -> follow-up meeting suggested.
20. Meeting complete enough -> Alignment Snapshot draft generated.
21. Admin approves meeting summary -> shared summary visible to brand.

## 17.4 Security Tests

Required:

1. Brand cannot access another brand's records.
2. Creative cannot access another creative's records.
3. Team member cannot access full Super Creative wallet.
4. Brand cannot access admin routes.
5. Creative cannot access admin routes.
6. Expired invitation cannot be used.
7. Expired password reset cannot be used.
8. Unauthorized file download fails.
9. Stage advancement fails without required gates.
10. Non-admin users cannot run discovery scans.
11. Brand users cannot access discovery candidates.
12. Creative users cannot access discovery candidates.
13. Discovery candidates do not create active users without invitation.
14. Scraped data remains review-only until admin conversion.
15. Brand users cannot access raw meeting transcripts by default.
16. Creative users cannot access raw meeting transcripts by default.
17. Private admin meeting notes are never exposed externally.
18. Meeting recording and transcript files require authorization.
19. AI summaries require admin sharing before external visibility.
20. Transcript processing requires consent status.

---

## 18. Production Acceptance Checklist

The production rebuild is acceptable when:

1. There is one unified TASCK OS product.
2. V3 Business Case workflow is the core.
3. V1/V2 features are incorporated as modules, not separate versions.
4. Public website supports brand, creative, and Super Creative intake.
5. Auth supports invite, login, password reset, and role routing.
6. Admin users can manage Business Cases end to end.
7. Brand users can review projects, approvals, documents, invoices, and messages.
8. Individual Creatives can manage briefs, deliverables, wallet, profile, and messages.
9. Super Creatives can manage teams, assignments, and payout splits.
10. Team members can be managed-only or invited with limited access.
11. PostgreSQL schema supports the core production model.
12. Backend authorization is enforced server-side.
13. Files are stored securely in Azure Blob Storage.
14. Secrets are stored in Azure Key Vault.
15. App is deployed to Azure with staging and production environments.
16. Monitoring and error reporting are configured.
17. Stage gates are enforced.
18. Audit logs record sensitive actions.
19. Paid and grant tracks work.
20. SDF behavior is clearly defined and implemented consistently.
21. Discovery/scraper agents support opportunities, grants, brand signals, market signals, individual creatives, Super Creatives, and creative organizations.
22. Discovery candidates require admin review before conversion.
23. Creative and Super Creative scraper results can convert into applications, sourced profiles, organizations, or outreach tasks.
24. Opportunity and grant scraper results can convert into Business Cases or brand leads.
25. Discovery scraping follows public-source, rate-limit, evidence, and review rules.
26. Admin users can create meetings from discovery candidates, CRM contacts, brands, Business Cases, creators, and Super Creatives.
27. Meeting Intelligence can generate agendas, suggested questions, summaries, missing-information checks, follow-up suggestions, and Alignment Snapshot drafts.
28. Raw meeting transcripts are internal-only by default and require explicit sharing controls.
29. Meeting provider integration, transcript upload, or manual meeting links are supported according to launch scope.
30. Tests cover critical workflows.
31. A production runbook exists.

---

## 19. Key Open Decisions

These decisions should be finalized before implementation starts:

1. Should production backend use Azure Container Apps or App Service for first launch?
2. Should authentication be custom JWT/cookie auth or Microsoft Entra External ID?
3. What is the final SDF timing rule?
4. Will TASCK collect payments directly at first, or only track offline payments?
5. Will Super Creative team members be paid through TASCK or by the Super Creative by default?
6. What contract signing method will be used first: manual mark-signed, uploaded signed documents, or e-signature provider?
7. Which AI provider will power generation features?
8. Should brand accounts be self-service after approval or fully admin-managed?
9. Should creator profile approval be required after every profile edit?
10. What are the minimum production privacy and data retention policies?
11. Which public sources are approved for discovery scraping at launch?
12. What rate limits should each discovery source use?
13. Should discovered creative candidates be contacted manually first or through automated approved outreach?
14. Which candidate types can convert directly into sourced profiles versus applications?
15. Which meeting provider should launch first: Google Meet, Microsoft Teams, Zoom, or manual links?
16. Will meeting transcription be automatic at launch or transcript-upload/manual-entry first?
17. What consent language should be used for recording and transcription?
18. What meeting summary fields can be shared with brands and creatives?
19. Should follow-up emails be sent from TASCK email, the assigned RM email, or a shared operations mailbox?

---

## 20. Recommended First Production Build Scope

If the team wants the smallest serious production release, build this first:

1. Public website.
2. Brand enquiry.
3. Creative application.
4. Super Creative application.
5. Admin invite/login.
6. Brand invite/login.
7. Creative invite/login.
8. Role-based portals.
9. Brands.
10. Creatives and Super Creatives.
11. Business Cases.
12. Connect, Frame, Plan, Deliver, Closure.
13. Alignment Snapshot.
14. Strategy Snapshot.
15. Brand approvals.
16. Creative briefs.
17. Deliverables.
18. Contracts with manual sign state.
19. Invoices with manual paid state.
20. Wallet/payment visibility.
21. Messages.
22. Tasks.
23. Final reports.
24. Audit logs.
25. Basic Intelligence Center.
26. Discovery sources.
27. Opportunity Scanner as manual/admin-assisted first version.
28. Creative Discovery as manual/admin-assisted first version.
29. Super Creative Discovery as manual/admin-assisted first version.
30. Discovery Candidate Review.
31. Candidate conversion into Business Cases, brand leads, creative applications, Super Creative applications, and creative organization records.
32. Admin Meetings page.
33. Meeting creation from discovery candidates and CRM contacts.
34. Manual meeting links or first approved meeting provider integration.
35. Transcript upload.
36. AI meeting summary.
37. Missing-information checklist.
38. Alignment Snapshot readiness check.
39. Follow-up meeting and email suggestion.

This gives TASCK a complete production operating system without overbuilding external integrations too early.

---

## 21. Final Architecture Statement

The production rebuild should be one platform, not three versions.

The best structure is:

```text
TASCK OS
|-- Public Website
|-- Auth And Onboarding
|-- Admin Control Centre
|   |-- Intelligence Center
|   |-- Discovery / Scraper Agents
|   |   |-- Opportunity Scanner
|   |   |-- Grant Discovery
|   |   |-- Brand Signal Discovery
|   |   |-- Creative Discovery
|   |   |-- Super Creative Discovery
|   |   |-- Cultural And Market Signals
|   |   `-- Discovery Candidate Review
|   |-- CRM
|   |-- Meetings
|   |   |-- Meeting Scheduling
|   |   |-- AI Agenda And Questions
|   |   |-- Transcripts And Summaries
|   |   |-- Missing Information Checks
|   |   `-- Alignment Snapshot Drafting
|   |-- Business Cases
|   |   |-- Connect
|   |   |-- Frame
|   |   |-- Plan
|   |   |-- Deliver
|   |   `-- Closure
|   |-- Creatives And Super Creatives
|   |-- Contracts
|   |-- Finance
|   |-- Reports
|   `-- Governance
|-- Brand Portal
|   |-- Projects
|   |-- Meetings
|   |-- Approvals
|   |-- Documents
|   |-- Invoices
|   `-- Messages
`-- Creative Partner Portal
    |-- Briefs
    |-- Projects
    |-- Meetings
    |-- Deliverables
    |-- Wallet
    |-- Profile
    |-- Messages
    `-- Team Management For Super Creatives
```

The production system should be powered by:

1. React frontend.
2. FastAPI backend.
3. PostgreSQL database.
4. Azure deployment.
5. Role-based access.
6. Business Case lifecycle.
7. Secure document and file handling.
8. Audit logs.
9. Paid and grant track support.
10. Creative and Super Creative network support.
11. Discovery/scraper agents for opportunities, grants, brands, creatives, Super Creatives, creative organizations, and cultural signals.
12. Human review and conversion before discovered candidates become production records.
13. Meeting Intelligence for scheduling, question preparation, transcript processing, missing-information checks, follow-up suggestions, and Alignment Snapshot drafting.

This structure gives TASCK the best path from demo concept to production-grade operating platform.

---

## 22. PDF Requirement Coverage Addendum

This addendum captures the specific workflow requirements from `Product_Requirement_Document (1).pdf` so the production V3 rebuild does not lose important details from the original TASCK workflow clarification.

## 22.1 TTA Context And Product Meaning

The PDF defines the current business stage as:

TTA - The TASCK Agency

TTA is the human-operated version of the TASCK system. Production TASCK OS should digitize and scale the manual campaign engine that TTA is currently running.

Core interpretation:

1. TTA is the human campaign engine.
2. TASCK OS is the software layer that captures, improves, and scales that operating model.
3. TASCK sells creator campaigns, not generic marketing campaigns.
4. Creators and Super Creatives are campaign architects, not only distribution channels.
5. Campaign performance data should improve future creator matching and campaign planning.

Production implication:

The software should not be designed as a generic CRM or task manager. It should be designed as a creator campaign engine with CRM, workflow, creative strategy, delivery, finance, and performance intelligence connected through Business Cases.

## 22.2 PDF Workflow Alignment

The PDF describes four main workflow stages:

Connect -> Frame -> Plan -> Deliver

The production blueprint extends this into:

Opportunity -> Business Case -> Connect -> Frame -> Plan -> Deliver -> Closure

This is not a contradiction. It is a production-level expansion:

1. Opportunity exists before a formal project is accepted.
2. Connect captures brand relationship and qualification.
3. Frame turns the relationship into a formal project and Unified Business Case.
4. Plan designs the campaign with the matched Super Creative.
5. Deliver executes the campaign.
6. Closure formalizes reporting, feedback, finance closeout, and learning.

Important nuance from the PDF:

The Unified Business Case formally begins in Frame. In production, the system may create a draft Business Case or opportunity shell earlier, but the "Unified Business Case" becomes the single source of truth once the brand relationship becomes a project in Frame.

## 22.3 Required Template Library From PDF

The PDF lists these templates as required:

1. CRM template.
2. SOP template.
3. Alignment Snapshot template.
4. Creative Brief template.
5. Creative Snapshot template.
6. Brainstorming template.
7. Branded Materials template.
8. Agreement template.
9. Reporting template.
10. Feedback template.

Production requirement:

Admin Control Centre must include centralized template management for all of the above.

Template management should support:

1. Versioning.
2. Active/inactive status.
3. Template type.
4. Last updated by.
5. Approval status.
6. Brand-facing or internal-only visibility.
7. Document generation from template.

## 22.4 Connect Stage Requirements From PDF

Connect has two intake routes:

1. Outreach - admin initiated.
2. Inreach - brand initiated.

### Outreach Requirements

Admin should be able to:

1. Create and maintain a target brand contact list inside CRM.
2. Scrape publicly available brand information to auto-populate CRM records.
3. Use an image interpreter to capture lead details from business cards and auto-populate relevant CRM fields.
4. Track decision-maker details per company.
5. Track organizational hierarchy per company.
6. Log all interaction history against brand records.
7. Log calls, emails, meetings, notes, and call transcripts.
8. Assign each contact a pipeline status.
9. Trigger automated follow-up reminders based on last contact date.
10. Flag inactive contacts beyond a configurable threshold.

Pipeline contact statuses:

1. Active.
2. Nurture.
3. Closed.

### Inreach Requirements

Brand-initiated enquiries should:

1. Be submitted through a public web form.
2. Support image interpreter/business-card capture where relevant.
3. Auto-populate CRM fields from submitted details.
4. Automatically assign the enquiry to a team member.
5. Track the enquiry inside the pipeline.

Production addition:

The blueprint's discovery/scraper system should cover public brand information scraping, while a separate `business_card_parser` or `image_interpreter_service` should support business-card capture.

Recommended backend modules:

1. `app/services/business_card_parser_service.py`
2. `app/services/contact_enrichment_service.py`
3. `app/workers/contact_enrichment_worker.py`

Recommended API endpoints:

1. `POST /api/crm/business-card/parse`
2. `POST /api/brands/{brand_id}/contacts/enrich`
3. `POST /api/brand-enquiries/{enquiry_id}/assign`
4. `POST /api/brand-contacts/{contact_id}/follow-up-draft`

## 22.5 Frame Stage Requirements From PDF

Frame is where the brand relationship becomes a project.

Requirements:

1. RM creates a project folder tied directly to the brand CRM record.
2. Project scope, goals, and initial details are captured through a structured intake form.
3. RM can input meeting notes that become the foundation of the Business Case.
4. Every subsequent email, note, call, and decision feeds back into the Business Case.
5. AI reads the full brand record, CRM data, notes, and communications.
6. AI generates an Alignment Snapshot using an approved TASCK template.
7. RM reviews and edits the AI-generated draft before committing it to the brand record.
8. Alignment Snapshot is pre-loaded into the Brand Portal.
9. Brand can confirm willingness to proceed.
10. Brand can book a clarification meeting directly through the portal.

## 22.6 Direct And Retainer Engagement Models

The PDF defines two brand engagement models:

1. Direct.
2. Retainer.

Production interpretation:

Direct and Retainer should be engagement models under the paid track. Paid and grant are high-level tracks. Direct and Retainer are commercial engagement models.

Recommended field:

`business_cases.engagement_model`

Allowed values:

1. direct.
2. retainer.
3. grant.
4. custom.

Direct behavior:

1. Brand confirmation moves the project immediately to Plan.
2. No payment or invoice is required at that point.

Retainer behavior:

1. Upon brand confirmation, the system auto-generates a Consultancy Fee invoice.
2. Project moves to Plan only when payment is confirmed.
3. If the brand does not confirm within a configured period, project is marked Nurture.
4. Nurture status should trigger a re-engagement workflow.

Recommended invoice type addition:

1. `consultancy_fee`

## 22.7 Plan Stage Requirements From PDF

Plan designs the campaign collaboratively with the Super Creative.

Requirements:

1. RM triggers the team brainstorm workspace.
2. Alignment Snapshot data is automatically imported into the campaign workspace.
3. RM can add context, brainstorm notes, and strategic direction.
4. RM filters Super Creatives by audience profile, location, content category, and past performance.
5. A Creator Brief is generated from the approved TASCK template.
6. The brief is pre-populated with relevant project data.
7. The brief is sent directly to the matched creator or Super Creative portal.
8. Creator/Super Creative reviews the brief.
9. Creator/Super Creative submits a structured response confirming interest, budget alignment, and availability.
10. RM reviews the response and formally approves the match.
11. AI generates a Creative Snapshot from the full data trail.
12. RM reviews and edits the Creative Snapshot before sharing it with the brand.
13. Creative Snapshot supports up to three versions.
14. Requests beyond three Creative Snapshot versions become scope changes.
15. Creative Snapshot is shared with the brand for formal sign-off.
16. Contracts are generated automatically from approved templates.
17. One contract is generated between TASCK and the brand.
18. Other contracts are generated between TASCK and the creators or Super Creative.
19. Budget and scope are locked when contracts are executed.
20. Post-contract scope changes trigger immediate RM alert.
21. Contracts are delivered to the creator portal.
22. WhatsApp notification is sent if a phone number is on record.
23. RM creates project budget, timeline, and milestone schedule.
24. Project invoice is issued to the brand.
25. Payment confirmation moves the project into Deliver.

Important creative principle:

Creative strategy is led by the Super Creative in response to brand KPIs and goals. TASCK facilitates clarity, structure, and execution governance. TASCK should not be modeled as the sole creative director.

Terminology alignment:

The PDF uses "Creative Snapshot." The existing V3 blueprint uses "Strategy Snapshot." Production should either:

1. Rename Strategy Snapshot to Creative Snapshot, or
2. Treat Creative Snapshot as the brand-facing strategy artifact and keep Strategy Snapshot as an internal alias.

Recommended production name:

Creative Snapshot

## 22.8 Creator And Super Creative Account Timing

The PDF says:

Creator accounts are created when there is a confirmed, matched project. Creators are not onboarded to the platform until there is a confirmed matched project.

Production interpretation:

Use two layers:

1. Network/application layer.
2. Portal access layer.

Creatives and Super Creatives can exist as applications, sourced profiles, or approved network records before a project. However, full portal login access should be issued when TASCK approves them for active work or when they are matched to a confirmed project.

Recommended statuses:

1. applicant.
2. sourced.
3. approved_network.
4. project_matched.
5. invited.
6. active.
7. suspended.

MVP rule from PDF:

There is no public opportunity board in MVP. Super Creatives are assigned to projects directly by Admin.

Production implication:

Do not build a public creator opportunity marketplace as the first production flow. Admin should match and assign Super Creatives.

## 22.9 Deliver Stage Requirements From PDF

Deliver executes the campaign and closes the project.

Requirements:

1. Project goes live for Brand and Creator/Super Creative with role-appropriate views.
2. Tasks are assigned and tracked for TASCK team members inside Admin Control Centre.
3. Creator uploads all deliverables directly through the portal.
4. Deliverables include milestone tagging.
5. RM reviews all deliverables before they become visible to the Brand.
6. Nothing is shared with the Brand without RM approval.
7. Brand confirmation of a deliverable triggers release of corresponding creator payment.
8. Brand receives automated progress update notifications at agreed intervals.
9. Any deviation from agreed scope triggers immediate alert.
10. Scope deviation pauses delivery until resolved.
11. AI generates final project report from all delivery data stored in Business Case.
12. Feedback forms are sent automatically to Brand and Creator upon closure.
13. Closure checklist must be completed in full before project is marked closed.
14. Partial closure checklist completion does not count.

Payment release rule:

Brand deliverable confirmation should be able to trigger a payment release workflow. For first production release this can be a manual finance action triggered by the system rather than automated payout rails.

## 22.10 Portal Requirements From PDF

### Brand Portal

Required:

1. Real-time project dashboard.
2. Current stage.
3. Active milestones.
4. Outstanding actions.
5. Next steps.
6. Version-controlled document vault.
7. Contracts.
8. Briefs.
9. Strategies/Creative Snapshots.
10. Reports.
11. Strategy sign-off workflow.
12. Deliverable confirmation workflow.
13. Scope change review workflow.
14. Invoice history.
15. Live payment status.
16. Post-project report delivery.
17. Feedback submission.

### Creator Portal

Required:

1. Profile.
2. Bio.
3. Content categories.
4. Audience size.
5. Platforms.
6. Rate card.
7. Portfolio.
8. Brief delivery.
9. WhatsApp notification when a number is available.
10. Deliverable submission.
11. Milestone tagging.
12. Project dashboard.
13. Milestone tracking.
14. Payment status.
15. Direct messaging with TASCK Admin team only.
16. No direct brand contact without Admin approval.
17. Wallet and payment tracking.
18. Payment details collected only at first payment, not during onboarding.

### Admin Control Centre

Required:

1. Full CRM across Connect, Frame, Plan, Deliver, and Closed.
2. User and role management across portal types.
3. Workflow configuration.
4. Custom reminder schedules.
5. Escalation triggers.
6. Re-engagement timelines.
7. System-wide reporting and analytics dashboard.
8. Template management for contracts, briefs, strategies, and reports.
9. Fee management.
10. Strategy fees.
11. Delivery fees.
12. Creator fees.
13. TASCK commission structures.

## 22.11 PDF MVP Scope To Preserve

PDF in-scope requirements:

1. CRM company and contact management.
2. Pipeline staging.
3. Interaction history.
4. Unified Business Case per brand/project.
5. AI-powered document generation.
6. Alignment Snapshot.
7. Creator Brief.
8. Creative Snapshot.
9. Final Report.
10. Creator profiles with minimal onboarding and essential fields.
11. Campaign workspace.
12. Brief delivery.
13. Creator collaboration.
14. Deliverable submission.
15. Milestone tracking.
16. Execution tracking.
17. Brand Portal project dashboard.
18. Brand document vault.
19. Brand approvals.
20. Brand invoicing.
21. Creator Portal brief delivery.
22. Creator deliverable submission.
23. Creator payment tracking.
24. Admin CRM.
25. Admin user management.
26. Admin templates.
27. Admin reporting.
28. Automated reminders and escalation workflows.
29. Contract generation from approved templates.
30. Basic reporting for campaign metrics and performance summaries.

PDF out-of-scope for MVP:

1. Public opportunity board for creators.
2. Fully automated AI-powered creator recommendations and automated matching.
3. Complex revenue sharing.
4. Multi-party payment automation.
5. Full creator marketplace with self-service profiles.

Production interpretation:

The production blueprint may include advanced V2 intelligence and discovery features, but first launch should still avoid a public creator opportunity board and fully automated matching. Matching can be AI-assisted and admin-approved.

## 22.12 PDF Success Metrics

Business goals and metrics from the PDF should be tracked in production analytics.

Operational efficiency:

1. Reduce project delivery time by 50% with AI-assisted workflows.
2. Decrease manual task dependency by 80% through automation.
3. Cut down admin workload.

Transparency and accountability:

1. 100% of projects have assigned roles and access controls.
2. Real-time status tracking for all active projects.
3. Reduce miscommunication issues by 30% through structured workflows.

AI and decision-making:

1. Increase project success rate with AI-driven planning recommendations trained on TASCK data.
2. Generate automated performance reports for all completed projects.

Contracts and negotiation:

1. 100% of contracts are processed digitally using approved templates or smart contract templates.
2. Reduce negotiation time.

Client and brand satisfaction:

1. Maintain 90%+ positive client feedback.
2. Reduce project revisions and delays.
3. Ensure 100% of projects align with predefined client objectives.

Scalability:

1. Maintain API compatibility for future integrations.
2. Reduce onboarding time for new users.
3. Support 2x project volume without performance issues.

## 22.13 PDF AI Strategy Requirements

### Connect AI

Required AI capabilities:

1. Lead scoring and prioritization.
2. Analyze company size, sector, prior interactions, message tone, and responsiveness pattern.
3. Show admins a ranked pipeline, not only a flat list.
4. Auto-route low-scoring leads to nurture sequence.
5. Draft personalized follow-up messages for admin review.
6. Enable one-click send after admin approval.
7. Enrich CRM contacts by cross-referencing public data.
8. Auto-populate missing fields such as industry, company size, social presence, and likely decision-maker title.

### Frame AI

Required AI capabilities:

1. Generate meeting summaries from notes or transcripts.
2. Generate Alignment Snapshot from brand goals, challenges, and implied KPIs.
3. Use approved TASCK templates.
4. Detect scope ambiguity.
5. Flag vague or contradictory inputs.
6. Prompt admin to clarify unclear scope before advancement.

### Plan AI

Required AI capabilities:

1. Rank Super Creatives by fit score.
2. Use target audience, geography, campaign objective, budget range, and content format requirements.
3. Use profile data, audience demographics, past performance metrics, and category alignment.
4. Generate Creative Brief from approved template.
5. Include brand background, campaign objective, audience profile, tone of voice, deliverable specifications, and key dates.
6. Suggest budget allocation across creator fees, production costs, logistics, and TTA management percentage.
7. Flag budget allocations outside healthy ranges.
8. Improve KPI clarity by turning vague KPIs into measurable alternatives.
9. Provide benchmarks based on similar past campaigns where data exists.
10. Generate contracts from templates.
11. Review contract drafts for missing clauses, ambiguous terms, scope-delivery mismatches, and payment milestone gaps.

### Deliver AI

Required AI capabilities:

1. Progress anomaly detection.
2. Monitor milestones against agreed timeline.
3. Alert responsible admin when deliverables are late.
4. Suggest revised timeline for brand communication.
5. Scope creep detection.
6. Compare current activity against signed contract scope.
7. Trigger scope review before additional work proceeds without budget approval.
8. Generate final reports from delivery data.
9. Include milestone completion rates, deliverables produced, KPI performance against target, creator performance summary, and timeline adherence.
10. Analyze brand and creative feedback sentiment.
11. Surface recurring themes in feedback.
12. Track creator performance analytics.
13. Track deliverable quality scores, on-time rates, brand satisfaction, and repeat engagement rates.

## 22.14 Additional Data Model Requirements From PDF

Add or confirm these production fields/tables:

1. `brands.organizational_hierarchy_json`
2. `brand_contacts.decision_maker_level`
3. `brand_contacts.pipeline_status`
4. `brand_contacts.last_contacted_at`
5. `brand_contacts.inactive_threshold_days`
6. `business_cases.engagement_model`
7. `business_cases.confirmation_due_at`
8. `business_cases.nurture_reason`
9. `documents.version_limit`
10. `documents.version_number`
11. `deliverables.brand_visible_at`
12. `deliverables.rm_approved_at`
13. `deliverables.brand_confirmed_at`
14. `deliverables.payment_release_triggered_at`
15. `workflow_configurations`
16. `escalation_rules`
17. `reengagement_workflows`
18. `progress_update_schedules`
19. `business_card_parse_jobs`
20. `lead_scores`
21. `ai_risk_flags`
22. `creator_performance_metrics`

## 22.15 PDF Coverage Conclusion

After this addendum, the production blueprint captures the PDF requirements in production form.

The main differences are intentional:

1. The PDF describes V1 MVP around Connect, Frame, Plan, and Deliver.
2. The production blueprint keeps that workflow but adds Opportunity and Closure for a fuller production lifecycle.
3. The PDF treats creator onboarding as project-triggered; the production blueprint supports applications and sourced profiles, while still allowing portal access to remain invite/project-triggered.
4. The PDF excludes public opportunity boards and fully automated matching from MVP; the production blueprint preserves that as a first-release rule while still planning admin-reviewed discovery and AI-assisted matching.
5. The PDF uses Creative Snapshot; the production blueprint should prefer that term or clearly map it to Strategy Snapshot.

## 23. Future Africa Materials Coverage Addendum

This addendum captures the important materials from `Future Africa-20260515T124533Z-3-001.zip` and maps them into the production V3 rebuild blueprint.

The zip contains:

1. Brand assets.
2. Brand letterhead templates.
3. CRM workbooks.
4. Business SOP.
5. Brainstorming outline.
6. Creative Brief template.
7. Alignment Snapshot template.
8. Creative Strategy Snapshot template.
9. Draft Fee Note.
10. Feedback template.
11. Project Report template.
12. Service Agreement template.
13. Service Level Agreement template.
14. Independent Creator Agreement template.
15. Grant Projects Independent Creator Agreement template.

Production requirement:

These materials should not sit outside the system as disconnected files. They should become managed templates, data models, workflow rules, contract types, and document-generation sources inside TASCK OS.

## 23.1 Brand Assets And Letterhead Templates

Materials:

1. `Brand Templates/Copy of Asset 1.png`
2. `Brand Templates/Copy of Asset 2.png`
3. `Brand Templates/Copy of TTA Template Letterhead (Main).docx`
4. `Brand Templates/Copy of TTA v2 (With Borders).docx`

Production requirements:

1. TASCK OS must support brand asset storage.
2. TASCK OS must support official letterhead templates for generated documents.
3. Document exports should be able to use approved letterhead.
4. Admin users should be able to mark one template as active/default.
5. Brand assets should be stored in Blob Storage and referenced by template records.
6. Generated PDFs/DOCX files should preserve approved TASCK branding.

Recommended template fields:

1. `template_brand_asset_id`
2. `letterhead_file_id`
3. `is_default`
4. `applies_to_document_types`
5. `approved_by_user_id`
6. `approved_at`

## 23.2 CRM Workbook Coverage

Materials:

1. `Copy of CRM Template_.xlsx`
2. `Copy of Copy of CRM Template_.xlsx`

The workbook contains three major CRM structures:

1. CRM - Partners.
2. Framing - Partners.
3. CRM - Super Creatives.
4. Super Creatives - Framing.

### CRM - Partners Requirements

Fields from source material:

1. Partner company or organisation.
2. Website.
3. Notes and next actions.
4. Contact.
5. Connect status.
6. Role.
7. Email address.
8. Telephone number.
9. LinkedIn.
10. Relationship manager.
11. Key marketing focus.
12. Primary target audience.
13. Key marketing channels.
14. Marketing KPIs.
15. Desired relationship status.
16. Likelihood to work with TTA.

Production requirements:

1. CRM must support multiple contacts under one partner.
2. CRM must support notes and next actions at both company and contact level.
3. CRM must support connect status values such as Active, Connecting, Pre-Meeting, Dormant, Nurture, and Closed.
4. CRM must support desired relationship status, including values like Know and Intimate.
5. CRM must support likelihood-to-work scoring.
6. CRM must support marketing focus, audience, channels, and KPIs before a Business Case exists.
7. CRM must support Relationship Manager ownership.
8. CRM must support nonprofit/grant partner profiles where target audience, marketing channels, and decision process may differ from commercial brands.

Recommended database additions:

1. `brands.key_marketing_focus`
2. `brands.primary_target_audience`
3. `brands.key_marketing_channels`
4. `brands.marketing_kpis`
5. `brands.desired_relationship_status`
6. `brands.likelihood_to_work_score`
7. `brand_contacts.connect_status`
8. `brand_contacts.linkedin_url`
9. `brand_contacts.notes_next_actions`

### Framing - Partners Requirements

Fields from source material:

1. Partner folder.
2. Partner lead.
3. Stage.
4. Notes and updates.
5. Project context.
6. Project goal.
7. Success factors.
8. Confirmed project framework.
9. TTA engagement fee.
10. Creator shortlist.
11. Indicative budget range.
12. Confirmed scope.
13. Business Case.
14. Agreements signed.
15. Project report.
16. Feedback.
17. Brand score.
18. Creative score.

Production requirements:

1. Business Case detail must include a framing data panel.
2. Business Case must support success factors and confirmed project framework.
3. Business Case must support creator shortlist before final selection.
4. Business Case must support brand score and creative score after feedback.
5. Business Case must track whether agreements, reports, and feedback are missing.
6. System must flag missing agreements, missing reports, and missing feedback as operational gaps.

Recommended database additions:

1. `business_cases.success_factors_json`
2. `business_cases.confirmed_project_framework`
3. `business_cases.tta_engagement_fee_amount`
4. `business_cases.creator_shortlist_json`
5. `business_cases.indicative_budget_range`
6. `business_cases.confirmed_scope`
7. `business_cases.brand_score`
8. `business_cases.creative_score`
9. `business_case_gap_flags`

### CRM - Super Creatives Requirements

Fields from source material:

1. Partner/company/organisation.
2. Current relationship status.
3. Desired relationship status.
4. Website.
5. Primary contact.
6. Role.
7. Email address.
8. Telephone number.
9. LinkedIn.
10. Relationship Manager.
11. Contact.
12. Key marketing focus.
13. Primary target audience.
14. Key marketing channels.
15. Decision-making process.
16. Current creative talent process.
17. Fee for engagement per month.

Production requirements:

1. Super Creatives need their own CRM fields, not only basic creator profiles.
2. System must track relationship warmth and desired relationship state.
3. Super Creative records must track monthly engagement fee where relevant.
4. System must support Super Creative strategic positioning, audience, channels, and decision process.
5. Super Creative records should support both individual creative leads and organizations/teams.

Recommended database additions:

1. `creative_organizations.current_relationship_status`
2. `creative_organizations.desired_relationship_status`
3. `creative_organizations.key_marketing_focus`
4. `creative_organizations.primary_target_audience`
5. `creative_organizations.key_marketing_channels`
6. `creative_organizations.decision_making_process`
7. `creative_organizations.current_creative_talent_process`
8. `creative_organizations.monthly_engagement_fee`

### Super Creatives - Framing Requirements

Fields from source material:

1. Folder.
2. Project name.
3. Stage.
4. Notes and updates.
5. Project goals.
6. Success story.
7. Creatives story.
8. Projects story.
9. Audience segments.
10. Partnership profiles.
11. Unique narrative.
12. Branding.
13. Risk mitigation.
14. Marketing channels.
15. Content plan.
16. Media plan.
17. Social plan.
18. Planning timeline.
19. Project delivery timeline.
20. Budget lines.
21. Estimated budget.
22. Agreement.

Production requirements:

1. Super Creative project/framing workspace must support narrative and positioning fields.
2. System must support audience segmentation across multiple audience fields.
3. System must support content, media, and social plans.
4. System must support budget lines and estimated budget.
5. System must support risk mitigation notes.
6. Super Creative framing records should feed Business Case planning, Creative Snapshot, and campaign execution roadmap.

## 23.3 Business SOP Coverage

Material:

`Copy of TTA Business SOP.docx`

The SOP defines:

Connect -> Frame -> Plan -> Deliver

The production blueprint already supports this through:

Opportunity -> Business Case -> Connect -> Frame -> Plan -> Deliver -> Closure

Additional SOP rules to preserve:

1. Outreach begins with a curated brand list and decision-maker research.
2. Inreach begins with a brand or individual inquiry and detail collection.
3. If a possible transaction exists, move to Framing.
4. If no immediate transaction exists, mark the record as Nurture.
5. Some transactions may move straight from Connect or Frame to Delivery where no strategy layer is needed.
6. Direct-to-delivery transactions skip the strategy fee layer and are billed directly for delivery.
7. TTA should not pitch projects or creators before listening and understanding the brand need.
8. In unpaid Frame, TTA shares only an alignment snapshot/proposal, not detailed strategy.
9. Process halts if the brand does not consent to the payment layer where required.
10. Paid Plan begins only after strategy invoice/payment is confirmed.
11. Focus groups may be used when needed before or during planning.
12. Direct costs such as logistics and communication must be captured in the brand-approved budget.
13. Delivery fees are separate from strategy fees.
14. TTA may earn fees directly from creatives they bring into brand projects, but this fee model needs business-rule confirmation.
15. All costs must be captured in the approved budget.
16. Scope changes without budget review or outside signed contracts must pause or escalate delivery.

Production workflow addition:

Support an accelerated path:

Connect -> Frame -> Deliver

or:

Connect -> Deliver

Use this only when:

1. No strategy layer is needed.
2. TTA is engaged as a direct service provider.
3. Quote, contract, and payment are confirmed.
4. Admin records why Plan was skipped.

Recommended field:

`business_cases.workflow_path`

Allowed values:

1. standard_strategy
2. direct_delivery
3. grant_strategy
4. grant_delivery
5. custom

Recommended skip-record fields:

1. `stage_skip_reason`
2. `strategy_layer_required`
3. `direct_delivery_quote_id`
4. `approved_skip_by_user_id`

## 23.4 Efficiency Rules From SOP

The SOP defines non-negotiable efficiency rules for 2026:

1. No creator onboarding without demand.
2. Creators enter only when a brand opportunity exists.
3. No bespoke work before validation.
4. No decks, assets, or brainstorming until the problem is clear and interest is confirmed.
5. One core system: CRM -> Alignment Snapshot -> Creative Strategy -> Creative Brief -> Business Case -> Agreements -> Report.
6. No parallel documents floating around.
7. TTA owns process, not personality.
8. Creatives lead creatively.
9. TTA leads structurally.

Production requirements:

1. Admin workflow should prevent unnecessary creator onboarding.
2. Creative and Super Creative invitations should be tied to approved network intake or active demand.
3. System should warn before brainstorm/deck creation if problem clarity and interest confirmation are missing.
4. All documents must attach to CRM, Business Case, or Creative Organization records.
5. System should discourage unmanaged documents by requiring file classification and entity links.

## 23.5 Creative Alignment Brief Coverage

Materials:

1. `Copy of Creative Brief Template.docx`
2. `Copy of Copy of Creative Brief Template.docx`

The template is an early creator-facing brief for fee confirmation, not a final booking.

Required sections:

1. Project reference.
2. Brand/organisation.
3. Project working title.
4. TTA project lead.
5. Date shared with creator.
6. High-level context.
7. Brand objective summary.
8. Why the project is happening now.
9. Role of the creative.
10. Expected scope as signal only.
11. Indicative timeline.
12. Working assumptions.
13. Fee indication request.
14. Availability and conditions.
15. Confirmation that this is planning/pricing alignment only.
16. Confirmation that this is not a confirmed booking.
17. Confirmation that the creative is open to proceeding subject to final scope and budget approval.

Creative role options:

1. Public-facing lead.
2. Conceptual lead.
3. Talent and cultural translator.
4. Executional partner.

Expected scope options:

1. Content creation.
2. Appearances/representation.
3. Concept contribution.
4. Performance/activation involvement.
5. Other.

Fee basis options:

1. Project-based.
2. Time-based.
3. Retainer-style.

Availability options:

1. Yes.
2. Conditional.
3. No.

Production requirement:

The system must distinguish between:

1. Creative Alignment Brief for fee confirmation.
2. Final Creative Brief after brand approval and scope lock.

Recommended document types:

1. `creative_alignment_brief`
2. `creative_brief_final`

## 23.6 Draft Fee Note Coverage

Materials:

1. `Copy of Draft Fee Note.docx`
2. `Copy of Copy of Draft Fee Note.docx`

The fee note explains the strategy/preparation engagement fee before full project delivery.

Covered work:

1. Brainstorm delivery approaches.
2. Select creators that match target audience.
3. Confirm creators' interest.
4. Confirm creators' availability.
5. Confirm creators' budget.
6. Develop and share Creative Strategy Document.
7. Coordinate approval of creators, scope, and budget.
8. Facilitate contract execution if alignment is reached.
9. Prepare documentation for agreed campaign scope.

Important rule:

The engagement fee covers planning and strategy only. Full agency fees for project delivery are agreed separately through a formal agency agreement.

Production requirements:

1. System must support generating Fee Notes from template.
2. Fee Notes must link to strategy/preparation phase.
3. Fee Notes must clarify that delivery agency fees are separate.
4. Fee Notes can include term/duration fields.
5. Fee Note approval/payment can unlock paid planning where configured.

Recommended document type:

`fee_note`

Recommended invoice type:

`strategy_engagement_fee`

## 23.7 Brainstorming Outline Coverage

Material:

`Copy of Updated Brainstorming Outline.docx`

The material defines the TTA Snapshot Brainstorm System.

Session duration:

60 to 90 minutes.

Purpose:

Produce a defensible creator recommendation rooted in behavior, culture, and commercial logic.

Mandatory pre-work:

1. Client brief summary.
2. Objective.
3. Target audience.
4. Constraints such as budget and timeline.
5. Initial hypothesis.
6. Research inputs.
7. Past campaigns.
8. Market context.
9. Focus group insights where available.

Brainstorm phases:

1. Phase 0: Focus group integration.
2. Phase 1: Define the problem.
3. Phase 2: Define creator archetype.
4. Phase 3: Creator identification and scoring.
5. Phase 4: Interpretation logic.
6. Phase 5: Execution reality check.
7. Phase 6: Commercial snapshot.
8. Phase 7: Final recommendation.

Focus groups should be used only when:

1. Problem is unclear.
2. Audience behavior is ambiguous.
3. Product is new or misunderstood.

Mandatory Phase 1 output:

Project Truth, maximum three lines.

Creator archetype dimensions:

1. Voice type.
2. Audience relationship.
3. Format strength.
4. Working dynamics.

Voice type examples:

1. Authority/expert.
2. Peer/relatable entertainer.
3. Cultural driver.
4. Niche specialist.

Audience relationship types:

1. Trust-driven.
2. Reach-driven.
3. Conversion-driven.
4. Community-driven.

Disqualification rule:

Any creator scoring below 3 in Conversion Behaviour is eliminated.

Production requirements:

1. Brainstorm workspace must support pre-work checklist.
2. Brainstorm workspace must support Phase 0 to Phase 7 outputs.
3. System must store Project Truth.
4. System must store creator archetype statement.
5. System must store creator scores from 1 to 5.
6. Conversion Behaviour below 3 must auto-eliminate a creator from recommendation output.
7. System must store evidence-backed justification.
8. System must output top 2 to 3 creators.
9. System must store interpretation summary per creator.
10. System must store execution snapshot.
11. System must store commercial positioning statement.
12. Brainstorm outputs should map directly into Creative Strategy Snapshot sections.

Recommended database additions:

1. `brainstorm_rounds.prework_json`
2. `brainstorm_rounds.project_truth`
3. `brainstorm_rounds.creator_archetype_json`
4. `brainstorm_rounds.focus_group_used`
5. `brainstorm_rounds.focus_group_notes`
6. `creator_matches.conversion_behavior_score`
7. `creator_matches.auto_eliminated`
8. `creator_matches.evidence_json`
9. `creator_matches.execution_snapshot_json`
10. `creator_matches.commercial_snapshot_json`

## 23.8 Project Alignment Snapshot Template Coverage

Material:

`Copy of Updated Project Alignment Snapshot - Pre Paid Layer.docx`

The template is a pre-strategy document and insight/alignment outline.

Required sections:

1. Purpose of this note.
2. Business context.
3. User and market landscape.
4. Strategic entry point.
5. Strategic direction.
6. Non-binding creator approach.
7. Expected outcomes.
8. Commercial context.
9. Why focus matters.
10. Engagement model.
11. Next steps.

Important rule:

This document guides thinking, not execution. Suggested creator profile is non-binding and should not be treated as final selection.

Production requirements:

1. Alignment Snapshot must clearly be pre-strategy.
2. It must not expose full delivery strategy before the paid layer where payment is required.
3. It should support audience segmentation of two to four segments.
4. It should capture target segment and moment of influence.
5. It should capture creator-led, ambassador-led, or community-led directional approach.
6. It should include directional commercial context without exact final budgets if not approved.
7. It should feed paid strategy engagement next steps.

## 23.9 Creative Strategy Snapshot Template Coverage

Material:

`Copy of Updated Creative Strategy Template_.docx`

Required sections:

1. Executive Snapshot.
2. Business objective.
3. Strategic approach.
4. Target audience.
5. Budget range.
6. Core KPIs.
7. Why this strategy will work.
8. Strategic foundation.
9. Problem.
10. Opportunity.
11. Strategic insight.
12. Strategic solution.
13. Growth plan.
14. Core growth engine.
15. Growth phases.
16. Funnel assumptions.
17. Creator strategy.
18. Creator selection criteria.
19. Recommended structure.
20. Execution roadmap.
21. Commercial overview.
22. Budget summary.
23. Unit economics.
24. Tracking plan.
25. Risks and mitigation.
26. Next steps.

Strategic approach options:

1. Ambassador-led.
2. Creator-led.
3. Community-driven.
4. Merchant-first.
5. Hybrid.

Tracking options:

1. Creator tracking links.
2. Referral systems.
3. Platform analytics.
4. Transaction tracking.

Production requirements:

1. Creative Strategy Snapshot must support structured sections.
2. It must support funnel metrics and unit economics.
3. It must support tracking plan fields.
4. It must support risks and mitigation.
5. It must support execution phases with owners and deliverables.
6. It must support budget categories such as ambassador, supporting creators, production, and operations.

## 23.10 Feedback Template Coverage

Material:

`Copy of Feedback Template.docx`

Brand feedback ratings:

1. Understanding of objective.
2. Quality of coordination and communication.
3. Representation of the creative.
4. Delivery against expectations.
5. Overall experience.

Creative feedback ratings:

1. Clarity of engagement.
2. Quality of representation.
3. Coordination and support.
4. Professionalism of process across contracts, communication, and payment.
5. Overall experience.

Rules:

1. Brand feedback should be shared within 48 hours of project completion.
2. Creative feedback should be shared after final delivery and payment confirmation.
3. Average score below 7 triggers internal review of the entire transaction.
4. Repeated low scores on the same question indicate process issue.
5. Scores must be logged to CRM against project and partner.
6. No follow-up meeting is required unless score is below 6.

Production requirements:

1. Feedback forms must support separate brand and creative question sets.
2. Feedback must store 1 to 10 ratings.
3. Feedback must calculate average score.
4. Feedback below threshold must create review task or alert.
5. Feedback trends must feed creator, brand, and process analytics.

Recommended database additions:

1. `feedback.average_score`
2. `feedback.requires_internal_review`
3. `feedback.follow_up_required`
4. `feedback.process_issue_category`

## 23.11 Project Report Template Coverage

Material:

`Copy of Project Report Template.docx`

Required report sections:

1. Introduction.
2. Analysis and insights.
3. What worked well.
4. What did not work well.
5. Key performance indicators.
6. Issues, challenges, and lessons learned.
7. Financial summary.
8. Conclusion.
9. Campaign name.
10. Timeline.
11. Report date.
12. Expected outcome.
13. Actual outcome.

Production requirements:

1. Final report generator must support all report sections.
2. Expected versus actual outcomes must be structured.
3. Financial summary must pull from invoices, payments, and approved budgets.
4. Lessons learned must feed analytics and future planning.

## 23.12 Legal Template Coverage

Materials:

1. `Legal Templates/Copy of Service Agreement_ Template.docx`
2. `Legal Templates/Copy of SERVICE LEVEL AGREEMENT_ Template.docx`
3. `Legal Templates/Copy of Independent Creator Agreement. Template.docx`
4. `Legal Templates/Copy of Grant Projects_ Independent Creator Agreement.docx`

Production contract types:

1. Service Agreement.
2. Service Level Agreement.
3. Independent Creator Agreement.
4. Grant Project Independent Creator Agreement.
5. Brand Agency Agreement.
6. Vendor/Service Provider Agreement.

Contract requirements from materials:

1. TASCK/TTA can act as a non-exclusive creator and campaign agency.
2. TASCK supports campaign strategy, creative planning, creator sourcing, negotiation, coordination, execution support, and reporting.
3. Client is responsible for third-party costs such as creator fees, production, media spend, and vendors.
4. TASCK does not pre-finance campaign costs unless explicitly agreed.
5. Creators are independent contractors.
6. Creator outcomes such as reach or engagement are not guaranteed.
7. Usage rights must be governed by creator agreements.
8. Brand receives usage rights after payments are completed, according to agreed scope and duration.
9. Confidentiality obligations apply.
10. Nigerian law governs agreements where applicable.
11. Disputes are resolved by arbitration in Lagos/Nigeria as stated in templates.
12. TTA agency fee may be 10% of total campaign/project budget where applicable.
13. Some agreements use a 60% upfront / 40% milestone payment structure.
14. Agency fees may be payable within 7 days of invoice issuance.
15. Late payments may attract 2% monthly interest where contractually agreed.
16. TTA may suspend services when required payments are not received.
17. Budget insufficiency must trigger written notice and budget adjustment conversation.
18. Non-circumvention clause must protect introduced creators.
19. Breach of non-circumvention may trigger full commission and liquidated damages equal to 10% of creator contract value where agreed.
20. Cancellation fees may be 0%, 50%, or 100% depending on project stage and incurred costs.
21. Client remains liable for non-cancellable third-party costs, creator fees, media bookings, production expenses, and work performed.
22. Force majeure and termination clauses must be represented.
23. Independent creator agreements must preserve creator leadership and execution responsibility.
24. TTA provides administrative infrastructure, operational resources, and reporting tools.
25. Independent creators submit invoices, expense documentation, updates, and reports through TTA systems.
26. Creator agreement must support narrative and financial report obligations.
27. Service provider agreements must support event details, fixed fee, payment schedule, logistics, welfare, meeting attendance, cancellation, and work-for-hire or IP treatment where applicable.

Production requirements:

1. Contract templates must support clause libraries.
2. Contract templates must support schedules.
3. Contract records must support payment schedule terms.
4. Contract records must support usage rights fields.
5. Contract records must support non-circumvention terms.
6. Contract records must support cancellation fee schedule.
7. Contract records must support late payment terms.
8. Contract records must support dispute resolution jurisdiction.
9. Contract records must support comments/review notes.
10. Contract templates must support "needs business-rule confirmation" flags where template comments show uncertainty.

Recommended database additions:

1. `contract_templates`
2. `contract_template_versions`
3. `contract_clauses`
4. `contract_schedules`
5. `contract_review_notes`
6. `contract_business_rule_flags`
7. `contracts.usage_rights_json`
8. `contracts.payment_schedule_json`
9. `contracts.cancellation_terms_json`
10. `contracts.non_circumvention_terms_json`
11. `contracts.dispute_resolution_terms_json`

## 23.13 Grant Agreement Coverage

Material:

`Legal Templates/Copy of Grant Projects_ Independent Creator Agreement.docx`

Even where extracted text is limited, the file name and surrounding materials establish a separate grant-project agreement type.

Production requirements:

1. Grant projects must use grant-specific agreement templates.
2. Grant agreements must support funder rules that may not allow agency fees.
3. Grant agreements must support personnel-cost handling where direct agency fees are restricted.
4. Grant agreements must support impact reporting and funder compliance.
5. Grant agreements must distinguish funder, TASCK/TTA, Super Creative, and supporting creative obligations.

## 23.14 Source Material Gap Handling

The CRM examples show past gaps:

1. Missing creator agreements.
2. Missing feedback follow-through.
3. Non-standard Business Cases.
4. Missing framing pages.
5. Creative Snapshot or Alignment Snapshot sometimes skipped because the process felt cumbersome.

Production requirements:

1. System must flag missing required artifacts.
2. Admin must be able to mark an artifact as intentionally waived or not applicable.
3. Waived artifacts require reason and approver.
4. Business Case should show process-completeness score.
5. Reports should show gaps by project, brand, creator, and RM.

Recommended table:

`business_case_artifact_requirements`

Fields:

1. `id`
2. `business_case_id`
3. `artifact_type`
4. `required`
5. `status`
6. `waived_by_user_id`
7. `waiver_reason`
8. `created_at`
9. `updated_at`

## 23.15 Future Africa Materials Coverage Conclusion

After this addendum, the production blueprint captures the important requirements from the zip materials:

1. Brand assets and letterhead templates.
2. CRM fields and relationship statuses.
3. Super Creative CRM/framing structures.
4. SOP stage rules and direct-to-delivery exceptions.
5. Efficiency rules.
6. Creative Alignment Brief for fee confirmation.
7. Fee Note and strategy engagement fee logic.
8. Brainstorming system and creator scoring.
9. Alignment Snapshot pre-paid layer.
10. Creative Strategy Snapshot structure.
11. Feedback scoring and review thresholds.
12. Project Report structure.
13. Legal template contract types and key clauses.
14. Grant agreement support.
15. Artifact gap tracking and waiver handling.

## 24. Azure Reference Links

Official Azure documentation references:

1. Azure Static Web Apps: https://learn.microsoft.com/en-us/azure/static-web-apps/
2. Azure App Service: https://learn.microsoft.com/en-us/azure/app-service/
3. Azure Container Apps: https://learn.microsoft.com/en-us/azure/container-apps/
4. Azure Database for PostgreSQL Flexible Server: https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/
5. Azure Blob Storage: https://learn.microsoft.com/en-us/azure/storage/blobs/
6. Azure Key Vault: https://learn.microsoft.com/en-us/azure/key-vault/
7. Azure Service Bus: https://learn.microsoft.com/en-us/azure/service-bus-messaging/
8. Azure Monitor Application Insights: https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview
9. Azure Communication Services Email: https://learn.microsoft.com/en-us/azure/communication-services/concepts/email/email-overview
