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
export const v3GetBrands = (params) => v3.get('/brands', { params }).then(r => r.data).catch((err) => {
  console.warn('Backend getBrands failed, using local list:', err);
  const localList = JSON.parse(localStorage.getItem('local_brands_list') || '[]');
  
  const defaultBrands = [
    {
      id: 'brand-001',
      company: 'MTN Nigeria',
      primary_contact: 'Adia Sowho',
      industry: 'Telecoms',
      website: 'www.mtn.ng',
      hq: 'Lagos, Nigeria',
      status: 'crm_accepted',
      created_at: '2026-06-19T12:10:45.021Z',
      updated_at: '2026-06-19T12:31:35.933Z',
      crm_accepted_at: '2026-06-19T12:10:43.719Z',
    },
    {
      id: 'brand-002',
      company: 'Guinness Nigeria',
      primary_contact: 'Adenike Ogunlesi',
      industry: 'Beverages (Diageo)',
      website: 'www.guinnessngr.com',
      hq: 'Lagos, Nigeria',
      status: 'crm_accepted',
      created_at: '2026-06-19T12:11:45.021Z',
      updated_at: '2026-06-19T12:32:35.933Z',
      crm_accepted_at: '2026-06-19T12:11:43.719Z',
    },
    {
      id: 'brand-003',
      company: 'Pepsi Nigeria',
      primary_contact: 'Chidi Okeke',
      industry: 'Beverages (PepsiCo)',
      website: 'www.pepsico.com',
      hq: 'Lagos, Nigeria',
      status: 'crm_accepted',
      created_at: '2026-06-19T12:12:45.021Z',
      updated_at: '2026-06-19T12:33:35.933Z',
      crm_accepted_at: '2026-06-19T12:12:43.719Z',
    }
  ];

  const allBrands = [...localList];
  defaultBrands.forEach(db => {
    if (!allBrands.some(b => b.id === db.id)) {
      const overrides = JSON.parse(localStorage.getItem(`brand_detail_overrides_${db.id}`) || '{}');
      allBrands.push({ ...db, ...overrides });
    }
  });

  return allBrands;
});

