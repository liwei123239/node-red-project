#!/usr/bin/env bash
# wf-report.sh —— Claude Code hook 上报脚本
# 用法(在 .claude/settings.json 里配置): wf-report.sh <phase>
#   phase: start | step | done | failed
#
# 依赖: jq、curl。环境变量:
#   WF_URL    监控服务地址 (默认 http://localhost:4321)
#   WF_TOKEN  与 server.js 一致的密钥 (默认 dev-token)
#   WF_MATCH  只对包含该字符串的命令建 run(可选,如 "yd:")

set -euo pipefail
phase="${1:-step}"
WF_URL="${WF_URL:-http://localhost:4321}"
WF_TOKEN="${WF_TOKEN:-dev-token}"

input="$(cat)"   # Claude Code 从 stdin 传入的事件 JSON
sid="$(printf '%s' "$input" | jq -r '.session_id // "unknown"')"
tool="$(printf '%s' "$input" | jq -r '.tool_name // empty')"
prompt="$(printf '%s' "$input" | jq -r '.prompt // empty')"

# start 阶段:可选地只追踪你关心的 slash command
command=""
if [ "$phase" = "start" ]; then
  command="$prompt"
  if [ -n "${WF_MATCH:-}" ]; then
    case "$prompt" in
      *"$WF_MATCH"*) : ;;        # 命中,继续上报
      *) exit 0 ;;               # 未命中,跳过(不建 run)
    esac
  fi
fi

payload="$(jq -n \
  --arg id "$sid" --arg phase "$phase" --arg step "$tool" --arg cmd "$command" \
  '{runId:$id, phase:$phase, step:$step, command:$cmd}')"

curl -s -m 3 -X POST "$WF_URL/report" \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $WF_TOKEN" \
  -d "$payload" >/dev/null 2>&1 || true   # 上报失败不阻断 Claude Code

exit 0
