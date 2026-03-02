import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSuperCreatives, getProjects } from '../../lib/api';
import { formatNaira, formatRelativeTime } from '../../lib/utils';
import MetricCard, { MetricCardSkeleton } from '../../components/shared/MetricCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import Avatar from '../../components/shared/Avatar';
import { 
  FolderOpen, 
  Users,
  Star,
  Target,
  Search,
  Filter,
  Sparkles,
  ArrowRight
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
        // Simulate AI recommendations
        setRecommendations(talentRes.data.slice(0, 3).map((t, i) => ({
          ...t,
          match: 95 - i * 4,
          reason: i === 0 ? 'Youth crossover appeal. Previous alcohol brand work. Global recognition.' :
                  i === 1 ? 'Rising female voice. Aspirational audience. Diversity alignment.' :
                  'Street culture credibility. Lagos nightlife association.'
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
    <div className="space-y-6 animate-fade-in" data-testid="brand-overview">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A] mb-1">
          Welcome back, {user?.name || 'Adenike'}
        </h1>
        <p className="text-[#64748B] text-sm">
          {user?.brand_name || 'Guinness Nigeria'} has 3 active campaigns and 1 partnership renewal due this month.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard
          title="Active Campaigns"
          value="3"
          icon={<FolderOpen className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Spend YTD"
          value={formatNaira(73000000, { compact: true })}
        />
        <MetricCard
          title="Artists Engaged"
          value="6"
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          title="Avg Campaign ROI"
          value="287%"
          icon={<Target className="w-4 h-4" />}
        />
        <MetricCard
          title="Pending Approvals"
          value="4"
          subtitle="tasks awaiting review"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Talent Recommendations */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#22C55E]" />
            <h2 className="text-lg font-semibold text-[#0F172A]">Recommended For You</h2>
          </div>
          <p className="text-[#94A3B8] text-xs mb-4">
            Based on {user?.brand_name || 'Guinness Nigeria'}'s brand positioning and target demographic
          </p>
          
          <div className="space-y-4">
            {recommendations.map((talent, index) => (
              <div 
                key={talent.id}
                className="bg-[#F8FAFC] rounded-lg p-4 hover:bg-[#F1F5F9] transition-colors"
                data-testid={`talent-rec-${talent.id}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={talent.team_name} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#0F172A] font-medium">{talent.team_name}</h3>
                      <span className="text-[#22C55E] text-sm font-mono">{talent.match}% Match</span>
                    </div>
                    <p className="text-[#64748B] text-sm">{talent.principal_artist} • {talent.genre}</p>
                    <p className="text-[#94A3B8] text-xs mt-2">{talent.reason}</p>
                    
                    <div className="mt-3 flex items-center gap-2">
                      <button className="text-[#2F55FF] text-xs hover:underline">View Profile</button>
                      <span className="text-[#E2E8F0]">•</span>
                      <button className="text-[#2F55FF] text-xs hover:underline">Request Proposal</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="mt-4 text-[#2F55FF] text-sm flex items-center gap-1 hover:underline">
            Discover More Talent <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Active Campaigns */}
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#0F172A]">Active Campaigns</h2>
            <button className="text-[#2F55FF] text-sm hover:underline">View All</button>
          </div>
          
          <div className="space-y-4">
            {campaigns.map((campaign) => (
              <div 
                key={campaign.id}
                className="bg-[#F8FAFC] rounded-lg p-4"
                data-testid={`campaign-${campaign.id}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-[#0F172A] font-medium">{campaign.title}</h3>
                    <p className="text-[#64748B] text-sm">{campaign.super_creative_name}</p>
                  </div>
                  <StatusBadge status={campaign.status} />
                </div>
                
                {/* Progress */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span>Campaign Progress</span>
                    <span>{campaign.completion}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${campaign.completion}%` }}></div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between text-xs">
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
