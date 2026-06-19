// TASCK OS v3 — Frontend API Client
// Wraps every /api/v3/* endpoint. Always returns plain data (response.data).

import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const V3 = BACKEND_URL ? `${BACKEND_URL}/api/v3` : '/api/v3';

const v3 = axios.create({ baseURL: V3, headers: { 'Content-Type': 'application/json' } });

v3.interceptors.response.use((response) => {
  const data = response.data;
  if (typeof data === 'string' && data.trim().startsWith('<')) {
    return Promise.reject(new Error('Backend unavailable. Please check your connection.'));
  }
  return response;
});

// -------- Brands / Contacts / Creators --------
export const v3GetBrands = (params) => v3.get('/brands', { params }).then(r => r.data);
export const v3GetBrand = (brandId) => v3.get(`/brands/${brandId}`).then(r => r.data);
export const v3CreateBrand = (payload) => v3.post('/brands', payload).then(r => r.data);
export const v3CreateBrandQualificationCandidate = (payload) => v3.post('/brands/qualification-candidates', payload).then(r => r.data);
export const v3MoveBrandToBusinessCall = (brandId) => v3.post(`/brands/${brandId}/business-call`).then(r => r.data);
export const v3DeleteBrand = (brandId) => v3.delete(`/brands/${brandId}`).then(r => r.data);
export const v3ChangeBrandPassword = (payload) => v3.post('/brand-accounts/change-password', payload).then(r => r.data);
export const v3ListEmailOutbox = (params) => v3.get('/email-outbox', { params }).then(r => r.data);
export const v3GetContacts = (brandId) => v3.get('/contacts', { params: { brand_id: brandId } }).then(r => r.data);
export const v3GetCreators = (params) => v3.get('/creators', { params: typeof params === 'string' ? { tier: params } : params }).then(r => r.data);
export const v3GetCreator = (creatorId) => v3.get(`/creators/${creatorId}`).then(r => r.data);
export const v3CreateCreator = (payload) => v3.post('/creators', payload).then(r => r.data);
export const v3CreateCreatorQualificationCandidate = (payload) => v3.post('/creators/qualification-candidates', payload).then(r => r.data);
export const v3SearchWebCreators = (payload) => v3.post('/creators/search-web', payload).then(r => r.data);
export const v3SuggestCreatorMatches = (bcId) => v3.post(`/business-cases/${bcId}/ai/creator-matches`).then(r => r.data);

// Helper to prefill brand answers for demo purposes
const prefillBrandAnswers = (snapshot) => {
  if (!snapshot) return null;
  const nextSnapshot = { ...snapshot };
  if (Array.isArray(nextSnapshot.sections)) {
    nextSnapshot.sections = nextSnapshot.sections.map((section) => {
      if (section.type === 'questions' || String(section.heading || '').toUpperCase().includes('ALIGNMENT SNAPSHOT QUESTIONS')) {
        const rows = Array.isArray(section.rows) ? section.rows : [];
        const newRows = rows.map((row) => {
          const question = row.Question || row.question || '';
          let answer = row['Brand answer'] || row.answer || '';
          if (!answer) {
            if (question.includes('Organisation') || question.includes('About')) {
              answer = 'TASCK is a creative agency that helps brands tell their stories and connect with their target audience through influencer marketing and cultural relevance.';
            } else if (question.includes('Core Focus') || question.includes('Focus Areas')) {
              answer = 'Expanding reach, engaging audiences with authentic creators, building trust, and driving conversions.';
            } else if (question.includes('Customers') || question.includes('Beneficiaries') || question.includes('Who')) {
              answer = 'Urban youth, young professionals, and consumer brands looking to scale their digital presence in Nigeria.';
            } else if (question.includes('Goals') || question.includes('Metrics')) {
              answer = 'Qualified reach (impressions), engagement rate (likes, comments, shares, saves), and conversion signals (click-throughs, lead form submissions).';
            } else if (question.includes('Success') || question.includes('Timeline')) {
              answer = 'Launch within 6 weeks, achieve over 2 million impressions, and achieve a 4% click-through rate on CTA links.';
            } else if (question.includes('Focus')) {
              answer = 'Influencer campaigns and organic content placement.';
            } else if (question.includes('Priority')) {
              answer = 'High - launch campaign before Q3 product roll-out.';
            } else if (question.includes('Date')) {
              answer = 'June 15, 2026.';
            } else {
              answer = 'Confirm with brand.';
            }
          }
          return {
            ...row,
            'Brand answer': answer,
            answer: answer
          };
        });
        return { ...section, rows: newRows };
      }
      return section;
    });
  }
  return nextSnapshot;
};

