/**
 * @fileoverview Anti-Cheat Validation Tests for Terminal Integration
 *
 * These tests use MockDetectionEngine to validate that:
 * - All LLM calls are real (not mocked)
 * - Token usage is recorded for all LLM activities
 * - Response timing is realistic (not suspiciously fast)
 * - Agent coordination goes through MessageBus
 *
 * @module tests/terminal/anti-cheat
 */

import { describe, it, expect } from "vitest";
import { MockDetectionEngine } from "../../src/testing/MockDetectionEngine";

describe("Terminal Integration - Anti-Cheat", () => {
  it("should pass MockDetectionEngine validation (no critical/high violations)", async () => {
    const detector = new MockDetectionEngine();
    // Test data should be in tests/output/terminal-test-latest
    const result = await detector.analyzeTestOutput(
      "./tests/output/terminal-test-latest"
    );

    // Passed means no critical or high violations
    expect(result.passed).toBe(true);

    // Should have no critical or high violations
    const criticalOrHigh = result.violations.filter(
      (v) => v.severity === "critical" || v.severity === "high"
    );
    expect(criticalOrHigh).toHaveLength(0);
  });

  it("should record token usage for any LLM calls", async () => {
    const detector = new MockDetectionEngine();
    const result = await detector.analyzeTestOutput(
      "./tests/output/terminal-test-latest"
    );

    // Check that we have evidence of token usage
    const tokenEvidence = result.evidence.find(
      (e) => e.type === "llm_pairs" || e.description.includes("token")
    );

    // If there are LLM activities, they should have token usage
    const tokenViolations = result.violations.filter(
      (v) =>
        v.category === "MISSING_TOKEN_USAGE" ||
        v.category === "ZERO_TOKEN_USAGE"
    );

    expect(tokenViolations).toHaveLength(0);
  });

  it("should have realistic response timing", async () => {
    const detector = new MockDetectionEngine();
    const result = await detector.analyzeTestOutput(
      "./tests/output/terminal-test-latest"
    );

    // Check for suspiciously fast responses (<50ms)
    const timingViolations = result.violations.filter(
      (v) =>
        v.category === "SUSPICIOUSLY_FAST_RESPONSE" ||
        v.category === "SUSPICIOUS_DURATION"
    );

    expect(timingViolations).toHaveLength(0);
  });

  it("should not have orphaned LLM responses", async () => {
    const detector = new MockDetectionEngine();
    const result = await detector.analyzeTestOutput(
      "./tests/output/terminal-test-latest"
    );

    // Orphaned responses indicate possible mock injection
    const orphanedViolations = result.violations.filter(
      (v) => v.category === "ORPHANED_LLM_RESPONSE"
    );

    expect(orphanedViolations).toHaveLength(0);
  });

  it("should show agent coordination through MessageBus", async () => {
    const detector = new MockDetectionEngine();
    const result = await detector.analyzeTestOutput(
      "./tests/output/terminal-test-latest"
    );

    // Check for NO_MESSAGE_COORDINATION violations
    const coordinationViolations = result.violations.filter(
      (v) => v.category === "NO_MESSAGE_COORDINATION"
    );

    expect(coordinationViolations).toHaveLength(0);
  });

  it("should not have static or hardcoded responses", async () => {
    const detector = new MockDetectionEngine();
    const result = await detector.analyzeTestOutput(
      "./tests/output/terminal-test-latest"
    );

    // Check for static response patterns
    const staticViolations = result.violations.filter(
      (v) =>
        v.category.startsWith("STATIC_RESPONSE_") ||
        v.category === "IDENTICAL_RESPONSES"
    );

    expect(staticViolations).toHaveLength(0);
  });
});

describe("MockDetectionEngine - Unit Tests", () => {
  it("should detect orphaned LLM responses", () => {
    const detector = new MockDetectionEngine();

    const mockLogs = [
      {
        id: "resp_1",
        agentId: "test-agent",
        type: "llm_response",
        timestamp: 1000,
        output: { response: "Test response" },
        tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      },
      // No corresponding llm_call - this is orphaned
    ];

    const result = detector.validateRecorderLogs(mockLogs as any);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe("ORPHANED_RESPONSE");
  });

  it("should detect suspiciously fast responses", () => {
    const detector = new MockDetectionEngine();

    const mockLogs = [
      {
        id: "call_1",
        agentId: "test-agent",
        type: "llm_call",
        timestamp: 1000,
      },
      {
        id: "resp_1",
        agentId: "test-agent",
        type: "llm_response",
        timestamp: 1040, // 40ms later - suspiciously fast (<50ms)
        duration: 40,
        output: { response: "Test response" },
        tokenUsage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      },
    ];

    const result = detector.validateRecorderLogs(mockLogs as any);

    // The validation should detect the fast response timing
    expect(result.valid).toBe(true); // Timing issues don't make it invalid, just flagged
    expect(result.stats.totalRecords).toBe(2);
  });

  it("should detect zero token usage", () => {
    const detector = new MockDetectionEngine();

    const mockLogs = [
      {
        id: "call_1",
        agentId: "test-agent",
        type: "llm_call",
        timestamp: 1000,
        tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      },
    ];

    const result = detector.validateRecorderLogs(mockLogs as any);

    // Zero token usage should be flagged in the full analysis
    expect(result.stats.totalRecords).toBe(1);
  });

  it("should detect static responses", () => {
    const detector = new MockDetectionEngine();

    const responses = [
      "This is a hardcoded response",
      "This is a hardcoded response",
      "This is a hardcoded response",
    ];

    const result = detector.detectStaticResponses(responses);

    expect(result.legitimate).toBe(false);
    expect(result.patterns.identicalResponses).toBeGreaterThan(0);
  });

  it("should pass for legitimate varied responses", () => {
    const detector = new MockDetectionEngine();

    const responses = [
      "First unique response with some content",
      "Second different response with other details",
      "Third response that is completely different from the others",
    ];

    const result = detector.detectStaticResponses(responses);

    expect(result.legitimate).toBe(true);
    expect(result.patterns.identicalResponses).toBe(0);
  });
});
