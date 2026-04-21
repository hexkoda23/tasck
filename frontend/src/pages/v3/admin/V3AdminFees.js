import React from 'react';
import { v3Projects, formatNairaV3 } from '../../../lib/v3data';
import { Receipt, Info } from 'lucide-react';

const V3AdminFees = () => {
  const retainerProjects = v3Projects.filter(p => p.engagement === 'retainer');
  const directProjects = v3Projects.filter(p => p.engagement === 'direct');

  const feeSchedule = [
    {
      model: 'Retainer',
      description: 'Strategic advisory + campaign management. Consultancy fee paid at Frame; project fee at Plan.',
      consultancyRate: '15% of estimated value',
      managementRate: '15% of total budget',
      projects: retainerProjects.length,
      totalValue: retainerProjects.reduce((a, p) => a + p.estimatedValue, 0),
    },
    {
      model: 'Direct',
      description: 'Single-project execution. One-time management fee at Plan stage.',
      consultancyRate: 'N/A',
      managementRate: '12% of total budget',
      projects: directProjects.length,
      totalValue: directProjects.reduce((a, p) => a + p.estimatedValue, 0),
    },
  ];

  const estimatedFees = Math.round(
    retainerProjects.reduce((a, p) => a + p.estimatedValue * 0.15, 0) +
    directProjects.reduce((a, p) => a + p.estimatedValue * 0.12, 0)
  );

  return (
    <div data-testid="v3-admin-fees">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">FEES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Fee Structure</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">TASCK management fee schedules and projections.</p>

      {/* Summary */}
      <div className="v3-card p-5 mb-8 bg-[#1F4A3A] text-white">
        <div className="flex items-center gap-2 mb-2">
          <Receipt className="w-4 h-4 opacity-60" />
          <span className="text-[11px] uppercase tracking-wider opacity-60">Estimated Total Fees (Current Pipeline)</span>
        </div>
        <p className="text-3xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(estimatedFees)}</p>
        <p className="text-[12px] opacity-60 mt-1">Across {v3Projects.length} active projects</p>
      </div>

      {/* Fee schedule */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {feeSchedule.map((schedule, i) => (
          <div key={i} className="v3-card p-5">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-2">{schedule.model} Engagement</h3>
            <p className="text-[12px] text-[#5C5C5C] mb-4">{schedule.description}</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between"><span className="text-[#8A8A8A]">Consultancy fee</span><span className="text-[#1A1A1A]">{schedule.consultancyRate}</span></div>
              <div className="flex justify-between"><span className="text-[#8A8A8A]">Management fee</span><span className="text-[#1A1A1A]">{schedule.managementRate}</span></div>
              <div className="flex justify-between pt-2 border-t border-[#E8E4DB]"><span className="text-[#8A8A8A]">Active projects</span><span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{schedule.projects}</span></div>
              <div className="flex justify-between"><span className="text-[#8A8A8A]">Total value</span><span className="font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(schedule.totalValue)}</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-project breakdown */}
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Project Fee Estimates</h2>
      <div className="space-y-2">
        {v3Projects.map(proj => {
          const rate = proj.engagement === 'retainer' ? 0.15 : 0.12;
          const fee = Math.round(proj.estimatedValue * rate);
          return (
            <div key={proj.id} className="v3-card p-4 flex items-center gap-4" data-testid={`fee-${proj.id}`}>
              <div className="flex-1">
                <p className="text-[13px] text-[#1A1A1A]">{proj.title}</p>
                <p className="text-[10px] text-[#8A8A8A]">{proj.engagement} &middot; {(rate * 100)}% rate</p>
              </div>
              <span className="text-[12px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>of {formatNairaV3(proj.estimatedValue)}</span>
              <span className="text-[13px] font-medium text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(fee)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default V3AdminFees;
