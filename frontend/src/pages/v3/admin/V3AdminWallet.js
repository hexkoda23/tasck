import React from 'react';
import { v3Projects, v3Deliverables, getBrand, getCreator, formatNairaV3 } from '../../../lib/v3data';
import { Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const V3AdminWallet = () => {
  const totalPipelineValue = v3Projects.reduce((a, p) => a + p.estimatedValue, 0);
  const deliverProjects = v3Projects.filter(p => p.stage === 'deliver');
  const invoicedValue = deliverProjects.reduce((a, p) => a + p.estimatedValue, 0);
  const managementFees = Math.round(totalPipelineValue * 0.15);

  const transactions = [];
  deliverProjects.forEach(proj => {
    const brand = getBrand(proj.brandId);
    const creator = getCreator(proj.creatorId);
    const deliverables = v3Deliverables[proj.id] || [];

    deliverables.filter(d => d.paymentReleased).forEach(del => {
      transactions.push({
        id: `${del.id}-in`,
        type: 'credit',
        label: `Brand payment — ${del.title}`,
        from: brand?.company?.split(' ')[0],
        amount: Math.round(proj.estimatedValue / deliverables.length),
        date: del.brandApproved,
      });
      transactions.push({
        id: `${del.id}-out`,
        type: 'debit',
        label: `Creator payment — ${del.title}`,
        to: creator?.name,
        amount: Math.round((proj.estimatedValue * 0.49) / deliverables.length),
        date: del.brandApproved,
      });
    });
  });

  return (
    <div data-testid="v3-admin-wallet">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">WALLET</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Financial Wallet</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Escrow management, invoices, and creator payments.</p>

      {/* Balance cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="v3-card p-5 bg-[#1F4A3A] text-white">
          <p className="text-[11px] uppercase tracking-wider opacity-60 mb-2">Pipeline Value</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalPipelineValue)}</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Invoiced</p>
          <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(invoicedValue)}</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Mgmt Fees (Est.)</p>
          <p className="text-2xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(managementFees)}</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Creator Payments</p>
          <p className="text-2xl font-semibold text-[#567B3F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(Math.round(invoicedValue * 0.49))}</p>
        </div>
      </div>

      {/* Recent transactions */}
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Recent Transactions</h2>
      <div className="space-y-2">
        {transactions.slice(0, 12).map(tx => (
          <div key={tx.id} className="v3-card p-4 flex items-center gap-4" data-testid={`wallet-tx-${tx.id}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-[#DDE7E2]' : 'bg-[#F4F2EC]'}`}>
              {tx.type === 'credit' ? <ArrowDownLeft className="w-4 h-4 text-[#1F4A3A]" /> : <ArrowUpRight className="w-4 h-4 text-[#C49B5F]" />}
            </div>
            <div className="flex-1">
              <p className="text-[13px] text-[#1A1A1A]">{tx.label}</p>
              <p className="text-[10px] text-[#8A8A8A]">{tx.from ? `From: ${tx.from}` : `To: ${tx.to}`}</p>
            </div>
            <span className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tx.date}</span>
            <span className={`text-[13px] font-medium ${tx.type === 'credit' ? 'text-[#1F4A3A]' : 'text-[#C49B5F]'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {tx.type === 'credit' ? '+' : '-'}{formatNairaV3(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default V3AdminWallet;
