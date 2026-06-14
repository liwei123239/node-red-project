# measurement — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始任务 |

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo
- specs 路径: specs/6.measurement/

## 任务列表

### 功能 1: 数据库与 API

- [ ] T-001: 新建 `packages/db/src/schema/measurement.ts`，定义 `measurement_tasks` + `measurements` 表；在 schema/index.ts 导出 ~20min
- [ ] T-002: 运行 `pnpm db:push` 创建新表 ~5min
- [ ] T-003: 新建 `packages/api/src/routers/measurement.ts`，实现 createTask、searchTargets、lockTarget、measure、deleteMeasurement、updateNotes procedure ~1h
- [ ] T-004: 实现 exportCSV（query 返回字符串）和 exportPDF（安装 `jspdf`、`jspdf-autotable`，服务端生成 base64 PDF）~1h
- [ ] T-005: 在 `packages/api/src/routers/index.ts` 注册 measurementRouter ~5min

### 功能 2: 测量作业界面

- [ ] T-006: 新建 `apps/web/src/routes/_auth/measurement.tsx`，实现三列布局（任务列表 / 相机视图+搜索控制 / 实时数据+测量按钮）~1h
- [ ] T-007: 实现目标搜索 UI：点击「搜索」→ 调用 `searchTargets` → 候选棱镜列表展示 → 选择后调用 `lockTarget` ~30min
- [ ] T-008: 实现一键测量：配置模式（精测/粗测）和重复次数 → 调用 `measure` → 结果追加到列表 ~30min
- [ ] T-009: 实现跟踪模式切换 UI（搜索并跟踪 / 等待并跟踪，发送对应 command 给硬件网关）~20min

### 功能 3: 结果管理与导出

- [ ] T-010: 新建 `apps/web/src/routes/_auth/measurement.$taskId.tsx`，测量点列表 + 删除 + 备注编辑 + 导出 CSV/PDF 按钮 ~1h

### 集成验证

- [ ] T-011: 端到端验证：创建任务 → 搜索目标 → 锁定 → 测量 → 查看结果列表 → 导出 CSV 内容正确 ~15min

## 依赖关系

- T-002 依赖 T-001
- T-003 依赖 T-001
- T-004 依赖 T-003
- T-005 依赖 T-003、T-004
- T-006 ~ T-010 依赖 T-005
- T-011 依赖 Feature 4（设备连接）、Feature 5（设站完成）

## 风险点

- PDF 生成需要确认 `jspdf` 对中文字符的支持（需加载中文字体或使用 Unicode 模式）
- 相机视图（MJPEG stream / 周期刷新）取决于硬件网关能力，需在拿到网关 API 后确认实现方式
- `measurement.$taskId` 动态路由与 TanStack Router 文件命名约定需确认（`$` 前缀语法）
