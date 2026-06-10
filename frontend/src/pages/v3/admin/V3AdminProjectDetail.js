import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3ListProjects, v3GetBrands, v3GetCreators, v3ListRelationshipManagers } from '../../../lib/v3api';
import { formatValueV3 } from '../../../lib/v3data';
import { ChevronLeft, Sparkles, FileText, Users, AlertTriangle, CheckCircle, Circle } from 'lucide-react';

const STAGE_LABEL = { connect: 'Connect', frame: 'Frame', plan: 'Plan', deliver: 'Deliver', closed: 'Closed' };
const STAGE_COLOR = { connect: '#9B9380', frame: '#C49B5F', plan: '#1F4A3A', deliver: '#567B3F', closed: '#B54A37' };

const EXIT_CONDITIONS = {
  connect: ['Decision maker identified', 'Challenge/opportunity captured', 'Target audience captured', 'KPIs captured', 'Ready to move to Frame'],
  frame: ['Alignment Snapshot generated', 'RM review complete', 'Brand confirmation', 'Advance to Plan'],
  plan: ['Brainstorming complete', 'Creator shortlist scored', 'Strategy Snapshot drafted', 'Strategy Development Fee approved', 'Contracts ready'],
  deliver: ['Contract active', 'Milestones tracked', 'Deliverables uploaded', 'Brand updates sent'],
  closed: ['Report generated', 'Feedback captured', 'Payment closed out', 'Lessons logged'],
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'alignment', label: 'Alignment' },
  { key: 'plan', label: 'Plan' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'financials', label: 'Financials' },
  { key: 'closure', label: 'Closure' },
];

const buildSummary = (p, brand, creator, rmName) => {
  if (!p) return '';
  const company = brand?.company || p.brand_name || p.unlinked_brand_name || (creator?.name) || 'A partner';
  const engagement = p.engagement_track || 'paid';
  const value = formatValueV3(p);
  const stage = STAGE_LABEL[p.stage] || p.stage || 'Connect';
  const contact = brand?.primary_contact || (creator?.name) || 'the team';
  const rmPart = rmName ? `${rmName} is the relationship manager.` : 'A relationship manager will be assigned.';
  const valuePart = value && value !== '—' ? `with an estimated ${engagement === 'grant' ? 'grant' : 'strategy fee'} of ${value}` : 'with value to be confirmed';
  return `${company} engaged TASCK for a ${engagement} project titled "${p.project_descriptor || p.title}" ${valuePart}. ${contact} is the key contact and ${rmPart} The project is currently in the ${stage} stage.`;
};

