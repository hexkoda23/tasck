import React from 'react';
import { v3Projects, v3Stages, v3Brands, v3Creators, v3RMs, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Layers, Download } from 'lucide-react';

const V3AdminReports = () => {
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
      description: `${v3Projects.filter(p => p.stage === 'deliver').length} projects in delivery. MTN × Burna Boy near closure (all deliverables approved). Star Lager × Ayra Starr at 37.5% completion (3/8 milestones).`,
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
    </div>
  );
};

export default V3AdminReports;
