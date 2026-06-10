# TASCK OS v2 Product Requirements Document

**Document version:** 1.0  
**Product version:** TASCK OS v2 Next  
**Date:** 2026-06-02  
**Company:** The TASCK Agency  
**Primary audience:** Product, engineering, design, demo operations, leadership, investors, brand partners  
**Document purpose:** Define the full v2 product scope, AI-native experience model, command-center requirements, planned portal expansion, data assumptions, non-functional requirements, QA plan, and release criteria.

---

## 1. Executive Summary

TASCK OS v2 is the AI-native evolution of TASCK OS. Where v1 proves that TASCK can operate creator partnerships through structured role-based portals, v2 shows the next product ambition: a command center that helps TASCK see opportunities before competitors, prioritize actions, simulate deal outcomes, visualize the network, and monitor operations in near real time.

V2 is positioned as "Next Gen" inside the product. It uses a dark, dense, command-center interface and organizes the experience into three portals:

- TASCK Command
- Brand Portal
- Talent Network

The current v2 implementation is strongest in the TASCK Command portal. It includes:

- AI-style daily briefing.
- Market signal intelligence feed.
- Multi-view pipeline.
- Deal room with scenario simulator.
- Relationship ecosystem graph.
- Live mission-control screen.
- Natural-language command bar and Cmd/Ctrl+K command modal.

The Brand Portal and Talent Network are routed and visually framed but currently use placeholder pages for most experiences. The v2 PRD therefore covers two layers:

1. **Implemented v2 scope:** the working command-center demo experience that exists today.
2. **Target v2 scope:** the fuller AI-native product that should complete Brand and Talent portals and deepen automations, revenue intelligence, messaging, and production data integrations.

V2 should feel like TASCK's operational brain. It should not merely report what already happened; it should surface what matters, recommend what to do next, and let users manipulate scenarios before committing time, budget, or talent.

---

## 2. Product Context

### 2.1 Relationship To TASCK OS V1

TASCK OS v1 is the classic operating platform. It is role-based, workflow-oriented, and built around familiar SaaS dashboards.

TASCK OS v2 is the next interface layer. It asks: what happens when TASCK's structured operating data becomes an intelligence system?

V2 should:

- Reduce staff dependency on manual scanning.
- Turn weak signals into actionable deal leads.
- Present pipeline health as a living system.
- Let staff simulate commercial outcomes before negotiating.
- Make the brand/talent ecosystem visible as a graph.
- Support real-time operational awareness.
- Make AI feel embedded in the workflow, not bolted on.

### 2.2 Core Problem

Premium creator partnerships move quickly. Brands change budgets, executives move, agencies lose accounts, trademarks are filed, campaign spend spikes, artists become available, and negotiation windows close. In a traditional CRM, TASCK can record this information, but still has to manually decide:

- Which signal matters?
- Which brand should be pursued now?
- Which creative is the best commercial match?
- Which deal deserves senior attention?
- Which negotiation path has the best expected value?
- Which project or contract is at risk?
- Which team member should take action?

V2 addresses this by making intelligence and decision support the primary product experience.

### 2.3 Product Thesis

The winning platform in African creator commerce will not only store campaigns. It will predict, recommend, and orchestrate. TASCK OS v2 should demonstrate that TASCK can become the intelligence layer between brands, culture, creative talent, and money movement.

---

## 3. Product Vision

### 3.1 Vision Statement

TASCK OS v2 is an AI-native command center for creator commerce, helping TASCK detect commercial opportunities, make better deal decisions, coordinate talent, and manage live operations across the African creative economy.

### 3.2 Experience Principles

1. **Brief before browse.** Users should see the most important decisions first, not hunt through pages.
2. **Signals over static records.** The product should surface meaningful changes in market, brand, talent, and pipeline state.
3. **Prediction with context.** Confidence scores, estimated value, match scores, and probability should be explained through business context.
4. **Simulation before commitment.** Staff should be able to adjust deal assumptions and see revenue, expected value, payout, and velocity instantly.
5. **Network visibility.** Relationships between brands, TASCK, and creatives should be visually inspectable.
6. **Live operations.** The command portal should feel active, with current time, streaming-like event feeds, team presence, and changing operational metrics.
7. **Dense but legible.** V2 should support high information density without becoming visually noisy.

### 3.3 V2 Product Promise

TASCK OS v2 helps users answer:

- What should I focus on today?
- Which signals point to new revenue?
- Which deals are highest value, highest probability, or at risk?
- What happens if we change commission, creative payout, close probability, or timeline?
- Which brands and creatives are most connected to TASCK?
- What is happening in operations right now?
- Which next action should the system recommend?

---

## 4. Goals And Non-Goals

### 4.1 Product Goals

1. Demonstrate a premium AI-native direction for TASCK OS.
2. Provide a working command center that goes beyond dashboards into decision support.
3. Show how market intelligence can generate deal leads.
4. Show how AI can prioritize daily work for senior TASCK agents.
5. Provide multi-modal pipeline views for different operational questions.
6. Provide a deal simulator with real calculations.
7. Visualize the TASCK ecosystem using an interactive force-directed graph.
8. Provide a live mission-control screen for demo impact.
9. Establish routed portal shells for Brand Portal and Talent Network expansion.
10. Preserve access to the global feedback system from the overall app.

### 4.2 Demo Goals

The v2 demo should allow a presenter to:

1. Enter `/v2` and show three AI-native portals.
2. Select TASCK Command and auto-login as staff.
3. Open Command Center and explain daily briefing, priorities, signals, pipeline, and Copilot.
4. Open Intelligence and show market signals, confidence, industry pulse, and best creative matches.
5. Open Pipeline and switch between Kanban, Flow, and Timeline.
6. Open Deals and show the simulator.
7. Open Network and demonstrate brand/creative relationship graph filters.
8. Open Live Command and show mission-control metrics and event feed.
9. Visit Brand Portal and Talent Network placeholders to communicate planned v2 expansion.

### 4.3 Non-Goals For Current V2 Demo

Current v2 is not required to ship:

- Real LLM execution.
- Real signal ingestion from web, filings, social ad platforms, job boards, or news feeds.
- Real production CRM writes from v2 pages.
- Real deal creation from signals.
- Real conversational search execution.
- Real brand portal v2 pages.
- Real talent network v2 pages.
- Real-time websocket event stream.
- Production authentication or authorization.
- Production financial forecasting.
- Real graph data from the database.

These are future production or Phase C targets.

---

## 5. Current Implementation Status

### 5.1 V2 Status Summary

| Area | Status | Notes |
|---|---|---|
| V2 role selector | Built | Three role cards with auto-login and routing. |
| V2 layout | Built | Dark shell, expanding sidebar, top command trigger, command modal, live button. |
| TASCK Command portal | Partially built | Six major pages built; remaining command pages are placeholders. |
| Command Center | Built | Daily briefing, priorities, signals, deal movement, pipeline snapshot, Copilot. |
| Intelligence Center | Built | Signal feed, type filters, AI analysis, best matches, industry pulse, spending calendar. |
| Pipeline | Built | Kanban, Flow, and Timeline views. |
| Deal Room | Built | Deals list and scenario simulator. |
| Network | Built | Force-directed graph with filters and detail popups. |
| Live Command | Built | Mission-control metrics, event feed, revenue target, team activity, Copilot status. |
| V2 Brand Portal | Placeholder | Routes exist; pages are planned. |
| V2 Talent Network | Placeholder | Routes exist; pages are planned. |
| V2 backend integration | Mostly mocked | Pages use static/inline data and existing demo auth. |
| V2 AI integration | Simulated | AI outputs are deterministic/static for demo. |

### 5.2 Built Routes

