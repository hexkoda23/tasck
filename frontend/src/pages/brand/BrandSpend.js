import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

const spendData = {
  totalBudget: 123000000,
  totalSpent: 79800000,
  remaining: 43200000,
  monthlyBurn: 18500000
};

const campaignSpend = [
  { name: 'Guinness x Burna Boy', budget: 45000000, spent: 18500000, remaining: 26500000, status: 'on_track' },
  { name: 'Guinness Foreign Extra x Davido', budget: 38000000, spent: 22300000, remaining: 15700000, status: 'on_track' },
  { name: "Smithwick's x Don Jazzy", budget: 25000000, spent: 24200000, remaining: 800000, status: 'near_limit' },
  { name: 'Harp Lager x Olamide', budget: 15000000, spent: 14800000, remaining: 200000, status: 'completed' }
];

const recentPayments = [
  { id: 1, description: 'Kelechi Amadi-Obi - Hero Visual Set 1', campaign: 'Guinness x Burna Boy', amount: 350000, date: '2026-03-01', status: 'completed' },
  { id: 2, description: 'Ade Adesanya - TV Spot Production', campaign: 'Guinness Foreign Extra', amount: 1200000, date: '2026-02-28', status: 'completed' },
  { id: 3, description: 'Mavin Records - Episode 11 Production', campaign: "Smithwick's x Don Jazzy", amount: 2000000, date: '2026-02-25', status: 'completed' },
  { id: 4, description: 'Chidinma Okafor - Social Media Design Pack', campaign: 'Harp Lager Festive', amount: 450000, date: '2026-02-20', status: 'completed' },
  { id: 5, description: 'TASCK Platform Fee (15%)', campaign: 'Guinness x Burna Boy', amount: 2775000, date: '2026-02-15', status: 'completed' },
  { id: 6, description: 'Escrow Funding - Burna Boy Campaign Phase 2', campaign: 'Guinness x Burna Boy', amount: 15000000, date: '2026-02-10', status: 'held_in_escrow' }
];

const formatNaira = (amount) => {
  if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
  return `₦${amount.toLocaleString()}`;
};

export const BrandSpend = () => {
  const spentPercent = (spendData.totalSpent / spendData.totalBudget) * 100;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="brand-spend">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Spend Tracking</h1>
          <p className="text-[#64748B] text-sm">Budget utilization and payment history</p>
        </div>
        <button className="btn-secondary">Export Statement</button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-5 bg-gradient-to-br from-[#2F55FF]/20 to-transparent">
          <Wallet className="w-6 h-6 text-[#2F55FF] mb-3" />
          <p className="text-[#64748B] text-sm">Total Budget</p>
          <p className="text-xl font-bold text-[#0F172A] font-mono">{formatNaira(spendData.totalBudget)}</p>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-[#64748B] text-sm">Total Spent</p>
          <p className="text-lg font-bold text-[#22C55E] font-mono">{formatNaira(spendData.totalSpent)}</p>
          <p className="text-xs text-[#94A3B8] mt-1">{spentPercent.toFixed(0)}% utilized</p>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-[#64748B] text-sm">Remaining</p>
          <p className="text-lg font-bold text-[#0F172A] font-mono">{formatNaira(spendData.remaining)}</p>
        </div>
        <div className="dashboard-card p-5">
          <TrendingUp className="w-5 h-5 text-[#D97706] mb-2" />
          <p className="text-[#64748B] text-sm">Monthly Burn Rate</p>
          <p className="text-lg font-bold text-[#D97706] font-mono">{formatNaira(spendData.monthlyBurn)}</p>
        </div>
      </div>

      {/* Budget by Campaign */}
      <div className="dashboard-card p-5">
        <h2 className="text-sm font-semibold text-[#0F172A] mb-4">Budget by Campaign</h2>
        <div className="space-y-6">
          {campaignSpend.map((campaign) => {
            const percent = (campaign.spent / campaign.budget) * 100;
            return (
              <div key={campaign.name}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[#0F172A] font-medium">{campaign.name}</span>
                    {campaign.status === 'near_limit' && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Near Limit
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-[#94A3B8]">Spent: <span className="text-[#0F172A] font-mono">{formatNaira(campaign.spent)}</span></span>
                    <span className="text-[#94A3B8]">of <span className="text-[#0F172A] font-mono">{formatNaira(campaign.budget)}</span></span>
                  </div>
                </div>
                <div className="progress-bar h-3">
                  <div
                    className={`h-full rounded-full transition-all ${percent > 90 ? 'bg-[#FFA502]' : 'bg-gradient-to-r from-[#2F55FF] to-[#6BFF9A]'}`}
                    style={{ width: `${percent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-[#94A3B8] mt-1">
                  <span>{percent.toFixed(0)}% used</span>
                  <span>{formatNaira(campaign.remaining)} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="dashboard-card overflow-hidden">
        <div className="p-4 border-b border-[#F1F5F9]">
          <h2 className="text-sm font-semibold text-[#0F172A]">Recent Payments</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Campaign</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentPayments.map((payment) => (
              <tr key={payment.id}>
                <td className="text-[#475569] text-sm">{payment.description}</td>
                <td className="text-[#64748B] text-sm">{payment.campaign}</td>
                <td className="text-[#DC2626] font-mono">-{formatNaira(payment.amount)}</td>
                <td className="text-[#94A3B8] text-sm">{payment.date}</td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    payment.status === 'completed' ? 'bg-[#22C55E]/20 text-[#22C55E]' : 'bg-[#FFFBEB] text-[#D97706]'
                  }`}>
                    {payment.status === 'held_in_escrow' ? 'In Escrow' : 'Completed'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandSpend;
