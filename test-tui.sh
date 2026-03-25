#!/bin/bash
# Manual TUI Test Script
# Run this to test the chipilot-cli TUI interactively

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Chipilot CLI - Manual TUI Test                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Ensure build is up to date
echo "📦 Building..."
npm run build --silent

echo ""
echo "🚀 Starting chipilot-cli..."
echo "   Try these actions:"
echo "   1. Type a message"
echo "   2. Press Tab to switch to terminal pane"
echo "   3. Press Tab again to return to chat"
echo "   4. Press ? for help"
echo "   5. Press Ctrl+C to exit"
echo ""
echo "   Watch for:"
echo "   - Input preservation when switching panes"
echo "   - Message wrapping"
echo "   - Scrollback (send many messages)"
echo "   - Terminal resize handling"
echo ""
read -p "Press Enter to start..."

# Run with mock API key to avoid real API calls
export ANTHROPIC_API_KEY="test-key-for-manual-testing"
export CHIPILOT_TEST="true"

node dist/cli.js

echo ""
echo "✅ Test completed"
