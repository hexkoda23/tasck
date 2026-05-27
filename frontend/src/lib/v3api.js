// TASCK OS v3 — Frontend API Client
// Wraps every /api/v3/* endpoint. Always returns plain data (response.data).
// Pages can fall back to v3data.js mocks if a call fails (progressive layering).

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const V3 = BACKEND_URL ? `${BACKEND_URL}/api/v3` : '/api/v3';

const v3 = axios.create({ baseURL: V3, headers: { 'Content-Type': 'application/json' } });

v3.interceptors.response.use((response) => {
  const data = response.data;
  if (typeof data === 'string' && data.trim().startsWith('<')) {
    return Promise.reject(new Error('V3 backend unavailable; using demo workflow data.'));
  }
  return response;
});

// -------- Brands / Contacts / Creators --------
export const v3GetBrands = (params) => v3.get('/brands', { params }).then(r => r.data);
export const v3GetBrand = (brandId) => v3.get(`/brands/${brandId}`).then(r => r.data);
export const v3CreateBrand = (payload) => v3.post('/brands', payload).then(r => r.data);
export const v3ChangeBrandPassword = (payload) => v3.post('/brand-accounts/change-password', payload).then(r => r.data);
export const v3ListEmailOutbox = (params) => v3.get('/email-outbox', { params }).then(r => r.data);
export const v3GetContacts = (brandId) => v3.get('/contacts', { params: { brand_id: brandId } }).then(r => r.data);
export const v3GetCreators = (tier) => v3.get('/creators', { params: { tier } }).then(r => r.data);
export const v3GetCreator = (creatorId) => v3.get(`/creators/${creatorId}`).then(r => r.data);
export const v3CreateCreator = (payload) => v3.post('/creators', payload).then(r => r.data);
export const v3SearchWebCreators = (payload) => v3.post('/creators/search-web', payload).then(r => r.data);
export const v3SuggestCreatorMatches = (bcId) => v3.post(`/business-cases/${bcId}/ai/creator-matches`).then(r => r.data);

// -------- Business Cases (the primitive) --------
export const v3ListBusinessCases = (params) => v3.get('/business-cases', { params }).then(r => r.data);
export const v3GetBusinessCase = (bcId) => v3.get(`/business-cases/${bcId}`).then(r => r.data);
export const v3CreateBusinessCase = (payload) => v3.post('/business-cases', payload).then(r => r.data);
export const v3AdvanceBusinessCase = (bcId, payload = { actor: 'rm' }) => v3.post(`/business-cases/${bcId}/advance`, payload).then(r => r.data);

// -------- Frame stage --------
export const v3GenerateAlignment = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment`).then(r => r.data);
export const v3ApproveAlignment = (bcId, approver) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver }).then(r => r.data);
export const v3ApproveAlignmentAs = (bcId, approver, approver_party = 'admin') => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver, approver_party }).then(r => r.data);
export const v3UpdateAlignment = (snapshotId, payload) => v3.patch(`/alignment-snapshots/${snapshotId}`, payload).then(r => r.data);
export const v3SendAlignmentToBrand = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment/send`).then(r => r.data);
export const v3AddAlignmentComment = (snapshotId, payload) => v3.post(`/alignment-snapshots/${snapshotId}/comments`, payload).then(r => r.data);
export const v3ResolveAlignmentComment = (snapshotId, commentId) => v3.post(`/alignment-snapshots/${snapshotId}/comments/${commentId}/resolve`).then(r => r.data);
export const v3ResolveScopeFlag = (bcId, idx) => v3.post(`/business-cases/${bcId}/scope-flags/${idx}/resolve`).then(r => r.data);

