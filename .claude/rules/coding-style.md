---
description: TypeScript 编码规范，由 Ultracite/Biome 强制执行
---

# Coding Style

提交前运行 `pnpm fix`（ultracite fix），大多数问题自动修正。

## 变量与类型

- `const` 优先，仅在需要重新赋值时用 `let`，禁用 `var`
- 导出函数必须写明参数类型与返回类型
- 优先 `unknown` 而非 `any`；用类型收窄代替类型断言
- 魔法数字提取为具名常量

## 语法偏好

- 箭头函数用于回调与短函数
- `for...of` 替代 `.forEach()` 和 indexed `for`
- 可选链 `?.` 与空值合并 `??` 进行安全属性访问
- 模板字符串替代字符串拼接
- 解构赋值处理对象与数组

## 异步

- async 函数中始终 `await` Promise，不要丢弃返回值
- 用 `async/await` 替代 Promise 链
- 用 `try-catch` 处理错误，不要只为了 rethrow 而 catch

## 代码组织

- 函数保持单一职责，减少认知复杂度
- 用 early return 替代深层嵌套
- 避免嵌套三元表达式
- 无 barrel 文件（把所有内容 re-export 的 index.ts）

## 禁止事项

- 禁止 `console.log`/`debugger` 出现在提交代码中
- 抛出 `Error` 对象，不得抛出字符串
- 禁止循环内部创建正则——提到模块顶层定义
- 禁止在循环累加器中使用 spread

## Workspace 导入

包之间通过 workspace 别名导入：`@node-red-project/<pkg>`
