# TASCK OS V3 Product Requirements Document

Version: v3.0  
Document status: Product requirements baseline  
Date: June 2, 2026  
Primary owner: TASCK Product and Operations  
Primary audience: Engineering, design, operations, client success, finance, leadership  
System surface: TASCK OS web application, v3 portals, v3 backend API, v3 seeded demo environment

---

## 1. Executive Summary

TASCK OS V3 is the operating system for running creator-led brand and grant campaigns from first signal through final closeout. V3 turns the TASCK workflow into a structured, auditable, multi-portal product built around one core primitive: the Business Case.

A Business Case represents the full commercial or grant opportunity. It contains the brand, creator, relationship manager, engagement track, qualification history, strategy artifacts, approvals, contracts, invoices, deliverables, scope changes, final reports, and feedback. The Business Case progresses through five stages:

1. Connect
2. Frame
3. Plan
4. Deliver
5. Closure

The product supports three primary portal experiences:

1. Admin Control Centre: TASCK internal command centre for pipeline, CRM, Business Cases, creators, contracts, documents, reports, tasks, users, fees, wallet, and settings.
2. Brand Portal: a curated client-facing workspace for projects, approvals, documents, invoices, messages, settings, and password management.
3. Creator Portal: a creator-facing workspace for briefs, projects, deliverables, wallet, profile, messages, and settings.

V3 is not only a visual iteration. It is a workflow model that formalizes TASCK's delivery methodology and makes the operating process legible to internal staff, brands, creators, grant funders, and future automation layers.

---

## 2. Product Context

### 2.1 Relationship To V1

V1 established the first working product foundation: a portal shell, campaign/project records, basic admin visibility, client-facing concepts, and the first pass at TASCK as a digital operating layer. V1's main value was proving that TASCK work could be represented as productized workflows instead of scattered documents, chats, spreadsheets, and manual status updates.

### 2.2 Relationship To V2

V2 expanded the product into a more mature internal operating system. It introduced richer dashboards, more refined visual direction, improved admin flows, stronger project management patterns, better campaign artifact handling, and clearer separation between system areas. V2 made the system feel closer to a usable business operations product.

### 2.3 V3 Step Change

V3 introduces the Business Case as the end-to-end unit of work. Instead of managing disconnected leads, projects, invoices, creators, and documents, TASCK runs a single lifecycle:

Connect -> Frame -> Plan -> Deliver -> Closure

The system now captures stage gates, stage-specific artifacts, AI-assisted strategy generation, brand approvals, creator selection, contract readiness, fee tracking, deliverable status, scope-change management, final reporting, and closeout feedback in one operational model.

The most important product shift is that V3 treats strategy, approvals, commercial terms, and delivery as one continuous workflow rather than separate modules.

---

## 3. Vision

TASCK OS V3 should become the trusted command layer for creator-led work across Africa and global brand partnerships. It should let TASCK:

1. Identify brand, grant, and cultural opportunities early.
2. Convert qualified opportunities into structured Business Cases.
3. Move each Business Case through a repeatable lifecycle.
4. Use AI-assisted workflows to accelerate research, alignment, strategy, creator matching, and reporting.
5. Give brands a calm, curated view of only what they need to approve, review, pay, or discuss.
6. Give creators a professional, low-friction workspace for briefs, deliverables, payments, and communication.
7. Maintain a complete audit trail from first conversation to final report.
8. Support both paid strategy engagements and grant-funded creator work.

V3 should feel like an operating system, not a collection of forms. It should reduce ambiguity, expose next actions, and help every stakeholder know what stage the work is in, what is blocked, who owns the next step, and what artifact is needed next.

---

## 4. Product Principles

### 4.1 Business Case First

Every meaningful opportunity should eventually become a Business Case. The Business Case is the canonical record for project stage, stakeholders, work history, artifacts, approvals, financial state, and final outcome.

### 4.2 Stage-Gated Work

Work should not casually jump forward. Each stage has explicit gates. The product should make those gates visible and enforceable:

1. Connect must qualify the opportunity.
2. Frame must resolve alignment and scope risk.
3. Plan must produce strategy, creator agreement, and signed contracts.
4. Deliver must track milestones, approvals, scope creep, and completion.
5. Closure must produce reporting, learning, and feedback.

### 4.3 Human-Led, AI-Assisted

AI assists TASCK operators with alignment snapshots, creator matching, transcript ingestion, strategy artifacts, opportunity scanning, and final reports. AI output must remain reviewable, editable, attributable, and subject to human approval.

### 4.4 Client Calm

The brand-facing portal should be narrower and calmer than the admin portal. Brands should see what they need: project state, pending approvals, documents, invoices, messages, and account settings. They should not see internal scoring, operational noise, raw brainstorms, or creator elimination details unless explicitly shared.

### 4.5 Creator Respect

The creator portal should treat creators as professional partners. Briefs should be clear, deliverable expectations should be visible, wallet/payment state should be understandable, and communication should feel organized rather than extractive.

### 4.6 Grant Compatibility

Grant-funded work is a first-class path, not an exception. V3 must handle grant funder goals, waived Strategy Development Fees, creator direct payment by funders where applicable, mission alignment, and final reports suitable for funder review.

### 4.7 Demo Resilience

V3 includes a seeded demo environment and frontend fallback behavior. When the backend is unavailable, key screens should still demonstrate the product narrative using local demo data. This supports stakeholder walkthroughs, product sales, and investor demos without requiring perfect infrastructure availability.

---

## 5. Goals

### 5.1 Business Goals

1. Increase TASCK's ability to convert brand and grant opportunities into structured paid work.
2. Reduce internal coordination overhead across sales, strategy, creator management, legal, finance, and delivery.
3. Improve client trust by making approvals, documents, invoices, and project state visible.
4. Increase creator professionalism and retention through clearer briefs, deliverables, and payment tracking.
5. Support grant partnerships as a repeatable revenue and impact track.
6. Create an audit-ready system of record for commercial and creative operations.
7. Enable TASCK to scale without every project depending on founder memory or manual documents.

### 5.2 Product Goals

1. Provide a complete v3 role selector and portal structure.
2. Implement Admin Control Centre navigation and primary modules.
3. Implement Business Case lifecycle list and detail workflows.
4. Implement public brand enquiry intake.
5. Implement brand login and authenticated brand portal experience.
6. Implement brand approvals with section comments and approval actions.
7. Implement creator workspace for briefs, projects, deliverables, wallet, profile, messages, and settings.
8. Implement v3 backend routes for core Business Case operations.
9. Seed representative demo data for paid and grant workflows.
10. Provide fallback frontend demo behavior when backend calls fail.

### 5.3 Operational Goals

1. Make every active opportunity stage-visible.
2. Make next action visible for each Business Case.
3. Make blockers visible across scope, fee, contracts, approvals, and delivery.
4. Give relationship managers a clear place to log interactions.
5. Give strategy teams reusable artifacts for alignment and strategy.
6. Give finance clear visibility into invoices, SDF status, and payouts.
7. Give leadership reporting visibility across pipeline, revenue, grants, creators, and delivery health.

---

## 6. Non-Goals For V3

V3 should not attempt to solve every possible future workflow. The following are explicitly out of scope for the v3 baseline:

1. Fully automated legal execution with external e-signature providers.
2. Live WhatsApp, Instagram DM, LinkedIn, or Gmail ingestion as production integrations.
3. Production-grade bank payout rails.
4. Full multi-currency accounting reconciliation.
5. Advanced marketplace bidding between brands and creators.
6. Fully autonomous AI campaign planning without human review.
7. Self-service creator onboarding at public scale.
8. Deep permission matrices for every field and action.
9. Enterprise SSO.
10. Complex multi-brand holding company account hierarchies.
11. Native mobile applications.
12. Real-time collaborative document editing.
13. Full grant compliance reporting across all funder formats.

These items may become V4 or later roadmap candidates.

---

## 7. Users And Personas

### 7.1 TASCK Admin

The TASCK Admin is an internal operator with broad access to the system. This user may be a founder, operating lead, strategy lead, or senior relationship manager.

Core needs:

1. See the entire business pipeline.
2. Understand stage distribution and revenue exposure.
3. Create and manage Business Cases.
4. Review AI-generated strategy artifacts.
5. Move work through lifecycle gates.
6. Manage brands, creators, contracts, templates, reports, fees, and users.
7. Identify bottlenecks before client or creator trust is damaged.

Primary portal:

Admin Control Centre

### 7.2 Relationship Manager

The Relationship Manager owns day-to-day client and opportunity motion.

Core needs:

1. Log conversations and interactions.
2. Qualify opportunities.
3. Move qualified opportunities from Connect to Frame.
4. Keep brands informed without oversharing internal process.
5. Coordinate approvals and responses.
6. Know which projects need follow-up today.

Primary portal:

Admin Control Centre

### 7.3 Strategy Lead

The Strategy Lead owns alignment, campaign thinking, creator fit, positioning, and strategic artifacts.

Core needs:

1. Generate or draft Alignment Snapshots.
2. Resolve scope flags and strategic risks.
3. Run creator brainstorms.
4. Create briefs and Strategy Snapshots.
5. Prepare brand-facing documents for approval.
6. Translate creator responses into campaign plans.

Primary portal:

Admin Control Centre

### 7.4 Brand Client

The Brand Client is a company stakeholder reviewing TASCK work.

Core needs:

1. See projects associated with their brand.
2. Review project state and next steps.
3. Approve alignment and strategy documents.
4. Leave comments on specific document sections.
5. Access documents and invoices.
6. Message TASCK.
7. Manage password and profile settings.

Primary portal:

Brand Portal

### 7.5 Creator

The Creator is a talent partner who receives briefs, contributes strategy responses, submits deliverables, and tracks payment.

Core needs:

1. See brief inbox.
2. Understand brand, campaign, deliverable, and timeline expectations.
3. Respond to briefs.
4. Track active projects.
5. Upload or manage deliverables.
6. See wallet and payment status.
7. Maintain profile information.
8. Message TASCK.

Primary portal:

Creator Portal

### 7.6 Grant Funder

The Grant Funder is not yet a full separate portal persona in V3, but grant behavior is supported through the Business Case track.

Core needs:

1. Support mission-aligned creative work.
2. Understand why a creator/project fits the grant.
3. Avoid standard brand SDF mechanics where grant structure waives them.
4. Receive final reporting and evidence of outcomes.

Primary portal:

Admin-managed grant Business Case, with future funder portal opportunity.

---

## 8. Information Architecture

### 8.1 V3 Entry Point

Route:

`/v3`

The V3 role selector presents the user with three portal choices:

1. Admin Control Centre
2. Brand Portal
3. Creator Portal

It also includes public brand enquiry access through:

`/v3/enquiry`

Acceptance criteria:

1. User can enter the Admin portal from the role selector.
2. User can enter Brand login from the role selector.
3. User can enter Creator portal from the role selector.
4. User can access the public brand enquiry form.
5. Role cards describe the correct workflow focus for each portal.
6. Navigation preserves the v3 context and does not collide with v1 or v2 routes.

### 8.2 Admin Routes

Admin routes are nested under:

`/v3/admin`

Required routes:

