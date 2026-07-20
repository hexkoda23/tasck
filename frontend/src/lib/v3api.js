// TASCK OS v3 — Frontend API Client
// Wraps every /api/v3/* endpoint. Always returns plain data (response.data).

import axios from 'axios';

// REACT_APP_BACKEND_URL must be provided at build time. No hardcoded fallback
// — a stale fallback would silently point production API calls at the wrong
// domain after a redeploy.
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const V3 = `${BACKEND_URL}/api/v3`;

const v3 = axios.create({ baseURL: V3, headers: { 'Content-Type': 'application/json' }, timeout: 45000 });

v3.interceptors.response.use((response) => {
  const data = response.data;
  if (typeof data === 'string' && data.trim().startsWith('<')) {
    return Promise.reject(new Error('Backend unavailable. Please check your connection.'));
  }
  return response;
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const v3PostWithNetworkRetry = async (path, payload = undefined, retries = 2) => {
  try {
    return await v3.post(path, payload);
  } catch (error) {
    if (retries <= 0 || error?.response) {
      throw error;
    }
    await sleep(retries === 2 ? 500 : 1200);
    return v3PostWithNetworkRetry(path, payload, retries - 1);
  }
};

// -------- Brands / Contacts / Creators --------
export const v3GetBrands = (params) => v3.get('/brands', { params }).then(r => r.data);

export const v3GetBrand = (brandId) => v3.get(`/brands/${brandId}`).then(r => r.data);

export const v3CreateBrand = (payload) => v3.post('/brands', payload).then(r => r.data);

export const v3CreateBrandQualificationCandidate = (payload) => v3.post('/brands/qualification-candidates', payload).then(r => r.data);
export const v3MoveBrandToBusinessCall = (brandId, payload = {}) => v3.post(`/brands/${brandId}/business-call`, payload).then(r => r.data);
export const v3MoveBrandToFrame = (brandId, payload = {}) => v3.post(`/brands/${brandId}/move-to-frame`, payload).then(r => r.data);
export const v3DeleteBrand = (brandId) => v3.delete(`/brands/${brandId}`).then(r => r.data);

export const v3ScrapeBrandDetails = (brandId) => v3.post(`/brands/${brandId}/scrape`).then(r => r.data);

export const v3UpdateBrandDetails = (brandId, updates) => v3.patch(`/brands/${brandId}`, updates).then(r => r.data);

export const v3ChangeBrandPassword = (payload) => v3.post('/brand-accounts/change-password', payload).then(r => r.data);
export const v3ListEmailOutbox = (params) => v3.get('/email-outbox', { params }).then(r => r.data);
export const v3GetContacts = (brandId) => v3.get('/contacts', { params: { brand_id: brandId } }).then(r => r.data);
export const v3GetCreators = (params) => v3.get('/creators', { params: typeof params === 'string' ? { tier: params } : params }).then(r => r.data);
export const v3GetCreator = (creatorId) => v3.get(`/creators/${creatorId}`).then(r => r.data);
export const v3CreateCreator = (payload) => v3.post('/creators', payload).then(r => r.data);
export const v3CreateCreatorQualificationCandidate = (payload) => v3.post('/creators/qualification-candidates', payload).then(r => r.data);
export const v3SearchWebCreators = (payload) => v3.post('/creators/search-web', payload).then(r => r.data);
export const v3SuggestCreatorMatches = (bcId) => v3.post(`/business-cases/${bcId}/ai/creator-matches`).then(r => r.data);


// -------- Business Cases (the primitive) --------
export const v3ListBusinessCases = (params) => v3.get('/business-cases', { params }).then(r => r.data);

export const v3GetBusinessCase = (bcId, snapshotId) => v3.get(`/business-cases/${bcId}`, {
  params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined,
}).then(r => r.data);

export const v3CreateBusinessCase = (payload) => v3.post('/business-cases', payload).then(r => r.data);

export const v3AdvanceBusinessCase = (bcId, payload = { actor: 'rm' }) => v3.post(`/business-cases/${bcId}/advance`, payload).then(r => r.data);

export const v3ContinueBusinessCase = (bcId) => v3.post(`/business-cases/${bcId}/continue`).then(r => r.data);

export const v3UpdateBusinessCaseValue = (bcId, payload) => v3.patch(`/business-cases/${bcId}/value`, payload).then(r => r.data);

// -------- Frame stage --------
export const v3GenerateAlignment = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment`).then(r => r.data);

export const v3GenerateAlignmentQuestions = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment/questions`).then(r => r.data);

export const v3ApproveAlignment = (bcId, approver) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver }).then(r => r.data);

