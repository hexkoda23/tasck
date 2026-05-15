// Admin Business Cases — the v3.2 spec primitive (live from /api/v3)
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3ListBusinessCases, v3AdminOverview } from '../../../lib/v3api';
import { formatNairaV3, v3Stages } from '../../../lib/v3data';
import { Sparkles, Filter, ArrowRight, AlertOctagon } from 'lucide-react';

const stageMeta = {
  connect: { label: 'Connect', color: '#9B9380' },
  frame: { label: 'Frame', color: '#C49B5F' },
  plan: { label: 'Plan', color: '#1F4A3A' },
  deliver: { label: 'Deliver', color: '#567B3F' },
  closed: { label: 'Closed', color: '#B54A37' },
};

const healthBadge = (h) => {
  const map = {
    'on-track': { bg: '#DDE7E2', fg: '#1F4A3A', label: 'On track' },
    'near-closure': { bg: '#F2EAD8', fg: '#7A5F23', label: 'Near closure' },
    new: { bg: '#EEEAE0', fg: '#6E6657', label: 'New' },
    'at-risk': { bg: '#F5D9D2', fg: '#B54A37', label: 'At risk' },
  };
  return map[h] || map.new;
};

const V3AdminBusinessCases = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [overview, setOverview] = useState(null);
  const [stage, setStage] = useState('all');
  const [track, setTrack] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([v3ListBusinessCases(), v3AdminOverview()])
      .then(([cs, ov]) => {
        setCases(cs);
        setOverview(ov);
      })
      .catch((e) => setError(e.message));
  }, []);

  const filtered = useMemo(
    () =>
      cases.filter(
        (c) =>
          (stage === 'all' || c.stage === stage) &&
          (track === 'all' || c.engagement_track === track)
      ),
    [cases, stage, track]
  );

  return (
    <div data-testid="v3-admin-business-cases">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">Admin Control Centre</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Business Cases
          </h1>
          <p className="text-[#8A8A8A] text-sm flex items-center gap-2">
            One Business Case = one document chain across Connect → Frame → Plan → Deliver.
            <span className="text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]">
              <Sparkles className="w-3 h-3" /> live
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="v3-card p-4 mb-6 flex items-center gap-3 border-[#F5D9D2]" data-testid="bc-error">
          <AlertOctagon className="w-4 h-4 text-[#B54A37]" />
          <span className="text-[13px] text-[#B54A37]">Backend unreachable: {error}</span>
        </div>
      )}

      {/* Overview metrics */}
      {overview && (
        <div className="grid grid-cols-4 gap-4 mb-8" data-testid="bc-metrics">
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Total Business Cases</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {overview.business_cases_total}
            </p>
          </div>
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Paid Strategy</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {overview.paid_count}
            </p>
            <p className="text-[11px] text-[#1F4A3A] mt-1">{formatNairaV3(overview.paid_total_value)} pipeline</p>
          </div>
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Grant</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {overview.grant_count}
            </p>
            <p className="text-[11px] text-[#7A5F23] mt-1">{formatNairaV3(overview.grant_total_value)} pipeline</p>
          </div>
          <div className="v3-card p-5">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">By Stage</p>
            <div className="space-y-1">
              {v3Stages.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-[11px]">
                  <span className="text-[#6E6657]">{s.label}</span>
                  <span
                    className="font-semibold"
                    style={{ fontFamily: "'JetBrains Mono', monospace", color: s.color }}
                  >
                    {overview.by_stage[s.key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-[#8A8A8A]" />
        <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="bc-stage-filter">
          {['all', 'connect', 'frame', 'plan', 'deliver', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStage(s)}
              className={`text-[11px] px-3 py-1 rounded transition-colors capitalize ${stage === s ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`bc-stage-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="bc-track-filter">
          {[
            { k: 'all', label: 'All tracks' },
            { k: 'paid', label: 'Paid' },
            { k: 'grant', label: 'Grant' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTrack(t.k)}
              className={`text-[11px] px-3 py-1 rounded transition-colors ${track === t.k ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`bc-track-${t.k}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((c) => {
          const sm = stageMeta[c.stage] || stageMeta.connect;
          const hb = healthBadge(c.health);
          return (
            <button
              key={c.id}
              onClick={() => navigate(`/v3/admin/business-cases/${c.id}`)}
              className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors"
              data-testid={`bc-row-${c.id}`}
            >
              <div
                className="w-1 h-12 rounded-full flex-shrink-0"
                style={{ background: sm.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium text-[#1A1A1A]">{c.title}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: `${sm.color}1A`, color: sm.color }}
                  >
                    {sm.label}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{
                      background: c.engagement_track === 'grant' ? '#F2EAD8' : '#DDE7E2',
                      color: c.engagement_track === 'grant' ? '#7A5F23' : '#1F4A3A',
                    }}
                  >
                    {c.engagement_track === 'grant' ? 'Grant' : 'Paid Strategy'}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: hb.bg, color: hb.fg }}>
                    {hb.label}
                  </span>
                </div>
                <p className="text-[12px] text-[#8A8A8A] mt-1">{c.next_action}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p
                  className="text-[12px] font-semibold text-[#1F4A3A]"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {formatNairaV3(c.estimated_value)}
                </p>
                <p className="text-[10px] text-[#8A8A8A] mt-0.5">{c.days_in_stage}d in stage</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="v3-card p-10 text-center text-[#8A8A8A] text-[13px]">No business cases match these filters.</div>
        )}
      </div>
    </div>
  );
};

export default V3AdminBusinessCases;