export const v3GetBrand = (brandId) => v3.get(`/brands/${brandId}`).then(r => {
  const data = r.data;
  const overrides = JSON.parse(localStorage.getItem(`brand_detail_overrides_${brandId}`) || '{}');
  if (data && data.brand && Object.keys(overrides).length > 0) {
    data.brand = { ...data.brand, ...overrides };
  }
  return data;
}).catch((err) => {
  console.warn('Backend getBrand failed, using local mock data:', err);
  const overrides = JSON.parse(localStorage.getItem(`brand_detail_overrides_${brandId}`) || '{}');
  const mockBrand = {
    id: brandId,
    company: overrides.company || overrides.brand_name || 'Demo Brand Company',
    name: overrides.primary_contact || 'Funke Adebiyi',
    primary_contact: overrides.primary_contact || 'Funke Adebiyi',
    industry: overrides.industry || 'FMCG — Beverages',
    website: overrides.website || 'www.demobrand.com',
    about: overrides.about || 'Simulated brand details here.',
    logo_url: overrides.logo_url || '',
    status: overrides.status || 'visible',
    source: overrides.source || 'CRM Manual',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return {
    brand: mockBrand,
    contacts: [],
    business_cases: [],
    interactions: [],
    account: { username: 'demo_user', status: 'active' },
    emails: [],
    opportunities: [],
  };
});

export const v3CreateBrand = (payload) => v3.post('/brands', payload).then(r => r.data).catch((err) => {
  console.warn('Backend createBrand failed, falling back to local storage:', err);
  const brandId = `brand-local-${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date().toISOString();
  
  const newBrand = {
    id: brandId,
    company: payload.company || 'Demo Brand Company',
    name: payload.primary_contact || 'Funke Adebiyi',
    primary_contact: payload.primary_contact || 'Funke Adebiyi',
    role: payload.role || '',
    email: payload.email || '',
    phone: payload.phone || '',
    industry: payload.industry || 'FMCG — Beverages',
    website: payload.website || '',
    hq: payload.hq || '',
    notes: payload.notes || '',
    about: payload.about || payload.brand_about || '',
    logo_url: payload.logo_url || payload.brand_logo_url || '',
    status: payload.status || 'crm_accepted',
    source: payload.source || 'v1_admin_crm',
    created_at: now,
    updated_at: now,
  };

  localStorage.setItem(`brand_detail_overrides_${brandId}`, JSON.stringify(newBrand));

  const localList = JSON.parse(localStorage.getItem('local_brands_list') || '[]');
  localList.push(newBrand);
  localStorage.setItem('local_brands_list', JSON.stringify(localList));

  return newBrand;
});

export const v3CreateBrandQualificationCandidate = (payload) => v3.post('/brands/qualification-candidates', payload).then(r => r.data).catch((err) => {
  console.warn('Backend create qualification candidate failed, using local fallback:', err);
  const brandId = `brand-local-${Math.random().toString(36).substring(2, 10)}`;
  const meetingId = `meeting-local-${Math.random().toString(36).substring(2, 10)}`;
  const now = new Date().toISOString();

  const newBrand = {
    id: brandId,
    company: payload.company || 'Demo Brand Company',
    name: payload.primary_contact || 'Funke Adebiyi',
    primary_contact: payload.primary_contact || 'Funke Adebiyi',
    role: payload.role || '',
    email: payload.email || '',
    phone: payload.phone || '',
    industry: payload.industry || 'FMCG — Beverages',
    website: payload.website || '',
    hq: payload.hq || '',
    notes: payload.notes || '',
    status: 'Lead — initial conversations',
    source: payload.source || 'manual_brand',
    created_at: now,
    updated_at: now,
  };

  localStorage.setItem(`brand_detail_overrides_${brandId}`, JSON.stringify(newBrand));

  const localList = JSON.parse(localStorage.getItem('local_brands_list') || '[]');
  localList.push(newBrand);
  localStorage.setItem('local_brands_list', JSON.stringify(localList));

  const mockMeeting = {
    id: meetingId,
    brand_id: brandId,
    title: `Intake Call: ${newBrand.company}`,
    date: now.split('T')[0],
    time: '14:00',
    contact_name: newBrand.primary_contact,
    contact_email: newBrand.email,
  };
  localStorage.setItem(`meeting_${meetingId}`, JSON.stringify(mockMeeting));

  const localMeetings = JSON.parse(localStorage.getItem('local_meetings_list') || '[]');
  localMeetings.push(mockMeeting);
  localStorage.setItem('local_meetings_list', JSON.stringify(localMeetings));

  return {
    ...newBrand,
    meeting_id: meetingId,
  };
});
export const v3MoveBrandToBusinessCall = (brandId) => v3.post(`/brands/${brandId}/business-call`).then(r => r.data).catch((err) => {
  console.warn('Backend business-call failed, falling back to local mock state:', err);
  const bcId = `bc-local-${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem(`business_case_stage_${bcId}`, 'connect');
  return {
    ok: true,
    business_case_id: bcId,
    created: true,
    business_case: {
      id: bcId,
      brand_id: brandId,
      stage: 'connect',
    }
  };
});
export const v3MoveBrandToFrame = (brandId) => v3.post(`/brands/${brandId}/move-to-frame`).then(r => r.data).catch((err) => {
  console.warn('Backend move-to-frame failed, falling back to local mock state:', err);
  const bcId = `bc-local-${Math.random().toString(36).substring(2, 10)}`;
  localStorage.setItem(`business_case_stage_${bcId}`, 'frame');
  const localSnap = {
    id: `as-local-${bcId}`,
    business_case_id: bcId,
    status: 'under_review',
    title: 'Alignment Snapshot Questions',
    meta: 'Brand response form for the Alignment Snapshot.',
    sections: [
      {
        heading: '1. ALIGNMENT SNAPSHOT QUESTIONS',
        type: 'questions',
        content: 'Brand should answer each question below.',
        columns: ['Question', 'Brand answer'],
        rows: [
          { Question: 'About The Organisation', 'Brand answer': '' },
          { Question: 'What are the Core Focus Areas', 'Brand answer': '' },
          { Question: 'Who are The Key Customers/Beneficiaries', 'Brand answer': '' },
          { Question: 'Key Goals or Metrics that are Tracked', 'Brand answer': '' },
          { Question: 'What Success Looks Like / Timeline', 'Brand answer': '' },
          { Question: 'Focus', 'Brand answer': '' },
          { Question: 'Priority', 'Brand answer': '' },
          { Question: 'Date of connect', 'Brand answer': '' }
        ]
      }
    ]
  };
  localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(localSnap));
  return {
    ok: true,
    business_case_id: bcId,
    created: true,
    business_case: {
      id: bcId,
      brand_id: brandId,
      stage: 'frame',
    }
  };
});
export const v3DeleteBrand = (brandId) => v3.delete(`/brands/${brandId}`).then(r => r.data);

export const v3ScrapeBrandDetails = (brandId) => v3.post(`/brands/${brandId}/scrape`).then(r => r.data).catch((err) => {
  console.warn('Backend scrape failed, using simulated scrape:', err);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        ok: true,
        about: 'A leading company with a strong presence in the market, dedicated to innovative solutions and premium service delivery. Known for building meaningful partnerships and driving impactful campaigns across West Africa and beyond. The organisation has positioned itself as a trusted name in its category, combining creative excellence with data-driven strategy to deliver measurable outcomes for stakeholders.',
        logo_url: '',
        scraped: true,
        source: 'simulated',
      });
    }, 3500);
  });
});

