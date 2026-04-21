import React from 'react';
import { v3Projects, v3Stages, getBrand, getCreator, formatNairaV3 } from '../../../lib/v3data';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const V3AdminContracts = () => {
  const contractProjects = v3Projects.filter(p => p.stage === 'plan' || p.stage === 'deliver');

  return (
    <div data-testid="v3-admin-contracts">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CONTRACTS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Contracts</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Track contract status across active projects.</p>

      <div className="space-y-2">
        {contractProjects.map(proj => {
          const brand = getBrand(proj.brandId);
          const creator = getCreator(proj.creatorId);
          const stage = v3Stages.find(s => s.key === proj.stage);
          const isExecuted = proj.stage === 'deliver';

          return (
            <div key={proj.id} className="v3-card p-4 flex items-center gap-4" data-testid={`contract-${proj.id}`}>
              {isExecuted ? <CheckCircle className="w-4 h-4 text-[#1F4A3A] flex-shrink-0" /> : <Clock className="w-4 h-4 text-[#C49B5F] flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#1A1A1A]">{brand?.company?.split(' ')[0]} {creator ? `× ${creator.name}` : ''}</p>
                <p className="text-[11px] text-[#8A8A8A]">{proj.title} &middot; {proj.engagement} engagement</p>
              </div>
              <span className="text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.estimatedValue)}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${isExecuted ? 'text-[#1F4A3A] bg-[#DDE7E2]' : 'text-[#C49B5F] bg-[#C49B5F12]'}`}>
                {isExecuted ? 'Executed' : 'Pending execution'}
              </span>
            </div>
          );
        })}
      </div>

      {v3Projects.filter(p => p.stage === 'connect' || p.stage === 'frame').length > 0 && (
        <div className="mt-8">
          <h3 className="text-[12px] font-semibold text-[#8A8A8A] uppercase tracking-wider mb-3">Pre-contract (Connect/Frame)</h3>
          <div className="space-y-2">
            {v3Projects.filter(p => p.stage === 'connect' || p.stage === 'frame').map(proj => {
              const brand = getBrand(proj.brandId);
              const stage = v3Stages.find(s => s.key === proj.stage);
              return (
                <div key={proj.id} className="v3-card p-4 flex items-center gap-4 opacity-60">
                  <AlertCircle className="w-4 h-4 text-[#D4CDBF] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] text-[#1A1A1A]">{brand?.company?.split(' ')[0]} — {proj.title}</p>
                    <p className="text-[10px] text-[#8A8A8A]">{stage?.label} stage — contract not yet applicable</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default V3AdminContracts;
