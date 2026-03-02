import React, { useState, useEffect } from 'react';
import { getBrands } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { 
  Search, 
  Building2,
  Star,
  TrendingUp,
  Mail,
  Phone,
  ExternalLink
} from 'lucide-react';

export const StaffBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await getBrands();
        setBrands(response.data);
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-[#6BFF9A]';
    if (score >= 6) return 'text-[#FFA502]';
    return 'text-white/60';
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-brands">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Brands</h1>
          <p className="text-white/50 text-sm">Client relationships and CRM</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <input 
          type="text"
          placeholder="Search brands..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#2F55FF]"
        />
      </div>

      {/* Brands Table */}
      <div className="dashboard-card overflow-hidden">
        <table className="data-table" data-testid="brands-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Category</th>
              <th>Relationship</th>
              <th>Total Revenue</th>
              <th>Active Deals</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="skeleton h-12 w-full"></div>
                  </td>
                </tr>
              ))
            ) : (
              brands.map((brand) => (
                <tr key={brand.id} className="group" data-testid={`brand-row-${brand.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={brand.name} size="sm" />
                      <div>
                        <div className="text-white font-medium">{brand.name}</div>
                        <div className="text-white/40 text-xs">{brand.location}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-white/60">{brand.category}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Star className={`w-4 h-4 ${getScoreColor(brand.relationship_score)}`} />
                      <span className={`font-mono ${getScoreColor(brand.relationship_score)}`}>
                        {brand.relationship_score}/10
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[#6BFF9A] font-mono">
                      {formatNaira(brand.total_revenue, { compact: true })}
                    </span>
                  </td>
                  <td>
                    <span className={`font-mono ${brand.active_deals > 0 ? 'text-white' : 'text-white/40'}`}>
                      {brand.active_deals}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div className="text-white/80 text-sm">{brand.contact_name}</div>
                      <div className="text-white/40 text-xs">{brand.contact_title}</div>
                    </div>
                  </td>
                  <td>
                    <button className="opacity-0 group-hover:opacity-100 text-[#2F55FF] hover:text-[#2F55FF]/80 transition-opacity">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffBrands;
