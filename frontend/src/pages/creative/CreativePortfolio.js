import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/shared/Avatar';
import { Star, MapPin, Instagram, Music, Globe, Mail, Phone, Download, ExternalLink, Camera, Edit } from 'lucide-react';

const portfolioItems = [
  { id: 1, title: 'Don Jazzy x Cadbury Campaign', type: 'Product Photography', year: '2026', image: null },
  { id: 2, title: 'UBA Foundation Series', type: 'Corporate Portraits', year: '2026', image: null },
  { id: 3, title: 'Burna Boy Album Art', type: 'Editorial', year: '2025', image: null },
  { id: 4, title: 'GTBank Fashion Weekend', type: 'Event Coverage', year: '2025', image: null },
  { id: 5, title: 'Tems Promo Shoot', type: 'Artist Portraits', year: '2025', image: null },
  { id: 6, title: 'Pepsi Street Campaign', type: 'Commercial', year: '2025', image: null }
];

const reviews = [
  { id: 1, name: 'Mavin Records', rating: 5, text: 'Kelechi brought a vision we didn\'t know we had. Exceptional work.', date: '2 weeks ago' },
  { id: 2, name: 'UBA Foundation', rating: 5, text: 'Professional, on time, outstanding quality. Highly recommend.', date: '1 month ago' },
  { id: 3, name: 'Leading Vibes (Tems)', rating: 5, text: 'The best photographer in Lagos, period. Every shot was perfect.', date: '2 months ago' }
];

export const CreativePortfolio = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in" data-testid="creative-portfolio">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Portfolio</h1>
          <p className="text-[#64748B] text-sm">Your public profile at creative.tasck.app/{user?.name?.toLowerCase().replace(/\s+/g, '-') || 'kelechi-amadi-obi'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <ExternalLink className="w-4 h-4" /> Preview
          </button>
          <button className="btn-primary flex items-center gap-2">
            <Edit className="w-4 h-4" /> Edit Portfolio
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="dashboard-card p-8">
        <div className="flex items-start gap-6">
          <div className="relative">
            <Avatar name={user?.name} size="xl" className="w-24 h-24" />
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-[#2F55FF] rounded-full flex items-center justify-center text-[#0F172A]">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#0F172A]">{user?.name || 'KELECHI AMADI-OBI'}</h2>
            <p className="text-[#64748B] text-lg">Photographer | Art Director | Visual Storyteller</p>
            <p className="text-[#22C55E] mt-1">"Capturing the soul of African creativity"</p>
            
            <div className="flex items-center gap-6 mt-4 text-sm text-[#64748B]">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Lagos, Nigeria</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-[#D97706]" /> 4.9 Rating</span>
              <span>14 Projects</span>
              <span>₦18.2M Earned</span>
            </div>

            <div className="flex gap-3 mt-4">
              <button className="btn-primary text-sm py-2 px-4">Hire via TASCK</button>
              <button className="btn-secondary text-sm py-2 px-4">Download Media Kit</button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6 pt-6 border-t border-[#E2E8F0]">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0F172A]">14</p>
            <p className="text-[#94A3B8] text-sm">Projects</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#D97706]">4.9</p>
            <p className="text-[#94A3B8] text-sm">Avg Rating</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0F172A] font-mono">₦18.2M</p>
            <p className="text-[#94A3B8] text-sm">Total Earned</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#22C55E]">97%</p>
            <p className="text-[#94A3B8] text-sm">Reliability</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-[#0F172A]">6+</p>
            <p className="text-[#94A3B8] text-sm">Years Exp</p>
          </div>
        </div>
      </div>

      {/* Rate Card */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Rate Card</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { service: 'Full Day', rate: '₦350,000' },
            { service: 'Half Day', rate: '₦200,000' },
            { service: 'Event Coverage', rate: '₦500,000/day' },
            { service: 'Creative Direction', rate: '₦250,000/day' }
          ].map((item) => (
            <div key={item.service} className="bg-[#F8FAFC] rounded-lg p-4">
              <p className="text-[#64748B] text-sm mb-1">{item.service}</p>
              <p className="text-[#0F172A] font-mono text-lg">{item.rate}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Work */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Featured Work</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portfolioItems.map((item) => (
            <div key={item.id} className="group cursor-pointer">
              <div className="aspect-square bg-gradient-to-br from-[#2F55FF]/30 to-[#6BFF9A]/20 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                <Camera className="w-8 h-8 text-[#E2E8F0]" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-[#0F172A]" />
                </div>
              </div>
              <p className="text-[#475569] text-sm font-medium">{item.title}</p>
              <p className="text-[#94A3B8] text-xs">{item.type} • {item.year}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div className="dashboard-card p-6">
        <h2 className="text-lg font-semibold text-[#0F172A] mb-4">Client Reviews</h2>
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-[#F8FAFC] rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Avatar name={review.name} size="sm" />
                  <span className="text-[#0F172A] font-medium">{review.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {Array(review.rating).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#D97706] fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-[#475569] text-sm">"{review.text}"</p>
              <p className="text-[#CBD5E1] text-xs mt-2">{review.date}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreativePortfolio;
