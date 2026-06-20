import { Button } from "@node-red-project/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@node-red-project/ui/components/card";
import { Input } from "@node-red-project/ui/components/input";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_auth/measurements")({
	component: MeasurementsPage,
});

type MeasurementStatus = "normal" | "warning" | "alarm";

interface MeasurementRecord {
	device: string;
	id: string;
	location: string;
	measuredAt: string;
	metric: string;
	operator: string;
	status: MeasurementStatus;
	unit: string;
	value: number;
}

// 纯前端 mock 数据：仅用于演示测量记录列表 UI，无后端依赖。
const MOCK_RECORDS: MeasurementRecord[] = [
	{
		id: "M-20260620-001",
		device: "温度传感器 A1",
		location: "一号车间 · 北侧",
		metric: "温度",
		value: 23.6,
		unit: "°C",
		status: "normal",
		operator: "张工",
		measuredAt: "2026-06-20 08:12:33",
	},
	{
		id: "M-20260620-002",
		device: "湿度传感器 B2",
		location: "一号车间 · 南侧",
		metric: "湿度",
		value: 71.2,
		unit: "%RH",
		status: "warning",
		operator: "张工",
		measuredAt: "2026-06-20 08:13:01",
	},
	{
		id: "M-20260620-003",
		device: "电压采集器 C1",
		location: "配电房 · 主柜",
		metric: "电压",
		value: 236.8,
		unit: "V",
		status: "normal",
		operator: "李工",
		measuredAt: "2026-06-20 09:02:47",
	},
	{
		id: "M-20260620-004",
		device: "压力变送器 D3",
		location: "二号车间 · 管线",
		metric: "压力",
		value: 1.62,
		unit: "MPa",
		status: "alarm",
		operator: "王工",
		measuredAt: "2026-06-20 09:45:12",
	},
	{
		id: "M-20260620-005",
		device: "电流采集器 C4",
		location: "配电房 · 副柜",
		metric: "电流",
		value: 12.4,
		unit: "A",
		status: "normal",
		operator: "李工",
		measuredAt: "2026-06-20 10:18:05",
	},
	{
		id: "M-20260620-006",
		device: "温度传感器 A7",
		location: "冷库 · 三区",
		metric: "温度",
		value: -18.3,
		unit: "°C",
		status: "warning",
		operator: "王工",
		measuredAt: "2026-06-20 10:51:39",
	},
];

const STATUS_META: Record<
	MeasurementStatus,
	{ label: string; className: string }
> = {
	normal: {
		label: "正常",
		className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
	},
	warning: {
		label: "预警",
		className: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
	},
	alarm: {
		label: "报警",
		className: "bg-red-500/15 text-red-600 dark:text-red-400",
	},
};

const STATUS_FILTERS: { value: MeasurementStatus | "all"; label: string }[] = [
	{ value: "all", label: "全部" },
	{ value: "normal", label: "正常" },
	{ value: "warning", label: "预警" },
	{ value: "alarm", label: "报警" },
];

function StatusBadge({ status }: { status: MeasurementStatus }) {
	const meta = STATUS_META[status];
	return (
		<span
			className={`inline-flex items-center rounded-none px-2 py-0.5 font-medium text-xs ${meta.className}`}
		>
			{meta.label}
		</span>
	);
}

function MeasurementTable({ records }: { records: MeasurementRecord[] }) {
	if (records.length === 0) {
		return (
			<p className="py-8 text-center text-muted-foreground text-sm">
				没有匹配的测量记录。
			</p>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[44rem] text-xs">
				<thead>
					<tr className="border-border border-b text-left text-muted-foreground">
						<th className="pr-4 pb-2 font-medium">记录编号</th>
						<th className="pr-4 pb-2 font-medium">设备</th>
						<th className="pr-4 pb-2 font-medium">位置</th>
						<th className="pr-4 pb-2 font-medium">测量项</th>
						<th className="pr-4 pb-2 text-right font-medium">数值</th>
						<th className="pr-4 pb-2 font-medium">状态</th>
						<th className="pr-4 pb-2 font-medium">操作员</th>
						<th className="pb-2 font-medium">测量时间</th>
					</tr>
				</thead>
				<tbody>
					{records.map((r) => (
						<tr className="border-border/50 border-b last:border-0" key={r.id}>
							<td className="py-2.5 pr-4 font-mono text-muted-foreground">
								{r.id}
							</td>
							<td className="py-2.5 pr-4 font-medium">{r.device}</td>
							<td className="py-2.5 pr-4 text-muted-foreground">
								{r.location}
							</td>
							<td className="py-2.5 pr-4">{r.metric}</td>
							<td className="py-2.5 pr-4 text-right tabular-nums">
								{r.value} {r.unit}
							</td>
							<td className="py-2.5 pr-4">
								<StatusBadge status={r.status} />
							</td>
							<td className="py-2.5 pr-4 text-muted-foreground">
								{r.operator}
							</td>
							<td className="py-2.5 text-muted-foreground tabular-nums">
								{r.measuredAt}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function MeasurementsPage() {
	const [keyword, setKeyword] = useState("");
	const [status, setStatus] = useState<MeasurementStatus | "all">("all");

	const filtered = useMemo(() => {
		const trimmed = keyword.trim().toLowerCase();
		return MOCK_RECORDS.filter((r) => {
			const matchesStatus = status === "all" || r.status === status;
			const matchesKeyword =
				trimmed === "" ||
				r.device.toLowerCase().includes(trimmed) ||
				r.location.toLowerCase().includes(trimmed) ||
				r.id.toLowerCase().includes(trimmed);
			return matchesStatus && matchesKeyword;
		});
	}, [keyword, status]);

	return (
		<div className="mx-auto max-w-5xl p-6">
			<Card>
				<CardHeader>
					<CardTitle>测量记录</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<Input
							aria-label="搜索测量记录（编号、设备或位置）"
							className="sm:max-w-xs"
							onChange={(e) => setKeyword(e.target.value)}
							placeholder="搜索编号 / 设备 / 位置…"
							value={keyword}
						/>
						<div className="flex gap-1">
							{STATUS_FILTERS.map((f) => (
								<Button
									aria-pressed={status === f.value}
									key={f.value}
									onClick={() => setStatus(f.value)}
									size="xs"
									variant={status === f.value ? "default" : "outline"}
								>
									{f.label}
								</Button>
							))}
						</div>
					</div>
					<p className="text-muted-foreground text-xs">
						共 {filtered.length} 条记录
					</p>
					<MeasurementTable records={filtered} />
				</CardContent>
			</Card>
		</div>
	);
}
