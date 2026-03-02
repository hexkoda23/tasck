import React from 'react';
import { Settings as SettingsIcon, Bell, Shield, CreditCard, Globe, Palette, Database, Mail } from 'lucide-react';

export const AdminSettings = () => {
  return (
    <div className="space-y-6 animate-fade-in" data-testid="admin-settings">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform Settings</h1>
        <p className="text-white/50 text-sm">Configure platform-wide settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commission Settings */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#6BFF9A]/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-[#6BFF9A]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Commission Settings</h3>
              <p className="text-white/40 text-xs">Platform fee structure</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">Default Commission Rate</label>
              <div className="flex items-center gap-2">
                <input type="number" value="15" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-24" />
                <span className="text-white/40">%</span>
              </div>
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Minimum Deal Value</label>
              <div className="flex items-center gap-2">
                <span className="text-white/40">₦</span>
                <input type="number" value="500000" className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white w-32" />
              </div>
            </div>
          </div>
        </div>

        {/* Escrow Settings */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#FFA502]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#FFA502]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Escrow Rules</h3>
              <p className="text-white/40 text-xs">Payment protection settings</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Auto-release after approval</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked className="sr-only peer" readOnly />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-[#6BFF9A]"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Dispute hold period</span>
              <span className="text-white">7 days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/60 text-sm">Auto-refund on cancellation</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked className="sr-only peer" readOnly />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-[#6BFF9A]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* KYC Requirements */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#2F55FF]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#2F55FF]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">KYC Requirements</h3>
              <p className="text-white/40 text-xs">Verification settings</p>
            </div>
          </div>
          <div className="space-y-3">
            {['BVN Verification', 'Liveness Check', 'Document Upload', 'Address Verification'].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{item}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={item !== 'Address Verification'} className="sr-only peer" readOnly />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-[#6BFF9A]"></div>
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="dashboard-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#7C5CFC]/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#7C5CFC]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Notifications</h3>
              <p className="text-white/40 text-xs">Platform notification preferences</p>
            </div>
          </div>
          <div className="space-y-3">
            {['New Deal Alerts', 'Payment Notifications', 'Dispute Alerts', 'Weekly Reports'].map((item) => (
              <div key={item} className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{item}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked className="sr-only peer" readOnly />
                  <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-[#6BFF9A]"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="btn-secondary">Reset to Defaults</button>
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
};

export default AdminSettings;