| Route | Portal | Status | Purpose |
|---|---|---|---|
| `/v2` | Entry | Built | V2 role selector. |
| `/v2/command` | TASCK Command | Built | Daily briefing and operating priorities. |
| `/v2/command/signals` | TASCK Command | Built | Market intelligence signal feed. |
| `/v2/command/pipeline` | TASCK Command | Built | Pipeline Kanban, Flow, Timeline. |
| `/v2/command/deals` | TASCK Command | Built | Deal list and simulator. |
| `/v2/command/network` | TASCK Command | Built | Ecosystem graph. |
| `/v2/command/live` | TASCK Command | Built | Live mission control. |
| `/v2/command/projects` | TASCK Command | Placeholder | Future project intelligence. |
| `/v2/command/talent` | TASCK Command | Placeholder | Future talent command view. |
| `/v2/command/revenue` | TASCK Command | Placeholder | Future revenue intelligence. |
| `/v2/command/messages` | TASCK Command | Placeholder | Future messaging. |
| `/v2/command/automations` | TASCK Command | Placeholder | Future automation builder. |
| `/v2/command/settings` | TASCK Command | Placeholder | Future v2 settings. |
| `/v2/brand` | Brand Portal | Placeholder | Future brand overview. |
| `/v2/brand/campaigns` | Brand Portal | Placeholder | Future campaign management. |
| `/v2/brand/approvals` | Brand Portal | Placeholder | Future approvals. |
| `/v2/brand/discover` | Brand Portal | Placeholder | Future talent discovery. |
| `/v2/brand/analytics` | Brand Portal | Placeholder | Future analytics. |
| `/v2/brand/spend` | Brand Portal | Placeholder | Future spend tracking. |
| `/v2/brand/messages` | Brand Portal | Placeholder | Future messaging. |
| `/v2/brand/settings` | Brand Portal | Placeholder | Future brand settings. |
| `/v2/talent` | Talent Network | Placeholder | Future talent overview. |
| `/v2/talent/opportunities` | Talent Network | Placeholder | Future opportunities. |
| `/v2/talent/projects` | Talent Network | Placeholder | Future projects. |
| `/v2/talent/wallet` | Talent Network | Placeholder | Future wallet. |
| `/v2/talent/portfolio` | Talent Network | Placeholder | Future portfolio. |
| `/v2/talent/analytics` | Talent Network | Placeholder | Future talent analytics. |
| `/v2/talent/messages` | Talent Network | Placeholder | Future messaging. |
| `/v2/talent/settings` | Talent Network | Placeholder | Future settings. |

---

## 6. Target Users And Personas

### 6.1 TASCK Command User

**Persona:** Senior agent, head of deals, strategy lead, internal operator.  
**Example user:** Tunde Balogun.  
**Primary motivation:** Identify, pursue, and close the highest-value brand partnerships.  
**Primary pain:** Pipeline, market activity, talent availability, and negotiation details move faster than manual tracking can handle.  
**Success state:** User starts the day with a ranked briefing, knows which deals require action, sees new market signals, and can simulate deal outcomes before deciding.

### 6.2 Brand Portal User

**Persona:** Marketing director, head of culture, brand lead, procurement-adjacent stakeholder.  
**Example user:** Adenike Ogunlesi, Guinness Nigeria.  
**Primary motivation:** Understand campaign health, approvals, ROI, and partnership value.  
**Primary pain:** Brand partners often lack live visibility once campaigns enter agency operations.  
**Success state:** User can see campaign health, approval queue, ROI forecasts, spend, and AI recommendations for future creative partners.

### 6.3 Talent Network User

**Persona:** Creative freelancer or team member using TASCK to grow career opportunities.  
**Example user:** Kelechi Amadi-Obi.  
**Primary motivation:** Find better-fit opportunities, build reputation, and maximize earnings.  
**Primary pain:** Creatives need clarity on match quality, demand signals, project status, and career progression.  
**Success state:** User sees AI-matched opportunities, skills in demand, earnings trajectory, portfolio health, and project status.

### 6.4 TASCK Leadership

**Persona:** Founder, managing director, operating partner, investor-facing executive.  
**Primary motivation:** See whether TASCK's business is healthy and scalable.  
**Primary pain:** Static dashboards do not reveal enough about growth, risk, market timing, and team execution.  
**Success state:** Leadership can use V2 Live Command and Command Center to understand business momentum, revenue target progress, operational risk, and strategic opportunities.

---

## 7. Information Architecture

### 7.1 Entry Flow

```text
/                  Landing page
/select            Version selector
/v2                V2 role selector
  /v2/command      TASCK Command portal
  /v2/brand        Brand Portal shell
  /v2/talent       Talent Network shell
```

### 7.2 V2 Role Selector Requirements

The V2 role selector must:

- Render a dark, premium, AI-native entry screen.
- Include a back link to `/select`.
- Show TASCK logo.
- Show `v2.0` and `NEXT GEN` indicators.
- Present three role cards:
  - TASCK Command
  - Brand Portal
  - Talent Network
- Each card must include:
  - Portal title.
  - Subtitle/persona.
  - Demo user identity.
  - Short product description.
  - Accent color.
  - Feature chips.
  - Loading state while auto-login is in progress.
- Clicking a card must call demo login with the mapped role and navigate to the mapped route.

Role mapping:

| Card | Demo role | Demo user | Route | Accent |
|---|---|---|---|---|
| TASCK Command | `staff` | Tunde Balogun | `/v2/command` | Blue |
| Brand Portal | `brand` | Adenike Ogunlesi, Guinness Nigeria | `/v2/brand` | Green |
| Talent Network | `creative` | Kelechi Amadi-Obi | `/v2/talent` | Amber |

Acceptance criteria:

- All role cards navigate correctly.
- Loading spinner appears on the selected card only.
- Failed login does not leave the selector permanently disabled.
- The UI clearly communicates that v2 is AI-native and next-generation.

### 7.3 V2 Layout Requirements

The V2 layout must provide:

- Full-screen dark shell.
- Fixed icon sidebar.
- Sidebar collapsed width of approximately 60px.
- Sidebar expanded width of approximately 200px on hover.
- Sidebar labels hidden while collapsed and visible when expanded.
- Top command bar.
- User/avatar cluster.
- Online team preview.
- Notification icon with unread indicator.
- Portal-specific navigation.
- Command modal opened by click or Cmd/Ctrl+K.
- Escape key closes command modal.
- For TASCK Command only, a Live button at bottom of sidebar routing to `/v2/command/live`.
- Logout button routing to `/`.

Portal labels in top bar:

- `TASCK COMMAND`
- `BRAND PORTAL`
- `TALENT NETWORK`

Command placeholder rotation:

- "Show me deals closing this week"
- "Find photographers in Lagos rated 4.8+"
- "What's Burna Boy's total revenue?"
- "Create a deal for MTN with Tems"
- "Which artists have no active deals?"
- "Show pipeline by industry"

Acceptance criteria:

- Sidebar expansion shifts the main content on desktop.
- The active navigation item is visually distinct.
- Command modal input auto-focuses.
- Command modal shows quick actions.
- The Live button appears only for TASCK Command.

---

## 8. TASCK Command Portal Requirements

## 8.1 Command Center

### 8.1.1 Purpose

The Command Center is the v2 home screen. It should not behave like a generic dashboard. It should behave like a daily AI briefing for a senior TASCK operator.

The screen should answer:

- What is the current revenue pulse?
- What are today's top three priorities?
- Which new signals were detected?
- What happened in the deal pipeline recently?
- How is the pipeline distributed?
- What does Copilot recommend?

### 8.1.2 Layout

The Command Center uses a two-zone layout:

- Left zone: briefing content and major operational feed.
- Right zone: pipeline snapshot and Copilot.

Desktop distribution should approximate:

- Left zone: 60 percent.
- Right zone: 40 percent.

### 8.1.3 Header Requirements

The header must:

- Show `DAILY BRIEFING`.
- Show a time-aware greeting such as "Good morning, Tunde."
- Show the current formatted date.

Acceptance criteria:

- Greeting changes based on current hour.
- Header copy is concise and visible above the first card.

### 8.1.4 Revenue Pulse Requirements

Revenue Pulse must:

