import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { RelationshipStageSelect, relationshipStageMeta, relationshipStageOf } from '../../lib/relationshipStage';
import { ConnectSourcesPanel, OpportunitiesPanel } from './V1ConnectSources';
import { PrioritySelect } from '../../lib/snapshotPriority';
import AnalyzerSourceBanner from '../../components/v3/AnalyzerSourceBanner';
import StrategyDraftEditor from '../../components/admin/StrategyDraftEditor';
import { TtaLetterhead } from '../../components/v1/TtaLetterhead';
import { normalizeKpiList, formatReadinessFieldValue } from '../../lib/readinessFieldFormat';

// Detect a cell that contains a KPI list (either real array of dicts, or a
// stringified Python-repr dict / object literal) and render it cleanly.
// Falls back to plain text/string rendering for non-KPI cells.
const renderAlignmentCell = (cell) => {
  // Already a plain string: try to detect a stringified KPI dict
  if (typeof cell === 'string') {
    const trimmed = cell.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}') && /['"]?(kpi|metric)['"]?\s*:/i.test(trimmed)) {
      const kpis = normalizeKpiList([cell]);
      if (kpis.length) return <KpiCardList items={kpis} />;
    }
    return cell;
  }
  // Array of dicts (KPI list)
  if (Array.isArray(cell)) {
    if (cell.length && typeof cell[0] === 'object' && cell[0] && ('kpi' in cell[0] || 'metric' in cell[0] || 'target' in cell[0])) {
      return <KpiCardList items={normalizeKpiList(cell)} />;
    }
    // Plain string array
    return cell.map((v, i) => (
      <span key={`alt-${i}`}>{typeof v === 'string' ? v : formatReadinessFieldValue(null, v)}{i < cell.length - 1 ? ', ' : ''}</span>
    ));
  }
  if (cell && typeof cell === 'object') {
    return <pre className="text-[12px] whitespace-pre-wrap font-sans m-0">{formatReadinessFieldValue(null, cell)}</pre>;
  }
  return cell ?? '';
};

