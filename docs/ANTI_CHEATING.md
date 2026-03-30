# Anti-Cheating Specification for chipilot Agent System

## Version 1.0.0

**Status:** Draft
**Last Updated:** 2026-03-28
**Applies To:** All agent implementations in `src/agents/`

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Anti-Cheating Requirements](#anti-cheating-requirements)
4. [Detection Mechanisms](#detection-mechanisms)
5. [Enforcement Strategy](#enforcement-strategy)
6. [Test Framework Integration](#test-framework-integration)
7. [Implementation Reference](#implementation-reference)
8. [Compliance Checklist](#compliance-checklist)

---

## Overview

This specification defines the anti-cheating framework for the chipilot multi-agent system. The primary goal is to ensure that all agent outputs are generated through legitimate LLM API calls, preventing any form of rule-based fallback, hardcoded responses, or mock data injection.

### Why Anti-Cheating Matters

In a multi-agent system designed for EDA (Electronic Design Automation) workflows, the integrity of agent decisions is critical. Cheating mechanisms that bypass LLM calls may:

- Produce incorrect or unsafe Tcl commands for production chip design tools
- Create false confidence in automated decisions
- Undermine the learning and improvement mechanisms
- Violate audit and compliance requirements

### Scope

This specification applies to:
- All 9 agent types in the hierarchical system
- LLM call chains and response handling
- Token usage tracking and verification
- Test frameworks and mock detection
- Production and development environments

---

## Core Principles

### 1. No Rule-Based Fallbacks

**Rule:** When an LLM call fails or times out, agents MUST NOT fall back to rule-based response generation.

**Rationale:** Rule-based fallbacks bypass the reasoning capabilities of the LLM and may produce incorrect or contextually inappropriate responses.

**Acceptable Behavior:**
```typescript
// CORRECT: Propagate the error
async processWithLLM(prompt: string): Promise<string> {
  try {
    const response = await this.llmAgent.chat(prompt);
    return response.message;
  } catch (error) {
    // Log and re-throw - do not generate fallback response
    this.recorder?.recordError(this.id, `LLM call failed: ${error}`);
    throw error;
  }
}
```

**Prohibited Behavior:**
```typescript
// WRONG: Rule-based fallback
async processWithLLM(prompt: string): Promise<string> {
  try {
    return await this.llmAgent.chat(prompt);
  } catch (error) {
    // NEVER DO THIS: Generate fallback response
    return this.generateRuleBasedResponse(prompt);
  }
}
```

### 2. All Outputs Must Come from LLM Calls

**Rule:** Every agent output that appears to be "intelligent" (decisions, analysis, command generation) MUST be produced by an actual LLM API call.

**Rationale:** Ensures traceability, auditability, and consistent reasoning quality.

**Requirements:**
- All agent outputs must have a corresponding `llm_call` activity record
- The `llm_response` record must precede or accompany any output-producing activity
- Token usage must be non-zero for all LLM-generated outputs

### 3. Transparent Telemetry

**Rule:** All agent activities MUST be recorded via the `AgentRecorder` with complete metadata.

**Rationale:** Enables verification, debugging, and anti-cheating detection.

**Required Telemetry:**
- LLM call events with prompts and model names
- LLM response events with token usage
- Duration tracking for all operations
- Error events with full context
- State changes and message exchanges

---

## Anti-Cheating Requirements

### 3.1 Traceable LLM Call Chain

Every agent output must have a verifiable chain of LLM calls:

```
Input -> LLM Call (recorded) -> LLM Response (recorded) -> Agent Output
```

**Verification Method:**
```typescript
// Check that output has corresponding LLM call
const activities = recorder.getAgentActivities(agentId, 50);
const hasRecentLLMCall = activities.some(
  a => a.type === 'llm_call' &&
       a.timestamp > Date.now() - 30000
);

if (!hasRecentLLMCall) {
  throw new CheatingDetectedError(agentId, 'RULE_BASED',
    'Output generated without LLM call');
}
```

### 3.2 No Hardcoded Responses

**Prohibited Patterns:**
- Static response strings in agent code
- Switch statements that return predefined outputs
- Template-based responses without LLM processing
- Any response that doesn't vary based on input context

**Detection Patterns:**
```typescript
const HARDCODED_PATTERNS = [
  /^This is a (test|mock|sample)/i,
  /^Example (output|response)/i,
  /\[HARDCODED\]/i,
  /\[MOCK\]/i,
  /\[PLACEHOLDER\]/i,
];
```

### 3.3 Token Usage Verification

**Minimum Requirements:**
- All LLM operations MUST consume > 0 tokens
- Input tokens must be proportional to prompt length
- Output tokens must be proportional to response length

**Validation:**
```typescript
validateTokenUsage(agentId: string, actualTokens: number): boolean {
  const MIN_REALISTIC_TOKENS = 1;

  if (actualTokens < MIN_REALISTIC_TOKENS) {
    throw new CheatingDetectedError(agentId, 'ZERO_TOKENS',
      `Unrealistic token usage: ${actualTokens} tokens`);
  }
  return true;
}
```

### 3.4 Response Latency Requirements

**Minimum Realistic Durations:**
| Operation Type | Minimum Duration |
|----------------|------------------|
| Simple LLM call | > 500ms |
| Complex reasoning | > 1000ms |
| Multi-step generation | > 2000ms |

**Detection:**
```typescript
const MIN_REALISTIC_DURATION = 500; // ms

if (duration < MIN_REALISTIC_DURATION) {
  throw new CheatingDetectedError(agentId, 'SUSPICIOUS_SPEED',
    `Response too fast: ${duration}ms < ${MIN_REALISTIC_DURATION}ms`);
}
```

---

## Detection Mechanisms

### 4.1 Runtime Validation

The `AntiCheatMonitor` service provides runtime validation of agent outputs:

```typescript
export class AntiCheatMonitor {
  // Validate output before it's returned
  validateOutput(
    agentId: string,
    input: string,
    output: string,
    options: {
      duration?: number;
      tokenUsage?: { input: number; output: number };
    }
  ): { valid: boolean; violations: CheatingViolation[] };
}
```

**Integration Points:**
1. **BaseAgent.processWithLLM()** - Records all LLM calls
2. **Agent message handlers** - Validates outputs before sending
3. **Test assertions** - Verifies no cheating in test runs

### 4.2 Pattern Detection

**Mock Data Patterns:**
```typescript
const MOCK_PATTERNS = [
  /mock_/i,
  /test_/i,
  /example_/i,
  /placeholder/i,
  /dummy_/i,
  /fake_/i,
  /sample_/i,
];
```

**Hardcoded Response Patterns:**
```typescript
const HARDCODED_PATTERNS = [
  /^This is a (test|mock|sample)/i,
  /^Example (output|response)/i,
  /\[HARDCODED\]/i,
  /\[MOCK\]/i,
];
```

### 4.3 Token Usage Verification

Token usage is verified at multiple levels:

1. **Per-call verification:** Each LLM call must report token usage
2. **Agent-level aggregation:** Total tokens must match sum of individual calls
3. **Session-level validation:** Cross-reference with API billing if available

### 4.4 Response Entropy Analysis

Detect repetitive or low-entropy responses that may indicate hardcoded outputs:

```typescript
// Detect duplicate responses
private recentResponses: Map<string, { response: string; count: number }>;

if (existing && existing.count >= 2) {
  throw new CheatingDetectedError(agentId, 'HARDCODED',
    `Exact same response repeated ${existing.count} times`);
}
```

---

## Enforcement Strategy

### 5.1 Fail-Fast Configuration

**Environment Variable Requirements:**
```bash
# Required for operation
export ANTHROPIC_API_KEY="..."  # Must be valid
export CHIPILOT_MODEL="claude-sonnet-4-6-20250514"

# Anti-cheating enforcement
export CHIPILOT_ANTI_CHEAT="strict"  # strict | warn | off
export CHIPILOT_MIN_TOKENS="1"
export CHIPILOT_MIN_DURATION_MS="500"
```

**Fail-Fast Behavior:**
```typescript
// In BaseAgent constructor
if (!process.env.ANTHROPIC_API_KEY && process.env.CHIPILOT_ANTI_CHEAT === 'strict') {
  throw new Error('ANTHROPIC_API_KEY required in strict anti-cheat mode');
}
```

### 5.2 Crash on Cheating Detection

When cheating is detected, the system MUST crash immediately:

```typescript
export class CheatingDetectedError extends Error {
  constructor(
    public agentId: string,
    public violationType: ViolationType,
    public evidence: string
  ) {
    super(`Cheating detected in ${agentId}: ${violationType}. ${evidence}`);
    this.name = 'CheatingDetectedError';
  }
}

// Usage
if (detectedCheating) {
  throw new CheatingDetectedError(agentId, 'HARDCODED', 'Duplicate response detected');
}
```

### 5.3 Audit Logging

All agent decisions must be logged with full context:

```typescript
interface AuditLog {
  timestamp: number;
  agentId: string;
  decision: string;
  llmCallId: string;
  input: unknown;
  output: unknown;
  tokenUsage: TokenUsage;
  duration: number;
}
```

**Log Destination:**
- Primary: `recordings/session_{timestamp}.ndjson`
- Secondary: Console (when `consoleLog: true`)
- Tertiary: External audit system (future)

---

## Test Framework Integration

### 6.1 Mock Detection in Tests

**Test Helper:**
```typescript
// tests/helpers/anti-cheat-assertions.ts

export function assertNoCheating(
  recorder: AgentRecorder,
  agentId: string
): void {
  const activities = recorder.getAgentActivities(agentId);

  // Verify all outputs have LLM calls
  const outputs = activities.filter(a => a.type === 'task_completed');
  const llmCalls = activities.filter(a => a.type === 'llm_call');

  for (const output of outputs) {
    const hasPrecedingLLMCall = llmCalls.some(
      call => call.timestamp < output.timestamp &&
              call.timestamp > output.timestamp - 30000
    );

    if (!hasPrecedingLLMCall) {
      throw new Error(`Output without LLM call: ${output.id}`);
    }
  }

  // Verify token usage
  const totalTokens = activities
    .filter(a => a.tokenUsage)
    .reduce((sum, a) => sum + (a.tokenUsage?.totalTokens || 0), 0);

  expect(totalTokens).toBeGreaterThan(0);
}
```

### 6.2 Automated Verification

**Jest Setup:**
```typescript
// tests/setup/anti-cheat.ts

afterEach(() => {
  // Verify no cheating occurred in any test
  const recorder = getAgentRecorder();
  const monitor = new AntiCheatMonitor(recorder);

  if (monitor.hasViolations()) {
    const violations = monitor.getViolations();
    throw new Error(`Cheating detected in test: ${JSON.stringify(violations)}`);
  }
});
```

### 6.3 Token Usage Validation Per Test

```typescript
it('should generate command with real LLM call', async () => {
  const recorder = getAgentRecorder();
  const initialTokens = getTotalTokens(recorder);

  // Execute agent operation
  const result = await agent.generateCommand('run placement', 'innovus');

  // Verify tokens were consumed
  const finalTokens = getTotalTokens(recorder);
  expect(finalTokens - initialTokens).toBeGreaterThan(0);

  // Verify no cheating
  assertNoCheating(recorder, agent.id);
});
```

---

## Implementation Reference

### 7.1 Key Files

| File | Purpose |
|------|---------|
| `src/agents/AntiCheatMonitor.ts` | Runtime cheating detection |
| `src/agents/AgentRecorder.ts` | Telemetry and audit logging |
| `src/agents/BaseAgent.ts` | Base class with LLM call tracking |

### 7.2 AntiCheatMonitor API

```typescript
export class AntiCheatMonitor {
  constructor(recorder: AgentRecorder, config?: Partial<AntiCheatConfig>);

  // Detection methods
  detectHardcodedResponse(agentId: string, response: string, duration?: number): boolean;
  detectRuleBasedBypass(agentId: string, input: string, output: string): boolean;
  detectMockData(output: unknown): boolean;
  validateTokenUsage(agentId: string, actualTokens: number, expectedMinTokens?: number): boolean;

  // Comprehensive validation
  validateOutput(agentId: string, input: string, output: string, options?: ValidationOptions): ValidationResult;

  // Enforcement
  enforceNoCheating(agentId?: string): void;

  // Statistics
  getViolations(agentId?: string): CheatingViolation[];
  getStatistics(): ViolationStatistics;
  hasViolations(agentId?: string): boolean;
}
```

### 7.3 Configuration Options

```typescript
export interface AntiCheatConfig {
  minRealisticTokens: number;      // Default: 1
  minRealisticDuration: number;    // Default: 100 (ms)
  maxViolations: number;           // Default: 1000
  throwOnViolation: boolean;       // Default: true
  mockPatterns: RegExp[];          // Patterns indicating mock data
  hardcodedPatterns: RegExp[];     // Patterns indicating hardcoded responses
}
```

### 7.4 Violation Types

```typescript
export type ViolationType =
  | 'HARDCODED'        // Static/predefined responses
  | 'RULE_BASED'       // Output without LLM call
  | 'MOCK_DATA'        // Contains mock/test patterns
  | 'ZERO_TOKENS'      // No token usage recorded
  | 'SUSPICIOUS_SPEED'; // Response too fast for LLM
```

---

## Compliance Checklist

### For Agent Implementations

- [ ] Agent extends `BaseAgent` and uses `processWithLLM()` for all reasoning
- [ ] No hardcoded response strings in agent code
- [ ] No rule-based fallbacks when LLM fails
- [ ] All outputs recorded via `AgentRecorder`
- [ ] Token usage tracked for all LLM calls
- [ ] Response durations realistic (> 500ms)

### For Test Implementations

- [ ] Tests use `assertNoCheating()` helper
- [ ] Token usage verified in integration tests
- [ ] Mock data patterns detected and flagged
- [ ] Test recordings preserved for audit

### For Production Deployment

- [ ] `CHIPILOT_ANTI_CHEAT=strict` enforced
- [ ] `ANTHROPIC_API_KEY` configured and valid
- [ ] Audit logs written to persistent storage
- [ ] Monitoring alerts for cheating violations
- [ ] Regular compliance audits scheduled

---

## Appendix A: Example Violation Reports

### Example 1: Hardcoded Response Detected

```json
{
  "id": "violation_1712345678900_abc123",
  "agentId": "command-synthesis-1",
  "type": "HARDCODED",
  "description": "Exact same response repeated 3 times",
  "timestamp": 1712345678900,
  "evidence": {
    "response": "setOptMode -addFillers true",
    "duration": 50,
    "context": {
      "repeatCount": 3,
      "firstSeen": 1712345600000
    }
  }
}
```

### Example 2: Rule-Based Bypass Detected

```json
{
  "id": "violation_1712345678901_def456",
  "agentId": "planner-1",
  "type": "RULE_BASED",
  "description": "Output generated without corresponding LLM call",
  "timestamp": 1712345678901,
  "evidence": {
    "input": "Create placement plan for design",
    "response": "{ \"steps\": [...] }",
    "context": {
      "recentActivities": [
        { "type": "task_started", "timestamp": 1712345678000 },
        { "type": "task_completed", "timestamp": 1712345678901 }
      ]
    }
  }
}
```

---

## Appendix B: Migration Guide

### Converting Existing Agents

1. **Replace direct LLM calls with `processWithLLM()`**
   ```typescript
   // Before
   const response = await someLLMCall(prompt);

   // After
   const response = await this.processWithLLM(prompt, context);
   ```

2. **Remove rule-based fallbacks**
   ```typescript
   // Before
   try {
     return await llm.chat(prompt);
   } catch {
     return fallbackResponse;  // REMOVE THIS
   }

   // After
   return await this.processWithLLM(prompt, context);  // Throws on error
   ```

3. **Add anti-cheat validation**
   ```typescript
   // In message handlers
   async handleMessage(message: AgentMessage): Promise<void> {
     const output = await this.processWithLLM(message.payload);

     // Validate no cheating
     this.antiCheatMonitor?.validateOutput(
       this.id,
       String(message.payload),
       output
     );

     // Send response
     this.sendMessage({ ... });
   }
   ```

---

## References

- [AgentRecorder.ts](../src/agents/AgentRecorder.ts) - Telemetry implementation
- [AntiCheatMonitor.ts](../src/agents/AntiCheatMonitor.ts) - Detection implementation
- [BaseAgent.ts](../src/agents/BaseAgent.ts) - Base class with LLM tracking
- [multi-agent-system-final.md](./architecture/multi-agent-system-final.md) - Architecture overview

---

**Document Owner:** chipilot Architecture Team
**Review Cycle:** Quarterly
**Next Review:** 2026-06-28
