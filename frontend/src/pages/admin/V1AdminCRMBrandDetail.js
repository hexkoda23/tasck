import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
  CheckCircle2,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import {
  v3GetBrand,
  v3RenameBusinessCase,
  v3MoveBrandToBusinessCall,
  v3MoveBrandToFrame,
  v3ContinueBusinessCase,
  v3DeleteBrand,
  v3UpdateBrandDetails,
  v3ScrapeBrandDetails,
  v3ResendBrandCredentials,
} from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import { PriorityTag as RelationshipPriorityTag } from '../../lib/snapshotPriority';
import { businessCasePhasePath } from './V1BusinessCaseFlowPages';
import { BrandLogo as SharedBrandLogo } from '../../lib/brandLogo';
import { toast } from 'sonner';

const EMPTY_VALUE = 'Not captured yet';

// Friendly stage label shown under the scrape progress bar, driven by the
// current percentage. When the scrape has just failed we still hit 100% (the
// modal flips to the error state), so the label takes an `errored` flag and
// swaps to a failure-appropriate line - otherwise the popup contradicts
// itself with "Scrape did not complete" above "All details captured."
const scrapeStageLabel = (p, errored = false) => {
  if (errored && p >= 100) return 'Scrape stopped before finishing.';
  if (p < 20) return 'Locating the brand’s website…';
  if (p < 45) return 'Fetching the brand logo…';
  if (p < 65) return 'Reading the About information…';
  if (p < 90) return 'Extracting company details…';
  if (p < 100) return 'Finalising…';
  return 'All details captured.';
};

const BRAND_DETAIL_FIELDS = [
  ['Brand name', ['company', 'name', 'brand_name']],
  ['Category / industry', ['industry', 'category', 'sector']],
  ['Website', ['website', 'url', 'brand_url']],
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
  const stripped = raw.split(/[\s,;]/)[0];
  try {
    return new URL(stripped.startsWith('http') ? stripped : 'https://' + stripped)
      .hostname.replace(/^www\./, '');
  } catch (_) {
    return stripped.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
};

const GENERIC_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'icloud.com', 'me.com', 'aol.com', 'protonmail.com', 'proton.me',
  'msn.com', 'ymail.com', 'googlemail.com',
]);

const domainFromEmail = (email = '') => {
  const raw = String(email || '').trim().toLowerCase();
  if (!raw || !raw.includes('@')) return '';
  const domain = raw.split('@').pop().replace(/^www\./, '');
  if (!domain || GENERIC_EMAIL_DOMAINS.has(domain)) return '';
  return domain;
};

const logoCandidatesForBrand = (brand) => {
  const direct = logoUrlForBrand(brand);
  const websiteDomain = domainFromWebsite(firstValue(brand, ['website', 'url', 'brand_url', 'source_url']));
  const emailDomain = domainFromEmail(firstValue(brand, ['email', 'contact_email', 'primary_contact_email', 'primaryContactEmail']));
  const domains = [websiteDomain, emailDomain]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  const domainCandidates = domains.flatMap((domain) => [
    // Clearbit (`logo.clearbit.com`) removed - the service shut down and the
    // domain no longer resolves.
    'https://www.google.com/s2/favicons?sz=256&domain=' + domain,
    'https://icons.duckduckgo.com/ip3/' + domain + '.ico',
    'https://' + domain + '/favicon.png',
    'https://' + domain + '/favicon.ico',
    'https://' + domain + '/logo.svg',
    'https://' + domain + '/logo.png',
    'https://' + domain + '/assets/logo.svg',
    'https://' + domain + '/assets/logo.png',
  ]);
  return [direct, ...domainCandidates]
    .filter(Boolean)
    .filter((value) => !/(vite\.svg|react\.svg|placeholder|blank|sprite)/i.test(value))
    .filter((value, index, array) => array.indexOf(value) === index);
};