- Show current revenue YTD.
- Show target.
- Show current percentage toward target.
- Explain projected shortfall or upside in natural language.
- Highlight a key deal that could change the forecast.
- Include a progress bar from 0 to target.
- Show the current position on the bar.

Current demo values:

- Revenue YTD: NGN 234.8M.
- Target: NGN 500M.
- Current progress: 47 percent.
- Important upside deal: Coca-Cola, NGN 150M.

Acceptance criteria:

- Revenue data must be understandable without hovering.
- Important revenue numbers should use strong visual hierarchy.
- The progress bar should not be purely decorative; it must correspond to the displayed 47 percent.

### 8.1.5 Today's Priorities Requirements

The priorities block must:

- Show exactly three priority items in the default briefing.
- Rank items with visible numeric ordering.
- Include title, detail, urgency, deal name, value, and recommended action.
- Support opening a detail popup when clicked.

Current demo priorities:

| Rank | Priority | Deal | Value | Action |
|---|---|---|---:|---|
| 1 | Close the Guinness contract | Guinness x Burna Boy | NGN 45M | Draft Follow-Up |
| 2 | Respond to MTN's counter-offer | MTN x Tems | NGN 62M counter | Open Deal Simulator |
| 3 | Review Coca-Cola proposal | Coca-Cola Coke Studio | NGN 150M | Review Draft Proposal |

Acceptance criteria:

- High urgency items are visually stronger than medium priority.
- Clicking a priority opens a detail popup with deal value, detail, and CTA.
- Recommended action text is visible on hover or persistent depending on viewport.

### 8.1.6 Signals Detected Requirements

Signals Detected must:

- Show newly detected signals.
- Include signal type, source, title, confidence, estimated value, age, and color status.
- Show a count of new signals.
- Support detail popup.

Current demo signals:

- Star Lager trademark for "Star Music Live", 92 percent confidence, NGN 80-120M estimated.
- Access Bank earnings-call anniversary marketing signal, 87 percent confidence, NGN 40-60M estimated.
- Flutterwave creator partnerships job posting, 84 percent confidence, NGN 25-40M estimated.

Acceptance criteria:

- Confidence and estimated value are visible on each signal.
- Signal type is visually encoded.
- Signals can be investigated from the UI.

### 8.1.7 Deal Movement Requirements

Deal Movement must:

- Show recent deal events from the last 48 hours.
- Include time, event text, type, and associated deal.
- Use status dots/icons for success, warning, info, and error.
- Support opening detail popup.

Example event types:

- Budget approved.
- Counter-offer received.
- Proposal deadline confirmed.
- Deal signed.
- Deal lost.
- Escrow released.

Acceptance criteria:

- Events are sorted most recent first.
- Warning and error events are visually distinct.
- The event list should be compact and scannable.

### 8.1.8 Pipeline Snapshot Requirements

Pipeline Snapshot must:

- Show stage distribution across the whole pipeline.
- Render a proportional funnel/bar using stage values.
- Show stage legend.
- Show each stage with count and value.
- Show total pipeline, weighted pipeline, and average close time.
- Support stage detail popup.

Required stages:

- Lead
- Discovery
- Scoping
- NDA
- Terms
- Active
- Closed

Current demo totals:

- Total pipeline: derived from stages.
- Weighted pipeline: NGN 412.5M.
- Average close: 34 days.

Acceptance criteria:

- Stage widths correspond to stage value share.
- Stage counts and values are visible.
- Stage detail popup shows deal count and value.

### 8.1.9 Copilot Requirements

The Copilot panel must:

- Show an active AI status indicator.
- Display AI-style messages about pipeline and signals.
- Provide quick reply chips.
- Provide text input for natural-language query.
- Simulate processing through detail popup or placeholder response.

Quick replies:

- Draft MTN response.
- Tell me about Star Lager.
- Show pipeline changes.

Acceptance criteria:

- Copilot feels integrated into the command center, not a separate help widget.
- Quick replies should be business-specific.
- Input exists even if real AI execution is not implemented.

---

## 8.2 Intelligence Center

### 8.2.1 Purpose

The Intelligence Center turns external and internal market signals into potential TASCK deal opportunities. It is the core proof point for v2's AI-native premise.

The page should answer:

- What market signals has TASCK detected?
- Which are high-confidence?
- What is the estimated deal value?
- Which industry is heating up?
- Which creatives are best matched?
- What seasonal spending windows are approaching?

### 8.2.2 Signal Feed Requirements

The signal feed must:

- Show all detected signals.
- Support filtering by signal type.
- Display confidence scores.
- Display estimated value.
- Display signal age.
- Display industry.
- Include AI analysis text.
- Include best creative matches with match scores.
- Provide actions:
  - Create Deal.
  - Assign.
  - Watch.
  - Dismiss.
- Support detail popup.

Supported signal types:

- All.
- Trademark.
- Earnings.
- Job Posting.
- Ad Spend.
- Executive.
- Event.
- Product Launch.
- Competitor.
- Dissolution.

Current demo signals include:

- Nigerian Breweries / Star Lager trademark.
- Access Bank anniversary marketing spend.
- Flutterwave Creator Partnerships Lead role.
- Pepsi ad spend increase.
- GTBank marketing leadership change.
- Lagos Fashion Week sponsor window.
- Dangote consumer brand launch.
- Boomplay and Sony distribution signal.
- MTN Pulse Music trademark renewal.
- Airtel agency dissolution.
- Coca-Cola Coke Studio ad spend increase.
- Indomie Gen-Z brand manager.

Acceptance criteria:

- Filtering updates the visible signal list.
- Each filter chip includes count.
- High confidence signals should stand out.
- Each signal includes AI analysis and match list.
- Detail popup includes confidence, estimated value, and analysis.

### 8.2.3 Best Match Requirements

Each signal must show creative/talent matches.

Match rows must include:

- Talent name.
- Avatar or initials.
- Match score.
- Visual match bar.

Acceptance criteria:

- Match score bar width reflects score.
- At least three matches are shown for major signals.
- Matches should be culturally and commercially plausible.

### 8.2.4 Industry Pulse Requirements

Industry Pulse must:

- Show industries with signal count, active count, trend state, and color.
- Use a progress bar or intensity bar for signal volume.
- Support popup with total signals and active count.

Industries:

- Telecoms.
- FMCG.
- Banking.
- Tech.
- Entertainment.
- Alcohol.

Acceptance criteria:

- Heating industries are visually distinct from stable industries.
- Popup includes trend summary.

### 8.2.5 Spending Calendar Requirements

The Spending Calendar must:

- Show seasonal campaign windows.
- Include period, label, and intensity.
- Highlight peak periods.

Current demo windows:

- February: Valentine Campaigns.
- March-April: Easter / Ramadan.
- June: Mid-Year Budget Refresh.
- August: Back-to-School.
- October-December: Festive Peak.

Acceptance criteria:

- The peak period is visibly emphasized.
- Intensity bars reflect relative opportunity.

### 8.2.6 Signal Stats Requirements

Signal Stats must show:

- Signals this week.
- High-confidence signals.
- Converted signals.
- Estimated value.

Current demo values:

- This week: 7.
- High confidence: 5.
- Converted: 3.
- Estimated value: NGN 680M.

---

## 8.3 Deal Pipeline

### 8.3.1 Purpose

The v2 Pipeline page provides three different mental models for pipeline management:

- **Kanban:** What stage is every deal in?
- **Flow:** Where does pipeline convert or drop off?
- **Timeline:** What happens when, and which deadlines are approaching?

### 8.3.2 Header Requirements

The header must:

- Show `PIPELINE`.
- Show page title `Deal Pipeline`.
- Show total deal count.
- Show total value.
- Show weighted value.
- Provide segmented controls for:
  - Kanban.
  - Flow.
  - Timeline.

Acceptance criteria:

- Switching views updates content without navigation.
- Active view is visibly selected.

### 8.3.3 Pipeline Data Requirements

