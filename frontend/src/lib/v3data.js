// TASCK v3 — Complete Seed Data
// All content for the 3 flagship projects is verbatim from the TASCK PRD seed spec.

export const v3Brands = [
  {
    id: 'brand-cocacola',
    company: 'Coca-Cola Nigeria Limited',
    industry: 'FMCG — Beverages',
    website: 'coca-colacompany.com/ng',
    hq: 'Iddo House, Iddo, Lagos',
    primaryContact: 'Folake Adeniran',
    role: 'Head of Marketing, West Africa',
    email: 'folake.adeniran@coca-cola.com',
    phone: '+234 803 XXX 4417',
    decisionMakers: [
      { name: 'Folake Adeniran', role: 'Head of Marketing, West Africa', note: 'day-to-day lead' },
      { name: 'Chidi Okafor', role: 'Franchise Manager, Nigeria', note: 'budget approver' },
      { name: 'Ngozi Eze-Williams', role: 'Brand Director, Sparkling Beverages', note: 'creative sign-off' },
    ],
    status: 'Active',
    leadScore: 91,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (FMCG consistently commissions creator campaigns)' },
      { factor: 'Company size', detail: 'Tier 1 (multinational, established brief authority)' },
      { factor: 'Responsiveness', detail: 'High (replies within 24 hours on 4/4 contacts)' },
      { factor: 'Tone', detail: 'Commercial, prepared (asks about deliverables, timelines, attribution)' },
      { factor: 'Decision seniority', detail: 'Head of Marketing direct — not a junior intermediary' },
    ],
    lastInteraction: '12 days ago',
    rmId: 'rm-temi',
  },
  {
    id: 'brand-guinness',
    company: 'Guinness Nigeria PLC',
    industry: 'FMCG — Beverages (Alcohol)',
    website: 'guinness-nigeria.com',
    hq: '24 Oba Akran Avenue, Ikeja, Lagos',
    primaryContact: 'Tunde Adeola',
    role: 'Marketing Director',
    email: 'tunde.adeola@diageo.com',
    phone: '+234 802 XXX 1135',
    decisionMakers: [
      { name: 'Tunde Adeola', role: 'Marketing Director', note: 'lead' },
      { name: 'Ebele Nwachukwu', role: 'Senior Brand Manager, Guinness Nigeria', note: '' },
      { name: 'Sophia Karimi', role: 'Regional CMO, Diageo Africa (Nairobi)', note: 'final sign-off on large campaigns' },
    ],
    status: 'Active — in active project',
    leadScore: 88,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (alcohol brands invest heavily in cultural IP)' },
      { factor: 'Company size', detail: 'Tier 1 (Diageo subsidiary, largest Guinness market outside UK)' },
      { factor: 'Responsiveness', detail: 'Good (1–2 day turnaround)' },
      { factor: 'Budget authority', detail: 'Clear — Tunde leads, Sophia approves above ₦100M' },
      { factor: 'Strategic clarity', detail: 'Strong brief — repositioning objective well-articulated' },
    ],
    lastInteraction: '3 days ago',
    rmId: 'rm-adaeze',
  },
  {
    id: 'brand-mtn',
    company: 'MTN Nigeria Communications PLC',
    industry: 'Telecommunications',
    website: 'mtn.ng',
    hq: 'Golden Plaza, Falomo, Ikoyi, Lagos',
    primaryContact: 'Kemi Adebayo',
    role: 'General Manager, Brand & Communications',
    email: 'kemi.adebayo@mtn.com',
    phone: '+234 802 XXX 8891',
    decisionMakers: [
      { name: 'Kemi Adebayo', role: 'GM Brand & Comms', note: 'lead' },
      { name: 'Olu Akanbi', role: 'CMO', note: 'signed Strategy Snapshot' },
      { name: 'Uche Ibekwe', role: 'Sponsorships Manager', note: 'day-to-day' },
    ],
    status: 'Active — in final stages of delivery',
    leadScore: 85,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (telcos are top cultural sponsors in Nigeria)' },
      { factor: 'Company size', detail: 'Tier 1 (80M+ subscribers, largest telco)' },
      { factor: 'Prior relationship', detail: 'Repeat client — Lagos Unlimited is second TASCK project' },
      { factor: 'Payment reliability', detail: 'Excellent — all invoices settled within 21-day terms' },
      { factor: 'Brief quality', detail: 'Very good — clear KPIs, firm timelines' },
    ],
    lastInteraction: '1 day ago',
    rmId: 'rm-tope',
  },
  {
    id: 'brand-access',
    company: 'Access Bank PLC',
    industry: 'Banking & Financial Services',
    website: 'accessbankplc.com',
    hq: '999c Danmole Street, Victoria Island, Lagos',
    primaryContact: 'Obi Nwosu',
    role: 'Group Head, Brand Management',
    email: 'obi.nwosu@accessbankplc.com',
    phone: '+234 801 XXX 2247',
    decisionMakers: [
      { name: 'Obi Nwosu', role: 'Group Head, Brand Management', note: 'lead' },
      { name: 'Amaka Obi-Eze', role: 'Head of Marketing', note: 'budget' },
    ],
    status: 'Active — in active project',
    leadScore: 78,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Good (banks are increasing cultural spend, but risk-averse)' },
      { factor: 'Budget authority', detail: 'Clear — Obi leads, Amaka approves' },
      { factor: 'Responsiveness', detail: 'Moderate (2–3 day turnaround)' },
      { factor: 'Brief quality', detail: 'Structured — want measurable ROI, less cultural risk' },
      { factor: 'Decision seniority', detail: 'Group Head direct — solid authority' },
    ],
    lastInteraction: '5 days ago',
    rmId: 'rm-femi',
  },
  {
    id: 'brand-star',
    company: 'Nigerian Breweries PLC (Star Lager)',
    industry: 'FMCG — Beverages (Alcohol)',
    website: 'star.com.ng',
    hq: 'Iganmu House, Abebe Village Road, Lagos',
    primaryContact: 'Funke Adebiyi',
    role: 'Brand Manager, Star Lager',
    email: 'funke.adebiyi@heineken.com',
    phone: '+234 803 XXX 7756',
    decisionMakers: [
      { name: 'Funke Adebiyi', role: 'Brand Manager, Star Lager', note: 'lead' },
      { name: 'Kola Ogunleye', role: 'Marketing Director, Nigerian Breweries', note: 'approver' },
    ],
    status: 'Active — in delivery',
    leadScore: 82,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (beer brands lead music/nightlife cultural spend)' },
      { factor: 'Company size', detail: 'Tier 1 (Heineken subsidiary)' },
      { factor: 'Responsiveness', detail: 'Good (24–48 hour turnaround)' },
      { factor: 'Brief quality', detail: 'Good — clear nightlife/music focus' },
      { factor: 'Prior agency experience', detail: 'Positive — has worked with creator agencies before' },
    ],
    lastInteraction: '2 days ago',
    rmId: 'rm-adaeze',
  },
  {
    id: 'brand-pepsi',
    company: 'Seven-Up Bottling Company PLC (Pepsi Nigeria)',
    industry: 'FMCG — Beverages',
    website: 'seabordn.com',
    hq: '247 Moshood Abiola Way, Ijora, Lagos',
    primaryContact: 'Tolu Bakare',
    role: 'Senior Brand Manager',
    email: 'tolu.bakare@sbc.com.ng',
    phone: '+234 805 XXX 3398',
    decisionMakers: [
      { name: 'Tolu Bakare', role: 'Senior Brand Manager', note: 'lead' },
      { name: 'Emeka Nnadi', role: 'Head of Marketing', note: 'approver' },
    ],
    status: 'Active — in frame',
    leadScore: 72,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (direct Coca-Cola competitor, hungry for creator space)' },
      { factor: 'Responsiveness', detail: 'Moderate (some delays in early stages)' },
      { factor: 'Budget authority', detail: 'Clear but smaller — Tolu leads within a tighter ceiling' },
      { factor: 'Competitive pressure', detail: 'High — wants to counter Coca-Cola\'s creator campaigns' },
      { factor: 'Brief quality', detail: 'Developing — still refining goals' },
    ],
    lastInteraction: '8 days ago',
    rmId: 'rm-temi',
  },
  {
    id: 'brand-uba',
    company: 'United Bank for Africa PLC',
    industry: 'Banking & Financial Services',
    website: 'ubagroup.com',
    hq: '57 Marina, Lagos Island',
    primaryContact: 'Chidinma Okonkwo',
    role: 'Brand & Sponsorships Manager',
    email: 'chidinma.okonkwo@ubagroup.com',
    phone: '+234 806 XXX 1120',
    decisionMakers: [
      { name: 'Chidinma Okonkwo', role: 'Brand & Sponsorships Manager', note: 'lead' },
      { name: 'Bola Atta', role: 'Group Head, Marketing & Corporate Communications', note: 'approver' },
    ],
    status: 'Active — in frame',
    leadScore: 68,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Moderate (banks can be cautious with creator partnerships)' },
      { factor: 'Responsiveness', detail: 'Good (fast replies from Chidinma)' },
      { factor: 'Budget authority', detail: 'Moderate — Bola is the gatekeeper' },
      { factor: 'Cultural ambition', detail: 'Growing — UBA wants more youth-cultural presence' },
      { factor: 'Decision seniority', detail: 'Mid-level lead — may slow approvals' },
    ],
    lastInteraction: '6 days ago',
    rmId: 'rm-femi',
  },
  {
    id: 'brand-dangote',
    company: 'Dangote Industries Limited',
    industry: 'Energy & Industrials',
    website: 'dangote.com',
    hq: 'Union Marble House, 1 Alfred Rewane Road, Ikoyi, Lagos',
    primaryContact: 'Anthony Chiejina',
    role: 'Group Chief Communications Officer',
    email: 'anthony.chiejina@dangote.com',
    phone: '+234 802 XXX 5580',
    decisionMakers: [
      { name: 'Anthony Chiejina', role: 'Group Chief Communications Officer', note: 'lead' },
      { name: 'Aliko Dangote', role: 'Chairman/CEO', note: 'ultimate sign-off on flagship brand campaigns' },
    ],
    status: 'Lead — initial conversations',
    leadScore: 65,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Unusual (Dangote is industrial, not consumer — but refinery launch changes this)' },
      { factor: 'Company size', detail: 'Tier 1 (Africa\'s largest industrial conglomerate)' },
      { factor: 'Responsiveness', detail: 'Slow (2 contacts, 1 response)' },
      { factor: 'Budget potential', detail: 'Very high (₦200M+ campaign possible)' },
      { factor: 'Decision seniority', detail: 'GCCO direct — but Chairman involvement adds complexity' },
    ],
    lastInteraction: '18 days ago',
    rmId: 'rm-temi',
  },
  {
    id: 'brand-airtel',
    company: 'Airtel Nigeria',
    industry: 'Telecommunications',
    website: 'airtel.com.ng',
    hq: 'Banana Island, Ikoyi, Lagos',
    primaryContact: 'Adaeze Ikenna',
    role: 'Head of Brand Strategy',
    email: 'adaeze.ikenna@airtel.com',
    phone: '+234 802 XXX 4412',
    decisionMakers: [
      { name: 'Adaeze Ikenna', role: 'Head of Brand Strategy', note: 'lead' },
      { name: 'Dinesh Balsingh', role: 'CMO', note: 'approver' },
    ],
    status: 'Active — in active project',
    leadScore: 76,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (telco cultural spend is competitive)' },
      { factor: 'Responsiveness', detail: 'Good (Adaeze is responsive, Dinesh slower)' },
      { factor: 'Competitive pressure', detail: 'High — wants to outdo MTN\'s creator campaigns' },
      { factor: 'Budget authority', detail: 'Clear — Adaeze scopes, Dinesh signs' },
      { factor: 'Brief quality', detail: 'Good — specific about audience segments' },
    ],
    lastInteraction: '4 days ago',
    rmId: 'rm-adaeze',
  },
  {
    id: 'brand-gtbank',
    company: 'Guaranty Trust Holding Company',
    industry: 'Banking & Financial Services',
    website: 'gtbank.com',
    hq: '635 Akin Adesola Street, Victoria Island, Lagos',
    primaryContact: 'Segun Ogunsanya',
    role: 'Head of Marketing & Customer Experience',
    email: 'segun.ogunsanya@gtbank.com',
    phone: '+234 803 XXX 9914',
    decisionMakers: [
      { name: 'Segun Ogunsanya', role: 'Head of Marketing & CX', note: 'lead' },
      { name: 'Miriam Olusanya', role: 'MD/CEO', note: 'approver for flagship campaigns' },
    ],
    status: 'Lead — initial conversations',
    leadScore: 70,
    leadScoreFactors: [
      { factor: 'Sector fit', detail: 'Strong (GTBank has pioneered cultural banking — Fashion Weekend, Food & Drink Festival)' },
      { factor: 'Company size', detail: 'Tier 1 (leading retail bank)' },
      { factor: 'Prior cultural track record', detail: 'Excellent — GTBank Food & Drink, Fashion Weekend are cultural properties' },
      { factor: 'Responsiveness', detail: 'Moderate (Segun engaged, approvals can take time)' },
      { factor: 'Multi-creator interest', detail: 'Wants a multi-creator approach — adds complexity' },
    ],
    lastInteraction: '10 days ago',
    rmId: 'rm-femi',
  },
];

