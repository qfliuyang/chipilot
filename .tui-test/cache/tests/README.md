# Multi-Tier Terminal Test Framework

This framework provides progressive testing layers where each tier validates the previous tier's assumptions and detects insufficient testing (mocks, fakes, shortcuts).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
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
│  TIER 2.5: TUI Integration (@microsoft/tui-test)                │
│  ├─ High-level TUI testing with controlled terminal environment │
│  ├─ Bridges component tests and full PTY tests                  │
│  ├─ Validates Tier 2 mocks match real CLI behavior              │
│  └─ Detects: Component/real behavior divergence                 │
├─────────────────────────────────────────────────────────────────┤
│  TIER 2: Component (ink-testing-library)                        │
│  ├─ Renders React components to string output                   │
│  ├─ Simulates user input via stdin.write()                      │
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
npm run test:tier1      # Unit tests
npm run test:tier2      # Component tests
npm run test:tier2.5    # TUI integration tests (@microsoft/tui-test)
npm run test:tier3      # PTY integration tests
npm run test:tier4      # E2E acceptance tests

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
├── tier2.5-tui-test/     # @microsoft/tui-test integration
│   └── tui-integration.test.ts
├── tier3-integration/    # PTY-based tests
│   ├── pty-runner.ts     # Shared PTY utilities
│   └── pty-integration.test.ts
├── tier4-e2e/            # Full scenarios
│   └── e2e.test.ts
├── validators/           # Cross-tier validation
│   ├── MockDetector.ts
│   └── CrossValidator.ts
└── README.md
```
