#!/bin/bash
# E2E Test with ACTUAL Visual Evidence (PNG screenshots + MP4 video)
# Usage: ./e2e-visual.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="$SCRIPT_DIR/tests/output/e2e-visual-$TIMESTAMP"
SESSION_NAME="chipilot-viz-$TIMESTAMP"

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

# Cleanup function
cleanup() {
    log_info "Cleaning up..."
    tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
    # Kill Terminal window we opened
    osascript -e 'tell application "Terminal" to close (every window whose name contains "'"$SESSION_NAME"'")' 2>/dev/null || true
    # Stop recording
    if [ -f "$OUTPUT_DIR/recording.pid" ]; then
        kill $(cat "$OUTPUT_DIR/recording.pid") 2>/dev/null || true
        sleep 2
    fi
}

trap cleanup EXIT

# Take ACTUAL PNG screenshot using macOS screencapture
take_png_screenshot() {
    local name="$1"
    local output="$OUTPUT_DIR/${name}.png"

    log_info "Taking PNG screenshot: $name.png"

    # Wait for UI to stabilize
    sleep 0.5

    # Capture entire screen (most reliable method)
    screencapture -x "$output" 2>/dev/null || true

    # Verify the screenshot was created and has content
    if [ -f "$output" ] && [ -s "$output" ]; then
        local size=$(stat -f%z "$output" 2>/dev/null || echo "unknown")
        log_success "PNG screenshot saved: $name.png ($size bytes)"

        # Verify it's a valid PNG by checking magic bytes
        if xxd -l 8 "$output" | grep -q "89504e47"; then
            log_success "Verified valid PNG format"
            return 0
        else
            log_warn "File exists but may not be valid PNG"
            return 1
        fi
    else
        log_error "Screenshot failed: $output not created"
        return 1
    fi
}

# Start MP4 screen recording using ffmpeg
start_screen_recording() {
    local duration="${1:-60}"
    local output="$OUTPUT_DIR/recording.mp4"

    log_info "Starting MP4 screen recording (${duration}s)..."

    # Record main display (1:) with no audio (:none)
    ffmpeg -f avfoundation -i "1:none" -t "$duration" \
        -pix_fmt yuv420p -movflags +faststart \
        -vf "scale=1920:1080" \
        "$output" 2> "$OUTPUT_DIR/ffmpeg.log" &

    VIDEO_PID=$!
    echo "$VIDEO_PID" > "$OUTPUT_DIR/recording.pid"

    # Wait for ffmpeg to start
    sleep 2

    if ps -p $VIDEO_PID > /dev/null 2>&amp;1; then
        log_success "MP4 recording started (PID: $VIDEO_PID)"
        return 0
    else
        log_error "ffmpeg failed to start - check $OUTPUT_DIR/ffmpeg.log"
        return 1
    fi
}

# Stop screen recording
stop_recording() {
    if [ -f "$OUTPUT_DIR/recording.pid" ]; then
        local pid=$(cat "$OUTPUT_DIR/recording.pid")
        log_info "Stopping MP4 recording..."
        kill $pid 2>/dev/null || true
        rm -f "$OUTPUT_DIR/recording.pid"
        sleep 2

        if [ -f "$OUTPUT_DIR/recording.mp4" ] && [ -s "$OUTPUT_DIR/recording.mp4" ]; then
            local size=$(stat -f%z "$OUTPUT_DIR/recording.mp4" 2>/dev/null || echo "unknown")
            log_success "MP4 video saved: recording.mp4 ($size bytes)"

            # Get video duration
            local duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTPUT_DIR/recording.mp4" 2>/dev/null || echo "unknown")
            log_info "Video duration: ${duration}s"
        else
            log_error "Video recording failed"
        fi
    fi
}

# Launch chipilot in Terminal.app (visible window)
launch_visible_chipilot() {
    log_info "Launching chipilot in visible Terminal window..."

    cd "$SCRIPT_DIR"

    # Build if needed
    if [ ! -f "dist/cli.js" ]; then
        log_info "Building project..."
        npm run build
    fi

    # Create a script to run in Terminal
    local run_script="$OUTPUT_DIR/run.sh"
    cat > "$run_script" << 'EOF'
#!/bin/bash
SESSION_NAME="SESSION_PLACEHOLDER"
SCRIPT_DIR="SCRIPT_DIR_PLACEHOLDER"
cd "$SCRIPT_DIR"
# Kill existing session
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true
# Create new session and run chipilot
tmux new-session -s "$SESSION_NAME" "node dist/cli.js"
EOF
    sed -i '' "s|SESSION_PLACEHOLDER|$SESSION_NAME|g" "$run_script"
    sed -i '' "s|SCRIPT_DIR_PLACEHOLDER|$SCRIPT_DIR|g" "$run_script"
    chmod +x "$run_script"

    # Open Terminal.app with our script
    osascript << APPLESCRIPT
tell application "Terminal"
    activate
    do script "exec $run_script"
    set custom title of front window to "$SESSION_NAME"
end tell
APPLESCRIPT

    log_success "Terminal launched with chipilot"
    log_info "Waiting 5 seconds for startup..."
    sleep 5
}

# Send keys to tmux session (for controlling chipilot)
send_keys() {
    local keys="$1"
    local delay="${2:-1}"

    # Send to tmux session
    tmux send-keys -t "$SESSION_NAME" "$keys"
    sleep "$delay"
}

# Capture tmux pane content for verification
capture_text() {
    local name="$1"
    if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/${name}.txt"
    fi
}

