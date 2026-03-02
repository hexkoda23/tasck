import React from 'react';
import { BarChart3, TrendingUp, Eye, Heart, Share2, Users, ArrowUp, ArrowDown } from 'lucide-react';

const campaignMetrics = [
  { campaign: 'Guinness x Burna Boy', impressions: 45200000, engagement: 3200000, engagementRate: 7.1, reach: 28500000, sentiment: 92, trend: 'up' },
  { campaign: 'Guinness Foreign Extra x Davido', impressions: 38700000, engagement: 2800000, engagementRate: 7.2, reach: 24100000, sentiment: 88, trend: 'up' },
  { campaign: "Smithwick's x Don Jazzy", impressions: 22100000, engagement: 1500000, engagementRate: 6.8, reach: 15200000, sentiment: 95, trend: 'stable' },
  { campaign: 'Harp Lager x Olamide', impressions: 18400000, engagement: 1100000, engagementRate: 6.0, reach: 12300000, sentiment: 85, trend: 'down' }
];

const socialBreakdown = [
  { platform: 'Instagram', percentage: 42, impressions: '52.4M', color: 'bg-gradient-to-r from-[#833AB4] to-[#E1306C]' },
  { platform: 'Twitter/X', percentage: 28, impressions: '34.9M', color: 'bg-[#1DA1F2]' },
  { platform: 'TikTok', percentage: 18, impressions: '22.4M', color: 'bg-white/80' },
  { platform: 'YouTube', percentage: 12, impressions: '14.9M', color: 'bg-[#FF0000]' }
];

const monthlyData = [
  { month: 'Sep', value: 65 },
  { month: 'Oct', value: 72 },
  { month: 'Nov', value: 78 },
  { month: 'Dec', value: 95 },
  { month: 'Jan', value: 82 },
  { month: 'Feb', value: 88 },
  { month: 'Mar', value: 92 }
];

const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const BrandAnalytics = () => {
  const maxMonthly = Math.max(...monthlyData.map(d => d.value));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="brand-analytics">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Campaign Analytics</h1>
          <p className="text-[#64748B] text-sm">Performance metrics across all campaigns</p>
        </div>
        <div className="flex gap-2">
          <select className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-2 text-[#475569] text-sm focus:outline-none">
            <option>Last 90 Days</option>
            <option>Last 30 Days</option>
            <option>This Year</option>
          </select>
          <button className="btn-secondary text-sm">Export PDF</button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="dashboard-card p-4">
          <Eye className="w-5 h-5 text-[#2F55FF] mb-2" />
          <p className="text-[#64748B] text-xs">Total Impressions</p>
          <p className="text-2xl font-bold text-[#0F172A] font-mono">124.4M</p>
          <p className="text-xs text-[#22C55E] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 23%</p>
        </div>
        <div className="dashboard-card p-4">
          <Heart className="w-5 h-5 text-[#DC2626] mb-2" />
          <p className="text-[#64748B] text-xs">Total Engagement</p>
          <p className="text-2xl font-bold text-[#0F172A] font-mono">8.6M</p>
          <p className="text-xs text-[#22C55E] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 18%</p>
        </div>
        <div className="dashboard-card p-4">
          <Share2 className="w-5 h-5 text-[#22C55E] mb-2" />
          <p className="text-[#64748B] text-xs">Avg Engagement Rate</p>
          <p className="text-2xl font-bold text-[#22C55E] font-mono">6.9%</p>
          <p className="text-xs text-[#22C55E] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 1.2pp</p>
        </div>
        <div className="dashboard-card p-4">
          <Users className="w-5 h-5 text-[#D97706] mb-2" />
          <p className="text-[#64748B] text-xs">Total Reach</p>
          <p className="text-2xl font-bold text-[#0F172A] font-mono">80.1M</p>
          <p className="text-xs text-[#22C55E] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 31%</p>
        </div>
        <div className="dashboard-card p-4">
          <TrendingUp className="w-5 h-5 text-[#7C3AED] mb-2" />
          <p className="text-[#64748B] text-xs">Brand Sentiment</p>
          <p className="text-2xl font-bold text-[#0F172A] font-mono">90%</p>
          <p className="text-xs text-[#22C55E]">Positive</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Trend */}
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Engagement Trend</h2>
          <div className="flex items-end gap-3 h-48">
            {monthlyData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[#F8FAFC] rounded-t-lg relative" style={{ height: '160px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-gradient-to-t from-[#2F55FF] to-[#6BFF9A] rounded-t-lg transition-all"
                    style={{ height: `${(d.value / maxMonthly) * 100}%` }}
                  ></div>
                </div>
                <span className="text-[#94A3B8] text-xs">{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Breakdown */}
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Social Platform Breakdown</h2>
          <div className="space-y-4">
            {socialBreakdown.map((platform) => (
              <div key={platform.platform}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[#475569] text-sm">{platform.platform}</span>
                  <span className="text-[#64748B] text-sm">{platform.percentage}% — {platform.impressions}</span>
                </div>
                <div className="h-3 bg-[#F8FAFC] rounded-full overflow-hidden">
                  <div className={`h-full ${platform.color} rounded-full`} style={{ width: `${platform.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign Performance Table */}
      <div className="dashboard-card overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9]">
          <h2 className="text-lg font-semibold text-[#0F172A]">Campaign Performance</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Impressions</th>
              <th>Engagement</th>
              <th>Eng. Rate</th>
              <th>Reach</th>
              <th>Sentiment</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {campaignMetrics.map((m) => (
              <tr key={m.campaign}>
                <td className="text-[#0F172A] font-medium">{m.campaign}</td>
                <td className="text-[#64748B] font-mono">{formatNumber(m.impressions)}</td>
                <td className="text-[#64748B] font-mono">{formatNumber(m.engagement)}</td>
                <td className="text-[#22C55E] font-mono">{m.engagementRate}%</td>
                <td className="text-[#64748B] font-mono">{formatNumber(m.reach)}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-[#F8FAFC] rounded-full overflow-hidden">
                      <div className="h-full bg-[#22C55E] rounded-full" style={{ width: `${m.sentiment}%` }}></div>
                    </div>
                    <span className="text-[#64748B] text-sm">{m.sentiment}%</span>
                  </div>
                </td>
                <td>
                  {m.trend === 'up' && <ArrowUp className="w-4 h-4 text-[#22C55E]" />}
                  {m.trend === 'down' && <ArrowDown className="w-4 h-4 text-[#DC2626]" />}
                  {m.trend === 'stable' && <span className="text-[#94A3B8]">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandAnalytics;
