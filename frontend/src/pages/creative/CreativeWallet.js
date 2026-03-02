import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { formatNaira } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Building2, Copy, CheckCircle } from 'lucide-react';

const transactions = [
  { id: 1, type: 'credit', description: 'Task approved: Cadbury Set 2', amount: 187500, date: '2026-02-28', balance: 2875000 },
  { id: 2, type: 'credit', description: 'Task approved: UBA Portraits 3', amount: 150000, date: '2026-02-25', balance: 2687500 },
  { id: 3, type: 'withdrawal', description: 'Withdrawal to Zenith Bank ****7892', amount: 1000000, date: '2026-02-22', balance: 2537500 },
  { id: 4, type: 'credit', description: 'Task approved: Cadbury Set 1', amount: 187500, date: '2026-02-20', balance: 3537500 },
  { id: 5, type: 'credit', description: 'Task approved: UBA Portraits 2', amount: 150000, date: '2026-02-15', balance: 3350000 },
  { id: 6, type: 'credit', description: 'Task approved: UBA Portraits 1', amount: 150000, date: '2026-02-10', balance: 3200000 },
  { id: 7, type: 'withdrawal', description: 'Withdrawal to Zenith Bank ****7892', amount: 500000, date: '2026-02-05', balance: 3050000 },
  { id: 8, type: 'credit', description: 'Task approved: Concert Pre-prod', amount: 250000, date: '2026-02-01', balance: 3550000 }
];

export const CreativeWallet = () => {
  const { user } = useAuth();
  
  return (
    <div className="space-y-6 animate-fade-in" data-testid="creative-wallet">
      <div>
        <h1 className="text-2xl font-bold text-white">Wallet</h1>
        <p className="text-white/50 text-sm">Manage your earnings and withdrawals</p>
      </div>

      {/* Balance Card */}
      <div className="dashboard-card p-6 bg-gradient-to-br from-[#2F55FF]/20 to-[#6BFF9A]/10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/50 text-sm mb-1">Available Balance</p>
            <p className="text-4xl font-bold text-white font-mono">{formatNaira(user?.wallet_balance || 2875000)}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#6BFF9A]/20 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-[#6BFF9A]" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs mb-1">Pending Earnings</p>
            <p className="text-xl font-mono text-[#FFA502]">₦562,500</p>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <p className="text-white/40 text-xs mb-1">Total Earned (YTD)</p>
            <p className="text-xl font-mono text-white">₦4,650,000</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="btn-primary flex-1">Withdraw</button>
          <button className="btn-secondary flex-1 border-white/20 text-white">Add Bank Account</button>
        </div>
      </div>

      {/* Bank Account */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Linked Bank Account</h2>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#FF4757]/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#FF4757]" />
            </div>
            <div>
              <p className="text-white font-medium">Zenith Bank</p>
              <p className="text-white/40 text-sm">****7892 • {user?.name || 'Kelechi Amadi-Obi'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-[#6BFF9A]" />
            <span className="text-[#6BFF9A] text-sm">Verified</span>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="dashboard-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Transaction History</h2>
          <button className="text-[#2F55FF] text-sm hover:underline">Export</button>
        </div>
        
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  tx.type === 'credit' ? 'bg-[#6BFF9A]/20' : 'bg-[#FF4757]/20'
                }`}>
                  {tx.type === 'credit' ? (
                    <ArrowDownRight className="w-5 h-5 text-[#6BFF9A]" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5 text-[#FF4757]" />
                  )}
                </div>
                <div>
                  <p className="text-white text-sm">{tx.description}</p>
                  <p className="text-white/40 text-xs">{tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-mono ${tx.type === 'credit' ? 'text-[#6BFF9A]' : 'text-[#FF4757]'}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatNaira(tx.amount)}
                </p>
                <p className="text-white/40 text-xs">Balance: {formatNaira(tx.balance)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreativeWallet;
