const SECTOR_ALIASES = {
  technology: ["technology", "software", "saas", "cloud", "platform", "workflow", "data", "ai"],
  healthcare: ["healthcare", "health care", "medtech", "medical", "pharma", "provider"],
  industrials: ["industrial", "manufacturing", "logistics", "automation", "equipment"],
  "business-services": ["business services", "professional services", "outsourcing", "consulting"],
  consumer: ["consumer", "retail", "ecommerce", "e-commerce", "brand"],
  fintech: ["fintech", "payments", "banking", "lending", "insurance"],
  saas: ["saas", "software", "subscription", "arr", "cloud"],
  media: ["media", "content", "advertising", "publisher"],
  energy: ["energy", "cleantech", "clean tech", "solar", "battery", "renewable"],
  "real-estate": ["real estate", "property", "proptech", "multifamily"]
};

const GEO_ALIASES = {
  "north-america": ["north america", "united states", "u.s.", "us ", "usa", "canada"],
  "western-europe": ["western europe", "uk", "united kingdom", "france", "spain", "italy", "benelux"],
  nordics: ["nordic", "sweden", "norway", "denmark", "finland"],
  dach: ["dach", "germany", "austria", "switzerland"],
  apac: ["apac", "india", "singapore", "australia", "japan", "asia"],
  latam: ["latam", "latin america", "brazil", "mexico", "chile"],
  "middle-east": ["middle east", "uae", "saudi", "qatar", "israel"]
};

const SCORE_WEIGHTS = {
  mandateFit: 30,
  financialQuality: 35,
  riskProfile: 20,
  returnPotential: 15
};

function normalizeText(text = "") {
  return String(text).replace(/\s+/g, " ").trim();
}

