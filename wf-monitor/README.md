# wf-monitor

一个**独立的、零依赖**的小项目:用网页实时查看 Claude Code 跑自定义 slash command(如 `yd:init`)时的 workflow 执行状态。

```
Claude Code 跑命令
   → hooks 触发 wf-report.sh
   → POST 上报到 server.js
   → 网页轮询 /status,实时显示
```

只需要 Node.js,不需要数据库、不依赖你的 monorepo。

## 1. 启动监控服务

```bash
cd wf-monitor
WF_TOKEN=mysecret node server.js
```

打开 http://localhost:4321 就是监控页面(每秒自动刷新)。

可配置环境变量:`WF_PORT`(默认 4321)、`WF_TOKEN`(默认 dev-token)。

## 2. 配置 Claude Code hooks

给脚本加执行权限:

```bash
chmod +x wf-monitor/wf-report.sh
```

把 `settings.example.json` 里的 `hooks` 段合并到你项目的 `.claude/settings.json`,并把 `/ABSOLUTE/PATH` 换成真实路径(或用 `$CLAUDE_PROJECT_DIR`)。

让脚本里的 token 和服务一致——在脚本命令前加环境变量即可,例如:

```json
{ "type": "command", "command": "WF_TOKEN=mysecret WF_MATCH=yd: /abs/path/wf-monitor/wf-report.sh start" }
```

`WF_MATCH=yd:` 表示只追踪 prompt 里含 `yd:` 的命令(即你的 `yd:init` 等),其他对话不建 run。去掉它则追踪所有。

## 3. hook 与状态的对应关系

| Claude Code 事件   | 脚本 phase | 含义                       |
|--------------------|-----------|----------------------------|
| `UserPromptSubmit` | `start`   | 命令开始 → run 置为 running |
| `PostToolUse`      | `step`    | 每次工具调用 → 更新当前步骤 |
| `Stop`             | `done`    | 会话结束 → run 置为 success |

run 用 Claude Code 的 `session_id` 作为唯一 id。状态存在 `runs.json`(自动生成)。

## 说明与局限

- "实时"是 1 秒轮询,体感接近实时,够用且最简单。想要真·推送可改成 SSE。
- `Stop` 一律记为 `success`;Claude Code 没有简单的"失败"信号,需要的话可在你的命令里出错时手动 `wf-report.sh failed`。
- token 只是防误调,本地用足够;若暴露到公网请换强密钥并加 HTTPS。
