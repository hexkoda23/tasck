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
const DEFAULT_LLM_MODEL = "claude-sonnet-4-20250514";

const DEFAULT_TEMPLATE = {
  keywords: "brand ambassador program celebrity partnership endorsement deal influencer campaign Nigeria",
  country: "Nigeria",
  industries: ["Fashion", "Food & Beverage", "Tech", "Beauty", "Sports", "FMCG", "Telco", "Fintech"],
  campaign_types: ["brand ambassador program", "celebrity partnership", "celebrity endorsement deal", "brand partnership opportunity", "influencer campaign open application", "creator campaign"],
  recency: "past_year",
  result_limit: 10,
};

const defaultStore = () => ({
  scans: [],
  candidates: [],
  opportunities: [],
  brands: [],
  business_cases: [],
  interactions: [],
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

const errorMessage = (error, fallback = "Unknown error") => {
  if (!error) return fallback;
  if (error.message) return error.message;
  if (error.code) return error.code;
  if (error.name) return error.name;
  const text = String(error);
  return text && text !== "[object Object]" ? text : fallback;
};

const postJson = (urlString, headers, payload) => new Promise((resolve, reject) => {
  const url = new URL(urlString);
  const body = JSON.stringify(payload);
  const req = https.request({
    hostname: url.hostname,
    path: `${url.pathname}${url.search}`,
    method: "POST",
    timeout: 35000,
    headers: {
      ...headers,
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    },
  }, (res) => {
    let raw = "";
    res.on("data", (chunk) => {
      raw += chunk;
    });
    res.on("end", () => {
      try {
        const data = JSON.parse(raw || "{}");
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(data.error?.message || data.error || data.detail || `LLM returned ${res.statusCode}`));
          return;
        }
        resolve(data);
      } catch (error) {
        reject(new Error("LLM returned invalid JSON"));
      }
    });
  });
  req.on("timeout", () => req.destroy(new Error("LLM request timed out")));
  req.on("error", reject);
  req.write(body);
  req.end();
});