Each deal must include:

- Deal ID.
- Brand.
- Creative.
- Title.
- Value.
- Stage.
- Probability.
- Days in stage.
- Owner.
- Start date.
- Deadline.
- Health.

Required stage set:

- Lead.
- Discovery.
- Scoping.
- NDA.
- Terms.
- Active.
- Closed.

Health values:

- New.
- On-track.
- At-risk.
- Completed.

### 8.3.4 Kanban View Requirements

Kanban view must:

- Group deals by stage.
- Show stage label, count, and total value.
- Show compact deal cards.
- Include deal ID, health indicator, brand, title, value, probability, owner avatar, and days in stage.
- Provide empty state for stages with no deals.
- Support deal detail popup.

Acceptance criteria:

- Columns are horizontally scrollable.
- Deal card health is visually encoded.
- Deal popup shows value, probability, title, stage, creative, owner, days in stage, deadline, and CTA.

### 8.3.5 Flow View Requirements

Flow view must:

- Show top stats:
  - Conversion Rate.
  - Average Cycle Time.
  - Drop-off Peak.
  - Velocity.
- Render a Sankey-style flow visualization using SVG.
- Show stage columns with count.
- Show stage values inside the visualization.
- Show drop-off indicators where later stage count is lower than previous stage count.
- Show Stage Transitions list with conversion bars and count changes.

Current demo stats:

- Conversion Rate: 34 percent.
- Average Cycle Time: 42 days.
- Drop-off Peak: Discovery.
- Velocity: NGN 47.2M/month.

Acceptance criteria:

- Flow visualization is visible and nonblank.
- Stage transition conversion bars correspond to counts.
- Drop-off indicators are readable.

### 8.3.6 Timeline View Requirements

Timeline view must:

- Show month headers from January through August.
- Sort deals by value descending.
- Render a horizontal timeline bar for each deal based on start and deadline months.
- Show current/today marker.
- Show approaching deadlines list.
- Highlight deadlines with urgency based on days left.

Acceptance criteria:

- Timeline bars align to month grid.
- Approaching deadlines are sorted by deadline.
- Urgent deadlines are visually distinct.

---

## 8.4 Deal Room

### 8.4.1 Purpose

The Deal Room supports two related jobs:

- Review active deals in a compact list.
- Simulate deal economics under different commercial assumptions.

### 8.4.2 Tabs

The Deal Room must include two tabs:

- Deals.
- Simulator.

Acceptance criteria:

- Deals tab is default.
- Simulator tab preserves selected deal and parameters.

### 8.4.3 Deals List Requirements

The Deals list must:

- Show active deals.
- Include ID, type, stage, brand, creative, title, value, probability, and owner avatar.
- Support detail popup.
- Include "Open in Simulator" CTA from popup.

Acceptance criteria:

- Clicking "Open in Simulator" switches tab and preloads the selected deal.
- Deal rows remain compact enough for high-density scanning.

### 8.4.4 Simulator Requirements

The simulator must:

- Let user select a deal.
- Provide sliders for:
  - Deal Value.
  - TASCK Commission.
  - Creative Payout.
  - Close Probability.
  - Close Timeline.
- Update outputs in real time.
- Show selected deal context.
- Show simulation output.
- Show value distribution bar.
- Show AI recommendation.
- Show quick scenario presets.

Slider ranges:

| Parameter | Minimum | Maximum | Step |
|---|---:|---:|---:|
| Deal Value | NGN 5M | NGN 300M | NGN 5M |
| TASCK Commission | 5 percent | 30 percent | 1 percent |
| Creative Payout | 50 percent | 90 percent | 5 percent |
| Close Probability | 5 percent | 100 percent | 5 percent |
| Close Timeline | 7 days | 180 days | 7 days |

### 8.4.5 Simulator Calculations

The simulator must calculate:

```text
tasck_revenue = deal_value * commission_percent
creative_payout = deal_value * creative_payout_percent
expected_value = tasck_revenue * close_probability
monthly_velocity = tasck_revenue / max(close_timeline_days / 30, 1)
```

All percentages are expressed as decimal fractions in calculations.

Output metrics:

- TASCK Revenue.
- Expected Value.
- Creative Payout.
- Monthly Velocity.

Acceptance criteria:

- Slider changes immediately update output.
- Output numbers use compact Naira formatting.
- Expected value must reflect close probability.
- Monthly velocity must reflect timeline.

### 8.4.6 Value Distribution Requirements

Value Distribution must:

- Show TASCK share.
- Show Creative share.
- Show remaining operational share.
- Use a horizontal segmented bar.

Acceptance criteria:

- TASCK segment width reflects commission.
- Creative segment width reflects creative payout.
- Remaining segment fills the rest of the bar.

### 8.4.7 AI Recommendation Requirements

AI Recommendation must:

- Interpret close probability.
- Recommend proceeding for high-probability deals.
- Recommend more engagement for moderate-probability deals.
- Warn against low-probability deals.
- Show alert for close probability below 40 percent.

Acceptance criteria:

- Recommendation copy changes when close probability changes.
- Low probability state includes visible warning.

### 8.4.8 Quick Scenario Presets

Quick scenarios:

- Conservative.
- Base Case.
- Aggressive.

Preset behavior:

- Conservative lowers commission and probability.
- Base Case returns to current selected deal assumptions.
- Aggressive raises commission and probability.

Acceptance criteria:

- Clicking a preset updates sliders and outputs.
- Probability is clamped between 5 percent and 100 percent.

---

## 8.5 Ecosystem Graph

### 8.5.1 Purpose

The Ecosystem Graph visualizes the relationship network between brands, TASCK, and creatives. It helps users see concentration, active deals, connectedness, and commercial value.

### 8.5.2 Graph Requirements

The graph must:

- Use `react-force-graph-2d`.
- Render brand nodes.
- Render creative nodes.
- Render TASCK as a central hub node.
- Render links between brands and TASCK.
- Render links between TASCK and creatives.
- Render direct active deal links between brands and creatives.
- Use custom canvas rendering for nodes and links.
- Show animated directional particles for active deal links.
- Support node hover.
- Support node click detail popup.
- Support zoom-to-fit control.

Current graph data:

- 10 brand nodes.
- 10 creative nodes.
- 1 TASCK hub node.
- 30 links.
- 10 active direct deal links.

### 8.5.3 Graph Filters

The graph must support:

- All.
- Brands.
- Creatives.
- Active Deals.

Filter behavior:

- All shows all nodes and links.
- Brands shows brand nodes plus TASCK hub and related links.
- Creatives shows creative nodes plus TASCK hub and related links.
- Active Deals shows only active direct brand-creative links and their nodes.

Acceptance criteria:

- Filter selection updates graph data.
- Active filter is visually distinct.
- Graph remains nonblank for all filters.

### 8.5.4 Node Requirements

Nodes must include:

- ID.
- Name.
- Type.
- Value.
- Deal count.
- Color.
- Industry or genre where applicable.

Node types:

- Brand.
- Creative.
- Hub.

Acceptance criteria:

- Hub node is visually larger and labeled `T`.
- Brand and creative nodes show type indicator.
- Node size should be influenced by commercial value.
- Hovered node becomes more visually prominent.

### 8.5.5 Detail Popup Requirements

Node popup must show:

- Name.
- Type.
- Total value.
- Deal count.
- Industry, genre, or role.
- CTA to view profile for non-hub nodes.

Acceptance criteria:

- Popup content adapts by node type.
- Hub node should not show brand/creative profile CTA.

---

## 8.6 Live Command

### 8.6.1 Purpose

Live Command is the v2 mission-control view. It should feel like a real-time operational monitor for leadership or a command-room display.

The page should answer:

- What is the current pipeline value?
- What changed recently?
- Which deals are active and at risk?
- Who is online and what are they doing?
- What is the current revenue target progress?
- Is Copilot monitoring the right areas?

### 8.6.2 Live Header Requirements

The header must:

