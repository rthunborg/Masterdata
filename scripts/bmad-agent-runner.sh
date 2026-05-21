#!/bin/bash
# ============================================================================
# BMAD Agent Runner — "Ghost Typer" + Passive Pane Scraping
# ============================================================================
set -euo pipefail

TASK_FILE="${1:?Usage: bmad-agent-runner.sh <task-file> [agent-name]}"
AGENT_NAME="${2:-Sub-Agent}"

if [ ! -f "$TASK_FILE" ]; then
  echo "Error: Task brief '$TASK_FILE' not found."
  exit 1
fi

# Ensure tmux is running
if [ -z "${TMUX:-}" ]; then
  TMUX_SOCKET=$(tmux display-message -p '#{socket_path}' 2>/dev/null || true)
  if [ -n "$TMUX_SOCKET" ]; then
    TMUX_SESSION=$(tmux list-sessions -F '#{session_name}' 2>/dev/null | head -1 || true)
  else
    echo "ERROR: Not running inside a tmux session."
    exit 1
  fi
fi

# Resolve the project root to an absolute path so sub-panes can find files
# regardless of their starting working directory.
PROJECT_ROOT="$(cd "$(dirname "$TASK_FILE")/.."; pwd)"
CLAUDE_BIN="$(which claude)"

# Build the prompt payload.
# IMPORTANT: The completion token must NOT appear literally in the payload,
# otherwise capture-pane grep will match the pasted instruction immediately.
# We use a split-token instruction so the literal string never appears intact.
AGENT_ID="$(date +%s)-$$-${RANDOM}"
PAYLOAD_FILE="${PROJECT_ROOT}/_bmad-output/payload-${AGENT_ID}.txt"
cat "$TASK_FILE" > "$PAYLOAD_FILE"
{
  echo ""
  echo "============================================================"
  echo "CRITICAL SYSTEM INSTRUCTION:"
  echo 'When you have 100% completed your entire task, output the'
  echo 'done marker by combining these two halves with no space:'
  echo '  First half:  [BMAD_TASK_'
  echo '  Second half: COMPLETE]'
  echo 'The result should be one token on its own line. Do not ask'
  echo 'for further instructions after outputting this marker.'
} >> "$PAYLOAD_FILE"

# Spawn a detached bash pane (-d keeps focus on the calling pane)
if [ -n "${TMUX_SESSION:-}" ]; then
  PANE_ID=$(tmux split-window -d -t "$TMUX_SESSION" -P -F "#{pane_id}" -h)
else
  PANE_ID=$(tmux split-window -d -P -F "#{pane_id}" -h)
fi

tmux select-layout tiled 2>/dev/null || true

# 1. Launch Claude interactively with the prompt as a positional argument.
#    We use a quoted heredoc (<<'LAUNCH_EOF') so that backticks, $, and other
#    special characters in the payload are NOT interpreted by bash.
#    Placeholders are injected via sed afterward to keep the heredoc inert.
LAUNCHER="${PROJECT_ROOT}/_bmad-output/launch-${AGENT_ID}.sh"

cat > "$LAUNCHER" <<'LAUNCH_EOF'
#!/bin/bash
cd '__PROJECT_ROOT__' || exit 1
clear
echo -e '\033[1;36mBMAD Agent\033[0m'
PROMPT="$(cat '__PAYLOAD_PATH__')"
exec '__CLAUDE_BIN__' --dangerously-skip-permissions -- "$PROMPT"
LAUNCH_EOF

# Inject actual absolute paths (using | delimiter to avoid conflicts with /)
sed -i "s|__PROJECT_ROOT__|${PROJECT_ROOT}|g" "$LAUNCHER"
sed -i "s|__PAYLOAD_PATH__|${PAYLOAD_FILE}|g" "$LAUNCHER"
sed -i "s|__CLAUDE_BIN__|${CLAUDE_BIN}|g" "$LAUNCHER"
chmod +x "$LAUNCHER"

tmux send-keys -t "$PANE_ID" "bash '${LAUNCHER}'" C-m

echo "🚀 Agent '${AGENT_NAME}' spawned with prompt pre-loaded. Waiting for execution to start..."

# Give Claude a moment to boot and begin processing the prompt.
sleep 5

# 2. Poll for the completion token from Claude's output.
MAX_WAIT=1200  # 20 minute active timeout failsafe
ELAPSED=0

cleanup() {
  rm -f "$PAYLOAD_FILE" "$LAUNCHER"
}

while tmux display-message -t "$PANE_ID" -p "" 2>/dev/null; do

  # Capture the full scrollback (not just visible) and check for the token
  if tmux capture-pane -p -t "$PANE_ID" -S -500 2>/dev/null | grep -q "\[BMAD_TASK_COMPLETE\]"; then
    echo "✅ Completion token detected. Agent '${AGENT_NAME}' finished successfully."
    tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
    cleanup
    exit 0
  fi

  sleep 3
  ELAPSED=$((ELAPSED + 3))

  if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "⚠️ Agent '${AGENT_NAME}' timed out after ${MAX_WAIT}s. Force closing pane."
    tmux kill-pane -t "$PANE_ID" 2>/dev/null || true
    cleanup
    exit 1
  fi
done

# Cleanup if pane was closed manually
cleanup
echo "⚠️ Agent pane closed unexpectedly."
exit 1
