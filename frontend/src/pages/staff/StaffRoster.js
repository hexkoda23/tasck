import React, { useState, useEffect } from 'react';
import { getSuperCreatives } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import { Search, Music, Instagram } from 'lucide-react';

const getGradientClass = (name) => {
  const n = name?.toLowerCase() || '';
  if (n.includes('mavin')) return 'roster-gradient-mavin';
  if (n.includes('spaceship') || n.includes('burna')) return 'roster-gradient-spaceship';
  if (n.includes('dmw') || n.includes('davido')) return 'roster-gradient-dmw';
  if (n.includes('starboy') || n.includes('wizkid')) return 'roster-gradient-starboy';
  if (n.includes('leading') || n.includes('tems')) return 'roster-gradient-leading';
  if (n.includes('ybnl') || n.includes('olamide')) return 'roster-gradient-ybnl';
  return 'roster-gradient-default';
};

export const StaffRoster = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const res = await getSuperCreatives();
        setArtists(res.data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchArtists();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-roster">
      <div>
        <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Roster</h1>
        <p className="text-[#94A3B8] text-sm">Super Creative teams managed by TASCK</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CBD5E1]" />
        <input type="text" placeholder="Search artists..." className="w-full search-bar pl-10 pr-4 py-2.5 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 stagger-children">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="dashboard-card overflow-hidden">
              <div className="skeleton h-20 rounded-none"></div>
              <div className="p-5"><div className="skeleton h-5 w-28 mx-auto mb-2"></div><div className="skeleton h-4 w-20 mx-auto"></div></div>
            </div>
          ))
        ) : (
          artists.map((artist) => (
            <div key={artist.id} className="dashboard-card overflow-hidden cursor-pointer group" data-testid={`artist-card-${artist.id}`}>
              <div className={`${getGradientClass(artist.team_name)} h-20 relative flex items-center justify-center`}>
                <span className="text-white/90 text-xl font-bold tracking-tighter">
                  {(artist.team_name || '').split(/[\s()]+/).filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="p-5">
                <div className="text-center mb-4">
                  <h3 className="text-[#0F172A] font-semibold text-base">{artist.team_name}</h3>
                  <p className="text-[#94A3B8] text-sm">{artist.principal_artist}</p>
                  <span className="inline-block mt-2 text-[11px] text-[#2F55FF] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full">{artist.genre}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[#F8FAFC] rounded-lg p-2.5 text-center">
                    <Music className="w-3.5 h-3.5 text-[#CBD5E1] mx-auto mb-1" />
                    <p className="text-[#475569] text-xs font-mono">{artist.spotify_listeners}</p>
                    <p className="text-[#CBD5E1] text-[10px]">Spotify</p>
                  </div>
                  <div className="bg-[#F8FAFC] rounded-lg p-2.5 text-center">
                    <Instagram className="w-3.5 h-3.5 text-[#CBD5E1] mx-auto mb-1" />
                    <p className="text-[#475569] text-xs font-mono">{artist.instagram_followers}</p>
                    <p className="text-[#CBD5E1] text-[10px]">Instagram</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-center justify-between">
                  <div>
                    <span className="text-[#CBD5E1] text-[10px] uppercase tracking-wider">Brand Value</span>
                    <p className="text-[#2F55FF] text-sm font-mono">{artist.brand_value}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[#CBD5E1] text-[10px] uppercase tracking-wider">Wallet</span>
                    <p className="text-[#0F172A] text-sm font-mono">{formatNaira(artist.wallet_balance, { compact: true })}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffRoster;
