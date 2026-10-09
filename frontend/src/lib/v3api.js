// TASCK OS v3 - Frontend API Client
// Wraps every /api/v3/* endpoint. Always returns plain data (response.data).

import axios from 'axios';

// REACT_APP_BACKEND_URL must be provided at build time. No hardcoded fallback
// - a stale fallback would silently point production API calls at the wrong
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

// Long-running server-side scrape: give it a generous timeout and retry once
// automatically so a cold-start/gateway timeout on the first attempt never
// surfaces to the admin.
export const v3ScrapeBrandDetails = async (brandId) => {
  try {
    return (await v3.post(`/brands/${brandId}/scrape`, undefined, { timeout: 120000 })).data;
  } catch (e) {
    return (await v3.post(`/brands/${brandId}/scrape`, undefined, { timeout: 120000 })).data;
  }
};

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

// Stamp "an admin opened this project just now" on the brand + case, so the
// CRM list shows the most recent visit time (not the created date). Fire-and-
// forget: a failure here must never block loading the project.
export const v3TouchBusinessCase = (bcId) => v3.post(`/business-cases/${bcId}/touch`).then(r => r.data);

export const v3CreateBusinessCase = (payload) => v3.post('/business-cases', payload).then(r => r.data);

export const v3ImportExistingProject = (payload) => v3.post('/business-cases/import-existing', payload).then(r => r.data);

export const v3ExtractImportProjectDoc = (file) => {
  const form = new FormData();
  form.append('file', file);
  return v3.post('/business-cases/import-existing/extract', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }).then(r => r.data);
};

export const v3AdvanceBusinessCase = (bcId, payload = { actor: 'rm' }) => v3.post(`/business-cases/${bcId}/advance`, payload).then(r => r.data);

export const v3ContinueBusinessCase = (bcId) => v3.post(`/business-cases/${bcId}/continue`).then(r => r.data);

export const v3UpdateBusinessCaseValue = (bcId, payload) => v3.patch(`/business-cases/${bcId}/value`, payload).then(r => r.data);

// Rename a project. Business cases are created with a generated name, so every
// project under one brand reads almost the same until someone renames it.
export const v3RenameBusinessCase = (bcId, title, actor = 'admin') =>
  v3.patch(`/business-cases/${bcId}/title`, { title, actor }).then(r => r.data);

// -------- Frame stage --------
// The alignment analyser runs a Claude call with a 75s server-side budget
// (ALIGNMENT_ANALYZER_TIMEOUT_SECONDS), but this client defaulted to 45s. The
// browser gave up first while the server carried on and wrote the snapshot, so
// admins saw "Could not generate the Alignment Snapshot" for a snapshot that
// had in fact been created. Same class of bug as the brand scrape above.
// The endpoint upserts one snapshot per business case, so retrying is safe.
export const v3GenerateAlignment = async (bcId) => {
  try {
    return (await v3.post(`/business-cases/${bcId}/ai/alignment`, undefined, { timeout: 180000 })).data;
  } catch (e) {
    return (await v3.post(`/business-cases/${bcId}/ai/alignment`, undefined, { timeout: 180000 })).data;
  }
};

export const v3GenerateAlignmentQuestions = (bcId) =>
  v3.post(`/business-cases/${bcId}/ai/alignment/questions`, undefined, { timeout: 180000 }).then(r => r.data);

export const v3ApproveAlignment = (bcId, approver) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver }).then(r => r.data);

export const v3ApproveAlignmentAs = (bcId, approver, approver_party = 'admin', snapshotId = undefined) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver, approver_party, snapshot_id: snapshotId }).then(r => r.data);

export const v3MarkAlignmentViewed = (bcId, snapshotId, viewer) => v3.post(`/business-cases/${bcId}/ai/alignment/viewed`, { viewer, snapshot_id: snapshotId }).then(r => r.data);

export const v3UpdateAlignment = (snapshotId, payload) => v3.patch(`/alignment-snapshots/${snapshotId}`, payload).then(r => r.data);

