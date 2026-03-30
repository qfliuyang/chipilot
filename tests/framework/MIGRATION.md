# Unified Test Framework Migration Guide

## Overview

All scattered test scripts have been consolidated into a single, coherent testing system with built-in anti-cheat validation.

## Scattered Scripts (DEPRECATED)

The following test scripts are now deprecated and should not be used:

| Old Script | New Test Module | Status |
|------------|-----------------|--------|
| `e2e-test-cycle.mjs` | `tests/framework/tests/e2e-tui.mjs` | Migrated |
| `e2e-test-with-llm.mjs` | `tests/framework/tests/e2e-tui.mjs` | Merged |
| `test-coordination.mjs` | `tests/framework/tests/agent-coordination.mjs` | Migrated |
| `verify-anti-cheat.mjs` | `tests/framework/tests/anti-cheat-verification.mjs` | Migrated |
| `test-agents.mjs` | Use `tests/framework/run.mjs --filter=coordination` | Use unified runner |
| `test-input.mjs` | Use `tests/framework/run.mjs --filter=e2e` | Use unified runner |
| `test-interactive.mjs` | Use `tests/framework/run.mjs --filter=e2e` | Use unified runner |
| `test-memory.mjs` | Not migrated (was debug script) | Can be deleted |
| `test-ux-improvements.mjs` | Not migrated (was debug script) | Can be deleted |
| `test-xterm.mjs` | Not migrated (was debug script) | Can be deleted |

## Unified Framework Structure

```
tests/framework/
├── run.mjs                      # Main entry point
├── UnifiedTestFramework.mjs     # Core framework
├── MIGRATION.md                 # This file
└── tests/
    ├── e2e-tui.mjs             # E2E TUI tests
    ├── agent-coordination.mjs  # Multi-agent tests
    └── anti-cheat-verification.mjs # Anti-cheat tests
```

## Usage

### Run All Tests
```bash
node tests/framework/run.mjs
```

### Run Specific Tests
```bash
# Run only E2E tests
node tests/framework/run.mjs --filter=e2e

# Run only coordination tests
node tests/framework/run.mjs --filter=coordination

# Run only anti-cheat verification
node tests/framework/run.mjs --filter=anti-cheat
```

### Disable Anti-Cheat (for debugging)
```bash
node tests/framework/run.mjs --no-anti-cheat
```

### Show Help
```bash
node tests/framework/run.mjs --help
```

## Anti-Cheat Principles

The unified framework enforces these principles:

1. **All agent LLM calls MUST be real** - No rule-based fallbacks or hardcoded responses
2. **Token usage MUST be recorded** - Every LLM call/response must have token usage via AgentRecorder
3. **All inter-agent communication MUST go through MessageBus** - Direct method calls between agents are prohibited
4. **Tests MUST expose problems** - Not expect success; tests that hide failures are forbidden
5. **No scattered test scripts** - All tests managed in the unified framework

## Violation Categories

The anti-cheat system detects:

| Category | Severity | Description |
|----------|----------|-------------|
| ORPHANED_LLM_RESPONSE | high | LLM response has no matching call |
| SUSPICIOUSLY_FAST_RESPONSE | high | LLM response completed in <100ms (too fast for real LLM) |
| MISSING_TOKEN_USAGE | medium | LLM call/response missing token usage data |
| ZERO_TOKEN_USAGE | medium | Token usage shows zero tokens |
| NO_MESSAGE_COORDINATION | medium | Multiple agents active but no message coordination |
| STATIC_RESPONSE_PATTERN | high | Multiple identical responses detected |

## Output Structure

Test outputs are organized in timestamped directories:

```
tests/output/
└── test-{timestamp}/
    ├── test-report.json          # Overall test results
    ├── anti-cheat-report.json    # Anti-cheat analysis
    ├── e2e-tui/                  # E2E test artifacts
    │   ├── screen-initial.txt
    │   ├── screen-typed.txt
    │   ├── screen-response.txt
    │   ├── screen-final.txt
    │   ├── full-output.txt
    │   ├── events.json
    │   └── test-summary.json
    └── agent-coordination/       # Coordination test artifacts
        ├── test-summary.json
        └── anti-cheat-report.json
```

## Adding New Tests

To add a new test:

1. Create a test module in `tests/framework/tests/`
2. Export a function that takes `(outputDir, options)` and returns a result object
3. Register the test in `tests/framework/run.mjs`

Example test module:

```javascript
export async function runMyTest(outputDir, options = {}) {
  // Your test logic here
  return {
    passed: true,
    summary: { /* ... */ },
    artifacts: { /* ... */ },
  };
}
```

## Migration Complete

All tests are now managed through the unified framework. The scattered scripts should be removed after verifying the new framework works correctly.
