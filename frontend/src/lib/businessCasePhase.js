// A case can reach Delivery or Reporting without older completion timestamps.
// Use both its recorded phase and completion markers when unlocking navigation.
export const unlockedBusinessCasePhaseIndex = (businessCase = {}) => {
  const stage = businessCase.stage;
  const phase = businessCase.business_case_phase;
  const plan = businessCase.plan || {};

  if (stage === 'reporting' || stage === 'closed' || phase === 'reporting'
    || plan.delivery_completed_at || businessCase.reporting_started_at || businessCase.final_report_sent_at) {
    return 2;
  }
  if (stage === 'deliver' || phase === 'delivery' || plan.planning_completed_at
    || businessCase.deliverables_started_at) {
    return 1;
  }
  return 0;
};