function lower(text = "") {
  return normalizeText(text).toLowerCase();
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

function parseAmountToMillions(rawNumber, unit = "") {
  if (!rawNumber) return null;
  const value = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const unitText = unit.toLowerCase();
  if (unitText.includes("b")) return value * 1000;
  if (unitText.includes("k")) return value / 1000;
  return value;
}

function extractMoneyMetric(text, labels) {
  const labelPattern = labels.join("|");
  const match = firstMatch(text, [
    new RegExp(`(?:${labelPattern})\\s*(?:of|:|=|is|was|at)?\\s*(?:\\$|usd)?\\s*([0-9][0-9,.]*)\\s*(m|mm|million|b|bn|billion|k)?`, "i"),
    new RegExp(`(?:\\$|usd)\\s*([0-9][0-9,.]*)\\s*(m|mm|million|b|bn|billion|k)?\\s*(?:of\\s*)?(?:${labelPattern})`, "i")
  ]);
  return match ? parseAmountToMillions(match[1], match[2]) : null;
}

function extractPercentMetric(text, labels) {
  const labelPattern = labels.join("|");
  const match = firstMatch(text, [
    new RegExp(`(?:${labelPattern})\\s*(?:of|:|=|is|was|at)?\\s*([0-9][0-9,.]*)\\s*%`, "i"),
    new RegExp(`([0-9][0-9,.]*)\\s*%\\s*(?:${labelPattern})`, "i")
  ]);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function extractMultiple(text, labels) {
  const labelPattern = labels.join("|");
  const match = firstMatch(text, [
    new RegExp(`(?:${labelPattern})\\s*(?:of|:|=|is|was|at)?\\s*([0-9][0-9,.]*)\\s*x`, "i"),
    new RegExp(`([0-9][0-9,.]*)\\s*x\\s*(?:${labelPattern})`, "i")
  ]);
  if (!match) return null;
  const value = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(value) ? value : null;
}

function extractCompanyName(rawText) {
  const text = normalizeText(rawText);
  const explicit = firstMatch(text, [
    /(?:company|target|business)\s*(?:name)?\s*[:=-]\s*([A-Z][A-Za-z0-9&.,' -]{2,70})/i,
    /(?:investment opportunity|opportunity)\s*[:=-]\s*([A-Z][A-Za-z0-9&.,' -]{2,70})/i
  ]);
  if (explicit) return explicit[1].replace(/\s+(sector|revenue|ebitda|geography).*$/i, "").trim();
  const firstLine = String(rawText).split(/\r?\n/).map((x) => x.trim()).find(Boolean);
  return firstLine && firstLine.length < 80 ? firstLine.replace(/^company\s*:\s*/i, "") : "Unnamed Deal";
}

function detectFromAliases(text, aliases) {
  const haystack = lower(text);
  return Object.entries(aliases)
    .filter(([, terms]) => terms.some((term) => haystack.includes(term)))
    .map(([key]) => key);
}

function humanizeToken(token) {
  return token
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function extractMetrics(rawText) {
  const text = normalizeText(rawText);
  const revenue = extractMoneyMetric(text, ["revenue", "arr", "sales", "turnover"]);
  const ebitda = extractMoneyMetric(text, ["adjusted ebitda", "ebitda"]);
  const ev = extractMoneyMetric(text, ["enterprise value", "ev", "valuation"]);
  const ticketSize = extractMoneyMetric(text, ["equity check", "ticket", "ask", "investment size", "raise"]);
  const revenueGrowth = extractPercentMetric(text, ["revenue growth", "growth", "yoy", "year over year"]);
  const ebitdaMarginFromText = extractPercentMetric(text, ["ebitda margin", "margin"]);
  const nrr = extractPercentMetric(text, ["nrr", "net revenue retention", "net dollar retention", "ndr"]);
  const recurringRevenue = extractPercentMetric(text, ["recurring revenue", "subscription revenue"]);
  const grossMargin = extractPercentMetric(text, ["gross margin"]);
  const customerConcentration = extractPercentMetric(text, ["largest customer", "top customer", "customer concentration", "single customer"]);
  const churn = extractPercentMetric(text, ["churn", "logo churn", "revenue churn"]);
  const debt = extractMoneyMetric(text, ["net debt", "debt"]);
  const freeCashFlow = extractMoneyMetric(text, ["free cash flow", "fcf", "unlevered free cash flow"]);
  const capex = extractMoneyMetric(text, ["capex", "capital expenditure", "capital expenditures"]);
  const evEbitdaFromText = extractMultiple(text, ["ev\\/ebitda", "ev to ebitda", "entry multiple", "valuation multiple"]);
  const ebitdaMargin = ebitdaMarginFromText ?? (revenue && ebitda ? (ebitda / revenue) * 100 : null);
  const evEbitda = evEbitdaFromText ?? (ev && ebitda ? ev / ebitda : null);
  const evRevenue = ev && revenue ? ev / revenue : null;
  const netDebtEbitda = debt && ebitda ? debt / ebitda : null;
  const fcfConversion = freeCashFlow && ebitda ? (freeCashFlow / ebitda) * 100 : null;

  return {
    revenue,
    ebitda,
    ebitdaMargin,
    revenueGrowth,
    ev,
    evEbitda,
    ticketSize,
    nrr,
    recurringRevenue,
    grossMargin,
    customerConcentration,
    churn,
    debt,
    freeCashFlow,
    capex,
    evRevenue,
    netDebtEbitda,
    fcfConversion
  };
}

function scoreRange(value, min, good, excellent) {
  if (value == null) return 45;
  if (value < min) return clamp((value / min) * 50);
  if (value < good) return 55 + ((value - min) / (good - min)) * 20;
  if (value < excellent) return 75 + ((value - good) / (excellent - good)) * 15;
  return 95;
}

function check(label, condition, note) {
  let status = "partial";
  if (condition === true) status = "pass";
  if (condition === false) status = "fail";
  return { label, status, note };
}

function flag(severity, flagText, detail) {
  return { severity, flag: flagText, detail };
}

function averageStatus(checks) {
  const values = checks.map((item) => ({ pass: 100, partial: 60, fail: 25 }[item.status]));
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function evaluateMandate(thesis, detectedSectors, detectedGeos, metrics) {
  const selectedSectors = thesis.sectors || [];
  const selectedGeos = thesis.geos || [];
  const sectorFit = !selectedSectors.length || detectedSectors.some((s) => selectedSectors.includes(s));
  const geoFit = !selectedGeos.length || detectedGeos.some((g) => selectedGeos.includes(g));
  const minTicket = asNumber(thesis.minTicket);
  const maxTicket = asNumber(thesis.maxTicket);
  const minRevenue = asNumber(thesis.minRev);
  const minEbitda = asNumber(thesis.minEbitda);
  const ticketFit = metrics.ticketSize == null || (metrics.ticketSize >= minTicket && metrics.ticketSize <= maxTicket);
  const revenueFit = metrics.revenue == null ? null : metrics.revenue >= minRevenue;
  const ebitdaFit = metrics.ebitda == null ? null : metrics.ebitda >= minEbitda;

  const ticketNote = metrics.ticketSize == null
    ? "Ticket size not disclosed"
    : `$${fmt(metrics.ticketSize)}M versus $${minTicket}M-$${maxTicket}M mandate`;
  const revenueNote = metrics.revenue == null
    ? "Revenue not disclosed"
    : `$${fmt(metrics.revenue)}M versus $${minRevenue}M minimum`;
  const ebitdaNote = metrics.ebitda == null
    ? "EBITDA not disclosed"
    : `$${fmt(metrics.ebitda)}M versus $${minEbitda}M minimum`;

  const checks = [
    check("Sector mandate", sectorFit, detectedSectors.length ? `Detected ${detectedSectors.map(humanizeToken).join(", ")}` : "No sector found in source text"),
    check("Geography mandate", geoFit, detectedGeos.length ? `Detected ${detectedGeos.map(humanizeToken).join(", ")}` : "No geography found in source text"),
    check("Ticket size", ticketFit, ticketNote),
    check("Minimum revenue", revenueFit, revenueNote),
    check("Minimum EBITDA", ebitdaFit, ebitdaNote)
  ];

  return { score: averageStatus(checks), checks };
}

function evaluateFinancialQuality(thesis, metrics) {
  const targetMargin = asNumber(thesis.targetMargin);
  const revenueScore = scoreRange(metrics.revenue, asNumber(thesis.minRev), asNumber(thesis.minRev) * 2, asNumber(thesis.minRev) * 5);
  const ebitdaScore = scoreRange(metrics.ebitda, asNumber(thesis.minEbitda), asNumber(thesis.minEbitda) * 2, asNumber(thesis.minEbitda) * 4);
  const marginScore = scoreRange(metrics.ebitdaMargin, Math.max(1, targetMargin * 0.7), targetMargin, targetMargin * 1.4);
  const growthScore = scoreRange(metrics.revenueGrowth, 5, 15, 35);
  const scores = [revenueScore, ebitdaScore, marginScore, growthScore];
  if (metrics.nrr != null) scores.push(scoreRange(metrics.nrr, 95, 110, 125));
  if (metrics.recurringRevenue != null) scores.push(scoreRange(metrics.recurringRevenue, 40, 60, 85));
  if (metrics.grossMargin != null) scores.push(scoreRange(metrics.grossMargin, 40, 60, 80));
  if (metrics.fcfConversion != null) scores.push(scoreRange(metrics.fcfConversion, 35, 60, 85));
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function evaluateRisk(metrics, text) {
  let score = 82;
  const flags = [];
  const raw = lower(text);

  if (metrics.customerConcentration != null && metrics.customerConcentration > 15) {
    const severity = metrics.customerConcentration > 30 ? "high" : "medium";
    flags.push(flag(severity, "Customer concentration", `Largest customer appears to represent ${fmt(metrics.customerConcentration)}% of revenue.`));
    score -= metrics.customerConcentration > 30 ? 25 : 14;
  }
  if (metrics.churn != null && metrics.churn > 10) {
    flags.push(flag(metrics.churn > 20 ? "high" : "medium", "Elevated churn", `Churn of ${fmt(metrics.churn)}% needs cohort and retention diligence.`));
    score -= metrics.churn > 20 ? 22 : 12;
  }
  if (metrics.ebitda != null && metrics.ebitda <= 0) {
    flags.push(flag("high", "No positive EBITDA", "The target does not appear EBITDA-positive based on supplied data."));
    score -= 28;
  }
  if (metrics.netDebtEbitda != null && metrics.netDebtEbitda > 4) {
    flags.push(flag("medium", "High leverage", `Net debt is roughly ${fmt(metrics.netDebtEbitda)}x EBITDA.`));
    score -= 15;
  }
  if (metrics.evEbitda != null && metrics.evEbitda > 18) {
    flags.push(flag("medium", "Rich entry valuation", `Entry valuation of ${fmt(metrics.evEbitda)}x EBITDA leaves less room for multiple compression.`));
    score -= 12;
  }
  if (raw.includes("declin") || raw.includes("litigation") || raw.includes("regulatory investigation")) {
    flags.push(flag("medium", "Qualitative diligence issue", "Source text contains negative operating, legal, or regulatory language."));
    score -= 10;
  }
  const missingCoreMetrics = [
    ["Revenue", metrics.revenue],
    ["EBITDA", metrics.ebitda],
    ["Enterprise value", metrics.ev],
    ["Growth", metrics.revenueGrowth]
  ].filter(([, value]) => value == null).map(([label]) => label);
  if (missingCoreMetrics.length) {
    flags.push(flag("low", "Incomplete source data", `Missing or unparsed fields: ${missingCoreMetrics.join(", ")}.`));
    score -= Math.min(12, missingCoreMetrics.length * 3);
  }
  if (!flags.length) {
    flags.push(flag("low", "Limited red flags disclosed", "No major red flags were extracted, but this depends on completeness of supplied materials."));
  }

  return { score: clamp(score), flags };
}

function evaluateReturnPotential(metrics, thesis) {
  const holdPeriod = Math.max(1, asNumber(thesis.holdPeriod, 5));
  const entryMultiple = metrics.evEbitda ?? 10;
  const annualGrowth = (metrics.revenueGrowth ?? 12) / 100;
  const margin = metrics.ebitdaMargin ?? asNumber(thesis.targetMargin, 20);
  const startingEbitda = metrics.ebitda ?? (metrics.revenue ? metrics.revenue * margin / 100 : null);
  const exitMultiple = Math.max(6, Math.min(entryMultiple, 14));

  if (!startingEbitda || !metrics.ev) {
    return {
      score: 55,
      assumptions: {
        entryMultiple,
        exitMultiple,
        holdPeriod,
        estimatedMoic: null,
        estimatedIrr: null,
        discountRate: 0.16,
        presentExitValue: null,
        valueCreation: null
      }
    };
  }

  const exitEbitda = startingEbitda * Math.pow(1 + annualGrowth, holdPeriod);
  const exitEv = exitEbitda * exitMultiple;
  const estimatedMoic = exitEv / metrics.ev;
  const estimatedIrr = (Math.pow(estimatedMoic, 1 / holdPeriod) - 1) * 100;
  const discountRate = 0.16;
  const presentExitValue = exitEv / Math.pow(1 + discountRate, holdPeriod);
  const valueCreation = exitEv - metrics.ev;
  return {
    score: scoreRange(estimatedIrr, 10, 18, 28),
    assumptions: { entryMultiple, exitMultiple, holdPeriod, estimatedMoic, estimatedIrr, discountRate, presentExitValue, valueCreation }
  };
}

function fmt(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "N/A";
  return Number(value).toFixed(Math.abs(value) >= 100 ? 0 : digits).replace(/\.0$/, "");
}

function money(value) {
  return value == null ? "N/A" : `$${fmt(value)}M`;
}

function percent(value) {
  return value == null ? "N/A" : `${fmt(value)}%`;
}

function multiple(value) {
  return value == null ? "N/A" : `${fmt(value)}x`;
}

function verdict(score) {
  if (score >= 75) return "Strong Fit";
  if (score >= 52) return "Conditional Fit";
  return "Does Not Fit";
}

function buildMemo(companyName, metrics, sectors, geos, score, returnCase, risks) {
  const company = companyName || "the target";
  const sector = sectors[0] ? humanizeToken(sectors[0]) : "the stated sector";
  const geo = geos[0] ? humanizeToken(geos[0]) : "the stated geography";
  const returnLine = returnCase.assumptions.estimatedIrr == null
    ? "Return potential could not be fully underwritten because entry EV or EBITDA was not disclosed."
    : `Base case implies about ${fmt(returnCase.assumptions.estimatedMoic)}x MOIC and ${fmt(returnCase.assumptions.estimatedIrr)}% IRR before leverage, fees, taxes, and transaction costs.`;

  return {
    situation: `${company} is presented as a ${sector} opportunity in ${geo}. Extracted metrics show revenue of ${money(metrics.revenue)}, EBITDA of ${money(metrics.ebitda)}, EBITDA margin of ${percent(metrics.ebitdaMargin)}, and revenue growth of ${percent(metrics.revenueGrowth)}.`,
    opportunity: `The deal is most attractive where the source data supports scale, EBITDA quality, recurring revenue, and retention. ${returnLine}`,
    risks: risks.map((item) => `${item.flag}: ${item.detail}`).slice(0, 5),
    recommendation: score >= 75
      ? "Proceed to confirmatory diligence with focus on quality of earnings, customer cohorts, revenue durability, and purchase price discipline."
      : score >= 52
        ? "Advance only if diligence can resolve the identified gaps and valuation can be adjusted for risk."
        : "Do not prioritize unless new information materially improves mandate fit, financial quality, or valuation.",
    nextSteps: [
      "Request QoE, monthly revenue bridge, cohort retention, customer concentration, and working capital detail.",
      "Rebuild a 5-year operating case with downside, base, and upside scenarios.",
      "Validate entry valuation against public comps, precedent transactions, and sponsor return thresholds."
    ]
  };
}

export function analyzeDeal(payload = {}) {
  const thesis = payload.thesis || {};
  const dealText = normalizeText(payload.dealText || "");
  if (dealText.length < 20) throw new Error("Please provide more deal detail before running analysis.");

  const companyName = extractCompanyName(payload.dealText || "");
  const metrics = extractMetrics(dealText);
  const sectors = detectFromAliases(dealText, SECTOR_ALIASES);
  const geos = detectFromAliases(dealText, GEO_ALIASES);
  const mandate = evaluateMandate(thesis, sectors, geos, metrics);
  const financialQuality = evaluateFinancialQuality(thesis, metrics);
  const riskProfile = evaluateRisk(metrics, dealText);
  const returnPotential = evaluateReturnPotential(metrics, thesis);

  const weightedScore = Math.round(
    mandate.score * SCORE_WEIGHTS.mandateFit / 100 +
    financialQuality * SCORE_WEIGHTS.financialQuality / 100 +
    riskProfile.score * SCORE_WEIGHTS.riskProfile / 100 +
    returnPotential.score * SCORE_WEIGHTS.returnPotential / 100
  );

  const score = clamp(weightedScore);
  const resultVerdict = verdict(score);
  const memo = buildMemo(companyName, metrics, sectors, geos, score, returnPotential, riskProfile.flags);

  return {
    companyName,
    sector: sectors.length ? sectors.map(humanizeToken).join(", ") : "N/A",
    geography: geos.length ? geos.map(humanizeToken).join(", ") : "N/A",
    thesisScore: score,
    verdict: resultVerdict,
    verdictSummary: `${resultVerdict}: score reflects mandate fit, financial quality, risk profile, and a simplified unlevered return case. Treat this as a first-pass screen, not a substitute for QoE, legal, tax, market, and model diligence.`,
    metrics: {
      revenue: money(metrics.revenue),
      ebitda: money(metrics.ebitda),
      ebitdaMargin: percent(metrics.ebitdaMargin),
      growth: percent(metrics.revenueGrowth),
      ev: money(metrics.ev),
      evEbitda: multiple(metrics.evEbitda),
      evRevenue: multiple(metrics.evRevenue),
      ticketSize: money(metrics.ticketSize),
      nrr: percent(metrics.nrr),
      recurringRevenue: percent(metrics.recurringRevenue),
      grossMargin: percent(metrics.grossMargin),
      customerConcentration: percent(metrics.customerConcentration),
      netDebtEbitda: multiple(metrics.netDebtEbitda),
      fcfConversion: percent(metrics.fcfConversion)
    },
    analytics: {
      scoreBreakdown: {
        mandateFit: mandate.score,
        financialQuality,
        riskProfile: riskProfile.score,
        returnPotential: Math.round(returnPotential.score)
      },
      returnCase: {
        entryMultiple: multiple(returnPotential.assumptions.entryMultiple),
        exitMultiple: multiple(returnPotential.assumptions.exitMultiple),
        holdPeriod: `${returnPotential.assumptions.holdPeriod} years`,
        estimatedMoic: returnPotential.assumptions.estimatedMoic == null ? "N/A" : `${fmt(returnPotential.assumptions.estimatedMoic)}x`,
        estimatedIrr: returnPotential.assumptions.estimatedIrr == null ? "N/A" : percent(returnPotential.assumptions.estimatedIrr),
        discountRate: returnPotential.assumptions.discountRate == null ? "N/A" : percent(returnPotential.assumptions.discountRate * 100),
        presentExitValue: returnPotential.assumptions.presentExitValue == null ? "N/A" : money(returnPotential.assumptions.presentExitValue),
        valueCreation: returnPotential.assumptions.valueCreation == null ? "N/A" : money(returnPotential.assumptions.valueCreation)
      }
    },
    thesisChecks: mandate.checks,
    redFlags: riskProfile.flags,
    memo
  };
}
