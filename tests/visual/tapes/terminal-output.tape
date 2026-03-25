# Test: Terminal with command output
# Validates: Terminal displays shell output, ANSI codes render correctly

Output output/terminal-output.png

Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

Type "${PROJECT_ROOT}/dist/cli.js"
Enter
Sleep 2s

# Switch to terminal and run a command
Tab
Sleep 500ms
Type "echo 'Hello from terminal'"
Sleep 300ms
Enter
Sleep 1s

Screenshot output/terminal-output.png

Escape
Sleep 500ms
