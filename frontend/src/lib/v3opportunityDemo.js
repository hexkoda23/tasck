// v3opportunityDemo.js — DEPRECATED
// This module previously provided demo opportunity candidates for fictional brands.
// It has been replaced by real opportunity data from the backend scanning API.
// All exports are empty/no-op to avoid breaking imports during migration.

export const demoOpportunityCandidates = [];

export const candidateToBusinessOpportunity = (candidate) => ({
  id: candidate.opportunity_id || candidate.id,
  candidate_id: candidate.id,
  brand_id: candidate.accepted_brand_id,
  company: candidate.brand_name,
  title: candidate.campaign_name || 'Scanned marketing opportunity',
  industry: candidate.industry,
  pain_point: candidate.pain_point,
  source: candidate.source_url,
  contact: candidate.contact_email || 'Marketing Team',
  estimated_value: 75000000,
  fit_score: candidate.confidence_score || 70,
  suggested_angle: candidate.suggested_opportunity_angle,
  status: candidate.status === 'accepted' ? 'accepted' : 'new',
});
