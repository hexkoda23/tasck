import React from 'react';

// Editor for the Pitch Deck's `slides` payload.
//
// The deck the brand sees - flip book, slide view and .docx - is rendered from
// `deck.slides`, a structured payload with one entry per slide. `deck.sections`
// is a FLATTENED, read-only view of it. The admin editor used to write to
// `sections`, which is why edits never reached the flip book: the flattening is
// lossy and nothing maps it back. These fields edit `slides` directly.

export const PITCH_SLIDE_LABELS = {
  cover: 'Cover',
  about: 'About The Organisation',
  context: 'Context & Core Focus',
  problem: 'The Problem',
  objective: 'The Objective',
  market: 'The Market / Core Audience',
  solution: 'The Solution / Creator Strategy',
  journey: 'Go To Market / Campaign',
  funnel: 'The Campaign Funnel',
  projections: 'Campaign Projections',
  risks: 'Risk & Mitigation Analysis',
  budget: 'Budget Assumptions',
  creator_mix: 'Recommended Creator Mix',
  team: 'Team',
  closing: 'Closing',
  thank_you: 'Thank You',
};

export const PITCH_SLIDE_ORDER_UI = Object.keys(PITCH_SLIDE_LABELS);

// Artwork is managed by the Deck imagery card, not typed in here.
const SKIP_FIELDS = new Set(['image', 'bg_image', 'profiles', 'creator_images']);

const humanizeKey = (key) => String(key || '')
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (c) => c.toUpperCase());

const isEditable = (value) => (
  value !== null
  && value !== undefined
  && typeof value !== 'number'
  && typeof value !== 'boolean'
);

// Walks a slide into a FLAT list of rows - one per editable leaf, plus a header
// row for each nested group. The recursion is deliberately plain JS rather than
// a self-referencing JSX component: the dev server's visual-edits babel plugin
// overflows its stack on a component that renders itself, and this keeps the
// rendered tree a simple loop while still handling any field shape the template
// grows later (string, list of strings, list of objects, nested object).
const flattenSlide = (value, path, depth, rows) => {
  if (typeof value === 'string') {
    rows.push({ kind: 'text', path, depth, label: humanizeKey(path[path.length - 1]), value });
    return rows;
  }
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === 'string')) {
      rows.push({ kind: 'lines', path, depth, label: humanizeKey(path[path.length - 1]), value });
      return rows;
    }
    rows.push({ kind: 'group', path, depth, label: humanizeKey(path[path.length - 1]) });
    value.forEach((item, index) => flattenSlide(item, [...path, index], depth + 1, rows));
    return rows;
  }
  if (value && typeof value === 'object') {
    if (path.length > 1) {
      rows.push({ kind: 'group', path, depth, label: humanizeKey(path[path.length - 1]) });
    }
    Object.entries(value)
      .filter(([key, child]) => !SKIP_FIELDS.has(key) && isEditable(child))
      .forEach(([key, child]) => flattenSlide(child, [...path, key], path.length > 1 ? depth + 1 : depth, rows));
    return rows;
  }
  return rows;
};

const INPUT_CLASS = 'w-full rounded-md border border-[#E8E4DB] px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-[#1F4A3A]';
const LABEL_CLASS = 'text-[10px] uppercase tracking-wider text-[#8A8A8A]';

const PitchDeckSlideEditor = ({ slides, onChange, testPrefix = 'pitch-slide-field' }) => {
  const present = PITCH_SLIDE_ORDER_UI.filter(
    (key) => slides?.[key] && typeof slides[key] === 'object',
  );
  if (!present.length) return null;
  return (
    <>
      <p className="text-[12px] text-[#6E6657]" data-testid="pitch-slide-editor-note">
        Every field below is a real field on the slide. Edits here apply to the flip book, the
        slide view and the .docx as soon as you save.
      </p>
      {present.map((key, index) => (
        <div key={key} className="v3-card p-4" data-testid={`pitch-slide-${key}`}>
          <p className="text-[12px] font-semibold text-[#1A1A1A] mb-3">
            {index + 1}. {PITCH_SLIDE_LABELS[key] || humanizeKey(key)}
          </p>
          <div className="space-y-2.5">
            {flattenSlide(slides[key], [key], 0, []).map((row) => {
              const id = row.path.join('.');
              const indent = row.depth ? { paddingLeft: `${Math.min(row.depth, 3) * 10}px` } : undefined;
              if (row.kind === 'group') {
                return (
                  <p key={id} style={indent} className="pt-1 text-[10px] uppercase tracking-wider text-[#B5AF9F]">
                    {row.label}
                  </p>
                );
              }
              if (row.kind === 'lines') {
                return (
                  <label key={id} style={indent} className="block space-y-1">
                    <span className={LABEL_CLASS}>
                      {row.label}{' '}
                      <span className="normal-case tracking-normal text-[#B5AF9F]">- one per line</span>
                    </span>
                    <textarea
                      rows={Math.min(Math.max(row.value.length, 2), 8)}
                      value={row.value.join('\n')}
                      onChange={(e) => onChange(row.path, e.target.value.split('\n'))}
                      className={INPUT_CLASS}
                      data-testid={`${testPrefix}-${id}`}
                    />
                  </label>
                );
              }
              return (
                <label key={id} style={indent} className="block space-y-1">
                  <span className={LABEL_CLASS}>{row.label}</span>
                  <textarea
                    rows={row.value.length > 90 ? 3 : 1}
                    value={row.value}
                    onChange={(e) => onChange(row.path, e.target.value)}
                    className={INPUT_CLASS}
                    data-testid={`${testPrefix}-${id}`}
                  />
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};

export default PitchDeckSlideEditor;
