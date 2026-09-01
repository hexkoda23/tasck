// ============================================================================
// V1AdminOverview - CRM Performance Report
// ----------------------------------------------------------------------------
// The admin Overview, modelled on the TTA CRM Performance Report: the window at
// a glance, a scorecard, new partners, pipeline movement, pitch materials and
// creator matching, live engagements, who did the work, and what to watch.
//
// Every figure is counted from the records by GET /api/v3/metrics/crm-report
// (backend/v3_crm_report.py). Nothing on this page is illustrative - if a
// number cannot be counted from the database it is not shown, and each
// scorecard band carries the numbers it was derived from.
//
// Replaces the previous overview. The "Needs your attention" and "Recent
// activity" cards were removed with it.
// ============================================================================
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3CrmReport } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { formatNairaV3 } from '../../lib/v3data';

const Section = ({ num, title, lede, children, testId }) => (
  <section className="mt-9" data-testid={testId}>
    <div className="flex items-baseline gap-3 border-b border-[#E8E4DB] pb-2.5 mb-4">
      <span className="text-[11px] font-bold tracking-wider text-[#C49B5F]">{num}</span>
      <h2 className="text-[16px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h2>
    </div>
    {lede && <p className="text-[12px] text-[#6E6657] mb-4 max-w-3xl">{lede}</p>}
    {children}
  </section>
);

const Empty = ({ children }) => <p className="text-[12px] text-[#8A8A8A]">{children}</p>;

