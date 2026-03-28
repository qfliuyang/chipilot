# Anti-Cheating Constitution for Chipilot Development

## Core Principle

**NEVER CHEAT. NEVER MOCK. NEVER FAKE.**

## Definitions

### What Constitutes Cheating
1. **Mock Data Passing as Real**: Presenting generated/fake data as actual API responses
2. **Fabricated Evidence**: Creating test artifacts that don't reflect actual system behavior
3. **False Verification**: Claiming tests pass when they haven't actually run
4. **Simulated Activity**: Recording events that didn't happen to make telemetry look good
5. **Doctored Timestamps**: Modifying time data to hide failures or simulate delays

### What Constitutes Mocking
1. **Fake LLM Responses**: Returning hardcoded strings instead of actual API calls
2. **Stubbed Services**: Replacing real dependencies with fakes without explicit labeling
3. **Pre-recorded Outputs**: Replaying previous results as if they were fresh
4. **Empty Implementations**: Returning placeholder data marked as TODO but presented as working

## Verification Requirements

### For LLM Integration Tests
- [ ] Token usage must be visible on provider dashboard (BigModel.cn, Anthropic, etc.)
- [ ] API response must include real headers/timestamps from provider
- [ ] Response content must vary based on actual input
- [ ] Error cases must show real error responses, not placeholder messages

### For Visual/TUI Tests
- [ ] Screenshots must be actual image files (PNG, JPEG), not text representations
- [ ] Visual evidence must show actual rendered UI, not ASCII art
- [ ] Screen captures must be from actual display buffer or headless renderer

### For Telemetry/Recording Tests
- [ ] Each recorded event must correspond to actual code execution
- [ ] Token counts must match provider billing dashboard
- [ ] Durations must reflect real elapsed time, not estimated values
- [ ] Agent IDs must identify actual agent instances, not hardcoded strings

## Red Flags That Must Stop Development

1. **Zero Token Usage Reported** - If the dashboard shows 0 tokens, the test failed
2. **Identical Timestamps** - Multiple events with same millisecond timestamp
3. **Empty API Keys Still Working** - Tests passing without valid credentials
4. **Instant "LLM" Responses** - Sub-second responses from models that take 2-10s
5. **Text File "Screenshots"** - Screenshots that are .txt files instead of images
6. **Hardcoded Agent IDs** - "fallback-agent" appearing where real agent IDs should be

## Correction Protocol

When cheating is detected:

1. **STOP IMMEDIATELY** - Do not continue with fake results
2. **DELETE EVIDENCE** - Remove all fabricated test artifacts from repo
3. **INVESTIGATE ROOT CAUSE** - Find why the real implementation failed
4. **FIX THE ACTUAL ISSUE** - Make the real code work
5. **RE-RUN WITH VERIFICATION** - Actually check dashboard/token usage
6. **DOCUMENT THE FIX** - Explain what was broken and how it was fixed

## Verification Checklist

Before claiming any test passes:

- [ ] I have checked the provider dashboard for token activity
- [ ] I have verified screenshots are actual image files
- [ ] I have confirmed response content varies with input
- [ ] I have checked that error cases produce real errors
- [ ] I have verified no hardcoded mock data exists in the flow
- [ ] I can trace every recorded event to actual code execution

## Accountability

**Every claim of "test passed" or "working" must be verifiable by:**
- Provider dashboard showing token consumption
- Actual image files showing visual state
- Response headers from real API calls
- Logs showing actual network requests

**Never again will we accept:**
- "Trust me, it works"
- "The telemetry says it passed"
- "It should work in theory"

## This Constitution is Binding

Violations of this constitution are serious failures of engineering integrity.

When in doubt: **VERIFY WITH REAL DATA OR ADMIT IT DOESN'T WORK.**

---
*Created after a serious incident of fabricated test results being presented as real*
