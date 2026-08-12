import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSuperCreatives, getProjects } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import DetailPopup from '../../components/shared/DetailPopup';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { FolderOpen, Users, Star, Target, Sparkles, ArrowRight, Eye, TrendingUp, DollarSign, CheckCircle, BarChart3, ChevronRight } from 'lucide-react';

const campaignData = [
  { id: 'C-001', name: 'Pepsi x DMW - Street Vibes', artist: 'Davido', status: 'Active', budget: 65000000, spent: 42000000, progress: 62, tasks: '54/87', impressions: '12.4M', engagement: '8.2%' },
  { id: 'C-002', name: 'Don Jazzy x Cadbury Social', artist: 'Don Jazzy', status: 'Active', budget: 8200000, spent: 3700000, progress: 45, tasks: '6/14', impressions: '3.1M', engagement: '6.7%' },
  { id: 'C-003', name: 'Rema x Boomplay Exclusive', artist: 'Rema', status: 'Active', budget: 12000000, spent: 3600000, progress: 30, tasks: '5/18', impressions: '1.8M', engagement: '11.2%' },
  { id: 'C-004', name: 'Wizkid x Lagos Fashion Week', artist: 'Wizkid', status: 'Completed', budget: 28000000, spent: 27500000, progress: 100, tasks: '42/42', impressions: '18.7M', engagement: '7.9%' }
];

const deliverables = [
  { id: 'DEL-001', title: 'TV Commercial - 30s Cut', campaign: 'Pepsi x DMW', status: 'In Review', submitted: '2h ago', type: 'Video' },
  { id: 'DEL-002', title: 'Social Media Pack - Instagram', campaign: 'Cadbury Social', status: 'Approved', submitted: '1d ago', type: 'Creative' },
  { id: 'DEL-003', title: 'Billboard Artwork - Lekki', campaign: 'Pepsi x DMW', status: 'Revision Needed', submitted: '2d ago', type: 'Print' },
  { id: 'DEL-004', title: 'Boomplay Playlist Artwork', campaign: 'Rema x Boomplay', status: 'Pending', submitted: '3d ago', type: 'Digital' }
];

const talentPool = [
  { name: 'Mavin Records', artist: 'Don Jazzy', genre: 'Afrobeats', match: 95, rating: 4.9, projects: 8, reason: 'Youth crossover appeal. Previous alcohol brand work.' },
  { name: 'Spaceship', artist: 'Burna Boy', genre: 'Afro-fusion', match: 91, rating: 4.8, projects: 5, reason: 'Rising female voice. Aspirational audience.' },
  { name: 'DMW', artist: 'Davido', genre: 'Afropop', match: 87, rating: 4.7, projects: 12, reason: 'Street culture credibility. Lagos nightlife.' },
  { name: 'Rema Team', artist: 'Rema', genre: 'Afrorave', match: 84, rating: 4.9, projects: 3, reason: 'Gen-Z appeal. Global streaming numbers.' }
];