const llmSystemPrompt = (template) => {
  const industriesList = [...(template.industries || []), "Other"].join(", ");
  const campaignTypesList = [...(template.campaign_types || []), "marketing campaign"].join(", ");
  return `You are the TTA Brand Opportunity Scanner. Read one SerpAPI web/news result and convert it into one clean opportunity card for admin review.

CRITICAL RULES:
1. Brand name must be a REAL CONSUMER OR ENTERPRISE BRAND, not a person, government body, regulator, institution, NGO, or vague news subject. If it is not a commercial brand, return brand_name null and confidence_score below 50. Do not invent a brand.
2. If the snippet is too thin to confidently extract a brand, set confidence_score below 55 and explain why in pain_point.
3. suggested_opportunity_angle must be generative, creator-led, and in this form: "TTA could approach [brand] with [specific creator-led concept] anchored on [specific cultural moment or audience truth] - the brief would lead with [specific creative direction]."
4. Score honestly: 85-96 strong explicit brand/campaign/creator/recent signal; 70-84 clear brand with hinted campaign; 55-69 clear brand but vague campaign; below 55 non-brand, thin snippet, or non-commercial signal. No score above 90 unless every signal is unambiguous.
5. Pain point must reference the source text. Quote or paraphrase a concrete signal. Never use generic marketing language.
6. Industry must be one of: ${industriesList}. If none fit, use "Other".
7. Campaign type must be one of: ${campaignTypesList}. If none fit, use "marketing campaign".
8. detected_keywords must contain 3-7 specific source terms: brand, campaign, product, cultural moment, season, creator, audience, or KPI.
9. Tone: professional Nigerian English. Assume Nigerian cultural context. TTA matches brands to creators for cultural translation, not media buying or PR. Use Naira/NGN for money.
10. Output is JSON only. No preamble, no markdown, no code fences. If invalid, still output JSON with brand_name null, confidence_score 30, and an honest pain_point.

Return exactly this schema and no other fields:
{
  "brand_name": string or null,
  "campaign_name": string or null,
  "industry": string,
  "campaign_type": string,
  "country": "${template.country}",
  "confidence_score": integer,
  "pain_point": string,
  "suggested_opportunity_angle": string,
  "detected_keywords": array of 3-7 strings,
  "reasoning": string
}

EXAMPLES:
Strong input: Guinness Nigeria launches "Made of More" Africa campaign with Rema. Snippet says the Q4 activation is fronted by Rema and uses creator-led documentary content for 25-34 males.
Strong output: {"brand_name":"Guinness Nigeria","campaign_name":"Made of More: Africa","industry":"Beverage","campaign_type":"creator campaign","country":"${template.country}","confidence_score":92,"pain_point":"Guinness is anchoring its Q4 activation on Rema and creator-led documentary content for 25-34 males, so campaign performance depends on whether that creator format converts the stated audience.","suggested_opportunity_angle":"TTA could approach Guinness Nigeria with a Lagos-rooted supporting creator slate anchored on Detty December cultural moments - the brief would lead with extending Rema's documentary into city-specific creator stories that drive Made of More deeper into local conversation.","detected_keywords":["Guinness Nigeria","Made of More","Rema","Q4 activation","Afrobeats","documentary","25-34 male"],"reasoning":"Brand, campaign, creator, audience, and activation are all explicit, so this is a strong opportunity."}

Weak input: EFCC Chairman warns banks against marketing fraud.
Weak output: {"brand_name":null,"campaign_name":null,"industry":"Other","campaign_type":"marketing campaign","country":"${template.country}","confidence_score":28,"pain_point":"The source subject is a regulator addressing the banking sector broadly. No specific brand or campaign is named, so this is regulatory commentary, not a commercial opportunity.","suggested_opportunity_angle":"No actionable angle - this is regulatory news, not a brand activation signal. Recommend discarding this result.","detected_keywords":["EFCC","regulatory","banking sector","marketing fraud"],"reasoning":"Subject is non-commercial and no brand is available to pursue."}

Medium input: MTN Nigeria boosts Q4 marketing spend, but no specific campaign or creator partnership is announced.
Medium output: {"brand_name":"MTN Nigeria","campaign_name":null,"industry":"Telco","campaign_type":"marketing campaign","country":"${template.country}","confidence_score":68,"pain_point":"MTN has signaled increased Q4 marketing investment, but no campaign, creator, or partnership has been announced. The opportunity is real but still undefined.","suggested_opportunity_angle":"TTA could approach MTN Nigeria with a proactive 5G-tier creator campaign anchored on urban Gen Z mobile behavior - the brief would lead with culturally-led acquisition content that positions creators as the trust layer for tier upgrades.","detected_keywords":["MTN Nigeria","Q4 marketing","mobile data","5G","acquisition"],"reasoning":"Brand and marketing intent are clear, but the campaign and creator angle require assumption."}`;
};

const llmUserMessage = (item, template) => `SCAN TEMPLATE:
- Keywords used in search: ${template.keywords}
- Country: ${template.country}
- Allowed industries: ${(template.industries || []).join(", ")}
- Allowed campaign_types: ${(template.campaign_types || []).join(", ")}
- Recency window: ${template.recency}

SEARCH RESULT TO ANALYZE:
- Headline: ${item.title || ""}
- Snippet: ${item.snippet || ""}
- Source: ${item.displayed_link || item.source || domainFromUrl(item.link || "")}
- URL: ${item.link || ""}

Produce the opportunity card JSON.`;

