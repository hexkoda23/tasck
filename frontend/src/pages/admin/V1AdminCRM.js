import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  v3GetBrands,
  v3CreateBrand,
  v3CreateBrandQualificationCandidate,
  v3ListRelationshipManagers,
} from '../../lib/v3api';
import { useV3Resource } from '../../lib/useV3Resource';
import V3Modal from '../../components/v3/V3Modal';
import { Search, Plus, ArrowUpDown, Sparkles, Users } from 'lucide-react';
import { adminRoute, getAdminRouteBase, V1_ADMIN_ROUTE_BASE } from '../../lib/v3AdminRouteBase';
import { BrandLogo } from '../../lib/brandLogo';
import { toast } from 'sonner';

// Normalises API brand shape for the component
const normaliseBrand = (b) => ({
  id: b.id,
  company: b.company || b.brand_name || 'Unnamed brand',
  industry: b.industry || 'Uncategorised',
  primaryContact: b.primary_contact || b.primaryContact,
  role: b.role,
  logoUrl: b.logo_url || b.logoUrl || b.brand_logo_url || b.brandLogoUrl || b.logo || '',
  website: b.website || b.url || b.brand_url || b.source_url || '',
  sourceUrl: b.source_url || '',
  about: b.about || b.brand_about || b.description || b.company_description || b.notes || '',
  createdAt: b.created_at || b.createdAt || null,
  lastInteraction: b.last_interaction || b.lastInteraction,
  engagementTrack: b.engagement_track_default || 'paid',
  rmId: b.rm_id || b.relationship_manager?.id || 'rm-temi',
  relationshipManager: b.relationship_manager || { name: b.relationship_manager_name || 'Unassigned' },
});

const brandCreatedAtTs = (value) => {
  const ts = Date.parse(value || '');
  return Number.isNaN(ts) ? 0 : ts;
};

const brandInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'BR';
};

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
  const domain = domainFromWebsite(brand.website || brand.sourceUrl);
  return [
    brand.logoUrl,
    domain ? 'https://' + domain + '/favicon.png' : '',
    domain ? 'https://' + domain + '/favicon.ico' : '',
    domain ? 'https://www.google.com/s2/favicons?sz=256&domain=' + domain : '',
    domain ? 'https://icons.duckduckgo.com/ip3/' + domain + '.ico' : '',
  ].filter(Boolean).filter((value, index, array) => array.indexOf(value) === index);
};

const CrmBrandLogo = ({ brand }) => (
  <BrandLogo
    name={brand.company}
    candidates={logoCandidatesForBrand(brand)}
    initials={brandInitials(brand.company)}
    containerClassName="w-12 h-12 rounded-lg border border-[#E8E4DB] bg-white flex items-center justify-center flex-shrink-0 overflow-hidden"
    imgClassName="h-full w-full object-contain p-1.5"
    initialsClassName="text-[12px] font-semibold text-[#1F4A3A]"
  />
);

