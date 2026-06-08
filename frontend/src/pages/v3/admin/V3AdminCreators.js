import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v3Creators, getProjectsForCreator } from '../../../lib/v3data';
import { v3CreateCreator, v3GetCreators, v3SearchWebCreators } from '../../../lib/v3api';
import { listStoredDemoCreators, saveStoredDemoCreator } from '../../../lib/v3creatorStore';
import { useV3Resource } from '../../../lib/useV3Resource';
import V3Modal from '../../../components/v3/V3Modal';
import { Search, ArrowUpDown, Plus, Globe2, CheckCircle2, XCircle, Eye, ExternalLink } from 'lucide-react';

const normaliseCreator = (c) => ({
  id: c.id,
  name: c.name || c.full_name || c.handle || 'Unnamed creator',
  tier: c.tier || 'rising',
  genre: c.genre || '',
  location: c.location || '',
  fitScore: c.fitScore ?? c.fit_score ?? 70,
  onTimeRate: c.onTimeRate ?? c.on_time_rate ?? 0,
  brandSatisfaction: c.brandSatisfaction ?? c.brand_satisfaction ?? 0,
  repeatBrandCount: c.repeatBrandCount ?? c.repeat_brand_count ?? 0,
  rateCard: c.rateCard ?? c.rate_card ?? 'TBD',
  reliability: c.reliability ?? 0,
  platforms: Array.isArray(c.platforms)
    ? c.platforms
    : String(c.platforms || '').split(',').map((p) => p.trim()).filter(Boolean),
  bio: c.bio || c.notes || c.audience || 'Creator profile is ready for admin review.',
  notes: c.notes || c.bio || '',
  audience: c.audience || '',
  managerName: c.managerName || c.manager_name || '',
  managerEmail: c.managerEmail || c.manager_email,
  email: c.email,
  phone: c.phone,
  categories: Array.isArray(c.categories) ? c.categories : [],
  pastBrandWork: Array.isArray(c.pastBrandWork) ? c.pastBrandWork : Array.isArray(c.past_brand_work) ? c.past_brand_work : [],
  sourceLinks: Array.isArray(c.sourceLinks) ? c.sourceLinks : Array.isArray(c.source_links) ? c.source_links : [],
  discoveryNotes: c.discoveryNotes || c.discovery_notes || '',
  pipelineStatus: c.pipeline_status || 'approved',
  source: c.source || 'roster',
});

