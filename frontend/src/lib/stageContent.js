// stageContent
// ---------------------------------------------------------------------------
// Two rules about a project's stages, kept in one testable place.
//
// 1. A closed project is still readable. Closing a project records that the
//    work finished; it does not mean the work disappears. The brand page used
//    to drop closed projects from the list entirely, which took their stage
//    buttons - Alignment, Creator Selector, Creator Match, Brief, Planning,
//    Delivery, Reporting - and everything behind them with it.
//
// 2. Content that has already been generated is never generated again on its
//    own. Each stage page auto-writes its document when it first opens, which
//    is right once and wrong every time after: every re-visit spends credits
//    rewriting something the project already has. The signals below are
//    written to the business case when a document is generated, so they
//    survive a re-visit even when the per-snapshot lookup that feeds the page
//    comes back empty.
//
// A closed project never auto-generates anything at all. There is no version
// of "spend credits on a finished project" that anyone asked for.

export const CLOSED_STAGES = ['closed', 'archived'];

export const isClosed = (businessCase) => (
  String(businessCase?.stage || '').toLowerCase() === 'closed'
);

export const isArchived = (businessCase) => (
  String(businessCase?.stage || '').toLowerCase() === 'archived'
);

export const isDeleted = (businessCase) => businessCase?.status === 'deleted';

/**
 * Projects to LIST on the brand page: everything except deleted and archived,
 * closed ones included and sorted after the live work.
 *
 * Kept separate from the "active" list, which still decides which project the
 * brand page treats as current and offers to continue - a closed project must
 * never become that.
 */
export const listableCases = (items = [], activityTs = () => 0) => [...items]
  .filter((businessCase) => !isDeleted(businessCase) && !isArchived(businessCase))
  .sort((a, b) => {
    const closedDelta = Number(isClosed(a)) - Number(isClosed(b));
    if (closedDelta !== 0) return closedDelta;
    return activityTs(b) - activityTs(a);
  });

// Where each stage records that it has already written its document. These are
// set on the business case itself, not on the alignment snapshot the page is
// scoped to, so they still read true after the active snapshot moves on.
export const GENERATED_MARKERS = {
  pitch_deck: (bundle) => Boolean(
    bundle?.pitch_deck || bundle?.business_case?.plan?.pitch_deck_id,
  ),
  creative_brief: (bundle) => Boolean(
    bundle?.brief || bundle?.business_case?.plan?.generated_brief,
  ),
  final_report: (bundle) => Boolean(
    bundle?.final_report || bundle?.business_case?.closure?.final_report_id,
  ),
};

/** Has this project ever generated this stage's document? */
export const hasGenerated = (bundle, stage) => {
  const marker = GENERATED_MARKERS[stage];
  return marker ? marker(bundle) : false;
};

/**
 * Should a stage page write its document automatically right now?
 *
 * Only when the project is loaded, still open, and has never generated this
 * document before. Everything else - a re-visit, a closed project, a page
 * still waiting for its data - leaves it to the admin's Generate button.
 *
 * @param {object} args
 * @param {object} args.bundle    the business-case bundle, or null while loading
 * @param {string} args.stage     key in GENERATED_MARKERS
 * @param {boolean} [args.alreadyRan] this page already fired once
 * @param {boolean} [args.loadedLocally] the page holds the document in state
 */
export const shouldAutoGenerate = ({ bundle, stage, alreadyRan = false, loadedLocally = false }) => {
  if (alreadyRan || loadedLocally) return false;
  // No bundle yet: generating now would race the data that would have shown
  // the document already exists.
  if (!bundle?.business_case?.id) return false;
  if (isClosed(bundle.business_case) || isArchived(bundle.business_case)) return false;
  return !hasGenerated(bundle, stage);
};

export default shouldAutoGenerate;
