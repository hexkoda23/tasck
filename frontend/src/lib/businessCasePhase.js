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

// `plan` also stores the remaining Framing work after alignment approval.
// Opening a page or remembering an entry order is not document completion.
export const unfinishedFramingPath = (businessCase = {}, remembered = '') => {
  if (businessCase.stage !== 'plan') return '';
  const plan = businessCase.plan || {};
  if (['delivery', 'reporting'].includes(businessCase.business_case_phase)
    || plan.planning_completed_at || plan.delivery_completed_at
    || businessCase.deliverables_started_at || businessCase.reporting_started_at
    || businessCase.imported_at || businessCase.is_imported) return '';
  const hasBrief = Boolean(plan.generated_brief?.sections?.length);
  const pitchApproved = plan.pitch_deck_status === 'approved' || Boolean(plan.pitch_deck_approved_at);
  if (hasBrief && pitchApproved) return '';
  if (/\/frame\//.test(remembered)) return remembered;
  if (!hasBrief && (plan.pitch_deck_id || plan.pitch_deck_status || pitchApproved)) return '/frame/brief';
  if (hasBrief) return '/frame/pitch-deck';
  return '/frame/brainstorm-transcript';
};
