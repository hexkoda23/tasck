import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  PhoneCall,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
  UserPlus,
  Loader2,
  X,
} from 'lucide-react';
import {
  v3ListMeetings,
  v3CreateMeeting,
  v3GetMeeting,
  v3UploadMeetingTranscript,
  v3AnalyzeMeetingTranscript,
  v3AcceptQualificationMeeting,
  v3RescheduleQualificationMeeting,
  v3DeleteQualificationMeeting,
  v3SaveMeetingContact,
  v3ProceedBusinessCall,
  v3RescheduleBusinessCall,
  v3DeleteBusinessCall,
  v3AcceptCreatorFitCall,
  v3RescheduleCreatorFitCall,
  v3RejectCreatorFitCall,
  v3AcceptCreatorBriefing,
  v3RescheduleCreatorBriefing,
  v3DeclineCreatorBriefing,
  v3ListBusinessCases,
} from '../../../lib/v3api';

const statusTone = (value) => {
  if (['accepted', 'transcribed', 'ready_for_alignment', 'creative_brief_ready', 'proceeded'].includes(value))
    return 'bg-[#DDE7E2] text-[#1F4A3A]';
  if (['needs_follow_up_meeting', 'needs contact', 'scheduled', 'pending'].includes(value))
    return 'bg-[#F2EAD8] text-[#7A5F23]';
  if (['deleted', 'declined', 'rejected'].includes(value))
    return 'bg-[#F5D9D2] text-[#B54A37]';
  return 'bg-[#F4F2EC] text-[#6E6657]';
};

const decisionLabel = (value) => ({
  accept_to_crm: 'Accept Brand into CRM',
  approve_creator: 'Add to Creator Roster',
  proceed_to_business_case: 'Promote to Frame',
  promote: 'Promote to Frame',
  accept: 'Accept',
  delete: 'Delete',
  decline: 'Decline',
  accept_creator_for_project: 'Accept Creator for Strategy Snapshot',
  reschedule: 'Reschedule',
  delete_candidate: 'Decline Candidate',
  delete_brand: 'Delete Brand From Pipeline',
  decline_creator: 'Decline Creator',
  reject_creator_for_project: 'Decline Creator for This Project',
}[value] || String(value || '').replace(/_/g, ' '));

