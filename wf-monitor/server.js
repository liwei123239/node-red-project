#!/usr/bin/env node
// wf-monitor —— 极简 workflow 状态监控
// 零依赖。既接收 Claude Code hook 的上报,又提供网页实时查看。
//   POST /report   hook 上报状态(需 x-internal-token)
//   GET  /status   返回所有 run 的 JSON
//   GET  /         网页(轮询 /status 实时刷新)
//
// 启动: WF_TOKEN=mysecret node server.js   (默认端口 4321)

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.WF_PORT || 4321);
const TOKEN = process.env.WF_TOKEN || "dev-token";
const DB_FILE = path.join(__dirname, "runs.json");
const MAX_STEPS = 100; // 每个 run 最多保留的步骤明细数

// ---- 持久化(简单地存一个 JSON 文件)----
let runs = {};
try {
  runs = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
} catch {
  runs = {};
}
let saveTimer = null;
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DB_FILE, JSON.stringify(runs), () => {});
  }, 200);
};

// ---- 接收上报 ----
function applyReport({ runId, phase, step, command }) {
  if (!runId) return;
  const now = new Date().toISOString();
  const run = runs[runId] || {
    id: runId,
    command: command || null,
    status: "running",
    step: null,
    steps: [],
    startedAt: now,
    updatedAt: now,
  };
  if (command) run.command = command;
  run.updatedAt = now;

  if (phase === "start") {
    run.status = "running";
  } else if (phase === "step") {
    run.status = "running";
    run.step = step || run.step;
    if (step) {
      run.steps.push({ step, at: now });
      if (run.steps.length > MAX_STEPS) run.steps.shift();
    }
  } else if (phase === "done") {
    run.status = "success";
    run.step = null;
  } else if (phase === "failed") {
    run.status = "failed";
  }
  runs[runId] = run;
  save();
}

// ---- HTTP ----
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "POST" && url.pathname === "/report") {
    if (req.headers["x-internal-token"] !== TOKEN) {
      res.writeHead(401).end("unauthorized");
      return;
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        applyReport(JSON.parse(body || "{}"));
        res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');
      } catch (e) {
        res.writeHead(400).end("bad json");
      }
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/status") {
    const list = Object.values(runs).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(list));
    return;
  }

  if (req.method === "GET" && url.pathname === "/favicon.ico") {
    res.writeHead(204).end();
    return;
  }

  // 其余 GET 一律返回监控页面(避免路径打错时显示 not found)
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(PAGE);
    return;
  }

  res.writeHead(404).end("not found");
});

server.listen(PORT, () => {
  console.log(`wf-monitor 运行中  →  http://localhost:${PORT}`);
  console.log(`上报端点: POST http://localhost:${PORT}/report  (x-internal-token: ${TOKEN})`);
});

// ---- 网页(轮询 /status,1 秒刷新)----
const PAGE = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Workflow 状态</title>
<style>
  :root{color-scheme:light dark}
  body{font:14px/1.5 system-ui,sans-serif;margin:0;padding:24px;background:#0b0d12;color:#e6e8ee}
  h1{font-size:18px;margin:0 0 4px}
  .sub{color:#8b93a7;font-size:12px;margin-bottom:20px}
  .run{background:#151823;border:1px solid #232838;border-radius:10px;padding:14px 16px;margin-bottom:12px}
  .top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .badge{font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px}
  .running{background:#1e3a5f;color:#7ec1ff}
  .success{background:#163a2b;color:#5fe3a1}
  .failed{background:#43202a;color:#ff8095}
  .cmd{font-weight:600}
  .id{color:#6b7488;font-size:11px;font-family:ui-monospace,monospace}
  .step{margin-top:8px;color:#aab2c5;font-size:13px}
  .step b{color:#e6e8ee}
  .time{color:#6b7488;font-size:11px;margin-left:auto}
  .empty{color:#6b7488;padding:40px;text-align:center}
  .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#5fe3a1;margin-right:6px;vertical-align:middle}
</style></head><body>
<h1><span class="dot"></span>Workflow 执行状态</h1>
<div class="sub">每秒自动刷新 · 数据来自 Claude Code hooks 上报</div>
<div id="list"><div class="empty">暂无 run,运行一次你的 slash command 试试</div></div>
<script>
const fmt = t => new Date(t).toLocaleTimeString();
async function tick(){
  try{
    const runs = await (await fetch('/status')).json();
    const el = document.getElementById('list');
    if(!runs.length){el.innerHTML='<div class="empty">暂无 run,运行一次你的 slash command 试试</div>';return;}
    el.innerHTML = runs.map(r => \`
      <div class="run">
        <div class="top">
          <span class="badge \${r.status}">\${r.status}</span>
          <span class="cmd">\${r.command || '(未命名 workflow)'}</span>
          <span class="id">\${r.id.slice(0,8)}</span>
          <span class="time">\${fmt(r.updatedAt)}</span>
        </div>
        \${r.step ? \`<div class="step">当前步骤: <b>\${r.step}</b></div>\` : ''}
        \${r.status!=='running' && r.steps?.length ? \`<div class="step">共 \${r.steps.length} 步</div>\` : ''}
      </div>\`).join('');
  }catch(e){}
}
tick(); setInterval(tick, 1000);
</script>
</body></html>`;
