import { businessCaseCounts, currentBusinessCases, reconcileProjectOverview } from './businessCaseScope';

const cases = [
  { id: 'frame-1', brand_id: 'nike', stage: 'frame', engagement_track: 'paid' },
  { id: 'frame-2', brand_id: 'nike', stage: 'frame', engagement_track: 'paid' },
  { id: 'parkway', brand_id: 'parkway', stage: 'plan', business_case_phase: 'reporting', engagement_track: 'paid', estimated_value: 0 },
  { id: 'pluto', brand_id: 'pluto', stage: 'plan', business_case_phase: 'delivery', engagement_track: 'paid', estimated_value: 250000 },
  { id: 'jenjie', brand_id: 'jenjie', stage: 'plan', business_case_phase: 'reporting', engagement_track: 'paid', estimated_value: 20000000 },
];

test('counts only current Business Cases and uses their saved phases', () => {
  expect(currentBusinessCases(cases).map((item) => item.id).sort()).toEqual(['jenjie', 'parkway', 'pluto']);
  expect(businessCaseCounts(cases)).toEqual({
    business_cases_total: 3,
    paid_count: 3,
    paid_total_value: 20250000,
    grant_count: 0,
    grant_total_value: 0,
    by_stage: { plan: 0, deliver: 1, reporting: 2 },
  });
});

test('preserves intentional new projects for the same brand', () => {
  const rows = [
    { id: 'one', brand_id: 'brand', stage: 'plan', updated_at: '2026-10-01' },
    { id: 'two', brand_id: 'brand', stage: 'plan', updated_at: '2026-10-02', project_start_mode: 'new_project' },
  ];
  expect(currentBusinessCases(rows)).toHaveLength(2);
});

test('recognizes saved phase markers on older CRM records', () => {
  const rows = [
    { id: 'planned', brand_id: 'one', stage: 'frame', plan: { planning_completed_at: '2026-10-01' } },
    { id: 'reported', brand_id: 'two', stage: 'frame', final_report_sent_at: '2026-10-02' },
  ];
  expect(businessCaseCounts(rows).by_stage).toEqual({ plan: 1, deliver: 0, reporting: 1 });
});

test('overview project tiles and pipeline reconcile to the same three cases', () => {
  const old = {
    portfolio: { active_projects: { items: cases.map((item) => ({ case_id: item.id, brand: item.brand_id })) } },
    projects: cases.map((item) => ({ case_id: item.id, stage: 'frame' })),
    workload: [], activity: [],
  };
  const result = reconcileProjectOverview(old, cases);
  expect(result.portfolio.active_projects.value).toBe(3);
  expect(result.projects_total).toBe(3);
  expect(result.pipeline.map((stage) => stage.count)).toEqual([0, 1, 2, 0]);
  expect(result.pipeline.reduce((total, stage) => total + stage.count, 0)).toBe(3);
  expect(result.status).toEqual([{ key: 'new', label: 'New', count: 3 }]);
  expect(result.projects.map((item) => item.case_id).sort()).toEqual(['jenjie', 'parkway', 'pluto']);
});
