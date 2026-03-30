/**
 * @fileoverview AntiCheatMonitor - Runtime verification service for detecting cheating
 *
 * This service monitors agent behavior to detect various forms of cheating:
 * - Hardcoded/mock responses
 * - Rule-based bypasses (responses without LLM calls)
 * - Unrealistic token usage
 * - Mock data patterns
 *
 * Integrates with AgentRecorder to verify legitimate LLM usage.
 */

import { AgentRecorder, ActivityRecord, ActivityType } from "./AgentRecorder";

/**
 * Types of cheating violations that can be detected
 */
export type ViolationType = "HARDCODED" | "RULE_BASED" | "MOCK_DATA" | "ZERO_TOKENS" | "SUSPICIOUS_SPEED";

/**
 * Record of a detected cheating violation
 */
export interface CheatingViolation {
  /** Unique violation ID */
  id: string;

  /** Agent that committed the violation */
  agentId: string;

  /** Type of violation */
  type: ViolationType;

  /** Human-readable description */
  description: string;

  /** Timestamp when detected */
  timestamp: number;

  /** Evidence supporting the violation */
  evidence: {
    /** Response that triggered the detection */
    response?: string;

    /** Input that generated the output */
    input?: string;

    /** Token usage if available */
    tokenUsage?: { input: number; output: number };

    /** Duration in milliseconds */
    duration?: number;

    /** Additional context */
    context?: Record<string, unknown>;
  };
}

/**
 * Error thrown when cheating is detected
 */
export class CheatingDetectedError extends Error {
  constructor(
    public agentId: string,
    public violationType: ViolationType,
    public evidence: string
  ) {
    super(`Cheating detected in ${agentId}: ${violationType}. ${evidence}`);
    this.name = "CheatingDetectedError";
  }
}

/**
 * Configuration options for AntiCheatMonitor
 */
export interface AntiCheatConfig {
  /** Minimum realistic token count for any LLM operation (default: 1) */
  minRealisticTokens: number;

  /** Minimum realistic response time in milliseconds (default: 100) */
  minRealisticDuration: number;

  /** Maximum number of violations to store (default: 1000) */
  maxViolations: number;

  /** Whether to throw on violation detection (default: true) */
  throwOnViolation: boolean;

  /** Patterns that indicate mock data */
  mockPatterns: RegExp[];

  /** Patterns that indicate hardcoded responses */
  hardcodedPatterns: RegExp[];
}

/**
 * AntiCheatMonitor - Runtime verification service that detects cheating
 *
 * Monitors agent outputs and behavior to ensure legitimate LLM usage.
 * Integrates with AgentRecorder to verify that responses correspond to actual LLM calls.
 */
export class AntiCheatMonitor {
  private recorder: AgentRecorder;
  private violations: CheatingViolation[] = [];
  private config: AntiCheatConfig;

  // Track recent responses to detect duplicates
  private recentResponses: Map<string, { response: string; count: number; firstSeen: number }> = new Map();

  // Track pending LLM calls per agent
  private pendingLLMCalls: Map<string, { timestamp: number; prompt: string }> = new Map();

  // Default configuration
  private static readonly DEFAULT_CONFIG: AntiCheatConfig = {
    minRealisticTokens: 1,
    minRealisticDuration: 100,
    maxViolations: 1000,
    throwOnViolation: true,
    mockPatterns: [
      /mock_/i,
      /test_/i,
      /example_/i,
      /placeholder/i,
      /dummy_/i,
      /fake_/i,
      /sample_/i,
    ],
    hardcodedPatterns: [
      /^This is a (test|mock|sample)/i,
      /^Example (output|response)/i,
      /\[HARCODED\]/i,
      /\[MOCK\]/i,
    ],
  };

