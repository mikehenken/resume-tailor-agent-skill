# Bundled research — maintainer instructions

## Two-layer model (open source)

| Layer | Location | Purpose |
|--------|----------|---------|
| **Bundled (system)** | `{SKILL_ROOT}/research/bundled/` | Shipped with the package; generic ATS, domains, psychology, export rules. Versioned with releases. |
| **User extension** | `{RESUME_TAILOR_USER_DIR}/research/extension/` default `{PLATFORM_ROOT}/resume-tailor/research/extension/` | Private add-ons: company-specific prep, interview banks, niche certifications, local job-market notes. **Never** committed to the public repo. |

`RESUME_TAILOR_USER_DIR` may be set to relocate user state (e.g. `~/.config/resume-tailor`).

## Bundled research index (`*.md` in this folder)

- `ats-pdf-comprehensive.md` — ATS parsing, PDF requirements, layout/export rules  
- `resume-effectiveness-hiring-psychology-002.md` — Recruiter scan patterns, bullets, keywords  
- `platform-devops-tpm-domains-001.md` — Platform, DevOps, TPM, FinTech, Healthcare  
- `domain-roles-expanded-003.md` — PM, security, SWE, UX, director+, product  
- `market-career-interview-002.md` — Market context, cover letter, interview prep, file naming  
- `executive-platform-senior-director-2026-001.md` — Director+ platform/DevOps transformation patterns  
- `cursor-formats-001.md` — Cursor agent/skill conventions  

## Updating bundled research

1. Add or revise markdown in **`research/bundled/`**; cite sources; note limitations and date.  
2. Update **`README.md`** / this index if filenames change.  
3. Update **`SKILL.md`** and **`{PLATFORM_ROOT}/agents/resume-tailor.md`** when behavior or path contracts change.  
4. Keep **`profile.json`** (or user-supplied profile path) out of bundled research—profile is user data.  
5. **Do not** maintain a **`{PLATFORM_ROOT}/agents/resume-tailor/`** subdirectory tree for research or redirects — it is not shipped with the skill and duplicates **`OPEN_SOURCE.md`**. Open-source consumers track the **skill** tree only; optional single-file **`{PLATFORM_ROOT}/agents/resume-tailor.md`** is install glue only (`OPEN_SOURCE.md`).

## User extension (downstream)

Consumers add optional markdown under:

```
${RESUME_TAILOR_USER_DIR:-{PLATFORM_ROOT}/resume-tailor}/research/extension/
```

**Convention:** use **unique filenames** (e.g. `user-acme-corp-prep-2026.md`) so you never shadow a bundled doc name. The agent reads bundled docs by default; user extension docs are **additive** context when relevant to the session.

See `{USER_ROOT}/research/README.md` and `research/extension/README.md` under the user directory (documented in main `SKILL.md`).

## Canonical research locations (do not fork trees)

Maintain research markdown only under **`{SKILL_ROOT}/research/bundled/`** (system, versioned) and **`{USER_ROOT}/research/extension/`** (private add-ons). Both are documented in **`SKILL.md`**; keep bundled vs user filenames distinct so extension docs never shadow bundled docs.