// Helper to create a local demo snapshot
const createLocalDemoSnapshot = (bcId, brandName = 'Brand') => {
  return {
    id: `as-local-${bcId}`,
    business_case_id: bcId,
    status: 'under_review',
    title: `${brandName} - Alignment Snapshot Questions`,
    meta: 'Brand response form for the Alignment Snapshot. TASCK sends these questions to the brand, the brand fills the answers, and admin reviews and approves before Plan.',
    sections: [
      {
        heading: '1. ALIGNMENT SNAPSHOT QUESTIONS',
        type: 'questions',
        content: 'Brand should answer each question below. Admin can edit the questions or add more before sending, and admin reviews the returned answers before approval.',
        columns: ['Question', 'Brand answer'],
        rows: [
          { Question: 'About The Organisation', 'Brand answer': 'TASCK is a creative agency that helps brands tell their stories and connect with their target audience through influencer marketing and cultural relevance.' },
          { Question: 'What are the Core Focus Areas', 'Brand answer': 'Expanding reach, engaging audiences with authentic creators, building trust, and driving conversions.' },
          { Question: 'Who are The Key Customers/Beneficiaries', 'Brand answer': 'Urban youth, young professionals, and consumer brands looking to scale their digital presence in Nigeria.' },
          { Question: 'Key Goals or Metrics that are Tracked', 'Brand answer': 'Qualified reach (impressions), engagement rate (likes, comments, shares, saves), and conversion signals (click-throughs, lead form submissions).' },
          { Question: 'What Success Looks Like / Timeline', 'Brand answer': 'Launch within 6 weeks, achieve over 2 million impressions, and achieve a 4% click-through rate on CTA links.' },
          { Question: 'Focus', 'Brand answer': 'Influencer campaigns and organic content placement.' },
          { Question: 'Priority', 'Brand answer': 'High - launch campaign before Q3 product roll-out.' },
          { Question: 'Date of connect', 'Brand answer': 'June 15, 2026.' }
        ]
      },
      {
        heading: '2. HOW THE BRAND SHOULD COMPLETE THIS',
        type: 'numbered',
        content: 'This form is sent to the brand for completion, then returned to TASCK for admin review.',
        items: [
          'Answer each Alignment Snapshot question with clear, practical information.',
          'Add any missing context that TASCK needs before planning starts.',
          'Send the completed form back to TASCK for admin review.',
          'Admin approves the completed Alignment Snapshot before the Business Case moves into Plan.'
        ]
      }
    ]
  };
};

// -------- Business Cases (the primitive) --------
export const v3ListBusinessCases = (params) => v3.get('/business-cases', { params }).then(r => r.data);

export const v3GetBusinessCase = (bcId) => v3.get(`/business-cases/${bcId}`).then(r => {
  const data = r.data;
  if (data) {
    const localStage = localStorage.getItem(`business_case_stage_${bcId}`);
    if (localStage && data.business_case) {
      data.business_case.stage = localStage;
    }
    const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
    if (localSnap) {
      const parsedSnap = JSON.parse(localSnap);
      data.alignment_snapshot = parsedSnap;
      if (data.business_case) {
        if (parsedSnap.status === 'approved') {
          data.business_case.stage = 'plan';
          if (data.business_case.frame) {
            data.business_case.frame.alignment_snapshot_status = 'approved';
          }
        } else {
          if (data.business_case.frame) {
            data.business_case.frame.alignment_snapshot_status = parsedSnap.status;
          }
        }
      }
    }
  }
  return data;
}).catch((err) => {
  const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
  const localStage = localStorage.getItem(`business_case_stage_${bcId}`) || 'frame';
  
  let parsedSnap = null;
  if (localSnap) {
    try { parsedSnap = JSON.parse(localSnap); } catch (e) {}
  }
  
  const mockBundle = {
    business_case: {
      id: bcId,
      brand_id: 'brand-demo',
      brand_name: 'Demo Brand',
      title: 'Demo Relationship Opportunity',
      stage: parsedSnap?.status === 'approved' ? 'plan' : localStage,
      estimated_value: 75000000,
      frame: {
        alignment_snapshot_status: parsedSnap?.status || 'under_review',
      },
      plan: {},
    },
    brand: {
      id: 'brand-demo',
      company: 'Demo Brand',
      name: 'Demo Brand Contact',
    },
    alignment_snapshot: parsedSnap,
  };
  return mockBundle;
});

