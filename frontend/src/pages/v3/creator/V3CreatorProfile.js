import React from 'react';
import { getCreator } from '../../../lib/v3data';
import { User, MapPin, Music, Globe, Star } from 'lucide-react';

const creatorId = 'creator-rema';

const V3CreatorProfile = () => {
  const creator = getCreator(creatorId);
  if (!creator) return null;

  return (
    <div data-testid="v3-creator-profile">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">PROFILE</p>
      <h1 className="v3-heading text-2xl mb-8" style={{ fontFamily: "'Fraunces', serif" }}>Your Profile</h1>

      <div className="flex gap-8">
        {/* Left — Profile card */}
        <div className="w-[300px] flex-shrink-0">
          <div className="v3-card p-6 text-center mb-5">
            <div className="w-20 h-20 rounded-full bg-[#DDE7E2] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#1F4A3A]">{creator.name[0]}</span>
            </div>
            <h2 className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'Fraunces', serif" }}>{creator.name}</h2>
            <p className="text-[12px] text-[#8A8A8A] mt-1">{creator.genre}</p>
            <span className={`mt-3 inline-flex text-[10px] px-3 py-1 rounded ${creator.tier === 'super' ? 'bg-[#1F4A3A] text-white' : 'bg-[#F4F2EC] text-[#8A8A8A]'}`}>
              {creator.tier === 'super' ? 'Super Creative' : 'Rising'}
            </span>
          </div>

          <div className="v3-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-[#8A8A8A]" />
              <span className="text-[13px] text-[#5C5C5C]">{creator.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <Music className="w-4 h-4 text-[#8A8A8A]" />
              <span className="text-[13px] text-[#5C5C5C]">{creator.genre}</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-[#8A8A8A]" />
              <div className="flex flex-wrap gap-1">
                {creator.platforms.map(p => (
                  <span key={p} className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-2 py-0.5 rounded">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — Details */}
        <div className="flex-1 space-y-5">
          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Bio</h3>
            <p className="text-[14px] text-[#5C5C5C] leading-relaxed">{creator.bio}</p>
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-[#F4F2EC]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Fit Score</p>
                <p className="text-2xl font-semibold text-[#1F4A3A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.fitScore}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F2EC]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Reliability</p>
                <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.reliability}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F2EC]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">On-time Rate</p>
                <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.onTimeRate}%</p>
              </div>
              <div className="p-3 rounded-lg bg-[#F4F2EC]">
                <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider">Brand Satisfaction</p>
                <p className="text-2xl font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.brandSatisfaction}/10</p>
              </div>
            </div>
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Rate Card</h3>
            <p className="text-lg font-semibold text-[#1A1A1A]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{creator.rateCard}</p>
            <p className="text-[11px] text-[#8A8A8A] mt-1">Per campaign (negotiable based on scope)</p>
          </div>

          <div className="v3-card p-5">
            <h3 className="text-[12px] font-semibold text-[#1A1A1A] uppercase tracking-wider mb-3">Brand History</h3>
            <p className="text-[13px] text-[#5C5C5C]">{creator.repeatBrandCount} repeat brand{creator.repeatBrandCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default V3CreatorProfile;
