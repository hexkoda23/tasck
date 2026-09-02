import { adminRoute } from './v3AdminRouteBase';

/*
 * The admin business-case flow, in the order an admin actually walks it.
 *
 * Every flow page already knew how to move forward from its own primary
 * action ("Promote to Frame", "Open Pitch Deck", ...), but those actions are
 * only offered while there is work left to do. Coming back to a finished page
 * left no way onward except the browser Back button, which is why FlowShell
 * now renders a footer with Previous / Next on every page. This table is the
 * single source of that order.
 *
 * `suffix` is the part after /business-cases/:id. `scoped` marks the steps
 * that also exist under /business-cases/:id/snapshot/:snapshotId/... - when a
 * Connect call produced several Alignment Snapshots each one owns its own
 * Creator Selector, Pitch Deck and Creative Brief, and moving between them
 * must stay inside the snapshot the admin opened.
 */
export const FLOW_STEPS = [
  { key: 'connect', suffix: '/connect', label: 'Connect / Business Call' },
  { key: 'connect-schedule', suffix: '/connect/schedule', label: 'Conversations & Transcripts' },
  { key: 'snapshot', suffix: '/frame/snapshot', label: 'Alignment Snapshot' },
  { key: 'brainstorm-transcript', suffix: '/frame/brainstorm-transcript', label: 'Brainstorm Transcript' },
  { key: 'brainstorm', suffix: '/frame/brainstorm', label: 'Brainstorm' },
  { key: 'creator-scan', suffix: '/frame/creator-scan', label: 'Creator Selector', scoped: true },
  { key: 'pitch-deck', suffix: '/frame/pitch-deck', label: 'Pitch Deck', scoped: true },
  { key: 'brief', suffix: '/frame/brief', label: 'Creative Brief', scoped: true },
  { key: 'planning', suffix: '/plan/planning', label: 'Planning' },
  { key: 'contracts', suffix: '/delivery/contracts', label: 'Contract Studio' },
  { key: 'deliverables', suffix: '/delivery/deliverables', label: 'Deliverables' },
  { key: 'final-report', suffix: '/reporting/final-report', label: 'Final Report' },
];

/*
 * Pages that sit beside the main chain rather than in it. Nothing links to
 * the Creator Briefing Call today, and the Connect sub-pages are detours the
 * admin is sent to and must be able to come back from, so each names its own
 * neighbours instead of taking a slot in the order above.
 */
const ASIDE_STEPS = {
  '/frame/creator-briefing-call': { label: 'Creator Briefing Call', prev: 'brief', next: 'planning' },
  // The Opportunities page exists to turn opportunities into Alignment
  // Snapshots, so it is a real gate; the rest are read-only detours the admin
  // was sent to, and hiding Next on those would only strand them.
  '/connect/opportunities': { label: 'Opportunities', prev: 'connect-schedule', next: 'snapshot', requires: 'snapshot' },
  '/connect/questions': { label: 'Connect Questions', prev: 'connect-schedule', next: 'snapshot' },
  '/connect/analysis': { label: 'Connect Analysis', prev: 'connect-schedule', next: 'snapshot' },
  '/connect/reschedule': { label: 'Reschedule', prev: 'connect-schedule', next: 'connect-schedule' },
  '/frame/transcripts': { label: 'Frame Transcripts', prev: 'snapshot', next: 'brainstorm-transcript' },
  '/frame/waiting-brand': { label: 'Waiting on Brand', prev: 'snapshot', next: 'brainstorm-transcript' },
  '/frame/admin-review': { label: 'Admin Review', prev: 'snapshot', next: 'brainstorm-transcript' },
  '/frame/approved': { label: 'Approved', prev: 'snapshot', next: 'brainstorm-transcript' },
  '/plan/feedback': { label: 'Feedback', prev: 'planning', next: 'deliverables' },
  '/delivery/waiting-signatures': { label: 'Waiting for Signatures', prev: 'contracts', next: 'deliverables' },
};

const stepByKey = (key) => FLOW_STEPS.find((step) => step.key === key) || null;

/** The part of an admin flow URL after /business-cases/:id, snapshot scope stripped. */
const suffixOf = (pathname) => {
  const match = String(pathname || '').match(/\/business-cases\/[^/]+(?:\/snapshot\/[^/]+)?(\/.*)?$/);
  const suffix = (match && match[1]) || '';
  return suffix.replace(/\/$/, '');
};

export const flowSnapshotId = (pathname) => {
  const match = String(pathname || '').match(/\/business-cases\/[^/]+\/snapshot\/([^/]+)/);
  return (match && match[1]) || '';
};

export const flowStepHref = (step, id, snapshotId) => {
  if (!step) return '';
  if (snapshotId && step.scoped) {
    return adminRoute(`/business-cases/${id}/snapshot/${snapshotId}${step.suffix}`);
  }
  return adminRoute(`/business-cases/${id}${step.suffix}`);
};

/**
 * Previous / next page for the flow page at `pathname`, or nulls when the
 * path is not part of the flow (so FlowShell can render nothing).
 * Legacy /plan/* aliases resolve to the same steps as their /frame/* twins.
 */
