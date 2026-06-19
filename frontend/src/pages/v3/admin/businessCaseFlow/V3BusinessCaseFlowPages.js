import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  FileSignature,
  FileText,
  Lock,
  Mail,
  MessageSquare,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  v3AcceptCreatorBriefing,
  v3AddDeliverable,
  v3AdvanceBusinessCase,
  v3AnalyzeMeetingTranscript,
  v3ApproveAlignmentAs,
  v3ApproveSnapshot,
  v3CreateBrainstorm,
  v3UpdateBrainstorm,
  v3ListBrainstorms,
  v3ContractPdfUrl,
  v3FinalReportPdfUrl,
  v3FeedbackPdfUrl,
  v3SendContractEmail,
  v3SendFinalReportEmail,
  v3SendFeedbackEmail,
  v3CreateBrief,
  v3CreateContract,
  v3UpdateContract,
  v3UpdateFinalReport,
  v3MarkReportSent,
  v3MarkFeedbackSent,
  v3CloseBusinessCase,
  v3CreateMeeting,
  v3CreateSnapshot,
  v3DeclineCreatorBriefing,
  v3DeleteBusinessCaseConnect,
  v3GenerateAlignment,
  v3GenerateFinalReport,
  v3GetBusinessCase,
  v3GetCreators,
  v3ListMeetings,
  v3ListBriefs,
  v3ListContracts,
  v3ListDeliverables,
  v3PromoteBusinessCaseConnect,
  v3RescheduleBusinessCaseConnect,
  v3RescheduleCreatorBriefing,
  v3SendAlignmentToBrand,
  v3SendConnectRescheduleEmail,
  v3SendStrategySnapshotToBrand,
  v3SignContract,
  v3SuggestCreatorMatches,
  v3UpdateAlignment,
  v3UpdateStrategySnapshot,
  v3UploadMeetingTranscript,
} from '../../../../lib/v3api';
import { formatNairaV3 } from '../../../../lib/v3data';

const connectQuestions = [
  'Key marketing focus',
  'Primary target audience',
  'Key marketing channels',
  'KPIs',
  'Budget range',
  'Timeline',
  'Approval process / decision maker',
  'Current marketing challenge',
  'Creator/talent expectations',
  'Risks and constraints',
  'What success looks like',
];

const brainstormingSections = [
  ['Campaign core idea', ['big idea', 'campaign angle', 'cultural insight', 'audience truth']],
  ['Audience and behavior', ['primary audience', 'secondary audience', 'desired behavior change', 'conversion behavior']],
  ['Channel plan', ['Instagram', 'TikTok', 'YouTube', 'X/Twitter', 'offline/event/community', 'paid media notes']],
  ['Creator direction', ['creator archetypes', 'desired tone', 'must-have traits', 'red flags', 'audience alignment']],
  ['Content/deliverables idea log', ['hero content', 'short-form cuts', 'BTS', 'launch copy', 'UGC/community ideas', 'number of deliverables']],
  ['Budget planning', ['brand budget', 'creator fee estimate', 'production budget', 'paid media budget', 'TASCK strategy development fee', 'TASCK management fee']],
  ['Timeline inference', ['project duration', 'planning time', 'creator selection time', 'contract time', 'production time', 'revision time', 'launch window', 'reporting time']],
  ['Risks and assumptions', ['budget risks', 'timeline risks', 'creator availability risks', 'approval risks', 'legal/usage risks']],
  ['Admin notes / idea log', ['idea cards', 'created-by notes', 'decision notes']],
];

const useBusinessCaseBundle = () => {
  const params = useParams();
  const id = params.id || params.businessCaseId;
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => v3GetBusinessCase(id).then((data) => {
    setBundle(data);
    setLoading(false);
    return data;
  }), [id]);
  useEffect(() => {
    setLoading(true);
    reload().catch(() => setLoading(false));
  }, [reload]);
  return { id, bundle, loading, reload };
};

const getCase = (bundle) => bundle?.business_case || {};
const getBrand = (bundle) => bundle?.brand || {};

const STAGE_INDEX = { connect: 0, frame: 1, plan: 2, deliver: 3, reporting: 4, closed: 4 };
const currentStageIndex = (stage) => STAGE_INDEX[stage] ?? 0;

const stageLinks = (id) => [
  ['Connect', `/v3/admin/business-cases/${id}/connect`],
  ['Frame', `/v3/admin/business-cases/${id}/frame/snapshot`],
  ['Plan', `/v3/admin/business-cases/${id}/plan/brainstorm`],
  ['Delivery', `/v3/admin/business-cases/${id}/delivery/summary`],
  ['Reporting', `/v3/admin/business-cases/${id}/reporting/final-report`],
];

export const businessCasePhasePath = (id, bc = {}) => {
  const stage = bc.stage || 'connect';
  if (stage === 'closed' || stage === 'reporting') return `/v3/admin/business-cases/${id}/reporting/final-report`;
  if (stage === 'deliver') return `/v3/admin/business-cases/${id}/delivery/summary`;
  if (stage === 'plan') {
    const plan = bc.plan || {};
    if (!plan.brainstorm_round_id && !plan.brainstorm_status) return `/v3/admin/business-cases/${id}/plan/brainstorm`;
    if (!Array.isArray(plan.selected_creator_ids) || plan.selected_creator_ids.length === 0) return `/v3/admin/business-cases/${id}/plan/creator-scan`;
    if (!plan.creative_brief_id) return `/v3/admin/business-cases/${id}/plan/brief`;
    if (!plan.creator_briefing_status) return `/v3/admin/business-cases/${id}/plan/creator-briefing-call`;
    if (!plan.creative_snapshot_id && !plan.strategy_snapshot_status) return `/v3/admin/business-cases/${id}/plan/strategy-snapshot`;
    return `/v3/admin/business-cases/${id}/plan/strategy-snapshot`;
  }
  if (stage === 'frame') {
    const frame = bc.frame || {};
    const status = frame.alignment_snapshot_status || frame.status || '';
    if (status === 'approved') return `/v3/admin/business-cases/${id}/frame/approved`;
    if (status === 'sent' || status === 'waiting_brand' || status === 'pending_brand_review') return `/v3/admin/business-cases/${id}/frame/waiting-brand`;
    if (frame.brand_comments || frame.admin_comments || Number(frame.comment_count || 0) > 0) return `/v3/admin/business-cases/${id}/frame/admin-review`;
    return `/v3/admin/business-cases/${id}/frame/snapshot`;
  }
  return `/v3/admin/business-cases/${id}/connect`;
};

export const V3BusinessCaseStageHome = () => {
  const navigate = useNavigate();
  const { id, bundle, loading } = useBusinessCaseBundle();
  useEffect(() => {
    if (!loading && bundle) {
      navigate(businessCasePhasePath(id, getCase(bundle)), { replace: true });
    }
  }, [bundle, id, loading, navigate]);
  return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Opening the active Business Case page...</div>;
};

const FlowShell = ({ title, subtitle, children, nextAction }) => {
  const navigate = useNavigate();
  const { id, bundle, loading } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  if (loading) return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Loading business case...</div>;
  return (
    <div className="v3-stage-shell space-y-5" data-testid="business-case-flow-page">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="v3-btn-secondary text-[11px]" data-testid="business-case-back-btn">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button type="button" onClick={() => navigate('/v3/admin/business-cases')} className="v3-btn-secondary text-[11px]" data-testid="business-case-list-btn">
          <ArrowLeft className="w-3.5 h-3.5" /> Business Cases
        </button>
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-1">{bc.title}</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1>
          <p className="text-[13px] text-[#6E6657] mt-1 max-w-3xl">{subtitle}</p>
        </div>
        {nextAction && <div className="v3-next-action-card">{nextAction}</div>}
      </div>
      <div className="v3-stepper">
        {stageLinks(id).map(([label, href], idx) => {
          const locked = idx > currentStageIndex(bc.stage);
          return (
            <button
              key={label}
              onClick={() => { if (!locked) navigate(href); }}
              disabled={locked}
              aria-disabled={locked}
              title={locked ? `Locked until the ${stageLinks(id)[idx - 1]?.[0]} stage is completed` : ''}
              className={`v3-stepper-item${locked ? ' v3-stepper-item-locked' : ''}`}
              data-testid={`stepper-${label.toLowerCase()}${locked ? '-locked' : ''}`}
            >
              {locked && <Lock className="w-3.5 h-3.5 mr-1.5 inline-block align-[-2px]" strokeWidth={2} />}
              {label}
            </button>
          );
        })}
      </div>
      {children}
    </div>
  );
};

const InfoCard = ({ title, children, action }) => (
  <div className="v3-card p-5">
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const TextInput = ({ label, value, onChange, rows = 1 }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    {rows > 1 ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" />
    )}
  </label>
);

const DateTimeInput = ({ label, value, onChange }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    <input
      type="datetime-local"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none"
      data-testid="connect-scheduled-for"
    />
  </label>
);

