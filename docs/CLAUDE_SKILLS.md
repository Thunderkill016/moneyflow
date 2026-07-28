# Claude Agent Skills — nguồn chính thức + dùng cho MoneyFlow

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

- `.claude/skills/` — path Claude Code chuẩn  
- `.agents/skills/` — mirror  

Plus project skills: ship-feature, TDD, verification, security-pass, frontend-qa, supabase-rls.
