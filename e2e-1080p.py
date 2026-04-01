#!/usr/bin/env python3
"""
E2E Test - 1080p Region Capture with Video Recording
Records only a 1920x1080 region of the screen where ChipClaude runs
"""

import os
import sys
import time
import signal
import subprocess
import argparse
from datetime import datetime
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent.absolute()
TIMESTAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
OUTPUT_DIR = SCRIPT_DIR / "tests" / "output" / f"e2e-1080p-{TIMESTAMP}"

# Screen region for capture (1920x1080 pixels at position 100,100)
# On Retina displays, screencapture uses pixel coordinates
CAPTURE_X = 100
CAPTURE_Y = 100
CAPTURE_W = 1920
CAPTURE_H = 1080

# Terminal window bounds (points, not pixels)
# On Retina: 960x540 points = 1920x1080 pixels
TERM_X = 100
TERM_Y = 100
TERM_W = 960  # 1920/2 for Retina
TERM_H = 540  # 1080/2 for Retina

# Terminal window bounds (points, not pixels)
# On Retina: 960x540 points = 1920x1080 pixels
TERM_X = 100
TERM_Y = 100
TERM_W = 960  # 1920/2 for Retina
TERM_H = 540  # 1080/2 for Retina

class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'

def log_info(msg): print(f"{Colors.BLUE}[E2E]{Colors.NC} {msg}", flush=True)
def log_success(msg): print(f"{Colors.GREEN}[PASS]{Colors.NC} {msg}", flush=True)
def log_warn(msg): print(f"{Colors.YELLOW}[WARN]{Colors.NC} {msg}", flush=True)
def log_error(msg): print(f"{Colors.RED}[FAIL]{Colors.NC} {msg}", flush=True)
def log_section(name, msg): print(f"{Colors.CYAN}[{name}]{Colors.NC} {msg}", flush=True)

