import {
  buildMockBusinessCaseBundle,
  buildMockBusinessCases,
  formatNairaV3,
  getBrand,
  getCreator,
  getRM,
} from './v3data';
import { getStoredDemoBundle, listStoredDemoBundles } from './v3demoStore';

export const BRAND_SESSION_KEY = 'tasck_v3_brand_demo_session';

export const brandDemoAccounts = [
  {
    brandId: 'brand-cocacola',
    company: 'Coca-Cola Nigeria Limited',
    contact: 'Folake Adeniran',
    email: 'folake.adeniran@coca-cola.com',
    password: 'Coke@2026!',
    initials: 'FA',
  },
  {
    brandId: 'brand-mtn',
    company: 'MTN Nigeria Communications PLC',
    contact: 'Kemi Adebayo',
    email: 'kemi.adebayo@mtn.com',
    password: 'MTN@2026!',
    initials: 'KA',
  },
  {
    brandId: 'brand-star',
    company: 'Nigerian Breweries PLC (Star Lager)',
    contact: 'Funke Adebiyi',
    email: 'funke.adebiyi@heineken.com',
    password: 'Star@2026!',
    initials: 'FA',
  },
];

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

export const setBrandPortalSession = (account) => {
  if (!canUseStorage() || !account) return;
  const brandId = account.brandId || account.brand_id || account.id;
  window.localStorage.setItem(BRAND_SESSION_KEY, JSON.stringify({
    brandId,
    brand_id: brandId,
    company: account.company || account.brand_name || account.name,
    username: account.username || account.email,
    email: account.email,
    contact: account.contact || account.primary_contact || account.primaryContact,
    initials: account.initials,
    logged_in_at: new Date().toISOString(),
  }));
};

