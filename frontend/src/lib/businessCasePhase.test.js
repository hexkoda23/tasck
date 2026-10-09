import { unlockedBusinessCasePhaseIndex, unfinishedFramingPath } from './businessCasePhase';

describe('Business Case stage navigation', () => {
  test('keeps Delivery locked while the case is still in Planning', () => {
    expect(unlockedBusinessCasePhaseIndex({ stage: 'plan', business_case_phase: 'planning' })).toBe(0);
  });

  test.each([
    { stage: 'plan', business_case_phase: 'delivery' },
    { stage: 'deliver' },
    { stage: 'plan', plan: { planning_completed_at: '2026-10-06T00:00:00Z' } },
  ])('unlocks Delivery when the case has reached it: %p', (businessCase) => {
    expect(unlockedBusinessCasePhaseIndex(businessCase)).toBe(1);
  });

  test.each([
    { stage: 'plan', business_case_phase: 'reporting' },
    { stage: 'reporting' },
    { stage: 'closed' },
    { stage: 'deliver', plan: { delivery_completed_at: '2026-10-06T00:00:00Z' } },
  ])('unlocks Reporting when the case has reached it: %p', (businessCase) => {
    expect(unlockedBusinessCasePhaseIndex(businessCase)).toBe(2);
  });
});

describe('Continue before Framing is finished', () => {
  const pitch = '/admin/business-cases/bc-1/snapshot/snap-1/frame/pitch-deck';
  test('returns to the pitch deck after exit or refresh when the brief is missing', () => {
    expect(unfinishedFramingPath({ stage: 'plan', plan: { pitch_deck_status: 'approved' } }, pitch)).toBe(pitch);
  });
  test('a remembered Planning visit cannot skip a missing brief', () => {
    expect(unfinishedFramingPath({ stage: 'plan', business_case_phase: 'planning',
      plan: { pitch_deck_id: 'pd-1' } }, '/admin/business-cases/bc-1/plan/planning')).toBe('/frame/brief');
  });
  test('entry order does not count as generating a brief', () => {
    expect(unfinishedFramingPath({ stage: 'plan', plan: { pitch_deck_status: 'approved' } })).toBe('/frame/brief');
  });
  test('complete documents allow Planning', () => {
    expect(unfinishedFramingPath({ stage: 'plan', plan: { pitch_deck_status: 'approved',
      generated_brief: { sections: [{ heading: 'Opportunity' }] } } })).toBe('');
  });
  test.each([{ stage: 'deliver' }, { stage: 'plan', imported_at: '2026-10-09' },
    { stage: 'plan', plan: { planning_completed_at: '2026-10-09' } }])('preserves established downstream work: %p', (bc) => {
    expect(unfinishedFramingPath(bc, pitch)).toBe('');
  });
});