const demoDiscoveredCreators = [
  {
    id: 'creator-web-culture.lens.studio',
    name: 'Culture Lens Studio',
    tier: 'discovered',
    genre: 'Director / culture storyteller',
    location: 'Lagos',
    fit_score: 88,
    reliability: 7.4,
    platforms: ['YouTube', 'Instagram'],
    email: 'hello@culture.lens.studio.demo',
    manager_name: 'Public contact',
    manager_email: 'hello@culture.lens.studio.demo',
    audience: 'Youth culture, documentary, fashion, and music communities across Lagos and Abuja.',
    categories: ['Culture film', 'Music storytelling', 'Documentary'],
    rate_card: 'TBD. Outreach required',
    source: 'web_discovery_simulated',
    source_links: ['culturelens.example/portfolio', 'instagram.com/culturelensstudio'],
    discovery_notes: 'Found through public portfolio pages and campaign credits for music-led short films.',
    pipeline_status: 'pending_review',
  },
  {
    id: 'creator-web-pulse.street.collective',
    name: 'Pulse Street Collective',
    tier: 'discovered',
    genre: 'Street culture creators',
    location: 'Lagos / Port Harcourt',
    fit_score: 86,
    reliability: 7.2,
    platforms: ['TikTok', 'Instagram'],
    email: 'hello@pulse.street.collective.demo',
    manager_name: 'Public contact',
    manager_email: 'hello@pulse.street.collective.demo',
    audience: 'Gen-Z streetwear, campus culture, nightlife, and dance communities.',
    categories: ['Streetwear', 'Dance', 'Campus culture'],
    rate_card: 'TBD. Outreach required',
    source: 'web_discovery_simulated',
    source_links: ['tiktok.com/@pulsestreetcollective', 'instagram.com/pulsestreet'],
    discovery_notes: 'High short-form velocity and frequent collaborations with emerging event promoters.',
    pipeline_status: 'pending_review',
  },
  {
    id: 'creator-web-signal.social.lab',
    name: 'Signal Social Lab',
    tier: 'discovered',
    genre: 'Social-first creator studio',
    location: 'Remote / Nigeria',
    fit_score: 84,
    reliability: 7.1,
    platforms: ['TikTok', 'X', 'Instagram'],
    email: 'hello@signal.social.lab.demo',
    manager_name: 'Public contact',
    manager_email: 'hello@signal.social.lab.demo',
    audience: 'Digital-native audiences interested in memes, tech, creator economy, and social commentary.',
    categories: ['Social campaigns', 'Meme culture', 'Creator economy'],
    rate_card: 'TBD. Outreach required',
    source: 'web_discovery_simulated',
    source_links: ['signalsocial.example/case-studies', 'x.com/signalsociallab'],
    discovery_notes: 'Discovered from public case studies and viral social campaign threads.',
    pipeline_status: 'pending_review',
  },
  {
    id: 'creator-web-campus.plug.ng',
    name: 'Campus Plug NG',
    tier: 'discovered',
    genre: 'Campus culture network',
    location: 'Lagos / Ibadan / Benin',
    fit_score: 82,
    reliability: 7.0,
    platforms: ['TikTok', 'Instagram', 'WhatsApp'],
    email: 'hello@campus.plug.ng.demo',
    manager_name: 'Public contact',
    manager_email: 'hello@campus.plug.ng.demo',
    audience: 'Students, young creators, campus entertainment pages, and youth communities.',
    categories: ['Campus activation', 'Youth conversion', 'Event amplification'],
    rate_card: 'TBD. Outreach required',
    source: 'web_discovery_simulated',
    source_links: ['instagram.com/campusplugng', 'campusplug.example/media-kit'],
    discovery_notes: 'Public media kit signals useful reach for youth conversion and campus activation briefs.',
    pipeline_status: 'pending_review',
  },
];

const toCreatePayload = (creator) => ({
  name: creator.name,
  tier: creator.tier === 'discovered' ? 'rising' : creator.tier,
  genre: creator.genre,
  location: creator.location || 'Nigeria',
  email: creator.email,
  manager_name: creator.managerName || creator.manager_name,
  manager_email: creator.managerEmail || creator.manager_email,
  phone: creator.phone,
  rate_card: creator.rateCard || creator.rate_card || 'TBD',
  platforms: creator.platforms || [],
  audience: creator.audience,
  categories: creator.categories || [],
  past_brand_work: creator.pastBrandWork || creator.past_brand_work || [],
  notes: creator.discoveryNotes || creator.discovery_notes || creator.notes || creator.bio,
  source: 'web_discovery_approved',
  source_links: creator.sourceLinks || creator.source_links || [],
  discovery_notes: creator.discoveryNotes || creator.discovery_notes || '',
  pipeline_status: 'approved',
});

const toStoredCreator = (creator, created) => {
  const payload = toCreatePayload(creator);
  return normaliseCreator({
    ...creator,
    ...created,
    ...payload,
    id: created?.id || creator.id,
    source: 'web_discovery_approved',
    pipeline_status: 'approved',
    fit_score: creator.fitScore ?? creator.fit_score ?? created?.fit_score ?? 82,
    reliability: creator.reliability ?? created?.reliability ?? 7.2,
    on_time_rate: creator.onTimeRate ?? creator.on_time_rate ?? created?.on_time_rate ?? 0,
    brand_satisfaction: creator.brandSatisfaction ?? creator.brand_satisfaction ?? created?.brand_satisfaction ?? 0,
    repeat_brand_count: creator.repeatBrandCount ?? creator.repeat_brand_count ?? created?.repeat_brand_count ?? 0,
  });
};

