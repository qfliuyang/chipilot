#!/usr/bin/env node
/**
 * Unified Test Runner
 *
 * Main entry point for the unified test framework.
 * Replaces all scattered test scripts with a single, coherent testing system.
 *
 * Usage:
 *   node tests/framework/run.mjs              # Run all tests
 *   node tests/framework/run.mjs --filter=e2e # Run only E2E tests
 *   node tests/framework/run.mjs --help       # Show help
 */

// CRITICAL: Apply polyfill SYNCHRONOUSLY before ANY module imports
// xterm-headless executes code during module load that references window
if (typeof globalThis.window === "undefined") {
  globalThis.window = {};
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: (tagName) => {
      if (tagName === "canvas") {
        return {
          getContext: () => ({
            fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
            putImageData: () => {}, createImageData: () => ({ data: [] }), setTransform: () => {},
            drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
            beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
            stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
            arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }), transform: () => {},
            rect: () => {}, clip: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }), createPattern: () => ({}),
            globalCompositeOperation: "source-over"
          }), width: 0, height: 0, style: {}
        };
      }
      return {};
    },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => []
  };
}

import { createTestFramework, TestResult } from './UnifiedTestFramework.mjs';
import { runE2ETest } from './tests/e2e-tui.mjs';
import { runCoordinationTest } from './tests/agent-coordination.mjs';
import { runAntiCheatVerificationTest } from './tests/anti-cheat-verification.mjs';

// Parse command line arguments
const args = process.argv.slice(2);
const filter = args.find(arg => arg.startsWith('--filter='))?.split('=')[1];
const help = args.includes('--help') || args.includes('-h');
const noAntiCheat = args.includes('--no-anti-cheat');

if (help) {
  console.log(`
Unified Test Framework for Chipilot

Usage:
  node tests/framework/run.mjs [options]

Options:
  --filter=<pattern>   Run only tests matching the pattern
  --no-anti-cheat      Disable anti-cheat validation
  --help, -h           Show this help message

Available Tests:
  e2e-tui              End-to-end TUI test with real LLM integration
  agent-coordination   Multi-agent coordination test
  anti-cheat-verify    Anti-cheat system verification

Examples:
  node tests/framework/run.mjs                      # Run all tests
  node tests/framework/run.mjs --filter=e2e         # Run only E2E tests
  node tests/framework/run.mjs --filter=coordination # Run only coordination tests
`);
  process.exit(0);
}

// Create test framework
const framework = createTestFramework({
  antiCheat: !noAntiCheat,
});

// Register tests
framework.register('e2e-tui', async (outputDir) => {
  return runE2ETest(outputDir, {
    query: "What Innovus command shows the current floorplan?",
    initDelay: 4000,
    processingDelay: 8000,
  });
}, {
  timeout: 60000,
  requiresBuild: true,
});

framework.register('agent-coordination', async (outputDir) => {
  return runCoordinationTest(outputDir, {
    query: "Plan a complete placement optimization flow for this design",
  });
}, {
  timeout: 120000,
  requiresBuild: true,
});

framework.register('anti-cheat-verify', async (outputDir) => {
  return runAntiCheatVerificationTest(outputDir, {
    expectPassed: true,
  });
}, {
  timeout: 30000,
  requiresBuild: true,
});

// Run all tests
framework.runAll({ filter }).then(report => {
  const exitCode = report.summary.failed > 0 || report.summary.antiCheatPassed === false ? 1 : 0;

  if (exitCode === 0) {
    console.log('✓ All tests passed');
  } else {
    console.log('✗ Some tests failed');
  }

  process.exit(exitCode);
}).catch(err => {
  console.error('Test framework error:', err);
  process.exit(1);
});