1. `/v3/admin`
2. `/v3/admin/business-cases`
3. `/v3/admin/business-cases/:id`
4. `/v3/admin/pipeline`
5. `/v3/admin/projects`
6. `/v3/admin/projects/:id`
7. `/v3/admin/projects/:id/brainstorm`
8. `/v3/admin/projects/:id/feedback`
9. `/v3/admin/projects/:id/scope-changes`
10. `/v3/admin/projects/:id/contract`
11. `/v3/admin/crm`
12. `/v3/admin/crm/opportunities`
13. `/v3/admin/crm/:id`
14. `/v3/admin/creators`
15. `/v3/admin/creators/:id`
16. `/v3/admin/contracts`
17. `/v3/admin/templates`
18. `/v3/admin/insights`
19. `/v3/admin/reports`
20. `/v3/admin/wallet`
21. `/v3/admin/fees`
22. `/v3/admin/tasks`
23. `/v3/admin/users`
24. `/v3/admin/settings`

### 8.3 Brand Routes

Brand routes are nested under:

`/v3/brand`

Required routes:

1. `/v3/brand/login`
2. `/v3/brand`
3. `/v3/brand/projects`
4. `/v3/brand/projects/:id`
5. `/v3/brand/approvals`
6. `/v3/brand/documents`
7. `/v3/brand/invoices`
8. `/v3/brand/messages`
9. `/v3/brand/settings`
10. `/v3/brand/change-password`

### 8.4 Creator Routes

Creator routes are nested under:

`/v3/creator`

Required routes:

1. `/v3/creator`
2. `/v3/creator/briefs`
3. `/v3/creator/briefs/:id`
4. `/v3/creator/projects`
5. `/v3/creator/deliverables`
6. `/v3/creator/wallet`
7. `/v3/creator/profile`
8. `/v3/creator/messages`
9. `/v3/creator/settings`

### 8.5 Shared Layout

V3 uses a shared layout component that provides:

1. Portal-specific navigation.
2. Portal title and active route state.
3. Search and command access.
4. Notification center.
5. Dark mode toggle.
6. Exit Portal action.
7. Brand session context where applicable.
8. Route-level error boundary.

Acceptance criteria:

1. Admin, brand, and creator portals each display only the nav appropriate to that portal.
2. The active route is visually identifiable.
3. Exit Portal returns to the v3 role selector.
4. Command search can be invoked from supported pages.
5. Notification center is available without blocking primary content.
6. Dark mode preference can be toggled.
7. Errors in child routes do not crash the entire application shell.

---

## 9. Core Domain Model

### 9.1 Business Case

The Business Case is the canonical v3 entity.

Required conceptual fields:

1. ID
2. Title
3. Brand ID
4. Brand name
5. Creator ID, optional in early stages
6. Creator name, optional in early stages
7. Relationship Manager
8. Stage
9. Engagement track
10. Source
11. Stated intent
12. Estimated value
13. Health status
14. Days in stage
15. Next action
16. Connect status
17. Scope flags
18. Alignment snapshot state
19. Strategy snapshot state
20. Contract state
21. Invoice state
22. Deliverable state
23. Final report state
24. Feedback state
25. Created date
26. Updated date

Stages:

1. connect
2. frame
3. plan
4. deliver
5. closed

Engagement tracks:

1. paid
2. grant

Health values:

1. on_track
2. watch
3. blocked
4. complete

Acceptance criteria:

1. A Business Case can be created from the admin Business Cases page.
2. A Business Case can be created from an accepted opportunity candidate.
3. A Business Case can be loaded by ID.
4. A Business Case displays its current stage and next action.
5. A Business Case supports paid and grant track behavior.
6. A Business Case can advance only when the stage gate is satisfied.
7. The frontend handles backend outage by falling back to seeded local demo data where configured.

### 9.2 Brand

The Brand represents the client or funder organization.

Required conceptual fields:

1. ID
2. Name
3. Industry
4. Website
5. Primary contact
6. Contact email
7. Contact phone
8. Engagement track
9. Tier or account status
10. Relationship manager
11. Active Business Case count
12. Notes

Acceptance criteria:

1. Admin can view the brand list.
2. Admin can add a brand.
3. Admin can view a brand detail page.
4. Brand portal session maps to the correct brand.
5. Brand portal only exposes relevant brand projects and artifacts.

### 9.3 Creator

The Creator represents a talent partner.

Required conceptual fields:

1. ID
2. Name
3. Category
4. Location
5. Audience profile
6. Commercial fit
7. Grant fit
8. Brand safety notes
9. Conversion behavior score
10. Strategic fit score
11. Availability
12. Wallet status
13. Profile completeness
14. Active Business Cases

Acceptance criteria:

1. Admin can view creators.
2. Admin can view a creator detail page.
3. Admin can add a creator.
4. Admin can run web-assisted creator discovery.
5. Creator matching can recommend creators for a Business Case.
6. Low conversion-behavior candidates can be excluded from brainstorm output where rules require.

### 9.4 Alignment Snapshot

The Alignment Snapshot is the Frame-stage artifact that captures shared understanding before the work moves into planning.

Required conceptual fields:

1. ID
2. Business Case ID
3. Status
4. Sections
5. Summary
6. Brand goals
7. Audience
8. Strategic tension
9. Proposed direction
10. Scope flags
11. Comments
12. Approval state
13. Sent timestamp
14. Approved timestamp

Acceptance criteria:

1. Admin can generate an Alignment Snapshot.
2. Admin can edit snapshot sections.
3. Admin can send the snapshot to brand.
4. Brand can comment on specific sections.
5. Brand can approve the snapshot.
6. Admin can resolve comments.
7. Scope flags must be resolved before advancing where applicable.

### 9.5 Creative Brief

The Creative Brief is the Plan-stage instruction artifact sent to a creator.

Required conceptual fields:

1. ID
2. Business Case ID
3. Creator ID
4. Status
5. Brief title
6. Campaign context
7. Deliverables requested
8. Timeline
9. Budget or grant context
10. Creator response status
11. Reminder state
12. Sent timestamp

Acceptance criteria:

1. Admin can create and send a creative brief.
2. Creator can view briefs in the creator brief inbox.
3. Creator response can be simulated in the demo environment.
4. Admin can send a reminder.
5. Brief response can feed the Strategy Snapshot.

### 9.6 Strategy Snapshot

The Strategy Snapshot is the Plan-stage brand-facing strategy artifact.

Required conceptual fields:

1. ID
2. Business Case ID
3. Status
4. Strategic recommendation
5. Creator rationale
6. Campaign mechanics
7. Deliverable plan
8. Timeline
9. Budget and fee context
10. Comments
11. Approval state
12. Sent timestamp
13. Approved timestamp

Acceptance criteria:

1. Admin can draft a Strategy Snapshot.
2. Admin can edit sections.
3. Admin can send the Strategy Snapshot to brand.
4. Brand can comment on sections.
5. Brand can approve the Strategy Snapshot.
6. Admin can resolve comments.
7. Strategy approval is required before moving to delivery.

### 9.7 Contract

Contracts represent formal agreement documents for the brand and creator sides of the Business Case.

Required conceptual fields:

1. ID
2. Business Case ID
3. Party type
4. Status
5. Contract body
6. Signature state
7. Sent timestamp
8. Signed timestamp

Acceptance criteria:

1. Admin can generate contracts.
2. Admin can view contract preview.
3. Admin can send contracts.
4. Contracts can be marked signed.
5. Required contracts must be signed before delivery starts.

### 9.8 Invoice

Invoices represent SDF, brand payments, creator payments, and other financial records.

Required conceptual fields:

1. ID
2. Business Case ID
3. Invoice type
4. Amount
5. Currency
6. Status
7. Due date
8. Paid timestamp

Acceptance criteria:

1. Admin can view invoices.
2. Admin can mark invoices paid.
3. Brand can view invoices relevant to its account.
4. Paid-track Business Cases can enforce Strategy Development Fee requirements.
5. Grant-track Business Cases display waived SDF behavior where applicable.

### 9.9 Deliverable

Deliverables represent committed creator outputs.

Required conceptual fields:

1. ID
2. Business Case ID
3. Creator ID
4. Title
5. Description
6. Status
7. Due date
8. Upload state
9. Review state
10. Approval state

Expected deliverable states:

1. pending_upload
2. pending_rm_review
3. approved

Acceptance criteria:

1. Admin can view deliverables for a Business Case.
2. Admin can add a deliverable.
3. Deliverables can transition across workflow states.
4. Creator can view deliverables assigned to them.
5. Creator-facing status labels are clear and professional.

### 9.10 Scope Change

Scope Changes capture requested modifications after strategy or delivery has begun.

Required conceptual fields:

1. ID
2. Business Case ID
3. Requested by
4. Description
5. Operational impact
6. Fee impact
7. Timeline impact
8. Status
9. Approval timestamp

Acceptance criteria:

1. Admin can create a scope-change request.
2. Admin can approve scope-change requests.
3. Business Case can surface a scope-creep warning or pause state.
4. Scope changes are visible in the Business Case detail context.

### 9.11 Final Report

The Final Report is the closeout artifact produced during Closure.

Required conceptual fields:

1. ID
2. Business Case ID
3. Summary
4. KPI performance
5. Variance analysis
6. Learnings
7. Creator notes
8. Brand notes
9. Grant impact notes where applicable
10. Generated timestamp

Acceptance criteria:

1. Admin can generate a final report.
2. Final report displays KPI variance.
3. Final report supports paid and grant use cases.
4. Closure checklist can reference final report completion.

---

## 10. Engagement Tracks

### 10.1 Paid Strategy Track

The paid track is used for standard commercial brand work.

Expected behavior:

1. Brand opportunity is qualified.
2. Alignment Snapshot is generated, reviewed, sent, commented on, and approved.
3. Strategy Development Fee is issued after the appropriate planning trigger.
4. SDF must be paid before externally sharing or finalizing certain strategy artifacts, depending on business rule configuration.
5. Creator matching and planning occur.
6. Contracts are generated and signed.
7. Deliverables are tracked.
8. Final reporting and feedback are completed.

Commercial notes:

1. V3 currently treats Frame as the alignment stage rather than a fee collection stage.
2. The Business Case detail experience notes that no SDF is collected in Frame.
3. The fee is issued after a creator brief is sent and tracked before the Strategy Snapshot is shared externally.
4. Backend gate language may still reference Frame-to-Plan SDF requirements; the product requirement is to align backend enforcement with the current Plan-stage SDF UX.

Acceptance criteria:

1. Paid Business Cases show paid strategy track labels.
2. SDF invoices are visible in the Plan stage.
3. Admin can mark SDF invoices paid.
4. The system prevents stage advancement when configured paid-track gates are not satisfied.
5. Brand invoices are visible in the Brand Portal.

### 10.2 Grant Track

The grant track is used for funder-supported creator work where the commercial structure differs from standard brand strategy engagements.

Expected behavior:

1. Opportunity may originate from a funder, NGO, public interest campaign, or grant signal.
2. SDF is waived.
3. TASCK absorbs or separately accounts for strategy cost.
4. The funder may pay the creator directly.
5. Strategy artifacts emphasize mission fit, public interest, measurable impact, and creator suitability.
6. Final reports include grant impact notes.

