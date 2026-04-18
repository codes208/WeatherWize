#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# WeatherWize — Full rebuild and run script (Bash / Linux / macOS)
#
# Checks prerequisites, installs npm dependencies (including
# Sequelize, EJS, and Resend), initializes the MySQL database,
# and starts the Express server.
#
# Alert behavior: alerts fire once, then go inactive until manually
# re-enabled by the user from the Alerts Manager page.
#
# Usage:
#   bash scripts/rebuild.sh          # Production mode
#   bash scripts/rebuild.sh --dev    # Dev mode (nodemon auto-reload)
# ──────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEV_MODE=false

# Parse flags
for arg in "$@"; do
    case $arg in
        --dev) DEV_MODE=true ;;
    esac
done

# ─── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}✅  $1${NC}"; }
fail() { echo -e "${RED}❌  $1${NC}"; }
info() { echo -e "${CYAN}⚙️   $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️   $1${NC}"; }

# ─── Header ─────────────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}${CYAN}  WeatherWize — Rebuild & Run${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ─── Step 1: Check Node.js ──────────────────────────────────
info "Checking Node.js..."
if ! command -v node &> /dev/null; then
    fail "Node.js is not installed or not in PATH."
    echo -e "       ${YELLOW}Install from: https://nodejs.org/${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v\([0-9]*\)\..*/\1/')

if [ "$NODE_MAJOR" -lt 18 ]; then
    fail "Node.js v18+ is required (found $NODE_VERSION). Native fetch requires v18+."
    exit 1
fi
ok "Node.js $NODE_VERSION detected"

# ─── Step 2: Check npm ──────────────────────────────────────
info "Checking npm..."
if ! command -v npm &> /dev/null; then
    fail "npm is not installed or not in PATH."
    exit 1
fi
NPM_VERSION=$(npm --version)
ok "npm v$NPM_VERSION detected"

# ─── Step 3: Load .env ──────────────────────────────────────
ENV_FILE="$PROJECT_ROOT/.env"
DB_HOST="localhost"
DB_PORT=3306
SERVER_PORT=3000

if [ -f "$ENV_FILE" ]; then
    # Export .env values — guard against grep returning non-zero when
    # all lines are filtered out (which would trip set -e / pipefail)
    set -a
    source <(grep -v '^\s*#' "$ENV_FILE" | grep -v '^\s*$' || true)
    set +a
    DB_HOST="${DB_HOST:-localhost}"
    SERVER_PORT="${PORT:-3000}"
    ok ".env loaded (DB_HOST=$DB_HOST, PORT=$SERVER_PORT)"

    RESEND_KEY="${RESEND_API_KEY:-}"
    if [ -z "$RESEND_KEY" ] || [ "$RESEND_KEY" = "your_resend_api_key_here" ]; then
        warn "RESEND_API_KEY is not configured — email alerts will be skipped."
        echo -e "       ${YELLOW}Set RESEND_API_KEY in .env to enable email notifications.${NC}"
    else
        ok "RESEND_API_KEY is set"
    fi
else
    warn "No .env file found — using defaults (localhost:3000)"
fi

# ─── Step 4: Check MySQL reachability ───────────────────────
info "Checking MySQL reachability at ${DB_HOST}:${DB_PORT}..."

mysql_reachable=false

# Try nc (netcat) first
if command -v nc &> /dev/null; then
    if nc -z -w 3 "$DB_HOST" "$DB_PORT" 2>/dev/null; then
        mysql_reachable=true
    fi
# Fallback to bash /dev/tcp
elif timeout 3 bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; then
    mysql_reachable=true
# Fallback to Python
elif command -v python3 &> /dev/null; then
    if python3 -c "import socket; s=socket.socket(); s.settimeout(3); s.connect(('$DB_HOST',$DB_PORT)); s.close()" 2>/dev/null; then
        mysql_reachable=true
    fi
fi

if [ "$mysql_reachable" = true ]; then
    ok "MySQL server is reachable at ${DB_HOST}:${DB_PORT}"
else
    fail "MySQL server is not reachable at ${DB_HOST}:${DB_PORT}."
    echo -e "       ${YELLOW}Ensure MySQL is running and accepting connections.${NC}"
    exit 1
fi

# ─── Step 5: Install dependencies ───────────────────────────
info "Installing dependencies (npm install)..."
cd "$PROJECT_ROOT"

if npm install --loglevel=error 2>&1; then
    ok "Dependencies installed successfully"
else
    fail "npm install failed."
    exit 1
fi

# ─── Step 6: Initialize database ────────────────────────────
info "Initializing database (node init-db.js)..."

DB_OUTPUT=$(node --no-deprecation database/init.js 2>&1) || {
    fail "Database initialization failed."
    echo -e "${RED}$DB_OUTPUT${NC}"
    exit 1
}

echo "$DB_OUTPUT" | while IFS= read -r line; do
    echo -e "       ${GRAY}$line${NC}"
done
ok "Database initialized successfully"

# ─── Step 7: Kill existing process on port (if any) ────────
info "Checking for existing process on port $SERVER_PORT..."

EXISTING_PID=""
if command -v lsof &> /dev/null; then
    EXISTING_PID=$(lsof -ti :"$SERVER_PORT" 2>/dev/null || true)
elif command -v ss &> /dev/null; then
    EXISTING_PID=$(ss -tlnp "sport = :$SERVER_PORT" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | head -1 || true)
elif command -v netstat &> /dev/null; then
    EXISTING_PID=$(netstat -tlnp 2>/dev/null | grep ":$SERVER_PORT" | awk '{print $NF}' | cut -d'/' -f1 | head -1 || true)
fi

if [ -n "$EXISTING_PID" ] && [ "$EXISTING_PID" != "0" ]; then
    warn "Port $SERVER_PORT is in use by PID $EXISTING_PID — killing it..."
    kill -9 "$EXISTING_PID" 2>/dev/null || true
    sleep 0.5
    ok "Previous process (PID $EXISTING_PID) terminated"
else
    ok "Port $SERVER_PORT is available"
fi

# ─── Step 8: Start server ───────────────────────────────────
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$DEV_MODE" = true ]; then
    info "Starting server in DEV mode (nodemon)..."
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    NODE_OPTIONS="--no-deprecation" npx nodemon src/server.js
else
    info "Starting server..."
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    node --no-deprecation src/server.js
fi
