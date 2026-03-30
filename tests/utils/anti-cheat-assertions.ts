/**
 * @fileoverview anti-cheat-assertions - Jest-style assertions for anti-cheat validation
 *
 * Provides custom Jest matchers and assertion helpers to validate that agents
 * are using real LLM calls and not returning hardcoded or mocked responses.
 *
 * @module tests/utils/anti-cheat-assertions
 */

import {
  MockDetectionEngine,
  DetectionReport,
  ValidationResult,
  StaticAnalysisResult,
  Violation,
  ActivityRecord,
} from "./MockDetectionEngine";

/**
 * Agent recorder interface for assertions
 */
interface AgentRecorder {
  getAllActivities(): ActivityRecord[];
  getActivitiesByType(type: string): ActivityRecord[];
  getAgentStatistics(agentId: string): {
    llmCalls: number;
    totalTokenUsage: { totalTokens: number };
  };
}

/**
 * Agent interface for assertions
 */
interface Agent {
  id: string;
  getActivities?(): ActivityRecord[];
}

/**
 * Event log entry
 */
interface EventLogEntry {
  agentId: string;
  type: string;
  timestamp: number;
  from?: string;
  to?: string;
}

/**
 * Custom error class for anti-cheat assertion failures
 */
export class AntiCheatAssertionError extends Error {
  public readonly violations: Violation[];
  public readonly report?: DetectionReport;

  constructor(message: string, violations: Violation[], report?: DetectionReport) {
    super(message);
    this.name = "AntiCheatAssertionError";
    this.violations = violations;
    this.report = report;
  }
}

/**
 * Assert that an agent recorder shows real LLM calls
 *
 * Validates:
 * - LLM calls exist and have corresponding responses
 * - Token usage is recorded and non-zero
 * - Response timing is realistic
 *
 * @param recorder - AgentRecorder instance or array of activity records
 * @param options - Assertion options
 * @throws AntiCheatAssertionError if cheating detected
 *
 * @example
 * ```typescript
 * expectRealLLMCalls(recorder);
 * expectRealLLMCalls(recorder, { minCalls: 5, agentId: 'planner' });
 * ```
 */
