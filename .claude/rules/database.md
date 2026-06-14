---
description: Drizzle ORM 与 PostgreSQL 数据库开发规范
globs: packages/db/**
---

# Database (packages/db)

## Schema 管理

- Schema 文件位于 `packages/db/src/schema/`
- 所有表从 `packages/db/src/schema/index.ts` 统一导出
- `auth.ts` 由 Better-Auth 管理，**禁止手动修改**
- `todo.ts` 为业务 schema 模板，新增表参照其结构

## 迁移工作流

- 本地开发快速迭代：`pnpm db:push`（直接推送 schema，不生成迁移文件）
- 生产环境变更：`pnpm db:generate` → 审查生成的 SQL → `pnpm db:migrate`
- 禁止手动编辑生成的迁移文件

## 查询规范

- 查询逻辑写在 `packages/api` 的对应 router 中，不写在路由 handler 里
- 使用 Drizzle query builder，非必要不写原始 SQL
- update/delete 操作**必须**有明确 `where` 子句，防止全表更新
- 多步写操作用事务：`db.transaction(async (tx) => { ... })`

## 客户端导入

```ts
import { db } from "@node-red-project/db";
import { todos } from "@node-red-project/db/schema";
```
