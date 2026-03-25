#!/usr/bin/env node
/**
 * VHS Visual Regression Test Runner
 *
 * Runs VHS tape files and compares output against golden screenshots.
 * Uses pixelmatch for pixel-by-pixel comparison.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const TAPES_DIR = path.join(__dirname, '..', 'tapes');
const GOLDEN_DIR = path.join(__dirname, '..', 'golden');
const OUTPUT_DIR = path.join(__dirname, '..', 'output');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update') || args.includes('-u');
const grepPattern = args.find((arg, i) => args[i - 1] === '--grep') || null;
const maxRetries = args.includes('--retry') ? 1 : 0;
const threshold = args.find((arg, i) => args[i - 1] === '--threshold') || '0.1';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Check if VHS is installed
 */
function checkVHS() {
  try {
    execSync('which vhs', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get all tape files
 */
function getTapeFiles() {
  if (!fs.existsSync(TAPES_DIR)) {
    console.error(`${colors.red}Error: Tapes directory not found: ${TAPES_DIR}${colors.reset}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(TAPES_DIR)
    .filter((f) => f.endsWith('.tape'))
    .map((f) => ({
      name: path.basename(f, '.tape'),
      tapePath: path.join(TAPES_DIR, f),
    }));

  if (grepPattern) {
    return files.filter((f) => f.name.includes(grepPattern));
  }

  return files;
}

/**
 * Run a VHS tape file
 */
function runTape(tapeFile) {
  const outputFile = path.join(OUTPUT_DIR, `${tapeFile.name}.png`);

  // Ensure output directories exist (VHS needs them to exist before writing)
  const projectRoot = path.resolve(__dirname, '../../..');
  const projectOutputDir = path.join(projectRoot, 'output');
  if (!fs.existsSync(projectOutputDir)) {
    fs.mkdirSync(projectOutputDir, { recursive: true });
  }
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Remove old output files
  if (fs.existsSync(outputFile)) {
    fs.unlinkSync(outputFile);
  }
  const tempOutputFile = path.join(projectOutputDir, `${tapeFile.name}.png`);
  if (fs.existsSync(tempOutputFile)) {
    fs.unlinkSync(tempOutputFile);
  }

  console.log(`${colors.cyan}Running tape: ${tapeFile.name}${colors.reset}`);

  try {
    // Read tape content and replace PROJECT_ROOT placeholder
    let tapeContent = fs.readFileSync(tapeFile.tapePath, 'utf8');
    console.log(`${colors.gray}  Debug: Read ${tapeContent.length} bytes from tape file${colors.reset}`);
    tapeContent = tapeContent.replace(/\$\{PROJECT_ROOT\}/g, projectRoot);
    console.log(`${colors.gray}  Debug: Replaced PROJECT_ROOT with ${projectRoot}${colors.reset}`);
    console.log(`${colors.gray}  Debug: Type command is: ${tapeContent.match(/Type "([^"]+)"/)[1]}${colors.reset}`);

    // Run VHS with the processed tape content via stdin
    execSync('vhs -', {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 60000,
      cwd: projectRoot,
      input: tapeContent,
    });

    // Check if output was created at project root output/
    if (fs.existsSync(tempOutputFile)) {
      // Move to the correct output directory
      fs.renameSync(tempOutputFile, outputFile);
    }

    // Check if output was created
    if (!fs.existsSync(outputFile)) {
      throw new Error(`VHS did not create output file: ${outputFile}`);
    }

    return { success: true, outputFile };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Compare two images using pixelmatch
 */
function compareImages(goldenPath, outputPath, diffPath, pixelThreshold = 0.1) {
  const golden = PNG.sync.read(fs.readFileSync(goldenPath));
  const output = PNG.sync.read(fs.readFileSync(outputPath));

  if (golden.width !== output.width || golden.height !== output.height) {
    return {
      match: false,
      diffPixels: -1,
      error: `Size mismatch: golden ${golden.width}x${golden.height} vs output ${output.width}x${output.height}`,
    };
  }

  const diff = new PNG({ width: golden.width, height: golden.height });
  const diffPixels = pixelmatch(
    golden.data,
    output.data,
    diff.data,
    golden.width,
    golden.height,
    {
      threshold: parseFloat(pixelThreshold), // 0-1, lower = more strict
      includeAA: false, // Ignore anti-aliasing differences
    }
  );

  // Save diff image if there are differences
  if (diffPixels > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return { match: diffPixels === 0, diffPixels };
}

/**
 * Update golden screenshot
 */
function updateGolden(tapeFile, outputFile) {
  const goldenFile = path.join(GOLDEN_DIR, `${tapeFile.name}.png`);

  if (!fs.existsSync(GOLDEN_DIR)) {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
  }

  fs.copyFileSync(outputFile, goldenFile);
  console.log(`${colors.yellow}  Updated golden: ${tapeFile.name}${colors.reset}`);
}

/**
 * Run a single test with optional retry
 */
function runTestWithRetry(tapeFile, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.log(`${colors.yellow}  Retrying (attempt ${attempt}/${maxAttempts})...${colors.reset}`);
    }

    // Run the tape
    const result = runTape(tapeFile);

    if (!result.success) {
      if (attempt === maxAttempts) {
        console.log(`${colors.red}  ✗ Failed to run: ${result.error}${colors.reset}\n`);
        return { success: false, error: result.error };
      }
      continue;
    }

    const { outputFile } = result;
    const goldenFile = path.join(GOLDEN_DIR, `${tapeFile.name}.png`);
    const diffFile = path.join(OUTPUT_DIR, `${tapeFile.name}-diff.png`);

    // Check if golden exists
    if (!fs.existsSync(goldenFile)) {
      console.log(`${colors.yellow}  ⚠ No golden screenshot found${colors.reset}`);
      console.log(`${colors.gray}    Run with --update to create: ${tapeFile.name}${colors.reset}\n`);
      return { success: false, error: 'No golden screenshot' };
    }

    // Compare images
    const comparison = compareImages(goldenFile, outputFile, diffFile, threshold);

    if (comparison.match) {
      // Clean up diff file if it exists from previous run
      if (fs.existsSync(diffFile)) {
        fs.unlinkSync(diffFile);
      }
      return { success: true, diffPixels: 0 };
    } else if (attempt < maxAttempts) {
      // Will retry
      if (comparison.error) {
        console.log(`    ${comparison.error} - will retry...`);
      } else {
        console.log(`    ${comparison.diffPixels} pixels differ - will retry...`);
      }
    } else {
      // Final attempt failed
      console.log(`${colors.red}  ✗ FAIL - Visual differences detected${colors.reset}`);
      if (comparison.error) {
        console.log(`    ${comparison.error}`);
      } else {
        console.log(`    ${comparison.diffPixels} pixels differ`);
        console.log(`    Diff saved to: ${diffFile}`);
      }
      console.log('');
      return { success: false, diffPixels: comparison.diffPixels };
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.cyan}VHS Visual Regression Tests${colors.reset}\n`);

  if (!checkVHS()) {
    console.error(`${colors.red}Error: VHS is not installed.${colors.reset}`);
    console.error(`${colors.gray}Install with: brew install charmbracelet/tap/vhs${colors.reset}`);
    process.exit(1);
  }

  const tapeFiles = getTapeFiles();

  if (tapeFiles.length === 0) {
    console.log(`${colors.yellow}No tape files found.${colors.reset}`);
    process.exit(0);
  }

  console.log(`Found ${tapeFiles.length} tape file(s)`);
  if (maxRetries > 0) {
    console.log(`Retry enabled: up to ${maxRetries + 1} attempts per test`);
  }
  console.log(`Threshold: ${threshold}`);
  console.log('');

  if (shouldUpdate) {
    console.log(`${colors.yellow}UPDATE MODE: Will regenerate golden screenshots\n${colors.reset}`);
  }

  let passed = 0;
  let failed = 0;
  let updated = 0;

  for (const tapeFile of tapeFiles) {
    // Run the test (with retry if enabled)
    const maxAttempts = maxRetries > 0 ? maxRetries + 1 : 1;
    const result = runTestWithRetry(tapeFile, maxAttempts);

    if (result.success) {
      console.log(`${colors.green}  ✓ PASS - No visual differences${colors.reset}\n`);
      passed++;
    } else if (result.error === 'No golden screenshot') {
      failed++;
    } else if (!shouldUpdate) {
      failed++;
    }

    // Update mode: just copy to golden
    if (shouldUpdate) {
      const outputFile = path.join(OUTPUT_DIR, `${tapeFile.name}.png`);
      if (fs.existsSync(outputFile)) {
        updateGolden(tapeFile, outputFile);
        updated++;
      }
    }
  }

  // Summary
  console.log(`${colors.cyan}─────────────────────────${colors.reset}`);
  console.log(`${colors.cyan}Results:${colors.reset}`);

  if (shouldUpdate) {
    console.log(`${colors.yellow}  Updated: ${updated}${colors.reset}`);
  } else {
    console.log(`${colors.green}  Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}  Failed: ${failed}${colors.reset}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
