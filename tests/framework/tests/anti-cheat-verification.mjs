/**
 * Anti-Cheat Verification Test Module
 *
 * Verifies that the anti-cheat detection system correctly identifies
 * mock data, hardcoded responses, and cheating patterns.
 * Previously: verify-anti-cheat.mjs
 */

import { MockDetectionEngine } from '../../../dist/testing/MockDetectionEngine.js';
import fs from 'fs';
import path from 'path';

/**
 * Run anti-cheat verification test
 * @param {string} outputDir - Output directory for test artifacts
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test result
 */
export async function runAntiCheatVerificationTest(outputDir, options = {}) {
  const log = (section, msg) => {
    console.log(`  [${section}] ${msg}`);
  };

  log("SETUP", "Starting anti-cheat verification test...");

  const testId = `anti-cheat-verify-${Date.now()}`;
  const outputFile = path.join(outputDir, `${testId}.ndjson`);

  const now = Date.now();

  // Create mock NDJSON data that simulates LLM calls and responses
  const activities = [
    // LLM call and response with SAME timestamp (edge case that was fixed)
    {
      id: `rec_${now}_call1`,
      agentId: 'orchestrator',
      type: 'llm_call',
      timestamp: now,
      duration: 5000,
      tokenUsage: { inputTokens: 100, outputTokens: 500, totalTokens: 600 },
      data: {
        model: 'claude-3-5-sonnet',
        promptLength: 100,
        correlationId: 'test-123'
      }
    },
    {
      id: `rec_${now}_resp1`,
      agentId: 'orchestrator',
      type: 'llm_response',
      timestamp: now, // SAME timestamp as call
      duration: 5000, // 5 seconds - realistic LLM response time
      tokenUsage: { inputTokens: 100, outputTokens: 500, totalTokens: 600 },
      data: {
        model: 'claude-3-5-sonnet',
        contentLength: 500,
        correlationId: 'test-123'
      }
    },
    // Another LLM call/response pair with small time gap
    {
      id: `rec_${now + 10}_call2`,
      agentId: 'planner',
      type: 'llm_call',
      timestamp: now + 10,
      duration: 8000,
      tokenUsage: { inputTokens: 200, outputTokens: 800, totalTokens: 1000 },
      data: {
        model: 'claude-3-5-sonnet',
        promptLength: 200,
        correlationId: 'test-456'
      }
    },
    {
      id: `rec_${now + 10}_resp2`,
      agentId: 'planner',
      type: 'llm_response',
      timestamp: now + 10,
      duration: 8000, // 8 seconds - realistic
      tokenUsage: { inputTokens: 200, outputTokens: 800, totalTokens: 1000 },
      data: {
        model: 'claude-3-5-sonnet',
        contentLength: 800,
        correlationId: 'test-456'
      }
    },
    // Some state change activities
    {
      id: `rec_${now}_state1`,
      agentId: 'orchestrator',
      type: 'state_change',
      timestamp: now,
      data: { state: 'idle' }
    },
    {
      id: `rec_${now}_state2`,
      agentId: 'planner',
      type: 'state_change',
      timestamp: now + 5,
      data: { state: 'planning' }
    }
  ];

  // Write activities to NDJSON file
  const ndjsonContent = activities.map(a => JSON.stringify(a)).join('\n');
  fs.writeFileSync(outputFile, ndjsonContent);

  log("SETUP", `Created ${activities.length} test activities`);

  // Run anti-cheat detection
  const engine = new MockDetectionEngine({
    suspiciousTimingThreshold: 50, // 50ms threshold
    minResponseEntropy: 2.0,
    enablePatternAnalysis: true
  });

  const result = engine.analyzeTestOutput(outputDir);

  log("RESULT", `Anti-Cheat: ${result.passed ? "✓ PASSED" : "✗ FAILED"}`);
  log("RESULT", `Violations: ${result.violations.length}`);
  log("RESULT", `Summary: ${result.summary}`);

  if (result.violations.length > 0) {
    result.violations.forEach((v, i) => {
      log("VIOLATION", `${i + 1}. ${v.category} (${v.severity}): ${v.description}`);
    });
  }

  // Save report
  const reportPath = path.join(outputDir, 'anti-cheat-verify-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

  log("RESULT", `Report saved: ${reportPath}`);

  // Verify expectations
  const expectedPassed = options.expectPassed !== false;
  const actuallyPassed = result.passed;

  if (expectedPassed !== actuallyPassed) {
    log("ERROR", `Expected anti-cheat to ${expectedPassed ? "pass" : "fail"}, but it ${actuallyPassed ? "passed" : "failed"}`);
  }

  return {
    passed: actuallyPassed === expectedPassed,
    antiCheatPassed: actuallyPassed,
    violations: result.violations.length,
    summary: result.summary,
    artifacts: {
      report: reportPath,
      data: outputFile,
    },
  };
}

export default runAntiCheatVerificationTest;
