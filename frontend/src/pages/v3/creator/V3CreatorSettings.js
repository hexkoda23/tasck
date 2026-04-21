import React from 'react';
import { getCreator } from '../../../lib/v3data';
import { Settings, Bell, User, Shield } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorSettings = () => {
  const creator = getCreator(creatorId);

  return (
    <div data-testid="v3-creator-settings">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">SETTINGS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Account Settings</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Manage your creator portal preferences.</p>

      <div className="space-y-6">
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Profile</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Name</span><span className="text-[13px] text-[#1A1A1A]">{creator?.name}</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Genre</span><span className="text-[13px] text-[#1A1A1A]">{creator?.genre}</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Location</span><span className="text-[13px] text-[#1A1A1A]">{creator?.location}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-[13px] text-[#8A8A8A]">Tier</span><span className="text-[13px] text-[#1A1A1A] capitalize">{creator?.tier}</span></div>
          </div>
        </div>

        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Notifications</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">New brief received</span><span className="text-[13px] text-[#1A1A1A]">Email + In-app</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Deliverable approved</span><span className="text-[13px] text-[#1A1A1A]">In-app</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Payment released</span><span className="text-[13px] text-[#1A1A1A]">Email</span></div>
            <div className="flex justify-between py-1.5"><span className="text-[13px] text-[#8A8A8A]">Message received</span><span className="text-[13px] text-[#1A1A1A]">In-app</span></div>
          </div>
        </div>

        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Payment</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Bank</span><span className="text-[13px] text-[#1A1A1A]">GTBank ****4417</span></div>
            <div className="flex justify-between py-1.5"><span className="text-[13px] text-[#8A8A8A]">Payment terms</span><span className="text-[13px] text-[#1A1A1A]">On deliverable approval</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3CreatorSettings;
