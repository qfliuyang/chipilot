# Multi-Tier Terminal Test Framework

This framework provides progressive testing layers where each tier validates the previous tier's assumptions and detects insufficient testing (mocks, fakes, shortcuts).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  TIER 5: Visual Regression (VHS Pixel-Perfect Screenshots)        │
│  ├─ Uses VHS to capture real terminal screenshots                 │
│  ├─ Pixel-by-pixel comparison against golden images               │
│  ├─ Catches visual issues: ANSI bleeding, layout shifts,          │
│  │   truncation, cursor visibility, border rendering              │
│  ├─ Human-visible bugs that text tests miss                       │
│  └─ Detects: Visual regressions, layout bugs, ANSI issues         │
├─────────────────────────────────────────────────────────────────┤
│  TIER 4: E2E Acceptance (Real Shell Scenarios)                  │
│  ├─ Spawns actual built CLI in real PTY                         │
│  ├─ Runs full user workflows (login → chat → terminal → exit)   │
│  ├─ Cross-validates Tiers 1-3 outputs                           │
│  └─ Detects: Incomplete coverage, scenario gaps                 │
├─────────────────────────────────────────────────────────────────┤
│  TIER 3: Integration (PTY-Based Component Testing)              │
│  ├─ Uses node-pty to spawn CLI processes                        │
│  ├─ Sends real keystrokes, captures actual terminal output      │
│  ├─ Validates Tier 2 didn't over-mock Ink behaviors             │
│  └─ Detects: Mocked rendering, fake input handling              │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: Component (ink-testing-library)                        │
│  ├─ Renders React components to string output                   │
│  ├─ Validates Tier 1 test doubles are realistic                 │
│  └─ Detects: Unrealistic mocks, missing edge cases              │
├─────────────────────────────────────────────────────────────────┤
│  TIER 1: Unit (Pure Logic & Utilities)                          │
│  ├─ Tests pure functions, parsers, state machines               │
│  ├─ Fast, deterministic, no I/O                                 │
│  ├─ Foundation for all upper tiers                              │
│  └─ Detects: Logic errors, boundary conditions                  │
└─────────────────────────────────────────────────────────────────┘
```

## Tier Validation Rules

Each tier includes **anti-cheat validators** that check the tier above:

| Validator | What It Checks | Fails When |
|-----------|---------------|------------|
| `MockDetector` | Counts mock vs real implementations | >50% mocks in integration tests |
| `CoverageGapAnalyzer` | Compares tested vs actual code paths | Scenarios missing from upper tiers |
| `OutputCrossValidator` | Same input produces same output across tiers | Divergence indicates fake |
| `TimingValidator` | Tests have realistic async behavior | Instant "async" ops (mocked) |
| `ANSIChecker` | Terminal sequences are real | Stripped/filtered ANSI in tests |

## Usage

```bash
# Run all tiers
npm run test:tiered

# Run specific tier
npm run test:tier1    # Unit tests
npm run test:tier2    # Component tests
npm run test:tier3    # PTY integration tests
npm run test:tier4    # E2E acceptance tests
npm run test:tier5    # Visual regression tests (VHS)

# Visual test operations
npm run test:visual          # Run visual regression tests
npm run test:visual:update   # Update golden screenshots after UI changes

# Run with validation
npm run test:tiered -- --strict  # Fails if any tier validation fails
```

## Test Files Organization

```
tests/
├── tier1-unit/           # Pure logic tests
│   └── unit.test.ts
├── tier2-component/      # Ink component tests
│   └── component.test.tsx
├── tier3-integration/    # PTY-based tests
│   ├── pty-runner.ts     # Shared PTY utilities
│   └── pty-integration.test.ts
├── tier4-e2e/            # Full scenarios
│   └── e2e.test.ts
├── tier5-visual/         # VHS visual regression tests
│   ├── tapes/            # VHS tape files (.tape)
│   ├── golden/           # Reference screenshots (.png)
│   ├── output/           # Test run screenshots (gitignored)
│   ├── scripts/          # Test runner scripts
│   └── README.md         # VHS-specific documentation
├── validators/           # Cross-tier validation
│   ├── MockDetector.ts
│   └── CrossValidator.ts
└── README.md
```

## Tier 5: Visual Regression Testing

Visual regression testing uses [VHS](https://github.com/charmbracelet/vhs) (Video Home System) to capture pixel-perfect screenshots of the terminal UI. This catches issues that humans see but text-based tests miss.

### What Visual Tests Catch

| Issue | Example | Why Text Tests Miss It |
|-------|---------|----------------------|
| **ANSI bleeding** | Escape sequences visible as garbage text | Tests strip ANSI before comparison |
| **Layout truncation** | Text cut off at panel edges | String comparison sees expected text |
| **Border rendering** | Box-drawing characters misaligned | No semantic meaning in text output |
| **Cursor visibility** | Cursor invisible or in wrong position | Cursor is visual, not in captured text |
| **Color/formatting** | Wrong colors, bold, dim attributes | Tests ignore formatting attributes |
| **Panel balance** | Uneven split between chat/terminal | No geometric validation in text tests |
| **Blinking artifacts** | Rapid state changes causing flicker | Tests sample at fixed points |

### When to Update Golden Screenshots

Run `npm run test:visual:update` when:
- Intentional UI changes (new layout, colors, styling)
- Adding new test scenarios
- Font or terminal theme changes

**Never** update golden screenshots to fix failing tests without reviewing the diff image first.

### Requirements

```bash
# Install VHS
brew install charmbracelet/tap/vhs
```

### @microsoft/tui-test Compatibility
We evaluated @microsoft/tui-test for TUI testing but found fundamental incompatibilities:
1. **Vitest Conflict**: Both libraries define `expect` globals, causing `Cannot redefine property: Symbol($$jest-matchers-object)`
2. **Worker Pool Issues**: tui-test's process spawning conflicts with vitest's worker pool messaging

**Solution**: Use Tier 3 (node-pty) for all PTY-based integration testing instead.