// -------- Admin Assistant (global chat widget) --------
export const v3AdminAssistantChat = (payload) =>
  // The server tries up to two AI providers, 40s each, so the client budget has
  // to sit above that worst case (and still under the 100s edge-proxy limit) -
  // otherwise a fallback that succeeds at 45s is thrown away by our own timeout.
  v3.post('/admin-assistant/chat', payload, { timeout: 95000 }).then(r => r.data);

// -------- Assistant agent (tool-calling; backend/assistant) --------
// The server caps a turn at ASSISTANT_TIMEOUT_SECONDS (70s by default), so this
// waits a little longer than the server does rather than abandoning work that is
// still running - the old widget gave up at 60s while the backend could run for
// 180, which surfaced as a gateway error on a request that later succeeded.
const ASSISTANT = `${BACKEND_URL}/api/v3/assistant`;
const assistant = axios.create({
  baseURL: ASSISTANT,
  headers: { 'Content-Type': 'application/json' },
  timeout: 80000,
});

export const v3AssistantChat = (payload) => assistant.post('/chat', payload).then(r => r.data);
export const v3AssistantChanges = (sessionId, limit = 50) =>
  assistant.get('/changes', { params: { session_id: sessionId, limit } }).then(r => r.data);
export const v3AssistantDiagnostics = () => assistant.get('/diagnostics').then(r => r.data);
// Undo is deterministic, so it goes straight to the journal rather than through
// the model: it takes back the whole of the most recent request and returns the
// restored document.
export const v3AssistantUndo = (sessionId) =>
  assistant.post('/undo', { session_id: sessionId }).then(r => r.data);

// Sending builds the .docx and then talks to Gmail SMTP (20s socket timeout)
// before writing the outbox row, which can outrun the default 45s client
// timeout and surface as a gateway error even though delivery is in flight.
// Deliberately NOT retried: a retry would email the brand twice.
export const v3SendAlignmentToBrand = (bcId, payload = {}) =>
  v3.post(`/business-cases/${bcId}/ai/alignment/send`, payload, { timeout: 120000 }).then(r => r.data);

