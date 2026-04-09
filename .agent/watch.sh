#!/bin/bash
# ─── Swasthya-Clinic Agent Watcher ──────────────────────────────────────────
# Run this in the Antigravity terminal:
#   cd /Users/shilpashree/.gemini/antigravity/scratch/clinic-system
#   bash .agent/watch.sh
# ─────────────────────────────────────────────────────────────────────────────

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
AGENT_DIR="$REPO_DIR/.agent"
WATCH_FILE="$AGENT_DIR/CURRENT_TASK.md"
LOCK_FILE="$AGENT_DIR/.running.lock"
LOG_FILE="$AGENT_DIR/agent.log"
PROMPT_FILE="$AGENT_DIR/prompt.md"

echo "══════════════════════════════════════════════"
echo "  SWASTHYA-CLINIC WATCHER (Antigravity)"
echo "  Watching: $WATCH_FILE"
echo "  Log:      $LOG_FILE"
echo "══════════════════════════════════════════════"

run_agent() {
  # Prevent concurrent runs
  if [ -f "$LOCK_FILE" ]; then
    echo "[$(date +%H:%M:%S)] Agent already running — skipping trigger"
    return
  fi

  # Pull latest task file before running
  cd "$REPO_DIR"
  git pull origin main --quiet 2>/dev/null

  # Check if all tasks done
  if grep -q "ALL TASKS COMPLETE" "$WATCH_FILE" 2>/dev/null; then
    echo "[$(date +%H:%M:%S)] All tasks complete — watcher standing by"
    return
  fi

  echo "[$(date +%H:%M:%S)] ▶ CURRENT_TASK.md changed — triggering Antigravity..."
  touch "$LOCK_FILE"

  {
    echo ""
    echo "═══ ANTIGRAVITY RUN — $(date) ═══"
    cd "$REPO_DIR"
    claude -p \
      --dangerously-skip-permissions \
      --add-dir "$REPO_DIR" \
      "$(cat "$PROMPT_FILE")"
    echo "═══ ANTIGRAVITY DONE — $(date) ═══"
    echo ""
  } >> "$LOG_FILE" 2>&1

  rm -f "$LOCK_FILE"
  echo "[$(date +%H:%M:%S)] ✓ Antigravity run complete — see $LOG_FILE"
}

# Run once on startup to pick up any pending task
run_agent

# Watch for changes
fswatch -o "$WATCH_FILE" | while read -r _; do
  sleep 2  # debounce
  run_agent
done
