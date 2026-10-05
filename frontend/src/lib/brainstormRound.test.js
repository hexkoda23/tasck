import { pickActiveBrainstormRound } from './brainstormRound';

describe('pickActiveBrainstormRound', () => {
  it('returns null for no rounds', () => {
    expect(pickActiveBrainstormRound([])).toBeNull();
    expect(pickActiveBrainstormRound(undefined)).toBeNull();
  });

  it('prefers the analyzed round over a newer empty duplicate', () => {
    const analyzed = { id: 'bs-old', transcript: 'Full transcript', creator_selector: { risks: 'x' }, updated_at: '2026-09-01T10:00:00Z' };
    const empty = { id: 'bs-new', creator_selector: { risks: '' } };
    expect(pickActiveBrainstormRound([analyzed, empty]).id).toBe('bs-old');
  });

  it('prefers a manually filled round over an empty one', () => {
    const filled = { id: 'bs-a', creator_selector: { timelines: '6 weeks' } };
    const empty = { id: 'bs-b', creator_selector: {}, created_at: '2026-09-02T00:00:00Z' };
    expect(pickActiveBrainstormRound([filled, empty]).id).toBe('bs-a');
  });

  it('picks the most recently updated among filled rounds', () => {
    const older = { id: 'bs-1', transcript: 'a', updated_at: '2026-09-01T00:00:00Z' };
    const newer = { id: 'bs-2', creator_selector: { risks: 'r' }, updated_at: '2026-09-03T00:00:00Z' };
    expect(pickActiveBrainstormRound([newer, older]).id).toBe('bs-2');
  });

  it('keeps the old "last row" behaviour on a tie', () => {
    expect(pickActiveBrainstormRound([{ id: 'first' }, { id: 'last' }]).id).toBe('last');
  });
});
