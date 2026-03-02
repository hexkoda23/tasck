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
  ArrowRight,
  X
} from 'lucide-react';

const roleCards = [
  {
    id: 'staff',
    role: 'staff',
    title: 'TASCK Staff',
    description: 'The command center. Originate deals, manage pipelines, orchestrate everything.',
    icon: Briefcase,
    path: '/staff'
  },
  {
    id: 'brand',
    role: 'brand',
    title: 'Brand',
    description: 'The client portal. Track campaigns, approve deliverables, measure ROI.',
    icon: Building2,
    path: '/brand'
  },
  {
    id: 'super_creative',
    role: 'super_creative',
    title: 'Super Creative',
    description: 'The power creator. Create projects, fund opportunities, hire talent.',
    icon: Sparkles,
    path: '/super-creative'
  },
  {
    id: 'creative',
    role: 'creative',
    title: 'Creative',
    description: 'The talent. Find gigs, complete tasks, get paid automatically.',
    icon: Palette,
    path: '/creative'
  },
  {
    id: 'admin',
    role: 'admin',
    title: 'Admin',
    description: 'The platform. Users, disputes, audit, permissions.',
    icon: Shield,
    path: '/admin'
  }
];

export const LandingPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

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
    <div className="landing-gradient min-h-screen" data-testid="landing-page">
      {/* Floating Demo Pill */}
      {showBanner && (
        <div className="demo-banner flex items-center gap-2" data-testid="demo-pill">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#6BFF9A] animate-pulse"></span>
          <span>Demo Mode</span>
          <button onClick={() => setShowBanner(false)} className="ml-2 hover:opacity-70 transition-opacity">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* SVG Arc Lines (TASCK signature element) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="720" cy="1100" rx="900" ry="800" fill="none" stroke="rgba(47,85,255,0.06)" strokeWidth="1" />
        <ellipse cx="720" cy="1200" rx="1100" ry="900" fill="none" stroke="rgba(47,85,255,0.04)" strokeWidth="0.5" />
        <ellipse cx="300" cy="800" rx="600" ry="500" fill="none" stroke="rgba(107,255,154,0.04)" strokeWidth="0.5" />
      </svg>

      {/* Header */}
      <header className="relative z-10 pt-8 px-8">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo variant="light" size="md" />
          <button className="rounded-full border border-[#071426]/15 text-[#071426] px-6 py-2.5 text-sm font-medium hover:bg-[#071426]/5 transition-all" data-testid="speak-with-us-btn">
            Speak With Us
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-24 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 
            className="font-display text-[#071426] mb-8 tracking-tight leading-[0.95] animate-fade-in"
            style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}
          >
            Creativity,<br />
            <span className="italic">Managed.</span>
          </h1>
          
          <p className="text-lg text-[#071426]/55 mb-12 max-w-xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '100ms' }}>
            We connect Africa's Top Creators to The World's Leading Companies.
          </p>

          <div className="flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <button 
              className="rounded-full bg-[#2F55FF] text-white px-10 py-3.5 font-semibold text-sm inline-flex items-center gap-2 hover:shadow-[0_0_24px_rgba(47,85,255,0.35)] hover:scale-[1.02] active:scale-[0.97] transition-all duration-200"
              onClick={() => document.getElementById('role-selector').scrollIntoView({ behavior: 'smooth' })}
              data-testid="enter-demo-btn"
            >
              Enter Demo
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="rounded-full border border-[#2F55FF]/30 text-[#2F55FF] px-10 py-3.5 font-semibold text-sm hover:bg-[#2F55FF]/5 transition-all duration-200" data-testid="learn-more-btn">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Role Selector Section */}
      <section id="role-selector" className="relative z-10 py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[11px] uppercase tracking-[0.15em] text-[#2F55FF] font-semibold mb-3">Choose Your Portal</p>
            <h2 className="font-display text-3xl md:text-4xl text-[#071426] tracking-tight">
              Five Portals. One Platform.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 stagger-children">
            {roleCards.map((card, index) => {
              const Icon = card.icon;
              const isLoading = loading === card.id;
              
              return (
                <div
                  key={card.id}
                  onClick={() => !loading && handleRoleSelect(card)}
                  className={`role-card text-center animate-fade-in ${isLoading ? 'opacity-70 pointer-events-none' : ''}`}
                  style={{ animationDelay: `${index * 80}ms` }}
                  data-testid={`role-card-${card.id}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#6BFF9A]/10 flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-5 h-5 text-[#6BFF9A]" strokeWidth={1.5} />
                  </div>
                  
                  <h3 className="text-base font-bold text-[#071426] mb-2">
                    {card.title}
                  </h3>
                  
                  <p className="text-[#071426]/50 text-sm leading-relaxed mb-5">
                    {card.description}
                  </p>

                  <div className="flex items-center justify-center text-[#2F55FF] text-sm font-medium">
                    {isLoading ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      <>
                        Enter
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two Column Cards */}
      <section className="relative z-10 py-16 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#2F55FF] rounded-2xl p-10 text-white relative overflow-hidden group">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 400">
              <ellipse cx="500" cy="350" rx="300" ry="200" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            </svg>
            <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase mb-8 block relative z-10">BRANDS</span>
            <h3 className="font-display text-3xl md:text-4xl mb-3 italic relative z-10 leading-tight">
              Work Directly With<br />Top African Talent.
            </h3>
            <p className="text-white/50 mb-8 relative z-10">We deliver business results.</p>
            <button className="relative z-10 rounded-full border border-white/20 text-white px-7 py-2.5 text-sm hover:bg-white/10 transition-all">
              Work with us
            </button>
          </div>

          <div className="bg-[#071426] rounded-2xl p-10 text-white relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 400">
              <ellipse cx="100" cy="50" rx="300" ry="200" fill="none" stroke="rgba(107,255,154,0.05)" strokeWidth="0.5" />
            </svg>
            <span className="text-[10px] tracking-[0.2em] text-white/40 uppercase mb-8 block relative z-10">TOP CREATORS</span>
            <h3 className="font-display text-3xl md:text-4xl mb-3 italic relative z-10 leading-tight">
              We Represent You.
            </h3>
            <p className="text-white/50 mb-8 relative z-10">For all your business needs.</p>
            <button className="relative z-10 rounded-full bg-[#2F55FF] text-white px-7 py-2.5 text-sm hover:bg-[#2F55FF]/90 hover:shadow-[0_0_20px_rgba(47,85,255,0.3)] transition-all">
              Work with us
            </button>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="relative z-10 py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#071426] rounded-2xl p-16 text-center relative overflow-hidden">
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 400">
              <ellipse cx="500" cy="500" rx="600" ry="400" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <ellipse cx="500" cy="550" rx="700" ry="450" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </svg>
            <h2 className="font-display text-4xl md:text-5xl text-white mb-4 italic relative z-10">
              Join our Community
            </h2>
            <p className="text-white/40 mb-10 relative z-10">Soundboard, CWCA, Opportunities</p>
            <button className="relative z-10 rounded-full bg-[#2F55FF] text-white px-10 py-3.5 font-semibold text-sm inline-flex items-center gap-2 hover:shadow-[0_0_24px_rgba(47,85,255,0.35)] transition-all">
              Join Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-8 border-t border-[#071426]/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo variant="light" size="sm" />
          <p className="text-[#071426]/35 text-sm">
            &copy; 2026 The TASCK Agency. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