// -------- Invoices --------
export const v3ListInvoices = (bcId) => v3.get('/invoices', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3MarkInvoicePaid = (invoiceId) => v3.post(`/invoices/${invoiceId}/mark-paid`).then(r => r.data);

// -------- Plan stage --------
export const v3CreateBrief = (payload) => v3.post('/creative-briefs', payload).then(r => r.data);
export const v3ListBriefs = (params) => v3.get('/creative-briefs', { params }).then(r => r.data);
export const v3SimulateBriefResponse = (briefId) => v3.post(`/creative-briefs/${briefId}/simulate-response`).then(r => r.data);
export const v3SendBriefReminder = (briefId) => v3.post(`/creative-briefs/${briefId}/remind`).then(r => r.data);
export const v3ListSnapshots = (bcId) => v3.get('/creative-snapshots', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateSnapshot = (payload) => v3.post('/creative-snapshots', payload).then(r => r.data);
export const v3ApproveSnapshot = (bcId, approver) => v3.post(`/business-cases/${bcId}/creative-snapshot/approve`, { approver }).then(r => r.data);
export const v3UpdateStrategySnapshot = (snapshotId, payload) => v3.patch(`/creative-snapshots/${snapshotId}`, payload).then(r => r.data);
export const v3SendStrategySnapshotToBrand = (bcId) => v3.post(`/business-cases/${bcId}/creative-snapshot/send`).then(r => r.data);
export const v3AddStrategySnapshotComment = (snapshotId, payload) => v3.post(`/creative-snapshots/${snapshotId}/comments`, payload).then(r => r.data);
export const v3ResolveStrategySnapshotComment = (snapshotId, commentId) => v3.post(`/creative-snapshots/${snapshotId}/comments/${commentId}/resolve`).then(r => r.data);
export const v3CreateBrainstorm = (payload) => v3.post('/brainstorm-rounds', payload).then(r => r.data);
export const v3ListBrainstorms = (bcId) => v3.get('/brainstorm-rounds', { params: { business_case_id: bcId } }).then(r => r.data);

// -------- Contracts --------
export const v3ListContracts = (bcId) => v3.get('/contracts', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateContract = (payload) => v3.post('/contracts', payload).then(r => r.data);
export const v3SignContract = (contractId) => v3.post(`/contracts/${contractId}/sign`).then(r => r.data);

// -------- Deliver stage --------
export const v3ListDeliverables = (bcId) => v3.get('/deliverables', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3AddDeliverable = (payload) => v3.post('/deliverables', payload).then(r => r.data);
export const v3TransitionDeliverable = (deliverableId) => v3.post(`/deliverables/${deliverableId}/transition`, { actor: 'rm' }).then(r => r.data);
export const v3RequestScopeChange = (bcId, payload) => v3.post(`/business-cases/${bcId}/scope-change`, payload).then(r => r.data);
export const v3ApproveScopeChange = (bcId, scId) => v3.post(`/business-cases/${bcId}/scope-change/${scId}/approve`).then(r => r.data);

// -------- Closure --------
export const v3ListFinalReports = (bcId) => v3.get('/final-reports', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3GenerateFinalReport = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/final-report/generate`, payload).then(r => r.data);
export const v3SubmitBrandFeedback = (bcId, payload) => v3.post(`/business-cases/${bcId}/feedback/brand`, payload).then(r => r.data);
export const v3SubmitCreatorFeedback = (bcId, payload) => v3.post(`/business-cases/${bcId}/feedback/creator`, payload).then(r => r.data);

// -------- Connect helpers --------
export const v3SetConnectStatus = (bcId, status) => v3.post(`/business-cases/${bcId}/connect/status`, { connect_status: status }).then(r => r.data);

// -------- Interactions --------
export const v3ListInteractions = (params) => v3.get('/interactions', { params }).then(r => r.data);
export const v3CreateInteraction = (payload) => v3.post('/interactions', payload).then(r => r.data);
export const v3IngestTranscript = (payload) => v3.post('/interactions/ingest-transcript', payload).then(r => r.data);
export const v3ScrapeBrandOpportunities = (payload) => v3.post('/opportunities/scrape', payload).then(r => r.data);
export const v3ListBrandOpportunities = () => v3.get('/opportunities').then(r => r.data);
export const v3RunOpportunityScan = (payload) => v3.post('/opportunities/scans', payload).then(r => r.data);
export const v3GetOpportunityScan = (scanId) => v3.get(`/opportunities/scans/${scanId}`).then(r => r.data);
export const v3ListOpportunityCandidates = (params) => v3.get('/opportunities/candidates', { params }).then(r => r.data);
export const v3AcceptOpportunityCandidate = (candidateId, payload = { reviewed_by: 'admin' }) => v3.post(`/opportunities/candidates/${candidateId}/accept`, payload).then(r => r.data);
export const v3RejectOpportunityCandidate = (candidateId, payload = { reviewed_by: 'admin' }) => v3.post(`/opportunities/candidates/${candidateId}/reject`, payload).then(r => r.data);

// -------- Admin --------
export const v3ResetDemo = () => v3.post('/admin/reset-demo').then(r => r.data);

// -------- Metrics --------
export const v3AdminOverview = () => v3.get('/metrics/admin-overview').then(r => r.data);

export default v3;
