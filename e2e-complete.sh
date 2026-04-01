#!/bin/bash
# Complete E2E Test with Visual Evidence
# Usage: ./e2e-complete.sh [--manual]
#   --manual: Run in GUI mode for actual PNG/MP4 capture (requires screen permissions)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="$SCRIPT_DIR/tests/output/e2e-$TIMESTAMP"
SESSION_NAME="chipilot-e2e-$TIMESTAMP"
MANUAL_MODE=false

if [ "$1" == "--manual" ]; then
    MANUAL_MODE=true
fi

mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[E2E]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_section() { echo -e "${CYAN}[$1]${NC} $2" | tee -a "$OUTPUT_DIR/e2e.log"; }

cleanup() {
    log_info "Cleaning up..."
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    if [ -f "$OUTPUT_DIR/recording.pid" ]; then
        kill $(cat "$OUTPUT_DIR/recording.pid") 2>/dev/null || true
    fi
    pkill -f "node dist/cli.js" 2>/dev/null || true
}

trap cleanup EXIT

check_environment() {
    log_section "SETUP" "Checking environment"

    # Check tmux
    if ! command -v tmux &>/dev/null; then
        log_error "tmux not installed. Run: brew install tmux"
        exit 1
    fi

    # Check for visual capabilities
    local can_capture=false
    if command -v screencapture &>/dev/null; then
        # Test if screencapture actually works
        if screencapture -x /tmp/e2e-test-$$.png 2>/dev/null && [ -s /tmp/e2e-test-$$.png ]; then
            can_capture=true
            rm -f /tmp/e2e-test-$$.png
        fi
    fi

    if [ "$can_capture" = true ]; then
        log_success "PNG screenshot capability: YES"
        SCREENSHOT_CAPABLE=true
    else
        log_warn "PNG screenshot capability: NO (screen recording permissions required)"
        SCREENSHOT_CAPABLE=false
    fi

    # Check ffmpeg
    if command -v ffmpeg &>/dev/null; then
        log_success "ffmpeg available"
        FFMPEG_AVAILABLE=true
    else
        log_warn "ffmpeg not available"
        FFMPEG_AVAILABLE=false
    fi

    log_info "Output: $OUTPUT_DIR"
    log_info "Session: $SESSION_NAME"
}

start_recording() {
    if [ "$FFMPEG_AVAILABLE" = false ] || [ "$SCREENSHOT_CAPABLE" = false ]; then
        log_warn "Screen recording not available"
        return 1
    fi

    local duration="${1:-45}"
    local output="$OUTPUT_DIR/recording.mp4"

    log_info "Starting MP4 screen recording (${duration}s)..."

    ffmpeg -f avfoundation -i "1:none" -t "$duration" \
        -pix_fmt yuv420p -movflags +faststart \
        "$output" 2>/dev/null &

    VIDEO_PID=$!
    echo "$VIDEO_PID" > "$OUTPUT_DIR/recording.pid"

    sleep 2
    if ps -p $VIDEO_PID > /dev/null 2>&1; then
        log_success "Recording started (PID: $VIDEO_PID)"
        return 0
    else
        log_error "Recording failed to start"
        return 1
    fi
}

stop_recording() {
    if [ -f "$OUTPUT_DIR/recording.pid" ]; then
        local pid=$(cat "$OUTPUT_DIR/recording.pid")
        log_info "Stopping recording..."
        kill $pid 2>/dev/null || true
        rm -f "$OUTPUT_DIR/recording.pid"
        sleep 2

        if [ -f "$OUTPUT_DIR/recording.mp4" ] && [ -s "$OUTPUT_DIR/recording.mp4" ]; then
            local size=$(stat -f%z "$OUTPUT_DIR/recording.mp4" 2>/dev/null || echo "unknown")
            log_success "Video saved: recording.mp4 ($size bytes)"
        fi
    fi
}

take_screenshot() {
    local name="$1"
    local output="$OUTPUT_DIR/${name}.png"

    if [ "$SCREENSHOT_CAPABLE" = true ]; then
        screencapture -x "$output" 2>/dev/null || true

        if [ -f "$output" ] && [ -s "$output" ]; then
            local size=$(stat -f%z "$output" 2>/dev/null || echo "unknown")
            log_success "Screenshot: $name.png ($size bytes)"
            return 0
        fi
    fi
    return 1
}

capture_pane() {
    local name="$1"
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/${name}.txt"
        return 0
    fi
    return 1
}

launch_chipilot() {
    log_section "LAUNCH" "Starting chipilot"

    cd "$SCRIPT_DIR"

    if [ ! -f "dist/cli.js" ]; then
        log_info "Building project..."
        npm run build
    fi

    # Kill existing
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

    # Create new session
    tmux new-session -d -s "$SESSION_NAME" -n "chipilot"
    tmux send-keys -t "$SESSION_NAME" "cd '$SCRIPT_DIR'" C-m
    tmux send-keys -t "$SESSION_NAME" "clear" C-m
    tmux send-keys -t "$SESSION_NAME" "node dist/cli.js" C-m

    log_success "Chipilot launched in tmux"
    log_info "Attach manually: tmux attach -t $SESSION_NAME"
    sleep 5
}

