# LESSONS — 架构决策与踩坑记录

## 2026-06-13 — auth-roles / Better-Auth Organization Plugin

### drizzle-orm 需在 apps/server 显式声明依赖
seed.ts 在 `apps/server` 下用到了 drizzle-orm，但 server 的 package.json 原来没有这个依赖（通过 workspace 包间接引入但 TS 编译器不认）。需在 server dependencies 里显式加 `"drizzle-orm": "catalog:"`。

### Better-Auth org schema 须手动创建，不自动生成
使用 organization plugin + drizzle adapter 时，`organization`、`member`、`invitation` 三张表不会自动出现在 schema 中。需在 `packages/db/src/schema/org.ts` 手动创建并导出，命名须与 Better-Auth 期望的 model 名一致（variable 名 = Better-Auth 的 model key）。

### drizzleAdapter schema 须合并 authSchema + orgSchema
`createAuth()` 里 drizzleAdapter 的 `schema` 参数原来只传了 authSchema，加 org 插件后须改为 `{ ...authSchema, ...orgSchema }` 才能让 adapter 识别组织相关表。

### 角色查询必须带 organizationId 过滤
`getMemberRole` 和所有 member 表 CRUD 必须同时过滤 `userId` 和 `organizationId`，否则多 org 场景数据串联。即使当前是单 org，也要加过滤保证幂等性。

### header 全局调用 adminProcedure 会对 non-admin 弹 toast
`header.tsx` 用 `users.list`（adminProcedure）判断是否是 admin，导致所有非 admin 用户登录后触发 FORBIDDEN 错误 → QueryCache.onError → error toast。
**修复**：在 `QueryCache.onError` 里判断 `error.data?.code === "FORBIDDEN"` 直接 return，不弹 toast。

### admin guard 须区分 FORBIDDEN vs 其他错误
`_auth/admin/route.tsx` 路由守卫不能只判断 `isError` 就 redirect，需检查 `error.data?.code === "FORBIDDEN"`，否则 transient 500 会把合法 admin 误踢到 dashboard。

### admin 须防止自 deactivate
`users.deactivate` 必须加 `ctx.session.user.id === input.userId` 检查，防止唯一 admin 把自己踢掉导致系统进入无管理员状态。

## 2026-06-13 — ai-assistant / tRPC Streaming

### tRPC v11 async generator streaming 需要 httpBatchStreamLink
服务端 mutation 返回 `async function*`（AsyncGenerator）时，前端必须用 `httpBatchStreamLink` 而非 `httpBatchLink`。`httpBatchStreamLink` 向下兼容所有普通 query/mutation，可直接全局替换，无需 splitLink。

### OpenAI 客户端必须是模块级单例
`new OpenAI({...})` 每次调用会创建新 HTTP agent + 连接池，高并发下会耗尽文件描述符。应在模块顶层初始化一次。

### getMemberRole 必须带 organizationId 过滤（context.ts 同样适用）
`context.ts` 的 `getMemberRole` 一开始只用 `userId` 过滤，与 `users.ts` 行为不一致。所有 member 表查询必须同时过滤 `userId` 和 `organizationId`，包括 context 层。

### updateRole 须用 upsert 防 TOCTOU
SELECT + INSERT/UPDATE 两步写法在并发下会两个请求都读到"无行"然后都插入，导致约束冲突。改用 Drizzle 的 `.onConflictDoUpdate()` 一步原子完成。前提：member 表需有 `UNIQUE(user_id, organization_id)` 约束，drizzle-kit push 对存量数据需 TTY 确认，可改用 `psql -c "ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS"` 绕过。

### 流式错误中途中断须告知用户
AiPanel catch 块原本只在 `content === ''` 时替换错误消息，中途断流（已有部分内容）会让用户看到截断回复而无任何提示。应统一处理：无论 content 是否为空，都追加错误提示。
