import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Projects, v3Stages, v3AlignmentSnapshots, v3FinalReports, v3CreativeSnapshots, v3Deliverables, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import { ChevronLeft, CheckCircle, Circle, Clock, FileText, Download } from 'lucide-react';

const brandId = 'brand-cocacola';

const tabs = [
  { key: 'summary', label: 'Summary' },
  { key: 'documents', label: 'Documents' },
  { key: 'deliverables', label: 'Deliverables' },
  { key: 'invoices', label: 'Invoices' },
];

const V3BrandProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');

  const project = v3Projects.find(p => p.id === id);
  if (!project) return <div className="p-8 text-[#8A8A8A]">Project not found.</div>;

  const brand = getBrand(project.brandId);
  const creator = getCreator(project.creatorId);
  const rm = getRM(project.rmId);
  const stage = v3Stages.find(s => s.key === project.stage);
  const snapshot = v3AlignmentSnapshots[id];
  const finalReport = v3FinalReports[id];
  const creativeSnapshot = v3CreativeSnapshots[id];
  const deliverables = v3Deliverables[id] || [];

  return (
    <div data-testid="v3-brand-project-detail">
      <button onClick={() => navigate('/v3/brand/projects')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C] transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> All projects
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ background: stage?.color }} />
          <span className="text-[11px] uppercase tracking-wider font-medium" style={{ color: stage?.color }}>{stage?.label}</span>
          <span className={`${project.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>{project.engagement}</span>
        </div>
        <h1 className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{project.title}</h1>
        <p className="text-[13px] text-[#8A8A8A] mt-1">{creator ? `with ${creator.name}` : 'Creator pending'} &middot; Managed by {rm?.name}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#E8E4DB] mb-6">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#1F4A3A] text-[#1F4A3A]' : 'border-transparent text-[#8A8A8A] hover:text-[#5C5C5C]'}`}
            data-testid={`brand-tab-${tab.key}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-5">
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Project Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-[11px] text-[#8A8A8A]">Stage</p><p className="text-[14px] font-medium" style={{ color: stage?.color }}>{stage?.label}</p></div>
              <div><p className="text-[11px] text-[#8A8A8A]">Value</p><p className="text-[14px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(project.estimatedValue)}</p></div>
              <div><p className="text-[11px] text-[#8A8A8A]">Days in stage</p><p className="text-[14px] font-medium">{project.daysInStage}</p></div>
              <div><p className="text-[11px] text-[#8A8A8A]">Next action</p><p className="text-[14px] text-[#5C5C5C]">{project.nextAction}</p></div>
            </div>
          </div>

          {/* Progress */}
          {deliverables.length > 0 && (
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Delivery Progress</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1 h-2 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1F4A3A] rounded-full transition-all" style={{ width: `${Math.round((deliverables.filter(d => d.status === 'approved').length / deliverables.length) * 100)}%` }} />
                </div>
                <span className="text-[13px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {deliverables.filter(d => d.status === 'approved').length}/{deliverables.length}
                </span>
              </div>
              <p className="text-[12px] text-[#8A8A8A]">{deliverables.filter(d => d.status === 'approved').length} deliverables approved, {deliverables.filter(d => d.status !== 'approved').length} remaining</p>
            </div>
          )}

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Your Team</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[10px] font-bold text-[#1F4A3A]">{rm?.initials}</div>
                <div><p className="text-[13px] text-[#1A1A1A]">{rm?.name}</p><p className="text-[10px] text-[#8A8A8A]">Relationship Manager</p></div>
              </div>
              {creator && (
                <div className="flex items-center gap-3 py-1">
                  <div className="w-8 h-8 rounded-full bg-[#F4F2EC] flex items-center justify-center text-[10px] font-bold text-[#5C5C5C]">{creator.name[0]}</div>
                  <div><p className="text-[13px] text-[#1A1A1A]">{creator.name}</p><p className="text-[10px] text-[#8A8A8A]">Creator &middot; {creator.genre}</p></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {snapshot && (
            <div>
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Alignment Snapshot</h3>
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
            </div>
          )}

          {creativeSnapshot && (
            <div className="mt-8">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Creative Snapshot</h3>
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
                </V3DocumentSurface>
              ))}
            </div>
          )}

          {finalReport && (
            <div className="mt-8">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Final Report</h3>
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
            </div>
          )}

          {!snapshot && !creativeSnapshot && !finalReport && (
            <div className="v3-card p-8 text-center">
              <FileText className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
              <p className="text-[14px] text-[#8A8A8A]">No documents available yet for this project.</p>
            </div>
          )}
        </div>
      )}

      {/* Deliverables */}
      {activeTab === 'deliverables' && (
        <div className="space-y-3">
          {deliverables.length > 0 ? deliverables.map(del => (
            <div key={del.id} className="v3-card p-4 flex items-center gap-4" data-testid={`brand-del-${del.id}`}>
              {del.status === 'approved' ? <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" /> :
               del.status === 'pending_rm_review' ? <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" /> :
               <Circle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />}
              <div className="flex-1">
                <p className="text-[13px] text-[#1A1A1A]">{del.title}</p>
                <p className="text-[10px] text-[#8A8A8A] capitalize">{del.status.replace(/_/g, ' ')}</p>
              </div>
              {del.brandApproved && <span className="text-[10px] text-[#8A8A8A]">Approved: {del.brandApproved}</span>}
              {del.paymentReleased && <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">Paid</span>}
              {del.status === 'pending_rm_review' && (
                <button className="v3-btn-primary text-[11px] py-1.5 px-3">Review</button>
              )}
            </div>
          )) : (
            <div className="v3-card p-8 text-center">
              <p className="text-[14px] text-[#8A8A8A]">Deliverables will appear here once the project enters the Deliver stage.</p>
            </div>
          )}
        </div>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {project.engagement === 'retainer' && (
            <div className="v3-card p-4 flex items-center gap-4" data-testid="brand-invoice-retainer">
              <FileText className="w-4 h-4 text-[#1F4A3A]" />
              <div className="flex-1">
                <p className="text-[13px] text-[#1A1A1A]">Consultancy Fee — Retainer</p>
                <p className="text-[10px] text-[#8A8A8A]">Due upon project commencement</p>
              </div>
              <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(project.estimatedValue * 0.15)}</span>
              <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded">Pending</span>
            </div>
          )}
          <div className="v3-card p-4 flex items-center gap-4" data-testid="brand-invoice-project">
            <FileText className="w-4 h-4 text-[#8A8A8A]" />
            <div className="flex-1">
              <p className="text-[13px] text-[#1A1A1A]">Project Fee</p>
              <p className="text-[10px] text-[#8A8A8A]">Due upon Creative Snapshot approval</p>
            </div>
            <span className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(project.estimatedValue)}</span>
            <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">Not yet issued</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default V3BrandProjectDetail;
