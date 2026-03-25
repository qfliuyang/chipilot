# Test: Chat input typing
# Validates: Input appears correctly, cursor visible, no blinking artifacts

Output output/chat-input.png

Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

Type "${PROJECT_ROOT}/dist/cli.js"
Enter
Sleep 2s

# Type in chat pane
Type "how do I run a synthesis"
Sleep 500ms

Screenshot output/chat-input.png

Escape
Sleep 500ms
