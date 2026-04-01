#!/bin/bash
# Screen Recording and Screenshot Script
# Usage: ./record-session.sh [session-name]

set -e

SESSION_NAME="${1:-chipilot-test}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$SCRIPT_DIR/tests/output/recording-$(date +%s)"

mkdir -p "$OUTPUT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[RECORD]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies
check_deps() {
    log_info "Checking recording dependencies..."

    # Check for ffmpeg (for video recording)
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_AVAILABLE=true
        log_success "ffmpeg found (video recording available)"
    else
        FFMPEG_AVAILABLE=false
        log_warn "ffmpeg not found (screenshots only)"
        log_info "Install with: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)"
    fi

    # Check for terminal-notifier (macOS notifications)
    if command -v terminal-notifier &> /dev/null; then
        NOTIFY_AVAILABLE=true
    else
        NOTIFY_AVAILABLE=false
    fi
}

# Get tmux pane info
get_pane_info() {
    local pane_id=$(tmux list-panes -t "$SESSION_NAME" -F '#{pane_id}' | head -1)
    local pane_pid=$(tmux list-panes -t "$SESSION_NAME" -F '#{pane_pid}' | head -1)
    echo "Pane: $pane_id, PID: $pane_pid"
}

# Screenshot using tmux capture
capture_tmux() {
    local filename="$1"
    tmux capture-pane -t "$SESSION_NAME" -p > "$OUTPUT_DIR/$filename.txt"

    # Also try to get ANSI color output
    tmux capture-pane -t "$SESSION_NAME" -pe > "$OUTPUT_DIR/$filename-ans.txt" 2>/dev/null || true

    log_info "Captured: $filename.txt"
}

# Screenshot using terminal escape sequences
screenshot_terminal() {
    local filename="$1"

    # Use script command to capture terminal state
    if command -v script &> /dev/null; then
        timeout 2 script -q /dev/null -c "tmux capture-pane -t $SESSION_NAME -p" > "$OUTPUT_DIR/$filename.script" 2>/dev/null || true
    fi

    log_info "Terminal screenshot: $filename"
}

# macOS screenshot using screencapture
screenshot_macos() {
    local filename="$1"

    if [[ "$OSTYPE" == "darwin"* ]] && command -v screencapture &> /dev/null; then
        # Find terminal window
        sleep 0.5
        screencapture -l$(osascript -e 'tell app "Terminal" to id of window 1' 2>/dev/null || echo "0") \
            "$OUTPUT_DIR/$filename.png" 2>/dev/null || \
            screencapture "$OUTPUT_DIR/$filename.png"
        log_success "Screenshot: $filename.png"
    fi
}

# Record video using ffmpeg (if available)
record_video() {
    local duration="${1:-30}"
    local output="$OUTPUT_DIR/recording.mp4"

    if [ "$FFMPEG_AVAILABLE" = false ]; then
        log_warn "ffmpeg not available, skipping video recording"
        return 1
    fi

    log_info "Recording video for ${duration}s..."

    # macOS screen recording
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ffmpeg -f avfoundation -i "1" -t "$duration" -pix_fmt yuv420p "$output" 2>/dev/null || {
            log_warn "ffmpeg recording failed (may need permissions)"
            return 1
        }
    # Linux screen recording
    else
        ffmpeg -f x11grab -i :0.0 -t "$duration" -pix_fmt yuv420p "$output" 2>/dev/null || {
            log_warn "ffmpeg recording failed"
            return 1
        }
    fi

    log_success "Video saved: $output"
}

# Continuous screenshot capture
timelapse() {
    local interval="${1:-2}"
    local count="${2:-10}"

    log_info "Starting timelapse (${count} shots, ${interval}s interval)"

    for i in $(seq 1 $count); do
        capture_tmux "timelapse-$(printf '%03d' $i)"
        sleep "$interval"
    done

    log_success "Timelapse complete"
}

