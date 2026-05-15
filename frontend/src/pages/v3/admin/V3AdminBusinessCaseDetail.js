// Live Business Case detail — tabbed Connect / Frame / Plan / Deliver / Closure
// surface, all data sourced from /api/v3/business-cases/:id
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  v3GetBusinessCase,
  v3AdvanceBusinessCase,
  v3GenerateAlignment,
  v3ApproveAlignment,
  v3ApproveSnapshot,
  v3SignContract,
  v3TransitionDeliverable,
  v3RequestScopeChange,
  v3ApproveScopeChange,
  v3MarkInvoicePaid,
  v3SubmitBrandFeedback,
  v3SubmitCreatorFeedback,
} from '../../../lib/v3api';
import { formatNairaV3 } from '../../../lib/v3data';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import {
  ArrowLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, FileText,
  Sparkles, ShieldAlert, FileSignature, PackageCheck, AlertOctagon, Plus,
} from 'lucide-react';

const STAGES = ['connect', 'frame', 'plan', 'deliver', 'closure'];

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

const V3AdminBusinessCaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('frame');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const reload = () => v3GetBusinessCase(id).then(setBundle).catch((e) => setError(e.message));

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (bundle?.business_case?.stage) {
      setTab(bundle.business_case.stage === 'closed' ? 'closure' : bundle.business_case.stage);
    }
  }, [bundle?.business_case?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
                {c.stage}
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
          const idx = STAGES.indexOf(c.stage === 'closed' ? 'closure' : c.stage);
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
              {s}
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
        <Section title="Connect — Discovery">
          <dl className="grid grid-cols-2 gap-4 text-[13px]">
            <div>
              <dt className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Source</dt>
              <dd>{c.connect?.source || '—'}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Connect status</dt>
              <dd>{c.connect?.connect_status || '—'}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Stated intent</dt>
              <dd className="text-[#1A1A1A]">{c.connect?.stated_intent || '—'}</dd>
            </div>
          </dl>
          {bundle.interactions?.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Interactions</p>
              {bundle.interactions.map((i) => (
                <div key={i.id} className="p-3 border border-[#E8E4DB] rounded" data-testid={`bc-interaction-${i.id}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium">{i.title}</span>
                    <span className="text-[10px] text-[#8A8A8A]">{i.date_iso}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] mb-1">{i.author}</p>
                  <p className="text-[12px] text-[#6E6657] line-clamp-3 whitespace-pre-wrap">{i.content}</p>
                </div>
              ))}
            </div>
          )}
          {c.stage === 'connect' && (
            <button
              onClick={wrap(() => v3AdvanceBusinessCase(c.id))}
              disabled={busy}
              className="v3-btn-primary mt-6"
              data-testid="bc-advance-frame"
            >
              Qualify to Frame <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </Section>
      )}

      {/* FRAME */}
      {tab === 'frame' && (
        <>
          {!bundle.alignment_snapshot && c.stage === 'frame' && (
            <Section title="Alignment Snapshot">
              <p className="text-[13px] text-[#6E6657] mb-4">No Alignment Snapshot yet. Generate the AI draft to begin Frame.</p>
              <button onClick={wrap(() => v3GenerateAlignment(c.id))} disabled={busy} className="v3-btn-primary" data-testid="bc-generate-alignment">
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
                      onClick={wrap(() => v3ApproveAlignment(c.id, bundle.brand?.primary_contact || 'Brand'))}
                      disabled={busy}
                      className="v3-btn-primary"
                      data-testid="bc-approve-alignment"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                </div>
              }
            >
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
            </Section>
          )}

          {/* Strategy Development Fee invoice */}
          {bundle.invoices?.length > 0 && (
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
              onClick={wrap(() => v3AdvanceBusinessCase(c.id))}
              disabled={busy}
              className="v3-btn-primary mt-2"
              data-testid="bc-advance-plan"
            >
              Advance to Plan <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </>
      )}

      {/* PLAN */}
      {tab === 'plan' && (
        <>
          {bundle.brainstorm_round && (
            <Section title="Brainstorm — 7-phase round">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {bundle.brainstorm_round.phases.map((p) => (
                  <div key={p.phase} className={`p-2 rounded text-center ${p.status === 'complete' ? 'bg-[#DDE7E2]' : 'bg-[#F4F2EC]'}`}>
                    <p className="text-[10px] text-[#8A8A8A]">Phase {p.phase}</p>
                    <p className="text-[11px] font-medium">{p.label}</p>
                    <p className="text-[10px] mt-1">{p.status === 'complete' ? '✓' : '…'}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {bundle.brainstorm_round.scored_creators.map((sc) => (
                  <div key={sc.creator_id} className={`flex items-center justify-between p-2 rounded text-[12px] ${sc.eliminated ? 'bg-[#F5D9D2]' : 'bg-[#F4F2EC]'}`} data-testid={`bc-bs-${sc.creator_id}`}>
                    <span className={sc.eliminated ? 'line-through text-[#B54A37]' : ''}>{sc.creator_id}</span>
                    <span className="text-[10px]">
                      cultural {sc.cultural_fit} • conv {sc.conversion_behavior} • rel {sc.reliability}
                      {sc.eliminated && ` — ${sc.reason}`}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {bundle.creative_brief && (
            <Section title="Creative Brief — sent to creator">
              <p className="text-[12px] text-[#8A8A8A] mb-2">
                Sent to {bundle.creator?.name} • {bundle.creative_brief.sent_at?.slice(0, 10)}
              </p>
              <p className="text-[13px] mb-4 whitespace-pre-wrap">{bundle.creative_brief.brief_text}</p>
              {bundle.creative_brief.creator_response && (
                <div className="p-4 bg-[#F4F2EC] rounded">
                  <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Creator response</p>
                  <p className="text-[12px] mb-1"><strong>Interest:</strong> {bundle.creative_brief.creator_response.interest}</p>
                  <p className="text-[12px] mb-1"><strong>Fee:</strong> {bundle.creative_brief.creator_response.fee_expectation}</p>
                  <p className="text-[12px] mb-1"><strong>Availability:</strong> {bundle.creative_brief.creator_response.availability}</p>
                  <p className="text-[12px] mt-2 whitespace-pre-wrap">{bundle.creative_brief.creator_response.proposed_concept}</p>
                </div>
              )}
            </Section>
          )}

          {bundle.creative_snapshot && (
            <Section
              title="Creative Snapshot — brand-facing strategy"
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
              <p className="text-[12px] mb-2">Parties: {bundle.contract.parties.join(' • ')}</p>
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
              onClick={wrap(() => v3AdvanceBusinessCase(c.id))}
              disabled={busy}
              className="v3-btn-primary mt-2"
              data-testid="bc-advance-deliver"
            >
              Advance to Deliver <ChevronRight className="w-4 h-4" />
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

          <Section title="Milestones">
            <p className="text-[12px] text-[#8A8A8A] mb-3">
              {c.deliver?.milestones_complete || 0} of {c.deliver?.milestones_total || bundle.deliverables.length} approved
            </p>
            <div className="space-y-2">
              {bundle.deliverables.map((d) => (
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
                  {d.status !== 'approved' && (
                    <button onClick={wrap(() => v3TransitionDeliverable(d.id))} disabled={busy} className="v3-btn-secondary text-[11px]" data-testid={`bc-transition-${d.id}`}>
                      <PackageCheck className="w-3.5 h-3.5" /> Advance
                    </button>
                  )}
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
            {(c.deliver?.scope_change_log || []).map((sc) => (
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
              onClick={wrap(() => v3AdvanceBusinessCase(c.id))}
              disabled={busy}
              className="v3-btn-primary mt-2"
              data-testid="bc-advance-close"
            >
              Move to Closure <ChevronRight className="w-4 h-4" />
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
              <p className="text-[12px] text-[#8A8A8A]">No final report generated yet.</p>
            </Section>
          )}

          <Section title="Brand feedback">
            <button
              onClick={wrap(async () => {
                const rater = bundle.brand?.primary_contact || 'Brand';
                await v3SubmitBrandFeedback(c.id, {
                  rater,
                  scores: { timeliness: 9, quality: 9, communication: 9 },
                  comment: 'Auto-submitted from admin panel for demo.',
                });
              })}
              disabled={busy || c.closure?.brand_feedback_received}
              className="v3-btn-primary"
              data-testid="bc-submit-brand-feedback"
            >
              <FileText className="w-3.5 h-3.5" /> {c.closure?.brand_feedback_received ? 'Brand feedback recorded' : 'Submit brand feedback'}
            </button>
          </Section>

          <Section title="Creator feedback">
            <button
              onClick={wrap(async () => {
                await v3SubmitCreatorFeedback(c.id, {
                  rater: bundle.creator?.name || 'Creator',
                  scores: { professionalism: 9, clarity: 9, payment_speed: 9 },
                  comment: 'Auto-submitted from admin panel for demo.',
                });
              })}
              disabled={busy || c.closure?.creator_feedback_received}
              className="v3-btn-primary"
              data-testid="bc-submit-creator-feedback"
            >
              <FileText className="w-3.5 h-3.5" /> {c.closure?.creator_feedback_received ? 'Creator feedback recorded' : 'Submit creator feedback'}
            </button>
          </Section>
        </>
      )}
    </div>
  );
};

export default V3AdminBusinessCaseDetail;