export const v3ApproveAlignmentAs = (bcId, approver, approver_party = 'admin', snapshotId = undefined) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver, approver_party, snapshot_id: snapshotId }).then(r => r.data);

export const v3MarkAlignmentViewed = (bcId, snapshotId, viewer) => v3.post(`/business-cases/${bcId}/ai/alignment/viewed`, { viewer, snapshot_id: snapshotId }).then(r => r.data);

export const v3UpdateAlignment = (snapshotId, payload) => v3.patch(`/alignment-snapshots/${snapshotId}`, payload).then(r => r.data);

export const v3SendAlignmentToBrand = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/ai/alignment/send`, payload).then(r => r.data);

export const v3AddAlignmentComment = (snapshotId, payload) => v3.post(`/alignment-snapshots/${snapshotId}/comments`, payload).then(r => r.data);
export const v3ResolveAlignmentComment = (snapshotId, commentId) => v3.post(`/alignment-snapshots/${snapshotId}/comments/${commentId}/resolve`).then(r => r.data);
export const v3ResolveScopeFlag = (bcId, idx) => v3.post(`/business-cases/${bcId}/scope-flags/${idx}/resolve`).then(r => r.data);

// -------- Invoices --------
export const v3ListInvoices = (bcId) => v3.get('/invoices', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3UpdateInvoice = (invoiceId, payload) => v3.patch(`/invoices/${invoiceId}`, payload).then(r => r.data);
export const v3MarkInvoicePaid = (invoiceId) => v3.post(`/invoices/${invoiceId}/mark-paid`).then(r => r.data);

// -------- Plan stage --------
export const v3CreateBrief = (payload) => v3.post('/creative-briefs', payload).then(r => r.data);
export const v3ListBriefs = (params) => v3.get('/creative-briefs', { params }).then(r => r.data);
export const v3SimulateBriefResponse = (briefId) => v3.post(`/creative-briefs/${briefId}/simulate-response`).then(r => r.data);
export const v3SendBriefReminder = (briefId) => v3.post(`/creative-briefs/${briefId}/remind`).then(r => r.data);
export const v3ListSnapshots = (bcId) => v3.get('/creative-snapshots', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateSnapshot = (payload) => v3.post('/creative-snapshots', payload).then(r => r.data);
export const v3ApproveSnapshot = (bcId, approver, approver_party = 'admin') => v3.post(`/business-cases/${bcId}/creative-snapshot/approve`, { approver, approver_party }).then(r => r.data);
export const v3UpdateStrategySnapshot = (snapshotId, payload) => v3.patch(`/creative-snapshots/${snapshotId}`, payload).then(r => r.data);
export const v3SaveStrategyDraft = (bcId, sections, actor = 'admin') => v3.post(`/business-cases/${bcId}/plan/save-strategy-draft`, { sections, actor }).then(r => r.data);
export const v3SendStrategySnapshotToBrand = (bcId) => v3.post(`/business-cases/${bcId}/creative-snapshot/send`).then(r => r.data);
export const v3AddStrategySnapshotComment = (snapshotId, payload) => v3.post(`/creative-snapshots/${snapshotId}/comments`, payload).then(r => r.data);
export const v3ResolveStrategySnapshotComment = (snapshotId, commentId) => v3.post(`/creative-snapshots/${snapshotId}/comments/${commentId}/resolve`).then(r => r.data);
export const v3CreateBrainstorm = (payload) => v3.post('/brainstorm-rounds', payload).then(r => r.data);
export const v3UpdateBrainstorm = (roundId, payload) => v3.patch(`/brainstorm-rounds/${roundId}`, payload).then(r => r.data);
export const v3ListBrainstorms = (bcId) => v3.get('/brainstorm-rounds', { params: { business_case_id: bcId } }).then(r => r.data);
// Brainstorm transcript upload + AI fill of the entire TTA Snapshot Brainstorm.
export const v3BrainstormSuggestedQuestions = (bcId) => v3.get(`/business-cases/${bcId}/brainstorm/suggested-questions`).then(r => r.data);
export const v3AnalyzeBrainstormTranscript = (bcId, transcript) => v3.post(`/business-cases/${bcId}/brainstorm/analyze-transcript`, { transcript }).then(r => r.data);
export const v3ContractPdfUrl = (contractId) => `${BACKEND_URL}/api/v3/contracts/${contractId}/pdf`;
export const v3AlignmentDocxUrl = (snapshotId) => `${BACKEND_URL}/api/v3/alignment-snapshots/${snapshotId}/docx`;
export const v3CreativeBriefDocxUrl = (briefId) => `${BACKEND_URL}/api/v3/creative-briefs/${briefId}/docx`;
export const v3StrategySnapshotDocxUrl = (snapshotId) => `${BACKEND_URL}/api/v3/creative-snapshots/${snapshotId}/docx`;
export const v3ContractDocxUrl = (contractId) => `${BACKEND_URL}/api/v3/contracts/${contractId}/docx`;
export const v3FinalReportPdfUrl = (reportId) => `${BACKEND_URL}/api/v3/final-reports/${reportId}/pdf`;
export const v3FeedbackPdfUrl = (reportId) => `${BACKEND_URL}/api/v3/final-reports/${reportId}/feedback/pdf`;
export const v3SendContractEmail = (contractId, payload) => v3.post(`/contracts/${contractId}/send-email`, payload).then(r => r.data);
export const v3SendFinalReportEmail = (reportId, payload) => v3.post(`/final-reports/${reportId}/send-email`, payload).then(r => r.data);
export const v3SendFeedbackEmail = (reportId, payload) => v3.post(`/final-reports/${reportId}/feedback/send-email`, payload).then(r => r.data);

// -------- Contracts --------
export const v3ListContracts = (bcId) => v3.get('/contracts', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateContract = (payload) => v3.post('/contracts', payload).then(r => r.data);
export const v3UpdateContract = (contractId, payload) => v3.patch(`/contracts/${contractId}`, payload).then(r => r.data);
export const v3UpdateFinalReport = (reportId, payload) => v3.patch(`/final-reports/${reportId}`, payload).then(r => r.data);
export const v3MarkReportSent = (reportId) => v3.post(`/final-reports/${reportId}/mark-report-sent`).then(r => r.data);
export const v3MarkFeedbackSent = (reportId) => v3.post(`/final-reports/${reportId}/mark-feedback-sent`).then(r => r.data);
export const v3CloseBusinessCase = (bcId) => v3.post(`/business-cases/${bcId}/close`).then(r => r.data);
export const v3SignContract = (contractId) => v3.post(`/contracts/${contractId}/sign`).then(r => r.data);
// Planning Feedback card: admin can re-send feedback requests to brand/creator.
export const v3SendFeedbackRequest = (bcId, payload) => v3.post(`/business-cases/${bcId}/feedback/request`, payload).then(r => r.data);
export const v3ListFeedbackRequests = (bcId) => v3.get(`/business-cases/${bcId}/feedback/requests`).then(r => r.data);
// Planning Invoicing card: admin can create + delete invoices in addition to
// the pre-existing v3UpdateInvoice / v3MarkInvoicePaid helpers above.
export const v3CreateInvoice = (payload) => v3.post('/invoices', payload).then(r => r.data);
export const v3DeleteInvoice = (invoiceId) => v3.delete(`/invoices/${invoiceId}`).then(r => r.data);
// Planning page free-form text (timeline plan, planning notes) saved on case.plan.
export const v3UpdatePlanningText = (bcId, payload) => v3.patch(`/business-cases/${bcId}/planning`, payload).then(r => r.data);
// Creator Match Scanner: persist the picked-creator shortlist so the Planning
// page Creator details card lights up immediately (instead of only after the
// brief is sent).
export const v3UpdateSelectedCreators = (bcId, ids, snapshotId) => v3.patch(`/business-cases/${bcId}/selected-creators`, {
  selected_creator_ids: ids,
  alignment_snapshot_id: snapshotId,
}).then(r => r.data);
// Track which Business Case sub-phase (planning / delivery / reporting) the
// admin is on so businessCasePhasePath can land them on the right page when
// opening a brand from the Business Case list.
export const v3UpdateBusinessCasePhase = (bcId, phase) => v3.patch(`/business-cases/${bcId}/business-case-phase`, { phase }).then(r => r.data);
// Explicit Business Case sub-phase completion gate: Delivery stays locked
// until planning is completed; Reporting until delivery is completed.
export const v3CompleteSubphase = (bcId, subphase) => v3.post(`/business-cases/${bcId}/subphase/complete`, { subphase }).then(r => r.data);
// Admin notifications: brand/creator-initiated actions (alignment approved,
// strategy approved, contract signed, brief responded). Polled every 30s by
// the V1 admin layout to surface toasts + the Overview "Needs attention"
// card.
export const v3ListAdminNotifications = () => v3.get('/admin/notifications').then(r => r.data);
// Brand-side notifications: admin-initiated actions the brand should know
// about (admin approved Alignment Snapshot, Strategy Snapshot is ready for
// review, contract is ready to sign). Used by the V1 brand overview.
export const v3ListBrandNotifications = (brandId) => v3.get(`/brands/${brandId}/notifications`).then(r => r.data);
// Admin tool: regenerate the brand's temporary password and resend the
// welcome email. Use when a brand reports the original credentials no
// longer work (typo, email-client mangling, expired temp password).
export const v3ResendBrandCredentials = (brandId) => v3.post('/brand-accounts/resend-credentials', { brand_id: brandId }).then(r => r.data);
// Delete a deliverable from the Delivery phase Deliverables page.
export const v3DeleteDeliverable = (deliverableId) => v3.delete(`/deliverables/${deliverableId}`).then(r => r.data);
// Planning Invoicing card: upload an invoice file (single invoice per file,
// multi-file upload by calling once per file). Returns the lightweight
// invoice doc without the inline base64 blob.
export const v3UploadInvoice = (payload) => v3.post('/invoices/upload', payload).then(r => r.data);
// Stream URL for downloading a previously-uploaded invoice attachment.
const _BACKEND_URL_FOR_INVOICE = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
export const v3InvoiceFileUrl = (invoiceId) => `${_BACKEND_URL_FOR_INVOICE}/api/v3/invoices/${invoiceId}/file`;

// -------- Deliver stage --------
export const v3ListDeliverables = (bcId) => v3.get('/deliverables', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3AddDeliverable = (payload) => v3.post('/deliverables', payload).then(r => r.data);
export const v3UpdateDeliverable = (deliverableId, payload) => v3.patch(`/deliverables/${deliverableId}`, payload).then(r => r.data);
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
export const v3PromoteBusinessCaseConnect = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/connect/promote`, payload).then(r => r.data);
export const v3RescheduleBusinessCaseConnect = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/connect/reschedule`, payload).then(r => r.data);
export const v3DeleteBusinessCaseConnect = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/connect/delete`, payload).then(r => r.data);
export const v3SendConnectMeetingEmail = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/connect/send-meeting-email`, payload).then(r => r.data);
export const v3SendConnectRescheduleEmail = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/connect/send-reschedule-email`, payload).then(r => r.data);
export const v3AcceptCreatorBriefing = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/plan/creator-briefing/accept`, payload).then(r => r.data);
export const v3RescheduleCreatorBriefing = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/plan/creator-briefing/reschedule`, payload).then(r => r.data);
export const v3DeclineCreatorBriefing = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/plan/creator-briefing/decline`, payload).then(r => r.data);

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

// -------- Meetings --------
export const v3ListMeetings = (params) => v3.get('/meetings', { params }).then(r => r.data);
export const v3GetMeeting = (meetingId) => v3.get(`/meetings/${meetingId}`).then(r => r.data);
export const v3CreateMeeting = (payload) => v3.post('/meetings', payload).then(r => r.data);
export const v3SaveMeetingContact = (meetingId, payload) => v3.patch(`/meetings/${meetingId}/contact`, payload).then(r => r.data);
export const v3UploadMeetingTranscript = (meetingId, payload) => v3PostWithNetworkRetry(`/meetings/${meetingId}/transcript`, payload, 1).then(r => r.data);
export const v3AnalyzeMeetingTranscript = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/analyze`, payload).then(r => r.data);
export const v3AnalyzeAllTranscripts = (bcId) => v3.post(`/business-cases/${bcId}/connect/analyze-all`, undefined, { timeout: 180000 }).then(r => r.data);
export const v3GetAnalyzeAllJob = (bcId, jobId) => v3.get(`/business-cases/${bcId}/connect/analyze-all/jobs/${jobId}`, { timeout: 30000 }).then(r => r.data.job || r.data);

