import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, v3AlignmentSnapshots, v3FinalReports, v3CreativeSnapshots, v3BriefResponses, v3CreatorMatches, v3Deliverables, v3Interactions, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import V3StageGate from '../../../components/v3/V3StageGate';
import { ChevronLeft, Clock, FileText, Sparkles, Users, AlertTriangle, CheckCircle, Circle, MessageSquare } from 'lucide-react';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'alignment', label: 'Alignment' },
  { key: 'plan', label: 'Plan' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'financials', label: 'Financials' },
  { key: 'closure', label: 'Closure' },
];

const V3AdminProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const project = v3Projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-[#8A8A8A]">Project not found.</div>;

  const brand = getBrand(project.brandId);
  const creator = getCreator(project.creatorId);
  const rm = getRM(project.rmId);
  const stage = v3Stages.find(s => s.key === project.stage);
  const snapshot = v3AlignmentSnapshots[id];
  const finalReport = v3FinalReports[id];
  const creativeSnapshot = v3CreativeSnapshots[id];
  const briefResponse = v3BriefResponses[id];
  const creatorMatch = v3CreatorMatches[id];
  const deliverables = v3Deliverables[id] || [];
  const interactions = v3Interactions[project.brandId] || [];

  const getStageConditions = () => {
    switch (project.stage) {
      case 'connect': return [
        { label: 'Brand CRM record complete', status: 'done' },
        { label: 'Discovery call completed', status: brand ? 'done' : 'pending' },
        { label: 'Engagement model selected', status: project.engagement ? 'done' : 'pending' },
      ];
      case 'frame': return [
        { label: 'Alignment Snapshot generated', status: snapshot ? 'done' : 'pending' },
        { label: 'RM review complete', status: snapshot?.status === 'under_review' ? 'done' : 'pending' },
        { label: 'Brand confirmation', status: 'pending' },
        ...(project.engagement === 'retainer' ? [{ label: 'Consultancy Fee paid', status: 'pending' }] : [{ label: 'Consultancy Fee invoice', status: 'na', note: 'N/A for Direct engagement' }]),
      ];
      case 'plan': return [
        { label: 'Creator matched', status: creatorMatch ? 'done' : 'pending' },
        { label: 'Creator Brief sent', status: briefResponse ? 'done' : 'pending' },
        { label: 'Creator response received', status: briefResponse?.interest ? 'done' : 'pending' },
        { label: 'Creative Snapshot generated', status: creativeSnapshot ? 'done' : 'pending' },
        { label: 'Brand approved Creative Snapshot', status: 'pending' },
        { label: 'Contracts executed', status: 'pending' },
        { label: 'Project invoice paid', status: 'pending' },
      ];
      case 'deliver': return [
        { label: 'All milestones complete', status: deliverables.every(d => d.status === 'approved') ? 'done' : 'pending' },
        { label: 'All deliverables approved', status: deliverables.every(d => d.status === 'approved') ? 'done' : 'pending' },
        { label: 'All payments released', status: deliverables.every(d => d.paymentReleased) ? 'done' : 'pending' },
        { label: 'Final Report generated', status: finalReport ? 'done' : 'pending' },
        { label: 'Closure checklist 100%', status: 'pending' },
      ];
      default: return [];
    }
  };

  return (
    <div data-testid="v3-project-detail">
      <button onClick={() => navigate('/v3/admin/projects')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> All projects
      </button>

      <div className="flex gap-8">
        {/* LEFT RAIL — Project summary + Stage Gate */}
        <div className="w-[260px] flex-shrink-0 space-y-5">
          <div>
            <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">{brand?.industry}</p>
            <h1 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{brand?.company?.split(' ')[0]}</h1>
            <p className="text-[14px] text-[#5C5C5C] mt-1" style={{ fontFamily: "'Fraunces', serif" }}>{project.title}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage?.color }} />
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: stage?.color }}>{stage?.label}</span>
            </div>
            <span className={`${project.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>{project.engagement}</span>
          </div>

          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-[#8A8A8A]">RM</span><span className="text-[#1A1A1A]">{rm?.name}</span></div>
            <div className="flex justify-between"><span className="text-[#8A8A8A]">Value</span><span className="text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(project.estimatedValue)}</span></div>
            <div className="flex justify-between"><span className="text-[#8A8A8A]">Created</span><span className="text-[#1A1A1A]">{project.createdAt}</span></div>
            <div className="flex justify-between"><span className="text-[#8A8A8A]">Days in stage</span><span className="text-[#1A1A1A]">{project.daysInStage}</span></div>
            {creator && <div className="flex justify-between"><span className="text-[#8A8A8A]">Creator</span><span className="text-[#1A1A1A]">{creator.name}</span></div>}
          </div>

          <V3StageGate stage={project.stage} conditions={getStageConditions()} canAdvance={false} onAdvance={() => {}} />
        </div>

        {/* MAIN — Tabbed content */}
        <div className="flex-1 min-w-0">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#E8E4DB] mb-6">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#1F4A3A] text-[#1F4A3A]' : 'border-transparent text-[#8A8A8A] hover:text-[#5C5C5C]'}`}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  <div className="v3-card p-5">
                    <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Next Actions</h3>
                    <p className="text-[14px] text-[#5C5C5C]">{project.nextAction}</p>
                  </div>
                  <div className="v3-card p-5">
                    <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Quick Summary</h3>
                    <p className="text-[13px] text-[#5C5C5C] leading-relaxed">
                      {brand?.company?.split(' ')[0]} engaged TASCK for a {project.engagement} campaign titled "{project.title}" with an estimated value of {formatNairaV3(project.estimatedValue)}.
                      {creator ? ` ${creator.name} has been matched as the primary creator.` : ' Creator matching is pending.'}
                      {' '}The project is currently in the {stage?.label} stage, managed by {rm?.name}.
                    </p>
                  </div>
                  {/* Quick links */}
                  <div className="flex gap-3">
                    <button onClick={() => navigate(`/v3/admin/projects/${id}/brainstorm`)} className="v3-btn-secondary flex-1 justify-center" data-testid="go-brainstorm">
                      <Sparkles className="w-3.5 h-3.5" /> Campaign Workspace
                    </button>
                    {(project.stage === 'deliver' || project.stage === 'closed') && (
                      <button onClick={() => navigate(`/v3/admin/projects/${id}/feedback`)} className="v3-btn-secondary flex-1 justify-center" data-testid="go-feedback">
                        <MessageSquare className="w-3.5 h-3.5" /> Feedback
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'timeline' && (
                <div className="space-y-2">
                  {interactions.length > 0 ? interactions.map(int => (
                    <div key={int.id} className="v3-card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#F4F2EC] text-[#8A8A8A] capitalize">{int.type.replace('_', ' ')}</span>
                        <span className="text-[11px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{int.date}</span>
                        <span className="text-[11px] text-[#5C5C5C] ml-auto">{int.author}</span>
                      </div>
                      <p className="text-[13px] font-medium text-[#1A1A1A] mb-2">{int.title}</p>
                      <pre className="text-[12px] text-[#5C5C5C] leading-relaxed whitespace-pre-wrap font-sans">{int.content}</pre>
                    </div>
                  )) : <p className="text-[13px] text-[#8A8A8A]">No timeline entries yet for this project.</p>}
                </div>
              )}

              {activeTab === 'alignment' && (
                <div>
                  {snapshot ? (
                    <div>
                      {/* AI gen button if not yet generated */}
                      <V3DocumentSurface title={snapshot.title} meta={snapshot.meta}>
                        {snapshot.sections.map((section, i) => (
                          <div key={i}>
                            <h2>{section.heading}</h2>
                            {section.type === 'prose' && section.content.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}
                            {section.type === 'bullets' && <ul>{section.items.map((item, j) => <li key={j}>{item}</li>)}</ul>}
                            {section.type === 'numbered' && <ol className="list-decimal pl-5 space-y-2">{section.items.map((item, j) => <li key={j} className="text-[14px] text-[#5C5C5C] leading-relaxed">{item}</li>)}</ol>}
                            {section.type === 'kpis' && (
                              <div className="space-y-2">
                                {section.items.map((item, j) => (
                                  <div key={j}>
                                    <p className="text-[14px] text-[#5C5C5C]"><strong>{item.kpi}:</strong> {item.target}</p>
                                    {item.flagNote && <div className="v3-scope-flag">{item.flagNote}</div>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {section.type === 'flags' && (
                              <div className="space-y-2">{section.items.map((item, j) => <div key={j} className="v3-scope-flag">{item.text}</div>)}</div>
                            )}
                          </div>
                        ))}
                      </V3DocumentSurface>
                      {snapshot.scopeFlags?.length > 0 && (
                        <div className="mt-6 max-w-[720px] mx-auto">
                          <h3 className="text-[12px] font-semibold text-[#C49B5F] uppercase tracking-wider mb-3 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> Scope Ambiguity Flags</h3>
                          <div className="space-y-2">
                            {snapshot.scopeFlags.map((flag, i) => (
                              <div key={i} className="v3-card p-3 flex gap-3 items-start border-l-2" style={{ borderLeftColor: '#C49B5F' }}>
                                <div className="flex-1">
                                  <p className="text-[13px] text-[#1A1A1A] font-medium">"{flag.text}"</p>
                                  <p className="text-[12px] text-[#8A8A8A] mt-1">{flag.reason}</p>
                                </div>
                                <button className="v3-btn-secondary text-[10px] py-1 px-3 flex-shrink-0">Clarify</button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="v3-card p-8 text-center">
                      <Sparkles className="w-6 h-6 text-[#1F4A3A] mx-auto mb-3" />
                      <p className="text-[14px] text-[#1A1A1A] font-medium mb-1">Generate Alignment Snapshot</p>
                      <p className="text-[12px] text-[#8A8A8A] mb-4">AI will read all inputs on this Business Case and produce a structured document.</p>
                      <button className="v3-btn-primary" data-testid="generate-alignment"><Sparkles className="w-3.5 h-3.5" /> Generate Alignment Snapshot</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'plan' && (
                <div className="space-y-6">
                  {creatorMatch && (
                    <div className="v3-card p-5">
                      <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3 flex items-center gap-2"><Users className="w-3.5 h-3.5 text-[#1F4A3A]" /> Creator Match</h3>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[14px] font-bold text-[#1F4A3A]">{creatorMatch.fitScore}</div>
                        <div className="flex-1">
                          <p className="text-[14px] font-medium text-[#1A1A1A]">{creator?.name}</p>
                          <p className="text-[11px] text-[#8A8A8A] mb-2">{creator?.genre} &middot; {creator?.location}</p>
                          <ul className="space-y-1">{creatorMatch.rationale.map((r, i) => <li key={i} className="text-[12px] text-[#5C5C5C]">&bull; {r}</li>)}</ul>
                          {creatorMatch.risks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-[#E8E4DB]">
                              <p className="text-[10px] text-[#C49B5F] uppercase tracking-wider mb-1">Risks</p>
                              {creatorMatch.risks.map((r, i) => <p key={i} className="text-[12px] text-[#8A8A8A]">&bull; {r}</p>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {briefResponse && (
                    <div className="v3-card p-5">
                      <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-[#1F4A3A]" /> Creator Response</h3>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-[#F4F2EC]"><p className="text-[10px] text-[#8A8A8A]">Interest</p><p className="text-[13px] text-[#1F4A3A] font-medium capitalize">{briefResponse.interest}</p></div>
                        <div className="p-2 rounded-lg bg-[#F4F2EC]"><p className="text-[10px] text-[#8A8A8A]">Budget</p><p className="text-[13px] text-[#1A1A1A]">{briefResponse.budgetAlignment}</p></div>
                        <div className="p-2 rounded-lg bg-[#F4F2EC]"><p className="text-[10px] text-[#8A8A8A]">Fee</p><p className="text-[13px] text-[#1A1A1A]">{briefResponse.feeExpectation}</p></div>
                      </div>
                      <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Proposed concept</p>
                      <pre className="text-[12px] text-[#5C5C5C] leading-relaxed whitespace-pre-wrap font-sans">{briefResponse.proposedConcept}</pre>
                    </div>
                  )}

                  {creativeSnapshot && (
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-3.5 h-3.5 text-[#1F4A3A]" />
                        <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider">Creative Snapshot</h3>
                        <span className="text-[10px] text-[#8A8A8A]">v{creativeSnapshot.currentVersion} of 3</span>
                        {creativeSnapshot.revisionCount >= 3 && <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded">Final revision</span>}
                      </div>
                      {creativeSnapshot.versions.map(v => (
                        <V3DocumentSurface key={v.version} title={v.content.title} meta={v.content.meta}>
                          <h2>Campaign concept</h2>
                          {v.content.concept.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}
                          <h2>Deliverables</h2>
                          <table><thead><tr><th>#</th><th>Deliverable</th><th>Format</th><th>Duration</th><th>Purpose</th></tr></thead>
                            <tbody>{v.content.deliverables.map(d => <tr key={d.num}><td>{d.num}</td><td>{d.title}</td><td>{d.format}</td><td>{d.duration}</td><td>{d.purpose}</td></tr>)}</tbody>
                          </table>
                          <h2>Budget breakdown (Total: {formatNairaV3(v.content.budget.reduce((a, b) => a + b.amount, 0))})</h2>
                          <table><thead><tr><th>Line</th><th>Amount</th><th>%</th></tr></thead>
                            <tbody>{v.content.budget.map((b, j) => <tr key={j}><td>{b.line}</td><td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(b.amount)}</td><td>{b.pct}%</td></tr>)}</tbody>
                          </table>
                          <h2>Timeline & milestones</h2>
                          <table><thead><tr><th>Milestone</th><th>Date</th></tr></thead>
                            <tbody>{v.content.milestones.map((m, j) => <tr key={j}><td>{m.milestone}</td><td style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.date}</td></tr>)}</tbody>
                          </table>
                          <h2>Success metrics</h2>
                          <table><thead><tr><th>Brand KPI</th><th>Campaign metric</th><th>Target</th></tr></thead>
                            <tbody>{v.content.successMetrics.map((m, j) => <tr key={j}><td>{m.kpi}</td><td>{m.metric}</td><td>{m.target}</td></tr>)}</tbody>
                          </table>
                        </V3DocumentSurface>
                      ))}
                    </div>
                  )}

                  {!creatorMatch && !creativeSnapshot && (
                    <div className="v3-card p-8 text-center">
                      <Users className="w-6 h-6 text-[#1F4A3A] mx-auto mb-3" />
                      <p className="text-[14px] text-[#1A1A1A] font-medium mb-1">Find Creators</p>
                      <p className="text-[12px] text-[#8A8A8A] mb-4">AI-assisted matching based on the Alignment Snapshot and project requirements.</p>
                      <button className="v3-btn-primary" data-testid="find-creators"><Sparkles className="w-3.5 h-3.5" /> Find Creators</button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'delivery' && (
                <div className="space-y-3">
                  {deliverables.length > 0 ? deliverables.map(del => (
                    <div key={del.id} className="v3-card p-4 flex items-center gap-4">
                      {del.status === 'approved' ? <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" /> :
                       del.status === 'pending_rm_review' ? <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" /> :
                       <Circle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />}
                      <div className="flex-1">
                        <p className="text-[13px] text-[#1A1A1A]">{del.title}</p>
                        <p className="text-[10px] text-[#8A8A8A] capitalize">{del.status.replace(/_/g, ' ')}</p>
                      </div>
                      {del.rmApproved && <span className="text-[10px] text-[#8A8A8A]">RM: {del.rmApproved}</span>}
                      {del.brandApproved && <span className="text-[10px] text-[#8A8A8A]">Brand: {del.brandApproved}</span>}
                      {del.paymentReleased && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">Paid</span>}
                    </div>
                  )) : <p className="text-[13px] text-[#8A8A8A]">No deliverables tracked yet for this project.</p>}
                </div>
              )}

              {activeTab === 'closure' && finalReport && (
                <div>
                  <V3DocumentSurface title={finalReport.title} meta={finalReport.meta}>
                    {finalReport.sections.map((section, i) => (
                      <div key={i}>
                        <h2>{section.heading}</h2>
                        {section.type === 'prose' && section.content.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}
                        {section.type === 'bullets' && <ul>{section.items.map((it, j) => <li key={j}>{it}</li>)}</ul>}
                        {section.type === 'numbered' && <ol className="list-decimal pl-5 space-y-2">{section.items.map((it, j) => <li key={j} className="text-[14px] text-[#5C5C5C] leading-relaxed">{it}</li>)}</ol>}
                        {section.type === 'kpi_table' && (
                          <table><thead><tr><th>KPI</th><th>Target</th><th>Actual</th><th>Variance</th></tr></thead>
                            <tbody>{section.items.map((it, j) => <tr key={j}><td>{it.kpi}</td><td>{it.target}</td><td style={{ fontWeight: 600 }}>{it.actual}</td><td style={{ color: '#1F4A3A', fontWeight: 600 }}>{it.variance}</td></tr>)}</tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </V3DocumentSurface>
                  {/* Closure checklist */}
                  <div className="mt-6 max-w-[720px] mx-auto v3-card p-5">
                    <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Closure Checklist</h3>
                    <div className="space-y-1">
                      {finalReport.closureChecklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 py-1.5">
                          {item.status === 'done' ? <CheckCircle className="w-4 h-4 text-[#1F4A3A]" /> : <Circle className="w-4 h-4 text-[#D4CDBF]" />}
                          <span className={`text-[13px] ${item.status === 'done' ? 'text-[#1A1A1A]' : 'text-[#8A8A8A]'}`}>{item.item}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E8E4DB]">
                      <p className="text-[11px] text-[#8A8A8A]">{finalReport.closureChecklist.filter(c => c.status === 'done').length} of {finalReport.closureChecklist.length} items complete</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'closure' && !finalReport && (
                <div className="v3-card p-8 text-center">
                  <FileText className="w-6 h-6 text-[#1F4A3A] mx-auto mb-3" />
                  <p className="text-[14px] text-[#1A1A1A] font-medium mb-1">Generate Final Report</p>
                  <p className="text-[12px] text-[#8A8A8A] mb-4">AI will compile the full Business Case into a structured campaign report.</p>
                  <button className="v3-btn-primary" data-testid="generate-report"><Sparkles className="w-3.5 h-3.5" /> Generate Final Report</button>
                </div>
              )}

              {(activeTab === 'contracts' || activeTab === 'financials') && (
                <div className="space-y-4">
                  <div className="v3-card p-5">
                    <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Contract</h3>
                    <p className="text-[13px] text-[#5C5C5C] mb-3">{project.engagement === 'retainer' ? 'Retainer' : 'Direct'} Campaign Services Agreement — {formatNairaV3(project.estimatedValue)}</p>
                    <button onClick={() => navigate(`/v3/admin/projects/${id}/contract`)} className="v3-btn-primary" data-testid="view-contract">View Contract</button>
                  </div>
                  <div className="v3-card p-5">
                    <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Scope Changes</h3>
                    <button onClick={() => navigate(`/v3/admin/projects/${id}/scope-changes`)} className="v3-btn-secondary" data-testid="view-scope-changes">View Scope Changes</button>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT RAIL — AI Assist */}
            <div className="w-[280px] flex-shrink-0">
              <div className="v3-ai-panel sticky top-8">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-[#1F4A3A]" />
                  <span className="text-[11px] font-semibold text-[#1A1A1A] uppercase tracking-wider">AI Assist</span>
                </div>
                {activeTab === 'alignment' && !snapshot && <button className="v3-btn-primary w-full justify-center mb-3"><Sparkles className="w-3.5 h-3.5" /> Generate Snapshot</button>}
                {activeTab === 'plan' && !creatorMatch && <button className="v3-btn-primary w-full justify-center mb-3"><Sparkles className="w-3.5 h-3.5" /> Find Creators</button>}
                {activeTab === 'plan' && creatorMatch && !creativeSnapshot && <button className="v3-btn-primary w-full justify-center mb-3"><Sparkles className="w-3.5 h-3.5" /> Generate Snapshot</button>}
                {activeTab === 'closure' && !finalReport && <button className="v3-btn-primary w-full justify-center mb-3"><Sparkles className="w-3.5 h-3.5" /> Generate Report</button>}

                <div className="space-y-2 mt-4">
                  <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Recent AI activity</p>
                  {[
                    'Alignment Snapshot generated',
                    'Scope ambiguity flags detected (4)',
                    'Creator matching completed',
                  ].slice(0, project.stage === 'connect' ? 0 : project.stage === 'frame' ? 2 : 3).map((a, i) => (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <CheckCircle className="w-3 h-3 text-[#1F4A3A]/50" />
                      <span className="text-[11px] text-[#5C5C5C]">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3AdminProjectDetail;
