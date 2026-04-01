#!/bin/bash
# Chipilot Launcher Script
# Usage: ./launch-chipilot.sh [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_deps() {
    log_info "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi

    if ! command -v tmux &> /dev/null; then
        log_warn "tmux not found, installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install tmux
        else
            apt-get update && apt-get install -y tmux
        fi
    fi

    log_success "Dependencies OK"
}

# Build if needed
build_project() {
    log_info "Building project..."

    if [ ! -d "dist" ] || [ "src/cli.ts" -nt "dist/cli.js" ]; then
        npm run build
        log_success "Build completed"
    else
        log_info "Using existing build"
    fi
}

# Launch in tmux session
launch_tmux() {
    local session_name="${1:-chipilot-test}"

    log_info "Launching chipilot in tmux session: $session_name"

    # Kill existing session if present
    tmux kill-session -t "$session_name" 2>/dev/null || true

    # Create new session
    tmux new-session -d -s "$session_name" -n "chipilot"

    # Set up environment
    tmux send-keys -t "$session_name" "cd $SCRIPT_DIR" C-m
    tmux send-keys -t "$session_name" "clear" C-m

    # Launch chipilot
    tmux send-keys -t "$session_name" "node dist/cli.js" C-m

    log_success "Chipilot launched in tmux session: $session_name"
    log_info "Attach with: tmux attach -t $session_name"
    log_info "Or use: ./test-interactive.sh $session_name"
}

# Main
main() {
    log_info "Chipilot Launcher"
    log_info "================="

    check_deps
    build_project
    launch_tmux "$1"

    log_info ""
    log_info "Next steps:"
    log_info "  1. Attach: tmux attach -t chipilot-test"
    log_info "  2. Run tests: ./test-interactive.sh"
    log_info "  3. Record: ./record-session.sh"
}

main "$@"
