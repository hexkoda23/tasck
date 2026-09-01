// ============================================================================
// V1AdminOverview - CRM Performance Report
// ----------------------------------------------------------------------------
// The admin Overview. Structure follows the TTA CRM Performance Report; the
// presentation is the card layout from the client-dashboard reference - a
// pipeline strip, headline tiles, then one titled card per subject.
//
// Every figure is counted from the records by GET /api/v3/metrics/crm-report
// (backend/v3_crm_report.py). Nothing here is illustrative: if a number cannot
// be counted it is not shown, and each scorecard band carries the count it was
// derived from so it can be checked rather than trusted.
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, AlertTriangle, BarChart3, CalendarCheck, Gauge, Sparkles, UserPlus, Users,
} from 'lucide-react';
import { v3CrmReport } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { formatNairaV3 } from '../../lib/v3data';

/* ── shared shells ─────────────────────────────────────────────────────── */

const Card = ({ icon: Icon, title, subtitle, children, testId, tone = '#1F4A3A' }) => (
  <div className="rounded-[14px] border border-[#E8E4DB] bg-white overflow-hidden" data-testid={testId}>
    <div className="flex items-start gap-3 px-5 pt-5 pb-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#F4F2EC]">
        <Icon className="h-4 w-4" style={{ color: tone }} strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-[#8A8A8A] mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <div className="border-t border-[#F0EDE5]">{children}</div>
  </div>
);

const Empty = ({ children }) => <p className="px-5 py-5 text-[12px] text-[#8A8A8A]">{children}</p>;

// Rows share one grid so columns line up without a table's visual weight.
const Row = ({ children, cols, className = '' }) => (
  <div className={`grid items-center gap-3 px-5 py-3 border-b border-[#F4F2EC] last:border-b-0 ${className}`}
    style={{ gridTemplateColumns: cols }}>
    {children}
  </div>
);

const HeadRow = ({ labels, cols }) => (
  <div className="grid gap-3 px-5 py-2 bg-[#FBFAF7] border-b border-[#F0EDE5]" style={{ gridTemplateColumns: cols }}>
    {labels.map((l) => (
      <span key={l} className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">{l}</span>
    ))}
  </div>
);

const Meter = ({ pct, tone = '#1F4A3A' }) => (
  <span className="inline-block h-1.5 w-full rounded-full bg-[#F0EDE5] overflow-hidden align-middle">
    <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone }} />
  </span>
);

/* ── page ──────────────────────────────────────────────────────────────── */

// Funnel colour ramp - deepens as a case advances, so the strip reads left to
// right as progress rather than as five unrelated buckets.
const STAGE_TONE = {
  connect: '#B5AF9F', frame: '#C49B5F', plan: '#2E6FB7', deliver: '#1F4A3A', closed: '#14532D',
};

