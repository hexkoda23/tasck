import React, { useEffect, useState } from 'react';
import {
  v3ApproveAlignmentAs, v3ApproveSnapshot, v3AddAlignmentComment,
  v3AddStrategySnapshotComment, v3GetBusinessCase, v3ListBusinessCases,
} from '../../../lib/v3api';
import { buildMockBusinessCaseBundle } from '../../../lib/v3data';
import { getStoredDemoBundle, saveStoredDemoBundle } from '../../../lib/v3demoStore';
import {
  getBrandPortalBrand,
  getBrandPortalSession,
  isPendingApprovalStatus,
  loadBrandPortalBundles,
  snapshotDocsFromBundle,
} from '../../../lib/v3brandPortal';
import V3DocumentSurface from '../../../components/v3/V3DocumentSurface';
import { CheckCircle, Clock, FileText, MessageSquare, Send } from 'lucide-react';

const V3BrandApprovals = ({
  eyebrow = 'APPROVALS',
  title = 'Pending Approvals',
  description = 'Review Alignment and Strategy Snapshots, comment on exact sections, and approve when comfortable.',
}) => {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [comments, setComments] = useState({});
  const [busy, setBusy] = useState(false);
  const session = getBrandPortalSession();
  const brand = getBrandPortalBrand();

  const load = async () => {
    let bundles = [];
    try {
      const cases = await v3ListBusinessCases();
      const caseList = Array.isArray(cases) ? cases.filter((bc) => bc.brand_id === session.brandId) : [];
      bundles = await Promise.all(caseList.map((bc) => v3GetBusinessCase(bc.id)));
    } catch (e) {
      bundles = loadBrandPortalBundles(session.brandId);
    }
    const docs = bundles
      .flatMap(snapshotDocsFromBundle)
      .filter((doc) => isPendingApprovalStatus(doc.snapshot?.status));
    setItems(docs);
    setSelectedId((current) => (docs.some((doc) => doc.id === current) ? current : docs[0]?.id || null));
  };

  useEffect(() => {
    load().catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = items.find((item) => item.id === selectedId);

  const persistDocumentChange = (item) => {
    const bundle = getStoredDemoBundle(item.business_case.id) || buildMockBusinessCaseBundle(item.business_case.id);
    if (!bundle) return;
    const nextBundle = {
      ...bundle,
      [item.kind === 'alignment' ? 'alignment_snapshot' : 'creative_snapshot']: item.snapshot,
      business_case: {
        ...bundle.business_case,
        ...(item.kind === 'alignment' && item.snapshot.status === 'approved'
          ? { stage: 'plan', next_action: 'Alignment approved. TASCK is matching creators and preparing creator briefs.' }
          : {}),
        ...(item.kind === 'strategy' && item.snapshot.status === 'approved'
          ? { stage: 'deliver', next_action: 'Strategy approved. TASCK is preparing contracts and delivery planning.' }
          : {}),
        frame: item.kind === 'alignment'
          ? {
              ...(bundle.business_case.frame || {}),
              alignment_snapshot_status: item.snapshot.status,
            }
          : bundle.business_case.frame,
        plan: item.kind === 'strategy'
          ? {
              ...(bundle.business_case.plan || {}),
              creative_snapshot_status: item.snapshot.status,
              strategy_snapshot_status: item.snapshot.status,
            }
          : bundle.business_case.plan,
      },
    };
    saveStoredDemoBundle(nextBundle);
  };

  const updateSelected = (updater) => {
    setItems((current) => current.map((item) => {
      if (item.id !== selected.id) return item;
      const next = updater(item);
      persistDocumentChange(next);
      return next;
    }));
  };

  const submitComment = async (sectionIndex) => {
    const text = comments[sectionIndex];
    if (!text || !selected) return;
    const section = selected.sections[sectionIndex];
    setBusy(true);
    try {
      const payload = {
        section_index: sectionIndex,
        quoted_text: section?.heading || '',
        comment: text,
        author: selected.brand?.primary_contact || 'Brand',
      };
      if (selected.kind === 'alignment') {
        await v3AddAlignmentComment(selected.snapshot.id, payload);
      } else {
        await v3AddStrategySnapshotComment(selected.snapshot.id, payload);
      }
      setComments({ ...comments, [sectionIndex]: '' });
      await load();
    } catch (e) {
      const comment = {
        id: `comment-${Date.now()}`,
        section_index: sectionIndex,
        quoted_text: section?.heading || '',
        comment: text,
        author: selected.brand?.primary_contact || 'Brand',
        status: 'open',
        created_at: new Date().toISOString(),
      };
      updateSelected((item) => ({
        ...item,
        snapshot: { ...item.snapshot, status: 'under_review', brand_comments: [...(item.snapshot.brand_comments || []), comment] },
        comments: [...item.comments, comment],
      }));
      setComments({ ...comments, [sectionIndex]: '' });
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (selected.kind === 'alignment') {
        await v3ApproveAlignmentAs(selected.business_case.id, selected.brand?.primary_contact || 'Brand', 'brand');
      } else {
        await v3ApproveSnapshot(selected.business_case.id, selected.brand?.primary_contact || 'Brand');
      }
      await load();
    } catch (e) {
      updateSelected((item) => ({
        ...item,
        snapshot: {
          ...item.snapshot,
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: selected.brand?.primary_contact || 'Brand',
          approved_by_party: 'brand',
        },
      }));
      setItems((current) => {
        const next = current.filter((item) => item.id !== selected.id);
        setSelectedId(next[0]?.id || null);
        return next;
      });
    } finally {
      setBusy(false);
    }
  };

  const renderSection = (section, index) => (
    <div key={`${section.heading}-${index}`} className="mb-6">
      <h2>{section.heading}</h2>
      {section.type === 'prose' && <p>{section.content}</p>}
      {section.type === 'bullets' && <ul>{(section.items || []).map((item, j) => <li key={j}>{item}</li>)}</ul>}
      {section.type === 'numbered' && <ol>{(section.items || []).map((item, j) => <li key={j}>{item}</li>)}</ol>}
      {section.type === 'kpis' && (
        <div className="space-y-2">
          {(section.items || []).map((item, j) => <p key={j}><strong>{item.kpi}:</strong> {item.target}</p>)}
        </div>
      )}
      {section.type === 'flags' && <ul>{(section.items || []).map((item, j) => <li key={j}>{item.text}</li>)}</ul>}
      {selected.snapshot.status !== 'approved' && (
        <div className="mt-3 p-3 rounded border border-[#E8E4DB] bg-[#FAFAF7]">
          <textarea
            value={comments[index] || ''}
            onChange={(e) => setComments({ ...comments, [index]: e.target.value })}
            rows={2}
            placeholder="Comment on this section or suggest what should change..."
            className="w-full px-3 py-2 text-[12px] rounded-lg border border-[#E8E4DB] bg-white mb-2"
            data-testid={`brand-comment-${selected.kind}-${index}`}
          />
          <button onClick={() => submitComment(index)} disabled={busy || !comments[index]} className="v3-btn-secondary text-[11px]">
            <MessageSquare className="w-3.5 h-3.5" /> Add Comment
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div data-testid="v3-brand-approvals">
      <p className="text-[11px] text-[#8A8A8A] uppercase tracking-wider mb-1">{eyebrow}</p>
      <h1 className="v3-heading text-2xl mb-1" style={{ fontFamily: "'Fraunces', serif" }}>{title}</h1>
      <p className="text-[#8A8A8A] text-sm mb-8">{brand?.company}: {description}</p>

      {items.length === 0 ? (
        <div className="v3-card p-8 text-center">
          <CheckCircle className="w-6 h-6 text-[#1F4A3A] mx-auto mb-3" />
          <p className="text-[14px] text-[#1A1A1A]">All clear</p>
          <p className="text-[12px] text-[#8A8A8A]">No documents currently awaiting your approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[320px_1fr] gap-5">
          <div className="space-y-2">
            {items.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full v3-card p-4 text-left ${selectedId === item.id ? 'border-[#1F4A3A]' : ''}`} data-testid={`approval-${item.id}`}>
                <div className="flex items-center gap-2 mb-2">
                  {item.snapshot.status === 'approved' ? <CheckCircle className="w-4 h-4 text-[#1F4A3A]" /> : <Clock className="w-4 h-4 text-[#C49B5F]" />}
                  <span className="text-[10px] uppercase tracking-wider text-[#8A8A8A]">{item.snapshot.status}</span>
                </div>
                <p className="text-[13px] font-medium text-[#1A1A1A]">{item.label}</p>
                <p className="text-[12px] text-[#6E6657] mt-0.5">{item.business_case.title}</p>
                <p className="text-[11px] text-[#8A8A8A] mt-1">{item.comments.length} comments</p>
              </button>
            ))}
          </div>

          {selected && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-[12px] text-[#8A8A8A]">
                  <FileText className="w-4 h-4" />
                  <span>{items.length} awaiting action</span>
                </div>
                {selected.snapshot.status !== 'approved' && (
                  <button onClick={approve} disabled={busy} className="v3-btn-primary" data-testid={selected.kind === 'strategy' ? 'brand-approve-strategy' : 'brand-approve-alignment'}>
                    <Send className="w-3.5 h-3.5" /> Approve {selected.label}
                  </button>
                )}
              </div>

              <V3DocumentSurface title={selected.snapshot.title} meta={selected.snapshot.meta || selected.snapshot.brand_header}>
                {selected.sections.map(renderSection)}
              </V3DocumentSurface>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default V3BrandApprovals;
