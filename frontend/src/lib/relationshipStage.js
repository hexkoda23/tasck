import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { v3UpdateBrandDetails } from './v3api';

// CRM relationship stage. Mirrors RELATIONSHIP_STAGES in backend/v3_routes.py —
// the backend validates the value and auto-advances it on real stage events;
// these labels/colours are the presentation side. Keep the `value` keys in sync.
export const RELATIONSHIP_STAGES = [
  { value: 'unknown', label: 'Unknown', bg: '#1F2937', fg: '#FFFFFF' },
  { value: 'dormant', label: 'Dormant', bg: '#6B7280', fg: '#FFFFFF' },
  { value: 'resting', label: 'Resting relationship | check back date set', bg: '#E3E5EF', fg: '#3F3F46' },
  { value: 'setup_relationship_meeting', label: 'Set Up Relationship Meeting', bg: '#0F766E', fg: '#FFFFFF' },
  { value: 'hot_relationship', label: 'HOT Relationship | Prepare Connect Stage', bg: '#22D3EE', fg: '#0B3B44' },
  { value: 'setup_connect_call', label: 'Set Up Connect Call', bg: '#2563EB', fg: '#FFFFFF' },
  { value: 'hot_connection', label: 'HOT Connection | Prepare Pitch', bg: '#6EE7A8', fg: '#0B3B2B' },
  { value: 'setup_pitch_meeting', label: 'Set Up Pitch Meeting | Pitch Ready', bg: '#BBF7D0', fg: '#14532D' },
  { value: 'hot_pitch', label: 'HOT Pitch | Head to framing', bg: '#FCD34D', fg: '#4A3208' },
  { value: 'framing_onboard_partner', label: 'Framing | Onboard Partner', bg: '#F9A8D4', fg: '#5C1138' },
  { value: 'framing_onboard_super_creative', label: 'Framing | Onboard Super Creative', bg: '#F87171', fg: '#4C0D0D' },
  { value: 'framing_agreements_signed', label: 'Framing | Agreements Signed', bg: '#991B1B', fg: '#FFFFFF' },
  { value: 'project_delivery', label: 'Project Delivery', bg: '#DDD6FE', fg: '#3B0764' },
  { value: 'reporting', label: 'Reporting', bg: '#7C3AED', fg: '#FFFFFF' },
];

export const DEFAULT_RELATIONSHIP_STAGE = 'unknown';

export const relationshipStageOf = (brand) =>
  String(brand?.relationship_stage || '').trim() || DEFAULT_RELATIONSHIP_STAGE;

export const relationshipStageMeta = (value) =>
  RELATIONSHIP_STAGES.find((stage) => stage.value === value) || RELATIONSHIP_STAGES[0];

/** Read-only coloured tag. Use anywhere a brand is listed or summarised. */
export const RelationshipStageTag = ({ stage, className = '', title }) => {
  const meta = relationshipStageMeta(stage || DEFAULT_RELATIONSHIP_STAGE);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-4 whitespace-nowrap ${className}`}
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      title={title || meta.label}
      data-testid="relationship-stage-tag"
      data-stage={meta.value}
    >
      {meta.label}
    </span>
  );
};

/**
 * The stage dropdown pinned to brand-scoped pages. Saves straight to the brand
 * record so the tag updates everywhere, then calls onChange(value) so the host
 * page can refresh. Optimistic: the tag flips immediately and rolls back if the
 * save fails.
 */
export const RelationshipStageSelect = ({ brandId, value, onChange, disabled = false, className = '' }) => {
  const [saving, setSaving] = useState(false);
  const [localValue, setLocalValue] = useState(null);
  const current = localValue ?? (value || DEFAULT_RELATIONSHIP_STAGE);
  const meta = relationshipStageMeta(current);

  const handleChange = async (event) => {
    const next = event.target.value;
    const previous = current;
    if (!brandId || next === previous) return;
    setLocalValue(next);
    setSaving(true);
    try {
      await v3UpdateBrandDetails(brandId, { relationship_stage: next });
      if (typeof onChange === 'function') onChange(next);
    } catch (e) {
      setLocalValue(previous); // roll back so the tag never lies
      if (typeof onChange === 'function') onChange(previous, e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`} data-testid="relationship-stage-select">
      <select
        value={current}
        onChange={handleChange}
        disabled={disabled || saving || !brandId}
        aria-label="Relationship stage"
        className="appearance-none cursor-pointer rounded-full pl-3 pr-7 py-1.5 text-[11px] font-semibold outline-none border-0 disabled:opacity-60"
        style={{ backgroundColor: meta.bg, color: meta.fg }}
        data-stage={meta.value}
      >
        {RELATIONSHIP_STAGES.map((stage) => (
          <option key={stage.value} value={stage.value} style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}>
            {stage.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 h-3.5 w-3.5"
        style={{ color: meta.fg }}
        strokeWidth={2.5}
      />
    </div>
  );
};

export default RelationshipStageSelect;
