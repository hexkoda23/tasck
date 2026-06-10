import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3ListProjects, v3GetBrands, v3GetCreators, v3ListRelationshipManagers } from '../../../lib/v3api';
import { formatNairaV3 } from '../../../lib/v3data';
import { FolderOpen, Filter } from 'lucide-react';

const stageMeta = {
  connect: { label: 'Connect', color: '#9B9380' },
  frame: { label: 'Frame', color: '#C49B5F' },
  plan: { label: 'Plan', color: '#1F4A3A' },
  deliver: { label: 'Deliver', color: '#567B3F' },
  closed: { label: 'Closed', color: '#B54A37' },
};

const sourceTypePill = {
  brand_project: { label: 'Brand', bg: '#DDE7E2', fg: '#1F4A3A' },
  creator_project: { label: 'Creator', bg: '#F2EAD8', fg: '#7A5F23' },
  business_case: { label: 'CRM-derived', bg: '#EEEAE0', fg: '#6E6657' },
};

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

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const stage = p.stage || 'connect';
      const source = p.source_type || (p.derived_from === 'business_case' ? 'business_case' : 'brand_project');
      if (stageFilter !== 'all' && stage !== stageFilter) return false;
      if (sourceFilter !== 'all' && source !== sourceFilter) return false;
      return true;
    });
  }, [projects, stageFilter, sourceFilter]);

  const sources = useMemo(() => {
    const set = new Set();
    projects.forEach((p) => {
      set.add(p.source_type || (p.derived_from === 'business_case' ? 'business_case' : 'brand_project'));
    });
    return Array.from(set);
  }, [projects]);

  return (
    <div data-testid="v3-admin-projects">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PROJECTS</p>
      <h1 className="v3-heading text-2xl mb-2" style={{ fontFamily: "'Fraunces', serif" }}>All Projects</h1>
      <p className="text-[#8A8A8A] text-sm mb-6">
        Projects from CRM Framing, Super Creatives Framing, and business cases.
      </p>

      <div className="flex items-center gap-3 mb-6">
        <Filter className="w-4 h-4 text-[#8A8A8A]" />
        <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="projects-stage-filter">
          {['all', 'connect', 'frame', 'plan', 'deliver', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={`text-[11px] px-3 py-1 rounded transition-colors capitalize ${stageFilter === s ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`projects-stage-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
        {sources.length > 1 && (
          <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="projects-source-filter">
            {['all', ...sources].map((s) => (
              <button
                key={s}
                onClick={() => setSourceFilter(s)}
                className={`text-[11px] px-3 py-1 rounded transition-colors capitalize ${sourceFilter === s ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
                data-testid={`projects-source-${s}`}
              >
                {sourceTypePill[s]?.label || s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
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
        <div className="space-y-2" data-testid="projects-list">
          {filtered.map((p) => {
            const stage = p.stage || 'connect';
            const sm = stageMeta[stage] || stageMeta.connect;
            const sourceKey = p.source_type || (p.derived_from === 'business_case' ? 'business_case' : 'brand_project');
            const sp = sourceTypePill[sourceKey] || sourceTypePill.business_case;
            const brand = p.brand_id ? brandsById[p.brand_id] : null;
            const creator = p.creator_id ? creatorsById[p.creator_id] : null;
            const rmName = (p.rm_id && rmsById[p.rm_id]?.name) || p.relationship_manager_name || brand?.relationship_manager_name || '—';
            const companyLabel = brand?.company || brand?.name || p.company || p.unlinked_brand_name || (creator ? creator.name : '—');
            const value = p.estimated_value ?? p.budget_amount ?? p.fee_amount ?? 0;
            const target = p.business_case_id
              ? `/v3/admin/business-cases/${p.business_case_id}`
              : `/v3/admin/projects/${p.id}`;
            return (
              <button
                key={p.id}
                onClick={() => navigate(target)}
                className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors"
                data-testid={`project-${p.id}`}
              >
                <div className="w-1 h-12 rounded-full flex-shrink-0" style={{ background: sm.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-medium text-[#1A1A1A]">{p.title || '(Untitled project)'}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                      style={{ background: `${sm.color}1A`, color: sm.color }}
                    >
                      {sm.label}
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider"
                      style={{ background: sp.bg, color: sp.fg }}
                    >
                      {sp.label}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6E6657] mt-1">
                    {companyLabel}{creator ? ` × ${creator.name}` : ''} · RM: {rmName}
                  </p>
                  {p.partner_lead && (
                    <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                      Partner lead: {p.partner_lead}{p.unlinked_brand_name && !p.brand_id ? ' · brand unlinked' : ''}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[12px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {value ? formatNairaV3(value) : '—'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default V3AdminProjects;
