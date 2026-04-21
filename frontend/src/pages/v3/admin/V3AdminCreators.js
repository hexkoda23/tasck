import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Creators, getProjectsForCreator, formatNairaV3 } from '../../../lib/v3data';
import { Search, ArrowUpDown, Star, TrendingUp } from 'lucide-react';

const V3AdminCreators = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fitScore');

  const filtered = v3Creators
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.genre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'fitScore') return b.fitScore - a.fitScore;
      if (sortBy === 'reliability') return b.reliability - a.reliability;
      return a.name.localeCompare(b.name);
    });

  const tierColor = (tier) => tier === 'super' ? { bg: '#1F4A3A', text: 'white' } : { bg: '#F4F2EC', text: '#9B9380' };
  const scoreGrade = (score) => score >= 9 ? 'A+' : score >= 8.5 ? 'A' : score >= 8 ? 'B+' : score >= 7 ? 'B' : 'C';

  return (
    <div data-testid="v3-admin-creators">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">ROSTER</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Creators</h1>
          <p className="text-[#8A8A8A] text-sm">{v3Creators.length} creators &middot; {v3Creators.filter(c => c.tier === 'super').length} super &middot; {v3Creators.filter(c => c.tier === 'rising').length} rising</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search creators or genres..."
            className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors"
            data-testid="creator-search" />
        </div>
        <button onClick={() => setSortBy(sortBy === 'fitScore' ? 'reliability' : sortBy === 'reliability' ? 'name' : 'fitScore')}
          className="v3-btn-secondary" data-testid="creator-sort">
          <ArrowUpDown className="w-3.5 h-3.5" /> {sortBy === 'fitScore' ? 'By Fit' : sortBy === 'reliability' ? 'By Reliability' : 'A–Z'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(c => {
          const projects = getProjectsForCreator(c.id);
          const tc = tierColor(c.tier);
          return (
            <button key={c.id} onClick={() => navigate(`/v3/admin/creators/${c.id}`)}
              className="v3-card p-5 text-left hover:border-[#D4CDBF] transition-all hover:shadow-sm group" data-testid={`creator-${c.id}`}>
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background: tc.bg === '#1F4A3A' ? '#DDE7E2' : '#F4F2EC', color: tc.bg === '#1F4A3A' ? '#1F4A3A' : '#9B9380' }}>
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{c.name}</h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: tc.bg, color: tc.text }}>{c.tier === 'super' ? 'Super Creative' : 'Rising'}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5">{c.genre} &middot; {c.location}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#F4F2EC] flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[14px] font-bold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.fitScore}</span>
                  <span className="text-[7px] text-[#8A8A8A] uppercase">Fit</span>
                </div>
              </div>

              {/* Bio snippet */}
              <p className="text-[11px] text-[#8A8A8A] leading-relaxed mb-4 line-clamp-2">{c.bio}</p>

              {/* Metrics row */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[
                  { label: 'Reliability', value: c.reliability, grade: scoreGrade(c.reliability) },
                  { label: 'On-time', value: `${c.onTimeRate}%`, grade: null },
                  { label: 'Satisfaction', value: c.brandSatisfaction, grade: scoreGrade(c.brandSatisfaction) },
                  { label: 'Repeats', value: c.repeatBrandCount, grade: null },
                  { label: 'Projects', value: projects.length, grade: null },
                ].map((m, i) => (
                  <div key={i} className="text-center p-1.5 rounded-md bg-[#FAFAF7]">
                    <p className="text-[13px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</p>
                    <p className="text-[8px] text-[#8A8A8A] uppercase tracking-wider mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Rate card + platforms */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F4F2EC]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#8A8A8A]">Rate:</span>
                  <span className="text-[11px] text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.rateCard}</span>
                </div>
                <div className="flex gap-1">
                  {c.platforms.slice(0, 3).map(p => (
                    <span key={p} className="text-[8px] text-[#8A8A8A] bg-[#F4F2EC] px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                  {c.platforms.length > 3 && (
                    <span className="text-[8px] text-[#8A8A8A] bg-[#F4F2EC] px-1.5 py-0.5 rounded">+{c.platforms.length - 3}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
export default V3AdminCreators;