export const getBrandPortalSession = () => {
  const fallback = brandDemoAccounts[0];
  if (!canUseStorage()) return fallback;
  try {
    const stored = JSON.parse(window.localStorage.getItem(BRAND_SESSION_KEY) || '{}');
    if (!stored.email && !stored.brandId && !stored.brand_id) return fallback;
    const account = getBrandPortalAccountByEmail(stored.email);
    if (account) return { ...account, ...stored };
    const brandId = stored.brandId || stored.brand_id;
    if (brandId) {
      return {
        brandId,
        brand_id: brandId,
        company: stored.company || 'Brand',
        contact: stored.contact || 'Brand Representative',
        email: stored.email || stored.username || '',
        username: stored.username || stored.email || '',
        initials: stored.initials || String(stored.company || 'BR').slice(0, 2).toUpperCase(),
        logged_in_at: stored.logged_in_at,
      };
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
};

export const getBrandPortalAccountByEmail = (email) => {
  const normalisedEmail = String(email || '').toLowerCase();
  const demoAccount = brandDemoAccounts.find((account) => account.email.toLowerCase() === normalisedEmail);
  if (demoAccount) return demoAccount;

  // Dynamically resolve custom created brands from local storage
  if (canUseStorage()) {
    const localList = JSON.parse(window.localStorage.getItem('local_brands_list') || '[]');
    const localBrand = localList.find((b) => String(b.email || '').toLowerCase() === normalisedEmail);
    if (localBrand) {
      return {
        brandId: localBrand.id,
        company: localBrand.company || 'Custom Brand',
        contact: localBrand.primary_contact || 'Brand Representative',
        email: localBrand.email,
        password: 'TASCK@2026!',
        initials: localBrand.company ? localBrand.company.slice(0, 2).toUpperCase() : 'BR',
      };
    }
  }
  return null;
};

export const getBrandPortalBrand = () => {
  const session = getBrandPortalSession();
  const demoBrand = getBrand(session.brandId);
  if (demoBrand) return demoBrand;
  return {
    id: session.brandId || session.brand_id,
    company: session.company || 'Brand',
    primaryContact: session.contact || 'Brand Representative',
    primary_contact: session.contact || 'Brand Representative',
    email: session.email || session.username || '',
    logo: '',
  };
};

export const isPendingApprovalStatus = (status) => ['sent', 'sent_to_brand', 'under_review', 'pending_brand_review'].includes(status);

const makePresentationBundle = ({
  id,
  brandId,
  creatorId,
  rmId,
  title,
  stage,
  value,
  days,
  nextAction,
  alignmentStatus = 'approved',
  strategyStatus = null,
  deliverables = [],
  report = null,
}) => {
  const brand = getBrand(brandId);
  const creator = creatorId ? getCreator(creatorId) : null;
  const rm = getRM(rmId);
  const marketing = {
    key_marketing_focus: `${brand?.company || 'The brand'} wants a creator-led campaign that turns ${title} into a measurable cultural growth moment.`,
    primary_target_audience: 'Urban Nigerian consumers aged 18-34 with strong music, culture, lifestyle, and social video behaviour.',
    key_marketing_channels: ['Instagram', 'TikTok', 'YouTube', 'Events', 'PR'],
    marketing_kpis: [
      { kpi: 'Reach', target: '8M+ qualified impressions.' },
      { kpi: 'Engagement rate', target: '6%+ blended engagement across creator content.' },
      { kpi: 'Conversion signal', target: 'Track visits, signups, app installs, or purchase intent lift by campaign objective.' },
    ],
  };

  const businessCase = {
    id,
    brand_id: brandId,
    creator_id: creatorId,
    title,
    stage,
    engagement_track: 'paid',
    estimated_value: value,
    rm_id: rmId,
    created_at: '2026-03-12',
    days_in_stage: days,
    next_action: nextAction,
    health: stage === 'deliver' ? 'near-closure' : 'on-track',
    connect: {
      status: 'qualified_to_frame',
      connect_status: 'qualified_to_frame',
      source: 'Brand portal presentation demo',
      stated_intent: marketing.key_marketing_focus,
      marketing_intelligence: marketing,
    },
    frame: {
      alignment_snapshot_status: alignmentStatus,
      scope_flags_total: 2,
      scope_flags_resolved: alignmentStatus === 'approved' ? 2 : 0,
      strategy_development_fee_paid: ['deliver', 'closed'].includes(stage),
      strategy_development_fee_due_stage: 'before_delivery',
    },
    plan: {
      creator_shortlist_status: creatorId ? 'matched' : 'pending',
      creative_brief_status: creatorId ? 'responded' : 'pending',
      creative_snapshot_status: strategyStatus || 'pending',
      strategy_snapshot_status: strategyStatus || 'pending',
      contract_status: ['deliver', 'closed'].includes(stage) ? 'signed' : 'draft',
    },
    deliver: {
      budget_planning_status: stage === 'deliver' || stage === 'closed' ? 'complete' : 'pending',
      timeline_planning_status: stage === 'deliver' || stage === 'closed' ? 'complete' : 'pending',
      delivery_status: stage === 'closed' ? 'completed' : stage === 'deliver' ? 'in_progress' : 'pending',
      milestones_total: deliverables.length,
      milestones_complete: deliverables.filter((item) => item.status === 'approved').length,
      scope_change_log: [],
    },
    closure: {
      report_status: report ? 'generated' : 'pending',
      brand_feedback_received: false,
      creator_feedback_received: false,
    },
  };

  const alignment = alignmentStatus ? {
    id: `as-${id}`,
    business_case_id: id,
    status: alignmentStatus,
    generated_at: '2026-03-13T09:00:00Z',
    approved_at: alignmentStatus === 'approved' ? '2026-03-14T12:00:00Z' : null,
    approved_by: alignmentStatus === 'approved' ? brand?.primaryContact : null,
    approved_by_party: alignmentStatus === 'approved' ? 'brand' : null,
    brand_header: `${brand?.company?.split(' ')[0]?.toUpperCase() || 'BRAND'} x TASCK`,
    title: `${title}: Alignment Snapshot`,
    meta: 'AI-generated from connector call. Reviewed by TASCK.',
    marketing_intelligence: marketing,
    sections: [
      { heading: 'Business promotion summary', type: 'prose', content: marketing.key_marketing_focus },
      { heading: 'Key Marketing Focus', type: 'prose', content: marketing.key_marketing_focus },
      { heading: 'Primary Target Audience', type: 'prose', content: marketing.primary_target_audience },
      { heading: 'Key Marketing Channels', type: 'bullets', items: marketing.key_marketing_channels },
      { heading: 'Marketing KPIs', type: 'kpis', items: marketing.marketing_kpis },
      { heading: 'Next steps', type: 'bullets', items: ['TASCK matches creators.', 'Creator brief is shared.', 'Strategy Snapshot follows after creator brief review.'] },
    ],
    scope_flags: [],
    brand_comments: alignmentStatus === 'under_review'
      ? [{ id: `comment-${id}`, section_index: 1, quoted_text: 'Key Marketing Focus', comment: 'Please sharpen the commercial outcome before approval.', author: brand?.primaryContact, status: 'open', created_at: '2026-03-14T10:30:00Z' }]
      : [],
  } : null;

  const strategy = strategyStatus ? {
    id: `cs-${id}`,
    business_case_id: id,
    status: strategyStatus,
    title: `${title}: Strategy Snapshot`,
    concept: `${creator?.name || 'The selected creator'} anchors the campaign with a social-first creative system that translates the approved Alignment Snapshot into content, moments, and measurable brand outcomes.`,
    deliverables: [
      { num: 1, title: 'Hero creator concept', format: 'Campaign idea', duration: 'Core campaign' },
      { num: 2, title: 'Social content pack', format: 'Instagram/TikTok/YouTube', duration: 'Launch window' },
      { num: 3, title: 'Brand review and launch plan', format: 'Approval workflow', duration: 'Pre-launch' },
    ],
    budget: [
      { line: 'Creator fee', amount: Math.round(value * 0.45) },
      { line: 'Production', amount: Math.round(value * 0.25) },
      { line: 'Amplification', amount: Math.round(value * 0.2) },
      { line: 'TASCK management', amount: Math.round(value * 0.1) },
    ],
    success_metrics: marketing.marketing_kpis,
    template_name: 'Copy of Updated Creative Strategy Template_.docx',
    sections: [
      {
        heading: '1. EXECUTIVE SNAPSHOT',
        type: 'template',
        content: 'A one-page decision view of the objective, approach, audience, budget, KPIs, and why the strategy will work.',
        rows: [
          { Field: 'Business Objective', Detail: marketing.key_marketing_focus },
          { Field: 'Strategic Approach', Detail: 'Creator-led, community-driven, and conversion-focused.' },
          { Field: 'Target Audience', Detail: marketing.primary_target_audience },
          { Field: 'Budget Range', Detail: formatNairaV3(value) },
          { Field: 'Core KPIs', Detail: marketing.marketing_kpis.map((m) => `${m.kpi}: ${m.target}`).join('; ') },
        ],
        items: [
          'The strategy connects the brand offer to a clear audience behavior.',
          'Creators provide trust, context, and repeated proof points across priority channels.',
          'The roadmap links creative output to measurable funnel actions.',
        ],
      },
      {
        heading: '2. STRATEGIC FOUNDATION',
        type: 'template',
        rows: [
          { Field: 'Problem', Detail: marketing.current_marketing_challenge || marketing.key_marketing_focus },
          { Field: 'Opportunity', Detail: 'Use creator credibility and community distribution to make the offer easier to understand, trust, and act on.' },
          { Field: 'Strategic Insight', Detail: 'The audience responds faster when the brand promise is explained through familiar voices and real use cases.' },
          { Field: 'Strategic Solution', Detail: `${creator?.name || 'The selected creator'} anchors the campaign with a social-first creative system.` },
        ],
      },
      {
        heading: '3. GROWTH PLAN',
        type: 'template',
        content: 'Core Growth Engine: creator content -> audience trust -> qualified action -> repeat proof -> referral or community lift.',
        rows: [
          { Stage: 'Awareness -> Action', Objective: 'Convert attention into intent through trusted creator explanations.', 'Expected Conversion': 'Profile visits, link clicks, sign-ups, inquiries, or trial actions.' },
          { Stage: 'Action -> Repeat', Objective: 'Turn first actions into repeat usage, referral, or purchase behavior.', 'Expected Conversion': 'Repeat actions, referrals, UGC, and retained community engagement.' },
        ],
      },
      {
        heading: '4. CREATOR STRATEGY',
        type: 'template',
        content: 'Creators are selected for audience alignment, cultural relevance, ability to drive action, and conversion potential.',
        rows: [
          { Role: 'Primary Creator / Ambassador', Recommendation: `${creator?.name || 'Primary creator'} leads trust-building content and conversion prompts.`, Platforms: marketing.key_marketing_channels.join(', ') },
          { Role: 'Supporting Creators', Recommendation: 'Add niche creators to answer objections and extend reach into secondary communities.', Platforms: marketing.key_marketing_channels.join(', ') },
        ],
        items: ['Audience alignment', 'Cultural relevance', 'Ability to drive action', 'Conversion potential'],
      },
      {
        heading: '5. EXECUTION ROADMAP',
        type: 'template',
        rows: [
          { Phase: 'Phase 1 - Strategy and creator setup', 'Key Activities': 'Confirm audience, channel mix, creator roles, brief, guardrails, and approvals.', Deliverables: 'Approved creator brief, checklist, and content calendar.', Owner: 'TASCK admin + brand lead' },
          { Phase: 'Phase 2 - Content production and launch', 'Key Activities': 'Produce hero content, short-form assets, supporting posts, and conversion prompts.', Deliverables: 'Creator assets, captions, links, and launch plan.', Owner: 'Creators + TASCK production lead' },
          { Phase: 'Phase 3 - Optimization and reporting', 'Key Activities': 'Track KPIs, identify winning content, optimize CTA paths, and collect evidence.', Deliverables: 'Performance snapshot, learnings, final report inputs.', Owner: 'TASCK strategy + brand team' },
        ],
      },
      {
        heading: '6. COMMERCIAL OVERVIEW',
        type: 'template',
        content: `Budget Summary: estimated total investment is ${formatNairaV3(value)}.`,
        rows: [
          { Category: 'Ambassador', 'Estimated Cost': formatNairaV3(Math.round(value * 0.45)) },
          { Category: 'Supporting Creators', 'Estimated Cost': formatNairaV3(Math.round(value * 0.15)) },
          { Category: 'Production', 'Estimated Cost': formatNairaV3(Math.round(value * 0.25)) },
          { Category: 'Operations', 'Estimated Cost': formatNairaV3(Math.round(value * 0.1)) },
          { Category: 'Contingency', 'Estimated Cost': formatNairaV3(Math.round(value * 0.05)) },
        ],
        items: ['Estimated CAC: to be confirmed from tracked campaign actions.', 'Cost per Creator Output: calculated after final deliverable count.', 'Expected Return: qualified demand, conversion evidence, and reusable brand assets.'],
      },
      {
        heading: '8. TRACKING PLAN',
        type: 'bullets',
        content: 'How results will be measured across creator, channel, platform, and transaction signals.',
        items: ['Creator tracking links', 'Referral systems', 'Platform analytics', 'Transaction tracking where available'],
      },
      {
        heading: '9. RISKS & MITIGATION',
        type: 'bullets',
        content: 'Clear risks and mitigation actions to keep execution from derailing.',
        items: ['Approval delays: set feedback window early.', 'Creator availability: keep backup creators.', 'Budget pressure: prioritize primary KPI outputs.', 'Tracking gaps: agree on links and dashboards before launch.'],
      },
      { heading: 'NEXT STEPS', type: 'numbered', items: ['Confirm strategy approval.', 'Align on budget.', 'Execute contracts.', 'Begin Phase 1.'] },
    ],
    brand_comments: strategyStatus === 'under_review'
      ? [{ id: `strategy-comment-${id}`, section_index: 2, quoted_text: 'Budget assumptions', comment: 'Please separate production and amplification assumptions.', author: brand?.primaryContact, status: 'open', created_at: '2026-03-18T11:00:00Z' }]
      : [],
    approved_at: strategyStatus === 'approved' ? '2026-03-20T15:00:00Z' : null,
    approved_by: strategyStatus === 'approved' ? brand?.primaryContact : null,
  } : null;

  return {
    source: 'demo',
    business_case: businessCase,
    brand,
    creator,
    rm,
    interactions: [],
    alignment_snapshot: alignment,
    invoices: ['plan', 'deliver', 'closed'].includes(stage)
      ? [{ id: `sdf-${id}`, business_case_id: id, kind: 'strategy_development_fee', amount: Math.max(4000000, Math.round(value * 0.035)), status: ['deliver', 'closed'].includes(stage) ? 'paid' : 'issued', issued_at: '2026-03-16T09:00:00Z' }]
      : [],
    brainstorm_round: null,
    creative_brief: creator ? {
      id: `brief-${id}`,
      business_case_id: id,
      creator_id: creatorId,
      status: 'responded',
      sent_at: '2026-03-16T10:00:00Z',
      brief_text: `Brief for ${title}\n\nAudience: ${marketing.primary_target_audience}\n\nPlease confirm interest, fee, conditions, availability, and creative approach.`,
      creator_response: {
        interest: 'Aligned',
        fee_expectation: formatNairaV3(Math.round(value * 0.35)),
        availability: 'Available in the proposed campaign window.',
        proposed_concept: `${creator.name} can translate the brand objective into creator-led cultural storytelling.`,
      },
    } : null,
    creative_snapshot: strategy,
    contract: ['deliver', 'closed'].includes(stage) ? {
      id: `contract-${id}`,
      business_case_id: id,
      template: 'creator_principal',
      status: 'signed',
      value,
      parties: [brand?.company || 'Brand', creator?.name || 'Creator', 'TASCK'],
      signed_at: '2026-03-24T12:00:00Z',
      ai_risk_flags: [],
    } : null,
    deliverables,
    final_report: report,
  };
};

const presentationBundles = [
  makePresentationBundle({
    id: 'proj-cocacola-campus-cooler',
    brandId: 'brand-cocacola',
    creatorId: 'creator-boyspyce',
    rmId: 'rm-temi',
    title: 'Campus Cooler Tour',
    stage: 'plan',
    value: 72000000,
    days: 6,
    nextAction: 'Strategy Snapshot is with TASCK for final budget tightening.',
    strategyStatus: 'under_review',
  }),
  makePresentationBundle({
    id: 'proj-cocacola-real-magic-december',
    brandId: 'brand-cocacola',
    creatorId: 'creator-davido',
    rmId: 'rm-temi',
    title: 'Real Magic December',
    stage: 'deliver',
    value: 160000000,
    days: 18,
    nextAction: 'Content production and brand review windows are active.',
    strategyStatus: 'approved',
    deliverables: [
      { id: 'coke-del-1', title: 'Hero film treatment', status: 'approved', brandApproved: '18 Apr', paymentReleased: true },
      { id: 'coke-del-2', title: 'Creator launch scripts', status: 'pending_rm_review', brandApproved: null, paymentReleased: false },
      { id: 'coke-del-3', title: 'Retail activation content plan', status: 'pending_upload', brandApproved: null, paymentReleased: false },
    ],
  }),
  makePresentationBundle({
    id: 'proj-mtn-campus-connect',
    brandId: 'brand-mtn',
    creatorId: 'creator-donjazzy',
    rmId: 'rm-tope',
    title: 'Campus Connect Live',
    stage: 'frame',
    value: 90000000,
    days: 5,
    nextAction: 'Alignment Snapshot is awaiting MTN brand review.',
    alignmentStatus: 'sent_to_brand',
  }),
  makePresentationBundle({
    id: 'proj-mtn-data-rhythm',
    brandId: 'brand-mtn',
    creatorId: 'creator-ayra',
    rmId: 'rm-tope',
    title: 'Data Rhythm Challenge',
    stage: 'plan',
    value: 115000000,
    days: 9,
    nextAction: 'Creator discussion has been captured; Strategy Snapshot is ready for brand review.',
    strategyStatus: 'sent_to_brand',
  }),
  makePresentationBundle({
    id: 'proj-star-night-market',
    brandId: 'brand-star',
    creatorId: 'creator-gold',
    rmId: 'rm-adaeze',
    title: 'Star Night Market',
    stage: 'frame',
    value: 68000000,
    days: 7,
    nextAction: 'Alignment Snapshot is awaiting Nigerian Breweries approval.',
    alignmentStatus: 'under_review',
  }),
  makePresentationBundle({
    id: 'proj-star-sound-city',
    brandId: 'brand-star',
    creatorId: 'creator-rema',
    rmId: 'rm-adaeze',
    title: 'Sound City Sessions',
    stage: 'plan',
    value: 125000000,
    days: 11,
    nextAction: 'Strategy Snapshot is being finalized for brand review.',
    strategyStatus: 'draft',
  }),
];

const normalizeBundleForStage = (bundle) => {
  const stage = bundle?.business_case?.stage;
  const stageRank = { connect: 0, frame: 1, plan: 2, deliver: 3, closure: 4, closed: 5 }[stage] ?? 0;
  const now = new Date().toISOString();
  const alignmentApproved = stageRank >= 2 && bundle.alignment_snapshot;
  const strategyApproved = stageRank >= 3 && bundle.creative_snapshot;
  return {
    ...bundle,
    alignment_snapshot: alignmentApproved
      ? {
          ...bundle.alignment_snapshot,
          status: 'approved',
          approved_at: bundle.alignment_snapshot.approved_at || now,
          approved_by: bundle.alignment_snapshot.approved_by || bundle.brand?.primaryContact || 'Brand',
          approved_by_party: bundle.alignment_snapshot.approved_by_party || 'brand',
        }
      : bundle.alignment_snapshot,
    creative_snapshot: strategyApproved
      ? {
          ...bundle.creative_snapshot,
          status: 'approved',
          approved_at: bundle.creative_snapshot.approved_at || now,
          approved_by: bundle.creative_snapshot.approved_by || bundle.brand?.primaryContact || 'Brand',
        }
      : bundle.creative_snapshot,
    business_case: {
      ...bundle.business_case,
      frame: alignmentApproved
        ? {
            ...(bundle.business_case.frame || {}),
            alignment_snapshot_status: 'approved',
          }
        : bundle.business_case.frame,
      plan: strategyApproved
        ? {
            ...(bundle.business_case.plan || {}),
            creative_snapshot_status: 'approved',
            strategy_snapshot_status: 'approved',
          }
        : bundle.business_case.plan,
    },
  };
};

export const loadBrandPortalBundles = (brandId = getBrandPortalSession().brandId) => {
  const baseBundles = buildMockBusinessCases()
    .filter((bc) => bc.brand_id === brandId)
    .map((bc) => getStoredDemoBundle(bc.id) || buildMockBusinessCaseBundle(bc.id))
    .filter(Boolean);
  const storedBundles = listStoredDemoBundles().filter((bundle) => bundle?.business_case?.brand_id === brandId);
  const extras = presentationBundles.filter((bundle) => bundle.business_case.brand_id === brandId);
  const byId = new Map();
  [...baseBundles, ...extras, ...storedBundles].forEach((bundle) => byId.set(bundle.business_case.id, bundle));
  return Array.from(byId.values()).map(normalizeBundleForStage);
};

export const loadBrandPortalBundle = (id, brandId = getBrandPortalSession().brandId) =>
  loadBrandPortalBundles(brandId).find((bundle) => bundle.business_case.id === id) || null;

export const normalizeStrategyDeliverables = (deliverables = []) =>
  deliverables.map((item, index) => (typeof item === 'string' ? { num: index + 1, title: item, format: 'Deliverable', duration: '' } : item));

export const normalizeStrategyBudget = (budget) =>
  Array.isArray(budget)
    ? budget
    : Object.entries(budget?.allocation || {}).map(([line, amount]) => ({ line: line.replace(/_/g, ' '), amount }));

export const normalizeStrategyMetrics = (metrics = []) =>
  metrics.map((item) => (typeof item === 'string' ? { kpi: item.split(':')[0], target: item.split(':').slice(1).join(':').trim() } : item));

export const strategySections = (snapshot) => (
  Array.isArray(snapshot?.sections) && snapshot.sections.length
    ? snapshot.sections
    : [
        { heading: '1. EXECUTIVE SNAPSHOT', type: 'prose', content: snapshot.concept || '' },
        { heading: '4. CREATOR STRATEGY', type: 'bullets', items: normalizeStrategyDeliverables(snapshot.deliverables || []).map((d) => `${d.title}: ${d.format}${d.duration ? ` (${d.duration})` : ''}`) },
        { heading: '6. COMMERCIAL OVERVIEW', type: 'bullets', items: normalizeStrategyBudget(snapshot.budget).map((b) => `${b.line}: ${formatNairaV3(b.amount)}`) },
        { heading: '8. TRACKING PLAN', type: 'kpis', items: normalizeStrategyMetrics(snapshot.success_metrics || []) },
      ]
);

export const snapshotDocsFromBundle = (bundle) => {
  const docs = [];
  if (bundle.alignment_snapshot) {
    docs.push({
      id: `alignment-${bundle.business_case.id}`,
      kind: 'alignment',
      label: 'Alignment Snapshot',
      snapshot: bundle.alignment_snapshot,
      sections: Array.isArray(bundle.alignment_snapshot.sections) ? bundle.alignment_snapshot.sections : [],
      comments: bundle.alignment_snapshot.brand_comments || [],
      business_case: bundle.business_case,
      brand: bundle.brand,
    });
  }
  if (bundle.creative_snapshot) {
    docs.push({
      id: `strategy-${bundle.business_case.id}`,
      kind: 'strategy',
      label: 'Strategy Snapshot',
      snapshot: bundle.creative_snapshot,
      sections: strategySections(bundle.creative_snapshot),
      comments: bundle.creative_snapshot.brand_comments || [],
      business_case: bundle.business_case,
      brand: bundle.brand,
    });
  }
  return docs;
};

export const approvalDocsForBrand = (brandId = getBrandPortalSession().brandId) =>
  loadBrandPortalBundles(brandId)
    .flatMap(snapshotDocsFromBundle)
    .filter((doc) => isPendingApprovalStatus(doc.snapshot?.status));

export const vaultDocsForBrand = (brandId = getBrandPortalSession().brandId) =>
  loadBrandPortalBundles(brandId).flatMap((bundle) => {
    const approvedSnapshots = snapshotDocsFromBundle(bundle).filter((doc) => doc.snapshot?.status === 'approved');
    const docs = [...approvedSnapshots];
    if (bundle.contract) {
      docs.push({
        id: `contract-${bundle.business_case.id}`,
        kind: 'contract',
        label: 'Signed Contract',
        status: bundle.contract.status,
        business_case: bundle.business_case,
        title: `${bundle.business_case.title}: Contract`,
        summary: `${bundle.contract.parties?.join(' / ') || 'Contract parties'}, ${formatNairaV3(bundle.contract.value)}`,
        date: bundle.contract.signed_at || bundle.contract.created_at,
      });
    }
    if (bundle.final_report) {
      docs.push({
        id: `report-${bundle.business_case.id}`,
        kind: 'report',
        label: 'Final Report',
        status: 'generated',
        business_case: bundle.business_case,
        title: bundle.final_report.title,
        summary: bundle.final_report.summary,
        date: bundle.final_report.generated_at || bundle.final_report.created_at,
        report: bundle.final_report,
      });
    }
    const approvedDeliverables = (Array.isArray(bundle.deliverables) ? bundle.deliverables : [])
      .filter((item) => item.status === 'approved')
      .map((item) => ({
        id: `deliverable-${bundle.business_case.id}-${item.id}`,
        kind: 'deliverable',
        label: 'Approved Deliverable',
        status: item.status,
        business_case: bundle.business_case,
        title: item.title,
        summary: item.brandApproved ? `Brand approved ${item.brandApproved}` : 'Brand approved deliverable',
        date: item.brandApproved,
      }));
    return [...docs, ...approvedDeliverables];
  });

