import React from 'react';
import { v3Projects, v3Stages, v3Brands, v3Creators, v3RMs, v3Deliverables, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Layers, Download } from 'lucide-react';

const V3AdminReports = () => {
  const deliverableRows = v3Projects.flatMap(project => (v3Deliverables[project.id] || []).map(deliverable => ({ project, deliverable })));
  const approvedDeliverables = deliverableRows.filter(row => row.deliverable.status === 'approved').length;
  const reports = [
    {
      id: 'rpt-pipeline',
      title: 'Pipeline Summary',
      description: `${v3Projects.length} active projects across 4 stages. Total pipeline value: ${formatNairaV3(v3Projects.reduce((a, p) => a + p.estimatedValue, 0))}. ${v3Projects.filter(p => p.stage === 'deliver').length} in delivery, ${v3Projects.filter(p => p.stage === 'connect').length} in connect.`,
      type: 'Weekly',
      lastGenerated: '14 March 2026',
    },
    {
      id: 'rpt-rm',
      title: 'RM Performance Report',
      description: `${v3RMs.length} active relationship managers. Temi Bakare leads with ${v3Projects.filter(p => p.rmId === 'rm-temi').length} projects (${formatNairaV3(v3Projects.filter(p => p.rmId === 'rm-temi').reduce((a, p) => a + p.estimatedValue, 0))} total value). Avg response time: 18 hours.`,
      type: 'Monthly',
      lastGenerated: '1 March 2026',
    },
    {
      id: 'rpt-brand',
      title: 'Brand Engagement Summary',
      description: `${v3Brands.length} brands in CRM. ${v3Brands.filter(b => b.status.startsWith('Active')).length} active, ${v3Brands.filter(b => b.status.startsWith('Lead')).length} in lead stage. Average lead score: ${Math.round(v3Brands.reduce((a, b) => a + b.leadScore, 0) / v3Brands.length)}.`,
      type: 'Monthly',
      lastGenerated: '1 March 2026',
    },
    {
      id: 'rpt-creator',
      title: 'Creator Roster Report',
      description: `${v3Creators.length} creators on roster. ${v3Creators.filter(c => c.tier === 'super').length} super creatives, ${v3Creators.filter(c => c.tier === 'rising').length} rising. Average reliability score: ${(v3Creators.reduce((a, c) => a + c.reliability, 0) / v3Creators.length).toFixed(1)}.`,
      type: 'Monthly',
      lastGenerated: '1 March 2026',
    },
    {
      id: 'rpt-financial',
      title: 'Financial Overview',
      description: `Total pipeline value: ${formatNairaV3(v3Projects.reduce((a, p) => a + p.estimatedValue, 0))}. Retainer projects: ${formatNairaV3(v3Projects.filter(p => p.engagement === 'retainer').reduce((a, p) => a + p.estimatedValue, 0))}. Direct: ${formatNairaV3(v3Projects.filter(p => p.engagement === 'direct').reduce((a, p) => a + p.estimatedValue, 0))}.`,
      type: 'Monthly',
      lastGenerated: '1 March 2026',
    },
    {
      id: 'rpt-delivery',
      title: 'Delivery Status Report',
      description: `${v3Projects.filter(p => p.stage === 'deliver').length} projects in delivery. ${approvedDeliverables} of ${deliverableRows.length} deliverables approved and ready to feed final campaign reports.`,
      type: 'Weekly',
      lastGenerated: '14 March 2026',
    },
  ];

  return (
    <div data-testid="v3-admin-reports">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">REPORTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Reports</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Generated business reports and summaries.</p>

      <div className="space-y-3">
        {reports.map(rpt => (
          <div key={rpt.id} className="v3-card p-5 hover:border-[#D4CDBF] transition-colors" data-testid={`report-${rpt.id}`}>
            <div className="flex items-start gap-4">
              <Layers className="w-4 h-4 text-[#1F4A3A] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[14px] font-medium text-[#1A1A1A]">{rpt.title}</h3>
                  <span className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">{rpt.type}</span>
                </div>
                <p className="text-[12px] text-[#5C5C5C] leading-relaxed">{rpt.description}</p>
                <p className="text-[10px] text-[#8A8A8A] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Last generated: {rpt.lastGenerated}</p>
              </div>
              <button className="v3-btn-secondary text-[10px] py-1.5 px-3 flex-shrink-0">
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="v3-card p-5 mt-6" data-testid="report-deliverables-feed">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-[#1F4A3A]" />
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Deliverables Feed Into Final Report</h3>
        </div>
        <div className="overflow-hidden rounded border border-[#E8E4DB]">
          <table className="w-full">
            <thead className="bg-[#FAFAF7]">
              <tr>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Project</th>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Brand</th>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Deliverable</th>
                <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliverableRows.map(({ project, deliverable }) => {
                const brand = getBrand(project.brandId);
                return (
                  <tr key={`${project.id}-${deliverable.id}`} className="border-t border-[#F4F2EC]">
                    <td className="p-3 text-[12px] text-[#1A1A1A]">{project.title}</td>
                    <td className="p-3 text-[12px] text-[#5C5C5C]">{brand?.company}</td>
                    <td className="p-3 text-[12px] text-[#5C5C5C]">{deliverable.title}</td>
                    <td className="p-3 text-right">
                      <span className={`text-[10px] px-2 py-0.5 rounded ${deliverable.status === 'approved' ? 'text-[#1F4A3A] bg-[#DDE7E2]' : 'text-[#C49B5F] bg-[#C49B5F12]'}`}>{deliverable.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default V3AdminReports;
