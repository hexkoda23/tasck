import React from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';

const FALLBACK_SOURCES = new Set(['fallback', 'honest_fallback', 'deterministic_fallback', '']);

/**
 * Shows a yellow warning banner whenever the transcript analyser fell back to
 * a deterministic/no-LLM result. This makes it obvious to admin when the
 * Anthropic call did not run (e.g. billing balance empty, network blip, or no
 * key configured) so the displayed "Needs confirmation" fields are not
 * mistaken for Claude output.
 */
const AnalyzerSourceBanner = ({ source, model, note, className = '' }) => {
  const normalized = (source || '').toLowerCase();
  const isFallback = FALLBACK_SOURCES.has(normalized);
  if (!source) return null;

  if (isFallback) {
    return (
      <div
        className={`rounded-[8px] border border-[#E8C9A8] bg-[#FBF1E4] p-3 flex items-start gap-3 ${className}`}
        data-testid="analyzer-fallback-banner"
        role="status"
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 text-[#7A5A1E] shrink-0" />
        <div className="space-y-1">
          <p className="text-[12px] font-semibold text-[#7A5A1E]">
            AI analyser offline — showing safe fallback (no Claude analysis ran).
          </p>
          <p className="text-[11px] text-[#7A5A1E] leading-snug">
            {note
              || 'All eight Alignment Snapshot fields are marked “Needs confirmation”. Check the ANTHROPIC_API_KEY billing balance in console.anthropic.com → Plans & Billing, then retry Analyze Transcript.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-[8px] border border-[#BDE0CE] bg-[#E8F3ED] p-3 flex items-start gap-3 ${className}`}
      data-testid="analyzer-success-banner"
      role="status"
    >
      <Sparkles className="w-4 h-4 mt-0.5 text-[#1F4A3A] shrink-0" />
      <div className="space-y-0.5">
        <p className="text-[12px] font-semibold text-[#1F4A3A]">
          Analysed by {normalized === 'anthropic' ? 'Claude (Anthropic)' : normalized}
          {model ? ` · ${model}` : ''}
        </p>
        <p className="text-[11px] text-[#1F4A3A]/80">Fields below reflect live transcript analysis.</p>
      </div>
    </div>
  );
};

export default AnalyzerSourceBanner;
