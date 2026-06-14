---
description: 测试约定（当前项目尚未配置测试框架）
---

# Testing

当前项目暂未配置测试框架。添加测试时遵循以下约定：

- 测试文件与源文件并列，命名为 `*.test.ts` 或 `*.spec.ts`
- 用 `async/await`，不用 `done` 回调
- 禁止将 `.only` 或 `.skip` 提交到代码库
- `describe` 嵌套不超过 2 层
- 断言只写在 `it()` / `test()` 块内
- 推荐使用真实数据库而非 mock，避免 mock/生产行为不一致
