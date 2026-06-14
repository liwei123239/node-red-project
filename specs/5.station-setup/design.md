# station-setup — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始设计 |

## 项目架构

- 架构类型: Full-stack TypeScript Monorepo
- 涉及层: packages/db、packages/api、apps/web

## 功能模块设计

### 模块 1: 数据库 Schema

`packages/db/src/schema/station.ts`：

```ts
export const knownPoints = pgTable("known_points", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  x: numeric("x", { precision: 12, scale: 4 }).notNull(),
  y: numeric("y", { precision: 12, scale: 4 }).notNull(),
  z: numeric("z", { precision: 12, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stationRecords = pgTable("station_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: text("task_id"),              // 关联测量任务
  method: text("method").notNull(),     // "resection"|"known-backsight"|"height-transfer"|"other"
  stationX: numeric("station_x", { precision: 12, scale: 4 }),
  stationY: numeric("station_y", { precision: 12, scale: 4 }),
  stationZ: numeric("station_z", { precision: 12, scale: 4 }),
  orientationAngle: numeric("orientation_angle", { precision: 10, scale: 4 }),
  residual: numeric("residual", { precision: 8, scale: 4 }),
  rawData: jsonb("raw_data"),           // 原始观测数据
  createdAt: timestamp("created_at").defaultNow(),
});
```

### 模块 2: tRPC Router

`packages/api/src/routers/station.ts`：

| Procedure | 类型 | 说明 |
|---|---|---|
| `station.knownPoints.list` | query | 获取用户已知点库 |
| `station.knownPoints.upsert` | mutation | 新增/编辑已知点 |
| `station.knownPoints.delete` | mutation | 删除已知点 |
| `station.setupResection` | mutation | 后方交会计算 + 保存结果 |
| `station.setupKnownBacksight` | mutation | 已知后视点定向 |
| `station.setupHeightTransfer` | mutation | 高程传递 |
| `station.setupOther` | mutation | 其他定向（方位角/线/物） |
| `station.getDeviceState` | query | 获取最新 Hz/V/电量（轮询，WebSocket 见下） |
| `station.listRecords` | query | 设站历史（admin 可查所有人） |

### 模块 3: 计算逻辑

`packages/api/src/lib/station-calc.ts` 实现纯函数计算：

- `calcResection(observations: {x,y,hz}[]): {stationX, stationY, orientationAngle, residual}`  
  使用最小二乘法后方交会算法（≥2 个已知点）
- `calcBacksight(station: Point, backsight: Point, measuredHz: number): OrientationResult`
- `calcHeightTransfer(knownZ: number, heightDiff: number): number`

计算结果单位：坐标 m，角度 decimal degrees，保留 4 位小数。

### 模块 4: 实时设备状态

设备状态（Hz/V/电量/时间）通过 WebSocket 从硬件网关推送（经 Feature 4 的 `/ws/device-status` 代理）。

`apps/web/src/hooks/useDeviceState.ts` 封装 WebSocket 订阅，返回 `{ hz, v, battery, time }`。

设站页面顶部状态面板使用此 hook 实时更新，无需额外 tRPC 轮询。

### 模块 5: 前端页面

`apps/web/src/routes/_auth/station.tsx` 主设站页：

- 顶部：实时设备状态条（Hz / V / 电量 / 时间）
- 左侧：设站方式选择（4 个 Tab）
- 右侧：对应方式的操作表单

**后方交会子流程 UI**：
1. 已知点选择（从点库或手输）→ 添加到观测列表
2. 针对每个已知点，点击「照准并记录」→ 调用 `device.sendCommand("measure")` → 记录 Hz 读数
3. ≥2 个观测后，点击「计算设站」→ 调用 `station.setupResection` → 显示结果（坐标 + 残差）
4. 确认后保存

## 接口契约

```
GET  /trpc/station.knownPoints.list       → KnownPoint[]
POST /trpc/station.knownPoints.upsert     { name, x, y, z? }
POST /trpc/station.setupResection         { observations: [{pointId, hz}] }
  → { stationX, stationY, orientationAngle, residual }
POST /trpc/station.setupKnownBacksight    { stationId, backsightId, measuredHz }
WS   /ws/device-status                    → { hz, v, battery, time }
```

## 数据模型

见模块 1：`known_points` + `station_records` 两张新表。

## 安全考虑

- `station_records` 与 `userId` 绑定，学生只能查看自己的记录
- admin 可通过 `adminProcedure` 变体查询所有记录
- 所有设站操作需设备已连接，procedure 中先调用 `gateway.getStatus()` 校验

## 技术决策

| 决策 | 选项 | 理由 |
|------|------|------|
| 计算逻辑位置 | packages/api 纯函数 | 便于单元测试，不依赖数据库或设备 |
| 角度存储格式 | decimal degrees | 计算便利，UI 显示时转换为 DMS |
| 已知点存储 | DB（per user） | 多次实训复用，无需重复录入 |
