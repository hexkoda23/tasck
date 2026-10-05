import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertOctagon, ArrowLeft, ArrowRight, CheckCircle2, RefreshCcw, X } from 'lucide-react';
import { adminRoute } from '../../lib/v3AdminRouteBase';
import useTopbarOffset from '../../lib/useTopbarOffset';
import {
  v3ListBusinessCaseDuplicates, v3MergeBusinessCaseInto, v3DismissDuplicatePair,
  v3ListBrandDuplicates, v3MergeBrandInto, v3DismissBrandDuplicatePair,
} from '../../lib/v3api';

const formatDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); }
  catch (_) { return String(iso); }
};

const CaseCard = ({ side, businessCase, onKeep, keeping, onOpen }) => (
  <div className="rounded-xl border border-[#E8E4DB] bg-white p-4 flex flex-col gap-2" data-testid={`dupe-card-${side}-${businessCase.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Case · {side}</p>
        <h3 className="text-[15px] font-semibold text-[#1A1A1A] truncate">{businessCase.title || 'Untitled case'}</h3>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F2EC] text-[#5C5C5C] uppercase tracking-wide">{businessCase.stage || '—'}</span>
    </div>
    <div className="text-[12px] text-[#4F4941] space-y-0.5">
      <p><span className="text-[#8A8A8A]">Brand:</span> {businessCase.brand_name || '—'}</p>
      <p><span className="text-[#8A8A8A]">Track:</span> {businessCase.engagement_track || '—'}</p>
      <p><span className="text-[#8A8A8A]">Value:</span> {businessCase.estimated_value != null ? `₦${Number(businessCase.estimated_value).toLocaleString()}` : '—'}</p>
      <p><span className="text-[#8A8A8A]">Created:</span> {formatDate(businessCase.created_at)}</p>
      <p><span className="text-[#8A8A8A]">Updated:</span> {formatDate(businessCase.updated_at)}</p>
    </div>
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        onClick={() => onOpen(businessCase.id)}
        className="v3-btn-secondary text-[12px]"
        data-testid={`dupe-open-${businessCase.id}`}
      >
        Open case
      </button>
      <button
        onClick={() => onKeep(businessCase.id)}
        disabled={keeping}
        className="v3-btn-primary text-[12px]"
        data-testid={`dupe-keep-${businessCase.id}`}
      >
        {keeping ? 'Merging…' : 'Keep this'} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

const BrandCard = ({ side, brand, onKeep, keeping, onOpen }) => (
  <div className="rounded-xl border border-[#E8E4DB] bg-white p-4 flex flex-col gap-2" data-testid={`brand-dupe-card-${side}-${brand.id}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">Brand · {side}</p>
        <h3 className="text-[15px] font-semibold text-[#1A1A1A] truncate">{brand.company || 'Untitled brand'}</h3>
      </div>
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F2EC] text-[#5C5C5C] uppercase tracking-wide">{brand.status || '—'}</span>
    </div>
    <div className="text-[12px] text-[#4F4941] space-y-0.5">
      <p><span className="text-[#8A8A8A]">Industry:</span> {brand.industry || '—'}</p>
      <p><span className="text-[#8A8A8A]">Contact:</span> {brand.primary_contact || '—'}</p>
      <p><span className="text-[#8A8A8A]">Created:</span> {formatDate(brand.created_at)}</p>
      <p><span className="text-[#8A8A8A]">Updated:</span> {formatDate(brand.updated_at)}</p>
    </div>
    <div className="flex flex-wrap gap-2 mt-2">
      <button
        onClick={() => onOpen(brand.id)}
        className="v3-btn-secondary text-[12px]"
        data-testid={`brand-dupe-open-${brand.id}`}
      >
        Open brand
      </button>
      <button
        onClick={() => onKeep(brand.id)}
        disabled={keeping}
        className="v3-btn-primary text-[12px]"
        data-testid={`brand-dupe-keep-${brand.id}`}
      >
        {keeping ? 'Merging…' : 'Keep this'} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

const V1AdminDuplicates = () => {
  const navigate = useNavigate();
  const topbarOffset = useTopbarOffset();
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState([]);
  const [busyPairKey, setBusyPairKey] = useState('');
  const [brandPairs, setBrandPairs] = useState([]);
  const [busyBrandPairKey, setBusyBrandPairKey] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [caseData, brandData] = await Promise.all([
        v3ListBusinessCaseDuplicates(),
        v3ListBrandDuplicates().catch(() => ({ pairs: [] })),
      ]);
      setPairs(Array.isArray(caseData?.pairs) ? caseData.pairs : []);
      setBrandPairs(Array.isArray(brandData?.pairs) ? brandData.pairs : []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not load duplicates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleMerge = useCallback(async (pair, keepId) => {
    const sourceId = pair.left.id === keepId ? pair.right.id : pair.left.id;
    if (!window.confirm('This will merge the other case into the one you kept and move its messages across. Continue?')) return;
    setBusyPairKey(pair.pair_key);
    try {
      await v3MergeBusinessCaseInto(sourceId, keepId, 'admin');
      toast.success('Cases merged.');
      setPairs((current) => current.filter((row) => row.pair_key !== pair.pair_key));
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Merge failed.');
    } finally {
      setBusyPairKey('');
    }
  }, []);

  const handleDismiss = useCallback(async (pair) => {
    setBusyPairKey(pair.pair_key);
    try {
      await v3DismissDuplicatePair(pair.left.id, pair.right.id);
      setPairs((current) => current.filter((row) => row.pair_key !== pair.pair_key));
      toast.success('Marked as not a duplicate.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not dismiss.');
    } finally {
      setBusyPairKey('');
    }
  }, []);

  const openCase = useCallback((id) => navigate(adminRoute(`/business-cases/${id}`)), [navigate]);

  const handleMergeBrand = useCallback(async (pair, keepId) => {
    const sourceId = pair.left.id === keepId ? pair.right.id : pair.left.id;
    if (!window.confirm('This will merge the other brand into the one you kept, moving its contacts, meetings and any other projects across. Continue?')) return;
    setBusyBrandPairKey(pair.pair_key);
    try {
      await v3MergeBrandInto(sourceId, keepId, 'admin');
      toast.success('Brands merged.');
      setBrandPairs((current) => current.filter((row) => row.pair_key !== pair.pair_key));
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Merge failed.');
    } finally {
      setBusyBrandPairKey('');
    }
  }, []);

  const handleDismissBrand = useCallback(async (pair) => {
    setBusyBrandPairKey(pair.pair_key);
    try {
      await v3DismissBrandDuplicatePair(pair.left.id, pair.right.id);
      setBrandPairs((current) => current.filter((row) => row.pair_key !== pair.pair_key));
      toast.success('Marked as not a duplicate.');
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || 'Could not dismiss.');
    } finally {
      setBusyBrandPairKey('');
    }
  }, []);

  const openBrand = useCallback((id) => navigate(adminRoute(`/crm-brands/${id}`)), [navigate]);

  const heading = useMemo(() => (
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-[#8A8A8A]">Business cases</p>
        <h1 className="v3-heading text-3xl" style={{ fontFamily: "'Fraunces', serif" }}>Possible duplicates</h1>
        <p className="text-[13px] text-[#6B6258] mt-2 max-w-2xl">
          The system quietly scans every open case - and every CRM brand, even ones with no project yet - for look-alike names. Review each pair side by side, keep the one you want, and the other gets merged in with its records moved across.
        </p>
      </div>
      <button onClick={reload} className="v3-btn-secondary" data-testid="dupe-refresh">
        <RefreshCcw className="w-4 h-4" /> Refresh
      </button>
    </div>
  ), [reload]);

  return (
    <div className="space-y-5" data-testid="v1-admin-duplicates">
      {/* Pinned so the admin can go back from anywhere on a long list. */}
      <div className="v1-flow-sticky-nav" style={{ top: topbarOffset }}>
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="v3-btn-secondary text-[11px]"
            data-testid="duplicates-back-btn"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </div>
      {heading}
      {loading ? (
        <div className="v3-card p-6 text-[13px] text-[#6B6258]" data-testid="dupe-loading">Scanning for look-alike opportunities…</div>
      ) : pairs.length === 0 && brandPairs.length === 0 ? (
        <div className="v3-card p-8 text-center" data-testid="dupe-empty">
          <CheckCircle2 className="w-10 h-10 text-[#1F4A3A] mx-auto mb-2" />
          <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Nothing looks duplicated right now</h2>
          <p className="text-[12px] text-[#6B6258] mt-1">You&apos;ll see any suspiciously similar business cases or brands here as soon as they show up.</p>
        </div>
      ) : (
        <>
          {pairs.length > 0 && (
            <div className="space-y-4">
              {pairs.map((pair) => {
                const busy = busyPairKey === pair.pair_key;
                return (
                  <div key={pair.pair_key} className="v3-card p-4 space-y-3" data-testid={`dupe-pair-${pair.pair_key}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 text-[#B54A37] mt-1" />
                        <div>
                          <p className="text-[13px] font-semibold text-[#1A1A1A]">Possible duplicate · {Math.round(pair.similarity * 100)}% match</p>
                          <p className="text-[12px] text-[#6B6258]">{(pair.reasons || []).join(' · ')}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismiss(pair)}
                        disabled={busy}
                        className="v3-btn-secondary text-[12px]"
                        data-testid={`dupe-dismiss-${pair.pair_key}`}
                        title="Mark this pair as not a duplicate"
                      >
                        <X className="w-3.5 h-3.5" /> Not a duplicate
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <CaseCard side="A" businessCase={pair.left} onKeep={(id) => handleMerge(pair, id)} keeping={busy} onOpen={openCase} />
                      <CaseCard side="B" businessCase={pair.right} onKeep={(id) => handleMerge(pair, id)} keeping={busy} onOpen={openCase} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {brandPairs.length > 0 && (
            <div className="space-y-4">
              <p className="text-[11px] uppercase tracking-wide text-[#8A8A8A] pt-2" data-testid="brand-dupe-section-heading">
                Possible duplicate brands
              </p>
              {brandPairs.map((pair) => {
                const busy = busyBrandPairKey === pair.pair_key;
                return (
                  <div key={pair.pair_key} className="v3-card p-4 space-y-3" data-testid={`brand-dupe-pair-${pair.pair_key}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 text-[#B54A37] mt-1" />
                        <div>
                          <p className="text-[13px] font-semibold text-[#1A1A1A]">Possible duplicate brand · {Math.round(pair.similarity * 100)}% match</p>
                          <p className="text-[12px] text-[#6B6258]">No project links these yet - the same company was likely added to the CRM twice.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDismissBrand(pair)}
                        disabled={busy}
                        className="v3-btn-secondary text-[12px]"
                        data-testid={`brand-dupe-dismiss-${pair.pair_key}`}
                        title="Mark this pair as not a duplicate"
                      >
                        <X className="w-3.5 h-3.5" /> Not a duplicate
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <BrandCard side="A" brand={pair.left} onKeep={(id) => handleMergeBrand(pair, id)} keeping={busy} onOpen={openBrand} />
                      <BrandCard side="B" brand={pair.right} onKeep={(id) => handleMergeBrand(pair, id)} keeping={busy} onOpen={openBrand} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default V1AdminDuplicates;