export const BrandOverview = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignsRes, talentRes] = await Promise.all([getProjects(), getSuperCreatives()]);
        setCampaigns(campaignsRes.data.filter(p => p.brand_name).slice(0, 3));
        setRecommendations(talentRes.data.slice(0, 3).map((t, i) => ({ ...t, match: 95 - i * 4, reason: talentPool[i]?.reason || '' })));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="brand-overview">
      <WelcomeBanner role="brand" userName={user?.name || 'Adenike'}
        subtitle="3 active campaigns performing above benchmark. 1 partnership renewal due this month."
        stats={[{ label: 'Spend YTD', value: '₦73M' }, { label: 'Artists', value: '6' }, { label: 'Avg ROI', value: '287%' }, { label: 'Impressions', value: '36M' }]}
      />

      {/* Row 1: Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {loading ? Array(7).fill(0).map((_, i) => <MetricCardSkeleton key={i} />) : (<>
          <MetricCard title="Active Campaigns" value="3" subtitle="1 completing soon" icon={<FolderOpen className="w-3.5 h-3.5" />} />
          <MetricCard title="Total Spend YTD" value="₦73M" subtitle="Budget: ₦120M (61%)" icon={<DollarSign className="w-3.5 h-3.5" />} />
          <MetricCard title="Artists Engaged" value="6" subtitle="2 new this month" icon={<Users className="w-3.5 h-3.5" />} />
          <MetricCard title="Avg Campaign ROI" value="287%" subtitle="Industry: 180%" change="+52%" icon={<TrendingUp className="w-3.5 h-3.5" />} />
          <MetricCard title="Total Impressions" value="36M" subtitle="Across all campaigns" icon={<Eye className="w-3.5 h-3.5" />} />
          <MetricCard title="Avg Engagement" value="8.5%" subtitle="Above 6% target" change="+2.1%" icon={<BarChart3 className="w-3.5 h-3.5" />} />
          <MetricCard title="Pending Approvals" value="4" subtitle="2 urgent" icon={<CheckCircle className="w-3.5 h-3.5" />} />
        </>)}
      </div>

      {/* Row 2: Campaigns Table */}
      <div className="dashboard-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#0F172A]">Campaign Performance</h2>
          <button className="text-[#2F55FF] text-[10px] hover:underline">View All Campaigns</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-[#F1F5F9]">
              <th className="text-left py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Campaign</th>
              <th className="text-left py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Status</th>
              <th className="text-right py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Budget</th>
              <th className="text-right py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Spent</th>
              <th className="text-center py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Progress</th>
              <th className="text-right py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Impressions</th>
              <th className="text-right py-2 text-[10px] text-[#94A3B8] font-medium uppercase">Engagement</th>
            </tr></thead>
            <tbody>
              {campaignData.map(c => (
                <tr key={c.id} onClick={() => setPopup({ type: 'campaign', data: c })} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] cursor-pointer transition-colors" data-testid={`campaign-row-${c.id}`}>
                  <td className="py-2.5"><div><p className="text-xs font-medium text-[#0F172A]">{c.name}</p><p className="text-[10px] text-[#94A3B8]">{c.artist}</p></div></td>
                  <td className="py-2.5"><StatusBadge status={c.status.toLowerCase()} /></td>
                  <td className="py-2.5 text-right font-mono text-[#0F172A]">{formatNaira(c.budget, { compact: true })}</td>
                  <td className="py-2.5 text-right font-mono text-[#64748B]">{formatNaira(c.spent, { compact: true })}</td>
                  <td className="py-2.5"><div className="flex items-center gap-2 justify-center"><div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full"><div className="h-full bg-[#2F55FF] rounded-full" style={{ width: `${c.progress}%` }} /></div><span className="text-[10px] text-[#64748B]">{c.progress}%</span></div></td>
                  <td className="py-2.5 text-right text-[#0F172A]">{c.impressions}</td>
                  <td className="py-2.5 text-right text-[#22C55E]">{c.engagement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Deliverables + Talent + Spend */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Deliverables */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Deliverables</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {deliverables.map(d => (
              <div key={d.id} onClick={() => setPopup({ type: 'deliverable', data: d })} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#0F172A] truncate">{d.title}</p>
                  <p className="text-[10px] text-[#94A3B8]">{d.campaign} &bull; {d.submitted}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${d.status === 'Approved' ? 'bg-[#ECFDF5] text-[#059669]' : d.status === 'In Review' ? 'bg-[#EEF2FF] text-[#2F55FF]' : d.status === 'Revision Needed' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Talent */}
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">Recommended Talent</h2>
          </div>
          <div className="space-y-2">
            {talentPool.map((t, i) => (
              <div key={i} onClick={() => setPopup({ type: 'talent', data: t })} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <Avatar name={t.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-[#0F172A]">{t.name}</p><span className="text-[9px] text-[#22C55E] font-mono">{t.match}%</span></div>
                  <p className="text-[10px] text-[#94A3B8]">{t.artist} &bull; {t.genre}</p>
                </div>
                <div className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5 text-[#F59E0B]" /><span className="text-[10px] text-[#0F172A]">{t.rating}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* Spend Breakdown */}
        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Spend Breakdown</h2>
          <div className="space-y-2.5">
            {[
              { cat: 'Talent Fees', amount: '₦38.5M', pct: 53, color: '#2F55FF' },
              { cat: 'Production', amount: '₦18.2M', pct: 25, color: '#8B5CF6' },
              { cat: 'Media Buying', amount: '₦9.8M', pct: 13, color: '#22C55E' },
              { cat: 'Agency Commission', amount: '₦4.5M', pct: 6, color: '#F59E0B' },
              { cat: 'Other', amount: '₦2M', pct: 3, color: '#CBD5E1' }
            ].map(s => (
              <div key={s.cat} onClick={() => setPopup({ type: 'spend', data: s })} className="cursor-pointer hover:bg-[#F8FAFC] p-1.5 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="text-xs text-[#475569]">{s.cat}</span></div>
                  <span className="text-xs font-mono text-[#0F172A]">{s.amount}</span>
                </div>
                <div className="h-1 bg-[#F1F5F9] rounded-full"><div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-[10px] text-[#94A3B8]">Total Spend YTD</span>
            <span className="text-sm font-bold text-[#0F172A] font-mono">₦73M</span>
          </div>
        </div>
      </div>

      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'campaign' ? popup?.data?.name : popup?.type === 'deliverable' ? popup?.data?.title : popup?.type === 'talent' ? popup?.data?.name : popup?.type === 'spend' ? popup?.data?.cat : 'Details'}>
        {popup?.type === 'campaign' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Budget</p><p className="text-sm font-bold font-mono">{formatNaira(popup.data.budget)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Spent</p><p className="text-sm font-bold font-mono">{formatNaira(popup.data.spent)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Impressions</p><p className="text-sm font-bold">{popup.data.impressions}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Engagement</p><p className="text-sm font-bold text-[#22C55E]">{popup.data.engagement}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Tasks</p><p className="text-xs">{popup.data.tasks} completed</p></div>
            <button className="btn-primary text-xs w-full py-2">View Campaign</button>
          </div>
        )}
        {popup?.type === 'deliverable' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Type</p><p className="text-xs font-medium">{popup.data.type}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Status</p><p className="text-xs font-medium">{popup.data.status}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Campaign</p><p className="text-xs">{popup.data.campaign}</p></div>
            <button className="btn-primary text-xs w-full py-2">Review Deliverable</button>
          </div>
        )}
        {popup?.type === 'talent' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.name} size="md" /><div><p className="text-sm font-medium">{popup.data.name}</p><p className="text-xs text-[#94A3B8]">{popup.data.artist} &bull; {popup.data.genre}</p></div></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Match</p><p className="text-sm font-bold text-[#22C55E]">{popup.data.match}%</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Rating</p><p className="text-sm font-bold">{popup.data.rating}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Projects</p><p className="text-sm font-bold">{popup.data.projects}</p></div>
            </div>
            <p className="text-xs text-[#64748B]">{popup.data.reason}</p>
            <button className="btn-primary text-xs w-full py-2">Request Proposal</button>
          </div>
        )}
        {popup?.type === 'spend' && popup?.data && (
          <div className="space-y-3">
            <div className="bg-[#F8FAFC] rounded-lg p-4"><p className="text-[10px] text-[#94A3B8]">Amount</p><p className="text-lg font-bold font-mono">{popup.data.amount}</p><p className="text-xs text-[#94A3B8]">{popup.data.pct}% of total spend</p></div>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default BrandOverview;