- Show a red `LIVE` badge.
- Show title `Mission Control`.
- Show "Real-time operations view".
- Show current time including seconds.
- Show current date.
- Show online/healthy pulse indicator.

Acceptance criteria:

- Time updates automatically.
- LIVE badge is visually prominent.

### 8.6.3 Refresh Behavior

Live Command must:

- Update internal tick every 3 seconds.
- Update current time every 3 seconds.
- Animate metric tile progress accents using tick.

Acceptance criteria:

- Time visibly changes without user interaction.
- Metric bars animate subtly without causing layout shift.

### 8.6.4 Live Metrics Requirements

Top metric tiles:

- Pipeline Value.
- Active Deals.
- Revenue YTD.
- Burn Rate.
- Team Online.
- Signals Active.

Each tile must show:

- Label.
- Value.
- Change where available.
- Trend direction.
- Icon.
- Color.
- Animated bottom bar.

Current demo values:

- Pipeline Value: NGN 847.2M.
- Active Deals: 15.
- Revenue YTD: NGN 234.8M.
- Burn Rate: NGN 12.4M/month.
- Team Online: 8/12.
- Signals Active: 12.

Acceptance criteria:

- Metrics fit in six columns on desktop.
- Trend changes are color-coded.

### 8.6.5 Active Deals Feed Requirements

Active Deals feed must:

- Show key deals.
- Include ID, brand, creative, value, stage, health, and current action.
- Use health indicator.
- Highlight at-risk or new deals.

Acceptance criteria:

- At-risk deals have a visible warning state.
- Each active deal row includes value and next action.

### 8.6.6 Event Feed Requirements

Event Feed must:

- Show recent events.
- Include relative time, event text, and type.
- Present a streaming state indicator.
- Use compact rows for high density.

Event types:

- Info.
- Warning.
- Success.
- Error.

Acceptance criteria:

- Most recent event appears first.
- Warning and error events stand out.

### 8.6.7 Revenue Target Requirements

Revenue Target card must:

- Show current YTD revenue.
- Show annual target.
- Show progress bar.
- Show percentage achieved.
- Show remaining revenue.

Current values:

- Current: NGN 234.8M.
- Target: NGN 500M.
- Achieved: 47 percent.
- Remaining: NGN 265.2M.

Acceptance criteria:

- Progress bar width corresponds to 47 percent.
- Current and target values are visible without hover.

### 8.6.8 Team Activity Requirements

Team Activity must:

- Show team members.
- Include name, role, current status, last active time, and online state.
- Use avatar and presence dot.
- Show online count.

Acceptance criteria:

- Online members are visually distinct from offline members.
- Long statuses should truncate or wrap without breaking row layout.

### 8.6.9 Copilot Status Requirements

Copilot Status must:

- Show active monitoring state.
- List monitored areas:
  - Market signals.
  - Pipeline health.
  - Counter-offer needs.
  - Revenue forecast.
- Use check and warning icons.

Acceptance criteria:

- Warnings are visually distinct from OK states.
- Copilot status reinforces live monitoring narrative.

---

## 9. Planned Brand Portal Requirements

The Brand Portal currently uses placeholder pages. The target v2 Brand Portal should be an AI-assisted campaign command layer for brand partners.

### 9.1 Brand Overview

The Brand Overview should show:

- Campaign health briefing.
- Active campaigns.
- Pending approvals.
- Spend and budget status.
- ROI forecast.
- Creator performance.
- AI recommendations.
- Upcoming milestones.

Acceptance criteria:

- Brand sees what needs attention immediately.
- Campaign health uses clear risk states.
- Recommendations are tied to campaign outcomes, not generic suggestions.

### 9.2 Campaigns

Campaigns page should show:

- Active, planned, and completed campaigns.
- Campaign status.
- Budget.
- Timeline.
- Creative partners.
- Deliverables.
- KPI targets.
- Health score.
- Next action.

AI-specific requirements:

- Predict campaign risk.
- Suggest scope adjustments.
- Flag missed milestones.
- Highlight overperforming channels.

### 9.3 Approvals

Approvals page should show:

- Deliverable approval queue.
- AI-generated summary of each asset.
- Brand guideline fit.
- Risk flags.
- Required decision.
- Approve, request changes, escalate, and comment actions.

Acceptance criteria:

- Brand can approve or request changes from the queue.
- AI summary should explain what is being reviewed.

### 9.4 Discover

Discover page should show:

- AI-recommended creatives.
- Match reasons.
- Audience fit.
- Category fit.
- Past campaign performance.
- Estimated rate.
- Availability.
- Brand safety signal.

Acceptance criteria:

- Recommendations include clear "why this match" context.
- Brand can compare candidates.

### 9.5 Analytics

Analytics page should show:

- Live campaign KPI dashboard.
- Engagement trend.
- Reach and impressions.
- Earned media estimate.
- ROI.
- Creator contribution.
- Platform/channel breakdown.
- AI insight summary.

Acceptance criteria:

- Analytics should compare actuals against targets.
- Insights should identify cause and suggested action.

### 9.6 Spend

Spend page should show:

- Available budget.
- Committed budget.
- Escrowed funds.
- Spent amount.
- Pending invoices.
- Payment schedule.
- Forecasted overspend or underspend.

Acceptance criteria:

- Spend state is tied to campaign milestones.
- Brand can see what money is available, committed, and released.

### 9.7 Brand Messages

Messages should:

- Support campaign-threaded messaging.
- Summarize conversations.
- Extract action items.
- Highlight unread or blocked items.

### 9.8 Brand Settings

Settings should:

- Manage profile.
- Manage users and permissions.
- Configure notification preferences.
- Configure approval rules.
- Configure brand guidelines used by AI review.

---

## 10. Planned Talent Network Requirements

The Talent Network currently uses placeholder pages. The target v2 Talent Network should be a career intelligence layer for creatives.

### 10.1 Talent Overview

Talent Overview should show:

- Career briefing.
- AI-matched opportunities.
- Active projects.
- Earnings and pending payments.
- Reputation score.
- Skill demand.
- Portfolio health.
- Recommended next action.

Acceptance criteria:

- Talent sees what to apply for, finish, or improve.
- Insights should be practical and opportunity-oriented.

### 10.2 Opportunities

Opportunities should show:

- AI-ranked opportunities.
- Match score.
- Match explanation.
- Required skills.
- Budget.
- Timeline.
- Client.
- Application deadline.
- Competition level.
- Apply CTA.

Acceptance criteria:

- Match score is explained.
- Low-fit opportunities are not hidden but are clearly lower priority.

### 10.3 Projects

Projects should show:

- Active projects.
- Task status.
- Deliverable status.
- Payment status.
- Next deadline.
- Risk flags.
- Client messages.

Acceptance criteria:

- Talent can see exactly what needs to be done next.
- Payment relationship to task approval is clear.

### 10.4 Wallet

Wallet should show:

- Available balance.
- Pending payments.
- Escrowed funds where applicable.
- Earnings YTD.
- Withdrawal options.
- Transaction history.

AI-specific requirements:

- Forecast upcoming earnings.
- Flag delayed payments.
- Suggest invoice follow-up.

### 10.5 Portfolio

Portfolio should show:

- Profile.
- Skills.
- Rate card.
- Featured work.
- Campaign outcomes.
- Reviews.
- AI recommendations for profile improvement.

Acceptance criteria:

- Portfolio should function as a proof-of-work and conversion asset.
- AI recommendations should be specific, such as "add two video samples for music campaign roles."

### 10.6 Analytics

Analytics should show:

- Application conversion rate.
- Project completion rate.
- Rating trend.
- Reliability.
- Earnings trend.
- Skill demand.
- Category fit.
- Opportunity match history.

### 10.7 Talent Messages

Messages should:

- Support project-threaded conversations.
- Summarize unread threads.
- Extract action items.
- Flag deliverable or payment blockers.

### 10.8 Talent Settings

Settings should:

- Manage profile.
- Manage availability.
- Manage notification preferences.
- Manage payment details.
- Configure opportunity matching preferences.

---

## 11. Planned Command Portal Expansion

### 11.1 Projects

Future command Projects page should:

- Show project health across all active campaigns.
- Flag delayed milestones.
- Surface approval bottlenecks.
- Show scope creep risk.
- Show resource gaps.
- Recommend next operational actions.

### 11.2 Talent

Future command Talent page should:

- Search and filter talent network.
- Show talent availability.
- Show match scores.
- Show reliability, rating, rate, skill demand, and brand fit.
- Recommend talent for active deals and signals.

### 11.3 Revenue

Future command Revenue page should:

- Show revenue forecast.
- Show weighted pipeline.
- Show commission forecast.
- Show scenario planning.
- Show revenue by brand, talent, category, and stage.
- Show risk-adjusted target attainment.

### 11.4 Messages

Future command Messages page should:

- Provide internal/external thread inbox.
- Summarize unread messages.
- Extract actions.
- Connect messages to deals, signals, projects, and approvals.

### 11.5 Automations

Future Automations page should:

- Provide workflow automation builder.
- Allow triggers such as:
  - Signal confidence above threshold.
  - Deal stuck in stage too long.
  - Contract pending more than 48 hours.
  - Approval overdue.
  - Payment pending.
- Allow actions such as:
  - Notify owner.
  - Draft message.
  - Create task.
  - Update deal health.
  - Escalate to admin.

### 11.6 Settings

Future v2 Settings should:

- Configure AI confidence thresholds.
- Configure signal sources.
- Configure matching weights.
- Configure team notification rules.
- Configure dashboard display preferences.
- Configure data source integrations.

---

## 12. Data And Intelligence Requirements

### 12.1 Data Philosophy

V2 should use realistic Nigerian and African creative economy data. It should combine:

- Brand signals.
- Deal pipeline.
- Talent profiles.
- Campaign history.
- Revenue and payment data.
- Team activity.
- Market timing.

### 12.2 Current Demo Data Sources

Current v2 pages use inline/static data in frontend components. Existing backend seed data supports v1/v2-style demo auth and core resources but is not fully wired to v2 command pages.

### 12.3 Target Data Sources

Future production data sources may include:

- TASCK CRM.
- MongoDB deal and project collections.
- Brand and contact records.
- Talent profiles.
- Contract status.
- Wallet/ledger.
- Meeting notes.
- Campaign analytics providers.
- Social ad spend sources.
- Trademark/public filings.
- Job boards.
- News and press feeds.
- Brand websites and executive changes.
- Calendar and email systems.

### 12.4 Signal Entity Requirements

A signal should include:

- Signal ID.
- Type.
- Source.
- Title.
- Description.
- Industry.
- Confidence.
- Estimated value range.
- Detected time.
- Source URL or evidence.
- AI analysis.
- Recommended creatives.
- Recommended owner.
- Recommended next action.
- Status: new, watched, assigned, converted, dismissed.

### 12.5 Deal Entity Requirements For V2

A v2 deal should include:

- Deal ID.
- Brand.
- Creative.
- Title.
- Type.
- Stage.
- Value.
- Probability.
- Weighted value.
- Owner.
- Health.
- Days in stage.
- Start date.
- Deadline.
- Current action.
- Related signals.
- Simulator assumptions.
- Forecast outputs.

### 12.6 Talent Match Requirements

Talent match scoring should eventually consider:

- Brand fit.
- Audience overlap.
- Past performance.
- Category experience.
- Availability.
- Rate fit.
- Reliability.
- Location.
- Risk/brand safety.
- Relationship history with TASCK.
- Creative style or genre.

### 12.7 AI Transparency Requirements

AI outputs must show enough context for user trust:

- Confidence score.
- Why the system believes a signal matters.
- Evidence or source reference where available.
- Estimated deal value.
- Match explanation.
- Recommended action.
- Risk or uncertainty.

---

## 13. Backend And Integration Requirements

### 13.1 Current Backend Usage

V2 currently relies on:

- Existing demo login endpoint.
- Shared auth context.
- Seeded backend data indirectly.
- Static/inline data for most v2 intelligence and command pages.

### 13.2 Required Backend APIs For Full V2

Future v2 backend should provide:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/v2/briefing` | GET | Current daily briefing for command user. |
| `/api/v2/signals` | GET | List market signals with filters. |
| `/api/v2/signals/{id}` | GET | Signal detail. |
| `/api/v2/signals/{id}/convert` | POST | Convert signal to deal. |
| `/api/v2/signals/{id}/watch` | POST | Watch signal. |
| `/api/v2/signals/{id}/dismiss` | POST | Dismiss signal. |
| `/api/v2/pipeline` | GET | Pipeline deals and stage summaries. |
| `/api/v2/pipeline/flow` | GET | Flow metrics and transition rates. |
| `/api/v2/deals` | GET | Deal list for v2 views. |
| `/api/v2/deals/{id}` | GET | Deal detail. |
| `/api/v2/deals/{id}/simulate` | POST | Server-side scenario simulation. |
| `/api/v2/network` | GET | Graph nodes and links. |
| `/api/v2/live` | GET | Live metrics snapshot. |
| `/api/v2/events` | GET | Recent event feed. |
| `/api/v2/copilot/query` | POST | Query Copilot. |
| `/api/v2/brand/overview` | GET | Brand portal briefing. |
| `/api/v2/talent/overview` | GET | Talent portal briefing. |

### 13.3 Real-Time Requirements

For production v2, Live Command should move from simulated refresh to real streaming or polling.

Potential approaches:

- WebSocket event stream.
- Server-sent events.
- Polling every 5-15 seconds.

Event payload should include:

- Event ID.
- Time.
- Type.
- Source system.
- Actor.
- Entity type.
- Entity ID.
- Summary.
- Severity.
- Metadata.

### 13.4 AI Service Requirements

Future AI layer should support:

- Briefing generation.
- Signal analysis.
- Match explanation.
- Deal simulation commentary.
- Natural-language search/query.
- Message drafting.
- Action extraction.
- Forecast explanation.

AI output should be deterministic enough for demos and auditable enough for production operations.

---

## 14. Frontend Requirements

### 14.1 Frontend Stack

V2 uses:

- React.
- React Router.
- Tailwind CSS.
- Lucide React icons.
- `react-force-graph-2d`.
- Shared auth context.
- Shared avatar and detail popup components.
- Shared Naira formatting utility.

### 14.2 V2 Styling System

V2 visual system:

- Shell background: `#06080F`.
- Sidebar background: `#0A0D14`.
- Command modal background: `#0F1219`.
- Primary accent: `#2F55FF`.
- Positive accent: `#22C55E`.
- Warning accent: `#F59E0B`.
- Error accent: `#EF4444`.
- Purple/scoping accent: `#8B5CF6`.
- Cyan/NDA accent: `#06B6D4`.
- Cards: translucent white at 2-3 percent opacity with 6-10 percent borders.
- Glow cards: blue-tinted translucent cards.
- Radius: 8-16px depending on component.
- Typography: compact dashboard type with mono styling for numeric data.

### 14.3 Layout Requirements

V2 pages must:

- Use dark command layout.
- Keep content inside `v2-content` padding.
- Use high-density grids.
- Avoid marketing-style hero layouts inside portals.
- Keep major controls visible above the fold where practical.
- Support horizontal overflow for dense pipeline views.
- Keep graph canvas inside stable container dimensions.

### 14.4 Interaction Requirements

Required interactions:

- Sidebar hover expansion.
- Route navigation through sidebar buttons.
- Top command trigger click.
- Cmd/Ctrl+K command modal.
- Escape closes modal.
- Segmented control tab switches.
- Detail popups.
- Slider-driven simulator outputs.
- Graph filters.
- Graph node click.
- Live refresh tick.

### 14.5 Test ID Requirements

V2 must maintain stable `data-testid` attributes for:

