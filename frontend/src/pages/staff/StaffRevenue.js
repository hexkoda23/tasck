import React from 'react';
import { formatNaira } from '../../lib/utils';
import { BarChart3, TrendingUp, Users, Building2, Target, ArrowUp, ArrowDown } from 'lucide-react';

const revenueData = {
  ytd: 234800000,
  target: 500000000,
  commission: 35200000,
  avgDealSize: 52300000,
  dealsClosedYtd: 14,
  winRate: 68
};

const artistRevenue = [
  { name: 'DMW (Davido)', revenue: 203700000, deals: 5 },
  { name: 'Starboy (Wizkid)', revenue: 187400000, deals: 3 },
  { name: 'Spaceship (Burna Boy)', revenue: 156200000, deals: 4 },
  { name: 'Rema Team', revenue: 134600000, deals: 2 },
  { name: 'Leading Vibes (Tems)', revenue: 92100000, deals: 2 },
  { name: 'Mavin Records (Don Jazzy)', revenue: 78500000, deals: 3 },
  { name: 'Mavin Talent (Ayra Starr)', revenue: 67300000, deals: 3 },
  { name: 'Tiwa Savage Team', revenue: 55400000, deals: 2 },
  { name: 'YBNL (Olamide)', revenue: 45800000, deals: 2 },
  { name: 'Asake Team', revenue: 42600000, deals: 1 }
];

const categoryRevenue = [
  { name: 'Telecoms', percentage: 31, amount: 72900000 },
  { name: 'FMCG/Beverages', percentage: 28, amount: 65700000 },
  { name: 'Banking/Finance', percentage: 18, amount: 42300000 },
  { name: 'Tech/Fintech', percentage: 12, amount: 28200000 },
  { name: 'Entertainment', percentage: 8, amount: 18800000 },
  { name: 'Others', percentage: 3, amount: 7000000 }
];

export const StaffRevenue = () => {
  const progressPercent = (revenueData.ytd / revenueData.target) * 100;
  const maxRevenue = Math.max(...artistRevenue.map(a => a.revenue));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-revenue">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Revenue Intelligence</h1>
          <p className="text-white/50 text-sm">Financial analytics and forecasting</p>
        </div>
        <button className="btn-secondary">Export Report</button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-xs mb-1">Revenue YTD</p>
          <p className="text-2xl font-bold text-[#6BFF9A] font-mono">{formatNaira(revenueData.ytd, { compact: true })}</p>
          <p className="text-xs text-[#6BFF9A] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 42% vs last year</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-xs mb-1">TASCK Commission</p>
          <p className="text-2xl font-bold text-white font-mono">{formatNaira(revenueData.commission, { compact: true })}</p>
          <p className="text-xs text-[#6BFF9A] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 38%</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-xs mb-1">Avg Deal Size</p>
          <p className="text-2xl font-bold text-white font-mono">{formatNaira(revenueData.avgDealSize, { compact: true })}</p>
          <p className="text-xs text-[#6BFF9A] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 15%</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-xs mb-1">Deals Closed</p>
          <p className="text-2xl font-bold text-white font-mono">{revenueData.dealsClosedYtd}</p>
          <p className="text-xs text-white/40">+5 vs last year</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-xs mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-white font-mono">{revenueData.winRate}%</p>
          <p className="text-xs text-[#6BFF9A] flex items-center gap-1"><ArrowUp className="w-3 h-3" /> 7pp</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-white/50 text-xs mb-1">Avg Days to Close</p>
          <p className="text-2xl font-bold text-white font-mono">34</p>
          <p className="text-xs text-[#6BFF9A] flex items-center gap-1"><ArrowDown className="w-3 h-3" /> -6 days</p>
        </div>
      </div>

      {/* Target Progress */}
      <div className="dashboard-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Annual Target Progress</h2>
          <span className="text-[#6BFF9A] font-mono">{progressPercent.toFixed(0)}%</span>
        </div>
        <div className="progress-bar h-4 mb-2">
          <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className="flex items-center justify-between text-sm text-white/40">
          <span>Current: {formatNaira(revenueData.ytd)}</span>
          <span>Target: {formatNaira(revenueData.target)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Artist */}
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Revenue by Artist</h2>
          <div className="space-y-3">
            {artistRevenue.map((artist) => (
              <div key={artist.name} className="flex items-center gap-4">
                <div className="w-32 text-sm text-white/80 truncate">{artist.name.split('(')[0].trim()}</div>
                <div className="flex-1">
                  <div className="h-6 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[#2F55FF] to-[#6BFF9A] rounded-full"
                      style={{ width: `${(artist.revenue / maxRevenue) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-24 text-right font-mono text-[#6BFF9A] text-sm">
                  {formatNaira(artist.revenue, { compact: true })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="dashboard-card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Revenue by Category</h2>
          <div className="space-y-4">
            {categoryRevenue.map((cat, i) => {
              const colors = ['bg-[#2F55FF]', 'bg-[#6BFF9A]', 'bg-[#FFA502]', 'bg-[#7C5CFC]', 'bg-[#FF4757]', 'bg-white/30'];
              return (
                <div key={cat.name} className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${colors[i]}`}></div>
                  <div className="flex-1 text-white/80 text-sm">{cat.name}</div>
                  <div className="text-white/40 text-sm">{cat.percentage}%</div>
                  <div className="w-24 text-right font-mono text-white text-sm">
                    {formatNaira(cat.amount, { compact: true })}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Simple donut representation */}
          <div className="mt-6 flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {categoryRevenue.reduce((acc, cat, i) => {
                  const colors = ['#2F55FF', '#6BFF9A', '#FFA502', '#7C5CFC', '#FF4757', 'rgba(255,255,255,0.3)'];
                  const offset = acc.offset;
                  acc.elements.push(
                    <circle
                      key={cat.name}
                      cx="18" cy="18" r="15.9"
                      fill="none"
                      stroke={colors[i]}
                      strokeWidth="3"
                      strokeDasharray={`${cat.percentage} ${100 - cat.percentage}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  acc.offset += cat.percentage;
                  return acc;
                }, { elements: [], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white font-mono">{formatNaira(revenueData.ytd, { compact: true })}</p>
                  <p className="text-xs text-white/40">Total</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffRevenue;
