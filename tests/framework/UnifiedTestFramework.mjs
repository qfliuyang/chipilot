/**
 * Unified Test Framework for Chipilot
 *
 * This framework consolidates all scattered test scripts into a single,
 * coherent testing system with anti-cheat validation built-in.
 *
 * Anti-Cheat Principles:
 * 1. All agent LLM calls MUST be real - no rule-based fallbacks
 * 2. Token usage MUST be recorded via AgentRecorder for every LLM call
 * 3. All inter-agent communication MUST go through MessageBus
 * 4. Tests MUST expose problems, not expect success
 * 5. No scattered test scripts - all tests managed in this unified framework
 */

import { MockDetectionEngine } from '../../dist/testing/MockDetectionEngine.js';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Test result types
 */
export const TestResult = {
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
  ERROR: 'ERROR'
};

/**
 * Violation severity levels
 */
export const Severity = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Main test framework class
 */
export class UnifiedTestFramework {
  constructor(options = {}) {
    this.testId = `test-${Date.now()}`;
    this.outputDir = options.outputDir || path.join(projectRoot, 'tests/output', this.testId);
    this.antiCheatEnabled = options.antiCheat !== false;
    this.tests = new Map();
    this.results = [];

    // Ensure output directory exists
    fs.mkdirSync(this.outputDir, { recursive: true });

    // Initialize anti-cheat engine
    if (this.antiCheatEnabled) {
      this.antiCheatEngine = new MockDetectionEngine({
        suspiciousTimingThreshold: 100,
        minResponseEntropy: 2.0,
        enablePatternAnalysis: true
      });
    }
  }

  /**
   * Register a test
   */
  register(name, testFn, options = {}) {
    this.tests.set(name, {
      name,
      fn: testFn,
      options: {
        timeout: 60000,
        requiresBuild: true,
        ...options
      }
    });
  }

  /**
   * Run all registered tests
   */
  async runAll(options = {}) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  UNIFIED TEST FRAMEWORK - Anti-Cheat Validation Enabled');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`Test ID: ${this.testId}`);
    console.log(`Output Directory: ${this.outputDir}`);
    console.log(`Anti-Cheat: ${this.antiCheatEnabled ? 'ENABLED ✓' : 'DISABLED ✗'}`);
    console.log(`Tests to Run: ${this.tests.size}\n`);

    const filter = options.filter;
    const testsToRun = filter
      ? Array.from(this.tests.values()).filter(t => t.name.includes(filter))
      : Array.from(this.tests.values());

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    for (const test of testsToRun) {
      const result = await this.runSingle(test);
      this.results.push(result);

      if (result.status === TestResult.PASS) passed++;
      else if (result.status === TestResult.FAIL) failed++;
      else if (result.status === TestResult.SKIP) skipped++;
    }

    // Run anti-cheat analysis on all output
    let antiCheatResult = null;
    if (this.antiCheatEnabled) {
      antiCheatResult = await this.runAntiCheatAnalysis();
    }