export const v3Creators = [
  { id: 'creator-tems', name: 'Tems', tier: 'super', genre: 'Afrobeats/R&B', location: 'Lagos', fitScore: 94, onTimeRate: 96, brandSatisfaction: 9.2, repeatBrandCount: 3, rateCard: '₦60M–₦90M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram'], bio: 'Grammy-winning artist known for genre-blending R&B and Afrobeats. Strong female audience, global reach with deep Nigerian roots.', reliability: 8.8 },
  { id: 'creator-rema', name: 'Rema', tier: 'super', genre: 'Afrobeats/Afrorave', location: 'Lagos', fitScore: 93, onTimeRate: 92, brandSatisfaction: 8.4, repeatBrandCount: 2, rateCard: '₦75M–₦100M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram', 'TikTok'], bio: 'Pioneered the "Afrorave" sound. Visual direction on Ravage and Heis demonstrates documentary-adjacent aesthetic. Pan-African streaming audience.', reliability: 8.4 },
  { id: 'creator-burna', name: 'Burna Boy', tier: 'super', genre: 'Afrobeats/Afrofusion', location: 'Lagos', fitScore: 96, onTimeRate: 100, brandSatisfaction: 9.8, repeatBrandCount: 4, rateCard: '₦80M–₦120M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram'], bio: 'Africa\'s biggest global music export. Lagos-rooted, culturally dominant. Prior MTN relationship. Concert and film capability proven.', reliability: 9.4 },
  { id: 'creator-davido', name: 'Davido', tier: 'super', genre: 'Afrobeats/Pop', location: 'Lagos/Atlanta', fitScore: 85, onTimeRate: 88, brandSatisfaction: 8.6, repeatBrandCount: 3, rateCard: '₦70M–₦100M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram', 'TikTok'], bio: 'Global Afrobeats icon with massive social following. Strong brand partnership history. Dual Lagos-Atlanta presence.', reliability: 8.2 },
  { id: 'creator-ayra', name: 'Ayra Starr', tier: 'super', genre: 'Afrobeats/Pop', location: 'Lagos', fitScore: 88, onTimeRate: 94, brandSatisfaction: 8.8, repeatBrandCount: 1, rateCard: '₦40M–₦65M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram', 'TikTok'], bio: 'Mavin Records breakout star. Strong Gen-Z female audience. Nightlife and fashion crossover appeal.', reliability: 8.5 },
  { id: 'creator-fireboy', name: 'Fireboy DML', tier: 'super', genre: 'Afrobeats/R&B', location: 'Lagos', fitScore: 82, onTimeRate: 90, brandSatisfaction: 8.2, repeatBrandCount: 2, rateCard: '₦30M–₦50M', platforms: ['Spotify', 'Apple Music', 'YouTube'], bio: 'Melodic Afrobeats artist with strong lyrical depth. Urban SEC A/B audience. Prior brand work with Pepsi.', reliability: 8.0 },
  { id: 'creator-gold', name: 'Adekunle Gold', tier: 'super', genre: 'Afropop/Highlife', location: 'Lagos', fitScore: 79, onTimeRate: 95, brandSatisfaction: 9.0, repeatBrandCount: 2, rateCard: '₦25M–₦45M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram'], bio: 'Nigerian Afropop artist bridging traditional highlife with modern production. Known for reliability and brand-safe image.', reliability: 9.0 },
  { id: 'creator-donjazzy', name: 'Don Jazzy', tier: 'super', genre: 'Producer/Label Boss', location: 'Lagos', fitScore: 86, onTimeRate: 98, brandSatisfaction: 9.4, repeatBrandCount: 5, rateCard: '₦50M–₦80M (with Mavin artists)', platforms: ['Instagram', 'Twitter', 'YouTube'], bio: 'Mavin Records founder. Nigeria\'s most influential music executive. Massive social following. Can mobilize multiple Mavin artists.', reliability: 9.5 },
  { id: 'creator-wizkid', name: 'Wizkid', tier: 'super', genre: 'Afrobeats', location: 'Lagos/London', fitScore: 90, onTimeRate: 78, brandSatisfaction: 7.8, repeatBrandCount: 2, rateCard: '₦90M–₦130M', platforms: ['Spotify', 'Apple Music', 'YouTube', 'Instagram'], bio: 'Global superstar. Dual Lagos-London presence. Massive reach but selective about brand partnerships. Requires careful creative control negotiation.', reliability: 7.2 },
  { id: 'creator-boyspyce', name: 'Boy Spyce', tier: 'rising', genre: 'Afrobeats/Gen-Z', location: 'Lagos', fitScore: 74, onTimeRate: 92, brandSatisfaction: 8.0, repeatBrandCount: 0, rateCard: '₦8M–₦15M', platforms: ['TikTok', 'Instagram', 'Spotify'], bio: 'Rising Gen-Z voice in Afrobeats. Strong TikTok engagement. First brand partnership opportunity — high potential, lower risk.', reliability: 7.8 },
];

