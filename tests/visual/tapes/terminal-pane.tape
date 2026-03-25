# Test: Pane switching - Terminal focused
# Validates: Terminal pane shows correctly, "Tab to return" visible, chat input hidden

Output output/terminal-pane.png

Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

Type "${PROJECT_ROOT}/dist/cli.js"
Enter
Sleep 2s

# Type something in chat first
Type "test message"
Sleep 300ms

# Switch to terminal pane
Tab
Sleep 500ms

Screenshot output/terminal-pane.png

Escape
Sleep 500ms