Acceptance criteria:

1. Grant Business Cases show grant labels.
2. Grant Business Cases do not require SDF payment to progress.
3. Grant Business Cases display a clear fee waiver note.
4. Grant opportunity discovery can produce accepted candidates.
5. Business Case creation can use an accepted grant opportunity.

### 10.3 Track Comparison

| Requirement | Paid Track | Grant Track |
|---|---|---|
| Strategy Development Fee | Required based on configured stage gate | Waived |
| Brand/funder payment | Brand pays TASCK | Funder or grant program may pay creator directly |
| Strategy emphasis | Brand objectives, audience, campaign value | Mission fit, impact, public interest, creator suitability |
| Invoice visibility | Brand invoices visible | Grant-specific finance handling visible to admin |
| Final report | Campaign performance and business outcomes | Impact outcomes and grant reporting |

---

## 11. Business Case Lifecycle

### 11.1 Lifecycle Overview

The Business Case lifecycle is:

Connect -> Frame -> Plan -> Deliver -> Closure

Each stage has:

1. Stage purpose
2. Primary actors
3. Key artifacts
4. Required actions
5. Advancement gates
6. Completion signal

### 11.2 Connect Stage

Purpose:

Capture initial opportunity signal, log relationship context, understand the stated intent, and determine whether the opportunity is qualified enough to frame.

Primary actors:

1. Relationship Manager
2. Admin
3. Brand or funder contact

Key artifacts:

1. Business Case shell
2. Interaction history
3. Stated intent
4. Source metadata
5. Qualification status

Required features:

1. Display opportunity source.
2. Display current connect status.
3. Display stated intent.
4. Display interaction history.
5. Allow admin to log an interaction.
6. Allow admin to ingest transcript content.
7. Allow admin to mark opportunity qualified.
8. Allow admin to advance qualified Business Case into Frame.
9. Display marketing intelligence where available.

Expected connect statuses:

1. new_signal
2. discovery_started
3. qualified_to_frame
4. not_qualified

Advancement gate:

Business Case can advance from Connect to Frame only when:

`connect_status === "qualified_to_frame"`

Acceptance criteria:

1. Business Case detail Connect tab displays source, status, stated intent, and interactions.
2. Admin can log a new interaction.
3. Admin can mark the case qualified.
4. Admin cannot advance an unqualified case unless system rules are intentionally overridden.
5. Successful advancement moves the case into Frame.

### 11.3 Frame Stage

Purpose:

Create a shared understanding between TASCK and the brand/funder before detailed strategy and creator planning begin.

Primary actors:

1. Relationship Manager
2. Strategy Lead
3. Brand stakeholder
4. Grant stakeholder where applicable

Key artifacts:

1. Alignment Snapshot
2. Scope flags
3. Brand comments
4. Approval record

Required features:

1. Generate AI-assisted Alignment Snapshot.
2. Edit Alignment Snapshot sections.
3. Send reviewed snapshot to brand.
4. Allow brand to comment on document sections.
5. Allow admin to resolve comments.
6. Allow admin to resolve scope flags.
7. Allow brand approval.
8. Display paid-track commercial note.
9. Display grant-track fee waiver note.
10. Advance to Plan when all gates are satisfied.

Advancement gate:

Business Case can advance from Frame to Plan when:

1. Alignment Snapshot is approved.
2. Required scope flags are resolved.
3. Track-specific commercial rules are satisfied.

Current product nuance:

The UI positions Frame as no-fee alignment and moves Strategy Development Fee collection into Plan after creator brief generation. Backend gate rules should be reconciled to this UX so operators do not see contradictory behavior.

Acceptance criteria:

1. Admin can generate an Alignment Snapshot for a Frame-stage Business Case.
2. Admin can edit generated content before sending.
3. Brand can comment through the Brand Portal approvals flow.
4. Brand can approve the Alignment Snapshot.
5. Scope flags are visibly unresolved until resolved.
6. The system prevents advancement if the approval or scope gates fail.
7. Grant-track Business Cases do not require SDF.

### 11.4 Plan Stage

Purpose:

Select the creator strategy, send a brief, capture creator response, draft the Strategy Snapshot, secure approval, and prepare contracts.

Primary actors:

1. Strategy Lead
2. Relationship Manager
3. Creator
4. Brand stakeholder
5. Finance
6. Legal/operations

Key artifacts:

1. Creator match recommendations
2. Brainstorm round
3. Creative Brief
4. Creator response
5. Strategy Snapshot
6. Strategy Development Fee invoice for paid track
7. Brand contract
8. Creator contract

Required features:

1. Run creator brainstorm for the Business Case.
2. Score creators for fit.
3. Exclude creators who fail conversion-behavior or suitability thresholds.
4. Select creator.
5. Create and send creative brief.
6. Send creator reminder.
7. Simulate or capture creator response.
8. Generate Strategy Snapshot from alignment, brief, and creator response.
9. Edit Strategy Snapshot.
10. Send Strategy Snapshot to brand.
11. Allow brand comments.
12. Resolve comments.
13. Approve Strategy Snapshot.
14. Display SDF invoice for paid track.
15. Mark SDF paid.
16. Generate brand and creator contracts.
17. Send contracts.
18. Mark contracts signed.
19. Advance to Deliver when gates are satisfied.

Expected Plan-stage sequence:

1. Brainstorm creators.
2. Select creator.
3. Send creator brief.
4. Receive or simulate creator response.
5. Issue and collect SDF where required.
6. Draft Strategy Snapshot.
7. Send Strategy Snapshot to brand.
8. Resolve comments.
9. Approve strategy.
10. Generate contracts.
11. Sign contracts.
12. Advance to Deliver.

Advancement gate:

Business Case can advance from Plan to Deliver when:

1. Strategy Snapshot is approved.
2. Required contracts are signed.
3. Track-specific invoice rules are satisfied.

Acceptance criteria:

1. Admin sees context-aware Plan actions.
2. Admin cannot skip required steps without explicit override support.
3. Creator brainstorm results explain fit and elimination rationale.
4. Creative Brief is visible to the creator.
5. Strategy Snapshot is visible in Brand Portal approvals when sent.
6. Brand approval state is persisted.
7. Contract signed state is persisted.
8. Successful advancement moves the case into Deliver.

### 11.5 Deliver Stage

Purpose:

Execute the campaign, manage deliverables, review work, track scope changes, and keep the project moving toward closeout.

Primary actors:

1. Relationship Manager
2. Creator
3. Brand stakeholder
4. Operations
5. Finance

Key artifacts:

1. Deliverable list
2. Upload/review state
3. Scope-change requests
4. Approval records
5. Timeline and milestone state

Required features:

1. Display deliverables for the Business Case.
2. Add new deliverables.
3. Transition deliverables through status states.
4. Show creator-facing deliverables.
5. Allow scope-change request creation.
6. Allow scope-change approval.
7. Display scope-creep pause or warning.
8. Display delivery health and next action.
9. Support advancement into Closure when delivery obligations are complete.

Expected deliverable flow:

pending_upload -> pending_rm_review -> approved

Acceptance criteria:

1. Admin can add a deliverable.
2. Admin can transition a deliverable.
3. Creator can view assigned deliverables.
4. Scope changes are recorded against the Business Case.
5. Approved scope changes display updated operational context.
6. The Business Case cannot close until required delivery conditions are satisfied.

### 11.6 Closure Stage

Purpose:

Complete the Business Case, generate final reporting, collect feedback, and preserve learnings.

Primary actors:

1. Relationship Manager
2. Strategy Lead
3. Brand stakeholder
4. Creator
5. Leadership

Key artifacts:

1. Final Report
2. KPI variance summary
3. Brand feedback
4. Creator feedback
5. Closure checklist

Required features:

1. Generate final report.
2. Display KPI variance.
3. Capture brand feedback.
4. Capture creator feedback.
5. Display closure checklist.
6. Mark closure complete.
7. Display closed state in Business Case list.

Closure checklist:

1. Final report generated.
2. Final deliverables approved.
3. Brand feedback submitted.
4. Creator feedback submitted.
5. Finance state reviewed.
6. Internal learnings captured.

Acceptance criteria:

1. Admin can generate a final report.
2. Admin can see closeout readiness.
3. Brand feedback can be submitted.
4. Creator feedback can be submitted.
5. Completed cases appear as closed.

---

## 12. Admin Control Centre Requirements

### 12.1 Admin Overview

Purpose:

Give internal TASCK users a quick view of operating health.

Required content:

1. Active Business Case count.
2. Stage distribution.
3. Paid strategy value.
4. Grant value.
5. Pending approvals.
6. Contract blockers.
7. Invoice blockers.
8. Delivery blockers.
9. Recent activity.
10. Next actions.

Acceptance criteria:

1. Admin overview loads without requiring manual data refresh.
2. Overview metrics use live API data where available.
3. Overview falls back to demo data when backend is unavailable.
4. Metrics link or guide users to relevant detail areas.

### 12.2 Business Cases List

Route:

`/v3/admin/business-cases`

Purpose:

Provide the primary command list for all end-to-end opportunities.

Required content:

1. Total Business Cases metric.
2. Paid strategy count and value.
3. Grant count and value.
4. Stage distribution.
5. Stage filter.
6. Track filter.
7. New Business Case modal.
8. AI-generated business cases panel.
9. Grant opportunity discovery panel.
10. Reset demo action where enabled.
11. Business Case table/list.

Required list item fields:

1. Title
2. Brand
3. Creator if assigned
4. Stage
5. Engagement track
6. Health
7. Next action
8. Estimated value
9. Days in stage

New Business Case modal fields:

1. Title
2. Brand
3. Optional creator
4. Engagement track
5. Estimated value
6. Relationship manager
7. Connect status at intake
8. Stated intent

Acceptance criteria:

1. Admin can filter by stage.
2. Admin can filter by track.
3. Admin can create a Business Case.
4. Admin can create a Business Case from an accepted opportunity candidate.
5. Business Case rows navigate to detail page.
6. Empty states are informative and action-oriented.
7. Backend outage does not prevent demo-mode exploration.

### 12.3 Business Case Detail

Route:

`/v3/admin/business-cases/:id`

Purpose:

Provide the complete working surface for a single Business Case.

Required header fields:

1. Business Case title.
2. Brand name.
3. Creator name if selected.
4. Engagement track.
5. Current stage.
6. Days in stage.
7. Estimated value.
8. Health.
9. Next action.
10. Stage tabs.

Required tabs:

1. Connect
2. Frame
3. Plan
4. Deliver
5. Closure

Acceptance criteria:

1. Detail page loads the Business Case by ID.
2. Stage tab is selected based on current stage.
3. User can switch tabs without losing the Business Case context.
4. The page clearly distinguishes completed, active, and upcoming stages.
5. Actions are context-aware and stage-specific.
6. Mutations refresh or update local state.
7. Errors are visible without crashing the page.

### 12.4 Admin Pipeline

Route:

`/v3/admin/pipeline`

Purpose:

Give operators a stage-oriented view of active work.

Required content:

1. Pipeline columns or grouped sections.
2. Business Cases by stage.
3. Health labels.
4. Owner or relationship manager.
5. Value.
6. Next action.
7. Quick navigation to detail.

