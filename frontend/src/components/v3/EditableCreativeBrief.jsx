import React, { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';

const fieldClass = 'w-full rounded-lg border border-[#D7CBB8] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] focus:border-[#1F4A3A] focus:outline-none focus:ring-2 focus:ring-[#DDE8E0]';

const EditableCreativeBrief = ({ brief, saving, onSave, onCancel }) => {
  const [draft, setDraft] = useState(() => ({
    title: brief.title || '',
    duration: brief.duration || '',
    sections: (brief.sections || []).map((section) => ({
      ...section,
      paragraphs: [...(section.paragraphs || [])],
      bullets: [...(section.bullets || [])],
      groups: (section.groups || []).map((group) => ({
        ...group,
        bullets: [...(group.bullets || [])],
        sub_bullets: [...(group.sub_bullets || [])],
      })),
      lines: (section.lines || []).map((line) => ({ ...line })),
    })),
  }));

  const updateSection = (index, updater) => setDraft((current) => ({
    ...current,
    sections: current.sections.map((section, i) => i === index ? updater(section) : section),
  }));
  const updateList = (sectionIndex, field, itemIndex, value) => updateSection(sectionIndex, (section) => ({
    ...section,
    [field]: section[field].map((item, i) => i === itemIndex ? value : item),
  }));
  const addListItem = (sectionIndex, field) => updateSection(sectionIndex, (section) => ({
    ...section,
    [field]: [...(section[field] || []), ''],
  }));
  const removeListItem = (sectionIndex, field, itemIndex) => updateSection(sectionIndex, (section) => ({
    ...section,
    [field]: section[field].filter((_, i) => i !== itemIndex),
  }));
  const updateGroup = (sectionIndex, groupIndex, updater) => updateSection(sectionIndex, (section) => ({
    ...section,
    groups: section.groups.map((group, i) => i === groupIndex ? updater(group) : group),
  }));

  const textList = (section, sectionIndex, field, label, multiline = false) => (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-[#4F3E2F]">{label}</p>
      {(section[field] || []).map((value, itemIndex) => (
        <div key={`${field}-${itemIndex}`} className="flex items-start gap-2">
          {multiline ? (
            <textarea rows={3} value={value} onChange={(event) => updateList(sectionIndex, field, itemIndex, event.target.value)} className={fieldClass} aria-label={`${label} ${itemIndex + 1}`} />
          ) : (
            <input value={value} onChange={(event) => updateList(sectionIndex, field, itemIndex, event.target.value)} className={fieldClass} aria-label={`${label} ${itemIndex + 1}`} />
          )}
          <button type="button" onClick={() => removeListItem(sectionIndex, field, itemIndex)} className="rounded-md p-2 text-[#8A8A8A] hover:bg-[#FBEDEA] hover:text-[#B54A37]" aria-label={`Remove ${label.toLowerCase()} ${itemIndex + 1}`}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => addListItem(sectionIndex, field)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F4A3A] hover:underline"><Plus className="h-3.5 w-3.5" /> Add {label.toLowerCase().replace(/s$/, '')}</button>
    </div>
  );

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSave(draft); }} className="space-y-5" data-testid="brief-template-editor">
      <p className="text-[12px] text-[#6E6657]">Edit the document here, then save. The browser preview, downloads, and future sends will use your saved wording.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 sm:col-span-2"><span className="text-[11px] font-semibold text-[#4F3E2F]">Brief title</span><input required maxLength={300} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className={fieldClass} data-testid="brief-edit-title" /></label>
        <label className="space-y-1 sm:col-span-2"><span className="text-[11px] font-semibold text-[#4F3E2F]">Duration</span><input maxLength={300} value={draft.duration} onChange={(event) => setDraft((current) => ({ ...current, duration: event.target.value }))} className={fieldClass} data-testid="brief-edit-duration" /></label>
      </div>
      <div className="max-h-[620px] space-y-4 overflow-y-auto pr-1">
        {draft.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="space-y-3 rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-4" data-testid={`brief-edit-section-${sectionIndex}`}>
            <label className="block space-y-1"><span className="text-[11px] font-semibold text-[#4F3E2F]">Section heading</span><input required value={section.heading || ''} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, heading: event.target.value }))} className={fieldClass} /></label>
            {textList(section, sectionIndex, 'paragraphs', 'Paragraphs', true)}
            {textList(section, sectionIndex, 'bullets', 'Bullet points')}
            {section.content !== undefined && <label className="block space-y-1"><span className="text-[11px] font-semibold text-[#4F3E2F]">Additional text</span><textarea rows={3} value={section.content || ''} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, content: event.target.value }))} className={fieldClass} /></label>}
            {(section.groups || []).map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2 rounded-lg border border-[#E8E4DB] bg-white p-3">
                <label className="block space-y-1"><span className="text-[11px] font-semibold text-[#4F3E2F]">Group heading</span><input value={group.title || ''} onChange={(event) => updateGroup(sectionIndex, groupIndex, (current) => ({ ...current, title: event.target.value }))} className={fieldClass} /></label>
                {['bullets', 'sub_bullets'].map((field) => (
                  <div key={field} className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#4F3E2F]">{field === 'bullets' ? 'Group points' : 'Sub-points'}</p>
                    {(group[field] || []).map((value, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <input value={value} onChange={(event) => updateGroup(sectionIndex, groupIndex, (current) => ({ ...current, [field]: current[field].map((item, i) => i === itemIndex ? event.target.value : item) }))} className={fieldClass} aria-label={`${field === 'bullets' ? 'Group point' : 'Sub-point'} ${itemIndex + 1}`} />
                        <button type="button" onClick={() => updateGroup(sectionIndex, groupIndex, (current) => ({ ...current, [field]: current[field].filter((_, i) => i !== itemIndex) }))} className="rounded-md p-2 text-[#8A8A8A] hover:text-[#B54A37]" aria-label="Remove point"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => updateGroup(sectionIndex, groupIndex, (current) => ({ ...current, [field]: [...(current[field] || []), ''] }))} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1F4A3A] hover:underline"><Plus className="h-3.5 w-3.5" /> Add point</button>
                  </div>
                ))}
              </div>
            ))}
            {(section.lines || []).map((line, lineIndex) => (
              <div key={lineIndex} className="grid gap-2 sm:grid-cols-2">
                {['label', 'value'].map((field) => <label key={field} className="space-y-1"><span className="text-[11px] font-semibold text-[#4F3E2F]">{field === 'label' ? 'Line label' : 'Line value'}</span><input value={line[field] || ''} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, lines: current.lines.map((row, i) => i === lineIndex ? { ...row, [field]: event.target.value } : row) }))} className={fieldClass} /></label>)}
              </div>
            ))}
            {['intro', 'primary_label', 'primary_value', 'availability_label', 'conditions_label', 'conditions_hint', 'note'].filter((field) => section[field] !== undefined).map((field) => (
              <label key={field} className="block space-y-1"><span className="text-[11px] font-semibold capitalize text-[#4F3E2F]">{field.replace(/_/g, ' ')}</span><textarea rows={2} value={section[field] || ''} onChange={(event) => updateSection(sectionIndex, (current) => ({ ...current, [field]: event.target.value }))} className={fieldClass} /></label>
            ))}
            {['checkboxes', 'scope_signal', 'assumptions', 'availability_options', 'confirmations'].filter((field) => Array.isArray(section[field])).map((field) => textList(section, sectionIndex, field, field.replace(/_/g, ' ')))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E8E4DB] pt-3">
        <button type="button" onClick={onCancel} disabled={saving} className="v3-btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="v3-btn-primary" data-testid="brief-save-edits-btn"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save brief changes'}</button>
      </div>
    </form>
  );
};

export default EditableCreativeBrief;