const V1AdminOverview = () => {
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetched = useRef(false);

  const load = () => {
    setLoading(true);
    setError(null);
    v3CrmReport()
      .then((data) => { setReport(data); setLoading(false); })
      .catch(() => { setError('Could not load the CRM report.'); setLoading(false); });
  };

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div data-testid="v1-admin-overview" className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#1F4A3A] border-t-transparent animate-spin" />
        <p className="text-[12px] text-[#8A8A8A]">Loading CRM report…</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div data-testid="v1-admin-overview" className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-[13px] text-[#B54A37]">{error || 'Could not load the CRM report.'}</p>
        <button onClick={load} className="text-[11px] text-[#1F4A3A] underline underline-offset-2">Try again</button>
      </div>
    );
  }

  const { window: win, totals, glance, scorecard, new_partners: newPartners,
          pipeline, pitch, engagements, team, watch } = report;

  const funnel = pipeline.funnel || [];
  const totalCases = funnel.reduce((n, f) => n + f.count, 0) || 1;

  const tiles = [
    { key: 'snapshots', label: 'Snapshots sent', value: glance.snapshots_sent, tone: '#1F4A3A' },
    { key: 'partners', label: 'New partners', value: glance.new_partners, tone: '#2E6FB7' },
    { key: 'engagements', label: 'Engagements delivered', value: glance.engagements_delivered, tone: '#1F4A3A' },
    { key: 'completions', label: 'Full funnel completions', value: glance.full_funnel_completions, tone: '#C49B5F' },
  ];

  return (
    <div data-testid="v1-admin-overview" className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1A1A] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>
          CRM Performance Report
        </h1>
        <p className="text-[13px] text-[#6E6657] mt-1">
          {win.label} · {totals.brands} brands in book · {totals.business_cases} business cases · {totals.team} relationship managers
        </p>
      </div>

      {/* Pipeline strip - where the book actually sits */}
      <Card icon={BarChart3} title="Pipeline" subtitle={`${totalCases} business cases across the funnel · ${formatNairaV3(pipeline.pipeline_value || 0)} tracked value`} testId="overview-pipeline">
        <div className="px-5 py-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${funnel.length}, minmax(0, 1fr))` }} data-testid="overview-funnel">
            {funnel.map((f) => (
              <div key={f.stage} data-testid={`overview-funnel-${f.stage}`}>
                <Meter pct={(f.count / totalCases) * 100} tone={STAGE_TONE[f.stage] || '#1F4A3A'} />
                <p className="mt-2 text-[12px] font-semibold text-[#1A1A1A]">{f.label}</p>
                <p className="text-[11px] text-[#8A8A8A]">
                  {f.count} {f.count === 1 ? 'case' : 'cases'}{f.value ? ` · ${formatNairaV3(f.value)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Headline tiles for the window */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="overview-glance">
        {tiles.map((t) => (
          <div key={t.key} className="rounded-[14px] border border-[#E8E4DB] bg-white px-5 py-6 text-center" data-testid={`overview-glance-${t.key}`}>
            <p className="text-[34px] font-bold leading-none" style={{ color: t.tone, fontFamily: "'JetBrains Mono', monospace" }}>{t.value}</p>
            <p className="mt-2.5 text-[11px] uppercase tracking-wider text-[#8A8A8A] font-semibold">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Scorecard */}
      <Card icon={Gauge} title={`Scorecard · ${scorecard.overall}/10`}
        subtitle="Four measured ratios. The line under each is the count it came from."
        testId="overview-scorecard">
        <div className="px-5 py-4 divide-y divide-[#F4F2EC]">
          {(scorecard.bands || []).map((b) => (
            <div key={b.key} className="py-2.5 first:pt-0 last:pb-0" data-testid={`overview-band-${b.key}`}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[13px] font-medium text-[#1A1A1A]">{b.label}</p>
                <p className="text-[13px] font-semibold text-[#1A1A1A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {b.score}<span className="text-[11px] text-[#B5AF9F]">/10</span>
                </p>
              </div>
              <div className="mt-1.5"><Meter pct={b.score * 10} /></div>
              <p className="mt-1.5 text-[11px] text-[#8A8A8A]">{b.basis}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Brand book state */}
        <Card icon={Activity} title="Brand book"
          subtitle={`${pipeline.cooled} of ${totals.brands} resting or dormant rather than advancing`}
          testId="overview-relationship">
          {(pipeline.relationship || []).length === 0 ? (
            <Empty>No brand carries a relationship stage yet.</Empty>
          ) : (
            <div data-testid="overview-relationship-list">
              {pipeline.relationship.map((r) => (
                <Row key={r.stage} cols="1fr 84px 40px">
                  <span className="text-[12px] text-[#1A1A1A] truncate" title={r.label}>{r.label}</span>
                  <Meter pct={(r.count / totals.brands) * 100} tone={['dormant', 'resting'].includes(r.stage) ? '#B5AF9F' : '#1F4A3A'} />
                  <span className="text-[12px] font-semibold text-[#1A1A1A] text-right">{r.count}</span>
                </Row>
              ))}
            </div>
          )}
        </Card>

        {/* New partners */}
        <Card icon={UserPlus} title="New partners"
          subtitle={`Brands entered in the last ${win.days} days`} testId="overview-new-partners">
          {newPartners.length === 0 ? (
            <Empty>No brands were added in this window.</Empty>
          ) : (
            <>
              <HeadRow labels={['Partner', 'Entered', 'Manager']} cols="1fr 96px 110px" />
              <div data-testid="overview-new-partners-list">
                {newPartners.map((p) => (
                  <Row key={p.brand_id} cols="1fr 96px 110px">
                    <button onClick={() => navigate(adminRoute(`/crm-brands/${p.brand_id}`))}
                      className="text-left text-[12px] text-[#1F4A3A] hover:underline truncate" title={p.brand}>
                      {p.brand}
                    </button>
                    <span className="text-[12px] text-[#6E6657] whitespace-nowrap">{p.date}</span>
                    <span className="text-[12px] text-[#6E6657] truncate">{p.rm}</span>
                  </Row>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Pitch materials & creator matching */}
      <Card icon={Sparkles} title="Pitch materials & creator matching"
        subtitle="What has been produced for brands, and who carries a matched shortlist."
        testId="overview-pitch">
        <div className="grid grid-cols-3 divide-x divide-[#F0EDE5] border-b border-[#F0EDE5]">
          {[
            ['Snapshots sent', pitch.snapshots_sent_total],
            ['Pitch decks', pitch.decks],
            ['Creative briefs', pitch.briefs],
          ].map(([label, value]) => (
            <div key={label} className="px-5 py-4 text-center">
              <p className="text-[22px] font-bold text-[#1A1A1A] leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
              <p className="mt-1.5 text-[11px] text-[#8A8A8A]">{label}</p>
            </div>
          ))}
        </div>
        {(pitch.brands || []).length === 0 ? (
          <Empty>No business case carries a selected creator yet. Run the Creator Match Scanner on a case to build a shortlist.</Empty>
        ) : (
          <div className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] font-semibold mb-2.5">
              Carrying creator matches · {pitch.cases_with_creators}
            </p>
            <div className="flex flex-wrap gap-2" data-testid="overview-matched-brands">
              {pitch.brands.map((b) => (
                <button key={b.brand_id} onClick={() => navigate(adminRoute(`/crm-brands/${b.brand_id}`))}
                  className="rounded-full border border-[#CFE0D6] bg-[#EFF5F1] px-3 py-1 text-[11px] text-[#1F4A3A] hover:bg-[#E3EFE8] max-w-full truncate">
                  {b.brand} <span className="text-[#6E6657]">· {b.creators}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Live engagements */}
      <Card icon={CalendarCheck} title="Live engagements"
        subtitle={`Logged in the last ${win.days} days, and how each resolved`} testId="overview-engagements">
        {engagements.length === 0 ? (
          <Empty>No engagements were logged in this window.</Empty>
        ) : (
          <>
            <HeadRow labels={['Engagement', 'Brand', 'Date', 'Outcome']} cols="1fr 180px 96px 96px" />
            <div data-testid="overview-engagements-list">
              {engagements.map((e, i) => {
                const done = /complete|deliver|done/i.test(e.outcome);
                const off = /declin|cancel|no.?show/i.test(e.outcome);
                return (
                  <Row key={i} cols="1fr 180px 96px 96px">
                    <span className="text-[12px] text-[#1A1A1A] truncate" title={e.title}>{e.title}</span>
                    <span className="text-[12px] text-[#6E6657] truncate">{e.brand || '—'}</span>
                    <span className="text-[12px] text-[#6E6657] whitespace-nowrap">{e.date}</span>
                    <span className="text-[11px] font-medium whitespace-nowrap"
                      style={{ color: done ? '#1F7A72' : off ? '#B54A37' : '#8A6E2F' }}>
                      {e.outcome}
                    </span>
                  </Row>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Who did the work */}
      <Card icon={Users} title="Who did the work"
        subtitle="Brands, cases, meetings and sent snapshots attributed to each manager"
        testId="overview-team">
        {team.length === 0 ? (
          <Empty>No relationship managers are on record yet.</Empty>
        ) : (
          <>
            <HeadRow labels={['Manager', 'Brands', 'Cases', 'Meetings', 'Snapshots', 'Share']} cols="1fr 64px 64px 76px 80px 130px" />
            <div data-testid="overview-team-list">
              {team.map((t) => (
                <Row key={t.name} cols="1fr 64px 64px 76px 80px 130px">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#1A1A1A] truncate">{t.name}</p>
                    <p className="text-[11px] text-[#8A8A8A] truncate">{t.role}</p>
                  </div>
                  <span className="text-[12px] text-[#4F3E2F]">{t.brands}</span>
                  <span className="text-[12px] text-[#4F3E2F]">{t.cases}</span>
                  <span className="text-[12px] text-[#4F3E2F]">{t.meetings}</span>
                  <span className="text-[12px] text-[#4F3E2F]">{t.snapshots}</span>
                  <span className="flex items-center gap-2">
                    <Meter pct={t.share} tone={t.share >= 55 ? '#C0703A' : '#1F4A3A'} />
                    <span className="text-[11px] text-[#6E6657] w-8 text-right flex-shrink-0">{t.share}%</span>
                  </span>
                </Row>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* What to watch */}
      <Card icon={AlertTriangle} title="What to watch" tone="#B07A2B"
        subtitle="Conditions the records prove right now - each line is a count, not a judgement"
        testId="overview-watch">
        {watch.length === 0 ? (
          <Empty>Nothing flagged. No unsent snapshots, no unassigned brands, and no case stalled in Framing.</Empty>
        ) : (
          <div data-testid="overview-watch-list">
            {watch.map((w, i) => (
              <div key={i} className="px-5 py-3 border-b border-[#F4F2EC] last:border-b-0">
                <p className="text-[13px] text-[#1A1A1A]">{w.label}</p>
                <p className="text-[11px] text-[#8A8A8A] mt-0.5">{w.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default V1AdminOverview;
