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
  AlertTriangle, BarChart3, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, FileText,
  History, PauseCircle, RefreshCw, Sparkles, Users,
} from 'lucide-react';
import { v3AdminOperationalOverview } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { useClickOutside } from '../../hooks/useClickOutside';

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
  // Hover and focus already close this on desktop, but a tap has no pointer
  // to move away - so opened by touch it stayed up with no way to dismiss it
  // short of tapping the same tile again. Closing on a press outside gives it
  // the same dismissal the rest of the popups have.
  const tipRef = useClickOutside(open, () => setOpen(false));
  const has = items.length > 0;
  if (!has) return <span className={className}>{children}</span>;
  // A real <button> rather than a span with role/tabindex: native focus
  // semantics are what make the keyboard path work, and every handler sits on
  // the one element so hover, focus and tap cannot disagree.
  return (
    <span ref={tipRef} className={`relative inline-block ${className}`}>
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
// A tile showing 0 has nothing behind it, so it is inert: no link, no hover
// state and no tooltip.
const Stat = ({ label, metric, tone = '#1F4A3A', onClick, testId }) => {
  const empty = !metric?.value;
  const open = empty ? undefined : onClick;
  return (
    <Tip items={empty ? [] : (metric?.breakdown || [])} className="w-full">
      <span
        onClick={open}
        className={`block rounded-[14px] border border-[#E8E4DB] bg-white px-4 py-5 text-center ${open ? 'cursor-pointer hover:border-[#B5AF9F] transition-colors' : ''}`}
        data-testid={testId}
        data-inert={empty ? 'true' : undefined}
      >
        <span className="block text-[30px] font-bold leading-none" style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}>
          {metric?.value ?? 0}
        </span>
        <span className="mt-2 block text-[11px] uppercase tracking-wider text-[#8A8A8A] font-semibold">{label}</span>
      </span>
    </Tip>
  );
};

/* ── total projects tile ───────────────────────────────────────────────────
   Every project on the system, and what share of them sits at each stage
   from Connect through to Closed. Read off the same pipeline counts as the
   Pipeline card, so the two cannot disagree. Display only.               */
