import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/shared/Logo';
import { ArrowRight } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center relative overflow-hidden" data-testid="landing-page">
      {/* Background decorations */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1200 900" preserveAspectRatio="xMidYMid slice">
        <ellipse cx="600" cy="1000" rx="900" ry="700" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <ellipse cx="600" cy="1100" rx="1050" ry="800" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
        <ellipse cx="300" cy="200" rx="400" ry="250" fill="none" stroke="rgba(47,85,255,0.06)" strokeWidth="0.5" />
        <ellipse cx="900" cy="150" rx="350" ry="200" fill="none" stroke="rgba(34,197,94,0.04)" strokeWidth="0.5" />
      </svg>

      {/* Subtle gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#2F55FF]/[0.03] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#22C55E]/[0.02] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-lg text-center px-6">
        <div className="mb-14">
          <Logo variant="dark" size="lg" />
        </div>

        <p className="text-white/40 text-xs uppercase tracking-[0.25em] mb-8">THE TASCK AGENCY</p>

        <h1
          className="font-display text-white mb-8 tracking-tight leading-[0.92]"
          style={{ fontSize: 'clamp(48px, 6vw, 84px)' }}
        >
          Creativity,<br />
          <span className="italic text-white/70">Managed.</span>
        </h1>

        <p className="text-white/35 text-lg leading-relaxed max-w-md mx-auto mb-12">
          The operating system for Africa's creative economy. Connecting brands, artists, and talent.
        </p>

        {/* Enter Demo Button */}
        <button
          onClick={() => navigate('/select')}
          className="inline-flex items-center gap-3 px-10 py-4 rounded-full bg-white text-[#0F172A] text-sm font-semibold hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
          data-testid="enter-demo-btn"
        >
          Enter Demo <ArrowRight className="w-4 h-4" />
        </button>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-10">
          <div>
            <div className="text-2xl font-bold text-white font-mono">₦2.4B+</div>
            <div className="text-[10px] text-white/25 mt-1 uppercase tracking-wider">Pipeline Value</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">50+</div>
            <div className="text-[10px] text-white/25 mt-1 uppercase tracking-wider">Brand Partners</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">200+</div>
            <div className="text-[10px] text-white/25 mt-1 uppercase tracking-wider">Creatives</div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20">
          <p className="text-[10px] text-white/15">&copy; 2026 The TASCK Agency. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
