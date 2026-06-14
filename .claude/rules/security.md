---
description: 密钥处理、认证与输入校验安全规范
---

# Security

## 密钥与环境变量

- 禁止硬编码任何密钥、Token、数据库连接字符串
- 所有密钥通过 `packages/env` 中的 Zod schema 验证并导出
- `.env`、`.env.local` 等文件必须在 `.gitignore` 中

## 认证

- 所有受保护路由放在 `apps/web/src/routes/_auth/` 下，由 `_auth/route.tsx` 守卫
- 不要自己实现 session 逻辑——使用 Better-Auth 提供的 API
- 服务端每次受保护操作前通过 `packages/auth` 校验 session

## 输入校验

- 所有用户输入在进入数据库前用 Zod schema 校验
- tRPC procedure 的 `.input()` 必须指定 Zod schema

## 前端安全

- `target="_blank"` 链接必须加 `rel="noopener"`
- 禁止 `dangerouslySetInnerHTML`，禁止 `eval()`
- 禁止直接操作 `document.cookie`

## 数据库

- 即使通过 Drizzle，也要避免将原始用户输入拼入查询条件
- 批量 update/delete 必须有明确的 `where` 子句