export const flowNeighbours = (pathname, id) => {
  if (!id) return { prev: null, next: null };
  const snapshotId = flowSnapshotId(pathname);
  const raw = suffixOf(pathname);
  // /plan/brainstorm, /plan/creator-scan, /plan/brief and
  // /plan/creator-briefing-call are back-compat aliases for the /frame/ paths.
  const suffix = /^\/plan\/(brainstorm|creator-scan|brief|creator-briefing-call)$/.test(raw)
    ? raw.replace('/plan/', '/frame/')
    : raw;

  const aside = ASIDE_STEPS[suffix];
  if (aside) {
    return {
      prev: stepByKey(aside.prev),
      next: stepByKey(aside.next),
      snapshotId,
    };
  }

  const index = FLOW_STEPS.findIndex((step) => step.suffix === suffix);
  if (index === -1) return { prev: null, next: null, snapshotId };
  return {
    prev: index > 0 ? FLOW_STEPS[index - 1] : null,
    next: index < FLOW_STEPS.length - 1 ? FLOW_STEPS[index + 1] : null,
    snapshotId,
  };
};

/*
 * Has the work on a step actually been done?
 *
 * Next is only offered once it has. A Next on every page regardless would let
 * an admin walk the whole flow without generating anything, which is exactly
 * the ordering the stage gating exists to enforce - the footer is there so a
 * FINISHED page can be left again, not so an unfinished one can be skipped.
 *
 * Each rule reads the artifact the step is supposed to produce, from the same
 * bundle every flow page already loads. Anything not listed has no artifact to
 * check and is treated as passable.
 */
const STEP_DONE = {
  // A conversation has been saved against the project - the Connect page's own
  // CTA flips from "Add Transcript" to "Next" on the same condition.
  connect: (bundle, bc) => Boolean(
    (Array.isArray(bundle.meetings) && bundle.meetings.length)
    || Number(bundle.connect_sources_count) > 0
  ),
  // The conversations have been analysed.
  'connect-schedule': (bundle, bc) => Boolean(
    bc.connect?.opportunities_detected_at || bc.connect?.analyzed_at
  ),
  snapshot: (bundle, bc) => Boolean(
    bundle.alignment_snapshot?.id
    || (Array.isArray(bundle.alignment_snapshots) && bundle.alignment_snapshots.length)
    || bc.frame?.alignment_snapshot_id
  ),
  'brainstorm-transcript': (bundle, bc) => Boolean(
    bc.plan?.brainstorm_transcript_analyzed_at || bundle.brainstorm_round?.id
  ),
  brainstorm: (bundle, bc) => Boolean(bundle.brainstorm_round?.id || bc.plan?.brainstorm_round_id),
  'creator-scan': (bundle, bc) => Boolean(
    (Array.isArray(bundle.selected_creator_ids) && bundle.selected_creator_ids.length)
    || (Array.isArray(bc.plan?.selected_creator_ids) && bc.plan.selected_creator_ids.length)
  ),
  'pitch-deck': (bundle, bc) => Boolean(bundle.pitch_deck?.id || bc.plan?.pitch_deck_id),
  brief: (bundle, bc) => Boolean(bundle.creative_brief?.id || bc.plan?.generated_brief),
  // Planning is closed off explicitly; the stepper unlocks Delivery on the
  // same flag.
  planning: (bundle, bc) => Boolean(bc.plan?.planning_completed_at),
  contracts: (bundle, bc) => Boolean(
    bundle.contract?.id || (Array.isArray(bundle.contracts) && bundle.contracts.length)
  ),
  deliverables: (bundle, bc) => Boolean(
    bc.plan?.delivery_completed_at
    || bc.reporting_started_at
    || (Array.isArray(bundle.deliverables) && bundle.deliverables.length)
  ),
};

/* What the admin still has to do, shown where the Next button would be. */
export const STEP_PENDING_HINT = {
  connect: 'Save a conversation with this brand to continue.',
  'connect-schedule': 'Analyze the conversations to continue.',
  snapshot: 'Generate the Alignment Snapshot to continue.',
  'brainstorm-transcript': 'Add and analyse the brainstorm transcript to continue.',
  brainstorm: 'Run the brainstorm to continue.',
  'creator-scan': 'Select at least one creator to continue.',
  'pitch-deck': 'Generate the Pitch Deck to continue.',
  brief: 'Generate the Creative Brief to continue.',
  planning: 'Complete Planning to continue.',
  contracts: 'Generate a contract to continue.',
  deliverables: 'Add a deliverable, or complete Delivery, to continue.',
};

export const flowStepComplete = (stepKey, bundle) => {
  const rule = STEP_DONE[stepKey];
  if (!rule) return true;
  if (!bundle) return false;
  return Boolean(rule(bundle, bundle.business_case || {}));
};

/**
 * The step whose completion gates Next on `pathname`. For a step in the chain
 * that is the step itself; for a detour it is whatever that page names in
 * `requires`, and detours that name nothing are not gated.
 */
export const flowGateKey = (pathname) => {
  const raw = suffixOf(pathname);
  const suffix = /^\/plan\/(brainstorm|creator-scan|brief|creator-briefing-call)$/.test(raw)
    ? raw.replace('/plan/', '/frame/')
    : raw;
  const aside = ASIDE_STEPS[suffix];
  if (aside) return aside.requires || null;
  const step = FLOW_STEPS.find((entry) => entry.suffix === suffix);
  return step ? step.key : null;
};
