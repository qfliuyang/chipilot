# VHS Visual Regression Testing for chipilot-cli

This directory contains visual regression tests using [VHS](https://github.com/charmbracelet/vhs) (Video Home System) by Charmbracelet.

## How it works

1. **Tape files** (`.tape`) define terminal interactions declaratively
2. **VHS** runs the CLI in a real terminal emulator and captures screenshots
3. **Pixel comparison** against golden screenshots detects visual regressions

## Directory Structure

```
tests/visual/
├── tapes/          # VHS tape files defining test scenarios
├── golden/         # Golden/reference screenshots (committed to git)
├── output/         # Current test run screenshots (gitignored)
└── scripts/        # Helper scripts for running tests
```

## Running Tests

```bash
# Run all visual tests (with 1 retry for flaky tests)
npm run test:visual

# Run without retry (strict mode)
npm run test:visual:strict

# Update golden screenshots (after intentional UI changes)
npm run test:visual:update

# Run specific test
npm run test:visual -- --grep="welcome"

# Custom pixelmatch threshold (default: 0.1)
npm run test:visual -- --threshold=0.2
```

## Test Options

| Option | Description |
|--------|-------------|
| `--retry` | Retry failed tests once (helps with flaky terminal state) |
| `--threshold=0.2` | Pixelmatch threshold (0-1, higher = more lenient) |
| `--grep="pattern"` | Run only tests matching pattern |
| `--update` / `-u` | Update golden screenshots |

## Handling Flaky Tests

Terminal-based tests can be flaky due to shell initialization timing. The default `npm run test:visual` includes `--retry` to automatically retry failed tests once. For CI pipelines where strictness is preferred, use `npm run test:visual:strict`.

## Writing Tape Files

Tape files use a simple DSL:

```tape
Output output/welcome.png
Set FontSize 14
Set Width 1200
Set Height 600
Set Padding 20
Set Theme { "background": "#1e1e1e", "foreground": "#ffffff" }

Type "./chipilot"
Enter
Sleep 500ms
Screenshot
```

## Available Commands

- `Type "text"` - Type text
- `Enter` / `Tab` / `Escape` / `Space` - Special keys
- `Sleep 500ms` - Wait for rendering
- `Screenshot [filename]` - Capture screenshot
- `Ctrl+C` - Send Ctrl+C
- `Up` / `Down` / `Left` / `Right` - Arrow keys
- `Backspace` / `Delete` - Delete keys

## Adding New Tests

1. Create a `.tape` file in `tapes/`
2. Run `npm run test:visual:update` to generate golden screenshot
3. Commit both the tape file and golden screenshot
