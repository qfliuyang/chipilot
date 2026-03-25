# Test: Initial welcome screen
# Validates: Welcome message displayed correctly, no ANSI bleeding, layout intact

Output output/welcome.png

# Terminal settings
Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme "Catppuccin Mocha"

# Launch chipilot directly
Type "${PROJECT_ROOT}/dist/cli.js"
Enter

# Wait for app to render
Sleep 3s

# Take screenshot
Screenshot output/welcome.png

# Clean up - send Escape to exit
Escape
Sleep 500ms