export const v3RMs = [
  { id: 'rm-temi', name: 'Temi Bakare', role: 'Relationship Manager', initials: 'TB', email: 'temi.bakare@tasck.com' },
  { id: 'rm-adaeze', name: 'Adaeze Obi', role: 'Relationship Manager', initials: 'AO', email: 'adaeze.obi@tasck.com' },
  { id: 'rm-tope', name: 'Tope Martins', role: 'Relationship Manager', initials: 'TM', email: 'tope.martins@tasck.com' },
  { id: 'rm-femi', name: 'Femi Oladipo', role: 'Relationship Manager', initials: 'FO', email: 'femi.oladipo@tasck.com' },
];

export const v3Projects = [
  // ===== PROJECT 1: Coca-Cola x Tems — FRAME =====
  {
    id: 'proj-cocacola-tems',
    brandId: 'brand-cocacola',
    creatorId: 'creator-tems',
    title: 'Share a Coke, Share a Story',
    stage: 'frame',
    engagement: 'retainer',
    estimatedValue: 120000000,
    rmId: 'rm-temi',
    createdAt: '2026-02-28',
    daysInStage: 14,
    nextAction: 'Awaiting brand confirmation of Alignment Snapshot',
    health: 'on-track',
  },
  // ===== PROJECT 2: Guinness x Rema — PLAN =====
  {
    id: 'proj-guinness-rema',
    brandId: 'brand-guinness',
    creatorId: 'creator-rema',
    title: 'Made of More: Africa',
    stage: 'plan',
    engagement: 'retainer',
    estimatedValue: 180000000,
    rmId: 'rm-adaeze',
    createdAt: '2026-02-01',
    daysInStage: 10,
    nextAction: 'Strategy Snapshot v1 under internal review',
    health: 'on-track',
  },
  // ===== PROJECT 3: MTN x Burna Boy — DELIVER =====
  {
    id: 'proj-mtn-burna',
    brandId: 'brand-mtn',
    creatorId: 'creator-burna',
    title: 'Lagos Unlimited',
    stage: 'deliver',
    engagement: 'direct',
    estimatedValue: 150000000,
    rmId: 'rm-tope',
    createdAt: '2025-10-15',
    daysInStage: 45,
    nextAction: 'Awaiting brand + creator feedback forms for closure',
    health: 'near-closure',
  },
  // ===== PROJECT 4: Access Bank x Davido — PLAN =====
  {
    id: 'proj-access-davido',
    brandId: 'brand-access',
    creatorId: 'creator-davido',
    title: 'Financial Futures',
    stage: 'plan',
    engagement: 'retainer',
    estimatedValue: 95000000,
    rmId: 'rm-femi',
    createdAt: '2026-02-10',
    daysInStage: 7,
    nextAction: 'Creator brief sent — awaiting Davido response',
    health: 'on-track',
  },
  // ===== PROJECT 5: Star Lager x Ayra Starr — DELIVER =====
  {
    id: 'proj-star-ayra',
    brandId: 'brand-star',
    creatorId: 'creator-ayra',
    title: 'Star Nights Tour',
    stage: 'deliver',
    engagement: 'retainer',
    estimatedValue: 110000000,
    rmId: 'rm-adaeze',
    createdAt: '2025-12-01',
    daysInStage: 30,
    nextAction: '3 of 8 milestones complete, next deliverable due Mar 20',
    health: 'on-track',
  },
  // ===== PROJECT 6: Pepsi x Fireboy — FRAME =====
  {
    id: 'proj-pepsi-fireboy',
    brandId: 'brand-pepsi',
    creatorId: 'creator-fireboy',
    title: 'Afrobeats Rising',
    stage: 'frame',
    engagement: 'direct',
    estimatedValue: 65000000,
    rmId: 'rm-temi',
    createdAt: '2026-03-05',
    daysInStage: 9,
    nextAction: 'Alignment Snapshot in draft — RM review pending',
    health: 'on-track',
  },
  // ===== PROJECT 7: UBA x Adekunle Gold — FRAME =====
  {
    id: 'proj-uba-gold',
    brandId: 'brand-uba',
    creatorId: 'creator-gold',
    title: 'Wedding Season',
    stage: 'frame',
    engagement: 'retainer',
    estimatedValue: 50000000,
    rmId: 'rm-femi',
    createdAt: '2026-03-01',
    daysInStage: 12,
    nextAction: 'Alignment Snapshot generated — awaiting brand confirmation',
    health: 'on-track',
  },
  // ===== PROJECT 8: Dangote x Wizkid — CONNECT =====
  {
    id: 'proj-dangote-wizkid',
    brandId: 'brand-dangote',
    creatorId: 'creator-wizkid',
    title: 'Empire Builders',
    stage: 'connect',
    engagement: 'retainer',
    estimatedValue: 200000000,
    rmId: 'rm-temi',
    createdAt: '2026-03-10',
    daysInStage: 4,
    nextAction: 'Discovery call scheduled Mar 20',
    health: 'new',
  },
  // ===== PROJECT 9: Airtel x Don Jazzy/Mavin — PLAN =====
  {
    id: 'proj-airtel-donjazzy',
    brandId: 'brand-airtel',
    creatorId: 'creator-donjazzy',
    title: 'Unlimited',
    stage: 'plan',
    engagement: 'direct',
    estimatedValue: 140000000,
    rmId: 'rm-adaeze',
    createdAt: '2026-02-15',
    daysInStage: 8,
    nextAction: 'Creator matched — brief being drafted',
    health: 'on-track',
  },
  // ===== PROJECT 10: GTBank x multi-creator — CONNECT =====
  {
    id: 'proj-gtbank-multi',
    brandId: 'brand-gtbank',
    creatorId: null,
    title: 'Fashion Week Access',
    stage: 'connect',
    engagement: 'direct',
    estimatedValue: 85000000,
    rmId: 'rm-femi',
    createdAt: '2026-03-08',
    daysInStage: 6,
    nextAction: 'Follow-up email drafted — awaiting RM send',
    health: 'on-track',
  },
];

