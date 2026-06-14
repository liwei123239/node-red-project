# auth-roles — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始任务 |

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo
- specs 路径: specs/1.auth-roles/

## 任务列表

### 功能 1: Better-Auth 角色配置

- [x] T-001: 在 `packages/auth/src/index.ts` 启用 organization 插件，定义 `allowUserToCreateOrganization: false` ~15min
- [x] T-002: 新建 `packages/auth/src/roles.ts`，定义 ROLES 枚举（admin/student/researcher）~10min
- [x] T-003: 运行 `pnpm db:push`，确认 Better-Auth organization 相关表已创建 ~15min
- [x] T-004: 创建初始化脚本 `apps/server/src/scripts/seed.ts`，幂等创建默认组织和 admin 账号 ~30min

### 功能 2: tRPC 角色守卫

- [x] T-005: 在 `packages/api/src/context.ts` 扩展 context，查询 member.role 附加到 ctx ~30min
- [x] T-006: 在 tRPC 初始化文件新增 `adminProcedure` 和 `researcherProcedure`，角色不符时抛出 FORBIDDEN ~20min

### 功能 3: 用户管理 API + 前端

- [x] T-007: 新建 `packages/api/src/routers/users.ts`，实现 `listUsers`、`updateRole`、`deactivateUser`（adminProcedure）~30min
- [x] T-008: 新建 `apps/web/src/routes/_auth/admin/users.tsx`，实现用户列表 + 角色下拉修改 UI ~1h
- [x] T-009: 更新 `apps/web/src/routes/_auth/route.tsx`，将 role 注入 router context；更新导航菜单按 role 条件渲染 ~30min

### 集成验证

- [x] T-010: 端到端验证：admin 修改用户角色 → 用户重新请求 → 权限立即生效；student 访问 admin 路由返回 403 ~15min

## 依赖关系

- T-003 依赖 T-001
- T-005 依赖 T-003
- T-006 依赖 T-005
- T-007 依赖 T-006
- T-008 依赖 T-007
- T-009 依赖 T-005
- T-010 依赖 T-008、T-009

## 风险点

- Better-Auth organization 插件版本与当前 `better-auth` catalog 版本的兼容性，需确认插件 API
- `pnpm db:push` 可能因表冲突失败，需先备份本地 DB
