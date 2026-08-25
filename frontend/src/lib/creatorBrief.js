// TASCK OS - Creator Alignment Brief draft
//
// The brief a creator receives before pricing. It keeps the nine-section shape
// the client approved (Chioma's review: no AI-style parentheticals like
// "(Creator Version)" or "(Signal Only)", no instruction phrases like
// "Describe responsibility, not outputs", no "Internal name:" meta lines) and
// fills it from THIS project and THIS creator.
//
// Two things used to make it read like a blank template:
//
//  1. It was built from whatever the page had at that moment. The bundle loads
//     asynchronously, so when the creator list won the race the draft was
//     written against an empty business case - "Brand", "Business Case
//     Project", "TTA project lead" - and then cached, so the real data never
//     replaced it. Callers must now wait for the bundle (see briefIsReady).
//
//  2. Where it did reach for content it preferred `marketing_intelligence`,
//     whose fields are raw transcript fragments ("on elite runners.\nWe're
//     much more interested in everyday people..."). The Alignment Snapshot
//     holds the same facts as approved prose, so that is read first now.

const CLEAN_PAIRS = [
  [/â€”/g, '-'],
  [/â€“/g, '-'],
  [/â€¦/g, '...'],
  [/â€¢/g, '-'],
  [/â‚¦/g, '₦'],
  [/Ã—/g, 'x'],
  [/Â·/g, ' - '],
  [/ðŸ[-¿]{1,3}/g, ''],
  [/ï¿½/g, ''],
];