Acceptance criteria:

1. Pipeline accurately reflects Business Case stage state.
2. Stage counts match list metrics.
3. Cards or rows link to Business Case details.

### 12.5 Admin Projects

Route:

`/v3/admin/projects`

Purpose:

Maintain compatibility with project-oriented workflows while Business Case becomes the primary lifecycle model.

Required content:

1. Project list.
2. Project detail links.
3. Project status.
4. Brand.
5. Creator.
6. Deliverables.
7. Related Business Case where applicable.

Acceptance criteria:

1. Existing project routes continue to function.
2. Project detail pages remain reachable.
3. Project pages can be cross-referenced from Business Cases.

### 12.6 Brainstorm Workspace

Route:

`/v3/admin/projects/:id/brainstorm`

Purpose:

Support creator ideation and strategy evaluation.

Required content:

1. Business/project context.
2. Creator candidate list.
3. Fit scores.
4. Elimination rationale.
5. Recommended creator.
6. Strategy notes.

Acceptance criteria:

1. Admin can inspect brainstorm output.
2. The system explains why candidates are recommended or eliminated.
3. Selected creator can feed Plan-stage work.

### 12.7 Feedback Workspace

Route:

`/v3/admin/projects/:id/feedback`

Purpose:

Collect brand and creator feedback as part of closeout.

Required content:

1. Brand feedback form.
2. Creator feedback form.
3. Existing feedback history.
4. Closeout readiness signal.

Acceptance criteria:

1. Admin can submit brand feedback.
2. Admin can submit creator feedback.
3. Feedback is associated with the correct Business Case or project.

### 12.8 Scope Change Workspace

Route:

`/v3/admin/projects/:id/scope-changes`

Purpose:

Manage requested changes after scope has been agreed.

Required content:

1. Existing scope changes.
2. New scope-change request form.
3. Impact fields.
4. Approval action.
5. Status history.

Acceptance criteria:

1. Admin can create scope-change requests.
2. Admin can approve scope-change requests.
3. Scope-change state is reflected in Business Case detail.

### 12.9 Contract Preview

Route:

`/v3/admin/projects/:id/contract`

Purpose:

Let admin review contract content before send/sign actions.

Required content:

1. Contract party.
2. Contract status.
3. Contract sections.
4. Send action.
5. Sign action.

Acceptance criteria:

1. Admin can preview contract content.
2. Contract state matches backend contract records.
3. Signed contracts satisfy Plan-to-Deliver gate rules.

### 12.10 CRM

Routes:

1. `/v3/admin/crm`
2. `/v3/admin/crm/:id`

Purpose:

Manage brands, contacts, accounts, and relationship context.

Required list content:

1. Brand name.
2. Industry.
3. Engagement track.
4. Primary contact.
5. Relationship manager.
6. Active work.
7. Paid or grant label.

Required actions:

1. Add Brand.
2. Open Brand Detail.
3. View opportunity-related context.

Acceptance criteria:

1. Admin can view live brands list from API.
2. Admin can create a brand.
3. Paid and grant brands are visually distinguishable.
4. Brand detail page displays account context.
5. CRM remains usable with fallback demo data.

### 12.11 Opportunity Scanner

Route:

`/v3/admin/crm/opportunities`

Purpose:

Identify public web signals that may become TASCK opportunities.

Required content:

1. Scan controls.
2. Candidate opportunity list.
3. Source metadata.
4. Candidate title.
5. Candidate brand/funder.
6. Track recommendation.
7. Accept action.
8. Reject action.
9. Create Business Case path for accepted candidates.

Acceptance criteria:

1. Admin can run or view opportunity scans.
2. Admin can accept a candidate.
3. Admin can reject a candidate.
4. Accepted candidates can become Business Cases.
5. Grant discovery supports grant-track opportunity creation.

### 12.12 Creators

Routes:

1. `/v3/admin/creators`
2. `/v3/admin/creators/:id`

Purpose:

Manage the creator network and creator fit intelligence.

Required list content:

1. Creator name.
2. Category.
3. Location.
4. Audience.
5. Fit indicators.
6. Availability.
7. Active work.

Required detail content:

1. Creator profile.
2. Brand safety notes.
3. Commercial fit.
4. Grant fit.
5. Conversion behavior.
6. Related Business Cases.
7. Wallet/payment summary.

Required actions:

1. Add creator.
2. Search web for creators.
3. Open creator detail.

Acceptance criteria:

1. Admin can view creators.
2. Admin can add creators.
3. Admin can search web-assisted creator candidates.
4. Creator details support matching decisions.

### 12.13 Contracts

Route:

`/v3/admin/contracts`

Purpose:

Give admin a centralized view of legal document status.

Required content:

1. Contract list.
2. Business Case association.
3. Party.
4. Status.
5. Sent date.
6. Signed date.
7. Action links.

Acceptance criteria:

1. Admin can see which contracts are unsigned.
2. Contract status aligns with Business Case gate state.
3. Admin can navigate to relevant contract preview or Business Case detail.

### 12.14 Templates

Route:

`/v3/admin/templates`

Purpose:

Provide reusable document and communication templates.

Required template categories:

1. Alignment Snapshot.
2. Creative Brief.
3. Strategy Snapshot.
4. Brand contract.
5. Creator contract.
6. Final report.
7. Client update.
8. Creator reminder.

Acceptance criteria:

1. Admin can view template categories.
2. Template usage maps to relevant workflow artifacts.
3. Future edits can be centralized through this area.

### 12.15 Insights

Route:

`/v3/admin/insights`

Purpose:

Surface business and operational intelligence.

Required content:

1. Stage conversion.
2. Revenue exposure.
3. Grant exposure.
4. Creator performance.
5. Delivery health.
6. Approval delays.
7. Scope-change frequency.

Acceptance criteria:

1. Insights summarize data across Business Cases.
2. Insights distinguish paid and grant tracks.
3. Insights support leadership review.

### 12.16 Reports

Route:

`/v3/admin/reports`

Purpose:

Collect generated final reports and reporting outputs.

Required content:

1. Report list.
2. Business Case association.
3. Brand/funder.
4. Creator.
5. KPI performance.
6. Generated date.

Acceptance criteria:

1. Admin can view final reports.
2. Admin can navigate from report to Business Case.
3. Grant reports can be distinguished from paid campaign reports.

### 12.17 Wallet

Route:

`/v3/admin/wallet`

Purpose:

Provide admin visibility into creator payments, brand payments, and finance state.

Required content:

1. Incoming payments.
2. Outgoing creator payments.
3. Pending payouts.
4. Paid invoices.
5. Overdue invoices.
6. Grant payment notes.

Acceptance criteria:

1. Admin can see finance state across work.
2. Wallet state aligns with invoices and creator portal wallet state.
3. Grant direct-payment cases are labeled clearly.

### 12.18 Fees

Route:

`/v3/admin/fees`

Purpose:

Manage Strategy Development Fees and other TASCK fees.

Required content:

1. SDF invoice list.
2. Fee amounts.
3. Payment status.
4. Business Case association.
5. Paid/grant distinction.

Acceptance criteria:

1. Admin can distinguish paid SDF from waived grant SDF.
2. Fee state can be used by Business Case gates.
3. Fee records link to invoices.

### 12.19 Tasks

Route:

`/v3/admin/tasks`

Purpose:

Centralize internal follow-up work.

Required content:

1. Task list.
2. Owner.
3. Due date.
4. Related Business Case.
5. Priority.
6. Status.

Acceptance criteria:

1. Admin can see operational next actions.
2. Tasks can reference Business Cases or brands.
3. Task status supports daily operations.

### 12.20 Users

Route:

`/v3/admin/users`

Purpose:

Manage internal users and roles.

Required content:

1. User list.
2. Role.
3. Status.
4. Portal access.
5. Last activity.

Acceptance criteria:

1. Admin can view users.
2. Roles are explicit.
3. Future access-control enhancements can be layered onto this model.

### 12.21 Settings

Route:

`/v3/admin/settings`

Purpose:

Manage system settings for v3.

Required content:

1. Profile settings.
2. Organization settings.
3. Notification settings.
4. Demo/reset controls where appropriate.
5. Portal preferences.

Acceptance criteria:

1. Admin settings page is reachable.
2. Settings are organized by category.
3. Demo-only controls are clearly not production finance/legal controls.

---

## 13. Brand Portal Requirements

### 13.1 Brand Login

Route:

`/v3/brand/login`

Purpose:

Authenticate brand users into their curated portal.

Required content:

1. Email field.
2. Password field.
3. Show/hide password control.
4. Sign-in action.
5. Demo credential cards.
6. Temporary password change path.
7. Error state for invalid credentials.

Acceptance criteria:

1. Valid demo credentials create a brand portal session.
2. Invalid credentials show a clear error.
3. User can toggle password visibility.
4. Credential card selection populates login state or guides login.
5. Successful login navigates to `/v3/brand`.
6. Temporary password flow links to `/v3/brand/change-password`.

### 13.2 Brand Change Password

Route:

`/v3/brand/change-password`

Purpose:

Allow brand users to replace temporary credentials.

Required content:

1. Email.
2. Current password.
3. New password.
4. Confirm password.
5. Submit action.
6. Success and error states.

Acceptance criteria:

1. User can submit a password change.
2. API call updates brand account password where backend is available.
3. Validation catches mismatched passwords.
4. User can return to login after success.

### 13.3 Brand Overview

Route:

`/v3/brand`

Purpose:

Give brand stakeholders a calm summary of current TASCK work.

Required content:

1. Active projects.
2. Pending approvals.
3. Recent documents.
4. Open invoices.
5. Recent messages.
6. Next actions.

Acceptance criteria:

1. Overview only shows data associated with the logged-in brand.
2. Pending approvals link to approval detail.
3. Open invoices link to invoices.
4. Empty states do not expose internal admin language.

### 13.4 Brand Projects

Routes:

1. `/v3/brand/projects`
2. `/v3/brand/projects/:id`

Purpose:

Let brand users understand active and historical work.

Required project list content:

1. Project title.
2. Stage/status.
3. Creator.
4. Next action.
5. Timeline.
6. Health label.

Required project detail content:

1. Project summary.
2. Current stage.
3. Key deliverables.
4. Documents.
5. Approvals.
6. Messages.
7. Invoices.

Acceptance criteria:

1. Brand can view only its own projects.
2. Detail page displays brand-safe project context.
3. Internal scoring, internal health commentary, and private brainstorm data are not exposed by default.

### 13.5 Brand Approvals

Route:

`/v3/brand/approvals`

Purpose:

Let brand stakeholders review and approve Alignment Snapshots and Strategy Snapshots.

Required content:

1. Pending document list.
2. Selected document view.
3. Document type.
4. Business Case/project title.
5. Sectioned document body.
6. Comment input per section.
7. Existing comments.
8. Approval action.
9. Approved or all-clear state.

Supported document types:

1. Alignment Snapshot.
2. Strategy Snapshot.

Required actions:

1. Add section comment.
2. Approve Alignment Snapshot.
3. Approve Strategy Snapshot.

Acceptance criteria:

