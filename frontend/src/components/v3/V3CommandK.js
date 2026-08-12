import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FolderOpen, Building2, Users, FileText, ArrowRight } from 'lucide-react';
import { v3Projects, v3Brands, v3Creators, getBrand, getCreator, v3Stages, formatNairaV3 } from '../../lib/v3data';

const V3CommandK = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); inputRef.current?.focus(); }
  }, [open]);

  const q = query.toLowerCase();

  const results = [];
  if (q.length > 0) {
    v3Projects.forEach(p => {
      const brand = getBrand(p.brandId);
      const creator = getCreator(p.creatorId);
      if (p.title.toLowerCase().includes(q) || brand?.company?.toLowerCase().includes(q) || creator?.name?.toLowerCase().includes(q)) {
        results.push({ type: 'project', icon: FolderOpen, label: `${brand?.company?.split(' ')[0]} - ${p.title}`, sub: `${v3Stages.find(s => s.key === p.stage)?.label} · ${formatNairaV3(p.estimatedValue)}`, path: `/v3/admin/projects/${p.id}` });
      }
    });
    v3Brands.forEach(b => {
      if (b.company.toLowerCase().includes(q) || b.primaryContact.toLowerCase().includes(q)) {
        results.push({ type: 'brand', icon: Building2, label: b.company, sub: `${b.primaryContact} · Score ${b.leadScore}`, path: `/v3/admin/crm/${b.id}` });
      }
    });
    v3Creators.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.genre.toLowerCase().includes(q)) {
        results.push({ type: 'creator', icon: Users, label: c.name, sub: `${c.genre} · Fit ${c.fitScore}`, path: `/v3/admin/creators/${c.id}` });
      }
    });
  }

  const quickActions = [
    { icon: FolderOpen, label: 'Go to Pipeline', path: '/v3/admin/pipeline' },
    { icon: Building2, label: 'Go to CRM', path: '/v3/admin/crm' },
    { icon: Users, label: 'Go to Creators', path: '/v3/admin/creators' },
    { icon: FileText, label: 'Go to Reports', path: '/v3/admin/reports' },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" data-testid="v3-command-k">
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-white border border-[#E8E4DB] rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[#E8E4DB]">
          <Search className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" />
          <input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, brands, creators..."
            className="flex-1 text-[14px] text-[#1A1A1A] bg-transparent outline-none placeholder:text-[#D4CDBF]" data-testid="command-input" />
          <kbd className="text-[10px] text-[#8A8A8A] bg-[#F4F2EC] px-1.5 py-0.5 rounded border border-[#E8E4DB]">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {q.length > 0 && results.length > 0 && (
            <div>
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider px-2 py-1">Results</p>
              {results.slice(0, 8).map((r, i) => {
                const Icon = r.icon;
                return (
                  <button key={i} onClick={() => { navigate(r.path); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F4F2EC] transition-colors text-left">
                    <Icon className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1A1A1A] truncate">{r.label}</p>
                      <p className="text-[10px] text-[#8A8A8A]">{r.sub}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#D4CDBF]" />
                  </button>
                );
              })}
            </div>
          )}
          {q.length > 0 && results.length === 0 && (
            <p className="text-[13px] text-[#8A8A8A] text-center py-6">No results for "{query}"</p>
          )}
          {q.length === 0 && (
            <div>
              <p className="text-[10px] text-[#8A8A8A] uppercase tracking-wider px-2 py-1">Quick actions</p>
              {quickActions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <button key={i} onClick={() => { navigate(a.path); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F4F2EC] transition-colors text-left">
                    <Icon className="w-4 h-4 text-[#8A8A8A] flex-shrink-0" strokeWidth={1.5} />
                    <span className="text-[13px] text-[#5C5C5C]">{a.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default V3CommandK;
