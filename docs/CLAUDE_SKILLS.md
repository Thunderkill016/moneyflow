# Claude Agent Skills — vendor support for MoneyFlow

These are vendor/tool-support materials, not MoneyFlow product, project-state,
execution or permission authority. Use `AGENTS.md` and `docs/context/README.md` first.

## Trang / repo Claude (official)

| Nguồn | URL |
|-------|-----|
| Agent Skills overview | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview |
| Engineering: Agent Skills | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills |
| Public skills repo | https://github.com/anthropics/skills |
| Open standard | https://agentskills.io/ |
| Claude Code skills docs | https://code.claude.com/docs/en/skills |
| Help: What are Skills? | https://support.claude.com/en/articles/12512176-what-are-skills |

### Cài marketplace trong Claude Code

```text
/plugin marketplace add anthropics/skills
/plugin install example-skills@anthropic-agent-skills
/plugin install document-skills@anthropic-agent-skills
```

### Pre-built trên claude.ai / API (document)

`pptx` · `xlsx` · `docx` · `pdf` — **không** phải skill build Next app.

### Skills trong repo anthropics/skills (clone 2026-07-15)

| Skill | Phù hợp MoneyFlow? |
|-------|-------------------|
| **frontend-design** | Có — UI distinctive |
| **webapp-testing** | Có — Playwright local |
| **web-artifacts-builder** | Ít — prototype artifact, không thay Next app |
| **theme-factory** | Có — theme landing |
| **mcp-builder** | Chỉ khi làm MCP |
| **skill-creator** | Meta — tạo skill mới |
| brand-guidelines | Không (brand Anthropic) |
| docx/pptx/xlsx/pdf | Không (office files) |
| algorithmic-art / canvas-design | Không |

## Đã cài vào project này

- `.claude/skills/` — Claude Code’s current load path
- `.agents/skills/` — Codex/Spec Kit-compatible mirror; retained because
  `.specify/README.md` pins its generated command location there

Plus `.agents/`-only project skills: ship-feature, TDD, verification, security-pass,
frontend-qa and supabase-rls. The duplicated vendor skills are intentionally retained
for the two different tool paths; their contents are not a parallel instruction system.