export function expectRealLLMCalls(
  recorder: AgentRecorder | ActivityRecord[],
  options: {
    /** Minimum number of expected LLM calls */
    minCalls?: number;
    /** Specific agent to check (checks all if not specified) */
    agentId?: string;
    /** Whether to throw on validation failure */
    throwOnFailure?: boolean;
  } = {}
): { passed: boolean; message: string; validationResult?: ValidationResult } {
  const engine = new MockDetectionEngine();
  const activities = Array.isArray(recorder) ? recorder : recorder.getAllActivities();

  // Filter by agent if specified
  const filteredActivities = options.agentId ? activities.filter((a) => a.agentId === options.agentId) : activities;

  // Validate recorder logs
  const validation = engine.validateRecorderLogs(filteredActivities);

  const minCalls = options.minCalls ?? 1;
  const llmCalls = filteredActivities.filter((a) => a.type === "llm_call");

  // Check minimum calls
  if (llmCalls.length < minCalls) {
    const message = `Expected at least ${minCalls} LLM call(s), but found ${llmCalls.length}`;
    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        [
          {
            id: `assert_llm_calls_${Date.now()}`,
            severity: "critical",
            category: "INSUFFICIENT_LLM_CALLS",
            description: message,
            agentId: options.agentId,
            evidence: { expected: minCalls, actual: llmCalls.length },
          },
        ],
        undefined
      );
    }
    return { passed: false, message, validationResult: validation };
  }

  // Check validation results
  if (!validation.valid) {
    const criticalErrors = validation.errors.filter((e) => e.type === "ORPHANED_RESPONSE" || e.type === "TIMING_VIOLATION");

    if (criticalErrors.length > 0) {
      const message = `LLM call validation failed with ${criticalErrors.length} critical error(s): ${criticalErrors.map((e) => e.message).join("; ")}`;

      if (options.throwOnFailure !== false) {
        throw new AntiCheatAssertionError(
          message,
          criticalErrors.map((e) => ({
            id: `assert_val_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            severity: "high",
            category: e.type,
            description: e.message,
            agentId: e.agentId,
            timestamp: e.timestamp,
            evidence: e,
          })),
          undefined
        );
      }
      return { passed: false, message, validationResult: validation };
    }
  }

  return {
    passed: true,
    message: `Validated ${llmCalls.length} LLM call(s) with proper call/response pairing`,
    validationResult: validation,
  };
}

/**
 * Assert that an agent has no hardcoded responses
 *
 * Validates:
 * - No identical responses across multiple calls
 * - No template-based response patterns
 * - Response entropy is above threshold
 *
 * @param agent - Agent instance or array of response strings
 * @param options - Assertion options
 * @throws AntiCheatAssertionError if hardcoded responses detected
 *
 * @example
 * ```typescript
 * expectNoHardcodedResponses(agent);
 * expectNoHardcodedResponses(['response1', 'response2', 'response3']);
 * ```
 */
export function expectNoHardcodedResponses(
  agent: Agent | string[],
  options: {
    /** Maximum allowed similarity between responses (0-1) */
    maxSimilarity?: number;
    /** Minimum required entropy per response */
    minEntropy?: number;
    /** Whether to throw on validation failure */
    throwOnFailure?: boolean;
  } = {}
): { passed: boolean; message: string; analysis?: StaticAnalysisResult } {
  const engine = new MockDetectionEngine();

  // Extract responses
  let responses: string[];
  if (Array.isArray(agent)) {
    responses = agent;
  } else if (agent.getActivities) {
    const activities = agent.getActivities();
    responses = activities
      .filter((a) => a.type === "llm_response")
      .map((a) => {
        const output = a.output as { response?: string } | undefined;
        return output?.response || "";
      })
      .filter((r) => r.length > 0);
  } else {
    responses = [];
  }

  if (responses.length === 0) {
    const message = "No responses found to analyze for hardcoded patterns";
    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        [
          {
            id: `assert_no_resp_${Date.now()}`,
            severity: "medium",
            category: "NO_RESPONSES",
            description: message,
            agentId: typeof agent === "object" && !Array.isArray(agent) ? agent.id : undefined,
            evidence: { agent },
          },
        ],
        undefined
      );
    }
    return { passed: false, message };
  }

  // Analyze responses
  const analysis = engine.detectStaticResponses(responses);

  if (!analysis.legitimate) {
    const findings = analysis.findings.slice(0, 3); // Limit to first 3 findings
    const message = `Detected ${analysis.findings.length} hardcoded response pattern(s): ${findings.map((f) => f.description).join("; ")}`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        findings.map((f) => ({
          id: `assert_static_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          severity: f.type === "identical" ? "high" : "medium",
          category: `STATIC_${f.type.toUpperCase()}`,
          description: f.description,
          agentId: typeof agent === "object" && !Array.isArray(agent) ? agent.id : undefined,
          evidence: { sample: f.sample, confidence: f.confidence },
        })),
        undefined
      );
    }
    return { passed: false, message, analysis };
  }

  return {
    passed: true,
    message: `Analyzed ${responses.length} response(s) - no hardcoded patterns detected (avg entropy: ${analysis.entropyStats.averageEntropy.toFixed(2)})`,
    analysis,
  };
}

/**
 * Assert that token usage is properly recorded for an agent
 *
 * Validates:
 * - Token usage data exists for LLM operations
 * - Token counts are non-zero
 * - Token counts are within realistic bounds
 *
 * @param agent - Agent instance or AgentRecorder
 * @param options - Assertion options
 * @throws AntiCheatAssertionError if token usage not properly recorded
 *
 * @example
 * ```typescript
 * expectTokenUsageRecorded(agent);
 * expectTokenUsageRecorded(recorder, { agentId: 'planner', minTokens: 100 });
 * ```
 */
