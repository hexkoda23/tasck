import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Stages, formatNairaV3 } from '../../../lib/v3data';
import { v3AdminOverview } from '../../../lib/v3api';
import { adminRoute } from '../../../lib/v3AdminRouteBase';
import { FolderOpen, GitBranch, TrendingUp, Users, Clock } from 'lucide-react';

const V3AdminOverview = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    v3AdminOverview()
      .then(data => {
        setOverview(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load admin overview:', err);
        setError('Could not load overview data.');
        setLoading(false);
      });
  }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div data-testid="v3-admin-overview" className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-[#1F4A3A] border-t-transparent animate-spin" />
        <p className="text-[12px] text-[#8A8A8A]">Loading overview…</p>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div data-testid="v3-admin-overview" className="flex flex-col items-center justify-center py-24 gap-2">
        <p className="text-[13px] text-[#B54A37]">{error}</p>
        <button
          onClick={() => { setLoading(true); setError(null); v3AdminOverview().then(d => { setOverview(d); setLoading(false); }).catch(() => { setError('Could not load overview data.'); setLoading(false); }); }}
          className="text-[11px] text-[#1F4A3A] underline underline-offset-2"
        >
          Try again
        </button>
      </div>
    );
  }

  /* ── Empty state ── */
  const isEmpty = !overview || overview.business_cases_total === 0;
  if (isEmpty) {
    return (
      <div data-testid="v3-admin-overview">
        <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Admin Control Centre</p>
        <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Today</h1>
        <p className="text-[#8A8A8A] text-sm mb-8">No projects yet. Create a business case to get started.</p>
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <FolderOpen className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">Nothing here yet</p>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const totalValue = (overview.paid_total_value || 0) + (overview.grant_total_value || 0);
  const byStage = overview.by_stage || {};

  const statCards = [
    {
      label: 'Total Projects',
      value: overview.business_cases_total ?? 0,
      icon: FolderOpen,
      color: '#1F4A3A',
    },
    {
      label: 'Pipeline Value',
      value: formatNairaV3(totalValue),
      icon: TrendingUp,
      color: '#C49B5F',
    },
    {
      label: 'Paid Deals',
      value: overview.paid_count ?? 0,
      icon: Users,
      color: '#567B3F',
    },
    {
      label: 'Grant Projects',
      value: overview.grant_count ?? 0,
      icon: Clock,
      color: '#9B9380',
    },
  ];

  /* ── Stage distribution from API by_stage ── */
  const stageDistribution = v3Stages.map(s => ({
    ...s,
    count: byStage[s.key]?.count ?? 0,
    value: byStage[s.key]?.value ?? 0,
  }));

  return (
    <div data-testid="v3-admin-overview">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Admin Control Centre</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Today</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Platform snapshot.</p>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="v3-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: s.color }} strokeWidth={1.5} />
                <span className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">{s.label}</span>
              </div>
              <p
                className="text-[#1A1A1A] text-xl font-semibold"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Value breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Paid Total Value</p>
          <p
            className="text-[#1A1A1A] text-xl font-semibold"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatNairaV3(overview.paid_total_value ?? 0)}
          </p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Grant Total Value</p>
          <p
            className="text-[#1A1A1A] text-xl font-semibold"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {formatNairaV3(overview.grant_total_value ?? 0)}
          </p>
        </div>
      </div>

      {/* Pipeline at a glance */}
      <div className="v3-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
          <h2 className="text-[13px] font-semibold text-[#1A1A1A]">Pipeline</h2>
        </div>
        <div className="flex gap-3">
          {stageDistribution.map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => navigate(adminRoute(`/business-cases?stage=${s.key}`))}
              className="flex-1 p-3 rounded-lg text-left transition-transform hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1F4A3A]/30"
              style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}
              data-testid={`overview-pipeline-${s.key}`}
              aria-label={`View ${s.label} business cases`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[11px] font-medium" style={{ color: s.color }}>{s.label}</span>
              </div>
              <p
                className="text-lg font-semibold text-[#1A1A1A]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {s.count}
              </p>
              <p
                className="text-[10px] text-[#8A8A8A]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(s.value)}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Needs attention + Recent activity - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8" style={{ alignItems: 'start' }}>
        {/* Needs attention */}
        <div data-testid="overview-needs-attention">
          <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Needs your attention</h2>
          {(overview.needs_attention || []).length === 0 ? (
            <div className="v3-card p-6 text-center" style={{ background: '#F4F2EC' }}>
              <p className="text-[12px] text-[#8A8A8A]">Everything is on track.</p>
            </div>
          ) : (
            <div className="space-y-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(overview.needs_attention || []).slice(0, 10).map((item, i) => (
                <div key={`${item.id}-${i}`} className="v3-card p-4" data-testid={`overview-attention-${i}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{item.title || 'Untitled'}</p>
                      <p className="text-[11px] text-[#6E6657] mt-0.5">{item.message}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#F2EAD8] text-[#7A5F23] flex-shrink-0">
                      {(item.type || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div data-testid="overview-recent-activity">
          <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Recent activity</h2>
          {(overview.latest_activity || []).length === 0 ? (
            <div className="v3-card p-6 text-center" style={{ background: '#F4F2EC' }}>
              <p className="text-[12px] text-[#8A8A8A]">No recent activity. Run the CRM workbook import to populate data.</p>
            </div>
          ) : (
            <div className="space-y-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(overview.latest_activity || []).slice(0, 10).map((item, i) => (
                <div key={i} className="v3-card p-3 flex items-center justify-between gap-3" data-testid={`overview-activity-${i}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A] flex-shrink-0">
                      {(item.type || '').replace(/_/g, ' ')}
                    </span>
                    <span className="text-[12px] text-[#1A1A1A] truncate">{item.title || 'Untitled'}</span>
                  </div>
                  <span className="text-[10px] text-[#8A8A8A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3AdminOverview;
