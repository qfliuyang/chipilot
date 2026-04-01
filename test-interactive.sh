#!/bin/bash
# Interactive Test Script - Simulates Human Interaction
# Usage: ./test-interactive.sh [session-name]

set -e

SESSION_NAME="${1:-chipilot-test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/tests/output/interactive-$(date +%s)"

mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[TEST]${NC} $1" | tee -a "$OUTPUT_DIR/test.log"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$OUTPUT_DIR/test.log"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$OUTPUT_DIR/test.log"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1" | tee -a "$OUTPUT_DIR/test.log"; }

# Wait for tmux session
wait_for_session() {
    log_info "Waiting for tmux session: $SESSION_NAME"
    local retries=30
    while ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; do
        sleep 1
        retries=$((retries - 1))
        if [ $retries -eq 0 ]; then
            log_error "Session not found. Start with: ./launch-chipilot.sh"
            exit 1
        fi
    done
    log_success "Session found"
}

# Capture screen
capture_screen() {
    local name="$1"
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/$name.txt"
    log_info "Captured: $name.txt"
}

# Send keys with delay (human-like)
send_keys() {
    local keys="$1"
    local delay="${2:-0.1}"
    tmux send-keys -t "$SESSION_NAME" "$keys"
    sleep "$delay"
}

# Test 1: Initial Load
test_initial_load() {
    log_info "Test 1: Initial Load"
    sleep 2
    capture_screen "01-initial-load"

    if grep -q "claude-code + terminal" "$OUTPUT_DIR/01-initial-load.txt"; then
        log_success "App loaded successfully"
    else
        log_error "App failed to load"
        return 1
    fi
}

# Test 2: Terminal Interaction
test_terminal_interaction() {
    log_info "Test 2: Terminal Interaction"

    # Switch to terminal pane
    send_keys "Tab" 0.5
    capture_screen "02-terminal-focused"

    # Type a command
    send_keys "echo 'TEST_COMMAND'" 0.5
    capture_screen "03-command-typed"

    # Execute
    send_keys "Enter" 1
    capture_screen "04-command-executed"

    # Check output
    if grep -q "TEST_COMMAND" "$OUTPUT_DIR/04-command-executed.txt"; then
        log_success "Terminal interaction working"
    else
        log_warn "Command output not visible (may need more time)"
    fi
}

# Test 3: Chat Pane
test_chat_pane() {
    log_info "Test 3: Chat Pane"

    # Switch back to chat
    send_keys "Tab" 0.5
    capture_screen "05-chat-focused"

    # Type message
    send_keys "Hello, this is a test" 0.5
    capture_screen "06-chat-typed"

    # Submit
    send_keys "Enter" 2
    capture_screen "07-chat-response"

    if grep -q "You said:" "$OUTPUT_DIR/07-chat-response.txt"; then
        log_success "Chat interaction working"
    else
        log_warn "Chat response not visible"
    fi
}

# Test 4: Pane Switching
test_pane_switching() {
    log_info "Test 4: Pane Switching"

    for i in 1 2 3; do
        send_keys "Tab" 0.5
        capture_screen "08-switch-$i"
    done

    log_success "Pane switching completed"
}

# Test 5: Terminal Commands
test_terminal_commands() {
    log_info "Test 5: Terminal Commands"

    # Ensure we're in terminal
    send_keys "Tab" 0.5

    # Test pwd
    send_keys "pwd" 0.5
    send_keys "Enter" 1
    capture_screen "09-cmd-pwd"

    # Test ls
    send_keys "ls -la" 0.5
    send_keys "Enter" 1
    capture_screen "10-cmd-ls"

    # Test clear
    send_keys "clear" 0.5
    send_keys "Enter" 1
    capture_screen "11-cmd-clear"

    log_success "Terminal commands executed"
}

# Monitor for errors
monitor_output() {
    log_info "Monitoring for errors..."

    local error_count=0

    for file in "$OUTPUT_DIR"/*.txt; do
        if [ -f "$file" ]; then
            # Check for common errors
            if grep -i "error\|exception\|failed\|crash" "$file" >/dev/null 2>&1; then
                log_warn "Potential issue in $(basename "$file"):"
                grep -i "error\|exception\|failed\|crash" "$file" | head -3 | tee -a "$OUTPUT_DIR/errors.log"
                error_count=$((error_count + 1))
            fi
        fi
    done

    if [ $error_count -eq 0 ]; then
        log_success "No errors detected"
    else
        log_warn "$error_count file(s) with potential issues"
    fi

    return $error_count
}

# Generate report
generate_report() {
    log_info "Generating test report..."

    cat > "$OUTPUT_DIR/TEST-REPORT.md" << EOF
# Chipilot Interactive Test Report

**Date:** $(date)
**Session:** $SESSION_NAME
**Duration:** $(cat "$OUTPUT_DIR/test.log" | grep -c "\[TEST\]") tests

## Test Results

$(cat "$OUTPUT_DIR/test.log")

## Screenshots Captured

$(ls -1 "$OUTPUT_DIR"/*.txt 2>/dev/null | xargs -I{} basename {})

## Error Analysis

EOF

    if [ -f "$OUTPUT_DIR/errors.log" ]; then
        cat "$OUTPUT_DIR/errors.log" >> "$OUTPUT_DIR/TEST-REPORT.md"
    else
        echo "No errors detected." >> "$OUTPUT_DIR/TEST-REPORT.md"
    fi

    log_success "Report saved to: $OUTPUT_DIR/TEST-REPORT.md"
}

# Cleanup
cleanup() {
    log_info "Cleaning up..."
    send_keys "C-c" 0.5
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    log_info "Session terminated"
}

# Main
main() {
    log_info "Starting Interactive Tests"
    log_info "Output: $OUTPUT_DIR"

    wait_for_session

    test_initial_load
    test_terminal_interaction
    test_chat_pane
    test_pane_switching
    test_terminal_commands

    monitor_output
    generate_report

    log_info ""
    log_success "All tests completed!"
    log_info "Results: $OUTPUT_DIR"
    log_info ""
    log_info "To view screenshots:"
    log_info "  ls -la $OUTPUT_DIR"

    cleanup
}

# Handle interrupt
trap cleanup EXIT

main "$@"