export const v3GenerateAlignmentFromTranscripts = (brandId, transcripts = []) => v3.post(`/brands/${brandId}/frame-transcripts`, {
  actor: 'admin',
  source: 'v1_admin_multi_transcript_frame',
  transcripts: transcripts.map((item, index) => ({
    transcript: item.content || item.transcript || '',
    call_date: item.date || item.call_date || '',
    session_label: item.session || item.session_label || `Session ${index + 1}`,
    notes: item.notes || '',
  })),
}).then(r => r.data);
export const v3RegenerateMeetingQuestions = (meetingId) => v3.post(`/meetings/${meetingId}/questions/regenerate`).then(r => r.data);
export const v3DraftBrandFollowUp = (brandId, payload = {}) => v3.post(`/brands/${brandId}/ai/follow-up-draft`, payload).then(r => r.data);
export const v3AcceptQualificationMeeting = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/qualification/accept`, payload).then(r => r.data);
export const v3RescheduleQualificationMeeting = (meetingId, payload) => v3.post(`/meetings/${meetingId}/qualification/reschedule`, payload).then(r => r.data);
export const v3DeleteQualificationMeeting = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/qualification/delete`, payload).then(r => r.data);
export const v3ProceedBusinessCall = (meetingId) => v3.post(`/meetings/${meetingId}/business/proceed`).then(r => r.data);
export const v3RescheduleBusinessCall = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/business/reschedule`, payload).then(r => r.data);
export const v3DeleteBusinessCall = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/business/delete`, payload).then(r => r.data);
export const v3AcceptCreatorFitCall = (meetingId) => v3.post(`/meetings/${meetingId}/creator-fit/accept`).then(r => r.data);
export const v3RescheduleCreatorFitCall = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/creator-fit/reschedule`, payload).then(r => r.data);
export const v3RejectCreatorFitCall = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/creator-fit/reject`, payload).then(r => r.data);

