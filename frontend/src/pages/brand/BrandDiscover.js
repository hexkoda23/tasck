import React, { useState } from 'react';
import Avatar from '../../components/shared/Avatar';
import { Search, Filter, Star, MapPin, Sparkles, ArrowRight, Music, Camera, Film, Palette } from 'lucide-react';

const talents = [
  { id: 1, name: 'Burna Boy (Spaceship)', type: 'Super Creative', category: 'Music', rating: 4.9, projects: 22, location: 'Lagos', match: 96, tags: ['Afrobeats', 'Global Reach', 'Brand Activations'], rate: '₦15M+/campaign', image: null },
  { id: 2, name: 'Wizkid (Starboy)', type: 'Super Creative', category: 'Music', rating: 4.9, projects: 19, location: 'Lagos', match: 94, tags: ['Afrobeats', 'Fashion', 'Premium Brands'], rate: '₦12M+/campaign', image: null },
  { id: 3, name: 'Don Jazzy (Mavin)', type: 'Super Creative', category: 'Music/Production', rating: 4.8, projects: 35, location: 'Lagos', match: 92, tags: ['Music Production', 'Social Media', 'Entertainment'], rate: '₦8M+/campaign', image: null },
  { id: 4, name: 'Tems (Leading Vibes)', type: 'Super Creative', category: 'Music', rating: 4.9, projects: 12, location: 'Lagos', match: 91, tags: ['R&B', 'Global', 'Luxury Brands'], rate: '₦10M+/campaign', image: null },
  { id: 5, name: 'Kelechi Amadi-Obi', type: 'Creative', category: 'Photography', rating: 4.9, projects: 14, location: 'Lagos', match: 88, tags: ['Portrait', 'Editorial', 'Commercial'], rate: '₦350K/day', image: null },
  { id: 6, name: 'Davido (DMW)', type: 'Super Creative', category: 'Music', rating: 4.8, projects: 28, location: 'Lagos/Atlanta', match: 87, tags: ['Afrobeats', 'Entertainment', 'Events'], rate: '₦20M+/campaign', image: null },
  { id: 7, name: 'Ayra Starr (Mavin Talent)', type: 'Super Creative', category: 'Music', rating: 4.7, projects: 8, location: 'Lagos', match: 86, tags: ['GenZ', 'Fashion', 'Beauty'], rate: '₦5M+/campaign', image: null },
  { id: 8, name: 'Ade Adesanya', type: 'Creative', category: 'Videography', rating: 4.8, projects: 11, location: 'Lagos', match: 84, tags: ['Music Videos', 'Commercials', 'Documentary'], rate: '₦500K/day', image: null },
  { id: 9, name: 'Rema', type: 'Super Creative', category: 'Music', rating: 4.8, projects: 10, location: 'Lagos', match: 82, tags: ['Afrorave', 'Youth', 'Tech Brands'], rate: '₦8M+/campaign', image: null },
  { id: 10, name: 'Chidinma Okafor', type: 'Creative', category: 'Graphic Design', rating: 4.7, projects: 9, location: 'Lagos', match: 80, tags: ['Branding', 'Digital', 'Print'], rate: '₦200K/project', image: null }
];

const categories = [
  { icon: Music, label: 'Music Artists', count: 10 },
  { icon: Camera, label: 'Photographers', count: 8 },
  { icon: Film, label: 'Videographers', count: 6 },
  { icon: Palette, label: 'Designers', count: 12 }
];

export const BrandDiscover = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const getMatchColor = (match) => {
    if (match >= 90) return 'text-[#6BFF9A]';
    if (match >= 80) return 'text-[#2F55FF]';
    return 'text-[#FFA502]';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="brand-discover">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Discover Talent</h1>
          <p className="text-white/50 text-sm">AI-curated talent recommendations for your brand</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#6BFF9A]">
          <Sparkles className="w-4 h-4" />
          Personalized for Guinness Nigeria
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-4 gap-4">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <button key={cat.label} className="dashboard-card p-4 hover:border-[#2F55FF]/30 transition-colors text-left">
              <Icon className="w-6 h-6 text-[#2F55FF] mb-2" />
              <p className="text-white font-medium">{cat.label}</p>
              <p className="text-white/40 text-sm">{cat.count} available</p>
            </button>
          );
        })}
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, skill, or genre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none"
        >
          <option value="all">All Categories</option>
          <option value="music">Music</option>
          <option value="photography">Photography</option>
          <option value="video">Videography</option>
          <option value="design">Design</option>
        </select>
        <select className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none">
          <option>Sort by: AI Match</option>
          <option>Sort by: Rating</option>
          <option>Sort by: Projects</option>
        </select>
      </div>

      {/* Talent Cards */}
      <div className="space-y-4">
        {talents.map((talent) => (
          <div key={talent.id} className="dashboard-card p-6 hover:border-[#2F55FF]/30 transition-colors" data-testid={`talent-${talent.id}`}>
            <div className="flex items-start gap-6">
              <Avatar name={talent.name} size="lg" />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-white font-semibold text-lg">{talent.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${talent.type === 'Super Creative' ? 'bg-[#FFA502]/20 text-[#FFA502]' : 'bg-[#7C5CFC]/20 text-[#7C5CFC]'}`}>
                    {talent.type}
                  </span>
                  <span className={`text-sm font-mono ${getMatchColor(talent.match)}`}>
                    {talent.match}% match
                  </span>
                </div>
                <p className="text-white/50">{talent.category}</p>

                <div className="flex items-center gap-6 mt-2 text-sm text-white/50">
                  <span className="flex items-center gap-1"><Star className="w-4 h-4 text-[#FFA502]" /> {talent.rating}</span>
                  <span>{talent.projects} projects</span>
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {talent.location}</span>
                  <span className="text-[#6BFF9A] font-mono">{talent.rate}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {talent.tags.map((tag) => (
                    <span key={tag} className="text-xs px-3 py-1 rounded-full bg-white/5 text-white/60">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button className="btn-primary text-sm flex items-center gap-2">
                  Start Deal <ArrowRight className="w-4 h-4" />
                </button>
                <button className="btn-ghost text-sm">View Profile</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BrandDiscover;
