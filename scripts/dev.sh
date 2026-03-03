#!/usr/bin/env bash
# Bootstrap the site-v2 dev environment in tmux.
#
# Layout (site-v2):
#   +----------------------------+
#   |        bun dev             |
#   |     (Next.js dev server)   |
#   +----------------------------+
#
# Startup Layers:
#   Layer 0 - (none — no reverse proxy)
#   Layer 1 - launch Next.js dev server
#   Layer 2 - readiness gate + URL output
#
# Usage: ./scripts/dev.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WINDOW="site-v2"

FRONTEND_PORT="${FRONTEND_PORT:-3000}"

wait_for_http() {
  local url="$1"
  local label="$2"
  local max_wait="${3:-60}"
  local interval=2
  local elapsed=0
  echo "Waiting for ${label} (${url})..."
  while [ "$elapsed" -lt "$max_wait" ]; do
    if curl -sf "$url" >/dev/null 2>&1; then
      echo "${label} ready (${elapsed}s)"
      return 0
    fi
    sleep "$interval"
    elapsed=$((elapsed + interval))
  done
  echo "Warning: ${label} not ready within ${max_wait}s" >&2
  return 1
}

# --- Prerequisites -----------------------------------------------------------
if ! command -v tmux &>/dev/null; then
  echo "Error: tmux is not installed" >&2
  exit 1
fi

if ! command -v bun &>/dev/null; then
  echo "Error: bun is not installed" >&2
  exit 1
fi

# Keep node_modules aligned with bun.lock before booting Next.js.
echo "Syncing dependencies with bun.lock..."
bun install --frozen-lockfile

# --- Session handling --------------------------------------------------------
if [ -n "${TMUX:-}" ]; then
  SESSION="$(tmux display-message -p '#S')"
else
  SESSION="site-v2"
  tmux new-session -d -s "$SESSION" -c "$PROJECT_DIR" 2>/dev/null || true
fi

# --- Idempotent: tear down previous run --------------------------------------
tmux kill-window -t "${SESSION}:${WINDOW}" 2>/dev/null || true

# --- Create window (single pane, capture pane ID) ----------------------------
PANE_DEV=$(tmux new-window -t "$SESSION" -n "$WINDOW" -c "$PROJECT_DIR" -P -F '#{pane_id}')

# Avoid occasional dropped keystrokes on fast reruns.
sleep 0.3

# --- Per-run logs ------------------------------------------------------------
LOGS_ROOT="${PROJECT_DIR}/logs"
LOGS_RUN_ID="$(date +%Y%m%d_%H%M%S)"
LOGS_RUN_DIR="${LOGS_ROOT}/${LOGS_RUN_ID}"
LOGS_LATEST_LINK="${LOGS_ROOT}/latest"

mkdir -p "${LOGS_RUN_DIR}"
rm -rf "${LOGS_LATEST_LINK}"
ln -s "${LOGS_RUN_DIR}" "${LOGS_LATEST_LINK}"
echo "Logs for this run: ${LOGS_RUN_DIR}"

pipe_pane_to_log() {
  local pane_id="$1"
  local log_file="$2"
  tmux pipe-pane -o -t "$pane_id" \
    "perl -pe 'BEGIN { \$| = 1 } s/\\e\\[[0-?]*[ -\\/]*[@-~]//g; s/\\e\\][^\\a]*(?:\\a|\\e\\\\)//g; s/\\r//g; s/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]//g' >> '${log_file}'"
}

pipe_pane_to_log "$PANE_DEV" "${LOGS_RUN_DIR}/next-dev.log"

# --- Layer 0.5: copy blog assets + convert Excalidraw diagrams ---------------
node "${PROJECT_DIR}/scripts/copy-blog-assets.mjs"
node "${PROJECT_DIR}/scripts/convert-excalidraw.mjs"

# --- Layer 1: launch Next.js dev server --------------------------------------
tmux send-keys -t "$PANE_DEV" "bun dev --port ${FRONTEND_PORT}" Enter

# --- Layer 2: readiness gate -------------------------------------------------
wait_for_http "http://localhost:${FRONTEND_PORT}" "Next.js dev server" 60 || true

echo ""
echo "  Local URL: http://localhost:${FRONTEND_PORT}/"
echo "  Logs:      ${LOGS_RUN_DIR}/next-dev.log"
echo ""

# --- Focus -------------------------------------------------------------------
tmux select-pane -t "$PANE_DEV"

# --- Attach if we started detached -------------------------------------------
if [ -z "${TMUX:-}" ]; then
  exec tmux attach-session -t "$SESSION"
fi
