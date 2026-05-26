import React from 'react';
import { v3Projects, v3Deliverables, getBrand, getCreator, getRM, formatNairaV3 } from '../../../lib/v3data';
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, Shield, BarChart3, PieChart } from 'lucide-react';

const V3AdminWallet = () => {
  const totalPipelineValue = v3Projects.reduce((a, p) => a + p.estimatedValue, 0);
  const deliverProjects = v3Projects.filter(p => p.stage === 'deliver');
  const invoicedValue = deliverProjects.reduce((a, p) => a + p.estimatedValue, 0);
  const managementFees = Math.round(totalPipelineValue * 0.15);
  const creatorPayments = Math.round(invoicedValue * 0.49);
  const escrowHeld = Math.round(invoicedValue * 0.12);
  const collected = Math.round(invoicedValue * 0.85);

  const transactions = [];
  deliverProjects.forEach(proj => {
    const brand = getBrand(proj.brandId);
    const creator = getCreator(proj.creatorId);
    const deliverables = v3Deliverables[proj.id] || [];
    const perDelAmount = Math.round(proj.estimatedValue / Math.max(deliverables.length, 1));
    const perCreatorAmount = Math.round((proj.estimatedValue * 0.49) / Math.max(deliverables.length, 1));

    deliverables.filter(d => d.paymentReleased).forEach(del => {
      transactions.push({
        id: `${del.id}-in`,
        type: 'credit',
        label: `Brand payment — ${del.title}`,
        counterparty: brand?.company?.split(' ')[0],
        project: proj.title,
        amount: perDelAmount,
        date: del.brandApproved,
        dateSort: del.brandApproved,
      });
      transactions.push({
        id: `${del.id}-out`,
        type: 'debit',
        label: `Creator payment — ${del.title}`,
        counterparty: creator?.name,
        project: proj.title,
        amount: perCreatorAmount,
        date: del.brandApproved,
        dateSort: del.brandApproved,
      });
    });
  });

  // Add retainer fees
  v3Projects.filter(p => p.engagement === 'retainer' && ['plan', 'deliver', 'closed'].includes(p.stage)).forEach(proj => {
    const brand = getBrand(proj.brandId);
    transactions.push({
      id: `${proj.id}-retainer`,
      type: 'credit',
      label: 'Strategy Development Fee — Retainer',
      counterparty: brand?.company?.split(' ')[0],
      project: proj.title,
      amount: Math.round(proj.estimatedValue * 0.15),
      date: proj.createdAt?.substring(5),
      dateSort: proj.createdAt,
    });
  });

  transactions.sort((a, b) => (b.dateSort || '').localeCompare(a.dateSort || ''));

  // Invoice breakdown
  const invoiceBreakdown = v3Projects.map(proj => {
    const brand = getBrand(proj.brandId);
    const isInvoiced = proj.stage === 'deliver' || proj.stage === 'plan';
    const isPaid = proj.stage === 'deliver';
    return {
      id: proj.id,
      brand: brand?.company?.split(' ')[0],
      title: proj.title,
      amount: proj.estimatedValue,
      status: isPaid ? 'paid' : isInvoiced ? 'invoiced' : 'pending',
      stage: proj.stage,
    };
  });

  return (
    <div data-testid="v3-admin-wallet">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">WALLET</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Financial Wallet</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Escrow management, invoices, and creator payments.</p>

      {/* Balance cards — NOT using v3-card for dark cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl p-5 border border-[#173D30]" style={{ background: '#1F4A3A' }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-white/50" strokeWidth={1.5} />
            <p className="text-[11px] text-white/50 uppercase tracking-wider">Pipeline Value</p>
          </div>
          <p className="text-2xl font-semibold text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalPipelineValue)}</p>
          <p className="text-[10px] text-white/40 mt-1">{v3Projects.length} projects</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Invoiced</p>
          </div>
          <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(invoicedValue)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">{deliverProjects.length} projects settled</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-4 h-4 text-[#C49B5F]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Mgmt Fees (Est.)</p>
          </div>
          <p className="text-2xl font-semibold text-[#C49B5F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(managementFees)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">15% avg rate</p>
        </div>
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="w-4 h-4 text-[#567B3F]" strokeWidth={1.5} />
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider">Creator Payments</p>
          </div>
          <p className="text-2xl font-semibold text-[#567B3F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(creatorPayments)}</p>
          <p className="text-[10px] text-[#8A8A8A] mt-1">Released via escrow</p>
        </div>
      </div>

      {/* Escrow + Collection stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Escrow Held</p>
          <p className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(escrowHeld)}</p>
          <div className="h-1 bg-[#E8E4DB] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#C49B5F] rounded-full" style={{ width: '35%' }} />
          </div>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Collected</p>
          <p className="text-lg font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(collected)}</p>
          <div className="h-1 bg-[#E8E4DB] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#1F4A3A] rounded-full" style={{ width: '72%' }} />
          </div>
        </div>
        <div className="v3-card p-4">
          <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider mb-1">Outstanding</p>
          <p className="text-lg font-semibold text-[#9B9380]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(totalPipelineValue - collected)}</p>
          <div className="h-1 bg-[#E8E4DB] rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-[#9B9380] rounded-full" style={{ width: '28%' }} />
          </div>
        </div>
      </div>

      {/* Invoice breakdown */}
      <div className="mb-8">
        <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Invoice Breakdown</h2>
        <div className="v3-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E4DB]">
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Project</th>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Brand</th>
                <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Amount</th>
                <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoiceBreakdown.map(inv => (
                <tr key={inv.id} className="border-b border-[#F4F2EC] last:border-0 hover:bg-[#FAFAF7] transition-colors">
                  <td className="p-3 text-[13px] text-[#1A1A1A]">{inv.title}</td>
                  <td className="p-3 text-[12px] text-[#8A8A8A]">{inv.brand}</td>
                  <td className="p-3 text-[13px] text-[#1A1A1A] text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{formatNairaV3(inv.amount)}</td>
                  <td className="p-3 text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      inv.status === 'paid' ? 'text-[#1F4A3A] bg-[#DDE7E2]' :
                      inv.status === 'invoiced' ? 'text-[#C49B5F] bg-[#C49B5F12]' :
                      'text-[#8A8A8A] bg-[#F4F2EC]'
                    }`}>{inv.status === 'paid' ? 'Paid' : inv.status === 'invoiced' ? 'Invoiced' : 'Pending'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent transactions */}
      <h2 className="text-[13px] font-semibold text-[#1A1A1A] mb-3">Recent Transactions</h2>
      <div className="space-y-2">
        {transactions.slice(0, 16).map(tx => (
          <div key={tx.id} className="v3-card p-3 flex items-center gap-3" data-testid={`wallet-tx-${tx.id}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${tx.type === 'credit' ? 'bg-[#DDE7E2]' : 'bg-[#F4F2EC]'}`}>
              {tx.type === 'credit' ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#1F4A3A]" /> : <ArrowUpRight className="w-3.5 h-3.5 text-[#C49B5F]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[#1A1A1A] truncate">{tx.label}</p>
              <p className="text-[10px] text-[#8A8A8A]">{tx.type === 'credit' ? `From: ${tx.counterparty}` : `To: ${tx.counterparty}`} &middot; {tx.project}</p>
            </div>
            <span className="text-[10px] text-[#8A8A8A] flex-shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{tx.date}</span>
            <span className={`text-[12px] font-medium flex-shrink-0 ${tx.type === 'credit' ? 'text-[#1F4A3A]' : 'text-[#C49B5F]'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {tx.type === 'credit' ? '+' : '-'}{formatNairaV3(tx.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default V3AdminWallet;
