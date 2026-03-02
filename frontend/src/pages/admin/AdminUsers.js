import React, { useState, useEffect } from 'react';
import { getUsers } from '../../lib/api';
import Avatar from '../../components/shared/Avatar';
import { 
  Search, 
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  MoreVertical,
  Shield,
  Mail,
  Phone
} from 'lucide-react';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers();
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = filter === 'all' 
    ? users 
    : filter === 'verified' 
      ? users.filter(u => u.verified)
      : users.filter(u => !u.verified);

  const getRoleBadge = (role) => {
    const colors = {
      staff: 'bg-[#EEF2FF] text-[#2F55FF]',
      brand: 'bg-[#22C55E]/20 text-[#22C55E]',
      super_creative: 'bg-[#FFFBEB] text-[#D97706]',
      creative: 'bg-[#F5F3FF] text-[#7C3AED]',
      admin: 'bg-[#FEF2F2] text-[#DC2626]'
    };
    return colors[role] || 'bg-[#F1F5F9] text-[#64748B]';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-users">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Users & Verification</h1>
          <p className="text-[#64748B] text-sm">{users.length} total users on the platform</p>
        </div>
        <button className="btn-primary">+ Add User</button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input 
            type="text"
            placeholder="Search users..."
            className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
          />
        </div>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-4 py-2 text-[#0F172A] focus:outline-none"
        >
          <option value="all">All Users</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Total Users</p>
          <p className="text-lg font-bold text-[#0F172A]">{users.length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Verified</p>
          <p className="text-lg font-bold text-[#22C55E]">{users.filter(u => u.verified).length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">Pending</p>
          <p className="text-lg font-bold text-[#D97706]">{users.filter(u => !u.verified).length}</p>
        </div>
        <div className="dashboard-card p-4">
          <p className="text-[#64748B] text-sm">This Month</p>
          <p className="text-lg font-bold text-[#0F172A]">12</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="dashboard-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Email</th>
              <th>Location</th>
              <th>Status</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton h-12 w-full"></div></td></tr>
              ))
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="group">
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} size="sm" />
                      <div>
                        <p className="text-[#0F172A] font-medium">{user.name}</p>
                        <p className="text-[#94A3B8] text-xs">{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${getRoleBadge(user.role)}`}>
                      {user.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-[#64748B]">{user.email}</td>
                  <td className="text-[#64748B]">{user.location || 'Lagos, Nigeria'}</td>
                  <td>
                    {user.verified ? (
                      <span className="flex items-center gap-1 text-xs text-[#22C55E]">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-[#D97706]">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                  </td>
                  <td className="text-[#94A3B8] text-sm">Jan 2026</td>
                  <td>
                    <button className="opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#0F172A]">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