1. Brand can select a pending approval.
2. Brand can comment on a specific document section.
3. Brand can approve an Alignment Snapshot.
4. Brand can approve a Strategy Snapshot.
5. Approval updates the correct backend record when available.
6. Fallback mode persists demo approval/comment state locally.
7. Empty state displays "All clear" or equivalent calm message.

### 13.6 Brand Documents

Route:

`/v3/brand/documents`

Purpose:

Provide a document vault for brand-accessible artifacts.

Required content:

1. Alignment Snapshots.
2. Strategy Snapshots.
3. Contracts.
4. Final reports.
5. Document status.
6. Project association.
7. Updated date.

Acceptance criteria:

1. Brand sees only documents associated with its account.
2. Documents are grouped or searchable enough for repeated use.
3. Document statuses are clear.

### 13.7 Brand Invoices

Route:

`/v3/brand/invoices`

Purpose:

Give brand stakeholders visibility into invoices and payment state.

Required content:

1. Invoice number.
2. Business Case/project.
3. Amount.
4. Currency.
5. Status.
6. Due date.
7. Paid date where applicable.

Acceptance criteria:

1. Brand sees only its own invoices.
2. Paid, unpaid, and overdue states are visually distinct.
3. Grant-track fee waiver context is not shown as a normal payable invoice unless configured.

### 13.8 Brand Messages

Route:

`/v3/brand/messages`

Purpose:

Provide a focused communication area for brand/TASCK conversations.

Required content:

1. Message threads.
2. Selected conversation.
3. Message history.
4. Composer.
5. Send action.

Acceptance criteria:

1. Brand can view message threads.
2. Brand can compose a message.
3. Messages are associated with the brand account.
4. Demo mode supports visible interaction even if backend messaging is not production-connected.

### 13.9 Brand Settings

Route:

`/v3/brand/settings`

Purpose:

Allow brand users to manage account and notification preferences.

Required content:

1. Account profile.
2. Contact details.
3. Notification preferences.
4. Password management link.

Acceptance criteria:

1. Settings page is reachable from brand nav.
2. Brand identity is displayed.
3. User can access password change flow.

---

## 14. Creator Portal Requirements

### 14.1 Creator Overview

Route:

`/v3/creator`

Purpose:

Give creators a clear summary of their current TASCK relationship.

Required content:

1. Active briefs.
2. Active projects.
3. Pending deliverables.
4. Wallet/payment status.
5. Recent messages.
6. Profile completion.

Acceptance criteria:

1. Creator overview is available from role selector.
2. Overview prioritizes current work and next action.
3. Creator-facing language is concise and respectful.

### 14.2 Creator Briefs

Routes:

1. `/v3/creator/briefs`
2. `/v3/creator/briefs/:id`

Purpose:

Let creators view and respond to campaign briefs.

Required list content:

1. Brief title.
2. Brand.
3. Project.
4. Status.
5. Due date.
6. Response state.

Expected states:

1. Awaiting Response
2. Responded

Required detail content:

1. Campaign context.
2. Deliverables requested.
3. Timeline.
4. Budget or grant context.
5. TASCK notes.
6. Response area.

Acceptance criteria:

1. Creator can view brief inbox.
2. Creator can open brief detail.
3. Creator can distinguish responded and awaiting-response briefs.
4. Brief language matches the creator's role, not internal admin language.

### 14.3 Creator Projects

Route:

`/v3/creator/projects`

Purpose:

Let creators view active and historical TASCK projects.

Required content:

1. Project title.
2. Brand.
3. Stage/status.
4. Deliverables.
5. Timeline.
6. Payment summary.

Acceptance criteria:

1. Creator can view assigned projects.
2. Creator project state is consistent with deliverable and wallet pages.
3. Creator cannot see unrelated brand or admin data.

### 14.4 Creator Deliverables

Route:

`/v3/creator/deliverables`

Purpose:

Let creators manage assigned deliverables.

Required content:

1. Deliverable title.
2. Brand/project.
3. Due date.
4. Status.
5. Review state.
6. Upload or action placeholder.

Acceptance criteria:

1. Deliverables are grouped by brand or project where useful.
2. Status labels are understandable.
3. Creator can identify what needs action.
4. Status aligns with admin deliverable workflow.

### 14.5 Creator Wallet

Route:

`/v3/creator/wallet`

Purpose:

Show creators their payment state.

Required content:

1. Pending payments.
2. Paid payments.
3. Project association.
4. Amount.
5. Expected date.
6. Payment notes.

Acceptance criteria:

1. Creator can see payment state.
2. Grant direct-payment notes are clear where applicable.
3. Wallet state aligns with admin finance state.

### 14.6 Creator Profile

Route:

`/v3/creator/profile`

Purpose:

Let creators view and maintain professional information TASCK uses for matching and operations.

Required content:

1. Name.
2. Category.
3. Location.
4. Bio.
5. Audience.
6. Brand fit.
7. Grant fit.
8. Contact details.
9. Portfolio/social links.

Acceptance criteria:

1. Creator profile page is reachable.
2. Profile fields support future creator matching.
3. Profile completion can be represented.

### 14.7 Creator Messages

Route:

`/v3/creator/messages`

Purpose:

Provide a focused communication area between creator and TASCK.

Required content:

1. Message threads.
2. Conversation history.
3. Composer.
4. Send action.

Acceptance criteria:

1. Creator can view messages.
2. Creator can compose a message.
3. Messaging remains scoped to creator context.

### 14.8 Creator Settings

Route:

`/v3/creator/settings`

Purpose:

Allow creators to manage preferences.

Required content:

1. Account settings.
2. Notification preferences.
3. Profile visibility preferences.
4. Payment settings placeholder.

Acceptance criteria:

1. Settings page is reachable.
2. Settings are organized clearly.
3. Sensitive payment settings are not presented as production-connected unless integrated.

---

## 15. Public Brand Enquiry

Route:

`/v3/enquiry`

Purpose:

Capture inbound brand interest and convert it into relationship-manager follow-up.

Required fields:

1. Company
2. Industry
3. Website
4. Contact name
5. Role
6. Email
7. Phone
8. Campaign goal
9. Budget
10. Timeline
11. Creator preferences
12. Notes

Post-submit behavior:

1. Show confirmation.
2. Show reference ID.
3. Communicate that an RM will respond within 48 hours.
4. Preserve a professional, public-facing tone.

Acceptance criteria:

1. Public user can complete and submit the enquiry form.
2. Required fields validate.
3. Confirmation appears after successful submission.
4. The form does not require portal login.
5. Submission path can later feed CRM or Business Case creation.

---

## 16. Shared V3 Components

### 16.1 Command Search

Component:

`V3CommandK`

Purpose:

Let users quickly navigate across key v3 objects and actions.

Required behavior:

1. Opens with keyboard shortcut.
2. Searches projects.
3. Searches brands.
4. Searches creators.
5. Provides quick actions.
6. Navigates to selected result.

Required quick actions:

1. Go to Pipeline.
2. Go to CRM.
3. Go to Creators.
4. Go to Reports.

Acceptance criteria:

1. Command search opens reliably.
2. Search results are grouped by type.
3. Selecting a result navigates to the correct v3 route.
4. Command search does not expose admin-only routes in a brand or creator context unless intentionally allowed.

### 16.2 Notification Center

Purpose:

Show relevant alerts and work events.

Required content examples:

1. Approval pending.
2. Contract awaiting signature.
3. Invoice overdue.
4. Deliverable ready for review.
5. Scope change created.

Acceptance criteria:

1. Notification center is accessible from shared layout.
2. Notifications are concise.
3. Notifications can be expanded or inspected without disrupting primary work.

### 16.3 Dark Mode

Purpose:

Allow users to toggle portal appearance.

Acceptance criteria:

1. Toggle is available in shared layout.
2. Toggle applies to v3 portal surfaces.
3. Text contrast remains readable.

### 16.4 Route Error Boundary

Purpose:

Prevent a child page failure from taking down the full v3 portal shell.

Acceptance criteria:

1. Route-level errors are caught.
2. Error state communicates failure clearly.
3. User can navigate away or recover without full application restart.

### 16.5 Document Surface

Purpose:

Render sectioned documents such as Alignment Snapshots and Strategy Snapshots.

Required behavior:

1. Display document title and metadata.
2. Render sections.
3. Support section-level comments where enabled.
4. Display approval status.

Acceptance criteria:

1. Admin and brand document views use consistent section structure.
2. Comments attach to the correct section.
3. Approval actions apply to the correct document.

### 16.6 Demo Store And Fallback Data

Purpose:

Keep v3 demo flows usable even when backend API calls fail.

Required behavior:

1. Detect backend unavailability or HTML fallback responses.
2. Use seeded local demo data.
3. Persist certain demo interactions locally.
4. Preserve user flow continuity.

Acceptance criteria:

1. Business Case list can render without backend.
2. Brand approvals can persist demo comments and approvals.
3. Demo reset restores known seed state where supported.
4. Fallback behavior is not confused with production persistence.

---

## 17. Backend API Requirements

Base path:

`/api/v3`

### 17.1 Brands And Contacts

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/brands` | List brands |
| GET | `/brands/{brand_id}` | Get brand detail |
| POST | `/brands` | Create brand |
| POST | `/brand-accounts/change-password` | Change brand account password |
| GET | `/contacts` | List contacts |

Acceptance criteria:

1. Brand list supports CRM and portal needs.
2. Brand detail returns enough data for admin detail pages.
3. Brand creation supports Business Case intake.
4. Password change supports brand account flow.

### 17.2 Creators

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/creators` | List creators |
| GET | `/creators/{creator_id}` | Get creator detail |
| POST | `/creators` | Create creator |
| POST | `/creators/search-web` | Search for creator candidates |
| POST | `/business-cases/{bc_id}/ai/creator-matches` | Generate creator match recommendations |

Acceptance criteria:

1. Creator list powers admin creator pages.
2. Creator detail supports matching context.
3. Creator search supports discovery workflows.
4. Creator matching returns explainable recommendations.

### 17.3 Business Cases

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/business-cases` | List Business Cases |
| GET | `/business-cases/{bc_id}` | Get Business Case detail |
| POST | `/business-cases` | Create Business Case |
| POST | `/business-cases/{bc_id}/advance` | Advance Business Case stage |
| POST | `/business-cases/{bc_id}/connect/status` | Update Connect status |

Acceptance criteria:

1. Business Case list supports filters and metrics.
2. Detail response includes stage artifacts or references.
3. Create endpoint supports paid and grant tracks.
4. Advance endpoint enforces stage gates.
5. Connect status endpoint supports qualification flow.

### 17.4 Alignment Snapshots

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/business-cases/{bc_id}/ai/alignment` | Generate Alignment Snapshot |
| POST | `/business-cases/{bc_id}/ai/alignment/approve` | Approve Alignment Snapshot |
| PATCH | `/alignment-snapshots/{snapshot_id}` | Update Alignment Snapshot |
| POST | `/business-cases/{bc_id}/ai/alignment/send` | Send Alignment Snapshot |
| POST | `/alignment-snapshots/{snapshot_id}/comments` | Add Alignment Snapshot comment |
| POST | `/alignment-snapshots/{snapshot_id}/comments/{comment_id}/resolve` | Resolve comment |
| POST | `/business-cases/{bc_id}/scope-flags/{flag_index}/resolve` | Resolve scope flag |

