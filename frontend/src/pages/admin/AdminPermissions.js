import React from 'react';
import Avatar from '../../components/shared/Avatar';
import { Shield, Check, X, Users, FileText, DollarSign, Settings as SettingsIcon } from 'lucide-react';

const roles = [
  {
    name: 'Staff',
    users: 4,
    permissions: {
      'Create Deals': true,
      'Edit Deals': true,
      'Delete Deals': false,
      'View All Deals': true,
      'Create Projects': true,
      'Manage Artists': true,
      'View Revenue': true,
      'Access Copilot': true,
      'Send Messages': true,
      'Generate Contracts': true
    }
  },
  {
    name: 'Brand',
    users: 12,
    permissions: {
      'Create Deals': false,
      'Edit Deals': false,
      'Delete Deals': false,
      'View Own Deals': true,
      'Create Projects': false,
      'Manage Artists': false,
      'View Analytics': true,
      'Approve Deliverables': true,
      'Send Messages': true,
      'Generate Contracts': false
    }
  },
  {
    name: 'Super Creative',
    users: 10,
    permissions: {
      'Create Projects': true,
      'Post Opportunities': true,
      'Hire Creatives': true,
      'Fund Wallet': true,
      'Release Payments': true,
      'View Portfolio': true,
      'Send Messages': true,
      'Sign Contracts': true
    }
  },
  {
    name: 'Creative',
    users: 45,
    permissions: {
      'View Opportunities': true,
      'Apply to Jobs': true,
      'Submit Deliverables': true,
      'Withdraw Funds': true,
      'Edit Portfolio': true,
      'Send Messages': true,
      'Sign Contracts': true
    }
  },
  {
    name: 'Admin',
    users: 2,
    permissions: {
      'Full Platform Access': true,
      'Manage Users': true,
      'Resolve Disputes': true,
      'View Audit Logs': true,
      'Manage Permissions': true,
      'Platform Settings': true,
      'Financial Override': true
    }
  }
];

export const AdminPermissions = () => {
  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-permissions">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Permissions</h1>
          <p className="text-[#64748B] text-sm">Role-based access control</p>
        </div>
        <button className="btn-primary">+ Create Role</button>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {roles.map((role) => (
          <div key={role.name} className="dashboard-card p-6" data-testid={`role-${role.name.toLowerCase()}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
                  <Shield className="w-5 h-5 text-[#2F55FF]" />
                </div>
                <div>
                  <h3 className="text-[#0F172A] font-semibold">{role.name}</h3>
                  <p className="text-[#94A3B8] text-xs">{role.users} users</p>
                </div>
              </div>
              <button className="text-[#94A3B8] hover:text-[#0F172A]">
                <SettingsIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(role.permissions).map(([permission, enabled]) => (
                <div key={permission} className="flex items-center justify-between py-1">
                  <span className="text-[#64748B] text-sm">{permission}</span>
                  {enabled ? (
                    <Check className="w-4 h-4 text-[#22C55E]" />
                  ) : (
                    <X className="w-4 h-4 text-[#DC2626]/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPermissions;
