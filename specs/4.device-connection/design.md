# device-connection — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始设计 |

## 项目架构

- 架构类型: Full-stack TypeScript Monorepo
- 涉及层: packages/db、packages/api、apps/web

## 功能模块设计

### 模块 1: 硬件网关客户端

`packages/api/src/lib/gateway-client.ts` 封装对已有硬件网关的 HTTP 调用：

```ts
const GATEWAY_URL = env.GATEWAY_URL; // 如 http://localhost:8080

export const gatewayClient = {
  connect: (params: ConnectParams) =>
    fetch(`${GATEWAY_URL}/connect`, { method: "POST", body: JSON.stringify(params) }),
  disconnect: () =>
    fetch(`${GATEWAY_URL}/disconnect`, { method: "POST" }),
  getStatus: () =>
    fetch(`${GATEWAY_URL}/status`).then(r => r.json()),
  sendCommand: (cmd: string) =>
    fetch(`${GATEWAY_URL}/command`, { method: "POST", body: JSON.stringify({ cmd }) }),
};
```

WebSocket 状态订阅：`ws://${GATEWAY_HOST}/ws/status`，服务端代理给前端（避免前端直连网关）。

> 注意：网关 API 格式待最终确认后更新此处实现。

### 模块 2: 数据库 Schema

`packages/db/src/schema/device.ts`：

```ts
export const deviceConnections = pgTable("device_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),          // 配置名称
  type: text("type").notNull(),          // "serial" | "bluetooth" | "network"
  ipAddress: text("ip_address"),
  port: integer("port"),
  baudRate: integer("baud_rate"),
  bluetoothMac: text("bluetooth_mac"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const connectionLogs = pgTable("connection_logs", {
  id: text("id").primaryKey(),
  connectionId: text("connection_id"),
  userId: text("user_id").notNull(),
  status: text("status").notNull(),      // "success" | "failed"
  reason: text("reason"),
  connectedAt: timestamp("connected_at").defaultNow(),
});
```

### 模块 3: tRPC Router

`packages/api/src/routers/device.ts`，使用 `protectedProcedure`：

| Procedure | 类型 | 说明 |
|---|---|---|
| `device.connect` | mutation | 调用网关 connect，记录日志 |
| `device.disconnect` | mutation | 断开连接 |
| `device.getStatus` | query | 查询当前连接状态 |
| `device.saveConfig` | mutation | 持久化连接配置 |
| `device.listConfigs` | query | 获取用户已保存的配置 |
| `device.deleteConfig` | mutation | 删除配置 |
| `device.getLogs` | query | 获取连接历史 |

### 模块 4: WebSocket 状态推送

Hono 服务通过 `hono/ws`（或 `ws` 包）在 `/ws/device-status` 端点代理网关 WebSocket：

- 前端连接 `ws://localhost:3000/ws/device-status`
- 服务端转发网关推送的状态事件（connected / disconnected / error）

前端使用 `useWebSocket` hook（封装 `reconnecting-websocket`）订阅状态，更新全局 `deviceStatus` store（Zustand 或 React context）。

### 模块 5: 前端页面

`apps/web/src/routes/_auth/device.tsx`：

- 连接方式 Tab（串口 / 蓝牙 / 网络）
- 参数表单（`@tanstack/react-form` + Zod）
- 「连接」/「断开」按钮
- 历史配置下拉选择
- 连接日志列表

`apps/web/src/components/device-status-indicator.tsx`：
- 圆形状态灯（绿/红/黄），展示在顶部 Header 中
- 读取全局 deviceStatus store

## 接口契约

```
POST /trpc/device.connect    { configId | params }
POST /trpc/device.disconnect {}
GET  /trpc/device.getStatus  → { connected: boolean, type: string, since: string }
WS   /ws/device-status       → { event: "connected"|"disconnected"|"error", ... }
```

## 数据模型

见模块 2，新增 `device_connections` 和 `connection_logs` 两张表。

## 安全考虑

- 硬件网关 URL（`GATEWAY_URL`）仅在服务端使用，通过 `packages/env` 管理
- 前端不直接访问网关，所有指令经 Hono 代理
- 连接配置与 `userId` 绑定，用户只能操作自己的配置

## 技术决策

| 决策 | 选项 | 理由 |
|------|------|------|
| 网关通信 | HTTP + WebSocket 代理 | 网关已存在，不重新实现串口/蓝牙逻辑 |
| 状态推送 | WebSocket（服务端代理） | 低延迟实时更新，前端不暴露网关地址 |
| 连接配置存储 | PostgreSQL | 支持多用户多配置，与整体 DB 方案一致 |
