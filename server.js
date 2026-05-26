import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeDeal } from "./src/analysisEngine.js";
import { extractPdfText } from "./src/pdfText.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function sendJson(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readRequestJson(req) {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  if (raw.length > 25_000_000) throw new Error("Request is too large.");
  return raw ? JSON.parse(raw) : {};
}

function safePublicPath(urlPath) {
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const decoded = decodeURIComponent(requested.split("?")[0]);
  const fullPath = normalize(join(publicDir, decoded));
  if (!fullPath.startsWith(publicDir)) return null;
  return fullPath;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") {
      const payload = await readRequestJson(req);
      if (payload.pdfBase64) {
        const pdfText = await extractPdfText(payload.pdfBase64);
        payload.dealText = [payload.dealText, pdfText].filter(Boolean).join("\n\n");
      }
      const result = analyzeDeal(payload);
      return sendJson(res, 200, result);
    }

    if (req.method !== "GET") {
      return sendJson(res, 405, { error: "Method not allowed" });
    }

    const fullPath = safePublicPath(req.url || "/");
    if (!fullPath) return sendJson(res, 403, { error: "Forbidden" });

    const body = await readFile(fullPath);
    res.writeHead(200, { "content-type": mimeTypes[extname(fullPath)] || "application/octet-stream" });
    res.end(body);
  } catch (error) {
    if (error.code === "ENOENT") {
      sendJson(res, 404, { error: "Not found" });
    } else {
      sendJson(res, 400, { error: error.message || "Unable to process request" });
    }
  }
});

server.listen(port, () => {
  console.log(`Deal Compass running at http://localhost:${port}`);
});