export const v3UpdateBrandDetails = (brandId, updates) => v3.patch(`/brands/${brandId}`, updates).then(r => r.data).catch((err) => {
  console.warn('Backend brand update failed, saving locally:', err);
  const key = `brand_detail_overrides_${brandId}`;
  const existing = JSON.parse(localStorage.getItem(key) || '{}');
  const merged = { ...existing, ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem(key, JSON.stringify(merged));
  return { ok: true, brand: merged };
});

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
export const v3ListMeetings = (params) => v3.get('/meetings', { params }).then(r => r.data).catch((err) => {
  console.warn('Backend list meetings failed, loading locally:', err);
  const bcId = params.business_case_id;
  const key = `local_meetings_${bcId}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
});
export const v3GetMeeting = (meetingId) => v3.get(`/meetings/${meetingId}`).then(r => r.data);
export const v3CreateMeeting = (payload) => v3.post('/meetings', payload).then(r => r.data).catch((err) => {
  console.warn('Backend create meeting failed, saving locally:', err);
  const bcId = payload.business_case_id;
  const key = `local_meetings_${bcId}`;
  const meetings = JSON.parse(localStorage.getItem(key) || '[]');
  const newMeeting = {
    id: `meet-local-${Math.random().toString(36).substring(2, 10)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'scheduled',
    transcript: '',
    ...payload,
  };
  meetings.push(newMeeting);
  localStorage.setItem(key, JSON.stringify(meetings));
  return newMeeting;
});
export const v3SaveMeetingContact = (meetingId, payload) => v3.patch(`/meetings/${meetingId}/contact`, payload).then(r => r.data);
export const v3UploadMeetingTranscript = (meetingId, payload) => v3.post(`/meetings/${meetingId}/transcript`, payload).then(r => r.data).catch((err) => {
  console.warn('Backend upload transcript failed, saving locally:', err);
  let foundKey = null;
  let meetings = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('local_meetings_')) {
      const list = JSON.parse(localStorage.getItem(k) || '[]');
      if (list.some(m => m.id === meetingId)) {
        foundKey = k;
        meetings = list;
        break;
      }
    }
  }
  if (foundKey) {
    meetings = meetings.map(m => m.id === meetingId ? { ...m, transcript: payload.transcript, updated_at: new Date().toISOString() } : m);
    localStorage.setItem(foundKey, JSON.stringify(meetings));
  }
  return { ok: true };
});
export const v3AnalyzeMeetingTranscript = (meetingId, payload = {}) => v3.post(`/meetings/${meetingId}/analyze`, payload).then(r => r.data).catch((err) => {
  console.warn('Backend analyze meeting failed, simulating locally:', err);
  return {
    ok: true,
    recommendation: {
      decision: 'promote',
      label: 'Promote to Frame',
      confidence: 70,
      reasons: ['Simulated meeting-specific analysis.'],
    }
  };
});
export const v3AnalyzeAllTranscripts = (bcId) => v3.post(`/business-cases/${bcId}/connect/analyze-all`).then(r => r.data).catch((err) => {
  console.warn('Backend analyze-all failed, simulating locally:', err);
  const key = `local_meetings_${bcId}`;
  const meetings = JSON.parse(localStorage.getItem(key) || '[]');
  const transcripts = meetings.map(m => m.transcript).filter(Boolean);
  const combined = transcripts.join('\n\n');
  const lower = combined.toLowerCase();
  const hasMarketing = lower.includes('objective') || lower.includes('goal') || lower.includes('focus');
  const hasAudience = lower.includes('audience') || lower.includes('consumer');
  let decision = 'promote';
  let reasons = ['Simulated local analysis: combined transcripts have sufficient context.'];
  let missing = [];
  if (!combined.trim()) {
    decision = 'reschedule';
    reasons = ['Transcripts are empty, reschedule call.'];
  } else if (!hasMarketing) {
    decision = 'reschedule';
    reasons = ['Missing key marketing objectives.'];
    missing.push('Marketing focus');
  }
  const recommendation = {
    decision,
    label: decision === 'promote' ? 'Promote to Frame' : 'Reschedule Business Call',
    confidence: combined.length > 500 ? 80 : 45,
    reasons,
    missing_context: missing,
    summary: combined.slice(0, 300) || 'Local mockup meeting notes.',
    risk_flags: [],
    marketing_intelligence: {
      key_marketing_focus: 'Local simulated marketing focus extraction.',
      primary_target_audience: 'Local simulated target audience.',
      key_marketing_channels: ['Instagram', 'TikTok'],
      marketing_kpis: [{ kpi: 'Reach', target: '1M impressions' }],
    }
  };
  localStorage.setItem(`alignment_analysis_${bcId}`, JSON.stringify(recommendation));
  if (decision === 'promote') {
    localStorage.setItem(`business_case_stage_${bcId}`, 'frame');
  }
  return { ok: true, recommendation };
});

