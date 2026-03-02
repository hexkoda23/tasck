import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { Activity, Filter, Search, User, FileText, DollarSign, Shield, LogIn } from 'lucide-react';

const auditLogs = [
  { id: 1, action: 'user_login', user: 'Tunde Balogun', role: 'Staff', details: 'Logged in from Lagos, Nigeria', ip: '102.89.xx.xx', timestamp: '2026-03-02 10:42:15' },
  { id: 2, action: 'deal_created', user: 'Tunde Balogun', role: 'Staff', details: 'Created deal TK-2026-0052 - Star Lager Brand Partnership', ip: '102.89.xx.xx', timestamp: '2026-03-02 10:38:22' },
  { id: 3, action: 'contract_signed', user: 'Adenike Ogunlesi', role: 'Brand', details: 'Signed contract CTR-2026-0042 for Guinness x Burna Boy', ip: '105.112.xx.xx', timestamp: '2026-03-02 10:15:00' },
  { id: 4, action: 'payment_released', user: 'System', role: 'System', details: 'Auto-released ₦187,500 to Kelechi Amadi-Obi for task completion', ip: 'System', timestamp: '2026-03-02 09:30:00' },
  { id: 5, action: 'user_verified', user: 'Admin', role: 'Admin', details: 'Verified user Ibrahim Hassan - BVN confirmed', ip: '102.89.xx.xx', timestamp: '2026-03-02 09:15:00' },
  { id: 6, action: 'deal_status_changed', user: 'Amaka Obi', role: 'Staff', details: 'Changed MTN deal status from Scoping to Awaiting Terms', ip: '102.89.xx.xx', timestamp: '2026-03-02 08:45:00' },
  { id: 7, action: 'project_created', user: 'Mavin Records', role: 'Super Creative', details: 'Created project PRJ-2026-0024 - Artist Development Q2', ip: '105.112.xx.xx', timestamp: '2026-03-01 18:30:00' },
  { id: 8, action: 'opportunity_filled', user: 'System', role: 'System', details: 'Opportunity "Lead Photographer" filled by Kelechi Amadi-Obi', ip: 'System', timestamp: '2026-03-01 16:20:00' },
  { id: 9, action: 'task_submitted', user: 'Kelechi Amadi-Obi', role: 'Creative', details: 'Submitted deliverables for Cadbury Social Campaign Set 3', ip: '102.89.xx.xx', timestamp: '2026-03-01 14:00:00' },
  { id: 10, action: 'wallet_funded', user: 'Mavin Records', role: 'Super Creative', details: 'Funded wallet with ₦5,000,000 via bank transfer', ip: '105.112.xx.xx', timestamp: '2026-03-01 11:00:00' },
  { id: 11, action: 'dispute_filed', user: 'Ade Adesanya', role: 'Creative', details: 'Filed dispute DSP-2026-001 against MTN Creator Tour project', ip: '102.89.xx.xx', timestamp: '2026-02-26 15:30:00' },
  { id: 12, action: 'permission_changed', user: 'Admin', role: 'Admin', details: 'Granted "Deal Creation" permission to Nkechi Eze', ip: '102.89.xx.xx', timestamp: '2026-02-25 10:00:00' }
];

const getActionIcon = (action) => {
  if (action.includes('login')) return LogIn;
  if (action.includes('deal') || action.includes('contract')) return FileText;
  if (action.includes('payment') || action.includes('wallet')) return DollarSign;
  if (action.includes('user') || action.includes('permission')) return Shield;
  return Activity;
};

const getActionColor = (action) => {
  if (action.includes('login')) return 'bg-[#2F55FF]/20 text-[#2F55FF]';
  if (action.includes('payment') || action.includes('released')) return 'bg-[#6BFF9A]/20 text-[#6BFF9A]';
  if (action.includes('dispute')) return 'bg-[#FF4757]/20 text-[#FF4757]';
  if (action.includes('verified') || action.includes('signed')) return 'bg-[#6BFF9A]/20 text-[#6BFF9A]';
  return 'bg-[#FFA502]/20 text-[#FFA502]';
};

export const AdminAuditLogs = () => {
  const [filter, setFilter] = useState('all');

  const filteredLogs = filter === 'all' 
    ? auditLogs 
    : auditLogs.filter(log => log.action.includes(filter));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-audit-logs">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Logs</h1>
          <p className="text-white/50 text-sm">Complete activity trail of platform actions</p>
        </div>
        <button className="btn-secondary">Export Logs</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Search logs..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
        >
          <option value="all">All Actions</option>
          <option value="login">Logins</option>
          <option value="deal">Deals</option>
          <option value="contract">Contracts</option>
          <option value="payment">Payments</option>
          <option value="user">Users</option>
        </select>
        <input 
          type="date"
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
        />
      </div>

      {/* Logs List */}
      <div className="dashboard-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>User</th>
              <th>Details</th>
              <th>IP Address</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const Icon = getActionIcon(log.action);
              return (
                <tr key={log.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getActionColor(log.action)}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-white/80 text-sm capitalize">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Avatar name={log.user} size="sm" />
                      <div>
                        <p className="text-white text-sm">{log.user}</p>
                        <p className="text-white/40 text-xs">{log.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-white/60 text-sm max-w-xs truncate">{log.details}</td>
                  <td className="text-white/40 text-sm font-mono">{log.ip}</td>
                  <td className="text-white/40 text-sm">{log.timestamp}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
