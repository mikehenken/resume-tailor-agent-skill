# 🎯 Resume Tailor Agent Skill

**AI-powered resume tailoring agent for Cursor, Claude Code, and OpenCode.**

A free, open-source, local AI agent that crafts tailored resumes specific to job postings. Compatible with the official **[JSON Resume](https://jsonresume.org/)** standard, this agent runs entirely locally via your AI CLI or IDE.

## The Problem

- 75% of resumes are rejected functionally by ATS systems.
- You shouldn't have to pay $40/month for a resume tailoring service when you have access to powerful AI models in your CLI or IDE.
- Generic AI prompts hallucinate experience, invent skills, and break formatting.

**Resume Tailor** solves this with strict guardrails, bundled behavioral hiring research, and proposal-based interaction.

## Features

- **Multi-Platform**: Native support for **Cursor**, **Claude Code**, and **OpenCode**.
- **JSON Resume Standard**: Reads and writes to the official JSON Resume specification. No proprietary formats.
- **Strict Guardrails**: Will never invent or hallucinate experience. Requires approval for all bullet modifications.
- **ATS-Optimized Exports**: Generates clean, parser-friendly PDFs that score high in Applicant Tracking Systems.
- **Bundled Research Base**: Shipped with current research on ATS psychology, domain-specific keywords (DevOps, Platform, Product, etc.), and executive framing.
- **Application Tracking**: Integrated state management for tracking tailoring iterations.

## Prerequisites

- Node.js `v20+`
- An environment running AI agents:
  - **Cursor**
  - **Claude Code** (`npm install -g @anthropic/claude-code`)
  - **OpenCode** (`npm install -g opencode`)

## Installation

### Interactive (recommended)

Run this in a real terminal (PowerShell, Git Bash, macOS Terminal, etc.). You should see **four questions**:

1. Platform (Cursor / Claude Code / OpenCode)
2. Install location (global / project / custom)
3. Resume seed (none / example / import file)
4. Install PDF dependencies? (puppeteer)

```bash
npx @mikehenken/create-resume-tailor@latest
```

`npx --yes` only skips *npx’s* own “install this package?” prompt. It does **not** skip the installer questions:

```bash
# Still interactive:
npx --yes @mikehenken/create-resume-tailor@latest
```

### Non-interactive (CI / scripted)

Pass `--non-interactive` (or `--yes`) **after** the package name — that is what skips the questions:

```bash
npx @mikehenken/create-resume-tailor@latest --non-interactive --platform claude --install-location global --resume example
```

From a local clone:

```bash
git clone https://github.com/mikehenken/resume-tailor-agent-skill.git
cd resume-tailor-agent-skill
npm install
node bin/cli.mjs
```

### Multi-profile (chat)

After install, in Claude/Cursor:

- `List profiles`
- `Onboard a new candidate from this resume` (attach PDF/DOCX or paste)
- `Set default profile to jordan-lee`
- `Tailor jordan-lee for Platform Engineer at Acme`

Each tailor stores `profile_id` so concurrent sessions for different candidates stay isolated.

## Usage

1. Open your configured CLI/IDE (e.g. `claude`, `opencode`, or Cursor command palette).
2. Tell the agent: 
   > "Tailor my resume for Platform Engineer at Acme Corp"
3. The agent will read your `profile.json`, propose changes based on bundled research, and compile the final tailored `state.json`.
4. It will then generate an ATS-ready PDF using the export scripts.

## License

MIT © Mike Henken