const Badge = ({ children, tone }) => (
  <span
    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-medium ${
      tone || statusTone(String(children).toLowerCase().replace(/\s+/g, '_'))
    }`}
  >
    {children}
  </span>
);

const ScoreBar = ({ value }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[#8A8A8A]">Readiness</span>
      <span
        className="font-medium text-[#1A1A1A]"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {value}%
      </span>
    </div>
    <div className="h-2 rounded-full bg-[#F4F2EC] overflow-hidden">
      <div className="h-full rounded-full bg-[#1F4A3A]" style={{ width: `${value}%` }} />
    </div>
  </div>
);

const PageHeader = ({ kicker = 'Admin Control Centre', title, subtitle, action }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
    <div>
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{kicker}</p>
      <h1
        className="v3-heading text-2xl"
        style={{ fontFamily: "'Fraunces', serif" }}
      >
        {title}
      </h1>
      <p className="text-[#8A8A8A] text-sm mt-1 max-w-3xl">{subtitle}</p>
    </div>
    {action}
  </div>
);

const Section = ({ title, children, action }) => (
  <div className="v3-card p-5">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const QuestionList = ({ questions = [] }) => (
  <div className="space-y-2">
    {questions.map((question, index) => (
      <div
        key={question}
        className="flex items-start gap-2 rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-3"
      >
        <span
          className="text-[10px] text-[#8A8A8A] pt-0.5"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {index + 1}
        </span>
        <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{question}</p>
      </div>
    ))}
  </div>
);

const asList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value == null || value === '') return [];
  return [value];
};

const normalizeAnalysis = (analysis = {}, score) => {
  const recommendation = analysis.recommendation || {};
  const decision = recommendation.decision || analysis.ai_recommendation || analysis.recommendation_decision;
  return {
    score: score ?? analysis.readiness_score ?? analysis.readinessScore ?? analysis.score,
    summary: analysis.summary || recommendation.summary || '',
    missingContext: asList(
      analysis.missingContext ||
      analysis.missing_context ||
      recommendation.missing_context ||
      recommendation.missingContext
    ),
    riskFlags: asList(analysis.risk_flags || analysis.riskFlags || recommendation.risk_flags),
    recommendationLabel: recommendation.label || decisionLabel(decision),
    reasons: asList(analysis.ai_reasons || analysis.reasons || recommendation.reasons),
    questions: asList(
      analysis.followUpQuestions ||
      analysis.follow_up_questions ||
      analysis.nextQuestions ||
      analysis.next_questions ||
      recommendation.next_questions ||
      recommendation.nextQuestions
    ),
  };
};

const AnalysisCard = ({ analysis, score }) => {
  if (!analysis) return null;
  const normalized = normalizeAnalysis(analysis, score);
  return (
    <div className="space-y-4">
      {normalized.score != null && <ScoreBar value={normalized.score} />}
      {normalized.summary && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Summary</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{normalized.summary}</p>
        </div>
      )}
      {normalized.missingContext.length > 0 && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
            Missing context
          </p>
          <div className="flex flex-wrap gap-2">
            {normalized.missingContext.map((item) => (
              <Badge key={item} tone="bg-[#F5D9D2] text-[#B54A37]">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {normalized.riskFlags.length > 0 && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
            Risk flags
          </p>
          <div className="flex flex-wrap gap-2">
            {normalized.riskFlags.map((item) => (
              <Badge key={item} tone="bg-[#F5D9D2] text-[#B54A37]">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {normalized.recommendationLabel && (
        <div className="rounded-lg border border-[#DDE7E2] bg-[#F5FAF7] p-3">
          <p className="text-[10px] text-[#1F4A3A] uppercase tracking-wider mb-1">AI recommendation</p>
          <p className="text-[13px] font-semibold text-[#1A1A1A]">{normalized.recommendationLabel}</p>
          {normalized.reasons.length > 0 && (
            <ul className="mt-2 space-y-1 text-[12px] text-[#6E6657]">
              {normalized.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          )}
        </div>
      )}
      {normalized.questions.length > 0 && (
        <div>
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
            Follow-up questions
          </p>
          <QuestionList questions={normalized.questions} />
        </div>
      )}
    </div>
  );
};

const AnalysisDecisionModal = ({
  open,
  title,
  analysis,
  score,
  onClose,
  onAccept,
  onReschedule,
  onDecline,
  acceptLabel,
  rescheduleLabel,
  declineLabel,
  saving,
  canReschedule = true,
}) => {
  if (!open) return null;
  const normalized = normalizeAnalysis(analysis, score);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-[#E8E4DB]">
        <div className="sticky top-0 z-10 bg-white border-b border-[#E8E4DB] px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">AI result</p>
            <h2 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h2>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#E8E4DB] p-2 text-[#6E6657] hover:text-[#1A1A1A]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div className="rounded-lg border border-[#E8E4DB] bg-[#FAFAF7] p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Readiness</p>
            <ScoreBar value={normalized.score ?? 0} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Summary</p>
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">{normalized.summary || 'No summary generated yet.'}</p>
          </div>
          {normalized.missingContext.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Missing context</p>
              <div className="flex flex-wrap gap-2">
                {normalized.missingContext.map((item) => (
                  <Badge key={item} tone="bg-[#F5D9D2] text-[#B54A37]">{item}</Badge>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-lg border border-[#DDE7E2] bg-[#F5FAF7] p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#1F4A3A] mb-1">AI recommendation</p>
            <p className="text-[15px] font-semibold text-[#1A1A1A]">{normalized.recommendationLabel || 'Pending'}</p>
            {normalized.reasons.length > 0 && (
              <ul className="mt-3 space-y-1 text-[12px] text-[#6E6657]">
                {normalized.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            )}
          </div>
          {normalized.questions.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Follow-up questions</p>
              <QuestionList questions={normalized.questions} />
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-[#E8E4DB] p-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button onClick={onAccept} disabled={saving} className="v3-btn-primary">
            <CheckCircle2 className="w-3.5 h-3.5" /> {acceptLabel}
          </button>
          <button onClick={onReschedule} disabled={saving || !canReschedule} className="v3-btn-secondary">
            <RotateCcw className="w-3.5 h-3.5" /> {canReschedule ? rescheduleLabel : 'Max reschedules reached'}
          </button>
          <button onClick={onDecline} disabled={saving} className="v3-btn-secondary text-[#B54A37]">
            <Trash2 className="w-3.5 h-3.5" /> {declineLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const RECOMMENDED_QUESTIONS = {
  qualification: [
    'What does the brand sell and who is the buyer?',
    'What is the current marketing challenge?',
    'What campaign or partnership are they looking for?',
    'What channels matter most: Instagram, TikTok, YouTube, X, events, retail, etc.?',
    'What is the expected KPI: awareness, reach, engagement, conversion, sales, community, leads?',
    'What budget range is realistic?',
    'Who makes the decision?',
    'What timeline are they working with?',
    'What would make TASCK a good fit?',
    'Any red flags: no budget, unclear need, wrong category, not responsive?',
  ],
  creatorQualification: [
    'Are you open to receiving TASCK briefs?',
    'What kind of brand projects do you accept?',
    'What platforms and content formats are strongest?',
    'What is your fee or rate range?',
    'Who manages bookings and contracts?',
    'What is your typical availability and turnaround?',
    'Any usage rights or exclusivity restrictions?',
    'What would make a brand collaboration unacceptable?',
  ],
  connector: [
    'What is the key marketing focus?',
    'Who is the primary target audience?',
    'Which channels matter most?',
    'Which KPIs will prove success?',
    'What budget range is realistic?',
    'What timeline are they working with?',
    'Who are the decision makers?',
    'What product or service details must creators understand?',
    'What brand positioning should the strategy protect?',
    'What creator style feels credible for the brand?',
    'What risk or compliance constraints must be respected?',
    'How does the content approval process work?',
  ],
  business_call: [
    'What is the key marketing focus?',
    'Who is the primary target audience?',
    'Which channels matter most?',
    'Which KPIs will prove success?',
    'What budget range is realistic?',
    'What timeline are they working with?',
    'Who are the decision makers?',
    'What product or service details must creators understand?',
    'What brand positioning should the strategy protect?',
    'What creator style feels credible for the brand?',
    'What risk or compliance constraints must be respected?',
    'How does the content approval process work?',
  ],
  creator_fit: [
    'What fee or rate is realistic for this campaign?',
    'What availability or schedule constraints should TASCK plan around?',
    'Which deliverables can the creator produce confidently?',
    'What usage rights are included or excluded?',
    'Are there exclusivity or category conflicts?',
    'What production needs must be budgeted?',
    'What payment terms are required?',
    'Any risk or brand-safety concerns?',
  ],
  creator_briefing: [
    'What is your fee for this project?',
    'What is your availability for the campaign timeline?',
    'What deliverables are realistic?',
    'What content formats would work best?',
    'What usage rights or exclusivity limits do you require?',
    'Do you have any conflict with the brand or category?',
    'What production support do you need?',
    'What approval or revision process do you prefer?',
    'Are you willing to proceed with TASCK on this brief?',
  ],
  plan: [
    'Which strategic approach should lead: ambassador-led, creator-led, community-led, merchant-first, or hybrid?',
    'Which creators should be shortlisted and why?',
    'What selection criteria matter most?',
    'What content formats and platforms should be prioritised?',
    'What funnel or conversion behaviour should be measured?',
    'What budget categories need approval?',
    'What execution phases should be recommended?',
    'What contracts or approvals are needed before launch?',
  ],
};

const ScheduleModal = ({ mode, onClose, onSaved }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title:
      mode === 'qualification'
        ? 'Qualification Call: New candidate'
        : mode === 'creator_briefing'
          ? 'Creator Briefing Call: Selected creator'
        : mode === 'creator_fit'
          ? 'Creator Fit Call: Selected creator'
          : 'Business Call — Connect: Brand intake',
    stage: mode === 'creator_fit' || mode === 'creator_briefing' ? 'plan' : mode === 'connector' ? 'connect' : 'before_crm',
    entity_name: '',
    business_case_title: '',
    scheduled_for: '',
    duration_minutes: 30,
    meeting_link: '',
    agenda: '',
    meeting_type: mode === 'creator_briefing' ? 'creator_briefing' : mode === 'creator_fit' ? 'creator_fit' : mode === 'qualification' ? 'qualification' : 'business_call',
    entity_type: mode === 'creator_fit' || mode === 'creator_briefing' ? 'creator' : 'brand',
    qualification_entity_type: mode === 'qualification' ? 'brand' : '',
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await v3CreateMeeting(form);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Failed to create meeting:', err);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
      data-testid="meeting-schedule-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="v3-card w-full max-w-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">
              Schedule meeting
            </p>
            <h2
              className="v3-heading text-xl"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              {mode === 'qualification' ? 'Qualification Call' : mode === 'creator_briefing' ? 'Creator Briefing Call' : mode === 'creator_fit' ? 'Creator Fit Call' : 'Business Call — Connect'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-[#E8E4DB] text-[#6E6657] hover:bg-[#F4F2EC] hover:text-[#1A1A1A] transition-colors"
            data-testid="meeting-schedule-modal-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Title</span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.title}
              onChange={set('title')}
            />
          </label>
          {mode !== 'qualification' && (
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                Business Case
              </span>
              <input
                className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
                value={form.business_case_title}
                onChange={set('business_case_title')}
              />
            </label>
          )}
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              {mode === 'qualification' ? 'Brand / Company' : 'Company / Creative'}
            </span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.entity_name}
              onChange={set('entity_name')}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Scheduled date
            </span>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.scheduled_for}
              onChange={set('scheduled_for')}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Duration (min)
            </span>
            <select
              data-testid="schedule-duration-select"
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px] bg-white"
              value={form.duration_minutes}
              onChange={(e) => setForm((prev) => ({ ...prev, duration_minutes: Number(e.target.value) }))}
            >
              {Array.from({ length: 36 }, (_, i) => (i + 1) * 5).map((mins) => (
                <option key={mins} value={mins}>
                  {mins} minutes
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              Meeting link
            </span>
            <input
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              value={form.meeting_link}
              onChange={set('meeting_link')}
              placeholder="https://meet.google.com/..."
            />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Agenda</span>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
              rows={3}
              value={form.agenda}
              onChange={set('agenda')}
              placeholder={
                mode === 'qualification'
                  ? 'Confirm interest, decision maker, contact details, fit, and whether they want TASCK follow-up.'
                  : mode === 'creator_briefing'
                    ? 'Confirm project fee, availability, deliverables, usage rights, conflicts, production support, approvals, and willingness to proceed.'
                  : mode === 'creator_fit'
                    ? 'Confirm creator fee, schedule, deliverables, rights, conflicts, production needs, payment terms, and risks.'
                  : 'Collect objective, audience, channels, KPIs, timeline, budget, approval owner, and constraints.'
              }
            />
          </label>

          {/* AI recommended questions — feeds Alignment & Strategy Snapshots */}
          <div className="md:col-span-2 p-4 rounded-lg bg-[#F4F2EC] border border-[#E8E4DB]" data-testid="schedule-ai-questions">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] uppercase tracking-wider text-[#1F4A3A] font-semibold">AI recommended questions</p>
              <button
                type="button"
                onClick={() => {
                  const set = RECOMMENDED_QUESTIONS[form.meeting_type === 'qualification' ? 'qualification' : form.meeting_type] || [];
                  const block = set.map((q, i) => `${i + 1}. ${q}`).join('\n');
                  setForm((f) => ({ ...f, agenda: (f.agenda ? f.agenda + '\n\n' : '') + block }));
                }}
                className="text-[10px] px-2 py-1 rounded bg-[#1F4A3A] text-white hover:bg-[#1A1A1A]"
                data-testid="schedule-insert-questions"
              >
                Insert into agenda
              </button>
            </div>
            <p className="text-[11px] text-[#6E6657] mb-2">These prompts capture the details needed to generate the Alignment Snapshot and Strategy Snapshot. Edit, reorder, or drop them as needed.</p>
            <ol className="list-decimal pl-5 space-y-1 text-[12px] text-[#1A1A1A]">
              {(RECOMMENDED_QUESTIONS[form.meeting_type === 'qualification' ? 'qualification' : form.meeting_type] || []).map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-2 mt-5">
          <button onClick={onClose} className="v3-btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} className="v3-btn-primary">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'qualification' ? (
              'Schedule Qualification Call'
            ) : mode === 'creator_briefing' ? (
              'Schedule Creator Briefing Call'
            ) : mode === 'creator_fit' ? (
              'Schedule Creator Fit Call'
            ) : (
              'Schedule Business Call — Connect'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Overview ────────────────────────────────────────────────────────────────

const MeetingOverviewCard = ({ icon: Icon, eyebrow, title, description, count, button, onClick, tone = 'business' }) => (
  <button
    onClick={onClick}
    className={`v3-floating-card v3-meeting-${tone} p-6 text-left group`}
    data-testid={`meeting-entry-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
  >
    <div className="flex items-start gap-4">
      <span className="w-12 h-12 rounded-xl bg-white/70 inline-flex items-center justify-center shrink-0 border border-white">
        <Icon className="w-5 h-5 text-[#1F4A3A]" strokeWidth={1.5} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{eyebrow}</span>
        <span
          className="block text-lg font-semibold text-[#1A1A1A] mt-1"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {title}
        </span>
        <span className="block text-[13px] text-[#6E6657] leading-relaxed mt-2">
          {description}
        </span>
        <span className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <span className="text-[12px] text-[#8A8A8A]">
            <strong className="text-[#1A1A1A]">{count}</strong> calls
          </span>
          <span className="v3-btn-primary text-[12px] group-hover:bg-[#173D30]">{button}</span>
        </span>
      </span>
    </div>
  </button>
);

