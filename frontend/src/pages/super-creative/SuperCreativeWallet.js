import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Wallet, ArrowUpRight, ArrowDownRight, Building2, Lock, TrendingUp, CreditCard } from 'lucide-react';

const walletData = {
  available: 12500000,
  escrow: 8200000,
  pending: 3500000,
  totalEarned: 145000000
};

const transactions = [
  { id: 1, type: 'credit', description: 'Cadbury Nigeria — Campaign Payment Milestone 2', amount: 8000000, date: '2026-03-01', balance: 12500000 },
  { id: 2, type: 'escrow_out', description: 'Escrow funded — Kelechi Amadi-Obi (Photographer)', amount: 750000, date: '2026-02-28', balance: 4500000 },
  { id: 3, type: 'escrow_out', description: 'Escrow funded — Ade Adesanya (Videographer)', amount: 1200000, date: '2026-02-28', balance: 5250000 },
  { id: 4, type: 'release', description: 'Auto-released — Kelechi task approved (Set 2)', amount: 187500, date: '2026-02-25', balance: 6450000 },
  { id: 5, type: 'credit', description: 'Diageo Nigeria — Johnnie Walker Q1 Final', amount: 6250000, date: '2026-02-20', balance: 6637500 },
  { id: 6, type: 'withdrawal', description: 'Withdrawal to First Bank ****4521', amount: 5000000, date: '2026-02-15', balance: 387500 },
  { id: 7, type: 'credit', description: 'Beat FM — Concert Final Settlement', amount: 2950000, date: '2026-02-10', balance: 5387500 },
  { id: 8, type: 'escrow_out', description: 'Escrow funded — Concert Sound Engineer', amount: 600000, date: '2026-02-08', balance: 2437500 }
];

const formatNaira = (amount) => `₦${amount.toLocaleString()}`;

export const SuperCreativeWallet = () => {
  const { user } = useAuth();

  const getTransactionStyle = (type) => {
    const styles = {
      credit: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20', icon: ArrowDownRight, sign: '+' },
      release: { color: 'text-[#22C55E]', bg: 'bg-[#22C55E]/20', icon: ArrowDownRight, sign: '' },
      escrow_out: { color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]', icon: Lock, sign: '-' },
      withdrawal: { color: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]', icon: ArrowUpRight, sign: '-' }
    };
    return styles[type] || styles.credit;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sc-wallet">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Wallet</h1>
        <p className="text-[#64748B] text-sm">Manage team finances and escrow</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-6 bg-gradient-to-br from-[#2F55FF]/20 to-transparent">
          <Wallet className="w-6 h-6 text-[#2F55FF] mb-3" />
          <p className="text-[#64748B] text-sm">Available Balance</p>
          <p className="text-3xl font-bold text-[#0F172A] font-mono">{formatNaira(walletData.available)}</p>
        </div>
        <div className="dashboard-card p-6">
          <Lock className="w-5 h-5 text-[#D97706] mb-2" />
          <p className="text-[#64748B] text-sm">Held in Escrow</p>
          <p className="text-2xl font-bold text-[#D97706] font-mono">{formatNaira(walletData.escrow)}</p>
          <p className="text-xs text-[#94A3B8] mt-1">Funds securing active contracts</p>
        </div>
        <div className="dashboard-card p-6">
          <CreditCard className="w-5 h-5 text-[#22C55E] mb-2" />
          <p className="text-[#64748B] text-sm">Pending Payments</p>
          <p className="text-2xl font-bold text-[#22C55E] font-mono">{formatNaira(walletData.pending)}</p>
          <p className="text-xs text-[#94A3B8] mt-1">Expected within 7 days</p>
        </div>
        <div className="dashboard-card p-6">
          <TrendingUp className="w-5 h-5 text-[#64748B] mb-2" />
          <p className="text-[#64748B] text-sm">Total Earned (Lifetime)</p>
          <p className="text-2xl font-bold text-[#0F172A] font-mono">{formatNaira(walletData.totalEarned)}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="btn-primary flex items-center gap-2">Fund Wallet</button>
        <button className="btn-secondary flex items-center gap-2">Withdraw</button>
        <button className="btn-ghost">Fund Escrow</button>
      </div>

      {/* Linked Account */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Linked Bank Account</h2>
        <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#2F55FF]" />
            </div>
            <div>
              <p className="text-[#0F172A] font-medium">First Bank of Nigeria</p>
              <p className="text-[#94A3B8] text-sm">****4521 | {user?.name || 'Mavin Records Ltd'}</p>
            </div>
          </div>
          <span className="text-[#22C55E] text-sm">Verified</span>
        </div>
      </div>

      {/* Transaction History */}
      <div className="dashboard-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#0F172A]">Transaction History</h2>
          <button className="text-[#2F55FF] text-sm hover:underline">Export</button>
        </div>
        <div className="space-y-3">
          {transactions.map((tx) => {
            const style = getTransactionStyle(tx.type);
            const Icon = style.icon;
            return (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${style.bg}`}>
                    <Icon className={`w-5 h-5 ${style.color}`} />
                  </div>
                  <div>
                    <p className="text-[#475569] text-sm">{tx.description}</p>
                    <p className="text-[#94A3B8] text-xs">{tx.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-mono ${style.color}`}>
                    {style.sign}{formatNaira(tx.amount)}
                  </p>
                  <p className="text-[#94A3B8] text-xs">Balance: {formatNaira(tx.balance)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SuperCreativeWallet;