const AgendaEditor = ({ items, onChange }) => {
  const updateItem = (index, value) => onChange(items.map((item, idx) => (idx === index ? value : item)));
  const removeItem = (index) => onChange(items.filter((_, idx) => idx !== index));
  const addItem = () => onChange([...items, '']);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Agenda</span>
        <button type="button" onClick={addItem} className="v3-btn-secondary text-[11px]" data-testid="connect-agenda-add">
          <Plus className="w-3.5 h-3.5" /> Add topic
        </button>
      </div>
      <div className="rounded-xl border border-[#D7CBB8] bg-[#FBFAF7] p-3">
        <div className="grid gap-2">
          {items.map((item, index) => (
            <div key={`agenda-${index}`} className="grid grid-cols-[34px_1fr_auto] items-center gap-2 rounded-lg border border-[#E8E4DB] bg-white p-2 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E8F3ED] text-[11px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {index + 1}
              </span>
              <input
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                className="min-w-0 rounded-md border border-transparent bg-transparent px-2 py-1 text-[13px] text-[#1A1A1A] outline-none focus:border-[#D7CBB8] focus:bg-[#FAF7F1]"
                placeholder="Agenda topic"
                data-testid={`connect-agenda-item-${index}`}
              />
              <button type="button" onClick={() => removeItem(index)} className="rounded-md p-1.5 text-[#B54A37] hover:bg-[#FBF1EE]" aria-label={`Remove agenda item ${index + 1}`}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const downloadDraft = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const creatorName = (creator) => creator?.name || creator?.creator_name || creator?.creative_name || creator?.company_name || creator?.id || 'Creator';

const creatorSpecialty = (creator) => {
  const platforms = Array.isArray(creator?.platforms) ? creator.platforms.join(', ') : creator?.platforms;
  return [creator?.genre, creator?.tier, platforms].filter(Boolean).join(' · ') || creator?.audience || 'Approved creator profile';
};

const creatorContact = (creator) => creator?.email || creator?.manager_email || creator?.contact_email || '';

const selectedCreatorQuery = (ids) => encodeURIComponent(ids.join(','));

const creatorBriefLink = (businessCaseId, creatorId) => `${window.location.origin}/v3/creator/briefs/${businessCaseId}?creator=${encodeURIComponent(creatorId)}`;

const generateCreatorBriefDraft = (bundle, creator, planningFields = {}) => {
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const alignment = bundle?.alignment_snapshot || {};
  const marketing = bc.connect?.marketing_intelligence || alignment.marketing_intelligence || {};
  const projectTitle = bc.title || 'Business Case Project';
  const brandName = brand.company || brand.name || 'Brand';
  const leadName = bc.relationship_manager_name || brand.relationship_manager_name || 'TTA project lead';
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const planningValue = (label, fallback) => String(planningFields[label] || fallback || '').trim();
  return [
    'TTA - Creative Alignment Brief (Creator Version)',
    'Internal name: Creator Brief for Fee Confirmation',
    '',
    '1. Project Reference',
    `Brand / Organisation: ${brandName}`,
    `Project working title: ${projectTitle}`,
    `TTA project lead: ${leadName}`,
    `Date shared with creator: ${today}`,
    `Creator: ${creatorName(creator)}`,
    `Creator contact: ${creatorContact(creator) || 'To be confirmed'}`,
    '',
    '2. Context (High-Level)',
    `Brand objective (summary): ${planningValue('Campaign core idea', marketing.key_marketing_focus || bc.stated_intent || `Position ${brandName} with a credible creator-led cultural idea that supports the approved business case.`)}`,
    `Why this project is happening now: ${planningValue('Audience and behavior', marketing.current_marketing_challenge || marketing.primary_target_audience || 'The brand is preparing a creator partnership and needs pricing/fit confirmation before final scope approval.')}`,
    '',
    '3. Role of the Creative',
    'The creative would act as:',
    '- Public-facing lead',
    '- Conceptual lead',
    '- Talent & cultural translator',
    '- Executional partner',
    `Primary responsibility: ${planningValue('Creator direction', `${creatorName(creator)} should help translate the brand opportunity through ${creatorSpecialty(creator)} while keeping the idea credible to their audience.`)}`,
    'Describe responsibility, not outputs.',
    '',
    '4. Expected Scope (Signal Only)',
    'This engagement may include:',
    '- Content creation',
    '- Appearances / representation',
    '- Concept contribution',
    '- Performance / activation involvement',
    '- Other',
    `Scope signal from planning: ${planningValue('Content/deliverables idea log', 'Creator involvement is being explored for planning and pricing alignment only.')}`,
    'Important Inclusion:',
    '- Specific deliverables are not yet defined',
    '- Final scope is subject to brand approval',
    '',
    '5. Indicative Timeline',
    `Proposed engagement period: ${planningValue('Timeline inference', marketing.timeline || 'To be confirmed after brand approval and creator availability check.')}`,
    'Known timing constraints: Confirm availability, blackout dates, production constraints, and any campaign launch windows.',
    'No schedules. No milestones.',
    '',
    '6. Working Assumptions',
    '- TTA will coordinate engagement and act as administrative lead',
    '- Contracts issued through TTA',
    '- Payment processed through TTA',
    '- Reporting and brand liaison handled by TTA',
    '',
    '7. Fee Indication Request',
    `Fee for engagement (range or fixed): ${planningValue('Budget planning', 'Creator to propose a fee range or fixed fee for the engagement signal above.')}`,
    'Fee basis: Project-based / Time-based / Retainer-style',
    'What fee covers: Please state what your indication includes, including content, appearances, concept contribution, usage, exclusivity, production support, or management fees where relevant.',
    'No breakdown required at this stage.',
    '',
    '8. Availability & Conditions',
    'Are you available within proposed period? Yes / Conditional / No',
    `Conditions/exclusions: ${planningValue('Risks and assumptions', 'Please share category conflicts, usage limits, exclusivity restrictions, production requirements, travel constraints, or anything that would affect the final scope.')}`,
    '',
    '9. Confirmation',
    '[ ] I understand this is for planning and pricing alignment only',
    '[ ] I understand this is not a confirmed booking',
    '[ ] I am open to proceeding subject to final scope and budget approval',
    '',
    'Name:',
    'Date:',
  ].join('\n');
};

const briefPrintHtml = (title, body) => `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;color:#1A1A1A;margin:48px;line-height:1.55}h1{font-size:24px}pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:13px}</style></head><body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(body)}</pre></body></html>`;

const cloneAlignmentSnapshot = (snapshot) => {
  if (!snapshot) return null;
  return {
    ...snapshot,
    sections: (snapshot.sections || []).map((section) => ({
      ...section,
      items: Array.isArray(section.items) ? section.items.map((item) => (typeof item === 'object' && item !== null ? { ...item } : item)) : section.items,
      columns: Array.isArray(section.columns) ? [...section.columns] : section.columns,
      rows: Array.isArray(section.rows)
        ? section.rows.map((row) => (Array.isArray(row) ? [...row] : { ...row }))
        : section.rows,
    })),
  };
};

const splitLines = (value) => String(value || '')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const listTextFromItems = (items = []) => items
  .map((item) => (typeof item === 'string' ? item : item?.text || item?.label || item?.value || ''))
  .filter(Boolean)
  .join('\n');

const itemsFromListText = (value) => splitLines(value);

const kpiTextFromItems = (items = []) => items
  .map((item) => {
    if (typeof item === 'string') return item;
    return `${item?.kpi || item?.label || 'KPI'}: ${item?.target || item?.value || 'Confirm with brand.'}`;
  })
  .join('\n');

const kpisFromText = (value) => splitLines(value).map((line) => {
  const [name, ...targetParts] = line.split(':');
  return {
    kpi: (name || 'KPI').trim(),
    target: targetParts.join(':').trim() || 'Confirm with brand.',
  };
});

const flagsTextFromItems = (items = []) => items
  .map((item) => {
    if (typeof item === 'string') return item;
    return item?.reason ? `${item.text || item.label || 'Flag'}: ${item.reason}` : (item?.text || item?.label || '');
  })
  .filter(Boolean)
  .join('\n');

const flagsFromText = (value) => splitLines(value).map((line) => {
  const [text, ...reasonParts] = line.split(':');
  return {
    text: (text || 'Flag').trim(),
    reason: reasonParts.join(':').trim() || 'Review before Plan.',
  };
});

const snapshotPlainText = (snapshot) => {
  if (!snapshot) return '';
  const lines = [snapshot.title, snapshot.meta];
  (snapshot.sections || []).forEach((section) => {
    lines.push(section.heading);
    if (section.content) lines.push(section.content);
    if (Array.isArray(section.items)) {
      const text = section.type === 'kpis'
        ? kpiTextFromItems(section.items)
        : section.type === 'flags'
          ? flagsTextFromItems(section.items)
          : listTextFromItems(section.items);
      if (text) lines.push(text);
    }
    if (Array.isArray(section.rows)) {
      const columns = Array.isArray(section.columns) ? section.columns : [];
      section.rows.forEach((row) => {
        const cells = Array.isArray(row) ? row : Object.values(row || {});
        lines.push(columns.length ? columns.map((column, index) => `${column}: ${cells[index] || ''}`).join(' | ') : cells.join(' | '));
      });
    }
  });
  return lines.filter(Boolean).join('\n\n');
};

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const snapshotPrintHtml = (snapshot) => {
  const sections = (snapshot?.sections || []).map((section) => {
    const list = Array.isArray(section.items)
      ? `<ul>${section.items.map((item) => `<li>${escapeHtml(typeof item === 'string' ? item : `${item.kpi || item.text || item.label || 'Item'}${item.target || item.reason ? `: ${item.target || item.reason}` : ''}`)}</li>`).join('')}</ul>`
      : '';
    const rows = Array.isArray(section.rows) && section.rows.length
      ? `<table><thead><tr>${(section.columns || []).map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${section.rows.map((row) => {
        const cells = Array.isArray(row) ? row : Object.values(row || {});
        return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`;
      }).join('')}</tbody></table>`
      : '';
    return `<section><h2>${escapeHtml(section.heading)}</h2>${section.content ? `<p>${escapeHtml(section.content)}</p>` : ''}${list}${rows}</section>`;
  }).join('');
  return `<!doctype html><html><head><title>${escapeHtml(snapshot?.title || 'Alignment Snapshot')}</title><style>
    body{font-family:Arial,sans-serif;color:#1A1A1A;margin:40px;line-height:1.55}
    h1{font-size:28px;margin:0 0 8px} h2{font-size:15px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.08em}
    p,li,td,th{font-size:13px} section{break-inside:avoid;border-top:1px solid #ddd;padding-top:12px}
    table{width:100%;border-collapse:collapse;margin-top:10px} th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
    .meta{color:#6E6657;font-size:12px;margin-bottom:24px}
  </style></head><body><h1>${escapeHtml(snapshot?.title || 'Alignment Snapshot')}</h1><div class="meta">${escapeHtml(snapshot?.meta || '')}</div>${sections}</body></html>`;
};

export const V3BusinessCaseConnect = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const intelligence = bc.connect?.marketing_intelligence || {};
  return (
    <FlowShell title="Connect / Business Call" subtitle="Business Call — Connect is the source of truth for Alignment Snapshot readiness." nextAction="Schedule the call, send the welcome email, then analyze the transcript.">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <InfoCard title="Brand info">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {[
              ['Company', brand.company || brand.name],
              ['Contact', contact.primary_contact || brand.primary_contact],
              ['Email', contact.email || brand.email || 'Missing'],
              ['Phone', contact.phone || brand.phone || 'Missing'],
              ['Website', contact.website || brand.website || 'Missing'],
              ['Connect status', bc.connect?.connect_status || 'needs_business_call'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</p>
                <p className="text-[#1A1A1A] break-words">{value || 'Pending'}</p>
              </div>
            ))}
          </div>
        </InfoCard>
        <InfoCard title="Next steps">
          <div className="grid gap-2">
            <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/schedule`)} className="v3-btn-primary"><Plus className="w-3.5 h-3.5" /> Schedule meeting</button>
          </div>
        </InfoCard>
      </div>
      <InfoCard title="Alignment Snapshot readiness checklist">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {connectQuestions.slice(0, 8).map((item) => (
            <div key={item} className="rounded-lg bg-[#F4F2EC] p-3 text-[12px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1F4A3A] inline mr-1" /> {item}
            </div>
          ))}
        </div>
        <p className="text-[12px] text-[#6E6657] mt-3">Current marketing focus: {intelligence.key_marketing_focus || bc.connect?.stated_intent || 'Pending transcript analysis.'}</p>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectSchedule = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const brand = getBrand(bundle);
  const bc = getCase(bundle);
  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    scheduled_for: '',
    meeting_link: '',
  });
  const [agendaItems, setAgendaItems] = useState(connectQuestions);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (prefilled || !bundle?.business_case) return;
    const loadedBrand = getBrand(bundle);
    const loadedCase = getCase(bundle);
    const contact = loadedCase.brand_contact_snapshot || {};
    const nextContactName = (
      contact.primary_contact ||
      contact.contact_name ||
      loadedBrand.primary_contact ||
      loadedBrand.primaryContact ||
      loadedBrand.company ||
      loadedBrand.name ||
      ''
    );
    const nextContactEmail = contact.email || contact.contact_email || loadedBrand.email || '';
    setForm((current) => ({
      ...current,
      contact_name: current.contact_name || nextContactName,
      contact_email: current.contact_email || nextContactEmail,
    }));
    setPrefilled(true);
  }, [bundle, prefilled]);
  const save = async () => {
    if (!bundle?.business_case) {
      setSaveNotice('Business Case details are still loading. Please try again in a moment.');
      return;
    }
    const agenda = agendaItems.map((item) => item.trim()).filter(Boolean).join('\n');
    setSaving(true);
    setSaveNotice('');
    try {
      const meeting = await v3CreateMeeting({
        title: `Business Call — Connect: ${bc.title || brand.company || 'Brand'}`,
        meeting_type: 'business_call',
        stage: 'connect',
        entity_type: 'brand',
        brand_id: bc.brand_id || brand.id,
        business_case_id: id,
        business_case_title: bc.title,
        entity_name: brand.company || brand.name || '',
        ...form,
        agenda,
        meeting_notes: agenda,
      });
      setSaveNotice('Meeting saved. Opening Connect Questions + Transcript...');
      navigate(`/v3/admin/business-cases/${id}/connect/questions`, { state: { meetingId: meeting.id } });
    } catch (e) {
      setSaveNotice(e?.response?.data?.detail || e?.message || 'Could not save the meeting. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <FlowShell title="Connect Schedule" subtitle="Set the Business Call time, link, agenda, and brand contact before the transcript review." nextAction="Save the meeting to open Connect Questions + Transcript.">
      <InfoCard title="Schedule meeting">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput label="Contact name" value={form.contact_name} onChange={(value) => setForm({ ...form, contact_name: value })} />
          <TextInput label="Contact email" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} />
          <DateTimeInput label="Date/time" value={form.scheduled_for} onChange={(value) => setForm({ ...form, scheduled_for: value })} />
          <TextInput label="Meeting link" value={form.meeting_link} onChange={(value) => setForm({ ...form, meeting_link: value })} />
          <div className="md:col-span-2">
            <AgendaEditor items={agendaItems} onChange={setAgendaItems} />
          </div>
        </div>
        {saveNotice && (
          <div className="mt-4 rounded-lg border border-[#D7CBB8] bg-[#FAF7F1] px-3 py-2 text-[12px] text-[#4F3E2F]" data-testid="connect-save-notice">
            {saveNotice}
          </div>
        )}
        <button onClick={save} disabled={saving || !bundle?.business_case} className="v3-btn-primary mt-4" data-testid="connect-save-meeting-btn">
          <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Meeting'}
        </button>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectQuestions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [meetingId, setMeetingId] = useState(location.state?.meetingId || '');
  useEffect(() => {
    if (!bundle?.business_case || meetingId) return;
    const connect = getCase(bundle).connect || {};
    const savedMeetingId = connect.latest_meeting_id || (Array.isArray(connect.meeting_ids) ? connect.meeting_ids[connect.meeting_ids.length - 1] : '');
    if (savedMeetingId) {
      setMeetingId(savedMeetingId);
      return;
    }
    v3ListMeetings({ business_case_id: id, meeting_type: 'business_call', stage: 'connect' })
      .then((rows) => {
        const latest = Array.isArray(rows) ? rows[0] : null;
        if (latest?.id) setMeetingId(latest.id);
      })
      .catch(() => {});
  }, [bundle, id, meetingId]);
  const analyze = async () => {
    let activeMeetingId = meetingId;
    if (!activeMeetingId) {
      const meeting = await v3CreateMeeting({
        title: `Business Call — Connect: ${bc.title}`,
        meeting_type: 'business_call',
        stage: 'connect',
        entity_type: 'brand',
        brand_id: bc.brand_id,
        business_case_id: id,
        entity_name: brand.company || brand.name || '',
        business_case_title: bc.title,
        agenda: connectQuestions.join('\n'),
      });
      activeMeetingId = meeting.id;
      setMeetingId(activeMeetingId);
    }
    await v3UploadMeetingTranscript(activeMeetingId, { transcript });
    const result = await v3AnalyzeMeetingTranscript(activeMeetingId, {});
    const nextAnalysis = { ...result, meeting_id: activeMeetingId };
    setAnalysis(nextAnalysis);
    navigate(`/v3/admin/business-cases/${id}/connect/analysis`, { state: { connectAnalysis: nextAnalysis } });
  };
  return (
    <FlowShell title="Connect Questions + Transcript" subtitle="Use these prompts to capture everything needed for Alignment Snapshot readiness." nextAction="Analyze the transcript, then open the AI result page.">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <InfoCard title="Suggested questions">
          <ol className="list-decimal pl-5 space-y-2 text-[13px]">{connectQuestions.map((q) => <li key={q}>{q}</li>)}</ol>
        </InfoCard>
        <InfoCard title="Transcript paste/upload">
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" />
          <div className="flex gap-2 mt-3">
            <button onClick={analyze} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Analyze Transcript</button>
          </div>
          {analysis && <p className="text-[12px] text-[#1F4A3A] mt-3">{analysis.recommendation?.label || analysis.ai_recommendation}</p>}
        </InfoCard>
      </div>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const analysis = location.state?.connectAnalysis || bc.connect?.analysis || {};
  const recommendation = analysis.recommendation || {};
  return (
    <FlowShell title="Connect AI Result" subtitle="Review extracted marketing intelligence, reasons, missing context, risk flags, and the promote/reschedule/delete recommendation." nextAction={recommendation.label || 'Analyze a transcript to unlock the decision.'}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfoCard title="Recommendation">
          <p className="text-xl font-semibold text-[#1A1A1A]">{recommendation.label || 'Pending analysis'}</p>
          <p className="text-[12px] text-[#6E6657] mt-2">{recommendation.summary || analysis.summary || 'No AI result stored yet.'}</p>
        </InfoCard>
        <InfoCard title="Missing context"><ul className="list-disc pl-5 text-[13px]">{(recommendation.missing_context || analysis.missing_information || []).map((x) => <li key={x}>{x}</li>)}</ul></InfoCard>
        <InfoCard title="Risk flags"><ul className="list-disc pl-5 text-[13px]">{(recommendation.risk_flags || analysis.risk_flags || []).map((x) => <li key={x}>{x}</li>)}</ul></InfoCard>
      </div>
      <InfoCard title="Decision actions">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => v3PromoteBusinessCaseConnect(id, { reason: 'Admin accepted Connect analysis.' }).then(() => navigate(`/v3/admin/business-cases/${id}/frame/snapshot`))} className="v3-btn-primary"><CheckCircle2 className="w-3.5 h-3.5" /> Promote to Frame</button>
          <button onClick={() => navigate(`/v3/admin/business-cases/${id}/connect/reschedule`)} className="v3-btn-secondary"><RotateCcw className="w-3.5 h-3.5" /> Reschedule Business Call</button>
          <button onClick={() => v3DeleteBusinessCaseConnect(id, { reason: 'Admin deleted from Connect analysis.' }).then(() => navigate('/v3/admin/business-cases'))} className="v3-btn-secondary text-[#B54A37]"><Trash2 className="w-3.5 h-3.5" /> Delete Brand From Pipeline</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectReschedule = () => {
  const { id } = useBusinessCaseBundle();
  const [form, setForm] = useState({ reason: '', scheduled_for: '', meeting_link: '', contact_email: '' });
  const [done, setDone] = useState(false);
  const reschedule = async () => {
    await v3RescheduleBusinessCaseConnect(id, form);
    await v3SendConnectRescheduleEmail(id, form);
    setDone(true);
  };
  return (
    <FlowShell title="Reschedule Business Call" subtitle="Capture missing details, propose the next call, and send a clean summary email." nextAction="Send the reschedule email after saving the new meeting details.">
      <InfoCard title="Reschedule details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput label="Reason / missing details" rows={4} value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} />
          <TextInput label="Contact email" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} />
          <TextInput label="New date/time" value={form.scheduled_for} onChange={(value) => setForm({ ...form, scheduled_for: value })} />
          <TextInput label="Meeting link" value={form.meeting_link} onChange={(value) => setForm({ ...form, meeting_link: value })} />
        </div>
        <button onClick={reschedule} className="v3-btn-primary mt-4"><Mail className="w-3.5 h-3.5" /> Save + send summary email</button>
        {done && <p className="text-[12px] text-[#1F4A3A] mt-3">Reschedule meeting and email queued.</p>}
      </InfoCard>
    </FlowShell>
  );
};

const AlignmentSectionEditor = ({ section, index, onChange }) => {
  const update = (patch) => onChange({ ...section, ...patch });
  const columns = Array.isArray(section.columns) && section.columns.length
    ? section.columns
    : ['Segment', 'Behavior / Usage', 'Key Driver', 'Notes / Evidence'];
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const updateRow = (rowIndex, columnIndex, value) => {
    const nextRows = rows.map((row, idx) => {
      const cells = Array.isArray(row) ? row : Object.values(row || {});
      if (idx !== rowIndex) return cells;
      return columns.map((_, cellIndex) => (cellIndex === columnIndex ? value : (cells[cellIndex] || '')));
    });
    update({ columns, rows: nextRows });
  };
  const addRow = () => update({ columns, rows: [...rows.map((row) => (Array.isArray(row) ? row : Object.values(row || {}))), columns.map(() => '')] });

  return (
    <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-4 shadow-sm" data-testid={`alignment-section-${index}`}>
      <div className="grid grid-cols-[38px_1fr] gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F3ED] text-[12px] font-semibold text-[#1F4A3A]">
          {index + 1}
        </div>
        <div className="space-y-3">
          <TextInput label="Section heading" value={section.heading || ''} onChange={(value) => update({ heading: value })} />
          <TextInput label="Section narrative" rows={4} value={section.content || ''} onChange={(value) => update({ content: value })} />

          {(section.type === 'bullets' || section.type === 'numbered') && (
            <TextInput
              label="Section points"
              rows={5}
              value={listTextFromItems(section.items || [])}
              onChange={(value) => update({ items: itemsFromListText(value) })}
            />
          )}

          {section.type === 'kpis' && (
            <TextInput
              label="KPI targets"
              rows={5}
              value={kpiTextFromItems(section.items || [])}
              onChange={(value) => update({ items: kpisFromText(value) })}
            />
          )}

          {section.type === 'flags' && (
            <TextInput
              label="Review flags"
              rows={5}
              value={flagsTextFromItems(section.items || [])}
              onChange={(value) => update({ items: flagsFromText(value) })}
            />
          )}

          {section.type === 'table' && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Audience segmentation table</span>
              <div className="overflow-x-auto rounded-lg border border-[#E8E4DB]">
                <table className="min-w-full text-left text-[12px]">
                  <thead className="bg-[#F4F2EC] text-[#4F3E2F]">
                    <tr>{columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.map((row, rowIndex) => {
                      const cells = Array.isArray(row) ? row : Object.values(row || {});
                      return (
                        <tr key={`snapshot-row-${rowIndex}`} className="border-t border-[#E8E4DB]">
                          {columns.map((column, columnIndex) => (
                            <td key={`${column}-${columnIndex}`} className="px-2 py-2 align-top">
                              <textarea
                                value={cells[columnIndex] || ''}
                                onChange={(event) => updateRow(rowIndex, columnIndex, event.target.value)}
                                rows={3}
                                className="w-full min-w-[150px] rounded-md border border-transparent bg-[#FBFAF7] px-2 py-1 text-[12px] outline-none focus:border-[#D7CBB8] focus:bg-white"
                                aria-label={`${column} row ${rowIndex + 1}`}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addRow} className="v3-btn-secondary text-[11px]"><Plus className="w-3.5 h-3.5" /> Add segment</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const V3BusinessCaseFrameSnapshot = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const snapshot = bundle?.alignment_snapshot;
  const [notice, setNotice] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const stage = bundle?.business_case?.stage;
  const activeSnapshot = draft || snapshot;
  const hasSnapshot = Boolean(activeSnapshot?.title || activeSnapshot?.meta || activeSnapshot?.sections?.length);

  useEffect(() => {
    setDraft(cloneAlignmentSnapshot(snapshot));
  }, [snapshot]);

  const persistDraft = async () => {
    if (!draft?.id) return null;
    const saved = await v3UpdateAlignment(draft.id, {
      title: draft.title || '',
      meta: draft.meta || '',
      sections: draft.sections || [],
      reviewer: 'admin',
    });
    setDraft(cloneAlignmentSnapshot(saved));
    await reload();
    return saved;
  };

  const generateSnapshot = async () => {
    setNotice(null);
    try {
      const generated = await v3GenerateAlignment(id);
      setDraft(cloneAlignmentSnapshot(generated));
      await reload();
      setNotice('Alignment Snapshot generated. Review and edit the full draft before sending it to the brand.');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 400 && String(detail || '').includes('Frame stage')) {
        setNotice("Can't generate the Alignment Snapshot yet. Complete the Connect stage and move this Business Case to Frame first.");
      } else {
        setNotice(detail || 'Could not generate the Alignment Snapshot. Please try again.');
      }
    }
  };

  const saveEdits = async () => {
    setNotice(null);
    try {
      await persistDraft();
      setNotice('Alignment Snapshot edits saved.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save Alignment Snapshot edits.');
    }
  };

  const approveSnapshot = async () => {
    setNotice(null);
    try {
      await persistDraft();
      await v3ApproveAlignmentAs(id, 'admin', 'admin');
      if (stage === 'frame') {
        await v3AdvanceBusinessCase(id, {
          actor: 'admin',
          override: true,
          reason: 'Alignment Snapshot approved by admin.',
        });
      }
      await reload();
      navigate(`/v3/admin/business-cases/${id}/plan/brainstorm`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not approve the Alignment Snapshot. Generate it first.');
    }
  };

  const openPreview = () => {
    if (!hasSnapshot) {
      setNotice('Generate the Alignment Snapshot before previewing it.');
      return;
    }
    setPreviewOpen(true);
  };

  const copyBrandReviewLink = () => {
    const link = `${window.location.origin}/v3/brand/approvals`;
    if (!navigator.clipboard) {
      setNotice(`Brand review link: ${link}`);
      return;
    }
    navigator.clipboard.writeText(link)
      .then(() => setNotice('Brand review link copied.'))
      .catch(() => setNotice(`Brand review link: ${link}`));
  };

  const sendEmailToBrand = async () => {
    setNotice(null);
    try {
      await persistDraft();
      await v3SendAlignmentToBrand(id);
      await reload();
      setNotice('Alignment Snapshot emailed to the brand and shared to the Brand Portal.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not send the Alignment Snapshot. Generate it first.');
    }
  };

  const downloadPdf = () => {
    if (!activeSnapshot) {
      setNotice('Generate the Alignment Snapshot before downloading it.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      setNotice('Allow pop-ups to download the snapshot as a PDF.');
      return;
    }
    printWindow.document.write(snapshotPrintHtml(activeSnapshot));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
    setNotice('PDF export opened. Choose Save as PDF in the print dialog.');
  };

  const shareWhatsApp = () => {
    if (!activeSnapshot) {
      setNotice('Generate the Alignment Snapshot before sharing it.');
      return;
    }
    const link = `${window.location.origin}/v3/brand/approvals`;
    const text = `${activeSnapshot.title || 'Alignment Snapshot'}\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const updateSection = (index, nextSection) => {
    setDraft((current) => ({
      ...(current || {}),
      sections: (current?.sections || []).map((section, sectionIndex) => (sectionIndex === index ? nextSection : section)),
    }));
  };

  return (
    <FlowShell title="Alignment Snapshot Studio" subtitle="Generate, edit, save, and send the Alignment Snapshot to the Brand Portal and email." nextAction="Generate the snapshot from the approved business call, then review it before sharing.">
      <InfoCard
        title="Alignment Snapshot"
        action={(
          <div className="flex flex-wrap justify-end gap-2">
            <button data-testid="alignment-generate-btn" onClick={generateSnapshot} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Generate Alignment Snapshot</button>
            <button data-testid="alignment-preview-btn" onClick={openPreview} className="v3-btn-secondary"><FileText className="w-3.5 h-3.5" /> Preview</button>
            <button data-testid="alignment-admin-approve-btn" onClick={approveSnapshot} className="v3-btn-secondary"><CheckCircle2 className="w-3.5 h-3.5" /> Admin approve</button>
          </div>
        )}
      >
        {notice && (
          <div data-testid="alignment-notice" className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-3 text-[12px] text-[#7A5A1E]">
            {notice}{stage && stage !== 'frame' ? ` (Current stage: ${bundle?.business_case?.stage_label || stage})` : ''}
          </div>
        )}

        {!hasSnapshot ? (
          <div className="rounded-[8px] border border-dashed border-[#D7CBB8] bg-[#FBFAF7] p-5 text-[13px] text-[#6E6657]">
            Generate the Alignment Snapshot to create the full editable document from the uploaded template structure.
          </div>
        ) : (
          <div className="space-y-4" data-testid="alignment-snapshot-editor">
            <div className="rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-4">
              <TextInput label="Snapshot title" value={activeSnapshot?.title || ''} onChange={(value) => setDraft({ ...(activeSnapshot || {}), title: value })} />
              <div className="mt-3">
                <TextInput label="Snapshot note" rows={3} value={activeSnapshot?.meta || ''} onChange={(value) => setDraft({ ...(activeSnapshot || {}), meta: value })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={saveEdits} className="v3-btn-primary" data-testid="alignment-save-edits-btn"><Save className="w-3.5 h-3.5" /> Save edits</button>
              </div>
            </div>

            {(activeSnapshot?.sections || []).map((section, index) => (
              <AlignmentSectionEditor
                key={`${section.heading || 'section'}-${index}`}
                section={section}
                index={index}
                onChange={(nextSection) => updateSection(index, nextSection)}
              />
            ))}
          </div>
        )}

        {hasSnapshot && (
          <div data-testid="alignment-share-options" className="mt-4 rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-3">
            <div className="flex flex-wrap gap-2">
              <button data-testid="alignment-email-brand-btn" onClick={sendEmailToBrand} className="v3-btn-primary"><Mail className="w-3.5 h-3.5" /> Email to brand</button>
              <button data-testid="alignment-copy-link-btn" onClick={copyBrandReviewLink} className="v3-btn-secondary"><FileText className="w-3.5 h-3.5" /> Copy link</button>
              <button data-testid="alignment-download-pdf-btn" onClick={downloadPdf} className="v3-btn-secondary"><Download className="w-3.5 h-3.5" /> Download PDF</button>
              <button data-testid="alignment-whatsapp-share-btn" onClick={shareWhatsApp} className="v3-btn-secondary"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp share</button>
            </div>
            <p className="mt-2 text-[12px] text-[#6E6657]">Save edits first if you changed the draft, then choose how the brand should receive the snapshot.</p>
          </div>
        )}
        {previewOpen && hasSnapshot && (
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-6" data-testid="alignment-preview-modal">
            <div className="w-full max-w-4xl rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-5 shadow-2xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Alignment Snapshot Preview</p>
                  <h3 className="text-lg font-semibold text-[#1A1A1A]">{activeSnapshot?.title || 'Alignment Snapshot'}</h3>
                </div>
                <button type="button" onClick={() => setPreviewOpen(false)} className="v3-btn-secondary text-[11px]" data-testid="alignment-preview-close-btn">
                  Close
                </button>
              </div>
              <div className="max-h-[76vh] overflow-y-auto rounded-[8px] border border-[#E8E4DB] bg-white p-5">
                <p className="mb-5 text-[13px] text-[#6E6657]">{activeSnapshot?.meta}</p>
                <div className="space-y-5">
                  {(activeSnapshot?.sections || []).map((section, index) => (
                    <section key={`preview-${section.heading || index}`} className="border-t border-[#E8E4DB] pt-4">
                      <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{section.heading}</h4>
                      {section.content && <p className="text-[13px] leading-6 text-[#4F3E2F]">{section.content}</p>}
                      {Array.isArray(section.items) && section.items.length > 0 && (
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] text-[#4F3E2F]">
                          {section.items.map((item, itemIndex) => (
                            <li key={`preview-item-${index}-${itemIndex}`}>
                              {typeof item === 'string' ? item : `${item.kpi || item.text || item.label || 'Item'}${item.target || item.reason ? `: ${item.target || item.reason}` : ''}`}
                            </li>
                          ))}
                        </ul>
                      )}
                      {Array.isArray(section.rows) && section.rows.length > 0 && (
                        <div className="mt-3 overflow-x-auto rounded-lg border border-[#E8E4DB]">
                          <table className="min-w-full text-left text-[12px]">
                            <thead className="bg-[#F4F2EC] text-[#4F3E2F]">
                              <tr>{(section.columns || []).map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}</tr>
                            </thead>
                            <tbody>
                              {section.rows.map((row, rowIndex) => {
                                const cells = Array.isArray(row) ? row : Object.values(row || {});
                                return (
                                  <tr key={`preview-row-${rowIndex}`} className="border-t border-[#E8E4DB]">
                                    {cells.map((cell, cellIndex) => <td key={`preview-cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top text-[#4F3E2F]">{cell}</td>)}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseFrameWaitingBrand = () => {
  const { bundle } = useBusinessCaseBundle();
  const snap = bundle?.alignment_snapshot || {};
  return <FlowShell title="Waiting for Brand Approval" subtitle="Track snapshot status, sent date, brand email, reminders, and comments."><InfoCard title="Waiting state"><p className="text-[13px]">Status: {snap.status || 'not sent'}</p><p className="text-[13px]">Sent: {snap.sent_to_brand_at || snap.shared_at || 'Pending'}</p><p className="text-[13px] mt-2">Comments: {(snap.brand_comments || []).length}</p></InfoCard></FlowShell>;
};

export const V3BusinessCaseFrameAdminReview = () => {
  const { bundle } = useBusinessCaseBundle();
  const comments = bundle?.alignment_snapshot?.brand_comments || [];
  return <FlowShell title="Brand Comments / Admin Review" subtitle="Resolve brand comments, edit the snapshot, and resend it."><InfoCard title="Comments">{comments.length ? comments.map((c) => <div key={c.id} className="rounded-lg border border-[#E8E4DB] p-3 mb-2 text-[13px]">{c.quoted_text || 'Snapshot section'}: {c.comment}</div>) : <p className="text-[13px] text-[#8A8A8A]">No brand comments yet.</p>}</InfoCard></FlowShell>;
};

export const V3BusinessCaseFrameApproved = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const snap = bundle?.alignment_snapshot || {};
  return <FlowShell title="Frame Approved" subtitle="Confirm approval and move the Business Case into Plan."><InfoCard title="Approval status"><p className="text-[13px]">Approved by: {snap.approved_by || 'Pending'}</p><p className="text-[13px]">Approved at: {snap.approved_at || 'Pending'}</p><button onClick={() => navigate(`/v3/admin/business-cases/${id}/plan/brainstorm`)} className="v3-btn-primary mt-4">Move to Plan Phase</button></InfoCard></FlowShell>;
};

const BS_VOICE_TYPES = ['Authority / Expert', 'Peer / Relatable', 'Entertainer / Cultural Driver', 'Niche Specialist'];
const BS_AUDIENCE_REL = ['Trust-driven', 'Reach-driven', 'Conversion-driven', 'Community-driven'];
const BS_FORMAT_STRENGTH = ['Short-form conversion', 'Long-form storytelling', 'Live / real-time', 'Series-based'];
const BS_BUDGET = ['Low', 'Mid', 'Premium'];
const BS_EFFICIENCY = ['High conversion', 'High reach', 'Balanced'];
const BS_TIMING = ['Immediate', 'Gradual'];

const BSField = ({ label, hint, value, onChange, rows = 2, placeholder = '' }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    {hint && <span className="block text-[11px] text-[#6E6657] mt-0.5">{hint}</span>}
    {rows === 1 ? (
      <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none" />
    ) : (
      <textarea value={value || ''} placeholder={placeholder} rows={rows} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none leading-relaxed" />
    )}
  </label>
);

const BSSelect = ({ label, options, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none">
      <option value="">— select —</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
);

const BSPhase = ({ phase, title, subtitle, children }) => (
  <div className="rounded-xl border border-[#E8E4DB] bg-white shadow-sm" data-testid={`brainstorm-phase-${phase}`}>
    <div className="px-6 py-4 border-b border-[#E8E4DB] bg-[#FBFAF7] rounded-t-xl">
      <p className="text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{title}</p>
      {subtitle && <p className="text-[11px] text-[#6E6657] mt-1">{subtitle}</p>}
    </div>
    <div className="px-6 py-5 space-y-4">{children}</div>
  </div>
);

export const V3BusinessCasePlanBrainstorm = () => {
  const navigate = useNavigate();
  const { id } = useBusinessCaseBundle();
  const [round, setRound] = useState(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    v3ListBrainstorms(id).then((rows) => {
      const latest = Array.isArray(rows) && rows.length ? rows[rows.length - 1] : null;
      if (latest) setRound(latest);
    });
  }, [id]);

  const startRound = async () => {
    setNotice('');
    try {
      const doc = await v3CreateBrainstorm({ business_case_id: id, scored_creators: [] });
      setRound(doc);
      setNotice('Brainstorm round started. Fill in each phase as you work through the 60–90 minute session.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not start brainstorm round.');
    }
  };

  const updateField = (phaseKey, field, value) => {
    setRound((prev) => ({ ...prev, [phaseKey]: { ...prev[phaseKey], [field]: value } }));
  };
  const updateNested = (phaseKey, parent, field, value) => {
    setRound((prev) => ({ ...prev, [phaseKey]: { ...prev[phaseKey], [parent]: { ...(prev[phaseKey]?.[parent] || {}), [field]: value } } }));
  };
  const updatePhase0Answer = (idx, value) => {
    setRound((prev) => {
      const answers = (prev.phase_0_focus_group?.answers || []).slice();
      while (answers.length <= idx) answers.push('');
      answers[idx] = value;
      return { ...prev, phase_0_focus_group: { ...prev.phase_0_focus_group, answers } };
    });
  };

  const save = async (advance = false) => {
    if (!round?.id) return;
    setSaving(true);
    setNotice('');
    try {
      await v3UpdateBrainstorm(round.id, {
        pre_work: round.pre_work,
        phase_0_focus_group: round.phase_0_focus_group,
        phase_1_problem: round.phase_1_problem,
        phase_2_archetype: round.phase_2_archetype,
        phase_4_interpretation: round.phase_4_interpretation,
        phase_5_execution: round.phase_5_execution,
        phase_6_commercial: round.phase_6_commercial,
        phase_7_recommendation: round.phase_7_recommendation,
        scored_creators: round.scored_creators,
      });
      setNotice('Brainstorming saved.');
      if (advance) navigate(`/v3/admin/business-cases/${id}/plan/creator-scan`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save brainstorm.');
    } finally {
      setSaving(false);
    }
  };

  if (!round) {
    return (
      <FlowShell title="The TTA Snapshot Brainstorm" subtitle="60–90 minute session that produces a defensible creator recommendation rooted in behavior, culture, and commercial logic.">
        {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
        <InfoCard title="Start brainstorm round">
          <p className="text-[13px] text-[#6E6657] mb-3">A new round will scaffold all 7 phases of the TTA Snapshot Brainstorm template. You can save progress between phases.</p>
          <button onClick={startRound} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Start brainstorm round</button>
        </InfoCard>
      </FlowShell>
    );
  }

  const preWork = round.pre_work || {};
  const p0 = round.phase_0_focus_group || {};
  const p1 = round.phase_1_problem || {};
  const p2 = round.phase_2_archetype || {};
  const p5 = round.phase_5_execution || {};
  const p6 = round.phase_6_commercial || {};
  const p7 = round.phase_7_recommendation || {};

  return (
    <FlowShell title="The TTA Snapshot Brainstorm" subtitle="60–90 minute session — defensible creator recommendation rooted in behavior, culture, and commercial logic.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]" data-testid="brainstorm-notice">{notice}</div>}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-[#E8E4DB] -mx-1 px-1 py-2 flex flex-wrap items-center gap-2">
        <button onClick={() => save(false)} disabled={saving} className="v3-btn-secondary" data-testid="brainstorm-save-btn"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}</button>
        <button onClick={() => save(true)} disabled={saving} className="v3-btn-primary" data-testid="brainstorm-save-advance-btn"><ArrowRight className="w-3.5 h-3.5" /> Save & open Creator Scan</button>
      </div>

      <BSPhase phase="pre-work" title="Pre-work (MANDATORY — before session)" subtitle="Team lead must circulate the brief summary, hypothesis and any research before the session.">
        <p className="text-[11px] uppercase tracking-wider text-[#1A1A1A] font-semibold">Client Brief Summary (1 page max)</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BSField label="Objective" rows={2} value={preWork.client_brief_summary?.objective} onChange={(v) => updateNested('pre_work', 'client_brief_summary', 'objective', v)} />
          <BSField label="Target audience" rows={2} value={preWork.client_brief_summary?.target_audience} onChange={(v) => updateNested('pre_work', 'client_brief_summary', 'target_audience', v)} />
          <BSField label="Constraints (budget, timeline)" rows={2} value={preWork.client_brief_summary?.constraints} onChange={(v) => updateNested('pre_work', 'client_brief_summary', 'constraints', v)} />
        </div>
        <BSField label="Initial Hypothesis (optional)" hint='"We believe the problem may be…"' value={preWork.initial_hypothesis} onChange={(v) => updateField('pre_work', 'initial_hypothesis', v)} />
        <p className="text-[11px] uppercase tracking-wider text-[#1A1A1A] font-semibold">Research Inputs</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BSField label="Past campaigns" value={preWork.research_inputs?.past_campaigns} onChange={(v) => updateNested('pre_work', 'research_inputs', 'past_campaigns', v)} />
          <BSField label="Market context" value={preWork.research_inputs?.market_context} onChange={(v) => updateNested('pre_work', 'research_inputs', 'market_context', v)} />
          <BSField label="Focus group insights (if available)" value={preWork.research_inputs?.focus_group_insights} onChange={(v) => updateNested('pre_work', 'research_inputs', 'focus_group_insights', v)} />
        </div>
      </BSPhase>

      <BSPhase phase="0" title="Phase 0 — Focus Group Integration" subtitle="Use only when problem is unclear, audience behavior is ambiguous, or product is new/misunderstood.">
        <p className="text-[12px] text-[#4F3E2F] bg-[#FBF4E4] rounded-md p-3 border border-[#E5C99A]"><strong>Objective:</strong> {'"Why don\'t you already behave this way?"'} — not {'"Do you like this?"'}</p>
        <div className="space-y-2">
          {(p0.core_questions || []).map((q, idx) => (
            <div key={idx} className="rounded border border-[#E8E4DB] p-3">
              <p className="text-[12px] font-semibold text-[#1A1A1A]">{idx + 1}. {q}</p>
              <textarea rows={2} value={(p0.answers || [])[idx] || ''} onChange={(e) => updatePhase0Answer(idx, e.target.value)} placeholder="Capture audience response…" className="mt-2 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[12px] focus:border-[#1F4A3A] outline-none" />
            </div>
          ))}
        </div>
      </BSPhase>

      <BSPhase phase="1" title="Phase 1 — Define the Problem (10–15 mins)" subtitle="Remove ambiguity. Lock the problem before solving it. ALL questions must be answered.">
        <BSField label="What is the core business objective?" value={p1.core_business_objective} onChange={(v) => updateField('phase_1_problem', 'core_business_objective', v)} />
        <BSField label="What specific action must the audience take?" value={p1.specific_action} onChange={(v) => updateField('phase_1_problem', 'specific_action', v)} />
        <BSField label="What is the primary barrier to that action?" value={p1.primary_barrier} onChange={(v) => updateField('phase_1_problem', 'primary_barrier', v)} />
        <BSField label="What type of influence is required?" value={p1.type_of_influence} onChange={(v) => updateField('phase_1_problem', 'type_of_influence', v)} />
        <BSField label="What observable behavior change defines success?" value={p1.observable_behavior_change} onChange={(v) => updateField('phase_1_problem', 'observable_behavior_change', v)} />
        <BSField
          label="🔒 PROJECT TRUTH (mandatory output — max 3 lines)"
          hint="Template: [Target audience] currently [problem/barrier]. To achieve [business goal], they must [specific action]. This requires [type of influence]."
          rows={3}
          value={p1.project_truth}
          onChange={(v) => updateField('phase_1_problem', 'project_truth', v)}
        />
      </BSPhase>

      <BSPhase phase="2" title="Phase 2 — Define Creator Archetype (10 mins)" subtitle="Define the type of mind, not the person.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BSSelect label="Voice Type" options={BS_VOICE_TYPES} value={p2.voice_type} onChange={(v) => updateField('phase_2_archetype', 'voice_type', v)} />
          <BSSelect label="Audience Relationship" options={BS_AUDIENCE_REL} value={p2.audience_relationship} onChange={(v) => updateField('phase_2_archetype', 'audience_relationship', v)} />
          <BSSelect label="Format Strength" options={BS_FORMAT_STRENGTH} value={p2.format_strength} onChange={(v) => updateField('phase_2_archetype', 'format_strength', v)} />
        </div>
        <BSField
          label="🔒 CREATOR ARCHETYPE STATEMENT"
          hint='Template: "We need a [voice type] creator with [audience relationship] who excels in [format], capable of driving [specific action] among [audience]."'
          rows={3}
          value={p2.creator_archetype_statement}
          onChange={(v) => updateField('phase_2_archetype', 'creator_archetype_statement', v)}
        />
      </BSPhase>

      <BSPhase phase="3" title="Phase 3 — Creator Identification & Scoring (20–25 mins)" subtitle="Scoring criteria (1–5): Audience Match, Trust Signals, Conversion Behaviour, Content Fit, Commercial Reliability. Any creator scoring below 3 on Conversion Behaviour = ELIMINATED.">
        <p className="text-[12px] text-[#6E6657] bg-[#FBFAF7] rounded-md p-3 border border-[#E8E4DB]">Scoring happens on the next page (Creator Match Scanner). Each shortlisted creator must be backed by evidence; only 2–3 creators max are carried forward.</p>
      </BSPhase>

      <BSPhase phase="4" title="Phase 4 — Interpretation Logic (15 mins)" subtitle="Explain how each creator thinks, not what they will post.">
        <BSField
          label="🔒 INTERPRETATION SUMMARY (per creator — one paragraph each)"
          hint='Template (per creator): "[Creator] will likely approach this by [angle], emphasising [focus], which aligns with [audience behavior]."'
          rows={5}
          value={(round.phase_4_interpretation || {}).notes || ''}
          onChange={(v) => updateField('phase_4_interpretation', 'notes', v)}
        />
      </BSPhase>

      <BSPhase phase="5" title="Phase 5 — Execution Reality Check (10–15 mins)" subtitle="Pressure-test feasibility.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <BSField label="What level of brand involvement is required?" value={p5.test_questions_answered?.brand_involvement} onChange={(v) => updateNested('phase_5_execution', 'test_questions_answered', 'brand_involvement', v)} />
          <BSField label="What is the execution speed?" value={p5.test_questions_answered?.execution_speed} onChange={(v) => updateNested('phase_5_execution', 'test_questions_answered', 'execution_speed', v)} />
          <BSField label="Is this repeatable or one-off?" value={p5.test_questions_answered?.repeatable_or_one_off} onChange={(v) => updateNested('phase_5_execution', 'test_questions_answered', 'repeatable_or_one_off', v)} />
          <BSField label="What are the top 2 risks?" value={p5.test_questions_answered?.top_risks} onChange={(v) => updateNested('phase_5_execution', 'test_questions_answered', 'top_risks', v)} />
        </div>
        <BSField label="🔒 EXECUTION SNAPSHOT (per option — Effort / Speed / Scale / Key risks)" rows={4} value={p5.snapshot_notes} onChange={(v) => updateField('phase_5_execution', 'snapshot_notes', v)} />
      </BSPhase>

      <BSPhase phase="6" title="Phase 6 — Commercial Snapshot (10 mins)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BSSelect label="Budget Level" options={BS_BUDGET} value={p6.budget_level} onChange={(v) => updateField('phase_6_commercial', 'budget_level', v)} />
          <BSSelect label="Expected Efficiency" options={BS_EFFICIENCY} value={p6.expected_efficiency} onChange={(v) => updateField('phase_6_commercial', 'expected_efficiency', v)} />
          <BSSelect label="Time to impact" options={BS_TIMING} value={p6.time_to_impact} onChange={(v) => updateField('phase_6_commercial', 'time_to_impact', v)} />
        </div>
        <BSField
          label="🔒 COMMERCIAL POSITIONING STATEMENT"
          hint='Template: "This approach requires a [budget level] investment and is expected to deliver [type of return] within [timeframe]."'
          rows={3}
          value={p6.commercial_positioning_statement}
          onChange={(v) => updateField('phase_6_commercial', 'commercial_positioning_statement', v)}
        />
      </BSPhase>

      <BSPhase phase="7" title="Phase 7 — Final Recommendation (5 mins)" subtitle="Make a decision, not just present options.">
        <BSField label="Selected option" hint="e.g., Option A — Creator X" value={p7.selected_option} onChange={(v) => updateField('phase_7_recommendation', 'selected_option', v)} rows={1} />
        <BSField
          label="🔒 RECOMMENDATION RATIONALE"
          hint={'Template:\n"Based on the objective of [goal], Option [X] offers the strongest balance between:\n  • Conversion potential\n  • Execution feasibility\n  • Commercial efficiency\nThis is driven by [key reason]."'}
          rows={6}
          value={p7.rationale}
          onChange={(v) => updateField('phase_7_recommendation', 'rationale', v)}
        />
        <BSField label="Key reason driving this recommendation" value={p7.key_reason} onChange={(v) => updateField('phase_7_recommendation', 'key_reason', v)} rows={1} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <BSField label="Top 3 barriers (one per line)" rows={3} value={(p7.insight_summary?.top_3_barriers || []).join('\n')} onChange={(v) => updateNested('phase_7_recommendation', 'insight_summary', 'top_3_barriers', v.split('\n'))} />
          <BSField label="Key behavioral triggers (one per line)" rows={3} value={(p7.insight_summary?.key_behavioral_triggers || []).join('\n')} onChange={(v) => updateNested('phase_7_recommendation', 'insight_summary', 'key_behavioral_triggers', v.split('\n'))} />
          <BSField label="Language people actually use (one per line)" rows={3} value={(p7.insight_summary?.language_people_use || []).join('\n')} onChange={(v) => updateNested('phase_7_recommendation', 'insight_summary', 'language_people_use', v.split('\n'))} />
        </div>
      </BSPhase>

      <InfoCard title="Strategy mapping">
        <p className="text-[12px] text-[#6E6657] mb-3">After the session, the team does not rethink — they only clean language, format, and complete the Strategy template. Each phase produces a direct input block:</p>
        <div className="overflow-x-auto rounded-lg border border-[#E8E4DB]">
          <table className="min-w-full divide-y divide-[#E8E4DB] text-left text-[12px]">
            <thead className="bg-[#F4F2EC] text-[#6E6657]"><tr><th className="px-3 py-2 font-semibold">Brainstorm Phase</th><th className="px-3 py-2 font-semibold">Strategy Section It Fills</th></tr></thead>
            <tbody className="divide-y divide-[#E8E4DB] bg-white text-[#4F3E2F]">
              {(round.strategy_mapping || []).map((row, idx) => (
                <tr key={idx}><td className="px-3 py-2">{row.brainstorm_phase}</td><td className="px-3 py-2">{row.strategy_section}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanCreatorScan = () => {
  const navigate = useNavigate();
  const { id } = useBusinessCaseBundle();
  const [creators, setCreators] = useState([]);
  const [matches, setMatches] = useState([]);
  const [manualCreatorId, setManualCreatorId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    v3GetCreators({ approved_only: true }).then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      setCreators(list);
      setManualCreatorId(list[0]?.id || '');
    }).catch(() => setCreators([]));
  }, []);
  const creatorById = (creatorId) => creators.find((creator) => creator.id === creatorId);
  const addCreator = (creatorId) => {
    if (!creatorId) return;
    setSelectedIds((current) => (current.includes(creatorId) ? current : [...current, creatorId]));
    setNotice('');
  };
  const removeCreator = (creatorId) => setSelectedIds((current) => current.filter((idValue) => idValue !== creatorId));
  const runScan = async () => {
    setNotice('');
    setScanning(true);
    try {
      const data = await v3SuggestCreatorMatches(id);
      setMatches(Array.isArray(data?.matches) ? data.matches : []);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'AI creator scan could not run yet.');
    } finally {
      setScanning(false);
    }
  };
  const continueToBrief = () => {
    if (selectedIds.length === 0) {
      setNotice('Select at least one creator before generating briefs.');
      return;
    }
    navigate(`/v3/admin/business-cases/${id}/plan/brief?creators=${selectedCreatorQuery(selectedIds)}`);
  };
  const selectedCreators = selectedIds.map(creatorById).filter(Boolean);
  return (
    <FlowShell title="Creator Match Scanner" subtitle="Scan approved creators, manually choose creatives from the database, and prepare more than one creator for briefing." nextAction="Pick one or more creators, then generate editable briefs for each selected creator.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      <InfoCard title="Manual creator picker">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Creator database</span>
            <select value={manualCreatorId} onChange={(e) => setManualCreatorId(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]" data-testid="creator-manual-select">
              {creators.map((creator) => <option key={creator.id} value={creator.id}>{creatorName(creator)} — {creatorSpecialty(creator)}</option>)}
            </select>
          </label>
          <button onClick={() => addCreator(manualCreatorId)} className="v3-btn-primary" data-testid="creator-add-btn"><Plus className="w-3.5 h-3.5" /> Add creator</button>
        </div>
      </InfoCard>
      <InfoCard title="AI database scan" action={<button onClick={runScan} disabled={scanning} className="v3-btn-primary" data-testid="creator-ai-scan-btn"><Sparkles className="w-3.5 h-3.5" /> {scanning ? 'Scanning...' : 'Run AI scan'}</button>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(matches.length ? matches : creators.slice(0, 8).map((creator) => ({ creator, score: creator.fit_score || creator.reliability || 70, reasons: [creatorSpecialty(creator)] }))).map((match) => {
            const creator = match.creator || match;
            const score = match.score || creator.fit_score || creator.fitScore || 70;
            const selected = selectedIds.includes(creator.id);
            return (
              <div key={creator.id} className="rounded-[8px] border border-[#E8E4DB] bg-white p-3" data-testid="creator-match-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[13px] text-[#1A1A1A]">{creatorName(creator)}</p>
                    <p className="text-[12px] text-[#6E6657]">{creatorSpecialty(creator)}</p>
                  </div>
                  <span className="rounded-full bg-[#E8F3ED] px-2 py-1 text-[11px] font-semibold text-[#1F4A3A]">Fit {score}</span>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] text-[#6E6657]">
                  {(match.reasons || [match.reason || 'Strong profile fit for admin review.']).slice(0, 3).map((reason) => <li key={reason}>{reason}</li>)}
                </ul>
                <button onClick={() => addCreator(creator.id)} className="v3-btn-secondary mt-3 text-[11px]" disabled={selected} data-testid={`creator-select-${creator.id}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> {selected ? 'Selected' : 'Select creator'}
                </button>
              </div>
            );
          })}
        </div>
      </InfoCard>
      <InfoCard title="Selected creators" action={<button onClick={continueToBrief} className="v3-btn-primary" data-testid="creator-continue-brief-btn"><FileText className="w-3.5 h-3.5" /> Generate briefs</button>}>
        {selectedCreators.length === 0 ? (
          <p className="text-[13px] text-[#8A8A8A]">No creators selected yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedCreators.map((creator) => (
              <div key={creator.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-3" data-testid="selected-creator">
                <div>
                  <p className="text-[13px] font-semibold text-[#1A1A1A]">{creatorName(creator)}</p>
                  <p className="text-[11px] text-[#6E6657]">{creatorContact(creator) || creatorSpecialty(creator)}</p>
                </div>
                <button onClick={() => removeCreator(creator.id)} className="rounded-md p-1.5 text-[#B54A37] hover:bg-[#FBF1EE]" aria-label={`Remove ${creatorName(creator)}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanBrief = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const [creators, setCreators] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [manualCreatorId, setManualCreatorId] = useState('');
  const [briefs, setBriefs] = useState({});
  const [sentBriefs, setSentBriefs] = useState({});
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const ids = (new URLSearchParams(location.search).get('creators') || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (ids.length) setSelectedIds(ids);
  }, [location.search]);
  useEffect(() => {
    v3GetCreators({ approved_only: true }).then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      setCreators(list);
      setManualCreatorId(list[0]?.id || '');
      setSelectedIds((current) => (current.length ? current : (list[0]?.id ? [list[0].id] : [])));
    }).catch(() => setCreators([]));
    v3ListBriefs({ business_case_id: id }).then((rows) => {
      const next = {};
      (Array.isArray(rows) ? rows : []).forEach((brief) => {
        if (brief.creator_id) next[brief.creator_id] = brief;
      });
      setSentBriefs(next);
    }).catch(() => {});
  }, [id]);
  const creatorById = (creatorId) => creators.find((creator) => creator.id === creatorId);
  const selectedCreators = selectedIds.map(creatorById).filter(Boolean);
  const allBriefsSent = selectedCreators.length > 0 && selectedCreators.every((creator) => sentBriefs[creator.id]);
  const planningFields = bundle?.brainstorm_round?.planning_fields || null;
  useEffect(() => {
    const activeCreators = selectedIds.map((creatorId) => creators.find((creator) => creator.id === creatorId)).filter(Boolean);
    if (!activeCreators.length) return;
    setBriefs((current) => {
      const next = { ...current };
      let changed = false;
      activeCreators.forEach((creator) => {
        if (!next[creator.id]) {
          next[creator.id] = generateCreatorBriefDraft(bundle, creator, planningFields || {});
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [bundle, creators, planningFields, selectedIds]);
  const addCreator = () => {
    if (!manualCreatorId) return;
    setSelectedIds((current) => (current.includes(manualCreatorId) ? current : [...current, manualCreatorId]));
  };
  const generateAll = () => {
    const next = {};
    selectedCreators.forEach((creator) => {
      next[creator.id] = generateCreatorBriefDraft(bundle, creator, planningFields || {});
    });
    setBriefs(next);
    setNotice('AI generated a draft brief for every selected creator.');
  };
  const send = async (creator) => {
    setNotice('');
    const brief = briefs[creator.id] || generateCreatorBriefDraft(bundle, creator, planningFields || {});
    try {
      const doc = await v3CreateBrief({ business_case_id: id, creator_id: creator.id, brief_text: brief, subject: `Creative Brief - ${creatorName(creator)} - ${getCase(bundle).title}` });
      setSentBriefs((current) => ({ ...current, [creator.id]: doc }));
      setNotice(`Creative brief emailed to ${creatorName(creator)}.`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || `Could not email ${creatorName(creator)} yet.`);
    }
  };
  const copyLink = (creator) => {
    const link = creatorBriefLink(id, creator.id);
    if (!navigator.clipboard) {
      setNotice(`Creator brief link: ${link}`);
      return;
    }
    navigator.clipboard.writeText(link).then(() => setNotice(`Creator brief link copied for ${creatorName(creator)}.`)).catch(() => setNotice(`Creator brief link: ${link}`));
  };
  const downloadPdf = (creator) => {
    const title = `Creative Brief - ${creatorName(creator)}`;
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      setNotice('Allow pop-ups to download the creative brief as a PDF.');
      return;
    }
    printWindow.document.write(briefPrintHtml(title, briefs[creator.id] || ''));
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 200);
  };
  const shareWhatsApp = (creator) => {
    const text = `${getCase(bundle).title || 'Creative Brief'}\n${creatorBriefLink(id, creator.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };
  return (
    <FlowShell title="Creative Brief Studio" subtitle="Generate, edit, send, download, and make each selected creator brief visible to the creator." nextAction="Review each AI-generated brief before sending it to creators.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      <InfoCard title="Selected creator briefs" action={<button onClick={generateAll} className="v3-btn-primary" data-testid="brief-generate-all-btn"><Sparkles className="w-3.5 h-3.5" /> Generate AI briefs</button>}>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Add another creator</span>
            <select value={manualCreatorId} onChange={(e) => setManualCreatorId(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]">
              {creators.map((creator) => <option key={creator.id} value={creator.id}>{creatorName(creator)} — {creatorSpecialty(creator)}</option>)}
            </select>
          </label>
          <button onClick={addCreator} className="v3-btn-secondary"><Plus className="w-3.5 h-3.5" /> Add creator</button>
        </div>
        {selectedCreators.length === 0 ? (
          <p className="text-[13px] text-[#8A8A8A]">No creators selected. Go back to Creator Match Scanner and pick one or more creators.</p>
        ) : (
          <div className="space-y-4">
            {selectedCreators.map((creator) => (
              <div key={creator.id} className="rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-4" data-testid="creator-brief-card">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{creatorName(creator)}</p>
                    <p className="text-[12px] text-[#6E6657]">{creatorContact(creator) || creatorSpecialty(creator)}</p>
                    {sentBriefs[creator.id] && <p className="mt-1 text-[11px] font-semibold text-[#1F4A3A]">Brief emailed and saved.</p>}
                  </div>
                  <button onClick={() => setSelectedIds((current) => current.filter((value) => value !== creator.id))} className="rounded-md p-1.5 text-[#B54A37] hover:bg-[#FBF1EE]" aria-label={`Remove ${creatorName(creator)}`}><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <textarea value={briefs[creator.id] || ''} onChange={(e) => setBriefs({ ...briefs, [creator.id]: e.target.value })} rows={14} className="w-full rounded-lg border border-[#E8E4DB] bg-white p-3 text-[13px]" data-testid={`brief-editor-${creator.id}`} />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => send(creator)} className="v3-btn-primary" data-testid={`brief-email-${creator.id}`}><Mail className="w-3.5 h-3.5" /> Email to creator</button>
                  <button onClick={() => copyLink(creator)} className="v3-btn-secondary"><FileText className="w-3.5 h-3.5" /> Copy link</button>
                  <button onClick={() => downloadPdf(creator)} className="v3-btn-secondary"><Download className="w-3.5 h-3.5" /> Download PDF</button>
                  <button onClick={() => shareWhatsApp(creator)} className="v3-btn-secondary"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp share</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>
      <InfoCard title="Next Plan page">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">
            {allBriefsSent ? 'All selected creator briefs have been sent. Open the Strategy Snapshot that will be prepared for the brand.' : 'Send every selected creator brief before opening the Strategy Snapshot page.'}
          </p>
          <button
            onClick={() => navigate(`/v3/admin/business-cases/${id}/plan/strategy-snapshot`)}
            disabled={!allBriefsSent}
            className="v3-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
            data-testid="brief-open-strategy-snapshot-btn"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Open Strategy Snapshot
          </button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanCreatorBriefingCall = () => {
  const { id, bundle } = useBusinessCaseBundle();
  const [meeting, setMeeting] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const creatorId = getCase(bundle).creator_id || bundle?.creator?.id || '';
  const schedule = async () => setMeeting(await v3CreateMeeting({ title: `Creator Briefing Call: ${getCase(bundle).title}`, meeting_type: 'creator_briefing', entity_type: 'creator', stage: 'plan', business_case_id: id, creator_id: creatorId, business_case_title: getCase(bundle).title, entity_name: bundle?.creator?.name || '' }));
  const analyze = async () => { if (!meeting?.id) return; await v3UploadMeetingTranscript(meeting.id, { transcript }); setAnalysis(await v3AnalyzeMeetingTranscript(meeting.id, {})); };
  return (
    <FlowShell title="Creator Briefing Call" subtitle="Plan-phase meeting for fee, availability, deliverables, rights, support, approval process, and willingness." nextAction="Analyze the transcript before accepting, rescheduling, or declining for this project.">
      <InfoCard title="Schedule + questions"><button onClick={schedule} className="v3-btn-primary"><Plus className="w-3.5 h-3.5" /> Schedule Creator Briefing Call</button><ol className="list-decimal pl-5 mt-4 text-[13px]">{(RECOMMENDED_CREATOR_BRIEFING || []).map((q) => <li key={q}>{q}</li>)}</ol></InfoCard>
      <InfoCard title="Transcript and AI decision"><textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={8} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" /><div className="flex flex-wrap gap-2 mt-3"><button onClick={analyze} className="v3-btn-primary"><Sparkles className="w-3.5 h-3.5" /> Analyze</button><button onClick={() => v3AcceptCreatorBriefing(id, { meeting_id: meeting?.id, creator_id: creatorId })} className="v3-btn-secondary">Accept Creator for Strategy Snapshot</button><button onClick={() => v3RescheduleCreatorBriefing(id, { meeting_id: meeting?.id, creator_id: creatorId })} className="v3-btn-secondary">Reschedule Creator Briefing Call</button><button onClick={() => v3DeclineCreatorBriefing(id, { meeting_id: meeting?.id, creator_id: creatorId })} className="v3-btn-secondary text-[#B54A37]">Decline Creator for This Project</button></div>{analysis && <p className="text-[12px] text-[#1F4A3A] mt-3">{analysis.recommendation?.label || analysis.ai_recommendation}</p>}</InfoCard>
    </FlowShell>
  );
};

const RECOMMENDED_CREATOR_BRIEFING = [
  'What is your fee for this project?',
  'What is your availability for the campaign timeline?',
  'What deliverables are realistic?',
  'What content formats would work best?',
  'What usage rights/exclusivity limits do you require?',
  'Do you have any conflict with the brand/category?',
  'What production support do you need?',
  'What approval/revision process do you prefer?',
  'Are you willing to proceed with TASCK on this brief?',
];

const strategyCellText = (value) => {
  if (typeof value === 'number') return formatNairaV3(value);
  if (Array.isArray(value)) return value.map(strategyCellText).join(', ');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${strategyCellText(item)}`)
      .join(' | ');
  }
  return String(value || '');
};

const fallbackStrategySections = (snapshot) => [
  { heading: '1. EXECUTIVE SNAPSHOT', type: 'template', content: snapshot?.concept || 'Strategy concept will appear here after generation.' },
  { heading: '4. CREATOR STRATEGY', type: 'bullets', items: (snapshot?.deliverables || []).map((item) => `${item.title || item.name || 'Deliverable'}: ${item.format || item.deliverable || 'Content'}${item.duration ? ` (${item.duration})` : ''}`) },
  { heading: '6. COMMERCIAL OVERVIEW', type: 'table', rows: (snapshot?.budget || []).map((item) => ({ Category: item.line || item.label || 'Budget item', 'Estimated Cost': strategyCellText(item.amount || item.value || 'TBC') })) },
  { heading: '8. TRACKING PLAN', type: 'kpis', items: snapshot?.success_metrics || [] },
];

const strategySectionsForPreview = (snapshot) => (
  Array.isArray(snapshot?.sections) && snapshot.sections.length ? snapshot.sections : fallbackStrategySections(snapshot)
);

const StrategySectionPreview = ({ section }) => {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const columns = rows.length
    ? (Array.isArray(section.columns) && section.columns.length ? section.columns : Object.keys(rows[0] || {}))
    : [];
  const ListTag = section.type === 'numbered' ? 'ol' : 'ul';
  return (
    <section className="rounded-lg border border-[#E8E4DB] bg-white p-4">
      <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{section.heading}</h4>
      {section.content && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#4F3E2F]">{section.content}</p>}
      {Array.isArray(section.items) && section.items.length > 0 && (
        <ListTag className={`${section.type === 'numbered' ? 'list-decimal' : 'list-disc'} mt-3 space-y-1 pl-5 text-[12px] leading-5 text-[#4F3E2F]`}>
          {section.items.map((item, index) => (
            <li key={`${section.heading}-item-${index}`}>
              {typeof item === 'string' ? item : `${item.kpi || item.label || item.text || item.title || 'Item'}${item.target || item.value || item.reason ? `: ${item.target || item.value || item.reason}` : ''}`}
            </li>
          ))}
        </ListTag>
      )}
      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-[#E8E4DB]">
          <table className="min-w-full divide-y divide-[#E8E4DB] text-left text-[12px]">
            <thead className="bg-[#F4F2EC] text-[#6E6657]">
              <tr>
                {columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DB] bg-white text-[#4F3E2F]">
              {rows.map((row, rowIndex) => (
                <tr key={`${section.heading}-row-${rowIndex}`}>
                  {columns.map((column, columnIndex) => {
                    const cell = Array.isArray(row) ? row[columnIndex] : row[column];
                    return <td key={`${column}-${rowIndex}`} className="px-3 py-2 align-top">{strategyCellText(cell)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

const EditableStrategySection = ({ section, onChange }) => {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const columns = rows.length
    ? (Array.isArray(section.columns) && section.columns.length ? section.columns : Object.keys(rows[0] || {}))
    : [];
  const items = Array.isArray(section.items) ? section.items : [];
  const updateField = (field, value) => onChange({ ...section, [field]: value });
  const updateItem = (idx, value) => {
    const next = items.slice();
    next[idx] = value;
    onChange({ ...section, items: next });
  };
  const removeItem = (idx) => {
    const next = items.slice();
    next.splice(idx, 1);
    onChange({ ...section, items: next });
  };
  const addItem = () => onChange({ ...section, items: [...items, ''] });
  const updateRow = (rowIdx, column, value) => {
    const next = rows.map((row, idx) => (idx === rowIdx ? { ...row, [column]: value } : row));
    onChange({ ...section, rows: next });
  };
  return (
    <section className="rounded-lg border border-[#E8E4DB] bg-white p-4 space-y-3">
      <input
        value={section.heading || ''}
        onChange={(e) => updateField('heading', e.target.value)}
        className="w-full text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A] border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1"
      />
      {section.content !== undefined && (
        <textarea
          value={section.content || ''}
          onChange={(e) => updateField('content', e.target.value)}
          rows={2}
          className="w-full text-[13px] text-[#4F3E2F] border border-[#E8E4DB] rounded-md px-2 py-1.5 focus:border-[#1F4A3A] outline-none"
        />
      )}
      {items.length > 0 || section.type === 'bullets' || section.type === 'numbered' ? (
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div key={`${section.heading}-edit-item-${index}`} className="flex items-start gap-2">
              <span className="text-[11px] text-[#8A8A8A] mt-1.5">{section.type === 'numbered' ? `${index + 1}.` : '•'}</span>
              <textarea
                value={typeof item === 'string' ? item : (item.text || item.title || JSON.stringify(item))}
                onChange={(e) => updateItem(index, e.target.value)}
                rows={1}
                className="flex-1 text-[12px] text-[#4F3E2F] border border-[#E8E4DB] rounded-md px-2 py-1 focus:border-[#1F4A3A] outline-none"
              />
              <button onClick={() => removeItem(index)} className="text-[#B54A37] p-1 hover:bg-[#FCE8E6] rounded" aria-label="Remove item">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button onClick={addItem} className="text-[11px] text-[#1F4A3A] hover:underline inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add bullet
          </button>
        </div>
      ) : null}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-[#E8E4DB]">
          <table className="min-w-full divide-y divide-[#E8E4DB] text-left text-[12px]">
            <thead className="bg-[#F4F2EC] text-[#6E6657]">
              <tr>
                {columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DB] bg-white text-[#4F3E2F]">
              {rows.map((row, rowIndex) => (
                <tr key={`${section.heading}-edit-row-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={`${column}-${rowIndex}`} className="px-2 py-1.5 align-top">
                      <textarea
                        value={strategyCellText(row[column])}
                        onChange={(e) => updateRow(rowIndex, column, e.target.value)}
                        rows={1}
                        className="w-full text-[12px] text-[#4F3E2F] border border-transparent rounded-md px-1.5 py-1 focus:border-[#1F4A3A] outline-none hover:bg-[#FAFAF7]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export const V3BusinessCasePlanStrategySnapshot = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState(false);
  const [editedSections, setEditedSections] = useState([]);
  const [editedTitle, setEditedTitle] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [generating, setGenerating] = useState(false);
  const snapshot = bundle?.creative_snapshot || null;

  const generate = async () => {
    setNotice('');
    setGenerating(true);
    try {
      await v3CreateSnapshot({ business_case_id: id });
      await reload();
      setNotice('Strategy Snapshot generated. Review it before sending to the brand.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not generate Strategy Snapshot yet.');
    }
    setGenerating(false);
  };
  const sendToBrand = async () => {
    setNotice('');
    try {
      await v3SendStrategySnapshotToBrand(id);
      await reload();
      setNotice('Strategy Snapshot sent to the brand for review.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not send Strategy Snapshot yet.');
    }
  };
  const approve = async () => {
    setNotice('');
    try {
      await v3ApproveSnapshot(id, 'admin');
      // Auto-advance to Delivery so admin doesn't need a separate "Waiting for brand approval" page.
      try {
        if (getCase(bundle).stage === 'plan') {
          await v3AdvanceBusinessCase(id, { actor: 'admin', override: true, reason: 'Strategy Snapshot approved by admin.' });
        }
      } catch (_err) { /* ignore — already advanced */ }
      await reload();
      navigate(`/v3/admin/business-cases/${id}/delivery/summary`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not approve Strategy Snapshot yet.');
    }
  };

  const startEditing = () => {
    if (!snapshot) return;
    setEditedTitle(snapshot.title || 'Strategy Snapshot');
    setEditedSections((snapshot.sections || []).map((s) => ({ ...s, items: Array.isArray(s.items) ? s.items.slice() : [], rows: Array.isArray(s.rows) ? s.rows.map((r) => ({ ...r })) : [] })));
    setEditing(true);
    setNotice('');
  };
  const cancelEditing = () => {
    setEditing(false);
    setEditedSections([]);
    setEditedTitle('');
  };
  const saveEdits = async () => {
    if (!snapshot?.id) return;
    setSavingEdit(true);
    setNotice('');
    try {
      await v3UpdateStrategySnapshot(snapshot.id, {
        title: editedTitle,
        sections: editedSections,
        reviewer: 'admin',
      });
      await reload();
      setEditing(false);
      setNotice('Strategy Snapshot saved.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save edits. Please try again.');
    }
    setSavingEdit(false);
  };
  const updateSectionAtIndex = (index, nextSection) => {
    setEditedSections((prev) => prev.map((s, i) => (i === index ? nextSection : s)));
  };

  return (
    <FlowShell title="Strategy Snapshot Studio" subtitle="Generate, view, send to the brand portal/email, and approve before Delivery." nextAction="Review the Strategy Snapshot that will be sent to the brand.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={generate} disabled={generating} className="v3-btn-primary" data-testid="strategy-generate-btn">
          <Sparkles className="w-3.5 h-3.5" /> {generating ? 'Generating…' : (snapshot ? 'Regenerate Strategy Snapshot' : 'Generate Strategy Snapshot')}
        </button>
        {snapshot && !editing && (
          <button onClick={startEditing} className="v3-btn-secondary" data-testid="strategy-edit-btn">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
        )}
        {snapshot && editing && (
          <>
            <button onClick={saveEdits} disabled={savingEdit} className="v3-btn-primary" data-testid="strategy-save-edit-btn">
              <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
            <button onClick={cancelEditing} disabled={savingEdit} className="v3-btn-secondary" data-testid="strategy-cancel-edit-btn">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </>
        )}
        {snapshot && !editing && (
          <button onClick={sendToBrand} className="v3-btn-secondary" data-testid="strategy-send-btn">
            <Send className="w-3.5 h-3.5" /> Send to brand
          </button>
        )}
        {snapshot && !editing && (
          <button onClick={approve} className="v3-btn-secondary" data-testid="strategy-approve-btn">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Snapshot
          </button>
        )}
      </div>
      <InfoCard title="Strategy Snapshot">
        {!snapshot ? (
          <p className="text-[13px] text-[#8A8A8A]">No Strategy Snapshot generated yet.</p>
        ) : editing ? (
          <div className="space-y-4 rounded-[8px] border border-[#1F4A3A]/30 bg-[#FBFAF7] p-4" data-testid="strategy-snapshot-editor">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Editing — changes are not saved until you press Save</p>
              <input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="w-full text-[16px] font-semibold text-[#1A1A1A] mt-1 border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1"
              />
            </div>
            {editedSections.map((section, index) => (
              <EditableStrategySection
                key={`${section.heading || 'strategy-section'}-edit-${index}`}
                section={section}
                onChange={(next) => updateSectionAtIndex(index, next)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4 rounded-[8px] border border-[#E8E4DB] bg-[#FBFAF7] p-4" data-testid="strategy-snapshot-preview">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Status: {snapshot.status || 'draft'}</p>
              <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{snapshot.title || 'Strategy Snapshot'}</h3>
              <p className="mt-1 text-[11px] text-[#8A8A8A]">Template: {snapshot.template_name || 'Copy of Updated Creative Strategy Template_.docx'}</p>
            </div>
            {strategySectionsForPreview(snapshot).map((section, index) => (
              <StrategySectionPreview key={`${section.heading || 'strategy-section'}-${index}`} section={section} />
            ))}
          </div>
        )}
      </InfoCard>
      <InfoCard title="Next Plan page">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">Open the Strategy Review page after the snapshot has been generated, sent, or approved.</p>
          <button onClick={() => navigate(`/v3/admin/business-cases/${id}/plan/waiting-brand`)} className="v3-btn-primary" data-testid="strategy-open-review-btn"><ArrowRight className="w-3.5 h-3.5" /> Open Strategy Review</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanWaitingBrand = () => {
  const navigate = useNavigate();
  const { id, bundle, loading } = useBusinessCaseBundle();
  useEffect(() => {
    if (!loading && bundle) {
      navigate(`/v3/admin/business-cases/${id}/plan/strategy-snapshot`, { replace: true });
    }
  }, [bundle, id, loading, navigate]);
  return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Redirecting to Strategy Snapshot Studio…</div>;
};

export const V3BusinessCaseDeliverySummary = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const creator = bundle?.creator || {};
  const snapshot = bundle?.creative_snapshot || {};
  const alignment = bundle?.alignment_snapshot || {};
  const conceptBlock = snapshot.concept || alignment.concept || '—';
  const executiveRows = (() => {
    const exec = (snapshot.sections || []).find((s) => /executive/i.test(s.heading || ''));
    return Array.isArray(exec?.rows) ? exec.rows : [];
  })();
  return (
    <FlowShell title="Delivery Summary" subtitle="Full project context before contract generation." nextAction="Open contract page to generate brand and creator agreements.">
      <InfoCard title="Project at a glance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Title</span>{bc.title}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Total value</span>{formatNairaV3(bc.estimated_value || 0)}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Engagement track</span>{bc.engagement_track || '—'}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Stage</span>{bc.stage}</div>
        </div>
      </InfoCard>
      <InfoCard title="Brand details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Company</span>{brand.company || brand.name || '—'}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Primary contact</span>{contact.primary_contact || brand.primary_contact || '—'}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Email</span>{contact.email || brand.email || '—'}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Phone</span>{contact.phone || brand.phone || '—'}</div>
          <div className="md:col-span-2"><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Website</span>{contact.website || brand.website || '—'}</div>
        </div>
      </InfoCard>
      <InfoCard title="Creator details">
        {creator?.id ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Name</span>{creator.name}</div>
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Email</span>{creator.email || '—'}</div>
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Phone</span>{creator.phone || '—'}</div>
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Platforms</span>{(creator.platforms || []).join(', ') || '—'}</div>
            <div className="md:col-span-2"><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Niche / Content type</span>{creator.niche || creator.content_type || '—'}</div>
          </div>
        ) : (
          <p className="text-[13px] text-[#8A8A8A]">No primary creator linked to this Business Case yet.</p>
        )}
      </InfoCard>
      <InfoCard title="Brainstorming ideas & strategy concept">
        <p className="text-[13px] text-[#4F3E2F] whitespace-pre-wrap mb-3"><strong>Concept:</strong> {conceptBlock}</p>
        {executiveRows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[#E8E4DB]">
            <table className="min-w-full divide-y divide-[#E8E4DB] text-left text-[12px]">
              <thead className="bg-[#F4F2EC] text-[#6E6657]"><tr><th className="px-3 py-2 font-semibold">Field</th><th className="px-3 py-2 font-semibold">Detail</th></tr></thead>
              <tbody className="divide-y divide-[#E8E4DB] bg-white text-[#4F3E2F]">
                {executiveRows.map((row, idx) => (
                  <tr key={`exec-${idx}`}><td className="px-3 py-2 align-top">{row.Field}</td><td className="px-3 py-2 align-top">{strategyCellText(row.Detail)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InfoCard>
      <InfoCard title="Next">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">Open the contract page to generate brand and creator agreements from approved templates.</p>
          <button onClick={() => navigate(`/v3/admin/business-cases/${id}/delivery/contracts`)} className="v3-btn-primary" data-testid="delivery-open-contract-btn"><FileSignature className="w-3.5 h-3.5" /> Open contract page</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

const buildFeedbackPreviewSections = (fb) => {
  if (!fb) return [];
  const sections = [];
  if (fb.email_template) sections.push({ heading: 'Tab 1 — Email Template', content: fb.email_template });
  [['brand_partner', 'Brand Partner Feedback'], ['creative_partner', 'Creative Partner Feedback']].forEach(([key, fallback]) => {
    const block = fb[key];
    if (!block) return;
    sections.push({ heading: block.form_title || fallback, content: block.form_description || '' });
    const header = [`Project name: ${block.project_name || '—'}`, `Date: ${block.date || '—'}`];
    if (block.google_form_link !== undefined) header.push(`Google form link: ${block.google_form_link || '—'}`);
    sections.push({ content: header.join('\n') });
    (block.questions || []).forEach((q, idx) => {
      sections.push({ heading: `${idx + 1}. ${q.label}`, content: `${q.question}\nRating: ${q.rating ?? '—'} / 10` });
    });
    sections.push({ content: `Optional comment: ${block.optional_comment || '—'}` });
  });
  if ((fb.internal_use || []).length) sections.push({ heading: 'Internal Use (Not Shown to Client)', content: fb.internal_use.map((l) => `• ${l}`).join('\n') });
  return sections;
};

const PreviewModal = ({ open, onClose, title, pdfUrl, sections, testId }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose} data-testid={testId || 'preview-modal'}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl h-[88vh] rounded-xl bg-white overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-[#E8E4DB] bg-[#FBFAF7] shrink-0">
          <p className="text-[14px] font-semibold text-[#1A1A1A] truncate" style={{ fontFamily: "'Fraunces', serif" }}>{title}</p>
          <div className="flex items-center gap-2 shrink-0">
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="v3-btn-secondary text-[11px]" data-testid="preview-download-pdf"><Download className="w-3.5 h-3.5" /> Download PDF</a>
            )}
            <button onClick={onClose} className="v3-btn-secondary text-[11px]" data-testid="preview-close-btn"><X className="w-3.5 h-3.5" /> Close</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-8 bg-[#FBFAF7]">
          <div className="max-w-3xl mx-auto bg-white rounded-lg border border-[#E8E4DB] shadow-sm px-10 py-10 space-y-6">
            <h2 className="text-[22px] font-semibold text-[#1F4A3A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h2>
            {(sections || []).length === 0 ? (
              <p className="text-[13px] text-[#8A8A8A]">No content to preview yet.</p>
            ) : (
              (sections || []).map((section, idx) => (
                <div key={idx} className="pb-5 border-b last:border-b-0 last:pb-0 border-[#F4F2EC]">
                  {section.heading && <p className="text-[12px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">{section.heading}</p>}
                  {section.content && <p className="text-[13px] text-[#4F3E2F] whitespace-pre-wrap leading-relaxed">{section.content}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SHARE_OPTIONS = (label, brandEmail, creatorEmail, includeCreator = false) => [
  { key: 'email_brand', icon: Mail, label: brandEmail ? `Email to brand (${brandEmail})` : 'Email to brand' },
  ...(includeCreator ? [{ key: 'email_creator', icon: Mail, label: creatorEmail ? `Email to creator (${creatorEmail})` : 'Email to creator' }] : []),
  { key: 'copy_link', icon: FileText, label: `Copy ${label} link` },
  { key: 'download_pdf', icon: Download, label: `Download ${label} as PDF` },
  { key: 'whatsapp', icon: MessageSquare, label: 'Share via WhatsApp' },
];

const ShareMenu = ({ open, onClose, options, onSelect }) => {
  if (!open) return null;
  return (
    <div className="absolute right-0 mt-2 w-80 rounded-lg border border-[#E8E4DB] bg-white shadow-xl z-30" onClick={(e) => e.stopPropagation()}>
      <div className="p-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          return (
            <button key={opt.key} onClick={() => { onSelect(opt); onClose(); }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#1A1A1A] hover:bg-[#F7FAF8] rounded-md text-left">
              <Icon className="w-3.5 h-3.5 text-[#1F4A3A]" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ContractCard = ({ contract, brandEmail, creatorEmail, onUpdate, onSign, onShare, onRefresh }) => {
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(contract.title || '');
  const [draftSections, setDraftSections] = useState(contract.sections || []);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const startEdit = () => {
    setDraftTitle(contract.title || '');
    setDraftSections((contract.sections || []).map((s) => ({ ...s })));
    setEditing(true);
  };
  const cancel = () => { setEditing(false); };
  const save = async () => {
    setSaving(true);
    await onUpdate(contract.id, { title: draftTitle, sections: draftSections });
    setSaving(false);
    setEditing(false);
  };
  const openPreview = async () => {
    // Legacy contracts may have empty sections — hit the PDF endpoint which backfills the doc, then refresh the list.
    if (!(contract.sections && contract.sections.length) && onRefresh) {
      try { await fetch(v3ContractPdfUrl(contract.id), { method: 'GET' }); } catch (_e) { /* backfill best-effort */ }
      await onRefresh();
    }
    setPreviewOpen(true);
  };
  const isCreator = contract.template === 'creator_principal';
  return (
    <div className="rounded-lg border border-[#E8E4DB] bg-white p-4 mb-3" data-testid={`contract-card-${contract.id}`}>
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} title={contract.title || 'Contract preview'} pdfUrl={v3ContractPdfUrl(contract.id)} sections={contract.sections} testId={`contract-preview-${contract.id}`} />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="w-full text-[14px] font-semibold text-[#1A1A1A] border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1" />
          ) : (
            <p className="text-[14px] font-semibold text-[#1A1A1A]">{contract.title || contract.template}</p>
          )}
          <p className="text-[11px] text-[#8A8A8A] mt-1">Status: {contract.status} · Template: {contract.template}{contract.signed_at ? ` · Signed at ${contract.signed_at}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {editing ? (
            <>
              <button onClick={save} disabled={saving} className="v3-btn-primary text-[11px]"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}</button>
              <button onClick={cancel} disabled={saving} className="v3-btn-secondary text-[11px]"><X className="w-3.5 h-3.5" /> Cancel</button>
            </>
          ) : (
            <>
              <button onClick={openPreview} className="v3-btn-secondary text-[11px]" data-testid={`contract-${contract.id}-preview-btn`}><Eye className="w-3.5 h-3.5" /> Preview</button>
              <button onClick={startEdit} className="v3-btn-secondary text-[11px]" data-testid={`contract-${contract.id}-edit-btn`}><Edit3 className="w-3.5 h-3.5" /> Edit</button>
              <div className="relative">
                <button onClick={() => setShareOpen((v) => !v)} className="v3-btn-secondary text-[11px]" data-testid={`contract-${contract.id}-share-btn`}><Send className="w-3.5 h-3.5" /> Share</button>
                <ShareMenu
                  open={shareOpen}
                  onClose={() => setShareOpen(false)}
                  options={SHARE_OPTIONS('contract', brandEmail, creatorEmail, isCreator)}
                  onSelect={(opt) => onShare(contract, opt)}
                />
              </div>
              <button onClick={() => onSign(contract)} className="v3-btn-primary text-[11px]"><CheckCircle2 className="w-3.5 h-3.5" /> Mark signed</button>
            </>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {(editing ? draftSections : (contract.sections || [])).map((section, idx) => (
          editing ? (
            <div key={`edit-${idx}`} className="rounded border border-[#E8E4DB] p-3 bg-[#FBFAF7]">
              <input value={section.heading || ''} onChange={(e) => { const next = draftSections.slice(); next[idx] = { ...next[idx], heading: e.target.value }; setDraftSections(next); }} className="w-full text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1 mb-2" />
              <textarea value={section.content || ''} onChange={(e) => { const next = draftSections.slice(); next[idx] = { ...next[idx], content: e.target.value }; setDraftSections(next); }} rows={Math.min(10, Math.max(3, String(section.content || '').split('\n').length))} className="w-full text-[12px] text-[#4F3E2F] border border-[#E8E4DB] rounded-md px-2 py-1.5 focus:border-[#1F4A3A] outline-none whitespace-pre-wrap" />
            </div>
          ) : (
            <div key={`view-${idx}`}>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-1">{section.heading}</p>
              <p className="text-[12px] text-[#4F3E2F] whitespace-pre-wrap">{section.content}</p>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export const V3BusinessCaseContractStudio = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const [contracts, setContracts] = useState([]);
  const [notice, setNotice] = useState('');
  const value = getCase(bundle).estimated_value || 0;
  const brand = getBrand(bundle);
  const brandEmail = bundle?.brand_contact_snapshot?.email || brand?.email || '';
  const creatorEmail = bundle?.creator?.email || '';
  const refreshContracts = async () => {
    const rows = await v3ListContracts(id);
    setContracts(Array.isArray(rows) ? rows : []);
  };
  useEffect(() => { v3ListContracts(id).then((rows) => setContracts(Array.isArray(rows) ? rows : [])); }, [id]);

  const hasTemplate = (tpl) => contracts.some((c) => c.template === tpl);
  const create = async (template) => {
    setNotice('');
    try {
      const parties = template === 'brand_msa'
        ? ['TASCK', brand.company || brand.name || 'Brand']
        : ['TASCK', bundle?.creator?.name || 'Creator'];
      const doc = await v3CreateContract({ business_case_id: id, template, value, parties });
      setContracts([doc, ...contracts.filter((c) => c.template !== template)]);
      setNotice(`${template === 'brand_msa' ? 'Brand Service Agreement' : 'Creator Agreement'} generated from template. Edit if needed before sending.`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not generate contract yet.');
    }
  };
  const updateContract = async (cid, payload) => {
    try {
      const doc = await v3UpdateContract(cid, payload);
      setContracts((prev) => prev.map((c) => (c.id === cid ? doc : c)));
      setNotice('Contract draft saved.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save contract.');
    }
  };
  const handleShare = async (contract, option) => {
    if (option.key === 'copy_link') {
      const link = `${window.location.origin}/v3/admin/business-cases/${id}/delivery/contracts#${contract.id}`;
      navigator.clipboard?.writeText(link);
      setNotice('Contract link copied to clipboard.');
      return;
    }
    if (option.key === 'download_pdf') {
      window.open(v3ContractPdfUrl(contract.id), '_blank');
      setNotice('Contract PDF opened in a new tab.');
      return;
    }
    if (option.key === 'whatsapp') {
      const text = encodeURIComponent(`Contract ready for review: ${contract.title}\n${window.location.origin}/v3/admin/business-cases/${id}/delivery/contracts`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      return;
    }
    if (option.key === 'email_brand' || option.key === 'email_creator') {
      const isCreator = option.key === 'email_creator';
      const defaultTo = isCreator ? creatorEmail : brandEmail;
      const recipientName = isCreator ? (bundle?.creator?.name || '') : (brand?.company || brand?.name || '');
      const toEmail = window.prompt(`Send contract via email to ${isCreator ? 'creator' : 'brand'}:`, defaultTo || '');
      if (!toEmail) return;
      setNotice(`Sending contract to ${toEmail}…`);
      try {
        await v3SendContractEmail(contract.id, { to_email: toEmail, recipient_name: recipientName });
        await refreshContracts();
        setNotice(`Contract emailed to ${toEmail}.`);
      } catch (e) {
        setNotice(e?.response?.data?.detail || e?.message || 'Could not send the email.');
      }
      return;
    }
  };
  const handleSign = async (contract) => {
    try {
      await v3SignContract(contract.id);
      const rows = await v3ListContracts(id);
      setContracts(Array.isArray(rows) ? rows : []);
      setNotice('Contract marked signed.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not mark contract signed.');
    }
  };

  return (
    <FlowShell title="Contract Page" subtitle="Generate, edit, and share brand & creator contracts before deliverables begin.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]" data-testid="contract-notice">{notice}</div>}
      <InfoCard title="Generate contracts from templates">
        <p className="text-[12px] text-[#6E6657] mb-3">Each contract is pre-filled from the approved template. You can edit any clause before sending or downloading.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => create('brand_msa')} className="v3-btn-primary" data-testid="generate-brand-contract-btn"><FileSignature className="w-3.5 h-3.5" /> {hasTemplate('brand_msa') ? 'Regenerate Brand (Service) Contract' : 'Generate Brand (Service) Contract'}</button>
          <button onClick={() => create('creator_principal')} className="v3-btn-secondary" data-testid="generate-creator-contract-btn"><FileSignature className="w-3.5 h-3.5" /> {hasTemplate('creator_principal') ? 'Regenerate Creator Contract' : 'Generate Creator Contract'}</button>
        </div>
      </InfoCard>
      {contracts.length === 0 ? (
        <InfoCard title="Contracts"><p className="text-[13px] text-[#8A8A8A]">No contracts drafted yet. Use the buttons above to generate brand and creator contracts.</p></InfoCard>
      ) : (
        <InfoCard title={`Drafted contracts (${contracts.length})`}>
          {contracts.map((c) => (
            <ContractCard
              key={c.id}
              contract={c}
              brandEmail={brandEmail}
              creatorEmail={creatorEmail}
              onUpdate={updateContract}
              onSign={handleSign}
              onShare={handleShare}
              onRefresh={refreshContracts}
            />
          ))}
        </InfoCard>
      )}
      <InfoCard title="Next delivery page">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">Open Deliverables once contracts have been sent.</p>
          <button onClick={() => navigate(`/v3/admin/business-cases/${id}/delivery/deliverables`)} className="v3-btn-primary" data-testid="contracts-open-deliverables-btn"><ArrowRight className="w-3.5 h-3.5" /> Open Deliverables</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseDeliveryWaitingSignatures = () => <FlowShell title="Waiting for Contract Approval / Signatures" subtitle="Track brand and creator contract statuses, comments, reminders, and resend loops."><InfoCard title="Signature tracker"><p className="text-[13px] text-[#6E6657]">Use Contract Studio to generate, download, send, and mark signed drafts. Reminder emails can be queued from the contract list.</p></InfoCard></FlowShell>;

export const V3BusinessCaseDeliverables = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');
  useEffect(() => { v3ListDeliverables(id).then((data) => setRows(Array.isArray(data) ? data : [])); }, [id]);
  const add = async () => {
    if (!title.trim()) { setNotice('Add a deliverable title first.'); return; }
    setNotice('');
    const row = await v3AddDeliverable({ business_case_id: id, title, notes });
    setRows([row, ...rows]);
    setTitle('');
    setNotes('');
  };
  const openReporting = async () => {
    setNotice('');
    try {
      if (getCase(bundle).stage === 'deliver') {
        await v3AdvanceBusinessCase(id, { actor: 'admin', override: true, reason: 'Delivery phase marked done by admin.' });
        await reload();
      }
      navigate(`/v3/admin/business-cases/${id}/reporting/final-report`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not move to Reporting yet.');
    }
  };
  return (
    <FlowShell title="Deliverables" subtitle="Add, edit, assign, status, link, and send multiple deliverables to portals/emails.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      <InfoCard title="Add deliverable">
        <div className="space-y-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Deliverable title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" placeholder="e.g., Hero anchor video" data-testid="deliverable-title-input" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Deliverable notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" placeholder="Describe scope, format, duration, owner, due date, channels, references, success markers…" data-testid="deliverable-notes-input" />
          </label>
          <div className="flex justify-end">
            <button onClick={add} className="v3-btn-primary" data-testid="deliverable-add-btn"><PackageCheck className="w-3.5 h-3.5" /> Add deliverable</button>
          </div>
        </div>
      </InfoCard>
      <InfoCard title={`Deliverables (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-[13px] text-[#8A8A8A]">No deliverables added yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="rounded-lg border border-[#E8E4DB] p-3" data-testid={`deliverable-row-${row.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{row.title}</p>
                    {row.notes && <p className="mt-1 text-[12px] text-[#6E6657] whitespace-pre-wrap">{row.notes}</p>}
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#6E6657] uppercase tracking-wider">{row.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>
      <InfoCard title="Move to Reporting">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">When delivery is complete, open Reporting to generate the final report and feedback for brand and creator review.</p>
          <button onClick={openReporting} className="v3-btn-primary" data-testid="delivery-open-reporting-btn"><FileText className="w-3.5 h-3.5" /> Move to Reporting Phase</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

const FeedbackQuestion = ({ q, idx, editing, onChange }) => (
  <div className="rounded-lg border border-[#E8E4DB] bg-white p-4 space-y-2" data-testid={`feedback-q-${q.key}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-[#1A1A1A]">{idx + 1}. {q.label}</p>
        <p className="text-[11px] text-[#6E6657] mt-1">{q.question}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <input
              type="number"
              min={1}
              max={10}
              value={q.rating ?? ''}
              onChange={(e) => onChange(idx, 'rating', e.target.value ? Number(e.target.value) : null)}
              className="w-20 text-right rounded border border-[#E8E4DB] px-2 py-1 text-[12px]"
            />
            <span className="text-[11px] text-[#8A8A8A]">/ 10</span>
          </>
        ) : (
          <span className="text-[14px] font-semibold text-[#1F4A3A] bg-[#DDF0E1] border border-[#A4D4B0] rounded-full px-3 py-0.5">{q.rating ?? '—'}/10</span>
        )}
      </div>
    </div>
  </div>
);

const FeedbackFormBlock = ({ title, description, project, date, link, comment, questions, editing, onUpdateField, onUpdateQuestion, average, accent }) => (
  <div className={`rounded-xl border ${accent || 'border-[#E8E4DB]'} bg-white shadow-sm`}>
    <div className="px-6 py-4 border-b border-[#E8E4DB] bg-[#FBFAF7] rounded-t-xl">
      <p className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{title}</p>
      <p className="text-[11px] text-[#6E6657] mt-1">{description}</p>
    </div>
    <div className="px-6 py-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Project name</span>
          {editing ? (
            <input value={project || ''} onChange={(e) => onUpdateField('project_name', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-1.5 text-[12px]" />
          ) : <p className="mt-1 text-[12px] text-[#1A1A1A]">{project || '—'}</p>}
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Date</span>
          {editing ? (
            <input type="date" value={date || ''} onChange={(e) => onUpdateField('date', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-1.5 text-[12px]" />
          ) : <p className="mt-1 text-[12px] text-[#1A1A1A]">{date || '—'}</p>}
        </label>
        {link !== undefined && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Google form link</span>
            {editing ? (
              <input value={link || ''} placeholder="https://forms.gle/…" onChange={(e) => onUpdateField('google_form_link', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-1.5 text-[12px]" />
            ) : <p className="mt-1 text-[12px] text-[#1A1A1A] truncate">{link || '—'}</p>}
          </label>
        )}
      </div>
      <p className="text-[11px] text-[#6E6657]">Please rate the following based on your experience working with TTA.</p>
      <div className="space-y-2.5">
        {(questions || []).map((q, idx) => (
          <FeedbackQuestion key={q.key} q={q} idx={idx} editing={editing} onChange={(i, field, v) => onUpdateQuestion(i, field, v)} />
        ))}
      </div>
      <label className="block">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Optional comment (one line)</span>
        {editing ? (
          <input value={comment || ''} onChange={(e) => onUpdateField('optional_comment', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-2 text-[12px]" placeholder="Anything else to share?" />
        ) : <p className="mt-1 text-[12px] text-[#4F3E2F]">{comment || <span className="text-[#8A8A8A]">No comment.</span>}</p>}
      </label>
      {average != null && <p className="text-[12px] text-[#1F4A3A] font-semibold">Average score: {average}/10</p>}
    </div>
  </div>
);

export const V3BusinessCaseFinalReport = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const report = bundle?.final_report;
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const brandEmail = bundle?.brand_contact_snapshot?.email || brand?.email || '';
  const creatorEmail = bundle?.creator?.email || '';
  const [notice, setNotice] = useState('');
  const [editingReport, setEditingReport] = useState(false);
  const [draftReportTitle, setDraftReportTitle] = useState('');
  const [draftReportSections, setDraftReportSections] = useState([]);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState(null);
  const [shareReportOpen, setShareReportOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [previewType, setPreviewType] = useState(null); // 'report' | 'feedback' | null
  const [shareFeedbackBrandOpen, setShareFeedbackBrandOpen] = useState(false);
  const [shareFeedbackCreatorOpen, setShareFeedbackCreatorOpen] = useState(false);

  const reportSent = Boolean(report?.report_sent_at);
  const feedbackSent = Boolean(report?.feedback_sent_at);
  const canClose = Boolean(report) && reportSent && feedbackSent && bc.stage !== 'closed';

  const computeAverage = (questions) => {
    const ratings = (questions || []).map((q) => Number(q.rating)).filter((n) => Number.isFinite(n));
    if (!ratings.length) return null;
    return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  };

  const generate = async () => {
    setNotice('');
    try {
      await v3GenerateFinalReport(id, {});
      await reload();
      setNotice('Final report and feedback templates generated. Edit before sending to the brand.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not generate final report.');
    }
  };

  const startEditReport = () => {
    setDraftReportTitle(report?.title || '');
    setDraftReportSections((report?.sections || []).map((s) => ({ ...s })));
    setEditingReport(true);
  };
  const saveReport = async () => {
    if (!report?.id) return;
    try {
      await v3UpdateFinalReport(report.id, { title: draftReportTitle, sections: draftReportSections });
      await reload();
      setEditingReport(false);
      setNotice('Final report saved.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save report.');
    }
  };

  const startEditFeedback = () => {
    setDraftFeedback(JSON.parse(JSON.stringify(report?.feedback || {})));
    setEditingFeedback(true);
  };
  const saveFeedback = async () => {
    if (!report?.id || !draftFeedback) return;
    const brandAvg = computeAverage(draftFeedback?.brand_partner?.questions);
    const creativeAvg = computeAverage(draftFeedback?.creative_partner?.questions);
    try {
      await v3UpdateFinalReport(report.id, { feedback: { ...draftFeedback, brand_average_score: brandAvg, creative_average_score: creativeAvg } });
      await reload();
      setEditingFeedback(false);
      setNotice('Feedback saved.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save feedback.');
    }
  };

  const updateFeedbackField = (group, field, value) => {
    setDraftFeedback((prev) => ({ ...prev, [group]: { ...prev[group], [field]: value } }));
  };
  const updateFeedbackQuestion = (group, idx, field, value) => {
    setDraftFeedback((prev) => {
      const questions = prev[group].questions.slice();
      questions[idx] = { ...questions[idx], [field]: value };
      return { ...prev, [group]: { ...prev[group], questions } };
    });
  };

  const handleShare = async (which, option) => {
    const isReport = which === 'report';
    if (option.key === 'copy_link') {
      navigator.clipboard?.writeText(`${window.location.origin}/v3/admin/business-cases/${id}/reporting/final-report#${which}`);
      setNotice(`${isReport ? 'Report' : 'Feedback'} link copied to clipboard.`);
    } else if (option.key === 'download_pdf') {
      const url = isReport ? v3FinalReportPdfUrl(report.id) : v3FeedbackPdfUrl(report.id);
      window.open(url, '_blank');
      setNotice(`${isReport ? 'Report' : 'Feedback'} PDF opened in a new tab.`);
    } else if (option.key === 'whatsapp') {
      const text = encodeURIComponent(`${isReport ? 'Final Report' : 'Feedback'} ready: ${report?.title || ''}\n${window.location.origin}/v3/admin/business-cases/${id}/reporting/final-report`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    } else if (option.key === 'email_brand' || option.key === 'email_creator') {
      const isCreatorRecipient = option.key === 'email_creator';
      const defaultTo = isCreatorRecipient ? creatorEmail : brandEmail;
      const recipientName = isCreatorRecipient ? (bundle?.creator?.name || '') : (brand?.company || brand?.name || '');
      const toEmail = window.prompt(`Send ${isReport ? 'report' : 'feedback'} via email to ${isCreatorRecipient ? 'creator' : 'brand'}:`, defaultTo || '');
      if (!toEmail) return;
      setNotice(`Sending ${isReport ? 'report' : 'feedback'} to ${toEmail}…`);
      try {
        if (isReport) {
          await v3SendFinalReportEmail(report.id, { to_email: toEmail, recipient_name: recipientName });
        } else {
          await v3SendFeedbackEmail(report.id, { to_email: toEmail, recipient_name: recipientName });
        }
        await reload();
        setNotice(`${isReport ? 'Report' : 'Feedback'} emailed to ${toEmail}.`);
      } catch (e) {
        setNotice(e?.response?.data?.detail || e?.message || 'Could not send the email.');
      }
      return; // mark-sent already done by backend
    } else {
      setNotice(`${option.label} — queued.`);
    }
    // Mark sent on any email_brand/email_creator/copy_link/download/whatsapp action
    try {
      if (isReport && !reportSent) {
        await v3MarkReportSent(report.id);
      }
      if (!isReport && !feedbackSent) {
        await v3MarkFeedbackSent(report.id);
      }
      await reload();
    } catch (_err) { /* swallow */ }
  };

  const closeProject = async () => {
    if (!canClose) return;
    if (!window.confirm('Close this Business Case? This cannot be undone.')) return;
    setClosing(true);
    try {
      await v3CloseBusinessCase(id);
      await reload();
      setNotice('Project closed. The Business Case is now in the Closed stage.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not close the project.');
    }
    setClosing(false);
  };

  const feedback = report?.feedback;

  return (
    <FlowShell title="Final Report Studio" subtitle="Generate, edit and share the final report and feedback. Close the project once both have been sent.">
      <PreviewModal open={previewType === 'report'} onClose={() => setPreviewType(null)} title={report?.title || 'Final Report preview'} pdfUrl={report ? v3FinalReportPdfUrl(report.id) : ''} sections={report?.sections} testId="final-report-preview" />
      <PreviewModal open={previewType === 'feedback'} onClose={() => setPreviewType(null)} title="Feedback preview" pdfUrl={report ? v3FeedbackPdfUrl(report.id) : ''} sections={buildFeedbackPreviewSections(report?.feedback)} testId="feedback-preview" />
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]" data-testid="final-report-notice">{notice}</div>}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={generate} className="v3-btn-primary" data-testid="generate-final-report-btn"><Sparkles className="w-3.5 h-3.5" /> {report ? 'Regenerate' : 'Generate'} Final Report & Feedback</button>
        <div className="flex flex-wrap items-center gap-1 ml-auto text-[11px]">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${reportSent ? 'bg-[#DDF0E1] border-[#A4D4B0] text-[#1F6B3A]' : 'bg-[#FBF4E4] border-[#E5C99A] text-[#7A5A1E]'}`}><CheckCircle2 className="w-3.5 h-3.5" /> Report {reportSent ? 'sent' : 'not sent'}</span>
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${feedbackSent ? 'bg-[#DDF0E1] border-[#A4D4B0] text-[#1F6B3A]' : 'bg-[#FBF4E4] border-[#E5C99A] text-[#7A5A1E]'}`}><CheckCircle2 className="w-3.5 h-3.5" /> Feedback {feedbackSent ? 'sent' : 'not sent'}</span>
          {bc.stage === 'closed' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1F4A3A] text-white"><CheckCircle2 className="w-3.5 h-3.5" /> Project closed</span>}
        </div>
      </div>

      {!report ? (
        <InfoCard title="Final Report"><p className="text-[13px] text-[#8A8A8A]">No report generated yet. Click the Generate button above.</p></InfoCard>
      ) : (
        <>
          {/* ------ Final Report card with breathing room ------ */}
          <div className="rounded-xl border border-[#E8E4DB] bg-white shadow-sm">
            <div className="px-6 py-5 border-b border-[#E8E4DB] flex flex-wrap items-center justify-between gap-3 bg-[#FBFAF7] rounded-t-xl">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Final Report</p>
                {editingReport ? (
                  <input value={draftReportTitle} onChange={(e) => setDraftReportTitle(e.target.value)} className="w-full text-[18px] font-semibold text-[#1A1A1A] border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1 mt-1" />
                ) : (
                  <h3 className="text-[18px] font-semibold text-[#1A1A1A] mt-0.5" style={{ fontFamily: "'Fraunces', serif" }}>{report.title}</h3>
                )}
                <p className="text-[11px] text-[#8A8A8A] mt-1">Status: {report.status} · Generated {report.generated_at?.slice(0, 19)?.replace('T', ' ')}{reportSent ? ` · Sent ${report.report_sent_at?.slice(0, 19)?.replace('T', ' ')}` : ''}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {editingReport ? (
                  <>
                    <button onClick={saveReport} className="v3-btn-primary text-[11px]"><Save className="w-3.5 h-3.5" /> Save</button>
                    <button onClick={() => setEditingReport(false)} className="v3-btn-secondary text-[11px]"><X className="w-3.5 h-3.5" /> Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={startEditReport} className="v3-btn-secondary text-[11px]" data-testid="report-edit-btn"><Edit3 className="w-3.5 h-3.5" /> Edit Report</button>
                    <button onClick={() => setPreviewType('report')} className="v3-btn-secondary text-[11px]" data-testid="report-preview-btn"><Eye className="w-3.5 h-3.5" /> Preview</button>
                    <div className="relative">
                      <button onClick={() => setShareReportOpen((v) => !v)} className="v3-btn-primary text-[11px]" data-testid="report-share-btn"><Send className="w-3.5 h-3.5" /> Send Report</button>
                      <ShareMenu open={shareReportOpen} onClose={() => setShareReportOpen(false)} options={SHARE_OPTIONS('report', brandEmail, '', false)} onSelect={(opt) => handleShare('report', opt)} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {(editingReport ? draftReportSections : (report.sections || [])).map((section, idx) => (
                editingReport ? (
                  <div key={`rep-edit-${idx}`} className="space-y-2">
                    <input value={section.heading || ''} onChange={(e) => { const next = draftReportSections.slice(); next[idx] = { ...next[idx], heading: e.target.value }; setDraftReportSections(next); }} className="w-full text-[12px] uppercase tracking-wider font-semibold text-[#1A1A1A] border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1" />
                    <textarea value={section.content || ''} onChange={(e) => { const next = draftReportSections.slice(); next[idx] = { ...next[idx], content: e.target.value }; setDraftReportSections(next); }} rows={Math.max(3, String(section.content || '').split('\n').length)} className="w-full text-[13px] text-[#4F3E2F] border border-[#E8E4DB] rounded-md px-3 py-2 focus:border-[#1F4A3A] outline-none whitespace-pre-wrap leading-relaxed" />
                  </div>
                ) : (
                  <div key={`rep-view-${idx}`} className="pb-5 border-b last:border-b-0 last:pb-0 border-[#F4F2EC]">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">{section.heading}</p>
                    <p className="text-[13px] text-[#4F3E2F] whitespace-pre-wrap leading-relaxed">{section.content}</p>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* ------ Feedback (strictly follows Feedback Template) ------ */}
          <div className="rounded-xl border border-[#E8E4DB] bg-white shadow-sm">
            <div className="px-6 py-5 border-b border-[#E8E4DB] flex flex-wrap items-center justify-between gap-3 bg-[#FBFAF7] rounded-t-xl">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Feedback Template</p>
                <h3 className="text-[18px] font-semibold text-[#1A1A1A] mt-0.5" style={{ fontFamily: "'Fraunces', serif" }}>Brand & Creative Partner Feedback</h3>
                <p className="text-[11px] text-[#8A8A8A] mt-1">{feedbackSent ? `Sent ${report.feedback_sent_at?.slice(0, 19)?.replace('T', ' ')}` : 'Not sent yet'}</p>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {editingFeedback ? (
                  <>
                    <button onClick={saveFeedback} className="v3-btn-primary text-[11px]"><Save className="w-3.5 h-3.5" /> Save</button>
                    <button onClick={() => setEditingFeedback(false)} className="v3-btn-secondary text-[11px]"><X className="w-3.5 h-3.5" /> Cancel</button>
                  </>
                ) : (
                  <>
                    <button onClick={startEditFeedback} className="v3-btn-secondary text-[11px]" data-testid="feedback-edit-btn"><Edit3 className="w-3.5 h-3.5" /> Edit Feedback</button>
                    <button onClick={() => setPreviewType('feedback')} className="v3-btn-secondary text-[11px]" data-testid="feedback-preview-btn"><Eye className="w-3.5 h-3.5" /> Preview</button>
                    <div className="relative">
                      <button onClick={() => setShareFeedbackBrandOpen((v) => !v)} className="v3-btn-primary text-[11px]" data-testid="feedback-send-brand-btn"><Send className="w-3.5 h-3.5" /> Send to Brand</button>
                      <ShareMenu open={shareFeedbackBrandOpen} onClose={() => setShareFeedbackBrandOpen(false)} options={SHARE_OPTIONS('feedback', brandEmail, '', false)} onSelect={(opt) => handleShare('feedback', opt)} />
                    </div>
                    <div className="relative">
                      <button onClick={() => setShareFeedbackCreatorOpen((v) => !v)} className="v3-btn-primary text-[11px]" data-testid="feedback-send-creator-btn"><Send className="w-3.5 h-3.5" /> Send to Creator</button>
                      <ShareMenu open={shareFeedbackCreatorOpen} onClose={() => setShareFeedbackCreatorOpen(false)} options={SHARE_OPTIONS('feedback', '', creatorEmail, true).filter((o) => o.key !== 'email_brand')} onSelect={(opt) => handleShare('feedback', opt)} />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {/* Email Template */}
              <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-5">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">Tab 1 — Email Template</p>
                {editingFeedback ? (
                  <textarea value={draftFeedback?.email_template || ''} onChange={(e) => setDraftFeedback((p) => ({ ...p, email_template: e.target.value }))} rows={5} className="w-full text-[12px] text-[#4F3E2F] border border-[#E8E4DB] rounded-md px-3 py-2 focus:border-[#1F4A3A] outline-none whitespace-pre-wrap leading-relaxed bg-white" />
                ) : (
                  <p className="text-[12px] text-[#4F3E2F] whitespace-pre-wrap leading-relaxed">{feedback?.email_template}</p>
                )}
              </div>

              {/* Brand Partner Feedback */}
              <FeedbackFormBlock
                title={feedback?.brand_partner?.form_title || 'TTA Project Feedback – Brand Partner'}
                description={feedback?.brand_partner?.form_description}
                project={(editingFeedback ? draftFeedback : feedback)?.brand_partner?.project_name}
                date={(editingFeedback ? draftFeedback : feedback)?.brand_partner?.date}
                comment={(editingFeedback ? draftFeedback : feedback)?.brand_partner?.optional_comment}
                questions={(editingFeedback ? draftFeedback : feedback)?.brand_partner?.questions}
                editing={editingFeedback}
                onUpdateField={(f, v) => updateFeedbackField('brand_partner', f, v)}
                onUpdateQuestion={(i, f, v) => updateFeedbackQuestion('brand_partner', i, f, v)}
                average={feedback?.brand_average_score}
                accent="border-[#A4D4B0]"
              />

              {/* Creative Partner Feedback */}
              <FeedbackFormBlock
                title={feedback?.creative_partner?.form_title || 'TTA Project Feedback – Creative Partner'}
                description={feedback?.creative_partner?.form_description}
                project={(editingFeedback ? draftFeedback : feedback)?.creative_partner?.project_name}
                date={(editingFeedback ? draftFeedback : feedback)?.creative_partner?.date}
                link={(editingFeedback ? draftFeedback : feedback)?.creative_partner?.google_form_link}
                comment={(editingFeedback ? draftFeedback : feedback)?.creative_partner?.optional_comment}
                questions={(editingFeedback ? draftFeedback : feedback)?.creative_partner?.questions}
                editing={editingFeedback}
                onUpdateField={(f, v) => updateFeedbackField('creative_partner', f, v)}
                onUpdateQuestion={(i, f, v) => updateFeedbackQuestion('creative_partner', i, f, v)}
                average={feedback?.creative_average_score}
                accent="border-[#F5D88A]"
              />

              {/* Internal Use */}
              <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-5">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">Internal Use (Not Shown to Client)</p>
                <ul className="text-[12px] text-[#6E6657] space-y-1 list-disc pl-5">
                  {(feedback?.internal_use || []).map((line, idx) => <li key={idx}>{line}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* ------ Closure ------ */}
          <div className="rounded-xl border border-[#E8E4DB] bg-white shadow-sm p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>Close the project</p>
                <p className="text-[12px] text-[#6E6657] mt-1">{canClose ? 'Both the Final Report and Feedback have been sent. You can now close the project.' : 'Send both the Final Report and Feedback before closing the project.'}</p>
              </div>
              <button onClick={closeProject} disabled={!canClose || closing || bc.stage === 'closed'} className="v3-btn-primary disabled:opacity-40 disabled:cursor-not-allowed" data-testid="close-project-btn"><PackageCheck className="w-3.5 h-3.5" /> {bc.stage === 'closed' ? 'Project closed' : (closing ? 'Closing…' : 'Close Project')}</button>
            </div>
          </div>
        </>
      )}
      <button onClick={() => navigate(`/v3/admin/business-cases/${id}/delivery/summary`)} className="text-[12px] text-[#1F4A3A] hover:underline mt-4 inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Delivery Summary</button>
    </FlowShell>
  );
};
