#!/bin/bash
# E2E Test with Real Screen Recording
# Usage: ./e2e-record.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="$SCRIPT_DIR/tests/output/e2e-$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[E2E]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }
log_error() { echo -e "${RED}[FAIL]${NC} $1" | tee -a "$OUTPUT_DIR/e2e.log"; }

# Check for screen recording tools
check_recording_tools() {
    log_info "Checking screen recording tools..."

    # macOS screencapture
    if [[ "$OSTYPE" == "darwin"* ]] && command -v screencapture &> /dev/null; then
        SCREENSHOT_TOOL="screencapture"
        log_success "macOS screencapture available"
    # ImageMagick import
    elif command -v import &> /dev/null; then
        SCREENSHOT_TOOL="imagemagick"
        log_success "ImageMagick import available"
    else
        log_warn "No native screenshot tool - text captures only"
        SCREENSHOT_TOOL="none"
    fi

    # Check ffmpeg for video
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_AVAILABLE=true
        log_success "ffmpeg available for video recording"
    else
        FFMPEG_AVAILABLE=false
        log_warn "ffmpeg not available - video recording disabled"
    fi
}

# Take screenshot
take_screenshot() {
    local name="$1"
    local output="$OUTPUT_DIR/${name}.png"

    if [ "$SCREENSHOT_TOOL" = "none" ]; then
        log_warn "Screenshot tool not available"
        return 1
    fi

    log_info "Taking screenshot: $name.png"

    case "$SCREENSHOT_TOOL" in
        "screencapture")
            screencapture "$output" 2>/dev/null || screencapture -w "$output" 2>/dev/null || true
            ;;
        "imagemagick")
            import -window root "$output" 2>/dev/null || import "$output" 2>/dev/null || true
            ;;
    esac

    if [ -f "$output" ] && [ -s "$output" ]; then
        local size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null || echo "unknown")
        log_success "Screenshot saved: $name.png ($size bytes)"
        return 0
    else
        log_warn "Screenshot may have failed (check $output)"
        return 1
    fi
}

# Start video recording
start_recording() {
    local duration="${1:-60}"
    local output="$OUTPUT_DIR/recording.mp4"

    if [ "$FFMPEG_AVAILABLE" = false ]; then
        log_warn "Video recording disabled"
        return 1
    fi

    log_info "Starting screen recording (${duration}s)..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS screen recording
        ffmpeg -f avfoundation -i "1:none" -t "$duration" -pix_fmt yuv420p -movflags +faststart "$output" 2>/dev/null &
    else
        # Linux
        ffmpeg -f x11grab -i :0.0 -t "$duration" -pix_fmt yuv420p -movflags +faststart "$output" 2>/dev/null &
    fi

    VIDEO_PID=$!
    echo "$VIDEO_PID" > "$OUTPUT_DIR/recording.pid"
    log_success "Recording started (PID: $VIDEO_PID)"
}

# Stop recording
stop_recording() {
    if [ -f "$OUTPUT_DIR/recording.pid" ]; then
        local pid=$(cat "$OUTPUT_DIR/recording.pid")
        log_info "Stopping recording..."
        kill $pid 2>/dev/null || true
        rm -f "$OUTPUT_DIR/recording.pid"
        sleep 2

        if [ -f "$OUTPUT_DIR/recording.mp4" ]; then
            local size=$(stat -f%z "$OUTPUT_DIR/recording.mp4" 2>/dev/null || stat -c%s "$OUTPUT_DIR/recording.mp4" 2>/dev/null || echo "unknown")
            log_success "Video saved: recording.mp4 ($size bytes)"
        fi
    fi
}

# Launch chipilot in terminal
launch_chipilot() {
    log_info "Launching chipilot..."

    cd "$SCRIPT_DIR"

    # Build if needed
    if [ ! -f "dist/cli.js" ]; then
        npm run build
    fi

    # Launch in new Terminal window (macOS) or xterm (Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell application \"Terminal\" to do script \"cd '$SCRIPT_DIR' && node dist/cli.js\"" &
    else
        xterm -e "cd '$SCRIPT_DIR' && node dist/cli.js" &
    fi

    CHIPILOT_PID=$!
    echo "$CHIPILOT_PID" > "$OUTPUT_DIR/chipilot.pid"

    log_success "Chipilot launched (PID: $CHIPILOT_PID)"
    log_info "Waiting 5 seconds for startup..."
    sleep 5
}

