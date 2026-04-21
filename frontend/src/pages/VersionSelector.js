import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/shared/Logo';
import { ArrowRight, Sparkles, FileText } from 'lucide-react';

const VersionSelector = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#06080F] flex items-center justify-center p-6" data-testid="version-selector">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-[#2F55FF]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#22C55E]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="text-center mb-12">
          <div className="mb-6"><Logo variant="dark" size="md" /></div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">SELECT EXPERIENCE</p>
          <h1 className="text-white text-3xl font-bold tracking-tight mb-2">Choose Your Version</h1>
          <p className="text-white/40 text-sm">Three visions of the same platform. Today, tomorrow, the day after.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* V1 */}
          <button onClick={() => navigate('/v1')} className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 text-left hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300" data-testid="version-v1">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-white/20 text-xs font-mono tracking-wider">v1.0</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <h2 className="text-white text-lg font-bold mb-1 tracking-tight">Classic</h2>
            <p className="text-white/50 text-sm mb-1">Broad ops platform</p>
            <p className="text-white/25 text-xs leading-relaxed mb-5">Five portals, full workflow simulation, comprehensive data across all user roles.</p>
            <div className="flex items-center gap-2 text-white/30 text-[10px]">
              <span>5 Portals</span><span className="w-1 h-1 rounded-full bg-white/15" /><span>46+ Pages</span>
            </div>
            <ArrowRight className="absolute bottom-7 right-7 w-4 h-4 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* V2 */}
          <button onClick={() => navigate('/v2')} className="group relative bg-white/[0.03] border border-[#2F55FF]/30 rounded-2xl p-7 text-left hover:bg-[#2F55FF]/[0.06] hover:border-[#2F55FF]/50 transition-all duration-300 overflow-hidden" data-testid="version-v2">
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-bl from-[#2F55FF]/20 to-transparent rounded-bl-3xl" />
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#2F55FF]/40 to-transparent v2-shimmer" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[#2F55FF]/60 text-xs font-mono tracking-wider">v2.0</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2F55FF]/15 text-[#6B8AFF] text-[10px] font-medium"><Sparkles className="w-2.5 h-2.5" /> AI</span>
                <div className="h-px flex-1 bg-[#2F55FF]/10" />
              </div>
              <h2 className="text-white text-lg font-bold mb-1 tracking-tight">Next</h2>
              <p className="text-[#6B8AFF] text-sm mb-1">AI-native command</p>
              <p className="text-white/25 text-xs leading-relaxed mb-5">Command center intelligence, deal simulation, relationship graphs, real-time operations.</p>
              <div className="flex items-center gap-2 text-white/30 text-[10px]">
                <span>3 Portals</span><span className="w-1 h-1 rounded-full bg-[#2F55FF]/30" /><span>AI-Native</span>
              </div>
            </div>
            <ArrowRight className="absolute bottom-7 right-7 w-4 h-4 text-[#2F55FF]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* V3 */}
          <button onClick={() => navigate('/v3')} className="group relative bg-white/[0.03] border border-[#1F4A3A]/40 rounded-2xl p-7 text-left hover:bg-[#1F4A3A]/[0.06] hover:border-[#1F4A3A]/60 transition-all duration-300 overflow-hidden" data-testid="version-v3">
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
              <div className="absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-bl from-[#1F4A3A]/15 to-transparent rounded-bl-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[#2F6B54]/60 text-xs font-mono tracking-wider">v3.0</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F4A3A]/20 text-[#5A9A7F] text-[10px] font-medium"><FileText className="w-2.5 h-2.5" /> PRD Build</span>
                <div className="h-px flex-1 bg-[#1F4A3A]/15" />
              </div>
              <h2 className="text-white text-lg font-bold mb-1 tracking-tight">TASCK</h2>
              <p className="text-[#5A9A7F] text-sm mb-1">Faithful PRD build</p>
              <p className="text-white/25 text-xs leading-relaxed mb-5">The operational platform built to spec. Four-stage pipeline, unified business cases, AI-generated documents.</p>
              <div className="flex items-center gap-2 text-white/30 text-[10px]">
                <span>3 Portals</span><span className="w-1 h-1 rounded-full bg-[#1F4A3A]/30" /><span>34 Pages</span><span className="w-1 h-1 rounded-full bg-[#1F4A3A]/30" /><span>Built to spec</span>
              </div>
            </div>
            <ArrowRight className="absolute bottom-7 right-7 w-4 h-4 text-[#2F6B54]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        <div className="text-center mt-10">
          <p className="text-white/15 text-[10px]">&copy; 2026 The TASCK Agency. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default VersionSelector;