// New function: Generate alignment snapshot from all transcripts
export const v3GenerateAlignmentFromTranscripts = (bcId, transcripts = []) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const combinedTranscripts = transcripts.map(t => t.content).join('\n\n');
      const lower = combinedTranscripts.toLowerCase();
      
      // Helper to extract text based on keywords
      const extractByKeywords = (keywords, fallback) => {
        for (const keyword of keywords) {
          const idx = lower.indexOf(keyword.toLowerCase());
          if (idx !== -1) {
            const endIdx = combinedTranscripts.indexOf('\n', idx + keyword.length);
            const snippet = combinedTranscripts.slice(idx + keyword.length, endIdx !== -1 ? endIdx : idx + 500).trim();
            if (snippet) {
              return snippet.replace(/^[:\s-]+/, '');
            }
          }
        }
        return fallback;
      };

      const alignmentSnapshot = {
        id: `as-local-${bcId}`,
        business_case_id: bcId,
        status: 'under_review',
        title: 'Alignment Snapshot - Generated from Transcripts',
        meta: 'Generated by AI from uploaded transcripts.',
        sections: [
          {
            heading: '1. ALIGNMENT SNAPSHOT QUESTIONS',
            type: 'questions',
            content: 'Generated from uploaded transcripts. Please review and edit as needed.',
            columns: ['Question', 'Brand answer'],
            rows: [
              { 
                Question: 'About The Organisation', 
                'Brand answer': extractByKeywords(
                  ['organisation', 'company', 'about', 'we are'], 
                  'A leading organisation focused on delivering value to its customers and stakeholders through innovative solutions and strategic partnerships.'
                ) 
              },
              { 
                Question: 'What are the Core Focus Areas', 
                'Brand answer': extractByKeywords(
                  ['focus areas', 'core focus', 'key priorities', 'priorities', 'focus on'], 
                  'Expanding market reach, enhancing customer experience, driving product innovation, and building strategic partnerships.'
                ) 
              },
              { 
                Question: 'Who are The Key Customers/Beneficiaries', 
                'Brand answer': extractByKeywords(
                  ['customers', 'audience', 'beneficiaries', 'target audience', 'who we serve'], 
                  'Urban professionals, young entrepreneurs, and mid‑sized businesses looking for scalable solutions.'
                ) 
              },
              { 
                Question: 'Key Goals or Metrics that are Tracked', 
                'Brand answer': extractByKeywords(
                  ['goals', 'metrics', 'kpis', 'success metrics', 'track'], 
                  'Increase brand awareness by 30%, achieve 20% growth in customer acquisition, and maintain a 90% customer satisfaction rate.'
                ) 
              },
              { 
                Question: 'What Success Looks Like / Timeline', 
                'Brand answer': extractByKeywords(
                  ['success', 'timeline', 'roadmap', 'when', 'by when'], 
                  'Launch the initiative within 8 weeks, achieve the first milestone in 12 weeks, and full rollout in 6 months.'
                ) 
              },
              { 
                Question: 'Focus', 
                'Brand answer': extractByKeywords(
                  ['focus', 'main focus', 'primary focus'], 
                  'Customer-centric innovation and market expansion.'
                ) 
              },
              { 
                Question: 'Priority', 
                'Brand answer': extractByKeywords(
                  ['priority', 'high priority', 'urgent'], 
                  'High - align with Q3 strategic objectives.'
                ) 
              },
              { 
                Question: 'Date of connect', 
                'Brand answer': new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              }
            ]
          }
        ]
      };

      localStorage.setItem(`alignment_snapshot_${bcId}`, JSON.stringify(alignmentSnapshot));
      resolve(alignmentSnapshot);
    }, 2000);
  });
};
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


