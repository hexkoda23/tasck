import React, { useState, useEffect } from 'react';
import { formatNairaV3 } from '../../../lib/v3data';
import { v3ListBusinessCases } from '../../../lib/v3api';
import { Receipt, TrendingUp, Calculator, Shield, Loader2 } from 'lucide-react';

const V3AdminFees = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    v3ListBusinessCases({})
      .then((data) => {
        setProjects(Array.isArray(data) ? data : data?.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]"
        data-testid="v3-admin-fees"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading fee data…</span>
      </div>
    );
  }

  // Derived metrics — using API field names (snake_case)
  const retainerProjects = projects.filter((p) => p.engagement_type === 'retainer');
  const directProjects = projects.filter((p) => p.engagement_type === 'direct');

  const retainerFees = retainerProjects.reduce(
    (a, p) => a + Math.round((p.estimated_value || 0) * 0.15),
    0
  );
  const directFees = directProjects.reduce(
    (a, p) => a + Math.round((p.estimated_value || 0) * 0.12),
    0
  );
  const totalFees = retainerFees + directFees;
  const strategyDevFees = retainerProjects
    .filter((p) => ['plan', 'deliver', 'closed'].includes(p.stage))
    .reduce((a, p) => a + Math.round((p.estimated_value || 0) * 0.15), 0);
  const deliveredFees = projects
    .filter((p) => p.stage === 'deliver')
    .reduce(
      (a, p) =>
        a +
        Math.round(
          (p.estimated_value || 0) * (p.engagement_type === 'retainer' ? 0.15 : 0.12)
        ),
      0
    );
  const pendingFees = totalFees - deliveredFees;

  const retainerTotalValue = retainerProjects.reduce(
    (a, p) => a + (p.estimated_value || 0),
    0
  );
  const directTotalValue = directProjects.reduce(
    (a, p) => a + (p.estimated_value || 0),
    0
  );

  return (
    <div data-testid="v3-admin-fees">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">FEES</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
        Fee Structure
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-8">
        TASCK management fee schedules and projections.
      </p>

      {projects.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <Receipt className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No projects yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Fee projections will appear once business cases are created.
          </p>
        </div>
      ) : (
        <>
          {/* Top summary */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div
              className="rounded-xl p-5 border border-[#173D30]"
              style={{ background: '#1F4A3A' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                <p className="text-[11px] text-white/50 uppercase tracking-wider">
                  Total Est. Fees
                </p>
              </div>
              <p
                className="text-2xl font-semibold text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(totalFees)}
              </p>
              <p className="text-[10px] text-white/40 mt-1">{projects.length} projects</p>
            </div>
            <div className="v3-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
                <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">
                  Strategy Dev Fees
                </p>
              </div>
              <p
                className="text-2xl font-semibold text-[#1A1A1A]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(strategyDevFees)}
              </p>
              <p className="text-[10px] text-[#8A8A8A] mt-1">Retainer projects only</p>
            </div>
            <div className="v3-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-[#567B3F]" strokeWidth={1.5} />
                <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Realized</p>
              </div>
              <p
                className="text-2xl font-semibold text-[#567B3F]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(deliveredFees)}
              </p>
              <p className="text-[10px] text-[#8A8A8A] mt-1">From delivered projects</p>
            </div>
            <div className="v3-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Calculator className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
                <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Pending</p>
              </div>
              <p
                className="text-2xl font-semibold text-[#C49B5F]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {formatNairaV3(Math.max(0, pendingFees))}
              </p>
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
              <p className="text-[12px] text-[#5C5C5C] mb-4 leading-relaxed">
                Strategic advisory + campaign management. Frame stays fee-free; the Strategy
                Development Fee is issued after creator briefing and tracked before Delivery
                drafting.
              </p>
              <div className="space-y-2 text-[12px] mb-4">
                {[
                  ['Strategy Development Fee', '15% of estimated value'],
                  ['Management fee', '15% of total budget'],
                  ['Payment terms', 'Net 14 days'],
                  ['Active projects', retainerProjects.length],
                  ['Total value', formatNairaV3(retainerTotalValue)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
                    <span className="text-[#8A8A8A]">{label}</span>
                    <span
                      className="text-[#1A1A1A] font-medium"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-[#F4F2EC]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#8A8A8A]">Estimated fee revenue</span>
                  <span
                    className="text-[14px] font-semibold text-[#1F4A3A]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatNairaV3(retainerFees)}
                  </span>
                </div>
              </div>
            </div>

            <div className="v3-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#9B9380]" />
                <h3 className="text-[14px] font-semibold text-[#1A1A1A]">Direct Engagement</h3>
                <span className="ml-auto v3-badge-direct">direct</span>
              </div>
              <p className="text-[12px] text-[#5C5C5C] mb-4 leading-relaxed">
                Single-project execution with a one-time management fee. Simpler structure — no
                Strategy Development Fee phase. Best for brands with clear briefs and pre-selected
                creators.
              </p>
              <div className="space-y-2 text-[12px] mb-4">
                {[
                  ['Strategy Development Fee', 'Not applicable'],
                  ['Management fee', '12% of total budget'],
                  ['Payment terms', 'Net 21 days'],
                  ['Active projects', directProjects.length],
                  ['Total value', formatNairaV3(directTotalValue)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-[#F4F2EC]">
                    <span className="text-[#8A8A8A]">{label}</span>
                    <span
                      className={
                        label === 'Strategy Development Fee'
                          ? 'text-[#8A8A8A] italic'
                          : 'text-[#1A1A1A] font-medium'
                      }
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-lg bg-[#F4F2EC]">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[#8A8A8A]">Estimated fee revenue</span>
                  <span
                    className="text-[14px] font-semibold text-[#1F4A3A]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatNairaV3(directFees)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Per-project breakdown */}
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
                {projects.map((proj) => {
                  const pid = proj.id || proj._id;
                  const rate = proj.engagement_type === 'retainer' ? 0.15 : 0.12;
                  const fee = Math.round((proj.estimated_value || 0) * rate);
                  const isDelivered = proj.stage === 'deliver';
                  return (
                    <tr
                      key={pid}
                      className="border-b border-[#F4F2EC] last:border-0 hover:bg-[#FAFAF7] transition-colors"
                    >
                      <td className="p-3">
                        <p className="text-[12px] text-[#1A1A1A]">{proj.title}</p>
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            proj.engagement_type === 'retainer'
                              ? 'v3-badge-retainer'
                              : 'v3-badge-direct'
                          }
                        >
                          {proj.engagement_type || 'direct'}
                        </span>
                      </td>
                      <td
                        className="p-3 text-right text-[12px] text-[#8A8A8A]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {formatNairaV3(proj.estimated_value || 0)}
                      </td>
                      <td
                        className="p-3 text-right text-[12px] text-[#8A8A8A]"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {rate * 100}%
                      </td>
                      <td
                        className="p-3 text-right text-[13px] text-[#1F4A3A] font-medium"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {formatNairaV3(fee)}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded ${
                            isDelivered
                              ? 'text-[#1F4A3A] bg-[#DDE7E2]'
                              : 'text-[#8A8A8A] bg-[#F4F2EC]'
                          }`}
                        >
                          {isDelivered ? 'Realized' : 'Projected'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E8E4DB]">
                  <td colSpan="4" className="p-3 text-[12px] font-semibold text-[#1A1A1A]">
                    Total
                  </td>
                  <td
                    className="p-3 text-right text-[14px] font-semibold text-[#1F4A3A]"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatNairaV3(totalFees)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default V3AdminFees;
