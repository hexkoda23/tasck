import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Brands as fallbackBrands, getProjectsForBrand } from '../../../lib/v3data';
import { v3GetBrands } from '../../../lib/v3api';
import { useV3Resource } from '../../../lib/useV3Resource';
import { Search, Plus, ArrowUpDown, Sparkles } from 'lucide-react';

// Normalises both API and mock shapes so the rest of the component is unaware
// of the source.
const normaliseBrand = (b) => ({
  id: b.id,
  company: b.company,
  industry: b.industry,
  primaryContact: b.primary_contact || b.primaryContact,
  role: b.role,
  leadScore: b.lead_score || b.leadScore,
  lastInteraction: b.last_interaction || b.lastInteraction,
  engagementTrack: b.engagement_track_default || 'paid',
});

const V3AdminCRM = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [trackFilter, setTrackFilter] = useState('all');

  const { data: brands, source } = useV3Resource(() => v3GetBrands(), fallbackBrands);
  const normalised = (brands || []).map(normaliseBrand);

  const filtered = normalised
    .filter((b) =>
      (trackFilter === 'all' || b.engagementTrack === trackFilter) &&
      (b.company.toLowerCase().includes(search.toLowerCase()) ||
        (b.primaryContact || '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (sortBy === 'score' ? (b.leadScore || 0) - (a.leadScore || 0) : a.company.localeCompare(b.company)));

  const scoreColor = (score) => (score >= 70 ? '#1F4A3A' : score >= 40 ? '#C49B5F' : '#B54A37');
  const trackPill = (track) =>
    track === 'grant'
      ? { label: 'Grant', bg: '#F2EAD8', fg: '#7A5F23' }
      : { label: 'Paid', bg: '#DDE7E2', fg: '#1F4A3A' };

  return (
    <div data-testid="v3-admin-crm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">CRM</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Brands</h1>
          <p className="text-[#8A8A8A] text-sm">
            {normalised.length} brands in pipeline
            {source === 'api' && (
              <span className="ml-2 text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#DDE7E2] text-[#1F4A3A]" data-testid="crm-live-badge">
                <Sparkles className="w-3 h-3" /> live
              </span>
            )}
          </p>
        </div>
        <button className="v3-btn-primary" data-testid="add-brand-btn">
          <Plus className="w-4 h-4" /> Add Brand
        </button>
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
              className={`text-[11px] px-3 py-1 rounded transition-colors ${trackFilter === t.k ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#8A8A8A]'}`}
              data-testid={`crm-track-${t.k}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSortBy(sortBy === 'score' ? 'name' : 'score')}
          className="v3-btn-secondary"
          data-testid="crm-sort"
        >
          <ArrowUpDown className="w-3.5 h-3.5" /> {sortBy === 'score' ? 'By Score' : 'A–Z'}
        </button>
      </div>

      {/* Brand list */}
      <div className="space-y-2">
        {filtered.map((brand) => {
          const projects = getProjectsForBrand(brand.id);
          const tp = trackPill(brand.engagementTrack);
          return (
            <button
              key={brand.id}
              onClick={() => navigate(`/v3/admin/crm/${brand.id}`)}
              className="w-full v3-card p-4 text-left flex items-center gap-4 hover:border-[#D4CDBF] transition-colors group"
              data-testid={`crm-brand-${brand.id}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${scoreColor(brand.leadScore)}12`, border: `1.5px solid ${scoreColor(brand.leadScore)}30` }}
              >
                <span
                  className="text-[11px] font-bold"
                  style={{ color: scoreColor(brand.leadScore), fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {brand.leadScore}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-medium text-[#1A1A1A]">{brand.company}</span>
                  <span className="text-[10px] text-[#8A8A8A] px-2 py-0.5 rounded bg-[#F4F2EC]">{brand.industry}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: tp.bg, color: tp.fg }} data-testid={`crm-track-pill-${brand.id}`}>
                    {tp.label}
                  </span>
                </div>
                <p className="text-[12px] text-[#8A8A8A] mt-0.5">
                  {brand.primaryContact} — {brand.role}
                </p>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                {projects.length > 0 && (
                  <span className="text-[11px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">
                    {projects.length} project{projects.length > 1 ? 's' : ''}
                  </span>
                )}
                <span className="text-[10px] text-[#8A8A8A]">{brand.lastInteraction}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default V3AdminCRM;
