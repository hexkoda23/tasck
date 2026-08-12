import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/shared/Logo';
import { Zap, Building2, Users, ArrowRight, ArrowLeft } from 'lucide-react';

const v2Roles = [
  {
    id: 'v2_command',
    role: 'staff',
    title: 'TASCK COMMAND',
    subtitle: 'Senior Agent',
    user: 'Tunde Balogun',
    description: 'The nerve center. AI-powered deal origination, pipeline intelligence, and project orchestration.',
    icon: Zap,
    path: '/v2/command',
    accent: '#2F55FF',
    features: ['AI Briefings', 'Deal Simulator', 'Intelligence Signals', 'Live Operations']
  },
  {
    id: 'v2_brand',
    role: 'brand',
    title: 'BRAND PORTAL',
    subtitle: 'Marketing Director',
    user: 'Adenike Ogunlesi, Guinness Nigeria',
    description: 'Your window into creative partnerships. Track campaigns, approve work, measure impact.',
    icon: Building2,
    path: '/v2/brand',
    accent: '#22C55E',
    features: ['Campaign Analytics', 'Approval Queue', 'Health Dashboard', 'ROI Tracking']
  },
  {
    id: 'v2_talent',
    role: 'creative',
    title: 'TALENT NETWORK',
    subtitle: 'Photographer',
    user: 'Kelechi Amadi-Obi',
    description: 'Your creative career platform. Opportunities, projects, earnings, reputation - all in one place.',
    icon: Users,
    path: '/v2/talent',
    accent: '#F59E0B',
    features: ['AI Matching', 'Performance Analytics', 'Skill Demand', 'Career Insights']
  }
];

const V2RoleSelector = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(null);

  const handleSelect = async (card) => {
    setLoading(card.id);
    try {
      await login(card.role);
      navigate(card.path);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-6" data-testid="v2-role-selector">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-[#2F55FF]/4 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[300px] h-[300px] rounded-full bg-[#22C55E]/3 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="flex items-center justify-between mb-10">
          <button onClick={() => navigate('/select')} className="flex items-center gap-2 text-white/30 text-xs hover:text-white/50 transition-colors" data-testid="back-to-versions">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to version select
          </button>
          <Logo variant="dark" size="sm" />
          <div className="flex items-center gap-2">
            <span className="text-[#2F55FF]/60 text-xs font-mono">v2.0</span>
            <span className="px-2 py-0.5 rounded-full bg-[#2F55FF]/15 text-[#6B8AFF] text-[9px] font-medium">NEXT GEN</span>
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-white text-2xl font-bold tracking-tight mb-2">Enter TASCK OS v2</h1>
          <p className="text-white/30 text-sm">Three portals. One operating system. AI-native.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {v2Roles.map((card) => {
            const Icon = card.icon;
            const isLoading = loading === card.id;
            return (
              <button
                key={card.id}
                onClick={() => !loading && handleSelect(card)}
                disabled={!!loading}
                className={`group relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 text-left hover:border-white/[0.12] transition-all duration-300 ${isLoading ? 'opacity-60' : ''}`}
                data-testid={`v2-role-${card.id}`}
                style={{ '--accent': card.accent }}
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(ellipse at top, ${card.accent}08 0%, transparent 60%)` }} />

                <div className="relative z-10">
                  <div className="w-10 h-10 rounded-xl border border-white/[0.08] flex items-center justify-center mb-5" style={{ background: `${card.accent}10` }}>
                    <Icon className="w-5 h-5" style={{ color: card.accent }} />
                  </div>

                  <h3 className="text-white text-sm font-bold tracking-wider mb-1">{card.title}</h3>
                  <p className="text-white/50 text-xs mb-3">{card.description}</p>

                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {card.features.map(f => (
                      <span key={f} className="text-[9px] text-white/25 px-2 py-0.5 rounded-full border border-white/[0.06]">{f}</span>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/[0.06]">
                    <p className="text-white/40 text-[10px]">Auto-login as</p>
                    <p className="text-white/70 text-xs font-medium">{card.user}</p>
                    <p className="text-white/30 text-[10px]">{card.subtitle}</p>
                  </div>

                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${card.accent}40`, borderTopColor: 'transparent' }} />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-white/30" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <p className="text-white/10 text-[10px]">&copy; 2026 The TASCK Agency. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default V2RoleSelector;
