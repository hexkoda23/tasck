import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCreativeStats, getOpenOpportunities, getTasks } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import DetailPopup from '../../components/shared/DetailPopup';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { Wallet, Briefcase, Star, Target, CheckCircle, Clock, ArrowRight, Sparkles, DollarSign, TrendingUp, Award, Zap, Calendar, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const earningsBreakdown = [
  { month: 'Jan', amount: 850000 }, { month: 'Feb', amount: 1200000 }, { month: 'Mar (proj)', amount: 950000 }
];

const skillDemands = [
  { skill: 'Photography', demand: 'High', rate: '₦350K/day', trend: '+15%' },
  { skill: 'Videography', demand: 'High', rate: '₦500K/day', trend: '+22%' },
  { skill: 'Music Direction', demand: 'Medium', rate: '₦250K/day', trend: '+8%' },
  { skill: 'Styling', demand: 'Growing', rate: '₦180K/day', trend: '+35%' }
];

const recentPayments = [
  { desc: 'Pepsi x DMW — Shoot Set 1', amount: 187500, type: 'credit', time: '3d ago' },
  { desc: 'Mavin All-Stars — Concert Photos', amount: 350000, type: 'credit', time: '1w ago' },
  { desc: 'Boomplay Exclusive Cover Art', amount: 120000, type: 'credit', time: '2w ago' },
  { desc: 'Platform fee — February', amount: 45000, type: 'debit', time: '2w ago' }
];

const portfolioStats = [
  { label: 'Projects Completed', value: '14', detail: '3 this quarter' },
  { label: 'Avg Rating', value: '4.9', detail: 'Top 5% on platform' },
  { label: 'Repeat Clients', value: '67%', detail: '4 of 6 clients' },
  { label: 'On-Time Delivery', value: '97%', detail: '1 late in 2 years' }
];

export const CreativeOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, oppsRes, tasksRes] = await Promise.all([
          getCreativeStats(user?.id || 'cr-001'), getOpenOpportunities(), getTasks({ creative_id: user?.id || 'cr-001' })
        ]);
        setStats(statsRes.data);
        setOpportunities(oppsRes.data.slice(0, 5));
        setTasks(tasksRes.data.slice(0, 5));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchData();
  }, [user?.id]);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="creative-overview">
      <WelcomeBanner role="creative" userName={user?.name?.split(' ')[0] || 'Kelechi'}
        subtitle="3 tasks due this week. 5 new opportunities match your profile. Earnings trending up 22%."
        stats={[{ label: 'Balance', value: formatNaira(stats?.wallet_balance || 2875000, { compact: true }) }, { label: 'Rating', value: (stats?.rating || 4.9).toFixed(1) }, { label: 'Reliability', value: `${stats?.reliability || 97}%` }, { label: 'Earnings MTD', value: '₦1.2M' }]}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {loading ? Array(8).fill(0).map((_, i) => <MetricCardSkeleton key={i} />) : (<>
          <MetricCard title="Wallet Balance" value={formatNaira(stats?.wallet_balance || 2875000, { compact: true })} icon={<Wallet className="w-3.5 h-3.5" />} />
          <MetricCard title="Active Projects" value={stats?.active_projects || 2} subtitle="1 ending soon" icon={<Briefcase className="w-3.5 h-3.5" />} />
          <MetricCard title="Tasks Due" value="3" subtitle="This week" icon={<Clock className="w-3.5 h-3.5" />} />
          <MetricCard title="Completed" value={stats?.completed_projects || 14} icon={<CheckCircle className="w-3.5 h-3.5" />} />
          <MetricCard title="Avg Rating" value={(stats?.rating || 4.9).toFixed(1)} subtitle="Top 5%" icon={<Star className="w-3.5 h-3.5" />} />
          <MetricCard title="Reliability" value={`${stats?.reliability || 97}%`} icon={<Target className="w-3.5 h-3.5" />} />
          <MetricCard title="Earnings YTD" value={formatNaira(stats?.earnings_ytd || 4650000, { compact: true })} change="+22%" icon={<DollarSign className="w-3.5 h-3.5" />} />
          <MetricCard title="Pending Payments" value="₦375K" subtitle="2 invoices" icon={<Zap className="w-3.5 h-3.5" />} />
        </>)}
      </div>

      {/* Row 2: Opportunities + Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#22C55E]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">AI-Matched Opportunities</h2>
            <button className="ml-auto text-[#2F55FF] text-[10px] hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {opportunities.map((opp, i) => (
              <div key={opp.id} onClick={() => setPopup({ type: 'opp', data: { ...opp, fit: 90 - i * 5 } })} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors" data-testid={`opp-${opp.id}`}>
                <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${i === 0 ? 'bg-[#22C55E]' : 'bg-[#2F55FF]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2"><p className="text-xs font-medium text-[#0F172A] truncate">{opp.role}</p><span className={`text-[9px] px-1 py-0.5 rounded-full ${i === 0 ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#EEF2FF] text-[#2F55FF]'}`}>{i === 0 ? 'HOT' : 'NEW'} {90 - i * 5}%</span></div>
                  <p className="text-[10px] text-[#94A3B8] truncate">{opp.project_title} &bull; {opp.client_name}</p>
                </div>
                <span className="text-[10px] font-mono text-[#22C55E]">{formatNaira(opp.budget, { compact: true })}</span>
                <ChevronRight className="w-3 h-3 text-[#CBD5E1]" />
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">My Tasks</h2>
            <button className="text-[#2F55FF] text-[10px] hover:underline">View All</button>
          </div>
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} onClick={() => setPopup({ type: 'task', data: task })} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer transition-colors" data-testid={`task-${task.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#0F172A] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5"><span className="text-[10px] text-[#94A3B8]">{task.project_id}</span><span className="text-[10px] text-[#94A3B8] flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {task.due_date}</span></div>
                </div>
                <StatusBadge status={task.status} />
                <span className="text-[10px] font-mono text-[#22C55E]">{formatNaira(task.payment_amount, { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Earnings + Skills + Payments + Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Earnings Trend</h2>
          <div className="space-y-2.5">
            {earningsBreakdown.map(e => (
              <div key={e.month} onClick={() => setPopup({ type: 'earning', data: e })} className="cursor-pointer hover:bg-[#F8FAFC] p-2 rounded-lg transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-[#475569]">{e.month}</span><span className="text-xs font-mono font-medium text-[#0F172A]">{formatNaira(e.amount, { compact: true })}</span></div>
                <div className="h-1.5 bg-[#F1F5F9] rounded-full"><div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${(e.amount / 1500000) * 100}%` }} /></div>
              </div>
            ))}
            <div className="pt-2 border-t border-[#F1F5F9] flex justify-between"><span className="text-[10px] text-[#94A3B8]">YTD Total</span><span className="text-xs font-bold font-mono">₦4.65M</span></div>
          </div>
        </div>

        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Skill Demand</h2>
          <div className="space-y-2">
            {skillDemands.map(s => (
              <div key={s.skill} onClick={() => setPopup({ type: 'skill', data: s })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <div className="flex-1"><p className="text-xs text-[#0F172A]">{s.skill}</p><p className="text-[10px] text-[#94A3B8]">{s.rate}</p></div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${s.demand === 'High' ? 'bg-[#ECFDF5] text-[#059669]' : s.demand === 'Medium' ? 'bg-[#FFFBEB] text-[#D97706]' : 'bg-[#EEF2FF] text-[#2F55FF]'}`}>{s.demand}</span>
                <span className="text-[10px] text-[#22C55E]">{s.trend}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Recent Payments</h2>
          <div className="space-y-2">
            {recentPayments.map((tx, i) => (
              <div key={i} onClick={() => setPopup({ type: 'payment', data: tx })} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-[#ECFDF5] text-[#22C55E]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
                  {tx.type === 'credit' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0"><p className="text-[10px] text-[#475569] truncate">{tx.desc}</p><p className="text-[9px] text-[#94A3B8]">{tx.time}</p></div>
                <span className={`text-[10px] font-mono ${tx.type === 'credit' ? 'text-[#22C55E]' : 'text-[#64748B]'}`}>{tx.type === 'credit' ? '+' : '-'}{formatNaira(tx.amount, { compact: true })}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card p-5">
          <h2 className="text-sm font-semibold text-[#0F172A] mb-3">Portfolio Stats</h2>
          <div className="space-y-2.5">
            {portfolioStats.map(s => (
              <div key={s.label} onClick={() => setPopup({ type: 'stat', data: s })} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#F8FAFC] cursor-pointer transition-colors">
                <div><p className="text-xs text-[#475569]">{s.label}</p><p className="text-[10px] text-[#94A3B8]">{s.detail}</p></div>
                <span className="text-sm font-bold text-[#0F172A]">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <DetailPopup open={!!popup} onClose={() => setPopup(null)} title={popup?.type === 'opp' ? popup?.data?.role : popup?.type === 'task' ? popup?.data?.title : popup?.type === 'skill' ? popup?.data?.skill : popup?.type === 'payment' ? 'Payment Details' : popup?.type === 'earning' ? popup?.data?.month : popup?.type === 'stat' ? popup?.data?.label : 'Details'}>
        {popup?.type === 'opp' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Budget</p><p className="text-sm font-bold font-mono text-[#22C55E]">{formatNaira(popup.data.budget)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Fit Score</p><p className="text-sm font-bold text-[#22C55E]">{popup.data.fit}%</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Project</p><p className="text-xs">{popup.data.project_title}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Client</p><p className="text-xs">{popup.data.client_name}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Deadline</p><p className="text-xs">{popup.data.deadline}</p></div>
            <button className="btn-primary text-xs w-full py-2">Apply Now</button>
          </div>
        )}
        {popup?.type === 'task' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Payment</p><p className="text-sm font-bold font-mono text-[#22C55E]">{formatNaira(popup.data.payment_amount)}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Due</p><p className="text-xs font-medium">{popup.data.due_date}</p></div>
            </div>
            <div><p className="text-[10px] text-[#94A3B8]">Project</p><p className="text-xs">{popup.data.project_id}</p></div>
            <button className="btn-primary text-xs w-full py-2">Submit Work</button>
          </div>
        )}
        {popup?.type === 'skill' && popup?.data && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Market Rate</p><p className="text-sm font-bold">{popup.data.rate}</p></div>
              <div className="bg-[#F8FAFC] rounded-lg p-3"><p className="text-[10px] text-[#94A3B8]">Trend</p><p className="text-sm font-bold text-[#22C55E]">{popup.data.trend}</p></div>
            </div>
            <p className="text-xs text-[#64748B]">Demand for {popup.data.skill} is currently {popup.data.demand.toLowerCase()} in the Nigerian creative market.</p>
          </div>
        )}
        {popup?.type === 'payment' && popup?.data && (
          <div className="space-y-3">
            <div className="bg-[#F8FAFC] rounded-lg p-4"><p className="text-[10px] text-[#94A3B8]">Amount</p><p className={`text-lg font-bold font-mono ${popup.data.type === 'credit' ? 'text-[#22C55E]' : 'text-[#DC2626]'}`}>{popup.data.type === 'credit' ? '+' : '-'}{formatNaira(popup.data.amount)}</p></div>
            <div><p className="text-[10px] text-[#94A3B8]">Description</p><p className="text-xs">{popup.data.desc}</p></div>
          </div>
        )}
        {(popup?.type === 'earning' || popup?.type === 'stat') && popup?.data && (
          <div className="bg-[#F8FAFC] rounded-lg p-4 text-center">
            <p className="text-lg font-bold">{popup.data.value || formatNaira(popup.data.amount)}</p>
            <p className="text-xs text-[#94A3B8]">{popup.data.detail || popup.data.month}</p>
          </div>
        )}
      </DetailPopup>
    </div>
  );
};

export default CreativeOverview;