const Table = ({ head, rows, testId }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-collapse text-[12px]" data-testid={testId}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="border-b border-[#E8E4DB] px-2.5 py-2 text-left text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  </div>
);

const Td = ({ children, className = '' }) => (
  <td className={`border-b border-[#F0EDE5] px-2.5 py-2 align-top text-[#4F3E2F] ${className}`}>{children}</td>
);

// A 0-10 band. The bar is the score; the basis line underneath is the count it
// came from, so the number can be checked rather than taken on trust.
const ScoreBand = ({ band }) => (
  <div className="rounded-lg border border-[#E8E4DB] bg-white p-3" data-testid={`overview-band-${band.key}`}>
    <div className="flex items-baseline justify-between gap-2">
      <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">{band.label}</p>
      <p className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{band.score}<span className="text-[11px] text-[#8A8A8A]">/10</span></p>
    </div>
    <div className="mt-2 h-1.5 w-full rounded-full bg-[#F0EDE5] overflow-hidden">
      <div className="h-full rounded-full bg-[#1F4A3A]" style={{ width: `${Math.max(0, Math.min(10, band.score)) * 10}%` }} />
    </div>
    <p className="mt-2 text-[11px] text-[#6E6657]">{band.basis}</p>
  </div>
);

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

  const glanceCards = [
    { key: 'snapshots', label: 'Alignment snapshots sent', value: glance.snapshots_sent },
    { key: 'completions', label: 'Full funnel completions', value: glance.full_funnel_completions },
    { key: 'partners', label: 'New partners entered', value: glance.new_partners },
    { key: 'engagements', label: 'Engagements delivered', value: glance.engagements_delivered },
  ];

  return (
    <div data-testid="v1-admin-overview">
      {/* Masthead */}
      <p className="text-[11px] text-[#C49B5F] uppercase tracking-[0.2em] font-semibold mb-2">TASCK · Partnerships & CRM</p>
      <h1 className="v3-heading text-2xl mb-2" style={{ fontFamily: "'Fraunces', serif" }}>CRM Performance Report</h1>
      <p className="text-[13px] text-[#6E6657] max-w-3xl">
        Partner pipeline movement, creator matching and delivery across the last {win.days} days, counted from the
        CRM records. Covers every brand in the book and every business case that has not been merged away.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 border-b border-[#E8E4DB] pb-4 text-[11px] uppercase tracking-wider text-[#8A8A8A]">
        <span>Window <b className="text-[#1A1A1A]">{win.label}</b></span>
        <span>Brands in book <b className="text-[#1A1A1A]">{totals.brands}</b></span>
        <span>Business cases <b className="text-[#1A1A1A]">{totals.business_cases}</b></span>
        <span>Relationship managers <b className="text-[#1A1A1A]">{totals.team}</b></span>
      </div>

      {/* 00 */}
      <Section num="00" title="The window at a glance" testId="overview-glance"
        lede="What actually moved in this window - each counted from a dated record, not a running total.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {glanceCards.map((c) => (
            <div key={c.key} className="rounded-lg border border-[#E8E4DB] bg-white p-4" data-testid={`overview-glance-${c.key}`}>
              <p className="text-[26px] font-semibold text-[#1F4A3A] leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.value}</p>
              <p className="text-[11px] text-[#6E6657] mt-2">{c.label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 01 */}
      <Section num="01" title="Scorecard" testId="overview-scorecard"
        lede="Four bands, each a ratio the records can answer. The line under every band is the count it came from.">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <div className="rounded-lg border border-[#1F4A3A] bg-[#EAF4EE] px-5 py-3" data-testid="overview-score-overall">
            <p className="text-[28px] font-semibold text-[#1F4A3A] leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {scorecard.overall}<span className="text-[13px]">/10</span>
            </p>
            <p className="text-[11px] uppercase tracking-wider text-[#1F4A3A] mt-1">Overall</p>
          </div>
          <p className="text-[12px] text-[#6E6657] flex-1 min-w-[220px]">
            The average of the four bands below. It moves only when the underlying counts move.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(scorecard.bands || []).map((b) => <ScoreBand key={b.key} band={b} />)}
        </div>
      </Section>

      {/* 02 */}
      <Section num="02" title="New partners added" testId="overview-new-partners"
        lede={`Brands entered into the book during this window, with the relationship manager who owns each one.`}>
        {newPartners.length === 0 ? (
          <Empty>No brands were added in this window.</Empty>
        ) : (
          <Table head={['Date entered', 'Partner', 'Relationship manager']} testId="overview-new-partners-table"
            rows={newPartners.map((p) => (
              <tr key={p.brand_id} className="hover:bg-[#FBFAF7]">
                <Td className="whitespace-nowrap">{p.date}</Td>
                <Td>
                  <button onClick={() => navigate(adminRoute(`/crm-brands/${p.brand_id}`))} className="text-left text-[#1F4A3A] hover:underline">
                    {p.brand}
                  </button>
                </Td>
                <Td>{p.rm}</Td>
              </tr>
            ))} />
        )}
      </Section>

      {/* 03 */}
      <Section num="03" title="Pipeline movement" testId="overview-pipeline"
        lede="Where the work sits: business cases by funnel stage, and the whole brand book by relationship stage.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Business cases by stage</p>
            <Table head={['Stage', 'Cases', 'Value']} testId="overview-funnel-table"
              rows={(pipeline.funnel || []).map((f) => (
                <tr key={f.stage} className="hover:bg-[#FBFAF7]">
                  <Td>{f.label}</Td>
                  <Td className="font-semibold text-[#1A1A1A]">{f.count}</Td>
                  <Td className="whitespace-nowrap">{f.value ? formatNairaV3(f.value) : '—'}</Td>
                </tr>
              ))} />
            <p className="mt-2 text-[11px] text-[#6E6657]">
              Total tracked pipeline value {formatNairaV3(pipeline.pipeline_value || 0)}.
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Brand book by relationship stage</p>
            {(pipeline.relationship || []).length === 0 ? (
              <Empty>No brands carry a relationship stage yet.</Empty>
            ) : (
              <Table head={['Stage', 'Brands', 'Read']} testId="overview-relationship-table"
                rows={pipeline.relationship.map((r) => (
                  <tr key={r.stage} className="hover:bg-[#FBFAF7]">
                    <Td>{r.label}</Td>
                    <Td className="font-semibold text-[#1A1A1A]">{r.count}</Td>
                    <Td className="text-[#8A8A8A]">{r.read}</Td>
                  </tr>
                ))} />
            )}
            <p className="mt-2 text-[11px] text-[#6E6657]">
              {pipeline.cooled} of {totals.brands} brands are resting or dormant rather than advancing.
            </p>
          </div>
        </div>
      </Section>

      {/* 04 */}
      <Section num="04" title="Pitch materials & creator matching" testId="overview-pitch"
        lede="What has actually been produced for brands, and which of them carry a matched creator shortlist.">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            ['Alignment snapshots sent', pitch.snapshots_sent_total],
            ['Sent this window', pitch.snapshots_sent_window],
            ['Pitch decks built', pitch.decks],
            ['Creative briefs written', pitch.briefs],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-[#E8E4DB] bg-white p-3">
              <p className="text-[20px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
              <p className="text-[11px] text-[#6E6657] mt-1">{label}</p>
            </div>
          ))}
        </div>
        {(pitch.brands || []).length === 0 ? (
          <Empty>No business case carries a selected creator yet. Run the Creator Match Scanner on a case to build a shortlist.</Empty>
        ) : (
          <>
            <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">
              Brands carrying creator matches ({pitch.cases_with_creators})
            </p>
            <div className="flex flex-wrap gap-2" data-testid="overview-matched-brands">
              {pitch.brands.map((b) => (
                <button key={b.brand_id} onClick={() => navigate(adminRoute(`/crm-brands/${b.brand_id}`))}
                  className="rounded-full border border-[#CFE0D6] bg-[#EFF5F1] px-3 py-1 text-[11px] text-[#1F4A3A] hover:bg-[#E3EFE8]">
                  {b.brand} <span className="text-[#6E6657]">· {b.creators}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* 05 */}
      <Section num="05" title="Live engagements" testId="overview-engagements"
        lede="Meetings and engagements logged in this window, with how each one resolved.">
        {engagements.length === 0 ? (
          <Empty>No engagements were logged in this window.</Empty>
        ) : (
          <Table head={['Date', 'Engagement', 'Brand', 'Type', 'Outcome']} testId="overview-engagements-table"
            rows={engagements.map((e, i) => (
              <tr key={i} className="hover:bg-[#FBFAF7]">
                <Td className="whitespace-nowrap">{e.date}</Td>
                <Td className="text-[#1A1A1A]">{e.title}</Td>
                <Td>{e.brand || '—'}</Td>
                <Td className="text-[#8A8A8A]">{e.type}</Td>
                <Td>{e.outcome}</Td>
              </tr>
            ))} />
        )}
      </Section>

      {/* 06 */}
      <Section num="06" title="Who did the work" testId="overview-team"
        lede="Tracked load per relationship manager - the brands, cases, meetings and sent snapshots attributed to each.">
        {team.length === 0 ? (
          <Empty>No relationship managers are on record yet.</Empty>
        ) : (
          <Table head={['Relationship manager', 'Role', 'Brands', 'Cases', 'Meetings', 'Snapshots', 'Share']} testId="overview-team-table"
            rows={team.map((t) => (
              <tr key={t.name} className="hover:bg-[#FBFAF7]">
                <Td className="font-semibold text-[#1A1A1A] whitespace-nowrap">{t.name}</Td>
                <Td className="text-[#8A8A8A]">{t.role}</Td>
                <Td>{t.brands}</Td>
                <Td>{t.cases}</Td>
                <Td>{t.meetings}</Td>
                <Td>{t.snapshots}</Td>
                <Td className="whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-12 rounded-full bg-[#F0EDE5] overflow-hidden align-middle">
                      <span className="block h-full rounded-full bg-[#1F4A3A]" style={{ width: `${t.share}%` }} />
                    </span>
                    {t.share}%
                  </span>
                </Td>
              </tr>
            ))} />
        )}
      </Section>

      {/* 07 */}
      <Section num="07" title="What to watch" testId="overview-watch"
        lede="Conditions the records can prove right now. Each line is a count, not a judgement.">
        {watch.length === 0 ? (
          <Empty>Nothing flagged. No unsent snapshots, no unassigned brands, and no case stalled in Framing.</Empty>
        ) : (
          <ul className="space-y-2" data-testid="overview-watch-list">
            {watch.map((w, i) => (
              <li key={i} className="rounded-lg border border-[#E8E4DB] bg-white px-3.5 py-2.5">
                <p className="text-[13px] text-[#1A1A1A]">{w.label}</p>
                <p className="text-[11px] text-[#6E6657] mt-0.5">{w.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <p className="mt-10 border-t border-[#E8E4DB] pt-4 text-[11px] text-[#8A8A8A]">
        TASCK — CRM Performance Report · {win.label}. Counted from the CRM records; merged business cases excluded.
      </p>
    </div>
  );
};

export default V1AdminOverview;
