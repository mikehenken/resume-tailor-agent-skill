# Resume Tailor — Claude Plugin

Multi-profile resume tailoring for **Claude Code** and **Cowork**. No `~/.claude` paths required.

## User data (portable)

All candidate data lives under **workspace-relative** storage:

```text
./.resume-tailor/
  config.json
  profiles/{id}/profile.json
  tailors/{tailor-id}/state.json
  research/extension/
```

Override with environment variable:

```bash
export RESUME_TAILOR_USER_DIR=/path/to/granted/folder
```

In Cowork, point `RESUME_TAILOR_USER_DIR` at your granted project folder (or use `./.resume-tailor` inside it).

**No setup commands.** The resume-tailor agent creates this layout on first onboard or tailor in chat.

## PDF export

| Engine | When | Designs |
|--------|------|---------|
| **Puppeteer** | Chrome available (local Code) | All designs |
| **pdfkit** | Fallback when Puppeteer fails | `ats` only (browser-free) |
| **HTML file** | Last resort | Open in browser → Print to PDF |

**PDF import** (onboarding) uses `pdf-parse` — no browser required.

## Install

### From GitHub release ZIP

Upload `resume-tailor-plugin-v*.zip` in Cowork **Plugins → Upload**, or:

```bash
claude plugin marketplace add mikehenken/resume-tailor-agent-skill
claude plugin install resume-tailor@mikehenken-resume-tailor
```

### Org admin

Add marketplace URL or upload ZIP at [Organization settings → Plugins](https://claude.ai/admin-settings/plugins).

## Usage

- `List profiles`
- `Onboard a new candidate from this resume` (attach PDF/DOCX)
- `Tailor jordan-lee for Platform Engineer at Acme`

Subagent: **resume-tailor** (`agents/resume-tailor.md`). Skill auto-invokes for tailoring tasks. PDF export is handled by the agent (no user-facing export commands).