- V2 role selector.
- Role cards.
- V2 layout.
- Sidebar.
- Navigation items.
- Live button.
- Logout button.
- Topbar.
- Command trigger.
- Command modal.
- Command Center root.
- Intelligence root and signal cards.
- Pipeline root and view toggles.
- Deal cards and simulator sliders.
- Network filters and graph.
- Live metrics and feed items.
- Placeholder roots.

---

## 15. Design Requirements

### 15.1 Design Direction

V2 should feel like:

- AI-native.
- High-signal.
- Operational.
- Premium.
- Futuristic but credible.
- Dense enough for serious operators.

It should not feel like:

- A generic admin dashboard.
- A marketing landing page.
- A decorative sci-fi mockup with no operational content.
- A chatbot wrapped around static tables.

### 15.2 Visual Hierarchy

Priority order:

1. Decisions and alerts.
2. Revenue and commercial value.
3. Confidence and probability.
4. Entity identity.
5. Supporting metadata.

### 15.3 Status Color Semantics

| Meaning | Color |
|---|---|
| Primary action / active route / AI accent | Blue |
| Positive / success / active / high confidence | Green |
| Warning / at-risk / counter-offer | Amber |
| Error / lost / urgent live state | Red |
| Scoping / strategic analysis | Purple |
| NDA / legal stage | Cyan |
| Neutral / inactive / placeholder | Slate/white opacity |

### 15.4 Motion Requirements

Motion should be subtle:

- Sidebar expansion transition.
- Pulse indicators for live/active states.
- Command placeholder rotation.
- Graph force simulation.
- Directional particles on active deal links.
- Metric tile bottom bar animation.

Acceptance criteria:

- Motion should not distract from data.
- Layout should not shift unpredictably during animation.

---

## 16. Permissions And Access

### 16.1 Current Demo Access

V2 uses demo login through the shared auth context:

- TASCK Command logs in as staff.
- Brand Portal logs in as brand.
- Talent Network logs in as creative.

V2 routes are not currently wrapped in the same `ProtectedRoute` role checks as v1 portal roots. In demo context, role selection still sets auth state, but v2 should eventually enforce access rules.

### 16.2 Target Access Rules

| Portal | Allowed roles | Notes |
|---|---|---|
| TASCK Command | Staff, Admin | Internal operations only. |
| Brand Portal | Brand | Brand-scoped access only. |
| Talent Network | Creative, Super Creative | Talent-scoped access only. |
| Live Command | Staff, Admin, leadership | May require elevated permission. |
| Intelligence Center | Staff, Admin | Internal market intelligence. |
| Deal Simulator | Staff, Admin | Internal commercial modeling. |

### 16.3 Production Requirements

Future production v2 must include:

- Server-side authorization.
- Organization-scoped access.
- Brand-scoped campaigns.
- Talent-scoped projects/opportunities.
- Admin/staff permission hierarchy.
- Audit logging for AI-generated actions and user decisions.

---

## 17. Analytics And Success Metrics

### 17.1 Demo Success Metrics

V2 demo succeeds if:

- User understands the difference between v1 and v2 within 2 minutes.
- Command Center communicates "AI-native operating brain" immediately.
- Intelligence Center convincingly shows how signals become deal opportunities.
- Deal Simulator clearly demonstrates financial decision support.
- Network Graph renders and can be interacted with.
- Live Command creates a strong mission-control moment.

### 17.2 Product Metrics

Future product metrics:

- Signals detected per week.
- Signal-to-deal conversion rate.
- Average confidence of converted signals.
- Expected value influenced by simulator.
- Pipeline stage velocity.
- Deal risk reduction.
- Time from signal detection to owner assignment.
- Time from counter-offer to response.
- Revenue forecast accuracy.
- Copilot query usage.
- Automation trigger success rate.

### 17.3 Operational Metrics In UI

V2 Command should display:

- Pipeline value.
- Weighted pipeline.
- Revenue YTD.
- Target progress.
- Active deals.
- Burn rate.
- Team online.
- Signals active.
- Signal confidence.
- Estimated signal value.
- Deal probability.
- Expected value.
- Monthly velocity.

---

## 18. Non-Functional Requirements

### 18.1 Performance

V2 must:

- Render command pages quickly despite dense UI.
- Keep graph rendering smooth with current demo data.
- Avoid unnecessary re-renders during slider changes.
- Keep live tick interval lightweight.
- Avoid blocking UI during role login.

Acceptance criteria:

- Command Center renders within 2 seconds in local preview.
- Deal simulator responds immediately to slider changes.
- Network graph is visibly nonblank and interactive.
- Live Command tick does not freeze the UI.

### 18.2 Reliability

V2 must:

- Handle missing auth user gracefully.
- Render placeholder pages safely.
- Avoid crashes if graph container dimensions change.
- Avoid NaN values in simulator.
- Clamp scenario values where needed.

### 18.3 Accessibility

V2 should maintain a practical demo accessibility baseline:

- Buttons are keyboard-focusable.
- Command modal can be closed with Escape.
- Text contrast is sufficient on dark backgrounds.
- Icon-only buttons have title or clear context.
- Graph controls are reachable.
- Slider labels and values are visible.

### 18.4 Responsiveness

V2 is optimized for desktop and command-room demos. It should still:

- Use single-column layouts on smaller screens where implemented.
- Keep dense grids from overlapping.
- Allow horizontal scroll for pipeline Kanban.
- Keep modals within viewport.
- Keep network graph container responsive to window resize.

### 18.5 Security

Current v2 is demo-only. Future production requirements:

- Authenticated API access.
- Server-side role enforcement.
- Audit log for signal conversion, deal creation, simulator assumptions saved to deal records, and AI recommendations.
- Sanitized user prompts.
- Guardrails for AI-generated outreach.
- Rate limits on Copilot queries.

---

## 19. QA And Testing Requirements

### 19.1 Route Smoke Tests

Smoke tests must verify these routes render:

- `/v2`
- `/v2/command`
- `/v2/command/signals`
- `/v2/command/pipeline`
- `/v2/command/deals`
- `/v2/command/network`
- `/v2/command/live`
- `/v2/command/projects`
- `/v2/command/talent`
- `/v2/command/revenue`
- `/v2/command/messages`
- `/v2/command/automations`
- `/v2/command/settings`
- `/v2/brand`
- `/v2/brand/campaigns`
- `/v2/brand/approvals`
- `/v2/brand/discover`
- `/v2/brand/analytics`
- `/v2/brand/spend`
- `/v2/brand/messages`
- `/v2/brand/settings`
- `/v2/talent`
- `/v2/talent/opportunities`
- `/v2/talent/projects`
- `/v2/talent/wallet`
- `/v2/talent/portfolio`
- `/v2/talent/analytics`
- `/v2/talent/messages`
- `/v2/talent/settings`

### 19.2 Role Selector Tests

Test cases:

- TASCK Command card logs in and navigates to `/v2/command`.
- Brand Portal card logs in and navigates to `/v2/brand`.
- Talent Network card logs in and navigates to `/v2/talent`.
- Loading state appears while logging in.
- Back link navigates to `/select`.

### 19.3 Layout Tests

Test cases:

- Sidebar renders collapsed.
- Sidebar expands on hover.
- Active nav item changes by route.
- Command trigger opens modal.
- Cmd/Ctrl+K opens modal.
- Escape closes modal.
- Live button appears for command portal.
- Logout clears session and navigates home.

### 19.4 Command Center Tests

Test cases:

- Revenue Pulse renders expected values.
- Three priorities render.
- Priority click opens detail popup.
- Signals render with confidence and estimated value.
- Signal click opens detail popup.
- Pipeline Snapshot renders stage list.
- Stage click opens detail popup.
- Copilot quick reply opens response popup.

### 19.5 Intelligence Tests

Test cases:

- All signals render.
- Each filter changes visible signal list.
- Signal cards show confidence, estimated value, analysis, and matches.
- Signal detail popup opens.
- Industry Pulse popup opens.