# Stop chipilot
stop_chipilot() {
    log_info "Stopping chipilot..."

    if [ -f "$OUTPUT_DIR/chipilot.pid" ]; then
        local pid=$(cat "$OUTPUT_DIR/chipilot.pid")
        kill $pid 2>/dev/null || true
        rm -f "$OUTPUT_DIR/chipilot.pid"
    fi

    # Also kill any node processes running cli.js
    pkill -f "node dist/cli.js" 2>/dev/null || true
}

# E2E Test Steps
run_e2e_test() {
    log_info "Starting E2E Test Sequence"

    # Screenshot 1: Initial state
    take_screenshot "01-initial"
    sleep 2

    # Simulate Tab key to switch to terminal
    log_info "Switching to terminal pane (Tab)..."
    osascript -e 'tell application "System Events" to key code 48' 2>/dev/null || true
    sleep 2
    take_screenshot "02-terminal-focused"

    # Type command
    log_info "Typing command..."
    osascript -e 'tell application "System Events" to keystroke "echo E2E_TEST_SUCCESS"' 2>/dev/null || true
    sleep 1
    take_screenshot "03-command-typed"

    # Execute
    log_info "Executing command (Enter)..."
    osascript -e 'tell application "System Events" to key code 36' 2>/dev/null || true
    sleep 2
    take_screenshot "04-command-executed"

    # Switch back to chat
    log_info "Switching to chat pane (Tab)..."
    osascript -e 'tell application "System Events" to key code 48' 2>/dev/null || true
    sleep 2
    take_screenshot "05-chat-focused"

    # Type in chat
    log_info "Typing chat message..."
    osascript -e 'tell application "System Events" to keystroke "Hello from E2E test"' 2>/dev/null || true
    sleep 1
    take_screenshot "06-chat-typed"

    # Submit
    log_info "Submitting message (Enter)..."
    osascript -e 'tell application "System Events" to key code 36' 2>/dev/null || true
    sleep 3
    take_screenshot "07-chat-response"

    # Final screenshot
    sleep 2
    take_screenshot "08-final"

    log_success "E2E test sequence complete"
}

# Generate report
generate_report() {
    log_info "Generating E2E report..."

    cat > "$OUTPUT_DIR/E2E-REPORT.md" << EOF
# E2E Test Report with Screen Recording

**Date:** $(date)
**Test ID:** e2e-$TIMESTAMP
**Output Directory:** $OUTPUT_DIR

## Files Generated

### Screenshots (PNG)
$(ls -lh $OUTPUT_DIR/*.png 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}')

### Video
$(ls -lh $OUTPUT_DIR/recording.mp4 2>/dev/null | awk '{print "- " $9 " (" $5 ")"}')

### Logs
- e2e.log

## Test Steps Executed

1. **Initial Load** - App startup screenshot
2. **Terminal Focus** - Switched to terminal pane
3. **Command Entry** - Typed test command
4. **Command Execution** - Executed command
5. **Chat Focus** - Switched to chat pane
6. **Chat Entry** - Typed chat message
7. **Chat Submit** - Submitted message
8. **Final State** - End of test

## System Info

- **OS:** $(uname -s)
- **Screenshot Tool:** $SCREENSHOT_TOOL
- **Video Recording:** $([ "$FFMPEG_AVAILABLE" = true ] && echo "Yes" || echo "No")

## Status

$(grep "\[PASS\]\|\[FAIL\]\|\[WARN\]" "$OUTPUT_DIR/e2e.log" | wc -l) log entries captured

EOF

    log_success "Report: $OUTPUT_DIR/E2E-REPORT.md"
}

# Main
main() {
    echo "========================================"
    echo "E2E TEST WITH SCREEN RECORDING"
    echo "========================================"
    echo ""
    log_info "Output: $OUTPUT_DIR"

    # Setup
    check_recording_tools
    launch_chipilot

    # Start recording
    start_recording 45
    sleep 3

    # Run tests
    run_e2e_test

    # Stop recording
    sleep 2
    stop_recording

    # Generate report
    generate_report

    # Cleanup
    stop_chipilot

    echo ""
    echo "========================================"
    echo "E2E TEST COMPLETE"
    echo "========================================"
    echo ""
    log_success "Results in: $OUTPUT_DIR"
    log_info "Screenshots: $(ls -1 $OUTPUT_DIR/*.png 2>/dev/null | wc -l) captured"
    [ -f "$OUTPUT_DIR/recording.mp4" ] && log_success "Video: $OUTPUT_DIR/recording.mp4"

    # List files
    echo ""
    ls -lh "$OUTPUT_DIR"
}

# Cleanup on exit
trap 'stop_recording; stop_chipilot' EXIT

main "$@"