// "Send to Brand Page": reveal the snapshot in the brand portal without
// emailing the brand. Generated snapshots stay admin-only until this runs, so
// admins can generate, edit, then publish when they are ready.
export const v3PublishAlignmentToBrandPage = (bcId, payload = {}) =>
  v3SendAlignmentToBrand(bcId, { ...payload, send_email: false });

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
// Email the brand-tailored Creative Brief (.docx) to an arbitrary recipient
// email typed by the admin on the Creative Brief Studio "Send to brand" card.
export const v3SendCreativeBriefToEmail = (bcId, payload) => v3.post(`/business-cases/${bcId}/creative-brief/send`, payload).then(r => r.data);
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
export const v3ListBrainstorms = (bcId, alignmentSnapshotId) => v3.get('/brainstorm-rounds', {
  params: alignmentSnapshotId
    ? { business_case_id: bcId, alignment_snapshot_id: alignmentSnapshotId }
    : { business_case_id: bcId },
}).then(r => r.data);
// Brainstorm transcript upload + AI fill of the entire TTA Snapshot Brainstorm.
export const v3BrainstormSuggestedQuestions = (bcId) => v3.get(`/business-cases/${bcId}/brainstorm/suggested-questions`).then(r => r.data);
// Long AI job (a full transcript takes 30-90s, past the edge-proxy limit),
// so this kicks off a background job and polls it.
export const v3AnalyzeBrainstormTranscript = async (bcId, transcript, alignmentSnapshotId, onProgress) => {
  const started = await v3.post(`/business-cases/${bcId}/brainstorm/analyze-transcript`,
    alignmentSnapshotId ? { transcript, alignment_snapshot_id: alignmentSnapshotId } : { transcript },
    { timeout: 120000 }
  ).then(r => r.data);
  const jobId = started?.job_id;
  if (!jobId) return started;   // future-proof: a sync response passes straight through
  let pollFailures = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    let job;
    try {
      ({ job } = await v3.get(`/business-cases/${bcId}/brainstorm/analyze-transcript/jobs/${jobId}`).then(r => r.data));
    } catch (e) {
      // Tolerate transient gateway blips rather than failing the whole run.
      pollFailures += 1;
      if (pollFailures > 6) throw e;
      continue;
    }
    pollFailures = 0;
    if (typeof onProgress === 'function' && job?.message) onProgress(job);
    if (job?.status === 'completed') return { ok: true, analysis_source: job.analysis_source, brainstorm_round: job.brainstorm_round };
    if (job?.status === 'failed') throw new Error(job?.message || 'Transcript analysis failed.');
  }
  throw new Error('Transcript analysis timed out. Please retry.');
};
export const v3SaveBrainstormTranscriptDraft = (bcId, transcript, alignmentSnapshotId, { keepalive = false } = {}) => {
  const path = `/business-cases/${bcId}/brainstorm/transcript-draft`;
  const body = { transcript, alignment_snapshot_id: alignmentSnapshotId || null };
  // keepalive lets the save finish while the tab is closing or reloading
  // (axios cannot). The browser caps keepalive bodies at 64KB, so very long
  // transcripts rely on the debounced save instead.
  if (keepalive) {
    return fetch(`${V3}${path}`, {
      method: 'PATCH', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  }
  return v3.patch(path, body).then(r => r.data);
};
export const v3SkipBrainstormTranscript = (bcId) => v3.post(`/business-cases/${bcId}/brainstorm/skip-transcript`).then(r => r.data);
export const v3ContractPdfUrl = (contractId) => `${BACKEND_URL}/api/v3/contracts/${contractId}/pdf`;
export const v3AlignmentDocxUrl = (snapshotId) => `${BACKEND_URL}/api/v3/alignment-snapshots/${snapshotId}/docx`;
export const v3CreativeBriefDocxUrl = (briefId) => `${BACKEND_URL}/api/v3/creative-briefs/${briefId}/docx`;
export const v3StrategySnapshotDocxUrl = (snapshotId) => `${BACKEND_URL}/api/v3/creative-snapshots/${snapshotId}/docx`;
export const v3ContractDocxUrl = (contractId) => `${BACKEND_URL}/api/v3/contracts/${contractId}/docx`;
// Links people are sent (Copy link / WhatsApp) must be absolute even when the
// API is same-origin (BACKEND_URL empty in production builds).
export const v3ShareableUrl = (url) => new URL(url, `${window.location.origin}/`).href;
export const v3AlignmentPreviewUrl = (snapshotId) => v3ShareableUrl(`${V3}/alignment-snapshots/${encodeURIComponent(snapshotId)}/preview`);
// The contract alone in the browser (inline PDF) - what Copy link and
// WhatsApp share, instead of the admin Contract page.
export const v3ContractViewUrl = (contractId) => v3ShareableUrl(`${BACKEND_URL}/api/v3/contracts/${contractId}/view`);
export const v3FinalReportPdfUrl = (reportId) => `${BACKEND_URL}/api/v3/final-reports/${reportId}/pdf`;
// The report alone as a letterhead web page: what its Copy link / WhatsApp
// share open; embed=true drops the page's own toolbar for the admin Preview.
export const v3FinalReportViewUrl = (reportId, embed = false) => v3ShareableUrl(`${BACKEND_URL}/api/v3/final-reports/${reportId}/view${embed ? '?embed=true' : ''}`);
// `audience` picks which form the PDF contains: 'brand' -> Brand Partner
// form only, 'creator' -> Creative Partner form only. Omit it for the admin's
// own full copy (both forms plus the internal-use notes).
export const v3FeedbackPdfUrl = (reportId, audience) => `${BACKEND_URL}/api/v3/final-reports/${reportId}/feedback/pdf${audience ? `?audience=${encodeURIComponent(audience)}` : ''}`;
// One side's feedback form (brand | creator) on the letterhead - the admin
// Preview (embed) of exactly what that side's PDF holds.
export const v3FeedbackViewUrl = (reportId, audience, embed = false) => v3ShareableUrl(`${BACKEND_URL}/api/v3/final-reports/${reportId}/feedback/view?audience=${encodeURIComponent(audience)}${embed ? '&embed=true' : ''}`);
export const v3SendContractEmail = (contractId, payload) => v3.post(`/contracts/${contractId}/send-email`, payload).then(r => r.data);
export const v3SendFinalReportEmail = (reportId, payload) => v3.post(`/final-reports/${reportId}/send-email`, payload).then(r => r.data);
// payload.audience ('brand' | 'creator') decides which of the two forms is
// attached - the brand never receives the creative's form and vice versa.
export const v3SendFeedbackEmail = (reportId, payload) => v3.post(`/final-reports/${reportId}/feedback/send-email`, payload).then(r => r.data);

// -------- Public feedback form (no login - the token in the URL is the
// access control, same convention as the PDF/flip-book links above) --------
// The public form URL for one side. This is what Copy link and WhatsApp must
// share: the form itself, not the admin page that generated it.
export const v3GetFeedbackPublicLink = (reportId, audience) =>
  v3.get(`/final-reports/${reportId}/feedback/public-link`, { params: { audience } }).then(r => r.data);
export const v3GetPublicFeedbackForm = (token) => v3.get(`/public/feedback/${token}`).then(r => r.data);
export const v3SubmitPublicFeedbackForm = (token, payload) => v3.post(`/public/feedback/${token}`, payload).then(r => r.data);

// -------- Contracts --------
export const v3ListContracts = (bcId) => v3.get('/contracts', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateContract = (payload) => v3.post('/contracts', payload).then(r => r.data);
export const v3UpdateContract = (contractId, payload) => v3.patch(`/contracts/${contractId}`, payload).then(r => r.data);
export const v3UpdateFinalReport = (reportId, payload) => v3.patch(`/final-reports/${reportId}`, payload).then(r => r.data);
export const v3MarkReportSent = (reportId) => v3.post(`/final-reports/${reportId}/mark-report-sent`).then(r => r.data);
export const v3MarkFeedbackSent = (reportId, audience) => v3.post(`/final-reports/${reportId}/mark-feedback-sent`, undefined, audience ? { params: { audience } } : undefined).then(r => r.data);
export const v3CloseBusinessCase = (bcId) => v3.post(`/business-cases/${bcId}/close`).then(r => r.data);
export const v3SignContract = (contractId) => v3.post(`/contracts/${contractId}/sign`).then(r => r.data);
// Brand approves a contract from its portal (stamped on the contract).
export const v3ApproveContract = (contractId, approver) => v3.post(`/contracts/${contractId}/approve`, { approver, approver_party: 'brand' }).then(r => r.data);
// Planning Feedback card: admin can re-send feedback requests to brand/creator.
export const v3SendFeedbackRequest = (bcId, payload) => v3.post(`/business-cases/${bcId}/feedback/request`, payload).then(r => r.data);
export const v3ListFeedbackRequests = (bcId) => v3.get(`/business-cases/${bcId}/feedback/requests`).then(r => r.data);
// Planning Invoicing card: admin can create + delete invoices in addition to
// the pre-existing v3UpdateInvoice / v3MarkInvoicePaid helpers above.
export const v3CreateInvoice = (payload) => v3.post('/invoices', payload).then(r => r.data);
export const v3DeleteInvoice = (invoiceId) => v3.delete(`/invoices/${invoiceId}`).then(r => r.data);
// Planning page free-form text (timeline plan, planning notes) saved on case.plan.
export const v3UpdatePlanningText = (bcId, payload) => v3.patch(`/business-cases/${bcId}/planning`, payload).then(r => r.data);
// Planning Concept (Pitch Deck slides 3 + 6) and timeline (slide 8), AI-written
// from the deck; cached server-side until the deck changes.
export const v3PlanningFromPitchDeck = (bcId, force = false) =>
  v3.post(`/business-cases/${bcId}/planning/from-pitch-deck`, undefined, { params: force ? { force: true } : undefined, timeout: 120000 }).then(r => r.data);
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
// Delivery page uploads: one call per file (PDF, Word, image...). The first
// successful upload takes the deliverable off "pending upload". Returns the
// deliverable with its slim `attachments` metadata, never the base64 blob.
export const v3UploadDeliverableFile = (deliverableId, payload) => v3.post(`/deliverables/${deliverableId}/upload`, payload).then(r => r.data);
export const v3DeleteDeliverableFile = (fileId) => v3.delete(`/deliverables/files/${fileId}`).then(r => r.data);
// Stream URL for downloading a previously-uploaded deliverable attachment.
export const v3DeliverableFileUrl = (fileId) => `${_BACKEND_URL_FOR_INVOICE}/api/v3/deliverables/files/${fileId}`;
// Admin approval gate on the Delivery page. Approving marks the deliverables
// approved, unlocks Reporting, and raises a fresh "deliverable available"
// notification in the brand portal on every click. Omit deliverable_ids to
// approve every deliverable on the business case.
export const v3ApproveDeliverables = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/deliverables/approve`, payload).then(r => r.data);
export const v3RequestScopeChange = (bcId, payload) => v3.post(`/business-cases/${bcId}/scope-change`, payload).then(r => r.data);
export const v3ApproveScopeChange = (bcId, scId) => v3.post(`/business-cases/${bcId}/scope-change/${scId}/approve`).then(r => r.data);

// -------- Closure --------
export const v3ListFinalReports = (bcId) => v3.get('/final-reports', { params: { business_case_id: bcId } }).then(r => r.data);
// The report's prose is AI-written (server allows ~100s), so wait longer than
// the 45s default.
export const v3GenerateFinalReport = (bcId, payload = {}) => v3.post(`/business-cases/${bcId}/final-report/generate`, payload, { timeout: 150000 }).then(r => r.data);
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

// Runs the analyser across every uploaded transcript, so it is the slowest AI
// call in the app. Not retried: this endpoint can create a business case, and
// a retry would risk a duplicate.
export const v3GenerateAlignmentFromTranscripts = (brandId, transcripts = []) => v3.post(`/brands/${brandId}/frame-transcripts`, {
  actor: 'admin',
  source: 'v1_admin_multi_transcript_frame',
  transcripts: transcripts.map((item, index) => ({
    transcript: item.content || item.transcript || '',
    call_date: item.date || item.call_date || '',
    session_label: item.session || item.session_label || `Session ${index + 1}`,
    notes: item.notes || '',
    meeting_id: item.backendId || item.meeting_id || undefined,
  })),
}, { timeout: 240000 }).then(r => r.data);
export const v3RegenerateMeetingQuestions = (meetingId) => v3.post(`/meetings/${meetingId}/questions/regenerate`).then(r => r.data);
export const v3DraftBrandFollowUp = (brandId, payload = {}) => v3.post(`/brands/${brandId}/ai/follow-up-draft`, payload).then(r => r.data);
export const v3AcceptQualificationMeeting = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/qualification/accept`, payload).then(r => r.data);
export const v3RescheduleQualificationMeeting = (meetingId, payload) => v3.post(`/meetings/${meetingId}/qualification/reschedule`, payload).then(r => r.data);
export const v3DeleteQualificationMeeting = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/qualification/delete`, payload).then(r => r.data);
export const v3ProceedBusinessCall = (meetingId) => v3.post(`/meetings/${meetingId}/business/proceed`).then(r => r.data);
export const v3RescheduleBusinessCall = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/business/reschedule`, payload).then(r => r.data);
export const v3DeleteBusinessCall = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/business/delete`, payload).then(r => r.data);
// Removes one saved transcript/conversation row only - unlike v3DeleteBusinessCall
// above, this never deletes or flags the brand it belongs to.
export const v3DeleteConnectTranscript = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/connect-transcript/delete`, payload).then(r => r.data);
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
// Agency-wide operational Overview. One request populates the whole page and
// every figure is counted live from the CRM collections, so the dashboard
// tracks the workflow rather than holding its own copy of it.
// See backend/v3_overview.py.
export const v3AdminOperationalOverview = (windowDays = 30) =>
  v3.get('/metrics/overview', { params: { window_days: windowDays } }).then(r => r.data);

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
// `selection`, when given as { meeting_ids, source_ids }, limits detection to
// just those conversations instead of every one ever saved for this case.
export const v3StartDetectOpportunities = (bcId, selection) => v3.post(`/business-cases/${bcId}/connect/detect-opportunities`, selection || {}).then(r => r.data);
export const v3GetDetectOpportunitiesJob = (bcId, jobId) => v3.get(`/business-cases/${bcId}/connect/detect-opportunities/jobs/${jobId}`).then(r => r.data);
export const v3DetectOpportunities = async (bcId, onProgress, selection) => {
  const started = await v3StartDetectOpportunities(bcId, selection);
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
export const v3UpdateGeneratedCreativeBrief = (bcId, brief, snapshotId) => v3.patch(
  `/business-cases/${bcId}/creative-brief`, brief,
  { params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined },
).then(r => r.data);
const briefQuery = (snapshotId, creatorId) => {
  const params = new URLSearchParams();
  if (snapshotId) params.set('alignment_snapshot_id', snapshotId);
  if (creatorId) params.set('creator_id', creatorId);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};
export const v3TemplateBriefDocxUrl = (bcId, snapshotId, creatorId) => `${V3}/business-cases/${bcId}/creative-brief/docx${briefQuery(snapshotId, creatorId)}`;
export const v3TemplateBriefPreviewUrl = (bcId, snapshotId, creatorId) => v3ShareableUrl(`${V3}/business-cases/${bcId}/creative-brief/preview${briefQuery(snapshotId, creatorId)}`);

// --- Pitch Deck: ten AI-written sections, brand-facing -------------------
export const v3GetPitchDeck = (bcId, snapshotId) => v3.get(`/business-cases/${bcId}/pitch-deck`, {
  params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined,
}).then(r => r.data);
export const v3GeneratePitchDeck = async (bcId, onProgress, snapshotId) => {
  // Long AI job: generous timeout on the kick-off call, and tolerate a few
  // transient poll failures (gateway blips) instead of failing the whole run.
  const started = await v3.post(`/business-cases/${bcId}/ai/pitch-deck/generate`, null, {
    params: snapshotId ? { alignment_snapshot_id: snapshotId } : undefined,
    timeout: 120000,
  }).then(r => r.data);
  const jobId = started?.job_id;
  if (!jobId) return started;
  let pollFailures = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    let job;
    try {
      ({ job } = await v3.get(`/business-cases/${bcId}/ai/pitch-deck/jobs/${jobId}`, { timeout: 30000 }).then(r => r.data));
      pollFailures = 0;
    } catch (e) {
      pollFailures += 1;
      if (pollFailures >= 5) throw new Error('Lost connection while checking Pitch Deck progress. The deck may still be writing - reload the page in a minute.');
      continue;
    }
    if (typeof onProgress === 'function' && job?.message) onProgress(job);
    if (job?.status === 'completed') return { ok: true, pitch_deck: job.pitch_deck };
    if (job?.status === 'failed') throw new Error(job?.message || 'Pitch Deck generation failed.');
  }
  throw new Error('Pitch Deck generation timed out. Please retry.');
};
export const v3UpdatePitchDeck = (deckId, payload) => v3.patch(`/pitch-decks/${deckId}`, payload).then(r => r.data);
// deckId: the deck being approved (a case can hold one per Alignment Snapshot).
export const v3ApprovePitchDeckAs = (bcId, approver, approver_party = 'admin', deckId) => v3.post(`/business-cases/${bcId}/pitch-deck/approve`, { approver, approver_party, deck_id: deckId || undefined }).then(r => r.data);
// Same shape as the alignment send: docx build + SMTP. Longer timeout, and no
// retry so the brand is never emailed the deck twice.
export const v3SendPitchDeckToBrand = (bcId, payload = {}) =>
  v3.post(`/business-cases/${bcId}/pitch-deck/send`, payload, { timeout: 120000 }).then(r => r.data);

