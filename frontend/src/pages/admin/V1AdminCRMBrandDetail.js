import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  User,
  Send,
  Trash2,
  Loader2,
  Sparkles,
  Edit2,
  Check,
  ChevronDown,
  PackageCheck,
} from 'lucide-react';
import {
  v3GetBrand,
  v3MoveBrandToBusinessCall,
  v3MoveBrandToFrame,
  v3ContinueBusinessCase,
  v3DeleteBrand,
  v3UpdateBrandDetails,
  v3ScrapeBrandDetails,
} from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { businessCasePhasePath } from './V1BusinessCaseFlowPages';
import { BrandLogo as SharedBrandLogo } from '../../lib/brandLogo';
import { toast } from 'sonner';

const EMPTY_VALUE = 'Not captured yet';

const BRAND_DETAIL_FIELDS = [
  ['Brand name', ['company', 'name', 'brand_name']],
  ['Category / industry', ['industry', 'category', 'sector']],
  ['Website', ['website', 'url', 'brand_url']],
  ['About the brand', ['about', 'brand_about', 'description', 'company_description']],
  ['Primary contact', ['primary_contact', 'primaryContact', 'contact_name']],
  ['Contact title', ['role', 'contact_title', 'title']],
  ['Contact email', ['email', 'contact_email']],
  ['Contact phone', ['phone', 'contact_phone']],
  ['Location / HQ', ['hq', 'location', 'address']],
  ['Marketing budget', ['marketing_budget', 'budget', 'budget_range']],
  ['CRM status', ['status']],
  ['Source', ['source', 'lead_source', 'scrape_source']],
  ['Last interaction', ['last_interaction', 'lastInteraction']],
  ['Created', ['created_at', 'createdAt']],
  ['Updated', ['updated_at', 'updatedAt']],
  ['CRM accepted at', ['crm_accepted_at']],
];

const SCALAR_FIELD_LIMIT = 240;

const cleanV1Text = (value) => {
  if (value === undefined || value === null) return value;
  return String(value)
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u0153/g, '-')
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00e2\u20ac\u009d/g, '-')
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a6/g, '...')
    .replace(/\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2/g, '-')
    .replace(/\u00e2\u20ac\u201d/g, '-')
    .replace(/\u00e2\u20ac\u201c/g, '-')
    .replace(/\u00e2\u20ac\u00a6/g, '...')
    .replace(/\u00e2\u20ac\u00a2/g, '-')
    .replace(/\u00e2\u201a\u00a6/g, '\u20a6')
    .replace(/\u00c3\u2014/g, 'x')
    .replace(/\u00c2\u00b7/g, ' - ')
    .replace(/\u00c2\s*-\s*/g, ' - ')
    .replace(/\u00f0\u0178[\u0080-\u00bf]{1,3}/g, '')
    .replace(/\u00ef\u00bf\u00bd/g, '')
    .replace(new RegExp(['awer', 'ness'].join(''), 'gi'), 'awareness')
    .replace(/\s{2,}/g, ' ')
    .trim();
};
const firstValue = (record, keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const formatDateTime = (val) => {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
      }
    } catch (e) {}
  }
  return cleanV1Text(val);
};

