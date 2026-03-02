import React, { useState, useEffect } from 'react';
import { getSuperCreatives } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { 
  Search, 
  Users,
  Music,
  Instagram,
  TrendingUp,
  ExternalLink
} from 'lucide-react';

export const StaffRoster = () => {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const response = await getSuperCreatives();
        setArtists(response.data);
      } catch (error) {
        console.error('Error fetching roster:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-roster">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Roster</h1>
          <p className="text-white/50 text-sm">Super Creative teams managed by TASCK</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input 
          type="text"
          placeholder="Search artists..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
        />
      </div>

      {/* Artists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="dashboard-card p-6">
              <div className="skeleton h-16 w-16 rounded-full mx-auto mb-4"></div>
              <div className="skeleton h-6 w-32 mx-auto mb-2"></div>
              <div className="skeleton h-4 w-24 mx-auto"></div>
            </div>
          ))
        ) : (
          artists.map((artist) => (
            <div 
              key={artist.id}
              className="dashboard-card p-6 hover:border-[#2F55FF]/30 transition-colors cursor-pointer"
              data-testid={`artist-card-${artist.id}`}
            >
              <div className="text-center mb-4">
                <Avatar name={artist.team_name} size="xl" className="mx-auto mb-3" />
                <h3 className="text-white font-semibold">{artist.team_name}</h3>
                <p className="text-white/50 text-sm">{artist.principal_artist}</p>
                <span className="inline-block mt-1 text-xs text-[#6BFF9A] bg-[#6BFF9A]/10 px-2 py-0.5 rounded-full">
                  {artist.genre}
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-white/40 flex items-center gap-1">
                    <Music className="w-3 h-3" /> Spotify
                  </span>
                  <span className="text-white/80">{artist.spotify_listeners}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> Instagram
                  </span>
                  <span className="text-white/80">{artist.instagram_followers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/40 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Brand Value
                  </span>
                  <span className="text-[#6BFF9A]">{artist.brand_value}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Wallet Balance</span>
                  <span className="text-white font-mono">{formatNaira(artist.wallet_balance, { compact: true })}</span>
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
