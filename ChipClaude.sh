#!/bin/bash
# ChipClaude - Claude Code with Embedded Terminal
# Usage: ./ChipClaude.sh [directory]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}ChipClaude${NC} - Claude Code + Terminal"
echo ""

# Check for real claude CLI
if ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}Warning:${NC} Claude Code CLI not found."
    echo "Install with: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Build if needed
if [ ! -f "dist/cli.js" ]; then
    echo "Building ChipClaude..."
    npm run build
fi

# Launch
exec node dist/cli.js "$@"