const V1AdminCRM = () => {
  const navigate = useNavigate();
  const isV1Admin = getAdminRouteBase(typeof window === 'undefined' ? '' : window.location.pathname) === V1_ADMIN_ROUTE_BASE;
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [trackFilter, setTrackFilter] = useState('all');
  const [rms, setRMs] = useState([]);

  const { data: brands, source } = useV3Resource(() => v3GetBrands({ crm_only: true }), []);
  const brandList = Array.isArray(brands) ? brands : [];
  const normalised = brandList.map(normaliseBrand);

  const [addOpen, setAddOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [form, setForm] = useState({
    company: '',
    industry: '',
    primary_contact: '',
    role: '',
    email: '',
    phone: '',
    website: '',
    hq: '',
    notes: '',
    call_purpose: '',
    rm_id: '',
    engagement_track_default: 'paid',
  });
  const [submitting, setSubmitting] = useState(false);
  const [createdIntake, setCreatedIntake] = useState(null);

  const resetForm = () => setForm({
    company: '',
    industry: '',
    primary_contact: '',
    role: '',
    email: '',
    phone: '',
    website: '',
    hq: '',
    notes: '',
    call_purpose: '',
    rm_id: rms[0]?.id || '',
    engagement_track_default: 'paid',
  });

  // Load RMs from API for the dropdown
  useEffect(() => {
    v3ListRelationshipManagers()
      .then((data) => {
        setRMs(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          setForm((f) => ({ ...f, rm_id: f.rm_id || data[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  const submitBrand = async () => {
    const requiredKeys = ['company', 'industry', 'primary_contact', 'role', 'email', 'hq'];
    const errors = {};
    let firstInvalidKey = null;

    requiredKeys.forEach((key) => {
      if (!String(form[key] || '').trim()) {
        errors[key] = true;
        if (!firstInvalidKey) {
          firstInvalidKey = key;
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (firstInvalidKey) {
        const element = document.getElementById(`form-div-${firstInvalidKey}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = element.querySelector('input');
          if (input) {
            input.focus();
          }
        }
      }
      return;
    }

    setValidationErrors({});
    setSubmitting(true);
    try {
      if (isV1Admin) {
        const created = await v3CreateBrand({
          ...form,
          source: 'v1_admin_crm',
          status: 'crm_accepted',
          qualification_status: 'accepted',
        });
        const brandId = created.id || created.brand_id || created.brand?.id;
        if (!brandId) {
          throw new Error('CRM brand was created but no brand id was returned.');
        }
        toast.success("Saved to CRM!");
        setAddOpen(false);
        resetForm();
        navigate(adminRoute(`/crm-brands/${brandId}`));
        return;
      }
      const created = await v3CreateBrandQualificationCandidate({ ...form, source: 'manual_brand' });
      toast.success("Saved to CRM!");
      setCreatedIntake(created);
      setAddOpen(false);
      resetForm();
      navigate(adminRoute(`/meetings/qualification/${created.meeting_id}`));
    } catch (e) {
      alert(e.response?.data?.detail || e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = normalised
    .filter(
      (b) =>
        (trackFilter === 'all' || b.engagementTrack === trackFilter) &&
        (b.company.toLowerCase().includes(search.toLowerCase()) ||
          (b.primaryContact || '').toLowerCase().includes(search.toLowerCase()) ||
          (b.about || '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.company.localeCompare(b.company);
      const newestFirst = brandCreatedAtTs(b.createdAt) - brandCreatedAtTs(a.createdAt);
      return newestFirst || a.company.localeCompare(b.company);
    });

  const trackPill = (track) =>
    track === 'grant'
      ? { label: 'Grant', bg: '#F2EAD8', fg: '#7A5F23' }
      : { label: 'Paid', bg: '#DDE7E2', fg: '#1F4A3A' };

  return (
    <>
      <div data-testid="v3-admin-crm">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CRM</p>
            <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>
              {isV1Admin ? 'CRM Brands' : 'Brands'}
            </h1>
            <p className="text-[#8A8A8A] text-sm">
              {normalised.length} accepted brands in CRM
              {source === 'api' && (
                <span
                  className="ml-2 text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]"
                  data-testid="crm-live-badge"
                >
                  <Sparkles className="w-3 h-3" /> live
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="v3-btn-primary" data-testid="add-brand-btn" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> {isV1Admin ? 'Add Brand to CRM' : 'Add Brand'}
            </button>
            {!isV1Admin && (
              <button
                className="v3-btn-secondary"
                data-testid="scrape-opportunities-btn"
                onClick={() => navigate(adminRoute('/crm/opportunities'))}
              >
                <Sparkles className="w-4 h-4" /> Scan Opportunities
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brands or contacts..."
              className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors"
              data-testid="crm-search"
            />
          </div>
          <div className="flex gap-1 p-1 bg-[#F4F2EC] rounded-lg" data-testid="crm-track-filter">
            {[
              { k: 'all', label: 'All' },
              { k: 'paid', label: 'Paid Strategy' },
              { k: 'grant', label: 'Grant' },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setTrackFilter(t.k)}
                className={`text-[11px] px-3 py-1 rounded transition-colors ${
                  trackFilter === t.k ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'
                }`}
                data-testid={`crm-track-${t.k}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
            className="v3-btn-secondary"
            data-testid="crm-sort"
          >
            <ArrowUpDown className="w-3.5 h-3.5" /> {sortBy === 'recent' ? 'Newest' : 'A-Z'}
          </button>
        </div>

        {/* Brand list */}
        {filtered.length === 0 ? (
          <div className="v3-card p-12 text-center" data-testid="crm-empty-state">
            <Users className="w-10 h-10 text-[#C4BDB3] mx-auto mb-3" />
            <p className="text-[15px] font-medium text-[#1A1A1A] mb-1">
              {search || trackFilter !== 'all' ? 'No brands match your filter' : 'No brands in CRM yet'}
            </p>
            <p className="text-[13px] text-[#8A8A8A]">
              {search || trackFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Accepted brands will appear here after qualification.'}
            </p>
            {!search && trackFilter === 'all' && (
              <button className="v3-btn-primary mt-4" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4" /> {isV1Admin ? 'Add Brand to CRM' : 'Add Brand'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((brand) => {
              const tp = trackPill(brand.engagementTrack);
              return (
                <button
                  key={brand.id}
                  onClick={() => navigate(adminRoute(`/crm-brands/${brand.id}`))}
                  className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors group"
                  data-testid={`crm-brand-${brand.id}`}
                >
                  <CrmBrandLogo brand={brand} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-medium text-[#1A1A1A]">{brand.company}</span>
                      <span className="text-[10px] text-[#8A8A8A] px-2 py-0.5 rounded bg-[#F4F2EC]">
                        {brand.industry}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded"
                        style={{ background: tp.bg, color: tp.fg }}
                        data-testid={`crm-track-pill-${brand.id}`}
                      >
                        {tp.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#8A8A8A] mt-0.5">
                      {brand.primaryContact || 'No contact'} {brand.role ? `/ ${brand.role}` : ''}
                    </p>
                    {brand.about && (
                      <p className="text-[11px] text-[#6E6657] mt-1 truncate">
                        {brand.about}
                      </p>
                    )}
                    <p className="text-[11px] text-[#6E6657] mt-1">
                      RM: {brand.relationshipManager?.name || 'Unassigned'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {brand.lastInteraction && (
                      <span className="text-[10px] text-[#8A8A8A]">{brand.lastInteraction}</span>
                    )}
                    {isV1Admin && (
                      <span
                        className="v3-btn-primary text-[11px]"
                        data-testid={`crm-move-to-call-${brand.id}`}
                      >
                        View details
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {createdIntake && (
        <div
          className="fixed bottom-5 right-5 z-50 v3-card p-4 max-w-sm shadow-lg"
          data-testid="brand-account-created"
        >
          <p className="text-[12px] font-semibold text-[#1A1A1A] mb-1">Qualification call created</p>
          <p className="text-[11px] text-[#6E6657]">The brand is waiting in Meetings before it appears in CRM.</p>
          <p className="text-[11px] mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {createdIntake.meeting_id}
          </p>
          <button onClick={() => setCreatedIntake(null)} className="v3-btn-secondary text-[11px] mt-3">
            Dismiss
          </button>
        </div>
      )}

      <V3Modal
        open={addOpen}
        onClose={() => {
          if (window.confirm("Are you sure or proceed to cancel?")) {
            setAddOpen(false);
            resetForm();
            setValidationErrors({});
          }
        }}
        title={isV1Admin ? 'Add Brand to CRM' : 'Add Brand for Qualification'}
        subtitle={isV1Admin ? 'Create the real CRM brand, review its full details, then move it to the Connect / Business Call page.' : 'Capture the lead and create its Brand Qualification Call before it enters CRM.'}
        testid="add-brand-modal"
        footer={
          <>
            <button
              onClick={() => {
                if (window.confirm("Are you sure or proceed to cancel?")) {
                  setAddOpen(false);
                  resetForm();
                  setValidationErrors({});
                }
              }}
              className="v3-btn-secondary"
              data-testid="add-brand-cancel"
            >
              Cancel
            </button>
            <button
              onClick={submitBrand}
              disabled={submitting}
              className="v3-btn-primary"
              data-testid="add-brand-submit"
            >
              {submitting ? 'Saving...' : (isV1Admin ? 'Save Brand' : 'Create Qualification Call')}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {[
            { k: 'company', label: 'Company name', placeholder: 'e.g. Nigerian Breweries PLC', required: true },
            { k: 'industry', label: 'Industry', placeholder: 'e.g. FMCG — Beverages', required: true },
            { k: 'primary_contact', label: 'Primary contact', placeholder: 'e.g. Funke Adebiyi', required: true },
            { k: 'role', label: 'Contact role', placeholder: 'e.g. Brand Manager, Star Lager', required: true },
            { k: 'email', label: 'Contact email (strongly recommended)', placeholder: 'name@brand.com', required: true },
            { k: 'phone', label: 'Phone / WhatsApp', placeholder: '+234...' },
            { k: 'website', label: 'Website', placeholder: 'https://brand.com' },
            { k: 'hq', label: 'HQ / location', placeholder: 'Lagos, Nigeria', required: true },
          ].map((f) => (
            <div key={f.k} id={`form-div-${f.k}`}>
              <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
                {f.label} {f.required && <span className="text-red-500 font-bold">*</span>}
              </label>
              <input
                type="text"
                value={form[f.k]}
                onChange={(e) => {
                  setForm({ ...form, [f.k]: e.target.value });
                  if (validationErrors[f.k]) {
                    setValidationErrors((prev) => {
                      const copy = { ...prev };
                      delete copy[f.k];
                      return copy;
                    });
                  }
                }}
                placeholder={f.placeholder}
                className={`w-full px-3 py-2 text-[13px] rounded-lg border bg-white focus:outline-none focus:border-[#1F4A3A] ${
                  validationErrors[f.k] ? 'border-red-500 ring-1 ring-red-500' : 'border-[#E8E4DB]'
                }`}
                data-testid={`add-brand-${f.k}`}
              />
              {validationErrors[f.k] && (
                <p className="text-[10px] text-red-500 mt-0.5">{f.label} is required.</p>
              )}
            </div>
          ))}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Notes / source
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Where this lead came from, what they asked for, and what the qualification call should confirm."
              rows={3}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
              data-testid="add-brand-notes"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Relationship Manager
            </label>
            <select
              value={form.rm_id}
              onChange={(e) => setForm({ ...form, rm_id: e.target.value })}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A]"
              data-testid="add-brand-rm"
            >
              {rms.length === 0 && (
                <option value="">Loading relationship managers…</option>
              )}
              {rms.map((rm) => (
                <option key={rm.id} value={rm.id}>
                  {rm.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#8A8A8A] mt-1">
              This RM owns the brand relationship, follow-ups, meetings, and first Business Case handoff.
            </p>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">
              Engagement track default
            </label>
            <div className="flex gap-2">
              {['paid', 'grant'].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm({ ...form, engagement_track_default: t })}
                  className={`flex-1 px-3 py-2 text-[12px] rounded-lg border transition-colors ${
                    form.engagement_track_default === t
                      ? 'bg-[#1F4A3A] text-white border-[#1F4A3A]'
                      : 'bg-white border-[#E8E4DB] text-[#6E6657]'
                  }`}
                  data-testid={`add-brand-track-${t}`}
                >
                  {t === 'paid' ? 'Paid Strategy' : 'Grant'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#8A8A8A] mt-1">
              {form.engagement_track_default === 'grant'
                ? 'No Strategy Development Fee will be invoiced. Funder pays creator directly.'
                : 'Strategy Development Fee is issued after the creator brief and tracked before Delivery.'}
            </p>
          </div>
        </div>
      </V3Modal>
    </>
  );
};

export default V1AdminCRM;

