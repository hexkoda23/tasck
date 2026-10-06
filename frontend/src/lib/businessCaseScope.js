// A Business Case starts at Planning. Connect and Framing records belong to
// CRM Brands and must not inflate project counts on the Business Case pages.
export const isBusinessCaseProject = (businessCase = {}) =>
  ['plan', 'deliver', 'reporting', 'closed'].includes(businessCase.stage)
  || ['planning', 'delivery', 'reporting'].includes(businessCase.business_case_phase)
  || Boolean(businessCase.plan?.planning_completed_at || businessCase.plan?.delivery_completed_at
    || businessCase.deliverables_started_at || businessCase.reporting_started_at
    || businessCase.final_report_sent_at);

export const businessCaseDisplayStage = (businessCase = {}) => {
  if (businessCase.stage === 'closed' || businessCase.stage === 'reporting'
    || businessCase.business_case_phase === 'reporting' || businessCase.plan?.delivery_completed_at
    || businessCase.reporting_started_at || businessCase.final_report_sent_at) return 'reporting';
  if (businessCase.stage === 'deliver' || businessCase.business_case_phase === 'delivery'
    || businessCase.deliverables_started_at) return 'deliver';
  return 'plan';
};

export const businessCaseActivityTs = (businessCase = {}) => {
  const stamps = [businessCase.updated_at, businessCase.updatedAt,
    businessCase.last_interaction_at, businessCase.lastInteractionAt,
    businessCase.created_at, businessCase.createdAt];
  (Array.isArray(businessCase.timeline) ? businessCase.timeline : []).forEach((item) => {
    stamps.push(item?.at || item?.updated_at || item?.created_at);
  });
  return Math.max(0, ...stamps.map((value) => Date.parse(value || '') || 0));
};

const isIntentionalNewProject = (businessCase = {}) =>
  businessCase.connect?.project_start_mode === 'new_project'
  || businessCase.project_start_mode === 'new_project'
  || (Array.isArray(businessCase.timeline) ? businessCase.timeline : []).some((item) => item?.force_new === true || item?.project_start_mode === 'new_project');

const newestFirst = (a, b) => businessCaseActivityTs(b) - businessCaseActivityTs(a)
  || String(b.id || '').localeCompare(String(a.id || ''));

export const currentBusinessCases = (items = []) => {
  const latestByBrand = new Map();
  const explicitProjects = [];
  [...(Array.isArray(items) ? items : [])].filter(isBusinessCaseProject).sort(newestFirst).forEach((businessCase) => {
    const brandKey = businessCase.brand_id || businessCase.brand?.id;
    if (!brandKey || isIntentionalNewProject(businessCase)) {
      explicitProjects.push(businessCase);
    } else if (!latestByBrand.has(brandKey)) {
      latestByBrand.set(brandKey, businessCase);
    }
  });
  return [...latestByBrand.values(), ...explicitProjects].sort(newestFirst);
};

export const businessCaseCounts = (items = []) => {
  const cases = currentBusinessCases(items);
  const paid = cases.filter((item) => item.engagement_track === 'paid');
  const grants = cases.filter((item) => item.engagement_track === 'grant');
  const value = (rows) => rows.reduce((total, item) => {
    const amount = Number(item.estimated_value || 0);
    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  return {
    business_cases_total: cases.length,
    paid_count: paid.length,
    paid_total_value: value(paid),
    grant_count: grants.length,
    grant_total_value: value(grants),
    by_stage: Object.fromEntries(['plan', 'deliver', 'reporting'].map((stage) => [stage,
      cases.filter((item) => businessCaseDisplayStage(item) === stage).length])),
  };
};

// The operational endpoint also reports CRM call records. Keep its brand,
// document, meeting and action figures, but derive project figures from the
// same current cases shown on the Business Cases page.
export const reconcileProjectOverview = (overview, allCases = []) => {
  const cases = currentBusinessCases(allCases);
  const active = cases.filter((item) => item.stage !== 'closed');
  const closed = cases.filter((item) => item.stage === 'closed');
  const position = (item) => item.stage === 'closed' ? 'closed' : businessCaseDisplayStage(item);
  const stages = [
    ['plan', 'Plan'], ['deliver', 'Delivery'], ['reporting', 'Reporting'], ['closed', 'Closed'],
  ];
  const pipeline = stages.map(([key, label]) => ({
    key, label, count: cases.filter((item) => position(item) === key).length,
  }));
  const oldItems = new Map((overview.portfolio?.active_projects?.items || []).map((item) => [item.case_id, item]));
  const activeItems = active.map((item) => {
    const old = oldItems.get(item.id) || {};
    const stage = stages.find(([key]) => key === position(item))?.[1] || 'Plan';
    return {
      case_id: item.id, brand: old.brand || item.brand_name || item.title || 'Project',
      title: item.title || '', stage, href: `/business-cases/${item.id}`,
    };
  });
  const healthCounts = new Map();
  cases.forEach((item) => {
    const key = String(item.health || 'new').toLowerCase();
    healthCounts.set(key, (healthCounts.get(key) || 0) + 1);
  });
  const status = [...healthCounts].map(([key, count]) => ({
    key, label: key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()), count,
  }));
  const projectIds = new Set(active.map((item) => item.id));
  const projects = (overview.projects || []).filter((item) => projectIds.has(item.case_id)).map((item) => {
    const businessCase = active.find((entry) => entry.id === item.case_id);
    const stage = stages.find(([key]) => key === position(businessCase))?.[1] || 'Plan';
    return { ...item, stage: position(businessCase), stage_label: stage };
  });
  const workload = (overview.workload || []).map((item) => {
    const count = active.filter((businessCase) => (businessCase.rm_id || '') === (item.rm_id || '')).length;
    return { ...item, cases: count, load: count + (item.brands || 0) + (item.tasks || 0) };
  });
  const totalLoad = workload.reduce((total, item) => total + item.load, 0) || 1;
  workload.forEach((item) => { item.share = Math.round(item.load / totalLoad * 100); });
  return {
    ...overview,
    portfolio: {
      ...overview.portfolio,
      active_projects: {
        value: active.length,
        breakdown: activeItems.slice(0, 10).map((item) => ({ label: item.brand, count: item.stage })),
        items: activeItems,
      },
      completed_projects: {
        value: closed.length,
        breakdown: closed.length ? [{ label: 'Closed projects', count: closed.length }] : [],
        href: '/business-cases',
      },
    },
    pipeline,
    status,
    projects,
    projects_total: active.length,
    workload,
    activity: (overview.activity || []).filter((item) => item.what !== 'Project created'
      || cases.some((businessCase) => businessCase.id === item.case_id)),
  };
};
