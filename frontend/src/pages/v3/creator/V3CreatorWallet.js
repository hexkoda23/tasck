import React from 'react';
import { v3Projects, v3Deliverables, getBrand, getCreator, formatNairaV3 } from '../../../lib/v3data';
import { Wallet, ArrowUpRight, ArrowDownLeft, CheckCircle, Clock } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorWallet = () => {
  const creator = getCreator(creatorId);
  const projects = v3Projects.filter(p => p.creatorId === creatorId);

  const transactions = [];
  projects.forEach(proj => {
    const brand = getBrand(proj.brandId);
    const deliverables = v3Deliverables[proj.id] || [];
    deliverables.forEach(del => {
      if (del.paymentReleased) {
        transactions.push({
          id: del.id,
          label: del.title,
          project: proj.title,
          brand: brand?.company?.split(' ')[0],
          amount: 11000000,
          date: del.brandApproved,
          type: 'credit',
        });
      }
    });
  });

  const totalEarnings = transactions.reduce((a, t) => a + t.amount, 0);
  const pendingPayments = projects.flatMap(p => (v3Deliverables[p.id] || []).filter(d => d.status === 'approved' && !d.paymentReleased)).length * 11000000;

  return (
    <div data-testid="v3-creator-wallet">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">WALLET</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Wallet</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Your earnings and payment history.</p>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="v3-card p-5 bg-[#1F4A3A] text-white">
          <p className="text-[11px] uppercase tracking-wider opacity-60 mb-2">Available Balance</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalEarnings)}</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Pending</p>
          <p className="text-2xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(pendingPayments)}</p>
        </div>
        <div className="v3-card p-5">
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Total Earned</p>
          <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalEarnings)}</p>
        </div>
      </div>

      {/* Transaction history */}
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Transaction History</h2>
      {transactions.length > 0 ? (
        <div className="space-y-2">
          {transactions.map(tx => (
            <div key={tx.id} className="v3-card p-4 flex items-center gap-4" data-testid={`tx-${tx.id}`}>
              <div className="w-8 h-8 rounded-full bg-[#DDE7E2] flex items-center justify-center">
                <ArrowDownLeft className="w-4 h-4 text-[#1F4A3A]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-[#1A1A1A]">{tx.label}</p>
                <p className="text-[10px] text-[#8A8A8A]">{tx.brand} — {tx.project}</p>
              </div>
              <span className="text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tx.date}</span>
              <span className="text-[13px] font-medium text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{formatNairaV3(tx.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="v3-card p-8 text-center">
          <Wallet className="w-6 h-6 text-[#8A8A8A] mx-auto mb-3" />
          <p className="text-[14px] text-[#8A8A8A]">No transactions yet. Payments are released when deliverables are approved by the brand.</p>
        </div>
      )}
    </div>
  );
};

export default V3CreatorWallet;
