import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCreativeStats, getOpenOpportunities, getTasks } from '../../lib/api';
import { formatNaira, formatRelativeTime, getMatchColor } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  Wallet, Briefcase, Star, Target, CheckCircle, Clock, ArrowRight, Sparkles, DollarSign
} from 'lucide-react';

export const CreativeOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, oppsRes, tasksRes] = await Promise.all([
          getCreativeStats(user?.id || 'cr-001'),
          getOpenOpportunities(),
          getTasks({ creative_id: user?.id || 'cr-001' })
        ]);
        setStats(statsRes.data);
        setOpportunities(oppsRes.data.slice(0, 5));
        setTasks(tasksRes.data.slice(0, 4));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="creative-overview">
      <WelcomeBanner
        role="creative"
        userName={user?.name?.split(' ')[0] || 'Kelechi'}
        subtitle={`${stats?.tasks_due || 3} tasks due this week and ${opportunities.length} new opportunities.`}
        stats={[
          { label: 'Balance', value: formatNaira(stats?.wallet_balance || 2875000, { compact: true }) },
          { label: 'Rating', value: (stats?.rating || 4.9).toFixed(1) },
          { label: 'Reliability', value: `${stats?.reliability || 97}%` }
        ]}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title="Wallet Balance" value={formatNaira(stats?.wallet_balance || 2875000, { compact: true })} icon={<Wallet className="w-3.5 h-3.5" />} />
            <MetricCard title="Active Projects" value={stats?.active_projects || 2} icon={<Briefcase className="w-3.5 h-3.5" />} />
            <MetricCard title="Completed" value={stats?.completed_projects || 14} icon={<CheckCircle className="w-3.5 h-3.5" />} />
            <MetricCard title="Avg Rating" value={(stats?.rating || 4.9).toFixed(1)} subtitle="stars" icon={<Star className="w-3.5 h-3.5" />} />
            <MetricCard title="Reliability" value={`${stats?.reliability || 97}%`} icon={<Target className="w-3.5 h-3.5" />} />
            <MetricCard title="Earnings YTD" value={formatNaira(stats?.earnings_ytd || 4650000, { compact: true })} icon={<DollarSign className="w-3.5 h-3.5" />} />
          </>
        )}
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Opportunities */}
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">AI-Matched Opportunities</h2>
            <button className="ml-auto text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-2.5">
            {opportunities.map((opp, index) => (
              <div key={opp.id} className="bg-[#F8FAFC] rounded-lg p-3 hover:bg-[#F1F5F9] transition-colors cursor-pointer" data-testid={`opportunity-${opp.id}`}>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <span className={`text-[10px] font-medium ${index === 0 ? 'text-[#22C55E]' : 'text-[#2F55FF]'}`}>
                      {index === 0 ? 'HOT MATCH' : 'NEW'} ({90 - index * 5}% Fit)
                    </span>
                    <h3 className="text-xs font-medium text-[#0F172A]">{opp.role}</h3>
                    <p className="text-[#64748B] text-[10px]">{opp.project_title}</p>
                  </div>
                  <span className="text-[#22C55E] font-mono text-[10px]">{formatNaira(opp.budget, { compact: true })}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
                  <span>{opp.client_name}</span>
                  <span>Due: {opp.deadline}</span>
                </div>
                <button className="mt-2 text-[#2F55FF] text-[10px] flex items-center gap-1 hover:underline">
                  Apply Now <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">My Tasks</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-2.5">
            {tasks.length === 0 ? (
              <div className="text-[#94A3B8] text-xs text-center py-8">No active tasks</div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="bg-[#F8FAFC] rounded-lg p-3" data-testid={`task-${task.id}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <h3 className="text-xs font-medium text-[#0F172A]">{task.title}</h3>
                      <p className="text-[#64748B] text-[10px]">{task.project_id}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#94A3B8] flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Due: {task.due_date}
                    </span>
                    <span className="text-[#22C55E] font-mono">{formatNaira(task.payment_amount, { compact: true })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeOverview;
