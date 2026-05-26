import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getBrandPortalBrand, getBrandPortalSession } from '../../../lib/v3brandPortal';
import { Bell, User, Shield } from 'lucide-react';

const V3BrandSettings = () => {
  const navigate = useNavigate();
  const brand = getBrandPortalBrand();
  const session = getBrandPortalSession();

  return (
    <div data-testid="v3-brand-settings">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">SETTINGS</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Account Settings</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">Manage your brand portal preferences.</p>

      <div className="space-y-6">
        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Profile</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Company</span><span className="text-[13px] text-[#1A1A1A]">{brand?.company}</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Primary contact</span><span className="text-[13px] text-[#1A1A1A]">{session.contact || brand?.primaryContact}</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Email</span><span className="text-[13px] text-[#1A1A1A]">{session.email || brand?.email}</span></div>
            <div className="flex justify-between py-1.5"><span className="text-[13px] text-[#8A8A8A]">Phone</span><span className="text-[13px] text-[#1A1A1A]">{brand?.phone}</span></div>
          </div>
        </div>

        <div className="v3-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
            <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Notifications</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Document ready for review</span><span className="text-[13px] text-[#1A1A1A]">Email + In-app</span></div>
            <div className="flex justify-between py-1.5 border-b border-[#F4F2EC]"><span className="text-[13px] text-[#8A8A8A]">Deliverable uploaded</span><span className="text-[13px] text-[#1A1A1A]">In-app</span></div>
            <div className="flex justify-between py-1.5"><span className="text-[13px] text-[#8A8A8A]">Invoice issued</span><span className="text-[13px] text-[#1A1A1A]">Email</span></div>
          </div>
        </div>

        <div className="v3-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#1F4A3A]" strokeWidth={1.5} />
              <div>
                <h3 className="text-[13px] font-semibold text-[#1A1A1A]">Password</h3>
                <p className="text-[12px] text-[#8A8A8A]">Change the temporary password from your welcome email.</p>
              </div>
            </div>
            <button onClick={() => navigate('/v3/brand/change-password')} className="v3-btn-primary text-[12px]">Change Password</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3BrandSettings;
