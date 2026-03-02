import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/shared/Logo';
import { 
  Building2, 
  Users, 
  Briefcase, 
  Palette, 
  Shield,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const roleCards = [
  {
    id: 'staff',
    role: 'staff',
    title: 'TASCK Staff',
    description: 'The command center. Originate deals, manage pipelines, orchestrate everything.',
    icon: Briefcase,
    path: '/staff',
    color: 'from-[#2F55FF] to-[#1a3ad4]'
  },
  {
    id: 'brand',
    role: 'brand',
    title: 'Brand',
    description: 'The client portal. Track campaigns, approve deliverables, measure ROI.',
    icon: Building2,
    path: '/brand',
    color: 'from-[#071426] to-[#0A1A30]'
  },
  {
    id: 'super_creative',
    role: 'super_creative',
    title: 'Super Creative',
    description: 'The power creator. Create projects, fund opportunities, hire talent.',
    icon: Sparkles,
    path: '/super-creative',
    color: 'from-[#6BFF9A] to-[#4AE080]'
  },
  {
    id: 'creative',
    role: 'creative',
    title: 'Creative',
    description: 'The talent. Find gigs, complete tasks, get paid automatically.',
    icon: Palette,
    path: '/creative',
    color: 'from-[#FFA502] to-[#E89500]'
  },
  {
    id: 'admin',
    role: 'admin',
    title: 'Admin',
    description: 'The platform. Users, disputes, audit, permissions.',
    icon: Shield,
    path: '/admin',
    color: 'from-[#7C5CFC] to-[#6344E5]'
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
    <div className="landing-gradient min-h-screen" data-testid="landing-page">
      {/* Demo Banner */}
      <div className="demo-banner flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-[#6BFF9A] animate-pulse"></span>
        Demo Mode — Data is simulated for demonstration purposes
      </div>

      {/* Header */}
      <header className="pt-6 px-8">
        <nav className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo variant="light" size="md" />
          <button className="btn-secondary text-sm" data-testid="speak-with-us-btn">
            Speak With Us
          </button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Decorative elements */}
          <div className="absolute left-8 top-40 w-3 h-3 rounded-full bg-[#6BFF9A] opacity-60"></div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-[#071426] mb-6 tracking-tight">
            Creativity,<br />
            <span className="italic">Managed.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#071426]/70 mb-10 max-w-2xl mx-auto">
            We connect Africa's Top Creators to The World's Leading Companies.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button 
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => document.getElementById('role-selector').scrollIntoView({ behavior: 'smooth' })}
              data-testid="enter-demo-btn"
            >
              Enter Demo
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="btn-secondary" data-testid="learn-more-btn">
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Role Selector Section */}
      <section id="role-selector" className="py-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-[#071426] mb-4">
              Choose Your Role
            </h2>
            <p className="text-[#071426]/60 text-lg">
              Select a role to explore the TASCK OS demo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roleCards.map((card, index) => {
              const Icon = card.icon;
              const isLoading = loading === card.id;
              
              return (
                <div
                  key={card.id}
                  onClick={() => !loading && handleRoleSelect(card)}
                  className={`role-card cursor-pointer animate-fade-in ${isLoading ? 'opacity-70' : ''}`}
                  style={{ animationDelay: `${index * 100}ms` }}
                  data-testid={`role-card-${card.id}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                    <Icon className={`w-6 h-6 ${card.id === 'super_creative' ? 'text-[#071426]' : 'text-white'}`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#071426] mb-2">
                    {card.title}
                  </h3>
                  
                  <p className="text-[#071426]/60 text-sm leading-relaxed">
                    {card.description}
                  </p>

                  <div className="mt-4 flex items-center text-[#2F55FF] text-sm font-medium">
                    {isLoading ? (
                      <>
                        <span className="animate-pulse">Loading...</span>
                      </>
                    ) : (
                      <>
                        Enter Portal
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Two Column Cards Section */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Brands Card */}
          <div className="bg-[#2F55FF] rounded-2xl p-8 text-white relative overflow-hidden">
            <span className="text-xs tracking-widest text-white/60 uppercase mb-6 block">BRANDS</span>
            
            <div className="w-12 h-12 mb-6">
              <svg viewBox="0 0 48 48" fill="none" className="text-[#6BFF9A]">
                <path d="M24 8L8 24L24 40L40 24L24 8Z" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M24 16L32 24" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>

            <h3 className="text-3xl font-bold mb-2 italic">
              Work Directly With<br />Top African Talent.
            </h3>
            
            <p className="text-white/70 mb-6">We deliver business results.</p>
            
            <button className="bg-transparent border border-white/30 text-white px-6 py-2 rounded-full text-sm hover:bg-white/10 transition-colors">
              Work with us
            </button>
          </div>

          {/* Top Creators Card */}
          <div className="bg-[#071426] rounded-2xl p-8 text-white relative overflow-hidden">
            <span className="text-xs tracking-widest text-white/60 uppercase mb-6 block">TOP CREATORS</span>
            
            <div className="w-12 h-12 mb-6">
              <svg viewBox="0 0 48 48" fill="none" className="text-[#6BFF9A]">
                <circle cx="24" cy="16" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M16 40C16 32 20 28 24 28C28 28 32 32 32 40" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>

            <h3 className="text-3xl font-bold mb-2 italic">
              We Represent You.
            </h3>
            
            <p className="text-white/70 mb-6">For all your business needs.</p>
            
            <button className="bg-[#2F55FF] text-white px-6 py-2 rounded-full text-sm hover:bg-[#2F55FF]/90 transition-colors">
              Work with us
            </button>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-16 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#071426] rounded-2xl p-12 text-center relative overflow-hidden">
            {/* Decorative arc */}
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="150" r="120" stroke="white" strokeWidth="0.5" fill="none" />
              </svg>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 italic relative z-10">
              Join our Community
            </h2>
            
            <p className="text-white/60 mb-8 relative z-10">
              Soundboard, CWCA, Opportunities
            </p>
            
            <button className="btn-primary inline-flex items-center gap-2 relative z-10">
              Join Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-8 border-t border-[#071426]/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo variant="light" size="sm" />
          <p className="text-[#071426]/50 text-sm">
            © 2026 The TASCK Agency. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
