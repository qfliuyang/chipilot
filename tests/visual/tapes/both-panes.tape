# Test: Both panes visible
# Validates: Layout is balanced, borders render correctly, no ANSI bleeding

Output output/both-panes.png

Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

Type "${PROJECT_ROOT}/dist/cli.js"
Enter
Sleep 2s

# Show the two-pane layout
Screenshot output/both-panes.png

Escape
Sleep 500ms
