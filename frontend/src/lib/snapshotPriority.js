import React, { useState } from 'react';
import { v3SetSnapshotPriority } from './v3api';

// Priority a brand puts on an Alignment Snapshot when a Connect call produced
// several. Mirrors PRIORITY_OPTIONS / PRIORITY_COLORS in backend/v3_routes.py.
// Ordered most-urgent first; the bundle sorts snapshots by this order.
export const PRIORITY_OPTIONS = [
  { value: 'High Priority and Urgent', bg: '#9B1C1C', fg: '#FFFFFF' },
  { value: 'High Priority and Long Term', bg: '#1D4ED8', fg: '#FFFFFF' },
  { value: 'Mid Term Priority', bg: '#6B5E16', fg: '#FFFFFF' },
  { value: 'Long Term Priority', bg: '#2A6A6A', fg: '#FFFFFF' },
];

export const priorityMeta = (value) => PRIORITY_OPTIONS.find((p) => p.value === value) || null;

/** Read-only coloured priority chip. Renders nothing until someone ranks it. */
export const PriorityTag = ({ priority, className = '' }) => {
  const meta = priorityMeta(priority);
  if (!meta) return null;
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold leading-4 whitespace-nowrap ${className}`}
      style={{ backgroundColor: meta.bg, color: meta.fg }}
      data-testid="snapshot-priority-tag"
      data-priority={meta.value}
    >
      {meta.value}
    </span>
  );
};

/**
 * Priority picker shown under each Alignment Snapshot. The brand normally sets
 * this so TASCK knows what to work on first; admin can set it too (pass
 * actor="admin"). Optimistic with rollback so the chip never shows a value the
 * server rejected.
 */
export const PrioritySelect = ({ snapshotId, value, actor = 'brand', onChange, disabled = false, className = '' }) => {
  const [saving, setSaving] = useState(false);
  const [localValue, setLocalValue] = useState(null);
  const current = localValue ?? (value || '');
  const meta = priorityMeta(current);

  const handleChange = async (event) => {
    const next = event.target.value;
    const previous = current;
    if (!snapshotId || next === previous) return;
    setLocalValue(next);
    setSaving(true);
    try {
      await v3SetSnapshotPriority(snapshotId, next, actor);
      if (typeof onChange === 'function') onChange(next);
    } catch (e) {
      setLocalValue(previous);
      if (typeof onChange === 'function') onChange(previous, e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className={`inline-flex items-center gap-2 ${className}`} data-testid="snapshot-priority-select">
      <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Priority</span>
      <select
        value={current}
        onChange={handleChange}
        disabled={disabled || saving || !snapshotId}
        className="cursor-pointer rounded-md border px-2 py-1 text-[11px] font-semibold outline-none disabled:opacity-60"
        style={meta
          ? { backgroundColor: meta.bg, color: meta.fg, borderColor: meta.bg }
          : { backgroundColor: '#FFFFFF', color: '#1A1A1A', borderColor: '#E8E4DB' }}
      >
        <option value="" style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}>Not ranked yet</option>
        {PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} style={{ backgroundColor: '#FFFFFF', color: '#1A1A1A' }}>
            {option.value}
          </option>
        ))}
      </select>
    </label>
  );
};

export default PrioritySelect;
