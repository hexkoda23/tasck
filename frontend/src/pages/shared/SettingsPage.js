import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/shared/Avatar';
import { User, Bell, Shield, CreditCard, Palette, Globe, LogOut, Camera, Mail, Phone, MapPin } from 'lucide-react';

export const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl" data-testid="settings-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/50 text-sm">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="flex items-start gap-6">
          <div className="relative">
            <Avatar name={user?.name} size="xl" />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2F55FF] rounded-full flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <label className="text-white/60 text-sm block mb-1">Full Name</label>
              <input 
                type="text" 
                value={user?.name || 'Tunde Balogun'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
                readOnly
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Email</label>
              <input 
                type="email" 
                value={user?.email || 'tunde@thetasck.com'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Phone</label>
              <input 
                type="tel" 
                value="+234 801 234 5678"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="text-white/60 text-sm block mb-1">Location</label>
              <input 
                type="text" 
                value={user?.location || 'Lagos, Nigeria'}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
                readOnly
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="text-white/60 text-sm block mb-1">Bio</label>
          <textarea 
            value={user?.bio || 'Senior Agent with 8+ years in entertainment management. Specializing in music and brand partnerships.'}
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none resize-none"
            readOnly
          />
        </div>
      </div>

      {/* Notification Settings */}
      <div className="dashboard-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-[#2F55FF]" />
          <h2 className="text-lg font-semibold text-white">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Email Notifications', desc: 'Receive updates via email', enabled: true },
            { label: 'Push Notifications', desc: 'Browser push notifications', enabled: true },
            { label: 'Deal Alerts', desc: 'New opportunities and deal updates', enabled: true },
            { label: 'Task Reminders', desc: 'Reminders for upcoming deadlines', enabled: true },
            { label: 'Weekly Digest', desc: 'Summary of weekly activity', enabled: false }
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">{item.label}</p>
                <p className="text-white/40 text-xs">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={item.enabled} className="sr-only peer" readOnly />
                <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-[#6BFF9A] after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="dashboard-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-[#6BFF9A]" />
          <h2 className="text-lg font-semibold text-white">Security</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white text-sm">Two-Factor Authentication</p>
              <p className="text-[#6BFF9A] text-xs">Enabled via SMS</p>
            </div>
            <button className="btn-ghost text-sm">Configure</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white text-sm">Password</p>
              <p className="text-white/40 text-xs">Last changed 30 days ago</p>
            </div>
            <button className="btn-ghost text-sm">Change</button>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div>
              <p className="text-white text-sm">Active Sessions</p>
              <p className="text-white/40 text-xs">2 devices logged in</p>
            </div>
            <button className="btn-ghost text-sm">Manage</button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="dashboard-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-[#FFA502]" />
          <h2 className="text-lg font-semibold text-white">Appearance</h2>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <button className="p-4 bg-[#071426] border-2 border-[#2F55FF] rounded-lg text-center">
            <div className="w-full h-8 bg-[#0A1A30] rounded mb-2"></div>
            <p className="text-white text-sm">Dark</p>
            <p className="text-[#6BFF9A] text-xs">Active</p>
          </button>
          <button className="p-4 bg-white/5 border border-white/10 rounded-lg text-center opacity-50">
            <div className="w-full h-8 bg-white/20 rounded mb-2"></div>
            <p className="text-white text-sm">Light</p>
            <p className="text-white/40 text-xs">Coming Soon</p>
          </button>
          <button className="p-4 bg-white/5 border border-white/10 rounded-lg text-center opacity-50">
            <div className="w-full h-8 bg-gradient-to-r from-[#0A1A30] to-white/20 rounded mb-2"></div>
            <p className="text-white text-sm">System</p>
            <p className="text-white/40 text-xs">Coming Soon</p>
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="btn-secondary">Cancel</button>
        <button className="btn-primary">Save Changes</button>
      </div>
    </div>
  );
};

export default SettingsPage;