export function expectTokenUsageRecorded(
  agent: Agent | AgentRecorder | ActivityRecord[],
  options: {
    /** Specific agent ID to check */
    agentId?: string;
    /** Minimum expected tokens per operation */
    minTokens?: number;
    /** Maximum expected tokens per operation (sanity check) */
    maxTokens?: number;
    /** Whether to throw on validation failure */
    throwOnFailure?: boolean;
  } = {}
): { passed: boolean; message: string; totalTokens?: number } {
  let activities: ActivityRecord[];

  if (Array.isArray(agent)) {
    activities = agent;
  } else if ("getAllActivities" in agent) {
    activities = agent.getAllActivities();
  } else if ("getActivities" in agent && agent.getActivities) {
    activities = agent.getActivities();
  } else {
    activities = [];
  }

  // Filter by agent if specified
  if (options.agentId) {
    activities = activities.filter((a) => a.agentId === options.agentId);
  }

  const llmActivities = activities.filter((a) => a.type === "llm_call" || a.type === "llm_response");

  if (llmActivities.length === 0) {
    const message = options.agentId
      ? `No LLM activities found for agent ${options.agentId}`
      : "No LLM activities found";

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        [
          {
            id: `assert_no_llm_${Date.now()}`,
            severity: "critical",
            category: "NO_LLM_ACTIVITIES",
            description: message,
            agentId: options.agentId,
            evidence: { activities: activities.length },
          },
        ],
        undefined
      );
    }
    return { passed: false, message };
  }

  // Check for missing token usage
  const missingTokenUsage = llmActivities.filter((a) => !a.tokenUsage);
  if (missingTokenUsage.length > 0) {
    const message = `${missingTokenUsage.length}/${llmActivities.length} LLM activities missing token usage data`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        missingTokenUsage.map((a) => ({
          id: `assert_no_tokens_${Date.now()}_${a.id}`,
          severity: "high",
          category: "MISSING_TOKEN_USAGE",
          description: `LLM activity ${a.type} missing token usage`,
          agentId: a.agentId,
          timestamp: a.timestamp,
          evidence: a,
        })),
        undefined
      );
    }
    return { passed: false, message };
  }

  // Check for zero tokens
  const zeroTokenActivities = llmActivities.filter((a) => a.tokenUsage && a.tokenUsage.totalTokens === 0);
  if (zeroTokenActivities.length > 0) {
    const message = `${zeroTokenActivities.length} LLM activities have zero token usage - likely mocked`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        zeroTokenActivities.map((a) => ({
          id: `assert_zero_tokens_${Date.now()}_${a.id}`,
          severity: "critical",
          category: "ZERO_TOKEN_USAGE",
          description: `LLM activity has zero token usage`,
          agentId: a.agentId,
          timestamp: a.timestamp,
          evidence: a,
        })),
        undefined
      );
    }
    return { passed: false, message };
  }

  // Check minimum tokens if specified
  const minTokens = options.minTokens ?? 1;
  const lowTokenActivities = llmActivities.filter((a) => a.tokenUsage && a.tokenUsage.totalTokens < minTokens);
  if (lowTokenActivities.length > 0) {
    const message = `${lowTokenActivities.length} LLM activities have fewer than ${minTokens} tokens`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        lowTokenActivities.map((a) => ({
          id: `assert_low_tokens_${Date.now()}_${a.id}`,
          severity: "medium",
          category: "LOW_TOKEN_USAGE",
          description: `LLM activity has suspiciously low token count: ${a.tokenUsage?.totalTokens}`,
          agentId: a.agentId,
          timestamp: a.timestamp,
          evidence: a,
        })),
        undefined
      );
    }
    return { passed: false, message };
  }

  // Calculate total tokens
  const totalTokens = llmActivities.reduce((sum, a) => sum + (a.tokenUsage?.totalTokens || 0), 0);

  // Check maximum tokens if specified
  if (options.maxTokens !== undefined) {
    const exceedingActivities = llmActivities.filter((a) => a.tokenUsage && a.tokenUsage.totalTokens > options.maxTokens!);
    if (exceedingActivities.length > 0) {
      const message = `${exceedingActivities.length} LLM activities exceed maximum token threshold of ${options.maxTokens}`;

      if (options.throwOnFailure !== false) {
        throw new AntiCheatAssertionError(
          message,
          exceedingActivities.map((a) => ({
            id: `assert_max_tokens_${Date.now()}_${a.id}`,
            severity: "low",
            category: "EXCESSIVE_TOKEN_USAGE",
            description: `LLM activity exceeds max tokens: ${a.tokenUsage?.totalTokens} > ${options.maxTokens}`,
            agentId: a.agentId,
            timestamp: a.timestamp,
            evidence: a,
          })),
          undefined
        );
      }
      return { passed: false, message, totalTokens };
    }
  }

  return {
    passed: true,
    message: `Validated token usage for ${llmActivities.length} LLM activity/activities (${totalTokens} total tokens)`,
    totalTokens,
  };
}

/**
 * Assert that agent coordination is valid
 *
 * Validates:
 * - Message flow shows actual agent-to-agent communication
 * - No excessive self-messaging
 * - Multiple agents participate in coordination
 * - Event log shows realistic coordination patterns
 *
 * @param eventLog - Array of event log entries
 * @param options - Assertion options
 * @throws AntiCheatAssertionError if coordination is invalid
 *
 * @example
 * ```typescript
 * expectValidAgentCoordination(eventLog);
 * expectValidAgentCoordination(eventLog, { minAgents: 3, minMessages: 10 });
 * ```
 */
