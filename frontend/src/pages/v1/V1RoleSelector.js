import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/shared/Logo';
import {
  Briefcase, Building2, Sparkles, Palette, Shield, ArrowRight, ChevronLeft
} from 'lucide-react';

const roleCards = [
  { id: 'staff', role: 'staff', title: 'TASCK Staff', description: 'Originate deals, manage pipelines, orchestrate the creative economy.', icon: Briefcase, path: '/staff' },
  { id: 'brand', role: 'brand', title: 'Brand', description: 'Track campaigns, approve deliverables, measure ROI.', icon: Building2, path: '/brand/login', requiresLogin: true },
  { id: 'super_creative', role: 'super_creative', title: 'Super Creative', description: 'Create projects, fund opportunities, hire talent.', icon: Sparkles, path: '/super-creative' },
  { id: 'creative', role: 'creative', title: 'Creator', description: 'Review briefs, submit deliverables, and manage TASCK work.', icon: Palette, path: '/creator/login', requiresLogin: true },
  { id: 'admin', role: 'admin', title: 'Admin', description: 'Manage users, disputes, contracts, and platform settings.', icon: Shield, path: '/admin' }
];

const V1RoleSelector = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(null);

  const handleRoleSelect = async (card) => {
    setLoading(card.id);
    try {
      if (card.requiresLogin) {
        navigate(card.path);
        return;
      }
      await login(card.role);
      navigate(card.path);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6" data-testid="v1-role-selector">
      <div className="w-full max-w-md mx-auto">
        {/* Back link */}
        <button onClick={() => navigate('/select')} className="inline-flex items-center gap-1.5 text-[#94A3B8] text-xs mb-8 hover:text-[#64748B] transition-colors" data-testid="back-to-versions">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to version select
        </button>

        {/* Header */}
        <div className="mb-2"><Logo variant="light" size="sm" /></div>

        <div className="inline-flex items-center gap-2 mb-6 mt-6 px-3 py-1.5 rounded-full border border-[#E2E8F0] text-xs text-[#64748B]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          TASCK OS v1 — Demo Mode
        </div>

        <h2 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">Choose Your Portal</h2>
        <p className="text-[#64748B] text-sm mb-8">Select a role to explore the TASCK OS v1 platform.</p>

        {/* Role Cards */}
        <div className="space-y-3">
          {roleCards.map((card) => {
            const Icon = card.icon;
            const isLoading = loading === card.id;
            return (
              <button
                key={card.id}
                onClick={() => !loading && handleRoleSelect(card)}
                disabled={!!loading}
                className={`role-card w-full text-left flex items-center gap-4 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                data-testid={`role-card-${card.id}`}
              >
                <div className="w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-[#2F55FF]" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0F172A] text-sm">{card.title}</div>
                  <div className="text-[#94A3B8] text-[11px] mt-0.5 leading-snug">{card.description}</div>
                </div>
                <div className="flex-shrink-0">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#2F55FF] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-[#CBD5E1]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-10 pt-6 border-t border-[#F1F5F9]">
          <p className="text-[11px] text-[#94A3B8]">&copy; 2026 The TASCK Agency. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default V1RoleSelector;