// Coca-Cola interaction log
export const v3Interactions = {
  'brand-cocacola': [
    {
      id: 'int-cc-1',
      type: 'email',
      title: 'Outreach Email',
      author: 'Temi Bakare',
      date: '42 days ago',
      dateISO: '2026-02-03',
      content: `Subject: TASCK × Coca-Cola — Creator-led campaign for Q4\n\nHi Folake,\n\nFollowing our brief exchange at the MMA Awards last month — I wanted to properly introduce TASCK. We're a creator campaign engine built specifically for the African market. We've run campaigns for Guinness, MTN, and Access Bank this year, partnering with creators like Rema, Burna Boy, and Davido on branded work that actually performs.\n\nI noticed Coca-Cola's "Real Magic" platform is running globally — curious whether the Nigeria franchise has room to explore a local creator extension, particularly heading into Detty December. Would love 20 minutes to walk you through a few ideas.\n\n— Temi`,
    },
    {
      id: 'int-cc-2',
      type: 'email',
      title: 'Reply from Folake',
      author: 'Folake Adeniran',
      date: '41 days ago',
      dateISO: '2026-02-04',
      content: `Hi Temi,\n\nGreat meeting you at MMA. Yes — we are actively looking at Q4 and have a brief coming together for a "Share a Coke" activation. Let's schedule. My EA will send times.`,
    },
    {
      id: 'int-cc-3',
      type: 'call_transcript',
      title: 'Discovery Call Notes',
      author: 'Temi Bakare',
      date: '35 days ago',
      dateISO: '2026-02-10',
      content: `45 min call, Folake + Chidi on the line.\n\n— "Share a Coke" returning for 2026, but the Nigeria team wants to move beyond personalised bottles. Want a cultural layer.\n— Target audience: 18–28, SEC A/B, urban Nigeria (Lagos, Abuja, Port Harcourt primarily; Ibadan + Enugu secondary).\n— Budget indication: "north of ₦100M total, less than ₦150M" — Chidi said this, not fully committed.\n— Timeline: campaign must be in-market by Dec 1, 2026. That means concept locked by end of Oct.\n— Creative brief is "not yet written" — they want our input, not a fait-accompli pitch.\n— Folake named Tems, Ayra Starr, and Rema as "interesting" creators. Did not commit to anyone. Wanted to hear who we'd recommend and why.\n— KPIs mentioned: "we want people to feel the campaign, not just see it." Reach matters but shareability/earned media matters more.\n— Concerned about creator reliability — had a prior bad experience with an unnamed "influencer agency" on a 2024 campaign. Deliverables slipped, no accountability.\n\nNext step: I send a short POV document + discuss engagement model.`,
    },
    {
      id: 'int-cc-4',
      type: 'file',
      title: 'Follow-up Email + POV Document',
      author: 'Temi Bakare',
      date: '28 days ago',
      dateISO: '2026-02-17',
      content: `Shared a 4-page POV titled "From Personalised Bottles to Personalised Stories — A Creator Layer for Share a Coke 2026." Proposed a Retainer engagement because of the strategic work required pre-concept.\n\nAttached: POV_Coca-Cola_SAC_2026_v1.pdf`,
    },
    {
      id: 'int-cc-5',
      type: 'call_transcript',
      title: 'Scope Confirmation Call Transcript',
      author: 'Temi Bakare',
      date: '14 days ago',
      dateISO: '2026-03-03',
      content: `30 min call. Folake + Ngozi (first time meeting Ngozi).\n\nNgozi: "We read the POV. The direction is interesting. What I want to understand is — who leads the creative? Because on past campaigns, we've felt pushed into the creator's world rather than extending our brand into theirs."\n\nTemi: "Good question. In our model, the creator is a campaign architect, but they're responding to your brief. You lead the strategic intent. They lead the cultural translation. We facilitate — so it feels like a genuine collaboration, not a takeover."\n\nNgozi: "OK. Good. We have the 'Share a Coke' framework — personalised names, moments, memory. The question is how one creator makes that feel Nigerian at this moment in time, not five years ago."\n\nFolake: "Budget approval process — Chidi needs to sign off once we have a scoped document. What's your turnaround on a proper scoped proposal?"\n\nTemi: "If we move into a project next week, you'd have an Alignment Snapshot within 5 business days, then a full Creative Snapshot with the matched creator within 10–14 days after that."\n\nNgozi: "And if we don't like the first creator match?"\n\nTemi: "We iterate on the brief, not the process. We can re-match once at no extra cost. Beyond that, we'd treat it as a new brief."\n\nFolake: "Let's proceed. Send the Retainer paperwork."`,
    },
  ],
};

