/**
 * CrossValidator - Ensures consistent behavior across all tiers
 *
 * Runs the same scenarios at different tiers and verifies outputs match.
 * If Tier 2 (mocked) produces different output than Tier 3 (real PTY),
 * the Tier 2 test is flagged as potentially fake.
 */

export interface CrossValidationResult {
  scenario: string;
  tier1Output?: string;
  tier2Output?: string;
  tier3Output?: string;
  tier4Output?: string;
  mismatches: string[];
  passed: boolean;
}

export class CrossValidator {
  private scenarios = new Map<string, {
    input: string[];
    expectedPatterns: string[];
    forbiddenPatterns: string[];
  }>();

  /**
   * Register a validation scenario
   */
  registerScenario(
    name: string,
    input: string[],
    expectedPatterns: string[],
    forbiddenPatterns: string[] = []
  ): void {
    this.scenarios.set(name, { input, expectedPatterns, forbiddenPatterns });
  }

  /**
   * Run cross-tier validation for all registered scenarios
   */
  async validateAllScenarios(
    tierRunners: Map<number, (input: string[]) => Promise<string>>
  ): Promise<CrossValidationResult[]> {
    const results: CrossValidationResult[] = [];

    for (const [name, scenario] of this.scenarios) {
      const result = await this.runScenario(name, scenario, tierRunners);
      results.push(result);
    }

    return results;
  }

  private async runScenario(
    name: string,
    scenario: { input: string[]; expectedPatterns: string[]; forbiddenPatterns: string[] },
    tierRunners: Map<number, (input: string[]) => Promise<string>>
  ): Promise<CrossValidationResult> {
    const outputs: Map<number, string> = new Map();
    const mismatches: string[] = [];

    // Run scenario on each available tier
    for (const [tier, runner] of tierRunners) {
      try {
        const output = await runner(scenario.input);
        outputs.set(tier, output);

        // Check expected patterns
        for (const pattern of scenario.expectedPatterns) {
          const regex = new RegExp(pattern);
          if (!regex.test(output)) {
            mismatches.push(`Tier ${tier}: Missing expected pattern "${pattern}"`);
          }
        }

        // Check forbidden patterns
        for (const pattern of scenario.forbiddenPatterns) {
          const regex = new RegExp(pattern);
          if (regex.test(output)) {
            mismatches.push(`Tier ${tier}: Found forbidden pattern "${pattern}"`);
          }
        }
      } catch (error) {
        mismatches.push(`Tier ${tier}: Threw error - ${error}`);
      }
    }

    // Cross-validate outputs between tiers
    const outputValues = Array.from(outputs.values());
    if (outputValues.length >= 2) {
      const baseOutput = this.normalizeOutput(outputValues[0]!);

      for (let i = 1; i < outputValues.length; i++) {
        const tierNum = Array.from(outputs.keys())[i]!;
        const normalized = this.normalizeOutput(outputValues[i]!);

        // Check structural similarity (not exact match due to timing/ANSI differences)
        const similarity = this.calculateSimilarity(baseOutput, normalized);

        if (similarity < 0.7) {
          mismatches.push(
            `Tier ${tierNum} output differs significantly from base tier (similarity: ${(similarity * 100).toFixed(1)}%)`
          );
        }
      }
    }

    return {
      scenario: name,
      tier1Output: outputs.get(1),
      tier2Output: outputs.get(2),
      tier3Output: outputs.get(3),
      tier4Output: outputs.get(4),
      mismatches,
      passed: mismatches.length === 0,
    };
  }

  /**
   * Normalize output for comparison (strip timing-dependent ANSI)
   */
  private normalizeOutput(output: string): string {
    return output
      // Strip cursor positioning (timing-dependent)
      .replace(/\x1b\[\d+;\d+H/g, '')
      // Strip spinner sequences
      .replace(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/g, '*')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate text similarity (0-1)
   */
  private calculateSimilarity(a: string, b: string): number {
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

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
          matrix[i]![j] = Math.min(
            matrix[i - 1]![j - 1]! + 1,
            matrix[i]![j - 1]! + 1,
            matrix[i - 1]![j]! + 1
          );
        }
      }
    }

    return matrix[b.length]![a.length]!;
  }
}

export const crossValidator = new CrossValidator();

// Register chipilot-cli specific validation scenarios
crossValidator.registerScenario(
  'welcome-message',
  [],
  ['Welcome to chipilot', 'Agentic EDA', 'Tab: switch'],
  ['error', 'exception', 'failed']
);

crossValidator.registerScenario(
  'basic-input',
  ['hello'],
  ['You', 'hello'],
  ['error', 'undefined', 'null']
);

crossValidator.registerScenario(
  'pane-switch',
  ['hello', '\t'],
  ['Tab to return to chat', '[Tab to'],
  ['hello.*input', 'You.*hello'] // Should NOT show chat input in terminal pane
);
