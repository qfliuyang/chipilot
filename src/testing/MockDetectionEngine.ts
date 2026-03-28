/**
 * @fileoverview MockDetectionEngine - Test-time cheating detection for agent systems
 *
 * Analyzes test output directories, agent recorder logs, and responses to detect
 * signs of cheating such as:
 * - Missing LLM calls for agent responses
 * - Zero or suspicious token usage
 * - Unrealistic response timing
 * - Hardcoded/static response patterns
 * - Invalid agent coordination flows
 *
 * @module tests/utils/MockDetectionEngine
 */

import * as fs from "fs";
import * as path from "path";

/**
 * Violation severity levels
 */
export type ViolationSeverity = "critical" | "high" | "medium" | "low";

/**
 * Violation record for detected cheating
 */
export interface Violation {
  /** Unique violation ID */
  id: string;

  /** Severity level */
  severity: ViolationSeverity;

  /** Violation category */
  category: string;

  /** Human-readable description */
  description: string;

  /** Agent or component involved */
  agentId?: string;

  /** File path or location */
  location?: string;

  /** Timestamp when violation occurred */
  timestamp?: number;

  /** Raw evidence data */
  evidence: unknown;
}

/**
 * Evidence item for supporting detection claims
 */
export interface Evidence {
  /** Evidence type */
  type: string;

  /** Description of the evidence */
  description: string;

  /** File path or source */
  source: string;

  /** Raw data */
  data: unknown;

  /** Confidence level (0-1) */
  confidence: number;
}

/**
 * Detection report summarizing all findings
 */
export interface DetectionReport {
  /** Whether the test passed anti-cheat validation */
  passed: boolean;

  /** All detected violations */
  violations: Violation[];

  /** Supporting evidence */
  evidence: Evidence[];

  /** Human-readable summary */
  summary: string;

  /** Detection statistics */
  stats: {
    totalFilesAnalyzed: number;
    totalActivitiesChecked: number;
    totalResponsesAnalyzed: number;
    criticalViolations: number;
    highViolations: number;
    mediumViolations: number;
    lowViolations: number;
  };

  /** Timestamp of analysis */
  analyzedAt: number;
}

/**
 * Validation result for recorder log checks
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors found */
  errors: ValidationError[];

  /** Statistics about the validation */
  stats: {
    totalRecords: number;
    llmCalls: number;
    llmResponses: number;
    orphanedResponses: number;
    timingViolations: number;
  };
}

/**
 * Validation error details
 */
export interface ValidationError {
  /** Error type */
  type: string;

  /** Error message */
  message: string;

  /** Related record ID */
  recordId?: string;

  /** Agent involved */
  agentId?: string;

  /** Timestamp of error */
  timestamp?: number;
}

/**
 * Static analysis result for response patterns
 */
export interface StaticAnalysisResult {
  /** Whether responses appear legitimate */
  legitimate: boolean;

  /** Detected patterns */
  patterns: {
    identicalResponses: number;
    templateBasedResponses: number;
    lowEntropyResponses: number;
    suspiciouslyFastResponses: number;
  };

  /** Specific findings */
  findings: StaticFinding[];

  /** Entropy statistics */
  entropyStats: {
    averageEntropy: number;
    minEntropy: number;
    maxEntropy: number;
    suspiciouslyLowCount: number;
  };
}

/**
 * Individual static analysis finding
 */
export interface StaticFinding {
  /** Finding type */
  type: "identical" | "template" | "low_entropy" | "fast_response";

  /** Description */
  description: string;

  /** Sample of the problematic response */
  sample: string;

  /** Confidence (0-1) */
  confidence: number;
}

/**
 * Activity record from AgentRecorder
 */
export interface ActivityRecord {
  id: string;
  agentId: string;
  type: string;
  timestamp: number;
  duration?: number;
  input?: unknown;
  output?: unknown;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  correlationId?: string;
  messageId?: string;
  error?: string;
}

/**
 * MockDetectionEngine - Detects test-time cheating in agent systems
 *
 * This engine analyzes test outputs to ensure agents are actually using LLM calls
 * and not returning hardcoded or cached responses.
 */
export class MockDetectionEngine {
  /** Minimum realistic response time in milliseconds */
  private readonly MIN_REALISTIC_RESPONSE_TIME = 100;

  /** Maximum realistic response time in milliseconds (suspicious if faster) */
  private readonly SUSPICIOUSLY_FAST_THRESHOLD = 50;