// Alignment Snapshots (full content)
export const v3AlignmentSnapshots = {
  'proj-cocacola-tems': {
    status: 'under_review',
    generatedAt: '2026-03-10',
    approvedBy: null,
    brandHeader: 'COCA-COLA × TASCK',
    title: '"Share a Coke, Share a Story" — Alignment Snapshot',
    meta: 'Prepared by Temi Bakare, RM | Pending brand confirmation | 10 March 2026',
    sections: [
      {
        heading: 'Brand background',
        type: 'prose',
        content: `Coca-Cola Nigeria operates within the broader Coca-Cola West Africa franchise, reporting into the Johannesburg regional office. The "Share a Coke" platform — originally launched globally in 2011 — is returning in Q4 2026 as a headline activation in Nigeria, with the local team seeking cultural specificity beyond the personalised-name mechanic that defined earlier executions.\n\nThe Nigerian marketing function is led by Folake Adeniran (Head of Marketing, West Africa), with budget authority resting with Chidi Okafor (Franchise Manager, Nigeria) and creative sign-off sitting with Ngozi Eze-Williams (Brand Director, Sparkling Beverages). All three have been engaged in the conversation to date, which de-risks post-snapshot political friction.\n\nA prior 2024 creator campaign — run outside TASCK with an unnamed agency — left the team with concerns about creator reliability and deliverable accountability. This informs their preference for a structured, milestone-driven engagement.`,
      },
      {
        heading: 'Stated goals',
        type: 'bullets',
        items: [
          'Launch "Share a Coke" 2026 in Nigeria with a distinctive creator-led layer that differentiates the Nigerian activation from global templates',
          'Drive emotional shareability over pure reach — "we want people to feel the campaign, not just see it" (Ngozi, 14 March call)',
          'Position Coca-Cola as culturally current among 18–28-year-old urban Nigerians, particularly against growing competition from Pepsi and local alternatives',
          'Generate earned media and UGC that extends paid spend',
        ],
      },
      {
        heading: 'Implied KPIs',
        type: 'kpis',
        flagged: true,
        items: [
          { kpi: 'Reach', target: 'Estimated 8–12M unique impressions across paid + earned, based on comparable 2024 campaigns by TASCK for Guinness.', flagNote: 'Requires brand confirmation.' },
          { kpi: 'Engagement rate', target: 'Target of 6–8% on creator-produced content (above category benchmark of 4.2%).', flagNote: 'Requires brand confirmation.' },
          { kpi: 'UGC volume', target: 'Brand mentioned wanting "shareability" but no target volume stated. Suggest: 5,000+ user-generated posts using campaign hashtag.', flagNote: 'AI-inferred target.' },
          { kpi: 'Sentiment lift', target: 'Pre-post brand health tracking via internal Coca-Cola research function (Kantar partnership).', flagNote: 'Standard for Coca-Cola briefs; confirm inclusion.' },
          { kpi: 'Earned media value', target: 'No figure discussed. Suggest target of ₦250M EMV minimum given creator-led format.', flagNote: 'AI-inferred target.' },
        ],
      },
      {
        heading: 'Key challenges',
        type: 'numbered',
        items: [
          'Cultural specificity without cultural tokenism. The brand wants Nigerian-rooted creative, not generic Afro-aesthetic wallpaper. The matched creator must have real authority in their cultural context — not just availability.',
          'Timing pressure. In-market by Dec 1. That leaves approximately 7 weeks from Plan stage start to live launch. Tight but achievable if creator is matched by end of week 1 of Plan.',
          'Creator reliability concerns. The 2024 campaign experience has made the team wary. The Strategy Snapshot must be explicit on milestone commitments, deliverable formats, and consequence structures.',
          'Multi-stakeholder sign-off. Folake, Chidi, and Ngozi each bring different lenses (marketing, commercial, creative). The Strategy Snapshot should anticipate and pre-empt each.',
        ],
      },
      {
        heading: 'Proposed campaign direction',
        type: 'prose',
        content: `A single-creator, multi-chapter storytelling campaign built around the "Share a Coke, Share a Story" framing. The creator does not appear in the campaign as an endorser — they author the campaign, telling three short-form stories of shared moments between Nigerians, each revealed across Detty December. The personalised-bottle mechanic returns but evolves: bottles carry not names but story-fragments that complete when two people share one.\n\nFormat mix to be defined at Plan stage, but indicative:\n- 3 × short film (60–90s) — creator-directed\n- 1 × long-form cultural essay (12–15 min) — YouTube/Coca-Cola Studios\n- Physical experience activation in Lagos (Lekki or VI) — one Saturday in December\n- Supporting social content across creator + Coca-Cola channels`,
      },
      {
        heading: 'Open questions & ambiguities',
        type: 'flags',
        items: [
          { text: 'KPI numerics — Brand has not committed to specific reach, engagement, or UGC targets. RM to confirm before Strategy Snapshot.' },
          { text: 'Physical activation budget carve-out — Is the physical activation inside the ₦100–150M range, or additive? Material difference.' },
          { text: 'Usage rights duration — Not discussed. Standard TASCK is 12 months; Coca-Cola may want perpetual.' },
          { text: 'Creator preferences — Folake named three creators conversationally. Is this a shortlist we must match, or illustrative of taste?' },
          { text: 'Kantar brand tracking — Standard Coca-Cola practice; confirm whether this runs in parallel or if TASCK-provided measurement is sufficient.' },
        ],
      },
    ],
    scopeFlags: [
      { text: '"people to feel the campaign, not just see it"', reason: 'Not a measurable KPI. Suggest converting to sentiment lift % or UGC volume.' },
      { text: '"north of ₦100M, less than ₦150M"', reason: 'Budget range too wide for planning. Request firm ceiling before Plan stage.' },
      { text: '"shareability"', reason: 'Two related but distinct intents with "feel." Clarify which is primary success metric.' },
      { text: 'Dec 1 in-market', reason: 'Aggressive given 7-week runway. Verify whether this is hard deadline or directional.' },
    ],
  },
};

// MTN Final Report
export const v3FinalReports = {
  'proj-mtn-burna': {
    brandHeader: 'MTN × BURNA BOY × TASCK',
    title: '"Lagos Unlimited" — Final Campaign Report',
    meta: 'AI-generated from Business Case data | Reviewed by Tope Martins, RM | Ready for brand delivery',
    sections: [
      {
        heading: 'Executive summary',
        type: 'prose',
        content: `"Lagos Unlimited" launched on 6 November 2025 with Burna Boy's sold-out free concert at Tafawa Balewa Square. The campaign exceeded reach, engagement, and earned media targets, and significantly overdelivered on app installs — a KPI the MTN team had flagged as most critical to commercial success.\n\nThe concert film, released exclusively on MyMTN app on 27 November before its YouTube launch on 11 December, drove the app's largest single-month install spike in 18 months. The "Lagos moment" — Burna Boy bringing out Wande Coal for a 90-second acoustic reprise of African Giant — became the campaign's most-shared cultural artifact, generating 14,000+ organic UGC posts using #LagosUnlimited.\n\nThe campaign closed within budget, on schedule, with one in-scope change handled cleanly via amendment. All deliverables were approved by the brand within 24 hours of RM review.`,
      },
      {
        heading: 'Performance against KPIs',
        type: 'kpi_table',
        items: [
          { kpi: 'Reach (unique impressions)', target: '10M', actual: '14.2M', variance: '+42%' },
          { kpi: 'MyMTN app installs (net new)', target: '200,000', actual: '287,000', variance: '+43.5%' },
          { kpi: '5G sign-ups', target: '45,000', actual: '51,200', variance: '+13.8%' },
          { kpi: 'Engagement rate (creator content)', target: '8%', actual: '9.4%', variance: '+17.5%' },
          { kpi: 'Earned media value', target: '₦300M', actual: '₦412M', variance: '+37.3%' },
          { kpi: 'UGC posts (#LagosUnlimited)', target: '3,000', actual: '14,100', variance: '+370%' },
        ],
      },
      {
        heading: 'Timeline adherence',
        type: 'prose',
        content: '100%. Event delivered on the contracted date. Film delivered 1 day ahead of schedule. All post-production milestones met.',
      },
      {
        heading: 'Budget adherence',
        type: 'prose',
        content: '₦150M base + ₦4M scope change addendum = ₦154M total. All invoiced amounts settled by MTN finance within the agreed 21-day terms. All creator payments released via escrow on brand approval of each deliverable.',
      },
      {
        heading: 'Creator performance summary — Burna Boy',
        type: 'bullets',
        items: [
          'Deliverable quality: 9.6 / 10 (brand-rated average)',
          'On-time rate: 100% (11/11 milestones)',
          'Responsiveness: Excellent — all RM queries answered within 12 hours',
          'Brand satisfaction: 9.8 / 10 (from Kemi Adebayo\'s closure feedback)',
          'TASCK-calibrated reliability score post-campaign: 9.4 / 10 (up from 8.7 pre-campaign)',
        ],
      },
      {
        heading: 'Observations & recommendations',
        type: 'numbered',
        items: [
          'The "viral moment" strategy worked. The Wande Coal guest appearance drove 38% of total UGC volume. Recommend pre-engineering at least one such moment in future flagship campaigns.',
          'MyMTN app exclusivity window was the right call. The 2-week pre-YouTube window drove the install spike that exceeded KPI by 43%. No leaks occurred, contrary to initial risk flag.',
          'Scope change process held. The additional 3 social cutdowns were handled without friction because the contract made the amendment process explicit.',
          'Physical event ROI. The concert itself was a small fraction of total budget (~18%) but generated ~60% of earned media. Physical anchors in digital-first campaigns punch above their weight.',
        ],
      },
    ],
    closureChecklist: [
      { item: 'Final report delivered', status: 'done' },
      { item: 'All invoices settled', status: 'done' },
      { item: 'All creator payments released', status: 'done' },
      { item: 'Contracts archived', status: 'done' },
      { item: 'Brand feedback received', status: 'pending' },
      { item: 'Creator feedback received', status: 'pending' },
      { item: 'Assets archived', status: 'done' },
      { item: 'Post-mortem logged', status: 'pending' },
    ],
  },
};

