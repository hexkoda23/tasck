import React from 'react';
import { getCreator, formatNairaV3 } from '../../../lib/v3data';
import { Wallet, ArrowDownLeft, TrendingUp, Clock, BarChart3, CheckCircle } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorWallet = () => {
  const creator = getCreator(creatorId);

  // Seeded historical earnings for Rema — from past TASCK projects + current pipeline
  const totalEarnings = 142000000;
  const pendingAmount = 88000000;
  const availableBalance = totalEarnings;

  const monthlyData = [
    { month: 'Sep 2025', amount: 0 },
    { month: 'Oct 2025', amount: 28000000 },
    { month: 'Nov 2025', amount: 45000000 },
    { month: 'Dec 2025', amount: 38000000 },
    { month: 'Jan 2026', amount: 31000000 },
    { month: 'Feb 2026', amount: 0 },
    { month: 'Mar 2026', amount: 0 },
  ];
  const maxMonthly = Math.max(...monthlyData.map(m => m.amount), 1);

  // Seeded transaction history for Rema
  const transactions = [
    { id: 'tx-r1', label: 'Creative direction fee — Puma Afrobeats Campaign', brand: 'Puma', project: 'Puma × Rema: Move Different', amount: 45000000, date: '15 Nov 2025', status: 'paid' },
    { id: 'tx-r2', label: 'Music score delivery — Puma campaign', brand: 'Puma', project: 'Puma × Rema: Move Different', amount: 18000000, date: '28 Nov 2025', status: 'paid' },
    { id: 'tx-r3', label: 'Campaign film — final master', brand: 'Puma', project: 'Puma × Rema: Move Different', amount: 22000000, date: '10 Dec 2025', status: 'paid' },
    { id: 'tx-r4', label: 'Social content package (12 assets)', brand: 'Puma', project: 'Puma × Rema: Move Different', amount: 12000000, date: '18 Dec 2025', status: 'paid' },
    { id: 'tx-r5', label: 'Brand partnership fee — Browns Fashion', brand: 'Browns', project: 'Browns × Rema: Lagos to London', amount: 28000000, date: '5 Jan 2026', status: 'paid' },
    { id: 'tx-r6', label: 'Documentary direction — Browns', brand: 'Browns', project: 'Browns × Rema: Lagos to London', amount: 17000000, date: '22 Jan 2026', status: 'paid' },
    { id: 'tx-r7', label: 'Creator fee — Made of More: Africa (on CS approval)', brand: 'Guinness', project: 'Made of More: Africa', amount: 88000000, date: 'Pending', status: 'pending' },
  ];

  const projectBreakdown = [
    { id: 'pb-1', name: 'Puma × Rema: Move Different', brand: 'Puma', earned: 97000000, total: 97000000, deliverables: '4/4', progress: 100, status: 'Closed' },
    { id: 'pb-2', name: 'Browns × Rema: Lagos to London', brand: 'Browns Fashion', earned: 45000000, total: 45000000, deliverables: '2/2', progress: 100, status: 'Closed' },
    { id: 'pb-3', name: 'Made of More: Africa', brand: 'Guinness', earned: 0, total: 88000000, deliverables: '0/8', progress: 0, status: 'In Plan' },
  ];

  return (
    <div data-testid="v3-creator-wallet">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">WALLET</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Wallet</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Your earnings and payment history.</p>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl p-5 border border-[#173D30]" style={{ background: '#1F4A3A' }}>
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-white/50" strokeWidth={1.5} />
            <p className="text-[11px] text-white/50 uppercase tracking-wider">Available Balance</p>
          </div>
          <p className="text-2xl font-semibold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(availableBalance)}</p>
          <p className="text-[10px] text-white/40 mt-1">From 6 approved deliverables</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Pending</p>
          </div>
          <p className="text-2xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(pendingAmount)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">Guinness CS approval pending</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Total Earned</p>
          </div>
          <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalEarnings + pendingAmount)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">Lifetime on TASCK</p>
        </div>
      </div>

      {/* Earnings chart */}
      <div className="v3-card p-5 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
          <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider">Monthly Earnings</h3>
          <span className="ml-auto text-[10px] text-[#8A8A8A]">Last 7 months</span>
        </div>
        <div className="flex items-end gap-3 h-28">
          {monthlyData.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {m.amount > 0 ? formatNairaV3(m.amount) : ''}
              </span>
              <div className="w-full rounded-t-md transition-all" style={{
                background: m.amount > 0 ? '#1F4A3A' : '#E8E4DB',
                height: `${Math.max((m.amount / maxMonthly) * 80, 4)}px`,
                opacity: m.amount > 0 ? 1 : 0.3,
              }} />
              <span className="text-[9px] text-[#8A8A8A]">{m.month.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Project breakdown */}
      <div className="mb-8">
        <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Project Breakdown</h2>
        <div className="space-y-2">
          {projectBreakdown.map(proj => (
            <div key={proj.id} className="v3-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[12px] font-medium text-[#1A1A1A] flex-1">{proj.brand} — {proj.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  proj.status === 'Closed' ? 'text-[#1F4A3A] bg-[#DDE7E2]' : 'text-[#C49B5F] bg-[#C49B5F12]'
                }`}>{proj.status}</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div className="h-full bg-[#1F4A3A] rounded-full" style={{ width: `${proj.progress}%` }} />
                </div>
                <span className="text-[10px] text-[#8A8A8A]">{proj.deliverables}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8A8A8A]">Earned: <span className="text-[#1F4A3A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.earned)}</span></span>
                <span className="text-[#8A8A8A]">Total: <span className="text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(proj.total)}</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Transaction History</h2>
      <div className="space-y-2">
        {transactions.map(tx => (
          <div key={tx.id} className="v3-card p-3 flex items-center gap-3" data-testid={`tx-${tx.id}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tx.status === 'paid' ? 'bg-[#DDE7E2]' : 'bg-[#F4F2EC]'}`}>
              {tx.status === 'paid' ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#1F4A3A]" /> : <Clock className="w-3.5 h-3.5 text-[#C49B5F]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#1A1A1A] truncate">{tx.label}</p>
              <p className="text-[10px] text-[#8A8A8A]">{tx.brand} — {tx.project}</p>
            </div>
            <span className="text-[10px] text-[#8A8A8A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tx.date}</span>
            {tx.status === 'paid' ? (
              <span className="text-[12px] font-medium text-[#1F4A3A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{formatNairaV3(tx.amount)}</span>
            ) : (
              <span className="text-[10px] text-[#C49B5F] bg-[#C49B5F12] px-2 py-0.5 rounded flex-shrink-0">Pending</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default V3CreatorWallet;
