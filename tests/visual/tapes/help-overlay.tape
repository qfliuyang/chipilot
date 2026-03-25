# Test: Help overlay
# Validates: Help modal displays correctly, no layout issues, text readable

Output output/help-overlay.png

Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

Type "${PROJECT_ROOT}/dist/cli.js"
Enter
Sleep 2s

# Clear any input and show help
Ctrl+U
Type "?"
Sleep 500ms

Screenshot output/help-overlay.png

Escape
Sleep 500ms
