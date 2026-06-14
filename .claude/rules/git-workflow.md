---
description: 分支命名、Commit 风格与 PR 流程
---

# Git Workflow

## 分支命名

- `feat/<topic>` — 新功能
- `fix/<topic>` — Bug 修复
- `chore/<topic>` — 维护性变更
- `refactor/<topic>` — 重构

## Commit 规范

遵循 Conventional Commits：

```
feat: add user profile page
fix: correct session expiry handling
chore: update drizzle-kit to 0.31
refactor: extract auth context into hook
```

## 提交前检查

Husky 会自动执行，也可手动运行：

- `pnpm check` — Biome lint + format 检查
- `pnpm check-types` — TypeScript 类型检查

## PR 流程

- PR 标题与 commit 风格一致
- Feature branch squash-merge 到 `main`
- PR 描述说明改动目的，不只是 "what"
