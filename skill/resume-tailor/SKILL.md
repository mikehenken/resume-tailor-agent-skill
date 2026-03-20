---
name: resume-tailor
description: Tailors Mike Henken's resume for specific roles or companies. Use when tailoring resume for a job, role, or company. Profile and scripts in same directory. Supports interactive Q&A, change reports, state persistence, job tracking, and PDF export with multiple HTML/CSS designs (ATS + executive/visual layouts).
---

## Mandatory Rule

**resume-tailor MUST always be used** for resume tailoring work. If invocation or delegation to resume-tailor fails, INFORM THE USER immediately. Do NOT have the default session agent continue the work in its place.

## Layout: bundled (system) vs user extension (open source)

For **open source** and clear licensing, split **versioned system knowledge** from **private user add-ons**:

| Layer | Path | Purpose |
|--------|------|---------|
| **Skill root** | `{SKILL_ROOT}` — directory containing this `SKILL.md` | Shipped package: scripts, designs, **bundled research**. |
| **Bundled research** | `{SKILL_ROOT}/research/bundled/*.md` | Maintainer-curated, generic ATS/domain/psychology/export references. Safe to publish. |
| **User root** | `{USER_ROOT}` = `$RESUME_TAILOR_USER_DIR` if set, else `{PLATFORM_ROOT}/resume-tailor` | Private machine state: tailors, logs, **extension** markdown. **Do not** commit real profile/PII or employer intel to a public repo. |
| **User extension research** | `{USER_ROOT}/research/extension/*.md` | Optional extra knowledge (company prep, niche domains). **Additive only** — use unique names (e.g. `user-bigco-prep-2026.md`); do not shadow bundled filenames. |

**Canonical research paths:** `{SKILL_ROOT}/research/bundled/` (maintainer curated) and `{USER_ROOT}/research/extension/` (user add-ons). See `{SKILL_ROOT}/OPEN_SOURCE.md` for packaging and `.gitignore` hints.

## Profile

**Preferred path:** `{USER_ROOT}/profile.json`  
**Skill-root fallback** (bundled / single-package layout): `{SKILL_ROOT}/profile.json` (same directory as this `SKILL.md`)

