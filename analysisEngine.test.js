import test from "node:test";
import assert from "node:assert/strict";
import { analyzeDeal } from "../src/analysisEngine.js";

const thesis = {
  fundName: "Apex",
  minTicket: 25,
  maxTicket: 200,
  minEbitda: 5,
  targetMargin: 20,
  minRev: 15,
  holdPeriod: 5,
  sectors: ["technology", "saas"],
  geos: ["north-america"]
};

test("extracts metrics and scores a strong software mandate fit", () => {
  const result = analyzeDeal({
    thesis,
    dealText: `Company: TechFlow SaaS
      Sector: B2B Software workflow automation
      Geography: North America
      Revenue: $28M ARR, revenue growth 45% YoY
      EBITDA: $6.2M, EBITDA margin 22%
      NRR: 118%, recurring revenue 92%, largest customer 9%
      Ask: $40M equity check, Enterprise Value: $180M`
  });

  assert.equal(result.companyName, "TechFlow SaaS");
  assert.equal(result.metrics.revenue, "$28M");
  assert.equal(result.metrics.ebitda, "$6.2M");
  assert.equal(result.metrics.evEbitda, "29x");
  assert.ok(result.thesisScore >= 65);
  assert.ok(result.redFlags.some((flag) => flag.flag === "Rich entry valuation"));
});

test("penalizes poor mandate fit and missing profitability", () => {
  const result = analyzeDeal({
    thesis,
    dealText: `Company: RetailCo
      Sector: Consumer retail
      Geography: LatAm
      Revenue: $8M
      EBITDA: $0M
      Revenue growth: 3%
      Largest customer: 35%
      Enterprise Value: $90M`
  });

  assert.equal(result.verdict, "Does Not Fit");
  assert.ok(result.thesisScore < 52);
  assert.ok(result.redFlags.some((flag) => flag.flag === "Customer concentration"));
});
