import React from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Creators, getProjectsForCreator } from '../../../lib/v3data';
import { Search, Star } from 'lucide-react';

const V3AdminCreators = () => {
  const navigate = useNavigate();
  return (
    <div data-testid="v3-admin-creators">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">ROSTER</p>
      <h1 className="v3-heading text-2xl mb-6" style={{ fontFamily: "'Fraunces', serif" }}>Creators</h1>
      <div className="grid grid-cols-2 gap-3">
        {v3Creators.map(c => {
          const projects = getProjectsForCreator(c.id);
          return (
            <button key={c.id} onClick={() => navigate(`/v3/admin/creators/${c.id}`)}
              className="v3-card p-4 text-left hover:border-[#D4CDBF] transition-colors" data-testid={`creator-${c.id}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#DDE7E2] flex items-center justify-center text-[12px] font-bold text-[#1F4A3A]">{c.name[0]}</div>
                <div>
                  <p className="text-[14px] font-medium text-[#1A1A1A]">{c.name}</p>
                  <p className="text-[11px] text-[#8A8A8A]">{c.genre} &middot; {c.location}</p>
                </div>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded ${c.tier === 'super' ? 'bg-[#1F4A3A] text-white' : 'bg-[#F4F2EC] text-[#8A8A8A]'}`}>{c.tier === 'super' ? 'Super Creative' : 'Rising'}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div><p className="text-[10px] text-[#8A8A8A]">Reliability</p><p className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.reliability}</p></div>
                <div><p className="text-[10px] text-[#8A8A8A]">On-time</p><p className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.onTimeRate}%</p></div>
                <div><p className="text-[10px] text-[#8A8A8A]">Satisfaction</p><p className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.brandSatisfaction}</p></div>
                <div><p className="text-[10px] text-[#8A8A8A]">Projects</p><p className="text-[12px] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{projects.length}</p></div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default V3AdminCreators;