Documents follow the **[JSON Resume schema](https://jsonresume.org/schema)** (machine definition: [resume-schema `schema.json`](https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json)). The canonical copy may include `"$schema"` pointing at that URL. Root and nested objects allow **`additionalProperties`**, so extensions such as **`work[].keywords`** and **`references[].title`** remain valid.

**Required in every tailored output** (from `profile.json` / user baseline): portfolio and LinkedIn URLs as today — e.g. `https://your-portfolio.com` and `https://linkedin.com/in/your-profile`.

### Profile baseline vs tailoring

- **`profile.json`** (at `{USER_ROOT}/profile.json` or `{SKILL_ROOT}/profile.json`) is the **read-only baseline during tailoring**. Do not edit it for per-job bullet tweaks.
- **Approved bullet changes go to `state.json` only** (`tailored_content`). PDF export uses `tailored_content` when present.
- **Schema compliance**: `tailored_content` MUST stay JSON Resume–conformant the same way as `profile.json`: use `work` (not `work_experience`) with `name`, `startDate`, `endDate` (omit `endDate` for current roles — do not use `null`), `highlights`, optional `location`, `description`, `keywords`. Use `skills` with `name` and `keywords`. Use **`references`** (`name`, `reference`, optional **`title`** for relationship/role). Do **not** use `customRecommendations`; use **`references`**. Use `basics.profiles` and `basics.location` as objects. Never use `company`, `start_date`, `end_date`, or `category`. Rendering: `partials/render-body.js`.
- **Maintenance** (user-directed schema cleanup, migration): run `node normalize-json-resume.mjs <path>` from `scripts/` (see `scripts/README.md`). **`npm run validate-resume`** checks against the bundled schema copy. **Before PDF export**, run **`npm run validate-state -- <tailor>/state.json`** (or rely on `export-pdf.mjs`, which enforces the same state contract for `state.json` paths). Successful normalize / validate-state / **validate-resume** (`npm run validate-resume`) / extract when writing JSON (default or `-o`; **`--text-only`** prints plain text to stdout, not the envelope) emit **`{ ok: true, data: ... }`** on stdout; failures emit **`{ ok: false, error: ... }`** on stderr per `scripts/lib/error-taxonomy.mjs`.
- **Import from an existing file** (PDF/DOCX/TXT/MD): run `node extract-from-resume.mjs <file>` from `scripts/` to get a JSON Resume shell with extracted text in `meta.resumeTailor.rawText`; then structure fields and remove or shrink that blob when done. Does not call cloud APIs.

## When to Use

- Tailoring resume for specific job posting (company + role)
- Tailoring resume for role type only (e.g., Platform Engineer)
- Continuing or loading a previous tailor session
- Executing/retrieving/furthering company or role research
- Adding or updating job application state (applied, replies, interviews, offer)
- Generating change report or exporting PDF
- Generating cover letter (when posting requests one, career transition, or targeted application)
- Generating interview prep (STAR stories, role-specific questions, company hooks)

## Tailoring Rules

- **Proposal-and-approval**: For bullet modifications, additions, removals, or merges, propose to user and get approval before applying. Never silently condense or remove.
- **Minimum bullets per role**: Never reduce a role to 1 or 2 bullets. Each role must retain enough bullets to meaningfully describe scope and impact.
- **Summary**: Tailor the top summary for the target role
- **Experience order**: Always **reverse chronological** (most recent first). Never reorder roles by relevance.
- **Bullets**: CAR framework; ~80% quantified; action verbs (Increased, Led, Developed)
- **Skills**: Prioritize by job match; select from profile (see Skills Selection below)
- **Keywords**: Match 70-80% of job description; integrate naturally

## Skills Selection (Research-Informed)

Skills must be **highly informed** by target role, industry, and profile. Never invent.

- **Source**: All skills/keywords from `profile.json` only. No invented keywords.
- **Research**: Read **bundled** `{SKILL_ROOT}/research/bundled/` for target role (e.g., `platform-devops-tpm-domains-001.md`) — keyword tables, hiring-manager expectations. When the session needs extra context, also scan **user extension** `{USER_ROOT}/research/extension/` for relevant additive docs. Map research keywords to profile keywords only (no invention).
- **Industry**: FinTech/Healthcare/regulated → include Security, Compliance, HIPAA from profile. Platform/DevOps → Kubernetes, IaC, CI/CD, Cloud, Cost Optimization.
- **Job description**: If provided, match 70–80% of its skill keywords from profile.
- **Categories**: Keep or merge profile categories; reorder by relevance. Consider retaining more categories with fewer keywords each for ATS breadth (vs. collapsing to 3).
- **Change report**: Document rationale — which research drove selection, which profile keywords included and why.

**Bullet change rules**:
- Reorder bullets within a role: no approval needed. Experience order stays chronological. Modify, Add, Remove, Merge: propose and get approval.
- Default: preserve most bullets; only propose removals if the role still has 4+ bullets after.

## PDF export: multiple designs

**Registry**: `{PLATFORM_ROOT}/skills/resume-tailor/designs.json` — canonical ids, aliases (`design-2` … `design-4`), `atsCompliant` flags, and inspiration links.

| Id | Role | ATS-safe |
|----|------|----------|
| `ats` | Single-column Arial-style default (job-board / parser submissions) | Yes |
| `findmyprofession` | Executive clean, navy emphasis ([sample PDF](https://www.findmyprofession.com/wp-content/uploads/2023/06/VP-of-ITDevOps-Resume-Sample.pdf)) | No — prefer networking / PDF handoff |
| `amin-ariana` | Executive summary + web-resume typography ([reference](https://resume.aminariana.com/)) | No |
| `alex-gervais` | Dense leadership layout, 2-column skills block ([reference PDF](https://alexgervais.github.io/CV_Alexandre_Gervais_en.pdf)) | No |

**Invocation** (from `scripts/`):

```bash
node export-pdf.mjs <state-path> [--design=<id>]
```

Resolution order: `--design` → `state.json` field `export_design` → env `RESUME_TAILOR_DESIGN` → `ats`.

Persist user preference: set `"export_design": "findmyprofession"` (or any canonical id) on `state.json` so repeats omit the flag.

Non-ATS designs use color, serif/sans mixes, or multi-column skill presentation. **For strict ATS submissions, use `ats` only.**

## PDF Export Naming

Per `market-career-interview-002.md`: `Henken_Resume_{RoleSlug}_{CompanySlug}_{Date}.pdf` — if the design is not `ats`, the filename includes `_{designId}` before `.pdf`.

- Hyphens within slugs, underscores between fields
- Role-only (no company): `Henken_Resume_{RoleSlug}_{Date}.pdf` (plus optional design suffix)
- **Invoke export without output path**: `node export-pdf.mjs <state-path> [--design=...]` — do NOT pass a second argument unless intentionally fixing output path. Update `state.json`'s `pdf_path` from the script's "PDF written to:" output.

## ATS Compliance (design: `ats` only)

When using **`ats`**:

- Single-column layout
- Standard headings: Summary, Experience, Education, Relevant Skills, Certifications
- Fonts: Arial, Helvetica, sans-serif
- No tables, text boxes, or multi-column body layout
- Text-based PDF (not scanned)
- Copy-paste test: all text must paste in correct order

## State Contract (Canonical)

To avoid contract drift, use code as the single source of truth:

- State schema + validation rules: `scripts/lib/state-schema.mjs`
- State validation CLI: `scripts/validate-state.mjs`
- Shared CLI error envelope + taxonomy: `scripts/lib/error-taxonomy.mjs`

Expected CLI failure envelope:

```json
{ "ok": false, "error": { "code": "RT_*", "message": "...", "details": {} } }
```

**Storage**: `{PLATFORM_ROOT}/resume-tailor/tailors/{tailor-id}/state.json`

## Change Report Format

- **General summary**: What was changed overall (e.g., "Modified 5 bullets, removed 2, reordered bullets within roles")
- **Section-by-section**: What changed in summary, work experience, skills (before/after)
- **Improvement rationale**: For each change (or group), explain how it was improved (ATS keyword match, recruiter scan / top-third impact, role relevance, quantification or CAR framework, clarity or concision)
- **Decisions**: Questions asked and answers given; approved vs rejected proposals

**Proposal format** (when proposing bullet changes): Role, bullet (before/after or add/remove), rationale, user options (Approve / Reject / Edit)

## Logging

Per tailor: `{PLATFORM_ROOT}/resume-tailor/tailors/{tailor-id}/logs/`
- decisions.log, searches.log, changes.log, export.log

## Failure Handling

Report all failures to user. No silent fallback. User resolves.

## Role Families (Target Roles)

TPM, DevOps, Platform Engineering, FinTech, Healthcare, Product Management, Cyber-security, Software Engineering, User Experience, Director of Engineering, CTO, VP of Product. Use role-specific keywords from research findings.

## Director+ / Executive-Track (Platform, DevOps Transformation)

When the target role is **Director, Senior Director, VP, or Head of** Platform / Infrastructure / DevOps **transformation** (often **wider compensation bands** than senior IC):

- Read `{SKILL_ROOT}/research/bundled/executive-platform-senior-director-2026-001.md`.
- **Emphasize** (from profile only): multi-team scope, transformation narrative, executive partnership, reliability/security/compliance, FinOps or cost governance, DORA-style outcomes where truthful.
- **Do not** put **salary** or **desired comp** in `tailored_content`. Benchmarking is external (postings, surveys)—see findings doc.
- **Interview prep**: suggest governance, vendor, audit, and multi-year roadmap angles; for **energy/utilities**, NERC CIP–**adjacent** interface stories only when supported by experience.
- **Personal brand** (optional user guidance): vocabulary shift toward platform-as-product, IDP/DevEx, business translation—without inventing resume keywords not in `profile.json`.

## Research references (bundled, expert-level)

All under `{SKILL_ROOT}/research/bundled/`:

- `ats-pdf-comprehensive.md` — ATS parsing, PDF requirements, layout rules, export constraints
- `resume-effectiveness-hiring-psychology-002.md` — Recruiter behavior, bullet frameworks, keywords, structure
- `platform-devops-tpm-domains-001.md` — Platform Engineering, DevOps, TPM, FinTech, Healthcare
- `domain-roles-expanded-003.md` — PM, Cybersecurity, SWE, UX, Dir Eng, CTO, VP Product
- `market-career-interview-002.md` — Job market, career lattice, cover letter, interview prep, version management
- `executive-platform-senior-director-2026-001.md` — Executive-track platform & DevOps leadership: comp context, hiring bar, resume vs IC differences, samples URL list, regulated industry overlay
- `cursor-formats-001.md` — Cursor agent/skill conventions

Supplement with optional `{USER_ROOT}/research/extension/*.md` when pertinent (private layer; not shipped upstream).
