import React, { useState, useEffect } from 'react';
import { v3Stages, formatNairaV3 } from '../../../lib/v3data';
import { v3ListBusinessCases, v3ListContracts } from '../../../lib/v3api';
import { FileText, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

const V3AdminContracts = () => {
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
        data-testid="v3-admin-contracts"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading contracts…</span>
      </div>
    );
  }

  const contractProjects = projects.filter(
    (p) => p.stage === 'plan' || p.stage === 'deliver'
  );
  const preContractProjects = projects.filter(
    (p) => p.stage === 'connect' || p.stage === 'frame'
  );

  const getLabel = (proj) => {
    const brand = proj.brand_name || proj.brand_id?.slice(0, 8) || 'Brand';
    const creator = proj.creator_name;
    return `${brand}${creator ? ` × ${creator}` : ''}`;
  };

  return (
    <div data-testid="v3-admin-contracts">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CONTRACTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>
        Contracts
      </h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Track contract status across active projects.</p>

      {contractProjects.length === 0 && preContractProjects.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <FileText className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">No contracts yet.</p>
          <p className="text-[11px] text-[#8A8A8A]">
            Contracts become available once projects reach the Plan or Deliver stage.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {contractProjects.map((proj) => {
              const pid = proj.id || proj._id;
              const isExecuted = proj.stage === 'deliver';
              return (
                <div
                  key={pid}
                  className="v3-card p-4 flex items-center gap-4"
                  data-testid={`contract-${pid}`}
                >
                  {isExecuted ? (
                    <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1A1A1A]">{getLabel(proj)}</p>
                    <p className="text-[11px] text-[#8A8A8A]">
                      {proj.title} &middot;{' '}
                      {proj.engagement_type || 'engagement'}
                    </p>
                  </div>
                  {proj.estimated_value > 0 && (
                    <span
                      className="text-[11px]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {formatNairaV3(proj.estimated_value)}
                    </span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      isExecuted
                        ? 'text-[#1F4A3A] bg-[#DDE7E2]'
                        : 'text-[#C49B5F] bg-[#C49B5F12]'
                    }`}
                  >
                    {isExecuted ? 'Executed' : 'Pending execution'}
                  </span>
                </div>
              );
            })}
          </div>

          {preContractProjects.length > 0 && (
            <div className="mt-8">
              <h3 className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">
                Pre-contract (Connect / Frame)
              </h3>
              <div className="space-y-2">
                {preContractProjects.map((proj) => {
                  const pid = proj.id || proj._id;
                  const stageLabel = v3Stages.find((s) => s.key === proj.stage)?.label || proj.stage;
                  return (
                    <div
                      key={pid}
                      className="v3-card p-4 flex items-center gap-4 opacity-60"
                    >
                      <AlertCircle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-[13px] text-[#1A1A1A]">
                          {proj.brand_name || 'Brand'} — {proj.title}
                        </p>
                        <p className="text-[10px] text-[#8A8A8A]">
                          {stageLabel} stage — contract not yet applicable
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default V3AdminContracts;
