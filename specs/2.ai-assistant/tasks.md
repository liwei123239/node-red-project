# ai-assistant — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始任务 |

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo
- specs 路径: specs/2.ai-assistant/

## 任务列表

### 功能 1: 服务端 OpenAI 接入

- [x] T-001: 在 `packages/env` 新增 `OPENAI_API_KEY`、`OPENAI_BASE_URL`（可选）环境变量校验 ~10min
- [x] T-002: 安装 `openai` 包到 `packages/api` ~5min
- [x] T-003: 新建 `packages/api/src/routers/ai-prompts.ts`，定义 guidance / qa / analysis 三套 system prompt ~20min
- [x] T-004: 新建 `packages/api/src/routers/ai.ts`，实现流式 `chat` mutation（protectedProcedure），接入 OpenAI stream ~30min
- [x] T-005: 在 `packages/api/src/routers/index.ts` 注册 aiRouter ~5min

### 功能 2: 前端 AI 对话面板

- [x] T-006: 安装 `react-markdown` 到 `apps/web` ~5min
- [x] T-007: 新建 `apps/web/src/components/ai-assistant/ChatMessage.tsx`（含 Markdown 渲染）~20min
- [x] T-008: 新建 `apps/web/src/components/ai-assistant/AiPanel.tsx`（模式 Tab、消息列表、输入框、流式 append 逻辑）~1h
- [x] T-009: 将 `AiPanel` 集成到 `routes/_auth/dashboard.tsx`（或全局布局）作为可折叠侧边栏 ~20min

### 集成验证

- [x] T-010: 端到端验证：切换三种模式发消息，流式响应逐字出现；API Key 缺失时面板显示降级提示 ~15min

## 依赖关系

- T-004 依赖 T-001、T-002、T-003
- T-005 依赖 T-004
- T-008 依赖 T-006、T-007
- T-009 依赖 T-008、T-005
- T-010 依赖 T-009

## 风险点

- tRPC streaming mutation 需要前端配置 `httpBatchStreamLink`，确认现有 `src/utils/trpc.ts` 链路支持流式
- OpenAI 在国内网络访问可能需要代理，`OPENAI_BASE_URL` 环境变量预留代理地址
