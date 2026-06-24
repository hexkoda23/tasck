import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { v3SaveStrategyDraft } from '../../lib/v3api';

export const STRATEGY_DRAFT_HEADINGS = [
  'Executive Snapshot', 'Strategic Foundation', 'Growth Plan',
  'Creator Strategy', 'Execution Roadmap', 'Commercial Overview',
  'Tracking Plan', 'Risks & Mitigation', 'Next Steps',
];

/**
 * 9-section editable Strategy Draft.
 * Hydrates from `businessCase.plan.strategy_draft.sections` and persists via
 * `POST /api/v3/business-cases/{id}/plan/save-strategy-draft`.
 *
 * Props:
 *  - businessCaseId: required
 *  - initialDraft: { sections: {heading: string}, updated_at: iso, updated_by: string } (nullable)
 *  - onSaved: optional callback fired with the saved draft after a successful save
 *  - actor: optional actor string (defaults to 'admin')
 */
const StrategyDraftEditor = ({ businessCaseId, initialDraft, onSaved, actor = 'admin' }) => {
  const [sections, setSections] = useState({});
  const [savedAt, setSavedAt] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Re-hydrate whenever the underlying business case (or its draft timestamp) changes
  useEffect(() => {
    const draftSections = initialDraft?.sections;
    if (draftSections && typeof draftSections === 'object') {
      setSections(draftSections);
      setSavedAt(initialDraft.updated_at || null);
    } else {
      setSections({});
      setSavedAt(null);
    }
  }, [businessCaseId, initialDraft?.updated_at]);

  const handleSave = async () => {
    if (!businessCaseId) return;
    setSaving(true);
    setError('');
    try {
      const res = await v3SaveStrategyDraft(businessCaseId, sections, actor);
      const next = res?.strategy_draft;
      if (next) {
        setSavedAt(next.updated_at || new Date().toISOString());
        if (next.sections) setSections(next.sections);
        if (onSaved) onSaved(next);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to save strategy draft.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="strategy-draft-editor">
      <p className="text-[11px] text-[#8A8A8A]">
        Draft the brand-facing strategy. Sections follow the Strategy Snapshot template. Saves are independent of the published Strategy Snapshot.
      </p>
      {STRATEGY_DRAFT_HEADINGS.map((heading) => (
        <div key={heading} className="p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
          <label className="text-[10px] uppercase tracking-wider text-[#8A8A8A] block mb-1">{heading}</label>
          <textarea
            value={sections[heading] || ''}
            onChange={(e) => setSections({ ...sections, [heading]: e.target.value })}
            rows={3}
            placeholder={`${heading}…`}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
            data-testid={`strategy-draft-${heading.replace(/\s+/g, '-').replace(/&/g, 'and').toLowerCase()}`}
          />
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <div className="text-[11px] text-[#8A8A8A]" data-testid="strategy-draft-saved-at">
          {error ? (
            <span className="text-[#B0301C]">{error}</span>
          ) : savedAt ? (
            <>Last saved {new Date(savedAt).toLocaleString()}{initialDraft?.updated_by ? ` by ${initialDraft.updated_by}` : ''}</>
          ) : (
            'Draft not saved yet.'
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !businessCaseId}
          className="v3-btn-primary flex items-center gap-1.5"
          data-testid="strategy-draft-save-btn"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : 'Save Strategy Draft'}
        </button>
      </div>
    </div>
  );
};

export default StrategyDraftEditor;