const V3AdminCreators = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('fitScore');
  const [addOpen, setAddOpen] = useState(false);
  const [webOpen, setWebOpen] = useState(false);
  const [webLoading, setWebLoading] = useState(false);
  const [discoveredCreators, setDiscoveredCreators] = useState([]);
  const [selectedDiscovery, setSelectedDiscovery] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    tier: 'rising',
    genre: '',
    location: 'Lagos',
    manager_name: '',
    manager_email: '',
    email: '',
    rate_card: '',
    platforms: '',
    audience: '',
    notes: '',
  });

  const { data, source, setData } = useV3Resource(() => v3GetCreators(), v3Creators);
  const creatorList = Array.isArray(data) ? data : [];
  const storedCreators = listStoredDemoCreators();
  const mergedCreatorMap = new Map();
  [...creatorList, ...storedCreators].forEach((creator) => {
    if (creator?.id) mergedCreatorMap.set(creator.id, creator);
  });
  const mergedCreatorList = Array.from(mergedCreatorMap.values());
  const creators = mergedCreatorList.map(normaliseCreator);

  const filtered = creators
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.genre.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'fitScore') return b.fitScore - a.fitScore;
      if (sortBy === 'reliability') return b.reliability - a.reliability;
      return a.name.localeCompare(b.name);
    });

  const tierColor = (tier) => tier === 'super' ? { bg: '#1F4A3A', text: 'white' } : { bg: '#F4F2EC', text: '#9B9380' };
  const scoreGrade = (score) => score >= 9 ? 'A+' : score >= 8.5 ? 'A' : score >= 8 ? 'B+' : score >= 7 ? 'B' : 'C';

  const runWebCreatorSearch = async () => {
    setWebOpen(true);
    setWebLoading(true);
    try {
      const result = await v3SearchWebCreators({
        query: 'Nigerian creators influencers celebrities culture studios brand campaign',
        limit: 6,
        auto_store: false,
      });
      const next = Array.isArray(result.creators) && result.creators.length ? result.creators : demoDiscoveredCreators;
      setDiscoveredCreators(next.map((creator) => ({
        ...normaliseCreator(creator),
        pipelineStatus: creator.pipeline_status || 'pending_review',
      })));
    } catch (e) {
      setDiscoveredCreators(demoDiscoveredCreators.map((creator) => ({
        ...normaliseCreator(creator),
        pipelineStatus: 'pending_review',
      })));
    } finally {
      setWebLoading(false);
    }
  };

  const rejectDiscoveredCreator = (creatorId) => {
    setDiscoveredCreators((current) => current.map((creator) =>
      creator.id === creatorId ? { ...creator, pipelineStatus: 'rejected' } : creator
    ));
    if (selectedDiscovery?.id === creatorId) {
      setSelectedDiscovery({ ...selectedDiscovery, pipelineStatus: 'rejected' });
    }
  };

  const approveDiscoveredCreator = async (creator) => {
    setSubmitting(true);
    try {
      let created = null;
      try {
        created = await v3CreateCreator(toCreatePayload(creator));
        try {
          const updated = await v3GetCreators();
          setData(updated);
        } catch (e) {
          setData((current) => [...(Array.isArray(current) ? current : []), created]);
        }
      } catch (e) {
        created = toStoredCreator(creator);
        setData((current) => [...(Array.isArray(current) ? current : []), created]);
      }
      const stored = toStoredCreator(creator, created);
      saveStoredDemoCreator(stored);
      setDiscoveredCreators((current) => current.map((item) =>
        item.id === creator.id ? { ...item, pipelineStatus: 'approved', approvedAt: new Date().toISOString() } : item
      ));
      if (selectedDiscovery?.id === creator.id) {
        setSelectedDiscovery({ ...creator, pipelineStatus: 'approved', approvedAt: new Date().toISOString() });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div data-testid="v3-admin-creators">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">ROSTER</p>
          <h1 className="v3-heading text-2xl" style={{ fontFamily: "'Fraunces', serif" }}>Creators</h1>
          <p className="text-[#8A8A8A] text-sm">
            {creators.length} creators &middot; {creators.filter(c => c.tier === 'super').length} super &middot; {creators.filter(c => c.tier === 'rising').length} rising
            {source === 'api' && <span className="ml-2 text-[10px] text-[#1F4A3A] bg-[#DDE7E2] px-2 py-0.5 rounded">live</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runWebCreatorSearch} className="v3-btn-secondary" data-testid="creator-search-web-btn">
            <Globe2 className="w-4 h-4" /> Search web
          </button>
          <button onClick={() => setAddOpen(true)} className="v3-btn-primary" data-testid="add-creator-btn">
            <Plus className="w-4 h-4" /> Add Creator
          </button>
        </div>
      </div>

      {webOpen && (
        <div className="v3-card p-5 mb-6 border-[#1F4A3A]" data-testid="creator-web-discovery-panel">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-[#8A8A8A] mb-1">Web creator discovery</p>
              <h2 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>
                Scraped creators pending admin review
              </h2>
              <p className="text-[12px] text-[#6E6657] mt-1">
                Review public creator profiles discovered from compliant demo sources. Approved profiles are saved into the admin creator database; rejected profiles stay out of the roster.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={runWebCreatorSearch} disabled={webLoading} className="v3-btn-secondary text-[11px]" data-testid="creator-refresh-web-search">
                <Search className="w-3.5 h-3.5" /> {webLoading ? 'Searching...' : 'Refresh'}
              </button>
              <button onClick={() => setWebOpen(false)} className="v3-btn-secondary text-[11px]">
                Hide
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(webLoading && discoveredCreators.length === 0 ? demoDiscoveredCreators.map(normaliseCreator) : discoveredCreators).map((creator) => {
              const status = creator.pipelineStatus || 'pending_review';
              return (
                <div key={creator.id} className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4" data-testid={`creator-web-card-${creator.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">{creator.name}</p>
                      <p className="text-[11px] text-[#8A8A8A]">{creator.genre} &middot; {creator.location}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded uppercase tracking-wider ${
                      status === 'approved' ? 'bg-[#DDE7E2] text-[#1F4A3A]' :
                      status === 'rejected' ? 'bg-[#F5D9D2] text-[#B54A37]' :
                      'bg-[#F4F2EC] text-[#6E6657]'
                    }`}>
                      {status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6E6657] leading-relaxed mt-3 line-clamp-2">{creator.audience || creator.bio}</p>
                  <div className="grid grid-cols-3 gap-2 my-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Fit</p>
                      <p className="text-[12px] font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.fitScore}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Rate</p>
                      <p className="text-[12px] font-semibold text-[#1A1A1A] truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.rateCard}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Source</p>
                      <p className="text-[12px] font-semibold text-[#7A5F23]">Web</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {creator.platforms.slice(0, 4).map((platform) => (
                      <span key={platform} className="text-[9px] bg-white border border-[#E8E4DB] text-[#6E6657] rounded px-1.5 py-0.5">{platform}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedDiscovery(creator)} className="v3-btn-secondary text-[11px]" data-testid={`creator-web-view-${creator.id}`}>
                      <Eye className="w-3.5 h-3.5" /> View details
                    </button>
                    <button
                      onClick={() => approveDiscoveredCreator(creator)}
                      disabled={submitting || status === 'approved'}
                      className="v3-btn-primary text-[11px]"
                      data-testid={`creator-web-approve-${creator.id}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => rejectDiscoveredCreator(creator.id)}
                      disabled={status === 'approved' || status === 'rejected'}
                      className="v3-btn-secondary text-[11px]"
                      data-testid={`creator-web-reject-${creator.id}`}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search creators or genres..."
            className="w-full pl-10 pr-4 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white focus:outline-none focus:border-[#1F4A3A] transition-colors"
            data-testid="creator-search" />
        </div>
        <button onClick={() => setSortBy(sortBy === 'fitScore' ? 'reliability' : sortBy === 'reliability' ? 'name' : 'fitScore')}
          className="v3-btn-secondary" data-testid="creator-sort">
          <ArrowUpDown className="w-3.5 h-3.5" /> {sortBy === 'fitScore' ? 'By Fit' : sortBy === 'reliability' ? 'By Reliability' : 'A–Z'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map(c => {
          const projects = getProjectsForCreator(c.id);
          const tc = tierColor(c.tier);
          return (
            <button key={c.id} onClick={() => navigate(`/v3/admin/creators/${c.id}`)}
              className="v3-card p-5 text-left hover:border-[#D4CDBF] transition-all hover:shadow-sm group" data-testid={`creator-${c.id}`}>
              {/* Header */}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                  style={{ background: tc.bg === '#1F4A3A' ? '#DDE7E2' : '#F4F2EC', color: tc.bg === '#1F4A3A' ? '#1F4A3A' : '#9B9380' }}>
                  {c.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-[#1A1A1A]">{c.name}</h3>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: tc.bg, color: tc.text }}>{c.tier === 'super' ? 'Super Creative' : 'Rising'}</span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5">{c.genre} &middot; {c.location}</p>
                  {c.source !== 'roster' && <p className="text-[9px] text-[#C49B5F] mt-1 uppercase tracking-wider">{c.source.replace(/_/g, ' ')}</p>}
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#F4F2EC] flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[14px] font-bold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.fitScore}</span>
                  <span className="text-[7px] text-[#8A8A8A] uppercase">Fit</span>
                </div>
              </div>

              {/* Bio snippet */}
              <p className="text-[11px] text-[#8A8A8A] leading-relaxed mb-4 line-clamp-2">{c.bio}</p>

              {/* Metrics row */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                {[
                  { label: 'Reliability', value: c.reliability, grade: scoreGrade(c.reliability) },
                  { label: 'On-time', value: `${c.onTimeRate}%`, grade: null },
                  { label: 'Satisfaction', value: c.brandSatisfaction, grade: scoreGrade(c.brandSatisfaction) },
                  { label: 'Repeats', value: c.repeatBrandCount, grade: null },
                  { label: 'Projects', value: projects.length, grade: null },
                ].map((m, i) => (
                  <div key={i} className="text-center p-1.5 rounded-md bg-[#FAFAF7]">
                    <p className="text-[13px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</p>
                    <p className="text-[8px] text-[#8A8A8A] uppercase tracking-wider mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Rate card + platforms */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F4F2EC]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-[#8A8A8A]">Rate:</span>
                  <span className="text-[11px] text-[#1A1A1A] font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.rateCard}</span>
                </div>
                <div className="flex gap-1">
                  {c.platforms.slice(0, 3).map(p => (
                    <span key={p} className="text-[8px] text-[#8A8A8A] bg-[#F4F2EC] px-1.5 py-0.5 rounded">{p}</span>
                  ))}
                  {c.platforms.length > 3 && (
                    <span className="text-[8px] text-[#8A8A8A] bg-[#F4F2EC] px-1.5 py-0.5 rounded">+{c.platforms.length - 3}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
    <V3Modal
      open={!!selectedDiscovery}
      onClose={() => setSelectedDiscovery(null)}
      title={selectedDiscovery?.name || 'Discovered creator'}
      subtitle="Web-discovered profile details for admin review before approving into the creator database."
      testid="creator-web-detail-modal"
      wide
      footer={
        selectedDiscovery && (
          <>
            <button onClick={() => setSelectedDiscovery(null)} className="v3-btn-secondary">Close</button>
            <button
              onClick={() => rejectDiscoveredCreator(selectedDiscovery.id)}
              disabled={selectedDiscovery.pipelineStatus === 'approved' || selectedDiscovery.pipelineStatus === 'rejected'}
              className="v3-btn-secondary"
              data-testid="creator-web-detail-reject"
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
            <button
              onClick={() => approveDiscoveredCreator(selectedDiscovery)}
              disabled={submitting || selectedDiscovery.pipelineStatus === 'approved'}
              className="v3-btn-primary"
              data-testid="creator-web-detail-approve"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve into database
            </button>
          </>
        )
      }
    >
      {selectedDiscovery && (
        <div className="grid grid-cols-[1fr_300px] gap-5">
          <div className="space-y-4">
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Discovery notes</p>
              <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{selectedDiscovery.discoveryNotes || selectedDiscovery.bio}</p>
            </div>
            <div className="rounded border border-[#E8E4DB] bg-white p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Audience fit</p>
              <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{selectedDiscovery.audience || 'Audience details to be confirmed by admin outreach.'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-[#E8E4DB] bg-white p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Contact</p>
                <p className="text-[13px] text-[#1A1A1A]">{selectedDiscovery.managerName || 'Public contact'}</p>
                <p className="text-[12px] text-[#6E6657]">{selectedDiscovery.managerEmail || selectedDiscovery.email || 'No email yet'}</p>
              </div>
              <div className="rounded border border-[#E8E4DB] bg-white p-4">
                <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-1">Commercial</p>
                <p className="text-[13px] text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedDiscovery.rateCard}</p>
                <p className="text-[12px] text-[#6E6657]">Final fee to confirm during outreach.</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Profile signals</p>
              {[
                ['Fit score', selectedDiscovery.fitScore],
                ['Reliability', selectedDiscovery.reliability],
                ['Location', selectedDiscovery.location],
                ['Specialty', selectedDiscovery.genre],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-[#E8E4DB] py-2 text-[12px] last:border-0">
                  <span className="text-[#8A8A8A]">{label}</span>
                  <span className="text-[#1A1A1A] text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="rounded border border-[#E8E4DB] bg-[#FAFAF7] p-4">
              <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A] mb-2">Source links</p>
              {(selectedDiscovery.sourceLinks || []).map((link) => (
                <p key={link} className="text-[12px] text-[#1F4A3A] mb-1 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> {link}
                </p>
              ))}
              {(selectedDiscovery.sourceLinks || []).length === 0 && <p className="text-[12px] text-[#8A8A8A]">No public source link captured.</p>}
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedDiscovery.platforms.map((platform) => (
                <span key={platform} className="text-[10px] bg-[#F4F2EC] text-[#6E6657] rounded px-2 py-1">{platform}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </V3Modal>
    <V3Modal
      open={addOpen}
      onClose={() => setAddOpen(false)}
      title="Add Creator"
      subtitle="Capture contact, manager, fit, and commercial details for the creator pipeline."
      testid="add-creator-modal"
      footer={
        <>
          <button onClick={() => setAddOpen(false)} className="v3-btn-secondary">Cancel</button>
          <button
            onClick={async () => {
              if (!form.name || !form.genre) return;
              setSubmitting(true);
              try {
                await v3CreateCreator({
                  ...form,
                  platforms: form.platforms.split(',').map((p) => p.trim()).filter(Boolean),
                  rate_card: form.rate_card || 'TBD',
                });
                const updated = await v3GetCreators();
                setData(updated);
                setAddOpen(false);
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting}
            className="v3-btn-primary"
            data-testid="add-creator-submit"
          >
            {submitting ? 'Saving...' : 'Save Creator'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {[
          ['name', 'Name'],
          ['genre', 'Genre / specialty'],
          ['location', 'Location'],
          ['manager_name', 'Manager / POC'],
          ['manager_email', 'Manager email'],
          ['email', 'Creator email'],
          ['rate_card', 'Rate card'],
          ['platforms', 'Platforms (comma separated)'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">{label}</label>
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
              data-testid={`add-creator-${key}`}
            />
          </div>
        ))}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Tier</label>
          <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white">
            <option value="rising">Rising</option>
            <option value="super">Super Creative</option>
            <option value="specialist">Specialist</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[11px] uppercase tracking-wider text-[#8A8A8A] block mb-1">Audience / notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 text-[13px] rounded-lg border border-[#E8E4DB] bg-white"
          />
        </div>
      </div>
    </V3Modal>
    </>
  );
};
export default V3AdminCreators;
