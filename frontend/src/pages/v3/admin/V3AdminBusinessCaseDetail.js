// Live Business Case detail — tabbed Connect / Frame / Plan / Deliver / Closure
// surface, all data sourced from /api/v3/business-cases/:id
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  v3GetBusinessCase, v3AdvanceBusinessCase, v3GenerateAlignment,
  v3ApproveSnapshot, v3SignContract, v3TransitionDeliverable, v3RequestScopeChange,
  v3ApproveScopeChange, v3MarkInvoicePaid, v3SubmitBrandFeedback, v3SubmitCreatorFeedback,
  v3GetCreators, v3CreateBrief, v3SimulateBriefResponse, v3CreateSnapshot, v3CreateContract,
  v3CreateBrainstorm, v3AddDeliverable, v3GenerateFinalReport, v3SetConnectStatus,
  v3CreateInteraction, v3ResolveScopeFlag, v3ApproveAlignmentAs, v3UpdateAlignment,
  v3SendAlignmentToBrand, v3ResolveAlignmentComment, v3SuggestCreatorMatches,
  v3SendBriefReminder, v3UpdateStrategySnapshot,
  v3SendStrategySnapshotToBrand, v3ResolveStrategySnapshotComment, v3UpdateInvoice,
  v3UpdateDeliverable,
} from '../../../lib/v3api';
import { formatNairaV3 } from '../../../lib/v3data';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import {
  ArrowLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, FileText,
  Sparkles, ShieldAlert, FileSignature, PackageCheck, AlertOctagon, Plus,
  Send, Edit3, Save, X, MessageSquare, Download, Mail, Search,
} from 'lucide-react';

const STAGES = ['connect', 'frame', 'plan', 'deliver', 'closure'];

const STAGE_LABELS = {
  connect: 'Connector',
  frame: 'Frame',
  plan: 'Plan',
  deliver: 'Delivery',
  closure: 'Reporting',
  closed: 'Reporting',
};

const STAGE_NEXT_ACTIONS = {
  frame: 'Generate, edit, and send the Alignment Snapshot for approval.',
  plan: 'Select creatives, send the brief, then review and send the auto-generated Strategy Snapshot.',
  deliver: 'Generate contracts, manage budget and timeline planning, and track campaign delivery.',
  closure: 'Generate the final report, collect feedback, and close the project.',
  closed: 'Generate the final report, collect feedback, and close the project.',
};

const stageToTab = (stage) => (stage === 'closed' ? 'closure' : stage);
const tabToStage = (tab) => (tab === 'closure' ? 'closed' : tab);
const getStageLabel = (stage) => STAGE_LABELS[stageToTab(stage)] || STAGE_LABELS[stage] || stage;

const StageDot = ({ active, done, color }) => (
  <span
    className="inline-block w-2 h-2 rounded-full"
    style={{ background: done ? color : active ? color : '#D4CDBF' }}
  />
);

const Section = ({ title, children, action }) => (
  <div className="v3-card p-6 mb-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const sectionToText = (section) => {
  if (section.type === 'prose') return section.content || '';
  const items = Array.isArray(section.items) ? section.items : [];
  if (section.type === 'kpis') return items.map((item) => `${item.kpi}: ${item.target}`).join('\n');
  if (section.type === 'flags') return items.map((item) => item.text || item.reason || '').join('\n');
  return items.join('\n');
};

const textToSection = (section, text) => {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  if (section.type === 'prose') return { ...section, content: text };
  if (section.type === 'kpis') {
    return {
      ...section,
      items: lines.map((line) => {
        const [kpi, ...rest] = line.split(':');
        return { kpi: kpi?.trim() || 'KPI', target: rest.join(':').trim() || 'Confirm target with brand.' };
      }),
    };
  }
  if (section.type === 'flags') return { ...section, items: lines.map((line) => ({ text: line })) };
  return { ...section, items: lines };
};

