import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getStaffStats, getActivities } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  Handshake, Target, BarChart3, Users, FolderOpen, Building2,
  ArrowUpRight, TrendingUp, Clock
} from 'lucide-react';

export const StaffOverview = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          getStaffStats(),
          getActivities()
        ]);
        setStats(statsRes.data);
        setActivities(activityRes.data.slice(0, 6));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="staff-overview">
      <WelcomeBanner
        role="staff"
        userName={user?.name?.split(' ')[0] || 'Adaeze'}
        subtitle="3 closing this week. Pipeline is 15% ahead of target."
        stats={[
          { label: 'Pipeline', value: '₦240.2M' },
          { label: 'Revenue YTD', value: '₦234.8M' },
          { label: 'Close Rate', value: '68%' }
        ]}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading ? (
          Array(6).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard
              title="Active Deals"
              value="5"
              subtitle="3 closing this week"
              change="+27%"
              icon={<Handshake className="w-3.5 h-3.5" />}
            />
            <MetricCard
              title="Pipeline Value"
              value="₦240.2M"
              subtitle="Weighted: ₦117.7M"
              change="+15%"
              icon={<TrendingUp className="w-3.5 h-3.5" />}
            />
            <MetricCard
              title="Revenue YTD"
              value="₦234.8M"
              subtitle="Target: ₦500M (47%)"
              icon={<BarChart3 className="w-3.5 h-3.5" />}
            />
            <MetricCard
              title="Artists Managed"
              value="4"
              subtitle="2 onboarding"
              icon={<Users className="w-3.5 h-3.5" />}
            />
            <MetricCard
              title="Active Projects"
              value="6"
              subtitle="4 in fulfillment"
              icon={<FolderOpen className="w-3.5 h-3.5" />}
            />
            <MetricCard
              title="Brand Relationships"
              value="12"
              subtitle="5 new this quarter"
              change="+3"
              icon={<Building2 className="w-3.5 h-3.5" />}
            />
          </>
        )}
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Activity */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Recent Activity</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-[#F1F5F9] last:border-0" data-testid={`activity-${activity.id}`}>
                <Avatar name={activity.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#475569]">
                    <span className="font-medium text-[#0F172A]">{activity.user}</span>{' '}
                    {activity.action}
                  </p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Pipeline Summary</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">Full Pipeline</button>
          </div>
          <div className="space-y-3">
            {[
              { stage: 'Discovery', count: 3, value: '₦45M', color: '#2F55FF' },
              { stage: 'Proposal', count: 2, value: '₦82M', color: '#8B5CF6' },
              { stage: 'Negotiation', count: 2, value: '₦65M', color: '#F59E0B' },
              { stage: 'Contract', count: 1, value: '₦48.2M', color: '#22C55E' }
            ].map((item) => (
              <div key={item.stage} className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-[#475569]">{item.stage}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[#94A3B8]">{item.count} deals</span>
                  <span className="text-xs font-medium text-[#0F172A] font-mono">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
            <span className="text-xs text-[#94A3B8]">Total Pipeline</span>
            <span className="text-sm font-bold text-[#0F172A] font-mono">₦240.2M</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffOverview;
