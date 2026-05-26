const crypto = require("crypto");
const express = require("express");
const fs = require("fs");
const https = require("https");
const path = require("path");
const dotenv = require("dotenv");

const FRONTEND_ROOT = path.resolve(__dirname, "../..");
const WORKSPACE_ROOT = path.resolve(FRONTEND_ROOT, "..");
const STORE_PATH = path.resolve(FRONTEND_ROOT, ".v3-opportunity-store.json");
const BACKEND_ENV_PATH = path.resolve(WORKSPACE_ROOT, "backend", ".env");

dotenv.config({ path: BACKEND_ENV_PATH });

const PARTNERSHIP_SIGNAL_TERMS = [
  "brand ambassador", "ambassador", "celebrity partnership", "celebrity endorsement",
  "endorsement", "influencer campaign", "influencer partnership", "brand partnership",
  "partnership opportunity", "open application", "casting call", "agency brief",
  "rfp", "signed", "unveils", "announces", "partnered with",
];
const NOT_FOUND = "Not found - recommend manual search.";

const DEFAULT_TEMPLATE = {
  keywords: "brand ambassador program celebrity partnership endorsement deal influencer campaign Nigeria",
  country: "Nigeria",
  industries: ["Fashion", "Food & Beverage", "Tech", "Beauty", "Sports", "FMCG", "Telco", "Fintech"],
  campaign_types: ["brand ambassador program", "celebrity partnership", "celebrity endorsement deal", "brand partnership opportunity", "influencer campaign open application"],
  recency: "past_year",
  result_limit: 10,
};

const defaultStore = () => ({
  scans: [],
  candidates: [],
  opportunities: [],
  brands: [],
});

const nowIso = () => new Date().toISOString();

const makeId = (prefix) => `${prefix}-${crypto.randomBytes(4).toString("hex")}`;

const readStore = () => {
  try {
    if (!fs.existsSync(STORE_PATH)) return defaultStore();
    return { ...defaultStore(), ...JSON.parse(fs.readFileSync(STORE_PATH, "utf8")) };
  } catch (error) {
    return defaultStore();
  }
};

const writeStore = (store) => {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
};

const slug = (value) =>
  String(value || "brand")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .split(".")
    .filter(Boolean)
    .slice(0, 4)
    .join(".") || "brand";

const domainFromUrl = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch (error) {
    return "";
  }
};

const countryToGl = (country) => {
  const normalized = String(country || "").trim().toLowerCase();
  return { nigeria: "ng", "united states": "us", usa: "us", "united kingdom": "uk", ghana: "gh", kenya: "ke", southafrica: "za", "south africa": "za" }[normalized] || "ng";
};

const buildQuery = (payload) => {
  const template = { ...DEFAULT_TEMPLATE, ...(payload.template || {}) };
  if (payload.query && payload.query.trim()) return payload.query.trim();
  const industries = (template.industries || []).filter(Boolean).join(" OR ");
  const campaignTypes = (template.campaign_types || []).filter(Boolean).join(" OR ");
  return [template.keywords, template.country, industries && `(${industries})`, campaignTypes && `(${campaignTypes})`]
    .filter(Boolean)
    .join(" ");
};

const recencyToTbs = (value) => ({
  past_day: "qdr:d",
  past_week: "qdr:w",
  past_month: "qdr:m",
  past_year: "qdr:y",
}[String(value || "").trim()] || "");

const requestJson = (url) => new Promise((resolve, reject) => {
  const req = https.get(url, { timeout: 30000 }, (res) => {
    let body = "";
    res.on("data", (chunk) => {
      body += chunk;
    });
    res.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error || `SerpAPI returned ${res.statusCode}`));
          return;
        }
        resolve(data);
      } catch (error) {
        reject(new Error("SerpAPI returned invalid JSON"));
      }
    });
  });
  req.on("timeout", () => {
    req.destroy(new Error("SerpAPI request timed out"));
  });
  req.on("error", reject);
});

const extractEmail = (text) => {
  const match = String(text || "").match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0] : "";
};

