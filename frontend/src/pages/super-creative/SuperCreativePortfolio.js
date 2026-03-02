import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/shared/Avatar';
import { Star, MapPin, Music, Globe, ExternalLink, Edit, Camera, Users, TrendingUp } from 'lucide-react';

const projects = [
  { id: 1, title: 'Don Jazzy x Cadbury Brand Campaign', type: 'Brand Activation', year: '2026' },
  { id: 2, title: 'Mavin Concert Tour 2025', type: 'Live Events', year: '2025' },
  { id: 3, title: 'Johnnie Walker — Walk With Giants', type: 'Brand Ambassador', year: '2025' },
  { id: 4, title: 'UBA Foundation Charity Series', type: 'Content Production', year: '2025' },
  { id: 5, title: 'Beat FM New Year Concert', type: 'Live Events', year: '2025' },
  { id: 6, title: 'Pepsi Refresh Your World', type: 'Brand Campaign', year: '2024' }
];

const artists = [
  { name: 'Don Jazzy', role: 'Lead', projects: 35, rating: 4.8 },
  { name: 'Rema', role: 'Artist', projects: 10, rating: 4.8 },
  { name: 'Ayra Starr', role: 'Artist', projects: 8, rating: 4.7 },
  { name: 'Crayon', role: 'Artist', projects: 6, rating: 4.6 },
  { name: 'Boy Spyce', role: 'Artist', projects: 4, rating: 4.5 }
];

const reviews = [
  { id: 1, name: 'Guinness Nigeria', rating: 5, text: 'Mavin Records delivered an incredible campaign. Don Jazzy\'s vision is unmatched.', date: '1 month ago' },
  { id: 2, name: 'MTN Nigeria', rating: 5, text: 'Professional from start to finish. The concert was world-class.', date: '2 months ago' },
  { id: 3, name: 'Cadbury Nigeria', rating: 4, text: 'Great work on the brand activation. Minor timeline delays but excellent output.', date: '3 months ago' }
];

export const SuperCreativePortfolio = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sc-portfolio">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-white/50 text-sm">Public profile at teams.tasck.app/{user?.name?.toLowerCase().replace(/\s+/g, '-') || 'mavin-records'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Preview</button>
          <button className="btn-primary flex items-center gap-2"><Edit className="w-4 h-4" /> Edit</button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="dashboard-card p-8">
        <div className="flex items-start gap-6">
          <div className="relative">
            <Avatar name={user?.name || 'Mavin Records'} size="xl" className="w-24 h-24" />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2F55FF] rounded-full flex items-center justify-center text-white">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{user?.name || 'MAVIN RECORDS'}</h2>
            <p className="text-white/60 text-lg">Nigeria's Premier Music Label & Creative Agency</p>
            <p className="text-[#6BFF9A] mt-1">"We don't just make music. We build culture."</p>

            <div className="flex items-center gap-6 mt-4 text-sm text-white/50">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Lagos, Nigeria</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-[#FFA502]" /> 4.8 Rating</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> 5 Artists</span>
              <span>35 Projects Completed</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">35</p>
            <p className="text-white/40 text-sm">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#FFA502]">4.8</p>
            <p className="text-white/40 text-sm">Avg Rating</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white font-mono">₦450M+</p>
            <p className="text-white/40 text-sm">Total Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#6BFF9A]">94%</p>
            <p className="text-white/40 text-sm">On-Time Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">12+</p>
            <p className="text-white/40 text-sm">Years Active</p>
          </div>
        </div>
      </div>

      {/* Team */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Team Roster</h2>
        <div className="grid grid-cols-5 gap-4">
          {artists.map((artist) => (
            <div key={artist.name} className="text-center bg-white/5 rounded-lg p-4">
              <Avatar name={artist.name} size="lg" className="mx-auto mb-2" />
              <p className="text-white font-medium text-sm">{artist.name}</p>
              <p className="text-white/40 text-xs">{artist.role}</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <Star className="w-3 h-3 text-[#FFA502]" />
                <span className="text-white/50 text-xs">{artist.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Projects */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Featured Projects</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="group cursor-pointer">
              <div className="aspect-video bg-gradient-to-br from-[#2F55FF]/30 to-[#6BFF9A]/20 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                <Music className="w-8 h-8 text-white/20" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-white text-sm font-medium">{project.title}</p>
              <p className="text-white/40 text-xs">{project.type} | {project.year}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Client Reviews</h2>
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar name={review.name} size="sm" />
                  <span className="text-white font-medium">{review.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array(review.rating).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#FFA502] fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-white/70 text-sm">"{review.text}"</p>
              <p className="text-white/30 text-xs mt-2">{review.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperCreativePortfolio;