// MTN deliverables
export const v3Deliverables = {
  'proj-mtn-burna': [
    { id: 'del-1', title: 'Concert event (production)', status: 'approved', rmApproved: '7 Nov', brandApproved: '8 Nov', paymentReleased: true },
    { id: 'del-2', title: 'Concert film — rough cut', status: 'approved', rmApproved: '14 Nov', brandApproved: '15 Nov', paymentReleased: true },
    { id: 'del-3', title: 'Concert film — final master', status: 'approved', rmApproved: '24 Nov', brandApproved: '25 Nov', paymentReleased: true },
    { id: 'del-4', title: 'Social cutdowns (8 × 30s)', status: 'approved', rmApproved: '26 Nov', brandApproved: '27 Nov', paymentReleased: true },
    { id: 'del-5', title: '"Lagos moment" viral cut', status: 'approved', rmApproved: '27 Nov', brandApproved: '28 Nov', paymentReleased: true },
    { id: 'del-6', title: 'Behind-the-scenes feature', status: 'approved', rmApproved: '2 Dec', brandApproved: '3 Dec', paymentReleased: true },
    { id: 'del-7', title: 'Stills package', status: 'approved', rmApproved: '28 Nov', brandApproved: '29 Nov', paymentReleased: true },
    { id: 'del-8', title: 'MyMTN app exclusive landing', status: 'approved', rmApproved: '25 Nov', brandApproved: '26 Nov', paymentReleased: true },
  ],
  'proj-star-ayra': [
    { id: 'del-s1', title: 'Tour creative direction & key art', status: 'approved', rmApproved: '15 Jan', brandApproved: '16 Jan', paymentReleased: true },
    { id: 'del-s2', title: 'Lagos show (Night 1)', status: 'approved', rmApproved: '2 Feb', brandApproved: '3 Feb', paymentReleased: true },
    { id: 'del-s3', title: 'Abuja show (Night 2)', status: 'approved', rmApproved: '10 Feb', brandApproved: '11 Feb', paymentReleased: true },
    { id: 'del-s4', title: 'Port Harcourt show (Night 3)', status: 'pending_rm_review', rmApproved: null, brandApproved: null, paymentReleased: false },
    { id: 'del-s5', title: 'Social content package (Tour)', status: 'pending_upload', rmApproved: null, brandApproved: null, paymentReleased: false },
    { id: 'del-s6', title: 'Tour documentary (20 min)', status: 'pending_upload', rmApproved: null, brandApproved: null, paymentReleased: false },
    { id: 'del-s7', title: 'Stills & press kit', status: 'pending_upload', rmApproved: null, brandApproved: null, paymentReleased: false },
    { id: 'del-s8', title: 'Brand integration edit pack', status: 'pending_upload', rmApproved: null, brandApproved: null, paymentReleased: false },
  ],
};

// Strategy Snapshot for Guinness x Rema (v1 draft)
export const v3CreativeSnapshots = {
  'proj-guinness-rema': {
    versions: [
      {
        version: 1,
        status: 'draft',
        generatedAt: '2026-03-16',
        sharedAt: null,
        brandFeedback: null,
        approved: false,
        content: {
          brandHeader: 'GUINNESS × REMA × TASCK',
          title: '"Made of More: Africa" — Strategy Snapshot v1',
          meta: 'Drafted by Adaeze Obi, RM | Status: Internal Review | 16 March 2026',
          concept: `Made of More: Africa is a three-part documentary film series authored by Rema, profiling three rising African figures whose lives embody the "Made of More" ethos. The creator serves as director and narrator across all three films; subjects are drawn from Nigeria (a woman working in climate-resilient agriculture — TBD), Kenya (rising figure in tech, TBD), and South Africa (rising figure in design or architecture, TBD).\n\nEach film runs 8 minutes. A connective narrative thread — written and performed by Rema — runs across all three, framing the trilogy as a single meditation on modern African ambition.\n\nThe Guinness brand appears with restraint:\n- Title sequence and end card\n- A single organic moment per film where the drink appears within the subject's life\n- No voiceover endorsement\n- No product shots`,
          deliverables: [
            { num: 1, title: 'Hero film 1 — Nigeria', format: 'Short documentary', duration: '8 min', purpose: 'YouTube + owned channel' },
            { num: 2, title: 'Hero film 2 — Kenya', format: 'Short documentary', duration: '8 min', purpose: 'Same' },
            { num: 3, title: 'Hero film 3 — South Africa', format: 'Short documentary', duration: '8 min', purpose: 'Same' },
            { num: 4, title: 'Trailer', format: 'Short film', duration: '90 sec', purpose: 'TVC + social' },
            { num: 5, title: 'Social cutdowns', format: 'Vertical video', duration: '6 × 30 sec', purpose: 'Instagram Reels, TikTok' },
            { num: 6, title: 'Behind-the-scenes', format: 'Docufeature', duration: '12 min', purpose: 'YouTube — post-trilogy' },
            { num: 7, title: 'Stills package', format: 'Photography', duration: '40+ images', purpose: 'PR, print, OOH' },
            { num: 8, title: 'Physical premiere', format: 'Event', duration: 'One evening', purpose: 'Lagos — invite-only launch' },
          ],
          budget: [
            { line: 'Creator fee (Rema)', amount: 88000000, pct: 49 },
            { line: 'Production (crew, equipment, locations)', amount: 48000000, pct: 27 },
            { line: 'Post-production (edit, score, color, VFX)', amount: 14000000, pct: 8 },
            { line: 'Logistics (travel, accommodation, permits)', amount: 11000000, pct: 6 },
            { line: 'Launch event (Lagos premiere)', amount: 7000000, pct: 4 },
            { line: 'TTA management fee (TASCK, 15%)', amount: 9000000, pct: 5 },
            { line: 'Contingency (1.7%)', amount: 3000000, pct: 2 },
          ],
          milestones: [
            { milestone: 'Strategy Snapshot approved by brand', date: '27 March 2026' },
            { milestone: 'Regional approval (Diageo Africa, Nairobi)', date: '10 April 2026' },
            { milestone: 'Contracts executed', date: '17 April 2026' },
            { milestone: 'Project invoice paid — enter DELIVER', date: '24 April 2026' },
            { milestone: 'Subject scouting & lock', date: '31 May 2026' },
            { milestone: 'Pre-production complete', date: '30 September 2026' },
            { milestone: 'Shoot — Lagos', date: '6–12 October 2026' },
            { milestone: 'Shoot — Nairobi', date: '13–17 October 2026' },
            { milestone: 'Shoot — Cape Town', date: '20–24 October 2026' },
            { milestone: 'Rough cuts — all 3 films', date: '14 November 2026' },
            { milestone: 'Fine cuts + score + color', date: '28 November 2026' },
            { milestone: 'Brand review round 1', date: '2 December 2026' },
            { milestone: 'Final masters delivered', date: '14 December 2026' },
            { milestone: 'Lagos premiere', date: 'Early Jan 2027 (TBD)' },
          ],
          successMetrics: [
            { kpi: 'Reach 15M', metric: 'Combined impressions (paid + earned)', target: '15M+' },
            { kpi: 'Engagement 7%+', metric: 'ER on Rema\'s + Guinness\'s channels', target: '7%+' },
            { kpi: 'Brand equity +4pt', metric: 'Kantar post-campaign tracker', target: '+4pt on "relevant to me"' },
            { kpi: 'Volume lift 8%', metric: 'On-premise tracked outlets, 4-week window', target: '8%+' },
            { kpi: 'Earned media ₦400M', metric: 'EMV tracked via Meltwater', target: '₦400M+' },
          ],
        },
      },
    ],
    currentVersion: 1,
    revisionCount: 0,
  },
};

