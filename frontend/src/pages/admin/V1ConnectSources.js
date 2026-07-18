import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, MessageCircle, FileText, Trash2, Upload, Sparkles, Merge, Check, X, Plus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  v3ListConnectSources,
  v3AddConnectSource,
  v3DeleteConnectSource,
  v3ListOpportunities,
  v3DetectOpportunities,
  v3MergeOpportunities,
  v3DeleteOpportunity,
  v3GenerateOpportunitySnapshots,
  v3ListMeetings,
  v3DeleteBusinessCall,
} from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { FlowShell, saveConnectTranscriptSessions, useBusinessCaseBundle } from './V1BusinessCaseFlowPages';

// The three things admin drips in over time. A Connect call is rarely the only
// conversation - the real detail often lives in the WhatsApp thread or the
// email chain that follows, so each is stored as its own source and ALL of
// them are fed to Claude when the snapshots are generated.
export const SOURCE_KINDS = [
  { value: 'transcript', label: 'Call transcript', icon: FileText, hint: 'Paste or upload the transcript of a call with the brand.' },
  { value: 'email', label: 'Email conversation', icon: Mail, hint: 'Paste the email thread between TASCK and the brand.' },
  { value: 'whatsapp', label: 'WhatsApp conversation', icon: MessageCircle, hint: 'Paste or export the WhatsApp chat with the brand.' },
];

const kindMeta = (kind) => SOURCE_KINDS.find((k) => k.value === kind) || SOURCE_KINDS[0];

