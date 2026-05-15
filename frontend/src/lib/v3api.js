// TASCK OS v3 — Frontend API Client
// Wraps every /api/v3/* endpoint. Always returns plain data (response.data).
// Pages can fall back to v3data.js mocks if a call fails (progressive layering).

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const V3 = `${BACKEND_URL}/api/v3`;

const v3 = axios.create({ baseURL: V3, headers: { 'Content-Type': 'application/json' } });

// -------- Brands / Contacts / Creators --------
export const v3GetBrands = (params) => v3.get('/brands', { params }).then(r => r.data);
export const v3GetBrand = (brandId) => v3.get(`/brands/${brandId}`).then(r => r.data);
export const v3GetContacts = (brandId) => v3.get('/contacts', { params: { brand_id: brandId } }).then(r => r.data);
export const v3GetCreators = (tier) => v3.get('/creators', { params: { tier } }).then(r => r.data);
export const v3GetCreator = (creatorId) => v3.get(`/creators/${creatorId}`).then(r => r.data);

// -------- Business Cases (the primitive) --------
export const v3ListBusinessCases = (params) => v3.get('/business-cases', { params }).then(r => r.data);
export const v3GetBusinessCase = (bcId) => v3.get(`/business-cases/${bcId}`).then(r => r.data);
export const v3CreateBusinessCase = (payload) => v3.post('/business-cases', payload).then(r => r.data);
export const v3AdvanceBusinessCase = (bcId, payload = { actor: 'rm' }) => v3.post(`/business-cases/${bcId}/advance`, payload).then(r => r.data);

// -------- Frame stage --------
export const v3GenerateAlignment = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment`).then(r => r.data);
export const v3ApproveAlignment = (bcId, approver) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver }).then(r => r.data);
export const v3ResolveScopeFlag = (bcId, idx) => v3.post(`/business-cases/${bcId}/scope-flags/${idx}/resolve`).then(r => r.data);

// -------- Invoices --------
export const v3ListInvoices = (bcId) => v3.get('/invoices', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3MarkInvoicePaid = (invoiceId) => v3.post(`/invoices/${invoiceId}/mark-paid`).then(r => r.data);

// -------- Plan stage --------
export const v3CreateBrief = (payload) => v3.post('/creative-briefs', payload).then(r => r.data);
export const v3ListBriefs = (params) => v3.get('/creative-briefs', { params }).then(r => r.data);
export const v3ListSnapshots = (bcId) => v3.get('/creative-snapshots', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3ApproveSnapshot = (bcId, approver) => v3.post(`/business-cases/${bcId}/creative-snapshot/approve`, { approver }).then(r => r.data);
export const v3CreateBrainstorm = (payload) => v3.post('/brainstorm-rounds', payload).then(r => r.data);
export const v3ListBrainstorms = (bcId) => v3.get('/brainstorm-rounds', { params: { business_case_id: bcId } }).then(r => r.data);

// -------- Contracts --------
export const v3ListContracts = (bcId) => v3.get('/contracts', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateContract = (payload) => v3.post('/contracts', payload).then(r => r.data);
export const v3SignContract = (contractId) => v3.post(`/contracts/${contractId}/sign`).then(r => r.data);

// -------- Deliver stage --------
export const v3ListDeliverables = (bcId) => v3.get('/deliverables', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3TransitionDeliverable = (deliverableId) => v3.post(`/deliverables/${deliverableId}/transition`, { actor: 'rm' }).then(r => r.data);
export const v3RequestScopeChange = (bcId, payload) => v3.post(`/business-cases/${bcId}/scope-change`, payload).then(r => r.data);
export const v3ApproveScopeChange = (bcId, scId) => v3.post(`/business-cases/${bcId}/scope-change/${scId}/approve`).then(r => r.data);

// -------- Closure --------
export const v3ListFinalReports = (bcId) => v3.get('/final-reports', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3SubmitBrandFeedback = (bcId, payload) => v3.post(`/business-cases/${bcId}/feedback/brand`, payload).then(r => r.data);
export const v3SubmitCreatorFeedback = (bcId, payload) => v3.post(`/business-cases/${bcId}/feedback/creator`, payload).then(r => r.data);

// -------- Interactions --------
export const v3ListInteractions = (params) => v3.get('/interactions', { params }).then(r => r.data);
export const v3IngestTranscript = (payload) => v3.post('/interactions/ingest-transcript', payload).then(r => r.data);

// -------- Metrics --------
export const v3AdminOverview = () => v3.get('/metrics/admin-overview').then(r => r.data);

export default v3;