// Rema's brief response
export const v3BriefResponses = {
  'proj-guinness-rema': {
    creatorId: 'creator-rema',
    sentAt: '2026-03-07',
    respondedAt: '2026-03-12',
    interest: 'yes',
    budgetAlignment: 'Aligned',
    feeExpectation: '₦88M all-in (my team, direction, narration, score for 2 films)',
    availability: 'Confirmed for Oct 6–28, 2026 production window. Available for 3 days of additional shoot days in Nov if needed.',
    proposedConcept: `- Three subjects, one from Nigeria, one from Kenya, one from South Africa. I want the Nigerian story to be a woman. Probably someone in climate or food systems — not an entertainer. The brand wants to reach women 25-34; this is how we open that door without being obvious about it.\n- Shot documentary-first. No scripted moments. We capture what's real and cut for the story.\n- My role is narrator across all three. One continuous thread. The subjects carry their own scenes; I connect them.\n- Music: I'll score two of the three. The third gets a custom score from someone I want to bring in — TBD, possibly Obongjayar.\n- I want final edit. Non-negotiable.`,
    rmDecision: 'approved',
  },
};

// Guinness Rema Creator match rationale
export const v3CreatorMatches = {
  'proj-guinness-rema': {
    creatorId: 'creator-rema',
    fitScore: 93,
    rationale: [
      'Cultural authority with target audience: 70% of Rema\'s Nigerian audience is in the 18–30 bracket with a strong Lagos/Abuja skew. Matches the Guinness 25–34 core without forcing it.',
      'Platform craft: His visual direction on Ravage and Heis demonstrates the documentary-adjacent aesthetic the brand referenced.',
      'Pan-African resonance: His streaming splits — 38% Nigeria, 22% Kenya, 15% South Africa, 25% elsewhere — mirror Diageo Africa\'s regional priorities almost exactly.',
      'Brand-work track record: 2 prior brand collaborations (Puma, Browns Fashion) delivered on brief; no timeline slippage. TASCK-calibrated reliability score: 8.4/10.',
      'Availability: Confirmed available for Oct–Nov 2026 production window.',
    ],
    risks: [
      'Rate negotiation: Current rate card starts at ₦85M for integrated campaigns of this scope. Room within the ₦180M total budget.',
      'Creative control preference: Rema\'s team requires final edit approval on all creative deliverables. Must be contractually structured.',
    ],
  },
};

// Helper to get brand by ID
export const getBrand = (id) => v3Brands.find(b => b.id === id);
export const getCreator = (id) => v3Creators.find(c => c.id === id);
export const getRM = (id) => v3RMs.find(r => r.id === id);
export const getProjectsByStage = (stage) => v3Projects.filter(p => p.stage === stage);
export const getProjectsForBrand = (brandId) => v3Projects.filter(p => p.brandId === brandId);
export const getProjectsForCreator = (creatorId) => v3Projects.filter(p => p.creatorId === creatorId);

const paidStages = ['plan', 'deliver', 'closed'];

export const getMockMarketingIntelligence = (project) => {
  if (project?.id === 'proj-cocacola-tems') {
    return {
      key_marketing_focus: 'Move Share a Coke Nigeria beyond personalised bottles into a culturally specific creator-led storytelling platform for Q4.',
      primary_target_audience: 'Urban Nigerians aged 18-28, SEC A/B, led by Lagos, Abuja, Port Harcourt, Ibadan, and Enugu.',
      key_marketing_channels: ['Instagram', 'TikTok', 'YouTube', 'Creator channels', 'Physical activation'],
      marketing_kpis: [
        { kpi: 'Reach', target: '8-12M unique impressions across paid and earned media.' },
        { kpi: 'Engagement rate', target: '6-8% on creator-led content.' },
        { kpi: 'UGC volume', target: '5,000+ posts using the campaign hashtag.' },
        { kpi: 'Earned media value', target: 'Minimum N250M EMV.' },
      ],
    };
  }
  return {
    key_marketing_focus: project?.nextAction || `Build a creator-led growth opportunity for ${project?.title || 'this brand'}.`,
    primary_target_audience: 'Priority youth and culture audience to be confirmed from the connector transcript.',
    key_marketing_channels: ['Instagram', 'TikTok', 'YouTube', 'PR'],
    marketing_kpis: [
      { kpi: 'Reach', target: 'Confirm target with brand.' },
      { kpi: 'Engagement', target: 'Confirm benchmark with brand.' },
      { kpi: 'Conversion signal', target: 'Define during Frame.' },
    ],
  };
};

export const buildMockBusinessCases = () => v3Projects.map((project) => ({
  id: project.id,
  brand_id: project.brandId,
  creator_id: project.creatorId,
  title: project.title,
  stage: project.stage,
  engagement_track: project.engagement === 'grant' ? 'grant' : 'paid',
  estimated_value: project.estimatedValue,
  rm_id: project.rmId,
  created_at: project.createdAt,
  days_in_stage: project.daysInStage,
  next_action: project.nextAction,
  health: project.health,
  connect: {
    status: project.stage === 'connect' ? 'in_discovery' : 'qualified_to_frame',
    stated_intent: project.nextAction,
    marketing_intelligence: getMockMarketingIntelligence(project),
  },
}));

export const buildMockAdminOverview = () => {
  const businessCases = buildMockBusinessCases();
  const byStage = businessCases.reduce((acc, item) => ({ ...acc, [item.stage]: (acc[item.stage] || 0) + 1 }), {});
  const paid = businessCases.filter((item) => item.engagement_track === 'paid');
  const grant = businessCases.filter((item) => item.engagement_track === 'grant');
  return {
    business_cases_total: businessCases.length,
    paid_count: paid.length,
    grant_count: grant.length,
    paid_total_value: paid.reduce((sum, item) => sum + item.estimated_value, 0),
    grant_total_value: grant.reduce((sum, item) => sum + item.estimated_value, 0),
    by_stage: byStage,
  };
};

