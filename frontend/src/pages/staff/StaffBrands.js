import React, { useState, useEffect } from 'react';
import { getBrands } from '../../lib/api';
import { formatNaira } from '../../lib/utils';
import Avatar from '../../components/shared/Avatar';
import { 
  Search, 
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

  return (
    <div className="space-y-6 animate-fade-in" data-testid="staff-brands">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Brands</h1>
        <p className="text-white/35 text-sm">Client relationships and CRM</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input 
          type="text"
          placeholder="Search brands..."
          className="w-full search-bar pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none"
        />
      </div>

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
                  <td colSpan={7}><div className="skeleton h-12 w-full"></div></td>
                </tr>
              ))
            ) : (
              brands.map((brand) => (
                <tr key={brand.id} className="group" data-testid={`brand-row-${brand.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={brand.name} size="sm" square />
                      <div>
                        <div className="text-white font-medium text-sm">{brand.name}</div>
                        <div className="text-white/30 text-xs">{brand.location}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-white/50 text-sm">{brand.category}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-[#2F55FF] to-[#6BFF9A]"
                          style={{ width: `${(brand.relationship_score / 10) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-white/50 text-xs font-mono">{brand.relationship_score}/10</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-white font-mono text-sm font-semibold">
                      {formatNaira(brand.total_revenue, { compact: true })}
                    </span>
                  </td>
                  <td>
                    <span className={`font-mono text-sm ${brand.active_deals > 0 ? 'text-white' : 'text-white/25'}`}>
                      {brand.active_deals}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div className="text-white/70 text-sm">{brand.contact_name}</div>
                      <div className="text-white/30 text-xs">{brand.contact_title}</div>
                    </div>
                  </td>
                  <td>
                    <button className="opacity-0 group-hover:opacity-100 text-[#2F55FF] hover:text-[#2F55FF]/80 transition-all">
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