    // Generate final report
    return this.generateReport({ passed, failed, skipped, antiCheatResult });
  }

  /**
   * Run a single test
   */
  async runSingle(test) {
    console.log(`\n▶ Running: ${test.name}`);
    console.log('─'.repeat(60));

    const startTime = Date.now();
    const testOutputDir = path.join(this.outputDir, test.name.replace(/[^a-zA-Z0-9]/g, '_'));
    fs.mkdirSync(testOutputDir, { recursive: true });

    try {
      // Check if build is required
      if (test.options.requiresBuild) {
        const cliPath = path.join(projectRoot, 'dist', 'cli.js');
        if (!fs.existsSync(cliPath)) {
          throw new Error('Build required but dist/cli.js not found. Run "npm run build" first.');
        }
      }

      // Run the test with timeout
      const result = await Promise.race([
        test.fn(testOutputDir),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test timed out after ${test.options.timeout}ms`)),
          test.options.timeout)
        )
      ]);

      const duration = Date.now() - startTime;

      // Run anti-cheat check on this test's output
      let violations = [];
      if (this.antiCheatEnabled && fs.existsSync(testOutputDir)) {
        const antiCheatResult = this.antiCheatEngine.analyzeTestOutput(testOutputDir);
        violations = antiCheatResult.violations || [];
      }

      const status = violations.length > 0 ? TestResult.FAIL : TestResult.PASS;

      if (status === TestResult.PASS) {
        console.log(`  ✓ PASSED (${duration}ms)`);
      } else {
        console.log(`  ✗ FAILED - Anti-cheat violations detected (${duration}ms)`);
        violations.forEach(v => {
          console.log(`    - ${v.category} (${v.severity}): ${v.description}`);
        });
      }

      return {
        name: test.name,
        status,
        duration,
        violations,
        outputDir: testOutputDir,
        data: result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  ✗ ERROR (${duration}ms): ${error.message}`);

      return {
        name: test.name,
        status: TestResult.ERROR,
        duration,
        error: error.message,
        outputDir: testOutputDir
      };
    }
  }

  /**
   * Run anti-cheat analysis on all test output
   */
  async runAntiCheatAnalysis() {
    console.log('\n🔒 Running Anti-Cheat Analysis...');
    console.log('─'.repeat(60));

    const result = this.antiCheatEngine.analyzeTestOutput(this.outputDir);

    console.log(`\nAnti-Cheat Results:`);
    console.log(`  Overall: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`);
    console.log(`  Files Analyzed: ${result.stats.totalFilesAnalyzed}`);
    console.log(`  Activities Checked: ${result.stats.totalActivitiesChecked}`);
    console.log(`  Violations: ${result.violations.length}`);

    if (result.violations.length > 0) {
      console.log(`\n  Violations by Severity:`);
      const bySeverity = result.violations.reduce((acc, v) => {
        acc[v.severity] = (acc[v.severity] || 0) + 1;
        return acc;
      }, {});
      Object.entries(bySeverity).forEach(([sev, count]) => {
        console.log(`    ${sev}: ${count}`);
      });

      console.log(`\n  Detailed Violations:`);
      result.violations.forEach((v, i) => {
        console.log(`    ${i + 1}. [${v.severity.toUpperCase()}] ${v.category}`);
        console.log(`       ${v.description}`);
        if (v.agentId) console.log(`       Agent: ${v.agentId}`);
      });
    }

    // Write anti-cheat report
    const reportPath = path.join(this.outputDir, 'anti-cheat-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));
    console.log(`\n  Report saved: ${reportPath}`);

    return result;
  }

  /**
   * Generate final test report
   */
  generateReport(stats) {
    const report = {
      testId: this.testId,
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        passed: stats.passed,
        failed: stats.failed,
        skipped: stats.skipped,
        antiCheatPassed: stats.antiCheatResult?.passed ?? null
      },
      results: this.results,
      antiCheat: stats.antiCheatResult
    };

    // Write report to file
    const reportPath = path.join(this.outputDir, 'test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total Tests:  ${this.results.length}`);
    console.log(`Passed:       ${stats.passed} ✓`);
    console.log(`Failed:       ${stats.failed} ✗`);
    console.log(`Skipped:      ${stats.skipped} ⊘`);
    console.log(`Anti-Cheat:   ${stats.antiCheatResult?.passed ? 'PASSED ✓' : stats.antiCheatResult ? 'FAILED ✗' : 'N/A'}`);
    console.log(`\nReport: ${reportPath}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    return report;
  }

  /**
   * Spawn CLI process for testing
   */
  spawnCLI(options = {}) {
    const cliPath = path.join(projectRoot, 'dist', 'cli.js');

    if (!fs.existsSync(cliPath)) {
      throw new Error('CLI not built. Run "npm run build" first.');
    }

    const env = {
      ...process.env,
      NODE_ENV: 'test',
      CHIPILOT_TEST: 'true',
      ...options.env
    };

    return spawn('node', [cliPath], {
      cwd: projectRoot,
      env,
      stdio: options.stdio || 'pipe'
    });
  }

  /**
   * Create test output directory
   */
  createOutputDir(name) {
    const dir = path.join(this.outputDir, name);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }
}

/**
 * Create pre-configured framework instance
 */
export function createTestFramework(options = {}) {
  return new UnifiedTestFramework(options);
}

export default UnifiedTestFramework;