const formatWhen = (value) => {
  const parsed = new Date(value || '');
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Upload panel for Connect conversation sources. Admin can come back any time
 * and add another source; nothing is overwritten.
 */
export const ConnectSourcesPanel = ({ businessCaseId, onChanged }) => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState('transcript');
  const [label, setLabel] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const reload = useCallback(async () => {
    if (!businessCaseId) return;
    try {
      const data = await v3ListConnectSources(businessCaseId);
      setSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (e) {
      // Non-fatal: the panel just shows empty rather than blocking the page.
    } finally {
      setLoading(false);
    }
  }, [businessCaseId]);

  useEffect(() => { reload(); }, [reload]);

  const readFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      setContent((prev) => (prev ? `${prev}\n\n${text}` : text));
      if (!label) setLabel(file.name);
      toast.success(`Loaded ${file.name}.`);
    } catch (e) {
      toast.error('Could not read that file. Paste the text instead.');
    }
  };

  const save = async () => {
    if (content.trim().length < 20) {
      toast.error('Paste the full conversation before saving it.');
      return;
    }
    setSaving(true);
    try {
      await v3AddConnectSource(businessCaseId, { kind, label: label.trim(), content, author: 'admin' });
      toast.success(`${kindMeta(kind).label} saved.`);
      setContent('');
      setLabel('');
      if (fileRef.current) fileRef.current.value = '';
      await reload();
      if (typeof onChanged === 'function') onChanged();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not save that conversation.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sourceId) => {
    try {
      await v3DeleteConnectSource(businessCaseId, sourceId);
      toast.success('Conversation removed.');
      await reload();
      if (typeof onChanged === 'function') onChanged();
    } catch (e) {
      toast.error('Could not remove that conversation.');
    }
  };

  return (
    <div className="v3-card p-5" data-testid="connect-sources-panel">
      <div className="mb-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Conversation sources</h2>
        <p className="text-[12px] text-[#6E6657] mt-1">
          Add every conversation you have with this brand — a call transcript today, the WhatsApp thread next week, the
          email chain after that. Everything saved here is read by the AI when you generate the Alignment Snapshots.
        </p>
      </div>

      {/* Kind picker */}
      <div className="flex flex-wrap gap-2 mb-3" data-testid="connect-source-kinds">
        {SOURCE_KINDS.map((option) => {
          const Icon = option.icon;
          const active = kind === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                active ? 'border-[#1F4A3A] bg-[#EAF4EE] text-[#1F4A3A] font-semibold' : 'border-[#E8E4DB] bg-white text-[#6E6657] hover:border-[#D4CDBF]'
              }`}
              data-testid={`connect-source-kind-${option.value}`}
            >
              <Icon className="w-3.5 h-3.5" /> {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[#8A8A8A] mb-2">{kindMeta(kind).hint}</p>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={`Label (optional) — e.g. "${kind === 'whatsapp' ? 'Chat with Funke' : kind === 'email' ? 'Budget thread' : 'Discovery call'}"`}
        className="w-full mb-2 rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
        data-testid="connect-source-label"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={7}
        placeholder="Paste the conversation here, or upload a file below."
        className="w-full rounded-lg border border-[#E8E4DB] bg-white p-3 text-[13px] focus:outline-none focus:border-[#1F4A3A]"
        data-testid="connect-source-content"
      />

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.csv,.log,.json"
          onChange={(e) => readFile(e.target.files?.[0])}
          className="hidden"
          id="connect-source-file"
        />
        <label htmlFor="connect-source-file" className="v3-btn-secondary text-[12px] cursor-pointer inline-flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" /> Upload file
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving || content.trim().length < 20}
          className="v3-btn-primary text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
          data-testid="connect-source-save"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : `Save ${kindMeta(kind).label.toLowerCase()}`}
        </button>
      </div>

      {/* Saved sources */}
      <div className="mt-5 border-t border-[#F1ECDF] pt-4">
        <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">
          Saved conversations ({sources.length})
        </p>
        {loading ? (
          <p className="text-[12px] text-[#8A8A8A] flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…</p>
        ) : sources.length === 0 ? (
          <p className="text-[12px] text-[#8A8A8A]">Nothing saved yet. Add the first conversation above.</p>
        ) : (
          <div className="space-y-2" data-testid="connect-sources-list">
            {sources.map((source) => {
              const Icon = kindMeta(source.kind).icon;
              return (
                <div key={source.id} className="flex items-start gap-3 rounded-lg border border-[#E8E4DB] bg-[#FBFAF7] p-3">
                  <Icon className="w-4 h-4 text-[#1F4A3A] mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[#1F1B18] truncate">{source.label || kindMeta(source.kind).label}</p>
                    <p className="text-[11px] text-[#8A8A8A]">
                      {kindMeta(source.kind).label} · {formatWhen(source.created_at)} · {String(source.content || '').length.toLocaleString()} chars
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(source.id)}
                    className="p-1 rounded text-[#B54A37] hover:bg-[#FBF1EE]"
                    title="Remove this conversation"
                    data-testid={`connect-source-delete-${source.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const confidenceTone = (confidence) => ({
  high: 'bg-[#DDE7E2] text-[#1F4A3A] border-[#C7D7CF]',
  medium: 'bg-[#F2EAD8] text-[#7A5F23] border-[#E6D6B6]',
  low: 'bg-[#EEEAE0] text-[#5C5C5C] border-[#DDD6C8]',
}[String(confidence || 'medium').toLowerCase()] || 'bg-[#EEEAE0] text-[#5C5C5C] border-[#DDD6C8]');

/**
 * Review page for what the AI found. Each card is a distinct opportunity; admin
 * ticks two or more and merges them when they are really the same job, then
 * generates one Alignment Snapshot per surviving opportunity.
 */
export const OpportunitiesPanel = ({ businessCaseId, onGenerated }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [selected, setSelected] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [detectMessage, setDetectMessage] = useState('');
  const [merging, setMerging] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [detectedAt, setDetectedAt] = useState('');

  const reload = useCallback(async () => {
    if (!businessCaseId) return;
    try {
      const data = await v3ListOpportunities(businessCaseId);
      setOpportunities(Array.isArray(data?.opportunities) ? data.opportunities : []);
      setDetectedAt(data?.detected_at || '');
    } catch (e) {
      // Non-fatal.
    }
  }, [businessCaseId]);

  useEffect(() => { reload(); }, [reload]);

  const detect = async () => {
    setDetecting(true);
    setDetectMessage('Reading every saved conversation…');
    try {
      // Runs as a background job on the server; this promise resolves when the
      // job completes, reporting progress along the way.
      const data = await v3DetectOpportunities(businessCaseId, (job) => setDetectMessage(job?.message || ''));
      setOpportunities(data?.opportunities || []);
      setDetectedAt(data?.detected_at || '');
      setSelected([]);
      const count = (data?.opportunities || []).length;
      toast.success(count === 1 ? 'The AI found 1 opportunity.' : `The AI found ${count} opportunities.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'The AI could not analyse the conversations.');
    } finally {
      setDetecting(false);
      setDetectMessage('');
    }
  };

  const toggle = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const merge = async () => {
    if (selected.length < 2) return;
    setMerging(true);
    try {
      const data = await v3MergeOpportunities(businessCaseId, selected);
      setOpportunities(data?.opportunities || []);
      setSelected([]);
      toast.success(`Merged into "${data?.merged?.title || 'one opportunity'}".`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not merge those opportunities.');
    } finally {
      setMerging(false);
    }
  };

  const removeOpportunity = async (id) => {
    try {
      const data = await v3DeleteOpportunity(businessCaseId, id);
      setOpportunities(data?.opportunities || []);
      setSelected((prev) => prev.filter((x) => x !== id));
      toast.success('Opportunity removed.');
    } catch (e) {
      toast.error('Could not remove that opportunity.');
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const data = await v3GenerateOpportunitySnapshots(businessCaseId);
      const count = data?.count || 0;
      toast.success(count === 1 ? '1 Alignment Snapshot generated.' : `${count} Alignment Snapshots generated.`);
      await reload();
      if (typeof onGenerated === 'function') onGenerated(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Could not generate the Alignment Snapshots.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="v3-card p-5" data-testid="opportunities-panel">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Campaigns found</h2>
          <p className="text-[12px] text-[#6E6657] mt-1 max-w-3xl">
            The AI reads every saved conversation and splits it into the separate campaigns discussed. Merge any that are
            really the same campaign, then generate one Alignment Snapshot per campaign for the brand to rank.
          </p>
          {detectedAt && <p className="text-[11px] text-[#8A8A8A] mt-1">Last analysed {formatWhen(detectedAt)}</p>}
          {detecting && detectMessage && (
            <p className="text-[11px] text-[#1F4A3A] mt-1 flex items-center gap-1.5" data-testid="opportunities-detect-progress">
              <Loader2 className="w-3 h-3 animate-spin" /> {detectMessage}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={detect}
          disabled={detecting}
          className="v3-btn-secondary text-[12px] inline-flex items-center gap-1.5 whitespace-nowrap"
          data-testid="opportunities-detect-btn"
        >
          {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {detecting ? 'Analysing…' : opportunities.length ? 'Re-analyse conversations' : 'Analyse conversations'}
        </button>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-[12px] text-[#8A8A8A] rounded-lg border border-dashed border-[#E8E4DB] p-4">
          No opportunities yet. Save at least one conversation above, then run the analysis.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] text-[#6E6657]">
              {opportunities.length} opportunit{opportunities.length === 1 ? 'y' : 'ies'} · {selected.length} selected
            </span>
            <button
              type="button"
              onClick={merge}
              disabled={selected.length < 2 || merging}
              className="v3-btn-secondary text-[11px] inline-flex items-center gap-1.5 disabled:opacity-50"
              title={selected.length < 2 ? 'Select two or more to merge' : 'Merge the selected opportunities into one'}
              data-testid="opportunities-merge-btn"
            >
              {merging ? <Loader2 className="w-3 h-3 animate-spin" /> : <Merge className="w-3 h-3" />}
              {merging ? 'Merging…' : `Merge selected (${selected.length})`}
            </button>
            {selected.length > 0 && (
              <button type="button" onClick={() => setSelected([])} className="text-[11px] text-[#8A8A8A] hover:underline inline-flex items-center gap-1">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          <div className="space-y-2" data-testid="opportunities-list">
            {opportunities.map((opportunity, index) => {
              const checked = selected.includes(opportunity.id);
              return (
                <div
                  key={opportunity.id}
                  className={`rounded-lg border p-3 transition-colors ${checked ? 'border-[#1F4A3A] bg-[#EAF4EE]' : 'border-[#E8E4DB] bg-white'}`}
                  data-testid={`opportunity-${opportunity.id}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(opportunity.id)}
                      className="mt-1 h-4 w-4 accent-[#1F4A3A] cursor-pointer flex-shrink-0"
                      aria-label={`Select ${opportunity.title}`}
                      data-testid={`opportunity-check-${opportunity.id}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-[#8A8A8A]">#{index + 1}</span>
                        <p className="text-[13px] font-semibold text-[#1F1B18]">{opportunity.title}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${confidenceTone(opportunity.confidence)}`}>
                          {opportunity.confidence || 'medium'} confidence
                        </span>
                        {opportunity.snapshot_id && (
                          <span className="rounded-full border border-[#C7D7CF] bg-[#DDE7E2] px-2 py-0.5 text-[10px] text-[#1F4A3A]">
                            Snapshot created
                          </span>
                        )}
                      </div>
                      {opportunity.summary && <p className="text-[12px] text-[#4F3E2F] mt-1 leading-5">{opportunity.summary}</p>}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
                        {[
                          ['Focus', opportunity.focus],
                          ['Campaign type', opportunity.campaign_type],
                          ['Audience', opportunity.audience],
                          ['Goals / metrics', opportunity.goals],
                          ['Success looks like', opportunity.success_looks_like],
                          ['Timeline', opportunity.timeline],
                        ].filter(([, value]) => value).map(([fieldLabel, value]) => (
                          <p key={fieldLabel} className="text-[11px] text-[#6E6657]">
                            <span className="text-[#8A8A8A] uppercase tracking-wide text-[10px]">{fieldLabel}: </span>{value}
                          </p>
                        ))}
                      </div>
                      {Array.isArray(opportunity.merged_from) && opportunity.merged_from.length > 0 && (
                        <p className="text-[10px] text-[#8A8A8A] mt-2">
                          Merged from: {opportunity.merged_from.map((m) => m.title).filter(Boolean).join(' + ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOpportunity(opportunity.id)}
                      className="p-1 rounded text-[#B54A37] hover:bg-[#FBF1EE] flex-shrink-0"
                      title="Remove this opportunity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t border-[#F1ECDF] pt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={generating || opportunities.length === 0}
              className="v3-btn-primary text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
              data-testid="opportunities-generate-btn"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {generating
                ? 'Generating…'
                : `Generate ${opportunities.length} Alignment Snapshot${opportunities.length === 1 ? '' : 's'}`}
            </button>
            <p className="text-[11px] text-[#8A8A8A]">
              One snapshot per campaign. The brand ranks them by priority in their portal.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default ConnectSourcesPanel;

// =============================================================================
// V1 "Connect Schedule & Transcripts" rebuild
// -----------------------------------------------------------------------------
// Chioma's feedback: the old page had TWO input areas (dated call transcripts +
// typed conversation sources) and TWO analyze buttons ("Analyse conversations"
// and "Analyze All Transcripts"), which was confusing. The pieces below give
// the V1 admin one combined input panel, ONE analyze button, and a dedicated
// opportunities page that flows into Alignment Snapshots -> brand priority.
// =============================================================================

// Entry shape used by the combined panel. A row is either NEW (no backend id
// yet) or HYDRATED from a previously-saved meeting/source so everything the
// admin ever uploaded reappears on reload / re-login.
const createConversationRow = (index, overrides = {}) => ({
  id: overrides.id || `conv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  kind: overrides.kind || 'transcript', // transcript | email | whatsapp
  backend: overrides.backend || null, // 'meeting' | 'source' | null (unsaved)
  backendId: overrides.backendId || '', // meeting.id or source.id once saved
  date: overrides.date || new Date().toISOString().slice(0, 10),
  label: overrides.label || '',
  content: overrides.content || '',
  dirty: overrides.dirty || false, // local edits not yet persisted
});

const conversationHasContent = (row) => Boolean(String(row.content || '').trim());

/**
 * One combined panel for every Connect conversation. Replaces the old split
 * between TranscriptUploadPanel (dated call sessions -> v3_meetings) and
 * ConnectSourcesPanel (transcript/email/whatsapp -> v3_connect_sources).
 *
 * Persist model (unchanged from before, just unified):
 *   - transcript (call) rows -> v3CreateMeeting + v3UploadMeetingTranscript
 *   - email / whatsapp rows   -> v3AddConnectSource
 * Both backends survive logout/login, so on mount we hydrate from BOTH.
 */
export const ConversationsPanel = ({ businessCaseId, bundle, onChanged, onContentChange }) => {
  const [rows, setRows] = useState([createConversationRow(0)]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const lastAddedIdRef = useRef(null);
  const [lastAddedId, setLastAddedId] = useState(null);

  const bc = bundle?.business_case || {};
  const brand = bundle?.brand || {};
  const contact = bc.brand_contact_snapshot || {};
  const contactName = contact.primary_contact || brand.primary_contact || '';
  const contactEmail = contact.email || brand.email || '';

  const reload = useCallback(async () => {
    if (!businessCaseId) return;
    setLoading(true);
    try {
      // Pull both funnels in parallel, then merge into one chronological list
      // so the admin sees every conversation they ever saved here.
      const [meetingsRes, sourcesRes] = await Promise.all([
        v3ListMeetings({ business_case_id: businessCaseId, stage: 'connect' }).catch(() => ({ meetings: [] })),
        v3ListConnectSources(businessCaseId).catch(() => ({ sources: [] })),
      ]);
      const meetingRows = (Array.isArray(meetingsRes) ? meetingsRes : meetingsRes?.meetings || [])
        .filter((m) => m.meeting_type === 'business_call' || m.type === 'business_call')
        .map((meeting, idx) => {
          const rawDate = meeting.call_date || meeting.scheduled_for || '';
          return createConversationRow(idx, {
            kind: 'transcript',
            backend: 'meeting',
            backendId: meeting.id,
            id: meeting.id,
            date: rawDate ? String(rawDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
            label: meeting.session_label || meeting.title || `Session ${idx + 1}`,
            content: meeting.transcript || '',
          });
        });
      const sourceRows = (sourcesRes?.sources || []).map((source, idx) => createConversationRow(meetingRows.length + idx, {
        kind: source.kind || 'email',
        backend: 'source',
        backendId: source.id,
        id: source.id,
        date: (source.created_at || '').slice(0, 10),
        label: source.label || '',
        content: source.content || '',
      }));
      const merged = [...meetingRows, ...sourceRows].sort((a, b) => String(a.date).localeCompare(String(b.date)));
      setRows(merged.length ? merged : [createConversationRow(0)]);
      setDirty(false);
      if (typeof onChanged === 'function') onChanged({ count: merged.length });
    } catch (e) {
      // Non-fatal: show an empty editor rather than blocking the page.
      setRows([createConversationRow(0)]);
    } finally {
      setLoading(false);
    }
  }, [businessCaseId, onChanged]);

  useEffect(() => { reload(); }, [reload]);

  const updateRow = (rowId, patch) => {
    setRows((current) => current.map((row) => (
      row.id === rowId ? { ...row, ...patch, dirty: true } : row
    )));
    setDirty(true);
    if (typeof onContentChange === 'function') onContentChange(true);
  };

  const addRow = () => {
    const next = createConversationRow(rows.length);
    setLastAddedId(next.id);
    setRows((current) => [...current, next]);
    setSaveNotice('New conversation added below — click "Save all" to keep it.');
  };

  // After a row is added, scroll it into view and focus its textarea. Mirrors
  // the behaviour of the old TranscriptUploadPanel.
  useEffect(() => {
    if (!lastAddedId || !lastAddedIdRef.current) return;
    lastAddedIdRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const textarea = lastAddedIdRef.current.querySelector('textarea');
    if (textarea) textarea.focus({ preventScroll: true });
  }, [lastAddedId]);

  const removeRow = async (rowId) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;
    // If it was already persisted, delete from the right backend so the
    // removal sticks across logout/login.
    if (row.backendId && row.backend) {
      try {
        if (row.backend === 'source') {
          await v3DeleteConnectSource(businessCaseId, row.backendId);
        } else if (row.backend === 'meeting') {
          await v3DeleteBusinessCall(row.backendId, { reason: 'Removed from Connect conversations panel' });
        }
      } catch (e) {
        toast.error('Could not remove that conversation from the server.');
        return;
      }
    }
    setRows((current) => {
      const next = current.filter((r) => r.id !== rowId);
      return next.length ? next : [createConversationRow(0)];
    });
    setSaveNotice(row.backendId ? 'Conversation removed.' : '');
    if (typeof onChanged === 'function') onChanged({ count: rows.length - 1 });
  };

  const readFile = async (rowId, file) => {
    if (!file) return;
    try {
      const text = await file.text();
      updateRow(rowId, { content: text, label: rows.find((r) => r.id === rowId)?.label || file.name });
      toast.success(`Loaded ${file.name}.`);
    } catch (e) {
      toast.error('Could not read that file. Paste the text instead.');
    }
  };

  const saveAll = async () => {
    const withContent = rows.filter(conversationHasContent);
    if (!withContent.length) {
      toast.error('Add at least one conversation before saving.');
      return;
    }
    setSaving(true);
    setSaveNotice('Saving all conversations…');
    // Split by kind: call transcripts go through the meeting pipeline (so they
    // keep appearing in meeting lists), email/whatsapp go to connect sources.
    const meetingRows = withContent.filter((r) => r.kind === 'transcript');
    const sourceRows = withContent.filter((r) => r.kind !== 'transcript');
    let savedCount = 0;
    const failures = [];

    if (meetingRows.length) {
      try {
        const sessions = meetingRows.map((r) => ({
          id: r.backend === 'meeting' ? r.backendId : undefined,
          meetingId: r.backend === 'meeting' ? r.backendId : '',
          date: r.date,
          session: r.label || `Session ${rows.indexOf(r) + 1}`,
          content: r.content,
        }));
        const savedSessions = await saveConnectTranscriptSessions({
          sessions,
          businessCaseId,
          bc,
          brand,
          contactName,
          contactEmail,
          sourceLabel: 'Connect transcript upload',
        });
        savedCount += savedSessions.length;
        if (savedSessions.partialFailure) failures.push(savedSessions.partialFailure);
      } catch (e) {
        failures.push(`Call transcripts: ${e?.message || 'save failed'}`);
      }
    }

    for (const row of sourceRows) {
      try {
        // connect sources have no "update" — re-save as a new entry only if
        // the row is new or has been edited since it was loaded.
        if (!row.backendId || row.dirty) {
          await v3AddConnectSource(businessCaseId, {
            kind: row.kind,
            label: row.label.trim() || kindMeta(row.kind).label,
            content: row.content,
            author: 'admin',
          });
          savedCount += 1;
        } else {
          savedCount += 1; // already-persisted, untouched
        }
      } catch (e) {
        failures.push(`${kindMeta(row.kind).label}: ${e?.response?.data?.detail || e?.message || 'save failed'}`);
      }
    }

    setSaving(false);
    if (failures.length) {
      setSaveNotice(`Saved ${savedCount} conversation(s). Some failed: ${failures.join('; ')}`);
      toast.error('Some conversations could not be saved.');
    } else {
      setSaveNotice(`All ${savedCount} conversation(s) saved. Safe to leave the page.`);
      toast.success('All conversations saved.');
      setDirty(false);
      if (typeof onContentChange === 'function') onContentChange(false);
    }
    // Re-hydrate so backend ids line up with what's on screen.
    await reload();
    if (typeof onChanged === 'function') onChanged({ count: rows.length });
  };

  const totalSaved = rows.filter((r) => r.backendId).length;
  const totalWithContent = rows.filter(conversationHasContent).length;

  return (
    <div className="v3-card p-5" data-testid="conversations-panel">
      <div className="mb-3 flex flex-col gap-1">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Conversations &amp; transcripts</h2>
        <p className="text-[12px] text-[#6E6657] max-w-3xl">
          Add every conversation you have with this brand — a call transcript today, the WhatsApp thread next week,
          the email chain after that. Pick a type, paste or upload the content, then <strong>Save all</strong>.
          Everything you save here stays put across logout and login, and is read by the AI when you analyze.
        </p>
      </div>

      {saveNotice && (
        <div className="rounded-lg border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2 mb-3 text-[12px] text-[#7A5A1E]" data-testid="conversations-save-notice">
          {saveNotice}
        </div>
      )}

      {loading ? (
        <p className="text-[12px] text-[#8A8A8A] flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading saved conversations…</p>
      ) : (
        <div className="space-y-3" data-testid="conversations-list">
          {rows.map((row, index) => {
            const Icon = kindMeta(row.kind).icon;
            return (
              <div
                key={row.id}
                ref={row.id === lastAddedId ? lastAddedIdRef : null}
                className={`rounded-lg border bg-white p-4 transition-colors ${row.dirty ? 'border-[#E5C99A]' : 'border-[#E8E4DB]'}`}
                data-testid={`conversation-row-${row.id}`}
              >
                <div className="grid gap-3 border-b border-[#F1ECDF] pb-3 lg:grid-cols-[minmax(200px,1fr)_minmax(180px,0.8fr)_minmax(140px,0.5fr)_36px] lg:items-end">
                  {/* Type picker */}
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Type</span>
                    <div className="mt-1 flex flex-wrap gap-1.5" data-testid={`conversation-kind-${row.id}`}>
                      {SOURCE_KINDS.map((option) => {
                        const OptionIcon = option.icon;
                        const active = row.kind === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateRow(row.id, { kind: option.value })}
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-colors ${active ? 'border-[#1F4A3A] bg-[#EAF4EE] text-[#1F4A3A] font-semibold' : 'border-[#E8E4DB] bg-white text-[#6E6657] hover:border-[#D4CDBF]'}`}
                          >
                            <OptionIcon className="w-3 h-3" /> {option.label.split(' ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </label>
                  {/* Date */}
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Date</span>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateRow(row.id, { date: e.target.value })}
                      className="mt-1 w-full rounded-md border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#1F4A3A]"
                      data-testid={`conversation-date-${row.id}`}
                    />
                  </label>
                  {/* Session index / saved badge */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">#{index + 1}</span>
                    <p className="mt-1 text-[11px] text-[#8A8A8A]">
                      {row.backendId ? (
                        <span className="inline-flex items-center gap-1 text-[#1F4A3A]"><Check className="w-3 h-3" /> saved</span>
                      ) : conversationHasContent(row) ? (
                        <span className="text-[#7A5A1E]">unsaved</span>
                      ) : (
                        'empty'
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    className="justify-self-end rounded-md p-2 text-[#B54A37] hover:bg-[#FBF1EE]"
                    aria-label="Remove conversation"
                    data-testid={`conversation-remove-${row.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Label */}
                <label className="block mt-3">
                  <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Label</span>
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => updateRow(row.id, { label: e.target.value })}
                    placeholder={`Label (optional) — e.g. "${row.kind === 'whatsapp' ? 'Chat with Funke' : row.kind === 'email' ? 'Budget thread' : 'Discovery call'}"`}
                    className="mt-1 w-full rounded-md border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#1F4A3A]"
                    data-testid={`conversation-label-${row.id}`}
                  />
                </label>

                {/* Content */}
                <div className="mt-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A] flex items-center gap-1.5">
                      <Icon className="w-3 h-3" /> {kindMeta(row.kind).label} content
                    </span>
                    <label className="v3-btn-secondary cursor-pointer text-[11px] inline-flex items-center gap-1">
                      <Upload className="w-3 h-3" /> Upload file
                      <input
                        type="file"
                        accept=".txt,.md,.csv,.log,.json"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) readFile(row.id, file);
                          event.target.value = '';
                        }}
                        data-testid={`conversation-upload-${row.id}`}
                      />
                    </label>
                  </div>
                  <textarea
                    value={row.content}
                    onChange={(e) => updateRow(row.id, { content: e.target.value })}
                    rows={6}
                    placeholder={kindMeta(row.kind).hint}
                    className="w-full rounded-md border border-[#E8E4DB] bg-[#FBFAF7] px-3 py-2 text-[13px] leading-6 outline-none focus:border-[#1F4A3A] focus:bg-white"
                    data-testid={`conversation-content-${row.id}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-[#E8E4DB] pt-4">
        <div className="text-[11px] text-[#8A8A8A]">
          {totalSaved} saved · {totalWithContent} with content{dirty ? ' · unsaved changes' : ''}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={addRow}
            className="v3-btn-secondary text-[12px] inline-flex items-center gap-1.5"
            data-testid="conversation-add-btn"
          >
            <Plus className="w-3.5 h-3.5" /> Add another conversation
          </button>
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || !totalWithContent}
            className="v3-btn-primary text-[12px] inline-flex items-center gap-1.5 disabled:opacity-50"
            data-testid="conversation-save-all-btn"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? 'Saving…' : 'Save all conversations'}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * V1 "Connect Schedule & Transcripts" page. Single input panel, single
 * analyze button. Replaces the old alias of V3BusinessCaseConnectSchedule.
 *
 * Flow: save conversations -> ONE "Analyze conversations" button -> runs
 * detect-opportunities (background job, polled with a progress popup) ->
 * on success navigates to the dedicated opportunities page.
 */
export const V1BusinessCaseConnectSchedulePage = () => {
  const navigate = useNavigate();
  const { id, bundle, reload } = useBusinessCaseBundle();
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisPopup, setAnalysisPopup] = useState({ open: false, progress: 0, message: '', status: 'running' });
  const [hasContent, setHasContent] = useState(false);
  const [conversationCount, setConversationCount] = useState(0);
  const inFlightRef = useRef(false);

  const go = (path) => navigate(adminRoute(path));

  const runAnalyze = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setAnalyzing(true);
    setAnalysisPopup({ open: true, progress: 5, message: 'Reading every saved conversation…', status: 'running', error: undefined });
    try {
      // The ConversationsPanel saves on its own button; detection reads from
      // the same backend collections, so we just kick off the analysis.
      const data = await v3DetectOpportunities(id, (job) => {
        const progress = Math.max(0, Math.min(95, job?.progress || 0));
        setAnalysisPopup((prev) => prev.open ? { ...prev, progress: Math.max(prev.progress, progress), message: job?.message || prev.message } : prev);
      });
      const count = (data?.opportunities || []).length;
      setAnalysisPopup((prev) => ({ ...prev, open: true, progress: 100, status: 'complete', message: count ? `Found ${count} opportunities. Opening review…` : 'Analysis complete. Opening review…' }));
      await reload();
      // Short pause so the user sees the success state before navigating.
      setTimeout(() => {
        go(`/business-cases/${id}/connect/opportunities`);
      }, 700);
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || 'The AI could not analyze the conversations.';
      setAnalysisPopup((prev) => ({ ...prev, open: true, status: 'failed', error: msg, message: 'Analysis failed. You can retry from this page.' }));
    } finally {
      setAnalyzing(false);
      inFlightRef.current = false;
    }
  };

  return (
    <FlowShell
      title="Connect Schedule & Transcripts"
      subtitle="Add every Connect call transcript, email thread and WhatsApp chat with the brand, then run one analysis to find the campaign found in them."
    >
      <ConversationsPanel
        businessCaseId={id}
        bundle={bundle}
        onChanged={({ count }) => setConversationCount(count)}
        onContentChange={setHasContent}
      />

      <div className="v3-card p-5 mt-5" data-testid="connect-analyze-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-[#1A1A1A]">Analyze conversations</h2>
            <p className="text-[12px] text-[#6E6657] mt-1 max-w-2xl">
              One click reads every saved transcript, email and WhatsApp chat, then splits them into separate
              campaigns. After that you can merge any that are really the same job and move them into Alignment
              Snapshots for the brand to rank.
            </p>
            <p className="text-[11px] text-[#8A8A8A] mt-1">
              {conversationCount > 0
                ? `${conversationCount} conversation(s) on file.`
                : hasContent
                  ? 'Save your conversations first so they are included in the analysis.'
                  : 'Add and save at least one conversation above before analyzing.'}
            </p>
          </div>
          <button
            type="button"
            onClick={runAnalyze}
            disabled={analyzing}
            className="v3-btn-primary inline-flex items-center gap-1.5 whitespace-nowrap"
            data-testid="connect-analyze-btn"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {analyzing ? 'Analyzing…' : 'Analyze conversations'}
          </button>
        </div>
      </div>

      {analysisPopup.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" data-testid="connect-analysis-popup">
          <div className="w-full max-w-md rounded-[10px] border border-[#D7CBB8] bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${analysisPopup.status === 'complete' ? 'bg-[#E8F3ED] text-[#1F4A3A]' : analysisPopup.status === 'failed' ? 'bg-[#FBEAE5] text-[#B54A37]' : 'bg-[#EFF5F1] text-[#1F4A3A]'}`}>
                {analysisPopup.status === 'complete' ? <CheckCircle2 className="h-4 w-4" /> : analysisPopup.status === 'failed' ? <X className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
              </span>
              <h3 className="text-[15px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                {analysisPopup.status === 'complete' ? 'Analysis complete' : analysisPopup.status === 'failed' ? 'Analysis failed' : 'Analyzing conversations'}
              </h3>
              <span className="ml-auto text-[12px] font-semibold text-[#4F3E2F]" data-testid="connect-analysis-popup-percent">
                {analysisPopup.progress}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[#F4F2EC] overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-300 ease-out ${analysisPopup.status === 'failed' ? 'bg-[#B54A37]' : 'bg-[#1F4A3A]'}`}
                style={{ width: `${Math.max(2, analysisPopup.progress)}%` }}
                data-testid="connect-analysis-popup-bar"
              />
            </div>
            <p className="text-[13px] leading-6 text-[#4F3E2F]" data-testid="connect-analysis-popup-message">
              {analysisPopup.message || (analysisPopup.status === 'running' ? 'Working on it…' : '')}
            </p>
            {analysisPopup.status === 'running' && (
              <p className="mt-1 text-[11px] text-[#6E6657]">Please keep this page open while TASCK runs the analysis.</p>
            )}
            {analysisPopup.status === 'failed' && (
              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => setAnalysisPopup((prev) => ({ ...prev, open: false }))} className="v3-btn-primary" data-testid="connect-analysis-popup-close">
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </FlowShell>
  );
};

/**
 * Dedicated opportunities review page. Hosts the existing OpportunitiesPanel
 * (which already handles detect / merge / delete / generate) inside a FlowShell
 * with a clear "what happens next" explainer.
 *
 * Flow: review detected opportunities -> merge duplicates -> generate Alignment
 * Snapshots (auto-advances to Frame) -> admin sends each to brand -> brand
 * ranks priority in their portal.
 */
export const V1BusinessCaseOpportunities = () => {
  const navigate = useNavigate();
  const { id } = useBusinessCaseBundle();

  return (
    <FlowShell
      title="Campaign & Alignment snapshot"
      subtitle="The AI split every saved conversation into separate campaigns. Merge any that are of the same campaign, then move them into Alignment Snapshots the brand can rank by priority."
    >
      <div className="v3-card p-5 mb-5" data-testid="opportunities-flow-guide">
        <ol className="space-y-2 text-[12px] text-[#4F3E2F]">
          <li className="flex items-start gap-2"><span className="font-semibold text-[#1F4A3A]">1.</span> Review the campaigns the AI found below.</li>
          <li className="flex items-start gap-2"><span className="font-semibold text-[#1F4A3A]">2.</span> Tick two or more and <strong>merge</strong> when they are really the same campaign.</li>
          <li className="flex items-start gap-2"><span className="font-semibold text-[#1F4A3A]">3.</span> <strong>Generate Alignment Snapshots</strong> — one per surviving campaign — which moves the case into Frame.</li>
          <li className="flex items-start gap-2"><span className="font-semibold text-[#1F4A3A]">4.</span> On the Frame page, open each snapshot and <strong>send it to the brand</strong>. The brand ranks them by priority in their portal.</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate(adminRoute(`/business-cases/${id}/connect/schedule`))} className="v3-btn-secondary text-[11px] inline-flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Add more conversations
          </button>
        </div>
      </div>

      <OpportunitiesPanel
        businessCaseId={id}
        onGenerated={() => navigate(adminRoute(`/business-cases/${id}/frame/snapshot`))}
      />
    </FlowShell>
  );
};
