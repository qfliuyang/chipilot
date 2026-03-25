# Multi-Tier Test Framework - Test Results & Issues

## Test Run Summary

| Tier | Technology | Tests | Passed | Failed | Status |
|------|-----------|-------|--------|--------|--------|
| Tier 1 | Pure Vitest | 26 | 26 | 0 | ✅ PASS |
| Tier 2 | ink-testing-library | 18 | 18 | 0 | ✅ PASS |
| Tier 3 | node-pty | 16 | 12 | 4 | ⚠️ PARTIAL |
| Tier 4 | E2E | - | - | - | Not Run |

## Fixed Issues

### 1. ✅ Input Preservation Bug - FIXED
**Fix Applied:** Added `key={`input-${pane}`}` to input area Box in App.tsx

**Result:** Terminal pane now correctly shows "[Tab to return to chat]" instead of preserved input

**Evidence:**
```
│> [Tab to return to chat]│  ✅ CORRECT
```

### 2. ✅ Header Controls Test - FIXED
**Fix Applied:** Changed test to check for individual words instead of full string with ANSI codes

### 3. ✅ Screen Buffer Parsing - FIXED
**Fix Applied:** Changed `split('\\n')` to `split('\n')` to split on actual newlines

### 4. ✅ Timing Test - FIXED
**Fix Applied:** Use actual setTimeout instead of PTY timing which was synchronous

## Remaining Issues (4 failures)

### 1. Input Handling Test
**Test:** `should accept keyboard input`
**Issue:** Text doesn't appear in output immediately
**Likely Cause:** PTY echo timing differs from test expectations

### 2. Pane Switch Back Test
**Test:** `should switch back to chat with second Tab`
**Issue:** Pattern "test input" not found after switching back
**Likely Cause:** Shared session state between tests causing pollution

### 3. Help System Test
**Test:** `should show help overlay with ? key`
**Issue:** Help doesn't appear, `?` goes to terminal instead
**Likely Cause:** Test is in terminal pane, not chat pane when pressing `?`

### 4. State Pollution
**Issue:** All Tier 3 tests share one session via `beforeAll`
**Impact:** State from one test affects others
**Solution:** Create fresh session per test (slower but isolated)

## Files Modified

1. `src/tui/App.tsx` - Added key prop to force remount on pane switch
2. `tests/tier3-integration/pty-integration.test.ts` - Fixed test assertions
3. `tests/tier3-integration/pty-runner.ts` - No changes needed

## Recommendations for Full Green

To get all Tier 3 tests passing:

1. **Isolate test sessions**: Create new PTY session per test instead of shared `beforeAll`
2. **Fix help test**: Ensure starting in chat pane before sending `?`
3. **Fix input test**: Use `waitFor` pattern instead of checking output directly
4. **Fix pane switch test**: Use cyan border color indicator instead of input text
