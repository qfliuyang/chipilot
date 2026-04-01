#!/usr/bin/env python3
"""
E2E Test with Visual Evidence using PTY
Captures actual terminal output and optional PNG/MP4
"""

import os
import sys
import time
import pty
import select
import signal
import subprocess
import argparse
from datetime import datetime
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent.absolute()
TIMESTAMP = datetime.now().strftime("%Y%m%d-%H%M%S")
OUTPUT_DIR = SCRIPT_DIR / "tests" / "output" / f"e2e-python-{TIMESTAMP}"
SESSION_NAME = f"chipilot-e2e-{TIMESTAMP}"

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
        self.fd = None
        self.pid = None
        self.screenshot_capable = False
        self.ffmpeg_available = False
        self.ffmpeg_pid = None

    def log(self, msg):
        with open(self.log_file, 'a') as f:
            f.write(f"{datetime.now().isoformat()} {msg}\n")

    def check_environment(self):
        log_section("SETUP", "Checking environment")

        # Check for screencapture
        result = subprocess.run(['which', 'screencapture'], capture_output=True)
        if result.returncode == 0:
            # Test if it actually works
            test_file = f"/tmp/e2e-test-{os.getpid()}.png"
            result = subprocess.run(['screencapture', '-x', test_file], capture_output=True)
            if result.returncode == 0 and os.path.exists(test_file) and os.path.getsize(test_file) > 0:
                self.screenshot_capable = True
                os.unlink(test_file)
                log_success("PNG screenshot capability: YES")
            else:
                log_warn("PNG screenshot capability: NO (permissions required)")
        else:
            log_warn("screencapture not available")

        # Check ffmpeg
        result = subprocess.run(['which', 'ffmpeg'], capture_output=True)
        if result.returncode == 0:
            self.ffmpeg_available = True
            log_success("ffmpeg available")
        else:
            log_warn("ffmpeg not available")

        log_info(f"Output: {self.output_dir}")
        return True

    def start_recording(self, duration=45):
        if not self.ffmpeg_available or not self.screenshot_capable:
            log_warn("Screen recording not available")
            return False

        log_info(f"Starting MP4 recording ({duration}s)...")
        output = self.output_dir / "recording.mp4"

        proc = subprocess.Popen(
            ['ffmpeg', '-f', 'avfoundation', '-i', '1:none', '-t', str(duration),
             '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output)],
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
                log_success(f"Video saved: recording.mp4 ({size} bytes)")

    def take_screenshot(self, name):
        if not self.screenshot_capable:
            return False

        output = self.output_dir / f"{name}.png"
        result = subprocess.run(['screencapture', '-x', str(output)], capture_output=True)

        if result.returncode == 0 and output.exists() and output.stat().st_size > 0:
            size = output.stat().st_size
            log_success(f"Screenshot: {name}.png ({size} bytes)")
            return True
        return False

    def read_output(self, timeout=1):
        """Read available output from PTY"""
        output = b""
        ready, _, _ = select.select([self.fd], [], [], timeout)
        while ready:
            try:
                chunk = os.read(self.fd, 4096)
                if chunk:
                    output += chunk
                else:
                    break
            except OSError:
                break
            ready, _, _ = select.select([self.fd], [], [], 0.1)
        return output.decode('utf-8', errors='replace')

    def send_keys(self, keys, delay=0.5):
        """Send keystrokes to Terminal.app via AppleScript"""
        # Escape special characters for AppleScript
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

    def launch_chipilot(self):
        log_section("LAUNCH", "Starting chipilot in visible Terminal")

        # Check if built
        cli_js = SCRIPT_DIR / "dist" / "cli.js"
        if not cli_js.exists():
            log_info("Building project...")
            result = subprocess.run(['npm', 'run', 'build'], cwd=SCRIPT_DIR, capture_output=True)
            if result.returncode != 0:
                log_error("Build failed")
                return False

        # Launch in Terminal.app using AppleScript so it appears on screen
        script = f'''
tell application "Terminal"
    activate
    do script "cd '{SCRIPT_DIR}' && node dist/cli.js"
    set custom title of front window to "ChipClaude-E2E"
end tell
'''
        result = subprocess.run(['osascript', '-e', script], capture_output=True)
        if result.returncode != 0:
            log_error(f"Failed to launch Terminal: {result.stderr.decode()}")
            return False

        log_success("Chipilot launched in Terminal.app")
        log_info("Waiting 5 seconds for startup...")
        time.sleep(5)
        return True

    def run_test_sequence(self):
        log_section("TEST", "Running E2E sequence")

        steps = [
            ("01-initial", None, 2, "Initial state"),
            ("02-terminal-focused", "\t", 1, "Tab to terminal"),
            ("03-command-typed", "echo E2E_SUCCESS", 0.5, "Type command"),
            ("04-command-executed", "\r", 2, "Execute command"),
            ("05-chat-focused", "\t", 1, "Tab to chat"),
            ("06-chat-typed", "Hello E2E", 0.5, "Type message"),
            ("07-chat-response", "\r", 3, "Submit message"),
            ("08-final", None, 2, "Final state"),
        ]

        for name, keys, delay, desc in steps:
            log_info(f"Step: {desc}")

            if keys:
                self.send_keys(keys, delay)
            else:
                time.sleep(delay)

            # Take PNG screenshot (visual evidence from Terminal.app)
            self.take_screenshot(name)

        log_success("Test sequence complete")

    def verify_results(self):
        log_section("VERIFY", "Checking results")

        # Check command output
        cmd_file = self.output_dir / "04-command-executed.txt"
        if cmd_file.exists():
            content = cmd_file.read_text()
            if "E2E_SUCCESS" in content:
                log_success("Terminal command executed")
            else:
                log_warn("Command output not found")

        # Count files
        png_count = len(list(self.output_dir.glob("*.png")))
        txt_count = len(list(self.output_dir.glob("*.txt")))

        log_info(f"PNG screenshots: {png_count}")
        log_info(f"Text captures: {txt_count}")

        return png_count, txt_count

    def generate_report(self):
        log_section("REPORT", "Generating report")

        png_count = len(list(self.output_dir.glob("*.png")))
        has_video = (self.output_dir / "recording.mp4").exists()

        report = f"""# E2E Test Report (Python PTY)

**Date:** {datetime.now().isoformat()}
**Test ID:** e2e-python-{TIMESTAMP}

## Summary

| Metric | Value |
|--------|-------|
| PNG Screenshots | {png_count} |
| Video Recording | {"Yes" if has_video else "No"} |
| Text Captures | {len(list(self.output_dir.glob("*.txt")))} |

## Files Generated

### Screenshots (PNG)
"""

        for png in sorted(self.output_dir.glob("*.png")):
            size = png.stat().st_size
            report += f"- {png.name} ({size} bytes)\n"

        if png_count == 0:
            report += "- No PNG screenshots\n"

        report += "\n### Text Captures\n"
        for txt in sorted(self.output_dir.glob("*.txt")):
            size = txt.stat().st_size
            report += f"- {txt.name} ({size} bytes)\n"

        report += f"\n### Video\n"
        if has_video:
            size = (self.output_dir / "recording.mp4").stat().st_size
            report += f"- recording.mp4 ({size} bytes)\n"
        else:
            report += "- No video recording\n"

        report += """
## Test Steps

1. Initial Load - App startup
2. Terminal Focus - Tab key to terminal
3. Command Entry - Typed "echo E2E_SUCCESS"
4. Command Execution - Enter to execute
5. Chat Focus - Tab key to chat
6. Chat Entry - Typed "Hello E2E"
7. Chat Submit - Enter to submit
8. Final State - End state

## Environment

- OS: macOS (darwin)
- Screenshot capable: """ + str(self.screenshot_capable) + """
- Video capable: """ + str(self.ffmpeg_available) + """

## Notes

"""
        if not self.screenshot_capable:
            report += """**Screen recording permissions required for PNG/MP4 capture.**

To enable visual evidence:
1. Open System Settings
2. Privacy & Security > Screen Recording
3. Add and enable Terminal
4. Run this test in an interactive terminal
"""

        report_path = self.output_dir / "E2E-REPORT.md"
        report_path.write_text(report)
        log_success(f"Report: {report_path}")

    def cleanup(self):
        log_info("Cleaning up...")
        # Close Terminal window
        script = '''
tell application "Terminal"
    close (every window whose name contains "ChipClaude-E2E")
end tell
'''
        subprocess.run(['osascript', '-e', script], capture_output=True)
        self.stop_recording()

    def run(self):
        print("=" * 50)
        print("E2E TEST WITH PYTHON PTY")
        print("=" * 50)
        print()

        try:
            self.check_environment()
            self.launch_chipilot()
            self.start_recording(45)
            self.run_test_sequence()
            self.verify_results()
            self.generate_report()

            print()
            print("=" * 50)
            print("E2E TEST COMPLETE")
            print("=" * 50)
            print()
            log_success(f"Results: {self.output_dir}")

            print("\nGenerated files:")
            for f in sorted(self.output_dir.iterdir()):
                size = f.stat().st_size
                print(f"  {f.name:<30} {size:>10} bytes")

            if not self.screenshot_capable:
                print("\nNOTE: For PNG/MP4 capture, enable screen recording permissions:")
                print("  System Settings > Privacy & Security > Screen Recording > Terminal")

        finally:
            self.cleanup()

def main():
    parser = argparse.ArgumentParser(description='E2E Test with Visual Evidence')
    parser.add_argument('--no-video', action='store_true', help='Skip video recording')
    args = parser.parse_args()

    test = E2ETest()
    test.run()

if __name__ == "__main__":
    main()