const KpiCardList = ({ items }) => {
  if (!items?.length) return null;
  return (
    <ol className="space-y-2 m-0 p-0 list-decimal pl-5">
      {items.map((k, idx) => {
        const targetNeedsConfirm = /^needs confirmation/i.test((k.target || '').trim());
        return (
          <li key={`kpi-${idx}`} className="text-[12px] text-[#4F3E2F]" data-testid={`alignment-kpi-${idx + 1}`}>
            <div className="font-semibold text-[#1A1A1A]">{k.kpi}</div>
            {k.target && (
              <div className={targetNeedsConfirm ? 'text-[#8A6E2F] italic' : ''}>
                <span className="font-medium">Target:</span> {k.target}
              </div>
            )}
            {k.evidence && (
              <div className="text-[#6E6657]">
                <span className="font-medium">Evidence:</span> {k.evidence}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
};
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  Upload,
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
  Presentation,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
  Loader2,
  UserRound,
  Clock,
  Hash,
  CircleDot,
  ExternalLink,
} from 'lucide-react';
import {
  v3AcceptCreatorBriefing,
  v3AddDeliverable,
  v3DeleteDeliverable,
  v3AdvanceBusinessCase,
  v3AnalyzeMeetingTranscript,
  v3AnalyzeAllTranscripts,
  v3GetAnalyzeAllJob,
  v3ApproveAlignmentAs,
  v3ApproveSnapshot,
  v3CreateBrainstorm,
  v3UpdateBrainstorm,
  v3ListBrainstorms,
  v3BrainstormSuggestedQuestions,
  v3AnalyzeBrainstormTranscript,
  v3SkipBrainstormTranscript,
  v3ContractPdfUrl,
  v3AlignmentDocxUrl,
  v3CreativeBriefDocxUrl,
  v3TemplateBriefDocxUrl,
  v3TemplateBriefPreviewUrl,
  v3GeneratePitchDeck,
  v3UpdatePitchDeck,
  v3ApprovePitchDeckAs,
  v3SendPitchDeckToBrand,
  v3PublishPitchDeckToBrandPage,
  v3ReadFileAsDataUri,
  v3SetPitchDeckCoverImage,
  v3ClearPitchDeckCoverImage,
  v3AddPitchDeckCreatorImage,
  v3RemovePitchDeckCreatorImage,
  v3PitchDeckDocxUrl,
  v3PitchDeckFlipbookUrl,
  v3PitchDeckSlidesUrl,
  v3GetPitchDeckAnalytics,
  v3GenerateCreativeBrief,
  v3StrategySnapshotDocxUrl,
  v3ContractDocxUrl,
  v3FinalReportPdfUrl,
  v3FeedbackPdfUrl,
  v3CreateBrief,
  v3SendCreativeBriefToEmail,
  v3CreateContract,
  v3UpdateContract,
  v3SendContractEmail,
  v3UpdateFinalReport,
  v3SendFinalReportEmail,
  v3SendFeedbackEmail,
  v3CloseBusinessCase,
  v3CreateMeeting,
  v3UploadMeetingTranscript,
  v3SaveMeetingContact,
  v3CreateSnapshot,
  v3DeclineCreatorBriefing,
  v3DeleteBusinessCaseConnect,
  v3GenerateAlignmentQuestions,
  v3GenerateAlignmentFromTranscripts,
  v3GenerateFinalReport,
  v3GetBusinessCase,
  v3TouchBusinessCase,
  v3UpdateBusinessCaseValue,
  v3GetCreators,
  v3ListMeetings,
  v3ListBriefs,
  v3ListContracts,
  v3ListDeliverables,
  v3PromoteBusinessCaseConnect,
  v3RescheduleBusinessCaseConnect,
  v3RescheduleCreatorBriefing,
  v3SendAlignmentToBrand,
  v3PublishAlignmentToBrandPage,
  v3SendConnectMeetingEmail,
  v3SendConnectRescheduleEmail,
  v3SendFeedbackRequest,
  v3ListFeedbackRequests,
  v3CreateInvoice,
  v3UpdateInvoice,
  v3DeleteInvoice,
  v3MarkInvoicePaid,
  v3UploadInvoice,
  v3InvoiceFileUrl,
  v3UpdatePlanningText,
  v3SendStrategySnapshotToBrand,
  v3SignContract,
  v3SuggestCreatorMatches,
  v3UpdateAlignment,
  v3UpdateBusinessCasePhase,
  v3CompleteSubphase,
  v3UpdateSelectedCreators,
  v3UpdateStrategySnapshot,
} from '../../lib/v3api';
import { formatNairaV3 } from '../../lib/v3data';

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

export const useBusinessCaseBundle = () => {
  const params = useParams();
  const id = params.id || params.businessCaseId;
  const snapshotId = params.snapshotId || params.alignmentSnapshotId || null;
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => v3GetBusinessCase(id, snapshotId).then((data) => {
    setBundle(data);
    setLoading(false);
    return data;
  }), [id, snapshotId]);
  useEffect(() => {
    setLoading(true);
    reload().catch(() => setLoading(false));
  }, [reload]);
  // Stamp "an admin opened this project just now" ONCE per project id, so the
  // CRM list shows the most recent visit time regardless of whether anything
  // was edited. Fire-and-forget - never blocks or fails the page load.
  useEffect(() => {
    if (!id) return;
    v3TouchBusinessCase(id).catch(() => {});
  }, [id]);
  return { id, snapshotId, bundle, loading, reload };
};

const getCase = (bundle) => bundle?.business_case || {};
const getBrand = (bundle) => bundle?.brand || {};

const valueFrom = (record, keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const humanStatus = (value) => String(value || 'needs_business_call')
  .replace(/[_-]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .replace(/\b(crm|ai|kpi|cta|rm)\b/gi, (match) => match.toUpperCase())
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDateTime = (value) => {
  if (!value) return 'Not captured yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const latestTimestamp = (values) => values.reduce((latest, value) => {
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? latest : Math.max(latest, parsed);
}, 0);

const connectStatusUpdatedAt = (bundle) => {
  const bc = getCase(bundle);
  const meetings = Array.isArray(bundle?.meetings) ? bundle.meetings : [];
  const statusEvents = Array.isArray(bc.timeline)
    ? bc.timeline.filter((item) => ['connect_status_changed', 'connect_analyzed_all', 'connect_promoted_to_frame', 'connect_rescheduled', 'business_call_scheduled'].includes(item?.event))
    : [];
  const time = Math.max(
    latestTimestamp([bc.connect?.status_updated_at, bc.connect?.updated_at, bc.updated_at, bc.created_at]),
    latestTimestamp(statusEvents.map((item) => item?.at)),
    latestTimestamp(meetings.map((meeting) => meeting?.updated_at || meeting?.scheduled_for || meeting?.created_at))
  );
  return time ? new Date(time).toISOString() : '';
};

// Pitch Deck and Creative Brief are sibling Framing steps and the admin can
// enter either FIRST from the Creator Match Scanner. Whichever page they open
// first shows a button to the sibling page; the sibling (second) page shows
// "Move to Business Case" instead - no looping back. The entry order is
// remembered per business case for the session; re-entering from the scanner
// resets it.
const frameEntryKey = (id) => `v1FrameEntry:${id}`;
const setFrameEntry = (id, page) => { try { sessionStorage.setItem(frameEntryKey(id), page); } catch { /* private mode */ } };
const getFrameEntry = (id) => { try { return sessionStorage.getItem(frameEntryKey(id)); } catch { return null; } };

// Client-clarified workflow (Chioma's feedback): two distinct areas.
//
// CRM area: Connect + Framing.
//   Framing chains 5 sub-steps:
//     1. Alignment Snapshot   (backend `frame` stage)
//     2. Brainstorm           (backend `plan` stage, sub-step 1)
//     3. Creator Selection    (backend `plan` stage, sub-step 2)
//     4. Creative Brief       (backend `plan` stage, sub-step 3)
//     5. Strategy Snapshot    (backend `plan` stage, sub-step 4) - sent to both
//                             brand AND creatives for approval.
//   Admin only leaves Framing once Strategy Snapshot is approved AND the
//   Strategy Development Fee is paid.
//
// Business Case area: Planning -> Delivery -> Reporting.
//   Planning prepares budget/timeline/contracts/invoicing/deliverables/feedback.
//     Feedback page is reusable - admin returns to regenerate and send.
//   Delivery executes (approve budget, generate/send/sign contracts, deliverables).
//   Reporting generates final report.
//
// Backend stage keys are unchanged; only the UI grouping reflects the client's
// vocabulary so no data migration is needed.
const stepperConfig = (id, stage, pathname, bc = {}) => {
  const inCrmPhase = /\/(connect|frame)(\/|$)/.test(pathname || '');
  if (inCrmPhase) {
    return {
      links: [
        ['Connect', adminRoute(`/business-cases/${id}/connect`)],
        ['Framing', adminRoute(`/business-cases/${id}/frame/snapshot`)],
      ],
      // Backend `frame` AND `plan` both belong to the Framing area in the UI.
      currentIndex: ({ connect: 0, frame: 1, plan: 1 }[stage] ?? 1),
    };
  }
  // Business Case area: Planning -> Delivery -> Reporting.
  // currentIndex is the HIGHEST unlocked step (locked = idx > currentIndex).
  // Delivery must stay locked until Planning is explicitly completed, and
  // Reporting until Delivery is completed. A closed/reporting-stage case
  // unlocks everything (nothing left to gate).
  const plan = bc.plan || {};
  const planningDone = Boolean(plan.planning_completed_at);
  const deliveryDone = Boolean(plan.delivery_completed_at) || Boolean(bc.reporting_started_at) || Boolean(bc.final_report_sent_at);
  let bcIndex = 0; // Planning only.
  if (planningDone) bcIndex = 1; // Delivery unlocked.
  if (deliveryDone) bcIndex = 2; // Reporting unlocked.
  if (stage === 'closed' || stage === 'reporting') bcIndex = 2;
  return {
    links: [
      // Planning lands on its summary page (project value, brand/creator
      // info, timelines, invoicing, links to Contract Studio + Feedback).
      // Delivery lands directly on the Deliverables page - per Chioma's
      // mapping, that is the only page in the Delivery phase. Reporting
      // covers the Final Report.
      ['Planning', adminRoute(`/business-cases/${id}/plan/planning`)],
      ['Delivery', adminRoute(`/business-cases/${id}/delivery/deliverables`)],
      ['Reporting', adminRoute(`/business-cases/${id}/reporting/final-report`)],
    ],
    currentIndex: bcIndex,
  };
};

export const businessCasePhasePath = (id, bc = {}) => {
  const stage = bc.stage || 'connect';
  if (stage === 'closed' || stage === 'reporting') return adminRoute(`/business-cases/${id}/reporting/final-report`);
  // Backend `deliver` stage covers Planning -> Delivery -> Reporting in the
  // Business Case area. Pick the right sub-page using existing case fields so
  // clicking on a brand opens what the admin was actually working on, not
  // always Planning:
  // Gated by the same sub-phase completion flags as the stepper so clicking
  // a brand never jumps past an incomplete phase:
  //   - Reporting only once Delivery is completed.
  //   - Delivery only once Planning is completed.
  //   - Otherwise land on Planning.
  if (stage === 'deliver') {
    const plan = bc.plan || {};
    const planningDone = Boolean(plan.planning_completed_at);
    const deliveryDone = Boolean(plan.delivery_completed_at) || Boolean(bc.reporting_started_at) || Boolean(bc.final_report_sent_at);
    if (deliveryDone) return adminRoute(`/business-cases/${id}/reporting/final-report`);
    if (planningDone) return adminRoute(`/business-cases/${id}/delivery/deliverables`);
    return adminRoute(`/business-cases/${id}/plan/planning`);
  }
  if (stage === 'plan') {
    // Framing sub-steps 2..5 live on backend `plan` but UI shows them under /frame/*.
    const plan = bc.plan || {};
    // Brainstorm starts with the transcript-upload page; once the transcript
    // has been analysed (or a round exists), go straight to the brainstorm form.
    if (!plan.brainstorm_transcript_analyzed_at && !plan.brainstorm_round_id) return adminRoute(`/business-cases/${id}/frame/brainstorm-transcript`);
    if (!plan.brainstorm_round_id) return adminRoute(`/business-cases/${id}/frame/brainstorm`);
    if (!Array.isArray(plan.selected_creator_ids) || plan.selected_creator_ids.length === 0) return adminRoute(`/business-cases/${id}/frame/creator-scan`);
    if (!plan.creative_brief_id) return adminRoute(`/business-cases/${id}/frame/brief`);
    // Strategy Snapshot step removed - once the brief exists, the flow moves
    // straight into the Planning phase.
    return adminRoute(`/business-cases/${id}/plan/planning`);
  }
  if (stage === 'frame') {
    const frame = bc.frame || {};
    const status = frame.alignment_snapshot_status || frame.status || '';
    if (status === 'approved') return adminRoute(`/business-cases/${id}/frame/brainstorm-transcript`);
    if (status === 'sent' || status === 'waiting_brand' || status === 'pending_brand_review') return adminRoute(`/business-cases/${id}/frame/waiting-brand`);
    if (frame.brand_comments || frame.admin_comments || Number(frame.comment_count || 0) > 0) return adminRoute(`/business-cases/${id}/frame/admin-review`);
    return adminRoute(`/business-cases/${id}/frame/snapshot`);
  }
  return adminRoute(`/business-cases/${id}/connect`);
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

export const FlowShell = ({ title, subtitle, children, nextAction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, bundle, loading, reload } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const flowBrand = bundle?.brand || {};
  if (loading) return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Loading business case...</div>;
  const { links: stepperLinks, currentIndex: stepperIndex } = stepperConfig(id, bc.stage, location.pathname, bc);
  // Framing pages (Connect + Frame sub-steps) live under the CRM Brands tab
  // conceptually. Strip the Business Case context chip and point the second
  // back-button at the CRM Brands list instead of the Business Cases list so
  // the page feels purely CRM-flavoured.
  const isCrmPage = /\/(connect|frame)(\/|$)/.test(location.pathname || '');
  return (
    <div className="v3-stage-shell space-y-5" data-testid="business-case-flow-page">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="v3-btn-secondary text-[11px]" data-testid="business-case-back-btn">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        {isCrmPage ? (
          <button type="button" onClick={() => navigate(adminRoute('/crm-brands'))} className="v3-btn-secondary text-[11px]" data-testid="business-case-crm-brands-btn">
            <ArrowLeft className="w-3.5 h-3.5" /> CRM Brands
          </button>
        ) : (
          <button type="button" onClick={() => navigate(adminRoute('/business-cases'))} className="v3-btn-secondary text-[11px]" data-testid="business-case-list-btn">
            <ArrowLeft className="w-3.5 h-3.5" /> Business Cases
          </button>
        )}
        <div className="flex-1" />
        {/* Same relationship stage control as the CRM brand page - pinned to
            every Business Case page so the brand's position is always visible
            and editable. Advancing a stage updates it automatically too. */}
        {flowBrand.id && (
          <RelationshipStageSelect
            brandId={flowBrand.id}
            value={relationshipStageOf(flowBrand)}
            onChange={(next, error) => {
              if (error) {
                toast.error('Could not update the relationship stage.');
                return;
              }
              toast.success(`Stage set to "${relationshipStageMeta(next).label}".`);
              reload();
            }}
          />
        )}
      </div>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {!isCrmPage && (
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-1">{bc.title}</p>
          )}
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1>
          <p className="text-[13px] text-[#6E6657] mt-1 max-w-3xl">{subtitle}</p>
        </div>
        {nextAction && <div className="v3-next-action-card">{nextAction}</div>}
      </div>
      <div className="v3-stepper">
        {stepperLinks.map(([label, href], idx) => {
          const locked = idx > stepperIndex;
          return (
            <button
              key={label}
              onClick={() => { if (!locked) navigate(href); }}
              disabled={locked}
              aria-disabled={locked}
              title={locked ? `Locked until the ${stepperLinks[idx - 1]?.[0]} stage is completed` : ''}
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

// Reusable, well-segmented brand comment card used by the Alignment Snapshot,
// Brainstorm review and Contract comment blocks in the v1 admin. Replaces the
// old low-contrast stacked-amber boxes: a clear header strip (icon + type +
// revision + status), an obvious "Re:" subject line, the comment body in high
// contrast, and a footer with author / timestamp chips.
const BrandCommentCard = ({ comment, index }) => {
  const c = comment || {};
  const revision = Number(c.revision || 0);
  const status = c.status || 'open';
  const isOpen = String(status).toLowerCase() === 'open';
  const subject = c.quoted_text && c.quoted_text !== 'Brand review' ? c.quoted_text : (c.subject || null);
  const body = c.comment || c.content || c.summary || '';
  const author = c.author || 'Brand';
  const date = c.created_at || c.date_iso;
  const statusLabel = humanStatus(status);
  return (
    <article
      data-testid={`brand-comment-${c.id || index}`}
      className="brand-comment-card overflow-hidden rounded-xl border border-[#E6D7B8] bg-[#FFFFFF] shadow-sm"
    >
      {/* Header strip */}
      <div className="bc-strip flex flex-wrap items-center gap-2 border-b border-[#F0E7D4] bg-[#FCF6EA] px-4 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F3E2C0] text-[#B06E16]">
          <MessageSquare className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#B06E16]">Brand Comment</span>
        {revision > 0 && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#EEF1F6] px-1.5 py-0.5 text-[10px] font-semibold text-[#3A5BA0] border border-[#C9D6EE]">
            <Hash className="h-3 w-3" /> Rev {revision}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
            isOpen
              ? 'border-[#E8A33A] bg-[#FDEBD0] text-[#C47A1A]'
              : 'border-[#2E7D5B] bg-[#E8F5ED] text-[#2E7D5B]'
          }`}
        >
          <CircleDot className="h-3 w-3" /> {statusLabel}
        </span>
        <span className="ml-auto text-[11px] font-medium text-[#9A8F7C]">#{String(index + 1).padStart(2, '0')}</span>
      </div>

      {/* Body */}
      <div className="bc-body px-4 py-3">
        {subject && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#8A6E2F]">
            Re: {subject}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[13px] font-medium leading-relaxed text-[#1A1A1A]">
          {cleanV1Text(body)}
        </p>
      </div>

      {/* Footer meta */}
      <div className="bc-foot flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#F0E7D4] bg-[#FAFCFB] px-4 py-2 text-[11px] text-[#6E6657]">
        <span className="inline-flex items-center gap-1.5">
          <UserRound className="h-3.5 w-3.5 text-[#8A6E2F]" />
          By <strong className="font-semibold text-[#4F3E2F]">{author}</strong>
        </span>
        {date && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#8A6E2F]" />
            {formatDateTime(date)}
          </span>
        )}
      </div>
    </article>
  );
};

const TextInput = ({ label, value, onChange, rows = 1, disabled = false }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    {rows > 1 ? (
      <textarea value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px] disabled:bg-[#F4F2ED] disabled:text-[#8A8A8A] disabled:cursor-not-allowed" />
    ) : (
      <input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px] disabled:bg-[#F4F2ED] disabled:text-[#8A8A8A] disabled:cursor-not-allowed" />
    )}
  </label>
);

const _normaliseDateTimeLocal = (raw) => {
  if (!raw) return '';
  const text = String(raw);
  // Accept "YYYY-MM-DD" only by appending T00:00; accept ISO strings by trimming seconds/zone.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) return text.slice(0, 16);
  return text;
};

const DateTimeInput = ({ label, value, onChange }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    <input
      type="datetime-local"
      value={_normaliseDateTimeLocal(value)}
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

const createTranscriptSession = (index, overrides = {}) => ({
  id: overrides.id || `transcript-${Date.now()}-${index}`,
  meetingId: overrides.meetingId || '',
  date: overrides.date || new Date().toISOString().slice(0, 10),
  session: overrides.session || `Session ${index + 1}`,
  content: overrides.content || '',
});

const transcriptSessionFromMeeting = (meeting, index) => {
  const rawDate = meeting.call_date || meeting.scheduled_for || '';
  const date = rawDate ? String(rawDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
  return createTranscriptSession(index, {
    id: meeting.id || `meeting-${index}`,
    meetingId: meeting.id || '',
    date,
    session: meeting.session_label || `Session ${index + 1}`,
    content: meeting.transcript || '',
  });
};

const transcriptHasContent = (session) => Boolean(String(session.content || '').trim());

const TranscriptUploadPanel = ({ sessions, onAdd, onRemove, onChange, onUploadFile, lastAddedId }) => {
  const lastRef = React.useRef(null);
  React.useEffect(() => {
    if (lastAddedId && lastRef.current) {
      lastRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Move focus to the content textarea inside the new card for better UX
      const textarea = lastRef.current.querySelector('textarea');
      if (textarea) textarea.focus({ preventScroll: true });
    }
  }, [lastAddedId]);

  return (
    <InfoCard title="Transcripts">
      <div className="space-y-4" data-testid="transcripts-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            ref={session.id === lastAddedId ? lastRef : null}
            className="rounded-[8px] border border-[#E8E4DB] bg-white p-4 shadow-sm"
            data-testid={`connect-transcript-card-${session.id}`}
          >
            <div className="grid gap-3 border-b border-[#F1ECDF] pb-4 lg:grid-cols-[minmax(160px,0.45fr)_minmax(240px,1fr)_36px] lg:items-end">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Date</span>
                <input
                  type="date"
                  value={session.date}
                  onChange={(event) => onChange(session.id, 'date', event.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none focus:border-[#1F4A3A]"
                  data-testid={`connect-transcript-date-${session.id}`}
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Session Name</span>
                <input
                  type="text"
                  value={session.session}
                  onChange={(event) => onChange(session.id, 'session', event.target.value)}
                  className="mt-1 w-full rounded-md border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] outline-none focus:border-[#1F4A3A]"
                  data-testid={`connect-transcript-session-${session.id}`}
                />
              </label>
              <button
                type="button"
                onClick={() => onRemove(session.id)}
                className="justify-self-end rounded-md p-2 text-[#B54A37] hover:bg-[#FBF1EE]"
                aria-label="Remove transcript"
                data-testid={`connect-remove-transcript-${session.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript Content</label>
                <label className="v3-btn-secondary cursor-pointer text-[11px]">
                  <Upload className="w-3.5 h-3.5" /> Upload Meeting Transcript
                  <input
                    type="file"
                    accept=".txt,.md,text/plain"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) onUploadFile(session.id, file);
                      event.target.value = '';
                    }}
                    data-testid={`connect-upload-transcript-${session.id}`}
                  />
                </label>
              </div>
              <textarea
                value={session.content}
                onChange={(event) => onChange(session.id, 'content', event.target.value)}
                rows={7}
                placeholder="Paste your transcript here..."
                className="w-full rounded-md border border-[#E8E4DB] bg-[#FBFAF7] px-3 py-2 text-[13px] leading-6 text-[#1A1A1A] outline-none focus:border-[#1F4A3A] focus:bg-white"
                data-testid={`connect-transcript-content-${session.id}`}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-dashed border-[#E8E4DB]">
          <p className="text-[11px] text-[#8A8A8A]">Add another transcript below the existing ones. This does not send any email.</p>
          <button
            type="button"
            onClick={onAdd}
            className="v3-btn-primary text-[12px] flex items-center gap-1.5"
            data-testid="connect-add-transcript-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Add another transcript
          </button>
        </div>
      </div>
    </InfoCard>
  );
};

export const saveConnectTranscriptSessions = async ({ sessions, businessCaseId, bc, brand, contactName, contactEmail, sourceLabel }) => {
  const cleanSessions = sessions.filter(transcriptHasContent);
  if (!cleanSessions.length) {
    throw new Error('Upload or paste at least one transcript before running analysis.');
  }
  const agenda = alignmentQuestionLabels.join('\n');
  const brandName = brandDisplayName(brand);
  const businessCaseTitle = bc.title || `${brandName} business case`;
  const savedSessions = [];
  const failures = [];

  for (const [index, session] of cleanSessions.entries()) {
    const sessionName = session.session || `Session ${index + 1}`;
    let meetingId = session.meetingId;
    try {
      if (!meetingId) {
        const meeting = await v3CreateMeeting({
          title: `Business Call - Connect: ${businessCaseTitle} - ${sessionName}`,
          meeting_type: 'business_call',
          stage: 'connect',
          entity_type: 'brand',
          brand_id: bc.brand_id || brand.id,
          business_case_id: businessCaseId,
          business_case_title: businessCaseTitle,
          entity_name: brandName,
          contact_name: contactName || brand.primary_contact || '',
          contact_email: contactEmail || brand.email || '',
          contact_phone: brand.phone || '',
          scheduled_for: session.date || null,
          agenda,
          meeting_notes: `${sourceLabel}. ${sessionName}`,
        });
        meetingId = meeting?.id || meeting?.meeting_id || meeting?.data?.id;
        if (!meetingId) {
          throw new Error(`Meeting created but no id returned: ${JSON.stringify(meeting).slice(0, 200)}`);
        }
      } else {
        await v3SaveMeetingContact(meetingId, {
          contact_name: contactName || brand.primary_contact || '',
          contact_email: contactEmail || brand.email || '',
          contact_phone: brand.phone || '',
          scheduled_for: session.date || null,
          meeting_notes: `${sourceLabel}. ${sessionName}`,
        });
      }
      await v3UploadMeetingTranscript(meetingId, { transcript: session.content.trim() });
      savedSessions.push({ ...session, meetingId });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.message || String(err);
      console.error(`[saveConnectTranscriptSessions] ${sessionName} failed:`, detail, err);
      failures.push({ sessionName, detail });
    }
  }
  if (failures.length || savedSessions.length !== cleanSessions.length) {
    const lostCount = cleanSessions.length - savedSessions.length - failures.length;
    if (lostCount > 0) {
      // Some sessions were silently lost (e.g. hung await) - synthesize a failure entry
      for (let i = 0; i < lostCount; i++) {
        failures.push({ sessionName: `Session ${savedSessions.length + failures.length + 1}`, detail: 'Save did not complete (request stalled or aborted).' });
      }
    }
    const failureMsg = failures.map((f) => `${f.sessionName}: ${f.detail}`).join('; ');
    const summary = `Saved ${savedSessions.length}/${cleanSessions.length} transcripts. Failed: ${failureMsg}`;
    if (!savedSessions.length) {
      throw new Error(summary);
    }
    // Attach summary so the caller can surface partial success
    savedSessions.partialFailure = summary;
  }
  return savedSessions;
};

const ConnectAnalysisResult = ({ result, onPromote, onReschedule, promoteLabel = 'Promote to Frame Regardless' }) => {
  if (!result) return null;
  const reasons = Array.isArray(result.reasons) ? result.reasons : [];
  const missing = Array.isArray(result.missing_context) ? result.missing_context : [];
  const confidence = Number(result.confidence || 0);
  const displayedLabel = result.decision === 'promote' ? 'Promote to Frame' : 'Reschedule Business Call';
  const promoteButtonLabel = result.decision === 'promote' ? 'Promote to Frame' : promoteLabel;
  return (
    <div className="mt-5 rounded-[8px] border border-[#D7CBB8] bg-[#FAF7F1] p-5 space-y-4" data-testid="connect-analysis-results">
      <AnalyzerSourceBanner source={result.analysis_source} model={result.analysis_model} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8E4DB] pb-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">AI Recommendation</span>
          <h4 className="mt-0.5 text-[16px] font-bold text-[#1A1A1A]">{displayedLabel}</h4>
        </div>
        <div className="rounded-md border border-[#BDE0CE] bg-[#E8F3ED] px-2 py-1 text-[11px] font-semibold text-[#1F4A3A]">
          Confidence Score: {Number.isFinite(confidence) ? confidence : 0}%
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">AI Reasons</h5>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#4F3E2F]">
            {reasons.length ? reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>) : <li>No AI reasons returned yet.</li>}
          </ul>
        </div>
        <div>
          <h5 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Missing Context</h5>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-[#B54A37]">
            {missing.length ? missing.map((item, index) => <li key={`${item}-${index}`}>{item}</li>) : <li>No missing context detected.</li>}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[#E8E4DB] pt-4">
        <button type="button" onClick={onReschedule} className="v3-btn-secondary flex items-center gap-1" data-testid="connect-schedule-another-call-btn">
          <RotateCcw className="w-3.5 h-3.5" /> Schedule another call to gather missing info
        </button>
        <button type="button" onClick={onPromote} className="v3-btn-primary flex items-center gap-1" data-testid="connect-promote-regardless-btn">
          <CheckCircle2 className="w-3.5 h-3.5" /> {promoteButtonLabel}
        </button>
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

const cleanV1Text = (value) => {
  if (value === undefined || value === null) return value;
  return String(value)
    .replace(/\u00e2\u20ac\u201d/g, '-')
    .replace(/\u00e2\u20ac\u201c/g, '-')
    .replace(/\u00e2\u20ac\u00a6/g, '...')
    .replace(/\u00e2\u20ac\u00a2/g, '-')
    .replace(/\u00e2\u201a\u00a6/g, '\u20a6')
    .replace(/\u00c3\u2014/g, 'x')
    .replace(/\u00c2\u00b7/g, ' - ')
    .replace(/\u00f0\u0178[\u0080-\u00bf]{1,3}/g, '')
    .replace(/\u00ef\u00bf\u00bd/g, '')
    .replace(new RegExp(['awer', 'ness'].join(''), 'gi'), 'awareness')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const cleanMoneyText = (value) => cleanV1Text(value).replace(/NGN\s*/gi, '\u20a6');
const brandDisplayName = (brand) => cleanV1Text(brand?.company || brand?.name || brand?.brand_name || 'Brand');
const creatorName = (creator) => cleanV1Text(creator?.name || creator?.creator_name || creator?.creative_name || creator?.company_name || creator?.id || 'Creator');
const creatorSpecialty = (creator) => cleanV1Text(
  creator?.specialty
  || creator?.Specialty
  || creator?.genre
  || creator?.category
  || creator?.niche
  || creator?.content_type
  || creator?.contentType
  || creator?.primary_platform
  || creator?.platform
  || 'Creator profile'
);
const isRealEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (!email || ['nil', 'n/a', 'na', 'none', 'null', '-', 'tbc', 'tbd', 'unknown'].includes(email)) return '';
  if (!email.includes('@') || !email.split('@').pop().includes('.') || email.includes(' ')) return '';
  return email;
};
const creatorEmail = (creator) => (
  isRealEmail(creator?.email)
  || isRealEmail(creator?.contact_email)
  || isRealEmail(creator?.creator_email)
  || isRealEmail(creator?.manager_email)
  || ''
);
const creatorContact = (creator) => cleanV1Text(
  creator?.email
  || creator?.contact_email
  || creator?.creator_email
  || creator?.manager_email
  || creator?.phone
  || creator?.contact_phone
  || creator?.instagram
  || creator?.tiktok
  || creator?.handle
  || ''
);
const selectedCreatorQuery = (ids) => encodeURIComponent(ids.join(','));

const creatorBriefLink = (businessCaseId, creatorId) => `${window.location.origin}/creator/briefs/${businessCaseId}?creator=${encodeURIComponent(creatorId)}`;

const generateCreatorBriefDraft = (bundle, creator, planningFields = {}) => {
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const alignment = bundle?.alignment_snapshot || {};
  const marketing = bc.connect?.marketing_intelligence || alignment.marketing_intelligence || {};
  const projectTitle = bc.title || 'Business Case Project';
  const brandName = brandDisplayName(brand);
  const leadName = bc.relationship_manager_name || brand.relationship_manager_name || 'TTA project lead';
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const planningValue = (label, fallback) => String(planningFields[label] || fallback || '').trim();
  // Per Chioma's feedback: drop the AI-style parenthetical helpers like
  // "(Creator Version)", "(summary)", "(Signal Only)", instruction phrases
  // like "Describe responsibility, not outputs" / "No schedules. No
  // milestones." / "No breakdown required at this stage.", and meta lines
  // like "Internal name: ...". Keep the substantive structure that the
  // creator actually fills in.
  return [
    'TTA - Creative Alignment Brief',
    '',
    '1. Project Reference',
    `Brand / Organisation: ${brandName}`,
    `Project working title: ${projectTitle}`,
    `TTA project lead: ${leadName}`,
    `Date shared with creator: ${today}`,
    `Creator: ${creatorName(creator)}`,
    `Creator contact: ${creatorContact(creator) || 'To be confirmed'}`,
    '',
    '2. Context',
    `Brand objective: ${planningValue('Campaign core idea', marketing.key_marketing_focus || bc.stated_intent || `Position ${brandName} with a credible creator-led cultural idea that supports the approved business case.`)}`,
    `Why this project is happening now: ${planningValue('Audience and behavior', marketing.current_marketing_challenge || marketing.primary_target_audience || 'The brand is preparing a creator partnership and needs pricing/fit confirmation before final scope approval.')}`,
    '',
    '3. Role of the Creative',
    'The creative would act as:',
    '- Public-facing lead',
    '- Conceptual lead',
    '- Talent & cultural translator',
    '- Executional partner',
    `Primary responsibility: ${planningValue('Creator direction', `${creatorName(creator)} should help translate the brand opportunity through ${creatorSpecialty(creator)} while keeping the idea credible to their audience.`)}`,
    '',
    '4. Expected Scope',
    'This engagement may include:',
    '- Content creation',
    '- Appearances / representation',
    '- Concept contribution',
    '- Performance / activation involvement',
    '- Other',
    `Scope signal from planning: ${planningValue('Content/deliverables idea log', 'Creator involvement is being explored for planning and pricing alignment only.')}`,
    '- Specific deliverables are not yet defined',
    '- Final scope is subject to brand approval',
    '',
    '5. Indicative Timeline',
    `Proposed engagement period: ${planningValue('Timeline inference', marketing.timeline || 'To be confirmed after brand approval and creator availability check.')}`,
    'Known timing constraints: Confirm availability, blackout dates, production constraints, and any campaign launch windows.',
    '',
    '6. Working Assumptions',
    '- TTA will coordinate engagement and act as administrative lead',
    '- Contracts issued through TTA',
    '- Payment processed through TTA',
    '- Reporting and brand liaison handled by TTA',
    '',
    '7. Fee Indication Request',
    `Fee for engagement: ${planningValue('Budget planning', 'Creator to propose a fee range or fixed fee for the engagement signal above.')}`,
    'Fee basis: Project based / Time based / Retainer style',
    'What fee covers: Please state what your indication includes, including content, appearances, concept contribution, usage, exclusivity, production support, or management fees where relevant.',
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

const alignmentQuestionDefaults = [
  { question: 'Key marketing focus', key: 'key_marketing_focus' },
  { question: 'Primary target audience', key: 'primary_target_audience' },
  { question: 'Key marketing channels', key: 'key_marketing_channels' },
  { question: 'KPIs', key: 'kpis' },
  { question: 'Budget range', key: 'budget_range' },
  { question: 'Timeline', key: 'timeline' },
  { question: 'Approval process / decision maker', key: 'approval_process_decision_maker' },
  { question: 'Current marketing challenge', key: 'current_marketing_challenge' },
];

const alignmentQuestionLabels = alignmentQuestionDefaults.map((item) => item.question);
const replaceSnapshotCopy = (value, search, replacement) => value.split(search).join(replacement);

const cleanAlignmentSnapshotCopy = (value) => {
  if (typeof value !== 'string') return value;
  return [
    [['From the Connect', 'transcript, TASCK understands'].join(' '), "TASCK's current understanding of"],
    [['This field was not captured clearly enough from the Connect', 'transcript to treat it as final.'].join(' '), 'This field still needs brand confirmation before it is treated as final.'],
    [['Not captured clearly from the Connect', 'transcript. Brand should confirm'].join(' '), 'This detail needs brand confirmation before approval. Please confirm'],
    [['not captured clearly from the Connect', 'transcript'].join(' '), 'needs brand confirmation'],
    [['The strongest transcript', 'signal available for this field is:'].join(' '), 'Supporting context for this field:'],
  ].reduce((copy, [search, replacement]) => replaceSnapshotCopy(copy, search, replacement), value);
};

const questionValueFromRow = (row, columns, columnName, fallbackIndex) => {
  const index = columns.findIndex((column) => String(column).toLowerCase() === columnName.toLowerCase());
  if (Array.isArray(row)) return cleanAlignmentSnapshotCopy(index >= 0 ? (row[index] || '') : (row[fallbackIndex] || ''));
  if (!row || typeof row !== 'object') return '';
  const directValue = row[columnName];
  if (directValue) return cleanAlignmentSnapshotCopy(directValue);
  if (index >= 0) return cleanAlignmentSnapshotCopy(Object.values(row)[index] || '');
  return '';
};

const alignmentQuestionsFromSection = (section) => {
  const columns = Array.isArray(section.columns) ? section.columns : [];
  const rows = Array.isArray(section.rows) ? section.rows : [];
  if (!rows.length) {
    return alignmentQuestionDefaults.map(({ question }) => ({ question, answer: '', status: 'needs_confirmation' }));
  }
  return rows.map((row) => {
    const statusRaw = (questionValueFromRow(row, columns, 'Status', 2) || '').toString().toLowerCase();
    return {
      question: questionValueFromRow(row, columns, 'Alignment field', 0) || questionValueFromRow(row, columns, 'Question', 0) || 'Alignment field',
      answer: questionValueFromRow(row, columns, 'Brand response / comment', 1)
        || questionValueFromRow(row, columns, 'Brand answer / correction', 2)
        || questionValueFromRow(row, columns, 'Brand answer', 1)
        || '',
      status: statusRaw === 'captured' ? 'captured' : 'needs_confirmation',
    };
  });
};

const alignmentRowsFromQuestions = (questions) => questions.map((item) => ({
  'Alignment field': item.question,
  'Brand response / comment': item.answer,
  'Status': item.status === 'captured' ? 'Captured' : 'Needs confirmation',
}));

const isAlignmentQuestionSection = (section) => (
  section?.type === 'questions'
  || String(section?.heading || '').toUpperCase().includes('ALIGNMENT SNAPSHOT QUESTIONS')
);
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

// Build the Focus & Priority "Section narrative" from the segments, grouped by
// priority (highest/most urgent first, using the section's own priority order)
// so admin and brands can immediately see what is urgent vs. what can wait.
// Exported so the same text renders in the editor, preview, DOCX, and portal.
export const buildFocusPriorityNarrative = (segments, priorityOptions) => {
  const list = Array.isArray(segments) ? segments : [];
  const options = Array.isArray(priorityOptions) ? priorityOptions : [];
  const filled = list.filter((s) => (s?.focus || '').trim() || (s?.priority || '').trim());
  if (!filled.length) return '';
  const rankOf = (p) => {
    const idx = options.indexOf(p);
    return idx === -1 ? 999 : idx;
  };
  const groups = {};
  filled.forEach((s) => {
    const key = (s.priority || '').trim() || 'Priority not set';
    (groups[key] = groups[key] || []).push(s);
  });
  const orderedKeys = Object.keys(groups).sort((a, b) => rankOf(a) - rankOf(b));
  return orderedKeys.map((key) => {
    const lines = groups[key].map((s) => {
      const focus = (s.focus || '').trim() || 'Focus not set';
      const name = (s.name || '').trim();
      return `• ${focus}${name ? ` (${name})` : ''}`;
    }).join('\n');
    return `${key}:\n${lines}`;
  }).join('\n\n');
};

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
    const selectors = Array.isArray(section.selectors) && section.selectors.length
      ? `<ul>${section.selectors.map((sel) => `<li><strong>${escapeHtml(sel.label || 'Selection')}:</strong> ${escapeHtml(sel.selected || 'Not selected yet')}</li>`).join('')}</ul>`
      : '';
    return `<section><h2>${escapeHtml(section.heading)}</h2>${section.content ? `<p style="white-space:pre-wrap">${escapeHtml(section.content)}</p>` : ''}${selectors}${list}${rows}</section>`;
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
  const { id, bundle, reload } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const connectStatus = bc.connect?.connect_status || 'needs_business_call';
  const statusUpdatedAt = connectStatusUpdatedAt(bundle);
  // Whether the admin has already saved any Connect conversations (call
  // transcripts, emails or WhatsApp chats). Once they have, the "Add
  // Transcript" CTA on this page becomes "Next" - it is no longer the first
  // time they are adding one, just a way back into the schedule page.
  const connectMeetings = (Array.isArray(bundle?.meetings) ? bundle.meetings : [])
    .filter((m) => (m.meeting_type === 'business_call' || m.type === 'business_call') && String(m.transcript || '').trim());
  const hasSavedConversations = connectMeetings.length > 0 || Number(bc.connect?.connect_sources_count || 0) > 0;
  const about = valueFrom(brand, ['about', 'brand_about', 'description', 'company_description', 'notes']);
  const marketingBudget = valueFrom(brand, ['marketing_budget', 'budget', 'budget_range']) || valueFrom(bc, ['marketing_budget', 'budget', 'estimated_value']);
  const defaultEmail = contact.email || brand.email || '';
  // Agenda for the Connect / Business Call. These are the exact points TASCK
  // needs to cover, because the answers are what feed the Alignment Snapshot we
  // send back to the brand. Keep the points intact if you reword this.
  const defaultPurpose = [
    'TASCK would like to talk through your brand and what you are working to achieve, so we can shape the right approach with you. We would like to cover:',
    '',
    '1. Your brand / organisation - who you are, what you do, and who you serve.',
    '2. Core Focus Areas - the priorities that matter most to you right now.',
    '3. Campaign Type - the kind of work or campaign you have in mind.',
    '4. Key Audience / Beneficiaries - the people you are trying to reach or serve.',
    '5. Audience Behaviour / Pain Points - what they do today, and what gets in their way.',
    '6. Key Goals & Metrics Tracked - the numbers your team is measured on.',
    '7. What Success Looks Like / Timeline - your definition of a win, and by when.',
    '',
    'Everything we discuss on this call is what TASCK uses to build your Alignment Snapshot, which we send back to you to confirm, correct, or sharpen before any work begins.',
  ].join('\n');
  const [meetingForm, setMeetingForm] = useState({
    scheduled_for: bc.connect?.scheduled_for || '',
    meeting_link: bc.connect?.meeting_link || '',
    purpose: bc.connect?.meeting_purpose || defaultPurpose,
    contact_email: defaultEmail,
  });
  const [sendingMeetingEmail, setSendingMeetingEmail] = useState(false);
  const [meetingPopup, setMeetingPopup] = useState(null);

  useEffect(() => {
    setMeetingForm((prev) => ({
      scheduled_for: prev.scheduled_for || bc.connect?.scheduled_for || '',
      meeting_link: prev.meeting_link || bc.connect?.meeting_link || '',
      purpose: prev.purpose || bc.connect?.meeting_purpose || defaultPurpose,
      contact_email: prev.contact_email || defaultEmail,
    }));
  }, [bc.id, bc.connect?.scheduled_for, bc.connect?.meeting_link, bc.connect?.meeting_purpose, defaultEmail]);

  const updateMeetingForm = (field, value) => setMeetingForm((prev) => ({ ...prev, [field]: value }));

  const resetMeetingForm = () => {
    setMeetingForm({ scheduled_for: '', meeting_link: '', purpose: defaultPurpose, contact_email: defaultEmail });
    setMeetingPopup({ tone: 'success', title: 'New meeting email ready', message: 'Add the next date, time, link and purpose below.' });
  };

  const sendMeetingEmail = async () => {
    if (!meetingForm.contact_email?.trim()) {
      setMeetingPopup({ tone: 'error', title: 'Brand email missing', message: 'Add the brand email before sending the meeting schedule.' });
      return;
    }
    setSendingMeetingEmail(true);
    setMeetingPopup({ tone: 'pending', title: 'Sending meeting email', message: `Sending to ${meetingForm.contact_email}...` });
    try {
      await v3SendConnectMeetingEmail(id, {
        scheduled_for: meetingForm.scheduled_for,
        meeting_link: meetingForm.meeting_link,
        reason: meetingForm.purpose,
        agenda: meetingForm.purpose,
        contact_email: meetingForm.contact_email,
        contact_name: contact.primary_contact || brand.primary_contact || '',
      });
      await reload();
      setMeetingPopup({ tone: 'success', title: 'Sent to brand email', message: `Meeting schedule sent to ${meetingForm.contact_email}. The interaction has been stored on the brand record.` });
    } catch (e) {
      setMeetingPopup({ tone: 'error', title: 'Could not send meeting email', message: e?.response?.data?.detail || e?.message || 'The schedule email could not be sent.' });
    } finally {
      setSendingMeetingEmail(false);
    }
  };

  return (
    <FlowShell title="Connect / Business Call" subtitle="Business Call captures the brand conversation before Frame questions are sent for brand answers." nextAction="Schedule the call, send the welcome email, then analyze the transcript.">
      {meetingPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" data-testid="connect-meeting-email-popup">
          <div className="v3-card w-full max-w-sm bg-white p-5 text-center shadow-2xl">
            <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full ${meetingPopup.tone === 'error' ? 'bg-[#F5D9D2] text-[#B54A37]' : meetingPopup.tone === 'pending' ? 'bg-[#FBF4E4] text-[#7A5A1E]' : 'bg-[#DDE7E2] text-[#1F4A3A]'}`}>
              {meetingPopup.tone === 'pending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mail className="h-5 w-5" />}
            </div>
            <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{meetingPopup.title}</h3>
            <p className="mt-2 text-[12px] leading-5 text-[#6E6657]">{meetingPopup.message}</p>
            {meetingPopup.tone !== 'pending' && (
              <button type="button" onClick={() => setMeetingPopup(null)} className="v3-btn-primary mt-4 w-full justify-center text-[12px]">
                Done
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <InfoCard title="Brand info">
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            {[
              ['Company', brandDisplayName(brand)],
              ['Contact', contact.primary_contact || brand.primary_contact],
              ['Email', contact.email || brand.email || 'Missing'],
              ['Phone', contact.phone || brand.phone || 'Missing'],
              ['Website', contact.website || brand.website || 'Missing'],
              ['Connect status', humanStatus(connectStatus)],
              ['Status last updated', formatDateTime(statusUpdatedAt)],
              ['Marketing budget', marketingBudget],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</p>
                <p className="text-[#1A1A1A] break-words">{value || 'Not captured yet'}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3 text-[12px]">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">About the company</p>
            <p className="mt-1 whitespace-pre-wrap leading-5 text-[#1A1A1A]">{about || 'Not captured yet'}</p>
          </div>
        </InfoCard>
        <InfoCard title="Next steps">
          <div className="grid gap-3">
            <button type="button" onClick={() => navigate(adminRoute(`/business-cases/${id}/connect/schedule`))} className="v3-btn-primary" data-testid="connect-add-transcript-link">{hasSavedConversations ? <ArrowRight className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} {hasSavedConversations ? 'Next' : 'Add Transcript'}</button>
            <div className="rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Send meeting schedule to brand</p>
              <div className="mt-3 grid gap-2">
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                  Brand email
                  <input value={meetingForm.contact_email} onChange={(e) => updateMeetingForm('contact_email', e.target.value)} className="mt-1 w-full rounded border border-[#D7CBB8] bg-white px-3 py-2 text-[12px] text-[#1A1A1A]" placeholder="brand@example.com" />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                  Meeting date and time
                  <input type="datetime-local" value={_normaliseDateTimeLocal(meetingForm.scheduled_for)} onChange={(e) => updateMeetingForm('scheduled_for', e.target.value)} className="mt-1 w-full rounded border border-[#D7CBB8] bg-white px-3 py-2 text-[12px] text-[#1A1A1A]" />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                  Meeting link
                  <input value={meetingForm.meeting_link} onChange={(e) => updateMeetingForm('meeting_link', e.target.value)} className="mt-1 w-full rounded border border-[#D7CBB8] bg-white px-3 py-2 text-[12px] text-[#1A1A1A]" placeholder="https://meet.google.com/..." />
                </label>
                <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                  Purpose of meeting
                  <textarea rows={4} value={meetingForm.purpose} onChange={(e) => updateMeetingForm('purpose', e.target.value)} className="mt-1 w-full rounded border border-[#D7CBB8] bg-white px-3 py-2 text-[12px] leading-5 text-[#1A1A1A]" />
                </label>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={sendMeetingEmail} disabled={sendingMeetingEmail} className="v3-btn-primary justify-center text-[12px]" data-testid="connect-send-meeting-email">
                  {sendingMeetingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {sendingMeetingEmail ? 'Sending...' : 'Send to brand email'}
                </button>
                <button type="button" onClick={resetMeetingForm} className="v3-btn-secondary justify-center text-[12px]" data-testid="connect-add-meeting-email">
                  <Plus className="h-3.5 w-3.5" /> Add another email
                </button>
              </div>
            </div>
          </div>
        </InfoCard>
      </div>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectSchedule = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const brand = getBrand(bundle);
  const bc = getCase(bundle);

  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [transcriptSessions, setTranscriptSessions] = useState([createTranscriptSession(0)]);
  const [form, setForm] = useState({ contact_name: '', contact_email: '' });
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const inFlightRef = useRef(false);
  const [lastAddedTranscriptId, setLastAddedTranscriptId] = useState(null);
  // Modal popup for transcript analysis progress (Chioma's feedback: the
  // inline "Starting transcript analysis..." was too quiet and confusing).
  // Shape: { open, progress (0-100), message, status: 'running'|'complete'|'failed', error }
  const [analysisPopup, setAnalysisPopup] = useState({ open: false, progress: 0, message: '', status: 'running' });
  // Bumped every time analyze-all completes so the OpportunitiesPanel below
  // re-fetches its list. The panel doesn't know that analyze-all now also
  // populates opportunities server-side, so we ping it explicitly.
  const [opportunitiesRefreshToken, setOpportunitiesRefreshToken] = useState(0);
  // Tick simulator for sync mode (no job_id) so the progress bar never sits
  // at 0% while the request is in flight. Cleared on completion / failure.
  const progressTickRef = useRef(null);
  const stopProgressTick = () => {
    if (progressTickRef.current) {
      clearInterval(progressTickRef.current);
      progressTickRef.current = null;
    }
  };
  const startProgressTick = (startAt = 5, ceiling = 92) => {
    stopProgressTick();
    progressTickRef.current = setInterval(() => {
      setAnalysisPopup((prev) => {
        if (!prev.open || prev.status !== 'running') return prev;
        const next = prev.progress < ceiling ? prev.progress + 1 : ceiling;
        return { ...prev, progress: next };
      });
    }, 600);
    setAnalysisPopup((prev) => ({ ...prev, progress: Math.max(prev.progress, startAt) }));
  };
  useEffect(() => () => stopProgressTick(), []);

  const loadMeetings = useCallback(async () => {
    try {
      const list = await v3ListMeetings({ business_case_id: id, stage: 'connect' });
      const businessCallMeetings = (list || [])
        .filter((meeting) => meeting.meeting_type === 'business_call' || meeting.type === 'business_call')
        // Sort by call_date / scheduled_for / created_at ascending so the
        // earliest call appears first as "Session 1".
        .sort((a, b) => {
          const aKey = String(a.call_date || a.scheduled_for || a.created_at || '');
          const bKey = String(b.call_date || b.scheduled_for || b.created_at || '');
          return aKey.localeCompare(bKey);
        });
      // De-duplicate by meeting id so a refetch never doubles the list.
      const seenIds = new Set();
      const uniqueMeetings = [];
      for (const meeting of businessCallMeetings) {
        const mid = meeting.id || `${meeting.business_case_id}-${meeting.created_at}`;
        if (seenIds.has(mid)) continue;
        seenIds.add(mid);
        uniqueMeetings.push(meeting);
      }
      if (uniqueMeetings.length > 0) {
        // Hydrate ALL saved business-call transcripts so the user sees every
        // session they previously added.
        setTranscriptSessions(uniqueMeetings.map((meeting, idx) => transcriptSessionFromMeeting(meeting, idx)));
      } else {
        // No saved transcripts yet.
        setTranscriptSessions((current) => {
          // Preserve the admin's in-progress first card while they are still
          // typing the session label. Only reset after the page is freshly
          // mounted for a different business case.
          const hasActiveDraft = current.some(
            (session) => String(session.id || '').startsWith('transcript-') && String(session.content || '').trim() === '' && String(session.session || '').trim() !== ''
          );
          if (hasActiveDraft) return current;
          return [createTranscriptSession(0)];
        });
      }
    } catch (e) {
      setSaveNotice(e?.response?.data?.detail || e?.message || 'Could not load Connect meetings.');
    } finally {
      setLoadingMeetings(false);
    }
  }, [id]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  useEffect(() => {
    if (prefilled || !bundle?.business_case) return;
    const loadedBrand = getBrand(bundle);
    const loadedCase = getCase(bundle);
    const contact = loadedCase.brand_contact_snapshot || {};
    setForm((current) => ({
      ...current,
      contact_name: current.contact_name || contact.primary_contact || contact.contact_name || loadedBrand.primary_contact || loadedBrand.primaryContact || loadedBrand.company || loadedBrand.name || '',
      contact_email: current.contact_email || contact.email || contact.contact_email || loadedBrand.email || '',
    }));
    setPrefilled(true);
  }, [bundle, prefilled]);

  useEffect(() => {
    if (bc?.connect?.analysis) {
      setAnalysisResult(bc.connect.analysis);
    }
  }, [bc]);

  const addTranscriptSession = () => {
    setTranscriptSessions((current) => {
      const next = createTranscriptSession(current.length);
      setLastAddedTranscriptId(next.id);
      return [...current, next];
    });
    setSaveNotice('New transcript card added below - no email was sent.');
  };

  const removeTranscriptSession = (sessionId) => {
    setTranscriptSessions((current) => {
      const next = current.filter((session) => session.id !== sessionId);
      return next.length ? next : [createTranscriptSession(0)];
    });
  };

  const updateTranscriptSession = (sessionId, field, value) => {
    setTranscriptSessions((current) => current.map((session) => (
      session.id === sessionId ? { ...session, [field]: value } : session
    )));
  };

  const uploadTranscriptFile = async (sessionId, file) => {
    try {
      const content = await file.text();
      updateTranscriptSession(sessionId, 'content', content);
      setSaveNotice(`${file.name} loaded into the transcript session.`);
    } catch (e) {
      setSaveNotice(e?.message || 'Could not read the transcript file.');
    }
  };

  const saveTranscriptSessions = async () => {
    if (!bundle?.business_case) {
      throw new Error('Business Case details are still loading. Please try again in a moment.');
    }
    setSaving(true);
    const savedSessions = await saveConnectTranscriptSessions({
      sessions: transcriptSessions,
      businessCaseId: id,
      bc,
      brand,
      contactName: form.contact_name,
      contactEmail: form.contact_email,
      sourceLabel: 'Connect transcript upload',
    });
    setTranscriptSessions(savedSessions.length ? savedSessions : [createTranscriptSession(0)]);
    return savedSessions;
  };

  const pollAnalysisJob = async (jobId, partialFailure) => {
    // Poll every 2.5s for up to ~5 minutes; bail early on completed/failed.
    const POLL_INTERVAL_MS = 2500;
    const MAX_POLLS = 120;
    // We have a real job_id so we can show the backend's actual progress
    // value in the popup. Stop the sync-mode tick simulator.
    stopProgressTick();
    for (let i = 0; i < MAX_POLLS; i++) {
      // If the user navigated away or analysis was cancelled, stop.
      if (!inFlightRef.current) return;
      try {
        const job = await v3GetAnalyzeAllJob(id, jobId);
        const progress = Math.max(0, Math.min(100, job.progress || 0));
        const message = job.message || `Analyzing transcripts… ${progress}%`;
        setSaveNotice(message);
        setAnalysisPopup((prev) => prev.open ? { ...prev, progress: Math.max(prev.progress, progress), message, status: 'running' } : prev);
        if (job.status === 'completed') {
          if (job.recommendation) setAnalysisResult(job.recommendation);
          await reload();
          // analyze-all now also populates opportunities on the case; ping
          // the OpportunitiesPanel to refetch so users don't stare at the
          // "No opportunities yet" empty state after a successful run.
          setOpportunitiesRefreshToken((prev) => prev + 1);
          const base = 'AI analysis complete from the saved Connect transcripts.';
          setSaveNotice(partialFailure ? `${base} (Warning: ${partialFailure})` : base);
          setAnalysisPopup((prev) => ({ ...prev, open: true, progress: 100, status: 'complete', message: 'Analysis complete. Check below for the analysed transcript.' }));
          return;
        }
        if (job.status === 'failed') {
          const fallbackRec = job.recommendation;
          if (fallbackRec) setAnalysisResult(fallbackRec);
          await reload();
          const errorMsg = job.error || job.message || 'unknown error';
          setSaveNotice(`Claude analysis failed - showing safe fallback. (${errorMsg})`);
          setAnalysisPopup((prev) => ({ ...prev, open: true, status: 'failed', error: errorMsg, message: 'Analysis failed. A safe fallback is shown below.' }));
          return;
        }
      } catch (err) {
        // Transient poll error - keep trying unless explicitly 404
        if (err?.response?.status === 404) {
          setSaveNotice('Analysis job missing on server. Please retry.');
          setAnalysisPopup((prev) => ({ ...prev, open: true, status: 'failed', error: 'Analysis job missing on server.', message: 'Analysis failed. Please retry.' }));
          return;
        }
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    setSaveNotice('Analysis is taking longer than expected. It will keep running on the server - refresh the page later to see results.');
    setAnalysisPopup((prev) => ({ ...prev, open: true, status: 'failed', error: 'Timed out waiting for the server.', message: 'Analysis is taking longer than expected. It will keep running on the server - refresh the page later to see results.' }));
  };

  const runCombinedAnalysis = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setAnalyzing(true);
    // Open the popup FIRST so the user sees something happen immediately.
    setAnalysisPopup({ open: true, progress: 2, message: 'Saving transcripts…', status: 'running', error: undefined });
    setSaveNotice('Saving transcripts before analysis...');
    try {
      const savedSessions = await saveTranscriptSessions();
      if (!savedSessions.length) {
        setAnalysisPopup({ open: false, progress: 0, message: '', status: 'running' });
        return;
      }
      if (savedSessions.partialFailure) {
        setSaveNotice(savedSessions.partialFailure);
      }
      setSaveNotice('Starting transcript analysis...');
      setAnalysisPopup((prev) => ({ ...prev, open: true, progress: Math.max(prev.progress, 8), message: 'Starting transcript analysis…', status: 'running' }));
      // Kick a simulated tick so the bar moves even if the server doesn't
      // expose a real progress value (sync mode). The poll updater will
      // call stopProgressTick() once it gets a real number.
      startProgressTick(10, 92);

      const res = await v3AnalyzeAllTranscripts(id);
      if (!res?.ok) {
        setSaveNotice('AI analysis failed.');
        stopProgressTick();
        setAnalysisPopup((prev) => ({ ...prev, status: 'failed', error: 'AI analysis failed.', message: 'Analysis failed. Please retry.' }));
        return;
      }
      // Background-job mode → poll until completed/failed
      if (res.mode === 'background_job' && res.job_id) {
        setSaveNotice(res.message || `Analyzing ${res.transcript_count || ''} transcripts in the background...`);
        setAnalysisPopup((prev) => ({ ...prev, open: true, message: res.message || 'Analyzing transcripts in the background…' }));
        await pollAnalysisJob(res.job_id, savedSessions.partialFailure);
        return;
      }
      // Sync mode → result already inline
      stopProgressTick();
      if (res.recommendation) setAnalysisResult(res.recommendation);
      setSaveNotice(() => {
        const base = 'AI analysis complete from the saved Connect transcripts.';
        return savedSessions.partialFailure ? `${base} (Warning: ${savedSessions.partialFailure})` : base;
      });
      setAnalysisPopup((prev) => ({ ...prev, open: true, progress: 100, status: 'complete', message: 'Analysis complete. Check below for the analysed transcript.' }));
      setOpportunitiesRefreshToken((prev) => prev + 1);
      await reload();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'AI analysis failed.';
      setSaveNotice(msg);
      stopProgressTick();
      setAnalysisPopup((prev) => ({ ...prev, open: true, status: 'failed', error: msg, message: 'Analysis failed. Please retry.' }));
    } finally {
      setSaving(false);
      setAnalyzing(false);
      inFlightRef.current = false;
    }
  };

  const handlePromote = () => {
    setSaving(true);
    setSaveNotice('Opening Frame phase while TASCK prepares the Alignment Snapshot...');
    navigate(adminRoute(`/business-cases/${id}/frame/snapshot`), { state: { preparingFrame: true } });
    const promoteAfterNavigation = async () => {
      await saveConnectTranscriptSessions({
        sessions: transcriptSessions,
        businessCaseId: id,
        bc,
        brand,
        contactName: form.contact_name,
        contactEmail: form.contact_email,
        sourceLabel: 'Connect transcript upload',
      });
      await v3AnalyzeAllTranscripts(id);
      await v3PromoteBusinessCaseConnect(id, { reason: 'Admin promoted to Frame regardless of Connect recommendation after transcript review.' });
      await v3GenerateAlignmentQuestions(id);
    };
    promoteAfterNavigation().catch((e) => {
      console.error(e?.response?.data?.detail || e?.message || 'Failed to promote business case to Frame.');
    });
  };

  return (
    <FlowShell title="Connect Schedule & Transcripts" subtitle="Upload each Connect call transcript by date and session, then run one combined AI analysis across every saved transcript." nextAction="Save transcript sessions and run analysis before moving to Frame.">
      {saveNotice && (
        <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-3 text-[12px] text-[#7A5A1E]" data-testid="connect-save-notice-banner">
          {saveNotice}
        </div>
      )}

      {loadingMeetings ? (
        <div className="v3-card p-6 text-[13px] text-[#8A8A8A] flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading transcripts...
        </div>
      ) : (
        <TranscriptUploadPanel
          sessions={transcriptSessions}
          onAdd={addTranscriptSession}
          onRemove={removeTranscriptSession}
          onChange={updateTranscriptSession}
          onUploadFile={uploadTranscriptFile}
          lastAddedId={lastAddedTranscriptId}
        />
      )}

      {/* Conversation sources: transcripts, email chains, WhatsApp threads.
          Added over time; all of them feed the opportunity analysis below. */}
      <ConnectSourcesPanel businessCaseId={id} />

      {/* What the AI found across every source, plus merge + generate. */}
      <OpportunitiesPanel
        businessCaseId={id}
        refreshToken={opportunitiesRefreshToken}
        onGenerated={() => navigate(adminRoute(`/business-cases/${id}/frame/snapshot`))}
      />

      <InfoCard title="Combined AI Transcript Analysis">
        <p className="text-[12px] text-[#6E6657] mb-4">
          Analyze transcripts from all Connect meetings to extract marketing intelligence, verify readiness criteria, and generate the stage recommendation.
        </p>
        <button
          type="button"
          onClick={runCombinedAnalysis}
          disabled={analyzing || saving || !transcriptSessions.some(transcriptHasContent)}
          className="v3-btn-primary flex items-center gap-1.5"
          data-testid="connect-analyze-all-btn"
        >
          {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {analyzing ? 'Analyzing all transcripts...' : 'Analyze All Transcripts'}
        </button>

        <ConnectAnalysisResult
          result={analysisResult}
          onPromote={handlePromote}
          onReschedule={() => navigate(adminRoute(`/business-cases/${id}/connect/reschedule`))}
        />
      </InfoCard>

      {/* ============================================================
          Transcript analysis progress popup.
          Per Chioma's feedback: the inline "Starting transcript
          analysis..." was too quiet; admins thought nothing was
          happening. This popup makes the work visible, shows the
          actual server progress (or a simulated tick in sync mode),
          and ends with a clear "check below for the analysed
          transcript" message instead of disappearing silently.
          ============================================================ */}
      {analysisPopup.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" data-testid="connect-analysis-popup">
          <div className="w-full max-w-md rounded-[10px] border border-[#D7CBB8] bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${analysisPopup.status === 'complete' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : analysisPopup.status === 'failed' ? 'bg-[#FBEAE5] text-[#B54A37]' : 'bg-[#EFF5F1] text-[#1F4A3A]'}`}>
                {analysisPopup.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : analysisPopup.status === 'failed' ? <X className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </span>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                {analysisPopup.status === 'complete' ? 'Analysis complete' : analysisPopup.status === 'failed' ? 'Analysis failed' : 'Loading transcript analysis'}
              </h3>
              <span className="ml-auto text-[12px] font-semibold text-[#4F3E2F]" data-testid="connect-analysis-popup-percent">
                {analysisPopup.progress}%
              </span>
            </div>

            <div className="h-2 w-full rounded-full bg-[#F4F2EC] overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ease-out ${analysisPopup.status === 'failed' ? 'bg-[#B54A37]' : 'bg-[#1F4A3A]'}`}
                style={{ width: `${Math.max(2, analysisPopup.progress)}%` }}
                data-testid="connect-analysis-popup-bar"
              />
            </div>

            <p className="text-[13px] leading-6 text-[#4F3E2F]" data-testid="connect-analysis-popup-message">
              {analysisPopup.message || (analysisPopup.status === 'running' ? 'Working on it…' : '')}
            </p>
            {analysisPopup.status === 'running' && (
              <p className="mt-1 text-[11px] text-[#6E6657]">Please keep this page open while TASCK runs the analysis.</p>
            )}

            {(analysisPopup.status === 'complete' || analysisPopup.status === 'failed') && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAnalysisPopup((prev) => ({ ...prev, open: false }))}
                  className="v3-btn-primary"
                  data-testid="connect-analysis-popup-close"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </FlowShell>
  );
};

export const V3BusinessCaseConnectQuestions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, bundle, reload } = useBusinessCaseBundle();
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
        title: `Business Call - Connect: ${bc.title}`,
        meeting_type: 'business_call',
        stage: 'connect',
        entity_type: 'brand',
        brand_id: bc.brand_id,
        business_case_id: id,
        entity_name: brandDisplayName(brand) || '',
        business_case_title: bc.title,
        agenda: alignmentQuestionLabels.join('\n'),
      });
      activeMeetingId = meeting.id;
      setMeetingId(activeMeetingId);
    }
    await v3UploadMeetingTranscript(activeMeetingId, { transcript });
    const result = await v3AnalyzeMeetingTranscript(activeMeetingId, {});
    const nextAnalysis = { ...result, meeting_id: activeMeetingId };
    setAnalysis(nextAnalysis);
    navigate(adminRoute(`/business-cases/${id}/connect/analysis`), { state: { connectAnalysis: nextAnalysis } });
  };
  return (
    <FlowShell title="Connect Call Questions + Transcript" subtitle="Use these prompts to capture the call before the brand completes the Alignment Snapshot questions." nextAction="Analyze the transcript, then open the AI result page.">
      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <InfoCard title="Suggested questions">
          <ol className="list-decimal pl-5 space-y-2 text-[13px]">{alignmentQuestionLabels.map((q) => <li key={q}>{q}</li>)}</ol>
        </InfoCard>
        <InfoCard title="Transcript paste/upload">
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12} className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px]" />
          <div className="flex gap-2 mt-3">
            <button onClick={analyze} className="v3-btn-primary"><Upload className="w-3.5 h-3.5" /> Upload Meeting Transcript</button>
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
  const recommendationLabel = recommendation.decision === 'promote' ? 'Promote to Frame' : recommendation.decision ? 'Reschedule Business Call' : 'Pending analysis';
  return (
    <FlowShell title="Connect AI Result" subtitle="Review extracted marketing intelligence, reasons, missing context, risk flags, and the promote/reschedule recommendation." nextAction={recommendationLabel}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <InfoCard title="Recommendation">
          <p className="text-xl font-semibold text-[#1A1A1A]">{recommendationLabel}</p>
          <p className="text-[12px] text-[#6E6657] mt-2">{recommendation.summary || analysis.summary || 'No AI result stored yet.'}</p>
        </InfoCard>
        <InfoCard title="Missing context"><ul className="list-disc pl-5 text-[13px]">{(recommendation.missing_context || analysis.missing_information || []).map((x) => <li key={x}>{x}</li>)}</ul></InfoCard>
        <InfoCard title="Risk flags"><ul className="list-disc pl-5 text-[13px]">{(recommendation.risk_flags || analysis.risk_flags || []).map((x) => <li key={x}>{x}</li>)}</ul></InfoCard>
      </div>
      <InfoCard title="Decision actions">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => {
            navigate(adminRoute(`/business-cases/${id}/frame/snapshot`), { state: { preparingFrame: true } });
            v3PromoteBusinessCaseConnect(id, { reason: 'Admin accepted Connect analysis.' })
              .then(() => v3GenerateAlignmentQuestions(id))
              .catch((e) => console.error(e?.response?.data?.detail || e?.message || 'Failed to promote business case to Frame.'));
          }} className="v3-btn-primary"><CheckCircle2 className="w-3.5 h-3.5" /> Promote to Frame</button>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/connect/reschedule`))} className="v3-btn-secondary"><RotateCcw className="w-3.5 h-3.5" /> Reschedule Business Call</button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCaseConnectReschedule = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const brand = getBrand(bundle);
  const bc = getCase(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const [form, setForm] = useState({
    reason: 'Schedule another call to gather missing info.',
    scheduled_for: '',
    meeting_link: '',
    contact_email: contact.email || brand.email || '',
  });
  const [transcriptSessions, setTranscriptSessions] = useState([createTranscriptSession(0, { session: 'Follow-up Session 1' })]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    if (!form.contact_email && (contact.email || brand.email)) {
      setForm((current) => ({ ...current, contact_email: contact.email || brand.email || '' }));
    }
  }, [brand.email, contact.email, form.contact_email]);

  const [lastAddedTranscriptId, setLastAddedTranscriptId] = useState(null);

  const addTranscriptSession = () => {
    setTranscriptSessions((current) => {
      const next = createTranscriptSession(current.length, { session: `Follow-up Session ${current.length + 1}` });
      setLastAddedTranscriptId(next.id);
      return [...current, next];
    });
  };

  const removeTranscriptSession = (sessionId) => {
    setTranscriptSessions((current) => {
      const next = current.filter((session) => session.id !== sessionId);
      return next.length ? next : [createTranscriptSession(0, { session: 'Follow-up Session 1' })];
    });
  };

  const updateTranscriptSession = (sessionId, field, value) => {
    setTranscriptSessions((current) => current.map((session) => (
      session.id === sessionId ? { ...session, [field]: value } : session
    )));
  };

  const uploadTranscriptFile = async (sessionId, file) => {
    try {
      const content = await file.text();
      updateTranscriptSession(sessionId, 'content', content);
      setNotice(`${file.name} loaded into the follow-up transcript.`);
    } catch (e) {
      setNotice(e?.message || 'Could not read the transcript file.');
    }
  };

  const saveFollowUpTranscripts = async () => {
    if (!bundle?.business_case) {
      throw new Error('Business Case details are still loading. Please try again in a moment.');
    }
    const savedSessions = await saveConnectTranscriptSessions({
      sessions: transcriptSessions,
      businessCaseId: id,
      bc,
      brand,
      contactName: contact.primary_contact || brand.primary_contact || brand.company || '',
      contactEmail: form.contact_email || brand.email || '',
      sourceLabel: form.reason || 'Follow-up Connect transcript upload',
    });
    setTranscriptSessions(savedSessions.length ? savedSessions : [createTranscriptSession(0, { session: 'Follow-up Session 1' })]);
    return savedSessions;
  };

  const saveRescheduleEmail = async () => {
    setSaving(true);
    setNotice('');
    try {
      await v3RescheduleBusinessCaseConnect(id, form);
      await v3SendConnectRescheduleEmail(id, form);
      setNotice('Follow-up call saved and reschedule email queued. Add the returned transcript below when the call is complete.');
      await reload();
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save the follow-up call.');
    } finally {
      setSaving(false);
    }
  };

  const generateSnapshotFromFollowUp = () => {
    setSaving(true);
    setNotice('Opening Frame phase while TASCK prepares the Alignment Snapshot...');
    navigate(adminRoute(`/business-cases/${id}/frame/snapshot`), { state: { preparingFrame: true } });
    const promoteAfterNavigation = async () => {
      await saveConnectTranscriptSessions({
        sessions: transcriptSessions,
        businessCaseId: id,
        bc,
        brand,
        contactName: contact.primary_contact || brand.primary_contact || brand.company || '',
        contactEmail: form.contact_email || brand.email || '',
        sourceLabel: form.reason || 'Follow-up Connect transcript upload',
      });
      await v3AnalyzeAllTranscripts(id);
      await v3PromoteBusinessCaseConnect(id, { reason: 'Admin accepted follow-up transcript analysis and generated Alignment Snapshot.' });
      await v3GenerateAlignmentQuestions(id);
    };
    promoteAfterNavigation().catch((e) => {
      console.error(e?.response?.data?.detail || e?.message || 'Could not generate the Alignment Snapshot from the follow-up call.');
    });
  };

  return (
    <FlowShell title="Schedule Another Connect Call" subtitle="Capture the follow-up call, save the transcript, rerun combined AI analysis, then generate the Alignment Snapshot only when the case is ready for Frame." nextAction="Gather the missing info, then generate the Alignment Snapshot.">
      {notice && (
        <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-3 text-[12px] text-[#7A5A1E]" data-testid="connect-reschedule-notice">
          {notice}
        </div>
      )}

      <InfoCard title="Follow-up call details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <TextInput label="Reason / missing details" rows={4} value={form.reason} onChange={(value) => setForm({ ...form, reason: value })} />
          <TextInput label="Contact email" value={form.contact_email} onChange={(value) => setForm({ ...form, contact_email: value })} />
          <TextInput label="New date/time" value={form.scheduled_for} onChange={(value) => setForm({ ...form, scheduled_for: value })} />
          <TextInput label="Meeting link" value={form.meeting_link} onChange={(value) => setForm({ ...form, meeting_link: value })} />
        </div>
        <button type="button" onClick={saveRescheduleEmail} disabled={saving} className="v3-btn-secondary mt-4">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          Save + send summary email
        </button>
      </InfoCard>

      <TranscriptUploadPanel
        sessions={transcriptSessions}
        onAdd={addTranscriptSession}
        onRemove={removeTranscriptSession}
        onChange={updateTranscriptSession}
        onUploadFile={uploadTranscriptFile}
        lastAddedId={lastAddedTranscriptId}
      />

      <InfoCard title="Combined AI Transcript Analysis">
        <p className="text-[12px] text-[#6E6657] mb-4">
          Analyze transcripts from all Connect meetings to extract marketing intelligence, verify readiness criteria, and generate the stage recommendation.
        </p>
        <button
          type="button"
          onClick={generateSnapshotFromFollowUp}
          disabled={saving || !transcriptSessions.some(transcriptHasContent)}
          className="v3-btn-primary flex items-center gap-1.5"
          data-testid="connect-followup-generate-snapshot-btn"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Promote to Frame
        </button>

        <ConnectAnalysisResult
          result={analysisResult}
          onPromote={generateSnapshotFromFollowUp}
          onReschedule={() => setNotice('Add another follow-up transcript above, then run the analysis again.')}
          promoteLabel="Promote to Frame"
        />
      </InfoCard>
    </FlowShell>
  );
};

const AlignmentSectionEditor = ({ section, index, onChange, readOnly = false }) => {
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
    <fieldset disabled={readOnly} className="contents">
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

          {section.type === 'selectors' && Array.isArray(section.selectors) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {section.selectors.map((sel, selIdx) => {
                const options = Array.isArray(sel.options) ? sel.options : [];
                const updateSelector = (patch) => {
                  const next = section.selectors.map((s, i) => (i === selIdx ? { ...s, ...patch } : s));
                  update({ selectors: next });
                };
                return (
                  <label key={sel.key || selIdx} className="block">
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{sel.label || `Selector ${selIdx + 1}`}</span>
                    <select
                      value={sel.selected || ''}
                      onChange={(e) => updateSelector({ selected: e.target.value })}
                      className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none bg-white"
                      data-testid={`alignment-selector-${sel.key || selIdx}`}
                    >
                      <option value="">Select {sel.label || 'an option'}…</option>
                      {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                      {sel.selected && !options.includes(sel.selected) && <option value={sel.selected}>{sel.selected}</option>}
                    </select>
                  </label>
                );
              })}
            </div>
          )}

          {section.type === 'focus_priority' && (
            <div className="space-y-3">
              {(() => {
                const segments = Array.isArray(section.segments) && section.segments.length ? section.segments : [{ name: '', focus: '', priority: '' }];
                const focusOptions = Array.isArray(section.focus_options) ? section.focus_options : [];
                const priorityOptions = Array.isArray(section.priority_options) ? section.priority_options : [];
                // Adding/editing/removing a segment also rewrites the Section
                // narrative, grouped by priority, so the classification the brand
                // sees always matches the segments.
                const updateSegments = (next) => update({ segments: next, content: buildFocusPriorityNarrative(next, priorityOptions) });
                const patchSegment = (segIdx, patch) => updateSegments(segments.map((s, i) => (i === segIdx ? { ...s, ...patch } : s)));
                const addSegment = () => updateSegments([...segments, { name: '', focus: '', priority: '' }]);
                const removeSegment = (segIdx) => updateSegments(segments.filter((_, i) => i !== segIdx));
                return (
                  <>
                    {segments.map((seg, segIdx) => (
                      <div key={segIdx} className="rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3 space-y-2" data-testid={`focus-priority-segment-${segIdx}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Segment {segIdx + 1}</span>
                          {segments.length > 1 && (
                            <button type="button" onClick={() => removeSegment(segIdx)} className="text-[11px] text-[#B4443C] hover:underline" data-testid={`focus-priority-remove-${segIdx}`}>Remove</button>
                          )}
                        </div>
                        <label className="block">
                          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Label (optional)</span>
                          <input
                            value={seg.name || ''}
                            onChange={(e) => patchSegment(segIdx, { name: e.target.value })}
                            placeholder="e.g. Launch phase"
                            className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none bg-white"
                          />
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Focus</span>
                            <select
                              value={seg.focus || ''}
                              onChange={(e) => patchSegment(segIdx, { focus: e.target.value })}
                              className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none bg-white"
                              data-testid={`focus-priority-focus-${segIdx}`}
                            >
                              <option value="">Select focus…</option>
                              {focusOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              {seg.focus && !focusOptions.includes(seg.focus) && <option value={seg.focus}>{seg.focus}</option>}
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Priority</span>
                            <select
                              value={seg.priority || ''}
                              onChange={(e) => patchSegment(segIdx, { priority: e.target.value })}
                              className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none bg-white"
                              data-testid={`focus-priority-priority-${segIdx}`}
                            >
                              <option value="">Select priority…</option>
                              {priorityOptions.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                              {seg.priority && !priorityOptions.includes(seg.priority) && <option value={seg.priority}>{seg.priority}</option>}
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addSegment} className="v3-btn-secondary text-[12px]" data-testid="focus-priority-add-segment">+ Add segment</button>
                  </>
                );
              })()}
            </div>
          )}

          {section.type === 'table' && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Editable snapshot table</span>
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
    </fieldset>
  );
};

const AlignmentQuestionEditor = ({ section, index, onChange, readOnly = false }) => {
  const questions = alignmentQuestionsFromSection(section);
  const updateQuestions = (nextQuestions) => onChange({
    ...section,
    type: 'questions',
    columns: ['Alignment field', 'Brand response / comment', 'Status'],
    rows: alignmentRowsFromQuestions(nextQuestions),
  });
  const updateQuestion = (questionIndex, patch) => updateQuestions(questions.map((item, idx) => (
    idx === questionIndex ? { ...item, ...patch } : item
  )));
  const addQuestion = () => updateQuestions([...questions, { question: 'New question', answer: '', status: 'needs_confirmation' }]);
  const removeQuestion = (questionIndex) => updateQuestions(questions.filter((_, idx) => idx !== questionIndex));

  return (
    <fieldset disabled={readOnly} className="contents">
    <div className="rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-4 shadow-sm" data-testid={`alignment-question-section-${index}`}>
      <div className="grid grid-cols-[38px_1fr] gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8F3ED] text-[12px] font-semibold text-[#1F4A3A]">
          {index + 1}
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px] md:items-end">
            <TextInput label="Form heading" value={section.heading || ''} onChange={(value) => onChange({ ...section, heading: value })} />
            <button type="button" onClick={addQuestion} className="v3-btn-secondary text-[11px]">
              <Plus className="w-3.5 h-3.5" /> Add field
            </button>
          </div>

          <div className="grid gap-3">
            {questions.map((item, questionIndex) => {
              const isCaptured = item.status === 'captured';
              const isNeedsConfirmation = String(item.answer || '').toLowerCase().startsWith('needs confirmation');
              return (
                <div key={`alignment-question-${questionIndex}`} className={`rounded-[8px] border bg-white p-3 ${isCaptured ? 'border-[#BDE0CE]' : 'border-[#E8C9A8]'}`} data-testid={`alignment-question-row-${questionIndex}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F4F2EC] text-[11px] font-semibold text-[#4F3E2F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {questionIndex + 1}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isCaptured ? 'bg-[#E8F3ED] text-[#1F4A3A]' : 'bg-[#FBF1E4] text-[#7A5A1E]'}`}
                        data-testid={`alignment-question-status-${questionIndex}`}
                      >
                        {isCaptured ? 'Captured' : 'Needs confirmation'}
                      </span>
                    </div>
                    <button type="button" onClick={() => removeQuestion(questionIndex)} className="rounded-md p-1.5 text-[#B54A37] hover:bg-[#FBF1EE]" aria-label={`Remove Alignment Snapshot field ${questionIndex + 1}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(280px,1.1fr)]">
                    <TextInput label="Alignment field" value={item.question} onChange={(value) => updateQuestion(questionIndex, { question: value })} />
                    <TextInput
                      label={isNeedsConfirmation ? 'Brand response / comment (needs confirmation)' : 'Brand response / comment'}
                      rows={4}
                      value={item.answer}
                      onChange={(value) => updateQuestion(questionIndex, { answer: value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </fieldset>
  );
};
export const V3BusinessCaseFrameSnapshot = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id, bundle, reload } = useBusinessCaseBundle();
  // One Connect call can produce several snapshots. Admin edits/sends/approves
  // each one separately: the list below switches which snapshot this editor is
  // bound to. Deep-linkable via ?snapshot=<id> (used by the CRM project rows).
  const allSnapshots = Array.isArray(bundle?.alignment_snapshots) && bundle.alignment_snapshots.length
    ? bundle.alignment_snapshots
    : (bundle?.alignment_snapshot ? [bundle.alignment_snapshot] : []);
  const querySnapshotId = new URLSearchParams(location.search || '').get('snapshot') || '';
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(querySnapshotId);
  const snapshot = allSnapshots.find((s) => s.id === selectedSnapshotId)
    || bundle?.alignment_snapshot
    || allSnapshots[0]
    || null;
  const [notice, setNotice] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendPopup, setSendPopup] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [frameRefreshCount, setFrameRefreshCount] = useState(0);
  const stage = bundle?.business_case?.stage;
  const brand = getBrand(bundle);
  const brandEmail = brand?.email || brand?.contact_email || brand?.primary_contact_email || '';
  const activeSnapshot = draft || snapshot;
  const hasSnapshot = Boolean(activeSnapshot?.title || activeSnapshot?.meta || activeSnapshot?.sections?.length);
  const preparingFrame = Boolean(location.state?.preparingFrame);
  // Brand comments on the alignment snapshot, shown right on this page so
  // admin sees and works on them without hunting for the admin-review page.
  const alignmentComments = Array.isArray(snapshot?.brand_comments) ? snapshot.brand_comments : [];

  // If admin arrived from a notification click (#brand-comments), scroll the
  // Brand Comments card into view once the snapshot is loaded.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#brand-comments') return;
    if (!alignmentComments.length) return;
    const el = document.querySelector('[data-testid="alignment-snapshot-brand-comments"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [alignmentComments.length, snapshot?.id]);

  useEffect(() => {
    // Defensive: only adopt the persisted snapshot when it actually has content.
    // Never overwrite a populated local draft with a null/empty bundle value -
    // that's what caused the "snapshot disappears on refresh" symptom whenever
    // a reload race produced a transient null alignment_snapshot in the bundle.
    const next = cloneAlignmentSnapshot(snapshot);
    if (next && (next.title || next.meta || (next.sections || []).length)) {
      setDraft(next);
    }
  }, [snapshot]);

  useEffect(() => {
    if (brandEmail) {
      setRecipientEmail(brandEmail);
    }
  }, [brandEmail, id]);

  // Refetch when admin returns to this tab so brand-side changes (priority
  // picks, comments, approvals) show up immediately without a manual refresh.
  useEffect(() => {
    const onFocus = () => { reload().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [reload]);

  useEffect(() => {
    if (!preparingFrame || hasSnapshot || frameRefreshCount >= 10) return undefined;
    const timer = window.setTimeout(() => {
      reload().finally(() => setFrameRefreshCount((count) => count + 1));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [frameRefreshCount, hasSnapshot, preparingFrame, reload]);

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
    if (generating) return;
    setNotice(null);
    setGenerating(true);
    try {
      const generated = await v3GenerateAlignmentQuestions(id);
      setDraft(cloneAlignmentSnapshot(generated));
      await reload();
      setNotice('Alignment Snapshot generated. Send it to the brand for review, comments, or approval before admin approval.');
    } catch (e) {
      const detail = e?.response?.data?.detail;
      if (e?.response?.status === 400 && String(detail || '').includes('Frame stage')) {
        setNotice("Can't generate the Alignment Snapshot yet. Complete the Connect stage and move this Business Case to Frame first.");
        setGenerating(false);
        return;
      }
      // The analyser keeps running server-side after a client/gateway timeout,
      // so the snapshot is often written even though this request errored.
      // Re-read before crying failure - otherwise admin is told it failed and
      // regenerates a snapshot that already exists.
      const timedOut = !e?.response
        || e?.code === 'ECONNABORTED'
        || [502, 503, 504, 520, 522, 524].includes(Number(e?.response?.status));
      if (timedOut) {
        try {
          const bundle = await reload();
          const landed = bundle?.alignment_snapshots?.length
            ? bundle.alignment_snapshots[bundle.alignment_snapshots.length - 1]
            : bundle?.alignment_snapshot;
          if (landed && (landed.sections || []).length) {
            setDraft(cloneAlignmentSnapshot(landed));
            setNotice('Alignment Snapshot generated. It took longer than usual, so it was recovered after the page timed out - review it below before sending to the brand.');
            setGenerating(false);
            return;
          }
        } catch (reloadError) {
          // fall through to the error notice below
        }
        setNotice('The Alignment Snapshot is taking longer than usual to generate. It may still be running - wait a moment and reload before trying again.');
        setGenerating(false);
        return;
      }
      setNotice(detail || 'Could not generate the Alignment Snapshot. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Approved by BOTH the brand and TASCK => final. The server enforces this
  // too (409 on PATCH); this just stops the admin typing into a document that
  // can no longer be saved.
  const snapshotLocked = Boolean(
    (activeSnapshot?.brand_approved || activeSnapshot?.brand_approved_at)
    && (activeSnapshot?.approved_at || String(activeSnapshot?.status || '').toLowerCase() === 'approved')
  );

  const saveEdits = async () => {
    setNotice(null);
    if (snapshotLocked) {
      setNotice('This Alignment Snapshot is approved by both the brand and TASCK, so it is locked.');
      return;
    }
    try {
      await persistDraft();
      setNotice('Alignment Snapshot edits saved.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save Alignment Snapshot edits.');
    }
  };

  const approveSnapshot = async () => {
    setNotice(null);
    setSendPopup({ title: 'Approving', message: 'Approving the Alignment Snapshot and opening the Creator Selector (still in Framing)…', tone: 'pending' });
    try {
      await persistDraft();
      await v3ApproveAlignmentAs(id, 'admin', 'admin', activeSnapshot?.id || undefined);
      // The backend stage advances frame -> plan so the Brainstorm/Brief/Strategy
      // Snapshot data slots become writable. The UI keeps the user in Framing.
      if (stage === 'frame') {
        await v3AdvanceBusinessCase(id, {
          actor: 'admin',
          override: true,
          reason: 'Alignment Snapshot approved by admin. Continue Framing in the Creator Selector.',
        });
      }
      await reload();
      setSendPopup({ title: 'Opening Creator Selector', message: 'Snapshot approved. Opening the Creator Selector transcript step.', tone: 'success' });
      window.setTimeout(() => navigate(adminRoute(`/business-cases/${id}/frame/brainstorm-transcript`)), 450);
    } catch (e) {
      setSendPopup(null);
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
    const link = `${window.location.origin}/brand/approvals`;
    if (!navigator.clipboard) {
      setNotice(`Brand review link: ${link}`);
      return;
    }
    navigator.clipboard.writeText(link)
      .then(() => setNotice('Brand review link copied.'))
      .catch(() => setNotice(`Brand review link: ${link}`));
  };

  const sendEmailToBrand = async () => {
    const recipient = recipientEmail.trim() || brandEmail || 'the registered brand email';
    setSendPopup({
      title: 'Sending',
      message: `Sending Alignment Snapshot to ${recipient}...`,
      tone: 'pending',
    });
    try {
      await persistDraft();
      const result = await v3SendAlignmentToBrand(id, {
        recipient_email: recipientEmail.trim() || undefined,
        // Send exactly the snapshot being edited, not just the primary one.
        snapshot_id: activeSnapshot?.id || undefined,
      });
      await reload();
      const status = result?.email?.status || 'queued';
      const deliveryError = result?.email?.delivery_error || '';
      const deliveredRecipient = result?.email?.to || recipientEmail.trim() || brandEmail;
      if (status === 'sent') {
        setSendPopup({
          title: 'Sent',
          message: `Alignment Snapshot sent to ${deliveredRecipient}. The editable Google Docs-compatible file is attached. If the brand can't find it, ask them to check the Spam / Promotions folder and mark it as safe so future TASCK emails land in their inbox.`,
          tone: 'success',
        });
      } else if (status === 'delivery_failed') {
        setSendPopup({
          title: 'Email not delivered',
          message: deliveryError || 'The SMTP server rejected the message. Check the SMTP credentials on the backend and retry.',
          tone: 'warning',
        });
      } else {
        setSendPopup({
          title: 'Email queued',
          message: deliveryError || `Alignment Snapshot queued for ${deliveredRecipient}. SMTP delivery is not configured yet on this environment.`,
          tone: 'warning',
        });
      }
    } catch (e) {
      setSendPopup({
        title: 'Email not sent',
        message: e?.response?.data?.detail || e?.message || 'Could not send the Alignment Snapshot. Generate it first.',
        tone: 'warning',
      });
    }
  };

  // "Send to Brand Page": publish the snapshot to the brand portal without
  // emailing anyone. A generated snapshot stays admin-only until this runs, so
  // admins can generate it, make their edits, and only then let the brand see it.
  const publishToBrandPage = async () => {
    if (!activeSnapshot?.id) {
      setNotice('Generate the Alignment Snapshot before sending it to the brand page.');
      return;
    }
    setPublishing(true);
    setSendPopup({
      title: 'Publishing',
      message: 'Making the Alignment Snapshot visible on the brand page...',
      tone: 'pending',
    });
    try {
      await persistDraft();
      const result = await v3PublishAlignmentToBrandPage(id, { snapshot_id: activeSnapshot.id });
      await reload();
      setSendPopup({
        title: 'Live on the brand page',
        message: result?.is_revision
          ? `The brand can now see Rev ${result.revision} of this Alignment Snapshot when they log in. No email was sent - use "Send Alignment Snapshot to brand" when you want to notify them.`
          : 'The brand can now see this Alignment Snapshot when they log in to their portal. No email was sent - use "Send Alignment Snapshot to brand" when you want to notify them.',
        tone: 'success',
      });
    } catch (e) {
      setSendPopup({
        title: 'Not published',
        message: e?.response?.data?.detail || e?.message || 'Could not publish the Alignment Snapshot to the brand page.',
        tone: 'warning',
      });
    } finally {
      setPublishing(false);
    }
  };

  const downloadGoogleDoc = () => {
    if (!activeSnapshot?.id) {
      setNotice('Generate the Alignment Snapshot before downloading it.');
      return;
    }
    window.open(v3AlignmentDocxUrl(activeSnapshot.id), '_blank');
    setNotice('Google Docs-compatible .docx document opened for download. Upload or open it in Google Docs to edit it.');
  };

  const shareWhatsApp = () => {
    if (!activeSnapshot) {
      setNotice('Generate the Alignment Snapshot before sharing it.');
      return;
    }
    const link = `${window.location.origin}/brand/approvals`;
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
    <FlowShell title="Alignment Snapshot" subtitle="Generate, edit, save, and send the snapshot to the Brand Portal and email for brand review, comments, or approval.">
      {alignmentComments.length > 0 && (
        <InfoCard title={`Brand Comments (${alignmentComments.length})`}>
          {/* Comments are scoped to THIS snapshot - name it so, when a Connect
              call produced several, admin knows exactly which campaign the
              brand is commenting on. */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#C7D7CF] bg-[#EAF4EE] px-3 py-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-[#1F4A3A]" />
            <span className="text-[11px] text-[#1F4A3A]">Comments on: <strong>{snapshot?.opportunity_title || snapshot?.title || 'this Alignment Snapshot'}</strong></span>
          </div>
          <div className="space-y-3" data-testid="alignment-snapshot-brand-comments">
            {alignmentComments.map((c, index) => (
              <BrandCommentCard key={c.id || index} comment={c} index={index} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#6E6657]">Edit the relevant section below to address each comment, save, then re-send to the brand.</p>
        </InfoCard>
      )}
      {/* Every Alignment Snapshot generated from this Connect call. Click one
          to edit/send/approve THAT snapshot; the brand's priority picks show
          here live (most urgent first, unranked last) and admin can override. */}
      {allSnapshots.length > 1 && (
        <InfoCard title={`Alignment Snapshots (${allSnapshots.length})`}>
          <p className="text-[12px] text-[#6E6657] mb-3">
            This Connect call produced several opportunities, so each has its own snapshot. Click one to edit it below,
            then send each to the brand - the brand ranks them by priority and that ranking shows here immediately.
          </p>
          <div className="space-y-2">
            {allSnapshots.map((snapshotItem) => {
              const isEditing = snapshot?.id === snapshotItem.id;
              return (
                <React.Fragment>
                <div
                  key={snapshotItem.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedSnapshotId(snapshotItem.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedSnapshotId(snapshotItem.id); }}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    isEditing ? 'border-[#1F4A3A] bg-[#EAF4EE]' : 'border-[#E8E4DB] bg-[#FBFAF7] hover:border-[#1F4A3A]'
                  }`}
                  data-testid={`snapshot-switch-${snapshotItem.id}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#1F1B18] truncate">
                        {snapshotItem.opportunity_title || snapshotItem.title || 'Alignment Snapshot'}
                      </p>
                      {isEditing && (
                        <span className="rounded-full bg-[#1F4A3A] px-2 py-0.5 text-[10px] font-semibold text-white">Editing</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8A8A8A]">
                      {cleanV1Text(String(snapshotItem.status || 'draft').replace(/[_-]+/g, ' '))}
                      {snapshotItem.priority_set_by ? ` · ranked by ${snapshotItem.priority_set_by}` : ' · not ranked yet'}
                    </p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <PrioritySelect
                      snapshotId={snapshotItem.id}
                      value={snapshotItem.priority}
                      actor="admin"
                      onChange={(next, error) => {
                        if (error) {
                          toast.error('Could not save the priority.');
                          return;
                        }
                        toast.success('Priority updated.');
                        reload();
                      }}
                    />
                  </div>
                </div>
                {/* Per-snapshot quick links: each snapshot owns its own Creator
                    Selector, Pitch Deck and Creative Brief, so deep-link into
                    that snapshot's segmented pages. */}
                <div className="mt-2 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    data-testid={`snapshot-open-cs-${snapshotItem.id}`}
                    onClick={() => navigate(adminRoute(`/business-cases/${id}/snapshot/${snapshotItem.id}/frame/creator-scan`))}
                    className="v3-btn-secondary text-[11px]"
                  >Creator Selector</button>
                  <button
                    type="button"
                    data-testid={`snapshot-open-pd-${snapshotItem.id}`}
                    onClick={() => navigate(adminRoute(`/business-cases/${id}/snapshot/${snapshotItem.id}/frame/pitch-deck`))}
                    className="v3-btn-secondary text-[11px]"
                  >Pitch Deck</button>
                  <button
                    type="button"
                    data-testid={`snapshot-open-brief-${snapshotItem.id}`}
                    onClick={() => navigate(adminRoute(`/business-cases/${id}/snapshot/${snapshotItem.id}/frame/brief`))}
                    className="v3-btn-secondary text-[11px]"
                  >Brief</button>
                </div>
                </React.Fragment>
              );
            })}
          </div>
        </InfoCard>
      )}
      <InfoCard
        title="Alignment Snapshot"
        action={(
          <div className="flex flex-wrap justify-end gap-2">
            {snapshot?.id && <PrioritySelect snapshotId={snapshot.id} value={snapshot.priority} actor="admin" onChange={(next, error) => { if (error) { toast.error('Could not save the priority.'); return; } toast.success('Priority updated.'); reload(); }} />}
            <button data-testid="alignment-generate-btn" onClick={generateSnapshot} disabled={generating} className="v3-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"><Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} /> {generating ? 'Generating…' : (hasSnapshot ? 'Regenerate Snapshot' : 'Generate Snapshot')}</button>
            <button data-testid="alignment-preview-btn" onClick={openPreview} className="v3-btn-secondary"><FileText className="w-3.5 h-3.5" /> Preview</button>
            <button data-testid="alignment-admin-approve-btn" onClick={approveSnapshot} className="v3-btn-secondary"><CheckCircle2 className="w-3.5 h-3.5" /> {snapshot?.brand_approved ? 'Admin approve & continue' : 'Admin approve'}</button>
          </div>
        )}
      >
        {notice && (
          <div data-testid="alignment-notice" className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-3 text-[12px] text-[#7A5A1E]">
            {notice}{stage && stage !== 'frame' ? ` (Current stage: ${bundle?.business_case?.stage_label || stage})` : ''}
          </div>
        )}

        {/* Revision indicator: shows the current revision and, if admin has
            saved edits since the last send, the sections that will be flagged
            as updated in the next re-send email. */}
        {hasSnapshot && Number(snapshot?.revision_number) >= 2 && (
          <div className="rounded-lg border border-[#C9D6EE] bg-[#EEF1F6] px-3 py-2 mb-3 text-[12px] text-[#3A5BA0] flex flex-wrap items-center gap-2" data-testid="alignment-revision-badge">
            <span className="font-semibold">Rev {snapshot.revision_number}</span>
            <span className="text-[#6E6657]">· last revised {formatDateTime(snapshot?.sent_to_brand_at)}</span>
          </div>
        )}
        {hasSnapshot && Array.isArray(snapshot?.pending_change_summary) && snapshot.pending_change_summary.length > 0 && (
          <div className="rounded-lg border border-[#C7D7CF] bg-[#EAF4EE] px-3 py-2 mb-3 text-[12px] text-[#1F4A3A]" data-testid="alignment-pending-changes">
            <span className="font-semibold">Pending on next send:</span> these sections were edited and will be flagged to the brand as updated —
            <span className="font-medium"> {snapshot.pending_change_summary.join(', ')}</span>.
          </div>
        )}

        {/* Brand approval reflection: the moment the brand approves this
            snapshot in their portal it shows here immediately (the brand
            approval is a distinct field, snapshot.brand_approved, not the
            overall status). The admin still has to click "Admin approve" to
            move the case to the next phase. */}
        {hasSnapshot && snapshot?.brand_approved && (
          <div className="rounded-lg border border-[#1F7A4D] bg-[#E8F5ED] px-3 py-2.5 mb-3 text-[12px] text-[#1F4A3A] flex flex-wrap items-center gap-2" data-testid="alignment-brand-approved-banner">
            <CheckCircle2 className="w-4 h-4 text-[#1F7A4D]" />
            <span className="font-semibold">Approved by brand</span>
            {snapshot.brand_approved_by ? <span>· {snapshot.brand_approved_by}</span> : null}
            {snapshot.brand_approved_at ? <span>· {formatDateTime(snapshot.brand_approved_at)}</span> : null}
            <span className="ml-auto text-[#2E7D5B]">Admin can now approve to move to the next phase.</span>
          </div>
        )}
        {hasSnapshot && !snapshot?.brand_approved && snapshot?.brand_viewed_at && (
          <div className="rounded-lg border border-[#C7D7CF] bg-[#F4F8F6] px-3 py-2 mb-3 text-[12px] text-[#4F6B5E] flex items-center gap-2" data-testid="alignment-brand-viewed-banner">
            <Eye className="w-4 h-4 text-[#4F6B5E]" />
            <span>Brand viewed this snapshot{snapshot.brand_viewed_at ? ` on ${formatDateTime(snapshot.brand_viewed_at)}` : ''}. Awaiting their approval.</span>
          </div>
        )}

        {!hasSnapshot ? (
          <div className="rounded-[8px] border border-dashed border-[#D7CBB8] bg-[#FBFAF7] p-5 text-[13px] text-[#6E6657]">
            {generating
              ? 'Generating the Alignment Snapshot from the Connect call. This can take up to a minute on the first run - please keep this page open.'
              : preparingFrame
                ? 'Preparing the Frame phase and Alignment Snapshot from the Connect transcripts. This will appear here shortly.'
                : bundle?.business_case?.frame?.alignment_snapshot_id ? (
                  <span>
                    A saved Alignment Snapshot exists for this Business Case but isn't loading right now.{' '}
                    <button type="button" onClick={() => reload()} className="underline font-medium text-[#1F4A3A]" data-testid="alignment-reload-btn">Click to reload</button>
                    {' '}or regenerate from the Connect call.
                  </span>
                ) : 'Generate the Alignment Snapshot so the brand can review it against the Connect call before admin approval.'}
          </div>
        ) : (
          <div className="space-y-4" data-testid="alignment-snapshot-editor">
            <AnalyzerSourceBanner source={activeSnapshot?.analysis_source} model={activeSnapshot?.analysis_model} />
            {activeSnapshot?.readiness && (
              <div
                className="rounded-[8px] border border-[#D7CBB8] bg-white p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center"
                data-testid="alignment-readiness-summary"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">Readiness</p>
                  <p className="text-[15px] font-semibold text-[#1A1A1A]">
                    {activeSnapshot.readiness.captured_count} of {activeSnapshot.readiness.total_count} fields captured ({activeSnapshot.readiness.percentage}%)
                  </p>
                  <p className="text-[12px] text-[#6E6657] mt-1">
                    Analysis source: {activeSnapshot.analysis_source || 'unknown'}
                    {activeSnapshot.analysis_model ? ` · ${activeSnapshot.analysis_model}` : ''}
                  </p>
                </div>
                <div className="rounded-md border border-[#BDE0CE] bg-[#E8F3ED] px-3 py-2 text-[12px] font-semibold text-[#1F4A3A]" data-testid="alignment-readiness-percentage">
                  {activeSnapshot.readiness.percentage}% ready
                </div>
              </div>
            )}
            <div className="rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-4">
              {snapshotLocked && (
                <div className="mb-3 rounded-lg border border-[#C7D7CF] bg-[#EAF4EE] px-3 py-2 text-[12px] text-[#1F4A3A]" data-testid="alignment-locked-notice">
                  <span className="font-semibold">Locked.</span> The brand and TASCK have both approved this Alignment Snapshot, so it stays exactly as agreed. Generate a new snapshot if the project has changed.
                </div>
              )}
              <TextInput label="Snapshot title" value={activeSnapshot?.title || ''} disabled={snapshotLocked} onChange={(value) => setDraft({ ...(activeSnapshot || {}), title: value })} />
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={saveEdits} disabled={snapshotLocked} className="v3-btn-primary disabled:opacity-60 disabled:cursor-not-allowed" data-testid="alignment-save-edits-btn"><Save className="w-3.5 h-3.5" /> Save edits</button>
              </div>
            </div>

            {/* A locked snapshot drops the onChange handlers, so the agreed
                document is read-only rather than accepting edits that the
                server would then reject. */}
            {(activeSnapshot?.sections || []).map((section, index) => (
              isAlignmentQuestionSection(section) ? (
                <AlignmentQuestionEditor
                  key={`${section.heading || 'questions'}-${index}`}
                  section={section}
                  index={index}
                  readOnly={snapshotLocked}
                  onChange={snapshotLocked ? () => {} : (nextSection) => updateSection(index, nextSection)}
                />
              ) : (
                <AlignmentSectionEditor
                  key={`${section.heading || 'section'}-${index}`}
                  section={section}
                  index={index}
                  readOnly={snapshotLocked}
                  onChange={snapshotLocked ? () => {} : (nextSection) => updateSection(index, nextSection)}
                />
              )
            ))}
          </div>
        )}

        <div data-testid="alignment-share-options" className="mt-4 rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-3">
            <label className="mb-3 block max-w-xl">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Brand email / test email</span>
              <input
                type="email"
                value={recipientEmail}
                onChange={(event) => setRecipientEmail(event.target.value)}
                placeholder={brandEmail || 'name@brand.com'}
                className="mt-1 w-full rounded-md border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#1F4A3A]"
                data-testid="alignment-recipient-email"
              />
            </label>
            {/* Visibility state: a generated snapshot is admin-only until
                "Send to brand page" is clicked, so admin can edit in peace. */}
            <div
              className={'mb-3 rounded-lg border px-3 py-2 text-[12px] ' + (activeSnapshot?.sent_to_brand_at
                ? 'border-[#C7D7CF] bg-[#EAF4EE] text-[#1F4A3A]'
                : 'border-[#E5C99A] bg-[#FBF4E4] text-[#7A5A1E]')}
              data-testid="alignment-brand-visibility"
            >
              {activeSnapshot?.sent_to_brand_at
                ? `Visible on the brand page since ${formatDateTime(activeSnapshot.sent_to_brand_at)}. Saved edits go live immediately.`
                : 'Admin-only. The brand cannot see this snapshot yet - click "Send to brand page" when you are ready.'}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                data-testid="alignment-send-brand-page-btn"
                onClick={publishToBrandPage}
                disabled={publishing || !activeSnapshot?.id}
                className="v3-btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Send className={`w-3.5 h-3.5 ${publishing ? 'animate-pulse' : ''}`} />
                {publishing ? 'Publishing…' : (activeSnapshot?.sent_to_brand_at ? 'Update brand page' : 'Send to brand page')}
              </button>
              <button data-testid="alignment-email-brand-btn" onClick={sendEmailToBrand} className="v3-btn-secondary"><Mail className="w-3.5 h-3.5" /> Send Alignment Snapshot to brand</button>
              <button data-testid="alignment-copy-link-btn" onClick={copyBrandReviewLink} className="v3-btn-secondary"><FileText className="w-3.5 h-3.5" /> Copy link</button>
              <button data-testid="alignment-download-google-docs-btn" onClick={downloadGoogleDoc} className="v3-btn-secondary"><Download className="w-3.5 h-3.5" /> Download Google Docs</button>
              <button data-testid="alignment-whatsapp-share-btn" onClick={shareWhatsApp} className="v3-btn-secondary"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp share</button>
            </div>
            <p className="mt-2 text-[12px] text-[#6E6657]">Save edits first if you changed the snapshot. <span className="font-semibold">Send to brand page</span> makes it visible in the brand portal without emailing; <span className="font-semibold">Send Alignment Snapshot to brand</span> publishes it and emails the brand.</p>
          </div>
        {sendPopup && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4" data-testid="alignment-sent-popup">
            <div className="w-full max-w-sm rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-5 shadow-2xl">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full ${sendPopup.tone === 'success' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : 'bg-[#FBF4E4] text-[#7A5A1E]'}`}>
                  {sendPopup.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                </span>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{sendPopup.title}</h3>
              </div>
              <p className="text-[13px] leading-6 text-[#4F3E2F]">{sendPopup.message}</p>
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setSendPopup(null)} className="v3-btn-primary" data-testid="alignment-sent-popup-close">OK</button>
              </div>
            </div>
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
                      {section.content && <p className="text-[13px] leading-6 text-[#4F3E2F]">{cleanV1Text(section.content)}</p>}
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
                                    {cells.map((cell, cellIndex) => (
                                      <td key={`preview-cell-${rowIndex}-${cellIndex}`} className="px-3 py-2 align-top text-[#4F3E2F] whitespace-pre-line">
                                        {renderAlignmentCell(cell)}
                                      </td>
                                    ))}
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
  return <FlowShell title="Waiting for Brand Response" subtitle="Track snapshot status, sent date, brand email, reminders, comments, and approval."><InfoCard title="Brand response status"><p className="text-[13px]">Status: {snap.status || 'not sent'}</p><p className="text-[13px]">Sent: {snap.sent_to_brand_at || snap.shared_at || 'Pending'}</p><p className="text-[13px] mt-2">Comments: {(snap.brand_comments || []).length}</p></InfoCard></FlowShell>;
};

export const V3BusinessCaseFrameAdminReview = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const snapshot = bundle?.alignment_snapshot;
  const comments = snapshot?.brand_comments || [];
  const isApproved = snapshot?.status === 'approved';
  const approvedBy = snapshot?.approved_by;
  const approvedAt = snapshot?.approved_at;
  const [notice, setNotice] = useState(null);

  const handleApproveAndProceed = async () => {
    setNotice(null);
    try {
      await v3ApproveAlignmentAs(id, 'admin', 'admin');
      const stage = bundle?.business_case?.stage;
      if (stage === 'frame') {
        await v3AdvanceBusinessCase(id, {
          actor: 'admin',
          override: true,
          reason: 'Alignment Snapshot approved from Admin Review page.',
        });
      }
      await reload();
      navigate(adminRoute('/business-cases'));
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not approve and advance. Try generating and approving from the Snapshot page first.');
    }
  };

  return (
    <FlowShell title="Brand Responses / Admin Review" subtitle="Review the brand answers and comments, edit the Alignment Snapshot questions if needed, and approve when complete.">
      {notice && (
        <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-3 text-[12px] text-[#7A5A1E]">
          {notice}
        </div>
      )}

      {/* Brand Approval Status */}
      {isApproved && (
        <div className="rounded-xl border-2 border-[#2E7D5B] bg-[#E8F5ED] p-4 mb-4 flex items-center gap-3" data-testid="admin-review-approved-banner">
          <CheckCircle2 className="w-6 h-6 text-[#2E7D5B] flex-shrink-0" />
          <div>
            <p className="text-[14px] font-bold text-[#1A5E3C]">Alignment Snapshot Approved by Brand</p>
            <p className="text-[12px] text-[#2E7D5B] mt-0.5">
              Approved by <strong>{approvedBy || 'Brand'}</strong>
              {approvedAt && <> on {new Date(approvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(approvedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</>}
            </p>
          </div>
        </div>
      )}

      <InfoCard title={`Brand Comments (${comments.length})`}>
        {comments.length ? (
          <div className="space-y-3">
            {comments.map((c, index) => (
              <BrandCommentCard key={c.id || index} comment={c} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[#D7CBB8] bg-[#FBFAF7] p-5 text-center text-[13px] text-[#6E6657]">
            No brand comments yet. Once the brand reviews the Alignment Snapshot, their feedback will appear here highlighted in amber.
          </div>
        )}
      </InfoCard>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/snapshot`))} className="v3-btn-secondary flex items-center gap-1.5" data-testid="admin-review-back-to-snapshot">
          <Edit3 className="w-3.5 h-3.5" /> Edit Alignment Snapshot
        </button>
        <button onClick={handleApproveAndProceed} className="v3-btn-primary flex items-center gap-1.5" data-testid="admin-review-proceed-brainstorm">
          <ArrowRight className="w-3.5 h-3.5" /> Approve & Open Business Cases
        </button>
      </div>
    </FlowShell>
  );
};

export const V3BusinessCaseFrameApproved = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const snap = bundle?.alignment_snapshot || {};
  return <FlowShell title="Alignment Approved"><InfoCard title="Approval status"><p className="text-[13px]">Approved by: {snap.approved_by || 'Pending'}</p><p className="text-[13px]">Approved at: {snap.approved_at || 'Pending'}</p><button onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/brainstorm-transcript`))} className="v3-btn-primary mt-4">Continue to Creator Selector</button></InfoCard></FlowShell>;
};

export const V1BusinessCaseFrameTranscripts = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const [transcripts, setTranscripts] = useState([]);
  const [notice, setNotice] = useState('');
  const [generating, setGenerating] = useState(false);

  const saveTranscripts = (newTranscripts) => {
    setTranscripts(newTranscripts);
  };

  const addTranscript = () => {
    const newTranscript = {
      id: `transcript-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      session: `Session ${transcripts.length + 1}`,
      content: '',
    };
    saveTranscripts([...transcripts, newTranscript]);
  };

  const removeTranscript = (transcriptId) => {
    saveTranscripts(transcripts.filter(t => t.id !== transcriptId));
  };

  const updateTranscript = (transcriptId, field, value) => {
    saveTranscripts(transcripts.map(t => 
      t.id === transcriptId ? { ...t, [field]: value } : t
    ));
  };

  const uploadTranscriptFile = async (transcriptId, file) => {
    if (!file) return;
    try {
      const content = await file.text();
      updateTranscript(transcriptId, 'content', content);
      setNotice(`${file.name} loaded into this transcript session.`);
    } catch (error) {
      setNotice(error?.message || 'Could not read the uploaded transcript file.');
    }
  };

  const generateAlignmentSnapshot = async () => {
    setGenerating(true);
    setNotice('Generating alignment snapshot from transcripts...');
    try {
      const brandId = bc.brand_id || brand.id;
      const cleanTranscripts = transcripts.filter((item) => item.content && item.content.trim());
      if (!brandId) {
        setNotice('Brand id is missing on this Business Case.');
        return;
      }
      if (!cleanTranscripts.length) {
        setNotice('Upload or paste at least one transcript before generating the Alignment Snapshot.');
        return;
      }
      const result = await v3GenerateAlignmentFromTranscripts(brandId, cleanTranscripts);

      await reload();
      setNotice('Alignment snapshot generated from all transcript sessions.');
      navigate(adminRoute(`/business-cases/${result.business_case_id || id}/frame/snapshot`));
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Failed to generate alignment snapshot.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <FlowShell 
      title="Upload Call Transcripts"
      subtitle="Add each call as its own dated session. TASCK scans all transcripts together before creating the Alignment Snapshot questions."
    >
      {notice && (
        <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 mb-4 text-[12px] text-[#7A5A1E]">
          {notice}
        </div>
      )}

      <InfoCard 
        title="Transcripts" 
        action={
          <button type="button" onClick={addTranscript} className="v3-btn-primary text-[12px] flex items-center gap-1" data-testid="connect-add-transcript-btn-secondary">
            <Plus className="w-3.5 h-3.5" /> Add Transcript
          </button>
        }
      >
        {transcripts.length === 0 ? (
          <p className="text-[13px] text-[#8A8A8A]">No transcripts yet. Click "Add Transcript" to get started.</p>
        ) : (
          <div className="space-y-4">
            {transcripts.map((transcript) => (
              <div key={transcript.id} className="rounded-xl border border-[#E8E4DB] bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-[#F1ECDF] pb-3">
                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Date</label>
                      <input
                        type="date"
                        value={transcript.date}
                        onChange={(e) => updateTranscript(transcript.id, 'date', e.target.value)}
                        className="w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Session Name</label>
                      <input
                        type="text"
                        value={transcript.session}
                        onChange={(e) => updateTranscript(transcript.id, 'session', e.target.value)}
                        className="w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => removeTranscript(transcript.id)}
                    className="p-1.5 text-[#B54A37] hover:bg-[#FBF1EE] rounded-md"
                    aria-label="Remove transcript"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Transcript Content</label>
                    <label className="v3-btn-secondary cursor-pointer text-[11px]">
                      <Upload className="w-3.5 h-3.5" /> Upload Meeting Transcript
                      <input type="file" accept=".txt,.md,.doc,.docx,text/plain" className="hidden" onChange={(event) => uploadTranscriptFile(transcript.id, event.target.files?.[0])} />
                    </label>
                  </div>
                  <textarea
                    value={transcript.content}
                    onChange={(e) => updateTranscript(transcript.id, 'content', e.target.value)}
                    rows={6}
                    placeholder="Paste your transcript here..."
                    className="w-full rounded-md border border-[#E8E4DB] bg-[#FBFAF7] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {transcripts.length > 0 && (
        <div className="mt-4">
          <button
            onClick={generateAlignmentSnapshot}
            disabled={generating || transcripts.some(t => !t.content.trim())}
            className="v3-btn-primary flex items-center gap-1.5"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Generating Alignment Snapshot...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Generate Alignment Snapshot from Transcripts
              </>
            )}
          </button>
        </div>
      )}
    </FlowShell>
  );
};

const BS_VOICE_TYPES = ['Authority / Expert', 'Peer / Relatable', 'Entertainer / Cultural Driver', 'Niche Specialist'];
const BS_AUDIENCE_REL = ['Trust-driven', 'Reach-driven', 'Conversion-driven', 'Community-driven'];
const BS_FORMAT_STRENGTH = ['Short-form conversion', 'Long-form storytelling', 'Live / real-time', 'Series-based'];
const BS_BUDGET = ['Low', 'Mid', 'Premium'];
const BS_EFFICIENCY = ['High conversion', 'High reach', 'Balanced'];
const BS_TIMING = ['Immediate', 'Gradual'];

// IMPORTANT: do NOT run cleanV1Text() on the input/textarea value here.
// cleanV1Text() does .trim() and collapses repeated whitespace - that breaks
// live typing because it strips the trailing space the user just pressed
// before the next character lands, so spaces appear to "not work" across
// every brainstorm phase. cleanV1Text() is a display-time sanitizer for
// static rendering (smart-quote -> dash, encoding fixes); editable inputs
// must use the raw value so the user can type freely.
//
// We always render a <textarea>, even for rows=1 - that way pressing Enter
// inserts a newline instead of doing nothing (bare HTML <input>) or
// accidentally submitting a form.
const BSField = ({ label, hint, value, onChange, rows = 2, placeholder = '' }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    {hint && <span className="block text-[11px] text-[#6E6657] mt-0.5">{hint}</span>}
    <textarea
      value={value || ''}
      placeholder={placeholder}
      rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none leading-relaxed"
    />
  </label>
);

const BSSelect = ({ label, options, value, onChange }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none">
      <option value="">Select one</option>
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

// ============================================================================
// Brainstorm Transcript Upload (Framing step 2a - BEFORE the brainstorm form)
// ----------------------------------------------------------------------------
// Opens right after the Alignment Snapshot is approved. The admin:
//   1. Reviews the suggested questions to ask during the brainstorm session.
//   2. Pastes / uploads the brainstorm-session transcript.
//   3. Clicks Analyze - Claude reads the transcript and fills the ENTIRE
//      TTA Creator Selector (all phases) automatically.
//   4. Continues to the brainstorm form, now pre-filled, to review/edit.
// ============================================================================
export const V3BusinessCasePlanBrainstormTranscript = () => {
  const navigate = useNavigate();
  const { id, snapshotId: urlSnapshotId, bundle } = useBusinessCaseBundle();
  // The Creator Selector is unique per Alignment Snapshot - pick the snapshot
  // in scope from the URL, then fall back to the business case's active one.
  const activeSnapshotId = urlSnapshotId
    || bundle?.business_case?.frame?.alignment_snapshot_id
    || bundle?.alignment_snapshot?.id
    || null;
  const [transcript, setTranscript] = useState('');
  const [questions, setQuestions] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [notice, setNotice] = useState('');
  const [popup, setPopup] = useState(null); // { status, message }

  useEffect(() => {
    if (!id) return;
    v3BrainstormSuggestedQuestions(id)
      .then((data) => setQuestions(Array.isArray(data?.questions) ? data.questions : []))
      .catch(() => setQuestions([]));
  }, [id]);

  const uploadFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      setTranscript((prev) => (prev ? `${prev}\n\n${text}` : text));
      setNotice(`${file.name} loaded into the transcript box.`);
    } catch (e) {
      setNotice('Could not read that file. Paste the transcript text instead.');
    }
  };

  const analyze = async () => {
    if (transcript.trim().length < 40) {
      setNotice('Paste or upload a fuller Creator Selector transcript before analyzing.');
      return;
    }
    if (!activeSnapshotId) {
      setNotice('This Business Case has no active Alignment Snapshot yet. Approve a snapshot first, then come back to run the Creator Selector.');
      return;
    }
    setNotice('');
    setAnalyzing(true);
    setPopup({ status: 'running', message: 'Reading the transcript and filling the TTA Creator Selector…' });
    try {
      await v3AnalyzeBrainstormTranscript(id, transcript.trim(), activeSnapshotId);
      setPopup({ status: 'complete', message: 'Creator Selector filled from the transcript. Opening it to review and edit.' });
      setTimeout(() => navigate(adminRoute(`/business-cases/${id}/frame/brainstorm`)), 800);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not analyze the transcript.';
      setPopup({ status: 'failed', message: msg });
    } finally {
      setAnalyzing(false);
    }
  };

  const skipTranscriptForExistingBrand = async () => {
    if (!window.confirm('Skip transcript entirely? Only do this when this brand is already past the Creator Selection stage in their CRM. The Framing flow will jump straight to the Creator Match Scanner.')) return;
    setNotice('');
    setAnalyzing(true);
    setPopup({ status: 'running', message: 'Marking this brand past the transcript stage…' });
    try {
      await v3SkipBrainstormTranscript(id);
      setPopup({ status: 'complete', message: 'Transcript step skipped. Jumping to the Creator Match Scanner.' });
      setTimeout(() => navigate(adminRoute(`/business-cases/${id}/frame/creator-scan`)), 700);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'Could not skip the transcript step.';
      setPopup({ status: 'failed', message: msg });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <FlowShell
      title="Creator Selector & Transcript Analysis"
      subtitle="Run the creator selection session using the suggested questions, then upload the transcript here. Claude will analyse it and fill the entire Creator Selector for you to review."
    >
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}

      <InfoCard title="Suggested questions for creator selection">
        <p className="text-[12px] text-[#6E6657] mb-3">Cover these during the creator selection session so the transcript answers everything the Creator Selector needs.</p>
        {questions.length === 0 ? (
          <p className="text-[12px] text-[#8A8A8A]">Loading suggested questions…</p>
        ) : (
          <ol className="list-decimal ml-5 space-y-1.5 text-[13px] text-[#4F3E2F]">
            {questions.map((q, idx) => <li key={idx}>{q}</li>)}
          </ol>
        )}
      </InfoCard>

      <InfoCard
        title="Upload / paste the creator selection transcript"
        action={(
          <label htmlFor="brainstorm-transcript-file" className="v3-btn-secondary text-[11px] cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Upload file
            <input
              id="brainstorm-transcript-file"
              type="file"
              accept=".txt,.md,.vtt,.srt,text/plain"
              className="hidden"
              onChange={(e) => { uploadFile(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
        )}
      >
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={12}
          placeholder="Paste the full creator selection transcript here, or use Upload file above. The more complete the transcript, the richer the auto-filled Creator Selector."
          className="w-full text-[13px] rounded-md border border-[#D7CBB8] bg-white px-3 py-2 text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none leading-relaxed"
          data-testid="brainstorm-transcript-input"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-[#6E6657]">{transcript.trim().length} characters</p>
          <button onClick={analyze} disabled={analyzing} className="v3-btn-primary disabled:opacity-60" data-testid="brainstorm-analyze-btn">
            <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} /> {analyzing ? 'Analyzing…' : 'Analyze & fill Creator Selector'}
          </button>
        </div>
        <div className="mt-4 border-t border-[#F1ECDF] pt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/brainstorm`))}
            className="v3-btn-secondary text-[12px]"
            data-testid="brainstorm-skip-to-form"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Skip and fill creator selection manually
          </button>
          <button
            type="button"
            onClick={skipTranscriptForExistingBrand}
            disabled={analyzing}
            className="v3-btn-secondary text-[12px] disabled:opacity-60"
            title="Use only when this brand is already past the Creator Selection stage on their CRM"
            data-testid="brainstorm-skip-transcript-existing"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Skip transcript - brand already past this stage
          </button>
          <p className="text-[11px] text-[#8A8A8A]">No transcript? Open the Creator Selector and fill each field yourself, or skip entirely if this brand is a returning one.</p>
        </div>
      </InfoCard>

      {popup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" data-testid="brainstorm-analyze-popup">
          <div className="w-full max-w-md rounded-[10px] border border-[#D7CBB8] bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${popup.status === 'complete' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : popup.status === 'failed' ? 'bg-[#FBEAE5] text-[#B54A37]' : 'bg-[#EFF5F1] text-[#1F4A3A]'}`}>
                {popup.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : popup.status === 'failed' ? <X className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </span>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                {popup.status === 'complete' ? 'Creator Selector filled' : popup.status === 'failed' ? 'Analysis failed' : 'Analyzing transcript'}
              </h3>
            </div>
            <p className="text-[13px] leading-6 text-[#4F3E2F]">{popup.message}</p>
            {popup.status === 'failed' && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setPopup(null)} className="v3-btn-primary" data-testid="brainstorm-analyze-popup-close">OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </FlowShell>
  );
};

// The eight Creator Selector fields (client-specified). Mirrors
// CREATOR_SELECTOR_FIELDS in backend/v3_routes.py - keep keys in sync.
const CREATOR_SELECTOR_FIELDS = [
  { key: 'audience_platform', label: 'Where is this audience (Platform)', hint: 'The platforms where this audience actually lives - e.g. Instagram, TikTok, YouTube, WhatsApp, radio.', placeholder: 'e.g. Instagram and TikTok first, YouTube for long-form...' },
  { key: 'top_of_funnel_size', label: 'Top of Funnel Audience Size', hint: 'How large is the reachable audience at the top of the funnel? Estimates and sources are fine.', placeholder: 'e.g. ~2.5m reachable 18-30s across target platforms...' },
  { key: 'funnel_milestones', label: 'What are the Funnel Milestones', hint: 'The steps from first touch to the target action.', placeholder: 'e.g. view -> follow -> click -> sign-up -> first purchase -> repeat...' },
  { key: 'timelines', label: 'Timelines', hint: 'Key dates and phases - launch windows, campaign length, reporting points.', placeholder: 'e.g. 6-week launch burst from March, reporting at week 3 and 6...' },
  { key: 'risks', label: 'Risks', hint: 'The biggest risks to this working - audience, creator, market, or execution risks.', placeholder: 'e.g. audience distrust of app promos; creator availability...' },
  { key: 'risk_mitigation', label: 'Risk Mitigation', hint: 'How each named risk is reduced or handled.', placeholder: 'e.g. proof-led content first; back-up creator shortlist...' },
  { key: 'budget_assumption', label: 'Budget Assumption', hint: 'The working budget level and what it is expected to buy.', placeholder: 'e.g. mid-level budget covering 3 creators + boosted posts...' },
  { key: 'creator_matches', label: 'Creator Matches', hint: 'Creators discussed for this project - one per line. The Creator Match Scanner auto-selects these from the database.', placeholder: 'One creator per line, e.g. Temi Adebayo / Chef Kanyin / Streetstyle Lagos' },
];

export const V3BusinessCasePlanBrainstorm = () => {
  const navigate = useNavigate();
  const { id, snapshotId: urlSnapshotId, bundle } = useBusinessCaseBundle();
  const activeSnapshotId = urlSnapshotId
    || bundle?.business_case?.frame?.alignment_snapshot_id
    || bundle?.alignment_snapshot?.id
    || null;
  const [round, setRound] = useState(null);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  // Auto-create the round on page open so the admin never sees a "Start"
  // button - per Chioma's feedback the brainstorm should just appear.
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // We need to know which Alignment Snapshot is in scope BEFORE we load
      // or create the Creator Selector, so different snapshots on the same
      // Business Case each get their own selector document.
      if (!activeSnapshotId) {
        // Bundle may still be resolving - wait for it before deciding.
        if (bundle === null || bundle === undefined) return;
        if (!cancelled) {
          setNotice('This Business Case has no active Alignment Snapshot yet. Approve a snapshot to unlock the Creator Selector.');
          setBootstrapping(false);
        }
        return;
      }
      try {
        const rows = await v3ListBrainstorms(id, activeSnapshotId);
        // Prefer a round whose alignment_snapshot_id matches the active one;
        // fall back to the newest matching row.
        const scoped = Array.isArray(rows)
          ? rows.filter((r) => r?.alignment_snapshot_id === activeSnapshotId)
          : [];
        const latest = scoped.length ? scoped[scoped.length - 1] : null;
        if (cancelled) return;
        if (latest) {
          setRound(latest);
        } else {
          // No round for this snapshot yet -> create one silently.
          const doc = await v3CreateBrainstorm({
            business_case_id: id,
            alignment_snapshot_id: activeSnapshotId,
            scored_creators: [],
          });
          if (cancelled) return;
          setRound(doc);
        }
      } catch (e) {
        if (!cancelled) setNotice(e?.response?.data?.detail || e?.message || 'Could not load brainstorm round.');
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, activeSnapshotId, bundle]);

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
        creator_selector: round.creator_selector,
        scored_creators: round.scored_creators,
      });
      setNotice('Creator Selector saved.');
      if (advance) navigate(adminRoute(`/business-cases/${id}/frame/creator-scan`));
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save brainstorm.');
    } finally {
      setSaving(false);
    }
  };

  if (!round) {
    return (
      <FlowShell title="The TTA Creator Selector" >
        {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
        <InfoCard title={bootstrapping ? 'Loading Creator Selector…' : 'Creator Selector unavailable'}>
          <p className="text-[13px] text-[#6E6657]">
            {bootstrapping ? 'Opening the TTA Creator Selector for this Business Case…' : 'Could not load or create the Creator Selector. Please refresh the page.'}
          </p>
        </InfoCard>
      </FlowShell>
    );
  }

  const selector = round.creator_selector || {};

  return (
    <FlowShell title="The TTA Creator Selector" subtitle="Review and edit the Creator Selector. If you uploaded a transcript, email, or WhatsApp conversation, these fields were auto-filled by Claude - check each one before continuing.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]" data-testid="brainstorm-notice">{notice}</div>}

      {/* The eight Creator Selector fields (client-specified). Each has its own
          box; admin fills them manually or Claude fills them from the uploaded
          transcript on the previous page. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="creator-selector-fields">
        {CREATOR_SELECTOR_FIELDS.map((field, index) => (
          <div key={field.key} className="v3-card p-4" data-testid={`creator-selector-${field.key}`}>
            <p className="text-[12px] font-semibold text-[#1A1A1A]">{index + 1}. {field.label}</p>
            <p className="text-[11px] text-[#8A8A8A] mt-0.5">{field.hint}</p>
            <textarea
              rows={field.key === 'creator_matches' ? 5 : 3}
              value={selector[field.key] || ''}
              onChange={(e) => updateField('creator_selector', field.key, e.target.value)}
              placeholder={field.placeholder}
              className="mt-2 w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none leading-relaxed"
            />
          </div>
        ))}
      </div>

      {round.transcript && (
        <InfoCard title="Session transcript">
          <p className="text-[11px] text-[#8A8A8A] mb-2">The conversation these fields were filled from. Reupload on the previous page to reanalyse.</p>
          <div className="max-h-48 overflow-y-auto rounded-md border border-[#E8E4DB] bg-[#FBFAF7] p-3 text-[12px] text-[#4F3E2F] whitespace-pre-wrap">{round.transcript}</div>
        </InfoCard>
      )}

      {/* Per Chioma's feedback: Save / Save & open Creator Scan now live at
          the BOTTOM of the page, not in a sticky top bar. Admin fills the
          whole brainstorm template and then hits Save once at the end. */}
      <InfoCard title="Save brainstorm">
        <p className="text-[12px] text-[#6E6657] mb-3">Save your progress at any point, or save and move on to the Creator Match Scanner.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => save(false)} disabled={saving} className="v3-btn-secondary" data-testid="brainstorm-save-btn">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => save(true)} disabled={saving} className="v3-btn-primary" data-testid="brainstorm-save-advance-btn">
            <ArrowRight className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save & open Creator Scan'}
          </button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

export const V3BusinessCasePlanCreatorScan = () => {
  const navigate = useNavigate();
  const { id, snapshotId, bundle } = useBusinessCaseBundle();
  const [creators, setCreators] = useState([]);
  const [matches, setMatches] = useState([]);
  const [manualCreatorId, setManualCreatorId] = useState('');
  // Seed the selection from whatever the case already has on plan.selected_creator_ids
  // so navigating back to the page shows the current shortlist.
  const seededFromCase = (bundle?.business_case?.plan?.selected_creator_ids) || [];
  const [selectedIds, setSelectedIds] = useState(Array.isArray(seededFromCase) ? seededFromCase : []);
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  // Scan progress popup. The creator scan is a single synchronous request
  // (no server-side progress), so we run a smooth simulated 0->100% bar that
  // holds near the top until the real result lands, then completes.
  const [scanPopup, setScanPopup] = useState({ open: false, progress: 0, status: 'running', message: 'Loading creators…' });
  const scanTickRef = useRef(null);
  const stopScanTick = () => {
    if (scanTickRef.current) { clearInterval(scanTickRef.current); scanTickRef.current = null; }
  };
  const startScanTick = () => {
    stopScanTick();
    scanTickRef.current = setInterval(() => {
      setScanPopup((prev) => {
        if (!prev.open || prev.status !== 'running') return prev;
        // Ease toward a ceiling below 100 so the bar never finishes before
        // the real result arrives; it locks to 100 when the scan resolves.
        const next = prev.progress < 92 ? prev.progress + (prev.progress < 40 ? 3 : prev.progress < 70 ? 2 : 1) : 92;
        return { ...prev, progress: next };
      });
    }, 350);
  };
  useEffect(() => () => stopScanTick(), []);
  useEffect(() => {
    v3GetCreators().then((rows) => {
      const list = Array.isArray(rows) ? rows : [];
      setCreators(list);
      setManualCreatorId(list[0]?.id || '');
    }).catch(() => setCreators([]));
  }, []);
  // Whenever the case loads/reloads, sync the local selection from the case
  // so a returning admin sees their previous shortlist.
  useEffect(() => {
    const persisted = bundle?.business_case?.plan?.selected_creator_ids;
    if (Array.isArray(persisted)) setSelectedIds(persisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.business_case?.id]);
  const creatorById = (creatorId) => creators.find((creator) => creator.id === creatorId);
  // Persist the shortlist to the backend so the Planning page Creator card
  // shows the picked creator immediately (no need to wait for the brief).
  // Fire-and-forget: the local UI state is the source of truth for this page.
  const persistSelectedIds = (nextIds) => {
    if (!id) return;
    v3UpdateSelectedCreators(id, nextIds, snapshotId).catch(() => { /* non-blocking */ });
  };
  const addCreator = (creatorId) => {
    if (!creatorId) return;
    setSelectedIds((current) => {
      if (current.includes(creatorId)) return current;
      const next = [...current, creatorId];
      persistSelectedIds(next);
      return next;
    });
    setNotice('');
  };
  const removeCreator = (creatorId) => setSelectedIds((current) => {
    const next = current.filter((idValue) => idValue !== creatorId);
    persistSelectedIds(next);
    return next;
  });
  // analysisSource records which engine produced the current matches.
  // Possible values:
  //   "emergent:gemini/..." | "anthropic:claude-..." | "openai:..."
  //   "deterministic_keyword_overlap" (fallback when no LLM key is set
  //   or the LLM call timed out / failed to parse).
  const [analysisSource, setAnalysisSource] = useState('');
  const [namedMatches, setNamedMatches] = useState([]);
  const [namedUnmatched, setNamedUnmatched] = useState([]);
  const runScan = async () => {
    setNotice('');
    setScanning(true);
    // Open the loading popup first so the admin sees immediate feedback.
    setScanPopup({ open: true, progress: 4, status: 'running', message: 'Loading creators…' });
    startScanTick();
    try {
      const data = await v3SuggestCreatorMatches(id);
      stopScanTick();
      setMatches(Array.isArray(data?.matches) ? data.matches : []);
      setAnalysisSource(data?.analysis_source || '');
      // Creators the team NAMED in the Creator Selector "Creator Matches"
      // field come back matched against the database - auto-select them so
      // admin only has to confirm. The AI list below is additions on top.
      const named = Array.isArray(data?.named_matches) ? data.named_matches : [];
      setNamedMatches(named);
      setNamedUnmatched(Array.isArray(data?.named_unmatched) ? data.named_unmatched : []);
      if (named.length) {
        setSelectedIds((current) => {
          const next = [...current];
          named.forEach((m) => {
            const creatorId = m?.creator?.id;
            if (creatorId && !next.includes(creatorId)) next.push(creatorId);
          });
          persistSelectedIds(next);
          return next;
        });
      }
      const found = (data?.matches || []).length + (named || []).length;
      setScanPopup({ open: true, progress: 100, status: 'complete', message: found ? `Found ${found} creator${found === 1 ? '' : 's'} matching accurately.` : 'Scan complete.' });
      // Auto-close shortly after completion so the admin lands on the results.
      setTimeout(() => setScanPopup((prev) => ({ ...prev, open: false })), 1100);
    } catch (e) {
      stopScanTick();
      const msg = e?.response?.data?.detail || e?.message || 'AI creator scan could not run yet.';
      setNotice(msg);
      setScanPopup({ open: true, progress: 100, status: 'failed', message: msg });
    } finally {
      setScanning(false);
    }
  };
  const analysisSourceLabel = (() => {
    if (!analysisSource) return '';
    if (analysisSource === 'deterministic_keyword_overlap') return 'Deterministic keyword fallback (no LLM key configured or the LLM did not respond in time).';
    if (analysisSource.startsWith('emergent:')) return `LLM ranking via Emergent (${analysisSource.replace('emergent:', '')}) - evidence-cited.`;
    if (analysisSource.startsWith('anthropic:')) return `LLM ranking via Anthropic Claude (${analysisSource.replace('anthropic:', '')}) - evidence-cited.`;
    if (analysisSource.startsWith('openai:')) return `LLM ranking via OpenAI (${analysisSource.replace('openai:', '')}) - evidence-cited.`;
    return `Ranking source: ${analysisSource}.`;
  })();
  const continueToBrief = () => {
    if (selectedIds.length === 0) {
      setNotice('Select at least one creator before generating briefs.');
      return;
    }
    // Entering the Brief FIRST: the Brief page links to the Pitch Deck, and
    // the Pitch Deck (second) page moves on to the Business Case.
    setFrameEntry(id, 'brief');
    navigate(adminRoute(`/business-cases/${id}/frame/brief?creators=${selectedCreatorQuery(selectedIds)}`));
  };
  const continueToPitchDeck = () => {
    if (selectedIds.length === 0) {
      setNotice('Select at least one creator before opening the Pitch Deck.');
      return;
    }
    // Entering the Pitch Deck FIRST: the Pitch Deck page links to the Brief,
    // and the Brief (second) page moves on to the Business Case.
    setFrameEntry(id, 'pitch');
    navigate(adminRoute(`/business-cases/${id}/frame/pitch-deck`));
  };
  const selectedCreators = selectedIds.map(creatorById).filter(Boolean);
  return (
    <FlowShell title="Creator Match Scanner" subtitle="Scan creators, manually choose creatives from the full database, and prepare one or more creators for briefing." nextAction="Pick one or more creators, then generate editable briefs for each selected creator.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      <InfoCard title="Matching criteria">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-[#4F3E2F]">
          <div className="rounded-md border border-[#E8E4DB] bg-[#FBFAF7] p-3"><strong>Audience and market fit:</strong> The scan compares the brand audience, buyer behavior, target geography, and culture cues from the Alignment Snapshot against creator audience and category data.</div>
          <div className="rounded-md border border-[#E8E4DB] bg-[#FBFAF7] p-3"><strong>Category and cultural role:</strong> Fashion, clothing, beauty, lifestyle, music, art, sport, food, and tech projects are weighted toward creators whose work naturally sits in that world.</div>
          <div className="rounded-md border border-[#E8E4DB] bg-[#FBFAF7] p-3"><strong>Format strength:</strong> The scanner checks whether the creator is stronger for short-form video, visual storytelling, PR moments, live events, community trust, or conversion-led content.</div>
          <div className="rounded-md border border-[#E8E4DB] bg-[#FBFAF7] p-3"><strong>Commercial reliability:</strong> Contact availability, reliability, brand safety, fee clarity, and delivery readiness are included so the recommendation is useful, not just popular.</div>
        </div>
        <p className="mt-3 text-[12px] text-[#6E6657]">For clothing and fashion brands, the backend gives extra weight to musicians, artists, stylists, fashion creators, visual-culture voices, and creators with strong streetwear or lifestyle credibility.</p>
      </InfoCard>
      <InfoCard title="Manual creator picker">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Creator database</span>
            <select value={manualCreatorId} onChange={(e) => setManualCreatorId(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]" data-testid="creator-manual-select">
              {creators.map((creator) => <option key={creator.id} value={creator.id}>{creatorName(creator)} - {creatorSpecialty(creator)}</option>)}
            </select>
          </label>
          <button onClick={() => addCreator(manualCreatorId)} className="v3-btn-primary" data-testid="creator-add-btn"><Plus className="w-3.5 h-3.5" /> Add creator</button>
        </div>
      </InfoCard>
      {(namedMatches.length > 0 || namedUnmatched.length > 0) && (
        <InfoCard title={`From your Creator Selector (${namedMatches.length} matched)`}>
          <p className="text-[12px] text-[#6E6657] mb-3">
            Creators you named in the Creator Selector "Creator Matches" field, found in the TASCK database and
            auto-selected below - untick any you no longer want before continuing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {namedMatches.map((match) => {
              const creator = match.creator || {};
              const picked = selectedIds.includes(creator.id);
              return (
                <div key={creator.id} className={`rounded-lg border p-3 ${picked ? 'border-[#1F4A3A] bg-[#EAF4EE]' : 'border-[#E8E4DB] bg-white'}`} data-testid={`named-match-${creator.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1F1B18]">{creatorName(creator)}</p>
                      <p className="text-[11px] text-[#8A8A8A]">{creatorSpecialty(creator)}</p>
                      <p className="text-[11px] text-[#1F4A3A] mt-1">Named by your team as "{match.matched_from}"</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (picked ? removeCreator(creator.id) : addCreator(creator.id))}
                      className={picked ? 'v3-btn-secondary text-[11px]' : 'v3-btn-primary text-[11px]'}
                    >
                      {picked ? 'Remove' : 'Add back'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {namedUnmatched.length > 0 && (
            <p className="mt-3 text-[11px] rounded-md border border-[#E5C99A] bg-[#FBF4E4] px-2.5 py-1.5 text-[#7A5A1E]">
              Not found in the creator database: {namedUnmatched.join(', ')}. Add them manually below or onboard them first.
            </p>
          )}
        </InfoCard>
      )}
      <InfoCard title="AI database scan" action={<button onClick={runScan} disabled={scanning} className="v3-btn-primary" data-testid="creator-ai-scan-btn"><Sparkles className="w-3.5 h-3.5" /> {scanning ? 'Scanning...' : 'Run AI scan'}</button>}>
        {analysisSourceLabel && (
          <p
            className={`mb-3 text-[11px] rounded-md border px-2.5 py-1.5 ${analysisSource === 'deterministic_keyword_overlap' ? 'border-[#E5C99A] bg-[#FBF4E4] text-[#7A5A1E]' : 'border-[#CFE0D6] bg-[#EFF5F1] text-[#1F4A3A]'}`}
            data-testid="creator-ai-scan-source"
          >
            {analysisSourceLabel}
          </p>
        )}
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
      <InfoCard title="Selected creators" action={(
        <div className="flex flex-wrap justify-end gap-2">
          {/* Either can be opened first; approving one opens the other, and
              when both are done the flow moves into Planning. */}
          <button onClick={continueToPitchDeck} className="v3-btn-secondary" data-testid="creator-open-pitch-deck-btn"><Presentation className="w-3.5 h-3.5" /> Open Pitch Deck</button>
          <button onClick={continueToBrief} className="v3-btn-primary" data-testid="creator-continue-brief-btn"><FileText className="w-3.5 h-3.5" /> Open Creator Brief</button>
        </div>
      )}>
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

      {scanPopup.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" data-testid="creator-scan-popup">
          <div className="w-full max-w-md rounded-[10px] border border-[#D7CBB8] bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${scanPopup.status === 'complete' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : scanPopup.status === 'failed' ? 'bg-[#FBEAE5] text-[#B54A37]' : 'bg-[#EFF5F1] text-[#1F4A3A]'}`}>
                {scanPopup.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : scanPopup.status === 'failed' ? <X className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </span>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                {scanPopup.status === 'complete' ? 'Creators ready' : scanPopup.status === 'failed' ? 'Scan failed' : 'Loading creators'}
              </h3>
              <span className="ml-auto text-[12px] font-semibold text-[#4F3E2F]" data-testid="creator-scan-popup-percent">{scanPopup.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F4F2EC] overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ease-out ${scanPopup.status === 'failed' ? 'bg-[#B54A37]' : 'bg-[#1F4A3A]'}`}
                style={{ width: `${Math.max(2, scanPopup.progress)}%` }}
                data-testid="creator-scan-popup-bar"
              />
            </div>
            <p className="text-[13px] leading-6 text-[#4F3E2F]" data-testid="creator-scan-popup-message">{scanPopup.message}</p>
            {scanPopup.status === 'running' && <p className="mt-1 text-[11px] text-[#6E6657]">Scanning the creator database for accurate matches. Please keep this page open.</p>}
            {scanPopup.status === 'failed' && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setScanPopup((prev) => ({ ...prev, open: false }))} className="v3-btn-primary" data-testid="creator-scan-popup-close">OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </FlowShell>
  );
};

export const V3BusinessCasePlanBrief = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { id, snapshotId, bundle } = useBusinessCaseBundle();
  const [creators, setCreators] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [manualCreatorId, setManualCreatorId] = useState('');
  const [briefs, setBriefs] = useState({});
  const [briefEmails, setBriefEmails] = useState({});
  const [sentBriefs, setSentBriefs] = useState({});
  const [sendPopup, setSendPopup] = useState(null);
  const [notice, setNotice] = useState('');
  // The brand-tailored brief in the approved TASCK 4-page template.
  const [templateBrief, setTemplateBrief] = useState(null);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [briefProgress, setBriefProgress] = useState('');

  // Brand contact (kept available for other flows).
  const brand = getBrand(bundle);
  const brandEmail = brand?.email || brand?.contact_email || brand?.primary_contact_email || '';

  // If the admin landed here without going through the scanner buttons,
  // this page counts as the FIRST of the Pitch Deck / Brief pair.
  useEffect(() => { if (id && !getFrameEntry(id)) setFrameEntry(id, 'brief'); }, [id]);

  // Adopt a brief generated earlier (persisted on the case).
  useEffect(() => {
    const persisted = bundle?.business_case?.plan?.generated_brief;
    if (persisted && !templateBrief) setTemplateBrief(persisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.business_case?.id, bundle?.business_case?.plan?.generated_brief_at]);

  const generateTemplateBrief = async () => {
    setGeneratingBrief(true);
    setBriefProgress('Queued: writing the Creative Brief…');
    try {
      const result = await v3GenerateCreativeBrief(id, (job) => setBriefProgress(job?.message || ''), snapshotId);
      setTemplateBrief(result?.brief || null);
      toast.success('Creative Brief written in the TASCK template.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not generate the Creative Brief.');
    } finally {
      setGeneratingBrief(false);
      setBriefProgress('');
    }
  };

  // Top-level "Send to creator" card (mirrors the Pitch Deck page): admin can
  // type or change the recipient email, then email the Creative Brief (.docx)
  // to that creator address. Reuses the component's existing sendPopup.
  // Derive the default recipient inline (from creators/selectedIds, both
  // declared above) so we avoid any temporal-dead-zone ordering issues.
  const firstSelectedCreator = selectedIds.map((cid) => creators.find((c) => c.id === cid)).filter(Boolean)[0];
  const defaultRecipient = creatorContact(firstSelectedCreator) || brandEmail;
  const [recipientEmail, setRecipientEmail] = useState(defaultRecipient);
  useEffect(() => {
    if (defaultRecipient && !recipientEmail) setRecipientEmail(defaultRecipient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultRecipient]);

  const sendCreativeBriefToEmail = async () => {
    if (!templateBrief) {
      setSendPopup({ title: 'Generate first', message: 'Generate the Creative Brief before sending it.', tone: 'warning' });
      return;
    }
    const recipient = recipientEmail.trim() || defaultRecipient || brandEmail;
    if (!recipient) {
      setSendPopup({ title: 'Add an email', message: 'Enter a recipient email to send the Creative Brief to.', tone: 'warning' });
      return;
    }
    const subject = templateBrief?.title || `Creative Brief - ${getCase(bundle).title || 'Creative Brief'}`;
    const briefText = (templateBrief?.sections || [])
      .map((s) => `${s.heading || ''}\n${(s.lines || []).map((l) => `${l.label || ''}: ${l.value || ''}`).join('\n')}\n${(s.checkboxes || []).map((c) => `☐ ${c}`).join('  ')}\n${s.intro || ''}\n${s.primary_label || ''} ${s.primary_value || ''}\n${(s.assumptions || []).join('\n')}\n${s.note || ''}`)
      .join('\n\n');
    setSendPopup({ title: 'Sending', message: `Sending the Creative Brief to ${recipient}…`, tone: 'pending' });
    try {
      const result = await v3SendCreativeBriefToEmail(id, {
        recipient_email: recipient,
        subject,
        brief_text: briefText,
      });
      const status = result?.email?.status || 'queued';
      if (status === 'sent') {
        setSendPopup({ title: 'Sent', message: `Creative Brief sent to ${result?.to || recipient} with the formatted document attached.`, tone: 'success' });
      } else {
        setSendPopup({ title: status === 'delivery_failed' ? 'Email not delivered' : 'Email queued', message: result?.email?.delivery_error || `Creative Brief queued for ${recipient}.`, tone: 'warning' });
      }
    } catch (e) {
      setSendPopup({ title: 'Email not sent', message: e?.response?.data?.detail || e?.message || 'Could not send the Creative Brief. Generate it first.', tone: 'warning' });
    }
  };
  useEffect(() => {
    const ids = (new URLSearchParams(location.search).get('creators') || '').split(',').map((value) => value.trim()).filter(Boolean);
    if (ids.length) setSelectedIds(ids);
  }, [location.search]);
  useEffect(() => {
    v3GetCreators().then((rows) => {
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
  // Sibling document: the Pitch Deck. Approved (by admin or brand) counts as done.
  const pitchDeckDone = bundle?.pitch_deck?.status === 'approved' || bundle?.business_case?.plan?.pitch_deck_status === 'approved';
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
    const overrideEmail = isRealEmail((briefEmails[creator.id] || '').trim());
    const recipient = overrideEmail || creatorEmail(creator);
    if (!recipient) {
      setSendPopup({ title: 'Add an email', message: `${creatorName(creator)} has no valid email on file. Type the creator's email address before sending.`, tone: 'warning' });
      return;
    }
    setNotice(`Sending creative brief to ${creatorName(creator)}...`);
    setSendPopup({ title: 'Sending', message: `Sending creative brief to ${recipient}...`, tone: 'pending' });
    const brief = briefs[creator.id] || generateCreatorBriefDraft(bundle, creator, planningFields || {});
    try {
      const doc = await v3CreateBrief({ business_case_id: id, creator_id: creator.id, brief_text: brief, creator_contact_email: recipient, subject: `Creative Brief - ${creatorName(creator)} - ${getCase(bundle).title}` });
      setSentBriefs((current) => ({ ...current, [creator.id]: doc }));
      const status = doc?.email?.status || doc?.email_status || 'queued';
      const sentTo = doc?.email?.to || doc?.creator_contact_email || overrideEmail || creatorContact(creator) || creatorName(creator);
      if (status === 'sent') {
        setNotice(`Creative brief sent to ${sentTo} with creator portal login details.`);
        setSendPopup({ title: 'Sent', message: `Creative brief sent to ${sentTo}. The Google Docs-compatible brief is attached.`, tone: 'success' });
      } else if (status === 'delivery_failed') {
        setNotice(doc?.email?.delivery_error || doc?.email_error || `Creative brief was saved but email delivery failed for ${sentTo}.`);
        setSendPopup({ title: 'Email not delivered', message: doc?.email?.delivery_error || doc?.email_error || `Creative brief was saved but email delivery failed for ${sentTo}.`, tone: 'warning' });
      } else {
        setNotice(`Creative brief saved and queued for ${sentTo}.`);
        setSendPopup({ title: 'Email queued', message: `Creative brief saved and queued for ${sentTo}.`, tone: 'warning' });
      }
    } catch (e) {
      const message = e?.response?.data?.detail || e?.message || `Could not email ${creatorName(creator)} yet.`;
      setNotice(message);
      setSendPopup({ title: 'Email not sent', message, tone: 'warning' });
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
  const downloadGoogleDoc = async (creator) => {
    // Prefer the saved-brief DOCX endpoint - that's the fully-templated file
    // (TASCK banner + watermark + contact footer + embedded fonts) served by
    // the backend against a persisted brief row.
    const savedBrief = sentBriefs[creator.id];
    if (savedBrief?.id) {
      window.open(v3CreativeBriefDocxUrl(savedBrief.id), '_blank');
      setNotice('Creative brief Google Docs-compatible document opened for download.');
      return;
    }
    // Unsaved draft: previously we opened a plain HTML print window here,
    // which the brand received as a bare Chrome tab with no design. Instead,
    // render the templated .docx via the new preview endpoint so an admin
    // downloading a draft gets the identical TASCK-templated file.
    const draftText = briefs[creator.id] || '';
    const subject = `Creative Brief - ${creatorName(creator)} - ${getCase(bundle).title || ''}`.trim();
    try {
      const resp = await fetch(`${(process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '')}/api/v3/business-cases/${id}/creative-briefs/preview-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, brief_text: draftText, creator_id: creator.id, creator_name: creatorName(creator) }),
      });
      if (!resp.ok) throw new Error(`Preview download failed: ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safe = (creatorName(creator) || 'Creator').replace(/[^A-Za-z0-9_-]+/g, '_');
      a.download = `TASCK_Creative_Brief_${safe}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('Templated creative brief downloaded. Open it in Word or Google Docs.');
    } catch (e) {
      setNotice(e?.message || 'Could not download the templated creative brief. Try sending the brief first, then download.');
    }
  };
  const shareWhatsApp = (creator) => {
    const text = `${getCase(bundle).title || 'Creative Brief'}\n${creatorBriefLink(id, creator.id)}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };
  return (
    <FlowShell title="Creative Brief Studio" subtitle="Generate, edit, send, download, and make each selected creator brief visible to the creator." nextAction="Review each AI-generated brief before sending it to creators.">
      {/* The brand-tailored Creative Brief in the approved TASCK template
          (the 4-page WE.YAN-style document). Claude writes it from the
          alignment snapshot + Creator Selector data; download is the styled
          .docx with the TASCK logo, footer, and fonts. */}
      <InfoCard
        title="TASCK Creative Brief (approved template)"
        action={(
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={generateTemplateBrief}
              disabled={generatingBrief}
              className="v3-btn-primary text-[12px]"
              data-testid="brief-generate-template-btn"
            >
              {generatingBrief ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generatingBrief ? 'Writing…' : (templateBrief ? 'Regenerate brief' : 'Generate brief')}
            </button>
            {templateBrief && (
              <>
                <a
                  href={v3TemplateBriefPreviewUrl(id, snapshotId)}
                  target="_blank"
                  rel="noreferrer"
                  className="v3-btn-secondary text-[12px]"
                  title="Open a printable, shareable browser preview of this brief - no Google account needed."
                  data-testid="brief-open-preview"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open in browser preview
                </a>
                <a href={v3TemplateBriefDocxUrl(id, snapshotId)} target="_blank" rel="noreferrer" className="v3-btn-secondary text-[12px]" data-testid="brief-download-docx">
                  <Download className="w-3.5 h-3.5" /> Download (.docx)
                </a>
              </>
            )}
          </div>
        )}
      >
        {generatingBrief && briefProgress && (
          <p className="text-[12px] text-[#1F4A3A] mb-3 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {briefProgress}</p>
        )}
        {!templateBrief && !generatingBrief && (
          <p className="text-[12px] text-[#6E6657]">
            Generates the brand-tailored Creative Brief in TASCKs approved 4-page template - same structure and design as
            the agency sample, every word written for this brand from the Alignment Snapshot and Creator Selector.
          </p>
        )}
        {templateBrief && (
          <TtaLetterhead title={templateBrief.title || 'TTA – Creative Alignment Brief (Creator Version)'}>
            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 font-['Century_Gothic','Century Gothic',sans-serif]" data-testid="brief-template-preview">
              {templateBrief.subtitle && <p className="text-[11px] font-semibold text-[#6E6657] mb-1">{templateBrief.subtitle}</p>}
              {(templateBrief.sections || []).map((section, index) => (
                <div key={index} className="border-t border-[#F1ECDF] pt-3">
                  <p className="text-[14px] font-bold text-[#0C343D] mb-1.5">{section.heading}</p>
                  {(section.lines || []).map((line, i) => (
                    <p key={i} className="text-[12px] text-[#1F1B18] leading-5">
                      <span className="text-[#6E6657]">{line.label}:</span> {line.value || 'To be confirmed'}
                    </p>
                  ))}
                  {section.intro && <p className="text-[12px] text-[#1F1B18] mt-1">{section.intro}</p>}
                  {section.primary_label && <p className="text-[12px] font-bold text-[#1F1B18] mt-1">{section.primary_label}</p>}
                  {section.primary_value && <p className="text-[12px] text-[#1F1B18]">{section.primary_value}</p>}
                  {(section.checkboxes || []).map((opt, i) => (
                    <p key={`cb${i}`} className="text-[12px] text-[#1F1B18] pl-2 leading-5">☐ {opt}</p>
                  ))}
                  {(section.scope_signal || []).map((b, i) => <p key={`ss${i}`} className="text-[12px] text-[#1F1B18] pl-2 leading-5">- {b}</p>)}
                  {(section.assumptions || []).map((b, i) => <p key={`as${i}`} className="text-[12px] text-[#1F1B18] pl-2 leading-5">- {b}</p>)}
                  {section.availability_label && <p className="text-[12px] text-[#1F1B18] mt-1">{section.availability_label}</p>}
                  {section.availability_options && (
                    <p className="text-[12px] text-[#1F1B18] pl-2 leading-5">{(section.availability_options || []).map((o) => `☐ ${o}`).join('   ')}</p>
                  )}
                  {section.conditions_label && <p className="text-[12px] font-bold text-[#1F1B18] mt-1">{section.conditions_label}</p>}
                  {section.conditions_hint && <p className="text-[12px] italic text-[#6E6657] pl-2">{section.conditions_hint}</p>}
                  {(section.confirmations || []).map((c, i) => <p key={`cf${i}`} className="text-[12px] text-[#1F1B18] pl-2 leading-5">☐ {c}</p>)}
                  {section.note && <p className="text-[12px] italic text-[#6E6657] mt-1">{section.note}</p>}
                </div>
              ))}
              {templateBrief.signature && (
                <div className="border-t border-[#F1ECDF] pt-3 space-y-1">
                  <p className="text-[12px] text-[#1F1B18]">{templateBrief.signature.name_label || 'Name:'}</p>
                  <p className="text-[12px] text-[#1F1B18]">{templateBrief.signature.date_label || 'Date:'}</p>
                </div>
              )}
            </div>
          </TtaLetterhead>
        )}
      </InfoCard>
      {templateBrief && (
        <InfoCard title="Send to creator">
          <p className="text-[12px] text-[#6E6657] mb-2">
            Emails the formatted Creative Brief (TASCK-branded .docx attached) and makes it reviewable in the creator portal.
            The creator can review, comment, and confirm it from their portal.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="creator@email.com"
              className="flex-1 rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
              data-testid="brief-recipient-input"
            />
            <button onClick={sendCreativeBriefToEmail} className="v3-btn-primary rounded-full text-[12px] whitespace-nowrap" data-testid="brief-send-btn"><Send className="w-3.5 h-3.5" /> Send Creative Brief</button>
          </div>
        </InfoCard>
      )}
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      <InfoCard title="Selected creator briefs" action={<button onClick={generateAll} className="v3-btn-primary" data-testid="brief-generate-all-btn"><Sparkles className="w-3.5 h-3.5" /> Generate AI briefs</button>}>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Add another creator</span>
            <select value={manualCreatorId} onChange={(e) => setManualCreatorId(e.target.value)} className="w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]">
              {creators.map((creator) => <option key={creator.id} value={creator.id}>{creatorName(creator)} - {creatorSpecialty(creator)}</option>)}
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
                <TtaLetterhead title="TTA – Creative Alignment Brief (Creator Version)" className="!max-w-none">
                  <div className="font-['Century_Gothic','Century Gothic',sans-serif]">
                    {templateBrief?.subtitle && <p className="text-[11px] font-semibold text-[#6E6657] mb-2">{templateBrief.subtitle}</p>}
                    <textarea value={briefs[creator.id] || ''} onChange={(e) => setBriefs({ ...briefs, [creator.id]: e.target.value })} rows={16} className="w-full rounded-lg border border-[#E8E4DB] bg-white p-3 text-[13px] leading-relaxed focus:outline-none focus:border-[#1F4A3A]" data-testid={`brief-editor-${creator.id}`} />
                  </div>
                </TtaLetterhead>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    value={briefEmails[creator.id] ?? creatorContact(creator) ?? ''}
                    onChange={(e) => setBriefEmails({ ...briefEmails, [creator.id]: e.target.value })}
                    placeholder="creator@email.com"
                    className="flex-1 rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
                    data-testid={`brief-email-input-${creator.id}`}
                  />
                  <button onClick={() => send(creator)} className="v3-btn-primary rounded-full text-[12px] whitespace-nowrap" data-testid={`brief-email-${creator.id}`}><Send className="w-3.5 h-3.5" /> Send to creator</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => copyLink(creator)} className="v3-btn-secondary"><FileText className="w-3.5 h-3.5" /> Copy link</button>
                  <button onClick={() => downloadGoogleDoc(creator)} className="v3-btn-secondary"><Download className="w-3.5 h-3.5" /> Download Google Docs</button>
                  <button onClick={() => shareWhatsApp(creator)} className="v3-btn-secondary"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp share</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>
      {sendPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4" data-testid="brief-sent-popup">
          <div className="w-full max-w-sm rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${sendPopup.tone === 'success' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : 'bg-[#FBF4E4] text-[#7A5A1E]'}`}>
                {sendPopup.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              </span>
              <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{sendPopup.title}</h3>
            </div>
            <p className="text-[13px] leading-6 text-[#4F3E2F]">{sendPopup.message}</p>
            <div className="mt-4 flex justify-end"><button type="button" onClick={() => setSendPopup(null)} className="v3-btn-primary">OK</button></div>
          </div>
        </div>
      )}
      {/* Pitch Deck and Creative Brief are siblings. The ENTRY ORDER from the
          Creator Match Scanner decides this button: if the Brief was opened
          first, this links to the Pitch Deck; if the Pitch Deck came first,
          this page is the second stop and moves on to the Business Case. */}
      <InfoCard title="Next step">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">
            {(getFrameEntry(id) === 'pitch' || pitchDeckDone)
              ? 'The Pitch Deck is done. Move this project into the Business Case planning phase.'
              : 'Open the Pitch Deck next - once both are done the flow moves into the Business Case planning phase.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {(getFrameEntry(id) === 'pitch' || pitchDeckDone) ? (
              <button
                onClick={() => navigate(adminRoute(`/business-cases/${id}/plan/planning`))}
                className="v3-btn-primary bg-[#1F7A4D] hover:bg-[#17653E] border-[#1F7A4D]"
                data-testid="brief-open-planning-btn"
              >
                <ArrowRight className="w-3.5 h-3.5" /> Move to Business Case
              </button>
            ) : (
              <button
                onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/pitch-deck`))}
                className="v3-btn-primary bg-[#1F7A4D] hover:bg-[#17653E] border-[#1F7A4D]"
                data-testid="brief-open-pitch-deck-btn"
              >
                <Presentation className="w-3.5 h-3.5" /> Open Pitch Deck
              </button>
            )}
          </div>
        </div>
      </InfoCard>
    </FlowShell>
  );
};

// -----------------------------------------------------------------------
// PITCH DECK (Framing, alongside the Creative Brief)
// Ten AI-written sections generated from everything so far - alignment
// snapshot, Creator Selector, selected creators. Admin edits each section,
// then approves / previews / sends to the brand / downloads the styled
// Google Docs-compatible .docx. Either this or the Creative Brief can be
// done first; when both are done the flow moves into Planning.
// -----------------------------------------------------------------------
export const V3BusinessCasePitchDeck = () => {
  const navigate = useNavigate();
  const { id, snapshotId, bundle, reload } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const [deck, setDeck] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Pitch Deck generation popup. The polling wrapper reports the backend's
  // real progress (5 -> 30 -> 100), so this shows a genuine 0-100% bar.
  const [genPopup, setGenPopup] = useState({ open: false, progress: 0, status: 'running', message: '' });
  const genTickRef = useRef(null);
  const stopGenTick = () => { if (genTickRef.current) { clearInterval(genTickRef.current); genTickRef.current = null; } };
  const startGenTick = () => {
    stopGenTick();
    // While waiting for the first real server progress value, ease toward a
    // sub-100 ceiling so the bar keeps moving visibly.
    genTickRef.current = setInterval(() => {
      setGenPopup((prev) => {
        if (!prev.open || prev.status !== 'running') return prev;
        const next = prev.progress < 85 ? prev.progress + (prev.progress < 30 ? 4 : 2) : 85;
        return { ...prev, progress: next };
      });
    }, 500);
  };
  useEffect(() => () => stopGenTick(), []);
  const [saving, setSaving] = useState(false);
  // Deck analytics: brand opens + page turns per view. Loaded on mount and
  // whenever the deck id changes so admins see fresh numbers without a refresh.
  const [deckAnalytics, setDeckAnalytics] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!deck?.id) { setDeckAnalytics(null); return () => {}; }
    const load = () => v3GetPitchDeckAnalytics(deck.id).then((data) => { if (!cancelled) setDeckAnalytics(data); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [deck?.id]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendPopup, setSendPopup] = useState(null);
  const brandEmail = brand?.email || brand?.contact_email || '';
  // The Creative Brief is "done" once at least one brief was sent.
  const briefDone = Boolean(bc?.plan?.creative_brief_id);
  // Entry order decides this page's next step: if the Brief was opened FIRST
  // (from the scanner or directly), this page is the second stop and moves on
  // to the Business Case; otherwise it links to the Brief.
  useEffect(() => { if (id && !getFrameEntry(id)) setFrameEntry(id, 'pitch'); }, [id]);
  const briefWasFirst = getFrameEntry(id) === 'brief' || briefDone;

  useEffect(() => {
    const persisted = bundle?.pitch_deck;
    if (persisted && !deck) setDeck(persisted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.pitch_deck?.id, bundle?.pitch_deck?.updated_at]);

  useEffect(() => { if (brandEmail) setRecipientEmail(brandEmail); }, [brandEmail]);

  // Auto-load: the Pitch Deck writes itself as soon as the page opens, so
  // admin never has to press Generate. Fires once, only when the case has
  // loaded and there is no deck yet. The loading popup appears once the
  // generation has been running for a beat (1.2s) so quick writes don't flash
  // a popup for a fraction of a second, but anything slower shows real progress.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current) return;
    if (!bundle?.business_case?.id) return;   // wait for the bundle
    if (bundle?.pitch_deck || deck) { autoRanRef.current = true; return; }
    autoRanRef.current = true;
    generate(1200).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle?.business_case?.id, bundle?.pitch_deck]);

  // popupDelayMs: the manual button shows the loader immediately; the
  // automatic load on page open stays quiet for 5s and only raises the
  // 0-100% popup if it is actually going to take a while.
  const generate = async (popupDelayMs = 0) => {
    setGenerating(true);
    let delayTimer = null;
    const openPopup = () => {
      setGenPopup({ open: true, progress: 4, status: 'running', message: 'Loading Pitch Deck…' });
      startGenTick();
    };
    if (popupDelayMs > 0) {
      delayTimer = window.setTimeout(openPopup, popupDelayMs);
    } else {
      openPopup();
    }
    const clearDelay = () => { if (delayTimer) { window.clearTimeout(delayTimer); delayTimer = null; } };
    try {
      const result = await v3GeneratePitchDeck(id, (job) => {
        // The backend sends a real progress value; stop the simulated tick
        // once we have it and reflect the server's number instead.
        const serverProgress = Math.max(0, Math.min(100, Number(job?.progress) || 0));
        if (serverProgress > 0) stopGenTick();
        clearDelay();
        setGenPopup((prev) => prev.open ? {
          ...prev,
          progress: Math.max(prev.progress, serverProgress),
          message: job?.message || prev.message,
        } : prev);
      }, snapshotId);
      stopGenTick();
      clearDelay();
      setDeck(result?.pitch_deck || null);
      await reload();
      setGenPopup({ open: true, progress: 100, status: 'complete', message: 'Pitch Deck ready. Review and edit each section before sending.' });
      toast.success('Pitch Deck written. Review and edit each section before sending.');
      setTimeout(() => setGenPopup((prev) => ({ ...prev, open: false })), 1100);
    } catch (e) {
      stopGenTick();
      clearDelay();
      const msg = e?.response?.data?.detail || e?.message || 'Could not generate the Pitch Deck.';
      toast.error(msg);
      setGenPopup({ open: true, progress: 100, status: 'failed', message: msg });
    } finally {
      setGenerating(false);
    }
  };

  const updateSection = (index, content) => {
    setDeck((current) => ({
      ...(current || {}),
      sections: (current?.sections || []).map((section, i) => (i === index ? { ...section, content } : section)),
    }));
  };

  const persist = async () => {
    if (!deck?.id) return null;
    const saved = await v3UpdatePitchDeck(deck.id, {
      title: deck.title || '',
      sections: deck.sections || [],
      cover_option: deck.cover_option || 'photo_studio',
      reviewer: 'admin',
    });
    setDeck(saved?.pitch_deck || deck);
    await reload();
    return saved;
  };

  const saveEdits = async () => {
    setSaving(true);
    try {
      await persist();
      toast.success('Pitch Deck edits saved.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not save the Pitch Deck.');
    } finally {
      setSaving(false);
    }
  };

  const approve = async () => {
    setSendPopup({ title: 'Approving', message: 'Approving the Pitch Deck…', tone: 'pending' });
    try {
      await persist();
      await v3ApprovePitchDeckAs(id, 'admin', 'admin');
      await reload();
      const nextLabel = briefWasFirst ? 'the Business Case' : 'the Creative Brief';
      setSendPopup({ title: 'Approved', message: `Pitch Deck approved. Opening ${nextLabel}…`, tone: 'success' });
      window.setTimeout(() => navigate(adminRoute(briefWasFirst
        ? `/business-cases/${id}/plan/planning`
        : `/business-cases/${id}/frame/brief`)), 600);
    } catch (e) {
      setSendPopup(null);
      toast.error(e?.response?.data?.detail || e?.message || 'Could not approve the Pitch Deck. Generate it first.');
    }
  };

  const sendToBrand = async () => {
    const recipient = recipientEmail.trim() || brandEmail || 'the registered brand email';
    setSendPopup({ title: 'Sending', message: `Sending the Pitch Deck to ${recipient}…`, tone: 'pending' });
    try {
      await persist();
      const result = await v3SendPitchDeckToBrand(id, { recipient_email: recipientEmail.trim() || undefined });
      await reload();
      const status = result?.email?.status || 'queued';
      if (status === 'sent') {
        setSendPopup({ title: 'Sent', message: `Pitch Deck sent to ${result?.email?.to || recipient} with the formatted document attached. The brand can review and approve from their portal.`, tone: 'success' });
      } else {
        setSendPopup({ title: status === 'delivery_failed' ? 'Email not delivered' : 'Email queued', message: result?.email?.delivery_error || `Pitch Deck queued for ${recipient}.`, tone: 'warning' });
      }
    } catch (e) {
      setSendPopup({ title: 'Email not sent', message: e?.response?.data?.detail || e?.message || 'Could not send the Pitch Deck. Generate it first.', tone: 'warning' });
    }
  };

  // ---- Deck imagery: per-brand cover art + page 7 creator portraits ----
  const [imageBusy, setImageBusy] = useState('');

  const uploadCoverImage = async (file) => {
    if (!file || !deck?.id) return;
    setImageBusy('cover');
    try {
      const dataUri = await v3ReadFileAsDataUri(file);
      await v3SetPitchDeckCoverImage(deck.id, dataUri);
      await reload();
      toast.success('Cover image updated. It shows on page 1 of the flip book.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not upload that cover image.');
    } finally {
      setImageBusy('');
    }
  };

  const clearCoverImage = async () => {
    if (!deck?.id) return;
    setImageBusy('cover');
    try {
      await v3ClearPitchDeckCoverImage(deck.id);
      await reload();
      toast.success('Cover image removed. The default TASCK cover is back.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not remove the cover image.');
    } finally {
      setImageBusy('');
    }
  };

  const addCreatorImage = async (file) => {
    if (!file || !deck?.id) return;
    setImageBusy('creator');
    try {
      const dataUri = await v3ReadFileAsDataUri(file);
      // Filename (minus extension) seeds the caption; admin can rename after.
      const guessedName = String(file.name || '').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      await v3AddPitchDeckCreatorImage(deck.id, { image: dataUri, name: guessedName });
      await reload();
      toast.success('Creator image added to page 7.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not add that creator image.');
    } finally {
      setImageBusy('');
    }
  };

  const removeCreatorImage = async (imageId) => {
    if (!deck?.id) return;
    setImageBusy(imageId);
    try {
      await v3RemovePitchDeckCreatorImage(deck.id, imageId);
      await reload();
      toast.success('Creator image removed.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not remove that image.');
    } finally {
      setImageBusy('');
    }
  };

  // "Send to brand page": make the deck visible in the brand portal without
  // emailing. A generated deck stays admin-only until this is clicked, so
  // admin can edit it first.
  const publishDeckToBrandPage = async () => {
    if (!deck?.id) {
      toast.error('Generate the Pitch Deck before sending it to the brand page.');
      return;
    }
    setSendPopup({ title: 'Publishing', message: 'Making the Pitch Deck visible on the brand page…', tone: 'pending' });
    try {
      await persist();
      await v3PublishPitchDeckToBrandPage(id);
      await reload();
      setSendPopup({
        title: 'Live on the brand page',
        message: 'The brand can now open this Pitch Deck from their portal. No email was sent - use "Send to brand" when you want to notify them.',
        tone: 'success',
      });
    } catch (e) {
      setSendPopup({
        title: 'Not published',
        message: e?.response?.data?.detail || e?.message || 'Could not publish the Pitch Deck to the brand page.',
        tone: 'warning',
      });
    }
  };

  // Preview + download both use the server-rendered flip book: one source of
  // truth, TASCK-blue design, and the brand fonts are EMBEDDED in the file so
  // it looks identical when a client opens it offline.
  const openPreview = () => {
    if (!deck?.id) return;
    window.open(v3PitchDeckFlipbookUrl(deck.id), '_blank', 'noopener,noreferrer');
  };

  // Slide view of the same deck. One document carries both presentations, so
  // this only decides which one opens first.
  const openSlides = () => {
    if (!deck?.id) return;
    window.open(v3PitchDeckSlidesUrl(deck.id), '_blank', 'noopener,noreferrer');
  };

  const downloadFlipbook = () => {
    if (!deck?.id) return;
    window.open(v3PitchDeckFlipbookUrl(deck.id, true), '_blank', 'noopener,noreferrer');
    toast.success('Flip book downloading - a single HTML file you can send to the client.');
  };

  // Client-side print-to-PDF: opens the flipbook with ?print=1 so it auto-
  // triggers the browser's Print dialog. Users choose "Save as PDF" to
  // download a proper multi-page PDF of the deck.
  const downloadPdf = () => {
    if (!deck?.id) return;
    const url = `${v3PitchDeckFlipbookUrl(deck.id)}?print=1`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Preparing PDF - choose "Save as PDF" in the print dialog.');
  };

  const setCoverOption = async (option) => {
    if (!deck?.id) return;
    const previous = deck.cover_option || 'photo_studio';
    if (previous === option) return;
    setDeck((current) => ({ ...(current || {}), cover_option: option }));
    try {
      await v3UpdatePitchDeck(deck.id, { cover_option: option, reviewer: 'admin' });
      toast.success('Cover updated.');
    } catch (e) {
      setDeck((current) => ({ ...(current || {}), cover_option: previous }));
      toast.error(e?.response?.data?.detail || e?.message || 'Could not update the cover.');
    }
  };

  const deckComments = Array.isArray(deck?.brand_comments) ? deck.brand_comments : [];

  return (
    <FlowShell
      title="Pitch Deck"
      subtitle="The brand-facing pitch: ten sections written by the AI from the Alignment Snapshot, Creator Selector, and your selected creators. Edit each section, then approve or send it to the brand."
      nextAction="Edit each section, then approve or send the Pitch Deck to the brand."
    >
      <InfoCard
        title="Pitch Deck"
        action={(
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={() => generate(0)} disabled={generating} className="v3-btn-primary text-[12px]" data-testid="pitch-generate-btn">
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating ? 'Writing…' : (deck ? 'Regenerate' : 'Generate Pitch Deck')}
            </button>
            {deck && (
              <>
                <button onClick={saveEdits} disabled={saving} className="v3-btn-secondary text-[12px]" data-testid="pitch-save-btn"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save edits'}</button>
                <button onClick={openPreview} className="v3-btn-secondary text-[12px]" data-testid="pitch-preview-btn"><Presentation className="w-3.5 h-3.5" /> Preview flipbook</button>
                {/* Same document, opened straight into slide view. The two
                    modes ship together with a toggle, so the brand can switch
                    without another link. */}
                <button onClick={openSlides} className="v3-btn-secondary text-[12px]" data-testid="pitch-preview-slides-btn"><Presentation className="w-3.5 h-3.5" /> Preview slides</button>
                <a href={v3PitchDeckDocxUrl(deck.id)} target="_blank" rel="noreferrer" className="v3-btn-secondary text-[12px]" data-testid="pitch-download-btn"><Download className="w-3.5 h-3.5" /> Download (.docx)</a>
                <button onClick={downloadFlipbook} className="v3-btn-secondary text-[12px]" data-testid="pitch-download-flipbook-btn"><BookOpen className="w-3.5 h-3.5" /> Download flipbook (.html)</button>
                <button onClick={downloadPdf} className="v3-btn-secondary text-[12px]" data-testid="pitch-download-pdf-btn"><Download className="w-3.5 h-3.5" /> Download PDF</button>
                <button onClick={approve} className="v3-btn-secondary text-[12px]" data-testid="pitch-approve-btn"><CheckCircle2 className="w-3.5 h-3.5" /> Admin approve</button>
              </>
            )}
          </div>
        )}
      >
        {!deck && !generating && (
          <p className="text-[12px] text-[#6E6657]">
            Generates the ten-section Pitch Deck - About The Organisation, Context & Core Focus, The Problem, The
            Objective, The Market / Core Audience, The Solution / Creator Strategy, Go To Market / Campaign, Campaign
            Projections, Risk & Mitigation Analysis, and Budget Assumptions - each written by the AI from everything
            captured so far. You can edit every section before it goes to the brand.
          </p>
        )}
        {deck && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] ${deck.status === 'approved' ? 'bg-[#DDE7E2] text-[#1F4A3A] border-[#C7D7CF]' : 'bg-[#F2EAD8] text-[#7A5F23] border-[#E6D6B6]'}`}>
                {cleanV1Text(String(deck.status || 'draft').replace(/[_-]+/g, ' '))}
              </span>
              {deck.approved_by && <span className="text-[11px] text-[#8A8A8A]">Approved by {deck.approved_by} ({deck.approved_by_party})</span>}
            </div>
            <input
              value={deck.title || ''}
              onChange={(e) => setDeck((current) => ({ ...(current || {}), title: e.target.value }))}
              className="w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[14px] font-semibold focus:outline-none focus:border-[#1F4A3A]"
              data-testid="pitch-title-input"
            />
            <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF6] p-3" data-testid="pitch-cover-picker">
              <p className="text-[11px] font-semibold tracking-widest text-[#6E6657] uppercase mb-2">Cover style</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'photo_studio', label: 'Creator Studio', swatch: 'linear-gradient(160deg,#0C1626 0%,#101E33 55%,#070E1B 100%)' },
                  { id: 'minimal_navy', label: 'Minimal Navy', swatch: 'radial-gradient(60% 40% at 20% 15%,rgba(61,240,140,.35) 0%,rgba(61,240,140,0) 60%),linear-gradient(160deg,#0F1E33,#050B15)' },
                  { id: 'green_wash', label: 'Neon Green', swatch: 'linear-gradient(140deg,rgba(61,240,140,.55) 0%,rgba(6,11,22,.9) 60%)' },
                  { id: 'sunset', label: 'Sunset', swatch: 'linear-gradient(140deg,rgba(255,122,69,.55) 0%,rgba(6,11,22,.9) 60%)' },
                ].map((opt) => {
                  const active = (deck.cover_option || 'photo_studio') === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCoverOption(opt.id)}
                      className={`flex flex-col items-stretch gap-1 rounded-md border p-1.5 text-left transition ${active ? 'border-[#1F4A3A] ring-2 ring-[#3DF08C]' : 'border-[#E8E4DB] hover:border-[#B5AF9F]'}`}
                      data-testid={`pitch-cover-option-${opt.id}`}
                    >
                      <span className="block h-14 rounded" style={{ background: opt.swatch }} />
                      <span className="text-[11px] font-medium text-[#1A1A1A]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {(deck.sections || []).map((section, index) => (
              <div key={index} className="v3-card p-4" data-testid={`pitch-section-${index}`}>
                <p className="text-[12px] font-semibold text-[#1A1A1A] mb-2">{index + 1}. {section.heading}</p>
                <textarea
                  rows={4}
                  value={section.content || ''}
                  onChange={(e) => updateSection(index, e.target.value)}
                  className="w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] focus:border-[#1F4A3A] outline-none leading-relaxed"
                />
              </div>
            ))}
          </div>
        )}
      </InfoCard>

      {deck && (
        <InfoCard title="Deck imagery">
          <p className="text-[12px] text-[#6E6657] mb-3">
            Set this brand's cover artwork for page 1, and add the selected creator images that render on page 7 of the flip book.
          </p>

          {/* Page 1 - per-brand cover background */}
          <div className="rounded-[8px] border border-[#E8E4DB] bg-[#FBFAF7] p-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="h-[68px] w-[120px] flex-shrink-0 overflow-hidden rounded-md border border-[#E8E4DB] bg-[#101E33]">
                {deck.cover_image
                  ? <img src={deck.cover_image} alt="Deck cover" className="h-full w-full object-cover" data-testid="pitch-cover-preview" />
                  : <div className="flex h-full w-full items-center justify-center text-[10px] text-[#8FA0B8]">Default cover</div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#1F1B18]">Page 1 background</p>
                <p className="text-[11px] text-[#6E6657] mt-0.5">JPG or PNG, landscape works best. Resized automatically.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="v3-btn-secondary text-[11px] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {imageBusy === 'cover' ? 'Uploading…' : (deck.cover_image ? 'Replace cover' : 'Upload cover')}
                    <input
                      type="file" accept="image/*" className="hidden"
                      data-testid="pitch-cover-input"
                      disabled={imageBusy === 'cover'}
                      onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; uploadCoverImage(f); }}
                    />
                  </label>
                  {deck.cover_image && (
                    <button onClick={clearCoverImage} disabled={imageBusy === 'cover'} className="v3-btn-secondary text-[11px]" data-testid="pitch-cover-clear">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Page 7 - selected creator images */}
          <div className="mt-3 rounded-[8px] border border-[#E8E4DB] bg-[#FBFAF7] p-3" data-testid="pitch-creator-images">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold text-[#1F1B18]">Page 7 - selected creators</p>
                <p className="text-[11px] text-[#6E6657] mt-0.5">
                  {(deck.creator_images || []).length} of 12 added. These render as a clean grid on page 7.
                </p>
              </div>
              <label className="v3-btn-secondary text-[11px] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {imageBusy === 'creator' ? 'Adding…' : 'Add creator image'}
                <input
                  type="file" accept="image/*" className="hidden"
                  data-testid="pitch-creator-input"
                  disabled={imageBusy === 'creator'}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; addCreatorImage(f); }}
                />
              </label>
            </div>
            {(deck.creator_images || []).length > 0 ? (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {(deck.creator_images || []).map((img) => (
                  <div key={img.id} className="group relative overflow-hidden rounded-md border border-[#E8E4DB] bg-white">
                    <img src={img.image} alt={img.name || 'Creator'} className="aspect-[4/5] w-full object-cover" />
                    {img.name && <p className="truncate px-1.5 py-1 text-[10px] text-[#4F3E2F]">{img.name}</p>}
                    <button
                      onClick={() => removeCreatorImage(img.id)}
                      disabled={imageBusy === img.id}
                      title="Remove this creator image"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                      data-testid={`pitch-creator-remove-${img.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] text-[#8A8A8A]">No creator images yet. Page 7 is skipped until you add at least one.</p>
            )}
          </div>
        </InfoCard>
      )}

      {deck && (
        <InfoCard title="Send to brand">
          <p className="text-[12px] text-[#6E6657] mb-2">
            Emails the formatted Pitch Deck (TASCK-branded .docx attached) and makes it reviewable in the brand portal.
            The brand can review, comment, and approve it from their portal.
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="brand@email.com"
              className="flex-1 rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
              data-testid="pitch-recipient-input"
            />
            <button onClick={publishDeckToBrandPage} className="v3-btn-primary text-[12px]" data-testid="pitch-send-brand-page-btn"><Send className="w-3.5 h-3.5" /> {deck?.sent_to_brand_at ? 'Update brand page' : 'Send to brand page'}</button>
            <button onClick={sendToBrand} className="v3-btn-secondary text-[12px]" data-testid="pitch-send-btn"><Mail className="w-3.5 h-3.5" /> Email Pitch Deck</button>
          </div>
          <div
            className={'mt-3 rounded-lg border px-3 py-2 text-[12px] ' + (deck?.sent_to_brand_at
              ? 'border-[#C7D7CF] bg-[#EAF4EE] text-[#1F4A3A]'
              : 'border-[#E5C99A] bg-[#FBF4E4] text-[#7A5A1E]')}
            data-testid="pitch-brand-visibility"
          >
            {deck?.sent_to_brand_at
              ? `Visible on the brand page since ${formatDateTime(deck.sent_to_brand_at)}. Saved edits go live immediately.`
              : 'Admin-only. The brand cannot see this Pitch Deck yet - click "Send to brand page" when you are ready.'}
          </div>
        </InfoCard>
      )}

      {deck && (
        <InfoCard title="Deck analytics">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="deck-analytics-summary">
            <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF6] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Total opens</p>
              <p className="text-[22px] font-semibold text-[#1A1A1A]" data-testid="deck-analytics-opens">{deckAnalytics?.total_views ?? 0}</p>
            </div>
            <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF6] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Page turns</p>
              <p className="text-[22px] font-semibold text-[#1A1A1A]" data-testid="deck-analytics-turns">{deckAnalytics?.total_page_turns ?? 0}</p>
            </div>
            <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF6] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Latest opened</p>
              <p className="text-[13px] text-[#1A1A1A] font-medium" data-testid="deck-analytics-latest">
                {deckAnalytics?.views?.[0]?.opened_at ? formatDateTime(deckAnalytics.views[0].opened_at) : 'No opens yet'}
              </p>
            </div>
          </div>
          {Array.isArray(deckAnalytics?.views) && deckAnalytics.views.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-lg border border-[#E8E4DB]" data-testid="deck-analytics-table">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F4F2EC] text-[#6B6258]">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Brand</th>
                    <th className="text-left px-3 py-2 font-medium">Opened at</th>
                    <th className="text-left px-3 py-2 font-medium">Page turns</th>
                    <th className="text-left px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {deckAnalytics.views.slice(0, 20).map((v) => (
                    <tr key={v.session_id} className="border-t border-[#E8E4DB]" data-testid={`deck-analytics-row-${v.session_id}`}>
                      <td className="px-3 py-2 text-[#1A1A1A]">{v.brand_name || v.brand_id || 'Unknown'}</td>
                      <td className="px-3 py-2 text-[#4F4941]">{v.opened_at ? formatDateTime(v.opened_at) : '—'}</td>
                      <td className="px-3 py-2 text-[#4F4941] tabular-nums">{v.page_turns ?? 0}</td>
                      <td className="px-3 py-2 text-[#8A8A8A]">{v.source || 'brand'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {(!deckAnalytics || (deckAnalytics.total_views ?? 0) === 0) && (
            <p className="text-[12px] text-[#6B6258] mt-2" data-testid="deck-analytics-empty">
              You&apos;ll see brand opens and how many pages they turned as soon as they view the flipbook.
            </p>
          )}
        </InfoCard>
      )}

      {/* Entry order decides this button (mirrors the Creative Brief page):
          if the Brief was opened first, this page is the second stop and moves
          the project to the Business Case; otherwise it opens the Brief. */}
      <InfoCard title="Next step">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">
            {briefWasFirst
              ? 'The Creative Brief is done. Move this project into the Business Case planning phase.'
              : 'Open the Creative Brief next - once both are done the flow moves into the Business Case planning phase.'}
          </p>
          {briefWasFirst ? (
            <button
              onClick={() => navigate(adminRoute(`/business-cases/${id}/plan/planning`))}
              className="v3-btn-primary bg-[#1F7A4D] hover:bg-[#17653E] border-[#1F7A4D]"
              data-testid="pitch-open-planning-btn"
            >
              <ArrowRight className="w-3.5 h-3.5" /> Move to Business Case
            </button>
          ) : (
            <button
              onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/brief`))}
              className="v3-btn-primary bg-[#1F7A4D] hover:bg-[#17653E] border-[#1F7A4D]"
              data-testid="pitch-open-brief-btn"
            >
              <FileText className="w-3.5 h-3.5" /> Open Creative Brief
            </button>
          )}
        </div>
      </InfoCard>

      {deckComments.length > 0 && (
        <InfoCard title={`Brand Comments (${deckComments.length})`}>
          {deckComments.map((comment, index) => (
            <div key={comment.id || index} className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-3 mb-2">
              {comment.quoted_text && comment.quoted_text !== 'Brand review' && (
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Re: <strong className="text-[#4F3E2F]">{comment.quoted_text}</strong></p>
              )}
              <p className="text-[13px] text-[#1A1A1A] whitespace-pre-wrap">{cleanV1Text(comment.comment || '')}</p>
              <p className="mt-1 text-[11px] text-[#8A8A8A]">By {comment.author || 'Brand'}{comment.created_at ? ` · ${formatDateTime(comment.created_at)}` : ''}</p>
            </div>
          ))}
        </InfoCard>
      )}

      {sendPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[10px] border border-[#D7CBB8] bg-white p-5 shadow-2xl">
            <h3 className="text-[15px] font-semibold text-[#1A1A1A] mb-2" style={{ fontFamily: "'Fraunces', serif" }}>{sendPopup.title}</h3>
            <p className="text-[13px] leading-6 text-[#4F3E2F]">{sendPopup.message}</p>
            {sendPopup.tone !== 'pending' && (
              <div className="mt-4 flex justify-end">
                <button onClick={() => setSendPopup(null)} className="v3-btn-primary" data-testid="pitch-popup-close">OK</button>
              </div>
            )}
          </div>
        </div>
      )}
      {genPopup.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4" data-testid="pitch-gen-popup">
          <div className="w-full max-w-md rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${genPopup.status === 'complete' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : genPopup.status === 'failed' ? 'bg-[#FBEAE5] text-[#B54A37]' : 'bg-[#E8F3ED] text-[#1F4A3A]'}`}>
                {genPopup.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : genPopup.status === 'failed' ? <X className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </span>
              <h3 className="text-[16px] font-semibold text-[#1A1A1A]" data-testid="pitch-gen-popup-title">
                {genPopup.status === 'complete' ? 'Pitch Deck ready' : genPopup.status === 'failed' ? 'Generation failed' : 'Generating Pitch Deck'}
              </h3>
              <span className="ml-auto text-[15px] font-semibold text-[#1F4A3A] tabular-nums" data-testid="pitch-gen-popup-percent">{genPopup.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#EDE9E0] overflow-hidden ring-1 ring-inset ring-[#D7CBB8]">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${genPopup.status === 'failed' ? 'bg-[#B54A37]' : 'bg-[#1F4A3A]'}`}
                style={{ width: `${Math.max(2, genPopup.progress)}%` }}
                data-testid="pitch-gen-popup-bar"
              />
            </div>
            <p className="mt-3 text-[13px] leading-6 text-[#4F3E2F]" data-testid="pitch-gen-popup-message">
              {genPopup.message || (genPopup.status === 'running' ? 'Writing all ten Pitch Deck sections…' : '')}
            </p>
            {genPopup.status === 'running' && (
              <p className="mt-1 text-[11px] text-[#6E6657]">
                Drafting Pitch Deck. Please keep this page open - this window will close automatically when it reaches 100%.
              </p>
            )}
            {genPopup.status === 'failed' && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setGenPopup((prev) => ({ ...prev, open: false }))} className="v3-btn-primary" data-testid="pitch-gen-popup-close">OK</button>
              </div>
            )}
          </div>
        </div>
      )}

      {previewOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6"
          data-testid="pitch-flipbook-modal"
          onClick={(e) => { if (e.target === e.currentTarget) setPreviewOpen(false); }}
        >
          <div
            className="relative flex flex-col rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] shadow-2xl overflow-hidden"
            style={{ width: '1120px', maxWidth: '94vw', height: '720px', maxHeight: '88vh' }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#E6E0D2] bg-[#FBFAF7] px-5 py-4">
              <div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A] leading-tight">Pitch Deck - Flipbook Preview</h3>
                <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">V1 Admin · Pitch Deck</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="v3-btn-secondary text-[12px]"
                data-testid="pitch-flipbook-close"
              >
                Close
              </button>
            </div>
            <iframe
              title="Pitch Deck Flipbook Preview"
              src={v3PitchDeckFlipbookUrl(deck.id)}
              className="flex-1 w-full border-0 bg-transparent"
              data-testid="pitch-flipbook-iframe"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>
      )}
    </FlowShell>
  );
};

export const V3BusinessCasePlanCreatorBriefingCall = () => {
  const { id, snapshotId, bundle } = useBusinessCaseBundle();
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
      .map(([key, item]) => `${cleanV1Text(key)}: ${strategyCellText(item)}`)
      .join(' | ');
  }
  return cleanMoneyText(value || '');
};

const numericProjectValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = cleanMoneyText(value || '').replace(/,/g, '').toLowerCase();
  const match = text.match(/\d+(?:\.\d+)?/);
  if (!match) return 0;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return 0;
  if (/\bm\b|million/.test(text)) return Math.round(amount * 1000000);
  if (/\bk\b|thousand/.test(text)) return Math.round(amount * 1000);
  return Math.round(amount);
};

const valueFromStrategySnapshot = (snapshot) => {
  const direct = numericProjectValue(snapshot?.total_value || snapshot?.estimated_value || snapshot?.budget_total || snapshot?.approved_value);
  if (direct) return direct;
  const budgetRows = Array.isArray(snapshot?.budget) ? snapshot.budget : [];
  const summedBudget = budgetRows.reduce((sum, item) => sum + numericProjectValue(item?.amount || item?.value || item?.cost), 0);
  if (summedBudget) return summedBudget;
  const values = [];
  (Array.isArray(snapshot?.sections) ? snapshot.sections : []).forEach((section) => {
    (Array.isArray(section?.rows) ? section.rows : []).forEach((row) => {
      Object.entries(row || {}).forEach(([key, item]) => {
        const label = cleanV1Text(key).toLowerCase();
        const amount = numericProjectValue(item);
        if (amount && /budget|value|fee|cost|commercial|range|total/.test(label)) values.push(amount);
      });
    });
  });
  return values.length ? Math.max(...values) : 0;
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
      {section.content && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#4F3E2F]">{cleanV1Text(section.content)}</p>}
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
              <span className="text-[11px] text-[#8A8A8A] mt-1.5">{section.type === 'numbered' ? `${index + 1}.` : '-'}</span>
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
  const [sendPopup, setSendPopup] = useState(null);
  const snapshot = bundle?.creative_snapshot || null;
  const brandComments = Array.isArray(snapshot?.brand_comments) ? snapshot.brand_comments : [];

  // Auto-generate the Strategy Snapshot on first open. Admin shouldn't have
  // to click a "Generate" button - a loading popup shows while it's being
  // prepared, then the snapshot renders. Guarded so we don't spam the API
  // on re-renders.
  const autoGenAttempted = useRef(false);
  useEffect(() => {
    if (!bundle || snapshot || generating || autoGenAttempted.current) return;
    autoGenAttempted.current = true;
    (async () => {
      setGenerating(true);
      setSendPopup({ title: 'Loading Strategy Snapshot', message: 'Preparing the Strategy Snapshot for this Business Case…', tone: 'pending' });
      try {
        await v3CreateSnapshot({ business_case_id: id });
        await reload();
        setSendPopup(null);
      } catch (e) {
        setSendPopup(null);
        setNotice(e?.response?.data?.detail || e?.message || 'Could not load the Strategy Snapshot.');
        // Allow retry on the next mount/reload.
        autoGenAttempted.current = false;
      } finally {
        setGenerating(false);
      }
    })();
  }, [bundle, snapshot, generating, id, reload]);
  const sendToBrand = async () => {
    setNotice('');
    setSendPopup({ title: 'Sending', message: 'Sending Strategy Snapshot to the registered brand email...', tone: 'pending' });
    try {
      const result = await v3SendStrategySnapshotToBrand(id);
      await reload();
      const status = result?.email?.status || 'queued';
      const recipient = result?.email?.to || getBrand(bundle)?.email || 'the registered brand email';
      const deliveryError = result?.email?.delivery_error || '';
      if (status === 'sent') {
        setSendPopup({ title: 'Sent', message: `Strategy Snapshot sent to ${recipient}.`, tone: 'success' });
      } else {
        setSendPopup({ title: status === 'delivery_failed' ? 'Email not delivered' : 'Email queued', message: deliveryError || `Strategy Snapshot queued for ${recipient}.`, tone: 'warning' });
      }
    } catch (e) {
      setSendPopup({ title: 'Email not sent', message: e?.response?.data?.detail || e?.message || 'Could not send Strategy Snapshot yet.', tone: 'warning' });
    }
  };
  const downloadStrategyGoogleDoc = () => {
    if (!snapshot?.id) {
      setNotice('Generate the Strategy Snapshot before downloading it.');
      return;
    }
    window.open(v3StrategySnapshotDocxUrl(snapshot.id), '_blank');
    setNotice('Google Docs-compatible Strategy Snapshot opened for download.');
  };
  const approve = async () => {
    setNotice('');
    setSendPopup({ title: 'Approving', message: 'Approving Strategy Snapshot and opening Planning…', tone: 'pending' });
    try {
      await v3ApproveSnapshot(id, 'admin');
      // Per Chioma: fee can be paid off-platform and contract is handled in
      // Delivery, so the Planning area should open immediately on approval.
      try {
        if (getCase(bundle).stage === 'plan') {
          await v3AdvanceBusinessCase(id, { actor: 'admin', override: true, reason: 'Strategy Snapshot approved by admin.' });
        }
      } catch (_advErr) { /* already advanced or backend not required */ }
      await reload();
      setSendPopup({ title: 'Opening Planning', message: 'Strategy Snapshot approved. Opening the Planning phase.', tone: 'success' });
      window.setTimeout(() => navigate(adminRoute(`/business-cases/${id}/plan/planning`)), 450);
    } catch (e) {
      setSendPopup(null);
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
    <FlowShell title="Strategy Snapshot Studio"  nextAction="Review, send to brand and creatives, then approve.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]">{notice}</div>}
      {/* Top toolbar - primary action only.
          Approve Snapshot lives on the RIGHT (the headline action).
          Save changes / Cancel only appear here while editing.
          Edit / Send / Download moved to the BOTTOM of the page card. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {snapshot && editing && (
          <>
            <button onClick={saveEdits} disabled={savingEdit} className="v3-btn-primary" data-testid="strategy-save-edit-btn">
              <Save className="w-3.5 h-3.5" /> {savingEdit ? 'Saving...' : 'Save changes'}
            </button>
            <button onClick={cancelEditing} disabled={savingEdit} className="v3-btn-secondary" data-testid="strategy-cancel-edit-btn">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </>
        )}
        {snapshot && !editing && (
          <button onClick={approve} className="v3-btn-primary" data-testid="strategy-approve-btn">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approve Snapshot
          </button>
        )}
      </div>
      {sendPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 px-4" data-testid="strategy-sent-popup">
          <div className="w-full max-w-sm rounded-[8px] border border-[#D7CBB8] bg-[#FBFAF7] p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${sendPopup.tone === 'success' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : 'bg-[#FBF4E4] text-[#7A5A1E]'}`}>
                {sendPopup.tone === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
              </span>
              <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{sendPopup.title}</h3>
            </div>
            <p className="text-[13px] leading-6 text-[#4F3E2F]">{sendPopup.message}</p>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setSendPopup(null)} className="v3-btn-primary" data-testid="strategy-sent-popup-close">OK</button>
            </div>
          </div>
        </div>
      )}
      <InfoCard title="Strategy Snapshot">
        {!snapshot ? (
          <p className="text-[13px] text-[#8A8A8A]">No Strategy Snapshot generated yet.</p>
        ) : editing ? (
          <div className="space-y-4 rounded-[8px] border border-[#1F4A3A]/30 bg-[#FBFAF7] p-4" data-testid="strategy-snapshot-editor">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Editing - changes are not saved until you press Save</p>
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
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Status: {humanStatus(snapshot.status || 'draft')}</p>
              <h3 className="text-[16px] font-semibold text-[#1A1A1A]">{snapshot.title || 'Strategy Snapshot'}</h3>
              <p className="mt-1 text-[11px] text-[#8A8A8A]">Template: {cleanV1Text(snapshot.template_name || 'Copy of Updated Creative Strategy Template.docx').replace(/_/g, ' ')}</p>
            </div>
            {strategySectionsForPreview(snapshot).map((section, index) => (
              <StrategySectionPreview key={`${section.heading || 'strategy-section'}-${index}`} section={section} />
            ))}
          </div>
        )}
      </InfoCard>
      <InfoCard title="Strategy Draft (working notes)">
        <StrategyDraftEditor
          businessCaseId={id}
          initialDraft={bundle?.business_case?.plan?.strategy_draft}
          onSaved={() => reload().catch(() => {})}
          actor="admin"
        />
      </InfoCard>
      {brandComments.length > 0 && !editing && (
        <InfoCard title={`Brand Comments (${brandComments.length})`}>
          <div className="space-y-3" data-testid="strategy-brand-comments">
            {brandComments.map((comment, index) => (
              <div key={comment.id || index} className="rounded-[8px] border border-[#E8E4DB] bg-[#FBFAF7] p-3">
                <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">
                  {comment.author || "Brand"}{comment.quoted_text && comment.quoted_text !== 'Brand review' ? ` · ${comment.quoted_text}` : ''} - {formatDateTime(comment.created_at)}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-[#4F3E2F]">
                  {cleanV1Text(comment.comment || comment.content || comment)}
                </p>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Bottom actions: Edit, Send to brand, Download Google Docs.
          Moved here per Chioma's feedback so the page reads top-to-bottom and
          the secondary actions don't compete with Approve Snapshot at the top. */}
      {snapshot && !editing && (
        <InfoCard title="Actions">
          <p className="text-[12px] text-[#6E6657] mb-3">Edit the Strategy Snapshot, send it to the brand for review, or download a Google Docs-compatible copy.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={startEditing} className="v3-btn-secondary" data-testid="strategy-edit-btn">
              <Edit3 className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={sendToBrand} className="v3-btn-secondary" data-testid="strategy-send-btn">
              <Send className="w-3.5 h-3.5" /> Send to brand
            </button>
            <button onClick={downloadStrategyGoogleDoc} className="v3-btn-secondary" data-testid="strategy-download-google-docs-btn">
              <Download className="w-3.5 h-3.5" /> Download Google Docs
            </button>
          </div>
        </InfoCard>
      )}
    </FlowShell>
  );
};

export const V3BusinessCasePlanWaitingBrand = () => {
  const navigate = useNavigate();
  const { id, bundle, loading } = useBusinessCaseBundle();
  useEffect(() => {
    if (!loading && bundle) {
      // Strategy Snapshot step removed - the brief flow now continues straight
      // into the Planning phase.
      navigate(adminRoute(`/business-cases/${id}/plan/planning`), { replace: true });
    }
  }, [bundle, id, loading, navigate]);
  return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Opening Planning...</div>;
};

// ============================================================================
// Planning - Feedback Page (V3BusinessCasePlanFeedback)
// ============================================================================
//
// What this page is for
// ---------------------
// A dedicated, reusable Feedback page that sits inside the Planning phase of
// the Business Case area. Per Chioma's clarification (2026-06-29): TASCK
// should be able to request feedback from BOTH brand and creative
// REGULARLY during a project, and the Feedback page MUST NOT open a new
// page on send - admin keeps composing and sending from here.
//
// Backend contract
// ----------------
// POST /api/v3/business-cases/{bc_id}/feedback/request
//   payload: { target: "brand" | "creator", body: string, subject?: string }
//   side effects:
//     - queues an email via queue_email() to the brand/creator email on file
//     - inserts a v3_feedback_requests document
//   returns: { ok, feedback_request, email }
//
// GET /api/v3/business-cases/{bc_id}/feedback/requests
//   returns: latest 100 v3_feedback_requests for this Business Case (DESC)
//
// Page guarantees
// ---------------
//   1. Admin can target either Brand or Creator with a radio toggle.
//   2. Subject is optional - the backend supplies a sensible default if
//      omitted ("TASCK feedback request - {project_title}").
//   3. The page reloads the history after every send so the most recent
//      request appears at the top without a manual refresh.
//   4. The page does NOT navigate away on a successful send. The textarea
//      is cleared and a green confirmation message replaces it.
//   5. Validation:
//        - body is required (frontend + backend both enforce non-empty)
//        - the selected target must have an email on file (backend 400 if not)
//
// Where to find related pieces
// ----------------------------
//   - Backend endpoint: backend/v3_routes.py - search "feedback/request"
//   - API helpers:      frontend/src/lib/v3api.js - v3SendFeedbackRequest,
//                       v3ListFeedbackRequests
//   - Route mount:      frontend/src/App.js - /admin/business-cases/:id/plan/feedback
//   - Sister Planning pages: Delivery Summary (the Planning landing) and
//     Contract Studio - they sit alongside this page in Planning. Admin can
//     come back to this Feedback page at any time during the project.
// ============================================================================
export const V3BusinessCasePlanFeedback = () => {
  const navigate = useNavigate();
  const { id, bundle } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const creator = bundle?.creator || {};
  const brandEmail = brand?.email || bc?.brand_contact_snapshot?.email || '';
  const creatorEmail = creator?.email || creator?.contact_email || '';

  // Compose state. We deliberately keep these as local component state so
  // navigating away from /plan/feedback and coming back resets the form,
  // but the history (from the backend) re-fetches and stays accurate.
  const [target, setTarget] = useState('brand');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load the request history on mount and whenever the business case id
  // changes. Wrapped so the Refresh button below can reuse it.
  const loadHistory = useCallback(() => {
    if (!id) return Promise.resolve();
    setHistoryLoading(true);
    return v3ListFeedbackRequests(id)
      .then((rows) => setHistory(Array.isArray(rows) ? rows : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Quick-fill templates so admin doesn't always start from a blank textarea.
  // Picking a template populates the body input; admin can still edit before
  // sending. These are intentionally short so the brand/creator reads them.
  const templates = [
    {
      key: 'midpoint',
      label: 'Midpoint check-in',
      body: 'We are at the midpoint of the project. How is the collaboration feeling so far? Anything we should adjust before the next phase?',
    },
    {
      key: 'post_milestone',
      label: 'Post-milestone',
      body: 'Now that we have hit this milestone, please share what worked, what did not, and any blockers you are seeing for the next round.',
    },
    {
      key: 'pre_launch',
      label: 'Pre-launch',
      body: 'Before launch, please confirm everything reads correctly from your end and share any final concerns about the deliverables, timing, or approvals.',
    },
    {
      key: 'general',
      label: 'General check-in',
      body: 'Sharing this short note to ask for your honest feedback on how TASCK is supporting the project so far. What is going well? What should we improve?',
    },
  ];

  const sendFeedback = async () => {
    setNotice('');
    const trimmed = body.trim();
    if (!trimmed) {
      setNotice('Write a short message before sending.');
      return;
    }
    setSending(true);
    try {
      const result = await v3SendFeedbackRequest(id, {
        target,
        body: trimmed,
        ...(subject.trim() ? { subject: subject.trim() } : {}),
      });
      // Keep the admin on this page. Clear the body but keep the target +
      // subject so they can fire a follow-up message quickly.
      setBody('');
      const status = result?.email?.status || 'queued';
      const recipient = result?.feedback_request?.recipient || target;
      const deliveryError = result?.email?.delivery_error;
      if (status === 'sent') {
        setNotice(`Feedback request sent to ${recipient}.`);
      } else if (status === 'delivery_failed') {
        setNotice(`Email queued but delivery failed: ${deliveryError || 'unknown reason'}.`);
      } else {
        setNotice(`Feedback request queued for ${recipient} (status: ${status}).`);
      }
      await loadHistory();
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not send the feedback request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <FlowShell
      title="Feedback (Planning)"
      subtitle="Request feedback from the brand and creatives at any point during the project. Coming back to this page sends another round - it never opens a new screen."
      nextAction="Use this page regularly. Past requests are logged below."
    >
      {/* Compose card */}
      <InfoCard title="Send a feedback request">
        {/* Recipient picker */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <label className="text-[12px] flex items-center gap-1.5" data-testid="feedback-target-brand-label">
            <input
              type="radio"
              name="feedback-target"
              value="brand"
              checked={target === 'brand'}
              onChange={() => setTarget('brand')}
              data-testid="feedback-target-brand"
            />
            Brand{brandEmail ? ` (${brandEmail})` : ' (no email on file)'}
          </label>
          <label className="text-[12px] flex items-center gap-1.5" data-testid="feedback-target-creator-label">
            <input
              type="radio"
              name="feedback-target"
              value="creator"
              checked={target === 'creator'}
              onChange={() => setTarget('creator')}
              data-testid="feedback-target-creator"
            />
            Creator{creatorEmail ? ` (${creatorEmail})` : ' (no email on file)'}
          </label>
        </div>

        {/* Optional subject override */}
        <label className="block text-[11px] text-[#6E6657] mb-1">Subject (optional)</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={`TASCK feedback request - ${bc.title || 'this project'}`}
          className="w-full text-[12px] rounded-md border border-[#D7CBB8] bg-white px-3 py-2 text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none mb-2"
          data-testid="feedback-subject"
        />

        {/* Quick-fill templates */}
        <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Quick start</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {templates.map((tpl) => (
            <button
              key={tpl.key}
              type="button"
              onClick={() => setBody(tpl.body)}
              className="v3-btn-secondary text-[11px]"
              data-testid={`feedback-template-${tpl.key}`}
            >
              {tpl.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <label className="block text-[11px] text-[#6E6657] mb-1">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="What feedback are you looking for? Be specific so the brand/creator can respond directly."
          className="w-full text-[12px] rounded-md border border-[#D7CBB8] bg-white px-3 py-2 text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none"
          data-testid="feedback-body"
        />

        {/* Send + status notice */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button
            type="button"
            onClick={sendFeedback}
            disabled={sending}
            className="v3-btn-primary text-[12px]"
            data-testid="feedback-send"
          >
            <Mail className="w-3.5 h-3.5" /> {sending ? 'Sending…' : `Send to ${target}`}
          </button>
          <button
            type="button"
            onClick={() => navigate(adminRoute(`/business-cases/${id}/delivery/summary`))}
            className="v3-btn-secondary text-[11px]"
            data-testid="feedback-back-to-planning"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Planning
          </button>
        </div>
        {notice && (
          <p className="mt-2 text-[12px] text-[#1F4A3A]" data-testid="feedback-notice">{notice}</p>
        )}
      </InfoCard>

      {/* History */}
      <InfoCard
        title="Recent feedback requests"
        action={(
          <button type="button" onClick={() => loadHistory()} className="v3-btn-secondary text-[11px]" data-testid="feedback-refresh">
            Refresh
          </button>
        )}
      >
        {historyLoading ? (
          <p className="text-[12px] text-[#8A8A8A]">Loading history…</p>
        ) : history.length === 0 ? (
          <p className="text-[12px] text-[#8A8A8A]">No feedback requests sent yet for this Business Case. Use the form above to send the first one.</p>
        ) : (
          <ul className="text-[12px] text-[#4F3E2F] space-y-2 max-h-[420px] overflow-y-auto pr-1" data-testid="feedback-history-list">
            {history.map((row) => (
              <li key={row.id} className="border border-[#E8E4DB] rounded-md p-2 bg-[#FBFAF7]">
                <p className="text-[11px] text-[#6E6657]">
                  <strong>{row.target === 'brand' ? 'Brand' : 'Creator'}</strong>
                  {' · '}
                  {row.recipient || 'no recipient'}
                  {' · '}
                  {formatDateTime(row.created_at)}
                  {' · '}
                  <span className={row.email_status === 'sent' ? 'text-[#1F4A3A]' : 'text-[#7A5A1E]'}>
                    {humanStatus(row.email_status || 'queued')}
                  </span>
                </p>
                <p className="text-[11px] text-[#4F3E2F] mt-1 whitespace-pre-wrap">{row.body}</p>
                {row.delivery_error && (
                  <p className="text-[10px] text-[#B54A37] mt-1">Delivery error: {row.delivery_error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </InfoCard>
    </FlowShell>
  );
};


// ============================================================================
// Planning landing (V3BusinessCaseDeliverySummary)
// ============================================================================
//
// Despite its V3-era function name, this component IS the Planning phase
// landing page in the V1 admin (mounted at /plan/planning and at the legacy
// /delivery/summary alias). Per Chioma's latest mapping the Planning phase
// groups three pages:
//   1. This page (Planning summary) - project at a glance, brand + creator
//      details, brainstorming concept, TIMELINES, and INVOICING.
//   2. Contract Studio (/delivery/contracts) - linked from here.
//   3. Feedback (/plan/feedback) - V3BusinessCasePlanFeedback above.
//
// Delivery phase contains the Deliverables page only. Reporting contains
// the Final Report. The stepper handles those links.
// ============================================================================
export const V3BusinessCaseDeliverySummary = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const bc = getCase(bundle);
  const planningDone = Boolean(bc.plan?.planning_completed_at);
  const [completingPlanning, setCompletingPlanning] = useState(false);
  const [planningNotice, setPlanningNotice] = useState('');
  const completePlanning = async () => {
    setPlanningNotice('');
    setCompletingPlanning(true);
    try {
      await v3CompleteSubphase(id, 'planning');
      await reload();
      navigate(adminRoute(`/business-cases/${id}/delivery/deliverables`));
    } catch (e) {
      setPlanningNotice(e?.response?.data?.detail || e?.message || 'Could not complete Planning.');
    } finally {
      setCompletingPlanning(false);
    }
  };
  const brand = getBrand(bundle);
  const contact = bc.brand_contact_snapshot || {};
  const creator = bundle?.creator || {};
  const snapshot = bundle?.creative_snapshot || {};
  const alignment = bundle?.alignment_snapshot || {};
  const brainstorm = bundle?.brainstorm_round || {};
  const invoices = Array.isArray(bundle?.invoices) ? bundle.invoices : [];
  const approvedValue = numericProjectValue(bc.estimated_value);
  const strategyValue = valueFromStrategySnapshot(snapshot);
  const projectValue = approvedValue || strategyValue;
  const [projectValueInput, setProjectValueInput] = useState(projectValue ? String(projectValue) : '');
  const [valueNotice, setValueNotice] = useState('');
  // Timelines: prefer the admin-edited case.plan.timeline_plan (saved from the
  // editable textarea below), then fall back to Phase 5 execution plan or any
  // stored timeline string on the brainstorm round.
  const persistedTimeline = (bc.plan && bc.plan.timeline_plan) || '';
  const brainstormTimelineSource = brainstorm.phase_5_execution || brainstorm.timeline || null;
  const brainstormTimelineText = (() => {
    if (!brainstormTimelineSource) return '';
    if (typeof brainstormTimelineSource === 'string') return brainstormTimelineSource;
    return brainstormTimelineSource.timeline || brainstormTimelineSource.schedule || brainstormTimelineSource.summary || '';
  })();
  const fallbackTimelineText = brainstormTimelineText;

  // ----- Editable Timelines state -----
  const [timelineDraft, setTimelineDraft] = useState(persistedTimeline || fallbackTimelineText);
  const [timelineSaving, setTimelineSaving] = useState(false);
  const [timelineNotice, setTimelineNotice] = useState('');
  useEffect(() => {
    // Keep the textarea in sync when the bundle reloads (e.g. after save).
    setTimelineDraft(persistedTimeline || fallbackTimelineText);
  }, [persistedTimeline, fallbackTimelineText]);
  const saveTimeline = async () => {
    setTimelineNotice('');
    setTimelineSaving(true);
    try {
      await v3UpdatePlanningText(id, { timeline_plan: timelineDraft });
      await reload();
      setTimelineNotice('Timeline saved.');
    } catch (e) {
      setTimelineNotice(e?.response?.data?.detail || e?.message || 'Could not save the timeline.');
    } finally {
      setTimelineSaving(false);
    }
  };

  // ----- Editable Invoicing state -----
  // Per-row drafts so admin can tweak inline; an empty draft means no pending edit.
  const [invoiceDrafts, setInvoiceDrafts] = useState({}); // { invId: { kind, amount, status } }
  const [invoiceBusyId, setInvoiceBusyId] = useState(null);
  const [invoiceNotice, setInvoiceNotice] = useState('');
  // New-invoice composer (collapsed by default).
  const [newInvoiceOpen, setNewInvoiceOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ kind: 'invoice', amount: '', status: 'issued', notes: '' });
  const draftFor = (inv) => invoiceDrafts[inv.id] || {};
  const draftField = (inv, field) => {
    const d = invoiceDrafts[inv.id];
    if (d && Object.prototype.hasOwnProperty.call(d, field)) return d[field];
    if (field === 'amount') return String(inv.amount ?? '');
    return inv[field] ?? '';
  };
  const setDraftField = (invId, field, value) => {
    setInvoiceDrafts((prev) => ({ ...prev, [invId]: { ...(prev[invId] || {}), [field]: value } }));
  };
  const rowHasEdits = (invId) => Boolean(invoiceDrafts[invId] && Object.keys(invoiceDrafts[invId]).length);
  const saveInvoiceRow = async (inv) => {
    const d = invoiceDrafts[inv.id];
    if (!d) return;
    setInvoiceNotice('');
    setInvoiceBusyId(inv.id);
    try {
      const payload = {};
      if (d.kind !== undefined) payload.kind = d.kind;
      if (d.amount !== undefined) payload.amount = Number(d.amount) || 0;
      if (d.status !== undefined) payload.status = d.status;
      await v3UpdateInvoice(inv.id, payload);
      await reload();
      setInvoiceDrafts((prev) => { const next = { ...prev }; delete next[inv.id]; return next; });
      setInvoiceNotice('Invoice updated.');
    } catch (e) {
      setInvoiceNotice(e?.response?.data?.detail || e?.message || 'Could not save invoice.');
    } finally {
      setInvoiceBusyId(null);
    }
  };
  const deleteInvoiceRow = async (inv) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete invoice "${humanStatus(inv.kind || 'invoice')}"? This cannot be undone.`)) return;
    setInvoiceNotice('');
    setInvoiceBusyId(inv.id);
    try {
      await v3DeleteInvoice(inv.id);
      await reload();
      setInvoiceDrafts((prev) => { const next = { ...prev }; delete next[inv.id]; return next; });
      setInvoiceNotice('Invoice deleted.');
    } catch (e) {
      setInvoiceNotice(e?.response?.data?.detail || e?.message || 'Could not delete invoice.');
    } finally {
      setInvoiceBusyId(null);
    }
  };
  const markInvoicePaid = async (inv) => {
    setInvoiceNotice('');
    setInvoiceBusyId(inv.id);
    try {
      await v3MarkInvoicePaid(inv.id);
      await reload();
      setInvoiceNotice('Invoice marked paid.');
    } catch (e) {
      setInvoiceNotice(e?.response?.data?.detail || e?.message || 'Could not mark paid.');
    } finally {
      setInvoiceBusyId(null);
    }
  };
  const createInvoice = async () => {
    setInvoiceNotice('');
    const amount = Number(newInvoice.amount) || 0;
    if (!newInvoice.kind.trim()) {
      setInvoiceNotice('Enter a kind for the new invoice (e.g. retainer, milestone, balance).');
      return;
    }
    setInvoiceBusyId('__new__');
    try {
      await v3CreateInvoice({
        business_case_id: id,
        kind: newInvoice.kind.trim(),
        amount,
        status: newInvoice.status,
        notes: newInvoice.notes || undefined,
      });
      await reload();
      setNewInvoice({ kind: 'invoice', amount: '', status: 'issued', notes: '' });
      setNewInvoiceOpen(false);
      setInvoiceNotice('Invoice added.');
    } catch (e) {
      setInvoiceNotice(e?.response?.data?.detail || e?.message || 'Could not add invoice.');
    } finally {
      setInvoiceBusyId(null);
    }
  };

  // ----- Invoice file upload (multi-file) -----
  // Per Chioma: the Invoicing card should let admin upload one or more
  // invoice documents instead of typing them in. We POST one file per call
  // to /invoices/upload (base64 encoded inline) and reload the bundle once.
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [invoiceUploadProgress, setInvoiceUploadProgress] = useState(''); // "3 of 5 uploaded"
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Could not read file'));
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
  const uploadInvoiceFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    setInvoiceNotice('');
    setInvoiceUploading(true);
    setInvoiceUploadProgress(`0 of ${files.length} uploaded`);
    let success = 0;
    let firstError = '';
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      try {
        const b64 = await fileToBase64(file);
        await v3UploadInvoice({
          business_case_id: id,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_data_base64: b64,
        });
        success += 1;
        setInvoiceUploadProgress(`${success} of ${files.length} uploaded`);
      } catch (e) {
        if (!firstError) firstError = e?.response?.data?.detail || e?.message || `Could not upload ${file.name}.`;
      }
    }
    await reload();
    setInvoiceUploading(false);
    setInvoiceUploadProgress('');
    if (success === 0) {
      setInvoiceNotice(firstError || 'No invoice files were uploaded.');
    } else if (success < files.length) {
      setInvoiceNotice(`${success} of ${files.length} files uploaded. First error: ${firstError}`);
    } else {
      setInvoiceNotice(`${success} invoice ${success === 1 ? 'file' : 'files'} uploaded.`);
    }
  };
  useEffect(() => {
    setProjectValueInput(projectValue ? String(projectValue) : '');
  }, [projectValue]);
  const saveProjectValue = async () => {
    const nextValue = numericProjectValue(projectValueInput);
    if (!nextValue) {
      setValueNotice('Enter a real project value before approval.');
      return;
    }
    setValueNotice('Saving approved project value...');
    try {
      await v3UpdateBusinessCaseValue(id, { estimated_value: nextValue, approved_by: 'admin' });
      await reload();
      setValueNotice('Project value approved and saved to the real V3 business case.');
    } catch (e) {
      setValueNotice(e?.response?.data?.detail || e?.message || 'Could not save the project value.');
    }
  };
  const conceptBlock = cleanV1Text(snapshot.concept || alignment.concept || '-');
  const executiveRows = (() => {
    const exec = (snapshot.sections || []).find((s) => /executive/i.test(s.heading || ''));
    return Array.isArray(exec?.rows) ? exec.rows : [];
  })();
  return (
    <FlowShell
      title="Planning"
      subtitle="Planning phase landing. Confirm the project value, review brand & creator details, lock timelines, manage invoicing, and open the Contract Studio or Feedback page when needed."
      nextAction="Lock the timeline and invoicing here, generate contracts in Contract Studio, request feedback from the Feedback page. Move to Delivery when deliverables start."
    >
      <InfoCard title="Project at a glance">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Title</span>{cleanV1Text(bc.title)}</div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Total value</span>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={projectValueInput}
                onChange={(event) => setProjectValueInput(event.target.value)}
                className="w-full rounded-md border border-[#D7CBB8] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none"
                placeholder="Enter project value, e.g. 100000000"
                data-testid="delivery-project-value-input"
              />
              <button type="button" onClick={saveProjectValue} className="v3-btn-secondary whitespace-nowrap" data-testid="delivery-project-value-approve-btn">Approve value</button>
            </div>
            <p className="mt-1 text-[11px] text-[#6E6657]">Current value: {projectValue ? formatNairaV3(projectValue) : 'Not approved yet'}</p>
            {valueNotice && <p className="mt-1 text-[11px] text-[#1F4A3A]">{valueNotice}</p>}
          </div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Engagement track</span>{humanStatus(bc.engagement_track || '-')}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Stage</span>{humanStatus(bc.stage)}</div>
        </div>
      </InfoCard>
      <InfoCard title="Brand details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Company</span>{cleanV1Text(brandDisplayName(brand) || '-')}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Primary contact</span>{cleanV1Text(contact.primary_contact || brand.primary_contact || '-')}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Email</span>{cleanV1Text(contact.email || brand.email || '-')}</div>
          <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Phone</span>{cleanV1Text(contact.phone || brand.phone || '-')}</div>
          <div className="md:col-span-2"><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Website</span>{cleanV1Text(contact.website || brand.website || '-')}</div>
        </div>
      </InfoCard>
      <InfoCard title="Creator details">
        {creator?.id ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Name</span>{creatorName(creator)}</div>
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Email</span>{cleanV1Text(creator.email || '-')}</div>
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Phone</span>{cleanV1Text(creator.phone || '-')}</div>
            <div><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Platforms</span>{cleanV1Text((creator.platforms || []).join(', ') || '-')}</div>
            <div className="md:col-span-2"><span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block">Niche / Content type</span>{cleanV1Text(creator.niche || creator.content_type || '-')}</div>
          </div>
        ) : (
          <p className="text-[13px] text-[#8A8A8A]">No primary creator linked to this Business Case yet.</p>
        )}
      </InfoCard>
      <InfoCard title="Creator Selector ideas & strategy concept">
        <p className="text-[13px] text-[#4F3E2F] whitespace-pre-wrap mb-3"><strong>Concept:</strong> {conceptBlock}</p>
        {executiveRows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[#E8E4DB]">
            <table className="min-w-full divide-y divide-[#E8E4DB] text-left text-[12px]">
              <thead className="bg-[#F4F2EC] text-[#6E6657]"><tr><th className="px-3 py-2 font-semibold">Field</th><th className="px-3 py-2 font-semibold">Detail</th></tr></thead>
              <tbody className="divide-y divide-[#E8E4DB] bg-white text-[#4F3E2F]">
                {executiveRows.map((row, idx) => (
                  <tr key={`exec-${idx}`}><td className="px-3 py-2 align-top">{cleanV1Text(row.Field)}</td><td className="px-3 py-2 align-top">{strategyCellText(row.Detail)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InfoCard>
      {/* Timelines (Planning) - editable. Lock the schedule before Delivery starts. */}
      <InfoCard
        title="Timelines"
        action={(
          <button
            type="button"
            onClick={saveTimeline}
            disabled={timelineSaving}
            className="v3-btn-primary text-[11px] disabled:opacity-60"
            data-testid="planning-timeline-save"
          >
            <Save className="w-3.5 h-3.5" /> {timelineSaving ? 'Saving…' : 'Save timeline'}
          </button>
        )}
      >
        <label className="block text-[11px] text-[#6E6657] mb-1">
          Edit the timeline directly here. Saved to this Business Case.
        </label>
        <textarea
          value={timelineDraft}
          onChange={(e) => setTimelineDraft(e.target.value)}
          rows={6}
          placeholder="Add the launch window, approval rhythm, production windows, and reporting period. Use plain text or bullets - anything that helps Delivery run the schedule."
          className="w-full text-[12px] rounded-md border border-[#D7CBB8] bg-white px-3 py-2 text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none"
          data-testid="planning-timeline-input"
        />
        {!persistedTimeline && fallbackTimelineText && (
          <p className="mt-2 text-[11px] text-[#6E6657]">
            Loaded from the Brainstorm round as a starting point. Edit and save to lock it on this Business Case.
          </p>
        )}
        {timelineNotice && (
          <p className="mt-2 text-[11px] text-[#1F4A3A]" data-testid="planning-timeline-notice">{timelineNotice}</p>
        )}
        <p className="mt-2 text-[11px] text-[#6E6657]">Lock the launch window and approval rhythm here. Delivery uses these dates when running deliverables.</p>
      </InfoCard>

      {/* Invoicing (Planning) - editable rows + add. Invoices can be paid off-platform. */}
      <InfoCard
        title="Invoicing"
        action={(
          <button
            type="button"
            onClick={() => setNewInvoiceOpen((v) => !v)}
            className="v3-btn-secondary text-[11px]"
            data-testid="planning-invoice-add-toggle"
          >
            <Plus className="w-3.5 h-3.5" /> {newInvoiceOpen ? 'Cancel add' : 'Add invoice'}
          </button>
        )}
      >
        {invoiceNotice && (
          <p className="mb-2 text-[11px] text-[#1F4A3A]" data-testid="planning-invoice-notice">{invoiceNotice}</p>
        )}

        {/* Upload zone (multi-file). Per Chioma: admin should upload invoice
            documents, not type them in. One file = one invoice record. */}
        <label
          htmlFor="planning-invoice-file-input"
          className={`block rounded-md border-2 border-dashed bg-[#FBFAF7] p-4 text-center cursor-pointer transition-colors ${invoiceUploading ? 'border-[#D7CBB8] opacity-70' : 'border-[#D7CBB8] hover:border-[#1F4A3A]'}`}
          data-testid="planning-invoice-upload-zone"
        >
          <Upload className="w-5 h-5 text-[#1F4A3A] inline-block" />
          <p className="text-[12px] text-[#4F3E2F] mt-1 font-medium">
            {invoiceUploading ? `Uploading… ${invoiceUploadProgress}` : 'Click to upload one or more invoice files'}
          </p>
          <p className="text-[11px] text-[#6E6657] mt-0.5">PDF, DOCX, PNG, JPG. Each file becomes a separate invoice record. Up to 10MB per file.</p>
          <input
            id="planning-invoice-file-input"
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
            multiple
            className="hidden"
            disabled={invoiceUploading}
            onChange={(e) => {
              uploadInvoiceFiles(e.target.files);
              // Clear the input so picking the same file again re-fires onChange.
              e.target.value = '';
            }}
            data-testid="planning-invoice-file-input"
          />
        </label>

        {/* Optional manual composer (kept behind the toggle for the rare case
            where admin wants to record an invoice without a document yet). */}
        {newInvoiceOpen && (
          <div className="rounded-md border border-[#D7CBB8] bg-[#FBFAF7] p-3 mt-3 grid grid-cols-1 md:grid-cols-5 gap-2 items-end" data-testid="planning-invoice-new-row">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Kind</label>
              <input
                value={newInvoice.kind}
                onChange={(e) => setNewInvoice((p) => ({ ...p, kind: e.target.value }))}
                placeholder="retainer, milestone, balance"
                className="w-full text-[12px] rounded-md border border-[#D7CBB8] bg-white px-2 py-1.5"
                data-testid="planning-invoice-new-kind"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Amount (NGN)</label>
              <input
                type="number"
                value={newInvoice.amount}
                onChange={(e) => setNewInvoice((p) => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                className="w-full text-[12px] rounded-md border border-[#D7CBB8] bg-white px-2 py-1.5"
                data-testid="planning-invoice-new-amount"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Status</label>
              <select
                value={newInvoice.status}
                onChange={(e) => setNewInvoice((p) => ({ ...p, status: e.target.value }))}
                className="w-full text-[12px] rounded-md border border-[#D7CBB8] bg-white px-2 py-1.5"
                data-testid="planning-invoice-new-status"
              >
                <option value="draft">Draft</option>
                <option value="issued">Issued</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="void">Void</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-2">
              <input
                value={newInvoice.notes}
                onChange={(e) => setNewInvoice((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes (optional)"
                className="flex-1 text-[12px] rounded-md border border-[#D7CBB8] bg-white px-2 py-1.5"
                data-testid="planning-invoice-new-notes"
              />
              <button
                type="button"
                onClick={createInvoice}
                disabled={invoiceBusyId === '__new__'}
                className="v3-btn-primary text-[11px] disabled:opacity-60"
                data-testid="planning-invoice-new-save"
              >
                <Save className="w-3.5 h-3.5" /> {invoiceBusyId === '__new__' ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        )}

        {/* Uploaded invoices list */}
        {invoices.length === 0 ? (
          <p className="text-[13px] text-[#8A8A8A] mt-3">No invoice files uploaded yet. Use the upload zone above to add one or more invoice documents.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-[#E8E4DB]">
            <table className="min-w-full divide-y divide-[#E8E4DB] text-left text-[12px]">
              <thead className="bg-[#F4F2EC] text-[#6E6657]">
                <tr>
                  <th className="px-3 py-2 font-semibold">File / Kind</th>
                  <th className="px-3 py-2 font-semibold">Amount (NGN)</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Uploaded</th>
                  <th className="px-3 py-2 font-semibold">Paid</th>
                  <th className="px-3 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DB] bg-white text-[#4F3E2F]">
                {invoices.map((inv) => {
                  const isSdf = inv.kind === 'strategy_development_fee';
                  const isPaid = inv.status === 'paid';
                  const busy = invoiceBusyId === inv.id;
                  const hasEdits = rowHasEdits(inv.id);
                  const hasFile = Boolean(inv.file_name);
                  return (
                    <tr key={inv.id} data-testid={`planning-invoice-row-${inv.id}`}>
                      <td className="px-3 py-1.5 align-top">
                        {hasFile ? (
                          <a
                            href={v3InvoiceFileUrl(inv.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[12px] text-[#1F4A3A] underline hover:no-underline inline-flex items-center gap-1"
                            data-testid={`planning-invoice-${inv.id}-download`}
                          >
                            <Download className="w-3 h-3" /> {inv.file_name}
                          </a>
                        ) : (
                          <input
                            value={draftField(inv, 'kind')}
                            onChange={(e) => setDraftField(inv.id, 'kind', e.target.value)}
                            disabled={isSdf}
                            className="w-full text-[12px] rounded-md border border-transparent hover:border-[#D7CBB8] focus:border-[#1F4A3A] bg-white px-2 py-1 disabled:bg-[#F4F2EC]"
                            data-testid={`planning-invoice-${inv.id}-kind`}
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <input
                          type="number"
                          value={draftField(inv, 'amount')}
                          onChange={(e) => setDraftField(inv.id, 'amount', e.target.value)}
                          className="w-full text-[12px] rounded-md border border-transparent hover:border-[#D7CBB8] focus:border-[#1F4A3A] bg-white px-2 py-1"
                          data-testid={`planning-invoice-${inv.id}-amount`}
                          placeholder="0"
                        />
                        <p className="text-[10px] text-[#8A8A8A] mt-0.5">{inv.amount ? formatNairaV3(inv.amount) : 'TBD'}</p>
                      </td>
                      <td className="px-2 py-1.5 align-top">
                        <select
                          value={draftField(inv, 'status')}
                          onChange={(e) => setDraftField(inv.id, 'status', e.target.value)}
                          className="w-full text-[12px] rounded-md border border-transparent hover:border-[#D7CBB8] focus:border-[#1F4A3A] bg-white px-2 py-1"
                          data-testid={`planning-invoice-${inv.id}-status`}
                        >
                          <option value="draft">Draft</option>
                          <option value="issued">Issued</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                          <option value="void">Void</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5 align-top text-[11px]">{inv.issued_at ? formatDateTime(inv.issued_at) : '-'}</td>
                      <td className="px-3 py-1.5 align-top text-[11px]">{inv.paid_at ? formatDateTime(inv.paid_at) : 'Not paid'}</td>
                      <td className="px-2 py-1.5 align-top whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {hasEdits && (
                            <button type="button" onClick={() => saveInvoiceRow(inv)} disabled={busy} className="v3-btn-primary text-[10px] disabled:opacity-60" data-testid={`planning-invoice-${inv.id}-save`}>
                              <Save className="w-3 h-3" /> Save
                            </button>
                          )}
                          {!isPaid && !hasEdits && (
                            <button type="button" onClick={() => markInvoicePaid(inv)} disabled={busy} className="v3-btn-secondary text-[10px] disabled:opacity-60" data-testid={`planning-invoice-${inv.id}-mark-paid`}>
                              Mark paid
                            </button>
                          )}
                          {!isSdf && (
                            <button type="button" onClick={() => deleteInvoiceRow(inv)} disabled={busy} className="v3-btn-secondary text-[10px] disabled:opacity-60 text-[#B54A37]" data-testid={`planning-invoice-${inv.id}-delete`}>
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-[#6E6657]">Upload each invoice document above. Amount and status can be edited inline; click the file name to download. Mark paid stamps the paid date. Invoices can be paid off-platform.</p>
      </InfoCard>

      {/* Other Planning pages */}
      <InfoCard title="Other Planning pages">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/delivery/contracts`))} className="v3-btn-primary justify-start" data-testid="planning-open-contract-btn">
            <FileSignature className="w-3.5 h-3.5" /> Open Contract Studio
          </button>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/plan/feedback`))} className="v3-btn-secondary justify-start" data-testid="planning-open-feedback-btn">
            <Mail className="w-3.5 h-3.5" /> Open Feedback page
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#6E6657]">Contract Studio generates brand & creator agreements from approved templates. The Feedback page is reusable - admin can return at any time to send fresh feedback requests.</p>
      </InfoCard>

      {/* Planning gate: Delivery stays locked until Planning is marked complete. */}
      <InfoCard title="Complete Planning">
        {planningNotice && <p className="mb-2 text-[11px] text-[#B54A37]">{planningNotice}</p>}
        {planningDone ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[13px] text-[#1F4A3A]">Planning is complete. The Delivery phase is now unlocked.</p>
            <button onClick={() => navigate(adminRoute(`/business-cases/${id}/delivery/deliverables`))} className="v3-btn-primary" data-testid="planning-open-delivery-btn"><ArrowRight className="w-3.5 h-3.5" /> Open Delivery</button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-[13px] text-[#6E6657]">Confirm the budget, timelines, invoicing, and contracts are handled. Delivery stays locked until Planning is marked complete.</p>
            <button onClick={completePlanning} disabled={completingPlanning} className="v3-btn-primary disabled:opacity-60" data-testid="planning-complete-btn"><CheckCircle2 className="w-3.5 h-3.5" /> {completingPlanning ? 'Completing…' : 'Complete Planning & Open Delivery'}</button>
          </div>
        )}
      </InfoCard>

      {/* Framing artifacts shortcuts. Even after the Business Case has moved
          into Planning / Delivery / Reporting, admin should be able to jump
          back to any of the Framing documents from one place. */}
      <InfoCard title="Framing artifacts">
        <p className="text-[12px] text-[#6E6657] mb-3">Open any of the Framing documents drafted earlier in this Business Case.</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/snapshot`))} className="v3-btn-secondary justify-start text-[11px]" data-testid="planning-open-alignment-btn">
            <FileText className="w-3.5 h-3.5" /> Alignment Snapshot
          </button>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/brainstorm`))} className="v3-btn-secondary justify-start text-[11px]" data-testid="planning-open-brainstorm-btn">
            <Sparkles className="w-3.5 h-3.5" /> Creator Selector
          </button>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/creator-scan`))} className="v3-btn-secondary justify-start text-[11px]" data-testid="planning-open-creator-scan-btn">
            <Eye className="w-3.5 h-3.5" /> Creator Match
          </button>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/frame/brief`))} className="v3-btn-secondary justify-start text-[11px]" data-testid="planning-open-brief-btn">
            <FileText className="w-3.5 h-3.5" /> Creative Brief
          </button>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/connect`))} className="v3-btn-secondary justify-start text-[11px]" data-testid="planning-open-connect-btn">
            <Eye className="w-3.5 h-3.5" /> Connect
          </button>
        </div>
      </InfoCard>
    </FlowShell>
  );
};
const buildFeedbackPreviewSections = (fb) => {
  if (!fb) return [];
  const sections = [];
  if (fb.email_template) sections.push({ heading: 'Tab 1 - Email Template', content: fb.email_template });
  [['brand_partner', 'Brand Partner Feedback'], ['creative_partner', 'Creative Partner Feedback']].forEach(([key, fallback]) => {
    const block = fb[key];
    if (!block) return;
    sections.push({ heading: block.form_title || fallback, content: block.form_description || '' });
    const header = [`Project name: ${block.project_name || '-'}`, `Date: ${block.date || '-'}`];
    if (block.google_form_link !== undefined) header.push(`Google form link: ${block.google_form_link || '-'}`);
    sections.push({ content: header.join('\n') });
    (block.questions || []).forEach((q, idx) => {
      sections.push({ heading: `${idx + 1}. ${q.label}`, content: `${q.question}\nRating: ${q.rating ?? '-'} / 10` });
    });
    sections.push({ content: `Optional comment: ${block.optional_comment || '-'}` });
  });
  if ((fb.internal_use || []).length) sections.push({ heading: 'Internal Use (Not Shown to Client)', content: fb.internal_use.map((l) => `- ${l}`).join('\n') });
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
                  {section.heading && <p className="text-[12px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">{cleanV1Text(section.heading)}</p>}
                  {section.content && <p className="text-[13px] text-[#4F3E2F] whitespace-pre-wrap leading-relaxed">{cleanV1Text(section.content)}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SHARE_OPTIONS = (label, brandEmail, creatorEmail, includeCreator = false) => {
  const normalized = String(label || '').toLowerCase();
  const isContract = normalized === 'contract';
  const brandLabel = isContract ? 'Send contract to brand' : `Send ${label} to brand`;
  const creatorLabel = isContract ? 'Send contract to creator' : `Send ${label} to creator`;
  const downloadLabel = isContract ? 'Download contract in Google Docs' : `Download ${label} as PDF`;
  return [
    { key: 'email_brand', icon: Mail, label: brandEmail ? `${brandLabel} (${brandEmail})` : brandLabel },
    ...(includeCreator ? [{ key: 'email_creator', icon: Mail, label: creatorEmail ? `${creatorLabel} (${creatorEmail})` : creatorLabel }] : []),
    { key: 'copy_link', icon: FileText, label: `Copy ${label} link` },
    { key: isContract ? 'download_google_docs' : 'download_pdf', icon: Download, label: downloadLabel },
    { key: 'whatsapp', icon: MessageSquare, label: 'Share via WhatsApp' },
  ];
};

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
  const [draftTitle, setDraftTitle] = useState(cleanV1Text(contract.title || ''));
  const [draftSections, setDraftSections] = useState(contract.sections || []);
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const startEdit = () => {
    setDraftTitle(cleanV1Text(contract.title || ''));
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
    // Legacy contracts may have empty sections - hit the PDF endpoint which backfills the doc, then refresh the list.
    if (!(contract.sections && contract.sections.length) && onRefresh) {
      try { await fetch(v3ContractPdfUrl(contract.id), { method: 'GET' }); } catch (_e) {}
      await onRefresh();
    }
    setPreviewOpen(true);
  };
  const isCreator = contract.template === 'creator_principal';
  return (
    <div className="rounded-lg border border-[#E8E4DB] bg-white p-4 mb-3" data-testid={`contract-card-${contract.id}`}>
      <PreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} title={cleanV1Text(contract.title || 'Contract preview')} pdfUrl={v3ContractPdfUrl(contract.id)} sections={(contract.sections || []).map((section) => ({ ...section, heading: cleanV1Text(section.heading || ''), content: cleanV1Text(section.content || '') }))} testId={`contract-preview-${contract.id}`} />
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} className="w-full text-[14px] font-semibold text-[#1A1A1A] border-b border-[#E8E4DB] focus:border-[#1F4A3A] outline-none pb-1" />
          ) : (
            <p className="text-[14px] font-semibold text-[#1A1A1A]">{cleanV1Text(contract.title || contract.template)}</p>
          )}
          <p className="text-[11px] text-[#8A8A8A] mt-1">Status: {humanStatus(contract.status)} | Template: {humanStatus(contract.template)}{contract.signed_at ? ` | Signed at ${contract.signed_at}` : ''}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {editing ? (
            <>
              <button onClick={save} disabled={saving} className="v3-btn-primary text-[11px]"><Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}</button>
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
              <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-1">{cleanV1Text(section.heading)}</p>
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
  // Auto-generate both contracts on page open. Tracks the bootstrap so we
  // only attempt it once per mount and surface a loading popup while the
  // backend creates whichever templates are missing.
  const [bootstrapState, setBootstrapState] = useState({ open: false, progress: 0, message: '', status: 'idle', error: '' });
  const bootstrapAttempted = useRef(false);
  const value = numericProjectValue(getCase(bundle).estimated_value) || valueFromStrategySnapshot(bundle?.creative_snapshot || {}) || 0;
  const brand = getBrand(bundle);
  const brandEmail = bundle?.brand_contact_snapshot?.email || brand?.email || '';
  const creatorEmail = bundle?.creator?.email || '';
  // Contract comments come from the brand portal as interactions (not on the
  // contract doc), so surface them here from the bundle's interactions.
  const contractComments = (Array.isArray(bundle?.interactions) ? bundle.interactions : [])
    .filter((it) => ['brand_contract_comment', 'brand_document_comment'].includes(it?.type))
    .sort((a, b) => new Date(b.date_iso || b.created_at || 0) - new Date(a.date_iso || a.created_at || 0));
  const refreshContracts = async () => {
    const rows = await v3ListContracts(id);
    setContracts(Array.isArray(rows) ? rows : []);
    return Array.isArray(rows) ? rows : [];
  };
  const hasTemplate = (tpl) => contracts.some((c) => c.template === tpl);

  // Internal: create a single contract from a template. Returns the created
  // doc on success; throws on failure (caller decides how to surface).
  const createOne = async (template) => {
    const parties = template === 'brand_msa'
      ? ['TASCK', brandDisplayName(brand)]
      : ['TASCK', creatorName(bundle?.creator)];
    return v3CreateContract({ business_case_id: id, template, value, parties });
  };

  // Bootstrap: load any existing contracts, then auto-generate the two
  // expected templates if missing. Pops a modal so admin sees progress and
  // doesn't think the page is frozen.
  useEffect(() => {
    if (!id || !bundle || bootstrapAttempted.current) return;
    bootstrapAttempted.current = true;
    (async () => {
      try {
        const existing = await refreshContracts();
        const haveBrand = existing.some((c) => c.template === 'brand_msa');
        const haveCreator = existing.some((c) => c.template === 'creator_principal');
        if (haveBrand && haveCreator) {
          // Nothing to do - both contracts already exist; skip popup.
          return;
        }
        setBootstrapState({ open: true, progress: 10, message: 'Loading contracts…', status: 'running', error: '' });
        // Generate the missing one(s). Progress jumps in two steps.
        if (!haveBrand) {
          setBootstrapState((p) => ({ ...p, message: 'Drafting Brand Service Agreement…', progress: 30 }));
          await createOne('brand_msa');
        }
        if (!haveCreator) {
          setBootstrapState((p) => ({ ...p, message: 'Drafting Creator Agreement…', progress: 70 }));
          await createOne('creator_principal');
        }
        await refreshContracts();
        setBootstrapState({ open: true, progress: 100, message: 'Contracts ready. You can review and edit them below.', status: 'complete', error: '' });
      } catch (e) {
        const msg = e?.response?.data?.detail || e?.message || 'Could not auto-generate contracts.';
        setBootstrapState({ open: true, progress: 100, message: msg, status: 'failed', error: msg });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bundle]);

  const regenerate = async (template) => {
    setNotice('');
    try {
      const doc = await createOne(template);
      setContracts((prev) => [doc, ...prev.filter((c) => c.template !== template)]);
      setNotice(`${template === 'brand_msa' ? 'Brand Service Agreement' : 'Creator Agreement'} regenerated. Edit if needed before sending.`);
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not regenerate contract.');
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
      const link = `${window.location.origin}${adminRoute(`/business-cases/${id}/delivery/contracts`)}#${contract.id}`;
      navigator.clipboard?.writeText(link);
      setNotice('Contract link copied to clipboard.');
      return;
    }
    if (option.key === 'download_google_docs' || option.key === 'download_pdf') {
      window.open(option.key === 'download_google_docs' ? v3ContractDocxUrl(contract.id) : v3ContractPdfUrl(contract.id), '_blank');
      setNotice(option.key === 'download_google_docs' ? 'Contract Google Docs-compatible document opened in a new tab.' : 'Contract PDF opened in a new tab.');
      return;
    }
    if (option.key === 'whatsapp') {
      const text = encodeURIComponent(`Contract ready for review: ${contract.title}
${window.location.origin}${adminRoute(`/business-cases/${id}/delivery/contracts`)}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
      return;
    }
    if (option.key === 'email_brand' || option.key === 'email_creator') {
      const toEmail = option.key === 'email_brand' ? brandEmail : creatorEmail;
      const recipientName = option.key === 'email_brand' ? brandDisplayName(brand) : (creatorName(bundle?.creator));
      if (!toEmail) {
        setNotice(option.key === 'email_brand' ? 'Brand email is missing. Add the email in CRM Brand details before sending the contract.' : 'Creator email is missing in the creator database.');
        return;
      }
      setNotice(`Sending contract to ${toEmail}...`);
      try {
        await v3SendContractEmail(contract.id, { to_email: toEmail, recipient_name: recipientName });
        await refreshContracts();
        setNotice(`Contract sent to ${toEmail} with an editable Google Docs-compatible document attached.`);
      } catch (e) {
        setNotice(e?.response?.data?.detail || e?.message || `Could not send contract to ${toEmail}.`);
      }
      return;
    }
    setNotice(`${option.label} is not available for this document yet.`);
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
    <FlowShell title="Contract Page" subtitle="Brand and Creator contracts are drafted automatically from the approved templates when you open this page. Edit any clause before sending.">
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]" data-testid="contract-notice">{notice}</div>}

      {contractComments.length > 0 && (
        <InfoCard title={`Brand Comments (${contractComments.length})`}>
          <div className="space-y-3" data-testid="contract-brand-comments">
            {contractComments.map((c, index) => (
              <BrandCommentCard key={c.id || index} comment={c} index={index} />
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#6E6657]">Edit the relevant contract clause below to address each comment, then re-send to the brand.</p>
        </InfoCard>
      )}
      {contracts.length === 0 ? (
        <InfoCard title="Contracts">
          <p className="text-[13px] text-[#8A8A8A]">
            {bootstrapState.open && bootstrapState.status === 'running'
              ? 'Drafting contracts from the approved templates - this only takes a moment.'
              : 'No contracts drafted yet for this Business Case.'}
          </p>
        </InfoCard>
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
      {/* Quiet "Regenerate" controls. Auto-generation runs on page open; these
          are only here for the rare case where admin wants to start over from
          the template after editing the project value or creator. */}
      {contracts.length > 0 && (
        <InfoCard title="Regenerate from template">
          <p className="text-[12px] text-[#6E6657] mb-3">Contracts are pre-filled automatically when this page opens. Use these only if you want to discard your edits and restart from the approved template.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => regenerate('brand_msa')} className="v3-btn-secondary text-[11px]" data-testid="regenerate-brand-contract-btn">
              <RotateCcw className="w-3.5 h-3.5" /> {hasTemplate('brand_msa') ? 'Regenerate Brand (Service) Contract' : 'Generate Brand (Service) Contract'}
            </button>
            <button onClick={() => regenerate('creator_principal')} className="v3-btn-secondary text-[11px]" data-testid="regenerate-creator-contract-btn">
              <RotateCcw className="w-3.5 h-3.5" /> {hasTemplate('creator_principal') ? 'Regenerate Creator Contract' : 'Generate Creator Contract'}
            </button>
          </div>
        </InfoCard>
      )}
      <InfoCard title="Next delivery page">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-[#6E6657]">Open Deliverables once contracts have been sent.</p>
          <button onClick={() => navigate(adminRoute(`/business-cases/${id}/delivery/deliverables`))} className="v3-btn-primary" data-testid="contracts-open-deliverables-btn"><ArrowRight className="w-3.5 h-3.5" /> Open Deliverables</button>
        </div>
      </InfoCard>

      {/* ====================================================================
          Contract bootstrap loading popup.
          Auto-runs on page open. Status moves through:
            running  -> "Loading contracts..." with progress bar
            complete -> "Contracts ready. You can review and edit them below."
            failed   -> error message + OK to dismiss
          ==================================================================== */}
      {bootstrapState.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" data-testid="contract-bootstrap-popup">
          <div className="w-full max-w-md rounded-[10px] border border-[#D7CBB8] bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${bootstrapState.status === 'complete' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : bootstrapState.status === 'failed' ? 'bg-[#FBEAE5] text-[#B54A37]' : 'bg-[#EFF5F1] text-[#1F4A3A]'}`}>
                {bootstrapState.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : bootstrapState.status === 'failed' ? <X className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </span>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                {bootstrapState.status === 'complete' ? 'Contracts ready' : bootstrapState.status === 'failed' ? 'Could not draft contracts' : 'Loading contracts'}
              </h3>
              <span className="ml-auto text-[12px] font-semibold text-[#4F3E2F]" data-testid="contract-bootstrap-percent">
                {bootstrapState.progress}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F4F2EC] overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ease-out ${bootstrapState.status === 'failed' ? 'bg-[#B54A37]' : 'bg-[#1F4A3A]'}`}
                style={{ width: `${Math.max(2, bootstrapState.progress)}%` }}
                data-testid="contract-bootstrap-bar"
              />
            </div>
            <p className="text-[13px] leading-6 text-[#4F3E2F]" data-testid="contract-bootstrap-message">
              {bootstrapState.message || (bootstrapState.status === 'running' ? 'Working on it…' : '')}
            </p>
            {bootstrapState.status === 'running' && (
              <p className="mt-1 text-[11px] text-[#6E6657]">Please keep this page open while TASCK drafts the contracts.</p>
            )}
            {(bootstrapState.status === 'complete' || bootstrapState.status === 'failed') && (
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBootstrapState((prev) => ({ ...prev, open: false }))}
                  className="v3-btn-primary"
                  data-testid="contract-bootstrap-close"
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </FlowShell>
  );
};

export const V3BusinessCaseDeliveryWaitingSignatures = () => <FlowShell title="Waiting for Contract Approval / Signatures" subtitle="Track brand and creator contract statuses, comments, reminders, and resend loops."><InfoCard title="Signature tracker"><p className="text-[13px] text-[#6E6657]">Use Contract Studio to generate, download, send, and mark signed drafts. Reminder emails can be queued from the contract list.</p></InfoCard></FlowShell>;

export const V3BusinessCaseDeliverables = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryTimeframe, setDeliveryTimeframe] = useState('');
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState('');
  useEffect(() => { v3ListDeliverables(id).then((data) => setRows(Array.isArray(data) ? data : [])); }, [id]);
  // Mark this Business Case as being in the Delivery sub-phase so clicking the
  // brand from the Business Case list later lands here, not on Planning.
  useEffect(() => {
    if (!id || !bundle) return;
    const currentPhase = bundle?.business_case?.business_case_phase;
    if (currentPhase !== 'delivery' && currentPhase !== 'reporting') {
      v3UpdateBusinessCasePhase(id, 'delivery').catch(() => { /* non-blocking */ });
    }
  }, [id, bundle]);
  // Persist the current form to the backend. Used by both buttons:
  //   - "Add deliverable"  : save + clear form (so admin can type the next).
  //   - "Save deliverable" : save + keep form populated for review.
  const persistDeliverable = async ({ clearForm }) => {
    if (!title.trim()) { setNotice('Add a deliverable title first.'); return; }
    setNotice('');
    try {
      const row = await v3AddDeliverable({ business_case_id: id, title, notes, delivery_date: deliveryDate, delivery_time: deliveryTime, delivery_timeframe: deliveryTimeframe });
      setRows([row, ...rows]);
      setNotice(clearForm ? 'Deliverable added.' : 'Deliverable saved.');
      if (clearForm) {
        setTitle('');
        setNotes('');
        setDeliveryDate('');
        setDeliveryTime('');
        setDeliveryTimeframe('');
      }
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not save deliverable.');
    }
  };
  const add = () => persistDeliverable({ clearForm: true });
  const save = () => persistDeliverable({ clearForm: false });
  const deleteRow = async (row) => {
    if (typeof window !== 'undefined' && !window.confirm(`Delete deliverable "${row.title || 'this row'}"? This cannot be undone.`)) return;
    setNotice('');
    try {
      await v3DeleteDeliverable(row.id);
      setRows((current) => current.filter((r) => r.id !== row.id));
      setNotice('Deliverable deleted.');
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not delete deliverable.');
    }
  };
  const openReporting = async () => {
    setNotice('');
    try {
      // Mark Delivery complete (unlocks Reporting in the stepper). Does NOT
      // close the Business Case - the Final Report page's Close Project does.
      await v3CompleteSubphase(id, 'delivery');
      await reload();
      navigate(adminRoute(`/business-cases/${id}/reporting/final-report`));
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
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-[#E8E4DB] px-3 py-2 text-[13px]" placeholder="Describe scope, format, duration, owner, due date, channels, references, success markers..." data-testid="deliverable-notes-input" />
          </label>
          <div className="rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-3" data-testid="deliverable-schedule-panel">
            <p className="mb-3 text-[10px] uppercase tracking-wider text-[#8A8A8A]">Delivery date, time, and timeframe</p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Scheduled date</span>
                <input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]" data-testid="deliverable-date-input" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Scheduled time</span>
                <input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]" data-testid="deliverable-time-input" />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Delivery timeframe</span>
                <input value={deliveryTimeframe} onChange={(e) => setDeliveryTimeframe(e.target.value)} className="mt-1 w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px]" placeholder="e.g., 2 production days / Launch week" data-testid="deliverable-timeframe-input" />
              </label>
            </div>
          </div>
          {/* Side-by-side Add + Save. Add clears the form ready for the next
              entry; Save keeps the form populated so admin can keep tweaking
              the same row. Both persist immediately to the backend. */}
          <div className="flex flex-wrap justify-end gap-2">
            <button onClick={save} className="v3-btn-secondary" data-testid="deliverable-save-btn">
              <Save className="w-3.5 h-3.5" /> Save deliverable
            </button>
            <button onClick={add} className="v3-btn-primary" data-testid="deliverable-add-btn">
              <PackageCheck className="w-3.5 h-3.5" /> Add deliverable
            </button>
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
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#6E6657]">
                      <span className="rounded bg-[#F4F2EC] px-2 py-1">Added: {row.created_at ? new Date(row.created_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'}</span>
                      <span className="rounded bg-[#F4F2EC] px-2 py-1">Scheduled: {[row.delivery_date, row.delivery_time].filter(Boolean).join(' ') || row.scheduled_for || 'Not recorded'}</span>
                      <span className="rounded bg-[#F4F2EC] px-2 py-1">Timeframe: {row.delivery_timeframe || 'Not recorded'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#6E6657] uppercase tracking-wider">{humanStatus(row.status)}</span>
                    <button
                      type="button"
                      onClick={() => deleteRow(row)}
                      className="text-[11px] text-[#B54A37] hover:underline inline-flex items-center gap-1"
                      data-testid={`deliverable-${row.id}-delete-btn`}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
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
        <p className="text-[12px] font-semibold text-[#1A1A1A]">{idx + 1}. {cleanV1Text(q.label)}</p>
        <p className="text-[11px] text-[#6E6657] mt-1">{cleanV1Text(q.question)}</p>
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
          <span className="text-[14px] font-semibold text-[#1F4A3A] bg-[#DDF0E1] border border-[#A4D4B0] rounded-full px-3 py-0.5">{q.rating ?? '-'}/10</span>
        )}
      </div>
    </div>
  </div>
);

const FeedbackFormBlock = ({ title, description, project, date, link, comment, questions, editing, onUpdateField, onUpdateQuestion, average, accent }) => (
  <div className={`rounded-xl border ${accent || 'border-[#E8E4DB]'} bg-white shadow-sm`}>
    <div className="px-6 py-4 border-b border-[#E8E4DB] bg-[#FBFAF7] rounded-t-xl">
      <p className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{cleanV1Text(title)}</p>
      <p className="text-[11px] text-[#6E6657] mt-1">{cleanV1Text(description)}</p>
    </div>
    <div className="px-6 py-5 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Project name</span>
          {editing ? (
            <input value={project || ''} onChange={(e) => onUpdateField('project_name', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-1.5 text-[12px]" />
          ) : <p className="mt-1 text-[12px] text-[#1A1A1A]">{cleanV1Text(project || '-')}</p>}
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Date</span>
          {editing ? (
            <input type="date" value={date || ''} onChange={(e) => onUpdateField('date', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-1.5 text-[12px]" />
          ) : <p className="mt-1 text-[12px] text-[#1A1A1A]">{date || '-'}</p>}
        </label>
        {link !== undefined && (
          <label className="block">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Google form link</span>
            {editing ? (
              <input value={link || ''} placeholder="https://forms.gle/..." onChange={(e) => onUpdateField('google_form_link', e.target.value)} className="mt-1 w-full rounded border border-[#E8E4DB] px-2 py-1.5 text-[12px]" />
            ) : <p className="mt-1 text-[12px] text-[#1A1A1A] truncate">{link || '-'}</p>}
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
        ) : <p className="mt-1 text-[12px] text-[#4F3E2F]">{comment ? cleanV1Text(comment) : <span className="text-[#8A8A8A]">No comment.</span>}</p>}
      </label>
      {average != null && <p className="text-[12px] text-[#1F4A3A] font-semibold">Average score: {average}/10</p>}
    </div>
  </div>
);

export const V3BusinessCaseFinalReport = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const report = bundle?.final_report;
  // Mark this Business Case as being in the Reporting sub-phase so the next
  // time admin opens the brand from the Business Case list it lands here.
  useEffect(() => {
    if (!id || !bundle) return;
    if (bundle?.business_case?.business_case_phase !== 'reporting') {
      v3UpdateBusinessCasePhase(id, 'reporting').catch(() => { /* non-blocking */ });
    }
  }, [id, bundle]);
  const bc = getCase(bundle);
  const brand = getBrand(bundle);
  const brandEmail = bundle?.brand_contact_snapshot?.email || brand?.email || '';
  const creatorEmail = bundle?.creator?.email || '';
  // Brand / creator feedback submitted from the portal Reports & Feedback
  // page. These land in case.closure.* and are surfaced up top so the admin
  // can immediately see what was said and act on it (that's also what the
  // /admin/notifications item links to via #brand-feedback).
  const brandPortalFeedback = bc?.closure?.brand_feedback || null;
  const creatorPortalFeedback = bc?.closure?.creator_feedback || null;
  useEffect(() => {
    // If the admin arrived from a notification click, scroll the feedback
    // card into view once it's rendered.
    if (typeof window === 'undefined') return;
    if (window.location.hash === '#brand-feedback' && (brandPortalFeedback || creatorPortalFeedback)) {
      const el = document.getElementById('brand-feedback');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [brandPortalFeedback, creatorPortalFeedback]);
  const [notice, setNotice] = useState('');
  const [editingReport, setEditingReport] = useState(false);
  const [draftReportTitle, setDraftReportTitle] = useState('');
  const [draftReportSections, setDraftReportSections] = useState([]);
  const [editingFeedback, setEditingFeedback] = useState(false);
  const [draftFeedback, setDraftFeedback] = useState(null);
  const [shareReportOpen, setShareReportOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closePopup, setClosePopup] = useState(null);
  const [previewType, setPreviewType] = useState(null); // 'report' | 'feedback' | null
  const [shareFeedbackBrandOpen, setShareFeedbackBrandOpen] = useState(false);
  const [shareFeedbackCreatorOpen, setShareFeedbackCreatorOpen] = useState(false);
  const autoReportRequest = useRef('');

  const reportSent = Boolean(report?.report_sent_at);
  const feedbackSent = Boolean(report?.feedback_sent_at);

  const computeAverage = (questions) => {
    const ratings = (questions || []).map((q) => Number(q.rating)).filter((n) => Number.isFinite(n));
    if (!ratings.length) return null;
    return Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
  };

  useEffect(() => {
    let cancelled = false;
    const generateOnOpen = async () => {
      if (report?.id || autoReportRequest.current === id) return;
      autoReportRequest.current = id;
      try {
        await v3GenerateFinalReport(id, {});
        if (!cancelled) {
          await reload();
          setNotice('Final report and feedback generated automatically. Review before sending.');
        }
      } catch (e) {
        if (!cancelled) {
          autoReportRequest.current = '';
          setNotice(e?.response?.data?.detail || e?.message || 'Could not generate final report automatically.');
        }
      }
    };
    generateOnOpen();
    return () => { cancelled = true; };
  }, [id, report?.id, reload]);

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
    if (!report?.id) {
      setNotice('The final report is still being generated. Please wait a moment.');
      return;
    }
    if (option.key === 'copy_link') {
      navigator.clipboard?.writeText(window.location.origin + adminRoute('/business-cases/' + id + '/reporting/final-report') + '#' + which);
      setNotice((isReport ? 'Report' : 'Feedback') + ' link copied to clipboard.');
      return;
    }
    if (option.key === 'download_pdf') {
      const url = isReport ? v3FinalReportPdfUrl(report.id) : v3FeedbackPdfUrl(report.id);
      window.open(url, '_blank');
      setNotice((isReport ? 'Report' : 'Feedback') + ' PDF opened in a new tab.');
      return;
    }
    if (option.key === 'whatsapp') {
      const shareText = encodeURIComponent((isReport ? 'Final Report' : 'Feedback') + ' ready: ' + cleanV1Text(report?.title || '') + '\n' + window.location.origin + adminRoute('/business-cases/' + id + '/reporting/final-report'));
      window.open('https://wa.me/?text=' + shareText, '_blank');
      return;
    }
    if (option.key === 'email_brand' || option.key === 'email_creator') {
      const toEmail = option.key === 'email_creator' ? creatorEmail : brandEmail;
      const recipientName = option.key === 'email_creator' ? creatorName(bundle?.creator) : brandDisplayName(brand);
      if (!toEmail) {
        setNotice(option.key === 'email_creator' ? 'Creator email is missing in the creator database.' : 'Brand email is missing. Add the email in CRM Brand details before sending.');
        return;
      }
      setNotice('Sending ' + (isReport ? 'final report' : 'feedback') + ' to ' + toEmail + '...');
      try {
        const sendEmail = isReport ? v3SendFinalReportEmail : v3SendFeedbackEmail;
        await sendEmail(report.id, { to_email: toEmail, recipient_name: recipientName });
        await reload();
        setNotice((isReport ? 'Final report' : 'Feedback') + ' sent to ' + toEmail + '.');
      } catch (e) {
        setNotice(e?.response?.data?.detail || e?.message || ('Could not send ' + (isReport ? 'final report' : 'feedback') + ' to ' + toEmail + '.'));
      }
      return;
    }
    setNotice(option.label + ' is not available yet.');
  };

  const closeProject = async () => {
    setClosing(true);
    setClosePopup({ tone: 'pending', title: 'Closing project', message: 'Closing project...' });
    try {
      await v3CloseBusinessCase(id);
      await reload();
      setClosePopup({ tone: 'success', title: 'Project closed', message: cleanV1Text(bc.title || 'This business case') + ' has been closed. Opening CRM Brands...' });
      window.setTimeout(() => navigate(adminRoute('/crm-brands')), 700);
    } catch (e) {
      setClosePopup({ tone: 'error', title: 'Could not close project', message: e?.response?.data?.detail || e?.message || 'Could not close the project.' });
    } finally {
      setClosing(false);
    }
  };

  const feedback = report?.feedback;

  return (
    <FlowShell title="Final Report and Feedback" subtitle="Reporting stage. Generate the final report and the feedback summary, share both with the right contacts at brand and creatives, then close the project. The reusable Planning Feedback page can be used throughout to keep collecting feedback as the project runs.">
      {closePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" data-testid="close-project-popup">
          <div className="v3-card w-full max-w-sm bg-white p-5 text-center shadow-2xl">
            <div className={`mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full ${closePopup.tone === 'error' ? 'bg-[#F5D9D2] text-[#B54A37]' : closePopup.tone === 'pending' ? 'bg-[#FBF4E4] text-[#7A5A1E]' : 'bg-[#DDE7E2] text-[#1F4A3A]'}`}>
              {closePopup.tone === 'pending' ? <Loader2 className="h-5 w-5 animate-spin" /> : <PackageCheck className="h-5 w-5" />}
            </div>
            <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{closePopup.title}</h3>
            <p className="mt-2 text-[12px] leading-5 text-[#6E6657]">{closePopup.message}</p>
            {closePopup.tone === 'error' && (
              <button type="button" onClick={() => setClosePopup(null)} className="v3-btn-primary mt-4 w-full justify-center text-[12px]">
                Close
              </button>
            )}
          </div>
        </div>
      )}
      <PreviewModal open={previewType === 'report'} onClose={() => setPreviewType(null)} title={report?.title || 'Final Report preview'} pdfUrl={report ? v3FinalReportPdfUrl(report.id) : ''} sections={report?.sections} testId="final-report-preview" />
      <PreviewModal open={previewType === 'feedback'} onClose={() => setPreviewType(null)} title="Feedback preview" pdfUrl={report ? v3FeedbackPdfUrl(report.id) : ''} sections={buildFeedbackPreviewSections(report?.feedback)} testId="feedback-preview" />
      {notice && <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2.5 text-[12px] text-[#7A5A1E]" data-testid="final-report-notice">{notice}</div>}

      {(brandPortalFeedback || creatorPortalFeedback) && (
        <div id="brand-feedback" className="rounded-xl border-2 border-[#1F4A3A] bg-[#F1F7F3] px-5 py-4 shadow-sm" data-testid="portal-feedback-panel">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-[#1F4A3A] mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#1F4A3A] font-semibold">Feedback received from portal</p>
                <p className="text-[12px] text-[#3F4E45] mt-0.5">This is the exact feedback the brand and/or creator sent back from the Reports &amp; Feedback page in their portal - the notification bell links straight here so you can respond.</p>
              </div>

              {brandPortalFeedback && (
                <div className="rounded-lg bg-white border border-[#C7D7CF] p-4" data-testid="portal-feedback-brand">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[#1F4A3A] font-semibold">From brand · {cleanV1Text(brandPortalFeedback.rater || brandDisplayName(brand) || 'Brand contact')}</p>
                      <p className="text-[10px] text-[#8A8A8A] mt-0.5">Received {String(brandPortalFeedback.received_at || '').slice(0, 19).replace('T', ' ') || '—'}</p>
                    </div>
                    {Number.isFinite(Number(brandPortalFeedback.average)) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF0E1] border border-[#A4D4B0] text-[#1F6B3A] text-[11px] font-semibold px-2.5 py-1">
                        Avg {Number(brandPortalFeedback.average).toFixed(1)} / 10
                      </span>
                    )}
                  </div>
                  {brandPortalFeedback.comment && (
                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#1A1A1A] bg-[#FBFAF7] border border-[#E8E4DB] rounded-md px-3 py-2" data-testid="portal-feedback-brand-comment">
                      {cleanV1Text(brandPortalFeedback.comment)}
                    </p>
                  )}
                  {brandPortalFeedback.scores && Object.keys(brandPortalFeedback.scores).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(brandPortalFeedback.scores).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 rounded-md border border-[#E8E4DB] bg-white text-[11px] text-[#5C5C5C] px-2 py-0.5">
                          <span className="font-medium capitalize text-[#1A1A1A]">{k}</span>
                          <span>·</span>
                          <span>{v}/10</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {creatorPortalFeedback && (
                <div className="rounded-lg bg-white border border-[#C7D7CF] p-4" data-testid="portal-feedback-creator">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-[#1F4A3A] font-semibold">From creator · {cleanV1Text(creatorPortalFeedback.rater || creatorName(bundle?.creator) || 'Creator')}</p>
                      <p className="text-[10px] text-[#8A8A8A] mt-0.5">Received {String(creatorPortalFeedback.received_at || '').slice(0, 19).replace('T', ' ') || '—'}</p>
                    </div>
                    {Number.isFinite(Number(creatorPortalFeedback.average)) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF0E1] border border-[#A4D4B0] text-[#1F6B3A] text-[11px] font-semibold px-2.5 py-1">
                        Avg {Number(creatorPortalFeedback.average).toFixed(1)} / 10
                      </span>
                    )}
                  </div>
                  {creatorPortalFeedback.comment && (
                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-[#1A1A1A] bg-[#FBFAF7] border border-[#E8E4DB] rounded-md px-3 py-2" data-testid="portal-feedback-creator-comment">
                      {cleanV1Text(creatorPortalFeedback.comment)}
                    </p>
                  )}
                  {creatorPortalFeedback.scores && Object.keys(creatorPortalFeedback.scores).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {Object.entries(creatorPortalFeedback.scores).map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 rounded-md border border-[#E8E4DB] bg-white text-[11px] text-[#5C5C5C] px-2 py-0.5">
                          <span className="font-medium capitalize text-[#1A1A1A]">{k}</span>
                          <span>·</span>
                          <span>{v}/10</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-[#E8E4DB] bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Reporting package</p>
            <h3 className="mt-1 text-[17px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>Final report and feedback</h3>
            <p className="mt-1 text-[12px] leading-5 text-[#6E6657]">This page prepares the final report and feedback automatically from the real business case, strategy, contracts, and deliverables.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1 text-[11px]">
          <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ' + (reportSent ? 'bg-[#DDF0E1] border-[#A4D4B0] text-[#1F6B3A]' : 'bg-[#FBF4E4] border-[#E5C99A] text-[#7A5A1E]')}><CheckCircle2 className="w-3.5 h-3.5" /> Report {reportSent ? 'sent' : 'not sent'}</span>
          <span className={'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ' + (feedbackSent ? 'bg-[#DDF0E1] border-[#A4D4B0] text-[#1F6B3A]' : 'bg-[#FBF4E4] border-[#E5C99A] text-[#7A5A1E]')}><CheckCircle2 className="w-3.5 h-3.5" /> Feedback {feedbackSent ? 'sent' : 'not sent'}</span>
          {bc.stage === 'closed' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1F4A3A] text-white"><CheckCircle2 className="w-3.5 h-3.5" /> Project closed</span>}
        </div>
      </div>

      {!report ? (
        <InfoCard title="Final Report"><p className="text-[13px] text-[#8A8A8A]">The report and feedback are being generated automatically from this Business Case.</p></InfoCard>
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
                  <h3 className="text-[18px] font-semibold text-[#1A1A1A] mt-0.5" style={{ fontFamily: "'Fraunces', serif" }}>{cleanV1Text(report.title)}</h3>
                )}
                <p className="text-[11px] text-[#8A8A8A] mt-1">Status: {humanStatus(report.status)}  | Generated {report.generated_at?.slice(0, 19)?.replace('T', ' ')}{reportSent ? `  | Sent ${report.report_sent_at?.slice(0, 19)?.replace('T', ' ')}` : ''}</p>
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
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">{cleanV1Text(section.heading)}</p>
                    <p className="text-[13px] text-[#4F3E2F] whitespace-pre-wrap leading-relaxed">{cleanV1Text(section.content)}</p>
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
                <p className="text-[11px] uppercase tracking-wider font-semibold text-[#1A1A1A] mb-2">Tab 1 - Email Template</p>
                {editingFeedback ? (
                  <textarea value={draftFeedback?.email_template || ''} onChange={(e) => setDraftFeedback((p) => ({ ...p, email_template: e.target.value }))} rows={5} className="w-full text-[12px] text-[#4F3E2F] border border-[#E8E4DB] rounded-md px-3 py-2 focus:border-[#1F4A3A] outline-none whitespace-pre-wrap leading-relaxed bg-white" />
                ) : (
                  <p className="text-[12px] text-[#4F3E2F] whitespace-pre-wrap leading-relaxed">{cleanV1Text(feedback?.email_template)}</p>
                )}
              </div>

              {/* Brand Partner Feedback */}
              <FeedbackFormBlock
                title={feedback?.brand_partner?.form_title || 'TTA Project Feedback - Brand Partner'}
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
                title={feedback?.creative_partner?.form_title || 'TTA Project Feedback - Creative Partner'}
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
                  {(feedback?.internal_use || []).map((line, idx) => <li key={idx}>{cleanV1Text(line)}</li>)}
                </ul>
              </div>
            </div>
          </div>

          {/* ------ Closure ------ */}
          <div className="rounded-xl border border-[#E8E4DB] bg-white shadow-sm p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>Close the project</p>
                <p className="text-[12px] text-[#6E6657] mt-1">{bc.stage === 'closed' ? 'This project has already been closed. Click Project closed to return to CRM Brands.' : 'Close the project when TASCK has completed delivery, reporting, and internal wrap-up. Admin will return to CRM Brands after closing.'}</p>
              </div>
              <button onClick={closeProject} disabled={closing} className="v3-btn-primary disabled:opacity-40 disabled:cursor-not-allowed" data-testid="close-project-btn"><PackageCheck className="w-3.5 h-3.5" /> {bc.stage === 'closed' ? 'Project closed' : (closing ? 'Closing...' : 'Close Project')}</button>
            </div>
          </div>
        </>
      )}
      <button onClick={() => navigate(adminRoute(`/business-cases/${id}/plan/planning`))} className="text-[12px] text-[#1F4A3A] hover:underline mt-4 inline-flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Planning</button>
    </FlowShell>
  );
};
