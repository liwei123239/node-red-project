---
description: React SPA 开发规范
globs: apps/web/**
---

# Frontend (apps/web)

## 路由

- 文件即路由，位于 `apps/web/src/routes/`（TanStack Router）
- 受保护页面放在 `routes/_auth/`，`_auth/route.tsx` 负责 session 守卫
- 添加新路由后，`pnpm dev:web` 会自动重新生成 `routeTree.gen.ts`
- 禁止手动编辑 `routeTree.gen.ts`

## 数据获取

- 所有 API 调用通过 `src/utils/trpc.ts` 的 tRPC hooks，禁止直接 `fetch()`
- TanStack Query 管理缓存；数据变更后用 `queryClient.invalidateQueries` 刷新
- 表单状态用 `@tanstack/react-form` + Zod resolver

## UI 组件

- 共享基础组件从 `@node-red-project/ui` 按需导入，不导入 index
- 应用专属组件放在 `apps/web/src/components/`
- 新增共享组件：`npx shadcn@latest add <component> -c packages/ui`
- 主题切换：`next-themes`，组件在 `components/mode-toggle.tsx`
- Toast：`sonner`

## 认证

- 使用 `src/lib/auth-client.ts`（Better-Auth 客户端）
- 读取 session：`authClient.useSession()`
- 不要直接调用 `/api/auth/*` 端点

## 组件规范

- 只用函数组件，不用 class 组件
- Hook 只在组件顶层调用，不在条件/循环中调用
- 正确填写 `useEffect`/`useCallback` 的依赖数组
- 列表的 `key` 使用稳定唯一 ID，不用数组索引
- 不在组件内部定义组件

## 样式

- TailwindCSS v4 工具类；全局样式在 `packages/ui/src/styles/globals.css`
- 不内联大段样式对象