  /** Minimum token usage for any LLM operation */
  private readonly MIN_TOKEN_USAGE = 1;

  /** Entropy threshold for detecting low-variance (hardcoded) outputs */
  private readonly ENTROPY_THRESHOLD = 2.0;

  /** Similarity threshold for detecting identical responses */
  private readonly SIMILARITY_THRESHOLD = 0.95;

  /** Violations collected during analysis */
  private violations: Violation[] = [];

  /** Evidence collected during analysis */
  private evidence: Evidence[] = [];

  /**
   * Analyze test output directory for signs of cheating
   *
   * @param testOutputDir - Path to test output directory
   * @returns Detection report with all findings
   */
  analyzeTestOutput(testOutputDir: string): DetectionReport {
    this.violations = [];
    this.evidence = [];

    const startTime = Date.now();
    let totalFiles = 0;
    let totalActivities = 0;
    let totalResponses = 0;

    // Check if directory exists
    if (!fs.existsSync(testOutputDir)) {
      return this.createReport(
        false,
        `Test output directory does not exist: ${testOutputDir}`,
        { totalFilesAnalyzed: 0, totalActivitiesChecked: 0, totalResponsesAnalyzed: 0, criticalViolations: 0, highViolations: 0, mediumViolations: 0, lowViolations: 0 },
        startTime
      );
    }

    // Find all JSON and NDJSON files in the directory
    const files = this.findDataFiles(testOutputDir);
    totalFiles = files.length;

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, "utf-8");
        const activities = this.parseActivities(content, file);
        totalActivities += activities.length;

        // Check 1: All agent responses have corresponding LLM call events
        this.validateLLMCallResponsePairs(activities, file);

        // Check 2: Token usage > 0 for all LLM operations
        this.validateTokenUsage(activities, file);

        // Check 3: Response timing is realistic
        this.validateResponseTiming(activities, file);

        // Check 4: Extract and analyze responses for hardcoded patterns
        const responses = this.extractResponses(activities);
        totalResponses += responses.length;
        this.analyzeResponsePatterns(responses, file);

