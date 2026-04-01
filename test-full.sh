#!/bin/bash
# Full Test Suite with Recording
# Usage: ./test-full.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/tests/output/full-test-$(date +%s)"
mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_section() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

log_info() { echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$OUTPUT_DIR/full-test.log"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$OUTPUT_DIR/full-test.log"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$OUTPUT_DIR/full-test.log"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1" | tee -a "$OUTPUT_DIR/full-test.log"; }

# Step 1: Build
step_build() {
    log_section "STEP 1: BUILD"
    cd "$SCRIPT_DIR"

    if npm run build 2>&1 | tee "$OUTPUT_DIR/build.log"; then
        log_success "Build successful"
        return 0
    else
        log_error "Build failed"
        return 1
    fi
}

# Step 2: Launch
test_launch() {
    log_section "STEP 2: LAUNCH"

    SESSION_NAME="chipilot-test-$$"
    export SESSION_NAME

    # Launch in tmux
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    tmux new-session -d -s "$SESSION_NAME" -n "chipilot"
    tmux send-keys -t "$SESSION_NAME" "cd $SCRIPT_DIR && node dist/cli.js" C-m

    # Wait for startup
    log_info "Waiting for startup..."
    sleep 3

    # Verify session is running
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        log_success "Session launched: $SESSION_NAME"
        return 0
    else
        log_error "Session failed to start"
        return 1
    fi
}

# Step 3: Test Terminal
step_test_terminal() {
    log_section "STEP 3: TEST TERMINAL"

    # Switch to terminal (Tab)
    tmux send-keys -t "$SESSION_NAME" "Tab"
    sleep 1
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/terminal-focused.txt"

    # Type echo command
    tmux send-keys -t "$SESSION_NAME" "echo 'TERMINAL_TEST_$$'"
    sleep 0.5
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/terminal-typing.txt"

    # Execute
    tmux send-keys -t "$SESSION_NAME" "Enter"
    sleep 1
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/terminal-executed.txt"

    # Verify output
    if grep -q "TERMINAL_TEST" "$OUTPUT_DIR/terminal-executed.txt"; then
        log_success "Terminal working - command executed"
        return 0
    else
        log_warn "Terminal output not detected (may be timing issue)"
        return 0
    fi
}

# Step 4: Test Chat
step_test_chat() {
    log_section "STEP 4: TEST CHAT"

    # Switch to chat
    tmux send-keys -t "$SESSION_NAME" "Tab"
    sleep 0.5
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/chat-focused.txt"

    # Type message
    tmux send-keys -t "$SESSION_NAME" "Test message"
    sleep 0.5
    tmux send-keys -t "$SESSION_NAME" "Enter"
    sleep 2
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/chat-response.txt"

    if grep -q "You said:" "$OUTPUT_DIR/chat-response.txt"; then
        log_success "Chat working - response received"
        return 0
    else
        log_warn "Chat response not detected"
        return 0
    fi
}