const TotalProjects = ({ pipeline = [] }) => {
  const total = pipeline.reduce((sum, s) => sum + (s.count || 0), 0);
  return (
    <div className="col-span-2 md:col-span-3 xl:col-span-6 rounded-[14px] border border-[#E8E4DB] bg-white px-4 py-4" data-testid="overview-stat-total-projects">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="text-center md:w-[150px] md:flex-shrink-0">
          <span className="block text-[30px] font-bold leading-none text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {total}
          </span>
          <span className="mt-2 block text-[11px] uppercase tracking-wider text-[#8A8A8A] font-semibold">Total projects</span>
        </div>
        {total > 0 && (
          <div className="min-w-0 flex-1 grid gap-3 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" data-testid="overview-total-projects-stages">
            {pipeline.map((s) => {
              const pct = Math.round(((s.count || 0) / total) * 100);
              return (
                <div key={s.key} data-testid={`overview-total-stage-${s.key}`}>
                  <Meter pct={pct} tone={s.key === 'closed' ? '#1F7A72' : '#1F4A3A'} />
                  <p className="mt-1.5 text-[11px] font-semibold text-[#1A1A1A] leading-tight">{s.label}</p>
                  <p className="text-[11px] text-[#8A8A8A]">{pct}% · {s.count}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ── documents card body ───────────────────────────────────────────────────
   Each document type is a row with its counts; opening a row lists that
   type's documents, and each of those opens the exact document.          */
const DocumentRows = ({ documents, go }) => {
  const [openKey, setOpenKey] = useState('');
  const cols = '1fr 58px 52px 62px 62px';
  return (
    <List testId="overview-documents-list">
      {documents.map((d) => {
        const items = Array.isArray(d.items) ? d.items : [];
        const isOpen = openKey === d.key;
        return (
          <div key={d.key} className="border-b border-[#F4F2EC] last:border-b-0">
            <button type="button" onClick={() => setOpenKey(isOpen ? '' : d.key)} disabled={!items.length}
              aria-expanded={isOpen}
              className={`w-full text-left grid gap-3 items-center px-5 py-2.5 ${items.length ? 'hover:bg-[#FBFAF7] transition-colors' : ''}`}
              style={{ gridTemplateColumns: cols }} data-testid={`overview-document-${d.key}`}>
              <span className="text-[12px] text-[#1A1A1A] truncate">
                <ChevronRight className={`inline h-3 w-3 mr-1 text-[#8A8A8A] transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                {d.label}
              </span>
              <span className="text-[12px] font-semibold text-[#1A1A1A]">{d.total}</span>
              <span className="text-[12px] text-[#6E6657]">{d.generated}</span>
              <span className="text-[12px] text-[#6E6657]">{d.sent}</span>
              <span className="text-[12px] text-[#1F7A72]">{d.approved}</span>
            </button>
            {isOpen && (
              <div className="bg-[#FBFAF7]" data-testid={`overview-document-items-${d.key}`}>
                {items.map((item) => (
                  <button key={item.id || item.href} type="button" onClick={() => go(item.href)} disabled={!item.href}
                    className="w-full text-left pl-9 pr-5 py-2 border-t border-[#F0EDE5] hover:bg-[#F4F2EC] transition-colors"
                    data-testid={`overview-document-item-${item.id}`}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] text-[#1A1A1A] truncate">{item.brand}</span>
                      <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] flex-shrink-0">{item.state}</span>
                    </div>
                    {item.project && <p className="text-[11px] text-[#6E6657] truncate">{item.project}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </List>
  );
};

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
  // Which tile's list is open under the tiles ('pending' | 'active' | ''):
  // a tile with more than one item opens a list of them instead of a page.
  const [openList, setOpenList] = useState('');
  const pendingOpen = openList === 'pending';
  const activeOpen = openList === 'active';
  const toggleList = (key) => setOpenList((current) => (current === key ? '' : key));

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

  const { portfolio, pipeline, status, projects_total: projectsTotal, workload,
          documents, deadlines, engagement, activity,
          pending_items: pendingItems = [],
          inactive_days: inactiveDays } = data;

  const go = (path) => navigate(adminRoute(path));
  const openCase = (id) => id && go(`/business-cases/${id}`);
  // One pending action opens its page directly; several open a short list of
  // them under the tiles, each linking to its own page.
  const pendingLinks = pendingItems.filter((p) => p.href);
  const openPending = pendingLinks.length === 1
    ? () => go(pendingLinks[0].href)
    : pendingLinks.length > 1 ? () => toggleList('pending') : undefined;
  // Active projects: the same rule - one project opens straight at the page
  // it is on now, several open a list of them.
  const activeLinks = (portfolio.active_projects?.items || []).filter((p) => p.href);
  const openActive = activeLinks.length === 1
    ? () => go(activeLinks[0].href)
    : activeLinks.length > 1 ? () => toggleList('active') : undefined;
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
        <Stat label="Active projects" metric={portfolio.active_projects} tone="#2E6FB7" onClick={openActive} testId="overview-stat-active-projects" />
        <Stat label="Need attention" metric={portfolio.attention} tone="#B07A2B" onClick={() => go('/business-cases')} testId="overview-stat-attention" />
        <Stat label="Pending actions" metric={portfolio.pending} tone="#B54A37" onClick={openPending} testId="overview-stat-pending" />
        <Stat label="Completed" metric={portfolio.completed_projects} tone="#1F7A72" onClick={() => go('/business-cases')} testId="overview-stat-completed" />
        <Stat label="Paused brands" metric={portfolio.paused_brands} tone="#8A8A8A" onClick={() => go('/crm-brands')} testId="overview-stat-paused" />
        <TotalProjects pipeline={pipeline} />
      </div>

      {activeOpen && activeLinks.length > 1 && (
        <Card icon={ClipboardList} title={`Active projects (${activeLinks.length})`} tone="#2E6FB7"
          subtitle="Every project from the business call onwards that is not closed. Open one to go to it."
          action={(
            <button type="button" onClick={() => setOpenList('')} className="v3-btn-secondary text-[11px] flex-shrink-0" data-testid="overview-active-close">
              Close
            </button>
          )}
          testId="overview-active-links">
          <List>
            {activeLinks.map((p, i) => (
              <button key={p.case_id || i} type="button" onClick={() => go(p.href)}
                className="w-full text-left px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] transition-colors"
                data-testid={`overview-active-link-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] text-[#1A1A1A] truncate">{p.brand}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] flex-shrink-0">{p.stage}</span>
                </div>
                {p.title && <p className="text-[11px] text-[#6E6657] truncate">{p.title}</p>}
              </button>
            ))}
          </List>
        </Card>
      )}

      {pendingOpen && pendingLinks.length > 1 && (
        <Card icon={AlertTriangle} title={`Pending actions (${pendingLinks.length})`} tone="#B54A37"
          subtitle="Open one to go to the page where it is waiting"
          action={(
            <button type="button" onClick={() => setOpenList('')} className="v3-btn-secondary text-[11px] flex-shrink-0" data-testid="overview-pending-close">
              Close
            </button>
          )}
          testId="overview-pending-links">
          <List>
            {pendingLinks.map((p, i) => (
              <button key={i} type="button" onClick={() => go(p.href)}
                className="w-full text-left px-5 py-2.5 border-b border-[#F4F2EC] last:border-b-0 hover:bg-[#FBFAF7] transition-colors"
                data-testid={`overview-pending-link-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] text-[#1A1A1A] truncate">{p.brand}</span>
                  <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] flex-shrink-0">{p.kind}</span>
                </div>
                {/* No business-case title here: it reads like a phase ("... -
                    Business Call Connect") and rarely matches the phase shown
                    on the right, which is the one that counts. */}
                <p className="text-[11px] text-[#6E6657] truncate">{p.label}</p>
              </button>
            ))}
          </List>
        </Card>
      )}

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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              <DocumentRows documents={documents} go={go} />
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
        <div className="xl:col-span-2">
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
    </div>
  );
};

export default V1AdminOverview;