// -------- Relationship Managers --------
export const v3ListRelationshipManagers = () => v3.get('/relationship-managers').then(r => r.data);

// -------- Admin Auth --------
export const v3AdminLogin = (payload) => v3.post('/auth/admin-login', payload).then(r => r.data);
export const v3BrandLogin = (payload) => v3.post('/auth/brand-login', payload).then(r => r.data);
export const v3CreatorLogin = (payload) => v3.post('/auth/creator-login', payload).then(r => r.data);

// -------- Admin utilities --------
export const v3ApproveBrand = (brandId) => v3.post(`/brands/${brandId}/approve`).then(r => r.data);
export const v3ReassignRM = (brandId, rmId) => v3.patch(`/brands/${brandId}/rm`, { rm_id: rmId }).then(r => r.data);
// Legacy reset helper removed; use the real workbook import instead

// -------- Metrics --------
export const v3AdminOverview = () => v3.get('/metrics/admin-overview').then(r => r.data);

// -------- Projects --------
export const v3ListProjects = () => v3.get('/projects').then(r => r.data);

// --- Connect sources: transcripts, email chains, WhatsApp threads ---------
// Admin drips these in over time; all of them feed the AI analysis.
export const v3ListConnectSources = (bcId) => v3.get(`/business-cases/${bcId}/connect/sources`).then(r => r.data);
export const v3AddConnectSource = (bcId, { kind, label, content, author }) =>
  v3.post(`/business-cases/${bcId}/connect/sources`, { kind, label, content, author }).then(r => r.data);