export const V3AdminMeetingsOverview = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({ brandQualification: 0, creatorFit: 0, connector: 0, creatorBriefing: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      v3ListMeetings({ meeting_type: 'qualification' }).catch(() => []),
      v3ListMeetings({ meeting_type: 'connector' }).catch(() => []),
      v3ListMeetings({ meeting_type: 'business_call' }).catch(() => []),
      v3ListMeetings({ meeting_type: 'creator_briefing' }).catch(() => []),
    ]).then(([qualData, connData, businessCallData, creatorBriefingData]) => {
      const qualRows = Array.isArray(qualData) ? qualData : [];
      setCounts({
        brandQualification: qualRows.filter((call) => (call.qualification_entity_type || call.entity_type || 'brand') !== 'creator').length,
        creatorFit: qualRows.filter((call) => (call.qualification_entity_type || call.entity_type) === 'creator').length,
        connector: (Array.isArray(connData) ? connData.length : 0) + (Array.isArray(businessCallData) ? businessCallData.length : 0),
        creatorBriefing: Array.isArray(creatorBriefingData) ? creatorBriefingData.length : 0,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div data-testid="v3-admin-meetings-overview">
      <PageHeader
        title="Meetings"
        subtitle="Track qualification, Business Call — Connect, Creator Fit, and Creator Briefing calls with clear AI decisions and follow-ups."
      />
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        <MeetingOverviewCard
          icon={UserPlus}
          eyebrow="CRM decision"
          title="Qualification Calls"
          description="Brand qualification calls for scanned and manually added brands before they enter CRM."
          count={loading ? '…' : counts.brandQualification}
          button="Open Qualification Calls"
          onClick={() => navigate('/v3/admin/meetings/qualification')}
          tone="qualification"
        />
        <MeetingOverviewCard
          icon={Briefcase}
          eyebrow="Connect phase"
          title="Business Call — Connect"
          description="Business calls used to gather the brand details needed for the Alignment Snapshot: objective, audience, channels, KPIs, budget, timeline, approval owner, and constraints."
          count={loading ? '…' : counts.connector}
          button="Open Connect Calls"
          onClick={() => navigate('/v3/admin/meetings/business-calls')}
          tone="business"
        />
        <MeetingOverviewCard
          icon={Sparkles}
          eyebrow="Before roster"
          title="Creator Fit Calls"
          description="Creator onboarding calls for scraped or manual candidates before they can join the approved creator roster."
          count={loading ? '…' : counts.creatorFit}
          button="Open Creator Fit Calls"
          onClick={() => navigate('/v3/admin/meetings/qualification')}
          tone="creator-fit"
        />
        <MeetingOverviewCard
          icon={PhoneCall}
          eyebrow="Plan phase"
          title="Creator Briefing Calls"
          description="Project calls after brief acceptance to confirm fee, availability, deliverables, usage rights, schedule, and willingness."
          count={loading ? '…' : counts.creatorBriefing}
          button="Open Briefing Calls"
          onClick={() => navigate('/v3/admin/meetings/creator-briefing')}
          tone="creator-briefing"
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rule</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
            Qualification transcripts never generate Alignment Snapshots. They only support the CRM
            entry decision.
          </p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Rule</p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
            Business Call transcripts can create or update an admin-review Alignment Snapshot draft
            when enough context exists.
          </p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">
            Admin review only
          </p>
          <p className="text-[13px] text-[#1A1A1A] leading-relaxed">
            Raw transcripts, AI analysis, generated snapshots, and generated creative briefs stay
            internal until Admin approves them.
          </p>
        </div>
      </div>
    </div>
  );
};

// ─── Qualification Calls List ─────────────────────────────────────────────────

const QualificationRow = ({ call, detailBasePath = '/v3/admin/meetings/qualification' }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`${detailBasePath}/${call.id || call._id}`)}
      className="w-full v3-floating-card v3-meeting-business p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4"
      data-testid={`qualification-call-${call.id || call._id}`}
    >
      <div className="w-1 rounded-full bg-[#C49B5F] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
          <Badge tone="bg-[#F2EAD8] text-[#7A5F23]">CRM decision</Badge>
          <Badge>{call.status}</Badge>
          {call.qualification_status && <Badge>{call.qualification_status}</Badge>}
        </div>
        <p className="text-[12px] text-[#8A8A8A]">
          {call.entity_name}
          {call.entity_type ? `, ${call.entity_type}` : ''}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        {call.scheduled_for && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {call.scheduled_for}
          </span>
        )}
        {call.contact_completeness != null && (
          <span className="inline-flex items-center gap-1">
            <PhoneCall className="w-3.5 h-3.5" /> {call.contact_completeness}% contact
          </span>
        )}
        <span className="v3-btn-secondary text-[11px]">Open call</span>
      </div>
    </button>
  );
};

