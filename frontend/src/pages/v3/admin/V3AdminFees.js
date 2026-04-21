import React from 'react';
import { v3Projects, formatNairaV3 } from '../../../lib/v3data';
import { Receipt, TrendingUp, Percent, Calculator, ArrowUpRight, Shield } from 'lucide-react';

const V3AdminFees = () => {
  const retainerProjects = v3Projects.filter(p => p.engagement === 'retainer');
  const directProjects = v3Projects.filter(p => p.engagement === 'direct');

  const retainerFees = retainerProjects.reduce((a, p) => a + Math.round(p.estimatedValue * 0.15), 0);
  const directFees = directProjects.reduce((a, p) => a + Math.round(p.estimatedValue * 0.12), 0);
  const totalFees = retainerFees + directFees;
  const consultancyFees = retainerProjects.filter(p => p.stage !== 'connect').reduce((a, p) => a + Math.round(p.estimatedValue * 0.15), 0);
  const deliveredFees = v3Projects.filter(p => p.stage === 'deliver').reduce((a, p) => a + Math.round(p.estimatedValue * (p.engagement === 'retainer' ? 0.15 : 0.12)), 0);
  const pendingFees = totalFees - deliveredFees;

  return (
    <div data-testid="v3-admin-fees">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">FEES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Fee Structure</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">TASCK management fee schedules and projections.</p>

      {/* Top summary — NOT using v3-card for dark card */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-5 border border-[#173D30]" style={{ background: '#1F4A3A' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-white/50" strokeWidth={1.5} />
            <p className="text-[11px] text-white/50 uppercase tracking-wider">Total Est. Fees</p>
          </div>
          <p className="text-2xl font-semibold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalFees)}</p>
          <p className="text-[10px] text-white/40 mt-1">{v3Projects.length} projects</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Consultancy Fees</p>
          </div>
          <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(consultancyFees)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">Retainer projects only</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-[#567B3F]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Realized</p>
          </div>
          <p className="text-2xl font-semibold text-[#567B3F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(deliveredFees)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">From delivered projects</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Pending</p>
          </div>
          <p className="text-2xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(pendingFees)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">In-progress projects</p>
        </div>
      </div>

      {/* Fee schedule cards */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#1F4A3A]" />
            <h3 className="text-[14px] font-semibold text-[#1A1A1A]">Retainer Engagement</h3>
            <span className="ml-auto v3-badge-retainer">retainer</span>
          </div>
          <p className="text-[12px] text-[#5C5C5C] mb-4 leading-relaxed">Strategic advisory + campaign management. Consultancy fee invoiced at Frame stage entry; project management fee invoiced at Plan stage approval.</p>
          <div className="space-y-2 text-[12px] mb-4">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Consultancy fee</span>
              <span className="text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>15% of estimated value</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Management fee</span>
              <span className="text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>15% of total budget</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Payment terms</span>
              <span className="text-[#1A1A1A]">Net 14 days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Active projects</span>
              <span className="text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{retainerProjects.length}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#8A8A8A]">Total value</span>
              <span className="text-[#1F4A3A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(retainerProjects.reduce((a, p) => a + p.estimatedValue, 0))}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F4F2EC]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#8A8A8A]">Estimated fee revenue</span>
              <span className="text-[14px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(retainerFees)}</span>
            </div>
          </div>
        </div>

        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-[#9B9380]" />
            <h3 className="text-[14px] font-semibold text-[#1A1A1A]">Direct Engagement</h3>
            <span className="ml-auto v3-badge-direct">direct</span>
          </div>
          <p className="text-[12px] text-[#5C5C5C] mb-4 leading-relaxed">Single-project execution with a one-time management fee. Simpler structure — no consultancy phase. Best for brands with clear briefs and pre-selected creators.</p>
          <div className="space-y-2 text-[12px] mb-4">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Consultancy fee</span>
              <span className="text-[#8A8A8A] italic">Not applicable</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Management fee</span>
              <span className="text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>12% of total budget</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Payment terms</span>
              <span className="text-[#1A1A1A]">Net 21 days</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
              <span className="text-[#8A8A8A]">Active projects</span>
              <span className="text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{directProjects.length}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-[#8A8A8A]">Total value</span>
              <span className="text-[#1F4A3A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(directProjects.reduce((a, p) => a + p.estimatedValue, 0))}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#F4F2EC]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-[#8A8A8A]">Estimated fee revenue</span>
              <span className="text-[14px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(directFees)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-project breakdown as table */}
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Project Fee Estimates</h2>
      <div className="v3-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E4DB]">
              <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Project</th>
              <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Model</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Value</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Rate</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Est. Fee</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {v3Projects.map(proj => {
              const rate = proj.engagement === 'retainer' ? 0.15 : 0.12;
              const fee = Math.round(proj.estimatedValue * rate);
              const isDelivered = proj.stage === 'deliver';
              return (
                <tr key={proj.id} className="border-b border-[#F4F2EC] last:border-0 hover:bg-[#FAFAF7] transition-colors">
                  <td className="p-3">
                    <p className="text-[12px] text-[#1A1A1A]">{proj.title}</p>
                  </td>
                  <td className="p-3">
                    <span className={`${proj.engagement === 'retainer' ? 'v3-badge-retainer' : 'v3-badge-direct'}`}>{proj.engagement}</span>
                  </td>
                  <td className="p-3 text-right text-[12px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</td>
                  <td className="p-3 text-right text-[12px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{(rate * 100)}%</td>
                  <td className="p-3 text-right text-[13px] text-[#1F4A3A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(fee)}</td>
                  <td className="p-3 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${isDelivered ? 'text-[#1F4A3A] bg-[#DDE7E2]' : 'text-[#8A8A8A] bg-[#F4F2EC]'}`}>
                      {isDelivered ? 'Realized' : 'Projected'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#E8E4DB]">
              <td colSpan="4" className="p-3 text-[12px] font-semibold text-[#1A1A1A]">Total</td>
              <td className="p-3 text-right text-[14px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalFees)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default V3AdminFees;