export const v3DeleteConnectSource = (bcId, sourceId) =>
  v3.delete(`/business-cases/${bcId}/connect/sources/${sourceId}`).then(r => r.data);

// --- Opportunities: detect -> review/merge -> generate snapshots ----------
export const v3ListOpportunities = (bcId) => v3.get(`/business-cases/${bcId}/connect/opportunities`).then(r => r.data);
// Detection runs as a background job (Claude takes 20-60s; a sync request
// would 504 behind the gateway). Start it, then poll until it completes.
export const v3StartDetectOpportunities = (bcId) => v3.post(`/business-cases/${bcId}/connect/detect-opportunities`).then(r => r.data);
export const v3GetDetectOpportunitiesJob = (bcId, jobId) => v3.get(`/business-cases/${bcId}/connect/detect-opportunities/jobs/${jobId}`).then(r => r.data);
export const v3DetectOpportunities = async (bcId, onProgress) => {
  const started = await v3StartDetectOpportunities(bcId);
  const jobId = started?.job_id;
  if (!jobId) return started; // future-proof: a sync response passes straight through
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const { job } = await v3GetDetectOpportunitiesJob(bcId, jobId);
    if (typeof onProgress === 'function' && job?.message) onProgress(job);
    if (job?.status === 'completed') return { ok: true, opportunities: job.opportunities || [], detected_at: job.detected_at, analysis_source: job.analysis_source };
    if (job?.status === 'failed') throw new Error(job?.message || 'Opportunity detection failed.');
  }
  throw new Error('Opportunity detection timed out. Please retry.');
};
export const v3MergeOpportunities = (bcId, ids, title) =>
  v3.post(`/business-cases/${bcId}/connect/opportunities/merge`, { ids, title }).then(r => r.data);
