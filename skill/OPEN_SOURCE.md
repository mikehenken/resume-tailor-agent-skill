# Open-source packaging notes

## What ships in the repo (system)

- `SKILL.md`, `designs.json`, `templates/`, `partials/`, `scripts/`, `template.html` (stub)
- **`research/bundled/`** — versioned research markdown (+ `intent-discovery.yaml` if present) and maintainer `INSTRUCTIONS.md`

## Cursor agent file (install metadata, not the OSS tree root)

On a developer machine, optional **`{PLATFORM_ROOT}/agents/resume-tailor.md`** wires Cursor’s **agent** persona and rules; it should **link** to this skill (paths like **`{SKILL_ROOT}/…`**) and **must not** host a second copy of **`research/bundled/*.md`**. Canonical research lives only under **`{SKILL_ROOT}/research/bundled/`**.

**Do not** create **`{PLATFORM_ROOT}/agents/resume-tailor/`** as a subdirectory for documentation or research — it is not part of the OSS package and invites drift. All maintainer and pointer semantics belong in **`SKILL.md`**, **`OPEN_SOURCE.md`**, and **`research/bundled/INSTRUCTIONS.md`**.

## What stays on the machine (user)

- **`profile.json`** — canonical resume JSON for an individual; recommend `{PLATFORM_ROOT}/resume-tailor/profile.json` or `$RESUME_TAILOR_USER_DIR/profile.json`, not inside the published skill tree (avoid committing real PII).
- **`tailors/`** — session state, change reports, PDFs
- **`research/extension/`** — private markdown extra knowledge (mirrors `research/bundled/` on the skill side)
- **Resume JSON** — [JSON Resume](https://jsonresume.org/schema); validate with `scripts/npm run validate-resume` (schema copy under `research/bundled/json-resume-schema.json`)

Environment:

- **`RESUME_TAILOR_USER_DIR`** — optional; defaults to `{PLATFORM_ROOT}/resume-tailor`

## `.gitignore` suggestion (when this skill lives in a git repo)

Ignore user layers if you ever clone the skill into a project workspace:

```
profile.json
**/tailors/
**/research/extension/
```

Ship `profile.example.json` (redacted) if you want a schema sample.
