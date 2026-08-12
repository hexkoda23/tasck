import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSuperCreativeStats, getProjects, getWallet } from '../../lib/api';
import { formatNaira, formatRelativeTime } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import DetailPopup from '../../components/shared/DetailPopup';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { Wallet, FolderOpen, Target, ArrowUpRight, ArrowDownRight, Users, BarChart3, TrendingUp, Award, Clock, Star, ChevronRight } from 'lucide-react';

const teamMembers = [
  { name: 'Don Jazzy', role: 'Principal Artist', projects: 4, earnings: '₦18.5M', rating: 4.9, status: 'Active' },
  { name: 'Rema', role: 'Artist', projects: 3, earnings: '₦12.2M', rating: 4.9, status: 'Active' },
  { name: 'Ayra Starr', role: 'Artist', projects: 2, earnings: '₦6.8M', rating: 4.8, status: 'Active' },
  { name: 'Crayon', role: 'Artist', projects: 2, earnings: '₦4.1M', rating: 4.7, status: 'Onboarding' },
  { name: 'Boy Spyce', role: 'Artist', projects: 1, earnings: '₦2.3M', rating: 4.6, status: 'Onboarding' }
];

const hiringPipeline = [
  { role: 'Videographer - Rema Tour', applicants: 12, shortlisted: 4, budget: '₦1.5M', deadline: 'Mar 8' },
  { role: 'Photographer - Album Cover', applicants: 8, shortlisted: 2, budget: '₦800K', deadline: 'Mar 12' },
  { role: 'Stylist - Don Jazzy Campaign', applicants: 15, shortlisted: 5, budget: '₦1.2M', deadline: 'Mar 15' },
  { role: 'Sound Engineer - Studio Session', applicants: 6, shortlisted: 3, budget: '₦600K', deadline: 'Mar 10' }
];

const projectTimeline = [
  { name: 'Pepsi x DMW Campaign', status: 'In Progress', progress: 62, deadline: 'Apr 15', budget: '₦65M' },
  { name: 'Mavin All-Stars Concert', status: 'Planning', progress: 25, deadline: 'May 1', budget: '₦45M' },
  { name: 'Rema x Boomplay Exclusive', status: 'Active', progress: 40, deadline: 'Jun 15', budget: '₦12M' },
  { name: 'Don Jazzy x Cadbury Social', status: 'Active', progress: 45, deadline: 'Mar 30', budget: '₦8.2M' }
];

