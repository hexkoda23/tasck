import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3ListProjects, v3GetBrands, v3GetCreators, v3ListRelationshipManagers } from '../../../lib/v3api';
import { formatValueV3 } from '../../../lib/v3data';
import { FolderOpen, Briefcase, User, Tag } from 'lucide-react';

const stageMeta = {
  connect: { label: 'Connect', color: '#9B9380' },
  frame: { label: 'Frame', color: '#C49B5F' },
  plan: { label: 'Plan', color: '#1F4A3A' },
  deliver: { label: 'Deliver', color: '#567B3F' },
  closed: { label: 'Closed', color: '#B54A37' },
};

const sourceMeta = {
  brand_project: { label: 'CRM Framing', bg: '#DDE7E2', fg: '#1F4A3A', icon: Briefcase },
  creator_project: { label: 'Super Creative', bg: '#F2EAD8', fg: '#7A5F23', icon: User },
  business_case: { label: 'Business Case', bg: '#EEEAE0', fg: '#6E6657', icon: Tag },
};

const STAGE_FILTERS = ['all', 'connect', 'frame', 'plan', 'deliver', 'closed'];
const SOURCE_FILTERS = ['all', 'brand_project', 'creator_project'];

const V3AdminProjects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [brandsById, setBrandsById] = useState({});
  const [creatorsById, setCreatorsById] = useState({});
  const [rmsById, setRMsById] = useState({});
  const [stageFilter, setStageFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [loaded, setLoaded] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    v3ListProjects()
      .then((p) => setProjects(Array.isArray(p) ? p : []))
      .catch(() => setProjects([]))
      .finally(() => setLoaded(true));
    v3GetBrands().then((bs) => {
      const m = {};
      (Array.isArray(bs) ? bs : []).forEach((b) => { m[b.id] = b; });
      setBrandsById(m);
    }).catch(() => {});
    v3GetCreators().then((cs) => {
      const m = {};
      (Array.isArray(cs) ? cs : []).forEach((c) => { m[c.id] = c; });
      setCreatorsById(m);
    }).catch(() => {});
    v3ListRelationshipManagers().then((rs) => {
      const m = {};
      (Array.isArray(rs) ? rs : []).forEach((r) => { m[r.id] = r; });
      setRMsById(m);
    }).catch(() => {});
  }, []);

  const stageCounts = useMemo(() => {
    const c = { all: projects.length, connect: 0, frame: 0, plan: 0, deliver: 0, closed: 0 };
    projects.forEach((p) => { if (c[p.stage] != null) c[p.stage]++; });
    return c;
  }, [projects]);

  const sourceCounts = useMemo(() => {
    const c = { all: projects.length, brand_project: 0, creator_project: 0 };
    projects.forEach((p) => { const s = p.source_type || 'brand_project'; if (c[s] != null) c[s]++; });
    return c;
  }, [projects]);

  const totalValue = useMemo(() => projects.reduce((sum, p) => sum + (p.estimated_value || p.value_amount || 0), 0), [projects]);

  const filtered = useMemo(() => projects.filter((p) => {
    const stage = p.stage || 'connect';
    const source = p.source_type || 'brand_project';
    if (stageFilter !== 'all' && stage !== stageFilter) return false;
    if (sourceFilter !== 'all' && source !== sourceFilter) return false;
    return true;
  }), [projects, stageFilter, sourceFilter]);

  return (
    <div data-testid="v3-admin-projects">
      <div className="mb-6">
        <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">ADMIN CONTROL CENTRE</p>
        <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Projects</h1>
        <p className="text-[#8A8A8A] text-sm">CRM Framing, Super Creatives Framing, and Business Case projects.</p>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-3 mb-6" data-testid="projects-stats">
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Total projects</p>
          <p className="text-[22px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{projects.length}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Total value</p>
          <p className="text-[22px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatValueV3({ estimated_value: totalValue })}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">CRM Framing</p>
          <p className="text-[22px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sourceCounts.brand_project}</p>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Super Creatives</p>
          <p className="text-[22px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{sourceCounts.creator_project}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-2 flex-wrap" data-testid="projects-stage-filter">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mr-1">Stage</span>
          {STAGE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors capitalize ${
                stageFilter === s
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#5C5C5C] border-[#E8E4DB] hover:border-[#D4CDBF]'
              }`}
              data-testid={`projects-stage-${s}`}
            >
              {s}
              <span className="ml-1 text-[10px] opacity-60">({stageCounts[s] ?? 0})</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap" data-testid="projects-source-filter">
          <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mr-1">Source</span>
          {SOURCE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setSourceFilter(s)}
              className={`text-[12px] px-3 py-1.5 rounded-full border transition-colors ${
                sourceFilter === s
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                  : 'bg-white text-[#5C5C5C] border-[#E8E4DB] hover:border-[#D4CDBF]'
              }`}
              data-testid={`projects-source-${s}`}
            >
              {s === 'all' ? 'All' : (sourceMeta[s]?.label || s)}
              <span className="ml-1 text-[10px] opacity-60">({sourceCounts[s] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      {!loaded ? (
        <div className="v3-card p-10 text-center text-[#8A8A8A] text-[13px]">Loading projects…</div>
      ) : filtered.length === 0 ? (
        <div className="v3-card p-10 text-center text-[#8A8A8A] text-[13px]" data-testid="projects-empty">
          <FolderOpen className="w-6 h-6 mx-auto mb-2 text-[#C4BFB1]" />
          {projects.length === 0
            ? 'No projects found. Run the CRM workbook import from Admin → Settings.'
            : 'No projects match these filters.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="projects-list">
          {filtered.map((p) => {
            const stage = p.stage || 'connect';
            const sm = stageMeta[stage] || stageMeta.connect;
            const srcKey = p.source_type || 'brand_project';
            const sp = sourceMeta[srcKey] || sourceMeta.brand_project;
            const SrcIcon = sp.icon;
            const brand = p.brand_id ? brandsById[p.brand_id] : null;
            const creator = p.creator_id ? creatorsById[p.creator_id] : null;
            const rmName = (p.rm_id && rmsById[p.rm_id]?.name) || p.rm_name || p.relationship_manager_name || brand?.relationship_manager_name || '';
            const companyLabel = brand?.company || brand?.name || p.brand_name || p.company || p.unlinked_brand_name || (creator ? creator.name : '—');
            const creatorLabel = creator?.name || (Array.isArray(p.creator_shortlist) && p.creator_shortlist.length ? p.creator_shortlist.slice(0, 3).join(', ') + (p.creator_shortlist.length > 3 ? '…' : '') : '');
            const valueDisplay = formatValueV3(p);
            const target = p.business_case_id
              ? `/v3/admin/business-cases/${p.business_case_id}`
              : `/v3/admin/projects/${p.id}`;
            return (
              <button
                key={p.id}
                onClick={() => navigate(target)}
                className="v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors flex flex-col gap-2 min-h-[140px]"
                data-testid={`project-${p.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: sp.bg, color: sp.fg }}>
                        <SrcIcon className="w-3 h-3 inline mr-1" /> {sp.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded" style={{ background: `${sm.color}1A`, color: sm.color }}>
                        {sm.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#8A8A8A] truncate">{companyLabel}{creatorLabel ? ` × ${creatorLabel}` : ''}</p>
                    <p className="text-[14px] font-medium text-[#1A1A1A] mt-1 line-clamp-2" style={{ fontFamily: "'Fraunces', serif" }}>
                      {p.project_descriptor || p.title || '(Untitled project)'}
                    </p>
                  </div>
                  <p className="text-[12px] font-semibold text-[#1F4A3A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {valueDisplay}
                  </p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#8A8A8A] mt-auto pt-2 border-t border-[#F4F2EC]">
                  <span>RM: <strong className="text-[#5C5C5C]">{rmName || '—'}</strong></span>
                  <span>{(p.engagement_track || 'paid').toUpperCase()}</span>
                  <span>{Number.isFinite(p.days_in_stage) ? p.days_in_stage : 0}d in stage</span>
                </div>
                {p.next_action && (
                  <p className="text-[11px] text-[#6E6657] italic line-clamp-2 mt-1">→ {p.next_action}</p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default V3AdminProjects;
