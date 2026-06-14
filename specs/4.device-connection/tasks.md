# device-connection — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始任务 |

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo
- specs 路径: specs/4.device-connection/

## 任务列表

### 功能 1: 数据库与 API

- [ ] T-001: 新建 `packages/db/src/schema/device.ts`，定义 `device_connections` + `connection_logs` 表；在 schema/index.ts 导出 ~20min
- [ ] T-002: 运行 `pnpm db:push` 创建新表 ~5min
- [ ] T-003: 在 `packages/env` 新增 `GATEWAY_URL` 环境变量 ~10min
- [ ] T-004: 新建 `packages/api/src/lib/gateway-client.ts`，封装硬件网关 HTTP 调用（connect / disconnect / status / sendCommand）~30min
- [ ] T-005: 新建 `packages/api/src/routers/device.ts`，实现 connect、disconnect、getStatus、saveConfig、listConfigs、deleteConfig、getLogs procedure ~1h
- [ ] T-006: 在 `packages/api/src/routers/index.ts` 注册 deviceRouter ~5min

### 功能 2: WebSocket 状态代理

- [ ] T-007: 在 `apps/server/src/index.ts` 新增 `/ws/device-status` WebSocket 端点，代理网关 WebSocket 状态推送 ~30min

### 功能 3: 前端 UI

- [ ] T-008: 新建 `apps/web/src/hooks/useDeviceStatus.ts`，封装 WebSocket 订阅，返回 `{ connected, type, hz, v, battery }` ~20min
- [ ] T-009: 新建 `apps/web/src/components/device-status-indicator.tsx`，顶部导航状态灯（绿/红/黄）~15min
- [ ] T-010: 新建 `apps/web/src/routes/_auth/device.tsx`，实现连接配置表单（串口/蓝牙/网络 Tab）、保存配置、连接/断开操作、连接日志列表 ~1h

### 集成验证

- [ ] T-011: 端到端验证：配置参数 → 连接 → 状态灯变绿 → 断开 → 状态灯变红；配置持久化验证 ~15min

## 依赖关系

- T-002 依赖 T-001
- T-004 依赖 T-003
- T-005 依赖 T-001、T-004
- T-006 依赖 T-005
- T-007 依赖 T-004
- T-009、T-010 依赖 T-008
- T-010 依赖 T-006
- T-011 依赖全部前序任务

## 风险点

- 硬件网关 API 格式未最终确认，T-004 实现后可能需要调整接口细节
- WebSocket 在 Hono（`@hono/node-server`）中的支持方式，可能需要 `hono/ws` 适配器或直接使用 `ws` 包绑定到底层 Node HTTP server
