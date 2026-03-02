import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getCreativeStats, getOpenOpportunities, getTasks } from '../../lib/api';
import { formatNaira, formatRelativeTime, getMatchColor } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  Wallet, 
  Briefcase, 
  Star, 
  Target,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  DollarSign
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
    <div className="space-y-6 animate-fade-in" data-testid="creative-overview">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back, {user?.name?.split(' ')[0] || 'Kelechi'}
        </h1>
        <p className="text-white/50 text-sm">
          You have {stats?.tasks_due || 3} tasks due this week and {opportunities.length} new opportunities.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="Wallet Balance"
              value={formatNaira(stats?.wallet_balance || 2875000, { compact: true })}
              icon={<Wallet className="w-4 h-4" />}
            />
            <MetricCard
              title="Active Projects"
              value={stats?.active_projects || 2}
              icon={<Briefcase className="w-4 h-4" />}
            />
            <MetricCard
              title="Completed"
              value={stats?.completed_projects || 14}
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <MetricCard
              title="Avg Rating"
              value={(stats?.rating || 4.9).toFixed(1)}
              subtitle="stars"
              icon={<Star className="w-4 h-4" />}
            />
            <MetricCard
              title="Reliability"
              value={`${stats?.reliability || 97}%`}
              icon={<Target className="w-4 h-4" />}
            />
            <MetricCard
              title="Earnings YTD"
              value={formatNaira(stats?.earnings_ytd || 4650000, { compact: true })}
              icon={<DollarSign className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunities */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#6BFF9A]" />
              <h2 className="text-lg font-semibold text-white">AI-Matched Opportunities</h2>
            </div>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-3">
            {opportunities.map((opp, index) => (
              <div 
                key={opp.id}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                data-testid={`opportunity-${opp.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className={`text-xs font-medium ${index === 0 ? 'text-[#6BFF9A]' : 'text-[#2F55FF]'}`}>
                      {index === 0 ? 'HOT MATCH' : 'NEW'} ({90 - index * 5}% Fit)
                    </span>
                    <h3 className="text-white font-medium">{opp.role}</h3>
                    <p className="text-white/50 text-sm">{opp.project_title}</p>
                  </div>
                  <span className="text-[#6BFF9A] font-mono text-sm">
                    {formatNaira(opp.budget, { compact: true })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{opp.client_name}</span>
                  <span>Due: {opp.deadline}</span>
                </div>
                
                <button className="mt-3 text-[#2F55FF] text-sm flex items-center gap-1 hover:underline">
                  Apply Now <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">My Tasks</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className="text-white/40 text-center py-8">No active tasks</div>
            ) : (
              tasks.map((task) => (
                <div 
                  key={task.id}
                  className="bg-white/5 rounded-lg p-4"
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-white font-medium">{task.title}</h3>
                      <p className="text-white/50 text-sm">{task.project_id}</p>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Due: {task.due_date}
                    </span>
                    <span className="text-[#6BFF9A] font-mono">
                      {formatNaira(task.payment_amount, { compact: true })}
                    </span>
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
