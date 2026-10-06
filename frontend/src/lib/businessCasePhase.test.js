import { unlockedBusinessCasePhaseIndex } from './businessCasePhase';

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