Acceptance criteria:

1. Generated Alignment Snapshot is associated with the Business Case.
2. Patch endpoint updates document sections.
3. Comments attach to the correct snapshot and section.
4. Resolved comments and scope flags update gate readiness.
5. Approval state is visible to both admin and brand portal where relevant.

### 17.5 Invoices

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/invoices` | List invoices |
| POST | `/invoices/{invoice_id}/mark-paid` | Mark invoice paid |

Acceptance criteria:

1. Invoice list can be filtered or associated by Business Case/brand in frontend usage.
2. Mark-paid mutation updates fee gate state.
3. Brand portal invoice views can use the same invoice records with brand scoping.

### 17.6 Creative Briefs And Strategy Snapshots

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/creative-briefs` | Create creative brief |
| POST | `/creative-briefs/{brief_id}/remind` | Send creator reminder |
| GET | `/creative-briefs` | List creative briefs |
| POST | `/creative-briefs/{brief_id}/simulate-response` | Simulate creator response |
| GET | `/creative-snapshots` | List Strategy Snapshots |
| POST | `/creative-snapshots` | Create Strategy Snapshot |
| PATCH | `/creative-snapshots/{snapshot_id}` | Update Strategy Snapshot |
| POST | `/business-cases/{bc_id}/creative-snapshot/send` | Send Strategy Snapshot |
| POST | `/creative-snapshots/{snapshot_id}/comments` | Add Strategy Snapshot comment |
| POST | `/creative-snapshots/{snapshot_id}/comments/{comment_id}/resolve` | Resolve Strategy Snapshot comment |
| POST | `/business-cases/{bc_id}/creative-snapshot/approve` | Approve Strategy Snapshot |

Acceptance criteria:

1. Creative Briefs are tied to Business Cases and creators.
2. Creator responses can update planning state.
3. Strategy Snapshot comments and approvals support brand portal review.
4. Approved Strategy Snapshot satisfies Plan-stage strategy gate.

### 17.7 Contracts

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/contracts` | List contracts |
| POST | `/contracts` | Create contract |
| POST | `/contracts/{contract_id}/sign` | Mark contract signed |

Acceptance criteria:

1. Contracts are associated with Business Cases.
2. Contract parties are distinguishable.
3. Signing updates Plan-to-Deliver readiness.

### 17.8 Deliverables And Scope Changes

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/deliverables` | List deliverables |
| POST | `/deliverables` | Create deliverable |
| POST | `/deliverables/{deliverable_id}/transition` | Transition deliverable status |
| POST | `/business-cases/{bc_id}/scope-change` | Create scope change |
| POST | `/business-cases/{bc_id}/scope-change/{sc_id}/approve` | Approve scope change |

Acceptance criteria:

1. Deliverables can be listed for admin and creator views.
2. Deliverables can be transitioned through the expected states.
3. Scope changes are tied to Business Cases.
4. Approved scope changes are visible in delivery context.

### 17.9 Brainstorm, Feedback, Final Reports, And Interactions

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/brainstorm-rounds` | Create brainstorm round |
| GET | `/brainstorm-rounds` | List brainstorm rounds |
| GET | `/final-reports` | List final reports |
| POST | `/business-cases/{bc_id}/final-report/generate` | Generate final report |
| POST | `/business-cases/{bc_id}/feedback/brand` | Submit brand feedback |
| POST | `/business-cases/{bc_id}/feedback/creator` | Submit creator feedback |
| GET | `/interactions` | List interactions |
| POST | `/interactions/ingest-transcript` | Ingest transcript |
| POST | `/interactions` | Create interaction |

Acceptance criteria:

1. Brainstorm rounds can be created and retrieved.
2. Final reports can be generated and listed.
3. Brand and creator feedback attach to the correct Business Case.
4. Interactions support Connect-stage history.
5. Transcript ingestion can summarize or structure relationship context.

### 17.10 Opportunities

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/opportunities` | List opportunity records |
| GET | `/opportunities/candidates` | List scanned candidates |
| POST | `/opportunities/scans` | Run opportunity scan |
| POST | `/opportunities/scrape` | Scrape opportunity source |
| POST | `/opportunities/candidates/{candidate_id}/accept` | Accept opportunity candidate |
| POST | `/opportunities/candidates/{candidate_id}/reject` | Reject opportunity candidate |

Acceptance criteria:

1. Opportunity scanner can retrieve candidates.
2. Candidates can be accepted or rejected.
3. Accepted candidates can feed Business Case creation.
4. Grant and paid track signals are represented.

### 17.11 Admin And Metrics

Required endpoints:

| Method | Path | Purpose |
|---|---|---|
| POST | `/admin/reset-demo` | Reset seeded demo state |
| GET | `/metrics/admin-overview` | Get admin overview metrics |
| GET | `/email-outbox` | List generated outbound email records |

Acceptance criteria:

1. Demo reset restores known v3 seed state.
2. Admin overview metrics power dashboard cards.
3. Email outbox gives visibility into simulated send actions.

---

## 18. Seed Data Requirements

### 18.1 Purpose

The v3 seed data exists to make the product demonstrable end-to-end without requiring live client data. It should represent realistic TASCK work across paid strategy, grant work, creator matching, contracts, invoices, deliverables, and final reporting.

### 18.2 Required Seed Collections

Required collections:

1. `v3_brands`
2. `v3_contacts`
3. `v3_creators`
4. `v3_rms`
5. `v3_business_cases`
6. `v3_alignment_snapshots`
7. `v3_creative_briefs`
8. `v3_creative_snapshots`
9. `v3_contracts`
10. `v3_deliverables`
11. `v3_invoices`
12. `v3_final_reports`
13. `v3_brainstorm_rounds`
14. `v3_interactions`
15. `v3_brand_accounts`
16. `v3_email_outbox`
17. `v3_opportunities`

Acceptance criteria:

1. Seed data loads without manual record creation.
2. Seed data includes paid and grant examples.
3. Seed data supports every v3 portal at least minimally.
4. Seed data supports the primary end-to-end demo path.

### 18.3 Seed Brands

Representative seeded brands/funders include:

1. Coca-Cola
2. Guinness
3. MTN
4. Access
5. Star Lager / Nigerian Breweries
6. Pepsi
7. UBA
8. Dangote
9. Airtel
10. GTBank
11. Open Society Foundations, West Africa

Acceptance criteria:

1. Seed brands include recognizable paid commercial accounts.
2. Seed brands include at least one grant/funder account.
3. Brand portal demo credentials map to valid seed brand accounts.

### 18.4 Seed Creators

Representative seeded creators include:

1. Burna Boy
2. Tems
3. Rema
4. Davido
5. Ayra Starr
6. Fireboy
7. Adekunle Gold
8. Don Jazzy
9. Wizkid
10. Boy Spyce
11. C.J. Obasi

Acceptance criteria:

1. Seed creators cover different fit profiles.
2. Seed creators include commercial and grant suitability examples.
3. Seed creators support brainstorm and matching demos.

### 18.5 Flagship Seed Business Cases

Required representative Business Cases:

1. Star Originals - A Lagos After-Dark Anthology
2. OSF West African Press Freedom grant case
3. Coca-Cola Frame-stage case
4. Guinness Plan-stage case
5. MTN Closure-stage case

Primary end-to-end demo case:

`bc-nb-flagship`

Expected attributes:

1. Brand: Star Lager / Nigerian Breweries
2. Creator: Burna Boy
3. Stage: Deliver
4. Track: Paid
5. Estimated value: NGN 185,000,000
6. Health: On track

Acceptance criteria:

1. At least one case exists in each major lifecycle state.
2. The flagship case supports delivery and closure demonstrations.
3. Grant case demonstrates waived SDF and funder/creator payment difference.

---

## 19. AI-Assisted Workflow Requirements

### 19.1 Alignment Snapshot Generation

Purpose:

Reduce manual effort in converting relationship context into a structured alignment artifact.

Inputs:

1. Brand data.
2. Business Case stated intent.
3. Interaction history.
4. Source metadata.
5. Track type.

Outputs:

1. Alignment summary.
2. Brand goals.
3. Audience hypothesis.
4. Strategic tension.
5. Proposed direction.
6. Scope flags.

Acceptance criteria:

1. Generated content is editable.
2. Generated content is not automatically sent to brand.
3. Scope flags can be resolved manually.
4. AI output is distinguishable from approved final content.

### 19.2 Creator Matching

Purpose:

Recommend creators based on campaign fit, audience, strategic relevance, conversion behavior, and track type.

Inputs:

1. Business Case.
2. Brand/funder context.
3. Campaign objective.
4. Creator profiles.
5. Commercial fit.
6. Grant fit.
7. Brand safety.
8. Conversion behavior.

Outputs:

1. Ranked creator recommendations.
2. Fit rationale.
3. Risk notes.
4. Elimination rationale.

Acceptance criteria:

1. Recommendations are explainable.
2. Grant track uses grant-fit criteria.
3. Low conversion behavior can eliminate candidates.
4. Human admin makes the final selection.

### 19.3 Opportunity Discovery

Purpose:

Help TASCK detect public signals that can become Business Cases.

Inputs:

1. Public web source.
2. Industry signal.
3. Brand/funder names.
4. Cultural relevance.
5. Grant availability.

Outputs:

1. Candidate opportunity.
2. Suggested engagement track.
3. Source evidence.
4. Recommended next action.

Acceptance criteria:

1. Admin can scan for candidates.
2. Admin can accept or reject candidates.
3. Accepted candidates can become Business Cases.
4. Candidate data is not treated as verified client commitment.

### 19.4 Transcript Ingestion

Purpose:

Turn meeting or call transcripts into structured interaction records.

Inputs:

1. Transcript text.
2. Business Case ID.
3. Contact context.

Outputs:

1. Summary.
2. Key intent.
3. Follow-up actions.
4. Qualification signals.

Acceptance criteria:

1. Admin can ingest a transcript.
2. Summary attaches to interaction history.
3. Admin can still manually log interactions.
4. AI summary does not automatically qualify the Business Case without operator action.

### 19.5 Strategy Snapshot Drafting

Purpose:

Help the strategy team produce a brand-facing plan after creator response.

Inputs:

1. Alignment Snapshot.
2. Selected creator.
3. Creative Brief.
4. Creator response.
5. Business Case track.
6. SDF state where applicable.

Outputs:

1. Strategic recommendation.
2. Creator rationale.
3. Campaign mechanics.
4. Deliverable plan.
5. Timeline.
6. Budget context.

Acceptance criteria:

1. Draft is editable before sending.
2. Draft can receive brand comments.
3. Draft approval state is auditable.
4. Draft does not bypass contract gates.

### 19.6 Final Report Generation

Purpose:

Reduce manual closeout effort and standardize reporting.

Inputs:

1. Business Case context.
2. Deliverables.
3. KPI data.
4. Scope changes.
5. Feedback.
6. Track type.

Outputs:

1. Campaign summary.
2. KPI variance.
3. Lessons learned.
4. Creator performance notes.
5. Brand/funder impact notes.

Acceptance criteria:

