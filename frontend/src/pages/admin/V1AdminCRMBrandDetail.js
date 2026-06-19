import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  User,
  Send,
} from 'lucide-react';
import { v3GetBrand, v3MoveBrandToBusinessCall, v3MoveBrandToFrame } from '../../lib/v3api';
import { adminRoute } from '../../lib/v3AdminRouteBase';

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
  ['Qualification status', ['qualification_status']],
  ['Source', ['source', 'lead_source', 'scrape_source']],
  ['Last interaction', ['last_interaction', 'lastInteraction']],
  ['Created', ['created_at', 'createdAt']],
  ['Updated', ['updated_at', 'updatedAt']],
  ['CRM accepted at', ['crm_accepted_at']],
];

const SCALAR_FIELD_LIMIT = 240;

const firstValue = (record, keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const textValue = (value) => {
  if (value === undefined || value === null || value === '') return EMPTY_VALUE;
  if (Array.isArray(value)) return value.map(textValue).join(', ');
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const shortText = (value) => {
  const text = textValue(value);
  if (text === EMPTY_VALUE || text.length <= SCALAR_FIELD_LIMIT) return text;
  return `${text.slice(0, SCALAR_FIELD_LIMIT)}...`;
};



const logoUrlForBrand = (brand) => firstValue(brand, ['logo_url', 'brand_logo_url', 'logoUrl', 'brandLogoUrl', 'logo']);
const brandName = (brand) => firstValue(brand, ['company', 'name', 'brand_name']) || 'Brand';
const brandIndustry = (brand) => firstValue(brand, ['industry', 'category', 'sector']) || 'Uncategorised';

const BrandLogo = ({ brand }) => {
  const [failed, setFailed] = useState(false);
  const logoUrl = logoUrlForBrand(brand);
  const initials = brandName(brand).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BR';
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-[#D7CBB8] bg-white">
      {logoUrl && !failed ? (
        <img src={logoUrl} alt={`${brandName(brand)} logo`} onError={() => setFailed(true)} className="h-full w-full object-contain p-2" />
      ) : (
        <span className="text-[18px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{initials}</span>
      )}
    </div>
  );
};

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
        <p className="font-medium text-[#1A1A1A]">{title || 'Untitled'}</p>
        {subtitle && <p className="mt-0.5 text-[#8A8A8A]">{subtitle}</p>}
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

const V1AdminCRMBrandDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [notice, setNotice] = useState('');

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
  const interactions = Array.isArray(bundle?.interactions) ? bundle.interactions : [];
  const opportunities = Array.isArray(bundle?.opportunities) ? bundle.opportunities : [];
  const emails = Array.isArray(bundle?.emails) ? bundle.emails : [];
  const account = bundle?.account || null;

  const moveToCallPage = async () => {
    if (!brand?.id) return;
    setMoving(true);
    setNotice('');
    try {
      const result = await v3MoveBrandToBusinessCall(brand.id);
      const businessCaseId = result.business_case_id || result.business_case?.id;
      if (!businessCaseId) throw new Error('Business Case was not returned by the V3 workflow.');
      navigate(adminRoute(`/business-cases/${businessCaseId}/connect`));
    } catch (error) {
      setNotice(error?.response?.data?.detail || error?.message || 'Could not move this brand to the call page.');
    } finally {
      setMoving(false);
    }
  };

  const moveToFramePage = async () => {
    if (!brand?.id) return;
    setMoving(true);
    setNotice('');
    try {
      const result = await v3MoveBrandToFrame(brand.id);
      const businessCaseId = result.business_case_id || result.business_case?.id;
      if (!businessCaseId) throw new Error('Business Case was not returned by the V3 workflow.');
      navigate(adminRoute(`/business-cases/${businessCaseId}/frame/snapshot`));
    } catch (error) {
      setNotice(error?.response?.data?.detail || error?.message || 'Could not move this brand to the frame page.');
    } finally {
      setMoving(false);
    }
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
  const website = firstValue(brand, ['website', 'url', 'brand_url']);

  return (
    <div className="space-y-5" data-testid="v1-brand-detail">
      <button type="button" onClick={() => navigate(adminRoute('/crm-brands'))} className="v3-btn-secondary text-[11px]">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM Brands
      </button>

      <div className="v3-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <BrandLogo brand={brand} />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A]">CRM Brand</p>
              <h1 className="v3-heading mt-1 text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>{brandName(brand)}</h1>
              <p className="mt-1 text-[13px] text-[#6E6657]">{brandIndustry(brand)}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded bg-[#DDE7E2] px-2 py-1 text-[#1F4A3A]">{textValue(brand.status || 'CRM visible')}</span>
                <span className="rounded bg-[#F4F2EC] px-2 py-1 text-[#4F3E2F]">Source: {textValue(brand.source || brand.lead_source || 'V3 CRM')}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0 min-w-[200px]">
            <button type="button" onClick={moveToCallPage} disabled={moving} className="v3-btn-primary w-full flex items-center justify-center gap-1.5" data-testid="v1-move-to-call-page">
              <Send className="h-3.5 w-3.5" /> {moving ? 'Opening call page...' : 'Move to call page'}
            </button>
            <button type="button" onClick={moveToFramePage} disabled={moving} className="v3-btn-secondary w-full flex items-center justify-center gap-1.5" style={{ borderColor: '#C49B5F', color: '#C49B5F' }} data-testid="v1-move-to-frame">
              <BriefcaseBusiness className="h-3.5 w-3.5" /> {moving ? 'Moving to frame...' : 'Move to frame'}
            </button>
          </div>
        </div>
        {notice && <div className="mt-4 rounded-[8px] border border-[#E5C99A] bg-[#FBF4E4] px-3 py-2 text-[12px] text-[#7A5A1E]">{notice}</div>}
      </div>

      <InfoCard title="Brand details">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {BRAND_DETAIL_FIELDS.map(([label, keys]) => <DetailRow key={label} label={label} value={firstValue(brand, keys)} />)}
        </div>
      </InfoCard>

      <InfoCard title="Scraped and source information">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[8px] border border-[#E8E4DB] bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#1A1A1A]"><FileText className="h-4 w-4 text-[#1F4A3A]" /> About</div>
            <p className="whitespace-pre-wrap text-[13px] leading-6 text-[#4F3E2F]">{aboutText || EMPTY_VALUE}</p>
          </div>
          <div className="grid gap-3">
            <DetailRow label="Logo URL" value={logoUrlForBrand(brand)} />
            <DetailRow label="Website / source URL" value={website} />
            <DetailRow label="Notes" value={brand.notes || brand.source_notes || brand.scrape_notes} />
          </div>
        </div>
        {opportunities.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {opportunities.map((item, index) => (
              <SmallRecord
                key={item.id || index}
                title={item.title || item.company || item.brand_name || `Source record ${index + 1}`}
                subtitle={item.source || item.status || item.created_at}
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
                <button key={businessCase.id} type="button" onClick={() => navigate(adminRoute(`/business-cases/${businessCase.id}`))} className="rounded-[8px] border border-[#E8E4DB] bg-white p-3 text-left hover:border-[#1F4A3A]">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-[#1A1A1A]"><BriefcaseBusiness className="h-4 w-4 text-[#1F4A3A]" /> {businessCase.title || 'Business Case'}</div>
                  <p className="mt-1 text-[11px] text-[#8A8A8A]">Stage: {businessCase.stage_label || businessCase.stage || EMPTY_VALUE}</p>
                </button>
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
              {interactions.slice(0, 8).map((interaction, index) => <SmallRecord key={interaction.id || index} title={interaction.title || interaction.type || 'Interaction'} subtitle={interaction.date_iso || interaction.created_at || interaction.author} body={interaction.content || interaction.summary || interaction.next_action} />)}
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
              <p className="text-[#5C5C5C]">Status: {account?.status || EMPTY_VALUE}</p>
            </div>
            {emails.slice(0, 4).map((email, index) => <SmallRecord key={email.id || index} title={email.subject || 'Queued email'} subtitle={[email.to, email.status].filter(Boolean).join(' | ')} body={email.body} />)}
          </div>
        </InfoCard>
      </div>


    </div>
  );
};

export default V1AdminCRMBrandDetail;
