# auth-roles — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始设计 |

## 项目架构

- 架构类型: Full-stack TypeScript Monorepo
- 涉及层: packages/auth、packages/db、packages/api、apps/web

## 功能模块设计

### 模块 1: Better-Auth 组织与角色配置

在 `packages/auth/src/index.ts` 中启用 `organization` 插件：

```ts
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    organization({
      allowUserToCreateOrganization: false, // 只有系统初始化创建
    }),
  ],
});
```

角色枚举定义在 `packages/auth/src/roles.ts`：

```ts
export const ROLES = {
  ADMIN: "admin",
  STUDENT: "student",
  RESEARCHER: "researcher",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
```

### 模块 2: 数据库 Schema

Better-Auth organization 插件自动管理以下表（禁止手动编辑）：
- `organization` — 组织表
- `member` — 成员表（含 `role` 字段）
- `invitation` — 邀请表

新增业务需要在 `packages/db/src/schema/` 中无额外表，角色直接读 `member.role`。

运行 `pnpm db:push` 让 Better-Auth 生成所属表结构。

### 模块 3: tRPC 上下文与角色 procedure

`packages/api/src/context.ts` 扩展，将成员角色附加到 context：

```ts
export async function createContext({ req }: { req: Request }) {
  const session = await auth.api.getSession({ headers: req.headers });
  const role = session
    ? await getMemberRole(session.user.id) // 查 member 表
    : null;
  return { session, role, db };
}
```

`packages/api/src/trpc.ts` 新增角色守卫 procedure：

```ts
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

export const researcherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.role !== "admin" && ctx.role !== "researcher")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
```

### 模块 4: 用户管理 tRPC Router

`packages/api/src/routers/users.ts`（仅 adminProcedure）：

```ts
listUsers: adminProcedure.query(...)
updateRole: adminProcedure.input(z.object({ userId: z.string(), role: z.enum(["admin","student","researcher"]) })).mutation(...)
deactivateUser: adminProcedure.input(z.object({ userId: z.string() })).mutation(...)
```

### 模块 5: 前端路由与权限

`apps/web/src/routes/_auth/route.tsx` — 现有 session 守卫基础上，挂载 role 到 router context：

```ts
const role = session?.user.role; // 从 session 扩展字段获取
```

新路由文件：
- `routes/_auth/admin/users.tsx` — 用户管理页（adminOnly）
- `routes/_auth/dashboard.tsx` — 按角色显示不同入口菜单

导航菜单根据 `role` 动态渲染（`admin` 显示「用户管理」入口，`researcher` 显示「流程编辑器」入口）。

## 接口契约

| Procedure | 类型 | 权限 | 说明 |
|---|---|---|---|
| `users.list` | query | admin | 分页获取所有用户及角色 |
| `users.updateRole` | mutation | admin | 更新用户角色 |
| `users.deactivate` | mutation | admin | 停用账号 |
| `auth.getSession` | — | public | Better-Auth 内置 |

## 数据模型

Better-Auth 自动创建的 `member` 表关键字段：

```
member
  id           text PK
  organizationId text FK → organization.id
  userId       text FK → user.id
  role         text   -- "admin" | "student" | "researcher"
  createdAt    timestamp
```

## 安全考虑

- 角色判断在 tRPC procedure 服务端执行，前端菜单隐藏仅为体验优化
- session token 不包含明文角色，每次请求从 DB 查询 member.role
- 参考 security.md：受保护操作前必须校验 session

## 技术决策

| 决策 | 选项 | 理由 |
|------|------|------|
| 角色存储 | Better-Auth member.role | 与 org 插件原生集成，无需自定义表 |
| 初始 org 创建 | 服务启动时幂等脚本 | 避免手动操作，保证环境一致性 |
| 前端角色获取 | session 扩展字段 | 减少额外 API 请求 |