const makeGenericAlignmentSnapshot = (project, brand) => {
  const mi = getMockMarketingIntelligence(project);
  return {
    status: project.stage === 'connect' ? 'draft' : 'under_review',
    generatedAt: project.createdAt,
    approvedBy: null,
    brandHeader: `${brand?.company?.split(' ')[0]?.toUpperCase() || 'BRAND'} x TASCK`,
    title: `"${project.title}": Alignment Snapshot`,
    meta: 'AI-generated from connector phase data | Pending admin review',
    sections: [
      { heading: 'Business promotion summary', type: 'prose', content: `TASCK can help ${brand?.company || 'the brand'} turn "${project.title}" into a creator-led campaign anchored on ${mi.key_marketing_focus}` },
      { heading: 'Key Marketing Focus', type: 'prose', content: mi.key_marketing_focus },
      { heading: 'Primary Target Audience', type: 'prose', content: mi.primary_target_audience },
      { heading: 'Key Marketing Channels', type: 'bullets', items: mi.key_marketing_channels },
      { heading: 'Marketing KPIs', type: 'kpis', items: mi.marketing_kpis },
      { heading: 'Next steps', type: 'bullets', items: ['Admin reviews this draft.', 'Send Alignment Snapshot to brand.', 'Brand or admin proxy approval moves the project into Frame for creator matching.'] },
    ],
    scopeFlags: [
      { text: 'Confirm KPI numbers', reason: 'The connector phase needs brand-approved targets before Strategy Snapshot.' },
      { text: 'Confirm budget ceiling', reason: 'Creator matching depends on realistic fee and production assumptions.' },
    ],
  };
};

export const buildMockAlignmentSnapshot = (project) => {
  const brand = getBrand(project.brandId);
  const source = v3AlignmentSnapshots[project.id] || makeGenericAlignmentSnapshot(project, brand);
  return {
    id: `as-${project.id}`,
    business_case_id: project.id,
    status: source.status || 'under_review',
    generated_at: source.generatedAt,
    approved_at: null,
    approved_by: source.approvedBy,
    approved_by_party: null,
    brand_header: source.brandHeader,
    title: source.title,
    meta: source.meta,
    marketing_intelligence: getMockMarketingIntelligence(project),
    sections: source.sections || [],
    scope_flags: source.scopeFlags || [],
    brand_comments: project.id === 'proj-cocacola-tems'
      ? [{
          id: 'comment-demo-kpi',
          section_index: 2,
          quoted_text: 'Urban Nigerians aged 18-28',
          comment: 'Please confirm whether Abuja is primary or secondary before this goes wider internally.',
          author: 'Folake Adeniran',
          status: 'open',
          created_at: '2026-03-11T10:00:00Z',
        }]
      : [],
  };
};

export const buildMockBusinessCaseBundle = (id) => {
  const project = v3Projects.find((item) => item.id === id);
  if (!project) return null;
  const brand = getBrand(project.brandId);
  const creator = getCreator(project.creatorId);
  const rm = getRM(project.rmId);
  const businessCase = buildMockBusinessCases().find((item) => item.id === id);
  const alignment = project.stage === 'connect' ? null : buildMockAlignmentSnapshot(project);
  const briefResponse = v3BriefResponses[id];
  const creativeSnapshotVersion = v3CreativeSnapshots[id]?.versions?.[0];
  const creatorMatch = v3CreatorMatches[id];
  const invoices = project.engagement === 'retainer' && paidStages.includes(project.stage)
    ? [{
        id: `sdf-${project.id}`,
        business_case_id: project.id,
        kind: 'strategy_development_fee',
        amount: Math.max(4000000, Math.round(project.estimatedValue * 0.035)),
        status: project.stage === 'deliver' ? 'paid' : 'issued',
        issued_at: project.stage === 'plan' ? '2026-03-16T09:00:00Z' : '2026-04-01T09:00:00Z',
      }]
    : [];
  return {
    source: 'mock',
    business_case: {
      ...businessCase,
      frame: {
        alignment_snapshot_id: alignment?.id,
        alignment_snapshot_status: alignment?.status,
        scope_flags_total: alignment?.scope_flags?.length || 0,
        scope_flags_resolved: 0,
        strategy_development_fee_paid: invoices.some((inv) => inv.status === 'paid'),
        strategy_development_fee_due_stage: 'after_creator_brief_before_strategy_snapshot',
      },
      plan: {
        creator_shortlist_status: creatorMatch ? 'matched' : 'pending',
        creative_brief_status: briefResponse ? 'responded' : 'pending',
        strategy_snapshot_status: creativeSnapshotVersion?.status || 'pending',
        contract_status: 'draft',
      },
      deliver: {
        budget_planning_status: project.stage === 'deliver' ? 'complete' : 'pending',
        timeline_planning_status: project.stage === 'deliver' ? 'complete' : 'pending',
        delivery_status: project.stage === 'deliver' ? 'in_progress' : 'pending',
        scope_change_log: [],
      },
      closure: {
        report_status: v3FinalReports[id] ? 'generated' : 'pending',
        brand_feedback_received: false,
        creator_feedback_received: false,
      },
    },
    brand,
    creator,
    rm,
    interactions: v3Interactions[project.brandId] || [],
    alignment_snapshot: alignment,
    invoices,
    brainstorm_round: creatorMatch ? {
      id: `brainstorm-${id}`,
      phases: [
        { phase: 1, label: 'Audience fit', status: 'complete' },
        { phase: 2, label: 'Cultural fit', status: 'complete' },
        { phase: 3, label: 'Reliability', status: 'complete' },
        { phase: 4, label: 'Commercial fit', status: 'complete' },
        { phase: 5, label: 'Risk', status: 'complete' },
        { phase: 6, label: 'Shortlist', status: 'complete' },
        { phase: 7, label: 'Admin review', status: 'pending' },
      ],
      scored_creators: [{
        creator_id: creatorMatch.creatorId,
        cultural_fit: 5,
        conversion_behavior: 5,
        reliability: 4,
        reason: creatorMatch.rationale?.[0],
      }],
    } : null,
    creative_brief: briefResponse ? {
      id: `brief-${id}`,
      business_case_id: id,
      creator_id: briefResponse.creatorId,
      sent_at: briefResponse.sentAt,
      brief_text: `Brief for ${project.title}\n\nAudience: ${getMockMarketingIntelligence(project).primary_target_audience}\n\nPlease respond with interest, fee, availability, conditions, and creative approach.`,
      status: 'responded',
      creator_response: {
        interest: briefResponse.interest,
        fee_expectation: briefResponse.feeExpectation,
        availability: briefResponse.availability,
        proposed_concept: briefResponse.proposedConcept,
      },
    } : null,
    creative_snapshot: creativeSnapshotVersion ? {
      id: `cs-${id}`,
      business_case_id: id,
        status: creativeSnapshotVersion.status,
        title: creativeSnapshotVersion.content.title,
        concept: creativeSnapshotVersion.content.concept,
        deliverables: creativeSnapshotVersion.content.deliverables,
        budget: creativeSnapshotVersion.content.budget,
        milestones: creativeSnapshotVersion.content.milestones,
        success_metrics: creativeSnapshotVersion.content.successMetrics,
        brand_comments: [{
          id: 'comment-strategy-budget',
          section_index: 2,
          quoted_text: 'Budget',
          comment: 'Please clarify whether the production travel line includes all three countries.',
          author: 'Tunde Adeola',
          status: 'open',
          created_at: '2026-03-17T09:00:00Z',
        }],
      } : null,
    contract: null,
    deliverables: v3Deliverables[id] || [],
    final_report: v3FinalReports[id] || null,
  };
};

// Stage config
export const v3Stages = [
  { key: 'connect', label: 'Connect', color: '#9B9380' },
  { key: 'frame', label: 'Frame', color: '#C49B5F' },
  { key: 'plan', label: 'Plan', color: '#1F4A3A' },
  { key: 'deliver', label: 'Deliver', color: '#567B3F' },
];

export const formatNairaV3 = (amount) => {
  if (amount == null || Number.isNaN(Number(amount))) return '₦0';
  if (amount >= 1000000000) return `₦${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(0)}M`;
  if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
  return `₦${amount}`;
};
