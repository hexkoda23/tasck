import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStaffStats, getActivities, getCopilotRecommendations } from '../../lib/api';
import { formatNaira, formatRelativeTime, getMatchColor } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import { StatusBadge, PriorityBadge } from '../../components/shared/StatusBadge';
import { 
  TrendingUp, 
  Users, 
  Briefcase, 
  Building2, 
  Target,
  ArrowRight,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Clock,
  AlertCircle
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

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Format date for header
  const formatHeaderDate = () => {
    return new Date().toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Activity status to color mapping
  const getActivityStatus = (metadata) => {
    const status = metadata?.status;
    if (status === 'success') return 'status-dot-success';
    if (status === 'warning') return 'status-dot-warning';
    if (status === 'error') return 'status-dot-error';
    return 'status-dot-info';
  };

  // Priority items for today
  const priorities = [
    {
      id: 1,
      title: 'Close Guinness Contract',
      description: 'Burna Boy x Guinness ₦45M deal. Contract sent March 1. Adenike wants signed by Friday.',
      action: 'Follow Up'
    },
    {
      id: 2,
      title: 'Respond to MTN Counter-Offer',
      description: 'Tems ambassador deal dropped from ₦75M to ₦62M. Need to counter or accept.',
      action: 'Open Deal Room'
    },
    {
      id: 3,
      title: 'Staff Coca-Cola Project',
      description: 'Coke Studio Africa 2026. Need to create project and post 8 opportunities.',
      action: 'Create Project'
    },
    {
      id: 4,
      title: 'Review Overdue Deliverables',
      description: '2 tasks overdue across active projects. Ade Adesanya 1 day late on MTN content.',
      action: 'View Tasks'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-overview">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Tunde'}
          </h1>
          <p className="text-white/50 text-sm">{formatHeaderDate()} • Lagos (WAT)</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="Active Deals"
              value={stats?.active_deals || 14}
              subtitle="3 closing this week"
              trend="Up 27% vs last month"
              trendDirection="up"
              icon={<Briefcase className="w-4 h-4" />}
            />
            <MetricCard
              title="Pipeline Value"
              value={formatNaira(stats?.pipeline_value || 847200000, { compact: true })}
              subtitle={`Weighted: ${formatNaira(stats?.weighted_pipeline || 412500000, { compact: true })}`}
              trend="Up 15% vs last quarter"
              trendDirection="up"
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <MetricCard
              title="Revenue YTD"
              value={formatNaira(stats?.revenue_ytd || 234800000, { compact: true })}
              subtitle={`Target: ${formatNaira(500000000, { compact: true })} (47%)`}
              icon={<Target className="w-4 h-4" />}
            />
            <MetricCard
              title="Artists Managed"
              value={stats?.artists_managed || 8}
              subtitle="2 onboarding"
              icon={<Users className="w-4 h-4" />}
            />
            <MetricCard
              title="Active Projects"
              value={stats?.active_projects || 11}
              subtitle="4 in fulfillment"
              icon={<Briefcase className="w-4 h-4" />}
            />
            <MetricCard
              title="Brand Relationships"
              value={stats?.brand_relationships || 23}
              subtitle="5 new this quarter"
              trend="Up 3"
              trendDirection="up"
              icon={<Building2 className="w-4 h-4" />}
            />
          </>
        )}
      </div>

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Live Activity</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {activities.length === 0 ? (
              <div className="text-white/40 text-sm">No recent activity</div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 group" data-testid={`activity-${activity.id}`}>
                  <div className={`status-dot mt-2 ${getActivityStatus(activity.metadata)}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 leading-relaxed">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/40">{formatRelativeTime(activity.created_at)}</span>
                      <button className="text-xs text-[#2F55FF] opacity-0 group-hover:opacity-100 transition-opacity">
                        View Deal
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Today's Priorities */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Today's Priorities</h2>
            <Clock className="w-4 h-4 text-white/40" />
          </div>
          
          <div className="space-y-4">
            {priorities.map((priority, index) => (
              <div 
                key={priority.id}
                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                data-testid={`priority-${priority.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#2F55FF]/20 text-[#2F55FF] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm mb-1">{priority.title}</h3>
                    <p className="text-white/50 text-xs leading-relaxed">{priority.description}</p>
                    <button className="text-[#2F55FF] text-xs mt-2 flex items-center gap-1 hover:underline">
                      {priority.action}
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#6BFF9A]" />
            <h2 className="text-lg font-semibold text-white">Copilot Recommendations</h2>
          </div>
          
          <div className="space-y-4">
            {recommendations.slice(0, 3).map((rec) => (
              <div 
                key={rec.id}
                className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg p-4 border border-white/5"
                data-testid={`recommendation-${rec.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-white font-medium text-sm">{rec.brand_name}</h3>
                    <p className="text-white/40 text-xs">{rec.title}</p>
                  </div>
                  <span className="text-[#6BFF9A] text-xs font-mono">{rec.confidence}% match</span>
                </div>
                
                <p className="text-white/60 text-xs mb-3 line-clamp-2">{rec.description}</p>
                
                <div className="mb-3">
                  <div className="text-xs text-white/40 mb-1">Est. Budget: {rec.estimated_budget}</div>
                  <div className="flex flex-wrap gap-1">
                    {rec.recommended_artists?.slice(0, 2).map((artist, i) => (
                      <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-white/70">
                        {artist.name.split('(')[0].trim()} <span className={getMatchColor(artist.match)}>{artist.match}%</span>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="btn-primary text-xs py-1.5 px-3">Pursue Deal</button>
                  <button className="btn-ghost text-xs">Dismiss</button>
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