### 19.6 Pipeline Tests

Test cases:

- Kanban is default.
- Flow view renders stats and SVG visualization.
- Timeline view renders month grid and deadlines.
- Deal card click opens popup.
- View segmented control updates selected view.

### 19.7 Deal Simulator Tests

Test cases:

- Deals tab renders list.
- Simulator tab renders controls.
- Selecting a deal updates selected deal and slider defaults.
- Changing deal value updates outputs.
- Changing commission updates TASCK revenue.
- Changing creative payout updates payout and distribution.
- Changing probability updates expected value and recommendation.
- Low probability shows warning.
- Presets update commission/probability.

### 19.8 Network Tests

Test cases:

- Graph renders nonblank.
- All filters render nonblank graph state.
- Node click opens popup.
- Zoom-to-fit button works.
- Active deal links show directional particles.

### 19.9 Live Command Tests

Test cases:

- Live metrics render.
- Time updates after interval.
- Active Deals feed renders.
- Event Feed renders.
- Revenue Target progress renders.
- Team Activity renders.
- Copilot Status renders.

### 19.10 Visual QA

Visual QA must confirm:

- No text overlaps.
- Dense cards remain readable.
- Sliders fit in their cards.
- Graph labels do not dominate canvas.
- Live metrics fit in desktop grid.
- Placeholder pages communicate next-phase state cleanly.
- Dark-mode contrast is acceptable.

---

## 20. Release Plan

### 20.1 Phase A: V2 Foundation

Includes:

- V2 role selector.
- V2 layout shell.
- Dark visual system.
- Command modal.
- Sidebar navigation.
- Placeholder routing.

Status: Built.

### 20.2 Phase B: Command Portal

Includes:

- Command Center.
- Intelligence Center.
- Pipeline.
- Deal Room.
- Network Graph.
- Live Command.

Status: Built as demo.

### 20.3 Phase C: Portal Completion

Includes:

- V2 Brand Portal pages.
- V2 Talent Network pages.
- Command Projects.
- Command Talent.
- Command Revenue.
- Messages.
- Automations.
- Settings.

Status: Planned.

### 20.4 Phase D: Live Data And AI

Includes:

- V2 backend namespace.
- Real signal ingestion.
- Real Copilot.
- Real command queries.
- Real simulator persistence.
- Real live events.
- Production auth and authorization.

Status: Future.

### 20.5 Release Checklist

For current demo release:

- `/v2` role selector works.
- Command portal built pages render.
- Pipeline view switching works.
- Deal simulator calculations work.
- Network graph renders and filters.
- Live Command updates time.
- Placeholder pages render for incomplete routes.
- No blocking runtime errors in guided demo.
- V2 PRD is available.

---

## 21. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| AI appears real when outputs are static | Overclaiming risk | Document AI as simulated in current demo and define future integration requirements. |
| Brand and Talent portals are placeholders | Demo may feel incomplete | Present TASCK Command as current v2 scope and Brand/Talent as Phase C roadmap. |
| Graph can be performance-sensitive | Poor demo experience | Keep demo graph small and verify canvas rendering. |
| Dense dark UI can reduce readability | User misses key data | Maintain strong hierarchy and compact but legible typography. |
| Simulator can be misread as financial advice | Commercial/legal risk | Frame as internal decision-support model, not binding forecast. |
| Static signal data may feel unverified | Credibility risk | Add source/evidence fields in future backend and be explicit that current signals are demo examples. |
| Live Command is simulated, not real-time | Overclaiming risk | Document current interval simulation and future websocket/polling requirements. |

---

## 22. Future Roadmap

Priority roadmap:

1. Wire Command Center to backend briefing endpoint.
2. Create `/api/v2/signals` and move signal data out of frontend components.
3. Add signal status actions: watch, assign, dismiss, convert to deal.
4. Persist simulator scenarios to deal records.
5. Add real command search and Copilot query execution.
6. Build Command Revenue page with forecast modeling.
7. Build Command Automations page.
8. Build V2 Brand Overview, Campaigns, Approvals, Analytics, and Spend.
9. Build V2 Talent Overview, Opportunities, Projects, Wallet, Portfolio, and Analytics.
10. Add real live events through polling or WebSockets.
11. Add production auth and route authorization.
12. Add data source integrations for market signals.
13. Add explainable AI evidence and citations for signals.

---

## 23. Open Questions

1. Should v2 become the primary product experience for TASCK staff, or remain a premium command layer above v1/v3 workflows?
2. Which signal sources should be prioritized for the first live integration?
3. What confidence threshold should trigger a recommended outreach?
4. Who owns signal review: individual agents, a strategy team, or Copilot automation?
5. Should simulator outputs be saved as official forecast records?
6. Should brand users see AI recommendations, or only staff-approved recommendations?
7. Should talent users see exact match score logic?
8. How should TASCK prevent AI-generated outreach from creating brand or legal risk?
9. What level of real-time event freshness is required for Live Command?
10. Should v2 support keyboard-first command navigation beyond Cmd/Ctrl+K?

---

## 24. Appendix A: Demo Script

Recommended v2 demo path:

1. Open `/v2`.
2. Explain the three portals: TASCK Command, Brand Portal, Talent Network.
3. Select TASCK Command.
4. On `/v2/command`, explain the daily briefing:
   - Revenue Pulse.
   - Today's Priorities.
   - Signals Detected.
   - Deal Movement.
   - Pipeline Snapshot.
   - Copilot.
5. Open `/v2/command/signals`.
   - Filter by signal type.
   - Open a high-confidence signal.
   - Explain estimated value and best matches.
6. Open `/v2/command/pipeline`.
   - Show Kanban.
   - Switch to Flow.
   - Switch to Timeline.
7. Open `/v2/command/deals`.
   - Open the simulator.
   - Adjust commission, probability, and timeline.
   - Explain expected value and AI recommendation.
8. Open `/v2/command/network`.
   - Show all nodes.
   - Filter to Active Deals.
   - Click a brand or creative node.
9. Open `/v2/command/live`.
   - Show live metrics, event feed, team activity, and Copilot status.
10. Briefly visit `/v2/brand` and `/v2/talent` to explain Phase C expansion.

---

## 25. Appendix B: Current Implementation References

Primary v2 files:

- `frontend/src/pages/v2/V2RoleSelector.js`
- `frontend/src/components/v2/V2Layout.js`
- `frontend/src/pages/v2/V2Placeholder.js`
- `frontend/src/pages/v2/command/CommandCenter.js`
- `frontend/src/pages/v2/command/IntelligenceCenter.js`
- `frontend/src/pages/v2/command/V2Pipeline.js`
- `frontend/src/pages/v2/command/V2DealRoom.js`
- `frontend/src/pages/v2/command/V2Network.js`
- `frontend/src/pages/v2/command/V2LiveCommand.js`
- `frontend/src/index.css`
- `frontend/package.json`

Shared files used by v2:

- `frontend/src/App.js`
- `frontend/src/context/AuthContext.js`
- `frontend/src/components/shared/Avatar.js`
- `frontend/src/components/shared/DetailPopup.js`
- `frontend/src/components/shared/FeedbackPopup.js`
- `frontend/src/lib/utils.js`
- `backend/server.py`
- `backend/models.py`
- `backend/seed_data.py`

---

## 26. Appendix C: V2 Definition Of Done

Current demo v2 is done when:

- V2 role selector works for all three portals.
- TASCK Command built pages render without runtime errors.
- Command Center briefing is coherent and clickable.
- Intelligence filters and signal popups work.
- Pipeline switches between Kanban, Flow, and Timeline.
- Deal simulator updates outputs correctly.
- Network graph renders, filters, and opens node popups.
- Live Command updates time and renders mission-control state.
- Placeholder pages render for incomplete v2 routes.
- Command modal opens through click and keyboard shortcut.
- The product can be presented as an AI-native evolution of TASCK OS without claiming that simulated AI/data feeds are production integrations.

