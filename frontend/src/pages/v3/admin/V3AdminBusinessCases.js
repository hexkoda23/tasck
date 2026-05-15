// Admin Business Cases — the v3.2 spec primitive (live from /api/v3)
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  v3ListBusinessCases, v3AdminOverview, v3GetBrands, v3GetCreators,
  v3CreateBusinessCase, v3ResetDemo,
} from '../../../lib/v3api';
import { formatNairaV3, v3Stages } from '../../../lib/v3data';
import V3Modal from '../../../components/v3/V3Modal';
import { Sparkles, Filter, ArrowRight, AlertOctagon, Plus, RotateCcw } from 'lucide-react';

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

  // New BC modal
  const [newOpen, setNewOpen] = useState(false);
  const [brands, setBrands] = useState([]);
  const [creators, setCreators] = useState([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    brand_id: '', creator_id: '', title: '', engagement_track: 'paid',
    estimated_value: 100000000, rm_id: 'rm-temi',
    connect_status: 'in_discovery', stated_intent: '', source: 'Inbound enquiry',
  });

  const reload = () =>
    Promise.all([v3ListBusinessCases(), v3AdminOverview()]).then(([cs, ov]) => {
      setCases(cs);
      setOverview(ov);
    });

  useEffect(() => {
    reload().catch((e) => setError(e.message));
  }, []);

  const openNew = async () => {
    const [b, c] = await Promise.all([v3GetBrands(), v3GetCreators()]);
    setBrands(b);
    setCreators(c);
    setForm((f) => ({ ...f, brand_id: b[0]?.id || '', creator_id: '' }));
    setNewOpen(true);
  };

  const submitNew = async () => {
    if (!form.brand_id || !form.title) return;
    setBusy(true);
    try {
      const created = await v3CreateBusinessCase({
        ...form,
        creator_id: form.creator_id || null,
        estimated_value: Number(form.estimated_value) || 0,
      });
      setNewOpen(false);
      navigate(`/v3/admin/business-cases/${created.id}`);
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setBusy(false);
    }
  };

  const resetDemo = async () => {
    if (!window.confirm('Reset all demo data? This will wipe and reseed the v3 collections.')) return;
    setBusy(true);
    try {
      await v3ResetDemo();
      await reload();
    } finally {
      setBusy(false);
    }
  };

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
    <>
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
        <div className="flex items-center gap-2">
          <button onClick={resetDemo} disabled={busy} className="v3-btn-secondary" data-testid="bc-reset-demo" title="Reset all v3 demo data to seeded state">
            <RotateCcw className="w-3.5 h-3.5" /> Reset demo
          </button>
          <button onClick={openNew} className="v3-btn-primary" data-testid="bc-new">
            <Plus className="w-4 h-4" /> New Business Case
          </button>
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

    <V3Modal
      open={newOpen}
      onClose={() => setNewOpen(false)}
      title="New Business Case"
      subtitle="Spin up the document chain. Lands in Connect; advance through the stages from the detail page."
      testid="new-bc-modal"
      wide
      footer={
        <>
          <button onClick={() => setNewOpen(false)} className="v3-btn-secondary" data-testid="new-bc-cancel">Cancel</button>
          <button onClick={submitNew} disabled={busy || !form.brand_id || !form.title} className="v3-btn-primary" data-testid="new-bc-submit">
            {busy ? 'Creating…' : 'Create Business Case'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Star Originals — A Lagos After-Dark Anthology"
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-title"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Brand</label>
          <select
            value={form.brand_id}
            onChange={(e) => {
              const brand = brands.find((b) => b.id === e.target.value);
              setForm({ ...form, brand_id: e.target.value, engagement_track: brand?.engagement_track_default || 'paid' });
            }}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-brand"
          >
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.company} ({b.engagement_track_default})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Creator (optional)</label>
          <select
            value={form.creator_id}
            onChange={(e) => setForm({ ...form, creator_id: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-creator"
          >
            <option value="">— Pick later during Plan —</option>
            {creators.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Engagement track</label>
          <div className="flex gap-2">
            {['paid', 'grant'].map((t) => (
              <button
                key={t}
                onClick={() => setForm({ ...form, engagement_track: t })}
                className={`flex-1 px-3 py-2 text-[12px] rounded-lg border transition-colors ${form.engagement_track === t ? 'bg-[#1F4A3A] text-white border-[#1F4A3A]' : 'bg-white border-[#E8E4DB] text-[#6E6657]'}`}
                data-testid={`new-bc-track-${t}`}
              >
                {t === 'paid' ? 'Paid Strategy' : 'Grant'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Estimated value (₦)</label>
          <input
            type="number"
            value={form.estimated_value}
            onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-value"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Relationship Manager</label>
          <select
            value={form.rm_id}
            onChange={(e) => setForm({ ...form, rm_id: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-rm"
          >
            <option value="rm-temi">Temi Bakare</option>
            <option value="rm-adaeze">Adaeze Obi</option>
            <option value="rm-tope">Tope Martins</option>
            <option value="rm-femi">Femi Oladipo</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Connect status at intake</label>
          <select
            value={form.connect_status}
            onChange={(e) => setForm({ ...form, connect_status: e.target.value })}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-connect-status"
          >
            <option value="new_lead">New lead</option>
            <option value="in_discovery">In discovery</option>
            <option value="qualified_to_frame">Qualified to Frame</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Stated intent (from brand)</label>
          <textarea
            value={form.stated_intent}
            onChange={(e) => setForm({ ...form, stated_intent: e.target.value })}
            placeholder="A one-paragraph version of what the brand told you they want."
            rows={3}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
            data-testid="new-bc-intent"
          />
        </div>
      </div>
    </V3Modal>
    </>
  );
};

export default V3AdminBusinessCases;