const V3AdminProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [brandsById, setBrandsById] = useState({});
  const [creatorsById, setCreatorsById] = useState({});
  const [rmsById, setRMsById] = useState({});
  const [tab, setTab] = useState('overview');
  const [loaded, setLoaded] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    v3ListProjects().then((p) => setProjects(Array.isArray(p) ? p : [])).catch(() => setProjects([])).finally(() => setLoaded(true));
    v3GetBrands().then((bs) => { const m = {}; (bs || []).forEach((b) => m[b.id] = b); setBrandsById(m); }).catch(() => {});
    v3GetCreators().then((cs) => { const m = {}; (cs || []).forEach((c) => m[c.id] = c); setCreatorsById(m); }).catch(() => {});
    v3ListRelationshipManagers().then((rs) => { const m = {}; (rs || []).forEach((r) => m[r.id] = r); setRMsById(m); }).catch(() => {});
  }, []);

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id]);
  const brand = project?.brand_id ? brandsById[project.brand_id] : null;
  const creator = project?.creator_id ? creatorsById[project.creator_id] : null;
  const rmName = (project?.rm_id && rmsById[project.rm_id]?.name) || project?.rm_name || project?.relationship_manager_name || brand?.relationship_manager_name || '';

  if (!loaded) return <div className="v3-card p-10 text-center text-[13px] text-[#8A8A8A]">Loading project…</div>;
  if (!project) {
    return (
      <div className="v3-card p-10 text-center" data-testid="project-not-found">
        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-[#C4BFB1]" />
        <p className="text-[13px] text-[#5C5C5C] mb-3">We couldn't find that project.</p>
        <button onClick={() => navigate('/v3/admin/projects')} className="v3-btn-secondary">← Back to all projects</button>
      </div>
    );
  }

  const stage = project.stage || 'connect';
  const stageColor = STAGE_COLOR[stage];
  const companyLabel = brand?.company || brand?.name || project.brand_name || project.company || project.unlinked_brand_name || (creator?.name || '—');
  const category = brand?.industry || (project.source_type === 'creator_project' ? 'Creator workstream' : 'Uncategorised');
  const summary = buildSummary(project, brand, creator, rmName);
  const exitConditions = EXIT_CONDITIONS[stage] || [];

  return (
    <div data-testid="project-detail">
      <button onClick={() => navigate('/v3/admin/projects')} className="flex items-center gap-1 text-[11px] text-[#8A8A8A] hover:text-[#1A1A1A] mb-2" data-testid="back-to-projects">
        <ChevronLeft className="w-3 h-3" /> All projects
      </button>
      <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-1">{category}</p>
      <p className="text-[14px] text-[#5C5C5C] mb-1">{companyLabel}{creator ? ` × ${creator.name}` : ''}</p>
      <h1 className="v3-heading text-[28px] mb-6" style={{ fontFamily: "'Fraunces', serif" }}>{project.project_descriptor || project.title}</h1>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6" data-testid="project-kpis">
        {[
          { label: 'Stage', value: STAGE_LABEL[stage], color: stageColor },
          { label: 'Engagement', value: (project.engagement_track || 'paid').toUpperCase() },
          { label: 'RM', value: rmName || '—' },
          { label: 'Value', value: formatValueV3(project), color: '#1F4A3A' },
          { label: 'Created', value: project.created_at ? new Date(project.created_at).toLocaleDateString() : '—' },
          { label: 'Days in stage', value: `${Number.isFinite(project.days_in_stage) ? project.days_in_stage : 0}d` },
        ].map((k) => (
          <div key={k.label} className="v3-card p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">{k.label}</p>
            <p className="text-[14px] font-semibold" style={{ color: k.color || '#1A1A1A', fontFamily: "'JetBrains Mono', monospace" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Exit conditions for current stage */}
      <div className="v3-card p-4 mb-6" data-testid="project-exit-conditions">
        <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-2">Stage: {STAGE_LABEL[stage]}</p>
        <p className="text-[12px] font-medium text-[#1A1A1A] mb-3">Exit conditions</p>
        <ul className="space-y-1.5">
          {exitConditions.map((c) => (
            <li key={c} className="flex items-center gap-2 text-[12px] text-[#5C5C5C]">
              <Circle className="w-3 h-3 text-[#D4CDBF]" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#E8E4DB]" data-testid="project-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`text-[12px] px-3 py-2 border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-[#1A1A1A] text-[#1A1A1A]' : 'border-transparent text-[#8A8A8A] hover:text-[#5C5C5C]'}`} data-testid={`project-tab-${t.key}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {tab === 'overview' && (
            <>
              <div className="v3-card p-5" data-testid="project-summary">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Quick summary</p>
                <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{summary}</p>
              </div>
              {project.next_action && (
                <div className="v3-card p-4">
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Next action</p>
                  <p className="text-[13px] text-[#1A1A1A]">{project.next_action}</p>
                </div>
              )}
              {(project.project_context || project.project_goal || project.success_factors) && (
                <div className="v3-card p-4 space-y-3">
                  {project.project_context && <div><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Project context</p><p className="text-[12px] whitespace-pre-wrap text-[#5C5C5C]">{project.project_context}</p></div>}
                  {project.project_goal && <div><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Project goal</p><p className="text-[12px] whitespace-pre-wrap text-[#5C5C5C]">{project.project_goal}</p></div>}
                  {project.success_factors && <div><p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Success factors</p><p className="text-[12px] whitespace-pre-wrap text-[#5C5C5C]">{project.success_factors}</p></div>}
                </div>
              )}
              {Array.isArray(project.creator_shortlist) && project.creator_shortlist.length > 0 && (
                <div className="v3-card p-4" data-testid="project-creator-shortlist">
                  <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2"><Users className="w-3 h-3 inline mr-1" /> Creator shortlist</p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.creator_shortlist.map((c) => (
                      <span key={c} className="text-[11px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#5C5C5C]">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {project.business_case_id && (
                <button onClick={() => navigate(`/v3/admin/business-cases/${project.business_case_id}`)} className="v3-btn-primary" data-testid="open-linked-bc">
                  <FileText className="w-4 h-4" /> Open linked business case
                </button>
              )}
            </>
          )}
          {tab !== 'overview' && (
            <div className="v3-card p-8 text-center text-[#8A8A8A] text-[12px]" data-testid={`project-tab-content-${tab}`}>
              <p className="mb-2">{TABS.find((t) => t.key === tab)?.label} workspace</p>
              {project.business_case_id ? (
                <button onClick={() => navigate(`/v3/admin/business-cases/${project.business_case_id}`)} className="v3-btn-secondary">
                  Open this section on the linked business case
                </button>
              ) : (
                <p>Connect this project to a business case to unlock {TABS.find((t) => t.key === tab)?.label} actions.</p>
              )}
            </div>
          )}
        </div>

        {/* Campaign workspace / AI assist sidebar */}
        <div className="space-y-3" data-testid="project-ai-assist">
          <div className="v3-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Assist</p>
            <ul className="text-[12px] text-[#5C5C5C] space-y-1.5">
              <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-[#567B3F]" /> CRM record ingested</li>
              <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-[#D4CDBF]" /> Alignment Snapshot generated</li>
              <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-[#D4CDBF]" /> Scope ambiguity flags detected</li>
              <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-[#D4CDBF]" /> Strategy Snapshot drafted</li>
              <li className="flex items-center gap-2"><Circle className="w-3 h-3 text-[#D4CDBF]" /> Contract risk flags detected</li>
            </ul>
          </div>
          <div className="v3-card p-4">
            <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Recent AI activity</p>
            <p className="text-[12px] text-[#8A8A8A]">No AI runs yet for this project. Use the Business Case workflow to generate Alignment + Strategy Snapshots.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3AdminProjectDetail;
