---
name: resume-tailor
description: Tailors resumes for specific roles or companies for one or more candidates. Supports multi-profile switching, chat onboarding, interactive Q&A, change reports, state persistence, job tracking, and PDF export with multiple HTML/CSS designs (ATS + executive/visual layouts).
---

## Mandatory Rule

**resume-tailor MUST always be used** for resume tailoring work. If invocation or delegation to resume-tailor fails, INFORM THE USER immediately. Do NOT have the default session agent continue the work in its place.

## Layout: bundled (system) vs user extension (open source)

For **open source** and clear licensing, split **versioned system knowledge** from **private user add-ons**:

| Layer | Path | Purpose |
|--------|------|---------|
| **Skill root** | `{SKILL_ROOT}` — directory containing this `SKILL.md` | Shipped package: scripts, designs, **bundled research**. |
| **Bundled research** | `{SKILL_ROOT}/research/bundled/*.md` | Maintainer-curated, generic ATS/domain/psychology/export references. Safe to publish. |
| **User root** | `{USER_ROOT}` = `$RESUME_TAILOR_USER_DIR` if set, else `{PLATFORM_ROOT}/resume-tailor` | Private machine state: **profiles**, tailors, logs, **extension** markdown. **Do not** commit real profile/PII or employer intel to a public repo. |
| **User extension research** | `{USER_ROOT}/research/extension/*.md` | Optional extra knowledge (company prep, niche domains). **Additive only** — use unique names (e.g. `user-bigco-prep-2026.md`); do not shadow bundled filenames. |

**Canonical research paths:** `{SKILL_ROOT}/research/bundled/` (maintainer curated) and `{USER_ROOT}/research/extension/` (user add-ons). See `{SKILL_ROOT}/OPEN_SOURCE.md` for packaging and `.gitignore` hints.

Helpers (path resolution): `{SKILL_ROOT}/scripts/lib/profile-paths.mjs`.

## Multi-profile (candidates)

Support **multiple candidates** on one machine. Profiles are independent baselines; each tailor session is bound to exactly one profile.

| Path | Purpose |
|------|---------|
| `{USER_ROOT}/profiles/{profile_id}/profile.json` | Candidate baseline (JSON Resume). **Preferred.** |
| `{USER_ROOT}/config.json` | Optional `{ "defaultProfileId": "jordan-lee" }` — used **only** when starting a **new** tailor and the user did not name a candidate. |
| `{USER_ROOT}/tailors/{tailor-id}/state.json` | Per-job session. **Must** set `profile_id` when created. |

**Concurrency rule:** `defaultProfileId` is **not** the live identity of an in-progress tailor. Once a tailor exists, always load `{USER_ROOT}/profiles/{state.profile_id}/profile.json`. Never re-read `defaultProfileId` mid-session (two agents can tailor different people safely).

**Legacy (still supported):** `{USER_ROOT}/profile.json` or `{SKILL_ROOT}/profile.json`. On first multi-profile use, offer to migrate into `profiles/{slug}/profile.json` via chat (no coding required).

### Chat commands (no coding)

- **List profiles** — enumerate `{USER_ROOT}/profiles/*/profile.json` (and note legacy single file if present).
- **Who is the default?** — read `config.json` `defaultProfileId` (clarify it only affects *new* unnamed sessions).
- **Set default to {name}** — write `config.json` only; do not alter open tailors.
- **Onboard a new candidate** — see below.
- **Tailor for {name} …** — resolve that profile id, create tailor with `profile_id` set.
- **Continue tailor {id}** — load that `state.json` and use **its** `profile_id`.

### Onboard a new candidate (chat-first)

1. Ask for a display name / slug (or derive slug from `basics.name`).
2. Accept **PDF / DOCX / TXT / MD / pasted text / JSON Resume**. Prefer: `node {SKILL_ROOT}/scripts/extract-from-resume.mjs <file>` then structure into JSON Resume with the user (proposal/approval for uncertain fields).
3. Write `{USER_ROOT}/profiles/{profile_id}/profile.json`.
4. Ensure portfolio (`basics.url` or Personal Website profile) and LinkedIn (`basics.profiles`) when the user has them — **never invent URLs**.
5. If this is the first profile (or user asks), set `defaultProfileId` in `config.json`.
6. Confirm with a short summary; then offer to start a tailor.

## Profile baseline vs tailoring