const extractBrandName = (title, snippet) => {
  const text = String(title || snippet || "Discovered Brand").trim().replace(/^[^A-Za-z0-9]+/, "");
  const splitters = [
    " launches ", " launch ", " unveils ", " announces ", " introduces ",
    " partners ", " campaign", " advertising", " advert", " rolls out ", " debuts ", " celebrates ",
  ];
  const lower = text.toLowerCase();
  let cut = text.length;
  splitters.forEach((splitter) => {
    const pos = lower.indexOf(splitter);
    if (pos > 1) cut = Math.min(cut, pos);
  });
  let candidate = text.slice(0, cut).split(" - ")[0].split(" | ")[0].split(":")[0].trim().replace(/^['".,]+|['".,]+$/g, "");
  const words = candidate.split(/\s+/).filter(Boolean);
  if (words.length > 5) candidate = words.slice(0, 5).join(" ");
  return candidate || "Discovered Brand";
};

const extractCampaignName = (title, snippet, brandName) => {
  const quoted = `${title} ${snippet}`.match(/["']([^"']{4,80})["']/);
  if (quoted) return quoted[1];
  const cleaned = String(title || "").replace(new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim().replace(/^[-:|]+|[-:|]+$/g, "");
  return cleaned.slice(0, 90) || "New marketing opportunity";
};

const inferIndustry = (text, industries) => {
  const lower = String(text || "").toLowerCase();
  for (const industry of industries || []) {
    if (lower.includes(String(industry).toLowerCase())) return industry;
  }
  if (["bank", "fintech", "payment", "wallet"].some((word) => lower.includes(word))) return "Fintech / Financial Services";
  if (["telco", "data", "network", "mobile", "internet"].some((word) => lower.includes(word))) return "Telecommunications";
  if (["beer", "beverage", "drink", "coca", "lager", "food"].some((word) => lower.includes(word))) return "FMCG / Beverages";
  if (["beauty", "skincare", "fashion", "retail"].some((word) => lower.includes(word))) return "Beauty / Retail";
  return "Brand / Consumer Marketing";
};

const inferCampaignType = (text, campaignTypes) => {
  const lower = String(text || "").toLowerCase();
  for (const campaignType of campaignTypes || []) {
    if (lower.includes(String(campaignType).toLowerCase())) return campaignType;
  }
  if (lower.includes("endorsement")) return "celebrity endorsement deal";
  if (lower.includes("ambassador")) return "brand ambassador program";
  if (lower.includes("partnership") || lower.includes("partnered")) return "celebrity partnership";
  if (lower.includes("creator") || lower.includes("influencer")) return "creator campaign";
  if (lower.includes("launch") || lower.includes("unveil")) return "brand launch";
  if (lower.includes("advert") || lower.includes("ad ") || lower.includes("advertising")) return "advertising";
  return "marketing campaign";
};

const scoreCandidate = (text, template) => {
  const lower = String(text || "").toLowerCase();
  let score = 55;
  ["campaign", "launch", "advert", "marketing", "brand", "creator", "influencer", "nigeria", "lagos"].forEach((token) => {
    if (lower.includes(token)) score += 4;
  });
  [...(template.industries || []), ...(template.campaign_types || [])].forEach((token) => {
    if (lower.includes(String(token).toLowerCase())) score += 3;
  });
  PARTNERSHIP_SIGNAL_TERMS.forEach((token) => {
    if (lower.includes(token)) score += 5;
  });
  return Math.max(50, Math.min(score, 96));
};

const hasPartnershipSignal = (text) => {
  const lower = String(text || "").toLowerCase();
  return PARTNERSHIP_SIGNAL_TERMS.some((token) => lower.includes(token));
};

const websiteFromSource = (sourceUrl) => {
  const domain = domainFromUrl(sourceUrl);
  return domain ? `https://${domain}` : sourceUrl;
};

const sourceNote = (value, sourceUrl) => (
  value && value !== NOT_FOUND ? `${value} Source: ${sourceUrl}` : NOT_FOUND
);

const buildPartnershipProfile = ({ brandName, sourceUrl, sourceTitle, sourceSnippet, text, industry, campaignType }) => {
  const lower = String(text || "").toLowerCase();
  const evidence = sourceSnippet || sourceTitle || NOT_FOUND;
  const signalTerms = PARTNERSHIP_SIGNAL_TERMS.filter((term) => lower.includes(term));
  const hasActiveSignal = ["announces", "unveils", "signed", "partners", "partnered", "ambassador"].some((term) => lower.includes(term));
  const hasPastSignal = ["past", "previous", "former", "historical", "history"].some((term) => lower.includes(term));
  const hasOpenSignal = ["open application", "casting call", "rfp", "request for proposal", "looking for"].some((term) => lower.includes(term));
  const hasGrowthSignal = ["launch", "expansion", "growth", "raises", "funding", "new market", "campaign"].some((term) => lower.includes(term));

  return {
    brand_profile: {
      official_brand_name: brandName,
      website: websiteFromSource(sourceUrl),
      industry_category: industry,
    },
    celebrity_partnership_status: {
      current_active_partnerships: hasActiveSignal ? sourceNote(evidence, sourceUrl) : NOT_FOUND,
      past_partnerships: hasPastSignal ? sourceNote(evidence, sourceUrl) : NOT_FOUND,
      upcoming_or_open_calls: hasOpenSignal ? sourceNote(evidence, sourceUrl) : NOT_FOUND,
    },
    partnership_signals: {
      influencer_or_celebrity_marketing_evidence: sourceNote(evidence, sourceUrl),
      marketing_budget_or_growth_signal: hasGrowthSignal ? sourceNote(evidence, sourceUrl) : NOT_FOUND,
      public_rfp_or_agency_brief: hasOpenSignal ? sourceNote(evidence, sourceUrl) : NOT_FOUND,
      detected_signal_terms: signalTerms.length ? signalTerms : ["partnership signal"],
    },
    social_media_presence: {
      instagram: NOT_FOUND,
      tiktok: NOT_FOUND,
      x_twitter: NOT_FOUND,
      youtube: NOT_FOUND,
      linkedin: NOT_FOUND,
      estimated_followers_or_engagement: NOT_FOUND,
      content_style: hasPartnershipSignal(text) ? "Influencer/celebrity-led or partnership-led signal detected from search result." : NOT_FOUND,
    },
    contact_outreach: {
      marketing_or_partnerships_email: extractEmail(text) || NOT_FOUND,
      pr_or_talent_agency: NOT_FOUND,
      cmo_head_partnerships_or_brand_manager_linkedin: NOT_FOUND,
      press_or_media_inquiry_contact: extractEmail(text) || NOT_FOUND,
    },
    citations: [
      {
        field: "partnership_signal",
        source_url: sourceUrl,
        source_title: sourceTitle,
        evidence,
      },
    ],
  };
};

const resultItems = (raw) => {
  const buckets = [];
  ["organic_results", "news_results", "top_stories"].forEach((key) => {
    (raw[key] || []).forEach((item) => {
      buckets.push({
        title: item.title || item.name || "",
        link: item.link || item.source_link || item.url || "",
        snippet: item.snippet || item.description || item.source || "",
      });
    });
  });
  return buckets.filter((item) => item.title && item.link);
};

const candidateFromResult = (item, payload, scanId, query) => {
  const template = { ...DEFAULT_TEMPLATE, ...(payload.template || {}) };
  const text = `${item.title} ${item.snippet}`;
  const brandName = extractBrandName(item.title, item.snippet);
  const campaignName = extractCampaignName(item.title, item.snippet, brandName);
  const campaignType = inferCampaignType(text, template.campaign_types);
  const sourceSnippet = String(item.snippet || "").slice(0, 420);
  const detectedKeywords = [
    "brand ambassador", "celebrity partnership", "celebrity endorsement", "endorsement",
    "influencer campaign", "brand partnership", "open application", "casting call",
    "campaign", "launch", "advertising", "creator", "influencer", "Nigeria", "marketing", "brand",
  ].filter((token) =>
    text.toLowerCase().includes(token.toLowerCase())
  );
  const partnershipProfile = buildPartnershipProfile({
    brandName,
    sourceUrl: item.link,
    sourceTitle: String(item.title).slice(0, 220),
    sourceSnippet,
    text,
    industry: inferIndustry(text, template.industries),
    campaignType,
  });
  return {
    id: makeId("oppcand"),
    scan_id: scanId,
    query,
    brand_name: brandName,
    country: template.country || "Nigeria",
    industry: partnershipProfile.brand_profile.industry_category,
    campaign_name: campaignName,
    campaign_type: campaignType,
    pain_point: `Public search signal suggests ${brandName} has celebrity, ambassador, endorsement, or influencer partnership activity. Source context: ${sourceSnippet || item.title}`,
    suggested_opportunity_angle: `Prepare a celebrity partnership outreach angle for ${brandName} around ${campaignName}, then validate budget, decision maker, talent category, usage rights, and measurable KPI fit.`,
    source_url: item.link,
    source_domain: domainFromUrl(item.link),
    source_title: String(item.title).slice(0, 220),
    source_snippet: sourceSnippet,
    detected_keywords: detectedKeywords,
    confidence_score: scoreCandidate(text, template),
    contact_email: extractEmail(text),
    brand_profile: partnershipProfile.brand_profile,
    celebrity_partnership_status: partnershipProfile.celebrity_partnership_status,
    partnership_signals: partnershipProfile.partnership_signals,
    social_media_presence: partnershipProfile.social_media_presence,
    contact_outreach: partnershipProfile.contact_outreach,
    citations: partnershipProfile.citations,
    status: "pending",
    created_at: nowIso(),
    reviewed_at: null,
    reviewed_by: null,
    dedupe_key: `${slug(brandName)}::${slug(campaignName)}`,
  };
};

const setupV3OpportunityScanner = (devServer) => {
  if (!devServer || !devServer.app || devServer.app.locals.v3OpportunityScannerInstalled) return;
  devServer.app.locals.v3OpportunityScannerInstalled = true;
  devServer.app.use("/api/v3/opportunities", express.json({ limit: "1mb" }));

  devServer.app.get("/api/v3/opportunities", (req, res) => {
    res.json(readStore().opportunities.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
  });

  devServer.app.get("/api/v3/opportunities/candidates", (req, res) => {
    const { status } = req.query;
    const rows = readStore().candidates
      .filter((candidate) => !status || candidate.status === status)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    res.json(rows);
  });

  devServer.app.post("/api/v3/opportunities/scans", async (req, res) => {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      res.status(503).json({ detail: "SERPAPI_API_KEY is not configured in backend/.env for the local scanner proxy." });
      return;
    }

    const payload = req.body || {};
    const template = { ...DEFAULT_TEMPLATE, ...(payload.template || {}) };
    const query = buildQuery({ ...payload, template });
    const scanId = makeId("oppscan");
    const scan = {
      id: scanId,
      query,
      template,
      provider: "serpapi_google_dev_proxy",
      status: "running",
      raw_count: 0,
      candidate_count: 0,
      created_at: nowIso(),
      created_by: payload.created_by || "admin",
      error: null,
    };

    const store = readStore();
    store.scans.push(scan);
    writeStore(store);

    const params = new URLSearchParams({
      engine: "google",
      q: query,
      api_key: apiKey,
      hl: "en",
      gl: countryToGl(template.country),
      num: String(Math.max(1, Math.min(Number(template.result_limit) || 10, 20))),
    });
    const tbs = recencyToTbs(template.recency);
    if (tbs) params.set("tbs", tbs);

    try {
      let raw = await requestJson(`https://serpapi.com/search.json?${params.toString()}`);
      if ((raw.error || "").toLowerCase().includes("hasn't returned") && params.has("tbs")) {
        params.delete("tbs");
        raw = await requestJson(`https://serpapi.com/search.json?${params.toString()}`);
      }
      if (raw.error) throw new Error(raw.error);
      let items = resultItems(raw);
      if (!items.length && params.has("tbs")) {
        params.delete("tbs");
        raw = await requestJson(`https://serpapi.com/search.json?${params.toString()}`);
        if (raw.error) throw new Error(raw.error);
        items = resultItems(raw);
      }
      const nextStore = readStore();
      const candidates = [];
      items.forEach((item) => {
        if (!hasPartnershipSignal(`${item.title} ${item.snippet}`)) return;
        const candidate = candidateFromResult(item, { ...payload, template }, scanId, query);
        const exists = nextStore.candidates.some((existing) =>
          existing.source_url === candidate.source_url || existing.dedupe_key === candidate.dedupe_key
        );
        if (!exists) {
          nextStore.candidates.push(candidate);
          candidates.push(candidate);
        }
      });
      const completedScan = { ...scan, status: "completed", raw_count: items.length, candidate_count: candidates.length, completed_at: nowIso() };
      nextStore.scans = nextStore.scans.map((item) => (item.id === scanId ? completedScan : item));
      writeStore(nextStore);
      res.json({ scan: completedScan, candidates });
    } catch (error) {
      const failedStore = readStore();
      const failedScan = { ...scan, status: "failed", error: `SerpAPI scan failed: ${error.message}` };
      failedStore.scans = failedStore.scans.map((item) => (item.id === scanId ? failedScan : item));
      writeStore(failedStore);
      res.status(502).json({ detail: failedScan.error });
    }
  });

  devServer.app.post("/api/v3/opportunities/scrape", async (req, res) => {
    res.status(400).json({ detail: "Use /api/v3/opportunities/scans for the V3 opportunity scanner." });
  });

  devServer.app.post("/api/v3/opportunities/candidates/:candidateId/accept", (req, res) => {
    const store = readStore();
    const candidate = store.candidates.find((item) => item.id === req.params.candidateId);
    if (!candidate) {
      res.status(404).json({ detail: "Opportunity candidate not found" });
      return;
    }

    let brand = store.brands.find((item) => slug(item.company) === slug(candidate.brand_name));
    if (!brand) {
      brand = {
        id: makeId("brand"),
        company: candidate.brand_name || "Discovered Brand",
        industry: candidate.industry || "Brand / Consumer Marketing",
        website: candidate.source_domain ? `https://${candidate.source_domain}` : candidate.source_url,
        hq: candidate.country || "Nigeria",
        primary_contact: "Marketing Team",
        role: "Brand contact",
        email: candidate.contact_email || "",
        phone: "",
        status: "Lead - accepted scanned opportunity",
        lead_score: candidate.confidence_score || 65,
        source: "serpapi_opportunity_scanner_dev_proxy",
      };
      store.brands.push(brand);
    }

    let opportunity = store.opportunities.find((item) => item.candidate_id === candidate.id);
    if (!opportunity) {
      opportunity = {
        id: makeId("opp"),
        candidate_id: candidate.id,
        scan_id: candidate.scan_id,
        brand_id: brand.id,
        company: brand.company,
        title: candidate.campaign_name || "Scanned marketing opportunity",
        query: candidate.query || "",
        problem: candidate.pain_point,
        pain_point: candidate.pain_point,
        suggested_angle: candidate.suggested_opportunity_angle,
        suggested_opportunity_angle: candidate.suggested_opportunity_angle,
        source: candidate.source_url,
        source_url: candidate.source_url,
        contact: brand.email || "Marketing Team",
        estimated_value: 75000000,
        fit_score: candidate.confidence_score || 65,
        status: "accepted",
        created_at: nowIso(),
      };
      store.opportunities.push(opportunity);
    }

    Object.assign(candidate, {
      status: "accepted",
      reviewed_at: nowIso(),
      reviewed_by: req.body?.reviewed_by || "admin",
      accepted_brand_id: brand.id,
      opportunity_id: opportunity.id,
    });
    writeStore(store);
    res.json({ candidate, brand, account: { status: "dev_proxy_logged", brand_id: brand.id }, opportunity });
  });

  devServer.app.post("/api/v3/opportunities/candidates/:candidateId/reject", (req, res) => {
    const store = readStore();
    const candidate = store.candidates.find((item) => item.id === req.params.candidateId);
    if (!candidate) {
      res.status(404).json({ detail: "Opportunity candidate not found" });
      return;
    }
    Object.assign(candidate, {
      status: "rejected",
      reviewed_at: nowIso(),
      reviewed_by: req.body?.reviewed_by || "admin",
    });
    writeStore(store);
    res.json(candidate);
  });
};

module.exports = setupV3OpportunityScanner;