        // Check 5: Message flow shows actual agent coordination
        this.validateAgentCoordination(activities, file);
      } catch (error) {
        this.addViolation("critical", "FILE_ANALYSIS_ERROR", `Failed to analyze file ${file}: ${error}`, undefined, file, { error: String(error) });
      }
    }

    // Count violations by severity
    const criticalCount = this.violations.filter((v) => v.severity === "critical").length;
    const highCount = this.violations.filter((v) => v.severity === "high").length;
    const mediumCount = this.violations.filter((v) => v.severity === "medium").length;
    const lowCount = this.violations.filter((v) => v.severity === "low").length;

    const passed = criticalCount === 0 && highCount === 0;

    const summary = this.generateSummary(passed, criticalCount, highCount, mediumCount, lowCount, totalFiles, totalActivities);

    return this.createReport(
      passed,
      summary,
      {
        totalFilesAnalyzed: totalFiles,
        totalActivitiesChecked: totalActivities,
        totalResponsesAnalyzed: totalResponses,
        criticalViolations: criticalCount,
        highViolations: highCount,
        mediumViolations: mediumCount,
        lowViolations: lowCount,
      },
      startTime
    );
  }

  /**
   * Validate agent recorder logs for proper LLM call/response pairing
   *
   * @param recorderLogs - Array of activity records from AgentRecorder
   * @returns Validation result with errors and statistics
   */
  validateRecorderLogs(recorderLogs: ActivityRecord[]): ValidationResult {
    const errors: ValidationError[] = [];
    const llmCalls: ActivityRecord[] = [];
    const llmResponses: ActivityRecord[] = [];
    let orphanedResponses = 0;
    let timingViolations = 0;

    // Categorize records
    for (const record of recorderLogs) {
      if (record.type === "llm_call") {
        llmCalls.push(record);
      } else if (record.type === "llm_response") {
        llmResponses.push(record);
      }
    }

    // Match responses to calls
    const matchedCalls = new Set<string>();
    const responseMap = new Map<string, ActivityRecord[]>();

    // Group responses by agent and correlation
    for (const response of llmResponses) {
      const key = `${response.agentId}:${response.correlationId || "no-correlation"}`;
      if (!responseMap.has(key)) {
        responseMap.set(key, []);
      }
      responseMap.get(key)!.push(response);
    }

    // Check each response has a preceding call
    for (const response of llmResponses) {
      const matchingCall = llmCalls.find(
        (call) =>
          call.agentId === response.agentId &&
          call.timestamp < response.timestamp &&
          (call.correlationId === response.correlationId || (!call.correlationId && !response.correlationId))
      );

      if (!matchingCall) {
        orphanedResponses++;
        errors.push({
          type: "ORPHANED_RESPONSE",
          message: `LLM response ${response.id} has no preceding call for agent ${response.agentId}`,
          recordId: response.id,
          agentId: response.agentId,
          timestamp: response.timestamp,
        });
      } else {
        matchedCalls.add(matchingCall.id);

        // Check timing: response timestamp > call timestamp
        if (response.timestamp <= matchingCall.timestamp) {
          timingViolations++;
          errors.push({
            type: "TIMING_VIOLATION",
            message: `Response timestamp ${response.timestamp} is not after call timestamp ${matchingCall.timestamp}`,
            recordId: response.id,
            agentId: response.agentId,
            timestamp: response.timestamp,
          });
        }

        // Check agent ID consistency
        if (response.agentId !== matchingCall.agentId) {
          errors.push({
            type: "AGENT_MISMATCH",
            message: `Response agent ${response.agentId} does not match call agent ${matchingCall.agentId}`,
            recordId: response.id,
            agentId: response.agentId,
            timestamp: response.timestamp,
          });
        }
      }
    }

    // Check for calls without responses (not necessarily an error, but worth noting)
    const unmatchedCalls = llmCalls.filter((call) => !matchedCalls.has(call.id));
    if (unmatchedCalls.length > 0) {
      // This is informational, not an error - calls may still be pending
      this.addEvidence("info", "Unmatched LLM calls (may be pending)", "recorder", { count: unmatchedCalls.length }, 0.5);
    }

    return {
      valid: errors.length === 0,
      errors,
      stats: {
        totalRecords: recorderLogs.length,
        llmCalls: llmCalls.length,
        llmResponses: llmResponses.length,
        orphanedResponses,
        timingViolations,
      },
    };
  }

  /**
   * Detect static or hardcoded responses
   *
   * @param responses - Array of response strings to analyze
   * @returns Static analysis result with findings
   */
  detectStaticResponses(responses: string[]): StaticAnalysisResult {
    const findings: StaticFinding[] = [];

    if (responses.length === 0) {
      return {
        legitimate: true,
        patterns: { identicalResponses: 0, templateBasedResponses: 0, lowEntropyResponses: 0, suspiciouslyFastResponses: 0 },
        findings: [],
        entropyStats: { averageEntropy: 0, minEntropy: 0, maxEntropy: 0, suspiciouslyLowCount: 0 },
      };
    }

    // Check for identical responses
    const responseCounts = new Map<string, number>();
    for (const response of responses) {
      const normalized = this.normalizeResponse(response);
      responseCounts.set(normalized, (responseCounts.get(normalized) || 0) + 1);
    }

    let identicalCount = 0;
    for (const [response, count] of Array.from(responseCounts.entries())) {
      if (count > 1) {
        identicalCount += count;
        findings.push({
          type: "identical",
          description: `Identical response detected ${count} times`,
          sample: response.substring(0, 100),
          confidence: Math.min(count / responses.length, 1),
        });
      }
    }

    // Check for template-based responses (high similarity)
    let templateCount = 0;
    for (let i = 0; i < responses.length; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateSimilarity(responses[i]!, responses[j]!);
        if (similarity > this.SIMILARITY_THRESHOLD && similarity < 1) {
          templateCount++;
          if (templateCount <= 3) {
            // Limit findings to avoid spam
            findings.push({
              type: "template",
              description: `Template-based response detected (similarity: ${(similarity * 100).toFixed(1)}%)`,
              sample: responses[i]!.substring(0, 100),
              confidence: similarity,
            });
          }
        }
      }
    }

    // Entropy analysis
    const entropies: number[] = [];
    let lowEntropyCount = 0;
    for (const response of responses) {
      const entropy = this.calculateEntropy(response);
      entropies.push(entropy);
      if (entropy < this.ENTROPY_THRESHOLD) {
        lowEntropyCount++;
        if (lowEntropyCount <= 3) {
          findings.push({
            type: "low_entropy",
            description: `Low entropy response detected (${entropy.toFixed(2)} < ${this.ENTROPY_THRESHOLD})`,
            sample: response.substring(0, 100),
            confidence: 1 - entropy / this.ENTROPY_THRESHOLD,
          });
        }
      }
    }

    const avgEntropy = entropies.length > 0 ? entropies.reduce((a, b) => a + b, 0) / entropies.length : 0;
    const minEntropy = entropies.length > 0 ? Math.min(...entropies) : 0;
    const maxEntropy = entropies.length > 0 ? Math.max(...entropies) : 0;

    return {
      legitimate: findings.length === 0,
      patterns: {
        identicalResponses: identicalCount,
        templateBasedResponses: templateCount,
        lowEntropyResponses: lowEntropyCount,
        suspiciouslyFastResponses: 0, // Set separately if timing data available
      },
      findings,
      entropyStats: {
        averageEntropy: avgEntropy,
        minEntropy,
        maxEntropy,
        suspiciouslyLowCount: lowEntropyCount,
      },
    };
  }

  /**
   * Find all data files in a directory recursively
   */
  private findDataFiles(dir: string): string[] {
    const files: string[] = [];

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findDataFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".ndjson"))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Parse activities from file content
   */
  private parseActivities(content: string, filePath: string): ActivityRecord[] {
    const activities: ActivityRecord[] = [];

    if (filePath.endsWith(".ndjson")) {
      // NDJSON format - one JSON object per line
      const lines = content.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        try {
          const record = JSON.parse(line) as ActivityRecord;
          activities.push(record);
        } catch {
          // Skip invalid lines
        }
      }
    } else {
      // Regular JSON format
      try {
        const data = JSON.parse(content) as { activities?: ActivityRecord[] } | ActivityRecord[];
        if (Array.isArray(data)) {
          activities.push(...data);
        } else if (data.activities && Array.isArray(data.activities)) {
          activities.push(...data.activities);
        }
      } catch {
        // Skip invalid files
      }
    }

    return activities;
  }

  /**
   * Validate that LLM responses have corresponding calls
   */
  private validateLLMCallResponsePairs(activities: ActivityRecord[], filePath: string): void {
    const llmCalls = activities.filter((a) => a.type === "llm_call");
    const llmResponses = activities.filter((a) => a.type === "llm_response");

    if (llmResponses.length === 0) {
      // No LLM responses at all - suspicious
      if (activities.some((a) => a.type === "message_sent" || a.type === "task_completed")) {
        this.addViolation(
          "critical",
          "MISSING_LLM_RESPONSES",
          "Agent produced outputs but no LLM responses were recorded",
          undefined,
          filePath,
          { activities: activities.map((a) => ({ type: a.type, agentId: a.agentId })) }
        );
      }
      return;
    }

    // Check each response has a call
    for (const response of llmResponses) {
      const hasMatchingCall = llmCalls.some(
        (call) =>
          call.agentId === response.agentId &&
          call.timestamp < response.timestamp &&
          (call.correlationId === response.correlationId || (!call.correlationId && !response.correlationId))
      );

      if (!hasMatchingCall) {
        this.addViolation(
          "high",
          "ORPHANED_LLM_RESPONSE",
          `LLM response for agent ${response.agentId} has no matching call`,
          response.agentId,
          filePath,
          { responseId: response.id, timestamp: response.timestamp }
        );
      }
    }

    // Add evidence of valid pairs
    const validPairs = llmResponses.filter((r) =>
      llmCalls.some(
        (c) =>
          c.agentId === r.agentId &&
          c.timestamp < r.timestamp &&
          (c.correlationId === r.correlationId || (!c.correlationId && !r.correlationId))
      )
    ).length;

    if (validPairs > 0) {
      this.addEvidence("llm_pairs", `Found ${validPairs} valid LLM call/response pairs`, filePath, { validPairs, totalCalls: llmCalls.length, totalResponses: llmResponses.length }, 0.9);
    }
  }

  /**
   * Validate token usage is present and realistic
   */
  private validateTokenUsage(activities: ActivityRecord[], filePath: string): void {
    const llmActivities = activities.filter((a) => a.type === "llm_call" || a.type === "llm_response");

    for (const activity of llmActivities) {
      if (!activity.tokenUsage) {
        this.addViolation(
          "medium",
          "MISSING_TOKEN_USAGE",
          `LLM activity ${activity.type} for agent ${activity.agentId} has no token usage data`,
          activity.agentId,
          filePath,
          { activityId: activity.id, type: activity.type }
        );
        continue;
      }

      if (activity.tokenUsage.totalTokens === 0) {
        this.addViolation(
          "high",
          "ZERO_TOKEN_USAGE",
          `LLM activity for agent ${activity.agentId} has zero token usage - likely mocked`,
          activity.agentId,
          filePath,
          { activityId: activity.id, tokenUsage: activity.tokenUsage }
        );
      }

      if (activity.tokenUsage.totalTokens < this.MIN_TOKEN_USAGE) {
        this.addViolation(
          "medium",
          "SUSPICIOUSLY_LOW_TOKENS",
          `LLM activity for agent ${activity.agentId} has suspiciously low token count: ${activity.tokenUsage.totalTokens}`,
          activity.agentId,
          filePath,
          { activityId: activity.id, tokenUsage: activity.tokenUsage }
        );
      }
    }
  }

  /**
   * Validate response timing is realistic
   */
  private validateResponseTiming(activities: ActivityRecord[], filePath: string): void {
    const llmCalls = activities.filter((a) => a.type === "llm_call");
    const llmResponses = activities.filter((a) => a.type === "llm_response");

    for (const response of llmResponses) {
      const matchingCall = llmCalls.find(
        (call) =>
          call.agentId === response.agentId &&
          call.timestamp < response.timestamp &&
          (call.correlationId === response.correlationId || (!call.correlationId && !response.correlationId))
      );

      if (matchingCall) {
        const responseTime = response.timestamp - matchingCall.timestamp;

        if (responseTime < this.SUSPICIOUSLY_FAST_THRESHOLD) {
          this.addViolation(
            "high",
            "SUSPICIOUSLY_FAST_RESPONSE",
            `LLM response completed in ${responseTime}ms - too fast for real LLM call`,
            response.agentId,
            filePath,
            { responseTime, callId: matchingCall.id, responseId: response.id }
          );
        } else if (responseTime < this.MIN_REALISTIC_RESPONSE_TIME) {
          this.addViolation(
            "medium",
            "FAST_RESPONSE",
            `LLM response completed in ${responseTime}ms - faster than typical`,
            response.agentId,
            filePath,
            { responseTime, threshold: this.MIN_REALISTIC_RESPONSE_TIME }
          );
        }

        // Check duration field if present
        if (response.duration && response.duration < this.SUSPICIOUSLY_FAST_THRESHOLD) {
          this.addViolation(
            "high",
            "SUSPICIOUS_DURATION",
            `Recorded duration ${response.duration}ms is suspiciously fast`,
            response.agentId,
            filePath,
            { duration: response.duration }
          );
        }
      }
    }
  }

  /**
   * Extract response strings from activities
   */
  private extractResponses(activities: ActivityRecord[]): string[] {
    const responses: string[] = [];

    for (const activity of activities) {
      if (activity.type === "llm_response" && activity.output) {
        const output = activity.output as { response?: string };
        if (output.response) {
          responses.push(output.response);
        }
      }

      // Also check task completions for hardcoded patterns
      if (activity.type === "task_completed" && activity.output) {
        const outputStr = JSON.stringify(activity.output);
        if (outputStr.length > 10) {
          responses.push(outputStr);
        }
      }
    }

    return responses;
  }

  /**
   * Analyze response patterns for hardcoded content
   */
  private analyzeResponsePatterns(responses: string[], filePath: string): void {
    if (responses.length === 0) return;

    const analysis = this.detectStaticResponses(responses);

    if (!analysis.legitimate) {
      for (const finding of analysis.findings) {
        this.addViolation(
          finding.type === "identical" ? "high" : "medium",
          `STATIC_RESPONSE_${finding.type.toUpperCase()}`,
          finding.description,
          undefined,
          filePath,
          { sample: finding.sample, confidence: finding.confidence, entropyStats: analysis.entropyStats }
        );
      }
    }

    // Add evidence
    this.addEvidence(
      "response_analysis",
      `Analyzed ${responses.length} responses for static patterns`,
      filePath,
      { patterns: analysis.patterns, entropyStats: analysis.entropyStats },
      analysis.legitimate ? 0.9 : 0.3
    );
  }

  /**
   * Validate agent coordination patterns
   */
  private validateAgentCoordination(activities: ActivityRecord[], filePath: string): void {
    const messages = activities.filter((a) => a.type === "message_sent" || a.type === "message_received");

    if (messages.length === 0) {
      // No messages - check if there are other coordination indicators
      const agents = new Set(activities.map((a) => a.agentId));
      if (agents.size > 1 && activities.length > 10) {
        this.addViolation(
          "medium",
          "NO_MESSAGE_COORDINATION",
          "Multiple agents active but no message coordination detected",
          undefined,
          filePath,
          { agents: Array.from(agents), activityCount: activities.length }
        );
      }
      return;
    }

    // Check for message loops (agent messaging itself excessively)
    const selfMessages = messages.filter((m) => {
      const input = m.input as { to?: string; from?: string } | undefined;
      return input?.to === m.agentId || input?.from === m.agentId;
    });

    if (selfMessages.length > messages.length * 0.5) {
      this.addViolation(
        "medium",
        "EXCESSIVE_SELF_MESSAGING",
        `${selfMessages.length}/${messages.length} messages are self-referential`,
        undefined,
        filePath,
        { selfMessages: selfMessages.length, totalMessages: messages.length }
      );
    }

    // Check for coordination flow
    const agentMessageCounts = new Map<string, number>();
    for (const msg of messages) {
      agentMessageCounts.set(msg.agentId, (agentMessageCounts.get(msg.agentId) || 0) + 1);
    }

    // All agents should participate if multiple are present
    const activeAgents = Array.from(agentMessageCounts.entries()).filter(([, count]) => count > 0);
    if (activeAgents.length === 1 && agentMessageCounts.size > 1) {
      this.addViolation(
        "low",
        "SINGLE_AGENT_DOMINANCE",
        `Only ${activeAgents[0]![0]} is messaging; other agents are silent`,
        activeAgents[0]![0],
        filePath,
        { activeAgent: activeAgents[0], allAgents: Array.from(agentMessageCounts.keys()) }
      );
    }
  }

  /**
   * Calculate Shannon entropy of a string
   */
  private calculateEntropy(str: string): number {
    if (str.length === 0) return 0;

    const charCounts = new Map<string, number>();
    for (const char of str) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    let entropy = 0;
    const len = str.length;
    for (const count of Array.from(charCounts.values())) {
      const probability = count / len;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Calculate similarity between two strings (0-1)
   */
  private calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i]![j] = matrix[i - 1]![j - 1]!;
        } else {
          matrix[i]![j] = Math.min(matrix[i - 1]![j - 1]! + 1, matrix[i]![j - 1]! + 1, matrix[i - 1]![j]! + 1);
        }
      }
    }

    return matrix[b.length]![a.length]!;
  }

  /**
   * Normalize response for comparison
   */
  private normalizeResponse(response: string): string {
    return response
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/\d+/g, "#")
      .replace(/['"`]/g, "")
      .trim();
  }

  /**
   * Add a violation to the list
   */
  private addViolation(
    severity: ViolationSeverity,
    category: string,
    description: string,
    agentId?: string,
    location?: string,
    evidence?: unknown
  ): void {
    this.violations.push({
      id: `viol_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      severity,
      category,
      description,
      agentId,
      location,
      timestamp: Date.now(),
      evidence,
    });
  }

  /**
   * Add evidence to the list
   */
  private addEvidence(type: string, description: string, source: string, data: unknown, confidence: number): void {
    this.evidence.push({
      type,
      description,
      source,
      data,
      confidence,
    });
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    passed: boolean,
    critical: number,
    high: number,
    medium: number,
    low: number,
    files: number,
    activities: number
  ): string {
    const status = passed ? "PASSED" : "FAILED";
    const parts = [`Anti-Cheat Validation ${status}`];
    parts.push(`Files analyzed: ${files}, Activities checked: ${activities}`);
    parts.push(`Violations: ${critical} critical, ${high} high, ${medium} medium, ${low} low`);

    if (!passed) {
      parts.push("Cheating detected! Agents may be using hardcoded responses instead of real LLM calls.");
    } else if (medium > 0 || low > 0) {
      parts.push("Minor issues detected but within acceptable thresholds.");
    } else {
      parts.push("No cheating indicators detected.");
    }

    return parts.join(" | ");
  }

  /**
   * Create final detection report
   */
  private createReport(
    passed: boolean,
    summary: string,
    stats: DetectionReport["stats"],
    startTime: number
  ): DetectionReport {
    return {
      passed,
      violations: this.violations,
      evidence: this.evidence,
      summary,
      stats,
      analyzedAt: startTime,
    };
  }
}

/** Singleton instance */
let globalEngine: MockDetectionEngine | null = null;

/**
 * Get or create the global MockDetectionEngine instance
 */
export function getMockDetectionEngine(): MockDetectionEngine {
  if (!globalEngine) {
    globalEngine = new MockDetectionEngine();
  }
  return globalEngine;
}

/**
 * Reset the global MockDetectionEngine instance
 */
export function resetMockDetectionEngine(): void {
  globalEngine = null;
}

export default MockDetectionEngine;