// "Send to brand page": reveal the deck in the brand portal without emailing.
// Generated decks stay admin-only until this (or the email send) runs.
export const v3PublishPitchDeckToBrandPage = (bcId, payload = {}) =>
  v3SendPitchDeckToBrand(bcId, { ...payload, send_email: false });

// ---- Pitch deck imagery (per-brand cover art + page 7 creator portraits) ----
// Images travel as base64 data URIs; the server downscales and re-encodes them
// so the stored deck stays small and the flip book stays self-contained.
export const v3ReadFileAsDataUri = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Could not read that file.'));
  reader.readAsDataURL(file);
});

export const v3SetPitchDeckCoverImage = (deckId, image) =>
  v3.put(`/pitch-decks/${deckId}/cover-image`, { image }).then(r => r.data);

export const v3ClearPitchDeckCoverImage = (deckId) =>
  v3.delete(`/pitch-decks/${deckId}/cover-image`).then(r => r.data);

export const v3AddPitchDeckCreatorImage = (deckId, payload) =>
  v3.post(`/pitch-decks/${deckId}/creator-images`, payload).then(r => r.data);

export const v3RemovePitchDeckCreatorImage = (deckId, imageId) =>
  v3.delete(`/pitch-decks/${deckId}/creator-images/${imageId}`).then(r => r.data);