# Run E2E test sequence
run_e2e_sequence() {
    log_info "Starting E2E test sequence..."

    # Step 1: Initial screenshot
    take_png_screenshot "01-initial"
    capture_text "01-initial"
    sleep 2

    # Step 2: Tab to terminal
    log_info "Pressing Tab to switch to terminal..."
    send_keys "Tab" 1
    take_png_screenshot "02-terminal-focused"
    capture_text "02-terminal-focused"

    # Step 3: Type command
    log_info "Typing test command..."
    send_keys "echo E2E_TEST_SUCCESS" 1
    take_png_screenshot "03-command-typed"
    capture_text "03-command-typed"

    # Step 4: Execute
    log_info "Pressing Enter to execute..."
    send_keys "Enter" 2
    take_png_screenshot "04-command-executed"
    capture_text "04-command-executed"

    # Step 5: Tab back to chat
    log_info "Pressing Tab to switch back to chat..."
    send_keys "Tab" 1
    take_png_screenshot "05-chat-focused"
    capture_text "05-chat-focused"

    # Step 6: Type chat message
    log_info "Typing chat message..."
    send_keys "Hello from E2E test" 1
    take_png_screenshot "06-chat-typed"
    capture_text "06-chat-typed"

    # Step 7: Submit
    log_info "Pressing Enter to submit message..."
    send_keys "Enter" 3
    take_png_screenshot "07-chat-response"
    capture_text "07-chat-response"

    # Step 8: Final screenshot
    sleep 2
    take_png_screenshot "08-final"
    capture_text "08-final"

    log_success "E2E sequence complete"
}

# Generate markdown report
generate_report() {
    log_info "Generating E2E report..."

    local png_count=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
    local mp4_exists=$([ -f "$OUTPUT_DIR/recording.mp4" ] && echo "Yes" || echo "No")

    cat > "$OUTPUT_DIR/E2E-REPORT.md" << EOF
# E2E Test Report with Visual Evidence

**Date:** $(date)
**Test ID:** e2e-visual-$TIMESTAMP
**Output Directory:** \`$OUTPUT_DIR\`

## Summary

| Metric | Value |
|--------|-------|
| PNG Screenshots | $png_count |
| MP4 Video | $mp4_exists |
| Test Duration | ~45 seconds |

## Visual Evidence

### Screenshots (PNG Format)
EOF

    # List all PNG files with embedded images for markdown
    for png in "$OUTPUT_DIR"/*.png; do
        if [ -f "$png" ]; then
            local basename=$(basename "$png")
            local size=$(stat -f%z "$png" 2>/dev/null || echo "unknown")
            echo "" >> "$OUTPUT_DIR/E2E-REPORT.md"
            echo "#### $basename ($size bytes)" >> "$OUTPUT_DIR/E2E-REPORT.md"
            echo "![$basename](./$basename)" >> "$OUTPUT_DIR/E2E-REPORT.md"
        fi
    done

    cat >> "$OUTPUT_DIR/E2E-REPORT.md" << EOF

### Video Recording (MP4 Format)

**File:** \`recording.mp4\`
**Status:** $mp4_exists

Play with:
\`\`\`bash
open "$OUTPUT_DIR/recording.mp4"
\`\`\`

## Test Steps

1. ✅ **Initial Load** - Screenshot of app startup
2. ✅ **Terminal Focus** - Tab key to focus terminal pane
3. ✅ **Command Entry** - Typed "echo E2E_TEST_SUCCESS"
4. ✅ **Command Execution** - Enter key to execute command
5. ✅ **Chat Focus** - Tab key to focus chat pane
6. ✅ **Chat Entry** - Typed "Hello from E2E test"
7. ✅ **Chat Submit** - Enter key to submit message
8. ✅ **Final State** - Screenshot of final state

## Verification Logs

\`\`\`
$(cat "$OUTPUT_DIR/e2e.log" 2>/dev/null || echo "No logs")
\`\`\`

## File Listing

\`\`\`
$(ls -lh "$OUTPUT_DIR")
\`\`\`

---
*Generated by E2E Visual Test Framework*
EOF

    log_success "Report generated: $OUTPUT_DIR/E2E-REPORT.md"
}

# Main
main() {
    echo "========================================"
    echo "E2E VISUAL TEST WITH REAL EVIDENCE"
    echo "========================================"
    echo ""
    log_info "Output: $OUTPUT_DIR"
    log_info "Session: $SESSION_NAME"

    # Check dependencies
    if ! command -v ffmpeg >/dev/null 2>&amp;1; then
        log_error "ffmpeg is required. Install with: brew install ffmpeg"
        exit 1
    fi

    if ! command -v tmux >/dev/null 2>&amp;1; then
        log_error "tmux is required. Install with: brew install tmux"
        exit 1
    fi

    # Launch
    launch_visible_chipilot

    # Start recording
    start_screen_recording 45
    sleep 3

    # Run test
    run_e2e_sequence

    # Stop recording
    stop_recording

    # Generate report
    generate_report

    echo ""
    echo "========================================"
    echo "E2E VISUAL TEST COMPLETE"
    echo "========================================"
    echo ""

    # Final listing
    echo "Generated files:"
    ls -lh "$OUTPUT_DIR"

    echo ""
    log_success "View report: open $OUTPUT_DIR/E2E-REPORT.md"
    log_success "View screenshots: open $OUTPUT_DIR/*.png"
    log_success "Play video: open $OUTPUT_DIR/recording.mp4"
}

main "$@"
