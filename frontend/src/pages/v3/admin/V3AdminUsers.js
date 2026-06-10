import React, { useState, useEffect } from 'react';
import { v3ListRelationshipManagers, v3GetBrands, v3GetCreators } from '../../../lib/v3api';
import { Users, Plus, Shield, Building2, Palette, Search, CheckCircle, Loader2 } from 'lucide-react';

const V3AdminUsers = () => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      v3ListRelationshipManagers().catch(() => []),
      v3GetBrands({}).catch(() => []),
      v3GetCreators().catch(() => []),
    ]).then(([rms, brandsRaw, creatorsRaw]) => {
      const rmList = Array.isArray(rms) ? rms : [];
      const brandList = Array.isArray(brandsRaw) ? brandsRaw : brandsRaw?.items || [];
      const creatorList = Array.isArray(creatorsRaw) ? creatorsRaw : [];

      const builtUsers = [
        // RM / admin users
        ...rmList.map((rm) => ({
          id: rm.id || rm._id,
          name: rm.name || rm.display_name,
          email: rm.email || `${(rm.name || '').toLowerCase().replace(/\s+/g, '.')}@tasck.com`,
          role: 'admin',
          subRole: 'Relationship Manager',
          status: 'active',
          lastActive: rm.last_active || '—',
          projects: rm.project_count ?? 0,
          assignedBrands: Array.isArray(rm.assigned_brands) ? rm.assigned_brands : [],
        })),
        // Fixed admin staff
        {
          id: 'u-ops1',
          name: 'Admin',
          email: 'admin@tasck.com',
          role: 'admin',
          subRole: 'Platform Admin',
          status: 'active',
          lastActive: 'Now',
          projects: 0,
          assignedBrands: [],
        },
        // Brand contact users (top 10)
        ...brandList.slice(0, 10).map((b) => ({
          id: `u-brand-${b.id || b._id}`,
          name: b.primary_contact || b.contact || b.company || 'Brand Contact',
          email: b.email || '—',
          role: 'brand',
          subRole: (b.company || b.name || '').split(' ')[0],
          status: 'active',
          lastActive: b.last_interaction || '—',
          projects: 0,
          assignedBrands: [],
        })),
        // Creator users (top 10)
        ...creatorList.slice(0, 10).map((c) => ({
          id: `u-creator-${c.id || c._id}`,
          name: c.name || c.handle || 'Creator',
          email: c.email || c.manager_email || '—',
          role: 'creator',
          subRole: c.genre || c.tier || 'Creator',
          status: 'active',
          lastActive: '—',
          projects: 0,
          assignedBrands: [],
        })),
      ].filter((u) => u.name && u.name !== '—');

      setUserList(builtUsers);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-2 text-[#8A8A8A]" data-testid="v3-admin-users">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-[12px]">Loading users…</span>
      </div>
    );
  }

  const filtered = userList
    .filter((u) => roleFilter === 'all' || u.role === roleFilter)
    .filter(
      (u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(search.toLowerCase())
    );

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

  const adminCount = userList.filter((u) => u.role === 'admin').length;
  const brandCount = userList.filter((u) => u.role === 'brand').length;
  const creatorCount = userList.filter((u) => u.role === 'creator').length;

  return (
    <div data-testid="v3-admin-users">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">
            USER MANAGEMENT
          </p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
            Users &amp; Roles
          </h1>
          <p className="text-[#8A8A8A] text-sm">
            {userList.length} user{userList.length !== 1 ? 's' : ''} across 3 portal types
          </p>
        </div>
        <button className="v3-btn-primary" data-testid="invite-user-btn">
          <Plus className="w-4 h-4" /> Invite User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div
          className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors"
          onClick={() => setRoleFilter('admin')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-[#1F4A3A]" />
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">
              Admin / TASCK Team
            </span>
          </div>
          <p
            className="text-xl font-semibold text-[#1A1A1A]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {adminCount}
          </p>
        </div>
        <div
          className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors"
          onClick={() => setRoleFilter('brand')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-[#C49B5F]" />
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">
              Brand Users
            </span>
          </div>
          <p
            className="text-xl font-semibold text-[#1A1A1A]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {brandCount}
          </p>
        </div>
        <div
          className="v3-card p-4 cursor-pointer hover:border-[#D4CDBF] transition-colors"
          onClick={() => setRoleFilter('creator')}
        >
          <div className="flex items-center gap-2 mb-2">
            <Palette className="w-4 h-4 text-[#567B3F]" />
            <span className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">
              Creator Users
            </span>
          </div>
          <p
            className="text-xl font-semibold text-[#1A1A1A]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {creatorCount}
          </p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors"
            data-testid="user-search"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: 'all', label: 'All' },
            { key: 'admin', label: 'Admin' },
            { key: 'brand', label: 'Brand' },
            { key: 'creator', label: 'Creator' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setRoleFilter(f.key)}
              className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors ${
                roleFilter === f.key ? 'bg-[#1F4A3A] text-white' : 'text-[#8A8A8A] hover:bg-[#F4F2EC]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* User table */}
      {filtered.length === 0 ? (
        <div className="v3-card p-10 flex flex-col items-center gap-2">
          <Users className="w-8 h-8 text-[#D4CDBF]" strokeWidth={1} />
          <p className="text-[13px] text-[#8A8A8A]">
            {search ? 'No users match your search.' : 'No users found.'}
          </p>
        </div>
      ) : (
        <div className="v3-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E8E4DB]">
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                  User
                </th>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                  Role
                </th>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                  Portal
                </th>
                <th className="text-left text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                  Assigned Brands
                </th>
                <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                  Last Active
                </th>
                <th className="text-right text-[10px] text-[#8A8A8A] uppercase tracking-wider p-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-[#F4F2EC] last:border-0 hover:bg-[#FAFAF7] transition-colors"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#F4F2EC] flex items-center justify-center text-[10px] font-bold text-[#5C5C5C]">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-[12px] text-[#1A1A1A] font-medium">{user.name}</p>
                        <p className="text-[10px] text-[#8A8A8A]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="text-[11px] text-[#5C5C5C]">{user.subRole}</span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded capitalize ${roleBadge(user.role)}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    {user.role === 'admin' && user.assignedBrands?.length > 0 ? (
                      <div
                        className="flex flex-wrap gap-1 max-w-[260px]"
                        data-testid={`rm-assigned-brands-${user.id}`}
                      >
                        {user.assignedBrands.map((brand) => (
                          <span
                            key={brand}
                            className="text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded"
                          >
                            {brand}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#8A8A8A]">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right text-[10px] text-[#8A8A8A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {user.lastActive}
                  </td>
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
      )}
    </div>
  );
};

export default V3AdminUsers;
