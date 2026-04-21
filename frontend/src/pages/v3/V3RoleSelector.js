import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../../components/shared/Logo';
import { ChevronLeft, Shield, Building2, Palette } from 'lucide-react';

const roles = [
  {
    id: 'admin',
    title: 'Admin Control Centre',
    subtitle: 'Run the campaign engine',
    description: 'Pipeline, CRM, business cases, creator matching, contracts, delivery, and closure.',
    icon: Shield,
    path: '/v3/admin',
  },
  {
    id: 'brand',
    title: 'Brand Portal',
    subtitle: 'Track your campaign, approve the work',
    description: 'Curated project view, approvals, documents vault, invoices, and messaging.',
    icon: Building2,
    path: '/v3/brand',
  },
  {
    id: 'creator',
    title: 'Creator Portal',
    subtitle: 'Receive briefs, deliver work, get paid',
    description: 'Brief inbox, deliverable uploads, milestone tracking, wallet, and profile.',
    icon: Palette,
    path: '/v3/creator',
  },
];

const V3RoleSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-6" data-testid="v3-role-selector">
      <div className="w-full max-w-lg">
        <button onClick={() => navigate('/select')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-xs mb-8 hover:text-[#5C5C5C] transition-colors" data-testid="v3-back">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to version select
        </button>

        <div className="mb-2"><Logo variant="light" size="sm" /></div>

        <div className="inline-flex items-center gap-2 mt-6 mb-6 px-3 py-1.5 rounded-full border border-[#E8E4DB] text-xs text-[#8A8A8A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1F4A3A]" />
          TASCK OS v3 — PRD Build
        </div>

        <h1 className="text-[#1A1A1A] text-2xl font-bold tracking-tight mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Choose Your Portal</h1>
        <p className="text-[#8A8A8A] text-sm mb-8">Select a role to explore the TASCK platform as built to spec.</p>

        <div className="space-y-3">
          {roles.map(role => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => navigate(role.path)}
                className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-[#E8E4DB] bg-white hover:border-[#D4CDBF] hover:shadow-sm transition-all group"
                data-testid={`v3-role-${role.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#F4F2EC] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#1F4A3A]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#1A1A1A] text-sm">{role.title}</div>
                  <div className="text-[#1F4A3A] text-[11px] mt-0.5">{role.subtitle}</div>
                  <div className="text-[#8A8A8A] text-[10px] mt-1 leading-snug">{role.description}</div>
                </div>
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="#1F4A3A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 pt-6 border-t border-[#E8E4DB]">
          <p className="text-[10px] text-[#8A8A8A]">&copy; 2026 The TASCK Agency. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default V3RoleSelector;