export const v3UpdateOpportunity = (bcId, oppId, patch) =>
  v3.patch(`/business-cases/${bcId}/connect/opportunities/${oppId}`, patch).then(r => r.data);
export const v3DeleteOpportunity = (bcId, oppId) =>
  v3.delete(`/business-cases/${bcId}/connect/opportunities/${oppId}`).then(r => r.data);
export const v3GenerateOpportunitySnapshots = (bcId) =>
  v3.post(`/business-cases/${bcId}/connect/opportunities/generate-snapshots`).then(r => r.data);

// --- Creative brief: Claude writes it in the approved TASCK template ------
// Background job (Claude takes 20-60s); resolves when the brief is ready.
export const v3GenerateCreativeBrief = async (bcId, onProgress, snapshotId) => {
  const started = await v3.post(`/business-cases/${bcId}/ai/creative-brief/generate`, null, {
    params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined,
  }).then(r => r.data);
  const jobId = started?.job_id;
  if (!jobId) return started;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const { job } = await v3.get(`/business-cases/${bcId}/ai/creative-brief/jobs/${jobId}`).then(r => r.data);
    if (typeof onProgress === 'function' && job?.message) onProgress(job);
    if (job?.status === 'completed') return { ok: true, brief: job.brief };
    if (job?.status === 'failed') throw new Error(job?.message || 'Brief generation failed.');
  }
  throw new Error('Brief generation timed out. Please retry.');
};
export const v3TemplateBriefDocxUrl = (bcId, snapshotId) => `${V3}/business-cases/${bcId}/creative-brief/docx${snapshotId ? `?alignment_snapshot_id=${encodeURIComponent(snapshotId)}` : ''}`;

// --- Pitch Deck: ten AI-written sections, brand-facing -------------------
export const v3GetPitchDeck = (bcId, snapshotId) => v3.get(`/business-cases/${bcId}/pitch-deck`, {
  params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined,
}).then(r => r.data);
export const v3GeneratePitchDeck = async (bcId, onProgress, snapshotId) => {
  const started = await v3.post(`/business-cases/${bcId}/ai/pitch-deck/generate`, null, {
    params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined,
  }).then(r => r.data);
  const jobId = started?.job_id;
  if (!jobId) return started;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const { job } = await v3.get(`/business-cases/${bcId}/ai/pitch-deck/jobs/${jobId}`).then(r => r.data);
    if (typeof onProgress === 'function' && job?.message) onProgress(job);
    if (job?.status === 'completed') return { ok: true, pitch_deck: job.pitch_deck };
    if (job?.status === 'failed') throw new Error(job?.message || 'Pitch Deck generation failed.');
  }
  throw new Error('Pitch Deck generation timed out. Please retry.');
};
export const v3UpdatePitchDeck = (deckId, payload) => v3.patch(`/pitch-decks/${deckId}`, payload).then(r => r.data);
export const v3ApprovePitchDeckAs = (bcId, approver, approver_party = 'admin') => v3.post(`/business-cases/${bcId}/pitch-deck/approve`, { approver, approver_party }).then(r => r.data);
export const v3SendPitchDeckToBrand = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/pitch-deck/send`, payload).then(r => r.data);
export const v3AddPitchDeckComment = (deckId, payload) => v3.post(`/pitch-decks/${deckId}/comments`, payload).then(r => r.data);
export const v3PitchDeckDocxUrl = (deckId) => `${V3}/pitch-decks/${deckId}/docx`;

// --- Alignment snapshot priority (brand ranks; admin can override) --------
export const v3ListPriorityOptions = () => v3.get('/priority-options').then(r => r.data);
export const v3SetSnapshotPriority = (snapshotId, priority, actor) =>
  v3.patch(`/alignment-snapshots/${snapshotId}/priority`, { priority, actor }).then(r => r.data);

export default v3;


