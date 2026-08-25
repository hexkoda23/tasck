/**
 * Regression: the Creator Alignment Brief must carry THIS project and THIS
 * creator, not a blank template.
 *
 * Reported from production: a brief went out reading "Brand / Organisation:
 * Brand", "Project working title: Business Case Project", "TTA project lead:
 * TTA project lead" while the creator's own fields were filled in correctly.
 */

import {
  generateCreatorBriefDraft,
  briefIsReady,
} from './creatorBrief';

const CREATOR = {
  id: 'creator-rema',
  name: 'Rema',
  genre: 'Afrobeats/Afrorave',
  location: 'Lagos',
  platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram'],
  rate_card: '₦75M–₦100M',
};

// Shaped like the real /business-cases/{id} payload.
const BUNDLE = {
  business_case: {
    id: 'bc-nike',
    title: 'Nike - Business Call Connect',
    connect: {
      marketing_intelligence: {
        // Raw transcript spill. Readable prose lives in the snapshot, and the
        // brief must prefer that.
        key_marketing_focus: "on elite runners.\nWe're much more interested in everyday people",
      },
    },
  },
  brand: { company: 'Nike', relationship_manager_name: 'MI' },
  alignment_snapshot: {
    sections: [
      {
        heading: 'What We Understand You Are Trying to Achieve',
        content: 'We understand that the main goal of this project is to: Nike wants to increase running participation in Nigeria by building creator-led communities. The focus is on behaviour change.',
      },
      {
        heading: 'The Core Problem / Opportunity',
        content: 'People buy Nike for fashion but lack community support to sustain running habits.',
      },
      {
        heading: 'Priority Audience / Beneficiary',
        content: 'The priority audience appears to be:',
        items: [
          'Primary Audience: Urban professionals aged 28 to 40 already interested in wellness',
          'Audience Example: For example, someone who engages with Fashion content. Please confirm a real, representative example.',
        ],
      },
      {
        heading: 'Desired Outcomes and Success Metrics',
        content: 'The outcomes below are our current view of what success should look like. Please confirm or adjust the targets.',
        columns: ['Metrics', 'Success Looks Like'],
        rows: [['Commercial growth through increased participation', 'Track community growth and retention']],
      },
    ],
  },
  brainstorm_round: { planning_fields: {}, creator_selector: {} },
};

describe('briefIsReady', () => {
  it('is false until the business case has loaded', () => {
    // The bundle loads asynchronously. Drafting before it lands is exactly how
    // a creator ends up reading "Brand / Organisation: Brand".
    expect(briefIsReady(null)).toBe(false);
    expect(briefIsReady({})).toBe(false);
    expect(briefIsReady({ business_case: {} })).toBe(false);
  });

  it('is true once the business case is present', () => {
    expect(briefIsReady(BUNDLE)).toBe(true);
  });
});

describe('generateCreatorBriefDraft', () => {
  const brief = generateCreatorBriefDraft(BUNDLE, CREATOR, {});

  it('names the real brand, project and lead', () => {
    expect(brief).toContain('Brand / Organisation: Nike');
    expect(brief).toContain('Project working title: Nike - Business Call Connect');
    expect(brief).toContain('TTA project lead: MI');
  });

  it('never falls back to placeholder labels when data exists', () => {
    expect(brief).not.toContain('Organisation: Brand\n');
    expect(brief).not.toContain('Business Case Project');
    expect(brief).not.toContain('TTA project lead: TTA project lead');
  });

  it('takes the objective from the approved snapshot, not transcript spill', () => {
    expect(brief).toContain('Nike wants to increase running participation');
    expect(brief).not.toContain('elite runners');
    // The snapshot lead-in is written for the brand and reads oddly here.
    expect(brief).not.toContain('We understand that the main goal');
  });

  it('carries the problem, the audience and the success measure', () => {
    expect(brief).toContain('lack community support');
    expect(brief).toContain('Urban professionals aged 28 to 40');
    expect(brief).toContain('Commercial growth through increased participation');
  });

  it('never leaks a question aimed at the brand into a creator brief', () => {
    expect(brief).not.toContain('Please confirm a real, representative example');
    expect(brief).not.toContain('Please confirm or adjust the targets');
  });

  it('grounds the creator sections in that creator record', () => {
    expect(brief).toContain('Creator: Rema');
    expect(brief).toContain('Afrobeats/Afrorave');
    expect(brief).toContain('Spotify');
    expect(brief).toContain('your base in Lagos');
    expect(brief).toContain('₦75M–₦100M');
  });

  it('keeps the nine approved section headings', () => {
    [
      '1. Project Reference', '2. Context', '3. Role of the Creative',
      '4. Expected Scope', '5. Indicative Timeline', '6. Working Assumptions',
      '7. Fee Indication Request', '8. Availability & Conditions', '9. Confirmation',
    ].forEach((heading) => expect(brief).toContain(heading));
  });

  it('drops a line entirely rather than printing an empty stub', () => {
    const thin = generateCreatorBriefDraft(
      { business_case: { id: 'bc-1', title: 'Thin Project' }, brand: { company: 'Acme' } },
      CREATOR,
      {},
    );
    expect(thin).toContain('Brand / Organisation: Acme');
    expect(thin).not.toContain('What success looks like for the brand:');
    expect(thin).not.toContain('Who the work needs to reach:');
  });

  it('still produces a brief when nothing but a creator is known', () => {
    const bare = generateCreatorBriefDraft({ business_case: { id: 'bc-1' } }, {}, {});
    expect(bare).toContain('TTA - Creative Alignment Brief');
    expect(bare).toContain('9. Confirmation');
  });
});