export function expectValidAgentCoordination(
  eventLog: EventLogEntry[],
  options: {
    /** Minimum number of agents that should participate */
    minAgents?: number;
    /** Minimum number of messages exchanged */
    minMessages?: number;
    /** Maximum ratio of self-messages (0-1) */
    maxSelfMessageRatio?: number;
    /** Whether to throw on validation failure */
    throwOnFailure?: boolean;
  } = {}
): { passed: boolean; message: string; stats?: { agentCount: number; messageCount: number; selfMessageRatio: number } } {
  const minAgents = options.minAgents ?? 2;
  const minMessages = options.minMessages ?? 5;
  const maxSelfRatio = options.maxSelfMessageRatio ?? 0.5;

  // Filter to message events
  const messageEvents = eventLog.filter((e) => e.type === "message_sent" || e.type === "message_received" || e.type.includes("message"));

  if (messageEvents.length < minMessages) {
    const message = `Expected at least ${minMessages} message events, but found ${messageEvents.length}`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        [
          {
            id: `assert_min_msgs_${Date.now()}`,
            severity: "high",
            category: "INSUFFICIENT_MESSAGES",
            description: message,
            evidence: { expected: minMessages, actual: messageEvents.length },
          },
        ],
        undefined
      );
    }
    return { passed: false, message };
  }

  // Count unique agents
  const agents = new Set<string>();
  for (const event of messageEvents) {
    if (event.agentId) agents.add(event.agentId);
    if (event.from) agents.add(event.from);
    if (event.to && event.to !== "broadcast") agents.add(event.to);
  }

  if (agents.size < minAgents) {
    const message = `Expected at least ${minAgents} participating agents, but found ${agents.size} (${Array.from(agents).join(", ")})`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        [
          {
            id: `assert_min_agents_${Date.now()}`,
            severity: "high",
            category: "INSUFFICIENT_AGENT_PARTICIPATION",
            description: message,
            evidence: { expected: minAgents, actual: agents.size, agents: Array.from(agents) },
          },
        ],
        undefined
      );
    }
    return { passed: false, message };
  }

  // Check self-messaging ratio
  const selfMessages = messageEvents.filter((e) => e.from === e.to || (e.agentId && e.to === e.agentId));
  const selfMessageRatio = messageEvents.length > 0 ? selfMessages.length / messageEvents.length : 0;

  if (selfMessageRatio > maxSelfRatio) {
    const message = `Self-messaging ratio ${(selfMessageRatio * 100).toFixed(1)}% exceeds maximum ${(maxSelfRatio * 100).toFixed(1)}%`;

    if (options.throwOnFailure !== false) {
      throw new AntiCheatAssertionError(
        message,
        [
          {
            id: `assert_self_msgs_${Date.now()}`,
            severity: "medium",
            category: "EXCESSIVE_SELF_MESSAGING",
            description: message,
            evidence: { selfMessages: selfMessages.length, totalMessages: messageEvents.length, ratio: selfMessageRatio },
          },
        ],
        undefined
      );
    }
    return {
      passed: false,
      message,
      stats: { agentCount: agents.size, messageCount: messageEvents.length, selfMessageRatio },
    };
  }

  return {
    passed: true,
    message: `Validated coordination: ${agents.size} agents exchanged ${messageEvents.length} messages (${(selfMessageRatio * 100).toFixed(1)}% self-messages)`,
    stats: { agentCount: agents.size, messageCount: messageEvents.length, selfMessageRatio },
  };
}

/**
 * Run comprehensive anti-cheat validation on test output
 *
 * This is a convenience function that runs all anti-cheat checks
 * and returns a comprehensive report.
 *
 * @param testOutputDir - Path to test output directory
 * @param options - Validation options
 * @returns Detection report
 * @throws AntiCheatAssertionError if critical violations found
 *
 * @example
 * ```typescript
 * const report = runAntiCheatValidation('./tests/output/run-123');
 * if (!report.passed) {
 *   console.error('Cheating detected!', report.violations);
 * }
 * ```
 */
