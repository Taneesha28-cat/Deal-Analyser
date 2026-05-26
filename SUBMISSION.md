# Deal Compass: AI Private Equity Deal Screening Tool

## Assignment Fit

The assignment asks for an innovative AI-based tool that improves efficiency across the private equity investment lifecycle. Deal Compass addresses deal screening, early due diligence, valuation triage, and investment committee preparation.

## Practical Industry Problem

Private equity teams review many CIMs, teasers, and pitch decks before deciding which opportunities deserve deeper diligence. Early screening is repetitive, document-heavy, and prone to inconsistent judgment across analysts.

## Solution

Deal Compass lets a PE investor define a fund mandate, upload or paste deal materials, and receive a structured first-pass investment screen.

Core workflow:

1. Configure fund mandate: strategy, ticket size, minimum revenue, minimum EBITDA, target margin, sectors, geographies, and custom thesis criteria.
2. Upload deal material: PDF or TXT, or paste CIM/deal excerpts.
3. Backend extracts and analyzes financial metrics.
4. App returns thesis score, valuation indicators, red flags, return case, and IC memo draft.

## Backend Logic

The backend performs deterministic financial analysis rather than relying only on generic text summarization.

It extracts or derives:

- Revenue
- EBITDA
- EBITDA margin
- Revenue growth
- Enterprise value
- EV/EBITDA
- EV/revenue
- Ticket size
- Net revenue retention
- Recurring revenue
- Gross margin
- Customer concentration
- Net debt/EBITDA
- FCF conversion
- Estimated MOIC and IRR

The scoring model weights:

- Mandate fit
- Financial quality
- Risk profile
- Return potential

## Financial Methodology

The model follows common private-company valuation and PE screening practices:

- Market approach: EV/EBITDA and EV/revenue checks
- Income/return approach: simplified exit-value, MOIC, and IRR case
- Quality of earnings awareness: EBITDA, margin, FCF conversion, and leverage checks
- Risk screening: concentration, churn, missing data, valuation, leverage, and qualitative red flags

This is a first-pass screening tool, not a replacement for full diligence, QoE, legal review, tax work, commercial diligence, or a complete LBO model.

## Potential Impact

Deal Compass can reduce manual first-review time, create consistent analyst screening outputs, highlight missing diligence items, and help investment teams prepare cleaner IC discussion materials faster.
