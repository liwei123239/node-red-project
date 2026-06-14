# measurement — 技术设计

## 设计版本

| 日期       | 版本 | 说明     |
| ---------- | ---- | -------- |
| 2026-06-13 | v1   | 初始设计 |

## 项目架构

- 架构类型: Full-stack TypeScript Monorepo
- 涉及层: packages/db、packages/api、apps/web

## 功能模块设计

### 模块 1: 数据库 Schema

`packages/db/src/schema/measurement.ts`：

```ts
export const measurementTasks = pgTable("measurement_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  stationId: text("station_id"),         // 关联 station_records
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("active"), // "active"|"completed"
  createdAt: timestamp("created_at").defaultNow(),
});

export const measurements = pgTable("measurements", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  targetName: text("target_name"),
  hz: numeric("hz", { precision: 10, scale: 4 }).notNull(),
  v: numeric("v", { precision: 10, scale: 4 }).notNull(),
  slopeDistance: numeric("slope_distance", { precision: 10, scale: 4 }),
  horizontalDistance: numeric("horizontal_distance", { precision: 10, scale: 4 }),
  mode: text("mode").notNull(),          // "fine"|"coarse"
  repeatCount: integer("repeat_count").default(1),
  notes: text("notes"),
  measuredAt: timestamp("measured_at").defaultNow(),
});
```

照片存储在服务器文件系统 `apps/server/data/photos/`，数据库只存路径/URL。

### 模块 2: tRPC Router

`packages/api/src/routers/measurement.ts`：

| Procedure | 类型 | 说明 |
|---|---|---|
| `measurement.createTask` | mutation | 创建任务（含拍照触发） |
| `measurement.listTasks` | query | 获取任务列表 |
| `measurement.getTask` | query | 任务详情含测量点列表 |
| `measurement.searchTargets` | mutation | 触发设备扫描棱镜，返回候选列表 |
| `measurement.lockTarget` | mutation | ATR 照准目标，设备自动转向 |
| `measurement.measure` | mutation | 触发测量，保存结果 |
| `measurement.deleteMeasurement` | mutation | 删除单个测量点 |
| `measurement.updateNotes` | mutation | 更新备注 |
| `measurement.exportCSV` | query | 导出 CSV 文本 |
| `measurement.exportPDF` | mutation | 生成 PDF（使用 `@jspdf/jspdf`） |

### 模块 3: 搜索与跟踪

搜索策略通过 `device.sendCommand` 传入不同指令：

- `SEARCH_ALL` — 超级搜索，扫描全周
- `ATR_LOCK {targetId}` — 自动照准指定目标
- `TRACK_SEARCH` — 搜索并跟踪（目标移动时持续跟踪）
- `TRACK_WAIT` — 等待并跟踪

设备扫描结果通过 WebSocket 事件推送（`event: "targets-found"`），包含候选棱镜列表（ID、方向角、距离）。

### 模块 4: 实时测量数据面板

沿用 Feature 4/5 建立的 `useDeviceState` hook，实时显示 Hz/V/斜距/平距。

ATR 锁定后，数据会快速收敛到目标方向，UI 用动画高亮变化。

### 模块 5: 导出功能

**CSV 导出**（服务端生成字符串，前端触发下载）：

```
任务名, 日期, 测站ID
点号, 目标名, Hz(°), V(°), 斜距(m), 平距(m), 测量时间
```

**PDF 导出**（服务端使用 `jspdf` + `jspdf-autotable`）：
- 封面：项目名、操作员、日期、测站信息
- 数据表格：同 CSV 字段
- 现场照片（如有）

### 模块 6: 前端页面

`apps/web/src/routes/_auth/measurement.tsx`：

布局分三区：
- **左列**：任务列表 + 创建任务按钮
- **中列**：相机视图（`<img>` 实时刷新或 MJPEG stream）+ 搜索/锁定控制按钮
- **右列**：实时角度距离数据 + 测量配置（模式/次数）+ 一键测量按钮

测量结果独立页 `routes/_auth/measurement.$taskId.tsx`：测量点列表 + 导出按钮。

## 接口契约

```
POST /trpc/measurement.createTask   { name }
POST /trpc/measurement.searchTargets {}  → { targets: [{id, hz, distance}] }
POST /trpc/measurement.lockTarget   { targetId }
POST /trpc/measurement.measure      { taskId, mode, repeatCount }
  → { hz, v, slopeDistance, horizontalDistance }
GET  /trpc/measurement.exportCSV    { taskId } → string (CSV)
POST /trpc/measurement.exportPDF    { taskId } → base64 PDF
```

## 数据模型

见模块 1：`measurement_tasks` + `measurements` 两张新表。

## 安全考虑

- 测量数据与 `userId` 绑定，学生不能访问其他人任务
- 触发测量前校验：设备已连接 + 设站记录存在，否则返回 `PRECONDITION_FAILED`
- 照片文件存储路径不含用户输入，防止路径遍历

## 技术决策

| 决策 | 选项 | 理由 |
|------|------|------|
| PDF 生成 | 服务端 jspdf | 不依赖浏览器打印 API，格式可控 |
| 相机视图 | MJPEG 或周期刷新 img | 取决于硬件网关能力，先用 img 轮询兜底 |
| 照片存储 | 文件系统 | 避免 DB BLOB，路径存 DB |