  /**
   * Creates a new AntiCheatMonitor instance
   *
   * @param recorder - AgentRecorder instance to query for activity records
   * @param config - Optional configuration overrides
   */
  constructor(recorder: AgentRecorder, config: Partial<AntiCheatConfig> = {}) {
    this.recorder = recorder;
    this.config = { ...AntiCheatMonitor.DEFAULT_CONFIG, ...config };

    // Listen for LLM call events to track pending calls
    this.recorder.on("activityRecorded", (record: ActivityRecord) => {
      if (record.type === "llm_call") {
        const input = record.input as { prompt?: string } | undefined;
        this.pendingLLMCalls.set(record.agentId, {
          timestamp: record.timestamp,
          prompt: String(input?.prompt || ""),
        });
      }
    });
  }

  /**
   * Detect hardcoded responses by checking for suspicious patterns
   *
   * Checks for:
   * - Exact same response repeated multiple times
   * - Response without corresponding llm_call event
   * - Response generated too fast (<100ms)
   * - Empty token usage
   *
   * @param agentId - ID of the agent being monitored
   * @param response - The response text to check
   * @param duration - Optional duration in milliseconds
   * @returns True if hardcoded response detected
   */
  detectHardcodedResponse(agentId: string, response: string, duration?: number): boolean {
    // Check for duplicate responses
    const recentKey = `${agentId}:${response}`;
    const existing = this.recentResponses.get(recentKey);

    if (existing) {
      existing.count++;
      if (existing.count >= 2) {
        this.recordViolation({
          agentId,
          type: "HARDCODED",
          description: `Exact same response repeated ${existing.count} times`,
          evidence: {
            response: response.substring(0, 200),
            duration,
            context: { repeatCount: existing.count, firstSeen: existing.firstSeen },
          },
        });
        return true;
      }
    } else {
      this.recentResponses.set(recentKey, {
        response,
        count: 1,
        firstSeen: Date.now(),
      });
    }

    // Check for suspiciously fast response
    if (duration !== undefined && duration < this.config.minRealisticDuration) {
      this.recordViolation({
        agentId,
        type: "SUSPICIOUS_SPEED",
        description: `Response generated too fast (${duration}ms < ${this.config.minRealisticDuration}ms)`,
        evidence: {
          response: response.substring(0, 200),
          duration,
        },
      });
      return true;
    }

    // Check for hardcoded patterns
    for (const pattern of this.config.hardcodedPatterns) {
      if (pattern.test(response)) {
        this.recordViolation({
          agentId,
          type: "HARDCODED",
          description: `Response matches hardcoded pattern: ${pattern.source}`,
          evidence: {
            response: response.substring(0, 200),
            duration,
            context: { matchedPattern: pattern.source },
          },
        });
        return true;
      }
    }

    // Clean up old entries (keep last 100 per agent)
    this.cleanupRecentResponses(agentId);

    return false;
  }

  /**
   * Detect rule-based bypass by checking if output was generated without LLM call
   *
   * Verifies there's a matching llm_call event before the output.
   *
   * @param agentId - ID of the agent being monitored
   * @param input - The input that generated the output
   * @param output - The output to verify
   * @returns True if rule-based bypass detected
   */
  detectRuleBasedBypass(agentId: string, input: string, output: string): boolean {
    // Get recent activities for this agent
    const activities = this.recorder.getAgentActivities(agentId, 50);

    // Check if there's a recent llm_call before this output
    const now = Date.now();
    const hasRecentLLMCall = activities.some(
      (a) =>
        a.type === "llm_call" &&
        a.timestamp > now - 30000 && // Within last 30 seconds
        a.timestamp < now
    );

    // Check if there's a pending LLM call for this agent
    const pendingCall = this.pendingLLMCalls.get(agentId);
    const hasPendingCall = pendingCall && pendingCall.timestamp > now - 30000;

    if (!hasRecentLLMCall && !hasPendingCall) {
      this.recordViolation({
        agentId,
        type: "RULE_BASED",
        description: "Output generated without corresponding LLM call",
        evidence: {
          input: input.substring(0, 200),
          response: output.substring(0, 200),
          context: {
            recentActivities: activities.slice(-5).map((a) => ({
              type: a.type,
              timestamp: a.timestamp,
            })),
          },
        },
      });
      return true;
    }

    // Clear the pending call since we found a match
    if (hasPendingCall) {
      this.pendingLLMCalls.delete(agentId);
    }

    return false;
  }

