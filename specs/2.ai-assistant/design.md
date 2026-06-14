# ai-assistant — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始设计 |

## 项目架构

- 架构类型: Full-stack TypeScript Monorepo
- 涉及层: packages/env、packages/api、apps/web

## 功能模块设计

### 模块 1: 环境变量

`packages/env/src/index.ts` 新增：

```ts
OPENAI_API_KEY: z.string().min(1),
OPENAI_BASE_URL: z.string().url().optional(), // 支持代理
```

### 模块 2: tRPC AI Router（流式）

`packages/api/src/routers/ai.ts`，使用 `protectedProcedure`（登录即可）：

```ts
import OpenAI from "openai";

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export const aiRouter = router({
  chat: protectedProcedure
    .input(z.object({
      mode: z.enum(["guidance", "qa", "analysis"]),
      messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string() })),
      measurementContext: z.string().optional(),
    }))
    .mutation(async function* ({ input }) {
      const systemPrompt = buildSystemPrompt(input.mode, input.measurementContext);
      const stream = await client.chat.completions.create({
        model: "gpt-4o",
        stream: true,
        messages: [{ role: "system", content: systemPrompt }, ...input.messages],
      });
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content ?? "";
      }
    }),
});
```

tRPC 流式 mutation 使用 `httpBatchStreamLink` 在前端接收。

### 模块 3: 系统提示词

`packages/api/src/routers/ai-prompts.ts` 定义三种模式的 system prompt：

- **guidance**：聚焦全站仪操作步骤指引，结合当前页面上下文
- **qa**：测绘设备疑难解答，引用国家测绘标准
- **analysis**：接收结构化测量数据，给出统计分析和误差评估建议

### 模块 4: 前端 AI 面板组件

`apps/web/src/components/ai-assistant/` 下：

- `AiPanel.tsx` — 可折叠侧边浮窗，包含模式切换 Tab 和消息列表
- `ChatMessage.tsx` — 单条消息，支持 Markdown 渲染（使用 `react-markdown`）
- `ChatInput.tsx` — 输入框 + 发送按钮，支持 Enter 发送

状态管理：组件内部 `useState` 维护 messages 列表，无需持久化。

流式接收：

```ts
const mutation = trpc.ai.chat.useMutation();
// 使用 tRPC streaming mutation，逐步 append 到最后一条 assistant message
```

### 模块 5: 测量数据注入

数据分析模式下，`AiPanel` 接受 `measurementData` prop，调用时序列化为 JSON 字符串作为 `measurementContext` 传入 API。

Feature 6 完成后，measurement 页面将测量结果数组传入 `AiPanel`。

## 接口契约

| Procedure | 类型 | 输入 | 输出 |
|---|---|---|---|
| `ai.chat` | streaming mutation | mode, messages[], measurementContext? | AsyncGenerator\<string\> |

## 数据模型

无持久化，对话历史维护在前端内存中（session 级别）。

## 安全考虑

- `OPENAI_API_KEY` 仅在 `packages/api` 服务端使用，从不发送到前端
- 用户输入长度限制（单条 ≤ 2000 字符），防止 token 滥用
- `protectedProcedure` 确保未登录用户无法调用

## 技术决策

| 决策 | 选项 | 理由 |
|------|------|------|
| AI 模型 | gpt-4o | 能力与成本均衡，支持中文测绘场景 |
| 流式传输 | tRPC httpBatchStreamLink | 与现有 tRPC 栈一致，无需引入 SSE/WebSocket |
| 对话持久化 | 不持久化（内存） | 降低复杂度，测绘对话无需跨 session 保留 |
