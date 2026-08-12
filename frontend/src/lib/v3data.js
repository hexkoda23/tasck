// TASCK v3 - Utility Library
// All demo/mock/seed data arrays have been removed.
// Real data is loaded from the backend API via v3api.js.
//
// This file retains only pure utility functions and config that are
// required by multiple pages and have no backend equivalent.

// Stage config (UI display only)
export const v3Stages = [
  { key: 'connect', label: 'Connect', color: '#9B9380' },
  { key: 'frame', label: 'Frame', color: '#C49B5F' },
  { key: 'plan', label: 'Plan', color: '#1F4A3A' },
  { key: 'deliver', label: 'Deliver', color: '#567B3F' },
  { key: 'closed', label: 'Closed', color: '#B54A37' },
];

// Currency formatter - handles USD ($), Naira (₦), and percentage labels
export const formatNairaV3 = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return '₦0';
  if (amount >= 1000000000) return `₦${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(0)}M`;
  if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
  return `₦${amount}`;
};

// Generic value formatter for business cases / projects.
// Honors a `value_label` override (e.g. "10% of total project budget"),
// USD currency, or falls back to the Naira formatter.
export const formatValueV3 = (record) => {
  if (!record) return '—';
  if (record.value_label) return record.value_label;
  const currency = record.value_currency || record.fee_currency || record.budget_currency;
  const amount = record.value_amount ?? record.estimated_value ?? record.fee_amount ?? record.budget_amount ?? 0;
  if (!amount) return record.value_raw || '—';
  if (currency === 'USD') {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  }
  return formatNairaV3(amount);
};

// Temporary empty exports to get app to compile
export const v3Brands = [];
export const v3Creators = [];
export const v3RMs = [];
export const v3Projects = [];
export const v3Interactions = [];
export const v3AlignmentSnapshots = [];
export const v3FinalReports = [];
export const v3Deliverables = {};
export const v3CreativeSnapshots = [];
export const v3BriefResponses = [];
export const v3CreatorMatches = [];
export const getBrand = (id) => null;
export const getCreator = (id) => null;
export const getRM = (id) => null;
export const getProjectsForBrand = (id) => [];
export const getProjectsForCreator = (id) => [];
export const buildMockBusinessCaseBundle = () => null;
export const buildMockBusinessCases = () => [];
export const buildMockAlignmentSnapshot = () => null;
export const getMockMarketingIntelligence = () => ({});

// ─── REMOVED EXPORTS ─────────────────────────────────────────────────────────
// The following were demo/mock data arrays and have been removed.
// Pages that imported them should now use the corresponding API calls:
//
//  v3Brands         → v3GetBrands()           from '../../../lib/v3api'
//  v3Creators       → v3GetCreators()          from '../../../lib/v3api'
//  v3RMs            → v3ListRelationshipManagers() from '../../../lib/v3api'
//  v3Projects       → v3ListBusinessCases()    from '../../../lib/v3api'
//  v3Interactions   → v3ListInteractions()     from '../../../lib/v3api'
//  v3AlignmentSnapshots → included in v3GetBusinessCase() bundle
//  v3FinalReports   → v3ListFinalReports()     from '../../../lib/v3api'
//  v3Deliverables   → v3ListDeliverables()     from '../../../lib/v3api'
//  v3CreativeSnapshots → v3ListSnapshots()     from '../../../lib/v3api'
//  v3BriefResponses → v3ListBriefs()           from '../../../lib/v3api'
//  v3CreatorMatches → v3SuggestCreatorMatches() from '../../../lib/v3api'
//
//  getBrand()       → v3GetBrand(id)           from '../../../lib/v3api'
//  getCreator()     → v3GetCreator(id)         from '../../../lib/v3api'
//  getRM()          → v3ListRelationshipManagers() and filter by id
//  getProjectsForBrand(id) → v3ListBusinessCases({ brand_id: id })
//  getProjectsForCreator(id) → v3ListBusinessCases({ creator_id: id })
//
//  buildMockBusinessCaseBundle() → v3GetBusinessCase(id) returns a real bundle
//  buildMockAlignmentSnapshot()  → included in real business case bundle
//  getMockMarketingIntelligence() → real data from business case connect stage
// ─────────────────────────────────────────────────────────────────────────────
