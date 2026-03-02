import React, { useState, useEffect } from 'react';
import { getOpenOpportunities } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { Target, Search, Filter, Clock, MapPin, Sparkles, ArrowRight, Bookmark, Check } from 'lucide-react';

export const CreativeOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        const response = await getOpenOpportunities();
        // Add some mock data for more opportunities
        const mockOpps = [
          { id: 'opp-m1', role: 'Tour Photographer', project_title: 'Tems "Born In The Wild" World Tour', budget: 1800000, client_name: 'Leading Vibes (Tems)', deadline: '2026-03-08', duration: '4 weeks', skills_required: ['Concert', 'Travel', 'Editorial'], match: 88 },
          { id: 'opp-m2', role: 'Visual Content Series', project_title: 'Rema x Pepsi Campaign', budget: 1400000, client_name: 'Pepsi Nigeria', deadline: '2026-03-15', duration: '2 months', skills_required: ['Photography', 'Creative Direction'], match: 82 },
          { id: 'opp-m3', role: 'Event Photographer', project_title: 'GTBank Fashion Weekend 2026', budget: 950000, client_name: 'GTBank', deadline: '2026-03-20', duration: '3 days + post', skills_required: ['Fashion', 'Event'], match: 79 },
          { id: 'opp-m4', role: 'Studio Photographer', project_title: 'Ayra Starr Album Visuals', budget: 1200000, client_name: 'Mavin Talent', deadline: '2026-03-25', duration: '2 weeks', skills_required: ['Studio', 'Editorial', 'Portrait'], match: 85 }
        ];
        setOpportunities([...response.data, ...mockOpps]);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOpportunities();
  }, []);

  const getMatchBadge = (match) => {
    if (match >= 90) return { label: 'HOT MATCH', color: 'bg-[#FF4757]/20 text-[#FF4757]' };
    if (match >= 85) return { label: 'GREAT FIT', color: 'bg-[#6BFF9A]/20 text-[#6BFF9A]' };
    if (match >= 80) return { label: 'GOOD FIT', color: 'bg-[#2F55FF]/20 text-[#2F55FF]' };
    return { label: 'MATCH', color: 'bg-white/10 text-white/60' };
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="creative-opportunities">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Opportunities</h1>
          <p className="text-white/50 text-sm">AI-matched gigs based on your skills and portfolio</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6BFF9A]">
          <Sparkles className="w-4 h-4" />
          {opportunities.length} opportunities match your profile
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Search opportunities..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
        >
          <option value="all">All Opportunities</option>
          <option value="photography">Photography</option>
          <option value="video">Videography</option>
          <option value="design">Design</option>
        </select>
        <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none">
          <option>Sort by: Match Score</option>
          <option>Sort by: Budget (High)</option>
          <option>Sort by: Deadline</option>
        </select>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="skeleton h-48 rounded-lg"></div>)
        ) : (
          opportunities.map((opp, index) => {
            const match = opp.match || (95 - index * 3);
            const badge = getMatchBadge(match);
            return (
              <div key={opp.id} className="dashboard-card p-6 hover:border-[#2F55FF]/30 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-[#2F55FF]/20 flex items-center justify-center">
                      <Target className="w-6 h-6 text-[#2F55FF]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                          {badge.label} ({match}%)
                        </span>
                        {index === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFA502]/20 text-[#FFA502]">NEW</span>}
                      </div>
                      <h3 className="text-white font-semibold text-lg">{opp.role}</h3>
                      <p className="text-white/50">{opp.project_title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-mono text-[#6BFF9A]">{formatNaira(opp.budget, { compact: true })}</p>
                    <p className="text-white/40 text-sm">{opp.duration || '6 weeks'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 mb-4 text-sm text-white/50">
                  <span className="flex items-center gap-1">
                    <Avatar name={opp.client_name} size="sm" />
                    {opp.client_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Apply by: {opp.deadline}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Lagos, Nigeria
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {(opp.skills_required || ['Photography', 'Editorial']).map((skill) => (
                    <span key={skill} className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/60">
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <button className="text-white/40 hover:text-white p-2 rounded-lg hover:bg-white/5">
                      <Bookmark className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button className="btn-ghost text-sm">View Details</button>
                    <button className="btn-primary text-sm flex items-center gap-2">
                      Apply Now <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CreativeOpportunities;