const BrandLogo = ({ brand }) => (
  <SharedBrandLogo
    name={brandName(brand)}
    storedLogo={logoUrlForBrand(brand)}
    candidates={logoCandidatesForBrand(brand)}
    containerClassName="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#D7CBB8] bg-white"
    imgClassName="h-full w-full object-contain p-2"
    initialsClassName="text-[18px] font-semibold text-[#1F4A3A]"
  />
);
const InfoCard = ({ title, children, action, className = '' }) => (
  <div className={`v3-card p-5 ${className}`}>
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

// Brand portal account block + a "Resend credentials" button for when a brand
// reports the original welcome-email credentials no longer work. Calls
// POST /api/v3/brand-accounts/resend-credentials which regenerates a temp
// password and re-sends the welcome email.
const BrandAccountCard = ({ brandId, account }) => {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [revealedTemp, setRevealedTemp] = useState('');
  const resend = async () => {
    setNotice('');
    setBusy(true);
    try {
      const result = await v3ResendBrandCredentials(brandId);
      setRevealedTemp(result?.temporary_password || '');
      const emailStatus = result?.email?.status;
      if (emailStatus === 'sent') {
        setNotice(`New access code sent to ${result?.username || 'the brand'}.`);
      } else if (emailStatus === 'delivery_failed') {
        setNotice(`Access code regenerated but email delivery failed: ${result?.email?.delivery_error || 'unknown reason'}. Share the code below directly with the brand.`);
      } else {
        setNotice(`Access code regenerated. Email status: ${emailStatus || 'queued'}.`);
      }
    } catch (e) {
      setNotice(e?.response?.data?.detail || e?.message || 'Could not resend credentials.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 text-[12px]" data-testid="brand-portal-account-card">
      <div className="mb-2 flex items-center gap-2 font-semibold text-[#1A1A1A]"><User className="h-4 w-4 text-[#1F4A3A]" /> Brand portal account</div>
      <p className="text-[#5C5C5C]">Username: {account?.username || EMPTY_VALUE}</p>
      <p className="text-[#5C5C5C]">Status: {statusLabel(account?.status)}</p>
      <button
        type="button"
        onClick={resend}
        disabled={busy}
        className="v3-btn-secondary text-[11px] mt-2"
        data-testid="brand-resend-credentials-btn"
      >
        {busy ? 'Resending…' : 'Resend brand credentials'}
      </button>
      {notice && <p className="mt-2 text-[11px] text-[#1F4A3A]">{notice}</p>}
      {revealedTemp && (
        <p className="mt-1 text-[11px] text-[#4F3E2F]">
          New access code: <code className="rounded bg-[#F4F2EC] px-1.5 py-0.5">{revealedTemp}</code>
        </p>
      )}
    </div>
  );
};

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
  // Scrape progress popup: shows an animated loading bar to 100% while brand
  // details are being scraped, then reveals a summary of what was captured.
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState(0);
  const [scrapeDone, setScrapeDone] = useState(false);
  const [scrapeSummary, setScrapeSummary] = useState([]);
  const [scrapeWarnings, setScrapeWarnings] = useState([]);
  const [scrapeError, setScrapeError] = useState('');
  const [editingAbout, setEditingAbout] = useState(false);
  // Next action is shared across the admin team - any admin opening this brand
  // can read it and edit it.
  const [editingNextAction, setEditingNextAction] = useState(false);
  const [nextActionDraft, setNextActionDraft] = useState('');
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
  // Two-step UI: the title input only appears after the admin picks one of the
  // "Start new" options. startNewTarget is "connect" or "frame" while we are
  // capturing the title for that path; null when the initial choice row is shown.
  const [startNewTarget, setStartNewTarget] = useState(null);

  const reloadData = async () => {
    try {
      const data = await v3GetBrand(id);
      setBundle(data);
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || 'Failed to reload brand details.');
    }
  };

  // Inline project rename. Business cases are created with a generated name,
  // so a brand with several projects sees the same title repeated until one
  // is renamed here.
  const [renamingId, setRenamingId] = useState('');
  const [renameDraft, setRenameDraft] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);

  // Freshly created brands arrive with { autoScrape: true } when the admin
  // supplied a website, so the details and logo are pulled without anyone
  // having to click Scrape. Guarded by a ref so React 18's double-invoked
  // effects (and any re-render) cannot fire the fetch twice.
  const location = useLocation();
  const autoScrapeFired = useRef(false);
  useEffect(() => {
    if (autoScrapeFired.current) return;
    if (!location.state?.autoScrape) return;
    if (!bundle) return;               // wait for the brand to load
    autoScrapeFired.current = true;
    // Clear the flag so a refresh or back-navigation does not re-scrape.
    navigate(location.pathname, { replace: true, state: {} });
    handleScrape();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, location.state]);

  const saveBusinessCaseName = async (bcId) => {
    const next = renameDraft.trim();
    if (!next) {
      setNotice('Give the project a name.');
      return;
    }
    setRenameBusy(true);
    try {
      await v3RenameBusinessCase(bcId, next, 'admin');
      await reloadData();
      setRenamingId('');
      setNotice('Project renamed.');
    } catch (err) {
      setNotice(err?.response?.data?.detail || err?.message || 'Could not rename this project.');
    } finally {
      setRenameBusy(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setNotice('');
    // Open the progress popup and reset it to the start.
    setScrapeModalOpen(true);
    setScrapeDone(false);
    setScrapeSummary([]);
    setScrapeWarnings([]);
    setScrapeError('');
    setScrapeProgress(6);

    // The backend scrape is a single request with no streaming progress, so we
    // animate the bar toward ~90% while it runs, then snap to 100% on completion.
    const timer = setInterval(() => {
      setScrapeProgress((prev) => {
        if (prev >= 90) return prev;
        const next = prev + Math.max(1, Math.round((94 - prev) * 0.06));
        return Math.min(next, 90);
      });
    }, 200);

    try {
      const res = await v3ScrapeBrandDetails(id);
      clearInterval(timer);
      if (res && res.ok) {
        const warnings = [
          ...(res.warnings || []),
          ...(res.enrichment_target?.warnings || []),
        ];
        // The endpoint answers 200 even when it could not read the site, so
        // its `error` is the only thing that distinguishes "the site is dead"
        // from "the site had nothing". Show it rather than an empty summary.
        const dedupedWarnings = Array.from(new Set(res.error ? [res.error, ...warnings] : warnings));
        const sourceType = res.enrichment_target?.source_type || 'website';
        const summary = [];
        summary.push(`Source: ${sourceType}${res.website ? ` · ${res.website}` : ''}`);
        if (res.logo_url) summary.push('Logo found and updated');
        if (res.about || res.brand_about) summary.push('About information captured');
        if (!res.logo_url && !res.about && !res.brand_about) {
          summary.push('Nothing new was captured - see below');
        }
        if (Array.isArray(res.supporting_links) && res.supporting_links.length) {
          summary.push(`${res.supporting_links.length} supporting link(s) kept`);
        }
        // Reload the brand first so the page behind the popup already shows the
        // fresh details by the time the bar reaches 100%.
        await reloadData();
        setScrapeSummary(summary);
        setScrapeWarnings(dedupedWarnings);
        setScrapeProgress(100);
        setScrapeDone(true);
      } else {
        await reloadData();
        setScrapeError('Scraping returned no results. Try again or add the details manually.');
        setScrapeProgress(100);
        setScrapeDone(true);
      }
    } catch (e) {
      clearInterval(timer);
      await reloadData();
      setScrapeError('Scraping failed. Please try again.');
      setScrapeProgress(100);
      setScrapeDone(true);
    } finally {
      setScraping(false);
    }
  };

  const closeScrapeModal = () => {
    if (scraping) return; // don't allow closing mid-scrape
    setScrapeModalOpen(false);
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

  const handleSaveNextAction = async () => {
    try {
      await v3UpdateBrandDetails(id, { next_action: nextActionDraft });
      toast.success('Next action updated.');
      setEditingNextAction(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to update the next action.');
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

  const logoFileInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const handleLogoFileUpload = async (event) => {
    const file = event.target.files && event.target.files[0];
    // Reset the input so re-selecting the same file re-triggers the change event.
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file (PNG, JPG, SVG, WebP).');
      return;
    }
    // 500KB is plenty for a logo - anything bigger is a design/marketing asset
    // and shouldn't be inlined as a data URL on the brand document.
    if (file.size > 500 * 1024) {
      toast.error('Logo file is too large (max 500KB).');
      return;
    }
    setUploadingLogo(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
        reader.readAsDataURL(file);
      });
      setLogoDraft(dataUrl);
      await v3UpdateBrandDetails(id, { logo_url: dataUrl, brand_logo_url: dataUrl });
      toast.success('Logo uploaded successfully.');
      setEditingLogo(false);
      await reloadData();
    } catch (e) {
      toast.error(e?.message || 'Failed to upload logo.');
    } finally {
      setUploadingLogo(false);
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
  // Campaigns from Alignment Snapshots: active one first, then the ones
  // waiting to be picked up, in the brand's priority order.
  const alignmentProjects = Array.isArray(bundle?.alignment_projects) ? bundle.alignment_projects : [];
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
      // Send whatever name the admin typed, on BOTH paths. This used to be
      // gated on forceNew, so on the normal "start project" path the title was
      // dropped and the backend fell back to its generated
      // "<Brand> - Business Case Frame" - which is why every project under a
      // brand read the same.
      const customTitle = newProjectTitle.trim();
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

  /*
   * "Move to call page" means exactly that: open this brand's Connect page.
   *
   * It used to hand off to the continue-or-start-new dialog whenever the brand
   * had an active case, which is how a brand past Connect stopped reaching the
   * call page at all: Continue opens the case's CURRENT phase, and once the
   * stage has moved on that is never Connect. But the Connect page stays valid
   * for the life of a case - later calls, more transcripts - so a passed stage
   * is no reason to withhold it.
   *
   * Safe to skip the dialog: with force_new false the endpoint is a lookup,
   * returning the brand's active case untouched and only creating one when
   * there is none, so this cannot pull a case's stage backwards. Starting a
   * SEPARATE project is still offered by the dialog that opens on arrival.
   */
  const moveToCallPage = async () => {
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
        <div className="flex-1" />
        {/* The relationship stage control used to sit here. Removed at the
            client's request; the field itself is untouched on the record. */}
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
              <BriefcaseBusiness className="h-3.5 w-3.5" /> {moving ? 'Opening transcripts...' : 'Add transcript'}
            </button>
          </div>
        </div>
        {notice && <div className="mt-4 rounded-[8px] border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2 text-[12px] text-[#7A5A1E]">{notice}</div>}
      </div>

      {/* Next action: shared across the admin team. Any admin can read what is
          meant to happen next on this brand and edit it. */}
      <InfoCard
        title="Next action"
        action={!editingNextAction && (
          <button
            type="button"
            onClick={() => {
              setNextActionDraft(firstValue(brand, ['next_action']) || '');
              setEditingNextAction(true);
            }}
            className="p-1 hover:bg-[#F4F2EC] rounded text-[#8A8A8A] hover:text-[#1F4A3A] transition-colors"
            title="Edit the next action"
            data-testid="crm-edit-next-action-btn"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        )}
      >
        {editingNextAction ? (
          <div className="space-y-2">
            <textarea
              value={nextActionDraft}
              onChange={(e) => setNextActionDraft(e.target.value)}
              rows={3}
              className="w-full text-[13px] border border-[#D7CBB8] rounded-lg p-2 focus:outline-none focus:border-[#1F4A3A]"
              placeholder="What should happen next on this brand? e.g. Follow up with Funke on the Q1 budget before booking the Connect call."
              data-testid="crm-next-action-textarea"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingNextAction(false)}
                className="px-2.5 py-1 text-[11px] rounded bg-[#F4F2EC] text-[#4F3E2F]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNextAction}
                className="px-2.5 py-1 text-[11px] rounded bg-[#1F4A3A] text-white flex items-center gap-1"
                data-testid="crm-save-next-action-btn"
              >
                <Check className="w-3 h-3" /> Save
              </button>
            </div>
          </div>
        ) : (
          <p
            className="whitespace-pre-wrap text-[13px] leading-6 text-[#4F3E2F]"
            data-testid="crm-next-action-value"
          >
            {firstValue(brand, ['next_action']) || 'No next action set yet. Add one so the next admin knows what to do.'}
          </p>
        )}
      </InfoCard>

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
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
                    className="hidden"
                    onChange={handleLogoFileUpload}
                    data-testid="crm-logo-file-input"
                  />
                  <button
                    type="button"
                    onClick={() => logoFileInputRef.current && logoFileInputRef.current.click()}
                    disabled={uploadingLogo}
                    className="w-full text-[11px] border border-dashed border-[#D7CBB8] rounded p-1.5 text-[#4F3E2F] hover:bg-[#F4F2EC] disabled:opacity-50 flex items-center justify-center gap-1.5"
                    data-testid="crm-logo-upload-btn"
                  >
                    <Upload className="w-3 h-3" />
                    {uploadingLogo ? 'Uploading…' : 'Or upload from your computer (max 500KB)'}
                  </button>
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
                <p className="mt-1 whitespace-pre-wrap break-all text-[13px] leading-5 text-[#1A1A1A]">
                  {(() => {
                    const val = logoUrlForBrand(brand);
                    if (!val) return EMPTY_VALUE;
                    // Data URLs uploaded via the file picker can be huge - show a
                    // friendly summary instead of a wall of base64 text.
                    if (val.startsWith('data:')) return 'Uploaded image (stored inline)';
                    return val;
                  })()}
                </p>
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

        {/* Campaigns from this brand's Alignment Snapshots. One Connect call
            can produce several; admin progresses ONE at a time, so the rest
            wait here (ranked by the brand's priority) to be picked up later. */}
        {alignmentProjects.length > 0 && (
          <InfoCard title={`Campaigns from Alignment Snapshots (${alignmentProjects.length})`}>
            <p className="text-[12px] text-[#6E6657] mb-3">
              Each campaign the AI found has its own Alignment Snapshot. You can only take one forward at a time —
              the rest stay here, in the brand's priority order, so you can come back and continue them later.
            </p>
            <div className="grid gap-2">
              {alignmentProjects.map((project) => (
                <div
                  key={project.snapshot_id}
                  className={`min-w-0 rounded-[8px] border p-3 ${project.is_active ? 'border-[#1F4A3A] bg-[#EAF4EE]' : 'border-[#E8E4DB] bg-white'}`}
                  data-testid={`brand-campaign-${project.snapshot_id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] font-semibold text-[#1A1A1A] break-words min-w-0">{cleanV1Text(project.title)}</p>
                        <RelationshipPriorityTag priority={project.priority} />
                        {project.is_active ? (
                          <span className="rounded-full bg-[#1F4A3A] px-2 py-0.5 text-[10px] font-semibold text-white">In progress</span>
                        ) : (
                          <span className="rounded-full border border-[#E6D6B6] bg-[#F2EAD8] px-2 py-0.5 text-[10px] font-semibold text-[#7A5F23]">Waiting</span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                        {statusLabel(project.status, 'Draft')}
                        {project.priority ? '' : ' · not ranked by the brand yet'}
                        {project.case_stage ? ` · case stage: ${statusLabel(project.case_stage, '')}` : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/business-cases/${project.business_case_id}/frame/snapshot?snapshot=${project.snapshot_id}`)}
                      className={project.is_active ? 'v3-btn-primary text-[11px]' : 'v3-btn-secondary text-[11px]'}
                      data-testid={`brand-campaign-open-${project.snapshot_id}`}
                    >
                      {project.is_active ? 'Continue' : 'Pick this up'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>
        )}

        <InfoCard title="Active business cases" className={alignmentProjects.length > 0 ? 'xl:col-span-2' : ''}>
          {businessCases.length ? (
            <div className="grid gap-2">
              {businessCases.map((businessCase) => (
                <div key={businessCase.id} className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 hover:border-[#1F4A3A]">
                  {renamingId === businessCase.id ? (
                    // Inline rename. Projects are created with a generated
                    // name, so every one under a brand reads the same until
                    // someone gives it a real one.
                    <form
                      onSubmit={(e) => { e.preventDefault(); saveBusinessCaseName(businessCase.id); }}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setRenamingId(''); }}
                        maxLength={160}
                        placeholder="Project name"
                        className="flex-1 min-w-[200px] rounded-md border border-[#E8E4DB] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[#1F4A3A]"
                        data-testid={`brand-bc-rename-input-${businessCase.id}`}
                      />
                      <button type="submit" disabled={renameBusy} className="v3-btn-primary text-[11px]" data-testid={`brand-bc-rename-save-${businessCase.id}`}>
                        {renameBusy ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" onClick={() => setRenamingId('')} className="v3-btn-secondary text-[11px]">Cancel</button>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => navigate(businessCasePhasePath(businessCase.id, businessCase))} className="block flex-1 min-w-0 text-left" data-testid={`brand-bc-open-${businessCase.id}`}>
                        <div className="flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A]"><BriefcaseBusiness className="h-4 w-4 flex-shrink-0 text-[#1F4A3A]" /> <span className="break-words">{businessCase.title || 'Business Case'}</span></div>
                        <p className="mt-1 text-[11px] text-[#8A8A8A]">Stage: {businessCase.stage_label || statusLabel(businessCase.stage)}</p>
                      </button>
                      <button
                        type="button"
                        title="Rename this project"
                        onClick={(e) => { e.stopPropagation(); setRenamingId(businessCase.id); setRenameDraft(businessCase.title || ''); }}
                        className="flex-shrink-0 rounded-md border border-[#E8E4DB] px-2 py-1 text-[10px] text-[#1F4A3A] hover:border-[#1F4A3A]"
                        data-testid={`brand-bc-rename-${businessCase.id}`}
                      >
                        Rename
                      </button>
                    </div>
                  )}
                  {/* Direct jump links to Framing artifacts so admin can open
                      any earlier document without having to walk back through
                      Planning. Visible at every stage. */}
                  <div className="mt-2 flex flex-wrap gap-1 border-t border-[#E8E4DB] pt-2">
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/snapshot`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Alignment</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/brainstorm`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Creator Selector</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/creator-scan`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Creator Match</button>
                    <span className="text-[10px] text-[#D7CBB8]">·</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/admin/business-cases/${businessCase.id}/frame/brief`); }} className="text-[10px] text-[#1F4A3A] underline hover:no-underline">Brief</button>
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
            <BrandAccountCard brandId={id} account={account} />
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
            {/* Two-step flow:
                Step 1 (startNewTarget == null) - Continue, Start new options.
                Step 2 (startNewTarget set)     - title input + Confirm / Back. */}
            {!startNewTarget ? (
              <>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={continueExistingProject} className="v3-btn-primary justify-center" data-testid="brand-continue-project">
                    Continue
                  </button>
                  <button type="button" onClick={() => { setNewProjectTitle(''); setStartNewTarget('connect'); }} disabled={moving} className="v3-btn-secondary justify-center" data-testid="brand-start-new-call">
                    Start new project
                  </button>
                  <button type="button" onClick={() => { setNewProjectTitle(''); setStartNewTarget('frame'); }} disabled={moving} className="v3-btn-secondary justify-center sm:col-span-2" style={{ borderColor: '#C49B5F', color: '#C49B5F' }} data-testid="brand-start-new-frame">
                    Upload new transcript
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setProjectChoiceOpen(false); setProjectChoiceDismissed(true); }}
                  className="mt-4 w-full justify-center rounded-[8px] bg-[#1F4A3A] py-2.5 text-center text-[13px] font-semibold text-white shadow-sm hover:bg-[#163A2C] transition-colors"
                  data-testid="brand-stay-on-details"
                >
                  Stay on brand details
                </button>
              </>
            ) : (
              <>
                <label className="mt-5 block text-[10px] uppercase tracking-wider text-[#8A8A8A]">
                  New business case name
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(event) => setNewProjectTitle(event.target.value)}
                    className="mt-1 w-full rounded border border-[#D7CBB8] bg-white px-3 py-2 text-[12px] normal-case tracking-normal text-[#1A1A1A] focus:outline-none focus:border-[#1F4A3A]"
                    placeholder={`${brandName(brand)} - new campaign / project name`}
                    autoFocus
                    data-testid="brand-new-project-title"
                  />
                </label>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => startBrandProject(startNewTarget, true)}
                    disabled={moving}
                    className="v3-btn-primary justify-center"
                    data-testid="brand-confirm-start-new"
                  >
                    {moving ? 'Starting…' : (startNewTarget === 'frame' ? 'Add transcript' : 'Confirm: move to call')}
                  </button>
                  <button type="button" onClick={() => setStartNewTarget(null)} className="v3-btn-secondary justify-center" data-testid="brand-back-to-choices">
                    Back
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {scrapeModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          data-testid="brand-scrape-modal"
        >
          <div className="v3-card w-full max-w-md bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${scrapeDone && !scrapeError ? 'bg-[#EAF4EE]' : scrapeError ? 'bg-[#FBF1EE]' : 'bg-[#EAF4EE]'}`}>
                {scrapeDone && !scrapeError ? (
                  <CheckCircle2 className="w-5 h-5 text-[#1F7A4D]" />
                ) : scrapeError ? (
                  <AlertTriangle className="w-5 h-5 text-[#B54A37]" />
                ) : (
                  <Loader2 className="w-5 h-5 text-[#1F4A3A] animate-spin" />
                )}
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                  {scrapeDone && !scrapeError
                    ? 'Brand details scraped'
                    : scrapeError
                    ? 'Scrape did not complete'
                    : 'Scraping brand details…'}
                </h3>
                <p className="text-[12px] text-[#6E6657] mt-1 leading-relaxed">
                  {scrapeDone
                    ? scrapeError || 'All available details were captured and updated on this page.'
                    : 'Please keep this open while we gather the brand’s website, logo, and company information.'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#4F3E2F]" data-testid="brand-scrape-stage">
                {scrapeStageLabel(scrapeProgress, Boolean(scrapeError))}
              </span>
              <span className="text-[11px] font-semibold text-[#1F4A3A]" data-testid="brand-scrape-percent">
                {Math.round(scrapeProgress)}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#EFEBE1]">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${scrapeError ? 'bg-[#B54A37]' : 'bg-[#1F4A3A]'}`}
                style={{ width: `${scrapeProgress}%` }}
                data-testid="brand-scrape-bar"
              />
            </div>

            {/* Summary once done */}
            {scrapeDone && !scrapeError && scrapeSummary.length > 0 && (
              <ul className="mt-4 space-y-1.5" data-testid="brand-scrape-summary">
                {scrapeSummary.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12px] text-[#4F3E2F]">
                    <Check className="w-3.5 h-3.5 text-[#1F7A4D] mt-0.5 flex-shrink-0" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            )}

            {scrapeDone && scrapeWarnings.length > 0 && (
              <div className="mt-3 rounded-lg bg-[#FDF6E9] border border-[#F0E2C0] p-2.5">
                {scrapeWarnings.slice(0, 4).map((w, i) => (
                  <p key={i} className="flex items-start gap-1.5 text-[11px] text-[#8A6D1F]">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> <span>{w}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-[#F1ECDF]">
              <button
                onClick={closeScrapeModal}
                disabled={scraping}
                className="v3-btn-primary text-[12px] disabled:opacity-50"
                data-testid="brand-scrape-close"
              >
                {scraping ? 'Please wait…' : scrapeError ? 'Close' : 'View details'}
              </button>
            </div>
          </div>
        </div>
      )}

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