class E2ETest:
    def __init__(self):
        self.output_dir = OUTPUT_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.output_dir / "e2e.log"
        self.ffmpeg_pid = None
        self.terminal_window_id = None

    def start_recording(self, duration=60):
        log_info(f"Starting 1080p region recording ({duration}s)...")
        log_info(f"Region: {CAPTURE_W}x{CAPTURE_H} at ({CAPTURE_X},{CAPTURE_Y})")

        output = self.output_dir / "recording.mp4"

        # Use ffmpeg with crop filter to record only the specific region
        # avfoundation captures full screen, then we crop
        proc = subprocess.Popen(
            ['ffmpeg', '-f', 'avfoundation', '-i', '1:none', '-t', str(duration),
             '-vf', f'crop={CAPTURE_W}:{CAPTURE_H}:{CAPTURE_X}:{CAPTURE_Y}',
             '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
             str(output)],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        time.sleep(2)
        if proc.poll() is None:
            self.ffmpeg_pid = proc.pid
            log_success(f"Recording started (PID: {proc.pid})")
            return True
        else:
            log_error("Recording failed to start")
            return False

    def stop_recording(self):
        if self.ffmpeg_pid:
            log_info("Stopping recording...")
            try:
                os.kill(self.ffmpeg_pid, signal.SIGTERM)
                time.sleep(2)
            except ProcessLookupError:
                pass

            video_file = self.output_dir / "recording.mp4"
            if video_file.exists() and video_file.stat().st_size > 0:
                size = video_file.stat().st_size
                duration = subprocess.run(
                    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                     '-of', 'default=noprint_wrappers=1:nokey=1', str(video_file)],
                    capture_output=True, text=True
                ).stdout.strip()
                log_success(f"Video saved: recording.mp4 ({size} bytes, {duration}s)")

    def take_screenshot(self, name):
        output = self.output_dir / f"{name}.png"
        # Capture specific region using screencapture -R x,y,w,h
        # Note: On Retina displays, screencapture uses POINTS not pixels
        # So 960x540 points = 1920x1080 pixels on 2x Retina
        result = subprocess.run([
            'screencapture', '-x',
            '-R', f'{TERM_X},{TERM_Y},{TERM_W},{TERM_H}',
            str(output)
        ], capture_output=True)

        if result.returncode == 0 and output.exists() and output.stat().st_size > 0:
            size = output.stat().st_size
            log_success(f"Screenshot: {name}.png ({size} bytes)")
            return True
        log_warn(f"Screenshot failed: {name}")
        return False

    def launch_terminal_window(self):
        log_section("LAUNCH", "Starting ChipClaude in 1080p Terminal window")

        # Build if needed
        cli_js = SCRIPT_DIR / "dist" / "cli.js"
        if not cli_js.exists():
            log_info("Building project...")
            result = subprocess.run(['npm', 'run', 'build'], cwd=SCRIPT_DIR, capture_output=True)
            if result.returncode != 0:
                log_error("Build failed")
                return False

        # Launch Terminal with specific size and position using AppleScript
        script = f'''
tell application "Terminal"
    activate
    set win to do script "cd '{SCRIPT_DIR}' && tmux new-session -s chipclaude-e2e -d && tmux send-keys -t chipclaude-e2e 'node dist/cli.js' C-m && tmux attach -t chipclaude-e2e"
    set bounds of front window to {{{TERM_X}, {TERM_Y}, {TERM_X + TERM_W}, {TERM_Y + TERM_H}}}
    set custom title of front window to "ChipClaude-1080p"
end tell
'''
        result = subprocess.run(['osascript', '-e', script], capture_output=True)
        if result.returncode != 0:
            log_error(f"Failed to launch Terminal: {result.stderr.decode()}")
            return False

        log_success(f"Terminal launched at ({CAPTURE_X},{CAPTURE_Y}) size {CAPTURE_W}x{CAPTURE_H}")
        log_info("Waiting 5 seconds for startup...")
        time.sleep(5)
        return True

    def send_keys(self, keys, delay=0.5):
        escaped = keys.replace('\\', '\\\\').replace('"', '\\"').replace('\r', '').replace('\n', '')
        script = f'''
tell application "Terminal"
    activate
    tell application "System Events"
        keystroke "{escaped}"
    end tell
end tell
'''
        subprocess.run(['osascript', '-e', script], capture_output=True)
        time.sleep(delay)

    def run_test_sequence(self):
        log_section("TEST", "Running E2E sequence")

        steps = [
            ("01-initial", None, 3, "Initial state"),
            ("02-terminal-focused", "\t", 1, "Tab to terminal"),
            ("03-command-typed", "echo CHIPCLAUDE_TEST", 0.5, "Type command"),
            ("04-command-executed", "\r", 2, "Execute command"),
            ("05-claude-focused", "\t", 1, "Tab to Claude pane"),
            ("06-typing", "Hello ChipClaude", 0.5, "Type message"),
            ("07-submitted", "\r", 3, "Submit message"),
            ("08-final", None, 2, "Final state"),
        ]

        for name, keys, delay, desc in steps:
            log_info(f"Step: {desc}")

            if keys:
                self.send_keys(keys, delay)
            else:
                time.sleep(delay)

            self.take_screenshot(name)

        log_success("Test sequence complete")

    def cleanup(self):
        log_info("Cleaning up...")
        # Kill tmux session
        subprocess.run(['tmux', 'kill-session', '-t', 'chipclaude-e2e'], capture_output=True)
        # Close Terminal window
        script = '''
tell application "Terminal"
    close (every window whose name contains "ChipClaude-1080p")
end tell
'''
        subprocess.run(['osascript', '-e', script], capture_output=True)
        self.stop_recording()

    def run(self):
        print("=" * 60)
        print("E2E TEST - 1080p REGION CAPTURE")
        print("=" * 60)
        print()
        log_info(f"Output: {self.output_dir}")
        log_info(f"Capture region: {CAPTURE_W}x{CAPTURE_H} at ({CAPTURE_X},{CAPTURE_Y})")

        try:
            self.launch_terminal_window()
            self.start_recording(60)
            time.sleep(2)
            self.run_test_sequence()
            self.stop_recording()

            print()
            print("=" * 60)
            print("E2E TEST COMPLETE")
            print("=" * 60)
            print()
            log_success(f"Results: {self.output_dir}")

            print("\nGenerated files:")
            for f in sorted(self.output_dir.iterdir()):
                if f.is_file():
                    size = f.stat().st_size
                    print(f"  {f.name:<30} {size:>10} bytes")

        finally:
            self.cleanup()

def main():
    test = E2ETest()
    test.run()

if __name__ == "__main__":
    main()
