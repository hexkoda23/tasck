// Import Existing Project — for projects built outside the system that have
// already passed the alignment stage. Creates a Business Case in the Plan
// stage (alignment bypassed) and lands the admin on the Creator Selector.
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FileUp, FolderInput, Loader2, Sparkles, X } from 'lucide-react';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { v3GetBrands, v3ImportExistingProject, v3ExtractImportProjectDoc } from '../../lib/v3api';

const CURRENCY_OPTIONS = [
  { code: 'NGN', label: 'NGN — Nigerian Naira' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GHS', label: 'GHS — Ghanaian Cedi' },
  { code: 'KES', label: 'KES — Kenyan Shilling' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
];

const EMPTY_FORM = {
  brand_id: '',
  new_brand_name: '',
  title: '',
  description: '',
  estimated_value: '',
  currency: '',
  engagement_track: 'paid',
  objectives: '',
  target_audience: '',
  channels: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_role: '',
  send_welcome_email: true,
};

const fieldClass = 'w-full rounded-lg border border-[#E8E4DB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] focus:outline-none focus:border-[#1F4A3A]';
const labelClass = 'block text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-1.5';

export default function V1ImportExistingProject() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [brands, setBrands] = useState([]);
  const [brandMode, setBrandMode] = useState('existing');
  const [currencyMode, setCurrencyMode] = useState('preset');
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    v3GetBrands().then((rows) => setBrands(Array.isArray(rows) ? rows : [])).catch(() => setBrands([]));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // When admin picks an existing brand, pre-fill any missing contact fields
  // from that brand's CRM record so the welcome email + snapshot recipient
  // resolve without extra typing. Admin can still edit them before importing.
  const onSelectExistingBrand = (e) => {
    const brandId = e.target.value;
    const match = brands.find((b) => b.id === brandId);
    setForm((f) => ({
      ...f,
      brand_id: brandId,
      contact_name: f.contact_name || match?.primary_contact || match?.contact_name || '',
      contact_email: f.contact_email || match?.email || '',
      contact_phone: f.contact_phone || match?.phone || '',
      contact_role: f.contact_role || match?.role || '',
    }));
  };

  const applyExtracted = (fields) => {
    const extractedCurrency = (fields.currency || '').toUpperCase().trim();
    if (extractedCurrency && !CURRENCY_OPTIONS.some((c) => c.code === extractedCurrency)) {
      setCurrencyMode('other');
    }
    setForm((f) => ({
      ...f,
      title: fields.project_title || f.title,
      description: fields.description || f.description,
      estimated_value: fields.budget_amount ? String(fields.budget_amount) : f.estimated_value,
      currency: extractedCurrency || f.currency,
      engagement_track: fields.engagement_track || f.engagement_track,
      objectives: fields.objectives || f.objectives,
      target_audience: fields.target_audience || f.target_audience,
      channels: (fields.channels || []).length ? fields.channels.join(', ') : f.channels,
    }));
    const brandName = (fields.brand_name || '').trim();
    if (brandName) {
      const match = brands.find((b) => (b.company || b.name || '').toLowerCase() === brandName.toLowerCase());
      if (match) {
        setBrandMode('existing');
        setForm((f) => ({ ...f, brand_id: match.id }));
      } else {
        setBrandMode('new');
        setForm((f) => ({ ...f, new_brand_name: brandName }));
      }
    }
  };

  const runExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setExtractNote('');
    setError('');
    try {
      const data = await v3ExtractImportProjectDoc(file);
      applyExtracted(data?.fields || {});
      if (data?.analysis_source && data.analysis_source !== 'none') {
        setExtractNote('Details extracted — review the pre-filled form below and adjust anything before importing.');
      } else {
        setExtractNote('The document was read, but AI extraction was unavailable. Fill in the form manually.');
      }
    } catch (e) {
      setExtractNote('');
      setError(e?.response?.data?.detail || e?.message || 'Could not extract details from this document.');
    } finally {
      setExtracting(false);
    }
  };

  const canSubmit = Boolean(
    form.title.trim()
    && (brandMode === 'existing' ? form.brand_id : form.new_brand_name.trim())
    && form.contact_name.trim()
    && form.contact_email.trim()
    && form.contact_role.trim()
    && !busy,
  );

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      const contactEmail = form.contact_email.trim();
      const wantsWelcome = form.send_welcome_email && Boolean(contactEmail);
      const payload = {
        brand_id: brandMode === 'existing' ? form.brand_id : null,
        new_brand_name: brandMode === 'new' ? form.new_brand_name.trim() : null,
        title: form.title.trim(),
        description: form.description.trim(),
        engagement_track: form.engagement_track,
        estimated_value: Number(form.estimated_value) || 0,
        currency: form.currency.trim() || null,
        objectives: form.objectives.trim(),
        target_audience: form.target_audience.trim(),
        channels: form.channels.split(',').map((c) => c.trim()).filter(Boolean),
        source_document_name: file?.name || null,
        contact_name: form.contact_name.trim() || null,
        contact_email: contactEmail || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_role: form.contact_role.trim() || null,
        send_welcome_email: wantsWelcome,
      };
      const res = await v3ImportExistingProject(payload);
      const welcome = res?.welcome_email;
      if (welcome?.sent) {
        toast.success('Project imported & welcome email sent', {
          description: `Login link + temporary password emailed to ${welcome.recipient}.`,
        });
      } else if (form.send_welcome_email && !contactEmail) {
        toast.success('Project imported', {
          description: 'Add a contact email later, then use CRM → Resend credentials to email the brand.',
        });
      } else {
        toast.success('Project imported', { description: 'Alignment stage bypassed — opening the Creator Selector.' });
      }
      navigate(adminRoute(`/business-cases/${res.business_case_id}/frame/creator-scan`));
    } catch (e) {
      setError(e?.response?.data?.detail || e?.message || 'Import failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <div className="v3-stage-shell space-y-5" data-testid="import-project-page">
      <div>
        <div className="flex items-center gap-2">
          <FolderInput className="w-5 h-5 text-[#1F4A3A]" strokeWidth={1.5} />
          <h1 className="text-[20px] font-semibold text-[#1A1A1A]">Import Existing Project</h1>
        </div>
        <p className="text-[13px] text-[#8A8A8A] mt-1 max-w-2xl">
          For projects built outside the system that already passed the alignment stage.
          Importing bypasses the Connect schedule, transcripts, and Alignment Snapshot entirely —
          you land straight on the Creator Selector.
        </p>
      </div>

      {/* Upload + AI extract */}
      <div className="v3-card p-5" data-testid="import-upload-card">
        <p className="text-[13px] font-semibold text-[#1A1A1A]">1. Upload the project document <span className="font-normal text-[#8A8A8A]">(optional)</span></p>
        <p className="text-[12px] text-[#8A8A8A] mt-0.5 mb-3">PDF, DOCX, or TXT — AI extracts the details and pre-fills the form below.</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          data-testid="import-file-input"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setExtractNote(''); }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="v3-btn-secondary text-[12px]" data-testid="import-choose-file-btn">
            <FileUp className="w-3.5 h-3.5" /> {file ? 'Change file' : 'Choose file'}
          </button>
          {file && (
            <span className="flex items-center gap-2 text-[12px] text-[#1A1A1A] bg-[#F4F2EC] rounded-lg px-3 py-1.5" data-testid="import-file-name">
              {file.name}
              <button type="button" onClick={() => { setFile(null); setExtractNote(''); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-[#8A8A8A] hover:text-[#B54A37]" data-testid="import-file-clear">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {file && (
            <button type="button" onClick={runExtract} disabled={extracting} className="v3-btn-primary text-[12px]" data-testid="import-extract-btn">
              {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {extracting ? 'Extracting…' : 'Extract details with AI'}
            </button>
          )}
        </div>
        {extractNote && <p className="text-[12px] text-[#1F4A3A] mt-3" data-testid="import-extract-note">{extractNote}</p>}
      </div>

      {/* Form */}
      <div className="v3-card p-5 space-y-4" data-testid="import-form-card">
        <p className="text-[13px] font-semibold text-[#1A1A1A]">2. Project details</p>

        <div>
          <label className={labelClass}>Brand</label>
          <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg w-fit mb-2">
            {[['existing', 'Existing CRM brand'], ['new', 'New brand']].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setBrandMode(key)}
                className={`text-[11px] px-3 py-1 rounded transition-colors ${brandMode === key ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
                data-testid={`import-brand-mode-${key}`}
              >
                {label}
              </button>
            ))}
          </div>
          {brandMode === 'existing' ? (
            <select value={form.brand_id} onChange={onSelectExistingBrand} className={fieldClass} data-testid="import-brand-select">
              <option value="">Select a brand…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.company || b.name}</option>
              ))}
            </select>
          ) : (
            <input value={form.new_brand_name} onChange={set('new_brand_name')} placeholder="e.g. Zenith Foods" className={fieldClass} data-testid="import-new-brand-input" />
          )}
        </div>

        <div>
          <label className={labelClass}>Project title *</label>
          <input value={form.title} onChange={set('title')} placeholder="e.g. Q3 Creator Amplification Campaign" className={fieldClass} data-testid="import-title-input" />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <textarea value={form.description} onChange={set('description')} rows={3} placeholder="What this project is about…" className={fieldClass} data-testid="import-description-input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Budget</label>
            <input type="number" min="0" value={form.estimated_value} onChange={set('estimated_value')} placeholder="0" className={fieldClass} data-testid="import-budget-input" />
          </div>
          <div>
            <label className={labelClass}>Currency</label>
            {currencyMode === 'preset' ? (
              <select
                value={form.currency}
                onChange={(e) => {
                  if (e.target.value === '__other__') {
                    setCurrencyMode('other');
                    setForm((f) => ({ ...f, currency: '' }));
                  } else {
                    setForm((f) => ({ ...f, currency: e.target.value }));
                  }
                }}
                className={fieldClass}
                data-testid="import-currency-select"
              >
                <option value="">Select currency…</option>
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
                <option value="__other__">Other (type manually)</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <input
                  value={form.currency}
                  onChange={set('currency')}
                  placeholder="e.g. XOF, INR"
                  maxLength={6}
                  className={fieldClass}
                  data-testid="import-currency-input"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setCurrencyMode('preset'); setForm((f) => ({ ...f, currency: '' })); }}
                  className="v3-btn-secondary text-[11px] whitespace-nowrap"
                  data-testid="import-currency-back-btn"
                >
                  Back to list
                </button>
              </div>
            )}
          </div>
          <div>
            <label className={labelClass}>Engagement track</label>
            <select value={form.engagement_track} onChange={set('engagement_track')} className={fieldClass} data-testid="import-track-select">
              <option value="paid">Paid Strategy</option>
              <option value="grant">Grant</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Objectives</label>
          <textarea value={form.objectives} onChange={set('objectives')} rows={2} placeholder="Key marketing objectives — helps the AI creator scan." className={fieldClass} data-testid="import-objectives-input" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Target audience</label>
            <input value={form.target_audience} onChange={set('target_audience')} placeholder="e.g. Gen Z urban Nigeria" className={fieldClass} data-testid="import-audience-input" />
          </div>
          <div>
            <label className={labelClass}>Channels <span className="normal-case">(comma-separated)</span></label>
            <input value={form.channels} onChange={set('channels')} placeholder="Instagram, TikTok, OOH" className={fieldClass} data-testid="import-channels-input" />
          </div>
        </div>

        {/* Brand contact — REQUIRED so we can send login + future docs to
            the right person. Only phone is optional. */}
        <div className="pt-2 border-t border-[#F1ECDF]">
          <p className="text-[13px] font-semibold text-[#1A1A1A]">3. Brand contact <span className="text-[#B54A37]">*</span> <span className="font-normal text-[#8A8A8A]">(so we can email them the login + future documents)</span></p>
          <p className="text-[12px] text-[#8A8A8A] mt-0.5 mb-3">
            The email here receives the welcome message with sign-in details and any future documents TASCK sends for this project. Phone is optional.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact name *</label>
              <input value={form.contact_name} onChange={set('contact_name')} placeholder="e.g. Amaka Okafor" className={fieldClass} data-testid="import-contact-name-input" />
            </div>
            <div>
              <label className={labelClass}>Contact email *</label>
              <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder="amaka@brand.com" className={fieldClass} data-testid="import-contact-email-input" />
            </div>
            <div>
              <label className={labelClass}>Role / title *</label>
              <input value={form.contact_role} onChange={set('contact_role')} placeholder="Head of Marketing" className={fieldClass} data-testid="import-contact-role-input" />
            </div>
            <div>
              <label className={labelClass}>Phone <span className="normal-case">(optional)</span></label>
              <input value={form.contact_phone} onChange={set('contact_phone')} placeholder="+234…" className={fieldClass} data-testid="import-contact-phone-input" />
            </div>
          </div>

          <label className="mt-4 flex items-start gap-2 text-[12px] text-[#1A1A1A] cursor-pointer" data-testid="import-welcome-checkbox-label">
            <input
              type="checkbox"
              checked={form.send_welcome_email}
              onChange={(e) => setForm((f) => ({ ...f, send_welcome_email: e.target.checked }))}
              className="mt-0.5 accent-[#1F4A3A]"
              data-testid="import-welcome-checkbox"
            />
            <span>
              <span className="font-semibold">Send welcome email with login credentials now</span>
              <span className="block text-[11px] text-[#8A8A8A] mt-0.5">
                Emails the contact above a sign-in link and a temporary password. Uncheck if you&apos;ll share credentials manually later
                (you can always trigger it from CRM &rarr; Resend credentials). Requires a contact email.
              </span>
            </span>
          </label>
        </div>

        {error && <p className="text-[12px] text-[#B54A37]" data-testid="import-error">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button type="button" onClick={submit} disabled={!canSubmit} className="v3-btn-primary disabled:opacity-50" data-testid="import-submit-btn">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderInput className="w-3.5 h-3.5" />}
            {busy ? 'Importing…' : 'Import & open Creator Selector'}
          </button>
          <p className="text-[11px] text-[#8A8A8A]">
            Creates the project in the Plan stage with an &ldquo;Imported&rdquo; tag.
            {form.send_welcome_email && form.contact_email.trim() ? ' Welcome email queues on import.' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