Documents follow the **[JSON Resume schema](https://jsonresume.org/schema)** (machine definition: [resume-schema `schema.json`](https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json)). The canonical copy may include `"$schema"` pointing at that URL. Root and nested objects allow **`additionalProperties`**, so extensions such as **`work[].keywords`** and **`references[].title`** remain valid.

**Required in every tailored output** (from the bound profile): include the candidate’s portfolio and LinkedIn URLs **when present on the profile**. Never invent or substitute another person’s URLs.

- **`profile.json`** for the tailor’s `profile_id` is **read-only during tailoring**. Do not edit it for per-job bullet tweaks.
- **Approved bullet changes go to `state.json` only** (`tailored_content`). PDF export uses `tailored_content` when present.
- **`state.profile_id`**: set at tailor creation; do not change unless the user explicitly reassigns the session.
- **Schema compliance**: `tailored_content` MUST stay JSON Resume–conformant the same way as `profile.json`: use `work` (not `work_experience`) with `name`, `startDate`, `endDate` (omit `endDate` for current roles — do not use `null`), `highlights`, optional `location`, `description`, `keywords`. Use `skills` with `name` and `keywords`. Use **`references`** (`name`, `reference`, optional **`title`** for relationship/role). Do **not** use `customRecommendations`; use **`references`**. Use `basics.profiles` and `basics.location` as objects. Never use `company`, `start_date`, `end_date`, or `category`. Rendering: `partials/render-body.js`.
- **Maintenance** (user-directed schema cleanup, migration): run `node normalize-json-resume.mjs <path>` from `scripts/` (see `scripts/README.md`). **`npm run validate-resume`** checks against the bundled schema copy. **Before PDF export**, run **`npm run validate-state -- <tailor>/state.json`** (or rely on `export-pdf.mjs`, which enforces the same state contract for `state.json` paths). Successful normalize / validate-state / **validate-resume** / extract when writing JSON emit **`{ ok: true, data: ... }`** on stdout; failures emit **`{ ok: false, error: ... }`** on stderr per `scripts/lib/error-taxonomy.mjs`.
- **Import from an existing file** (PDF/DOCX/TXT/MD): run `node extract-from-resume.mjs <file>` from `scripts/` to get a JSON Resume shell with extracted text in `meta.resumeTailor.rawText`; then structure fields and remove or shrink that blob when done. Does not call cloud APIs.

## When to Use

- Onboarding a new candidate/profile
- Switching default profile or listing profiles
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

- **Source**: All skills/keywords from the bound `profile.json` only. No invented keywords.
- **Research**: Read **bundled** `{SKILL_ROOT}/research/bundled/` for target role (e.g., `platform-devops-tpm-domains-001.md`) — keyword tables, hiring-manager expectations. When the session needs extra context, also scan **user extension** `{USER_ROOT}/research/extension/` for relevant additive docs. Map research keywords to profile keywords only (no invention).
- **Industry**: FinTech/Healthcare/regulated → include Security, Compliance, HIPAA from profile. Platform/DevOps → Kubernetes, IaC, CI/CD, Cloud, Cost Optimization.
- **Job description**: If provided, match 70–80% of its skill keywords from profile.
- **Categories**: Keep or merge profile categories; reorder by relevance. Consider retaining more categories with fewer keywords each for ATS breadth (vs. collapsing to 3).
- **Change report**: Document rationale — which research drove selection, which profile keywords included and why.

**Bullet change rules**:
- Reorder bullets within a role: no approval needed. Experience order stays chronological. Modify, Add, Remove, Merge: propose and get approval.
- Default: preserve most bullets; only propose removals if the role still has 4+ bullets after.

## PDF export: multiple designs

**Registry**: `{SKILL_ROOT}/designs.json` — canonical ids, aliases (`design-2` … `design-4`), `atsCompliant` flags, and inspiration links.

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

`{LastName}_Resume_{RoleSlug}_{CompanySlug}_{Date}.pdf` — last name derived from `tailored_content.basics.name` (or `profile_id` fallback). If the design is not `ats`, the filename includes `_{designId}` before `.pdf`.

- Hyphens within slugs, underscores between fields
- Role-only (no company): `{LastName}_Resume_{RoleSlug}_{Date}.pdf` (plus optional design suffix)
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
- Profile path helpers: `scripts/lib/profile-paths.mjs`
- State validation CLI: `scripts/validate-state.mjs`
- Shared CLI error envelope + taxonomy: `scripts/lib/error-taxonomy.mjs`

Expected CLI failure envelope:

```json
{ "ok": false, "error": { "code": "RT_*", "message": "...", "details": {} } }
```

**Storage**: `{USER_ROOT}/tailors/{tailor-id}/state.json` (include `profile_id`)

## Change Report Format

- **General summary**: What was changed overall (e.g., "Modified 5 bullets, removed 2, reordered bullets within roles")
- **Section-by-section**: What changed in summary, work experience, skills (before/after)
- **Improvement rationale**: For each change (or group), explain how it was improved (ATS keyword match, recruiter scan / top-third impact, role relevance, quantification or CAR framework, clarity or concision)
- **Decisions**: Questions asked and answers given; approved vs rejected proposals

**Proposal format** (when proposing bullet changes): Role, bullet (before/after or add/remove), rationale, user options (Approve / Reject / Edit)

## Logging

Per tailor: `{USER_ROOT}/tailors/{tailor-id}/logs/`
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
- **Personal brand** (optional user guidance): vocabulary shift toward platform-as-product, IDP/DevEx, business translation—without inventing resume keywords not in the bound profile.

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