export const cleanBriefText = (value) => {
  if (value === undefined || value === null) return '';
  let text = String(value);
  CLEAN_PAIRS.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
  return text
    .replace(new RegExp(['awer', 'ness'].join(''), 'gi'), 'awareness')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

// Lead-ins the snapshot writes for a brand audience. They are addressed to the
// client ("we would like to confirm...") and read oddly in a creator's brief,
// so the sentence they introduce is kept and the lead-in is dropped.
const SNAPSHOT_LEAD_INS = [
  /^we understand that the main goal of this project is to:?\s*/i,
  /^the priority audience appears to be:?\s*/i,
  /^the outcomes below are[^.]*\.\s*/i,
  /^our understanding is that:?\s*/i,
  /^we understand that:?\s*/i,
  /^the highest priority is\s*/i,
];

const stripLeadIn = (text) => {
  let out = String(text || '').trim();
  SNAPSHOT_LEAD_INS.forEach((pattern) => { out = out.replace(pattern, ''); });
  return out.trim();
};

// Sentences the snapshot addresses to the CLIENT, asking them to check the
// draft. They are not instructions for a creator and must never reach one.
const CLIENT_ASKS = /^(please confirm|please adjust|please share the|please review|we would like to confirm|confirm or adjust|admin to confirm)/i;

const sentencesOf = (text) =>
  String(text || '').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [];

const firstSentences = (text, count) => {
  const kept = sentencesOf(text)
    .map((part) => part.trim())
    .filter((part) => part && !CLIENT_ASKS.test(part));
  const out = kept.slice(0, count).join(' ').trim();
  // A section that was nothing but a lead-in and an ask leaves a stub behind;
  // an empty string lets the caller drop the line entirely rather than print
  // "What success looks like for the brand: Please confirm or adjust."
  return out.length < 12 ? '' : out;
};

// Pull a section out of the Alignment Snapshot by a loose heading match, since
// headings are admin-editable and drift ("Priority Audience / Beneficiary" vs
// "Priority Audience").
const snapshotSection = (snapshot, needles) => {
  const sections = Array.isArray(snapshot?.sections) ? snapshot.sections : [];
  for (const needle of needles) {
    const hit = sections.find((section) => String(section?.heading || '').toLowerCase().includes(needle));
    if (!hit) continue;
    const parts = [];
    const content = stripLeadIn(cleanBriefText(hit.content));
    if (content) parts.push(/[.!?]$/.test(content) ? content : `${content}.`);
    const push = (line) => {
      // End each fragment as a sentence so firstSentences() can split them;
      // snapshot list items are written without terminating punctuation.
      if (line) parts.push(/[.!?]$/.test(line) ? line : `${line}.`);
    };
    if (Array.isArray(hit.items)) {
      hit.items.forEach((item) => {
        push(cleanBriefText(typeof item === 'object' ? (item?.text || item?.label || '') : item));
      });
    }
    // Desired Outcomes keeps its content in a metrics table, not in `content`.
    if (Array.isArray(hit.rows)) {
      hit.rows.slice(0, 3).forEach((row) => {
        const cells = (Array.isArray(row) ? row : Object.values(row || {}))
          .map((cell) => cleanBriefText(cell)).filter(Boolean);
        push(cells.join(' - '));
      });
    }
    const joined = parts.join(' ').trim();
    if (joined) return joined;
  }
  return '';
};

const listOf = (value) => (Array.isArray(value) ? value.map((v) => cleanBriefText(v)).filter(Boolean) : []);

export const briefBrandName = (brand) =>
  cleanBriefText(brand?.company || brand?.name || brand?.brand_name) || 'Brand';

export const briefCreatorName = (creator) =>
  cleanBriefText(creator?.name || creator?.creator_name || creator?.creative_name || creator?.company_name || creator?.id) || 'Creator';

export const briefCreatorSpecialty = (creator) =>
  cleanBriefText(
    creator?.specialty || creator?.Specialty || creator?.genre || creator?.category
    || creator?.niche || creator?.content_type || creator?.contentType
    || creator?.primary_platform || creator?.platform,
  ) || 'their creative practice';

export const briefCreatorContact = (creator) =>
  cleanBriefText(
    creator?.email || creator?.contact_email || creator?.creator_email || creator?.manager_email
    || creator?.phone || creator?.contact_phone || creator?.instagram || creator?.tiktok || creator?.handle,
  );

/**
 * True once there is enough loaded project data to write a real brief.
 *
 * Without this guard the draft is written against an empty bundle and cached,
 * which is exactly how a creator ends up reading "Brand / Organisation: Brand".
 */
export const briefIsReady = (bundle) => Boolean(bundle?.business_case?.id);

export const generateCreatorBriefDraft = (bundle, creator, planningFields = {}) => {
  const bc = bundle?.business_case || {};
  const brand = bundle?.brand || {};
  const snapshot = bundle?.alignment_snapshot || {};
  const marketing = bc.connect?.marketing_intelligence || snapshot.marketing_intelligence || {};
  const selector = bundle?.brainstorm_round?.creator_selector || {};

  const projectTitle = cleanBriefText(bc.title) || 'Business Case Project';
  const brandName = briefBrandName(brand);
  const creatorLabel = briefCreatorName(creator);
  const specialty = briefCreatorSpecialty(creator);
  const leadName = cleanBriefText(bc.relationship_manager_name || brand.relationship_manager_name) || 'TTA project lead';
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const planned = (label) => cleanBriefText(planningFields?.[label]);
  // Planning notes first (an admin typed them for this project), then the
  // approved snapshot prose, then the raw transcript extraction, then a
  // generic line. The old order put the transcript fragments first.
  const pick = (...candidates) => {
    for (const candidate of candidates) {
      const value = cleanBriefText(candidate);
      if (value) return value;
    }
    return '';
  };

  const objective = pick(
    planned('Campaign core idea'),
    firstSentences(snapshotSection(snapshot, ['trying to achieve', 'objective', 'what we understand']), 2),
    marketing.key_marketing_focus,
  ) || `Position ${brandName} with a credible creator-led cultural idea that supports the approved business case.`;

  const whyNow = pick(
    planned('Audience and behavior'),
    firstSentences(snapshotSection(snapshot, ['core problem', 'problem / opportunity', 'opportunity']), 2),
    marketing.current_marketing_challenge,
  ) || 'The brand is preparing a creator partnership and needs pricing/fit confirmation before final scope approval.';

  const audience = pick(
    firstSentences(snapshotSection(snapshot, ['priority audience', 'audience / beneficiary', 'audience']), 1),
    marketing.primary_target_audience,
  );

  const successLooksLike = firstSentences(
    snapshotSection(snapshot, ['desired outcomes', 'success metrics', 'outcomes']), 2,
  );

  const platforms = listOf(creator?.platforms);
  const rateCard = cleanBriefText(creator?.rate_card || creator?.fee);
  const timeline = pick(
    planned('Timeline inference'),
    selector.timelines,
    marketing.timeline,
  ) || 'To be confirmed after brand approval and creator availability check.';

  const scopeSignal = pick(
    planned('Content/deliverables idea log'),
    selector.funnel_milestones,
  ) || 'Creator involvement is being explored for planning and pricing alignment only.';

  const feeAsk = pick(planned('Budget planning'), selector.budget_assumption)
    || (rateCard
      ? `Your rate card on file with TTA is ${rateCard}. Please confirm a fee range or fixed fee for the engagement signal above.`
      : 'Creator to propose a fee range or fixed fee for the engagement signal above.');

  const conditions = pick(planned('Risks and assumptions'), selector.risks)
    || 'Please share category conflicts, usage limits, exclusivity restrictions, production requirements, travel constraints, or anything that would affect the final scope.';

  // Why this creator, in the creator's own terms - grounded in the record TTA
  // holds, never invented.
  const fitParts = [];
  if (specialty && specialty !== 'their creative practice') fitParts.push(`your work in ${specialty}`);
  if (platforms.length) fitParts.push(`your reach across ${platforms.slice(0, 3).join(', ')}`);
  if (cleanBriefText(creator?.location)) fitParts.push(`your base in ${cleanBriefText(creator.location)}`);
  const whyYou = fitParts.length
    ? `You were shortlisted for this project because of ${fitParts.join(', ')}.`
    : '';

  const lines = [
    'TTA - Creative Alignment Brief',
    '',
    '1. Project Reference',
    `Brand / Organisation: ${brandName}`,
    `Project working title: ${projectTitle}`,
    `TTA project lead: ${leadName}`,
    `Date shared with creator: ${today}`,
    `Creator: ${creatorLabel}`,
    `Creator contact: ${briefCreatorContact(creator) || 'To be confirmed'}`,
    '',
    '2. Context',
    `Brand objective: ${objective}`,
    `Why this project is happening now: ${whyNow}`,
  ];
  if (audience) lines.push(`Who the work needs to reach: ${audience}`);
  if (successLooksLike) lines.push(`What success looks like for the brand: ${successLooksLike}`);

  lines.push(
    '',
    '3. Role of the Creative',
    'The creative would act as:',
    '- Public-facing lead',
    '- Conceptual lead',
    '- Talent & cultural translator',
    '- Executional partner',
    `Primary responsibility: ${planned('Creator direction')
      || `${creatorLabel} should help translate ${brandName}'s objective through ${specialty} while keeping the idea credible to their audience.`}`,
  );
  if (whyYou) lines.push(`Why you for this project: ${whyYou}`);

  lines.push(
    '',
    '4. Expected Scope',
    'This engagement may include:',
    '- Content creation',
    '- Appearances / representation',
    '- Concept contribution',
    '- Performance / activation involvement',
    '- Other',
    `Scope signal from planning: ${scopeSignal}`,
    '- Specific deliverables are not yet defined',
    '- Final scope is subject to brand approval',
    '',
    '5. Indicative Timeline',
    `Proposed engagement period: ${timeline}`,
    'Known timing constraints: Confirm availability, blackout dates, production constraints, and any campaign launch windows.',
    '',
    '6. Working Assumptions',
    '- TTA will coordinate engagement and act as administrative lead',
    '- Contracts issued through TTA',
    '- Payment processed through TTA',
    '- Reporting and brand liaison handled by TTA',
    '',
    '7. Fee Indication Request',
    `Fee for engagement: ${feeAsk}`,
    'Fee basis: Project based / Time based / Retainer style',
    'What fee covers: Please state what your indication includes, including content, appearances, concept contribution, usage, exclusivity, production support, or management fees where relevant.',
    '',
    '8. Availability & Conditions',
    'Are you available within proposed period? Yes / Conditional / No',
    `Conditions/exclusions: ${conditions}`,
    '',
    '9. Confirmation',
    '[ ] I understand this is for planning and pricing alignment only',
    '[ ] I understand this is not a confirmed booking',
    '[ ] I am open to proceeding subject to final scope and budget approval',
    '',
    'Name:',
    'Date:',
  );

  return lines.join('\n');
};

export default generateCreatorBriefDraft;
