import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/shared/Logo';
import { 
  Briefcase, 
  Building2, 
  Sparkles, 
  Palette, 
  Shield,
  ArrowRight
} from 'lucide-react';

const roleCards = [
  {
    id: 'staff',
    role: 'staff',
    title: 'TASCK Staff',
    description: 'Originate deals, manage pipelines, orchestrate the creative economy.',
    icon: Briefcase,
    path: '/staff'
  },
  {
    id: 'brand',
    role: 'brand',
    title: 'Brand',
    description: 'Track campaigns, approve deliverables, measure ROI.',
    icon: Building2,
    path: '/brand'
  },
  {
    id: 'super_creative',
    role: 'super_creative',
    title: 'Super Creative',
    description: 'Create projects, fund opportunities, hire talent.',
    icon: Sparkles,
    path: '/super-creative'
  },
  {
    id: 'creative',
    role: 'creative',
    title: 'Creative',
    description: 'Find gigs, complete tasks, get paid automatically.',
    icon: Palette,
    path: '/creative'
  },
  {
    id: 'admin',
    role: 'admin',
    title: 'Admin',
    description: 'Manage users, disputes, contracts, and platform settings.',
    icon: Shield,
    path: '/admin'
  }
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(null);

  const handleRoleSelect = async (card) => {
    setLoading(card.id);
    try {
      await login(card.role);
      navigate(card.path);
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="landing-split" data-testid="landing-page">
      {/* LEFT PANEL — Branding */}
      <div className="landing-left relative">
        {/* Arc decorations */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 800 900" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="400" cy="1000" rx="700" ry="600" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          <ellipse cx="400" cy="1100" rx="850" ry="700" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
          <ellipse cx="200" cy="300" rx="300" ry="200" fill="none" stroke="rgba(47,85,255,0.08)" strokeWidth="0.5" />
        </svg>

        <div className="relative z-10 max-w-md text-center">
          <div className="mb-12">
            <Logo variant="dark" size="lg" />
          </div>

          <p className="text-white/50 text-xs uppercase tracking-[0.2em] mb-6">THE TASCK AGENCY.</p>
          
          <h1 
            className="font-display text-white mb-6 tracking-tight leading-[0.95]"
            style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
          >
            Creativity,<br />
            <span className="italic text-white/80">Managed.</span>
          </h1>
          
          <p className="text-white/40 text-base leading-relaxed max-w-sm mx-auto">
            The operating system for Africa's creative economy. Connecting brands, artists, and talent.
          </p>

          {/* Enter Demo Button */}
          <div className="mt-10">
            <button
              onClick={() => navigate('/select')}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-white text-[#0F172A] text-sm font-medium hover:bg-white/90 transition-colors"
              data-testid="enter-demo-btn"
            >
              Enter Demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8">
            <div>
              <div className="text-2xl font-bold text-white font-mono">₦2.4B+</div>
              <div className="text-xs text-white/30 mt-1">Pipeline Value</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">50+</div>
              <div className="text-xs text-white/30 mt-1">Brand Partners</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono">200+</div>
              <div className="text-xs text-white/30 mt-1">Creatives</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — Role Selector */}
      <div className="landing-right" data-testid="role-selector">
        <div className="w-full max-w-md mx-auto">
          {/* Demo badge */}
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-[#E2E8F0] text-xs text-[#64748B]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse"></span>
            Demo Mode — Choose a portal to explore
          </div>

          <h2 className="text-2xl font-bold text-[#0F172A] mb-2 tracking-tight">
            Choose Your Portal
          </h2>
          <p className="text-[#64748B] text-sm mb-8">
            Select a role to explore the TASCK OS platform.
          </p>

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
                      <div className="w-5 h-5 border-2 border-[#2F55FF] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-[#CBD5E1]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-[#F1F5F9]">
            <p className="text-[11px] text-[#94A3B8]">
              &copy; 2026 The TASCK Agency. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
