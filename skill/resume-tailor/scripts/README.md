# Resume Tailor Scripts

## Canonical contracts

- State schema contract: `lib/state-schema.mjs`
- State validator entrypoint: `validate-state.mjs`
- Shared CLI taxonomy/error envelope: `lib/error-taxonomy.mjs`
- **Ajv** (`validate-resume.mjs`) is listed in **`dependencies`** so `npm install --omit=dev` still validates in production-style installs.
- Expected **failure** envelope (stderr) from CLIs using `runCli` / `makeError`:

```json
{ "ok": false, "error": { "code": "RT_*", "message": "...", "details": {} } }
```

- Expected **success** envelope (stdout) from `validate-state.mjs`, `normalize-json-resume.mjs`, `extract-from-resume.mjs` (JSON output path), and **`validate-resume.mjs`** / **`npm run validate-resume`**:

```json
{ "ok": true, "data": { /* CLI-specific fields */ } }
```

**`data` fields are CLI-specific** — for example, `validate-resume` success typically includes `path`, `schemaPath`, and `message`; other CLIs populate their own keys under `data`.

## export-pdf.mjs

**Purpose**: Generate PDF from tailored resume JSON using selectable HTML/CSS **designs**.

**Design registry**: `../designs.json` — ids, aliases (`design-2` … `design-4`), `atsCompliant`, inspiration URLs.

**Input**: Path to JSON (`state.json` with `tailored_content`, or raw resume JSON). If the filename is `state.json` but content is raw JSON Resume, export still proceeds.

**Output**: PDF next to the input file unless a second positional path is provided.

**Invocation**:

```bash
cd {PLATFORM_ROOT}/skills/resume-tailor/scripts
npm install
node export-pdf.mjs <input-json-path> [--design=<id>]
# Optional explicit output:
node export-pdf.mjs <input-json-path> <output.pdf> [--design=amin-ariana]
```

**Design resolution**: `--design` → `export_design` on parsed JSON → env `RESUME_TAILOR_DESIGN` → `ats`.

**Filename** (auto): `Henken_Resume_{RoleSlug}_{CompanySlug}_{Date}.pdf`, or with `_{designId}` before `.pdf` when design ≠ `ats`.

**Requirements**: Puppeteer (`npm install`).

**HTML assembly**: `templates/styles/{design}.css` + `partials/render-body.js` (no `template.html` at runtime).

## validate-state.mjs

**Purpose:** Validate a resume-tailor **`state.json`** against the canonical schema in `lib/state-schema.mjs` (same checks `export-pdf.mjs` applies to state-shaped inputs).

```bash
npm run validate-state -- {PLATFORM_ROOT}/resume-tailor/tailors/<id>/state.json
# or: node validate-state.mjs <path-to-state.json>
```

Run this before `export-pdf.mjs` when you want to catch state contract issues early (same recommendation as in the resume-tailor agent and `SKILL.md`).

On success, prints `{ ok: true, data: ... }` to stdout. On failure, prints `{ ok: false, error: ... }` to stderr (exit non-zero).

## extract-from-resume.mjs

**Purpose:** Pull **plain text** out of an existing resume (`.pdf`, `.docx`, `.txt`, `.md`) and write a **JSON Resume skeleton** that passes `validate-resume` (raw text is stored under `meta.resumeTailor.rawText` for you or an LLM to map into `basics` / `work` / `skills`).

**Note:** In this monorepo, **resumai-react**’s `PDFService` only **generates** ATS PDFs *from* JSON Resume data (`resumeai/resumai-react/backend/app/services/pdf_service.py`); it does not parse PDFs back into JSON. This script is the offline **import** path for resume-tailor / open-source installs.

**Requires:** `npm install` (pulls `pdf-parse`, `mammoth`).

```bash
node extract-from-resume.mjs path/to/Resume.pdf
node extract-from-resume.mjs path/to/Resume.docx -o ./imported.json
node extract-from-resume.mjs path/to/Resume.pdf --text-only   # stdout only, pipe to a model or file
```

Default output path: `<same-dir>/<basename>-extracted.json`.

## JSON Resume validation & normalization

- **Schema copy**: `../research/bundled/json-resume-schema.json` ([upstream](https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json)).
- **Validate** (requires `npm install` for `ajv` / `ajv-formats`):

```bash
npm run validate-resume
# or: node validate-resume.mjs ../profile.json
```

- **Normalize** (omit `endDate: null`, drop empty `work.url`, migrate `customRecommendations` → `references`, set `$schema`):

```bash
npm run normalize-resume
# or: node normalize-json-resume.mjs ../profile.json
```

## Automated tests (`node:test`)

Runs unit tests for `lib/resume-pdf-utils.mjs` and integration tests that spawn the validate / normalize / extract CLIs (no Puppeteer in default suite):

```bash
npm test
```

## template.html (stub)

Not used at runtime (assembly is `templates/styles/{design}.css` + `partials/render-body.js`). Any stub file is for discoverability / historical reference only.
