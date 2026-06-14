# auth-roles — 需求规格

## 概述

在已有 Better-Auth 邮箱登录基础上，接入 organization + role 插件，实现管理员/学生/科研人员三角色权限体系，并提供管理员的用户管理界面。

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo (pnpm + Turborepo)

## 需求版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始需求 |

## 用户故事

- 作为管理员（老师），我想要能创建和管理学生账号，以便控制平台访问权限
- 作为学生，我想要登录后只能访问自己权限范围内的功能，以便专注于实训任务
- 作为科研人员，我想要在标准学生权限之上能访问 Node-RED 底层开发能力

## 功能需求

1. [F-001] Better-Auth organization 插件接入，系统维护单一组织（默认组织）
2. [F-002] 三种角色定义：`admin`（管理员/老师）、`student`（学生）、`researcher`（科研人员）
3. [F-003] 新注册用户默认角色为 `student`；系统初始化时生成一个 `admin` 账号
4. [F-004] 登录成功后，根据角色跳转至对应 Dashboard
5. [F-005] tRPC `protectedProcedure` 衍生出 `adminProcedure` 和 `researcherProcedure`，角色不符时返回 `FORBIDDEN`
6. [F-006] 管理员可在用户管理页查看所有用户、修改用户角色、停用账号
7. [F-007] 前端路由根据角色动态显示/隐藏导航菜单项

## 非功能需求

- 安全: 角色校验在服务端 tRPC procedure 中执行，不依赖前端路由守卫
- 性能: 角色信息随 session 一同下发，无需额外请求
- 兼容性: 不影响现有 Better-Auth session 结构

## 验收标准

- [ ] [AC-001] admin 账号可访问用户管理页，student 访问时返回 403
- [ ] [AC-002] 新注册用户自动加入默认组织，角色为 student
- [ ] [AC-003] admin 修改用户角色后，该用户下次请求时权限立即生效
- [ ] [AC-004] 三个角色登录后跳转至各自 Dashboard，菜单项与角色匹配

## 依赖

- `better-auth` organization 插件（已在 catalog 中）
- `packages/db` — 需新增 org/membership 相关表
- `packages/auth` — 更新 auth 配置

## 开放问题

- 是否需要邀请码注册，还是开放注册后由 admin 改角色？（当前方案：开放注册 + admin 后台改角色）