export function runAntiCheatValidation(
  testOutputDir: string,
  options: {
    /** Fail on high severity violations (default: true) */
    failOnHigh?: boolean;
    /** Fail on medium severity violations (default: false) */
    failOnMedium?: boolean;
    /** Whether to throw on validation failure */
    throwOnFailure?: boolean;
  } = {}
): DetectionReport {
  const engine = new MockDetectionEngine();
  const report = engine.analyzeTestOutput(testOutputDir);

  const failOnHigh = options.failOnHigh !== false;
  const failOnMedium = options.failOnMedium === true;

  const criticalCount = report.violations.filter((v) => v.severity === "critical").length;
  const highCount = report.violations.filter((v) => v.severity === "high").length;
  const mediumCount = report.violations.filter((v) => v.severity === "medium").length;

  const shouldFail = criticalCount > 0 || (failOnHigh && highCount > 0) || (failOnMedium && mediumCount > 0);

  if (shouldFail && options.throwOnFailure !== false) {
    const relevantViolations = report.violations.filter(
      (v) => v.severity === "critical" || (failOnHigh && v.severity === "high") || (failOnMedium && v.severity === "medium")
    );

    throw new AntiCheatAssertionError(
      `Anti-cheat validation failed: ${relevantViolations.length} violation(s) detected. ${report.summary}`,
      relevantViolations,
      report
    );
  }

  return report;
}

/**
 * Jest matcher for anti-cheat validation
 *
 * Add this to your Jest setup to use custom matchers:
 * ```typescript
 * expect.extend({
 *   toHaveRealLLMCalls: antiCheatMatchers.toHaveRealLLMCalls,
 *   toHaveNoHardcodedResponses: antiCheatMatchers.toHaveNoHardcodedResponses,
 *   toHaveTokenUsageRecorded: antiCheatMatchers.toHaveTokenUsageRecorded,
 *   toHaveValidCoordination: antiCheatMatchers.toHaveValidCoordination,
 * });
 * ```
 */
export const antiCheatMatchers = {
  /**
   * Jest matcher: expect(recorder).toHaveRealLLMCalls()
   */
  toHaveRealLLMCalls(received: AgentRecorder | ActivityRecord[], options?: Parameters<typeof expectRealLLMCalls>[1]) {
    try {
      const result = expectRealLLMCalls(received, { ...options, throwOnFailure: false });
      return {
        pass: result.passed,
        message: () => result.message,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  },

  /**
   * Jest matcher: expect(agent).toHaveNoHardcodedResponses()
   */
  toHaveNoHardcodedResponses(received: Agent | string[], options?: Parameters<typeof expectNoHardcodedResponses>[1]) {
    try {
      const result = expectNoHardcodedResponses(received, { ...options, throwOnFailure: false });
      return {
        pass: result.passed,
        message: () => result.message,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  },

  /**
   * Jest matcher: expect(agent).toHaveTokenUsageRecorded()
   */
  toHaveTokenUsageRecorded(received: Agent | AgentRecorder | ActivityRecord[], options?: Parameters<typeof expectTokenUsageRecorded>[1]) {
    try {
      const result = expectTokenUsageRecorded(received, { ...options, throwOnFailure: false });
      return {
        pass: result.passed,
        message: () => result.message,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  },

  /**
   * Jest matcher: expect(eventLog).toHaveValidCoordination()
   */
  toHaveValidCoordination(received: EventLogEntry[], options?: Parameters<typeof expectValidAgentCoordination>[1]) {
    try {
      const result = expectValidAgentCoordination(received, { ...options, throwOnFailure: false });
      return {
        pass: result.passed,
        message: () => result.message,
      };
    } catch (error) {
      return {
        pass: false,
        message: () => (error instanceof Error ? error.message : "Unknown error"),
      };
    }
  },
};

/**
 * Helper to format violations for console output
 */
export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) {
    return "No violations detected.";
  }

  const lines: string[] = [];
  lines.push(`\n${violations.length} violation(s) detected:\n`);

  const bySeverity = {
    critical: violations.filter((v) => v.severity === "critical"),
    high: violations.filter((v) => v.severity === "high"),
    medium: violations.filter((v) => v.severity === "medium"),
    low: violations.filter((v) => v.severity === "low"),
  };

  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length > 0) {
      lines.push(`  [${severity.toUpperCase()}] ${items.length} violation(s):`);
      for (const v of items.slice(0, 3)) {
        lines.push(`    - ${v.category}: ${v.description}`);
      }
      if (items.length > 3) {
        lines.push(`    ... and ${items.length - 3} more`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

export default {
  expectRealLLMCalls,
  expectNoHardcodedResponses,
  expectTokenUsageRecorded,
  expectValidAgentCoordination,
  runAntiCheatValidation,
  antiCheatMatchers,
  AntiCheatAssertionError,
  formatViolations,
};
