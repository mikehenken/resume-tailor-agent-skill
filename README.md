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

Run the interactive installer via NPX to copy the skill and inject platform-specific configurations:

```bash
npx @mikehenken/create-resume-tailor
```

The installer will ask:
1. **Platform**: Cursor, Claude Code, or OpenCode.
2. **Location**: Global or Project-scoped.
3. **Resume Export Tools**: Installs PDF dependencies.

## Usage

1. Open your configured CLI/IDE (e.g. `claude`, `opencode`, or Cursor command palette).
2. Tell the agent: 
   > "Tailor my resume for Platform Engineer at Acme Corp"
3. The agent will read your `profile.json`, propose changes based on bundled research, and compile the final tailored `state.json`.
4. It will then generate an ATS-ready PDF using the export scripts.

## License

MIT © Mike Henken