const parseLlmJson = (text) => {
  let cleaned = String(text || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
};

const normaliseLlmCard = (card, template) => {
  const allowedIndustries = new Set([...(template.industries || []), "Other"]);
  const allowedCampaigns = new Set([...(template.campaign_types || []), "marketing campaign"]);
  const keywords = Array.isArray(card.detected_keywords) ? card.detected_keywords.filter(Boolean).map((item) => String(item).slice(0, 80)).slice(0, 7) : [];
  while (keywords.length < 3) keywords.push(card.brand_name || card.campaign_type || template.country || "low signal");
  return {
    brand_name: card.brand_name || null,
    campaign_name: card.campaign_name || null,
    industry: allowedIndustries.has(card.industry) ? card.industry : "Other",
    campaign_type: allowedCampaigns.has(card.campaign_type) ? card.campaign_type : "marketing campaign",
    country: template.country,
    confidence_score: Math.max(0, Math.min(Number.parseInt(card.confidence_score, 10) || 30, 100)),
    pain_point: String(card.pain_point || "Source context was insufficient to extract a confident brand opportunity.").slice(0, 800),
    suggested_opportunity_angle: String(card.suggested_opportunity_angle || "No actionable angle - recommend manual review before pursuing this result.").slice(0, 900),
    detected_keywords: keywords,
    reasoning: String(card.reasoning || "No model reasoning provided.").slice(0, 500),
  };
};

const callOpportunityLlm = async (item, template) => {
  const model = process.env.OPPORTUNITY_SCANNER_LLM_MODEL || DEFAULT_LLM_MODEL;
  const system = llmSystemPrompt(template);
  const user = llmUserMessage(item, template);

  if (process.env.ANTHROPIC_API_KEY) {
    const data = await postJson("https://api.anthropic.com/v1/messages", {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    }, {
      model,
      max_tokens: 700,
      temperature: 0.3,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = (data.content || []).filter((part) => part.type === "text").map((part) => part.text).join("\n");
    return normaliseLlmCard(parseLlmJson(text), template);
  }

  const customKey = process.env.OPPORTUNITY_SCANNER_LLM_API_KEY;
  const customBase = (process.env.OPPORTUNITY_SCANNER_LLM_BASE_URL || "").replace(/\/$/, "");
  const openaiKey = process.env.OPENAI_API_KEY;
  if (customKey && customBase) {
    const data = await postJson(`${customBase}/chat/completions`, {
      Authorization: `Bearer ${customKey}`,
    }, {
      model,
      temperature: 0.3,
      max_tokens: 700,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    });
    return normaliseLlmCard(parseLlmJson(data.choices?.[0]?.message?.content), template);
  }

  if (openaiKey) {
    const data = await postJson("https://api.openai.com/v1/chat/completions", {
      Authorization: `Bearer ${openaiKey}`,
    }, {
      model: process.env.OPPORTUNITY_SCANNER_LLM_MODEL || "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 700,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    });
    return normaliseLlmCard(parseLlmJson(data.choices?.[0]?.message?.content), template);
  }

  return null;
};

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
  if (["bank", "fintech", "payment", "wallet"].some((word) => lower.includes(word))) return industries.includes("Fintech") ? "Fintech" : "Other";
  if (["telco", "data", "network", "mobile", "internet"].some((word) => lower.includes(word))) {
    if (industries.includes("Telco")) return "Telco";
    return industries.includes("Tech") ? "Tech" : "Other";
  }
  if (["beer", "beverage", "drink", "coca", "lager", "food"].some((word) => lower.includes(word))) {
    if (industries.includes("Food & Beverage")) return "Food & Beverage";
    return industries.includes("FMCG") ? "FMCG" : "Other";
  }
  if (["beauty", "skincare", "fashion", "retail"].some((word) => lower.includes(word))) {
    if (industries.includes("Beauty")) return "Beauty";
    return industries.includes("Fashion") ? "Fashion" : "Other";
  }
  return "Other";
};

const inferCampaignType = (text, campaignTypes) => {
  const lower = String(text || "").toLowerCase();
  for (const campaignType of campaignTypes || []) {
    if (lower.includes(String(campaignType).toLowerCase())) return campaignType;
  }
  if (lower.includes("endorsement")) return "celebrity endorsement deal";
  if (lower.includes("ambassador")) return "brand ambassador program";
  if (lower.includes("partnership") || lower.includes("partnered")) return "celebrity partnership";
  if (lower.includes("creator") && campaignTypes.includes("creator campaign")) return "creator campaign";
  if (lower.includes("creator") || lower.includes("influencer")) {
    return campaignTypes.includes("influencer campaign open application") ? "influencer campaign open application" : "marketing campaign";
  }
  if (lower.includes("launch") || lower.includes("unveil")) return "marketing campaign";
  if (lower.includes("advert") || lower.includes("ad ") || lower.includes("advertising")) return "marketing campaign";
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
        displayed_link: item.displayed_link || item.source || "",
      });
    });
  });
  return buckets.filter((item) => item.title && item.link);
};

