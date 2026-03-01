# Bundled research (open-source / system)

This directory ships with **resume-tailor** as versioned, maintainer-curated knowledge. It is the **system** layer: ATS rules, role-domain keyword maps, hiring psychology, PDF/exports—**not** end-user private notes.

- **Markdown** (`*.md`) — Long-form reference files (cite sources where applicable).
- **`intent-discovery.yaml`** — Optional orchestration metadata when present.

**Do not** put secrets, employer-specific intel, or personal compensation notes here. Those belong under **`{USER_ROOT}/research/extension/`** (see `SKILL.md` → “Layout: bundled vs user extension”).

When you contribute upstream, add or edit `*.md` here and update `INSTRUCTIONS.md` index.

**Also in this folder:** `json-resume-schema.json` — pinned copy of the [JSON Resume schema](https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json) for offline `npm run validate-resume`.
