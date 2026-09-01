// ============================================================================
// V1AdminOverview - agency-wide operational dashboard
// ----------------------------------------------------------------------------
// Answers, top to bottom: where are our brands and projects -> what stage are
// they in -> what needs attention -> what is pending -> what happened -> what
// do we do next.
//
// Data: GET /api/v3/metrics/overview (backend/v3_overview.py), counted from
// the live collections on every request. One request populates the whole page;
// nothing here holds its own copy of CRM state, so every figure moves with the
// workflow. Revalidates when the tab is refocused or made visible again, and
// on demand - no polling.
//
// Every headline metric ships its own `breakdown`, which is what its tooltip
// renders, so a tooltip cannot disagree with the number above it.
//
// Visual language is unchanged: same cards, borders, type scale, greens and
// sand tones used across the V1 admin.
// ============================================================================
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, BarChart3, CalendarClock, CheckCircle2, ClipboardList, FileText,
  History, Inbox, PauseCircle, RefreshCw, Sparkles, Users,
} from 'lucide-react';
import { v3AdminOperationalOverview } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';

/* ── shells (same visual language as the rest of the V1 admin) ──────────── */

const Card = ({ icon: Icon, title, subtitle, action, children, testId, tone = '#1F4A3A' }) => (
  <div className="rounded-[14px] border border-[#E8E4DB] bg-white overflow-hidden" data-testid={testId}>
    <div className="flex items-start gap-3 px-5 pt-5 pb-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[#F4F2EC]">
        <Icon className="h-4 w-4" style={{ color: tone }} strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-[#1A1A1A] leading-tight">{title}</h2>
        {subtitle && <p className="text-[12px] text-[#8A8A8A] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="border-t border-[#F0EDE5]">{children}</div>
  </div>
);

const Empty = ({ children }) => <p className="px-5 py-6 text-[12px] text-[#8A8A8A]">{children}</p>;

// List bodies scroll inside their card rather than lengthening the page, so
// every card stays reachable without scrolling past the one above it. The cap
// is a max-height, so a short list still renders at its natural height with no
// scrollbar and no dead space.
//
// Scroll chaining is left ON (default `overscroll-behavior: auto`). An earlier
// version set `overscroll-contain`, which trapped the wheel inside the list:
// once its last row was reached the page would not move until the cursor was
// dragged off the card. Chaining hands the leftover scroll back to the page, so
// the wheel keeps working wherever the pointer happens to sit.
//
// Nothing inside a List may own a tooltip: `overflow-y-auto` establishes a
// clipping context and would cut the panel off. Tooltips live in card headers
// and in the non-scrolling strips above these bodies.
const List = ({ children, testId, className = '' }) => (
  <div className={`max-h-[320px] overflow-y-auto ${className}`} data-testid={testId}>
    {children}
  </div>
);

const Meter = ({ pct, tone = '#1F4A3A' }) => (
  <span className="block h-1.5 w-full rounded-full bg-[#F0EDE5] overflow-hidden">
    <span className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: tone }} />
  </span>
);

/* ── tooltip ───────────────────────────────────────────────────────────────
   Hover, focus and tap all open it; Escape closes. Small panel in the card
   idiom, never a modal. Contents come from the metric's own breakdown, so it
   updates whenever the metric does.                                         */
const Tip = ({ items = [], children, className = '', align = 'left' }) => {
  const [open, setOpen] = useState(false);
  const has = items.length > 0;
  if (!has) return <span className={className}>{children}</span>;
  // A real <button> rather than a span with role/tabindex: native focus
  // semantics are what make the keyboard path work, and every handler sits on
  // the one element so hover, focus and tap cannot disagree.
  return (
    <span className={`relative inline-block ${className}`}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        aria-expanded={open}
        className="block w-full text-left cursor-help rounded-[14px] outline-none focus-visible:ring-2 focus-visible:ring-[#1F4A3A]"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-40 top-full mt-1.5 w-max max-w-[240px] rounded-[10px] border border-[#E8E4DB] bg-white p-2.5 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          {items.map((b, i) => (
            <span key={i} className="flex items-baseline justify-between gap-4 py-0.5">
              <span className="text-[11px] text-[#6E6657]">{b.label}</span>
              <span className="text-[11px] font-semibold text-[#1A1A1A]">{b.count}</span>
            </span>
          ))}
        </span>
      )}
    </span>
  );
};

