# Contributing to Resume Tailor

Thank you for your interest in contributing to the Resume Tailor agent skill!

## Project Structure

This repository is designed to be multi-platform. Below is a high-level overview:

- `/bin/cli.mjs` - The NPX interactive installer
- `/skill/` - The canonical skill directory (this is what gets installed on the user's machine)
- `/adapters/` - The platform-specific templates (Cursor, Claude Code, OpenCode)

### Adding a New Platform

To add support for a new AI CLI or IDE:
1. Create a folder in `/adapters/{platform-name}`
2. Add `agent.md.tmpl` - The agent prompt template
3. Add `skill-frontmatter.yaml` - The frontmatter to inject into the SKILL.md
4. Update `bin/cli.mjs` to include the new platform in the choice list and mapping logic.

### Research Updates

If you have new data regarding ATS systems, hiring psychology, or specific job domain keywords, please add them to `/skill/research/bundled/` and reference them in the agent templates.

## Development Workflow

1. Clone the repo: `git clone https://github.com/mikehenken/resume-tailor-agent-skill.git`
2. Install dependencies: `npm install`
3. Run tests locally: `npm run test`
4. Lint code: `npm run lint`

Please ensure all tests pass before opening a Pull Request.

## Code of Conduct

Please treat all contributors with respect.
