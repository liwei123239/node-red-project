# node-red-integration — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始任务 |

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo
- specs 路径: specs/3.node-red-integration/

## 任务列表

### 功能 1: Node-RED Runtime 集成

- [ ] T-001: 安装 `@node-red/runtime`、`@node-red/editor-api`、`@node-red/editor-client`、`express` 到 `apps/server` ~10min
- [ ] T-002: 新建 `apps/server/src/node-red.ts`，配置 runtime（userDir、flowFile、httpAdminRoot、nodesDir），独立 HTTP server 监听 1880 端口 ~1h
- [ ] T-003: 在 `apps/server/src/index.ts` 异步启动 Node-RED（不阻塞 Hono 就绪），捕获 Node-RED 崩溃防止主进程退出 ~20min

### 功能 2: 认证桥接

- [ ] T-004: 实现 `buildNodeRedAuth()` 函数，将 Better-Auth session token 映射为 Node-RED adminAuth token，role 非 admin/researcher 时拒绝 ~1h

### 功能 3: 自定义节点

- [ ] T-005: 创建 `apps/server/src/nodes/total-station/` 目录和 package.json，定义三个节点（ts-connect、ts-station、ts-measure）~15min
- [ ] T-006: 实现 `ts-connect.js` + `ts-connect.html`，调用 `localhost:3000/trpc/device.connect` ~30min
- [ ] T-007: 实现 `ts-measure.js` + `ts-measure.html`，调用 `localhost:3000/trpc/measurement.measure`，输出测量数据到下游节点 ~30min
- [ ] T-008: 实现 `ts-station.js` + `ts-station.html`，触发设站流程 ~30min

### 功能 4: 前端入口 + 初始流程

- [ ] T-009: 新建 `apps/web/src/routes/_auth/flow-editor.tsx`，iframe 嵌入 `http://localhost:1880/node-red?access_token=...`（仅 admin/researcher 可访问）~20min
- [ ] T-010: 创建 `apps/server/data/node-red/flows.json` 预置教学示例流程（inject → ts-connect → ts-measure → debug）~15min

### 集成验证

- [ ] T-011: 端到端验证：admin 登录 → 访问「流程编辑器」→ 拖入 ts-measure 节点 → 部署 → inject 触发 → debug 面板显示测量数据；student 登录访问返回 403 ~30min

## 依赖关系

- T-002 依赖 T-001
- T-003 依赖 T-002
- T-004 依赖 T-003（需 auth 可调用）
- T-006、T-007、T-008 依赖 T-005；T-006 依赖 Feature 4 的 device router
- T-009 依赖 T-004，依赖 Feature 1 的 role 判断
- T-011 依赖全部前序任务

## 风险点

- `@node-red/runtime` ESM 兼容性：项目 `"type":"module"`，Node-RED 包可能为 CJS，需要在 tsdown/tsconfig 中处理混用
- Node-RED 内置 express 与 Hono 无直接冲突（独立端口），但 1880 端口需要在防火墙/开发环境开放
- 自定义节点调用 Hono API 时需注意 localhost 环回访问延迟，高频调用时考虑直接调用业务逻辑函数而非 HTTP
