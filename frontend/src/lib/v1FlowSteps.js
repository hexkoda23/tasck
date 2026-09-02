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
  '/connect/opportunities': { label: 'Opportunities', prev: 'connect-schedule', next: 'snapshot' },
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