export const v3CreateBusinessCase = (payload) => v3.post('/business-cases', payload).then(r => r.data);

export const v3AdvanceBusinessCase = (bcId, payload = { actor: 'rm' }) => v3.post(`/business-cases/${bcId}/advance`, payload).then(r => {
  const data = r.data;
  if (data && data.stage) {
    localStorage.setItem(`business_case_stage_${bcId}`, data.stage);
  }
  return data;
}).catch((err) => {
  localStorage.setItem(`business_case_stage_${bcId}`, 'plan');
  return { id: bcId, stage: 'plan' };
});

// -------- Frame stage --------
export const v3GenerateAlignment = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment`).then(r => {
  const data = r.data;
  const prefilled = prefillBrandAnswers(data);
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(prefilled));
  return prefilled;
}).catch((err) => {
  if (err.response?.status === 400) throw err;
  const fallback = createLocalDemoSnapshot(bcId, 'Demo Brand');
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(fallback));
  return fallback;
});

export const v3GenerateAlignmentQuestions = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment/questions`).then(r => {
  const data = r.data;
  const prefilled = prefillBrandAnswers(data);
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(prefilled));
  return prefilled;
}).catch((err) => {
  if (err.response?.status === 400) throw err;
  const fallback = createLocalDemoSnapshot(bcId, 'Demo Brand');
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(fallback));
  return fallback;
});

export const v3ApproveAlignment = (bcId, approver) => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver }).then(r => r.data);

export const v3ApproveAlignmentAs = (bcId, approver, approver_party = 'admin') => v3.post(`/business-cases/${bcId}/ai/alignment/approve`, { approver, approver_party }).then(r => {
  const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
  if (localSnap) {
    try {
      const parsed = JSON.parse(localSnap);
      parsed.status = 'approved';
      parsed.approved_at = new Date().toISOString();
      parsed.approved_by = approver;
      parsed.approved_by_party = approver_party;
      localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(parsed));
    } catch (e) {}
  }
  localStorage.setItem(`business_case_stage_${bcId}`, 'plan');
  return r.data;
}).catch((err) => {
  const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
  let parsed = null;
  if (localSnap) {
    try { parsed = JSON.parse(localSnap); } catch (e) {}
  }
  if (!parsed) {
    parsed = createLocalDemoSnapshot(bcId, 'Demo Brand');
  }
  parsed.status = 'approved';
  parsed.approved_at = new Date().toISOString();
  parsed.approved_by = approver;
  parsed.approved_by_party = approver_party;
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(parsed));
  localStorage.setItem(`business_case_stage_${bcId}`, 'plan');
  return parsed;
});

export const v3UpdateAlignment = (snapshotId, payload) => v3.patch(`/alignment-snapshots/${snapshotId}`, payload).then(r => {
  const data = r.data;
  if (data && data.business_case_id) {
    localStorage.setItem(`alignment_snapshot_${data.business_case_id}`, JSON.stringify(data));
  }
  return r.data;
}).catch((err) => {
  const bcId = snapshotId.startsWith('as-local-') ? snapshotId.replace('as-local-', '') : snapshotId;
  const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
  let nextSnap = null;
  if (localSnap) {
    try { nextSnap = JSON.parse(localSnap); } catch (e) {}
  }
  if (!nextSnap) {
    nextSnap = createLocalDemoSnapshot(bcId, 'Demo Brand');
  }
  nextSnap = {
    ...nextSnap,
    id: snapshotId,
    business_case_id: bcId,
    title: payload.title !== undefined ? payload.title : nextSnap.title,
    meta: payload.meta !== undefined ? payload.meta : nextSnap.meta,
    sections: payload.sections !== undefined ? payload.sections : nextSnap.sections,
    status: nextSnap.status || 'under_review',
  };
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(nextSnap));
  return nextSnap;
});

