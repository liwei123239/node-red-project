# node-red-integration — 需求规格

## 概述

将 `@node-red/runtime` 嵌入现有 Hono 服务，提供 Node-RED 可视化流程编辑器界面，并开发全站仪专用自定义节点，供学生拖拽构建测量工作流。

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo (pnpm + Turborepo)

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始需求 |

## 用户故事

- 作为学生，我想要通过拖拽节点连线来控制全站仪，不需要编写代码
- 作为科研人员，我想要开发自定义 Node-RED 节点实现特殊测量流程
- 作为管理员，我想要通过 Node-RED 编辑器配置和发布标准教学工作流

## 功能需求

1. [F-001] 在 `apps/server` 中集成 `@node-red/runtime`，与 Hono 并存
2. [F-002] Node-RED 编辑器 UI 通过 `/node-red` 路径访问，受 Better-Auth session 保护
3. [F-003] 仅 `admin` 和 `researcher` 角色可访问 Node-RED 编辑器；`student` 只能执行已发布的流程
4. [F-004] 开发自定义节点包 `node-red-contrib-total-station`，包含以下节点：
   - `ts-connect`：连接/断开硬件网关
   - `ts-station`：执行设站操作
   - `ts-measure`：触发一次测量，输出角度/距离数据
5. [F-005] Node-RED 流程存储到文件系统（`apps/server/data/flows/`）
6. [F-006] 前端导航中为 admin/researcher 显示「流程编辑器」入口（`iframe` 嵌入或新标签页）
7. [F-007] 基础教学流程模板随系统初始化预置（示例：设站 → 测量 → 输出结果）

## 非功能需求

- 安全: Node-RED adminAuth 与 Better-Auth session token 桥接，禁止匿名访问
- 性能: Node-RED runtime 启动时间不阻塞 Hono 服务的就绪
- 稳定性: Node-RED 崩溃不影响 Hono API 主进程

## 验收标准

- [ ] [AC-001] 以 admin 身份登录后可访问 `/node-red` 编辑器，student 被拒绝
- [ ] [AC-002] 拖入 `ts-measure` 节点并部署，inject 触发后输出测量数据到 debug 面板
- [ ] [AC-003] 重启服务后，已保存的流程自动恢复
- [ ] [AC-004] Node-RED 编辑器内无法绕过认证直接访问管理 API

## 依赖

- `@node-red/runtime`、`@node-red/editor-api`、`@node-red/editor-client` npm 包
- 依赖 Feature 1 (auth-roles) — 角色权限判断
- 依赖 Feature 4 (device-connection) — 自定义节点需调用设备网关

## 开放问题

- 无
