#!/bin/bash
# chipilot-cli test script
# Usage: ./test-cli.sh

set -e

# Set API key and base URL for chipilot
export CHIPILOT_ANTHROPIC_API_KEY="6100a9ae17c64061becc4bec864888e1.wMJZ9bcQlF3HcihG"
export CHIPILOT_ANTHROPIC_BASE_URL="https://open.bigmodel.cn/api/anthropic"

echo "🏗️  Building chipilot..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "🚀 Starting chipilot..."
echo ""
echo "Controls:"
echo "  Tab      - Switch between chat and terminal"
echo "  Ctrl+C   - Exit"
echo "  Y/E/N    - Approve/Edit/Reject commands"
echo ""
echo "────────────────────────────────────────"
echo ""

node dist/cli.js
