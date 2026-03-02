import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStaffStats, getActivities } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import DetailPopup from '../../components/shared/DetailPopup';
import Avatar from '../../components/shared/Avatar';
import { 
  Handshake, Target, BarChart3, Users, FolderOpen, Building2,
  TrendingUp, Clock, DollarSign, Percent, Zap, Award,
  ChevronRight, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';

const topDeals = [
  { id: 'D-001', brand: 'Guinness Nigeria', campaign: 'Black Shines Brightest', value: 45000000, stage: 'Negotiation', probability: 85, owner: 'Tunde Adeyemi', artist: 'Burna Boy', deadline: 'Mar 15' },
  { id: 'D-002', brand: 'MTN Nigeria', campaign: 'Y\'ello Ambassador', value: 68000000, stage: 'Proposal', probability: 60, owner: 'Adenike Okafor', artist: 'Tems', deadline: 'Mar 10' },
  { id: 'D-003', brand: 'Coca-Cola', campaign: 'Coke Studio Africa', value: 82000000, stage: 'Discovery', probability: 40, owner: 'Chidi Nwosu', artist: 'Multiple', deadline: 'Mar 20' },
  { id: 'D-004', brand: 'Access Bank', campaign: 'Diamond Partnership', value: 35000000, stage: 'Contract', probability: 95, owner: 'Bola Adekunle', artist: 'Davido', deadline: 'Mar 8' },
  { id: 'D-005', brand: 'Pepsi Nigeria', campaign: 'Street Vibes Refresh', value: 25000000, stage: 'Discovery', probability: 30, owner: 'Tunde Adeyemi', artist: 'Rema', deadline: 'Apr 1' }
];

const upcomingTasks = [
  { id: 'T-001', task: 'Send Guinness contract for legal review', due: 'Today', priority: 'high', project: 'Guinness x Burna Boy' },
  { id: 'T-002', task: 'Review Tems team counter-proposal', due: 'Tomorrow', priority: 'high', project: 'MTN Ambassador' },
  { id: 'T-003', task: 'Prepare Coca-Cola discovery deck', due: 'Mar 5', priority: 'medium', project: 'Coke Studio Africa' },
  { id: 'T-004', task: 'Schedule Access Bank signing ceremony', due: 'Mar 8', priority: 'medium', project: 'Diamond Partnership' },
  { id: 'T-005', task: 'Brief creative team on Pepsi visual direction', due: 'Mar 10', priority: 'low', project: 'Pepsi Refresh' }
];

const teamPerformance = [
  { name: 'Tunde Adeyemi', role: 'Senior Agent', deals: 3, pipeline: '₦138M', revenue: '₦92M', winRate: '72%' },
  { name: 'Adenike Okafor', role: 'Agent', deals: 2, pipeline: '₦93M', revenue: '₦68M', winRate: '65%' },
  { name: 'Chidi Nwosu', role: 'Agent', deals: 2, pipeline: '₦107M', revenue: '₦45M', winRate: '58%' },
  { name: 'Bola Adekunle', role: 'Junior Agent', deals: 1, pipeline: '₦35M', revenue: '₦29M', winRate: '80%' }
];

const recentTransactions = [
  { desc: 'Access Bank milestone payment', amount: 12000000, type: 'credit', time: '2h ago' },
  { desc: 'Rema x Boomplay escrow release', amount: 8500000, type: 'credit', time: '1d ago' },
  { desc: 'Mavin Records payout — Feb batch', amount: 15000000, type: 'debit', time: '2d ago' },
  { desc: 'Guinness deposit received', amount: 22500000, type: 'credit', time: '3d ago' }
];

export const StaffOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([getStaffStats(), getActivities()]);
        setStats(statsRes.data);
        setActivities(activityRes.data.slice(0, 8));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const stageColor = (s) => s === 'Discovery' ? '#2F55FF' : s === 'Proposal' ? '#8B5CF6' : s === 'Negotiation' ? '#F59E0B' : '#22C55E';
  const priorityColor = (p) => p === 'high' ? 'bg-[#FEF2F2] text-[#DC2626]' : p === 'medium' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#F1F5F9] text-[#64748B]';

  return (
    <div className="space-y-5 animate-fade-in" data-testid="staff-overview">
      <WelcomeBanner role="staff" userName={user?.name?.split(' ')[0] || 'Tunde'}
        subtitle="3 deals closing this week. Pipeline is 15% ahead of target. Commission: ₦4.2M earned."
        stats={[{ label: 'Pipeline', value: '₦240.2M' }, { label: 'Revenue YTD', value: '₦234.8M' }, { label: 'Close Rate', value: '68%' }, { label: 'Deals Won', value: '14' }]}
      />

      {/* Row 1: Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {loading ? Array(8).fill(0).map((_, i) => <MetricCardSkeleton key={i} />) : (<>
          <MetricCard title="Active Deals" value="5" subtitle="3 closing this week" change="+27%" icon={<Handshake className="w-3.5 h-3.5" />} />
          <MetricCard title="Pipeline Value" value="₦240.2M" subtitle="Weighted: ₦117.7M" change="+15%" icon={<TrendingUp className="w-3.5 h-3.5" />} />
          <MetricCard title="Revenue YTD" value="₦234.8M" subtitle="Target: ₦500M (47%)" icon={<BarChart3 className="w-3.5 h-3.5" />} />
          <MetricCard title="Avg Deal Size" value="₦42.5M" subtitle="₦38M last quarter" change="+12%" icon={<DollarSign className="w-3.5 h-3.5" />} />
          <MetricCard title="Win Rate" value="68%" subtitle="Industry avg: 45%" icon={<Percent className="w-3.5 h-3.5" />} />
          <MetricCard title="Deal Velocity" value="18 days" subtitle="Avg time to close" icon={<Zap className="w-3.5 h-3.5" />} />
          <MetricCard title="Artists Managed" value="4" subtitle="2 onboarding" icon={<Users className="w-3.5 h-3.5" />} />
          <MetricCard title="Commission YTD" value="₦4.2M" subtitle="₦890K this month" change="+34%" icon={<Award className="w-3.5 h-3.5" />} />
        </>)}
      </div>

      {/* Row 2: Top Deals + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Top Deals</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">View All Deals</button>
          </div>
          <div className="space-y-2">
            {topDeals.map(deal => (
              <div key={deal.id} onClick={() => setPopup({ type: 'deal', data: deal })} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors group" data-testid={`deal-row-${deal.id}`}>
                <Avatar name={deal.brand} size="sm" square />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-medium text-[#0F172A] truncate">{deal.brand}</h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: stageColor(deal.stage) + '20', color: stageColor(deal.stage) }}>{deal.stage}</span>
                  </div>
                  <p className="text-[10px] text-[#94A3B8] truncate">{deal.campaign} &bull; {deal.artist}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-medium text-[#0F172A]">{formatNaira(deal.value, { compact: true })}</p>
                  <p className="text-[10px] text-[#94A3B8]">{deal.probability}% prob</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#2F55FF] transition-colors" />
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Pipeline Summary</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">Full Pipeline</button>
          </div>
          <div className="space-y-2.5">
            {[
              { stage: 'Discovery', count: 3, value: '₦45M', color: '#2F55FF', pct: 18 },
              { stage: 'Proposal', count: 2, value: '₦82M', color: '#8B5CF6', pct: 34 },
              { stage: 'Negotiation', count: 2, value: '₦65M', color: '#F59E0B', pct: 27 },
              { stage: 'Contract', count: 1, value: '₦48.2M', color: '#22C55E', pct: 20 }
            ].map(item => (
              <div key={item.stage} onClick={() => setPopup({ type: 'stage', data: item })} className="cursor-pointer hover:bg-[#F8FAFC] p-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: item.color }} /><span className="text-xs text-[#475569]">{item.stage}</span></div>
                  <div className="flex items-center gap-3"><span className="text-[10px] text-[#94A3B8]">{item.count} deals</span><span className="text-xs font-medium text-[#0F172A] font-mono">{item.value}</span></div>
                </div>
                <div className="h-1.5 bg-[#F1F5F9] rounded-full"><div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-[10px] text-[#94A3B8]">Total Pipeline</span>
            <span className="text-sm font-bold text-[#0F172A] font-mono">₦240.2M</span>
          </div>
        </div>
      </div>

      {/* Row 3: Tasks + Team + Transactions + Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Upcoming Tasks */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Upcoming Tasks</h2>
            <span className="text-[9px] bg-[#FEF2F2] text-[#DC2626] px-1.5 py-0.5 rounded-full">{upcomingTasks.filter(t => t.priority === 'high').length} urgent</span>
          </div>
          <div className="space-y-1.5">
            {upcomingTasks.map(task => (
              <div key={task.id} onClick={() => setPopup({ type: 'task', data: task })} className="p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors" data-testid={`task-${task.id}`}>
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${task.priority === 'high' ? 'bg-[#EF4444]' : task.priority === 'medium' ? 'bg-[#F59E0B]' : 'bg-[#CBD5E1]'}`} />
                  <div>
                    <p className="text-xs text-[#0F172A]">{task.task}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-[#94A3B8]">{task.project}</span>
                      <span className={`text-[9px] px-1 py-0.5 rounded ${priorityColor(task.priority)}`}>{task.due}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Performance */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Team</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">Roster</button>
          </div>
          <div className="space-y-2">
            {teamPerformance.map(member => (
              <div key={member.name} onClick={() => setPopup({ type: 'member', data: member })} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <Avatar name={member.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#0F172A] truncate">{member.name}</p>
                  <p className="text-[10px] text-[#94A3B8]">{member.deals} deals &bull; {member.winRate}</p>
                </div>
                <span className="text-[10px] font-mono text-[#22C55E]">{member.revenue}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Money Movement</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">Wallet</button>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((tx, i) => (
              <div key={i} onClick={() => setPopup({ type: 'transaction', data: tx })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-[#ECFDF5] text-[#22C55E]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                  {tx.type === 'credit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569] truncate">{tx.desc}</p>
                  <p className="text-[10px] text-[#94A3B8]">{tx.time}</p>
                </div>
                <span className={`text-[10px] font-mono ${tx.type === 'credit' ? 'text-[#22C55E]' : 'text-[#64748B]'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatNaira(tx.amount, { compact: true })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Activity Feed</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {activities.slice(0, 6).map(activity => (
              <div key={activity.id} onClick={() => setPopup({ type: 'activity', data: activity })} className="flex items-start gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors" data-testid={`activity-${activity.id}`}>
                <Avatar name={activity.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#475569]"><span className="font-medium text-[#0F172A]">{activity.user}</span> {activity.action}</p>
                  <p className="text-[9px] text-[#94A3B8] flex items-center gap-0.5"><Clock className="w-2 h-2" /> {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Upcoming Meetings + Brand Relationships */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Upcoming Meetings</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">All Meetings</button>
          </div>
          <div className="space-y-2">
            {[
              { title: 'Coca-Cola — Coke Studio Kickoff', date: 'Mar 3', time: '11:00 AM', with: 'Sarah Chen, Mavin Records' },
              { title: 'Access Bank — Signing Prep', date: 'Mar 4', time: '3:00 PM', with: 'Uche Nnamdi' },
              { title: 'UBA Foundation — CSR Brief', date: 'Mar 5', time: '10:30 AM', with: 'UBA CSR Team, Davido Foundation' },
              { title: 'Weekly Pipeline Standup', date: 'Mar 6', time: '9:00 AM', with: 'Full Team' }
            ].map((mtg, i) => (
              <div key={i} onClick={() => setPopup({ type: 'meeting', data: mtg })} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                <div className="w-10 text-center flex-shrink-0"><p className="text-[10px] text-[#94A3B8]">{mtg.date}</p><p className="text-xs font-medium text-[#0F172A]">{mtg.time.split(' ')[0]}</p></div>
                <div className="flex-1"><p className="text-xs font-medium text-[#0F172A]">{mtg.title}</p><p className="text-[10px] text-[#94A3B8]">{mtg.with}</p></div>
                <Calendar className="w-3.5 h-3.5 text-[#CBD5E1]" />
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">Brand Relationships</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">All Brands</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { brand: 'Guinness Nigeria', status: 'Active Deal', revenue: '₦45M', health: 'strong' },
              { brand: 'MTN Nigeria', status: 'Negotiating', revenue: '₦68M', health: 'growing' },
              { brand: 'Coca-Cola', status: 'Discovery', revenue: '—', health: 'new' },
              { brand: 'Access Bank', status: 'Closing', revenue: '₦35M', health: 'strong' },
              { brand: 'Pepsi Nigeria', status: 'Discovery', revenue: '—', health: 'new' },
              { brand: 'UBA Foundation', status: 'Renewal', revenue: '₦22M', health: 'stable' }
            ].map((b, i) => (
              <div key={i} onClick={() => setPopup({ type: 'brand', data: b })} className="p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar name={b.brand} size="sm" square />
                  <div><p className="text-[10px] font-medium text-[#0F172A]">{b.brand}</p></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${b.health === 'strong' ? 'bg-[#ECFDF5] text-[#059669]' : b.health === 'growing' ? 'bg-[#EEF2FF] text-[#2F55FF]' : b.health === 'new' ? 'bg-[#F1F5F9] text-[#64748B]' : 'bg-[#FFFBEB] text-[#D97706]'}`}>{b.status}</span>
                  <span className="text-[10px] font-mono text-[#0F172A]">{b.revenue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail Popup */}
      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'deal' ? popup?.data?.brand : popup?.type === 'task' ? 'Task Details' : popup?.type === 'member' ? popup?.data?.name : popup?.type === 'meeting' ? popup?.data?.title : popup?.type === 'brand' ? popup?.data?.brand : popup?.type === 'transaction' ? 'Transaction' : popup?.type === 'stage' ? `${popup?.data?.stage} Stage` : 'Details'}>
        {popup?.type === 'deal' && popup?.data && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Deal Value</p><p className="text-sm font-bold text-[#0F172A] font-mono">{formatNaira(popup.data.value)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Probability</p><p className="text-sm font-bold text-[#0F172A]">{popup.data.probability}%</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Campaign</p><p className="text-xs text-[#0F172A]">{popup.data.campaign}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Artist</p><p className="text-xs text-[#0F172A]">{popup.data.artist}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Owner</p><p className="text-xs text-[#0F172A]">{popup.data.owner}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Stage</p><span className="text-xs px-2 py-1 rounded-full" style={{ background: stageColor(popup.data.stage) + '20', color: stageColor(popup.data.stage) }}>{popup.data.stage}</span></div>
            <div><p className="text-[10px] text-[#94A3B8]">Deadline</p><p className="text-xs text-[#0F172A]">{popup.data.deadline}</p></div>
            <button className="btn-primary text-xs w-full py-2">Open Deal Room</button>
          </div>
        )}
        {popup?.type === 'task' && popup?.data && (
          <div className="space-y-3">
            <p className="text-xs text-[#0F172A]">{popup.data.task}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Due</p><p className="text-xs font-medium">{popup.data.due}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Priority</p><p className={`text-xs font-medium capitalize ${popup.data.priority === 'high' ? 'text-[#DC2626]' : popup.data.priority === 'medium' ? 'text-[#D97706]' : 'text-[#64748B]'}`}>{popup.data.priority}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Project</p><p className="text-xs text-[#0F172A]">{popup.data.project}</p></div>
            <button className="btn-primary text-xs w-full py-2">Mark Complete</button>
          </div>
        )}
        {popup?.type === 'member' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.name} size="md" /><div><p className="text-sm font-medium">{popup.data.name}</p><p className="text-xs text-[#94A3B8]">{popup.data.role}</p></div></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Active Deals</p><p className="text-sm font-bold">{popup.data.deals}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Pipeline</p><p className="text-sm font-bold font-mono">{popup.data.pipeline}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Revenue YTD</p><p className="text-sm font-bold font-mono text-[#22C55E]">{popup.data.revenue}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Win Rate</p><p className="text-sm font-bold">{popup.data.winRate}</p></div>
            </div>
          </div>
        )}
        {popup?.type === 'meeting' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Date</p><p className="text-xs font-medium">{popup.data.date}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Time</p><p className="text-xs font-medium">{popup.data.time}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Participants</p><p className="text-xs text-[#0F172A]">{popup.data.with}</p></div>
            <button className="btn-primary text-xs w-full py-2">Join Meeting</button>
          </div>
        )}
        {popup?.type === 'brand' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.brand} size="md" square /><div><p className="text-sm font-medium">{popup.data.brand}</p><p className="text-xs text-[#94A3B8]">{popup.data.status}</p></div></div>
            <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Revenue from Brand</p><p className="text-sm font-bold font-mono">{popup.data.revenue}</p></div>
            <button className="btn-primary text-xs w-full py-2">View Brand Profile</button>
          </div>
        )}
        {popup?.type === 'transaction' && popup?.data && (
          <div className="space-y-3">
            <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Amount</p><p className={`text-lg font-bold font-mono ${popup.data.type === 'credit' ? 'text-[#22C55E]' : 'text-[#DC2626]'}`}>{popup.data.type === 'credit' ? '+' : '-'}{formatNaira(popup.data.amount)}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Description</p><p className="text-xs">{popup.data.desc}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Time</p><p className="text-xs">{popup.data.time}</p></div>
          </div>
        )}
        {popup?.type === 'stage' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Deals in Stage</p><p className="text-sm font-bold">{popup.data.count}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Total Value</p><p className="text-sm font-bold font-mono">{popup.data.value}</p></div>
            </div>
            <button className="btn-primary text-xs w-full py-2">View Pipeline</button>
          </div>
        )}
        {popup?.type === 'activity' && popup?.data && (
          <div className="space-y-3">
            <div className="flex items-center gap-3"><Avatar name={popup.data.user} size="md" /><div><p className="text-sm font-medium">{popup.data.user}</p><p className="text-xs text-[#94A3B8]">{popup.data.time}</p></div></div>
            <p className="text-xs text-[#475569]">{popup.data.action}</p>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default StaffOverview;
