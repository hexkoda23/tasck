import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStaffStats, getActivities, getCopilotRecommendations } from '../../lib/api';
import { formatNaira, formatRelativeTime, getMatchColor } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import { 
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';

export const StaffOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activitiesRes, recsRes] = await Promise.all([
          getStaffStats(user?.id || 'staff-001'),
          getActivities(10),
          getCopilotRecommendations()
        ]);
        setStats(statsRes.data);
        setActivities(activitiesRes.data);
        setRecommendations(recsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.id]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const priorities = [
    { id: 1, title: 'Close Guinness Contract', description: 'Burna Boy x Guinness ₦45M deal. Contract sent March 1.', action: 'Follow Up' },
    { id: 2, title: 'Respond to MTN Counter-Offer', description: 'Tems ambassador deal dropped from ₦75M to ₦62M.', action: 'Open Deal Room' },
    { id: 3, title: 'Staff Coca-Cola Project', description: 'Coke Studio Africa 2026. Need 8 opportunities posted.', action: 'Create Project' },
    { id: 4, title: 'Review Overdue Deliverables', description: '2 tasks overdue. Ade Adesanya 1 day late on MTN content.', action: 'View Tasks' }
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="staff-overview">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1 tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Tunde'}
        </h1>
        <p className="text-[#94A3B8] text-sm">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger-children">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title="Active Deals" value={stats?.active_deals || 14} subtitle="3 closing this week" trend="Up 27% vs last month" trendDirection="up" />
            <MetricCard title="Pipeline Value" value={formatNaira(stats?.pipeline_value || 847200000, { compact: true })} subtitle={`Weighted: ${formatNaira(stats?.weighted_pipeline || 412500000, { compact: true })}`} trend="Up 15%" trendDirection="up" />
            <MetricCard title="Revenue YTD" value={formatNaira(stats?.revenue_ytd || 234800000, { compact: true })} subtitle="Target: ₦500M (47%)" />
            <MetricCard title="Artists Managed" value={stats?.artists_managed || 8} subtitle="2 onboarding" />
            <MetricCard title="Active Projects" value={stats?.active_projects || 11} subtitle="4 in fulfillment" />
            <MetricCard title="Brand Relationships" value={stats?.brand_relationships || 23} subtitle="5 new this quarter" trend="Up 3" trendDirection="up" />
          </>
        )}
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-[#0F172A]">Live Activity</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          
          <div className="space-y-4 max-h-[460px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-[#CBD5E1] text-sm">No recent activity</div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex gap-3" data-testid={`activity-${activity.id}`}>
                  <div className="flex flex-col items-center pt-1.5">
                    <div className={`status-dot ${activity.metadata?.status === 'success' ? 'status-dot-success' : activity.metadata?.status === 'warning' ? 'status-dot-warning' : 'status-dot-info'}`}></div>
                    <div className="w-px flex-1 bg-[#F1F5F9] mt-1"></div>
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <p className="text-sm text-[#475569] leading-relaxed">{activity.description}</p>
                    <span className="text-[11px] text-[#CBD5E1] mt-1 block">{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Priorities */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-[#0F172A]">Today's Priorities</h2>
            <Clock className="w-4 h-4 text-[#CBD5E1]" />
          </div>
          
          <div className="space-y-2">
            {priorities.map((priority, index) => (
              <div key={priority.id} className="rounded-lg p-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer" data-testid={`priority-${priority.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#EEF2FF] text-[#2F55FF] flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[#0F172A] font-medium text-sm mb-0.5">{priority.title}</h3>
                    <p className="text-[#94A3B8] text-xs leading-relaxed">{priority.description}</p>
                    <button className="text-[#2F55FF] text-xs mt-2 flex items-center gap-0.5 hover:underline">
                      {priority.action} <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copilot */}
        <div className="dashboard-card p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#22C55E]/20 to-transparent"></div>
          
          <div className="flex items-center gap-2 mb-5">
            <div className="copilot-icon w-7 h-7 rounded-lg bg-[#ECFDF5] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#22C55E]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">Copilot</h2>
              <span className="text-[10px] text-[#22C55E] uppercase tracking-wider font-medium">AI-Powered</span>
            </div>
          </div>

          <div className="typing-indicator flex items-center gap-1.5 mb-4 pl-3">
            <span></span><span></span><span></span>
            <span className="text-[11px] text-[#CBD5E1] ml-1">Analyzing pipeline...</span>
          </div>
          
          <div className="space-y-4">
            {recommendations.slice(0, 4).map((rec) => (
              <div key={rec.id} className="copilot-insight rounded-lg py-3 pr-3" data-testid={`recommendation-${rec.id}`}>
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-[#0F172A] font-medium text-sm">{rec.brand_name}</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] font-mono">
                    {rec.confidence}%
                  </span>
                </div>
                <p className="text-[#94A3B8] text-xs mb-2">{rec.title}</p>
                
                <div className="h-1 bg-[#F1F5F9] rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-[#2F55FF] rounded-full" style={{ width: `${rec.confidence}%` }}></div>
                </div>

                <div className="flex items-center gap-2">
                  <button className="text-[11px] rounded-lg bg-[#2F55FF] text-[#0F172A] px-3 py-1 hover:bg-[#2445DD] transition-colors">Pursue</button>
                  <button className="text-[11px] rounded-lg text-[#94A3B8] px-3 py-1 hover:text-[#64748B] hover:bg-[#F1F5F9] transition-colors">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffOverview;
