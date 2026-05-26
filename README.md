# Deal Compass Working Model

Local full-stack prototype for investment thesis screening.

The backend extracts text from pasted deal notes, TXT files, or text-based PDFs. It then derives common screening metrics such as EBITDA margin, EV/EBITDA, EV/revenue, net debt/EBITDA, FCF conversion, simple MOIC/IRR, and data-quality red flags.

Scanned PDFs need OCR before upload because they do not contain selectable text.

## Run

```powershell
npm start
```

If `npm` is not available in this shell, use the bundled Codex Node runtime:

```powershell
& 'C:\Users\Hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

Then open:

```text
http://localhost:4173
```

## Test

```powershell
npm test
```

Bundled Node fallback:

```powershell
& 'C:\Users\Hp\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test
```