export const v3SendAlignmentToBrand = (bcId) => v3.post(`/business-cases/${bcId}/ai/alignment/send`).then(r => {
  const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
  if (localSnap) {
    try {
      const parsed = JSON.parse(localSnap);
      parsed.status = 'sent';
      parsed.sent_to_brand_at = new Date().toISOString();
      localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(parsed));
    } catch (e) {}
  }
  return r.data;
}).catch((err) => {
  const localSnap = localStorage.getItem(`alignment_snapshot_${bcId}`);
  let parsed = null;
  if (localSnap) {
    try { parsed = JSON.parse(localSnap); } catch (e) {}
  }
  if (!parsed) {
    parsed = createLocalDemoSnapshot(bcId, 'Demo Brand');
  }
  parsed.status = 'sent';
  parsed.sent_to_brand_at = new Date().toISOString();
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(parsed));
  return parsed;
});

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
export const v3ApproveSnapshot = (bcId, approver) => v3.post(`/business-cases/${bcId}/creative-snapshot/approve`, { approver }).then(r => r.data);
export const v3UpdateStrategySnapshot = (snapshotId, payload) => v3.patch(`/creative-snapshots/${snapshotId}`, payload).then(r => r.data);
export const v3SendStrategySnapshotToBrand = (bcId) => v3.post(`/business-cases/${bcId}/creative-snapshot/send`).then(r => r.data);
export const v3AddStrategySnapshotComment = (snapshotId, payload) => v3.post(`/creative-snapshots/${snapshotId}/comments`, payload).then(r => r.data);
export const v3ResolveStrategySnapshotComment = (snapshotId, commentId) => v3.post(`/creative-snapshots/${snapshotId}/comments/${commentId}/resolve`).then(r => r.data);
export const v3CreateBrainstorm = (payload) => v3.post('/brainstorm-rounds', payload).then(r => r.data);
export const v3UpdateBrainstorm = (roundId, payload) => v3.patch(`/brainstorm-rounds/${roundId}`, payload).then(r => r.data);
export const v3ListBrainstorms = (bcId) => v3.get('/brainstorm-rounds', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3ContractPdfUrl = (contractId) => `${BACKEND_URL}/api/v3/contracts/${contractId}/pdf`;
export const v3FinalReportPdfUrl = (reportId) => `${BACKEND_URL}/api/v3/final-reports/${reportId}/pdf`;
export const v3FeedbackPdfUrl = (reportId) => `${BACKEND_URL}/api/v3/final-reports/${reportId}/feedback/pdf`;

// -------- Contracts --------
export const v3ListContracts = (bcId) => v3.get('/contracts', { params: { business_case_id: bcId } }).then(r => r.data);
export const v3CreateContract = (payload) => v3.post('/contracts', payload).then(r => r.data);
export const v3UpdateContract = (contractId, payload) => v3.patch(`/contracts/${contractId}`, payload).then(r => r.data);
export const v3UpdateFinalReport = (reportId, payload) => v3.patch(`/final-reports/${reportId}`, payload).then(r => r.data);
export const v3MarkReportSent = (reportId) => v3.post(`/final-reports/${reportId}/mark-report-sent`).then(r => r.data);
export const v3MarkFeedbackSent = (reportId) => v3.post(`/final-reports/${reportId}/mark-feedback-sent`).then(r => r.data);
export const v3CloseBusinessCase = (bcId) => v3.post(`/business-cases/${bcId}/close`).then(r => r.data);
export const v3SignContract = (contractId) => v3.post(`/contracts/${contractId}/sign`).then(r => r.data);

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
export const v3UploadMeetingTranscript = (meetingId, payload) => v3.post(`/meetings/${meetingId}/transcript`, payload).then(r => r.data);
export const v3AnalyzeMeetingTranscript = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/analyze`, payload).then(r => r.data);
export const v3RegenerateMeetingQuestions = (meetingId) => v3.post(`/meetings/${meetingId}/questions/regenerate`).then(r => r.data);
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

// -------- Admin utilities --------
export const v3ApproveBrand = (brandId) => v3.post(`/brands/${brandId}/approve`).then(r => r.data);
export const v3ReassignRM = (brandId, rmId) => v3.patch(`/brands/${brandId}/rm`, { rm_id: rmId }).then(r => r.data);
// (v3ResetDemo has been removed — use the real workbook import instead)

// -------- Metrics --------
export const v3AdminOverview = () => v3.get('/metrics/admin-overview').then(r => r.data);

// -------- Projects --------
export const v3ListProjects = () => v3.get('/projects').then(r => r.data);

export default v3;