export const v3AddPitchDeckComment = (deckId, payload) => v3.post(`/pitch-decks/${deckId}/comments`, payload).then(r => r.data);
export const v3PitchDeckDocxUrl = (deckId) => `${V3}/pitch-decks/${deckId}/docx`;
export const v3PitchDeckPdfUrl = (deckId) => `${V3}/pitch-decks/${deckId}/pdf`;
// Standalone flip-book HTML (fonts embedded, works offline). Inline for
// preview; ?download=1 saves the file so admin can send it to clients.
export const v3PitchDeckFlipbookUrl = (deckId, download = false) => `${V3}/pitch-decks/${deckId}/flipbook${download ? '?download=1' : ''}`;

// The same document opened straight into slide view. Both modes ship in the
// one file with a toggle, so this only chooses which one opens first.
export const v3PitchDeckSlidesUrl = (deckId, download = false) =>
  `${V3}/pitch-decks/${deckId}/flipbook?view=slides${download ? '&download=1' : ''}`;

// --- Deck analytics -----------------------------------------------------
export const v3GetPitchDeckAnalytics = (deckId) =>
  v3.get(`/pitch-decks/${deckId}/analytics`).then(r => r.data);

// --- Duplicate flagger --------------------------------------------------
export const v3ListBusinessCaseDuplicates = () =>
  v3.get('/business-case-duplicates').then(r => r.data);
