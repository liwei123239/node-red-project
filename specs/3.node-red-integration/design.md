# node-red-integration — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始设计 |

## 项目架构

- 架构类型: Full-stack TypeScript Monorepo
- 涉及层: apps/server、packages/auth、apps/web（入口链接）

## 功能模块设计

### 模块 1: Node-RED Runtime 启动

`apps/server/src/node-red.ts` 负责初始化 `@node-red/runtime`，与 Hono 主服务并行，**使用独立 HTTP server**（避免 Node-RED 内置的 express 与 Hono 冲突）：

```ts
import RED from "@node-red/runtime";
import { createServer } from "node:http";
import express from "express";

const app = express();
const server = createServer(app);

RED.init(server, {
  flowFile: "flows.json",
  userDir: "./data/node-red/",
  httpAdminRoot: "/node-red",
  httpNodeRoot: "/api/node-red",
  adminAuth: buildNodeRedAuth(), // 见模块 2
  nodesDir: "./src/nodes/", // 自定义节点目录
});

app.use(RED.httpAdmin); // 编辑器 UI
app.use(RED.httpNode);  // 流程 HTTP 节点

server.listen(1880);
RED.start();
```

`apps/server/src/index.ts` 在 Hono 服务启动后异步启动 Node-RED（非阻塞）。

### 模块 2: Better-Auth 认证桥接

Node-RED `adminAuth` 使用自定义认证方式，验证 Better-Auth session cookie/token：

```ts
function buildNodeRedAuth() {
  return {
    type: "credentials",
    users: [], // 不使用静态用户
    authenticate: async (username: string, password: string) => {
      // 不走 username/password，改用 sessionToken
      return null;
    },
    tokens: {
      get: async (token: string) => {
        const session = await auth.api.getSession({
          headers: new Headers({ Cookie: `better-auth.session_token=${token}` }),
        });
        if (!session) return null;
        const role = await getMemberRole(session.user.id);
        if (role !== "admin" && role !== "researcher") return null;
        return { user: session.user.email, permissions: { "*": ["read", "write"] } };
      },
    },
  };
}
```

前端打开 Node-RED 编辑器时，通过 `?access_token=<better-auth-token>` 参数传入 token。

### 模块 3: 自定义节点包

`apps/server/src/nodes/total-station/` 目录结构：

```
total-station/
├── ts-connect.js     # 连接/断开硬件网关
├── ts-connect.html   # 节点配置面板
├── ts-station.js     # 执行设站
├── ts-station.html
├── ts-measure.js     # 触发测量，输出 {hz, v, distance}
├── ts-measure.html
└── package.json      # { "node-red": { "nodes": {...} } }
```

每个节点通过 HTTP 调用本机 Hono API（`http://localhost:3000/trpc/...`），复用已有的 device/station/measurement tRPC routers，不直接调用硬件网关。

### 模块 4: 前端入口

`apps/web/src/routes/_auth/flow-editor.tsx`（仅 admin/researcher 可访问）：

```tsx
// 通过 authClient 获取 session token 拼接 URL
const { data: session } = authClient.useSession();
const editorUrl = `http://localhost:1880/node-red?access_token=${session?.token}`;

return <iframe src={editorUrl} className="w-full h-screen border-none" />;
```

导航菜单根据 role 条件渲染「流程编辑器」项。

### 模块 5: 初始流程模板

`apps/server/data/node-red/flows.json` 预置教学示例流程：
- inject → ts-connect → ts-station → ts-measure → debug

## 接口契约

Node-RED 自定义节点内部调用 Hono tRPC API（`localhost:3000`），不对外暴露新接口。

Node-RED 编辑器运行在 `localhost:1880/node-red`（仅内网/本机访问）。

## 数据模型

流程存储为文件系统 JSON（`apps/server/data/node-red/flows.json`），不入数据库，由 Node-RED runtime 管理。

## 安全考虑

- Node-RED 编辑器端口 1880 不对外暴露，通过 Hono 反向代理（可选）或仅本地访问
- adminAuth token 验证路径：前端 session token → Node-RED token 中间件 → Better-Auth session 验证 → role 检查
- student 角色无法访问编辑器，只能通过预置流程执行结果

## 技术决策

| 决策 | 选项 | 理由 |
|------|------|------|
| Node-RED 独立端口 | 1880 独立 HTTP server | 避免 Node-RED express 与 Hono 路由冲突 |
| 自定义节点调用方式 | 通过 HTTP 调用 Hono tRPC | 复用现有鉴权和业务逻辑，不在节点中重复实现 |
| 流程存储 | 文件系统 JSON | Node-RED 原生方式，简单可靠 |
