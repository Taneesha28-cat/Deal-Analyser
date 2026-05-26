import { pathToFileURL } from "node:url";
import { homedir } from "node:os";
import { join } from "node:path";

const bundledPdfJs = join(
  homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules",
  "pdfjs-dist",
  "legacy",
  "build",
  "pdf.mjs"
);

async function loadPdfJs() {
  globalThis.DOMMatrix ||= class DOMMatrix {};
  globalThis.ImageData ||= class ImageData {};
  globalThis.Path2D ||= class Path2D {};

  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    return import(pathToFileURL(process.env.PDFJS_DIST_PATH || bundledPdfJs).href);
  }
}

export async function extractPdfText(base64Pdf) {
  if (!base64Pdf) throw new Error("No PDF content was provided.");
  const pdfjs = await loadPdfJs();
  const bytes = Uint8Array.from(Buffer.from(base64Pdf, "base64"));
  const loadingTask = pdfjs.getDocument({
    data: bytes,
    disableWorker: true,
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(pageText);
  }

  const text = pages.join("\n\n").replace(/\s+\n/g, "\n").trim();
  if (text.length < 20) {
    throw new Error("The PDF did not contain enough extractable text. It may be scanned; OCR would be needed.");
  }
  return text;
}