1. Admin can generate final report.
2. Report is reviewable.
3. Grant-track report includes impact framing.
4. Final report supports closure checklist.

---

## 20. Permissions And Access Model

### 20.1 Admin Access

Admin users can access:

1. All Business Cases.
2. All brands.
3. All creators.
4. Contracts.
5. Invoices.
6. Reports.
7. Tasks.
8. Users.
9. Settings.

Expected restrictions:

1. Destructive production actions should require confirmation.
2. Demo reset should be limited to demo environments.
3. Finance and legal actions should be auditable.

### 20.2 Brand Access

Brand users can access:

1. Their own projects.
2. Their own approvals.
3. Their own documents.
4. Their own invoices.
5. Their own messages.
6. Their own settings.

Brand users must not access:

1. Other brands' records.
2. Internal CRM.
3. Internal creator scoring.
4. Internal opportunity scanner data.
5. Internal brainstorm elimination logic unless shared.
6. Admin finance controls.

### 20.3 Creator Access

Creator users can access:

1. Their own briefs.
2. Their own projects.
3. Their own deliverables.
4. Their own wallet.
5. Their own profile.
6. Their own messages.
7. Their own settings.

Creator users must not access:

1. Other creators' records.
2. Brand invoices.
3. Internal brand CRM.
4. Internal creator scoring.
5. Internal grant or paid pipeline economics unless shared.

### 20.4 Demo Access

Demo access may expose curated representative data. It must be clearly treated as demo data and not production data.

Acceptance criteria:

1. Portal session state determines visible brand data.
2. Creator portal data is scoped to creator context when authentication is implemented.
3. API responses should support future server-side enforcement.
4. Frontend-only hiding is not sufficient for production authorization.

---

## 21. UX And Design Requirements

### 21.1 V3 Tone

The v3 experience should feel:

1. Operational.
2. Editorial.
3. Trustworthy.
4. Calm.
5. High-context.
6. Professional.

It should avoid feeling like:

1. A generic SaaS template.
2. A marketing landing page.
3. A disconnected dashboard collection.
4. A social media app.
5. A heavy enterprise system with no sense of brand.

### 21.2 Visual Direction

The existing v3 direction should preserve:

1. TASCK OS V3 identity.
2. Editorial, document-forward surfaces.
3. Portal-specific navigation.
4. Stage and status badges.
5. Calm action hierarchy.
6. Premium but functional admin density.

Design should make stage state and next action more prominent than decorative content.

### 21.3 Navigation

Requirements:

1. Each portal has a clear sidebar or primary nav.
2. Active section is visible.
3. Exit Portal is always available.
4. Deep routes retain the portal shell.
5. Stage tabs are visually clear on Business Case detail.

Acceptance criteria:

1. User can move between major portal areas without route confusion.
2. Admin does not accidentally enter brand-only views unless intentionally navigating.
3. Brand and creator portals do not show admin navigation.

### 21.4 Status And Badges

Required badge categories:

1. Stage.
2. Track.
3. Health.
4. Approval status.
5. Invoice status.
6. Contract status.
7. Deliverable status.

Acceptance criteria:

1. Badge language is human-readable.
2. Paid and grant tracks are visually distinct.
3. Blocked states are more noticeable than on-track states.
4. Approved/signed/paid states are unmistakable.

### 21.5 Document Review UX

Requirements:

1. Documents render in sections.
2. Comments are tied to sections.
3. Approval actions are clear and final enough to feel meaningful.
4. Brand view hides internal drafting noise.
5. Admin view supports editing and resolution.

Acceptance criteria:

1. Brand can understand what they are approving.
2. Admin can see what comments remain unresolved.
3. Document status updates after action.

### 21.6 Forms

General form requirements:

1. Labels are clear.
2. Required fields are indicated.
3. Validation errors are visible.
4. Submission state is visible.
5. Successful submission gives feedback.
6. Long text inputs are sized appropriately.

Applies to:

1. New Business Case.
2. Add Brand.
3. Public enquiry.
4. Log interaction.
5. Comment forms.
6. Feedback forms.
7. Scope-change forms.
8. Password forms.

---

## 22. Metrics And Reporting

### 22.1 Admin Overview Metrics

Required metrics:

1. Total Business Cases.
2. Business Cases by stage.
3. Paid strategy count.
4. Paid strategy value.
5. Grant count.
6. Grant value.
7. Pending approvals.
8. Pending contracts.
9. Pending invoices.
10. Delivery blockers.

### 22.2 Pipeline Metrics

Required metrics:

1. Connect count.
2. Frame count.
3. Plan count.
4. Deliver count.
5. Closed count.
6. Average days in stage.
7. Stage bottleneck indicators.

### 22.3 Finance Metrics

Required metrics:

1. SDF issued.
2. SDF paid.
3. SDF overdue.
4. Brand invoices outstanding.
5. Creator payments pending.
6. Grant payment/direct-payment notes.

### 22.4 Creator Metrics

Required metrics:

1. Active creators.
2. Creators with active briefs.
3. Creator response rate.
4. Deliverable approval rate.
5. Brand safety flags.
6. Conversion behavior distribution.

### 22.5 Approval Metrics

Required metrics:

1. Pending Alignment Snapshots.
2. Pending Strategy Snapshots.
3. Average approval time.
4. Unresolved comments.
5. Documents sent but not approved.

Acceptance criteria:

1. Metrics are derived from consistent Business Case and artifact records.
2. Metrics distinguish paid and grant tracks where meaningful.
3. Metrics support leadership and daily operating views.

---

## 23. Notifications And Work Cues

### 23.1 Notification Types

Required notification types:

1. Business Case created.
2. Connect qualified.
3. Alignment Snapshot ready.
4. Brand comment received.
5. Alignment Snapshot approved.
6. SDF invoice pending.
7. SDF paid.
8. Creator brief sent.
9. Creator response received.
10. Strategy Snapshot sent.
11. Strategy Snapshot approved.
12. Contract unsigned.
13. Contract signed.
14. Deliverable needs review.
15. Scope change requested.
16. Final report generated.
17. Feedback pending.

### 23.2 Next Action Logic

Each Business Case should expose a next action that is specific and useful.

Examples:

1. Qualify opportunity.
2. Generate Alignment Snapshot.
3. Resolve scope flags.
4. Send snapshot to brand.
5. Wait for brand approval.
6. Run creator brainstorm.
7. Send creator brief.
8. Mark SDF paid.
9. Draft Strategy Snapshot.
10. Generate contracts.
11. Sign contracts.
12. Review deliverable.
13. Approve scope change.
14. Generate final report.
15. Collect feedback.

Acceptance criteria:

1. Next action appears in Business Case list and detail.
2. Next action changes after successful workflow mutations.
3. Blocked next actions should reveal the blocker.

---

## 24. Data Integrity And Validation

### 24.1 Stage Advancement Validation

Rules:

1. Connect -> Frame requires qualified connect status.
2. Frame -> Plan requires approved Alignment Snapshot and resolved scope flags.
3. Plan -> Deliver requires approved Strategy Snapshot and signed contracts.
4. Deliver -> Closed requires closure checklist completion.

Additional track-specific rules:

1. Paid track requires SDF handling according to configured stage policy.
2. Grant track waives SDF gate.

Acceptance criteria:

1. Backend enforces stage gates.
2. Frontend communicates missing requirements before mutation.
3. Failed advancement gives specific error.
4. Successful advancement updates stage and tab state.

### 24.2 Document Status Validation

Rules:

1. Draft documents can be edited.
2. Sent documents can receive comments.
3. Approved documents should not be casually edited without reopening or versioning.
4. Resolved comments should remain visible as history.

Acceptance criteria:

1. Document status transitions are consistent.
2. Approval cannot target the wrong document type.
3. Comments preserve author and section context.

### 24.3 Financial Validation

Rules:

1. Invoice amount must be numeric.
2. Currency must be present.
3. Paid timestamp should exist when invoice is marked paid.
4. Grant waived SDF should not appear as an unpaid invoice.

Acceptance criteria:

1. Mark-paid updates invoice status.
2. Fee gate uses invoice state.
3. Brand invoices are scoped correctly.

### 24.4 Entity Reference Validation

Rules:

1. Business Case must reference a valid brand.
2. Creator reference may be optional before creator selection.
3. Deliverables must reference a Business Case.
4. Contracts must reference a Business Case and party.
5. Comments must reference a valid document.

Acceptance criteria:

1. Invalid IDs return useful errors.
2. Frontend handles missing related records gracefully.
3. Seed data contains no broken references.

---

## 25. Performance Requirements

### 25.1 Frontend

Requirements:

1. V3 role selector should load quickly.
2. Portal shell should remain responsive while data loads.
3. Business Case list should support current seed/demo scale comfortably.
4. Detail pages should avoid unnecessary full-page reloads after mutations.
5. Command search should feel instant for seeded data.

Acceptance criteria:

1. Loading states are visible for async data.
2. Empty states and fallback states avoid layout jumps.
3. Mutations update only the necessary local state or trigger targeted refetch.

### 25.2 Backend

Requirements:

1. List endpoints should return within acceptable demo and staging latency.
2. Detail endpoints should include enough related data to avoid excessive request chains.
3. AI-assisted endpoints may take longer but must show frontend loading state.
4. Demo reset should complete predictably.

Acceptance criteria:

1. API helper detects non-JSON or HTML responses.
2. Backend errors are surfaced with actionable messages.
3. Long-running AI actions do not freeze the UI.

---

## 26. Accessibility Requirements

V3 should meet practical accessibility expectations for an internal and client-facing web application.

Requirements:

1. Keyboard navigation for primary actions.
2. Visible focus states.
3. Sufficient contrast in light and dark mode.
4. Form labels associated with inputs.
5. Buttons use descriptive accessible names.
6. Status badges are not color-only indicators.
7. Modals trap focus where applicable.
8. Error messages are readable and near relevant fields.

Acceptance criteria:

1. Role selector can be navigated by keyboard.
2. Portal navigation can be used by keyboard.
3. Command search can be opened and dismissed predictably.
4. Approval forms are usable without pointer-only interactions.

---

## 27. Security And Privacy Requirements

### 27.1 Authentication

Current v3 demo supports brand login through demo account state. Production requirements:

1. Secure session handling.
2. Password hashing.
3. Password reset.
4. Rate limiting.
5. Secure logout.
6. Server-side account scoping.

### 27.2 Authorization

Production requirements:

1. Admin routes require admin role.
2. Brand routes require brand account role.
3. Creator routes require creator account role.
4. Brand data must be server-scoped by brand account.
5. Creator data must be server-scoped by creator account.

### 27.3 Sensitive Data

Sensitive data includes:

1. Brand commercial terms.
2. Creator payment information.
3. Contract content.
4. Internal scoring.
5. Private strategy notes.
6. Grant funding details.

Requirements:

1. Sensitive fields should not be exposed through the wrong portal.
2. Production logs should avoid leaking sensitive content.
3. AI prompts and outputs should be handled carefully where client data is involved.
4. Demo data should be clearly separated from production data.

---

## 28. QA And Testing Requirements

### 28.1 Smoke Tests

Required smoke coverage:

1. `/v3` role selector renders.
2. Admin portal renders.
3. Brand login renders.
4. Creator portal renders.
5. Business Cases list renders.
6. Business Case detail renders for seed case.
7. Public enquiry renders.

### 28.2 Business Case Lifecycle Tests

Required coverage:

1. Create Business Case.
2. Update connect status.
3. Advance Connect -> Frame only when qualified.
4. Generate Alignment Snapshot.
5. Approve Alignment Snapshot.
6. Resolve scope flags.
7. Advance Frame -> Plan when eligible.
8. Create creative brief.
9. Simulate creator response.
10. Create Strategy Snapshot.
11. Approve Strategy Snapshot.
12. Create and sign contracts.
13. Advance Plan -> Deliver when eligible.
14. Add deliverable.
15. Transition deliverable.
16. Create scope change.
17. Approve scope change.
18. Generate final report.
19. Submit brand feedback.
20. Submit creator feedback.

### 28.3 Brand Portal Tests

Required coverage:

1. Valid demo login.
2. Invalid login error.
3. Change password validation.
4. Brand overview data scoping.
5. Brand approvals list.
6. Section comment creation.
7. Alignment approval.
8. Strategy approval.
9. Document vault data scoping.
10. Invoice data scoping.

### 28.4 Creator Portal Tests

Required coverage:

1. Creator overview renders.
2. Brief inbox renders.
3. Brief detail renders.
4. Projects render.
5. Deliverables render.
6. Wallet renders.
7. Profile renders.
8. Messages render.
9. Settings render.

### 28.5 API Tests

Required coverage:

1. Brands endpoints.
2. Creators endpoints.
3. Business Case endpoints.
4. Stage advancement gates.
5. Snapshot generation/update/comment/approval.
6. Invoice mark-paid.
7. Creative brief and response.
8. Contract create/sign.
9. Deliverable create/transition.
10. Scope change create/approve.
11. Final report generation.
12. Opportunity accept/reject.
13. Demo reset.
14. Admin metrics.

### 28.6 Regression Notes

Known historical validation:

1. Backend and UI flows have previously passed iteration-level checks for the v3 workflow.
2. Business Case lifecycle demo paths have been verified in prior iterations.
3. Current PRD should be used to align future automated tests with the product contract.

Acceptance criteria:

1. Tests cover both happy path and blocked gate conditions.
2. Tests distinguish paid and grant behavior.
3. Tests verify frontend fallback behavior separately from live API behavior.

---

## 29. Release Readiness

### 29.1 V3 Baseline Definition Of Done

V3 baseline is ready when:

1. V3 role selector is accessible.
2. Admin portal shell and navigation are complete.
3. Brand portal shell and navigation are complete.
4. Creator portal shell and navigation are complete.
5. Business Case list and detail workflows are functional.
6. Business Case stage gates are enforced by backend.
7. Paid and grant tracks are represented clearly.
8. Brand approval workflow works for Alignment and Strategy Snapshots.
9. Creator brief and deliverable surfaces are usable.
10. Seed data supports the full demo script.
11. API helper fallback behavior is stable.
12. Admin metrics load.
13. No critical route crashes exist.
14. Basic accessibility expectations are met.
15. Known backend/UI mismatch on SDF gate is resolved or documented with product-approved behavior.

### 29.2 Demo Readiness Checklist

Before a live stakeholder demo:

1. Confirm frontend builds.
2. Confirm backend starts.
3. Reset v3 demo seed state.
4. Open `/v3`.
5. Verify Admin Control Centre entry.
6. Verify Business Cases list.
7. Open `bc-nb-flagship`.
8. Walk through stage tabs.
9. Show paid strategy workflow.
10. Show grant workflow.
11. Log into Brand Portal.
12. Show pending approvals.
13. Add a brand comment.
14. Approve a document.
15. Show Creator Portal brief inbox.
16. Show deliverables and wallet.
17. Return to admin reports or insights.

### 29.3 Production Readiness Checklist

Before production rollout:

1. Replace demo auth with secure authentication.
2. Enforce server-side authorization.
3. Replace simulated email sending with production email integration.
4. Replace simulated AI with configured production AI service.
5. Add audit logs for approvals, signatures, and finance actions.
6. Confirm data backup and migration plan.
7. Confirm legal review for contracts.
8. Confirm finance review for invoices and wallet.
9. Confirm privacy handling for creator and brand data.
10. Confirm monitoring and error reporting.

---

## 30. Roadmap Beyond V3

### 30.1 V3.1 Candidates

1. Reconcile SDF gate behavior across backend and frontend.
2. Improve mobile responsiveness for portal layouts.
3. Add richer creator authentication.
4. Add stronger brand account management.
5. Add production email sending.
6. Add audit log panel in Business Case detail.
7. Add exportable final reports.
8. Add document version history.

### 30.2 V3.2 Candidates

1. Live AI provider integration for alignment and strategy.
2. More advanced opportunity scanning.
3. Creator availability calendar.
4. Brand approval reminders.
5. Creator response reminders.
6. Finance reconciliation views.
7. Contract template editor.
8. Multi-user internal assignments.

### 30.3 V4 Candidates

1. Separate grant funder portal.
2. External e-signature integration.
3. WhatsApp and email conversation ingestion.
4. Creator public onboarding.
5. Advanced permissions.
6. Multi-currency finance.
7. Enterprise brand account hierarchy.
8. Marketplace-style creator sourcing.
9. Mobile-first creator application.
10. Advanced BI and forecasting.

---

## 31. Key Risks And Mitigations

### 31.1 SDF Gate Ambiguity

Risk:

Backend and frontend language may disagree about when the Strategy Development Fee is required.

Mitigation:

Define the approved business rule. Current UX indicates SDF is handled in Plan after creator brief and before external Strategy Snapshot sharing. Backend advancement rules should be updated to match this policy or the UI should be changed to match backend policy.

### 31.2 Demo Fallback Confusion

Risk:

Users may believe fallback demo mutations are production-persisted.

Mitigation:

Clearly label demo mode where appropriate and avoid using fallback persistence as a substitute for production confirmation.

### 31.3 Portal Data Leakage

Risk:

Brand or creator portals may expose internal admin data if scoping is only handled client-side.

Mitigation:

Production server-side authorization must scope every response by authenticated user.

### 31.4 AI Trust

Risk:

AI-generated strategy content may be treated as final without human review.

Mitigation:

Keep all AI output in draft/review states until explicitly approved or sent by an admin.

### 31.5 Workflow Complexity

Risk:

The Business Case lifecycle may feel heavy for smaller opportunities.

Mitigation:

Allow lightweight cases to move through simplified paths while preserving core audit gates for approvals, contracts, and finance.

### 31.6 Grant And Paid Track Divergence

Risk:

Grant workflows may diverge enough from paid workflows that shared UI becomes confusing.

Mitigation:

Use track-aware copy, gates, metrics, and finance labels. Avoid forcing grant work into paid invoice patterns.

---

## 32. Open Questions

1. What is the final approved SDF timing rule for paid strategy work?
2. Should the grant funder become a distinct portal in V3.x or wait for V4?
3. Which contract signing provider should be integrated first?
4. Should creator wallet show estimated payment dates or only confirmed payment states?
5. Should brand comments reopen approved documents or create new versions?
6. Should Business Case health be manually set, automatically calculated, or hybrid?
7. What internal roles should exist beyond Admin and Relationship Manager?
8. Which AI workflows require audit logging of prompt, input, and output?
9. Which reports need export to PDF, DOCX, or Google Docs first?
10. Should public brand enquiry immediately create a CRM record, opportunity candidate, or draft Business Case?
11. What data should be visible to creators before contract signature?
12. What is the minimum production authorization model for first external client use?

---

## 33. Acceptance Summary

V3 is accepted when a TASCK operator can:

1. Enter the Admin Control Centre.
2. View all Business Cases.
3. Create a new paid or grant Business Case.
4. Move a Business Case from Connect through Closure using explicit gates.
5. Generate and approve alignment and strategy artifacts.
6. Match creators and send briefs.
7. Track SDF or grant fee behavior correctly.
8. Generate and sign contracts.
9. Track deliverables and scope changes.
10. Generate final reports and capture feedback.
11. See meaningful metrics across the operating system.

V3 is accepted when a brand user can:

1. Log into the Brand Portal.
2. View their own projects.
3. Review pending approvals.
4. Comment on document sections.
5. Approve documents.
6. View documents and invoices.
7. Message TASCK.
8. Manage basic account settings.

V3 is accepted when a creator user can:

1. Enter the Creator Portal.
2. View brief inbox.
3. View assigned projects.
4. Track deliverables.
5. See wallet/payment state.
6. Maintain profile context.
7. Message TASCK.

V3 is accepted when the system can:

1. Use seeded demo data to tell a complete paid and grant workflow story.
2. Recover gracefully from backend unavailability in demo contexts.
3. Enforce critical stage gates through backend logic.
4. Keep brand, creator, and admin experiences meaningfully separated.
5. Provide a strong foundation for production authentication, authorization, AI, contracts, messaging, and finance integrations.

---

## 34. Reference Demo Script

### 34.1 Admin Paid Strategy Demo

1. Open `/v3`.
2. Select Admin Control Centre.
3. Open Business Cases.
4. Show total, paid, grant, and stage metrics.
5. Open `Star Originals - A Lagos After-Dark Anthology`.
6. Show header: paid track, creator, stage, value, next action.
7. Walk through Connect tab and interaction history.
8. Show Frame tab and Alignment Snapshot.
9. Explain comments, scope flags, and approval gate.
10. Show Plan tab.
11. Show creator brainstorm and selected creator.
12. Show Creative Brief and Strategy Snapshot.
13. Show SDF invoice state.
14. Show contracts.
15. Show Deliver tab and deliverables.
16. Show scope-change handling.
17. Show Closure tab and final reporting path.

### 34.2 Grant Track Demo

1. Return to Business Cases.
2. Filter by grant track.
3. Open OSF grant Business Case.
4. Show grant label.
5. Explain SDF waiver.
6. Show mission/impact alignment.
7. Show creator fit for grant work.
8. Show final reporting expectations.

### 34.3 Brand Portal Demo

1. Return to `/v3`.
2. Open Brand Portal.
3. Use demo credentials.
4. Show brand overview.
5. Open approvals.
6. Select a pending Alignment or Strategy Snapshot.
7. Add a section comment.
8. Approve the document.
9. Show document vault.
10. Show invoices.

### 34.4 Creator Portal Demo

1. Return to `/v3`.
2. Open Creator Portal.
3. Show creator overview.
4. Open Brief Inbox.
5. Show awaiting/responded states.
6. Open projects.
7. Open deliverables.
8. Show wallet.
9. Show profile.
10. Show messages.

---

## 35. Final Product Statement

TASCK OS V3 is the first version where the product fully behaves like an operating system for TASCK's business. It gives internal teams a command centre, gives brands a focused approval and visibility portal, gives creators a professional work portal, and ties the entire lifecycle together through Business Cases.

The core value of V3 is clarity. Every opportunity has a stage. Every stage has gates. Every gate has artifacts. Every stakeholder has a portal. Every major action leaves a trail. That is the foundation TASCK needs to scale creative partnerships with less ambiguity, stronger trust, and more repeatable execution.
