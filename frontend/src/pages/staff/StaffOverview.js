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

  const formatHeaderDate = () => {
    return new Date().toLocaleDateString('en-NG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getActivityStatus = (metadata) => {
    const status = metadata?.status;
    if (status === 'success') return 'status-dot-success';
    if (status === 'warning') return 'status-dot-warning';
    if (status === 'error') return 'status-dot-error';
    return 'status-dot-info';
  };

  const priorities = [
    { id: 1, title: 'Close Guinness Contract', description: 'Burna Boy x Guinness ₦45M deal. Contract sent March 1. Adenike wants signed by Friday.', action: 'Follow Up' },
    { id: 2, title: 'Respond to MTN Counter-Offer', description: 'Tems ambassador deal dropped from ₦75M to ₦62M. Need to counter or accept.', action: 'Open Deal Room' },
    { id: 3, title: 'Staff Coca-Cola Project', description: 'Coke Studio Africa 2026. Need to create project and post 8 opportunities.', action: 'Create Project' },
    { id: 4, title: 'Review Overdue Deliverables', description: '2 tasks overdue across active projects. Ade Adesanya 1 day late on MTN content.', action: 'View Tasks' }
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="staff-overview">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">
          {getGreeting()}, {user?.name?.split(' ')[0] || 'Tunde'}
        </h1>
        <p className="text-white/35 text-sm">{formatHeaderDate()} &middot; Lagos (WAT)</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 stagger-children">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title="Active Deals" value={stats?.active_deals || 14} subtitle="3 closing this week" trend="Up 27% vs last month" trendDirection="up" />
            <MetricCard title="Pipeline Value" value={formatNaira(stats?.pipeline_value || 847200000, { compact: true })} subtitle={`Weighted: ${formatNaira(stats?.weighted_pipeline || 412500000, { compact: true })}`} trend="Up 15% vs last quarter" trendDirection="up" />
            <MetricCard title="Revenue YTD" value={formatNaira(stats?.revenue_ytd || 234800000, { compact: true })} subtitle={`Target: ${formatNaira(500000000, { compact: true })} (47%)`} />
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
            <h2 className="text-sm font-semibold text-white tracking-tight">Live Activity</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-white/30 text-sm">No recent activity</div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 group" data-testid={`activity-${activity.id}`}>
                  <div className="flex flex-col items-center pt-1.5">
                    <div className={`status-dot ${getActivityStatus(activity.metadata)}`}></div>
                    <div className="w-px flex-1 bg-white/5 mt-1"></div>
                  </div>
                  <div className="flex-1 min-w-0 pb-4">
                    <p className="text-sm text-white/70 leading-relaxed">{activity.description}</p>
                    <span className="text-[11px] text-white/30 mt-1 block">{formatRelativeTime(activity.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Priorities */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight">Today's Priorities</h2>
            <Clock className="w-4 h-4 text-white/20" />
          </div>
          
          <div className="space-y-3">
            {priorities.map((priority, index) => (
              <div 
                key={priority.id}
                className="rounded-lg p-4 hover:bg-white/[0.03] transition-colors cursor-pointer border border-transparent hover:border-white/5"
                data-testid={`priority-${priority.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#2F55FF]/15 text-[#2F55FF] flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm mb-1">{priority.title}</h3>
                    <p className="text-white/35 text-xs leading-relaxed">{priority.description}</p>
                    <button className="text-[#6BFF9A] text-xs mt-2 flex items-center gap-0.5 hover:underline">
                      {priority.action}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations (Copilot) */}
        <div className="dashboard-card p-6 relative overflow-hidden">
          {/* Shimmer effect on header */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#6BFF9A]/20 to-transparent"></div>
          
          <div className="flex items-center gap-2 mb-5">
            <div className="copilot-icon w-7 h-7 rounded-lg bg-[#6BFF9A]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#6BFF9A]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-tight">Copilot</h2>
              <span className="text-[10px] text-[#6BFF9A]/60 uppercase tracking-wider">AI-Powered</span>
            </div>
          </div>

          {/* Typing indicator */}
          <div className="typing-indicator flex items-center gap-1.5 mb-4 pl-3">
            <span></span><span></span><span></span>
            <span className="text-[11px] text-white/25 ml-1">Analyzing pipeline...</span>
          </div>
          
          <div className="space-y-4">
            {recommendations.slice(0, 4).map((rec) => (
              <div 
                key={rec.id}
                className="copilot-insight rounded-lg py-3 pr-3"
                data-testid={`recommendation-${rec.id}`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-white font-medium text-sm">{rec.brand_name}</h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#6BFF9A]/12 text-[#6BFF9A] font-mono">
                    {rec.confidence}%
                  </span>
                </div>
                <p className="text-white/40 text-xs mb-2">{rec.title}</p>
                
                {/* Match progress bar */}
                <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-[#2F55FF] to-[#6BFF9A] rounded-full" style={{ width: `${rec.confidence}%` }}></div>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {rec.recommended_artists?.slice(0, 2).map((artist, i) => (
                    <span key={i} className="text-[11px] bg-white/5 px-2 py-0.5 rounded-full text-white/50">
                      {artist.name.split('(')[0].trim()} <span className={getMatchColor(artist.match)}>{artist.match}%</span>
                    </span>
                  ))}
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="text-[11px] rounded-full bg-[#2F55FF] text-white px-3 py-1 hover:bg-[#2F55FF]/80 transition-colors">Pursue</button>
                  <button className="text-[11px] rounded-full text-white/30 px-3 py-1 hover:text-white/50 transition-colors">Dismiss</button>
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
