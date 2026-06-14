# station-setup — 任务清单

## 任务版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始任务 |

## 项目信息

- 项目名: node-red-project
- 架构类型: Full-stack TypeScript Monorepo
- specs 路径: specs/5.station-setup/

## 任务列表

### 功能 1: 数据库与计算逻辑

- [ ] T-001: 新建 `packages/db/src/schema/station.ts`，定义 `known_points` + `station_records` 表；在 schema/index.ts 导出 ~20min
- [ ] T-002: 运行 `pnpm db:push` 创建新表 ~5min
- [ ] T-003: 新建 `packages/api/src/lib/station-calc.ts`，实现后方交会最小二乘计算、已知后视点定向、高程传递等纯函数 ~1h

### 功能 2: tRPC Router

- [ ] T-004: 新建 `packages/api/src/routers/station.ts`，实现已知点库 CRUD 和四种设站 procedure（setupResection、setupKnownBacksight、setupHeightTransfer、setupOther）~1h
- [ ] T-005: 在 `packages/api/src/routers/index.ts` 注册 stationRouter ~5min

### 功能 3: 前端设站页面

- [ ] T-006: 新建 `apps/web/src/routes/_auth/station.tsx`，实现四种设站方式 Tab 切换布局 ~30min
- [ ] T-007: 实现后方交会子流程 UI：已知点选择 → 逐点照准记录 → 计算 → 显示结果（坐标 + 残差）~1h
- [ ] T-008: 实现已知后视点、高程传递、其他定向三种模式 UI ~1h
- [ ] T-009: 实现已知点库管理组件（增删改 + 下拉选择）~30min
- [ ] T-010: 在设站页顶部接入 `useDeviceState` hook，显示实时 Hz/V/电量/时间状态条 ~15min

### 集成验证

- [ ] T-011: 端到端验证：完整后方交会流程（录入已知点 → 照准测量 → 计算 → 保存）；结果在历史记录中可查 ~15min

## 依赖关系

- T-002 依赖 T-001
- T-004 依赖 T-001、T-003
- T-005 依赖 T-004
- T-006 ~ T-010 依赖 T-005
- T-010 依赖 Feature 4 的 `useDeviceStatus` hook
- T-011 依赖 Feature 4（设备已连接）

## 风险点

- 后方交会最小二乘算法需验证计算精度，建议用已知坐标数据集验证结果
- 当观测点共线时后方交会无解，需在 UI 中提示并禁止提交