export const v3BusinessCaseDuplicatesCount = () =>
  v3.get('/business-case-duplicates/count').then(r => r.data);
export const v3MergeBusinessCaseInto = (sourceId, targetId, actor = 'admin') =>
  v3.post(`/business-cases/${sourceId}/merge-into`, { target_id: targetId, actor }).then(r => r.data);
export const v3DismissDuplicatePair = (sourceId, otherId) =>
  v3.post(`/business-cases/${sourceId}/duplicate-dismiss`, { other_id: otherId }).then(r => r.data);

// Bare-brand duplicates - two brands added twice with no business case yet
// to catch them via the case-duplicate scan above.
export const v3ListBrandDuplicates = () =>
  v3.get('/brand-duplicates').then(r => r.data);
export const v3BrandDuplicatesCount = () =>
  v3.get('/brand-duplicates/count').then(r => r.data);
export const v3MergeBrandInto = (sourceId, targetId, actor = 'admin') =>
  v3.post(`/brands/${sourceId}/merge-into`, { target_id: targetId, actor }).then(r => r.data);
export const v3DismissBrandDuplicatePair = (sourceId, otherId) =>
  v3.post(`/brands/${sourceId}/duplicate-dismiss`, { other_id: otherId }).then(r => r.data);

// --- Admin messages unread badge ---------------------------------------
export const v3AdminMessagesUnreadCount = () =>
  v3.get('/admin/messages/unread-count').then(r => r.data);
export const v3AdminMessagesMarkRead = (brandId) =>
  v3.post('/admin/messages/mark-read', brandId ? { brand_id: brandId } : {}).then(r => r.data);

// --- Alignment snapshot priority (brand ranks; admin can override) --------
export const v3ListPriorityOptions = () => v3.get('/priority-options').then(r => r.data);
export const v3SetSnapshotPriority = (snapshotId, priority, actor) =>
  v3.patch(`/alignment-snapshots/${snapshotId}/priority`, { priority, actor }).then(r => r.data);

export default v3;