  /**
   * Validate token usage is realistic
   *
   * Verifies token usage is >0 for any LLM operation.
   *
   * @param agentId - ID of the agent being monitored
   * @param expectedMinTokens - Minimum expected tokens (overrides config)
   * @param actualTokens - Actual token count to validate
   * @returns True if token usage is valid
   */
  validateTokenUsage(agentId: string, actualTokens: number, expectedMinTokens?: number): boolean {
    const minTokens = expectedMinTokens ?? this.config.minRealisticTokens;

    if (actualTokens < minTokens) {
      this.recordViolation({
        agentId,
        type: "ZERO_TOKENS",
        description: `Unrealistic token usage: ${actualTokens} tokens (expected >= ${minTokens})`,
        evidence: {
          tokenUsage: { input: actualTokens, output: 0 },
          context: { minExpected: minTokens },
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Detect mock data patterns in output
   *
   * Checks for placeholder patterns like "mock_", "test_", "example_"
   * and unrealistic data patterns.
   *
   * @param output - The output to check
   * @returns True if mock data detected
   */
  detectMockData(output: unknown): boolean {
    if (typeof output !== "string") {
      // For non-string outputs, stringify for pattern matching
      output = JSON.stringify(output);
    }

    const outputStr = output as string;

    for (const pattern of this.config.mockPatterns) {
      if (pattern.test(outputStr)) {
        // Find the matched text for evidence
        const match = outputStr.match(pattern);
        this.recordViolation({
          agentId: "unknown", // Will be set by caller
          type: "MOCK_DATA",
          description: `Mock data pattern detected: ${pattern.source}`,
          evidence: {
            response: outputStr.substring(0, 200),
            context: {
              matchedPattern: pattern.source,
              matchedText: match?.[0],
            },
          },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Detect mock data with agent context
   *
   * @param agentId - ID of the agent being monitored
   * @param output - The output to check
   * @returns True if mock data detected
   */
  detectMockDataForAgent(agentId: string, output: unknown): boolean {
    if (typeof output !== "string") {
      output = JSON.stringify(output);
    }

    const outputStr = output as string;

    for (const pattern of this.config.mockPatterns) {
      if (pattern.test(outputStr)) {
        const match = outputStr.match(pattern);
        this.recordViolation({
          agentId,
          type: "MOCK_DATA",
          description: `Mock data pattern detected: ${pattern.source}`,
          evidence: {
            response: outputStr.substring(0, 200),
            context: {
              matchedPattern: pattern.source,
              matchedText: match?.[0],
            },
          },
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Comprehensive validation of agent output
   *
   * Runs all detection methods and returns combined results.
   *
   * @param agentId - ID of the agent being monitored
   * @param input - The input that generated the output
   * @param output - The output to validate
   * @param options - Additional validation options
   * @returns Validation result with any detected violations
   */
  validateOutput(
    agentId: string,
    input: string,
    output: string,
    options: {
      duration?: number;
      tokenUsage?: { input: number; output: number };
      skipRuleCheck?: boolean;
    } = {}
  ): { valid: boolean; violations: CheatingViolation[] } {
    const detectedViolations: CheatingViolation[] = [];

    // Check for hardcoded responses
    if (this.detectHardcodedResponse(agentId, output, options.duration)) {
      detectedViolations.push(this.violations[this.violations.length - 1]);
    }

    // Check for rule-based bypass
    if (!options.skipRuleCheck && this.detectRuleBasedBypass(agentId, input, output)) {
      detectedViolations.push(this.violations[this.violations.length - 1]);
    }

    // Check for mock data
    if (this.detectMockDataForAgent(agentId, output)) {
      detectedViolations.push(this.violations[this.violations.length - 1]);
    }

    // Validate token usage if provided
    if (options.tokenUsage) {
      const totalTokens = options.tokenUsage.input + options.tokenUsage.output;
      if (!this.validateTokenUsage(agentId, totalTokens)) {
        detectedViolations.push(this.violations[this.violations.length - 1]);
      }
    }

    return {
      valid: detectedViolations.length === 0,
      violations: detectedViolations,
    };
  }

  /**
   * Enforce no cheating by throwing if violations are found
   *
   * @param agentId - Optional agent ID to check specific agent
   * @throws CheatingDetectedError if violations found
   */
  enforceNoCheating(agentId?: string): void {
    const violationsToCheck = agentId
      ? this.violations.filter((v) => v.agentId === agentId)
      : this.violations;

    if (violationsToCheck.length > 0) {
      const latestViolation = violationsToCheck[violationsToCheck.length - 1];
      throw new CheatingDetectedError(
        latestViolation.agentId,
        latestViolation.type,
        latestViolation.description
      );
    }
  }

  /**
   * Get all recorded violations
   *
   * @param agentId - Optional agent ID to filter by
   * @returns Array of cheating violations
   */
  getViolations(agentId?: string): CheatingViolation[] {
    if (agentId) {
      return this.violations.filter((v) => v.agentId === agentId);
    }
    return [...this.violations];
  }

  /**
   * Get violation statistics
   *
   * @returns Statistics about detected violations
   */
  getStatistics(): {
    totalViolations: number;
    byType: Record<ViolationType, number>;
    byAgent: Record<string, number>;
  } {
    const byType = {} as Record<ViolationType, number>;
    const byAgent: Record<string, number> = {};

    for (const violation of this.violations) {
      byType[violation.type] = (byType[violation.type] || 0) + 1;
      byAgent[violation.agentId] = (byAgent[violation.agentId] || 0) + 1;
    }

    return {
      totalViolations: this.violations.length,
      byType,
      byAgent,
    };
  }

  /**
   * Clear all recorded violations
   */
  clearViolations(): void {
    this.violations = [];
    this.recentResponses.clear();
    this.pendingLLMCalls.clear();
  }

  /**
   * Check if monitor has detected any violations
   *
   * @param agentId - Optional agent ID to check specific agent
   * @returns True if violations exist
   */
  hasViolations(agentId?: string): boolean {
    if (agentId) {
      return this.violations.some((v) => v.agentId === agentId);
    }
    return this.violations.length > 0;
  }

  /**
   * Record a violation internally
   */
  private recordViolation(partialViolation: Omit<CheatingViolation, "id" | "timestamp">): void {
    const violation: CheatingViolation = {
      ...partialViolation,
      id: this.generateViolationId(),
      timestamp: Date.now(),
    };

    this.violations.push(violation);

    // Trim if exceeds limit
    if (this.violations.length > this.config.maxViolations) {
      this.violations = this.violations.slice(-this.config.maxViolations);
    }

    // Emit event for monitoring
    this.recorder.emit("cheatingDetected", violation);

    // Throw if configured to do so
    if (this.config.throwOnViolation) {
      throw new CheatingDetectedError(
        violation.agentId,
        violation.type,
        violation.description
      );
    }
  }

  /**
   * Clean up old recent response entries
   */
  private cleanupRecentResponses(agentId: string): void {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    const keysToDelete: string[] = [];

    for (const [key, value] of this.recentResponses.entries()) {
      if (key.startsWith(`${agentId}:`) && value.firstSeen < cutoff) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.recentResponses.delete(key);
    }
  }

  /**
   * Generate unique violation ID
   */
  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default AntiCheatMonitor;
