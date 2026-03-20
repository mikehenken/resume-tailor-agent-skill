# Cursor Agent and Skill Format Specifications

**Source**: research-analyst subagent (Phase 2.1)
**Agent ID**: aaaf71dd-169d-4b4e-82f8-c4780227d872

## Agent Frontmatter

```yaml
---
tools: Read, Write, Edit, Glob, Grep, Task, WebSearch
name: agent-name
model: inherit | fast | <model-id>
description: Use when...
readonly: false
is_background: false
---
```

**Tool names**: Read, Write, Edit (or StrReplace), Glob, Grep, Task, WebSearch, Shell, mcp_web_fetch

**Locations**: `{PLATFORM_ROOT}/agents/` (global), `.cursor/agents/` (project)

## Skill Format

- Path: `{PLATFORM_ROOT}/skills/<name>/SKILL.md`
- Frontmatter: `name`, `description` (required)
- Body: When to use, principles, instructions, examples

## Best Practices

- Clear, specific descriptions
- One main responsibility per agent
- Only list tools the agent needs
