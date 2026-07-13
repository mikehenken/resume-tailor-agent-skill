# Contributing to Resume Tailor

Thank you for your interest in contributing to the Resume Tailor agent skill!

## Project Structure

This repository is designed to be multi-platform. Below is a high-level overview:

- `/bin/cli.mjs` - The NPX interactive installer
- `/bin/build-plugin.mjs` - Assembles `plugins/resume-tailor/` and release ZIP
- `/skill/` - The canonical skill directory (this is what gets installed on the user's machine)
- `/adapters/` - The platform-specific templates (Cursor, Claude Code, OpenCode)
- `/plugins/resume-tailor/` - Claude Code / Cowork plugin template (built by `build:plugin`)
- `/.claude-plugin/marketplace.json` - Marketplace manifest for `claude plugin marketplace add`

### User data (portable)

End users **never run setup scripts**. The agent creates `./.resume-tailor` (or `RESUME_TAILOR_USER_DIR`) on first chat action. Scripts resolve paths via `skill/scripts/lib/user-paths.mjs`.

### Claude plugin

```bash
npm run build:plugin
# → plugins/resume-tailor/ staged + resume-tailor-plugin-v{version}.zip at repo root
```

Release workflow attaches the ZIP to GitHub Releases. Plugin paths use `$CLAUDE_PLUGIN_DIR/skills/resume-tailor` in built artifacts.

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

## Releases

Tagged releases (`v*`) run `.github/workflows/release.yml`, which:

1. Publishes `@mikehenken/create-resume-tailor` to the **public npmjs** registry
2. Builds per-platform tarballs, **Claude plugin ZIP**, and creates a GitHub Release

**Required repo secret:** `NPM_TOKEN` — an npm [Automation](https://docs.npmjs.com/about-access-tokens) access token for an account that can publish the `@mikehenken` scope (or the unscoped package name if you rename later).

```bash
# After merging to main and bumping package.json version:
git tag v1.0.1
git push origin v1.0.1
```

## Code of Conduct

Please treat all contributors with respect.
