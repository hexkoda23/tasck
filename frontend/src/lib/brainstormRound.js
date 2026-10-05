// A snapshot can end up with more than one Creator Selector round (legacy
// rows, double page loads). Open the one holding the admin's work: rounds with
// a transcript or any filled selector field beat empty ones, then the most
// recently touched wins. Mirrors _pick_active_brainstorm_round in
// backend/v3_routes.py (which picks where transcript analysis writes) - keep
// the two in sync.
export const pickActiveBrainstormRound = (rows) => {
  const list = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const key = (doc) => {
    const selector = doc.creator_selector || {};
    const hasContent = Boolean(String(doc.transcript || '').trim())
      || Object.values(selector).some((v) => String(v || '').trim());
    return [hasContent ? 1 : 0, String(doc.updated_at || doc.transcript_analyzed_at || doc.created_at || '')];
  };
  let best = null;
  let bestKey = null;
  // Walk newest-inserted first so ties go to the latest row.
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const k = key(list[i]);
    if (!best || k[0] > bestKey[0] || (k[0] === bestKey[0] && k[1] > bestKey[1])) {
      best = list[i];
      bestKey = k;
    }
  }
  return best;
};
