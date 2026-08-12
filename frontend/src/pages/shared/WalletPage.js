import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ArrowUpRight, ArrowDownRight, Plus, Building2, Lock, CreditCard, TrendingUp, Copy, Eye, EyeOff, Send, Clock } from 'lucide-react';

const walletDataByRole = {
  staff: { available: 0, escrow: 0, label: 'Platform Wallet', bank: null, card: null },
  brand: {
    available: 43200000, escrow: 15000000, pending: 0, totalSpent: 79800000,
    label: 'Brand Wallet', bank: { name: 'Zenith Bank', number: '****7823', holder: 'Guinness Nigeria Plc' },
    card: { number: '4242 **** **** 7823', expiry: '09/28', holder: 'GUINNESS NIGERIA', type: 'VISA', color: 'from-[#1E293B] to-[#334155]' }
  },
  super_creative: {
    available: 12500000, escrow: 8200000, pending: 3500000, totalEarned: 145000000,
    label: 'Team Wallet', bank: { name: 'First Bank', number: '****4521', holder: 'Mavin Records Ltd' },
    card: { number: '5412 **** **** 4521', expiry: '12/27', holder: 'MAVIN RECORDS', type: 'MASTERCARD', color: 'from-[#4F46E5] to-[#7C3AED]' }
  },
  creative: {
    available: 2875000, escrow: 0, pending: 375000, totalEarned: 8450000,
    label: 'My Wallet', bank: { name: 'GTBank', number: '****9012', holder: 'Kelechi Amadi-Obi' },
    card: { number: '4532 **** **** 9012', expiry: '03/28', holder: 'KELECHI AMADI-OBI', type: 'VISA', color: 'from-[#0F172A] to-[#1E293B]' }
  },
  admin: {
    available: 892000000, escrow: 156000000, pending: 0, totalProcessed: 2400000000,
    label: 'Platform Treasury', bank: { name: 'Access Bank', number: '****1100', holder: 'The TASCK Agency Ltd' },
    card: { number: '5200 **** **** 1100', expiry: '06/29', holder: 'THE TASCK AGENCY', type: 'MASTERCARD', color: 'from-[#059669] to-[#047857]' }
  }
};

const transactionsByRole = {
  brand: [
    { id: 1, type: 'debit', desc: 'Escrow Funding - Burna Boy Campaign Phase 2', amount: 15000000, date: '2026-02-10', balance: 43200000 },
    { id: 2, type: 'debit', desc: 'TASCK Platform Fee (15%)', amount: 2775000, date: '2026-02-15', balance: 58200000 },
    { id: 3, type: 'debit', desc: 'Kelechi Amadi-Obi - Photography', amount: 350000, date: '2026-03-01', balance: 60975000 },
    { id: 4, type: 'credit', desc: 'Wallet Top-up from Zenith Bank', amount: 20000000, date: '2026-02-01', balance: 61325000 }
  ],
  super_creative: [
    { id: 1, type: 'credit', desc: 'Cadbury Nigeria - Milestone 2 Payment', amount: 8000000, date: '2026-03-01', balance: 12500000 },
    { id: 2, type: 'debit', desc: 'Escrow - Kelechi Amadi-Obi (Photographer)', amount: 750000, date: '2026-02-28', balance: 4500000 },
    { id: 3, type: 'credit', desc: 'Diageo Nigeria - Johnnie Walker Final', amount: 6250000, date: '2026-02-20', balance: 5250000 },
    { id: 4, type: 'debit', desc: 'Withdrawal to First Bank ****4521', amount: 5000000, date: '2026-02-15', balance: -1000000 }
  ],
  creative: [
    { id: 1, type: 'credit', desc: 'Task Approved - Cadbury Product Set 2', amount: 187500, date: '2026-02-21', balance: 2875000 },
    { id: 2, type: 'credit', desc: 'Task Approved - UBA Portraits Set 3', amount: 150000, date: '2026-02-26', balance: 2687500 },
    { id: 3, type: 'credit', desc: 'Task Approved - Cadbury Product Set 1', amount: 187500, date: '2026-02-12', balance: 2537500 },
    { id: 4, type: 'debit', desc: 'Withdrawal to GTBank ****9012', amount: 1500000, date: '2026-02-05', balance: 2350000 }
  ],
  admin: [
    { id: 1, type: 'credit', desc: 'Commission - Guinness x Burna Boy deal', amount: 6750000, date: '2026-03-01', balance: 892000000 },
    { id: 2, type: 'credit', desc: 'Commission - Cadbury x Mavin Records', amount: 4800000, date: '2026-02-28', balance: 885250000 },
    { id: 3, type: 'debit', desc: 'Escrow Release - Kelechi Photography', amount: 187500, date: '2026-02-21', balance: 880450000 }
  ]
};

const formatNaira = (a) => `₦${a.toLocaleString()}`;
const formatCompact = (a) => a >= 1000000000 ? `₦${(a/1000000000).toFixed(1)}B` : a >= 1000000 ? `₦${(a/1000000).toFixed(1)}M` : a >= 1000 ? `₦${(a/1000).toFixed(0)}K` : `₦${a}`;