# Monitor and record key events
monitor_session() {
    log_info "Starting session monitor..."

    local monitor_log="$OUTPUT_DIR/monitor.log"

    while tmux has-session -t "$SESSION_NAME" 2>/dev/null; do
        echo "$(date '+%Y-%m-%d %H:%M:%S') - Session active" >> "$monitor_log"
        sleep 5
    done

    echo "$(date '+%Y-%m-%d %H:%M:%S') - Session ended" >> "$monitor_log"
    log_info "Monitor stopped"
}

# Generate visual report
generate_visual_report() {
    log_info "Generating visual report..."

    cat > "$OUTPUT_DIR/VISUAL-REPORT.md" << EOF
# Chipilot Visual Test Report

**Date:** $(date)
**Session:** $SESSION_NAME
**Output Directory:** $OUTPUT_DIR

## Files Generated

### Text Captures
$(ls -la $OUTPUT_DIR/*.txt 2>/dev/null | awk '{print "- " $9 " (" $5 " bytes)"}')

### Screenshots
$(ls -la $OUTPUT_DIR/*.png 2>/dev/null | awk '{print "- " $9 " (" $5 " bytes)"}')

### Video
$(ls -la $OUTPUT_DIR/*.mp4 2>/dev/null | awk '{print "- " $9 " (" $5 " bytes)"}')

## Session Info

$(get_pane_info)

## Preview

$(for f in $OUTPUT_DIR/*.txt; do
    if [ -f "$f" ]; then
        echo "### $(basename $f)"
        echo '```'
        head -20 "$f"
        echo '```'
        echo ""
    fi
done)

EOF

    log_success "Report: $OUTPUT_DIR/VISUAL-REPORT.md"
}

# Main recording function
main() {
    log_info "Screen Recording Session"
    log_info "========================"
    log_info "Output: $OUTPUT_DIR"

    check_deps

    if ! tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
        log_error "Session $SESSION_NAME not found. Start with: ./launch-chipilot.sh"
        exit 1
    fi

    # Initial screenshot
    capture_tmux "01-initial"
    screenshot_macos "01-initial"

    # Wait a moment
    sleep 2

    # Interaction screenshots
    log_info "Capturing interactions..."

    # Tab to terminal
    tmux send-keys -t "$SESSION_NAME" "Tab"
    sleep 1
    capture_tmux "02-terminal-pane"
    screenshot_macos "02-terminal-pane"

    # Type command
    tmux send-keys -t "$SESSION_NAME" "echo 'Recording Test'"
    sleep 0.5
    capture_tmux "03-typing"

    # Execute
    tmux send-keys -t "$SESSION_NAME" "Enter"
    sleep 1
    capture_tmux "04-executed"
    screenshot_macos "04-executed"

    # Back to chat
    tmux send-keys -t "$SESSION_NAME" "Tab"
    sleep 0.5
    capture_tmux "05-chat-pane"
    screenshot_macos "05-chat-pane"

    # Timelapse
    timelapse 1 5

    # Try video recording
    record_video 10 &
    VIDEO_PID=$!

    # Wait for video or continue
    sleep 12
    kill $VIDEO_PID 2>/dev/null || true

    # Final screenshot
    capture_tmux "99-final"
    screenshot_macos "99-final"

    # Generate report
    generate_visual_report

    log_info ""
    log_success "Recording session complete!"
    log_info "Files: $OUTPUT_DIR"
    log_info ""

    # List files
    ls -lh "$OUTPUT_DIR"

    # Notification
    if [ "$NOTIFY_AVAILABLE" = true ]; then
        terminal-notifier -title "Chipilot Test" -message "Recording complete: $OUTPUT_DIR"
    fi
}

# Help
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [session-name]"
    echo ""
    echo "Captures screenshots and video of chipilot session"
    echo ""
    echo "Requirements:"
    echo "  - tmux session running chipilot"
    echo "  - ffmpeg (optional, for video recording)"
    echo ""
    echo "Output: tests/output/recording-<timestamp>/"
    exit 0
fi

main "$@"