const MarketingIntelligenceCard = ({ intelligence }) => {
  if (!intelligence) return null;
  return (
    <Section title="Connector AI extraction">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded border border-[#E8E4DB]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Key Marketing Focus</p>
          <p className="text-[12px] text-[#1A1A1A]">{intelligence.key_marketing_focus || 'Pending'}</p>
        </div>
        <div className="p-3 rounded border border-[#E8E4DB]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Primary Target Audience</p>
          <p className="text-[12px] text-[#1A1A1A]">{intelligence.primary_target_audience || 'Pending'}</p>
        </div>
        <div className="p-3 rounded border border-[#E8E4DB]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Key Marketing Channels</p>
          <p className="text-[12px] text-[#1A1A1A]">{(Array.isArray(intelligence.key_marketing_channels) ? intelligence.key_marketing_channels : []).join(', ') || 'Pending'}</p>
        </div>
        <div className="p-3 rounded border border-[#E8E4DB]">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Marketing KPIs</p>
          <p className="text-[12px] text-[#1A1A1A]">{(Array.isArray(intelligence.marketing_kpis) ? intelligence.marketing_kpis : []).map((k) => k.kpi).join(', ') || 'Pending'}</p>
        </div>
      </div>
    </Section>
  );
};

const AlignmentSnapshotEditor = ({ snapshot, busy, onSave, onSaveAndSend }) => {
  const sections = Array.isArray(snapshot.sections) ? snapshot.sections : [];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(snapshot.title);
  const [drafts, setDrafts] = useState(sections.map(sectionToText));

  const reset = () => {
    setTitle(snapshot.title);
    setDrafts(sections.map(sectionToText));
    setEditing(false);
  };

  const save = async () => {
    const updatedSections = sections.map((section, index) => textToSection(section, drafts[index] || ''));
    await onSave({ title, sections: updatedSections, reviewer: 'admin' });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="space-y-3" data-testid="alignment-editor">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 text-[14px] rounded-lg border border-[#E8E4DB] bg-white"
          data-testid="alignment-title-edit"
        />
        {sections.map((section, index) => (
          <div key={`${section.heading}-${index}`} className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
            <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">{section.heading}</label>
            <textarea
              value={drafts[index] || ''}
              onChange={(e) => setDrafts(drafts.map((draft, i) => (i === index ? e.target.value : draft)))}
              rows={section.type === 'prose' ? 4 : 3}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
              data-testid={`alignment-section-edit-${index}`}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <button onClick={save} disabled={busy} className="v3-btn-secondary" data-testid="alignment-save">
            <Save className="w-3.5 h-3.5" /> Save draft
          </button>
          {onSaveAndSend && (
            <button
              onClick={async () => {
                const updatedSections = sections.map((section, index) => textToSection(section, drafts[index] || ''));
                await onSaveAndSend({ title, sections: updatedSections, reviewer: 'admin' });
                setEditing(false);
              }}
              disabled={busy}
              className="v3-btn-primary"
              data-testid="alignment-save-send"
            >
              <Send className="w-3.5 h-3.5" /> Save & send to brand
            </button>
          )}
          <button onClick={reset} disabled={busy} className="v3-btn-secondary">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setEditing(true)} className="v3-btn-secondary mb-4" data-testid="alignment-edit">
        <Edit3 className="w-3.5 h-3.5" /> Edit Snapshot
      </button>
      <V3DocumentSurface title={snapshot.title} meta={snapshot.meta}>
        {sections.map((s, i) => (
          <div key={i} className="mb-6">
            <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">{s.heading}</h3>
            {s.type === 'prose' && <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-[#1A1A1A]">{s.content}</p>}
            {s.type === 'bullets' && <ul className="list-disc pl-5 space-y-1 text-[14px]">{(Array.isArray(s.items) ? s.items : []).map((it, j) => <li key={j}>{it}</li>)}</ul>}
            {s.type === 'numbered' && <ol className="list-decimal pl-5 space-y-1 text-[14px]">{(Array.isArray(s.items) ? s.items : []).map((it, j) => <li key={j}>{it}</li>)}</ol>}
            {s.type === 'kpis' && (
              <div className="space-y-2">
                {(Array.isArray(s.items) ? s.items : []).map((k, j) => (
                  <div key={j} className="p-3 border border-[#E8E4DB] rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium">{k.kpi}</span>
                      {k.flagNote && <span className="text-[10px] text-[#C49B5F]">{k.flagNote}</span>}
                    </div>
                    <p className="text-[12px] text-[#6E6657]">{k.target}</p>
                  </div>
                ))}
              </div>
            )}
            {s.type === 'flags' && (
              <ul className="space-y-1 text-[13px]">
                {(Array.isArray(s.items) ? s.items : []).map((f, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-[#C49B5F] flex-shrink-0 mt-0.5" />
                    <span>{f.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </V3DocumentSurface>
    </>
  );
};

const amountToText = (amount) => Number(amount || 0).toString();

const StrategySnapshotEditor = ({ snapshot, busy, onSave, onSaveAndSend }) => {
  const normalizedDeliverables = (Array.isArray(snapshot.deliverables) ? snapshot.deliverables : []).map((item, index) =>
    typeof item === 'string' ? { num: index + 1, title: item, format: 'Campaign deliverable', duration: '' } : item
  );
  const normalizedBudget = Array.isArray(snapshot.budget)
    ? snapshot.budget
    : Object.entries(snapshot.budget?.allocation || {}).map(([line, amount]) => ({
        line: line.replace(/_/g, ' '),
        amount,
      }));
  const normalizedMetrics = (Array.isArray(snapshot.success_metrics) ? snapshot.success_metrics : []).map((item) =>
    typeof item === 'string' ? { kpi: item.split(':')[0] || 'KPI', target: item.split(':').slice(1).join(':').trim() || 'Confirm target.' } : item
  );
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(snapshot.title || '');
  const [concept, setConcept] = useState(snapshot.concept || '');
  const [deliverablesText, setDeliverablesText] = useState(normalizedDeliverables
    .map((d) => `${d.title || ''} | ${d.format || ''} | ${d.duration || ''}`).join('\n'));
  const [budgetText, setBudgetText] = useState(normalizedBudget
    .map((b) => `${b.line || ''}: ${amountToText(b.amount)}`).join('\n'));
  const [metricsText, setMetricsText] = useState(normalizedMetrics
    .map((m) => `${m.kpi || ''}: ${m.target || ''}`).join('\n'));

  const buildPayload = () => ({
    title,
    concept,
    reviewer: 'admin',
    deliverables: deliverablesText.split('\n').map((line, index) => {
      const [titlePart, formatPart, durationPart] = line.split('|').map((part) => part?.trim() || '');
      return titlePart ? { num: index + 1, title: titlePart, format: formatPart || 'Deliverable', duration: durationPart || '' } : null;
    }).filter(Boolean),
    budget: budgetText.split('\n').map((line) => {
      const [label, ...rest] = line.split(':');
      const amount = Number(rest.join(':').replace(/[^\d.]/g, ''));
      return label?.trim() ? { line: label.trim(), amount: Number.isFinite(amount) ? amount : 0 } : null;
    }).filter(Boolean),
    success_metrics: metricsText.split('\n').map((line) => {
      const [kpi, ...rest] = line.split(':');
      return kpi?.trim() ? { kpi: kpi.trim(), target: rest.join(':').trim() || 'Confirm target.' } : null;
    }).filter(Boolean),
  });

  if (editing) {
    return (
      <div className="space-y-3" data-testid="strategy-editor">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 text-[14px] rounded-lg border border-[#E8E4DB] bg-white" data-testid="strategy-title-edit" />
        <textarea value={concept} onChange={(e) => setConcept(e.target.value)} rows={6} className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white" data-testid="strategy-concept-edit" />
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Deliverables</label>
            <textarea value={deliverablesText} onChange={(e) => setDeliverablesText(e.target.value)} rows={7} className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Budget</label>
            <textarea value={budgetText} onChange={(e) => setBudgetText(e.target.value)} rows={7} className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Success metrics</label>
            <textarea value={metricsText} onChange={(e) => setMetricsText(e.target.value)} rows={7} className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onSave(buildPayload()).then(() => setEditing(false))} disabled={busy} className="v3-btn-secondary" data-testid="strategy-save">
            <Save className="w-3.5 h-3.5" /> Save draft
          </button>
          <button onClick={() => onSaveAndSend(buildPayload()).then(() => setEditing(false))} disabled={busy} className="v3-btn-primary" data-testid="strategy-save-send">
            <Send className="w-3.5 h-3.5" /> Save & send to brand
          </button>
          <button onClick={() => setEditing(false)} disabled={busy} className="v3-btn-secondary">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button onClick={() => setEditing(true)} className="v3-btn-secondary mb-4" data-testid="strategy-edit">
        <Edit3 className="w-3.5 h-3.5" /> Edit Strategy Snapshot
      </button>
      <V3DocumentSurface title={snapshot.title}>
        <p className="text-[14px] mb-6 whitespace-pre-wrap">{snapshot.concept}</p>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Deliverables</h4>
        <ul className="text-[13px] space-y-1 mb-6">
          {normalizedDeliverables.map((d, index) => (
            <li key={`${d.title}-${index}`}>{d.num || index + 1}. {d.title}: {d.format} {d.duration && `(${d.duration})`}</li>
          ))}
        </ul>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Budget</h4>
        <ul className="text-[13px] space-y-1 mb-6">
          {normalizedBudget.map((b, i) => (
            <li key={i} className="flex justify-between border-b border-[#E8E4DB] py-1">
              <span>{b.line}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(b.amount)}</span>
            </li>
          ))}
        </ul>
        <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Success metrics</h4>
        <ul className="text-[13px] space-y-1">
          {normalizedMetrics.map((m, i) => (
            <li key={i}><strong>{m.kpi}:</strong> {m.target}</li>
          ))}
        </ul>
      </V3DocumentSurface>
    </>
  );
};

const buildDeliveryContractText = ({ bundle, kind }) => {
  const brand = bundle.brand?.company || 'Brand';
  const creator = bundle.creator?.name || 'Selected Creator';
  const title = bundle.business_case?.title || 'Campaign';
  const value = formatNairaV3(bundle.business_case?.estimated_value || 0);
  const deliverables = Array.isArray(bundle.deliverables) && bundle.deliverables.length
    ? bundle.deliverables.map((d, index) => `${index + 1}. ${d.title}: ${String(d.status || 'pending').replace(/_/g, ' ')}`).join('\n')
    : '1. Campaign concept, production assets, review rounds, launch support, and final reporting.';
  const strategy = bundle.creative_snapshot?.concept || 'The campaign strategy follows the approved Strategy Snapshot and approved brand objectives.';

  if (kind === 'creator') {
    return `CREATOR SERVICES AGREEMENT

Project: ${title}
Creator: ${creator}
Brand: ${brand}
Agency: TASCK / Future Africa Group
Generated: ${new Date().toLocaleDateString()}

1. Appointment
TASCK appoints ${creator} to provide creative, production, publishing, appearance, and campaign support services for "${title}" in line with the approved Strategy Snapshot.

2. Creative Direction
${strategy}

3. Deliverables
${deliverables}

4. Creator Fee And Payment
The creator fee, reimbursable expenses, payment schedule, tax treatment, and payment destination will be confirmed in the final commercial schedule before signature.

5. Usage, Exclusivity, And Approvals
Usage rights are limited to the approved campaign channels, territory, and flight period unless extended in writing. ${creator} will comply with agreed brand safety, disclosure, and approval requirements.

6. Timeline
The creator will meet agreed production, review, revision, and publishing windows. Any delay, non-availability, or material change must be escalated to TASCK immediately.

7. Confidentiality
All campaign materials, budgets, strategy documents, scripts, and brand information remain confidential until publicly released by the brand or TASCK.

8. Signatures
Creator / Manager: ______________________
TASCK Authorized Signatory: ______________________
Date: ______________________`;
  }

  return `BRAND CAMPAIGN SERVICES AGREEMENT

Project: ${title}
Brand: ${brand}
Agency: TASCK / Future Africa Group
Creator: ${creator}
Estimated Project Value: ${value}
Generated: ${new Date().toLocaleDateString()}

1. Scope Of Work
TASCK will manage creator strategy, talent briefing, contract coordination, campaign production oversight, delivery tracking, and reporting for "${title}".

2. Approved Strategy
${strategy}

3. Deliverables And Payment Schedule
${deliverables}

4. Brand Responsibilities
${brand} will provide timely approvals, feedback, brand assets, usage requirements, compliance guidance, and payment according to the agreed invoice schedule.

5. Budget And Fees
The estimated project value is ${value}. Final line items, creator fees, production costs, amplification assumptions, and TASCK management fees will be attached as a commercial schedule.

6. Review And Approval
Brand review windows, revision limits, and final approval deadlines will follow the Delivery plan. Out-of-scope requests may trigger a documented scope change.

7. Reporting
TASCK will provide campaign performance reporting against approved KPIs, including outcomes, learnings, creator performance, content performance, and recommendations.

8. Signatures
Brand Authorized Signatory: ______________________
TASCK Authorized Signatory: ______________________
Date: ______________________`;
};

const ContractRiskRow = ({ level, text }) => {
  const tone = level === 'high'
    ? 'bg-[#F5D9D2] text-[#B54A37] border-[#E0B0A4]'
    : level === 'medium'
      ? 'bg-[#F2EAD8] text-[#7A5F23] border-[#E5D6AC]'
      : 'bg-[#F4F2EC] text-[#6E6657] border-[#E8E4DB]';
  return (
    <div className={`flex items-start gap-2 rounded border p-2 text-[12px] ${tone}`}>
      <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span className="leading-relaxed">{text}</span>
    </div>
  );
};

const ContractSummaryCard = ({ bundle }) => {
  const contract = bundle.contract || {};
  const c = bundle.business_case || {};
  const brand = bundle.brand || {};
  const creator = bundle.creator || {};
  const isGrant = c.engagement_track === 'grant';

  const formatValue = () => {
    if (contract.value) {
      const ccy = contract.currency || 'NGN';
      if (ccy === 'USD') return `$${Math.round(contract.value).toLocaleString()}`;
      return formatNairaV3(contract.value);
    }
    return c.value_label || (c.value_amount ? formatNairaV3(c.value_amount) : 'Not yet quantified');
  };

  const STATUS_TONE = {
    signed: 'bg-[#DDE7E2] text-[#1F4A3A]',
    active: 'bg-[#DDE7E2] text-[#1F4A3A]',
    completed: 'bg-[#F4F2EC] text-[#6E6657]',
    pending_legal: 'bg-[#F2EAD8] text-[#7A5F23]',
    draft_needed: 'bg-[#F5D9D2] text-[#B54A37]',
    not_started: 'bg-[#F4F2EC] text-[#6E6657]',
  };
  const statusLabel = {
    signed: 'Signed',
    active: 'Active',
    completed: 'Completed',
    pending_legal: 'Pending legal',
    draft_needed: 'Draft needed',
    not_started: 'Not started',
  };
  const status = contract.status || c.plan?.contract_status || 'not_started';

  // Build party list
  const tasckParty = 'TASCK Africa (Agency)';
  const brandParty = brand.company || brand.name || 'Brand party — pending';
  const creatorParty = creator.name || creator.creator_name || (c.recommended_creator_name || null);
  const parties = [tasckParty, brandParty, creatorParty].filter(Boolean);

  // AI risk flags (heuristic based on missing CRM context)
  const riskFlags = [];
  if (!contract.value && !c.value_amount && !c.value_label) {
    riskFlags.push({ level: 'high', text: 'Contract value is not quantified — confirm with brand before signing.' });
  }
  if (!creatorParty && c.stage !== 'connect' && c.stage !== 'frame') {
    riskFlags.push({ level: 'medium', text: 'No creative attached — select creator before drafting creator contract.' });
  }
  if (!c.frame?.alignment_snapshot_status || c.frame?.alignment_snapshot_status !== 'approved') {
    riskFlags.push({ level: 'medium', text: 'Alignment Snapshot not yet approved by brand — risk of late scope changes.' });
  }
  if (isGrant && contract.value && contract.value > 0) {
    riskFlags.push({ level: 'low', text: 'Grant track: confirm funder pays creator directly (not TASCK).' });
  }
  if (status === 'draft_needed' || status === 'not_started') {
    riskFlags.push({ level: 'medium', text: 'Contract draft not yet prepared. Generate one via the AI contract studio below.' });
  }
  if (!brand.email && !brand.primary_contact_email) {
    riskFlags.push({ level: 'low', text: 'No brand signatory email on file — contact details required for e-sign.' });
  }

  // Next actions
  const nextActions = [];
  if (status === 'not_started' || status === 'draft_needed') nextActions.push('Generate brand contract via AI contract studio.');
  if (creatorParty && (status === 'not_started' || status === 'draft_needed')) nextActions.push('Generate creator contract.');
  if (status === 'pending_legal') nextActions.push('Resolve legal review comments, then move to signature.');
  if (status === 'signed' || status === 'active') nextActions.push('Track delivery milestones and invoice schedule.');
  if (riskFlags.length > 0) nextActions.push('Address risk flags listed below before signature.');

  return (
    <Section title="Contract summary">
      <div data-testid="bc-contract-summary" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Template</p>
            <p className="text-[12px] text-[#1A1A1A] mt-1">
              {creatorParty ? 'Brand + Creator dual contract' : 'Brand service agreement'}
            </p>
          </div>
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Status</p>
            <span className={`inline-flex mt-1 rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status] || STATUS_TONE.not_started}`}>
              {statusLabel[status] || status}
            </span>
          </div>
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Engagement track</p>
            <p className="text-[12px] text-[#1A1A1A] mt-1 capitalize">{c.engagement_track || 'paid'}</p>
          </div>
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Total value</p>
            <p className="text-[13px] font-semibold text-[#1A1A1A] mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatValue()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Parties</p>
            <ul className="space-y-1">
              {parties.map((p, i) => (
                <li key={i} className="text-[12px] text-[#1A1A1A] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1F4A3A]" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Contract summary</p>
            <p className="text-[12px] text-[#1A1A1A] leading-relaxed">
              {(contract.agreement_description && contract.agreement_description !== 'None' && contract.agreement_description !== 'none')
                ? contract.agreement_description
                : `${tasckParty} engages ${brandParty}${creatorParty ? ` and ${creatorParty}` : ''} to deliver "${c.title || 'Campaign'}" in line with the approved Alignment + Strategy Snapshots.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Scope</p>
            <p className="text-[12px] text-[#1A1A1A] leading-relaxed">
              {c.frame?.confirmed_scope || c.plan?.confirmed_scope || c.connect?.stated_intent ||
                `Deliver the agreed campaign for ${brandParty} per the Alignment + Strategy Snapshots, including creative production, channel rollout, and reporting.`}
            </p>
          </div>
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Payment terms</p>
            <p className="text-[12px] text-[#1A1A1A] leading-relaxed">
              {isGrant
                ? 'Grant track — Strategy Development Fee is waived. Funder pays creator directly via TASCK-approved invoice schedule.'
                : `Strategy Development Fee invoiced before Strategy Snapshot share. Project fee billed per milestone (typically 40% on signature / 40% on production / 20% on delivery). Net 15 days.`}
            </p>
            {c.value_raw && (
              <p className="text-[10px] text-[#8A8A8A] mt-2">
                Raw value from workbook: <span className="font-mono">{c.value_raw}</span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rights & usage</p>
            <p className="text-[12px] text-[#1A1A1A] leading-relaxed">
              Brand receives exclusive usage rights to all approved campaign deliverables for the agreed media window. Creator retains portfolio-only rights post-campaign. Out-of-window usage triggers a documented usage extension.
            </p>
          </div>
          <div className="rounded border border-[#E8E4DB] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Approvals</p>
            <ul className="space-y-1 text-[12px] text-[#1A1A1A]">
              <li className="flex items-center gap-2">
                <span className={c.connect?.connect_status === 'qualified_to_frame' ? 'text-[#1F4A3A]' : 'text-[#8A8A8A]'}>
                  {c.connect?.connect_status === 'qualified_to_frame' ? '✓' : '○'}
                </span>
                Connect → Frame qualification
              </li>
              <li className="flex items-center gap-2">
                <span className={c.frame?.alignment_snapshot_status === 'approved' ? 'text-[#1F4A3A]' : 'text-[#8A8A8A]'}>
                  {c.frame?.alignment_snapshot_status === 'approved' ? '✓' : '○'}
                </span>
                Alignment Snapshot approved
              </li>
              <li className="flex items-center gap-2">
                <span className={c.plan?.creative_snapshot_status === 'approved' ? 'text-[#1F4A3A]' : 'text-[#8A8A8A]'}>
                  {c.plan?.creative_snapshot_status === 'approved' ? '✓' : '○'}
                </span>
                Strategy Snapshot approved
              </li>
              <li className="flex items-center gap-2">
                <span className={status === 'signed' || status === 'active' ? 'text-[#1F4A3A]' : 'text-[#8A8A8A]'}>
                  {status === 'signed' || status === 'active' ? '✓' : '○'}
                </span>
                Contract signed
              </li>
            </ul>
          </div>
        </div>

        {riskFlags.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> AI risk flags ({riskFlags.length})
            </p>
            <div className="space-y-2">
              {riskFlags.map((r, i) => <ContractRiskRow key={i} level={r.level} text={r.text} />)}
            </div>
          </div>
        )}

        {nextActions.length > 0 && (
          <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Next actions</p>
            <ul className="space-y-1">
              {nextActions.map((a, i) => (
                <li key={i} className="text-[12px] text-[#1A1A1A] flex items-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-[#1F4A3A] flex-shrink-0" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {contract.source_sheet && (
          <p className="text-[10px] text-[#8A8A8A] pt-2 border-t border-[#F1ECDF]">
            Source: {contract.source_sheet} · row {contract.source_row_number}
          </p>
        )}
      </div>
    </Section>
  );
};

const DeliveryContractStudio = ({ bundle, busy }) => {
  const [activeKind, setActiveKind] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [sent, setSent] = useState({});

  const generate = (kind) => {
    const text = buildDeliveryContractText({ bundle, kind });
    setDrafts((current) => ({ ...current, [kind]: text }));
    setActiveKind(kind);
  };

  const draft = activeKind ? drafts[activeKind] || '' : '';
  const recipient = activeKind === 'creator'
    ? (bundle.creator?.manager_email || bundle.creator?.email || 'creator/manager email')
    : (bundle.brand?.email || 'brand company email');

  return (
    <Section title="AI contract studio">
      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="space-y-3">
          <button
            onClick={() => generate('brand')}
            disabled={busy}
            className={`w-full p-4 rounded border text-left transition-colors ${activeKind === 'brand' ? 'border-[#1F4A3A] bg-[#DDE7E2]' : 'border-[#E8E4DB] bg-[#FAFAF7]'}`}
            data-testid="bc-generate-brand-contract"
          >
            <FileSignature className="w-4 h-4 text-[#1F4A3A] mb-2" />
            <p className="text-[13px] font-semibold text-[#1A1A1A]">Auto-generate brand/admin contract</p>
            <p className="text-[11px] text-[#6E6657] mt-1">Full services agreement for brand approval and TASCK signature.</p>
          </button>
          <button
            onClick={() => generate('creator')}
            disabled={busy}
            className={`w-full p-4 rounded border text-left transition-colors ${activeKind === 'creator' ? 'border-[#1F4A3A] bg-[#DDE7E2]' : 'border-[#E8E4DB] bg-[#FAFAF7]'}`}
            data-testid="bc-generate-creator-contract"
          >
            <FileSignature className="w-4 h-4 text-[#1F4A3A] mb-2" />
            <p className="text-[13px] font-semibold text-[#1A1A1A]">Auto-generate creative contract</p>
            <p className="text-[11px] text-[#6E6657] mt-1">Creator agreement with deliverables, usage, fees, and timelines.</p>
          </button>
          {activeKind && (
            <div className="p-3 rounded bg-[#F4F2EC] border border-[#E8E4DB]">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Recipient</p>
              <p className="text-[12px] text-[#1A1A1A]">{recipient}</p>
              {sent[activeKind] && <p className="text-[11px] text-[#1F4A3A] mt-2">Queued to email at {sent[activeKind]}</p>}
            </div>
          )}
        </div>

        <div>
          {!activeKind ? (
            <div className="min-h-[360px] rounded border border-dashed border-[#D4CDBF] bg-[#FAFAF7] flex items-center justify-center text-center p-8">
              <div>
                <FileSignature className="w-8 h-8 text-[#C49B5F] mx-auto mb-3" />
                <p className="text-[14px] font-medium text-[#1A1A1A]">Generate a contract to review</p>
                <p className="text-[12px] text-[#8A8A8A] mt-1">The full contract appears here and remains editable before sending.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">Editable contract</p>
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">{activeKind === 'creator' ? 'Creative Contract' : 'Brand/Admin Contract'}</p>
                </div>
                <button
                  onClick={() => setSent((current) => ({ ...current, [activeKind]: new Date().toLocaleTimeString() }))}
                  disabled={busy || !draft.trim()}
                  className="v3-btn-primary"
                  data-testid={activeKind === 'creator' ? 'bc-send-creator-contract' : 'bc-send-brand-contract'}
                >
                  <Send className="w-3.5 h-3.5" /> Send to {activeKind === 'creator' ? 'creative mail' : 'brand mail'}
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDrafts((current) => ({ ...current, [activeKind]: e.target.value }))}
                rows={22}
                className="w-full px-4 py-3 text-[13px] leading-relaxed rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] font-mono"
                data-testid="bc-contract-editor"
              />
              <V3DocumentSurface title={activeKind === 'creator' ? 'Creative Contract Preview' : 'Brand/Admin Contract Preview'}>
                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed font-sans">{draft}</pre>
              </V3DocumentSurface>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
};

const buildDemoStrategySnapshotDraft = ({ bundle, creator, briefText = '', response = {} }) => {
  const now = new Date().toISOString();
  const businessCase = bundle.business_case || {};
  const alignment = bundle.alignment_snapshot?.marketing_intelligence || {};
  const existing = bundle.creative_snapshot || {};
  const selectedCreator = creator || bundle.creator || {};
  const creatorName = selectedCreator.name || 'Selected creator';
  const focus = alignment.key_marketing_focus || businessCase.connect?.stated_intent || businessCase.title || 'the approved brand opportunity';
  const audience = alignment.primary_target_audience || 'the approved primary audience';
  const channels = Array.isArray(alignment.key_marketing_channels) && alignment.key_marketing_channels.length
    ? alignment.key_marketing_channels
    : ['Instagram', 'TikTok', 'YouTube'];
  const rawKpis = Array.isArray(alignment.marketing_kpis) && alignment.marketing_kpis.length
    ? alignment.marketing_kpis
    : [
        { kpi: 'Qualified reach', target: 'Confirm brand-approved reach target before launch.' },
        { kpi: 'Engagement quality', target: 'Track saves, shares, comments, and branded conversation.' },
        { kpi: 'Conversion action', target: 'Measure the agreed campaign action from creator-led traffic.' },
      ];
  const budgetTotal = Number(businessCase.estimated_value || 0);
  const trimmedBrief = briefText.trim();
  const briefSummary = trimmedBrief
    ? `The sent creative brief asks ${creatorName} to respond to: ${trimmedBrief.replace(/\s+/g, ' ').slice(0, 360)}${trimmedBrief.length > 360 ? '...' : ''}`
    : `The creative brief positions ${creatorName} around the approved brand opportunity.`;
  const concept = response.proposed_concept
    || `${creatorName} will translate "${focus}" into a creator-led campaign for ${audience}, built around ${channels.join(', ')}. ${briefSummary}`;

  return {
    ...existing,
    id: existing.id || `strategy-demo-${businessCase.id}`,
    business_case_id: businessCase.id,
    title: existing.title || `${businessCase.title || 'Campaign'}: Strategy Snapshot v1`,
    status: 'draft',
    concept,
    deliverables: [
      { num: 1, title: `Hero creative direction led by ${creatorName}`, format: 'Campaign idea', duration: 'Core strategy' },
      { num: 2, title: `Channel-specific content plan for ${channels.join(', ')}`, format: 'Social content plan', duration: 'Launch window' },
      { num: 3, title: 'Creator fee, conditions, usage guardrails, and availability summary', format: 'Commercial plan', duration: 'Pre-contract' },
      { num: 4, title: 'Brand review, revision moments, and launch checklist', format: 'Approval workflow', duration: 'Pre-launch' },
    ],
    budget: [
      { line: 'Creator fee', amount: Math.round(budgetTotal * 0.45), note: response.fee_expectation || 'Pending creator fee confirmation.' },
      { line: 'Production', amount: Math.round(budgetTotal * 0.25), note: response.availability || 'Production scope to be confirmed after creator response.' },
      { line: 'Amplification', amount: Math.round(budgetTotal * 0.2), note: `Priority channels: ${channels.join(', ')}.` },
      { line: 'TASCK management', amount: Math.round(budgetTotal * 0.1), note: response.conditions || 'Usage, payment schedule, and final conditions to be confirmed in contract.' },
    ],
    success_metrics: rawKpis.map((item) => ({
      kpi: item.kpi || item.name || String(item),
      target: item.target || item.value || 'Confirm target with brand.',
    })),
    brand_comments: existing.brand_comments || [],
    created_at: existing.created_at || now,
    updated_at: now,
    ai_source: response.ai_source || 'creative_brief_auto_strategy_draft',
  };
};

const V3AdminBusinessCaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('frame');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [creators, setCreators] = useState([]);
  // Plan-phase editable drafts (session-scoped)
  const [planBrainstormText, setPlanBrainstormText] = useState('');
  const [planStrategyDraft, setPlanStrategyDraft] = useState({});

  const reload = () => v3GetBusinessCase(id)
    .then((next) => {
      setBundle(next);
      setError(null);
    })
    .catch((e) => {
      setError(e.message || 'Failed to load business case.');
    });

  useEffect(() => {
    v3GetCreators().then((list) => setCreators(Array.isArray(list) ? list : [])).catch(() => setCreators([]));
  }, []);

  useEffect(() => {
    reload();
  }, [id]);

  useEffect(() => {
    if (bundle?.business_case?.stage) {
      setTab(stageToTab(bundle.business_case.stage));
    }
  }, [bundle?.business_case?.id, bundle?.business_case?.stage]);

  if (error)
    return (
      <div className="v3-card p-10 text-center" data-testid="bc-detail-error">
        <AlertOctagon className="w-6 h-6 mx-auto mb-2 text-[#B54A37]" />
        <p className="text-[#B54A37] text-[13px]">{error}</p>
      </div>
    );
  if (!bundle) return <div className="v3-card p-10 text-center text-[#8A8A8A]">Loading…</div>;

  const c = bundle.business_case;
  const isGrant = c.engagement_track === 'grant';
  const creativeBriefs = (Array.isArray(bundle.creative_briefs) && bundle.creative_briefs.length
    ? bundle.creative_briefs
    : bundle.creative_brief ? [bundle.creative_brief] : []
  ).filter(Boolean);
  const caseDeliverables = Array.isArray(bundle.deliverables) ? bundle.deliverables : [];
  const approvedDeliverableCount = caseDeliverables.filter((item) => item.status === 'approved').length;
  const planEstimatedValue = c.estimated_value || 0;
  const defaultBrainstormContentPlan = [
    { item: 'Hero creator film', owner: 'Creative', format: '60 to 90 seconds', status: 'planned' },
    { item: 'Social cutdowns', owner: 'Creative and TASCK', format: '6 vertical videos', status: 'planned' },
    { item: 'Behind the scenes content', owner: 'TASCK production', format: '10 BTS assets', status: 'planned' },
    { item: 'Launch copy and posting guide', owner: 'TASCK strategy', format: 'Caption and CTA kit', status: 'planned' },
  ];
  const defaultBrainstormBudgetPlan = [
    { line: 'Creator fee', amount: Math.round(planEstimatedValue * 0.28), owner: 'TASCK negotiates with creative' },
    { line: 'Production budget', amount: Math.round(planEstimatedValue * 0.22), owner: 'TASCK production planning' },
    { line: 'Paid media and amplification', amount: Math.round(planEstimatedValue * 0.18), owner: 'Brand and TASCK' },
    { line: 'Strategy Development Fee', amount: Math.max(4000000, Math.round(planEstimatedValue * 0.035)), owner: 'Brand pays before Strategy Snapshot' },
  ];
  const defaultBrainstormRevenuePlan = {
    brand_budget: planEstimatedValue,
    creator_fee: defaultBrainstormBudgetPlan[0].amount,
    production_budget: defaultBrainstormBudgetPlan[1].amount,
    strategy_development_fee: defaultBrainstormBudgetPlan[3].amount,
    tasck_management_fee: Math.round(planEstimatedValue * 0.12),
    projected_tasck_revenue: defaultBrainstormBudgetPlan[3].amount + Math.round(planEstimatedValue * 0.12),
  };
  const defaultBrainstormContractPlan = [
    { item: 'Brand service agreement', detail: 'Confirm campaign scope, brand approvals, payment schedule, usage rights, and reporting obligations.' },
    { item: 'Independent creator agreement', detail: 'Confirm creator deliverables, fees, usage, exclusivity, cancellation, and payment triggers.' },
    { item: 'Budget schedule', detail: 'Attach creator fee, production spend, paid media, Strategy Development Fee, and TASCK management fee.' },
    { item: 'Deliverables schedule', detail: 'Attach final deliverable list before signature so Delivery and Reports use the same source.' },
  ];
  const brainstormContentPlan = Array.isArray(bundle.brainstorm_round?.content_plan) && bundle.brainstorm_round.content_plan.length
    ? bundle.brainstorm_round.content_plan
    : defaultBrainstormContentPlan;
  const brainstormBudgetPlan = Array.isArray(bundle.brainstorm_round?.budget_plan) && bundle.brainstorm_round.budget_plan.length
    ? bundle.brainstorm_round.budget_plan
    : defaultBrainstormBudgetPlan;
  const brainstormRevenuePlan = bundle.brainstorm_round?.revenue_plan || defaultBrainstormRevenuePlan;
  const brainstormContractPlan = Array.isArray(bundle.brainstorm_round?.contract_plan) && bundle.brainstorm_round.contract_plan.length
    ? bundle.brainstorm_round.contract_plan
    : defaultBrainstormContractPlan;
  const flash = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const wrap = (fn) => async () => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      flash(e.response?.data?.detail ? JSON.stringify(e.response.data.detail) : e.message);
    } finally {
      setBusy(false);
    }
  };

  const scrollToWorkflowTabs = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    window.setTimeout(() => {
      document.querySelector('[data-testid="bc-tabs"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const shouldUseDemoFallback = (errorValue) => {
    if (['mock', 'demo'].includes(bundle?.source)) return true;
    const message = errorValue?.response?.data?.detail || errorValue?.message || '';
    return /backend unavailable|network|failed to fetch|not found|html/i.test(String(message));
  };

  const applyLocalStage = (targetTab, options = {}) => {
    const now = new Date().toISOString();
    const nextStage = tabToStage(targetTab);
    setBundle((prev) => {
      if (!prev) return prev;
      const businessCase = prev.business_case || {};
      const nextBusinessCase = {
        ...businessCase,
        stage: nextStage,
        days_in_stage: 0,
        next_action: options.nextAction || STAGE_NEXT_ACTIONS[targetTab] || businessCase.next_action,
      };

      if (targetTab === 'frame') {
        nextBusinessCase.connect = {
          ...(businessCase.connect || {}),
          status: 'qualified_to_frame',
          connect_status: 'qualified_to_frame',
        };
      }

      if (targetTab === 'plan') {
        nextBusinessCase.frame = {
          ...(businessCase.frame || {}),
          alignment_snapshot_status: 'approved',
          alignment_snapshot_approved_at: businessCase.frame?.alignment_snapshot_approved_at || now,
        };
      }

      if (targetTab === 'deliver') {
        nextBusinessCase.plan = {
          ...(businessCase.plan || {}),
          creative_snapshot_status: prev.creative_snapshot ? 'approved' : businessCase.plan?.creative_snapshot_status || 'approved',
          creative_snapshot_approved_at: businessCase.plan?.creative_snapshot_approved_at || now,
          contract_status: prev.contract ? 'signed' : businessCase.plan?.contract_status || 'ready',
          contract_signed_at: prev.contract ? businessCase.plan?.contract_signed_at || now : businessCase.plan?.contract_signed_at,
        };
        nextBusinessCase.deliver = {
          ...(businessCase.deliver || {}),
          budget_planning_status: businessCase.deliver?.budget_planning_status || 'in_progress',
          timeline_planning_status: businessCase.deliver?.timeline_planning_status || 'in_progress',
          delivery_status: businessCase.deliver?.delivery_status || 'in_progress',
        };
      }

      if (targetTab === 'closure') {
        nextBusinessCase.deliver = {
          ...(businessCase.deliver || {}),
          delivery_status: 'completed',
        };
        nextBusinessCase.closure = {
          ...(businessCase.closure || {}),
          report_status: prev.final_report ? 'generated' : 'pending',
        };
      }

      const nextAlignment = targetTab === 'plan' && prev.alignment_snapshot
        ? {
            ...prev.alignment_snapshot,
            status: 'approved',
            approved_at: prev.alignment_snapshot.approved_at || now,
            approved_by: prev.alignment_snapshot.approved_by || 'Admin',
            approved_by_party: prev.alignment_snapshot.approved_by_party || 'admin',
          }
        : prev.alignment_snapshot;

      const nextStrategy = targetTab === 'deliver' && prev.creative_snapshot
        ? {
            ...prev.creative_snapshot,
            status: 'approved',
            approved_at: prev.creative_snapshot.approved_at || now,
            approved_by: prev.creative_snapshot.approved_by || 'Admin',
          }
        : prev.creative_snapshot;

      const nextContract = targetTab === 'deliver' && prev.contract
        ? {
            ...prev.contract,
            status: 'signed',
            signed_at: prev.contract.signed_at || now,
          }
        : prev.contract;

      return {
        ...prev,
        business_case: nextBusinessCase,
        alignment_snapshot: nextAlignment,
        creative_snapshot: nextStrategy,
        contract: nextContract,
      };
    });
    setTab(targetTab);
    scrollToWorkflowTabs();
  };

  const advanceBusinessCaseStage = async (targetTab) => {
    const targetLabel = getStageLabel(targetTab);
    setBusy(true);
    try {
      try {
        await v3AdvanceBusinessCase(c.id, {
          actor: 'admin',
          override: true,
          reason: `Admin finished ${getStageLabel(c.stage)} and opened ${targetLabel} from the Control Center.`,
        });
        await reload();
        setTab(targetTab);
        scrollToWorkflowTabs();
        flash(`${targetLabel} opened.`);
      } catch (e) {
        if (!shouldUseDemoFallback(e)) throw e;
        applyLocalStage(targetTab);
        flash(`Demo mode: ${targetLabel} opened and saved locally.`);
      }
    } catch (e) {
      flash(e.response?.data?.detail ? JSON.stringify(e.response.data.detail) : e.message);
    } finally {
      setBusy(false);
    }
  };

  const updateLocalAlignment = (updates, businessCaseUpdates = {}) => {
    setBundle((prev) => {
      if (!prev) return prev;
      const alignment = prev.alignment_snapshot || {};
      const businessCase = prev.business_case || {};
      return {
        ...prev,
        alignment_snapshot: { ...alignment, ...updates },
        business_case: {
          ...businessCase,
          ...businessCaseUpdates,
          frame: {
            ...(businessCase.frame || {}),
            alignment_snapshot_status: updates.status || businessCase.frame?.alignment_snapshot_status,
          },
        },
      };
    });
  };

  const saveAlignmentDraft = async (payload, sendAfterSave = false) => {
    setBusy(true);
    try {
      try {
        await v3UpdateAlignment(bundle.alignment_snapshot.id, payload);
        if (sendAfterSave) await v3SendAlignmentToBrand(c.id);
        await reload();
        flash(sendAfterSave ? 'Alignment Snapshot saved and sent to brand.' : 'Alignment Snapshot draft saved.');
      } catch (e) {
        updateLocalAlignment({
          ...payload,
          status: sendAfterSave ? 'sent_to_brand' : bundle.alignment_snapshot.status,
          last_edited_at: new Date().toISOString(),
          last_edited_by: payload.reviewer || 'admin',
          sent_to_brand_at: sendAfterSave ? new Date().toISOString() : bundle.alignment_snapshot.sent_to_brand_at,
        });
        flash(sendAfterSave ? 'Demo mode: draft saved and email queued to brand.' : 'Demo mode: draft saved locally.');
      }
    } finally {
      setBusy(false);
    }
  };

  const sendAlignmentToBrand = async () => {
    setBusy(true);
    try {
      try {
        await v3SendAlignmentToBrand(c.id);
        await reload();
        flash('Alignment Snapshot sent to brand.');
      } catch (e) {
        updateLocalAlignment({ status: 'sent_to_brand', sent_to_brand_at: new Date().toISOString() });
        flash('Demo mode: Alignment Snapshot email queued to brand.');
      }
    } finally {
      setBusy(false);
    }
  };

  const approveAlignment = async (approverParty = 'admin') => {
    const targetTab = c.stage === 'connect' ? 'frame' : 'plan';
    const targetLabel = getStageLabel(targetTab);
    setBusy(true);
    try {
      try {
        await v3ApproveAlignmentAs(c.id, approverParty === 'brand_proxy' ? 'Admin proxy' : 'Admin', approverParty);
        await reload();
        setTab(targetTab);
        scrollToWorkflowTabs();
        flash(approverParty === 'brand_proxy' ? `Approved on behalf of brand. ${targetLabel} opened.` : `Alignment Snapshot approved. ${targetLabel} opened.`);
      } catch (e) {
        updateLocalAlignment(
          {
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: approverParty === 'brand_proxy' ? 'Admin proxy' : 'Admin',
            approved_by_party: approverParty,
          },
          {
            stage: tabToStage(targetTab),
            days_in_stage: 0,
            next_action: STAGE_NEXT_ACTIONS[targetTab] || 'Find creators that match the approved Alignment Snapshot.',
          }
        );
        setTab(targetTab);
        scrollToWorkflowTabs();
        flash(approverParty === 'brand_proxy' ? `Demo mode: approved on behalf of brand. ${targetLabel} opened.` : `Demo mode: approved. ${targetLabel} opened.`);
      }
    } finally {
      setBusy(false);
    }
  };

  // Build an Alignment Snapshot from real business-case data when the
  // backend doesn't have a saved snapshot yet. Sections follow the
  // Project Alignment Snapshot template.
  const buildAlignmentSnapshotFromBusinessCase = (bc) => {
    const frame = bc?.frame || {};
    const plan = bc?.plan || {};
    const sec = (heading, body) => ({ heading, type: 'prose', content: body && String(body).trim() ? String(body) : 'Not provided' });
    const arr = (v) => (Array.isArray(v) && v.length ? v.join(', ') : 'Not provided');
    const brandLabel = bc?.brand_name || bc?.unlinked_brand_name || 'Unlinked brand';
    const id = `align-${bc?.id || Math.random().toString(36).slice(2, 9)}`;
    return {
      id,
      status: 'draft',
      title: `${brandLabel} — Alignment Snapshot`,
      meta: {
        brand: brandLabel,
        relationship_manager: bc?.rm_name || 'Unassigned',
        stage: bc?.stage_label || bc?.stage || '—',
        engagement: bc?.engagement_track || 'paid',
      },
      sections: [
        sec('Purpose of this note', `Confirm strategic alignment with ${brandLabel} on ${bc?.title || 'the proposed project'} ahead of moving into Plan.`),
        sec('Business context', frame.project_context),
        sec('User & market landscape', frame.success_factors),
        sec('Strategic entry point', frame.framework),
        sec('Strategic direction', frame.project_goal),
        sec('Creator approach (non-binding)', arr(plan.creator_shortlist)),
        sec('Expected outcomes', frame.success_factors),
        sec('Commercial context (directional)', bc?.value_label || (bc?.value_amount ? `${bc.value_currency || ''} ${bc.value_amount}` : null)),
        sec('Why focus matters', bc?.next_action),
        sec('Engagement model', `${bc?.engagement_track === 'grant' ? 'Grant-funded engagement.' : 'Paid strategy engagement.'} Strategy Development Fee covers planning before full execution.`),
        sec('Next steps', bc?.next_action),
      ],
      scope_flags: [],
      brand_comments: [],
      approved_at: null,
      approved_by: null,
      approved_by_party: null,
      sent_to_brand_at: null,
    };
  };

  const generateAlignmentDraft = async () => {
    setBusy(true);
    try {
      try {
        await v3GenerateAlignment(c.id);
        await reload();
        flash('AI Alignment Snapshot generated.');
      } catch (e) {
        const snapshot = buildAlignmentSnapshotFromBusinessCase(c);
        setBundle((prev) => ({
          ...prev,
          alignment_snapshot: snapshot,
          business_case: {
            ...prev.business_case,
            frame: {
              ...(prev.business_case.frame || {}),
              alignment_snapshot_id: snapshot.id,
              alignment_snapshot_status: snapshot.status,
              scope_flags_total: snapshot.scope_flags.length,
              scope_flags_resolved: 0,
            },
          },
        }));
        flash('Alignment Snapshot drafted from business-case data. Edit and send when ready.');
      }
    } finally {
      setBusy(false);
    }
  };

  const updateLocalStrategySnapshot = (updates) => {
    setBundle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        creative_snapshot: { ...(prev.creative_snapshot || {}), ...updates },
        business_case: {
          ...prev.business_case,
          plan: {
            ...(prev.business_case.plan || {}),
            creative_snapshot_status: updates.status || prev.business_case.plan?.creative_snapshot_status,
            strategy_snapshot_status: updates.status || prev.business_case.plan?.strategy_snapshot_status,
          },
        },
      };
    });
  };

  const saveStrategySnapshot = async (payload, sendAfterSave = false) => {
    setBusy(true);
    try {
      try {
        await v3UpdateStrategySnapshot(bundle.creative_snapshot.id, payload);
        if (sendAfterSave) await v3SendStrategySnapshotToBrand(c.id);
        await reload();
        flash(sendAfterSave ? 'Strategy Snapshot saved and sent to brand.' : 'Strategy Snapshot draft saved.');
      } catch (e) {
        updateLocalStrategySnapshot({
          ...payload,
          status: sendAfterSave ? 'sent_to_brand' : bundle.creative_snapshot.status,
          shared_at: sendAfterSave ? new Date().toISOString() : bundle.creative_snapshot.shared_at,
          last_edited_at: new Date().toISOString(),
          last_edited_by: payload.reviewer || 'admin',
        });
        flash(sendAfterSave ? 'Demo mode: Strategy Snapshot saved and email queued to brand.' : 'Demo mode: Strategy Snapshot draft saved.');
      }
    } finally {
      setBusy(false);
    }
  };

  const sendStrategySnapshot = async () => {
    setBusy(true);
    try {
      try {
        await v3SendStrategySnapshotToBrand(c.id);
        await reload();
        flash('Strategy Snapshot sent to brand.');
      } catch (e) {
        updateLocalStrategySnapshot({ status: 'sent_to_brand', shared_at: new Date().toISOString() });
        flash('Demo mode: Strategy Snapshot email queued to brand.');
      }
    } finally {
      setBusy(false);
    }
  };

  const approveStrategySnapshot = async () => {
    setBusy(true);
    try {
      try {
        await v3ApproveSnapshot(c.id, bundle.brand?.primary_contact || 'Brand');
        await reload();
        setTab('deliver');
        scrollToWorkflowTabs();
        flash('Strategy Snapshot approved. Delivery opened for contracts and planning.');
      } catch (e) {
        updateLocalStrategySnapshot({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: bundle.brand?.primary_contact || 'Brand',
        });
        applyLocalStage('deliver');
        flash('Demo mode: Strategy Snapshot approved. Delivery opened for contracts and planning.');
      }
    } finally {
      setBusy(false);
    }
  };

  const markStrategyFeePaid = async (invoiceId) => {
    setBusy(true);
    try {
      try {
        await v3MarkInvoicePaid(invoiceId);
        await reload();
        flash('Strategy Development Fee marked paid.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            invoices: (Array.isArray(prev.invoices) ? prev.invoices : []).map((inv) =>
              inv.id === invoiceId ? { ...inv, status: 'paid', paid_at: new Date().toISOString() } : inv
            ),
            business_case: {
              ...prev.business_case,
              frame: {
                ...(prev.business_case.frame || {}),
                strategy_development_fee_paid: true,
              },
            },
          };
        });
        flash('Demo mode: Strategy Development Fee marked paid.');
      }
    } finally {
      setBusy(false);
    }
  };

  const editStrategyFee = async (invoice) => {
    const rawAmount = prompt('Strategy Development Fee amount?', String(invoice.amount || ''));
    if (!rawAmount) return;
    const nextAmount = Number(rawAmount.replace(/[^\d.]/g, ''));
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      flash('Enter a valid Strategy Development Fee amount.');
      return;
    }
    setBusy(true);
    try {
      try {
        await v3UpdateInvoice(invoice.id, { amount: nextAmount });
        await reload();
        flash('Strategy Development Fee updated.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            invoices: (Array.isArray(prev.invoices) ? prev.invoices : []).map((inv) =>
              inv.id === invoice.id ? { ...inv, amount: nextAmount, updated_at: new Date().toISOString() } : inv
            ),
            business_case: {
              ...prev.business_case,
              frame: {
                ...(prev.business_case.frame || {}),
                strategy_development_fee_amount: nextAmount,
              },
            },
          };
        });
        flash('Demo mode: Strategy Development Fee updated.');
      }
    } finally {
      setBusy(false);
    }
  };

  const editDeliverable = async (deliverable) => {
    const title = prompt('Deliverable title?', deliverable.title || '');
    if (!title) return;
    const status = prompt('Status: pending_upload, pending_rm_review, approved', deliverable.status || 'pending_upload') || deliverable.status || 'pending_upload';
    const dueDate = prompt('Due date? Leave blank to keep current.', deliverable.due_date || '') || deliverable.due_date;
    const payload = { title, status, due_date: dueDate };
    setBusy(true);
    try {
      try {
        await v3UpdateDeliverable(deliverable.id, payload);
        await reload();
        flash('Deliverable updated.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          const deliverables = (Array.isArray(prev.deliverables) ? prev.deliverables : []).map((item) =>
            item.id === deliverable.id ? { ...item, ...payload, updated_at: new Date().toISOString() } : item
          );
          const approved = deliverables.filter((item) => item.status === 'approved').length;
          return {
            ...prev,
            deliverables,
            business_case: {
              ...prev.business_case,
              deliver: {
                ...(prev.business_case.deliver || {}),
                deliverables_total: deliverables.length,
                deliverables_complete: approved,
                milestones_total: deliverables.length,
                milestones_complete: approved,
              },
            },
          };
        });
        flash('Demo mode: deliverable updated.');
      }
    } finally {
      setBusy(false);
    }
  };

  const addDeliverable = async () => {
    const title = prompt('Deliverable title?');
    if (!title) return;
    setBusy(true);
    try {
      try {
        await v3AddDeliverable({ business_case_id: c.id, title });
        await reload();
        flash('Deliverable added.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          const deliverables = [
            ...(Array.isArray(prev.deliverables) ? prev.deliverables : []),
            {
              id: `deliverable-demo-${Date.now()}`,
              business_case_id: prev.business_case.id,
              title,
              status: 'pending_upload',
              payment_released: false,
            },
          ];
          const approved = deliverables.filter((item) => item.status === 'approved').length;
          return {
            ...prev,
            deliverables,
            business_case: {
              ...prev.business_case,
              deliver: {
                ...(prev.business_case.deliver || {}),
                deliverables_total: deliverables.length,
                deliverables_complete: approved,
                milestones_total: deliverables.length,
                milestones_complete: approved,
              },
            },
          };
        });
        flash('Demo mode: deliverable added.');
      }
    } finally {
      setBusy(false);
    }
  };

  const generateFinalReport = async () => {
    setBusy(true);
    try {
      try {
        await v3GenerateFinalReport(c.id);
        await reload();
        flash('Final Report generated.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          const deliverables = Array.isArray(prev.deliverables) ? prev.deliverables : [];
          const approved = deliverables.filter((item) => item.status === 'approved');
          const report = {
            id: `final-report-demo-${prev.business_case.id}`,
            business_case_id: prev.business_case.id,
            status: 'ready_for_brand',
            generated_at: new Date().toISOString(),
            title: `${prev.business_case.title} Final Campaign Report`,
            summary: `${prev.business_case.title} delivered ${approved.length} of ${deliverables.length} contracted deliverables. KPI performance, creator execution, budget handling, and closure readiness are summarised below.`,
            deliverables,
            kpis: [
              { kpi: 'Reach', target: '10M', actual: '11.8M', variance: '+18%' },
              { kpi: 'Engagement rate', target: '7%', actual: '8.1%', variance: '+16%' },
              { kpi: 'Earned media value', target: 'N200M', actual: 'N238M', variance: '+19%' },
            ],
            closure_checklist: [
              { item: 'Final report delivered', status: 'done' },
              { item: 'All invoices settled', status: 'done' },
              { item: 'All creator payments released', status: approved.every((item) => item.payment_released) ? 'done' : 'pending' },
              { item: 'Contracts archived', status: prev.contract ? 'done' : 'pending' },
              { item: 'Brand feedback received', status: 'pending' },
              { item: 'Creator feedback received', status: 'pending' },
            ],
          };
          return {
            ...prev,
            final_report: report,
            business_case: {
              ...prev.business_case,
              closure: {
                ...(prev.business_case.closure || {}),
                final_report_id: report.id,
                final_report_status: 'ready_for_brand',
                report_status: 'generated',
                closure_pct: 50,
              },
            },
          };
        });
        flash('Demo mode: Final Report generated.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitBrandFeedback = async () => {
    setBusy(true);
    try {
      try {
        const rater = bundle.brand?.primary_contact || 'Brand';
        await v3SubmitBrandFeedback(c.id, {
          rater,
          scores: { clarity: 10, communication: 9, deliverables: 9, budget: 8, reporting: 10 },
          comment: 'Google Form-style checklist submitted after final report.',
        });
        await reload();
        flash('Brand feedback recorded.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            business_case: {
              ...prev.business_case,
              closure: {
                ...(prev.business_case.closure || {}),
                brand_feedback_received: true,
                closure_pct: Math.max(prev.business_case.closure?.closure_pct || 0, 75),
              },
            },
          };
        });
        flash('Demo mode: brand feedback recorded.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitCreatorFeedback = async () => {
    setBusy(true);
    try {
      try {
        await v3SubmitCreatorFeedback(c.id, {
          rater: bundle.creator?.name || 'Creator',
          scores: { professionalism: 9, clarity: 9, payment_speed: 9 },
          comment: 'Auto-submitted from admin panel after final report.',
        });
        await reload();
        flash('Creator feedback recorded.');
      } catch (e) {
        setBundle((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            business_case: {
              ...prev.business_case,
              closure: {
                ...(prev.business_case.closure || {}),
                creator_feedback_received: true,
                closure_pct: Math.max(prev.business_case.closure?.closure_pct || 0, 90),
              },
            },
          };
        });
        flash('Demo mode: creator feedback recorded.');
      }
    } finally {
      setBusy(false);
    }
  };

  const createDemoBrainstorm = (scored = []) => {
    setBundle((prev) => {
      if (!prev) return prev;
      const estimatedValue = prev.business_case.estimated_value || 0;
      const creatorFee = Math.round(estimatedValue * 0.28);
      const productionBudget = Math.round(estimatedValue * 0.22);
      const paidMediaBudget = Math.round(estimatedValue * 0.18);
      const strategyFee = Math.max(4000000, Math.round(estimatedValue * 0.035));
      const tasckManagementFee = Math.round(estimatedValue * 0.12);
      return {
        ...prev,
        brainstorm_round: {
          id: `brainstorm-demo-${prev.business_case.id}`,
          business_case_id: prev.business_case.id,
          phases: [
            'Audience fit',
            'Cultural fit',
            'Channel fit',
            'Conversion behavior',
            'Brand safety',
            'Reliability',
            'Shortlist decision',
          ].map((label, index) => ({ phase: index + 1, label, status: 'complete' })),
          scored_creators: scored.map((item, index) => ({
            ...item,
            eliminated: item.conversion_behavior < 3,
            reason: item.conversion_behavior < 3 ? 'Conversion behaviour below threshold' : item.reason,
            rank: index + 1,
          })),
          content_plan: [
            { item: 'Hero creator film', owner: 'Creative', format: '60 to 90 seconds', status: 'planned' },
            { item: 'Social cutdowns', owner: 'Creative and TASCK', format: '6 vertical videos', status: 'planned' },
            { item: 'Behind the scenes content', owner: 'TASCK production', format: '10 BTS assets', status: 'planned' },
            { item: 'Launch copy and posting guide', owner: 'TASCK strategy', format: 'Caption and CTA kit', status: 'planned' },
          ],
          budget_plan: [
            { line: 'Creator fee', amount: creatorFee, owner: 'TASCK negotiates with creative' },
            { line: 'Production budget', amount: productionBudget, owner: 'TASCK production planning' },
            { line: 'Paid media and amplification', amount: paidMediaBudget, owner: 'Brand and TASCK' },
            { line: 'Strategy Development Fee', amount: strategyFee, owner: 'Brand pays before Strategy Snapshot' },
          ],
          revenue_plan: {
            brand_budget: estimatedValue,
            creator_fee: creatorFee,
            production_budget: productionBudget,
            strategy_development_fee: strategyFee,
            tasck_management_fee: tasckManagementFee,
            projected_tasck_revenue: strategyFee + tasckManagementFee,
          },
          contract_plan: [
            { item: 'Brand service agreement', detail: 'Confirm campaign scope, brand approvals, payment schedule, usage rights, and reporting obligations.' },
            { item: 'Independent creator agreement', detail: 'Confirm creator deliverables, fees, usage, exclusivity, cancellation, and payment triggers.' },
            { item: 'Budget schedule', detail: 'Attach creator fee, production spend, paid media, Strategy Development Fee, and TASCK management fee.' },
            { item: 'Deliverables schedule', detail: 'Attach final deliverable list before signature so Delivery and Reports use the same source.' },
          ],
          created_at: new Date().toISOString(),
        },
      };
    });
    flash('Demo mode: creator brainstorm completed.');
  };

  const clearDemoBrainstorm = () => {
    setBundle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        brainstorm_round: null,
        business_case: {
          ...prev.business_case,
          next_action: 'Choose AI matching, web search, or brainstorm before sending the creator brief.',
        },
      };
    });
    flash('Back to creator selection.');
  };

  const selectDemoCreator = (creatorId) => {
    const selected = creators.find((cr) => cr.id === creatorId);
    if (!selected) return;
    setBundle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        creator: selected,
        business_case: {
          ...prev.business_case,
          creator_id: creatorId,
          next_action: `Brief ${selected.name}. The Strategy Snapshot will draft automatically after the brief is sent.`,
        },
      };
    });
    flash(`${selected.name} selected for briefing.`);
  };

  const createDemoBrief = ({ creatorId, briefText }) => {
    const selected = creators.find((cr) => cr.id === creatorId);
    setBundle((prev) => {
      if (!prev) return prev;
      const creator = selected || prev.creator;
      const creatorName = creator?.name || 'Selected creator';
      const invoices = Array.isArray(prev.invoices) ? prev.invoices : [];
      const existingBriefs = Array.isArray(prev.creative_briefs)
        ? prev.creative_briefs
        : prev.creative_brief ? [prev.creative_brief] : [];
      const hasSdfInvoice = invoices.some((inv) => inv.kind === 'strategy_development_fee');
      const strategyFee = Math.max(4000000, Math.round((prev.business_case.estimated_value || 0) * 0.035));
      const sentAt = new Date().toISOString();
      const creatorResponse = {
        interest: 'Creative Brief sent; awaiting creator confirmation.',
        fee_expectation: 'Pending creator fee confirmation.',
        availability: 'Pending creator availability confirmation.',
        conditions: 'Pending creator or manager conditions.',
        proposed_concept: `${creatorName} has been briefed. AI created this first Strategy Snapshot draft from the approved Alignment Snapshot and the sent creative brief so the admin can edit it immediately.`,
        responded_at: null,
        ai_source: 'creative_brief_auto_strategy_draft',
      };
      const creativeBrief = {
        id: `brief-demo-${prev.business_case.id}-${existingBriefs.length + 1}`,
        business_case_id: prev.business_case.id,
        creator_id: creatorId,
        brief_text: briefText,
        status: 'sent',
        sent_at: sentAt,
        sent_via: 'email',
        creator_response: creatorResponse,
      };
      const snapshotBundle = {
        ...prev,
        creator,
        creative_brief: creativeBrief,
      };
      return {
        ...prev,
        creator,
        creative_brief: creativeBrief,
        creative_briefs: [creativeBrief, ...existingBriefs],
        creative_snapshot: buildDemoStrategySnapshotDraft({
          bundle: snapshotBundle,
          creator,
          briefText,
          response: creatorResponse,
        }),
        invoices: prev.business_case.engagement_track === 'grant' || hasSdfInvoice
          ? invoices
          : [
              ...invoices,
              {
                id: `sdf-demo-${prev.business_case.id}`,
                business_case_id: prev.business_case.id,
                kind: 'strategy_development_fee',
                amount: strategyFee,
                status: 'issued',
                issued_at: new Date().toISOString(),
              },
            ],
        business_case: {
          ...prev.business_case,
          creator_id: creatorId,
          plan: {
            ...(prev.business_case.plan || {}),
            creative_brief_status: 'sent',
            creative_brief_ids: [creativeBrief.id, ...existingBriefs.map((brief) => brief.id)],
            creative_snapshot_status: 'draft',
            strategy_snapshot_status: 'draft',
          },
          next_action: 'Review, edit, and send the auto-generated Strategy Snapshot to the brand for approval.',
        },
      };
    });
    flash('Demo mode: Creative Brief sent and Strategy Snapshot drafted for admin review.');
  };

  const sendDemoBriefDiscussionToAi = (discussionTranscript = '') => {
    setBundle((prev) => {
      if (!prev?.creative_brief) return prev;
      const creatorName = prev.creator?.name || 'Selected creator';
      const fee = Math.max(3000000, Math.round((prev.business_case.estimated_value || 0) * 0.28));
      const cleanTranscript = discussionTranscript.trim();
      const creatorResponse = {
        interest: 'Aligned after admin-creative brief discussion',
        fee_expectation: formatNairaV3(fee),
        availability: 'Available for briefing and production in the proposed campaign window.',
        conditions: 'Final usage rights, payment schedule, and posting windows to be confirmed in contract.',
        proposed_concept: cleanTranscript
          ? `${creatorName} aligned on this direction after the admin-creative brief discussion: ${cleanTranscript}`
          : `${creatorName} can anchor the campaign with a culturally relevant concept that translates the approved Alignment Snapshot into social-first storytelling, creator-led moments, and measurable conversion prompts.`,
        responded_at: new Date().toISOString(),
        ai_source: 'admin_creator_brief_discussion',
      };
      const creativeBrief = {
        ...prev.creative_brief,
        status: 'ai_ready_for_strategy',
        admin_creator_discussion_transcript: cleanTranscript,
        creator_response: creatorResponse,
      };
      const snapshotBundle = {
        ...prev,
        creative_brief: creativeBrief,
      };
      return {
        ...prev,
        creative_brief: creativeBrief,
        creative_briefs: (Array.isArray(prev.creative_briefs) ? prev.creative_briefs : [prev.creative_brief]).map((brief) =>
          brief?.id === creativeBrief.id ? creativeBrief : brief
        ),
        creative_snapshot: buildDemoStrategySnapshotDraft({
          bundle: snapshotBundle,
          creator: prev.creator,
          briefText: prev.creative_brief.brief_text || '',
          response: creatorResponse,
        }),
        business_case: {
          ...prev.business_case,
          plan: {
            ...(prev.business_case.plan || {}),
            creative_brief_status: 'ai_ready_for_strategy',
            creative_snapshot_status: 'draft',
            strategy_snapshot_status: 'draft',
          },
          next_action: 'Review the updated Strategy Snapshot, then send it to the brand for approval.',
        },
      };
    });
    flash('Demo mode: brief discussion sent to AI and Strategy Snapshot updated.');
  };

  const sendDemoBriefReminder = () => {
    flash('Demo mode: reminder email queued for creator or manager.');
  };

  const draftDemoStrategySnapshot = () => {
    setBundle((prev) => {
      if (!prev) return prev;
      const response = prev.creative_brief?.creator_response || {};
      return {
        ...prev,
        creative_snapshot: buildDemoStrategySnapshotDraft({
          bundle: prev,
          creator: prev.creator,
          briefText: prev.creative_brief?.brief_text || '',
          response,
        }),
        business_case: {
          ...prev.business_case,
          plan: {
            ...(prev.business_case.plan || {}),
            creative_snapshot_status: 'draft',
            strategy_snapshot_status: 'draft',
          },
          next_action: 'Review, edit, and send the Strategy Snapshot to the brand.',
        },
      };
    });
    flash('Demo mode: Strategy Snapshot drafted for admin review.');
  };

  const createDemoContract = ({ template }) => {
    setBundle((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        contract: {
          id: `contract-demo-${prev.business_case.id}`,
          business_case_id: prev.business_case.id,
          template,
          status: 'draft',
          value: prev.business_case.estimated_value,
          parties: [
            prev.brand?.company || 'Brand',
            prev.creator?.name || 'Creator',
            'Future Africa Group (TTA)',
          ],
          ai_risk_flags: [],
          created_at: new Date().toISOString(),
        },
        business_case: {
          ...prev.business_case,
          next_action: 'Review contract terms, then send for signature.',
        },
      };
    });
    flash('Demo mode: contract draft created.');
  };

  return (
    <div data-testid="v3-admin-bc-detail">
      <button onClick={() => navigate('/v3/admin/business-cases')} className="flex items-center gap-2 text-[12px] text-[#8A8A8A] hover:text-[#1A1A1A] mb-4" data-testid="bc-back">
        <ArrowLeft className="w-3.5 h-3.5" /> All Business Cases
      </button>

      {/* Header */}
      <div className="v3-card p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">
              {bundle.brand?.company}
              {bundle.creator && <span> × {bundle.creator.name}</span>}
            </p>
            <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
              {c.title}
            </h1>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span
                className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                style={{
                  background: isGrant ? '#F2EAD8' : '#DDE7E2',
                  color: isGrant ? '#7A5F23' : '#1F4A3A',
                }}
              >
                {isGrant ? 'Grant — TTA pays creator directly' : 'Paid Strategy'}
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider bg-[#F4F2EC] text-[#6E6657]"
                data-testid="bc-stage-pill"
              >
                {getStageLabel(c.stage)}
              </span>
              <span className="text-[10px] text-[#8A8A8A]">{c.days_in_stage} days in stage</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Estimated value</p>
            <p className="text-2xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {formatNairaV3(c.estimated_value)}
            </p>
          </div>
        </div>
        <div className="mt-4 p-3 bg-[#F4F2EC] rounded text-[12px] text-[#6E6657]" data-testid="bc-next-action">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Next action</span>
          {c.next_action}
        </div>
      </div>

      {/* Stage tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-[#F4F2EC] rounded-lg w-fit" data-testid="bc-tabs">
        {STAGES.map((s) => {
          const idx = STAGES.indexOf(stageToTab(c.stage));
          const sIdx = STAGES.indexOf(s);
          const done = sIdx < idx;
          const active = tab === s;
          return (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`text-[11px] px-3 py-1.5 rounded transition-colors capitalize flex items-center gap-1.5 ${active ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`bc-tab-${s}`}
            >
              <StageDot active={active} done={done} color={done ? '#1F4A3A' : '#C49B5F'} />
              {getStageLabel(s)}
            </button>
          );
        })}
      </div>

      {toast && (
        <div className="v3-card p-3 mb-4 bg-[#F5D9D2] border-[#B54A37]" data-testid="bc-toast">
          <p className="text-[12px] text-[#B54A37]">{toast}</p>
        </div>
      )}

      {/* CONNECT */}
      {tab === 'connect' && (
        <>
        {/* Brand & contact context — sourced from CRM workbook */}
        <Section title="Brand context">
          <dl className="grid grid-cols-2 gap-4 text-[13px]" data-testid="bc-connect-brand-context">
            {[
              ['Brand / organisation', bundle.brand?.company || c.brand_name || c.unlinked_brand_name],
              ['Primary contact', bundle.brand?.primary_contact],
              ['Contact role', bundle.brand?.role],
              ['Email', bundle.brand?.email],
              ['Phone', bundle.brand?.phone],
              ['LinkedIn', bundle.brand?.linkedin],
              ['Relationship manager', c.rm_name || bundle.brand?.relationship_manager_name],
              ['Connect status', bundle.brand?.connect_status || c.connect?.connect_status],
              ['Relationship status', bundle.brand?.status],
              ['Likelihood to work with TTA', bundle.brand?.likelihood_to_work_with_tta],
              ['Source sheet', bundle.brand?.source_sheet || c.source_sheet],
              ['Source row', bundle.brand?.source_row_number || c.source_row_number],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-[13px] text-[#1A1A1A]">{value && String(value).trim() ? value : <span className="text-[#8A8A8A]">Not provided</span>}</dd>
              </div>
            ))}
            <div className="col-span-2">
              <dt className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Notes &amp; next actions</dt>
              <dd className="text-[13px] text-[#1A1A1A] whitespace-pre-wrap">{bundle.brand?.notes_and_next_actions || c.next_action || <span className="text-[#8A8A8A]">Not provided</span>}</dd>
            </div>
          </dl>
        </Section>

        {/* Marketing intelligence — from CRM workbook */}
        <Section title="Marketing intelligence">
          <dl className="grid grid-cols-2 gap-4 text-[13px]" data-testid="bc-connect-intelligence">
            {[
              ['Key marketing focus', bundle.brand?.key_marketing_focus],
              ['Primary target audience', bundle.brand?.primary_target_audience],
              ['Key marketing channels', Array.isArray(bundle.brand?.key_marketing_channels) ? bundle.brand.key_marketing_channels.join(', ') : bundle.brand?.key_marketing_channels],
              ['Marketing KPIs', Array.isArray(bundle.brand?.marketing_kpis) ? bundle.brand.marketing_kpis.map((k) => typeof k === 'object' ? `${k.kpi}: ${k.target}` : k).join(', ') : bundle.brand?.marketing_kpis],
              ['Desired relationship status', bundle.brand?.desired_relationship_status],
              ['Stated intent / opportunity', c.connect?.stated_intent || c.next_action],
            ].map(([label, value]) => (
              <div key={label} className={label === 'Stated intent / opportunity' ? 'col-span-2' : ''}>
                <dt className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-[13px] text-[#1A1A1A]">{value && String(value).trim() ? value : <span className="text-[#8A8A8A]">Not provided</span>}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {/* Discovery checklist */}
        <Section title="Discovery checklist">
          <ul className="space-y-2 text-[13px]" data-testid="bc-connect-checklist">
            {[
              ['Decision maker identified', !!bundle.brand?.primary_contact],
              ['Brand challenge understood', !!bundle.brand?.key_marketing_focus],
              ['Target audience captured', !!bundle.brand?.primary_target_audience],
              ['KPIs captured', !!bundle.brand?.marketing_kpis],
              ['Budget or fee expectation captured', !!(c.value_amount || c.value_label || c.value_raw)],
              ['Next action agreed', !!(c.next_action || bundle.brand?.notes_and_next_actions)],
              ['RM assigned', !!(c.rm_name || bundle.brand?.relationship_manager_name)],
              ['Ready for Frame', (c.connect?.connect_status === 'qualified_to_frame') || c.stage !== 'connect'],
            ].map(([label, done]) => (
              <li key={label} className="flex items-center gap-2">
                <span className={`inline-block w-4 h-4 rounded border-2 flex-shrink-0 ${done ? 'bg-[#1F4A3A] border-[#1F4A3A]' : 'border-[#D4CDBF]'}`} />
                <span className={done ? 'text-[#1A1A1A]' : 'text-[#8A8A8A]'}>{label}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Connect actions */}
        <Section title="Connect — Discovery actions">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => navigate(`/v3/admin/meetings?brand_id=${c.brand_id || ''}&business_case_id=${c.id}&mode=new&type=connector`)}
              className="v3-btn-secondary"
              data-testid="bc-connect-add-interaction"
            >
              Add interaction / schedule meeting
            </button>
            {c.stage === 'connect' && c.connect?.connect_status !== 'qualified_to_frame' && (
              <button
                onClick={wrap(() => v3SetConnectStatus(c.id, 'qualified_to_frame'))}
                disabled={busy}
                className="v3-btn-secondary"
                data-testid="bc-mark-qualified"
              >
                Mark qualified
              </button>
            )}
          </div>
          {bundle.interactions?.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Interactions linked to this business case</p>
              {bundle.interactions.map((i) => (
                <div key={i.id} className="p-3 border border-[#E8E4DB] rounded" data-testid={`bc-interaction-${i.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium">{i.title}</span>
                    <span className="text-[10px] text-[#8A8A8A]">{(i.date_iso || '').slice(0, 10) || 'Date not provided'}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] mb-1">{i.author || 'Author not provided'}</p>
                  <p className="text-[12px] text-[#6E6657] line-clamp-3 whitespace-pre-wrap">{i.content || 'No notes captured.'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[#8A8A8A]">No interactions logged yet. Use “Add interaction / schedule meeting” above to start the discovery trail.</p>
          )}
          {c.stage === 'connect' && (
            <button
              onClick={() => advanceBusinessCaseStage('frame')}
              disabled={busy}
              className="v3-btn-primary mt-6"
              data-testid="bc-advance-frame"
            >
              Finish Connector &amp; Open Frame <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </Section>
        <MarketingIntelligenceCard intelligence={c.connect?.marketing_intelligence} />
        <LogInteractionForm
          businessCaseId={c.id}
          brandId={c.brand_id}
          busy={busy}
          wrap={wrap}
        />
        </>
      )}

      {/* FRAME */}
      {tab === 'frame' && (
        <>
          {!bundle.alignment_snapshot && c.stage === 'frame' && (
            <Section title="Alignment Snapshot">
              <p className="text-[13px] text-[#6E6657] mb-4">No Alignment Snapshot yet. Generate the AI draft to begin Frame.</p>
              <button onClick={generateAlignmentDraft} disabled={busy} className="v3-btn-primary" data-testid="bc-generate-alignment">
                <Sparkles className="w-4 h-4" /> Generate Alignment Snapshot
              </button>
            </Section>
          )}

          {bundle.alignment_snapshot && (
            <Section
              title="Alignment Snapshot"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider bg-[#F4F2EC] text-[#6E6657]" data-testid="bc-alignment-status">
                    {bundle.alignment_snapshot.status}
                  </span>
                  {bundle.alignment_snapshot.status !== 'approved' && (
                    <button
                      onClick={sendAlignmentToBrand}
                      disabled={busy}
                      className="v3-btn-secondary"
                      data-testid="bc-send-alignment"
                    >
                      <Send className="w-3.5 h-3.5" /> Send reviewed snapshot
                    </button>
                  )}
                  {bundle.alignment_snapshot.status !== 'approved' && (
                    <button
                      onClick={() => approveAlignment('brand_proxy')}
                      disabled={busy}
                      className="v3-btn-primary"
                      data-testid="bc-approve-alignment-proxy"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                </div>
              }
            >
              <AlignmentSnapshotEditor
                snapshot={bundle.alignment_snapshot}
                busy={busy}
                onSave={(payload) => saveAlignmentDraft(payload)}
                onSaveAndSend={(payload) => saveAlignmentDraft(payload, true)}
              />
              {false && (
              <V3DocumentSurface
                title={bundle.alignment_snapshot.title}
                meta={bundle.alignment_snapshot.meta}
              >
                {bundle.alignment_snapshot.sections.map((s, i) => (
                  <div key={i} className="mb-6">
                    <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-2">{s.heading}</h3>
                    {s.type === 'prose' && <p className="text-[14px] leading-relaxed whitespace-pre-wrap text-[#1A1A1A]">{s.content}</p>}
                    {s.type === 'bullets' && (
                      <ul className="list-disc pl-5 space-y-1 text-[14px]">
                        {s.items.map((it, j) => <li key={j}>{it}</li>)}
                      </ul>
                    )}
                    {s.type === 'numbered' && (
                      <ol className="list-decimal pl-5 space-y-1 text-[14px]">
                        {s.items.map((it, j) => <li key={j}>{it}</li>)}
                      </ol>
                    )}
                    {s.type === 'kpis' && (
                      <div className="space-y-2">
                        {s.items.map((k, j) => (
                          <div key={j} className="p-3 border border-[#E8E4DB] rounded">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-medium">{k.kpi}</span>
                              {k.flagNote && <span className="text-[10px] text-[#C49B5F]">{k.flagNote}</span>}
                            </div>
                            <p className="text-[12px] text-[#6E6657]">{k.target}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {s.type === 'flags' && (
                      <ul className="space-y-1 text-[13px]">
                        {s.items.map((f, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#C49B5F] flex-shrink-0 mt-0.5" />
                            <span>{f.text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </V3DocumentSurface>
              )}
            </Section>
          )}

          {/* Scope flags — RM resolves before advancing */}
          {bundle.alignment_snapshot?.brand_comments?.length > 0 && (
            <Section title="Brand line comments">
              <div className="space-y-2">
                {bundle.alignment_snapshot.brand_comments.map((comment) => {
                  const section = bundle.alignment_snapshot.sections[comment.section_index];
                  return (
                    <div key={comment.id} className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]" data-testid={`alignment-comment-${comment.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">{section?.heading || `Section ${comment.section_index + 1}`}</p>
                          {comment.quoted_text && <p className="text-[12px] text-[#6E6657] mt-1">&ldquo;{comment.quoted_text}&rdquo;</p>}
                          <p className="text-[13px] text-[#1A1A1A] mt-1">{comment.comment}</p>
                          {comment.suggested_text && <p className="text-[12px] text-[#1F4A3A] mt-1">Suggested: {comment.suggested_text}</p>}
                        </div>
                        <button
                          onClick={wrap(() => v3ResolveAlignmentComment(bundle.alignment_snapshot.id, comment.id))}
                          disabled={busy || comment.status === 'resolved'}
                          className="v3-btn-secondary text-[11px]"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> {comment.status === 'resolved' ? 'Resolved' : 'Resolve'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {bundle.alignment_snapshot?.scope_flags?.length > 0 && (
            <Section title="Scope flags to resolve before Plan">
              <p className="text-[12px] text-[#8A8A8A] mb-3">
                {c.frame?.scope_flags_resolved || 0} of {c.frame?.scope_flags_total || bundle.alignment_snapshot.scope_flags.length} resolved
              </p>
              <div className="space-y-2">
                {bundle.alignment_snapshot.scope_flags.map((f, i) => {
                  const resolved = i < (c.frame?.scope_flags_resolved || 0);
                  return (
                    <div key={i} className={`p-3 border rounded flex items-start justify-between gap-3 ${resolved ? 'bg-[#DDE7E2] border-[#C5D6CE]' : 'bg-[#FAF9F5] border-[#E8E4DB]'}`} data-testid={`bc-scope-flag-${i}`}>
                      <div className="flex-1">
                        <p className={`text-[13px] font-medium ${resolved ? 'text-[#1F4A3A]' : 'text-[#1A1A1A]'}`}>{f.text}</p>
                        <p className="text-[11px] text-[#6E6657] mt-0.5">{f.reason}</p>
                      </div>
                      {!resolved && (
                        <button
                          onClick={wrap(() => v3ResolveScopeFlag(c.id, i))}
                          disabled={busy}
                          className="v3-btn-secondary text-[11px]"
                          data-testid={`bc-resolve-flag-${i}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                      {resolved && <CheckCircle2 className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {!isGrant && (
            <Section title="Frame commercial note">
              <p className="text-[12px] text-[#6E6657]">
                No Strategy Development Fee is collected in Frame. The fee is issued after a creator brief is sent and tracked before the Strategy Snapshot is shared externally.
              </p>
            </Section>
          )}

          {/* Frame fee invoice intentionally removed; Strategy Development Fee is handled in Plan. */}
          {false && false && bundle.invoices?.length > 0 && (
            <Section title="Strategy Development Fee">
              {bundle.invoices
                .filter((i) => i.kind === 'strategy_development_fee')
                .map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between" data-testid={`bc-invoice-${inv.id}`}>
                    <div>
                      <p className="text-[13px] font-medium">{formatNairaV3(inv.amount)}</p>
                      <p className="text-[11px] text-[#8A8A8A]">Issued {inv.issued_at?.slice(0, 10)} • Status: {inv.status}</p>
                    </div>
                    {inv.status !== 'paid' && (
                      <button onClick={wrap(() => v3MarkInvoicePaid(inv.id))} disabled={busy} className="v3-btn-primary" data-testid={`bc-pay-invoice-${inv.id}`}>
                        Mark paid
                      </button>
                    )}
                  </div>
                ))}
            </Section>
          )}
          {isGrant && (
            <Section title="Strategy Development Fee">
              <p className="text-[12px] text-[#7A5F23]">
                <ShieldAlert className="inline w-3.5 h-3.5 mr-1" />
                Grant engagement — no Strategy Development Fee is invoiced. TTA absorbs the strategy cost; OSF will pay the creator directly on approved proposal.
              </p>
            </Section>
          )}

          {c.stage === 'frame' && (
            <button
              onClick={() => advanceBusinessCaseStage('plan')}
              disabled={busy}
              className="v3-btn-primary mt-2"
              data-testid="bc-advance-plan"
            >
              Finish Frame & Open Plan <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* PLAN */}
      {tab === 'plan' && (
        <>
          {/* Strategy Development Fee — always-on explainer card */}
          <Section title="Strategy Development Fee — what it covers">
            <div className="space-y-2 text-[12px] text-[#1A1A1A] leading-relaxed" data-testid="bc-plan-sdf-explainer">
              <p>This fee covers the planning and strategy work that turns the Alignment Snapshot into a brand-ready Strategy Snapshot.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>TTA brainstorms creative approaches, creators, channels, risks, and budget assumptions.</li>
                <li>TTA confirms creator interest, availability, and indicative fees with the shortlist.</li>
                <li>TTA develops the Creative Strategy Document collaboratively with the brand.</li>
                <li>TTA coordinates approval and contract execution if the strategy is aligned.</li>
              </ul>
              <p className="text-[#6E6657]">
                Full agency / project fees are <strong>separate</strong> from this fee. The Strategy Development Fee is invoiced before the Strategy Snapshot is shared with the brand.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E8E4DB]">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Raw fee from workbook</p>
                  <p className="text-[12px]">{c?.deliver?.fee_raw || c?.value_raw || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Display value</p>
                  <p className="text-[12px]">{c?.value_label || (c?.value_amount ? `${c?.value_currency === 'USD' ? '$' : '₦'}${c.value_amount.toLocaleString()}` : 'Not provided')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Engagement track</p>
                  <p className="text-[12px] capitalize">{c?.engagement_track || 'paid'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Term / duration</p>
                  <p className="text-[12px]">{c?.plan?.confirmed_scope || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Editable Brainstorming — always available */}
          <Section title="Brainstorming">
            <div className="space-y-3" data-testid="bc-plan-brainstorm-editable">
              <p className="text-[11px] text-[#8A8A8A]">
                Capture creative approaches, creators, ideas, risks, open questions, brand constraints, and timeline/budget assumptions.
              </p>
              <textarea
                value={planBrainstormText}
                onChange={(e) => setPlanBrainstormText(e.target.value)}
                rows={6}
                placeholder={`Creative approaches:\nPossible creators:\nRisks:\nOpen questions:\nBudget assumptions:\nTimeline assumptions:`}
                className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
                data-testid="bc-plan-brainstorm-input"
              />
              <p className="text-[10px] text-[#8A8A8A]">Saved locally to this session. Connect a backend save when ready.</p>
            </div>
          </Section>

          {/* Editable Strategy — always available */}
          <Section title="Strategy">
            <div className="space-y-3" data-testid="bc-plan-strategy-editable">
              <p className="text-[11px] text-[#8A8A8A]">Draft the brand-facing strategy. Sections follow the Strategy Snapshot template.</p>
              {[
                'Executive Snapshot', 'Strategic Foundation', 'Growth Plan',
                'Creator Strategy', 'Execution Roadmap', 'Commercial Overview',
                'Tracking Plan', 'Risks & Mitigation', 'Next Steps',
              ].map((heading) => (
                <div key={heading} className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                  <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">{heading}</label>
                  <textarea
                    value={planStrategyDraft[heading] || ''}
                    onChange={(e) => setPlanStrategyDraft({ ...planStrategyDraft, [heading]: e.target.value })}
                    rows={3}
                    placeholder={`${heading}…`}
                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
                    data-testid={`bc-plan-strategy-${heading.replace(/\s+/g, '-').toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          </Section>

          {!isGrant && bundle.invoices?.filter((i) => i.kind === 'strategy_development_fee').length > 0 && (
            <Section title="Strategy Development Fee — tracked invoice">
              {bundle.invoices
                .filter((i) => i.kind === 'strategy_development_fee')
                .map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between" data-testid={`bc-plan-invoice-${inv.id}`}>
                    <div>
                      <p className="text-[13px] font-medium">{formatNairaV3(inv.amount)}</p>
                      <p className="text-[11px] text-[#8A8A8A]">Tracked before Strategy Snapshot is sent. Status: {inv.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => editStrategyFee(inv)} disabled={busy || inv.status === 'paid'} className="v3-btn-secondary" data-testid={`bc-edit-sdf-${inv.id}`}>
                        <Edit3 className="w-3.5 h-3.5" /> Edit fee
                      </button>
                      {inv.status !== 'paid' && (
                        <button onClick={() => markStrategyFeePaid(inv.id)} disabled={busy} className="v3-btn-primary">
                          Mark paid
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </Section>
          )}
          <PlanStageActions
            bundle={bundle}
            creators={creators}
            busy={busy}
            wrap={wrap}
            isGrant={isGrant}
            onDemoBrainstorm={createDemoBrainstorm}
            onDemoClearBrainstorm={clearDemoBrainstorm}
            onDemoSelectCreator={selectDemoCreator}
            onDemoBrief={createDemoBrief}
            onDemoCreatorResponse={sendDemoBriefDiscussionToAi}
            onDemoReminder={sendDemoBriefReminder}
            onDemoPaySdf={markStrategyFeePaid}
            onDemoDraftSnapshot={draftDemoStrategySnapshot}
            onDemoContract={createDemoContract}
            creativeBriefCount={creativeBriefs.length}
          />

          <ContractSummaryCard bundle={bundle} />

          {bundle.brainstorm_round && (
            <Section title="Brainstorm planning">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {(Array.isArray(bundle.brainstorm_round.phases) ? bundle.brainstorm_round.phases : []).map((p) => (
                  <div key={p.phase} className={`p-2 rounded text-center ${p.status === 'complete' ? 'bg-[#DDE7E2]' : 'bg-[#F4F2EC]'}`}>
                    <p className="text-[10px] text-[#8A8A8A]">Phase {p.phase}</p>
                    <p className="text-[11px] font-medium">{p.label}</p>
                    <p className="text-[10px] mt-1">{p.status === 'complete' ? '✓' : '…'}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {(Array.isArray(bundle.brainstorm_round.scored_creators) ? bundle.brainstorm_round.scored_creators : []).map((sc) => (
                  <div key={sc.creator_id} className={`flex items-center justify-between p-2 rounded text-[12px] ${sc.eliminated ? 'bg-[#F5D9D2]' : 'bg-[#F4F2EC]'}`} data-testid={`bc-bs-${sc.creator_id}`}>
                    <span className={sc.eliminated ? 'line-through text-[#B54A37]' : ''}>{sc.creator_id}</span>
                    <span className="text-[10px]">
                      cultural {sc.cultural_fit} • conv {sc.conversion_behavior} • rel {sc.reliability}
                      {sc.eliminated && ` — ${sc.reason}`}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="p-4 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                  <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-3">Content plan</p>
                  <div className="space-y-2">
                    {brainstormContentPlan.map((item) => (
                      <div key={item.item} className="flex items-start justify-between gap-3 text-[12px]">
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{item.item}</p>
                          <p className="text-[#8A8A8A]">{item.format}</p>
                        </div>
                        <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">{item.owner}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                  <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-3">Budget plan</p>
                  <div className="space-y-2">
                    {brainstormBudgetPlan.map((line) => (
                      <div key={line.line} className="flex items-center justify-between gap-3 text-[12px]">
                        <div>
                          <p className="font-medium text-[#1A1A1A]">{line.line}</p>
                          <p className="text-[#8A8A8A]">{line.owner}</p>
                        </div>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(line.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {brainstormRevenuePlan && (
                  <div className="p-4 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                    <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-3">Revenue plan</p>
                    <div className="space-y-1 text-[12px]">
                      {[
                        ['Brand budget', brainstormRevenuePlan.brand_budget],
                        ['Creator fee', brainstormRevenuePlan.creator_fee],
                        ['Production budget', brainstormRevenuePlan.production_budget],
                        ['Strategy Development Fee', brainstormRevenuePlan.strategy_development_fee],
                        ['TASCK management fee', brainstormRevenuePlan.tasck_management_fee],
                        ['Projected TASCK revenue', brainstormRevenuePlan.projected_tasck_revenue],
                      ].map(([label, amount]) => (
                        <div key={label} className="flex justify-between border-b border-[#E8E4DB] py-1 last:border-0">
                          <span>{label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(amount || 0)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-4 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                  <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-3">Contract plan</p>
                  <div className="space-y-2">
                    {brainstormContractPlan.map((item) => (
                      <div key={item.item} className="text-[12px]">
                        <p className="font-medium text-[#1A1A1A]">{item.item}</p>
                        <p className="text-[#8A8A8A] leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          )}

          {creativeBriefs.length > 0 && (
            <Section title="Creative Briefs sent to creators">
              <div className="space-y-3">
                {creativeBriefs.map((brief, index) => (
                  <div key={brief.id} className="p-4 border border-[#E8E4DB] rounded" data-testid={`bc-creative-brief-${brief.id}`}>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[12px] text-[#8A8A8A]">
                        Brief {creativeBriefs.length - index} sent to {bundle.creator?.name || brief.creator_id} on {brief.sent_at?.slice(0, 10)}
                      </p>
                      <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">{brief.status}</span>
                    </div>
                    <p className="text-[13px] mb-4 whitespace-pre-wrap">{brief.brief_text}</p>
                    {brief.creator_response && (
                      <div className="p-4 bg-[#F4F2EC] rounded">
                        <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">
                          {brief.admin_creator_discussion_transcript ? 'AI brief discussion summary' : 'AI strategy draft inputs'}
                        </p>
                        <p className="text-[12px] mb-1"><strong>Alignment:</strong> {brief.creator_response.interest}</p>
                        <p className="text-[12px] mb-1"><strong>Fee:</strong> {brief.creator_response.fee_expectation}</p>
                        <p className="text-[12px] mb-1"><strong>Availability:</strong> {brief.creator_response.availability}</p>
                        {brief.admin_creator_discussion_transcript && (
                          <p className="text-[12px] mb-1"><strong>Source:</strong> Admin-creative brief discussion pasted into AI</p>
                        )}
                        <p className="text-[12px] mt-2 whitespace-pre-wrap">{brief.creator_response.proposed_concept}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {bundle.creative_snapshot && (
            <Section
              title="Strategy Snapshot: brand facing strategy"
              action={
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider bg-[#F4F2EC] text-[#6E6657]" data-testid="bc-strategy-status">
                    {bundle.creative_snapshot.status}
                  </span>
                  {bundle.creative_snapshot.status !== 'approved' && (
                    <button onClick={sendStrategySnapshot} disabled={busy} className="v3-btn-secondary" data-testid="bc-send-strategy">
                      <Send className="w-3.5 h-3.5" /> Send Strategy Snapshot
                    </button>
                  )}
                  {bundle.creative_snapshot.status !== 'approved' && (
                    <button onClick={approveStrategySnapshot} disabled={busy} className="v3-btn-primary" data-testid="bc-approve-snapshot">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve Strategy
                    </button>
                  )}
                </div>
              }
            >
              <StrategySnapshotEditor
                snapshot={bundle.creative_snapshot}
                busy={busy}
                onSave={(payload) => saveStrategySnapshot(payload)}
                onSaveAndSend={(payload) => saveStrategySnapshot(payload, true)}
              />
              {bundle.creative_snapshot.brand_comments?.length > 0 && (
                <div className="mt-5 space-y-2" data-testid="strategy-comments">
                  <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">Brand strategy comments</p>
                  {bundle.creative_snapshot.brand_comments.map((comment) => (
                    <div key={comment.id} className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                      <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">{comment.quoted_text || `Section ${comment.section_index + 1}`}</p>
                      <p className="text-[13px] text-[#1A1A1A] mt-1">{comment.comment}</p>
                      <button
                        onClick={wrap(() => v3ResolveStrategySnapshotComment(bundle.creative_snapshot.id, comment.id))}
                        disabled={busy || comment.status === 'resolved'}
                        className="v3-btn-secondary text-[11px] mt-2"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> {comment.status === 'resolved' ? 'Resolved' : 'Resolve'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {false && bundle.creative_snapshot && (
            <Section
              title="Strategy Snapshot: brand facing strategy"
              action={
                bundle.creative_snapshot.status !== 'approved' && (
                  <button
                    onClick={wrap(() => v3ApproveSnapshot(c.id, bundle.brand?.primary_contact || 'Brand'))}
                    disabled={busy}
                    className="v3-btn-primary"
                    data-testid="bc-approve-snapshot"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve Snapshot
                  </button>
                )
              }
            >
              <V3DocumentSurface title={bundle.creative_snapshot.title}>
                <p className="text-[14px] mb-6 whitespace-pre-wrap">{bundle.creative_snapshot.concept}</p>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Deliverables</h4>
                <ul className="text-[13px] space-y-1 mb-6">
                  {bundle.creative_snapshot.deliverables.map((d) => (
                    <li key={d.num}>{d.num}. {d.title} — {d.format} {d.duration && `(${d.duration})`}</li>
                  ))}
                </ul>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Budget</h4>
                <ul className="text-[13px] space-y-1 mb-6">
                  {bundle.creative_snapshot.budget.map((b, i) => (
                    <li key={i} className="flex justify-between border-b border-[#E8E4DB] py-1">
                      <span>{b.line}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(b.amount)}</span>
                    </li>
                  ))}
                </ul>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Success metrics</h4>
                <ul className="text-[13px] space-y-1">
                  {bundle.creative_snapshot.success_metrics.map((m, i) => (
                    <li key={i}><strong>{m.kpi}:</strong> {m.target}</li>
                  ))}
                </ul>
              </V3DocumentSurface>
            </Section>
          )}

          {bundle.contract && (
            <Section
              title="Contract"
              action={
                bundle.contract.status !== 'signed' && (
                  <button onClick={wrap(() => v3SignContract(bundle.contract.id))} disabled={busy} className="v3-btn-primary" data-testid="bc-sign-contract">
                    <FileSignature className="w-3.5 h-3.5" /> Sign Contract
                  </button>
                )
              }
            >
              <p className="text-[12px] text-[#8A8A8A] mb-2">Template: {bundle.contract.template} • Status: {bundle.contract.status}</p>
              <p className="text-[12px] mb-2">Parties: {Array.isArray(bundle.contract.parties) ? bundle.contract.parties.join(' • ') : (bundle.contract.parties || 'Not provided')}</p>
              <p className="text-[12px] mb-3">Value: {formatNairaV3(bundle.contract.value)}</p>
              {bundle.contract.ai_risk_flags?.length > 0 && (
                <div className="p-3 bg-[#F2EAD8] rounded">
                  <p className="text-[11px] text-[#7A5F23] uppercase tracking-wider mb-2">AI risk flags</p>
                  {bundle.contract.ai_risk_flags.map((f, i) => (
                    <div key={i} className="text-[12px] mb-1">
                      <strong>{f.clause}</strong> [{f.severity}] — {f.note}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {c.stage === 'plan' && (
            <button
              onClick={() => advanceBusinessCaseStage('deliver')}
              disabled={busy}
              className="v3-btn-primary mt-2"
              data-testid="bc-advance-deliver"
            >
              Finish Plan & Open Delivery <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* DELIVER */}
      {tab === 'deliver' && (
        <>
          {c.deliver?.scope_creep_paused && (
            <div className="v3-card p-4 mb-4 bg-[#F5D9D2] border-[#B54A37]" data-testid="bc-scope-paused">
              <p className="text-[12px] text-[#B54A37] font-medium">
                <ShieldAlert className="inline w-3.5 h-3.5 mr-1" />
                Delivery paused — scope change pending brand approval.
              </p>
            </div>
          )}

          <ContractSummaryCard bundle={bundle} />
          <DeliveryContractStudio bundle={bundle} busy={busy} />

          <Section
            title="Deliverables"
            action={
              <button
                onClick={addDeliverable}
                disabled={busy}
                className="v3-btn-secondary"
                data-testid="bc-add-deliverable"
              >
                <Plus className="w-3.5 h-3.5" /> Add deliverable
              </button>
            }
          >
            <p className="text-[12px] text-[#8A8A8A] mb-3">
              {approvedDeliverableCount} of {caseDeliverables.length} approved
            </p>
            <div className="space-y-2">
              {caseDeliverables.length === 0 && (
                <p className="text-[12px] text-[#8A8A8A] italic">No deliverables yet. Add the first one to begin Deliver.</p>
              )}
              {caseDeliverables.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 border border-[#E8E4DB] rounded" data-testid={`bc-deliverable-${d.id}`}>
                  <div className="flex items-center gap-3">
                    {d.status === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-[#1F4A3A]" />
                    ) : (
                      <Clock className="w-4 h-4 text-[#C49B5F]" />
                    )}
                    <div>
                      <p className="text-[13px] font-medium">{d.title}</p>
                      <p className="text-[10px] text-[#8A8A8A]">{d.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => editDeliverable(d)} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`bc-edit-deliverable-${d.id}`}>
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                    {d.status !== 'approved' && (
                      <button onClick={wrap(() => v3TransitionDeliverable(d.id))} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`bc-transition-${d.id}`}>
                        <PackageCheck className="w-3.5 h-3.5" /> Advance
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Scope change log"
            action={
              <button
                onClick={wrap(async () => {
                  const title = prompt('Scope change title?');
                  if (!title) return;
                  const fee = parseFloat(prompt('Fee delta (₦)? Use 0 if none.') || '0');
                  const rationale = prompt('Rationale?') || '';
                  await v3RequestScopeChange(c.id, { title, fee_delta: fee, rationale });
                })}
                disabled={busy}
                className="v3-btn-secondary"
                data-testid="bc-request-scope-change"
              >
                <Plus className="w-3.5 h-3.5" /> Request scope change
              </button>
            }
          >
            {(c.deliver?.scope_change_log || []).length === 0 && (
              <p className="text-[12px] text-[#8A8A8A]">No scope changes logged.</p>
            )}
            {(Array.isArray(c.deliver?.scope_change_log) ? c.deliver.scope_change_log : []).map((sc) => (
              <div key={sc.id} className="flex items-center justify-between p-3 border border-[#E8E4DB] rounded mb-2" data-testid={`bc-scope-${sc.id}`}>
                <div>
                  <p className="text-[13px] font-medium">{sc.title}</p>
                  <p className="text-[11px] text-[#8A8A8A]">{sc.rationale}</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(sc.fee_delta)}</p>
                  <p className="text-[10px] text-[#8A8A8A]">{sc.status}</p>
                  {sc.status !== 'approved' && (
                    <button onClick={wrap(() => v3ApproveScopeChange(c.id, sc.id))} disabled={busy} className="v3-btn-primary text-[10px] mt-1" data-testid={`bc-approve-scope-${sc.id}`}>
                      Approve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </Section>

          {c.stage === 'deliver' && (
            <button
              onClick={() => advanceBusinessCaseStage('closure')}
              disabled={busy}
              className="v3-btn-primary mt-2"
              data-testid="bc-advance-close"
            >
              Finish Delivery & Open Reporting <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* CLOSURE */}
      {tab === 'closure' && (
        <>
          {bundle.final_report ? (
            <Section title="Final report">
              <V3DocumentSurface title={bundle.final_report.title}>
                <p className="text-[14px] mb-4 whitespace-pre-wrap">{bundle.final_report.summary}</p>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Deliverables feed</h4>
                <ul className="text-[13px] space-y-1 mb-4">
                  {(Array.isArray(bundle.final_report.deliverables) && bundle.final_report.deliverables.length ? bundle.final_report.deliverables : caseDeliverables).map((item) => (
                    <li key={item.id || item.title} className="flex justify-between border-b border-[#E8E4DB] py-1">
                      <span>{item.title}</span>
                      <span className={item.status === 'approved' ? 'text-[#1F4A3A]' : 'text-[#C49B5F]'}>{item.status}</span>
                    </li>
                  ))}
                </ul>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">KPI performance</h4>
                <ul className="text-[13px] space-y-1 mb-4">
                  {bundle.final_report.kpis.map((k, i) => (
                    <li key={i} className="flex justify-between border-b border-[#E8E4DB] py-1">
                      <span>{k.kpi}</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{k.actual} ({k.variance})</span>
                    </li>
                  ))}
                </ul>
                <h4 className="text-[12px] font-semibold uppercase tracking-wider mb-2">Closure checklist</h4>
                <ul className="text-[13px] space-y-1">
                  {bundle.final_report.closure_checklist.map((it, i) => (
                    <li key={i} className="flex items-center gap-2">
                      {it.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-[#1F4A3A]" /> : <Clock className="w-4 h-4 text-[#C49B5F]" />}
                      <span>{it.item}</span>
                    </li>
                  ))}
                </ul>
              </V3DocumentSurface>
              <p className="text-[11px] text-[#8A8A8A] mt-3" data-testid="bc-closure-pct">
                Closure: {c.closure?.closure_pct ?? 0}% complete
              </p>
            </Section>
          ) : (
            <Section title="Final report">
              <p className="text-[12px] text-[#8A8A8A] mb-3">No final report generated yet. The AI compiles deliverables + KPI targets into a templated report you can edit.</p>
              <button
                onClick={generateFinalReport}
                disabled={busy}
                className="v3-btn-primary"
                data-testid="bc-generate-final-report"
              >
                <Sparkles className="w-4 h-4" /> Generate Final Report
              </button>
            </Section>
          )}

          {!bundle.final_report && (
            <Section title="Feedback locked">
              <p className="text-[12px] text-[#8A8A8A]">Feedback opens only after the final report has been generated and shared for closure review.</p>
            </Section>
          )}

          {bundle.final_report && (
            <>
              <Section title="Brand feedback Google Form">
                <div className="space-y-3 mb-4">
                  {[
                    ['Campaign objectives were clearly understood', 10],
                    ['TASCK communication was timely and useful', 9],
                    ['Creator delivery matched approved deliverables', 9],
                    ['Budget and fee handling was transparent', 8],
                    ['Final report answered the brand decision questions', 10],
                  ].map(([label, score]) => (
                    <label key={label} className="flex items-center justify-between gap-3 p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
                      <span className="flex items-center gap-2 text-[12px] text-[#1A1A1A]">
                        <input type="checkbox" defaultChecked className="accent-[#1F4A3A]" />
                        {label}
                      </span>
                      <span className="text-[12px] text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{score}/10</span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={submitBrandFeedback}
                  disabled={busy || c.closure?.brand_feedback_received}
                  className="v3-btn-primary"
                  data-testid="bc-submit-brand-feedback"
                >
                  <FileText className="w-3.5 h-3.5" /> {c.closure?.brand_feedback_received ? 'Brand feedback recorded' : 'Submit brand feedback'}
                </button>
              </Section>

              <Section title="Creator feedback">
                <button
                  onClick={submitCreatorFeedback}
                  disabled={busy || c.closure?.creator_feedback_received}
                  className="v3-btn-primary"
                  data-testid="bc-submit-creator-feedback"
                >
                  <FileText className="w-3.5 h-3.5" /> {c.closure?.creator_feedback_received ? 'Creator feedback recorded' : 'Submit creator feedback'}
                </button>
              </Section>
            </>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// LogInteractionForm — Connect-tab inline form
// ============================================================================
const LogInteractionForm = ({ businessCaseId, brandId, busy, wrap }) => {
  const [form, setForm] = useState({
    type: 'call_transcript',
    title: '',
    author: '',
    content: '',
  });

  const reset = () => setForm({ type: 'call_transcript', title: '', author: '', content: '' });

  return (
    <div className="v3-card p-6 mb-4" data-testid="bc-log-interaction">
      <h3 className="text-[13px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">
        Log a new interaction
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
          data-testid="bc-li-type"
        >
          <option value="email">Email</option>
          <option value="call_transcript">Call transcript</option>
          <option value="file">File / Document</option>
          <option value="note">Note</option>
        </select>
        <input
          type="text"
          value={form.author}
          onChange={(e) => setForm({ ...form, author: e.target.value })}
          placeholder="Author (you)"
          className="px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
          data-testid="bc-li-author"
        />
      </div>
      <input
        type="text"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="Title — e.g. 'Discovery call with Funke + Kola'"
        className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white mb-3"
        data-testid="bc-li-title"
      />
      <textarea
        value={form.content}
        onChange={(e) => setForm({ ...form, content: e.target.value })}
        placeholder="Content — paste the transcript or notes here."
        rows={4}
        className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white mb-3"
        data-testid="bc-li-content"
      />
      <button
        onClick={wrap(async () => {
          if (!form.title || !form.content || !form.author) return;
          await v3CreateInteraction({
            brand_id: brandId,
            business_case_id: businessCaseId,
            ...form,
          });
          reset();
        })}
        disabled={busy || !form.title || !form.content || !form.author}
        className="v3-btn-primary"
        data-testid="bc-li-save"
      >
        <Plus className="w-3.5 h-3.5" /> Save interaction
      </button>
    </div>
  );
};

// ============================================================================
// PlanStageActions — surfaces the next contextual action in the Plan stage
// ============================================================================
const PlanStageActions = ({
  bundle,
  creators,
  busy,
  isGrant,
  onDemoBrainstorm,
  onDemoClearBrainstorm,
  onDemoSelectCreator,
  onDemoBrief,
  onDemoCreatorResponse,
  onDemoReminder,
  onDemoPaySdf,
  onDemoDraftSnapshot,
  onDemoContract,
  creativeBriefCount = 0,
}) => {
  const c = bundle.business_case;
  const creatorList = Array.isArray(creators) ? creators : [];
  const fallbackCreatorList = creatorList;
  const hasBrainstorm = !!bundle.brainstorm_round;
  const hasBrief = !!bundle.creative_brief;
  const hasResponse = !!bundle.creative_brief?.creator_response;
  const hasSnapshot = !!bundle.creative_snapshot;
  const snapshotApproved = bundle.creative_snapshot?.status === 'approved';
  const hasContract = !!bundle.contract;
  const contractSigned = bundle.contract?.status === 'signed';
  const invoices = Array.isArray(bundle.invoices) ? bundle.invoices : [];
  const sdfInvoice = invoices.find((inv) => inv.kind === 'strategy_development_fee');
  const sdfPaid = isGrant || !sdfInvoice || sdfInvoice.status === 'paid' || c.frame?.strategy_development_fee_paid;

  const [briefText, setBriefText] = useState('');
  const [selectedCreator, setSelectedCreator] = useState(c.creator_id || '');
  const [contractTemplate, setContractTemplate] = useState(isGrant ? 'four_party_grant' : 'creator_principal');
  const [matches, setMatches] = useState([]);
  const [briefDiscussion, setBriefDiscussion] = useState('');
  const [actionView, setActionView] = useState('start');
  const matchList = Array.isArray(matches) ? matches : [];
  const availableCreatorCount = matchList.length || fallbackCreatorList.length;

  const buildDemoMatches = () => {
    const intelligence = bundle.alignment_snapshot?.marketing_intelligence || {};
    const channels = Array.isArray(intelligence.key_marketing_channels) && intelligence.key_marketing_channels.length
      ? intelligence.key_marketing_channels.join(', ')
      : 'priority social channels';
    const audience = intelligence.primary_target_audience || 'the agreed target audience';
    return fallbackCreatorList.slice(0, 8).map((creator, index) => ({
      creator,
      score: Math.max(72, 96 - index * 4),
      confidence: Math.max(0.62, Number((0.94 - index * 0.04).toFixed(2))),
      reasons: [
        `${creator.name} has a strong fit for ${audience}.`,
        `Their audience and content style can carry ${channels}.`,
        'Recommendation is based on niche, reach, engagement, credibility, and expected delivery ability.',
      ],
    }));
  };

  const loadCreatorMatches = async () => {
    try {
      const result = await v3SuggestCreatorMatches(c.id);
      const next = Array.isArray(result.matches) ? result.matches : [];
      const resolved = next.length ? next : buildDemoMatches();
      setMatches(resolved);
      setActionView('matches');
      if (resolved.length && !resolved.some((match) => match.creator.id === selectedCreator)) {
        setSelectedCreator(resolved[0].creator.id);
        onDemoSelectCreator(resolved[0].creator.id);
      }
    } catch (e) {
      const resolved = buildDemoMatches();
      setMatches(resolved);
      setActionView('matches');
      if (resolved.length && !resolved.some((match) => match.creator.id === selectedCreator)) {
        setSelectedCreator(resolved[0].creator.id);
        onDemoSelectCreator(resolved[0].creator.id);
      }
    }
  };

  const buildScoredCreators = () => {
    const source = matchList.length ? matchList.map((m) => m.creator) : fallbackCreatorList;
    const selected = source.find((cr) => cr.id === selectedCreator);
    const ordered = selected ? [selected, ...source.filter((cr) => cr.id !== selectedCreator)] : source;
    return ordered.slice(0, 6).map((cr, i) => ({
      creator_id: cr.id,
      cultural_fit: Math.max(2, 5 - Math.floor(i / 2)),
      conversion_behavior: i < 3 ? 5 : i === 3 ? 4 : 2,
      reliability: Math.max(2, 5 - i),
    }));
  };

  const selectCreatorForBrief = (creatorId) => {
    setSelectedCreator(creatorId);
    onDemoSelectCreator(creatorId);
    setActionView('brief');
  };

  const runBrainstormRound = async () => {
    const scored = buildScoredCreators();
    try {
      await v3CreateBrainstorm({ business_case_id: c.id, scored_creators: scored });
    } catch (e) {
      // Demo/local preview continues without a running V3 backend.
    }
    onDemoBrainstorm(scored);
  };

  const generateBriefText = () => {
    const alignment = bundle.alignment_snapshot;
    const focus = alignment?.marketing_intelligence?.key_marketing_focus || c.connect?.stated_intent || c.title;
    const audience = alignment?.marketing_intelligence?.primary_target_audience || 'the agreed primary audience';
    const channels = (Array.isArray(alignment?.marketing_intelligence?.key_marketing_channels) ? alignment.marketing_intelligence.key_marketing_channels : []).join(', ') || 'priority social and culture channels';
    const kpis = (Array.isArray(alignment?.marketing_intelligence?.marketing_kpis) ? alignment.marketing_intelligence.marketing_kpis : []).map((k) => `${k.kpi}: ${k.target}`).join('; ') || 'brand-approved KPI targets';
    setBriefText(
      `Opportunity: ${c.title}\n\nBrand challenge: ${focus}\n\nAudience: ${audience}\n\nChannels: ${channels}\n\nKPIs: ${kpis}\n\nAsk: Please confirm interest, proposed creative approach, fee expectation, availability, manager contact, non-negotiables, and any brand-safety conditions.`
    );
  };

  const downloadBrief = (text, name = 'tasck-creative-brief.txt') => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const renderBriefComposer = (fromBrainstorm = false) => (
    <div className="v3-card p-6 mb-4 border-[#C49B5F]" data-testid="bc-plan-action-brief">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2 text-[#1A1A1A]">Next: send Creative Brief</h3>
          <p className="text-[12px] text-[#6E6657]">
            Generate or edit the brief for the selected creative. Once sent, AI drafts the Strategy Snapshot automatically for admin review.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (fromBrainstorm) onDemoClearBrainstorm();
            setActionView(matchList.length ? 'matches' : 'start');
          }}
          className="v3-btn-secondary text-[11px]"
          data-testid="bc-plan-back"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <select
          value={selectedCreator}
          onChange={(e) => {
            setSelectedCreator(e.target.value);
            if (e.target.value) onDemoSelectCreator(e.target.value);
          }}
          className="px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
          data-testid="bc-brief-creator"
        >
          <option value="">Pick a creator</option>
          {fallbackCreatorList.map((cr) => (
            <option key={cr.id} value={cr.id}>{cr.name} ({cr.tier})</option>
          ))}
        </select>
      </div>
      <textarea
        value={briefText}
        onChange={(e) => setBriefText(e.target.value)}
        placeholder="Brief: write the one-paragraph creative ask you want to send the creator."
        rows={4}
        className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white mb-3"
        data-testid="bc-brief-text"
      />
      <div className="flex gap-2 mb-3">
        <button onClick={generateBriefText} type="button" className="v3-btn-secondary" data-testid="bc-generate-brief-text">
          <Sparkles className="w-3.5 h-3.5" /> Generate Brief
        </button>
        <button onClick={() => downloadBrief(briefText || 'Generate or write a brief first.')} type="button" className="v3-btn-secondary" data-testid="bc-download-brief-draft">
          <Download className="w-3.5 h-3.5" /> Download
        </button>
        <button
          onClick={async () => {
            if (!selectedCreator || !briefText) return;
            try {
              await v3CreateBrief({ business_case_id: c.id, creator_id: selectedCreator, brief_text: briefText });
            } catch (e) {
              // Demo/local preview continues without a running V3 backend.
            }
            onDemoBrief({ creatorId: selectedCreator, briefText });
            setBriefText('');
            setBriefDiscussion('');
          }}
          disabled={busy || !selectedCreator || !briefText}
          className="v3-btn-primary"
          data-testid="bc-send-brief"
        >
          <FileText className="w-3.5 h-3.5" /> Send Creative Brief
        </button>
      </div>
    </div>
  );

  if (actionView === 'brief') {
    return renderBriefComposer(hasBrainstorm);
  }

  // Brainstorm CTA — defaults to scoring the top 4 super-tier creators
  if (!hasBrainstorm && !hasBrief && !hasSnapshot && !hasContract) {
    return (
      <div className="v3-card p-6 mb-4 border-[#C49B5F]" data-testid="bc-plan-action-brainstorm">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2 text-[#1A1A1A]">
          {matchList.length ? 'Select a creative' : 'Next: choose creator route'}
        </h3>
        <p className="text-[12px] text-[#6E6657] mb-4">
          Use AI matches or manually select a creative. Selecting a creative opens the brief composer immediately.
        </p>
        {matchList.length > 0 && (
          <div className="space-y-2 mb-4">
            {matchList.slice(0, 4).map((m) => (
              <div
                key={m.creator.id}
                className={`p-2 rounded text-[12px] flex items-center justify-between gap-3 ${selectedCreator === m.creator.id ? 'bg-[#DDE7E2] border border-[#C5D6CE]' : 'bg-[#F4F2EC]'}`}
              >
                <div>
                  <p className="font-medium text-[#1A1A1A]">{m.creator.name}</p>
                  <p className="text-[10px] text-[#6E6657]">{Array.isArray(m.reasons) ? m.reasons[0] : 'AI recommended for this brand fit.'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.score}</span>
                  <button
                    type="button"
                    onClick={() => selectCreatorForBrief(m.creator.id)}
                    className={selectedCreator === m.creator.id ? 'v3-btn-primary text-[11px]' : 'v3-btn-secondary text-[11px]'}
                    data-testid={`bc-select-creator-${m.creator.id}`}
                  >
                    {selectedCreator === m.creator.id ? 'Brief' : 'Select'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => loadCreatorMatches()}
            disabled={busy}
            className="v3-btn-secondary"
            data-testid="bc-ai-creator-match"
          >
            <Search className="w-3.5 h-3.5" /> AI match creators
          </button>
        </div>
        <button
          onClick={runBrainstormRound}
          disabled={busy || availableCreatorCount < 4}
          className="v3-btn-primary"
          data-testid="bc-start-brainstorm"
        >
          <Sparkles className="w-4 h-4" /> Manually select creative
        </button>
      </div>
    );
  }

  if (!hasBrief && !hasSnapshot) {
    return renderBriefComposer(true);
  }

  if (hasBrief && hasSnapshot && !snapshotApproved) {
    return (
      <div className="v3-card p-6 mb-4 border-[#C49B5F]" data-testid="bc-plan-action-strategy-ready">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2 text-[#1A1A1A]">Strategy Snapshot ready for admin review</h3>
            <p className="text-[12px] text-[#6E6657]">
              The brief has been sent and the Strategy Snapshot has been drafted automatically. Edit the snapshot below, then send it to the brand approval page.
            </p>
          </div>
          <span className="px-2 py-1 rounded bg-[#DDE7E2] text-[#1F4A3A] text-[10px] uppercase tracking-wider">Draft created</span>
        </div>
        <div className="p-4 rounded border border-[#E8E4DB] bg-[#FAFAF7] mb-4">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Optional creative discussion refinement</p>
          <textarea
            value={briefDiscussion}
            onChange={(e) => setBriefDiscussion(e.target.value)}
            rows={4}
            placeholder="Paste the admin and creative discussion here if you want AI to refine the Strategy Snapshot with fee, availability, conditions, concerns, or creative direction..."
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white mb-3"
            data-testid="bc-brief-discussion-ai-input"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={async () => {
                try {
                  await v3SimulateBriefResponse(bundle.creative_brief.id);
                } catch (e) {
                  // Demo/local preview continues without a running V3 backend.
                }
                onDemoCreatorResponse(briefDiscussion);
                setBriefDiscussion('');
              }}
              disabled={busy || !briefDiscussion.trim()}
              className="v3-btn-primary"
              data-testid="bc-refine-strategy-discussion"
            >
              <Sparkles className="w-4 h-4" /> Refine Strategy Snapshot
            </button>
            <button
              onClick={async () => {
                try {
                  await v3SendBriefReminder(bundle.creative_brief.id);
                } catch (e) {
                  // Demo/local preview continues without a running V3 backend.
                }
                onDemoReminder();
              }}
              disabled={busy}
              className="v3-btn-secondary"
              data-testid="bc-brief-reminder"
            >
              <Mail className="w-3.5 h-3.5" /> Remind creator
            </button>
            <button
              type="button"
              onClick={() => setActionView('brief')}
              disabled={busy}
              className="v3-btn-secondary"
              data-testid="bc-send-another-brief"
            >
              <Plus className="w-3.5 h-3.5" /> Send another brief {creativeBriefCount > 0 ? `(${creativeBriefCount})` : ''}
            </button>
            <button
              onClick={() => downloadBrief(bundle.creative_brief.brief_text, `${c.id}-creative-brief.txt`)}
              className="v3-btn-secondary"
              data-testid="bc-download-brief-sent"
            >
              <Download className="w-3.5 h-3.5" /> Download brief
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (hasBrief && !hasResponse) {
    return (
      <div className="v3-card p-6 mb-4 border-[#C49B5F]" data-testid="bc-plan-action-response">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2 text-[#1A1A1A]">Next: create Strategy Snapshot</h3>
        <p className="text-[12px] text-[#6E6657] mb-4">
          Brief was sent {bundle.creative_brief.sent_at?.slice(0, 10)}. Generate the Strategy Snapshot from the sent brief now, or paste the admin-creative discussion if you already have extra fee, condition, availability, or concept notes.
        </p>
        <textarea
          value={briefDiscussion}
          onChange={(e) => setBriefDiscussion(e.target.value)}
          rows={6}
          placeholder="Paste the admin-creative brief discussion transcript here: what the creative agreed to, fee/conditions, availability, creative idea, non-negotiables, concerns, and next steps..."
          className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white mb-3"
          data-testid="bc-brief-discussion-ai-input"
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={async () => {
              try {
                await v3CreateSnapshot({ business_case_id: c.id });
              } catch (e) {
                // Demo/local preview continues without a running V3 backend.
              }
              onDemoDraftSnapshot();
            }}
            disabled={busy}
            className="v3-btn-primary"
            data-testid="bc-draft-snapshot-from-brief"
          >
            <Sparkles className="w-4 h-4" /> Generate from sent brief
          </button>
          <button
            onClick={async () => {
              try {
                await v3SimulateBriefResponse(bundle.creative_brief.id);
              } catch (e) {
                // Demo/local preview continues without a running V3 backend.
              }
              onDemoCreatorResponse(briefDiscussion);
            }}
            disabled={busy || !briefDiscussion.trim()}
            className="v3-btn-secondary"
            data-testid="bc-send-discussion-ai"
          >
            <Sparkles className="w-4 h-4" /> Refine with discussion
          </button>
          <button
            onClick={async () => {
              try {
                await v3SendBriefReminder(bundle.creative_brief.id);
              } catch (e) {
                // Demo/local preview continues without a running V3 backend.
              }
              onDemoReminder();
            }}
            disabled={busy}
            className="v3-btn-secondary"
            data-testid="bc-brief-reminder"
          >
            <Mail className="w-3.5 h-3.5" /> Remind
          </button>
          <button
            type="button"
            onClick={() => setActionView('brief')}
            disabled={busy}
            className="v3-btn-secondary"
            data-testid="bc-send-another-brief"
          >
            <Plus className="w-3.5 h-3.5" /> Send another brief {creativeBriefCount > 0 ? `(${creativeBriefCount})` : ''}
          </button>
          <button
            onClick={() => downloadBrief(bundle.creative_brief.brief_text, `${c.id}-creative-brief.txt`)}
            className="v3-btn-secondary"
            data-testid="bc-download-brief-sent"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
        </div>
      </div>
    );
  }

  if (hasResponse && !hasSnapshot) {
    return (
      <div className="v3-card p-6 mb-4 border-[#C49B5F]" data-testid="bc-plan-action-snapshot">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2 text-[#1A1A1A]">Next: generate Strategy Snapshot from AI notes</h3>
        <p className="text-[12px] text-[#6E6657] mb-4">
          AI uses the creative brief, discussion notes, creator fees, conditions, availability, and approved Alignment Snapshot to generate the brand-facing Strategy Snapshot. Admin can edit it before sending.
        </p>
        {!sdfPaid && sdfInvoice && (
          <button
            onClick={() => onDemoPaySdf(sdfInvoice.id)}
            disabled={busy}
            className="v3-btn-secondary mr-2"
            data-testid="bc-pay-sdf-before-snapshot"
          >
            Mark {formatNairaV3(sdfInvoice.amount)} paid
          </button>
        )}
        <button
          onClick={async () => {
            try {
              await v3CreateSnapshot({ business_case_id: c.id });
            } catch (e) {
              // Demo/local preview continues without a running V3 backend.
            }
            onDemoDraftSnapshot();
          }}
          disabled={busy}
          className="v3-btn-primary"
          data-testid="bc-draft-snapshot"
        >
          <Sparkles className="w-4 h-4" /> Generate Strategy Snapshot with AI
        </button>
      </div>
    );
  }

  if (snapshotApproved && !hasContract) {
    return (
      <div className="v3-card p-6 mb-4 border-[#C49B5F]" data-testid="bc-plan-action-contract">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider mb-2 text-[#1A1A1A]">Next: draft Contract</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <select
            value={contractTemplate}
            onChange={(e) => setContractTemplate(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
            data-testid="bc-contract-template"
          >
            <option value="creator_principal">Creator Principal (Paid)</option>
            <option value="brand_msa">Brand MSA</option>
            <option value="four_party_grant">Four-party Grant</option>
          </select>
        </div>
        <button
          onClick={async () => {
            try {
              await v3CreateContract({
                business_case_id: c.id,
                template: contractTemplate,
                value: c.estimated_value,
                parties: [
                  bundle.brand?.company || 'Brand',
                  bundle.creator?.name || 'Creator',
                  'Future Africa Group (TTA)',
                ],
              });
            } catch (e) {
              // Demo/local preview continues without a running V3 backend.
            }
            onDemoContract({ template: contractTemplate });
          }}
          disabled={busy}
          className="v3-btn-primary"
          data-testid="bc-draft-contract"
        >
          <FileSignature className="w-3.5 h-3.5" /> Draft Contract
        </button>
      </div>
    );
  }

  if (hasContract && !contractSigned) {
    return null; // contract sign button is in the existing contract card below
  }

  return null;
};

export default V3AdminBusinessCaseDetail;