const textValue = (value) => {
  if (value === undefined || value === null || value === '') return EMPTY_VALUE;
  if (Array.isArray(value)) return value.map(textValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return cleanV1Text(value);
};

const statusLabel = (value, fallback = EMPTY_VALUE) => {
  if (value === undefined || value === null || value === '') return fallback;
  return cleanV1Text(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b(crm|ai|kpi|cta|rm)\b/gi, (match) => match.toUpperCase())
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const shortText = (value) => {
  const text = textValue(value);
  if (text === EMPTY_VALUE || text.length <= SCALAR_FIELD_LIMIT) return text;
  return `${cleanV1Text(text).slice(0, SCALAR_FIELD_LIMIT)}...`;
};



const logoUrlForBrand = (brand) => {
  const direct = firstValue(brand, ['logo_url', 'brand_logo_url', 'logoUrl', 'brandLogoUrl', 'logo']);
  return direct || '';
};
const brandName = (brand) => cleanV1Text(firstValue(brand, ['company', 'name', 'brand_name']) || 'Brand');
const brandIndustry = (brand) => cleanV1Text(firstValue(brand, ['industry', 'category', 'sector']) || 'Uncategorised');

const domainFromWebsite = (website = '') => {
  const raw = String(website || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw.startsWith('http') ? raw : 'https://' + raw).hostname.replace(/^www\./, '');
  } catch (_) {
    return raw.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
};

const logoCandidatesForBrand = (brand) => {
  const direct = logoUrlForBrand(brand);
  const domain = domainFromWebsite(firstValue(brand, ['website', 'url', 'brand_url', 'source_url']));
  return [
    direct,
    domain ? 'https://' + domain + '/favicon.png' : '',
    domain ? 'https://' + domain + '/favicon.ico' : '',
    domain ? 'https://' + domain + '/logo.svg' : '',
    domain ? 'https://' + domain + '/logo.png' : '',
    domain ? 'https://' + domain + '/assets/logo.svg' : '',
    domain ? 'https://' + domain + '/assets/logo.png' : '',
    domain ? 'https://www.google.com/s2/favicons?sz=256&domain=' + domain : '',
    domain ? 'https://icons.duckduckgo.com/ip3/' + domain + '.ico' : '',
  ]
    .filter(Boolean)
    .filter((value) => !/(vite\.svg|react\.svg|placeholder|blank|sprite)/i.test(value))
    .filter((value, index, array) => array.indexOf(value) === index);
};

const BrandLogo = ({ brand }) => (
  <SharedBrandLogo
    name={brandName(brand)}
    candidates={logoCandidatesForBrand(brand)}
    containerClassName="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#D7CBB8] bg-white"
    imgClassName="h-full w-full object-contain p-2"
    initialsClassName="text-[18px] font-semibold text-[#1F4A3A]"
  />
);
const InfoCard = ({ title, children, action }) => (
  <div className="v3-card p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#1A1A1A]">{title}</h2>
      {action}
    </div>
    {children}
  </div>
);

const DetailRow = ({ label, value }) => (
  <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3">
    <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{label}</p>
    <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#1A1A1A]">{textValue(value)}</p>
  </div>
);

const SmallRecord = ({ title, subtitle, body, href }) => (
  <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 text-[12px]">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-medium text-[#1A1A1A]">{cleanV1Text(title || 'Untitled')}</p>
        {subtitle && <p className="mt-0.5 text-[#8A8A8A]">{cleanV1Text(subtitle)}</p>}
      </div>
      {href && (
        <a href={href} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-[#1F4A3A] hover:bg-[#E8F3ED]" aria-label="Open source link">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </div>
    {body && <p className="mt-2 whitespace-pre-wrap break-words leading-5 text-[#5C5C5C]">{shortText(body)}</p>}
  </div>
);

const CollapsibleEmailRecord = ({ title, subtitle, body }) => {
  const [open, setOpen] = useState(false);
  const content = textValue(body);

  return (
    <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 text-[12px]" data-testid="brand-email-record">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-start justify-between gap-3 text-left" data-testid="brand-email-toggle">
        <span>
          <span className="block font-medium text-[#1A1A1A]">{cleanV1Text(title || 'Queued email')}</span>
          {subtitle && <span className="mt-0.5 block text-[#8A8A8A]">{cleanV1Text(subtitle)}</span>}
        </span>
        <ChevronDown className={`mt-0.5 h-4 w-4 shrink-0 text-[#8A8A8A] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && content !== EMPTY_VALUE && (
        <p className="mt-3 whitespace-pre-wrap break-words border-t border-[#F1ECDF] pt-3 leading-5 text-[#5C5C5C]">{content}</p>
      )}
    </div>
  );
};
const emailCategory = (email) => {
  const subject = String(email?.subject || '').toLowerCase();
  const kind = String(email?.kind || '').toLowerCase();
  if (subject.includes('alignment snapshot') || kind.includes('alignment')) return 'alignment_snapshot';
  if (subject.includes('strategy snapshot') || kind.includes('strategy') || kind.includes('creative_snapshot')) return 'strategy_snapshot';
  if (subject.includes('creative brief') || kind.includes('creative_brief') || kind.includes('brief')) return 'creative_brief';
  return '';
};

const emailTimestamp = (email) => Date.parse(email?.sent_at || email?.queued_at || email?.created_at || email?.updated_at || '') || 0;

const emailContentKey = (email) => {
  const category = emailCategory(email);
  if (category) return category;
  const subject = String(email?.subject || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const body = String(email?.body || '').replace(/\s+/g, ' ').trim().toLowerCase();
  return `${email?.id || subject}:${body}`;
};

const dedupeEmails = (emails) => {
  const seen = new Map();
  emails.forEach((email) => {
    const key = emailContentKey(email);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, { ...email, duplicate_count: 1 });
      return;
    }
    const keepEmail = emailTimestamp(email) >= emailTimestamp(existing) ? email : existing;
    seen.set(key, { ...keepEmail, duplicate_count: (existing.duplicate_count || 1) + 1 });
  });
  return Array.from(seen.values()).sort((a, b) => emailTimestamp(b) - emailTimestamp(a));
};
const formatDeliverableSchedule = (row) => {
  const scheduled = [row?.delivery_date, row?.delivery_time].filter(Boolean).join(' ') || row?.scheduled_for || '';
  return scheduled || 'Schedule not recorded';
};

const businessCaseActivityTs = (businessCase) => {
  const baseDates = [businessCase?.updated_at, businessCase?.created_at, businessCase?.last_interaction_at];
  const timelineDates = Array.isArray(businessCase?.timeline) ? businessCase.timeline.map((item) => item?.at) : [];
  return Math.max(...[...baseDates, ...timelineDates].map((value) => {
    const parsed = Date.parse(value || '');
    return Number.isNaN(parsed) ? 0 : parsed;
  }), 0);
};

const activeCasesForBrand = (items = []) => [...items]
  .filter((businessCase) => !['closed', 'archived'].includes(String(businessCase?.stage || '').toLowerCase()) && businessCase?.status !== 'deleted')
  .sort((a, b) => businessCaseActivityTs(b) - businessCaseActivityTs(a));


const V1AdminCRMBrandDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState('');
  const [scraping, setScraping] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [aboutDraft, setAboutDraft] = useState('');
  const [editingMarketingBudget, setEditingMarketingBudget] = useState(false);
  const [marketingBudgetDraft, setMarketingBudgetDraft] = useState('');
  const [editingLogo, setEditingLogo] = useState(false);
  const [logoDraft, setLogoDraft] = useState('');
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [websiteDraft, setWebsiteDraft] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [deliverablesOpen, setDeliverablesOpen] = useState(false);
  const [projectChoiceOpen, setProjectChoiceOpen] = useState(false);
  const [projectChoiceDismissed, setProjectChoiceDismissed] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');

  const reloadData = async () => {
    try {
      const data = await v3GetBrand(id);
      setBundle(data);
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || 'Failed to reload brand details.');
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setNotice('');
    try {
      const res = await v3ScrapeBrandDetails(id);
      if (res.ok) {
        const warnings = [
          ...(res.warnings || []),
          ...(res.enrichment_target?.warnings || []),
        ];
        const dedupedWarnings = Array.from(new Set(warnings));
        const sourceType = res.enrichment_target?.source_type || 'website';
        const summaryParts = [];
        if (res.website) summaryParts.push(`source ${res.website}`);
        if (res.logo_url) summaryParts.push('logo found');
        if (Array.isArray(res.supporting_links) && res.supporting_links.length) {
          summaryParts.push(`${res.supporting_links.length} supporting link(s) kept`);
        }
        const summary = summaryParts.length ? ` (${summaryParts.join(' · ')})` : '';
        if (dedupedWarnings.length) {
          toast(`Scrape warning: ${dedupedWarnings[0]}`, { icon: '⚠️', duration: 6000 });
          dedupedWarnings.slice(1, 4).forEach((w) => toast(w, { icon: '⚠️', duration: 6000 }));
        }
        toast.success(`Scraped via ${sourceType}${summary}`);
        await reloadData();
      } else {
        toast.error('Scraping returned no results.');
      }
    } catch (e) {
      toast.error('Scraping failed.');
      await reloadData();
    } finally {
      setScraping(false);
    }
  };

  const handleSaveAbout = async () => {
    try {
      await v3UpdateBrandDetails(id, { about: aboutDraft, brand_about: aboutDraft });
      toast.success('About section updated successfully.');
      setEditingAbout(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to update about section.');
    }
  };

  const handleSaveLogo = async () => {
    try {
      await v3UpdateBrandDetails(id, { logo_url: logoDraft, brand_logo_url: logoDraft });
      toast.success('Logo updated successfully.');
      setEditingLogo(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to update logo.');
    }
  };

  const handleSaveMarketingBudget = async () => {
    try {
      await v3UpdateBrandDetails(id, { marketing_budget: marketingBudgetDraft });
      toast.success('Marketing budget updated successfully.');
      setEditingMarketingBudget(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to update marketing budget.');
    }
  };

  const handleSaveWebsite = async () => {
    try {
      await v3UpdateBrandDetails(id, { website: websiteDraft, source_url: websiteDraft });
      toast.success('Website / source URL updated successfully.');
      setEditingWebsite(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to update website / source URL.');
    }
  };

  const handleSaveNotes = async () => {
    try {
      await v3UpdateBrandDetails(id, { notes: notesDraft });
      toast.success('Notes updated successfully.');
      setEditingNotes(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to update notes.');
    }
  };

  const handleDeleteBrand = async () => {
    setDeleting(true);
    try {
      await v3DeleteBrand(id);
      navigate(adminRoute('/crm-brands'));
    } catch (e) {
      setNotice(e.response?.data?.detail || e.message || 'Failed to delete brand.');
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    v3GetBrand(id)
      .then((data) => {
        if (mounted) setBundle(data);
      })
      .catch((error) => {
        if (mounted) setNotice(error?.response?.data?.detail || error?.message || 'Could not load brand details.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [id]);

  const brand = bundle?.brand || null;
  const contacts = Array.isArray(bundle?.contacts) ? bundle.contacts : [];
  const businessCases = Array.isArray(bundle?.business_cases) ? bundle.business_cases : [];
  const activeBusinessCases = activeCasesForBrand(businessCases);
  const activeBusinessCase = activeBusinessCases[0] || null;
  const interactions = Array.isArray(bundle?.interactions) ? bundle.interactions : [];
  const opportunities = Array.isArray(bundle?.opportunities) ? bundle.opportunities : [];
  const emails = Array.isArray(bundle?.emails) ? bundle.emails : [];
  const visibleEmails = dedupeEmails(emails);
  const deliverables = Array.isArray(bundle?.deliverables) ? bundle.deliverables : [];
  const account = bundle?.account || null;

  useEffect(() => {
    if (!loading && brand?.id && activeBusinessCase?.id && !projectChoiceDismissed) {
      setProjectChoiceOpen(true);
    }
  }, [loading, brand?.id, activeBusinessCase?.id, projectChoiceDismissed]);

  const openProjectDecision = () => {
    if (activeBusinessCase?.id) {
      setProjectChoiceOpen(true);
      return true;
    }
    return false;
  };

  const continueExistingProject = async () => {
    if (!activeBusinessCase?.id) return;
    setMoving(true);
    setProjectChoiceOpen(false);
    setProjectChoiceDismissed(true);
    try {
      const result = await v3ContinueBusinessCase(activeBusinessCase.id);
      const continued = result.business_case || activeBusinessCase;
      navigate(businessCasePhasePath(activeBusinessCase.id, continued));
    } catch (error) {
      navigate(businessCasePhasePath(activeBusinessCase.id, activeBusinessCase));
    } finally {
      setMoving(false);
    }
  };

  const startBrandProject = async (target, forceNew = false) => {
    if (!brand?.id) return;
    setMoving(true);
    setNotice('');
    try {
      const customTitle = forceNew ? newProjectTitle.trim() : '';
      const payload = { force_new: forceNew, title: customTitle || undefined };
      const result = target === 'frame'
        ? await v3MoveBrandToFrame(brand.id, payload)
        : await v3MoveBrandToBusinessCall(brand.id, payload);
      const businessCaseId = result.business_case_id || result.business_case?.id;
      if (!businessCaseId) throw new Error('Business Case was not returned by the V3 workflow.');
      setProjectChoiceOpen(false);
      setProjectChoiceDismissed(true);
      navigate(adminRoute(target === 'frame' ? `/business-cases/${businessCaseId}/frame/transcripts` : `/business-cases/${businessCaseId}/connect`));
    } catch (error) {
      setNotice(error?.response?.data?.detail || error?.message || 'Could not open this project flow.');
    } finally {
      setMoving(false);
    }
  };

  const moveToCallPage = async () => {
    if (openProjectDecision()) return;
    await startBrandProject('connect', false);
  };

  const moveToFramePage = async () => {
    if (openProjectDecision()) return;
    await startBrandProject('frame', false);
  };

  if (loading) {
    return <div className="v3-card p-8 text-[13px] text-[#8A8A8A]">Loading brand details...</div>;
  }

  if (!brand) {
    return (
      <div className="space-y-4" data-testid="v1-brand-detail-not-found">
        <button type="button" onClick={() => navigate(adminRoute('/crm-brands'))} className="v3-btn-secondary text-[11px]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM Brands
        </button>
        <div className="v3-card p-8 text-center text-[13px] text-[#8A8A8A]">{notice || 'Brand not found.'}</div>
      </div>
    );
  }


  const aboutText = firstValue(brand, ['about', 'brand_about', 'description', 'company_description', 'notes']);
  const marketingBudget = firstValue(brand, ['marketing_budget', 'budget', 'budget_range']);
  const website = firstValue(brand, ['website', 'url', 'brand_url', 'source_url']);
  const notes = firstValue(brand, ['notes', 'source_notes', 'scrape_notes']);

  return (
    <div className="space-y-5" data-testid="v1-brand-detail">
      <div className="flex items-center justify-between gap-4">
        <button type="button" onClick={() => navigate(adminRoute('/crm-brands'))} className="v3-btn-secondary text-[11px]">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM Brands
        </button>
        <button
          type="button"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#E0B0A4] bg-[#FBF1EE] text-[#B54A37] hover:bg-[#F5D9D2] transition-colors disabled:opacity-50"
          data-testid="v1-brand-delete-button"
          title="Delete this brand and all its linked records"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {deleting ? 'Deleting…' : 'Delete brand'}
        </button>
      </div>

      <div className="v3-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <BrandLogo brand={brand} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">CRM Brand</p>
              <h1 className="v3-heading mt-1 text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{brandName(brand)}</h1>
              <p className="mt-1 text-[13px] text-[#6E6657]">{brandIndustry(brand)}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
            <button type="button" onClick={moveToCallPage} disabled={moving} className="v3-btn-primary w-full flex items-center justify-center gap-1.5" data-testid="v1-move-to-call-page">
              <Send className="h-3.5 w-3.5" /> {moving ? 'Opening call page...' : 'Move to call page'}
            </button>
            <button type="button" onClick={moveToFramePage} disabled={moving} className="v3-btn-secondary w-full flex items-center justify-center gap-1.5" style={{ borderColor: '#C49B5F', color: '#C49B5F' }} data-testid="v1-move-to-frame">
              <BriefcaseBusiness className="h-3.5 w-3.5" /> {moving ? 'Opening transcripts...' : 'Move to frame'}
            </button>
          </div>
        </div>
        {notice && <div className="mt-4 rounded-[8px] border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2 text-[12px] text-[#7A5A1E]">{notice}</div>}
      </div>

      <InfoCard title="Brand details">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BRAND_DETAIL_FIELDS.map(([label, keys]) => {
            const rawVal = firstValue(brand, keys);
            
            if (label === 'CRM accepted at' && (!rawVal || rawVal === EMPTY_VALUE)) {
              return null;
            }
            
            let displayVal = rawVal;
            if (['Created', 'Updated', 'CRM accepted at'].includes(label)) {
              displayVal = formatDateTime(rawVal);
            }
            if (label === 'CRM status') {
              displayVal = statusLabel(rawVal, 'CRM Visible');
            }
            if (label === 'Source') {
              displayVal = statusLabel(rawVal, 'V3 CRM');
            }
            
            return <DetailRow key={label} label={label} value={displayVal} />;
          })}
        </div>
      </InfoCard>

      <InfoCard
        title="Scraped and source information"
        action={
          <button
            type="button"
            onClick={handleScrape}
            disabled={scraping}
            className="v3-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
            data-testid="crm-scrape-brand-btn"
          >
            {scraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {scraping ? 'Scraping details...' : 'Scrape for brand details'}
          </button>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#1A1A1A]">
                <FileText className="h-4 w-4 text-[#1F4A3A]" /> About
              </div>
              {!editingAbout && (
                <button
                  type="button"
                  onClick={() => {
                    setAboutDraft(aboutText || '');
                    setEditingAbout(true);
                  }}
                  className="p-1 hover:bg-[#F4F2EC] rounded text-[#8A8A8A] hover:text-[#1F4A3A] transition-colors"
                  title="Edit About Section"
                  data-testid="crm-edit-about-btn"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {editingAbout ? (
              <div className="space-y-2 mt-2">
                <textarea
                  value={aboutDraft}
                  onChange={(e) => setAboutDraft(e.target.value)}
                  rows={6}
                  className="w-full text-[13px] border border-[#D7CBB8] rounded-lg p-2 focus:outline-none focus:border-[#1F4A3A]"
                  placeholder="Enter brand description..."
                  data-testid="crm-about-textarea"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditingAbout(false)}
                    className="px-2.5 py-1 text-[11px] rounded bg-[#F4F2EC] text-[#4F3E2F]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAbout}
                    className="px-2.5 py-1 text-[11px] rounded bg-[#1F4A3A] text-white flex items-center gap-1"
                    data-testid="crm-save-about-btn"
                  >
                    <Check className="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-[13px] leading-6 text-[#4F3E2F]">{aboutText || EMPTY_VALUE}</p>
            )}
          </div>
          <div className="grid gap-3">
            <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Logo URL</p>
                {!editingLogo && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoDraft(logoUrlForBrand(brand) || '');
                      setEditingLogo(true);
                    }}
                    className="p-0.5 hover:bg-[#F4F2EC] rounded text-[#8A8A8A] hover:text-[#1F4A3A] transition-colors"
                    data-testid="crm-edit-logo-btn"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingLogo ? (
                <div className="space-y-2 mt-1.5">
                  <input
                    type="text"
                    value={logoDraft}
                    onChange={(e) => setLogoDraft(e.target.value)}
                    className="w-full text-[12px] border border-[#D7CBB8] rounded p-1.5 focus:outline-none focus:border-[#1F4A3A]"
                    placeholder="https://example.com/logo.png"
                    data-testid="crm-logo-input"
                  />
                  {logoDraft && (
                    <div className="flex justify-center p-2 bg-[#FBFAF7] border border-[#E8E4DB] rounded">
                      <img src={logoDraft} alt="Preview" className="h-10 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setEditingLogo(false)}
                      className="px-2 py-0.5 text-[10px] rounded bg-[#F4F2EC] text-[#4F3E2F]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveLogo}
                      className="px-2 py-0.5 text-[10px] rounded bg-[#1F4A3A] text-white"
                      data-testid="crm-save-logo-btn"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-all text-[13px] leading-5 text-[#1A1A1A]">{textValue(logoUrlForBrand(brand))}</p>
              )}
            </div>
            <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Marketing budget</p>
                {!editingMarketingBudget && (
                  <button
                    type="button"
                    onClick={() => {
                      setMarketingBudgetDraft(marketingBudget || '');
                      setEditingMarketingBudget(true);
                    }}
                    className="p-0.5 hover:bg-[#F4F2EC] rounded text-[#8A8A8A] hover:text-[#1F4A3A] transition-colors"
                    data-testid="crm-edit-marketing-budget-btn"
                    title="Edit marketing budget"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingMarketingBudget ? (
                <div className="space-y-2 mt-1.5">
                  <input
                    type="text"
                    value={marketingBudgetDraft}
                    onChange={(e) => setMarketingBudgetDraft(e.target.value)}
                    className="w-full text-[12px] border border-[#D7CBB8] rounded p-1.5 focus:outline-none focus:border-[#1F4A3A]"
                    placeholder="e.g. ?5m monthly, ?20m campaign, or TBD"
                    data-testid="crm-marketing-budget-input"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingMarketingBudget(false)} className="px-2 py-0.5 text-[10px] rounded bg-[#F4F2EC] text-[#4F3E2F]">Cancel</button>
                    <button onClick={handleSaveMarketingBudget} className="px-2 py-0.5 text-[10px] rounded bg-[#1F4A3A] text-white" data-testid="crm-save-marketing-budget-btn">Save</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#1A1A1A]">{textValue(marketingBudget)}</p>
              )}
            </div>
            <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Website / source URL</p>
                {!editingWebsite && (
                  <button
                    type="button"
                    onClick={() => {
                      setWebsiteDraft(website || '');
                      setEditingWebsite(true);
                    }}
                    className="p-0.5 hover:bg-[#F4F2EC] rounded text-[#8A8A8A] hover:text-[#1F4A3A] transition-colors"
                    data-testid="crm-edit-website-btn"
                    title="Edit website / source URL"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingWebsite ? (
                <div className="space-y-2 mt-1.5">
                  <input
                    type="url"
                    value={websiteDraft}
                    onChange={(e) => setWebsiteDraft(e.target.value)}
                    className="w-full text-[12px] border border-[#D7CBB8] rounded p-1.5 focus:outline-none focus:border-[#1F4A3A]"
                    placeholder="https://brand-website.com"
                    data-testid="crm-website-input"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingWebsite(false)} className="px-2 py-0.5 text-[10px] rounded bg-[#F4F2EC] text-[#4F3E2F]">Cancel</button>
                    <button onClick={handleSaveWebsite} className="px-2 py-0.5 text-[10px] rounded bg-[#1F4A3A] text-white" data-testid="crm-save-website-btn">Save</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-all text-[13px] leading-5 text-[#1A1A1A]">{textValue(website)}</p>
              )}
            </div>
            <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Notes</p>
                {!editingNotes && (
                  <button
                    type="button"
                    onClick={() => {
                      setNotesDraft(notes || '');
                      setEditingNotes(true);
                    }}
                    className="p-0.5 hover:bg-[#F4F2EC] rounded text-[#8A8A8A] hover:text-[#1F4A3A] transition-colors"
                    data-testid="crm-edit-notes-btn"
                    title="Edit notes"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-2 mt-1.5">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={4}
                    className="w-full text-[12px] border border-[#D7CBB8] rounded p-1.5 focus:outline-none focus:border-[#1F4A3A]"
                    placeholder="Add admin notes for this brand..."
                    data-testid="crm-notes-input"
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingNotes(false)} className="px-2 py-0.5 text-[10px] rounded bg-[#F4F2EC] text-[#4F3E2F]">Cancel</button>
                    <button onClick={handleSaveNotes} className="px-2 py-0.5 text-[10px] rounded bg-[#1F4A3A] text-white" data-testid="crm-save-notes-btn">Save</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-5 text-[#1A1A1A]">{textValue(notes)}</p>
              )}
            </div>
          </div>
        </div>
        {opportunities.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {opportunities.map((item, index) => (
              <SmallRecord
                key={item.id || index}
                title={item.title || item.company || item.brand_name || `Source record ${index + 1}`}
                subtitle={statusLabel(item.source, '') || statusLabel(item.status, '') || item.created_at}
                body={item.summary || item.about || item.description || item.notes || item.reason}
                href={item.url || item.website || item.source_url}
              />
            ))}
          </div>
        )}
      </InfoCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard title="Contacts">
          {contacts.length ? (
            <div className="grid gap-2">
              {contacts.map((contact, index) => (
                <SmallRecord key={contact.id || index} title={contact.name || contact.contact_name || 'Contact'} subtitle={[contact.role, contact.email, contact.phone].filter(Boolean).join(' | ')} body={contact.notes || contact.decision_seniority} />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#8A8A8A]">No contact records yet.</p>
          )}
        </InfoCard>

        <InfoCard title="Active business cases">
          {businessCases.length ? (
            <div className="grid gap-2">
              {businessCases.map((businessCase) => (
                <div key={businessCase.id} className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 hover:border-[#1F4A3A]">
                  <button type="button" onClick={() => navigate(businessCasePhasePath(businessCase.id, businessCase))} className="block w-full text-left" data-testid={`brand-bc-open-${businessCase.id}`}>
                    <div className="flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A]"><BriefcaseBusiness className="h-4 w-4 text-[#1F4A3A]" /> {businessCase.title || 'Business Case'}</div>
                    <p className="mt-1 text-[11px] text-[#8A8A8A]">Stage: {businessCase.stage_label || statusLabel(businessCase.stage)}</p>
                  </button>
                  {/* Direct jump links to Framing artifacts so admin can open
                      any earlier document without having to walk back through
                      Planning. Visible at every stage. */}
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-[#E8E4DB] pt-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/snapshot`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Alignment</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/brainstorm`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Brainstorm</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/creator-scan`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Creator Match</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/brief`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Brief</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/strategy-snapshot`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Strategy</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/plan/planning`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Planning</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/delivery/deliverables`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Delivery</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/reporting/final-report`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Reporting</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#8A8A8A]">No business case yet. Use Move to call page to create or open the Connect flow.</p>
          )}
        </InfoCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <InfoCard title="Interactions">
          {interactions.length ? (
            <div className="grid gap-2">
              {interactions.slice(0, 8).map((interaction, index) => <SmallRecord key={interaction.id || index} title={interaction.title || statusLabel(interaction.type, 'Interaction')} subtitle={[formatDateTime(interaction.date_iso || interaction.created_at), interaction.author].filter(Boolean).join(' | ')} body={interaction.content || interaction.summary || interaction.next_action} />)}
            </div>
          ) : (
            <p className="text-[13px] text-[#8A8A8A]">No interactions recorded yet.</p>
          )}
        </InfoCard>

        <InfoCard title="Account and emails">
          <div className="grid gap-3">
            <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 text-[12px]">
              <div className="mb-2 flex items-center gap-2 font-semibold text-[#1A1A1A]"><User className="h-4 w-4 text-[#1F4A3A]" /> Brand portal account</div>
              <p className="text-[#5C5C5C]">Username: {account?.username || EMPTY_VALUE}</p>
              <p className="text-[#5C5C5C]">Status: {statusLabel(account?.status)}</p>
            </div>
            <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 text-[12px]" data-testid="brand-deliverables-panel">
              <button type="button" onClick={() => setDeliverablesOpen((open) => !open)} className="flex w-full items-center justify-between gap-3 text-left" data-testid="brand-deliverables-toggle">
                <span className="flex items-center gap-2 font-semibold text-[#1A1A1A]"><PackageCheck className="h-4 w-4 text-[#1F4A3A]" /> Deliverables for this brand ({deliverables.length})</span>
                <ChevronDown className={`h-4 w-4 text-[#8A8A8A] transition-transform ${deliverablesOpen ? 'rotate-180' : ''}`} />
              </button>
              {deliverablesOpen && (
                <div className="mt-3 grid gap-2">
                  {deliverables.length ? deliverables.map((row) => (
                    <SmallRecord
                      key={row.id}
                      title={row.title || 'Deliverable'}
                      subtitle={[statusLabel(row.status, ''), formatDeliverableSchedule(row), row.delivery_timeframe].filter(Boolean).join(' | ')}
                      body={[row.notes, row.created_at ? `Added: ${formatDateTime(row.created_at)}` : ''].filter(Boolean).join('\n')}
                    />
                  )) : <p className="text-[13px] text-[#8A8A8A]">No deliverables have been added for this brand yet.</p>}
                </div>
              )}
            </div>
            {visibleEmails.slice(0, 4).map((email, index) => <CollapsibleEmailRecord key={email.id || index} title={email.subject || 'Queued email'} subtitle={[email.to, statusLabel(email.status, ''), email.duplicate_count > 1 ? `${email.duplicate_count} duplicate sends collapsed` : ''].filter(Boolean).join(' | ')} body={email.body} />)}
          </div>
        </InfoCard>
      </div>


      {projectChoiceOpen && activeBusinessCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid="brand-project-choice-modal">
          <div className="v3-card w-full max-w-lg bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">Active project found</p>
              <h3 className="mt-1 text-[18px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                Continue or start a new project?
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-[#6E6657]">
                {brandName(brand)} already has an active Business Case. Continue opens the last worked phase. Start New creates a separate project for this brand.
              </p>
            </div>
            <div className="rounded-[8px] border border-[#E8E4DB] bg-[#FAFAF7] p-3 text-[12px]">
              <p className="font-semibold text-[#1A1A1A]">{activeBusinessCase.title || 'Business Case'}</p>
              <p className="mt-1 text-[#6E6657]">Stage: {statusLabel(activeBusinessCase.stage)}</p>
              <p className="mt-1 text-[#8A8A8A]">Updated: {formatDateTime(activeBusinessCase.updated_at || activeBusinessCase.created_at)}</p>
            </div>
            <label className="mt-4 block text-[10px] uppercase tracking-wider text-[#8A8A8A]">
              New business case name
              <input
                type="text"
                value={newProjectTitle}
                onChange={(event) => setNewProjectTitle(event.target.value)}
                className="mt-1 w-full rounded border border-[#D7CBB8] bg-white px-3 py-2 text-[12px] normal-case tracking-normal text-[#1A1A1A] focus:outline-none focus:border-[#1F4A3A]"
                placeholder={`${brandName(brand)} - New campaign / project name`}
                data-testid="brand-new-project-title"
              />
            </label>
            <p className="mt-1 text-[11px] leading-5 text-[#8A8A8A]">Leave blank to use the default V3 business case name.</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={continueExistingProject} className="v3-btn-primary justify-center" data-testid="brand-continue-project">
                Continue
              </button>
              <button type="button" onClick={() => startBrandProject('connect', true)} disabled={moving} className="v3-btn-secondary justify-center" data-testid="brand-start-new-call">
                Start new: move to call
              </button>
              <button type="button" onClick={() => startBrandProject('frame', true)} disabled={moving} className="v3-btn-secondary justify-center sm:col-span-2" style={{ borderColor: '#C49B5F', color: '#C49B5F' }} data-testid="brand-start-new-frame">
                Start new: move to frame
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setProjectChoiceOpen(false); setProjectChoiceDismissed(true); }}
              className="mt-4 w-full text-center text-[12px] text-[#8A8A8A] hover:text-[#1F4A3A]"
            >
              Stay on brand details
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          data-testid="brand-delete-confirm"
        >
          <div className="v3-card w-full max-w-md bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#FBF1EE] flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-[#B54A37]" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                  Delete this brand?
                </h3>
                <p className="text-[12px] text-[#6E6657] mt-1 leading-relaxed">
                  <strong>{brand.company}</strong> and all its linked records (contacts, business cases,
                  interactions, meetings, contracts, projects, fees, wallet, reports, tasks, queued emails)
                  will be permanently removed. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#F1ECDF]">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="v3-btn-secondary text-[12px]"
                data-testid="brand-delete-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBrand}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#B54A37] text-white text-[12px] font-medium hover:bg-[#9E3E2D] disabled:opacity-50"
                data-testid="brand-delete-confirm-button"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleting ? 'Deleting…' : 'Yes, delete brand'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default V1AdminCRMBrandDetail;