const candidateFromResult = (item, payload, scanId, query, llmCard = null, extractionMethod = "heuristic_fallback") => {
  const template = { ...DEFAULT_TEMPLATE, ...(payload.template || {}) };
  const text = `${item.title} ${item.snippet}`;
  let brandName = llmCard ? llmCard.brand_name : extractBrandName(item.title, item.snippet);
  let campaignName = llmCard ? llmCard.campaign_name : extractCampaignName(item.title, item.snippet, brandName || "");
  let industry = llmCard ? llmCard.industry : inferIndustry(text, template.industries);
  let campaignType = llmCard ? llmCard.campaign_type : inferCampaignType(text, template.campaign_types);
  let confidence = llmCard ? llmCard.confidence_score : scoreCandidate(text, template);
  const lowSignalFallback = !llmCard && !hasPartnershipSignal(text);
  if (lowSignalFallback) {
    brandName = null;
    campaignName = null;
    industry = "Other";
    campaignType = "marketing campaign";
    confidence = Math.min(Number(confidence) || 45, 45);
  }
  const sourceSnippet = String(item.snippet || "").slice(0, 420);
  const detectedKeywords = llmCard?.detected_keywords || [
    "brand ambassador", "celebrity partnership", "celebrity endorsement", "endorsement",
    "influencer campaign", "brand partnership", "open application", "casting call",
    "campaign", "launch", "advertising", "creator", "influencer", "Nigeria", "marketing", "brand",
  ].filter((token) =>
    text.toLowerCase().includes(token.toLowerCase())
  );
  const partnershipProfile = buildPartnershipProfile({
    brandName: brandName || "Low signal result",
    sourceUrl: item.link,
    sourceTitle: String(item.title).slice(0, 220),
    sourceSnippet,
    text,
    industry,
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
    pain_point: llmCard?.pain_point || (lowSignalFallback
      ? `Source context is too thin or non-commercial for a confident brand opportunity. Headline: ${item.title}`
      : `Public search signal suggests ${brandName || "this result"} has celebrity, ambassador, endorsement, or influencer partnership activity. Source context: ${sourceSnippet || item.title}`),
    suggested_opportunity_angle: llmCard?.suggested_opportunity_angle || (lowSignalFallback
      ? "No actionable angle - recommend discarding or manually reviewing this result before CRM acceptance."
      : `Prepare a celebrity partnership outreach angle for ${brandName || "this brand"} around ${campaignName || "this signal"}, then validate budget, decision maker, talent category, usage rights, and measurable KPI fit.`),
    source_url: item.link,
    source_domain: domainFromUrl(item.link),
    source_title: String(item.title).slice(0, 220),
    source_snippet: sourceSnippet,
    detected_keywords: detectedKeywords,
    confidence_score: confidence,
    contact_email: extractEmail(text),
    reasoning: llmCard?.reasoning || "Extracted with deterministic fallback rules.",
    extraction_method: extractionMethod,
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
      .sort((a, b) => {
        const aLow = !a.brand_name || Number(a.confidence_score || 0) < 55;
        const bLow = !b.brand_name || Number(b.confidence_score || 0) < 55;
        if (aLow !== bLow) return aLow ? 1 : -1;
        return Number(b.confidence_score || 0) - Number(a.confidence_score || 0);
      });
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
    const llmConfigured = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || (process.env.OPPORTUNITY_SCANNER_LLM_API_KEY && process.env.OPPORTUNITY_SCANNER_LLM_BASE_URL));
    const scan = {
      id: scanId,
      query,
      template,
      provider: "serpapi_google_dev_proxy",
      status: "running",
      raw_count: 0,
      candidate_count: 0,
      extraction_method: llmConfigured ? "llm" : "heuristic_fallback",
      fallback_count: 0,
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
      let llmAttempts = 0;
      let llmFailures = 0;
      let fallbackCount = 0;
      for (const item of items) {
        let llmCard = null;
        let extractionMethod = "heuristic_fallback";
        if (llmConfigured) {
          llmAttempts += 1;
          try {
            llmCard = await callOpportunityLlm(item, template);
            if (llmCard) extractionMethod = "llm";
          } catch (error) {
            llmFailures += 1;
          }
        }
        if (!llmCard) fallbackCount += 1;
        const candidate = candidateFromResult(item, { ...payload, template }, scanId, query, llmCard, extractionMethod);
        const exists = nextStore.candidates.some((existing) =>
          existing.source_url === candidate.source_url || existing.dedupe_key === candidate.dedupe_key
        );
        if (!exists) {
          nextStore.candidates.push(candidate);
          candidates.push(candidate);
        }
      }
      let extractionMethod = "llm";
      if (!llmConfigured) extractionMethod = "heuristic_fallback";
      else if (llmAttempts && llmFailures / Math.max(llmAttempts, 1) > 0.5) extractionMethod = "heuristic_fallback";
      else if (fallbackCount) extractionMethod = "mixed_llm_heuristic";
      const completedScan = { ...scan, status: "completed", raw_count: items.length, candidate_count: candidates.length, extraction_method: extractionMethod, fallback_count: fallbackCount, completed_at: nowIso() };
      nextStore.scans = nextStore.scans.map((item) => (item.id === scanId ? completedScan : item));
      writeStore(nextStore);
      res.json({ scan: completedScan, candidates });
    } catch (error) {
      const failedStore = readStore();
      const failedScan = { ...scan, status: "failed", error: `SerpAPI scan failed: ${errorMessage(error, "Unable to reach SerpAPI from the local scanner proxy.")}` };
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
        industry: candidate.industry || "Other",
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

    let businessCase = store.business_cases.find((item) => item.connect?.source_candidate_id === candidate.id);
    if (!businessCase) {
      const businessCaseId = makeId("bc");
      const detectedKeywords = candidate.detected_keywords || [];
      businessCase = {
        id: businessCaseId,
        brand_id: brand.id,
        creator_id: null,
        title: candidate.campaign_name || `${brand.company} creator partnership opportunity`,
        stage: "connect",
        engagement_track: "paid",
        estimated_value: opportunity.estimated_value,
        rm_id: req.body?.reviewed_by || "admin",
        created_at: nowIso(),
        days_in_stage: 0,
        next_action: "Schedule connector call and validate marketing focus, target audience, channels, and KPIs.",
        health: "new",
        scope_creep_locked: false,
        connect: {
          source: "serpapi_opportunity_scanner_dev_proxy",
          source_candidate_id: candidate.id,
          source_opportunity_id: opportunity.id,
          source_url: candidate.source_url,
          source_title: candidate.source_title,
          connect_status: "new_lead",
          stated_intent: candidate.pain_point || "",
          marketing_intelligence: {
            key_marketing_focus: candidate.suggested_opportunity_angle || candidate.pain_point || "",
            primary_target_audience: "To confirm during connector call.",
            key_marketing_channels: [],
            marketing_kpis: [],
            detected_keywords: detectedKeywords,
            confidence_score: candidate.confidence_score || 65,
            reasoning: candidate.reasoning || "",
            generated_at: nowIso(),
            source: candidate.extraction_method || "opportunity_scanner",
          },
        },
        frame: {},
        plan: {},
        deliver: {},
        closure: {},
        timeline: [
          { at: nowIso(), event: "scanner_candidate_accepted", candidate_id: candidate.id, actor: req.body?.reviewed_by || "admin" },
          { at: nowIso(), event: "business_case_created", actor: req.body?.reviewed_by || "admin" },
        ],
        updated_at: nowIso(),
      };
      store.business_cases.push(businessCase);
      store.interactions.push({
        id: makeId("int"),
        brand_id: brand.id,
        business_case_id: businessCaseId,
        type: "note",
        title: "Opportunity scanner source article",
        author: "Opportunity Scanner",
        date_iso: nowIso(),
        content: [
          `Source title: ${candidate.source_title || "Scanned source article"}`,
          `Source URL: ${candidate.source_url || ""}`,
          "",
          `Pain point: ${candidate.pain_point || ""}`,
          "",
          `Suggested angle: ${candidate.suggested_opportunity_angle || ""}`,
          "",
          `Detected keywords: ${detectedKeywords.join(", ")}`,
          `Reasoning: ${candidate.reasoning || ""}`,
        ].join("\n"),
      });
    }

    opportunity.business_case_id = businessCase.id;
    Object.assign(candidate, {
      status: "accepted",
      reviewed_at: nowIso(),
      reviewed_by: req.body?.reviewed_by || "admin",
      accepted_brand_id: brand.id,
      opportunity_id: opportunity.id,
      business_case_id: businessCase.id,
    });
    writeStore(store);
    res.json({ candidate, brand, account: { status: "dev_proxy_logged", brand_id: brand.id }, opportunity, business_case: businessCase });
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
