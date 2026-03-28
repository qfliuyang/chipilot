# E2E Test Report - Real LLM Integration

**Test ID:** e2e-test-1774654819234
**Timestamp:** 2026-03-27T23:40:46.294Z
**Model:** glm-5.1
**Status:** ✅ PASSED

---

## Test Objective

Verify end-to-end flow with real LLM integration using glm-5.1 model via BigModel.cn API.

**Test Query:** `What Innovus command shows the current floorplan?`

---

## API Configuration

| Setting | Value |
|---------|-------|
| Model | glm-5.1 |
| Base URL | https://open.bigmodel.cn/api/anthropic |
| API Key | 6100a9ae...**** (truncated) |

---

## UI Indicators

| Indicator | Status |
|-----------|--------|
| Welcome message | ✅ |
| Initializing agents | ✅ |
| Processing state | ✅ |
| AI response | ✅ |
| Thinking state | ✅ |
| Command suggestion | ❌ |

---

## Telemetry Summary

| Metric | Count |
|--------|-------|
| LLM Calls | 4 |
| LLM Responses | 4 |
| State Changes | 4 |
| Recording Files | 1 |
| Input Tokens | 311 |
| Output Tokens | 827 |

---

## LLM Response Analysis

### Mock/Cheating Detection

**Result:** ✅ NO MOCK DATA DETECTED

### Response 1 (fallback-agent)

**Timestamp:** 2026-03-27T23:40:31.141Z
**Duration:** 4872ms

```
# Intent Analysis

| Attribute | Value |
|-----------|-------|
| **Intent Type** | `query_status` |
| **Target EDA Tool** | Cadence Innovus |
| **Description** | User wants to know the command to view/inspect the current floorplan status in Innovus |

---

## Answer

The command to display the current floorplan information in Innovus is:

```execute
getFPlan
```

This command reports the current floorplan configuration, including die area, core area, and placement area.
```

---
### Response 2 (orchestrator)

**Timestamp:** 2026-03-27T23:40:31.141Z
**Duration:** 4872ms

```
# Intent Analysis

| Attribute | Value |
|-----------|-------|
| **Intent Type** | `query_status` |
| **Target EDA Tool** | Cadence Innovus |
| **Description** | User wants to know the command to view/inspect the current floorplan status in Innovus |

---

## Answer

The command to display the current floorplan information in Innovus is:



This command reports the current floorplan configuration, including die area, core area, and placement area.
```

---
### Response 3 (fallback-agent)

**Timestamp:** 2026-03-27T23:40:40.501Z
**Duration:** 9357ms

```
# Floorplan Visualization in Innovus

## Strategy

To view the current floorplan in Innovus, you'll use the **`floorPlan`** command with the `-report` flag. This command will print a summary of the current floorplan configuration, including die area, core area, core margins, and core utilization.

## Key Steps

1. **Run the report command** to view the current floorplan status

```execute
floorPlan -report
```

2. **Visual inspection (optional)** — If you're running in GUI mode, the floorplan wi
```

---
### Response 4 (planner)

**Timestamp:** 2026-03-27T23:40:40.502Z
**Duration:** 9358ms

```
# Floorplan Visualization in Innovus

## Strategy

To view the current floorplan in Innovus, you'll use the **`floorPlan`** command with the `-report` flag. This command will print a summary of the current floorplan configuration, including die area, core area, core margins, and core utilization.

## Key Steps

1. **Run the report command** to view the current floorplan status



2. **Visual inspection (optional)** — If you're running in GUI mode, the floorplan will be displayed in the layout vi
```


---

## Artifacts

| File | Location |
|------|----------|
| Initial Screen | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/screen-initial.txt |
| Typed Input | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/screen-typed.txt |
| Response | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/screen-response.txt |
| Final Screen | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/screen-final.txt |
| Full Output | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/full-output.txt |
| Events | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/events.json |
| Test Summary | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/test-summary.json |
| VHS Recording | /Users/luzi/code/chipilot-cli/chipilot/.claude/worktrees/cli-test/tests/output/e2e-test-1774654819234/vhs/session.cast |

---

## Conclusion

The E2E test completed successfully with real LLM integration. All telemetry is being recorded correctly.

**Next Steps:**
- [ ] Review VHS recording for visual verification
- [ ] Analyze agent coordination patterns
- [ ] Expand test coverage for more EDA commands
