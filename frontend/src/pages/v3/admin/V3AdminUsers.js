import React, { useState } from 'react';
import { v3RMs, v3Brands, v3Creators, v3Projects } from '../../../lib/v3data';
import { Users, Plus, Shield, Building2, Palette, Search, Mail, CheckCircle } from 'lucide-react';

const seededUsers = [
  ...v3RMs.map(rm => ({
    id: rm.id, name: rm.name, email: `${rm.name.toLowerCase().replace(' ', '.')}@tasck.com`, role: 'admin', subRole: 'Relationship Manager',
    status: 'active', lastActive: '2 hours ago', projects: v3Projects.filter(p => p.rmId === rm.id).length,
    assignedBrands: v3Brands.filter(b => b.rmId === rm.id).map(b => b.company),
  })),
  { id: 'u-ops1', name: 'Chioma Adewale', email: 'chioma@tasck.com', role: 'admin', subRole: 'Operations Lead', status: 'active', lastActive: '1 hour ago', projects: 0 },
  { id: 'u-ops2', name: 'Emeka Nwankwo', email: 'emeka@tasck.com', role: 'admin', subRole: 'Finance', status: 'active', lastActive: '3 hours ago', projects: 0 },
  ...v3Brands.slice(0, 5).map(b => ({
    id: `u-${b.id}`, name: b.primaryContact, email: b.email, role: 'brand', subRole: b.company.split(' ')[0],
    status: 'active', lastActive: b.lastInteraction, projects: v3Projects.filter(p => p.brandId === b.id).length,
  })),
  ...v3Creators.slice(0, 5).map(c => ({
    id: `u-${c.id}`, name: c.name, email: `${c.name.toLowerCase().replace(' ', '.')}@email.com`, role: 'creator', subRole: c.genre,
    status: 'active', lastActive: '1 day ago', projects: v3Projects.filter(p => p.creatorId === c.id).length,
  })),
];

const V3AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = seededUsers
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  const roleIcon = (role) => {
    if (role === 'admin') return <Shield className="w-3.5 h-3.5 text-[#1F4A3A]" />;
    if (role === 'brand') return <Building2 className="w-3.5 h-3.5 text-[#C49B5F]" />;
    return <Palette className="w-3.5 h-3.5 text-[#567B3F]" />;
  };

  const roleBadge = (role) => {
    if (role === 'admin') return 'text-[#1F4A3A] bg-[#DDE7E2]';
    if (role === 'brand') return 'text-[#C49B5F] bg-[#C49B5F12]';
    return 'text-[#567B3F] bg-[#567B3F12]';
  };

  return (
    <div data-testid="v3-admin-users">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">USER MANAGEMENT</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Users & Roles</h1>
          <p className="text-[#8A8A8A] text-sm">{seededUsers.length} users across 3 portal types</p>
        </div>
        <button className="v3-btn-primary" data-testid="invite-user-btn"><Plus className="w-4 h-4" /> Invite User</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors" onClick={() => setRoleFilter('admin')}>
          <div className="flex items-center gap-2 mb-2"><Shield className="w-4 h-4 text-[#1F4A3A]" /><span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Admin / TASCK Team</span></div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seededUsers.filter(u => u.role === 'admin').length}</p>
        </div>
        <div className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors" onClick={() => setRoleFilter('brand')}>
          <div className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4 text-[#C49B5F]" /><span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Brand Users</span></div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seededUsers.filter(u => u.role === 'brand').length}</p>
        </div>
        <div className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors" onClick={() => setRoleFilter('creator')}>
          <div className="flex items-center gap-2 mb-2"><Palette className="w-4 h-4 text-[#567B3F]" /><span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Creator Users</span></div>
          <p className="text-xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{seededUsers.filter(u => u.role === 'creator').length}</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors" data-testid="user-search" />
        </div>
        <div className="flex gap-1">
          {[{ key: 'all', label: 'All' }, { key: 'admin', label: 'Admin' }, { key: 'brand', label: 'Brand' }, { key: 'creator', label: 'Creator' }].map(f => (
            <button key={f.key} onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors ${roleFilter === f.key ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* User table */}
      <div className="v3-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E8E4DB]">
              <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">User</th>
              <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Role</th>
              <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Portal</th>
              <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Assigned Brands</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Projects</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Last Active</th>
              <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(user => (
              <tr key={user.id} className="border-b border-[#F4F2EC] last:border-0 hover:bg-[#FAFAF7] transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#F4F2EC] flex items-center justify-center text-[10px] font-bold text-[#5C5C5C]">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-[12px] text-[#1A1A1A] font-medium">{user.name}</p>
                      <p className="text-[10px] text-[#8A8A8A]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3"><span className="text-[11px] text-[#5C5C5C]">{user.subRole}</span></td>
                <td className="p-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded capitalize ${roleBadge(user.role)}`}>{user.role}</span>
                </td>
                <td className="p-3">
                  {user.role === 'admin' && user.assignedBrands?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[260px]" data-testid={`rm-assigned-brands-${user.id}`}>
                      {user.assignedBrands.map(brand => (
                        <span key={brand} className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">{brand}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#8A8A8A]">None</span>
                  )}
                </td>
                <td className="p-3 text-right text-[12px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{user.projects}</td>
                <td className="p-3 text-right text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{user.lastActive}</td>
                <td className="p-3 text-right">
                  <span className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded inline-flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default V3AdminUsers;
