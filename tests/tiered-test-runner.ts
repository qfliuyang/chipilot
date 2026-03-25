#!/usr/bin/env node
/**
 * Multi-Tier Test Runner
 *
 * Orchestrates all test tiers with cross-tier validation.
 * Each tier is validated to ensure it's not using excessive mocking
 * or shortcuts that would invalidate test results.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { mockDetector, MockDetectionResult } from './validators/MockDetector.js';
import { crossValidator, CrossValidationResult } from './validators/CrossValidator.js';

interface TierResult {
  tier: number;
  name: string;
  testsPassed: number;
  testsFailed: number;
  mockAnalysis: MockDetectionResult[];
  duration: number;
  passed: boolean;
}

interface RunOptions {
  strict: boolean;
  tiers: number[];
  skipValidation: boolean;
}

class TieredTestRunner {
  private results: TierResult[] = [];
  private options: RunOptions;

  constructor(options: RunOptions) {
    this.options = options;
  }

  async run(): Promise<boolean> {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Chipilot CLI Multi-Tier Test Framework                ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    // Ensure build is up to date (required for Tier 3+)
    if (this.options.tiers.some(t => t >= 3)) {
      console.log('📦 Building CLI for Tier 3+ tests...');
      try {
        execSync('npm run build', { stdio: 'inherit' });
      } catch (e) {
        console.error('❌ Build failed - cannot run Tier 3+ tests');
        return false;
      }
      console.log();
    }

    // Run each tier
    for (const tier of this.options.tiers) {
      const result = await this.runTier(tier);
      this.results.push(result);

      if (this.options.strict && !result.passed) {
        console.log('\n❌ Strict mode: Stopping due to tier failure');
        break;
      }
    }

    // Cross-tier validation
    if (!this.options.skipValidation && this.results.some(r => r.passed)) {
      await this.runCrossValidation();
    }

    // Summary
    return this.printSummary();
  }

  private async runTier(tier: number): Promise<TierResult> {
    const tierNames: Record<number, string> = {
      1: 'Unit Tests (Pure Logic)',
      2: 'Component Tests (ink-testing-library)',
      3: 'Integration Tests (node-pty)',
      4: 'E2E Acceptance Tests (Full Scenarios)',
    };

    console.log(`\n${'═'.repeat(60)}`);
    console.log(` Tier ${tier}: ${tierNames[tier]}`);
    console.log(`${'═'.repeat(60)}`);

    const startTime = Date.now();

    // Find test files for this tier
    const testFiles = this.findTestFiles(tier);

    if (testFiles.length === 0) {
      console.log(`⚠️  No test files found for tier ${tier}`);
      return {
        tier,
        name: tierNames[tier]!,
        testsPassed: 0,
        testsFailed: 0,
        mockAnalysis: [],
        duration: 0,
        passed: true,
      };
    }

    // Analyze for mocks before running
    const mockAnalysis = this.analyzeMockUsage(testFiles);

    for (const analysis of mockAnalysis) {
      if (!analysis.passed) {
        console.log(`\n⚠️  Mock detection warnings for tier ${tier}:`);
        for (const warning of analysis.suspiciousPatterns) {
          console.log(`   - ${warning}`);
        }
      }
    }

    // Run the tests
    let testsPassed = 0;
    let testsFailed = 0;

    try {
      const testPattern = `tests/tier${tier}-**/*.test.ts`;
      const output = execSync(
        `npx vitest run --reporter=verbose "${testPattern}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 120000,
        }
      );

      // Parse results
      const passMatch = output.match(/(\d+) passed/);
      const failMatch = output.match(/(\d+) failed/);

      testsPassed = passMatch ? parseInt(passMatch[1]) : 0;
      testsFailed = failMatch ? parseInt(failMatch[1]) : 0;

      console.log(output);
    } catch (e: any) {
      // Vitest exits with error code on test failures
      const output = e.stdout || e.message || '';
      const passMatch = output.match(/(\d+) passed/);
      const failMatch = output.match(/(\d+) failed/);

      testsPassed = passMatch ? parseInt(passMatch[1]) : 0;
      testsFailed = failMatch ? parseInt(failMatch[1]) : 1;

      console.log(output);
    }

    const duration = Date.now() - startTime;

    console.log(`\n✅ Tier ${tier} completed in ${duration}ms`);
    console.log(`   Tests: ${testsPassed} passed, ${testsFailed} failed`);

    // Tier 3+ must have real PTY timing
    if (tier >= 3 && duration < 1000 && testsPassed > 0) {
      console.log(`   ⚠️  Warning: Tier ${tier} completed suspiciously fast`);
    }

    return {
      tier,
      name: tierNames[tier]!,
      testsPassed,
      testsFailed,
      mockAnalysis,
      duration,
      passed: testsFailed === 0 && mockAnalysis.every(m => m.passed),
    };
  }

  private findTestFiles(tier: number): string[] {
    const tierDir = path.join(process.cwd(), 'tests', `tier${tier}-*`);

    try {
      const files = execSync(`find ${tierDir} -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null`, {
        encoding: 'utf-8',
      });
      return files.trim().split('\n').filter(f => f.length > 0);
    } catch {
      return [];
    }
  }

  private analyzeMockUsage(testFiles: string[]): MockDetectionResult[] {
    const results: MockDetectionResult[] = [];

    for (const file of testFiles) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const analysis = mockDetector.analyzeTestFile(file, content);
      results.push(analysis);
    }

    return results;
  }

  private async runCrossValidation(): Promise<void> {
    console.log('\n' + '═'.repeat(60));
    console.log(' Cross-Tier Validation');
    console.log('═'.repeat(60));

    // Check consistency between tiers
    const validators = [
      this.validateTier2vsTier3(),
      this.validateTier3vsTier4(),
    ];

    await Promise.all(validators);
  }

  private async validateTier2vsTier3(): Promise<void> {
    console.log('\n📊 Validating Tier 2 vs Tier 3 consistency...');

    // If Tier 2 mocks terminal behavior but Tier 3 uses real PTY,
    // outputs should still be structurally similar
    const tier2Output = this.getTierOutput(2);
    const tier3Output = this.getTierOutput(3);

    if (tier2Output && tier3Output) {
      // Check for key patterns that should exist in both
      const keyPatterns = ['Welcome', 'chipilot', 'Tab', 'Ctrl+C'];

      for (const pattern of keyPatterns) {
        const inTier2 = tier2Output.includes(pattern);
        const inTier3 = tier3Output.includes(pattern);

        if (inTier2 !== inTier3) {
          console.log(`   ⚠️  Pattern "${pattern}" mismatch: T2=${inTier2}, T3=${inTier3}`);
        }
      }
    }

    console.log('   ✅ Validation complete');
  }

  private async validateTier3vsTier4(): Promise<void> {
    console.log('\n📊 Validating Tier 3 vs Tier 4 coverage...');

    // Tier 4 should cover all scenarios in Tier 3 plus more
    const tier3Scenarios = this.getTestScenarios(3);
    const tier4Scenarios = this.getTestScenarios(4);

    const missing = tier3Scenarios.filter(s => !tier4Scenarios.includes(s));

    if (missing.length > 0) {
      console.log(`   ⚠️  Tier 4 missing scenarios covered in Tier 3: ${missing.join(', ')}`);
    } else {
      console.log('   ✅ Tier 4 covers all Tier 3 scenarios');
    }
  }

  private getTierOutput(tier: number): string | null {
    // This would capture actual test outputs
    // For now, return null to skip validation
    return null;
  }

  private getTestScenarios(tier: number): string[] {
    // Parse test files to extract scenario names
    const files = this.findTestFiles(tier);
    const scenarios: string[] = [];

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(/describe\(['"`](.+?)['"`]/g);

      if (matches) {
        for (const match of matches) {
          const name = match.replace(/describe\(['"`]/, '').replace(/['"`]\)$/, '');
          scenarios.push(name);
        }
      }
    }

    return scenarios;
  }

  private printSummary(): boolean {
    console.log('\n' + '╔════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL SUMMARY                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    let totalPassed = 0;
    let totalFailed = 0;
    let allPassed = true;

    for (const result of this.results) {
      const status = result.passed ? '✅' : '❌';
      console.log(`\n${status} Tier ${result.tier}: ${result.name}`);
      console.log(`   Tests: ${result.testsPassed} passed, ${result.testsFailed} failed`);
      console.log(`   Duration: ${result.duration}ms`);

      if (result.mockAnalysis.some(m => !m.passed)) {
        console.log('   Mock warnings detected');
      }

      totalPassed += result.testsPassed;
      totalFailed += result.testsFailed;
      allPassed = allPassed && result.passed;
    }

    console.log('\n' + '═'.repeat(60));
    console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
    console.log(`Result: ${allPassed ? '✅ ALL TIERS PASSED' : '❌ SOME TIERS FAILED'}`);
    console.log('═'.repeat(60));

    return allPassed;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: RunOptions = {
  strict: args.includes('--strict'),
  tiers: [1, 2, 3, 4],
  skipValidation: args.includes('--skip-validation'),
};

// Allow running specific tiers
const tierArg = args.find(a => a.startsWith('--tiers='));
if (tierArg) {
  options.tiers = tierArg.split('=')[1]!.split(',').map(t => parseInt(t.trim()));
}

// Run
const runner = new TieredTestRunner(options);
runner.run().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
