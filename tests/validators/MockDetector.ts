/**
 * MockDetector - Validates that tests aren't over-mocked
 *
 * Scans test files and runtime behavior to detect:
 * - Excessive use of jest.mock/vi.mock
 * - Mocked PTY that doesn't match real PTY behavior
 * - Fake timers/async that hide real timing issues
 */

export interface MockDetectionResult {
  tier: number;
  mockCount: number;
  realImplementationCount: number;
  mockPercentage: number;
  suspiciousPatterns: string[];
  passed: boolean;
}

export class MockDetector {
  private suspiciousPatterns = [
    /vi\.mock\s*\(/g,
    /jest\.mock\s*\(/g,
    /mockImplementation\s*\(/g,
    /mockReturnValue\s*\(/g,
    /useFakeTimers\s*\(/g,
    /MOCK_PTY/g,
    /FAKE_TERMINAL/g,
    /skip.*real.*pty/gi,
    /mock.*ansi/gi,
  ];

  private requiredRealPatterns = [
    /node-pty/g,
    /pty\.spawn/g,
    /spawn.*node.*cli/g,
    /onData.*=>/g,
    /write\s*\(.*\r/g,  // Carriage return = real terminal input
  ];

  /**
   * Analyzes a test file for mock vs real implementation usage
   */
  analyzeTestFile(filePath: string, content: string): MockDetectionResult {
    const mockMatches: string[] = [];
    const realMatches: string[] = [];

    // Count suspicious mock patterns
    for (const pattern of this.suspiciousPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        mockMatches.push(...matches);
      }
    }

    // Count real implementation patterns
    for (const pattern of this.requiredRealPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        realMatches.push(...matches);
      }
    }

    const mockCount = mockMatches.length;
    const realCount = realMatches.length;
    const total = mockCount + realCount;
    const mockPercentage = total > 0 ? (mockCount / total) * 100 : 0;

    // Determine tier based on file path
    const tier = this.detectTier(filePath);

    // Suspicious patterns found
    const suspiciousPatterns: string[] = [];

    // Check for anti-patterns
    if (content.includes('FAKE_PTY') || content.includes('MOCK_TERMINAL')) {
      suspiciousPatterns.push('Explicit fake PTY detected');
    }

    if (content.includes('setTimeout(fn, 0)') && content.includes('await')) {
      suspiciousPatterns.push('Suspicious instant async - may be hiding real timing');
    }

    if (tier >= 3 && mockPercentage > 50) {
      suspiciousPatterns.push(`Tier ${tier} has ${mockPercentage.toFixed(1)}% mocks (max 50%)`);
    }

    // ANSI stripping detection (critical for TUI apps)
    if (content.includes('stripAnsi') || content.includes('replace(/\\x1b')) {
      suspiciousPatterns.push('ANSI stripping detected - tests may not validate real output');
    }

    return {
      tier,
      mockCount,
      realImplementationCount: realCount,
      mockPercentage,
      suspiciousPatterns,
      passed: suspiciousPatterns.length === 0,
    };
  }

  /**
   * Runtime validation - checks if PTY is actually being used
   */
  async validateRuntimeBehavior(
    tier: number,
    testFn: () => Promise<{ output: string; timing: number }>
  ): Promise<{ passed: boolean; reason?: string }> {
    const result = await testFn();

    // Tier 3+ must have real timing (not instant)
    if (tier >= 3 && result.timing < 50) {
      return {
        passed: false,
        reason: `Tier ${tier} test completed in ${result.timing}ms - too fast for real PTY (likely mocked)`,
      };
    }

    // Tier 3+ output must contain ANSI sequences
    if (tier >= 3) {
      const hasAnsi = /\x1b\[|\x1b\]/.test(result.output);
      if (!hasAnsi) {
        return {
          passed: false,
          reason: 'Output contains no ANSI sequences - likely mocked terminal',
        };
      }
    }

    return { passed: true };
  }

  private detectTier(filePath: string): number {
    if (filePath.includes('tier1')) return 1;
    if (filePath.includes('tier2')) return 2;
    if (filePath.includes('tier3')) return 3;
    if (filePath.includes('tier4') || filePath.includes('e2e')) return 4;
    return 0;
  }
}

export const mockDetector = new MockDetector();
