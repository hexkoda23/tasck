import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/shared/Logo';
import { ArrowRight, Sparkles } from 'lucide-react';

const VersionSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-6" data-testid="version-selector">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#2F55FF]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#22C55E]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6"><Logo variant="dark" size="md" /></div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">SELECT EXPERIENCE</p>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-2">Choose Your Version</h1>
          <p className="text-white/40 text-sm">Two visions of the same platform. Same data, different philosophy.</p>
        </div>

        {/* Version Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* V1 Card */}
          <button
            onClick={() => navigate('/v1')}
            className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-left hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300"
            data-testid="version-v1"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-white/20 text-xs font-mono tracking-wider">v1.0</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <h2 className="text-white text-xl font-bold mb-2 tracking-tight">TASCK OS v1</h2>
            <p className="text-white/60 text-lg mb-1">Current Build</p>
            <p className="text-white/30 text-sm leading-relaxed mb-6">
              The foundation. Five portals, full workflow simulation, comprehensive data across Staff, Brand, Super Creative, Creative, and Admin experiences.
            </p>
            <div className="flex items-center gap-3 text-white/40 text-xs">
              <span>5 Portals</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>46+ Pages</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>Full Workflow</span>
            </div>
            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-5 h-5 text-white/40" />
            </div>
          </button>

          {/* V2 Card */}
          <button
            onClick={() => navigate('/v2')}
            className="group relative bg-white/[0.03] border border-[#2F55FF]/30 rounded-2xl p-8 text-left hover:bg-[#2F55FF]/[0.06] hover:border-[#2F55FF]/50 transition-all duration-300 overflow-hidden"
            data-testid="version-v2"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute -top-1 -right-1 w-24 h-24 bg-gradient-to-bl from-[#2F55FF]/20 to-transparent rounded-bl-3xl" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#2F55FF]/40 to-transparent v2-shimmer" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[#2F55FF]/60 text-xs font-mono tracking-wider">v2.0</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2F55FF]/15 text-[#6B8AFF] text-[10px] font-medium">
                  <Sparkles className="w-2.5 h-2.5" /> NEW
                </span>
                <div className="h-px flex-1 bg-[#2F55FF]/10" />
              </div>
              <h2 className="text-white text-xl font-bold mb-2 tracking-tight">TASCK OS v2</h2>
              <p className="text-[#6B8AFF] text-lg mb-1">Next Generation</p>
              <p className="text-white/30 text-sm leading-relaxed mb-6">
                The future. AI-native, operator-first, built for scale. Command center intelligence, deal simulation, relationship graphs, and real-time operations.
              </p>
              <div className="flex items-center gap-3 text-white/40 text-xs">
                <span>3 Portals</span>
                <span className="w-1 h-1 rounded-full bg-[#2F55FF]/30" />
                <span>AI-Native</span>
                <span className="w-1 h-1 rounded-full bg-[#2F55FF]/30" />
                <span>Command Center</span>
              </div>
            </div>
            <div className="absolute bottom-8 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-5 h-5 text-[#2F55FF]" />
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-10">
          <p className="text-white/15 text-[10px]">&copy; 2026 The TASCK Agency. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default VersionSelector;
