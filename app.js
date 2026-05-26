let uploadedText = "";
let uploadedPdfBase64 = "";
let uploadedFileName = "";
let analysisResult = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function goToStep(step) {
  $$(".panel").forEach((panel) => panel.classList.remove("active"));
  $$(".step-pill").forEach((pill) => pill.classList.remove("active"));
  $(`#panel-${step}`).classList.add("active");
  $(`#nav-${step}`).classList.add("active");
  for (let i = 1; i < step; i += 1) $(`#nav-${i}`).classList.add("done");
}

function getThesisConfig() {
  return {
    fundName: $("#fund-name").value || "Your Fund",
    strategy: $("#strategy").value,
    minTicket: $("#min-ticket").value,
    maxTicket: $("#max-ticket").value,
    minEbitda: $("#min-ebitda").value,
    targetMargin: $("#target-margin").value,
    minRev: $("#min-rev").value,
    holdPeriod: $("#hold-period").value,
    sectors: $$("#sectors .tag.selected").map((tag) => tag.dataset.val),
    geos: $$("#geos .tag.selected").map((tag) => tag.dataset.val),
    extraCriteria: $("#thesis-extra").value
  };
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function scoreColor(score) {
  if (score >= 75) return "#4caf7d";
  if (score >= 52) return "#e8a842";
  return "#e05c5c";
}

async function handleTextFile(file) {
  if (!file) return;
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isText = file.type.includes("text") || file.name.toLowerCase().endsWith(".txt");

  if (!isPdf && !isText) {
    showError("Please upload a PDF or TXT file.");
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showError("Please upload a file under 15MB for this local prototype.");
    return;
  }

  uploadedFileName = file.name;
  uploadedPdfBase64 = "";
  uploadedText = "";

  if (isPdf) {
    const dataUrl = await readFileAsDataUrl(file);
    uploadedPdfBase64 = dataUrl.split(",")[1] || "";
    showStatus("PDF loaded. Add optional notes below, then run analysis.");
  } else {
    uploadedText = await file.text();
    $("#deal-text").value = uploadedText;
    $("#upload-error").hidden = true;
  }

  $("#upload-zone").classList.add("has-file");
  $("#file-name-display").style.display = "block";
  $("#file-name-display").textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function showError(message) {
  const error = $("#upload-error");
  error.hidden = false;
  error.classList.remove("status-msg");
  error.textContent = message;
}

function showStatus(message) {
  const status = $("#upload-error");
  status.hidden = false;
  status.classList.add("status-msg");
  status.textContent = message;
}

async function runAnalysis() {
  const dealText = $("#deal-text").value.trim() || uploadedText.trim();
  if (!dealText && !uploadedPdfBase64) {
    showError("Please paste deal information or upload a PDF/TXT file to continue.");
    return;
  }

  $("#upload-error").hidden = true;
  $("#analyze-btn").disabled = true;
  $("#analyze-btn").textContent = "Analyzing...";
  $("#results-view").innerHTML = "";
  $("#loading-view").hidden = false;
  goToStep(3);

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        thesis: getThesisConfig(),
        dealText,
        pdfBase64: uploadedPdfBase64,
        fileName: uploadedFileName
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Analysis failed");
    analysisResult = data;
    renderResults(data);
  } catch (error) {
    $("#results-view").innerHTML = `<div class="error-msg">${escapeHtml(error.message)}</div>`;
  } finally {
    $("#loading-view").hidden = true;
    $("#analyze-btn").disabled = false;
    $("#analyze-btn").textContent = "Run Thesis Analysis";
  }
}

function renderMetricRows(metrics) {
  const labels = {
    revenue: "Revenue",
    ebitda: "EBITDA",
    ebitdaMargin: "EBITDA Margin",
    growth: "Revenue Growth",
    ev: "Enterprise Value",
    evEbitda: "EV / EBITDA",
    evRevenue: "EV / Revenue",
    ticketSize: "Ticket Size",
    nrr: "Net Revenue Retention",
    recurringRevenue: "Recurring Revenue",
    grossMargin: "Gross Margin",
    customerConcentration: "Customer Concentration",
    netDebtEbitda: "Net Debt / EBITDA",
    fcfConversion: "FCF Conversion"
  };
  return Object.entries(metrics).map(([key, value]) => `
    <div class="metric-row">
      <span class="metric-label">${labels[key] || escapeHtml(key)}</span>
      <span class="metric-val">${escapeHtml(value)}</span>
    </div>`).join("");
}

function titleFromKey(key) {
  return key.replace(/[A-Z]/g, " $&").replace(/^./, (char) => char.toUpperCase());
}

function renderResults(result) {
  const color = scoreColor(result.thesisScore);
  const circumference = 2 * Math.PI * 38;
  const dashOffset = circumference - (result.thesisScore / 100) * circumference;
  const verdictClass = result.verdict === "Strong Fit" ? "verdict-strong" : result.verdict === "Does Not Fit" ? "verdict-weak" : "verdict-mixed";
  const checkLabel = { pass: "Pass", fail: "Fail", partial: "Partial" };

  const checksHtml = result.thesisChecks.map((check) => `
    <div class="thesis-check">
      <span class="thesis-check-label" title="${escapeHtml(check.note)}">${escapeHtml(check.label)}</span>
      <span class="${check.status === "pass" ? "check-pass" : check.status === "fail" ? "check-fail" : "check-neutral"}">${checkLabel[check.status]}</span>
    </div>`).join("");

  const flagsHtml = result.redFlags.map((flag) => `
    <div class="flag-item">
      <span class="flag-icon sev-${escapeHtml(flag.severity)}">▲</span>
      <div>
        <div class="flag-sev sev-${escapeHtml(flag.severity)}">${escapeHtml(flag.severity)}</div>
        <div class="flag-text"><strong>${escapeHtml(flag.flag)}</strong>: ${escapeHtml(flag.detail)}</div>
      </div>
    </div>`).join("");

  const breakdownHtml = Object.entries(result.analytics.scoreBreakdown).map(([key, value]) => `
    <div class="breakdown-row">
      <span class="breakdown-label">${escapeHtml(titleFromKey(key))}</span>
      <span class="breakdown-val">${escapeHtml(value)}/100</span>
    </div>`).join("");

  const returnCaseHtml = Object.entries(result.analytics.returnCase).map(([key, value]) => `
    <div class="breakdown-row">
      <span class="breakdown-label">${escapeHtml(titleFromKey(key))}</span>
      <span class="breakdown-val">${escapeHtml(value)}</span>
    </div>`).join("");

  $("#results-view").innerHTML = `
    <div class="result-header">
      <div>
        <h1 class="panel-title">${escapeHtml(result.companyName)}</h1>
        <div class="result-kicker">${escapeHtml(result.sector)} | ${escapeHtml(result.geography)}</div>
      </div>
      <button class="btn btn-ghost" type="button" id="copy-memo">Copy IC Memo</button>
    </div>

    <section class="score-hero">
      <div class="score-ring">
        <svg viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r="38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="6"></circle>
          <circle cx="44" cy="44" r="38" fill="none" stroke="${color}" stroke-width="6" stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}" stroke-linecap="round"></circle>
        </svg>
        <div class="score-num" style="color:${color}">${escapeHtml(result.thesisScore)}</div>
      </div>
      <div>
        <div class="verdict-badge ${verdictClass}">${escapeHtml(result.verdict)}</div>
        <div class="score-verdict">${escapeHtml(result.companyName)}</div>
        <div class="score-brief">${escapeHtml(result.verdictSummary)}</div>
      </div>
    </section>

    <section class="results-grid">
      <div class="result-card">
        <h2>Key Metrics</h2>
        ${renderMetricRows(result.metrics)}
      </div>
      <div class="result-card">
        <h2>Thesis Checks</h2>
        ${checksHtml}
      </div>
      <div class="result-card">
        <h2>Score Breakdown</h2>
        ${breakdownHtml}
      </div>
      <div class="result-card">
        <h2>Return Case</h2>
        ${returnCaseHtml}
      </div>
      <div class="result-card result-full">
        <h2>Red Flags & Risk Factors</h2>
        ${flagsHtml}
      </div>
    </section>

    <section class="memo-box">
      <div class="memo-section">
        <h3>Situation</h3>
        <p>${escapeHtml(result.memo.situation)}</p>
      </div>
      <div class="memo-section">
        <h3>Investment Opportunity</h3>
        <p>${escapeHtml(result.memo.opportunity)}</p>
      </div>
      <div class="memo-section">
        <h3>Key Risks</h3>
        <ul>${result.memo.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul>
      </div>
      <div class="memo-section">
        <h3>Recommendation</h3>
        <p>${escapeHtml(result.memo.recommendation)}</p>
      </div>
      <div class="memo-section">
        <h3>Suggested Next Steps</h3>
        <ul>${result.memo.nextSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ul>
      </div>
    </section>

    <div class="action-row">
      <button class="btn btn-ghost" type="button" data-step="2">Analyze Another</button>
    </div>`;
}

function buildMemoText() {
  if (!analysisResult) return "";
  const r = analysisResult;
  return `IC MEMO DRAFT - ${r.companyName}
==================================================
Thesis Score: ${r.thesisScore}/100
Verdict: ${r.verdict}

SITUATION
${r.memo.situation}

INVESTMENT OPPORTUNITY
${r.memo.opportunity}

KEY RISKS
${r.memo.risks.map((risk, index) => `${index + 1}. ${risk}`).join("\n")}

RECOMMENDATION
${r.memo.recommendation}

NEXT STEPS
${r.memo.nextSteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}`;
}

document.addEventListener("click", (event) => {
  const stepButton = event.target.closest("[data-step]");
  if (stepButton) goToStep(Number(stepButton.dataset.step));

  const tag = event.target.closest(".tag");
  if (tag) tag.classList.toggle("selected");

  if (event.target.closest("#upload-zone")) $("#file-input").click();

  const copyButton = event.target.closest("#copy-memo");
  if (copyButton) {
    navigator.clipboard.writeText(buildMemoText());
    copyButton.textContent = "Copied";
  }
});

$("#file-input").addEventListener("change", (event) => handleTextFile(event.target.files[0]));
$("#upload-zone").addEventListener("dragover", (event) => {
  event.preventDefault();
  $("#upload-zone").classList.add("drag");
});
$("#upload-zone").addEventListener("dragleave", () => $("#upload-zone").classList.remove("drag"));
$("#upload-zone").addEventListener("drop", (event) => {
  event.preventDefault();
  $("#upload-zone").classList.remove("drag");
  handleTextFile(event.dataTransfer.files[0]);
});
$("#analyze-btn").addEventListener("click", runAnalysis);
