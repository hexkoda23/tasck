import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Building2, TrendingUp } from 'lucide-react';

const walletData = {
  totalBalance: 245800000,
  escrowHeld: 89500000,
  pendingPayouts: 12300000,
  monthlyVolume: 78500000
};

const recentTransactions = [
  { id: 1, type: 'escrow_hold', from: 'Mavin Records', to: 'Escrow', amount: 1200000, description: 'Concert: Lighting Designer', date: '2026-03-02 10:30' },
  { id: 2, type: 'release', from: 'Escrow', to: 'Kelechi Amadi-Obi', amount: 187500, description: 'Task approved: Cadbury Set 3', date: '2026-03-02 09:15' },
  { id: 3, type: 'deposit', from: 'External', to: 'Mavin Records', amount: 3500000, description: 'Johnnie Walker Q1 Payment', date: '2026-03-01 18:00' },
  { id: 4, type: 'withdrawal', from: 'Kelechi Amadi-Obi', to: 'Zenith Bank', amount: 1000000, description: 'Withdrawal to ****7892', date: '2026-03-01 14:30' },
  { id: 5, type: 'commission', from: 'Deal Settlement', to: 'TASCK', amount: 3300000, description: 'Commission: Jumia x YBNL deal', date: '2026-02-28 16:00' },
  { id: 6, type: 'release', from: 'Escrow', to: 'Tolu Akinwande', amount: 800000, description: 'Project completion: Design work', date: '2026-02-28 12:00' },
  { id: 7, type: 'escrow_hold', from: 'DMW (Davido)', to: 'Escrow', amount: 3500000, description: 'Pepsi Campaign: Videographer', date: '2026-02-27 10:00' },
  { id: 8, type: 'deposit', from: 'External', to: 'Starboy (Wizkid)', amount: 7500000, description: 'Diageo Milestone Payment', date: '2026-02-26 15:00' }
];

const formatNaira = (amount) => `₦${amount.toLocaleString()}`;

export const AdminWallets = () => {
  const getTransactionStyle = (type) => {
    const styles = {
      deposit: { color: 'text-[#6BFF9A]', bg: 'bg-[#6BFF9A]/20', icon: ArrowDownRight },
      release: { color: 'text-[#6BFF9A]', bg: 'bg-[#6BFF9A]/20', icon: ArrowDownRight },
      escrow_hold: { color: 'text-[#FFA502]', bg: 'bg-[#FFA502]/20', icon: ArrowUpRight },
      withdrawal: { color: 'text-[#FF4757]', bg: 'bg-[#FF4757]/20', icon: ArrowUpRight },
      commission: { color: 'text-[#2F55FF]', bg: 'bg-[#2F55FF]/20', icon: ArrowDownRight }
    };
    return styles[type] || styles.deposit;
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-wallets">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Wallets</h1>
          <p className="text-white/50 text-sm">Financial overview and transaction monitoring</p>
        </div>
        <button className="btn-secondary">Export Report</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-6 bg-gradient-to-br from-[#2F55FF]/20 to-transparent">
          <Wallet className="w-6 h-6 text-[#2F55FF] mb-3" />
          <p className="text-white/50 text-sm">Total Platform Balance</p>
          <p className="text-3xl font-bold text-white font-mono">{formatNaira(walletData.totalBalance)}</p>
        </div>
        <div className="dashboard-card p-6">
          <p className="text-white/50 text-sm">Held in Escrow</p>
          <p className="text-2xl font-bold text-[#FFA502] font-mono">{formatNaira(walletData.escrowHeld)}</p>
        </div>
        <div className="dashboard-card p-6">
          <p className="text-white/50 text-sm">Pending Payouts</p>
          <p className="text-2xl font-bold text-white font-mono">{formatNaira(walletData.pendingPayouts)}</p>
        </div>
        <div className="dashboard-card p-6">
          <TrendingUp className="w-5 h-5 text-[#6BFF9A] mb-2" />
          <p className="text-white/50 text-sm">Monthly Volume</p>
          <p className="text-2xl font-bold text-[#6BFF9A] font-mono">{formatNaira(walletData.monthlyVolume)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="dashboard-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentTransactions.map((tx) => {
              const style = getTransactionStyle(tx.type);
              const Icon = style.icon;
              return (
                <tr key={tx.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
                        <Icon className={`w-4 h-4 ${style.color}`} />
                      </div>
                      <span className="text-white/80 text-sm capitalize">{tx.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="text-white/60 text-sm">{tx.from}</td>
                  <td className="text-white/60 text-sm">{tx.to}</td>
                  <td className={`font-mono ${style.color}`}>{formatNaira(tx.amount)}</td>
                  <td className="text-white/50 text-sm max-w-xs truncate">{tx.description}</td>
                  <td className="text-white/40 text-sm">{tx.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminWallets;