export const SuperCreativeOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, projectsRes, walletRes] = await Promise.all([
          getSuperCreativeStats(user?.id || 'sc-001'), getProjects({ super_creative_id: user?.id || 'sc-001' }), getWallet(user?.id || 'sc-001')
        ]);
        setStats(statsRes.data);
        setProjects(projectsRes.data.filter(p => p.status !== 'completed').slice(0, 4));
        setTransactions(walletRes.data.transactions?.slice(0, 5) || []);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [user?.id]);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="super-creative-overview">
      <WelcomeBanner role="super_creative" userName={stats?.team_name || 'Mavin Records'}
        subtitle="3 active projects, 7 opportunities posted, 5 team members. Wallet balance healthy."
        stats={[{ label: 'Available', value: formatNaira(stats?.wallet_balance || 12450000, { compact: true }) }, { label: 'Escrowed', value: formatNaira(stats?.escrowed || 9000000, { compact: true }) }, { label: 'Team', value: '5' }, { label: 'Openings', value: '4' }]}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {loading ? Array(8).fill(0).map((_, i) => <MetricCardSkeleton key={i} />) : (<>
          <MetricCard title="Available" value={formatNaira(stats?.wallet_balance || 12450000, { compact: true })} icon={<Wallet className="w-3.5 h-3.5" />} />
          <MetricCard title="In Escrow" value={formatNaira(stats?.escrowed || 9000000, { compact: true })} subtitle="3 projects" />
          <MetricCard title="Total Earned" value="₦84.5M" subtitle="Lifetime" change="+18%" icon={<TrendingUp className="w-3.5 h-3.5" />} />
          <MetricCard title="Active Projects" value={stats?.active_projects || 3} subtitle="1 ending soon" icon={<FolderOpen className="w-3.5 h-3.5" />} />
          <MetricCard title="Team Members" value="5" subtitle="2 onboarding" icon={<Users className="w-3.5 h-3.5" />} />
          <MetricCard title="Open Roles" value="4" subtitle="41 applicants" icon={<Target className="w-3.5 h-3.5" />} />
          <MetricCard title="Avg Rating" value="4.85" subtitle="Across team" icon={<Star className="w-3.5 h-3.5" />} />
          <MetricCard title="Revenue YTD" value="₦43.9M" change="+24%" icon={<BarChart3 className="w-3.5 h-3.5" />} />
        </>)}
      </div>

      {/* Row 2: Projects + Wallet */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Project Timeline</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">View All</button>
          </div>
          <div className="space-y-2.5">
            {projectTimeline.map(p => (
              <div key={p.name} onClick={() => setPopup({ type: 'project', data: p })} className="p-3 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <div><p className="text-xs font-medium text-[#0F172A]">{p.name}</p><p className="text-[10px] text-[#94A3B8]">Due: {p.deadline} &bull; {p.budget}</p></div>
                  <StatusBadge status={p.status.toLowerCase().replace(' ', '_')} />
                </div>
                <div className="flex items-center gap-2"><div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full"><div className="h-full bg-[#2F55FF] rounded-full" style={{ width: `${p.progress}%` }} /></div><span className="text-[10px] text-[#64748B]">{p.progress}%</span></div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Transactions</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">Wallet</button>
          </div>
          <div className="space-y-2">
            {transactions.length === 0 ? <p className="text-xs text-[#94A3B8] text-center py-6">No recent transactions</p> : transactions.map(tx => (
              <div key={tx.id} onClick={() => setPopup({ type: 'tx', data: tx })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${tx.transaction_type === 'credit' ? 'bg-[#ECFDF5] text-[#22C55E]' : tx.transaction_type === 'escrow_hold' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                  {tx.transaction_type === 'credit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-xs text-[#475569] truncate">{tx.description}</p><p className="text-[9px] text-[#94A3B8]">{formatRelativeTime(tx.created_at)}</p></div>
                <span className={`text-[10px] font-mono ${tx.transaction_type === 'credit' ? 'text-[#22C55E]' : 'text-[#64748B]'}`}>{tx.transaction_type === 'credit' ? '+' : '-'}{formatNaira(tx.amount, { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Team + Hiring */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Team Members</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">Manage Team</button>
          </div>
          <div className="space-y-2">
            {teamMembers.map(m => (
              <div key={m.name} onClick={() => setPopup({ type: 'member', data: m })} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <Avatar name={m.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-[#0F172A]">{m.name}</p><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${m.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#FFFBEB] text-[#D97706]'}`}>{m.status}</span></div>
                  <p className="text-[10px] text-[#94A3B8]">{m.role} &bull; {m.projects} projects</p>
                </div>
                <div className="text-right"><span className="text-[10px] font-mono text-[#22C55E]">{m.earnings}</span><div className="flex items-center gap-0.5 justify-end"><Star className="w-2.5 h-2.5 text-[#F59E0B]" /><span className="text-[10px]">{m.rating}</span></div></div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Hiring Pipeline</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">Post Opportunity</button>
          </div>
          <div className="space-y-2">
            {hiringPipeline.map(h => (
              <div key={h.role} onClick={() => setPopup({ type: 'hiring', data: h })} className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-[#0F172A]">{h.role}</p>
                  <span className="text-[10px] font-mono text-[#0F172A]">{h.budget}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#94A3B8]">
                  <span>{h.applicants} applicants</span>
                  <span>{h.shortlisted} shortlisted</span>
                  <span>Due: {h.deadline}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'project' ? popup?.data?.name : popup?.type === 'member' ? popup?.data?.name : popup?.type === 'hiring' ? popup?.data?.role : popup?.type === 'tx' ? 'Transaction' : 'Details'}>
        {popup?.type === 'project' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Budget</p><p className="text-sm font-bold font-mono">{popup.data.budget}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Progress</p><p className="text-sm font-bold">{popup.data.progress}%</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Deadline</p><p className="text-xs">{popup.data.deadline}</p></div>
            <button className="btn-primary text-xs w-full py-2">View Project</button>
          </div>
        )}
        {popup?.type === 'member' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.name} size="md" /><div><p className="text-sm font-medium">{popup.data.name}</p><p className="text-xs text-[#94A3B8]">{popup.data.role}</p></div></div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Projects</p><p className="text-sm font-bold">{popup.data.projects}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Earnings</p><p className="text-sm font-bold font-mono text-[#22C55E]">{popup.data.earnings}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3 text-center"><p className="text-[10px] text-[#94A3B8]">Rating</p><p className="text-sm font-bold">{popup.data.rating}</p></div>
            </div>
          </div>
        )}
        {popup?.type === 'hiring' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Budget</p><p className="text-sm font-bold font-mono">{popup.data.budget}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Deadline</p><p className="text-xs font-medium">{popup.data.deadline}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Applicants</p><p className="text-sm font-bold">{popup.data.applicants}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Shortlisted</p><p className="text-sm font-bold text-[#22C55E]">{popup.data.shortlisted}</p></div>
            </div>
            <button className="btn-primary text-xs w-full py-2">Review Applicants</button>
          </div>
        )}
        {popup?.type === 'tx' && popup?.data && (
          <div className="space-y-3">
            <div className="bg-[#F8FAFC] rounded-lg p-4"><p className="text-[10px] text-[#94A3B8]">Amount</p><p className={`text-lg font-bold font-mono ${popup.data.transaction_type === 'credit' ? 'text-[#22C55E]' : 'text-[#D97706]'}`}>{formatNaira(popup.data.amount)}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Description</p><p className="text-xs">{popup.data.description}</p></div>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default SuperCreativeOverview;
