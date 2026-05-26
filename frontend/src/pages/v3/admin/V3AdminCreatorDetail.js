import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v3Creators, v3Projects, v3Stages, getBrand, getRM, formatNairaV3 } from '../../../lib/v3data';
import { v3GetCreator } from '../../../lib/v3api';
import { getStoredDemoCreator } from '../../../lib/v3creatorStore';
import { ChevronLeft, MapPin, Music, Globe, Star, FolderOpen } from 'lucide-react';

const normaliseCreator = (creator) => creator ? ({
  ...creator,
  name: creator.name || creator.full_name || creator.handle || 'Unnamed creator',
  tier: creator.tier || 'rising',
  genre: creator.genre || '',
  location: creator.location || '',
  fitScore: creator.fitScore ?? creator.fit_score ?? 70,
  onTimeRate: creator.onTimeRate ?? creator.on_time_rate ?? 0,
  brandSatisfaction: creator.brandSatisfaction ?? creator.brand_satisfaction ?? 0,
  repeatBrandCount: creator.repeatBrandCount ?? creator.repeat_brand_count ?? 0,
  rateCard: creator.rateCard ?? creator.rate_card ?? 'TBD',
  reliability: creator.reliability ?? 0,
  platforms: Array.isArray(creator.platforms)
    ? creator.platforms
    : String(creator.platforms || '').split(',').map((p) => p.trim()).filter(Boolean),
  bio: creator.bio || creator.notes || creator.audience || 'Creator profile is ready for admin review.',
  managerName: creator.managerName || creator.manager_name || '',
  managerEmail: creator.managerEmail || creator.manager_email || creator.email || '',
  sourceLinks: Array.isArray(creator.sourceLinks) ? creator.sourceLinks : Array.isArray(creator.source_links) ? creator.source_links : [],
  discoveryNotes: creator.discoveryNotes || creator.discovery_notes || '',
  source: creator.source || 'roster',
}) : null;

const V3AdminCreatorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(() => normaliseCreator(getStoredDemoCreator(id) || v3Creators.find(c => c.id === id)));

  useEffect(() => {
    let mounted = true;
    v3GetCreator(id)
      .then((live) => {
        if (mounted) setCreator(normaliseCreator(live?.creator || live));
      })
      .catch(() => {
        if (mounted) setCreator(normaliseCreator(getStoredDemoCreator(id) || v3Creators.find(c => c.id === id)));
      });
    return () => { mounted = false; };
  }, [id]);

  if (!creator) return <div className="p-8 text-[#8A8A8A]">Creator not found.</div>;

  const projects = v3Projects.filter(p => p.creatorId === id);

  return (
    <div data-testid="v3-creator-detail">
      <button onClick={() => navigate('/v3/admin/creators')} className="inline-flex items-center gap-1.5 text-[#8A8A8A] text-[12px] mb-6 hover:text-[#5C5C5C]">
        <ChevronLeft className="w-3.5 h-3.5" /> All creators
      </button>

      <div className="flex gap-8">
        {/* Left — Profile */}
        <div className="w-[280px] flex-shrink-0 space-y-5">
          <div className="v3-card p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-[#DDE7E2] flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-[#1F4A3A]">{creator.name[0]}</span>
            </div>
            <h1 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{creator.name}</h1>
            <p className="text-[12px] text-[#8A8A8A] mt-1">{creator.genre}</p>
            <span className={`mt-3 inline-flex text-[10px] px-3 py-1 rounded ${creator.tier === 'super' ? 'bg-[#1F4A3A] text-white' : 'bg-[#F4F2EC] text-[#8A8A8A]'}`}>
              {creator.tier === 'super' ? 'Super Creative' : 'Rising'}
            </span>
          </div>

          <div className="v3-card p-4 space-y-3 text-[12px]">
            <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-[#8A8A8A]" /><span className="text-[#5C5C5C]">{creator.location}</span></div>
            <div className="flex items-center gap-2"><Music className="w-3.5 h-3.5 text-[#8A8A8A]" /><span className="text-[#5C5C5C]">{creator.genre}</span></div>
            <div className="flex items-start gap-2">
              <Globe className="w-3.5 h-3.5 text-[#8A8A8A] mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {creator.platforms.map(p => <span key={p} className="text-[10px] bg-[#F4F2EC] px-2 py-0.5 rounded text-[#8A8A8A]">{p}</span>)}
              </div>
            </div>
          </div>

          <div className="v3-card p-4">
            <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Rate Card</p>
            <p className="text-[14px] font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.rateCard}</p>
            <p className="text-[10px] text-[#8A8A8A] mt-1">Per campaign (negotiable)</p>
          </div>

          {creator.managerEmail && (
            <div className="v3-card p-4">
              <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-2">Contact</p>
              <p className="text-[13px] text-[#1A1A1A]">{creator.managerName || 'Manager / public contact'}</p>
              <p className="text-[11px] text-[#6E6657]">{creator.managerEmail}</p>
            </div>
          )}
        </div>

        {/* Right — Details */}
        <div className="flex-1 space-y-5">
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Bio</h3>
            <p className="text-[14px] text-[#5C5C5C] leading-relaxed">{creator.bio}</p>
            {creator.discoveryNotes && (
              <p className="text-[12px] text-[#7A5F23] leading-relaxed mt-3">Discovery note: {creator.discoveryNotes}</p>
            )}
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Performance</h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Fit Score', value: creator.fitScore, color: '#1F4A3A' },
                { label: 'Reliability', value: creator.reliability },
                { label: 'On-time', value: `${creator.onTimeRate}%` },
                { label: 'Satisfaction', value: `${creator.brandSatisfaction}/10` },
                { label: 'Repeat Brands', value: creator.repeatBrandCount },
              ].map((m, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#F4F2EC] text-center">
                  <p className="text-xl font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: m.color || '#1A1A1A' }}>{m.value}</p>
                  <p className="text-[10px] text-[#8A8A8A] mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {projects.length > 0 && (
            <div>
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Projects</h3>
              <div className="space-y-2">
                {projects.map(proj => {
                  const brand = getBrand(proj.brandId);
                  const stage = v3Stages.find(s => s.key === proj.stage);
                  return (
                    <button key={proj.id} onClick={() => navigate(`/v3/admin/projects/${proj.id}`)}
                      className="w-full v3-card p-4 text-left flex items-center gap-3 hover:border-[#D4CDBF] transition-colors">
                      <div className="w-2 h-8 rounded-full" style={{ background: stage?.color }} />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium text-[#1A1A1A]">{brand?.company?.split(' ')[0]} — {proj.title}</p>
                        <p className="text-[11px] text-[#8A8A8A]">{stage?.label} &middot; {formatNairaV3(proj.estimatedValue)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {projects.length === 0 && (
            <div className="v3-card p-6 text-center">
              <FolderOpen className="w-5 h-5 text-[#8A8A8A] mx-auto mb-2" />
              <p className="text-[13px] text-[#8A8A8A]">No active projects with this creator.</p>
            </div>
          )}

          {creator.sourceLinks.length > 0 && (
            <div className="v3-card p-5">
              <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Discovery sources</h3>
              <div className="space-y-1">
                {creator.sourceLinks.map((link) => (
                  <p key={link} className="text-[12px] text-[#1F4A3A]">{link}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3AdminCreatorDetail;
