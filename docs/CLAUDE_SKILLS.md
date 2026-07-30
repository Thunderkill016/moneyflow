# Claude Agent Skills — nguồn chính thức + dùng cho MoneyFlow

## Trang / repo Claude (official)

| Nguồn | URL |
|-------|-----|
| Agent Skills overview | https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview |
| Engineering: Agent Skills | https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills |
| Public skills repo | https://github.com/anthropics/skills |
| Open standard | https://agentskills.io/ |
| Claude Code skills docs | https://code.claude.com/docs/en/slash-commands |
| Claude Code project memory | https://code.claude.com/docs/en/memory |
| Claude Code best practices | https://code.claude.com/docs/en/best-practices |
| Claude Code subagents | https://code.claude.com/docs/en/sub-agents |
| Claude Code worktrees | https://code.claude.com/docs/en/worktrees |
| Claude Code hooks | https://code.claude.com/docs/en/hooks |
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

- `.claude/skills/` là đường dẫn project skill được Claude Code chính thức khám phá.
- `.agents/skills/` là lớp tương thích cho các coding agent khác; Claude Code không được giả định sẽ nạp đường dẫn này.
- `/next-initiative` chọn user-facing feature F01-F12 theo `docs/product/PRODUCT_DEVELOPMENT_PLAN.md`, rồi chọn và thực thi vertical slice an toàn theo `docs/engineering/DEVELOPMENT_SEQUENCE.md`.

Các playbook trong `.agents/skills/` vẫn là tài liệu tham khảo khi được chỉ định, nhưng quy tắc luôn-nạp phải nằm trong `CLAUDE.md`/`AGENTS.md`, còn workflow Claude lặp lại phải nằm trong `.claude/skills/`.
