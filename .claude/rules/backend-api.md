---
description: Hono 服务器与 tRPC API 开发规范
globs: apps/server/**, packages/api/**
---

# Backend API

## 项目结构

- HTTP 服务入口: `apps/server/src/index.ts`（Hono，端口 3000）
- tRPC 路由定义在 `packages/api/src/routers/<domain>.ts`
- 聚合所有路由在 `packages/api/src/routers/index.ts`
- tRPC context（session、db）在 `packages/api/src/context.ts` 构建

## 添加新路由

1. 在 `packages/api/src/routers/` 新建 `<domain>.ts`
2. 在 `packages/api/src/routers/index.ts` 注册到 appRouter
3. 无需修改 `apps/server/src/index.ts`

## tRPC 规范

- 未认证端点用 `publicProcedure`，需认证用 `protectedProcedure`
- 每个 procedure 的 `.input()` 必须有 Zod schema
- 抛出 `TRPCError` 并指定 code（`UNAUTHORIZED`、`NOT_FOUND` 等）
- 不向客户端暴露内部错误细节

## Hono 规范

- tRPC 挂载在 `/trpc`（通过 `@hono/trpc-server`）
- Better-Auth handler 挂载在 `/api/auth`
- 中间件顺序：CORS → auth → tRPC

## 错误处理

- 使用 early return 处理守卫条件
- 不要只为 rethrow 而 catch
- 业务错误用 `TRPCError`，非预期错误向上冒泡