export const V3AdminQualificationCalls = ({ qualificationType = 'brand' }) => {
  const navigate = useNavigate();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const isCreatorView = qualificationType === 'creator';

  const load = useCallback(() => {
    setLoading(true);
    v3ListMeetings({ meeting_type: 'qualification' })
      .then((data) => {
        setCalls(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  const visibleCalls = calls.filter((call) => (call.qualification_entity_type || call.entity_type || 'brand') === qualificationType);
  const detailBasePath = isCreatorView ? '/v3/admin/meetings/creator-fit' : '/v3/admin/meetings/qualification';

  return (
    <div data-testid="v3-admin-qualification-calls">
      <button
        onClick={() => navigate('/v3/admin/meetings')}
        className="v3-btn-secondary text-[11px] mb-4"
        data-testid="qualification-calls-back-btn"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Meetings
      </button>
      <PageHeader
        title={isCreatorView ? 'Creator Fit Calls' : 'Qualification Calls'}
        subtitle={isCreatorView ? 'Creator fit calls decide whether creator candidates enter the approved creator roster.' : 'Brand qualification calls decide only whether a brand should be accepted into CRM.'}
        action={
          !isCreatorView ? (
            <button onClick={() => setScheduleOpen(true)} className="v3-btn-primary">
              <Plus className="w-4 h-4" /> Schedule Qualification Call
            </button>
          ) : null
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#8A8A8A]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px]">Loading calls…</span>
        </div>
      ) : visibleCalls.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <UserPlus className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No {isCreatorView ? 'creator fit' : 'brand qualification'} calls yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            {isCreatorView
              ? 'Creator discovery candidates appear here before roster approval.'
              : 'Manual brands and scanner candidates appear here for CRM acceptance.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleCalls.map((call) => (
            <QualificationRow key={call.id || call._id} call={call} detailBasePath={detailBasePath} />
          ))}
        </div>
      )}
      {scheduleOpen && (
        <ScheduleModal
          mode="qualification"
          onClose={() => setScheduleOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

// ─── Connector Calls List ─────────────────────────────────────────────────────

const ConnectorRow = ({ call }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/v3/admin/meetings/connector/${call.id || call._id}`)}
      className="w-full v3-card p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4 hover:border-[#D4CDBF] transition-colors"
      data-testid={`connector-call-${call.id || call._id}`}
    >
      <div className="w-1 rounded-full bg-[#1F4A3A] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
          <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Business Call — Connect</Badge>
          {call.readiness_status && (
            <Badge>{call.readiness_status.replace(/_/g, ' ')}</Badge>
          )}
        </div>
        <p className="text-[12px] text-[#8A8A8A]">
          {call.entity_name}
          {call.business_case_title ? `, ${call.business_case_title}` : ''}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        {call.scheduled_for && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {call.scheduled_for}
          </span>
        )}
        {call.readiness_score != null && (
          <span className="inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {call.readiness_score}% ready
          </span>
        )}
        <span className="v3-btn-secondary text-[11px]">Open call</span>
      </div>
    </button>
  );
};

const BusinessCallCaseRow = ({ item }) => {
  const navigate = useNavigate();
  const contact = item.brand_contact_snapshot || {};
  const completeness = [contact.primary_contact, contact.email, contact.phone].filter(Boolean).length;
  return (
    <button
      onClick={() => navigate(`/v3/admin/business-cases/${item.id}/connect`)}
      className="w-full v3-floating-card v3-meeting-business p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4"
      data-testid={`business-call-case-${item.id}`}
    >
      <div className="w-1 rounded-full bg-[#1F4A3A] lg:self-stretch min-h-10" />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{item.title}</span>
          <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">Connect</Badge>
          <Badge>{item.connect?.connect_status || item.stage || 'connect'}</Badge>
        </div>
        <p className="text-[12px] text-[#8A8A8A]">
          {contact.primary_contact || 'Brand contact'} · {contact.email || 'email missing'} · {contact.phone || 'phone missing'}
        </p>
      </div>
      <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 text-[11px] text-[#6E6657]">
        <span>{completeness}/3 contact fields</span>
        <span className="v3-btn-primary text-[11px]">Open Connect Flow</span>
      </div>
    </button>
  );
};

export const V3AdminConnectorCalls = () => {
  const navigate = useNavigate();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calls, setCalls] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      v3ListMeetings({ meeting_type: 'connector' }).catch(() => []),
      v3ListMeetings({ meeting_type: 'business_call' }).catch(() => []),
      v3ListBusinessCases({ stage: 'connect' }).catch(() => []),
    ])
      .then(([connectorData, businessCallData, caseData]) => {
        setCalls([...(Array.isArray(connectorData) ? connectorData : []), ...(Array.isArray(businessCallData) ? businessCallData : [])]);
        setCases(Array.isArray(caseData) ? caseData.filter((item) => item.status !== 'deleted') : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="v3-admin-connector-calls">
      <button
        onClick={() => navigate('/v3/admin/meetings')}
        className="v3-btn-secondary text-[11px] mb-4"
        data-testid="connector-calls-back-btn"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Meetings
      </button>
      <PageHeader
        title="Business Call — Connect"
        subtitle="The same linked flow as Business Case Connect: brand info, scheduling, email, questions, transcript, AI result, promote, reschedule, or delete."
        action={
          <button onClick={() => setScheduleOpen(true)} className="v3-btn-primary">
            <Plus className="w-4 h-4" /> Schedule Business Call — Connect
          </button>
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#8A8A8A]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px]">Loading calls…</span>
        </div>
      ) : calls.length === 0 && cases.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <Briefcase className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No Business Call — Connect records yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Move an accepted CRM brand into a Business Call to gather Alignment Snapshot context.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((item) => (
            <BusinessCallCaseRow key={item.id} item={item} />
          ))}
          {calls.map((call) => (
            <ConnectorRow key={call.id || call._id} call={call} />
          ))}
        </div>
      )}
      {scheduleOpen && (
        <ScheduleModal
          mode="connector"
          onClose={() => setScheduleOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export const V3AdminCreatorBriefingCalls = () => {
  const navigate = useNavigate();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    v3ListMeetings({ meeting_type: 'creator_briefing' })
      .then((data) => {
        setCalls(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div data-testid="v3-admin-creator-briefing-calls">
      <button
        onClick={() => navigate('/v3/admin/meetings')}
        className="v3-btn-secondary text-[11px] mb-4"
        data-testid="creator-briefing-calls-back-btn"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Meetings
      </button>
      <PageHeader
        title="Creator Briefing Calls"
        subtitle="Plan-phase creator calls after a brief is sent or accepted. Confirm fee, availability, deliverables, usage rights, schedule, and project willingness."
        action={
          <button onClick={() => setScheduleOpen(true)} className="v3-btn-primary">
            <Plus className="w-4 h-4" /> Schedule Creator Briefing Call
          </button>
        }
      />
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-[#8A8A8A]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[12px]">Loading calls…</span>
        </div>
      ) : calls.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <Sparkles className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No Creator Briefing Calls yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Creator Briefing Calls appear after brief acceptance and before Strategy Snapshot approval.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <button
              key={call.id || call._id}
              onClick={() => navigate(`/v3/admin/meetings/creator-briefing/${call.id || call._id}`)}
              className="w-full v3-floating-card v3-meeting-creator-briefing p-4 text-left flex flex-col lg:flex-row lg:items-center gap-4"
              data-testid={`creator-briefing-call-${call.id || call._id}`}
            >
              <div className="w-1 rounded-full bg-[#B54A37] lg:self-stretch min-h-10" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[14px] font-medium text-[#1A1A1A]">{call.title}</span>
                  <Badge tone="bg-[#DDF2F6] text-[#155E63]">Creator Briefing Call</Badge>
                  <Badge>{call.decision_status || call.status}</Badge>
                </div>
                <p className="text-[12px] text-[#8A8A8A]">
                  {call.entity_name}
                  {call.business_case_title ? `, ${call.business_case_title}` : ''}
                </p>
              </div>
              <span className="v3-btn-secondary text-[11px]">Open call</span>
            </button>
          ))}
        </div>
      )}
      {scheduleOpen && (
        <ScheduleModal
          mode="creator_briefing"
          onClose={() => setScheduleOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
};

// ─── Qualification Call Detail ────────────────────────────────────────────────

export const V3AdminQualificationCallDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false);

  useEffect(() => {
    v3GetMeeting(meetingId)
      .then((data) => {
        setMeeting(data);
        setTranscript(data.transcript || '');
        setAccepted(data.qualification_status === 'accepted');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [meetingId]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      await v3UploadMeetingTranscript(meetingId, { transcript });
      const result = await v3AnalyzeMeetingTranscript(meetingId, {});
      setMeeting((m) => ({ ...m, ...result, analysis: result, transcript }));
      setAnalysisModalOpen(true);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setAnalyzing(false);
  };

  const handleAccept = async () => {
    setSaving(true);
    try {
      const result = await v3AcceptQualificationMeeting(meetingId, {});
      setAccepted(true);
      setMeeting((m) => ({ ...m, decision_status: 'accepted', qualification_status: 'accepted', ...result }));
      if (result.creator?.id) {
        navigate(`/v3/admin/creators/${result.creator.id}`);
      }
    } catch (err) {
      console.error('Accept failed:', err);
    }
    setSaving(false);
  };

  const handleReschedule = async () => {
    setSaving(true);
    try {
      const result = await v3RescheduleQualificationMeeting(meetingId, {});
      if (result.meeting_id) navigate(`/v3/admin/meetings/qualification/${result.meeting_id}`);
    } catch (err) {
      console.error('Reschedule failed:', err);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const targetType = meeting?.qualification_entity_type || meeting?.entity_type || 'brand';
    if (!window.confirm(targetType === 'creator' ? 'Decline this creator?' : 'Decline this candidate?')) return;
    try {
      await v3DeleteQualificationMeeting(meetingId, {});
      navigate('/v3/admin/meetings/qualification');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading call…</span>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8 text-[#8A8A8A]">
        <p>Meeting not found.</p>
        <button
          onClick={() => navigate('/v3/admin/meetings/qualification')}
          className="v3-btn-secondary mt-4 text-[11px]"
        >
          Back to Qualification Calls
        </button>
      </div>
    );
  }

  const snapshot = meeting.candidate_snapshot || {};
  const analysis = meeting.analysis || {};
  const entityType = meeting.qualification_entity_type || meeting.entity_type || 'brand';
  const maxReschedules = meeting.max_reschedules || 3;
  const rescheduleCount = meeting.reschedule_count || 0;
  const canReschedule = rescheduleCount < maxReschedules;

  return (
    <div className="space-y-5" data-testid="v3-admin-qualification-call-detail">
      <button
        onClick={() => navigate('/v3/admin/meetings/qualification')}
        className="v3-btn-secondary text-[11px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Qualification Calls
      </button>
      <PageHeader
        title={meeting.title}
        subtitle={entityType === 'creator' ? 'Confirm the creator wants to work with TASCK before adding to the roster.' : 'Decide if this brand should enter CRM.'}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone="bg-[#F2EAD8] text-[#7A5F23]">Qualification Call</Badge>
            <Badge tone={entityType === 'creator' ? 'bg-[#F5D9D2] text-[#B54A37]' : 'bg-[#F2EAD8] text-[#7A5F23]'}>
              {entityType === 'creator' ? 'Creator' : 'Brand'}
            </Badge>
          </div>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5">
        <div className="space-y-5">
          <Section title="Call purpose">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">
              {entityType === 'creator'
                ? 'Confirm fit, willingness, booking route, rate range, availability, usage boundaries, and preferred brand categories before creating an approved creator profile.'
                : 'Decide if this company should work with TASCK.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Admin checks</p>
                <p className="text-[12px] mt-1">
                  {entityType === 'creator'
                    ? 'Interest, platforms, fee range, booking owner, availability, rights, red flags.'
                    : 'Interest, decision maker, contact details, fit, follow-up appetite.'}
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript use</p>
                <p className="text-[12px] mt-1">
                  {entityType === 'creator'
                    ? 'Roster decision only. It must not put the creator into projects yet.'
                    : 'CRM decision only. It must not create an Alignment Snapshot.'}
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Next step</p>
                <p className="text-[12px] mt-1">
                  {entityType === 'creator'
                    ? 'Add to Creator Roster, reschedule the fit call, or decline the creator.'
                    : 'Accept into CRM, reschedule, or delete candidate.'}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-[#8A8A8A] mt-3">
              Reschedules: {rescheduleCount} / {maxReschedules}
            </p>
          </Section>

          {Object.keys(snapshot).length > 0 && (
            <Section title={entityType === 'creator' ? 'Creator profile snapshot' : 'Scanned company intelligence'}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(snapshot).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-[#E8E4DB] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                    </p>
                    <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{value}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section
            title="Contact and meeting setup"
            action={
              <button
                className="v3-btn-secondary text-[11px]"
                onClick={async () => {
                  try {
                    const updated = await v3SaveMeetingContact(meetingId, {
                      contact_name: meeting.contact_name,
                      contact_email: meeting.contact_email,
                      contact_phone: meeting.contact_phone,
                      contact_role: meeting.contact_role,
                      meeting_link: meeting.meeting_link,
                      scheduled_for: meeting.scheduled_for,
                      meeting_notes: meeting.meeting_notes,
                    });
                    setMeeting(updated);
                  } catch (e) {
                    console.error(e);
                  }
                }}
              >
                Save contact details
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['contact_name', 'Contact name', 'Name'],
                ['contact_role', 'Contact role', 'Marketing lead, manager, creator rep'],
                ['contact_email', 'Email required for Meet and portal', 'name@example.com'],
                ['contact_phone', 'Phone / WhatsApp', '+234...'],
                ['meeting_link', 'Meeting link', 'https://meet.google.com/...'],
                ['scheduled_for', 'Scheduled date', '2026-06-11T12:00'],
              ].map(([key, label, placeholder]) => (
                <label key={key} className="space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</span>
                  <input
                    type={key === 'scheduled_for' ? 'datetime-local' : 'text'}
                    value={meeting[key] || ''}
                    onChange={(e) => setMeeting((m) => ({ ...m, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
                  />
                </label>
              ))}
              <label className="space-y-1 md:col-span-2">
                <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Meeting notes</span>
                <textarea
                  value={meeting.meeting_notes || meeting.notes || ''}
                  onChange={(e) => setMeeting((m) => ({ ...m, meeting_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8E4DB] text-[13px]"
                  placeholder="Admin notes before or during the call."
                />
              </label>
            </div>
            {!meeting.contact_email && (
              <p className="text-[11px] text-[#B54A37] mt-3">
                Email is strongly recommended before scheduling Google Meet and portal messages.
              </p>
            )}
          </Section>

          {meeting.suggested_questions?.length > 0 && (
            <Section title="Suggested questions">
              <QuestionList questions={meeting.suggested_questions} />
            </Section>
          )}

          <Section title="Transcript upload">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={6}
              className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3"
              placeholder="Paste transcript here..."
            />
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="v3-btn-primary"
            >
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}{' '}
              Analyze transcript
            </button>
          </Section>
        </div>

        <div className="space-y-5">
          {(analysis.summary || analysis.readiness_score != null) && (
            <Section title={entityType === 'creator' ? 'Creator Fit analysis' : 'CRM qualification analysis'}>
              <AnalysisCard
                analysis={analysis}
                score={analysis.readiness_score ?? meeting.readiness_score}
              />
              <button
                onClick={() => setAnalysisModalOpen(true)}
                className="v3-btn-secondary mt-4 text-[11px]"
              >
                <Sparkles className="w-3.5 h-3.5" /> Open analysis popup
              </button>
            </Section>
          )}
          <Section title="Qualification decision">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleAccept}
                disabled={saving || accepted}
                className="v3-btn-primary"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />{' '}
                {accepted
                  ? entityType === 'creator' ? 'Added to Creator Roster' : 'Accepted into CRM'
                  : entityType === 'creator' ? 'Add to Creator Roster' : 'Accept to CRM'}
              </button>
              <button
                onClick={handleReschedule}
                disabled={saving || !canReschedule}
                className="v3-btn-secondary"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {canReschedule ? (entityType === 'creator' ? 'Reschedule Creator Fit Call' : 'Reschedule Qualification Call') : 'Max reschedules reached'}
              </button>
              <button
                onClick={handleDelete}
                className="v3-btn-secondary text-[#B54A37]"
              >
                <Trash2 className="w-3.5 h-3.5" /> {entityType === 'creator' ? 'Decline Creator' : 'Decline Candidate'}
              </button>
            </div>
            {accepted && (
              <div className="mt-4 rounded-lg border border-[#DDE7E2] bg-[#F5FAF7] p-3">
                <p className="text-[12px] text-[#1F4A3A] font-medium mb-2">
                  {entityType === 'creator' ? 'Creator added to the approved roster and welcome email queued.' : 'Accepted into CRM.'}
                </p>
                <button
                  onClick={() => navigate(entityType === 'creator' ? '/v3/admin/creators' : '/v3/admin/meetings/business-calls')}
                  className="v3-btn-secondary text-[11px]"
                >
                  {entityType === 'creator' ? 'Open Creator Roster' : 'Open Business Call — Connect'}
                </button>
              </div>
            )}
          </Section>
        </div>
      </div>
      <AnalysisDecisionModal
        open={analysisModalOpen}
        title={entityType === 'creator' ? 'Creator Fit Analysis' : 'CRM Qualification Analysis'}
        analysis={analysis}
        score={analysis.readiness_score ?? meeting.readiness_score}
        onClose={() => setAnalysisModalOpen(false)}
        onAccept={handleAccept}
        onReschedule={handleReschedule}
        onDecline={handleDelete}
        acceptLabel={entityType === 'creator' ? 'Add to Creator Roster' : 'Accept to CRM'}
        rescheduleLabel={entityType === 'creator' ? 'Reschedule Creator Fit Call' : 'Reschedule Qualification Call'}
        declineLabel={entityType === 'creator' ? 'Decline Creator' : 'Decline Candidate'}
        saving={saving}
        canReschedule={canReschedule}
      />
    </div>
  );
};

// ─── Connector Call Detail ────────────────────────────────────────────────────

export const V3AdminConnectorCallDetail = () => {
  const navigate = useNavigate();
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    v3GetMeeting(meetingId)
      .then((data) => {
        setMeeting(data);
        setTranscript(data.transcript || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [meetingId]);

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setAnalyzing(true);
    try {
      await v3UploadMeetingTranscript(meetingId, { transcript });
      const result = await v3AnalyzeMeetingTranscript(meetingId, {});
      setMeeting((m) => ({ ...m, ...result, analysis: result, transcript }));
    } catch (err) {
      console.error('Analysis failed:', err);
    }
    setAnalyzing(false);
  };

  const isCreatorFit = meeting?.meeting_type === 'creator_fit' || meeting?.meeting_type === 'creator_briefing';
  const isCreatorBriefing = meeting?.meeting_type === 'creator_briefing';
  const maxReschedules = meeting?.max_reschedules || 3;
  const rescheduleCount = meeting?.reschedule_count || 0;
  const canReschedule = rescheduleCount < maxReschedules;

  const handleProceed = async () => {
    setSaving(true);
    try {
      if (isCreatorBriefing) {
        await v3AcceptCreatorBriefing(meeting.business_case_id, {
          meeting_id: meetingId,
          creator_id: meeting.creator_id,
        });
        setMeeting((m) => ({ ...m, decision_status: 'accepted', status: 'accepted' }));
      } else if (isCreatorFit) {
        await v3AcceptCreatorFitCall(meetingId);
        setMeeting((m) => ({ ...m, decision_status: 'accepted', status: 'accepted' }));
      } else {
        const result = await v3ProceedBusinessCall(meetingId);
        if (result.business_case_id) navigate(`/v3/admin/business-cases/${result.business_case_id}`);
      }
    } catch (err) {
      console.error('Proceed failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleBusinessReschedule = async () => {
    if (!canReschedule) return;
    setSaving(true);
    try {
      const result = isCreatorBriefing
        ? await v3RescheduleCreatorBriefing(meeting.business_case_id, {
            meeting_id: meetingId,
            creator_id: meeting.creator_id,
          })
        : isCreatorFit
          ? await v3RescheduleCreatorFitCall(meetingId, {})
          : await v3RescheduleBusinessCall(meetingId, {});
      if (result.meeting_id) {
        navigate(isCreatorBriefing ? `/v3/admin/meetings/creator-briefing/${result.meeting_id}` : isCreatorFit ? `/v3/admin/meetings/creator-fit/${result.meeting_id}` : `/v3/admin/meetings/connector/${result.meeting_id}`);
      }
    } catch (err) {
      console.error('Reschedule failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrReject = async () => {
    const message = isCreatorFit ? 'Reject this creator for this project?' : 'Delete this brand from the Business Call flow?';
    if (!window.confirm(message)) return;
    setSaving(true);
    try {
      if (isCreatorBriefing) {
        await v3DeclineCreatorBriefing(meeting.business_case_id, {
          meeting_id: meetingId,
          creator_id: meeting.creator_id,
        });
        navigate('/v3/admin/meetings/creator-briefing');
      } else if (isCreatorFit) {
        await v3RejectCreatorFitCall(meetingId, {});
        navigate('/v3/admin/meetings/creator-fit');
      } else {
        await v3DeleteBusinessCall(meetingId, {});
        navigate('/v3/admin/meetings/connector');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading call…</span>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-8 text-[#8A8A8A]">
        <p>Meeting not found.</p>
        <button
          onClick={() => navigate('/v3/admin/meetings/connector')}
          className="v3-btn-secondary mt-4 text-[11px]"
        >
          Back to Business Calls
        </button>
      </div>
    );
  }

  const analysis = meeting.analysis || {};
  const detailBackPath = isCreatorBriefing ? '/v3/admin/meetings/creator-briefing' : isCreatorFit ? '/v3/admin/meetings/creator-fit' : '/v3/admin/meetings/connector';

  return (
    <div className="space-y-5" data-testid="v3-admin-connector-call-detail">
      <button
        onClick={() => navigate(detailBackPath)}
        className="v3-btn-secondary text-[11px]"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to {isCreatorBriefing ? 'Creator Briefing Calls' : isCreatorFit ? 'Creator Fit Calls' : 'Business Calls'}
      </button>
      <PageHeader
        title={meeting.title}
        subtitle={isCreatorBriefing ? 'Confirm creator fee, availability, deliverables, usage rights, schedule, and willingness for this project.' : isCreatorFit ? 'Decide if this creator fits the project plan.' : 'Gather the details needed for the Alignment Snapshot.'}
        action={
          <div className="flex flex-wrap gap-2">
            <Badge tone={isCreatorFit ? 'bg-[#F5D9D2] text-[#B54A37]' : 'bg-[#DDE7E2] text-[#1F4A3A]'}>
              {isCreatorBriefing ? 'Creator Briefing Call' : isCreatorFit ? 'Creator Fit Call' : 'Business Call — Connect'}
            </Badge>
            <Badge tone="bg-[#DDE7E2] text-[#1F4A3A]">{isCreatorFit ? 'Plan phase' : 'Connect phase'}</Badge>
          </div>
        }
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5">
        <div className="space-y-5">
          <Section title="Call purpose">
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">
              {isCreatorBriefing ? 'Validate creator fee, availability, deliverables, rights, conflicts, production needs, and project willingness before Strategy Snapshot.' : isCreatorFit ? 'Validate the creator against this project before Strategy Snapshot approval.' : 'Gather the details needed for the Alignment Snapshot.'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Admin checks</p>
                <p className="text-[12px] mt-1">
                  {isCreatorBriefing ? 'Project fee, availability, deliverables, content formats, rights, conflicts, production support, approvals.' : isCreatorFit ? 'Fee, availability, deliverables, rights, conflicts, payment terms, production needs.' : 'Objective, audience, channels, KPIs, timeline, budget, approval owner, constraints.'}
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Transcript use</p>
                <p className="text-[12px] mt-1">
                  {isCreatorBriefing ? 'Accept creator for Strategy Snapshot, reschedule, or decline them for this project.' : isCreatorFit ? 'Accept, reschedule, or reject this creator for this project.' : 'Draft/update Alignment Snapshot if enough context exists.'}
                </p>
              </div>
              <div className="v3-card-muted p-3">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Next step</p>
                <p className="text-[12px] mt-1">
                  {isCreatorBriefing ? 'Accepted creator input can feed the Strategy Snapshot.' : isCreatorFit ? 'Accepted creators can be included in the Strategy Snapshot.' : 'Review snapshot, send to company, move Business Case forward.'}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Linked records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                ['Business Case', meeting.business_case_title],
                ['Company', meeting.entity_name],
                ['Stage', meeting.stage],
                ['Meeting link', meeting.meeting_link],
                ['Scheduled', meeting.scheduled_for],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-[#E8E4DB] p-3">
                    <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">
                      {label}
                    </p>
                    <p className="text-[12px] text-[#1A1A1A] break-words">{value}</p>
                  </div>
                ))}
            </div>
          </Section>

          {meeting.suggested_questions?.length > 0 && (
            <Section title="Suggested questions">
              <QuestionList questions={meeting.suggested_questions} />
            </Section>
          )}

          <Section title="Transcript upload">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={7}
              className="w-full rounded-lg border border-[#E8E4DB] p-3 text-[13px] mb-3"
              placeholder="Paste transcript here..."
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="v3-btn-primary"
            >
              {analyzing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}{' '}
              Analyze transcript
            </button>
          </Section>
        </div>

        <div className="space-y-5">
          {(analysis.summary || meeting.readiness_score != null) && (
            <Section title="Alignment Snapshot readiness">
              <AnalysisCard analysis={analysis} score={meeting.readiness_score} />
              {analysis.ai_outputs?.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-2">
                    AI outputs
                  </p>
                  <div className="space-y-2">
                    {analysis.ai_outputs.map((output) => (
                      <div
                        key={output}
                        className="rounded-lg bg-[#F4F2EC] p-2 text-[12px] text-[#1A1A1A]"
                      >
                        {output}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}
          <Section title={isCreatorBriefing ? 'Creator Briefing decision' : isCreatorFit ? 'Creator Fit decision' : 'Business Case handoff'}>
            <p className="text-[13px] text-[#1A1A1A] leading-relaxed mb-3">
              {isCreatorFit
                ? 'Use the recommendation and reasons to accept, reschedule, or decline this creator for the project.'
                : 'A strong Business Call transcript should produce Alignment Snapshot readiness and, when enough context exists, open the Connect record.'}
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={handleProceed}
                disabled={saving}
                className="v3-btn-primary"
              >
                <Briefcase className="w-3.5 h-3.5" /> {isCreatorBriefing ? 'Accept Creator for Strategy Snapshot' : isCreatorFit ? 'Accept Creator for Project' : meeting.business_case_id ? 'Open Business Case Connect' : 'Promote to Frame'}
              </button>
              <button
                onClick={handleBusinessReschedule}
                disabled={saving || !canReschedule}
                className="v3-btn-secondary"
              >
                <RotateCcw className="w-3.5 h-3.5" /> {canReschedule ? 'Reschedule' : 'Max reschedules reached'}
              </button>
              <button
                onClick={handleDeleteOrReject}
                disabled={saving}
                className="v3-btn-secondary text-[#B54A37]"
              >
                <Trash2 className="w-3.5 h-3.5" /> {isCreatorFit ? 'Decline Creator for This Project' : 'Delete Brand From Pipeline'}
              </button>
            </div>
            <p className="text-[11px] text-[#8A8A8A] mt-3">Reschedules: {rescheduleCount} / {maxReschedules}</p>
          </Section>
        </div>
      </div>
    </div>
  );
};

export const V3AdminCreatorFitCalls = () => <V3AdminQualificationCalls qualificationType="creator" />;
export const V3AdminCreatorFitCallDetail = V3AdminQualificationCallDetail;
export const V3AdminCreatorBriefingCallDetail = V3AdminConnectorCallDetail;

export default V3AdminMeetingsOverview;
