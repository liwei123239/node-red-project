#!/usr/bin/env node
// PostToolUse(Write|Edit) hook: 只 format「刚被编辑的那个文件」,而非全仓。
// 旧配置 `pnpm run fix`(全仓)会在每次编辑后 reformat 整个仓库,产生大量无关改动。
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

let raw = "";
process.stdin.on("data", (d) => {
	raw += d;
});
process.stdin.on("end", () => {
	let filePath;
	try {
		filePath = JSON.parse(raw)?.tool_input?.file_path;
	} catch {
		process.exit(0); // 解析失败:静默放行,绝不卡住编辑流程
	}
	if (!(filePath && existsSync(filePath))) {
		process.exit(0);
	}
	const r = spawnSync(
		"pnpm",
		[
			"exec",
			"ultracite",
			"fix",
			"--skip=correctness/noUnusedImports",
			"--",
			filePath,
		],
		{ stdio: "inherit", cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd() }
	);
	process.exit(r.status ?? 0);
});