/* ── stat tile ─────────────────────────────────────────────────────────── */
const Stat = ({ label, metric, tone = '#1F4A3A', onClick, testId }) => (
  <Tip items={metric?.breakdown || []} className="w-full">
    <span
      onClick={onClick}
      className={`block rounded-[14px] border border-[#E8E4DB] bg-white px-4 py-5 text-center ${onClick ? 'hover:border-[#B5AF9F] transition-colors' : ''}`}
      data-testid={testId}
    >
      <span className="block text-[30px] font-bold leading-none" style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}>
        {metric?.value ?? 0}
      </span>
      <span className="mt-2 block text-[11px] uppercase tracking-wider text-[#8A8A8A] font-semibold">{label}</span>
    </span>
  </Tip>
);

const HEALTH_TONE = (h) => {
  const k = String(h || '').toLowerCase();
  if (k.includes('risk') || k.includes('block')) return '#B54A37';
  if (k.includes('attention') || k.includes('off')) return '#B07A2B';
  if (k.includes('track') || k.includes('complete')) return '#1F7A72';
  return '#8A8A8A';
};

/* ── page ──────────────────────────────────────────────────────────────── */

const V1AdminOverview = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const lastFetch = useRef(0);
  const started = useRef(false);

  const load = useCallback((quiet = false) => {
    lastFetch.current = Date.now();
    if (quiet) setRefreshing(true); else setLoading(true);
    setError(null);
    return v3AdminOperationalOverview()
      .then((payload) => { setData(payload); })
      .catch(() => { if (!quiet) setError('Could not load the overview.'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  // Revalidate when the admin comes back to the tab, so a stage change made in
  // another tab (or on another page) is reflected without polling. Throttled so
  // flicking between windows cannot spam the API.
  useEffect(() => {
    const revalidate = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastFetch.current < 15000) return;
      load(true);
    };
    window.addEventListener('focus', revalidate);
    document.addEventListener('visibilitychange', revalidate);
    return () => {
      window.removeEventListener('focus', revalidate);
      document.removeEventListener('visibilitychange', revalidate);
    };
  }, [load]);

  if (loading) {
    return (
      <div data-testid="v1-admin-overview" className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#1F4A3A] border-t-transparent animate-spin" />
        <p className="text-[12px] text-[#8A8A8A]">Loading overview…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div data-testid="v1-admin-overview" className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-[13px] text-[#B54A37]">{error || 'Could not load the overview.'}</p>
        <button onClick={() => load()} className="text-[11px] text-[#1F4A3A] underline underline-offset-2">Try again</button>
      </div>
    );
  }

  const { portfolio, pipeline, status, projects, projects_total: projectsTotal, workload,
          documents, pending_items: pendingItems, deadlines, engagement, activity,
          next_up: nextUp, inactive_days: inactiveDays } = data;

  const go = (path) => navigate(adminRoute(path));
  const openCase = (id) => id && go(`/business-cases/${id}`);
  const maxPipeline = Math.max(1, ...pipeline.map((s) => s.count));
  const noData = portfolio.active_brands.value === 0 && projectsTotal === 0 && portfolio.completed_projects.value === 0;

  if (noData) {
    return (
      <div data-testid="v1-admin-overview">
        <h1 className="text-[24px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>Overview</h1>
        <p className="text-[13px] text-[#6E6657] mt-1 mb-5">Nothing to report yet.</p>
        <Card icon={Sparkles} title="No brands or projects" subtitle="Add a brand or import the CRM workbook to start tracking." testId="overview-empty">
          <div className="px-5 py-6 flex flex-wrap gap-2">
            <button onClick={() => go('/crm-brands')} className="v3-btn-primary text-[12px]">Go to CRM Brands</button>
            <button onClick={() => go('/import-project')} className="v3-btn-secondary text-[12px]">Import a project</button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="v1-admin-overview" className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#1A1A1A] leading-tight" style={{ fontFamily: "'Fraunces', serif" }}>Overview</h1>
          <p className="text-[13px] text-[#6E6657] mt-1">
            Where every brand and project stands right now. Hover any figure to see what it is made of.
          </p>
        </div>
        <button onClick={() => load(true)} className="v3-btn-secondary text-[11px]" data-testid="overview-refresh" disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Portfolio */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3" data-testid="overview-portfolio">
        <Stat label="Active brands" metric={portfolio.active_brands} onClick={() => go('/crm-brands')} testId="overview-stat-active-brands" />
        <Stat label="Active projects" metric={portfolio.active_projects} tone="#2E6FB7" onClick={() => go('/business-cases')} testId="overview-stat-active-projects" />
        <Stat label="Need attention" metric={portfolio.attention} tone="#B07A2B" onClick={() => go('/business-cases')} testId="overview-stat-attention" />
        <Stat label="Pending actions" metric={portfolio.pending} tone="#B54A37" testId="overview-stat-pending" />
        <Stat label="Completed" metric={portfolio.completed_projects} tone="#1F7A72" onClick={() => go('/business-cases')} testId="overview-stat-completed" />
        <Stat label="Paused brands" metric={portfolio.paused_brands} tone="#8A8A8A" onClick={() => go('/crm-brands')} testId="overview-stat-paused" />
      </div>

      {/* Pipeline */}
      <Card icon={BarChart3} title="Pipeline"
        subtitle={`${projectsTotal} active ${projectsTotal === 1 ? 'project' : 'projects'} by workflow stage`}
        testId="overview-pipeline">
        <div className="px-5 py-5 grid gap-4 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" data-testid="overview-pipeline-stages">
          {pipeline.map((s) => (
            <div key={s.key} data-testid={`overview-stage-${s.key}`}>
              <Meter pct={(s.count / maxPipeline) * 100} tone={s.key === 'closed' ? '#B5AF9F' : '#1F4A3A'} />
              <p className="mt-2 text-[12px] font-semibold text-[#1A1A1A] leading-tight">{s.label}</p>
              <p className="text-[11px] text-[#8A8A8A]">{s.count}</p>
            </div>
          ))}
        </div>
        {status.length > 0 && (
          <div className="border-t border-[#F0EDE5] px-5 py-3 flex flex-wrap gap-2" data-testid="overview-status">
            {status.map((s) => (
              <span key={s.key} className="rounded-full border border-[#E8E4DB] bg-[#FBFAF7] px-2.5 py-1 text-[11px]">
                <span style={{ color: HEALTH_TONE(s.key) }}>●</span>{' '}
                <span className="text-[#4F3E2F]">{s.label}</span>{' '}
                <span className="font-semibold text-[#1A1A1A]">{s.count}</span>
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Projects */}
        <div className="xl:col-span-2">
          <Card icon={ClipboardList} title="Projects"
            subtitle="Attention first, then the quietest. Open any row."
            action={projectsTotal > projects.length ? (
              <button onClick={() => go('/business-cases')} className="v3-btn-secondary text-[11px] flex-shrink-0">
                All {projectsTotal}
              </button>
            ) : null}
            testId="overview-projects">
            {projects.length === 0 ? (
              <Empty>No active projects. Everything is closed or nothing has been created yet.</Empty>
            ) : (
              <List testId="overview-projects-list">
                {projects.map((p) => (
                  <button key={p.case_id} onClick={() => openCase(p.case_id)}
                    className="w-full text-left px-5 py-3 border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] transition-colors"
                    data-testid={`overview-project-${p.case_id}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-[#8A8A8A] truncate">{p.brand}</p>
                        <p className="text-[13px] text-[#1A1A1A] truncate">{p.title}</p>
                        {p.next_action && <p className="text-[11px] text-[#6E6657] truncate mt-0.5">Next: {p.next_action}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right w-[132px]">
                        <p className="text-[11px] font-semibold text-[#1F4A3A]">{p.stage_label}</p>
                        <div className="mt-1.5"><Meter pct={p.progress} /></div>
                        <p className="mt-1 text-[10px] text-[#8A8A8A]">
                          {p.needs_attention && <span className="text-[#B07A2B] font-semibold">Needs attention · </span>}
                          {p.rm}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </List>
            )}
          </Card>
        </div>

        {/* What's next */}
        <Card icon={Sparkles} title="What's next" subtitle="Most blocking first" testId="overview-next">
          {nextUp.length === 0 ? (
            <Empty>Nothing outstanding. No unsigned contracts, no snapshots waiting and no quiet brands.</Empty>
          ) : (
            <List testId="overview-next-list">
              {nextUp.map((n, i) => (
                <button key={i} onClick={() => go(n.href)}
                  className="w-full text-left px-5 py-3 border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] transition-colors">
                  <p className="text-[13px] text-[#1A1A1A]">{n.label}</p>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5">{n.detail}</p>
                </button>
              ))}
            </List>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Pending actions */}
        <Card icon={Inbox} title="Pending actions" tone="#B54A37"
          subtitle="Waiting on a decision, a signature or a piece of work" testId="overview-pending">
          {pendingItems.length === 0 ? (
            <Empty>Nothing pending. Every document is approved and every contract is signed.</Empty>
          ) : (
            <List testId="overview-pending-list">
              {pendingItems.map((p, i) => (
                <button key={i} onClick={() => openCase(p.case_id)} disabled={!p.case_id}
                  className={`w-full text-left px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0 ${p.case_id ? 'hover:bg-[#FBFAF7]' : ''}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-[#1A1A1A] truncate">{p.brand}</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] flex-shrink-0">{p.kind}</span>
                  </div>
                  <p className="text-[11px] text-[#6E6657] truncate">{p.label}</p>
                </button>
              ))}
            </List>
          )}
        </Card>

        {/* Deadlines */}
        <Card icon={CalendarClock} title="Deadlines" tone="#B07A2B"
          subtitle="Scheduled meetings — the only dated commitments the CRM holds" testId="overview-deadlines">
          {deadlines.total === 0 ? (
            <Empty>Nothing scheduled. Meetings booked through the CRM appear here.</Empty>
          ) : (
            <>
              <div className="grid grid-cols-5 divide-x divide-[#F0EDE5] border-b border-[#F0EDE5]" data-testid="overview-deadline-buckets">
                {deadlines.buckets.map((b) => (
                  <Tip key={b.key} items={b.items.map((i) => ({ label: `${i.brand} · ${i.when}`, count: '' }))}>
                    <span className="block px-2 py-3 text-center" data-testid={`overview-deadline-${b.key}`}>
                      <span className="block text-[18px] font-bold leading-none"
                        style={{ color: b.key === 'overdue' && b.count ? '#B54A37' : '#1A1A1A', fontFamily: "'JetBrains Mono', monospace" }}>
                        {b.count}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-[#8A8A8A]">{b.label}</span>
                    </span>
                  </Tip>
                ))}
              </div>
              <List testId="overview-deadlines-list">
                {deadlines.buckets.flatMap((b) => b.items.map((i) => ({ ...i, bucket: b.label }))).map((i, idx) => (
                  <button key={idx} onClick={() => openCase(i.case_id)} disabled={!i.case_id}
                    className={`w-full text-left px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0 ${i.case_id ? 'hover:bg-[#FBFAF7]' : ''}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] text-[#1A1A1A] truncate">{i.title}</span>
                      <span className={`text-[11px] flex-shrink-0 ${i.days < 0 ? 'text-[#B54A37]' : 'text-[#6E6657]'}`}>{i.when}</span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] truncate">{i.brand} · {i.bucket}</p>
                  </button>
                ))}
              </List>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Documents */}
        <Card icon={FileText} title="Documents" subtitle="What exists and where each one has got to" testId="overview-documents">
          {documents.length === 0 ? (
            <Empty>No documents generated yet.</Empty>
          ) : (
            <>
              <div className="grid gap-3 px-5 py-2 bg-[#FBFAF7] border-b border-[#F0EDE5]" style={{ gridTemplateColumns: '1fr 58px 52px 62px 62px' }}>
                {['Document', 'Total', 'Draft', 'Sent', 'Approved'].map((h) => (
                  <span key={h} className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">{h}</span>
                ))}
              </div>
              <List testId="overview-documents-list">
              {documents.map((d) => (
                <div key={d.key} className="grid gap-3 items-center px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0"
                  style={{ gridTemplateColumns: '1fr 58px 52px 62px 62px' }}>
                  <span className="text-[12px] text-[#1A1A1A] truncate">{d.label}</span>
                  <span className="text-[12px] font-semibold text-[#1A1A1A]">{d.total}</span>
                  <span className="text-[12px] text-[#6E6657]">{d.generated}</span>
                  <span className="text-[12px] text-[#6E6657]">{d.sent}</span>
                  <span className="text-[12px] text-[#1F7A72]">{d.approved}</span>
                </div>
              ))}
              </List>
            </>
          )}
        </Card>

        {/* Workload */}
        <Card icon={Users} title="Workload" subtitle="Open projects, brands and tasks per manager" testId="overview-workload">
          {workload.length === 0 ? (
            <Empty>No relationship managers on record.</Empty>
          ) : (
            <>
              <div className="grid gap-3 px-5 py-2 bg-[#FBFAF7] border-b border-[#F0EDE5]" style={{ gridTemplateColumns: '1fr 46px 46px 46px 96px' }}>
                {['Manager', 'Proj', 'Brands', 'Tasks', 'Share'].map((h) => (
                  <span key={h} className="text-[10px] uppercase tracking-wider text-[#8A8A8A] font-semibold">{h}</span>
                ))}
              </div>
              <List testId="overview-workload-list">
                {workload.map((w) => (
                  <div key={w.rm_id || 'unassigned'} className="grid gap-3 items-center px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0"
                    style={{ gridTemplateColumns: '1fr 46px 46px 46px 96px' }}>
                    <span className={`text-[12px] truncate ${w.unassigned ? 'text-[#B07A2B] font-semibold' : 'text-[#1A1A1A]'}`}>{w.name}</span>
                    <span className="text-[12px] text-[#4F3E2F]">{w.cases}</span>
                    <span className="text-[12px] text-[#4F3E2F]">{w.brands}</span>
                    <span className="text-[12px] text-[#4F3E2F]">{w.tasks}</span>
                    <span className="flex items-center gap-2">
                      <Meter pct={w.share} tone={w.share >= 55 ? '#C0703A' : '#1F4A3A'} />
                      <span className="text-[11px] text-[#6E6657] w-8 text-right flex-shrink-0">{w.share}%</span>
                    </span>
                  </div>
                ))}
              </List>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Engagement */}
        <Card icon={PauseCircle} title="Quiet brands" tone="#8A8A8A"
          subtitle={`No recorded activity in over ${inactiveDays} days`} testId="overview-engagement">
          {engagement.inactive.length === 0 ? (
            <Empty>Every brand has been touched in the last {inactiveDays} days.</Empty>
          ) : (
            <List testId="overview-engagement-list">
              {engagement.inactive.map((b) => (
                <button key={b.brand_id} onClick={() => go(`/crm-brands/${b.brand_id}`)}
                  className="w-full text-left px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] transition-colors">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-[#1A1A1A] truncate">{b.brand}</span>
                    <span className="text-[11px] text-[#6E6657] flex-shrink-0">{b.days}d quiet</span>
                  </div>
                </button>
              ))}
              {engagement.inactive_total > engagement.inactive.length && (
                <p className="px-5 py-2 text-[11px] text-[#8A8A8A]">
                  and {engagement.inactive_total - engagement.inactive.length} more of {engagement.tracked_brands} brands.
                </p>
              )}
            </List>
          )}
        </Card>

        {/* Recent activity */}
        <Card icon={History} title="Recent activity" subtitle="Documents, contracts and projects, newest first" testId="overview-activity">
          {activity.length === 0 ? (
            <Empty>No dated records yet.</Empty>
          ) : (
            <List testId="overview-activity-list">
              {activity.map((a, i) => (
                <button key={i} onClick={() => openCase(a.case_id)} disabled={!a.case_id}
                  className={`w-full text-left px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0 ${a.case_id ? 'hover:bg-[#FBFAF7]' : ''}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-[#1A1A1A] truncate">{a.what}</span>
                    <span className="text-[11px] text-[#8A8A8A] flex-shrink-0">{a.date}</span>
                  </div>
                  <p className="text-[11px] text-[#6E6657] truncate">{a.subject}</p>
                </button>
              ))}
            </List>
          )}
        </Card>
      </div>
    </div>
  );
};

export default V1AdminOverview;