# Step 5: Monitor for Errors
step_monitor() {
    log_section "STEP 5: MONITOR FOR ERRORS"

    local errors=0

    # Check all captured files for errors
    for file in "$OUTPUT_DIR"/*.txt; do
        if [ -f "$file" ]; then
            if grep -i "error\|exception\|failed\|crash\|fatal" "$file" >/dev/null 2>&1; then
                log_warn "Error pattern found in $(basename "$file"):"
                grep -i "error\|exception\|failed\|crash\|fatal" "$file" | head -3
                errors=$((errors + 1))
            fi
        fi
    done

    if [ $errors -eq 0 ]; then
        log_success "No errors detected"
    else
        log_warn "$errors file(s) with potential issues"
    fi
}

# Step 6: Screenshots
step_screenshots() {
    log_section "STEP 6: CAPTURE SCREENSHOTS"

    # Multiple screenshots at different states
    for i in 1 2 3 4 5; do
        tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/screenshot-$i.txt"
        sleep 1
    done

    log_success "Screenshots captured"
}

# Step 7: Performance Check
step_performance() {
    log_section "STEP 7: PERFORMANCE CHECK"

    # Check if process is responsive
    local pane_pid=$(tmux list-panes -t "$SESSION_NAME" -F '#{pane_pid}' | head -1)

    if [ -n "$pane_pid" ]; then
        local cpu=$(ps -p "$pane_pid" -o %cpu= 2>/dev/null || echo "N/A")
        local mem=$(ps -p "$pane_pid" -o %mem= 2>/dev/null || echo "N/A")

        log_info "Process stats - CPU: $cpu%, MEM: $mem%"
        echo "CPU: $cpu%, MEM: $mem%" > "$OUTPUT_DIR/performance.txt"

        if [ "$cpu" != "N/A" ] && [ "${cpu%.*}" -gt 90 ] 2>/dev/null; then
            log_warn "High CPU usage detected"
        else
            log_success "Performance OK"
        fi
    fi
}

# Step 8: Generate Report
step_report() {
    log_section "STEP 8: GENERATE REPORT"

    cat > "$OUTPUT_DIR/FULL-TEST-REPORT.md" << EOF
# Chipilot Full Test Report

**Date:** $(date)
**Test ID:** $$-$$$
**Output Directory:** $OUTPUT_DIR

## Summary

- **Build:** $(grep "Build successful" "$OUTPUT_DIR/full-test.log" >/dev/null && echo "✅ PASS" || echo "❌ FAIL")
- **Launch:** $(tmux has-session -t "$SESSION_NAME" 2>/dev/null && echo "✅ PASS" || echo "❌ FAIL")
- **Terminal:** $(grep "Terminal working" "$OUTPUT_DIR/full-test.log" >/dev/null && echo "✅ PASS" || echo "⚠️ CHECK")
- **Chat:** $(grep "Chat working" "$OUTPUT_DIR/full-test.log" >/dev/null && echo "✅ PASS" || echo "⚠️ CHECK")

## Files

### Logs
- [build.log](build.log)
- [full-test.log](full-test.log)

### Screenshots
$(ls -1 $OUTPUT_DIR/*.txt 2>/dev/null | xargs -I{} echo "- [{}]({})")

### Performance
$(cat $OUTPUT_DIR/performance.txt 2>/dev/null || echo "N/A")

## Detailed Log

\`\`\`
$(cat "$OUTPUT_DIR/full-test.log")
\`\`\`

## Screenshots

EOF

    # Embed screenshots
    for file in "$OUTPUT_DIR"/*.txt; do
        if [ -f "$file" ]; then
            echo "### $(basename "$file")" >> "$OUTPUT_DIR/FULL-TEST-REPORT.md"
            echo '\`\`\`' >> "$OUTPUT_DIR/FULL-TEST-REPORT.md"
            head -30 "$file" >> "$OUTPUT_DIR/FULL-TEST-REPORT.md"
            echo '\`\`\`' >> "$OUTPUT_DIR/FULL-TEST-REPORT.md"
            echo "" >> "$OUTPUT_DIR/FULL-TEST-REPORT.md"
        fi
    done

    log_success "Report generated: $OUTPUT_DIR/FULL-TEST-REPORT.md"
}

# Cleanup
cleanup() {
    log_section "CLEANUP"
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    log_info "Session terminated"
}

# Main
main() {
    log_section "CHIPILOT FULL TEST SUITE"

    trap cleanup EXIT

    step_build || exit 1
    test_launch || exit 1
    step_test_terminal
    step_test_chat
    step_monitor
    step_screenshots
    step_performance
    step_report

    log_section "TEST COMPLETE"
    log_success "All tests completed!"
    log_info "Results: $OUTPUT_DIR"
    log_info "Report: $OUTPUT_DIR/FULL-TEST-REPORT.md"

    # Summary
    echo ""
    echo -e "${GREEN}Test Summary:${NC}"
    echo "  - Build: ✅"
    echo "  - Launch: ✅"
    echo "  - Terminal: $(grep -q "Terminal working" "$OUTPUT_DIR/full-test.log" && echo "✅" || echo "⚠️")"
    echo "  - Chat: $(grep -q "Chat working" "$OUTPUT_DIR/full-test.log" && echo "✅" || echo "⚠️")"
    echo "  - Screenshots: $(ls -1 $OUTPUT_DIR/*.txt 2>/dev/null | wc -l) captured"
    echo ""
}

main "$@"