const WalletPage = () => {
  const { user } = useAuth();
  const role = user?.role || 'creative';
  const data = walletDataByRole[role] || walletDataByRole.creative;
  const transactions = transactionsByRole[role] || [];
  const [showBalance, setShowBalance] = useState(true);

  if (role === 'staff') {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="wallet-page">
        <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Wallet</h1>
        <p className="text-[#94A3B8] text-sm">Staff members manage wallets via the Admin portal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="wallet-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">{data.label}</h1>
          <p className="text-[#94A3B8] text-sm">Manage funds, escrow, and payments</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-sm py-2 px-4 flex items-center gap-1.5"><Send className="w-4 h-4" /> Withdraw</button>
          <button className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5"><Plus className="w-4 h-4" /> Fund Wallet</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Card + Balance */}
        <div className="space-y-4">
          {/* Visual Card */}
          {data.card && (
            <div className={`bg-gradient-to-br ${data.card.color} rounded-2xl p-6 text-white relative overflow-hidden shadow-lg`} data-testid="wallet-card">
              {/* Subtle pattern */}
              <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-10 h-7 bg-white/20 rounded" />
                  <span className="text-xs font-mono tracking-widest opacity-60">{data.card.type}</span>
                </div>
                
                <div className="font-mono text-lg tracking-[0.15em] mb-6">{data.card.number}</div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[9px] uppercase tracking-widest opacity-40 mb-0.5">Card Holder</div>
                    <div className="text-xs font-semibold tracking-wider">{data.card.holder}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase tracking-widest opacity-40 mb-0.5">Valid Thru</div>
                    <div className="text-xs font-mono">{data.card.expiry}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance Card */}
          <div className="dashboard-card p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[#94A3B8] uppercase tracking-wider">Available Balance</span>
              <button onClick={() => setShowBalance(!showBalance)} className="text-[#94A3B8] hover:text-[#64748B]">
                {showBalance ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-xl font-bold text-[#0F172A] font-mono mb-4">
              {showBalance ? formatNaira(data.available) : '••••••••'}
            </div>
            
            <div className="space-y-3 pt-4 border-t border-[#F1F5F9]">
              {data.escrow > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]"><Lock className="w-4 h-4 text-[#D97706]" /> In Escrow</div>
                  <span className="text-sm font-mono text-[#D97706]">{showBalance ? formatCompact(data.escrow) : '••••'}</span>
                </div>
              )}
              {data.pending > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]"><Clock className="w-4 h-4 text-[#2F55FF]" /> Pending</div>
                  <span className="text-sm font-mono text-[#2F55FF]">{showBalance ? formatCompact(data.pending) : '••••'}</span>
                </div>
              )}
              {data.totalEarned && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]"><TrendingUp className="w-4 h-4 text-[#22C55E]" /> Total Earned</div>
                  <span className="text-sm font-mono text-[#22C55E]">{showBalance ? formatCompact(data.totalEarned) : '••••'}</span>
                </div>
              )}
              {data.totalSpent && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]"><ArrowUpRight className="w-4 h-4 text-[#DC2626]" /> Total Spent</div>
                  <span className="text-sm font-mono text-[#DC2626]">{showBalance ? formatCompact(data.totalSpent) : '••••'}</span>
                </div>
              )}
              {data.totalProcessed && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#64748B]"><TrendingUp className="w-4 h-4 text-[#22C55E]" /> Total Processed</div>
                  <span className="text-sm font-mono text-[#22C55E]">{showBalance ? formatCompact(data.totalProcessed) : '••••'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Linked Bank */}
          {data.bank && (
            <div className="dashboard-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#2F55FF]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0F172A]">{data.bank.name}</p>
                  <p className="text-[11px] text-[#94A3B8]">{data.bank.number} &middot; {data.bank.holder}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669]">Verified</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Transactions */}
        <div className="lg:col-span-2">
          <div className="dashboard-card">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F5F9]">
              <h2 className="text-sm font-semibold text-[#0F172A]">Transaction History</h2>
              <button className="text-[#2F55FF] text-xs hover:underline">Export CSV</button>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors" data-testid={`tx-${tx.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === 'credit' ? 'bg-[#ECFDF5]' : 'bg-[#FEF2F2]'}`}>
                      {tx.type === 'credit' ? <ArrowDownRight className="w-4 h-4 text-[#22C55E]" /> : <ArrowUpRight className="w-4 h-4 text-[#DC2626]" />}
                    </div>
                    <div>
                      <p className="text-sm text-[#0F172A]">{tx.desc}</p>
                      <p className="text-[11px] text-[#CBD5E1]">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-mono font-semibold ${tx.type === 'credit' ? 'text-[#22C55E]' : 'text-[#DC2626]'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCompact(tx.amount)}
                    </p>
                    <p className="text-[11px] text-[#CBD5E1]">Bal: {formatCompact(Math.abs(tx.balance))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
