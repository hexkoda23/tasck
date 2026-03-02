import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSuperCreatives, getProjects } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import WelcomeBanner from '../../components/shared/WelcomeBanner';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  FolderOpen, Users, Star, Target, Sparkles, ArrowRight
} from 'lucide-react';

export const BrandOverview = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [campaignsRes, talentRes] = await Promise.all([
          getProjects(),
          getSuperCreatives()
        ]);
        setCampaigns(campaignsRes.data.filter(p => p.brand_name).slice(0, 3));
        setRecommendations(talentRes.data.slice(0, 3).map((t, i) => ({
          ...t,
          match: 95 - i * 4,
          reason: i === 0 ? 'Youth crossover appeal. Previous alcohol brand work.' :
                  i === 1 ? 'Rising female voice. Aspirational audience.' :
                  'Street culture credibility. Lagos nightlife.'
        })));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-5 animate-fade-in" data-testid="brand-overview">
      <WelcomeBanner
        role="brand"
        userName={user?.name || 'Adenike'}
        subtitle="3 active campaigns and 1 partnership renewal due this month."
        stats={[
          { label: 'Spend YTD', value: '₦73M' },
          { label: 'Artists', value: '6' },
          { label: 'Avg ROI', value: '287%' }
        ]}
      />

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {loading ? (
          Array(5).fill(0).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <MetricCard title="Active Campaigns" value="3" icon={<FolderOpen className="w-3.5 h-3.5" />} />
            <MetricCard title="Total Spend YTD" value={formatNaira(73000000, { compact: true })} />
            <MetricCard title="Artists Engaged" value="6" icon={<Users className="w-3.5 h-3.5" />} />
            <MetricCard title="Avg Campaign ROI" value="287%" icon={<Target className="w-3.5 h-3.5" />} />
            <MetricCard title="Pending Approvals" value="4" subtitle="tasks awaiting review" />
          </>
        )}
      </div>

      {/* Two Column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* AI Talent */}
        <div className="dashboard-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#22C55E]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">Recommended For You</h2>
          </div>
          <p className="text-[#94A3B8] text-[10px] mb-4">
            Based on {user?.brand_name || 'Guinness Nigeria'}'s positioning
          </p>
          <div className="space-y-3">
            {recommendations.map((talent) => (
              <div key={talent.id} className="bg-[#F8FAFC] rounded-lg p-3 hover:bg-[#F1F5F9] transition-colors" data-testid={`talent-rec-${talent.id}`}>
                <div className="flex items-start gap-3">
                  <Avatar name={talent.team_name} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-medium text-[#0F172A]">{talent.team_name}</h3>
                      <span className="text-[#22C55E] text-[10px] font-mono">{talent.match}%</span>
                    </div>
                    <p className="text-[#64748B] text-[10px]">{talent.principal_artist} &bull; {talent.genre}</p>
                    <p className="text-[#94A3B8] text-[10px] mt-1">{talent.reason}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="text-[#2F55FF] text-[10px] hover:underline">View Profile</button>
                      <span className="text-[#E2E8F0]">&bull;</span>
                      <button className="text-[#2F55FF] text-[10px] hover:underline">Request Proposal</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-3 text-[#2F55FF] text-xs flex items-center gap-1 hover:underline">
            Discover More <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Active Campaigns */}
        <div className="dashboard-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#0F172A]">Active Campaigns</h2>
            <button className="text-[#2F55FF] text-xs hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-[#F8FAFC] rounded-lg p-3" data-testid={`campaign-${campaign.id}`}>
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <h3 className="text-xs font-medium text-[#0F172A]">{campaign.title}</h3>
                    <p className="text-[#64748B] text-[10px]">{campaign.super_creative_name}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-[#64748B] mb-1">
                    <span>Progress</span>
                    <span>{campaign.completion}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${campaign.completion}%` }}></div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-[#94A3B8]">Budget: {formatNaira(campaign.budget, { compact: true })}</span>
                  <span className="text-[#94A3B8]">Tasks: {campaign.tasks_completed}/{campaign.tasks_total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandOverview;