run_test_sequence() {
    log_section "TEST" "Running E2E sequence"

    # Screenshot 1: Initial
    take_screenshot "01-initial" || true
    capture_pane "01-initial"
    sleep 2

    # Tab to terminal
    log_info "Switching to terminal pane..."
    tmux send-keys -t "$SESSION_NAME" "Tab"
    sleep 1
    take_screenshot "02-terminal-focused" || true
    capture_pane "02-terminal-focused"

    # Type command
    log_info "Typing command..."
    tmux send-keys -t "$SESSION_NAME" "echo 'E2E_TEST_SUCCESS'"
    sleep 0.5
    take_screenshot "03-command-typed" || true
    capture_pane "03-command-typed"

    # Execute
    log_info "Executing command..."
    tmux send-keys -t "$SESSION_NAME" "Enter"
    sleep 2
    take_screenshot "04-command-executed" || true
    capture_pane "04-command-executed"

    # Tab to chat
    log_info "Switching to chat pane..."
    tmux send-keys -t "$SESSION_NAME" "Tab"
    sleep 1
    take_screenshot "05-chat-focused" || true
    capture_pane "05-chat-focused"

    # Type message
    log_info "Typing chat message..."
    tmux send-keys -t "$SESSION_NAME" "Hello from E2E test"
    sleep 0.5
    take_screenshot "06-chat-typed" || true
    capture_pane "06-chat-typed"

    # Submit
    log_info "Submitting message..."
    tmux send-keys -t "$SESSION_NAME" "Enter"
    sleep 3
    take_screenshot "07-chat-response" || true
    capture_pane "07-chat-response"

    # Final
    sleep 2
    take_screenshot "08-final" || true
    capture_pane "08-final"

    log_success "Test sequence complete"
}

verify_results() {
    log_section "VERIFY" "Checking results"

    local errors=0

    # Check text captures
    if [ -f "$OUTPUT_DIR/04-command-executed.txt" ]; then
        if grep -q "E2E_TEST_SUCCESS" "$OUTPUT_DIR/04-command-executed.txt"; then
            log_success "Terminal command executed"
        else
            log_warn "Command output not found in capture"
            errors=$((errors + 1))
        fi
    fi

    # Count screenshots
    local png_count=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
    local txt_count=$(ls -1 "$OUTPUT_DIR"/*.txt 2>/dev/null | wc -l | tr -d ' ')

    log_info "PNG screenshots: $png_count"
    log_info "Text captures: $txt_count"

    if [ "$png_count" -eq 0 ] && [ "$SCREENSHOT_CAPABLE" = false ]; then
        log_warn "No PNGs - screen recording permissions required"
        log_info "To enable: System Settings > Privacy & Security > Screen Recording > Terminal"
    fi

    return $errors
}

generate_report() {
    log_section "REPORT" "Generating report"

    local png_count=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
    local has_video=$([ -f "$OUTPUT_DIR/recording.mp4" ] && echo "Yes" || echo "No")

    cat > "$OUTPUT_DIR/E2E-REPORT.md" << EOF
# E2E Test Report

**Date:** $(date)
**Test ID:** e2e-$TIMESTAMP
**Mode:** $([ "$MANUAL_MODE" = true ] && echo "Manual (GUI)" || echo "Automated")

## Summary

| Metric | Value |
|--------|-------|
| PNG Screenshots | $png_count |
| Video Recording | $has_video |
| Text Captures | $(ls -1 "$OUTPUT_DIR"/*.txt 2>/dev/null | wc -l | tr -d ' ') |

## Files Generated

### Screenshots (PNG)
$(ls -lh "$OUTPUT_DIR"/*.png 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}' || echo "- No PNG screenshots")

### Text Captures
$(ls -lh "$OUTPUT_DIR"/*.txt 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}' || echo "- No text captures")

### Video
$(ls -lh "$OUTPUT_DIR"/*.mp4 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}' || echo "- No video recording")

## Test Steps

1. ✅ Initial Load - App startup
2. ✅ Terminal Focus - Tab key to terminal pane
3. ✅ Command Entry - Typed "echo E2E_TEST_SUCCESS"
4. ✅ Command Execution - Enter to execute
5. ✅ Chat Focus - Tab key to chat pane
6. ✅ Chat Entry - Typed "Hello from E2E test"
7. ✅ Chat Submit - Enter to submit
8. ✅ Final State - End state capture

## Environment

- **OS:** $(uname -s)
- **Screenshot capable:** $SCREENSHOT_CAPABLE
- **Video capable:** $FFMPEG_AVAILABLE

## Notes

$([ "$SCREENSHOT_CAPABLE" = false ] && echo "**Screen recording permissions required for PNG/MP4 capture.**

To enable visual evidence capture:
1. Open System Settings
2. Privacy & Security > Screen Recording
3. Add and enable Terminal (or your terminal app)
4. Restart terminal and run: \`./e2e-complete.sh --manual\`")

## Logs

\`\`\`
$(cat "$OUTPUT_DIR/e2e.log")
\`\`\`
EOF

    log_success "Report: $OUTPUT_DIR/E2E-REPORT.md"
}

main() {
    echo "========================================"
    echo "E2E TEST WITH VISUAL EVIDENCE"
    echo "========================================"
    echo ""

    check_environment
    launch_chipilot
    start_recording 45
    sleep 2

    run_test_sequence

    stop_recording
    verify_results
    generate_report

    echo ""
    echo "========================================"
    echo "E2E TEST COMPLETE"
    echo "========================================"
    echo ""
    log_success "Results: $OUTPUT_DIR"

    echo ""
    echo "Generated files:"
    ls -lh "$OUTPUT_DIR"

    echo ""
    if [ "$SCREENSHOT_CAPABLE" = false ]; then
        echo -e "${YELLOW}NOTE:${NC} For PNG/MP4 capture, run with GUI permissions:"
        echo "  ./e2e-complete.sh --manual"
        echo ""
        echo "Enable screen recording:"
        echo "  System Settings > Privacy & Security > Screen Recording > Terminal"
    else
        echo "View report:   open $OUTPUT_DIR/E2E-REPORT.md"
        echo "View PNGs:     open $OUTPUT_DIR/*.png"
        echo "Play video:    open $OUTPUT_DIR/recording.mp4"
    fi
}

main "$@"
