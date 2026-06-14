# node-red-project

Full-stack TypeScript monorepo (Better-T-Stack): React SPA + Hono API + tRPC + Drizzle ORM + PostgreSQL.

## 技术栈

- 语言: TypeScript (strict)
- 前端: React + Vite + TanStack Router + TailwindCSS v4 + shadcn/ui
- 后端: Hono + tRPC + Better-Auth
- 数据库: PostgreSQL + Drizzle ORM
- 包管理: pnpm workspaces
- 构建系统: Turborepo
- Lint/Format: Biome (via Ultracite)

## 常用命令

- 安装依赖: `pnpm install`
- 开发（全栈）: `pnpm dev`
- 仅前端: `pnpm dev:web`
- 仅后端: `pnpm dev:server`
- 构建: `pnpm build`
- 类型检查: `pnpm check-types`
- Lint 检查: `pnpm check`
- Lint 自动修复: `pnpm fix`
- DB 推送 Schema: `pnpm db:push`
- DB 生成迁移: `pnpm db:generate`
- DB 执行迁移: `pnpm db:migrate`
- DB Studio: `pnpm db:studio`

## 目录结构

```
node-red-project/
├── apps/
│   ├── web/           # React SPA — Vite, TanStack Router (port 5173)
│   ├── server/        # Hono + tRPC server (port 3000)
│   └── fumadocs/      # 文档站点
├── packages/
│   ├── api/           # tRPC 路由与业务逻辑
│   ├── auth/          # Better-Auth 配置
│   ├── db/            # Drizzle Schema 与数据库客户端
│   ├── ui/            # 共享 shadcn/ui 组件
│   ├── env/           # Zod 环境变量校验
│   └── config/        # 共享 TS/Biome 配置
```

## 规则

@rules/coding-style.md
@rules/testing.md
@rules/security.md
@rules/git-workflow.md
@rules/frontend.md
@rules/backend-api.md
@rules/database.md
