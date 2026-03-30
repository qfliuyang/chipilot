/**
 * E2E TUI Test Module
 *
 * Tests the end-to-end flow through the TUI with telemetry validation.
 * Previously: e2e-test-cycle.mjs, e2e-test-with-llm.mjs
 */

import pty from "node-pty";
import fs from "fs";
import path from "path";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Run E2E TUI test
 * @param {string} outputDir - Output directory for test artifacts
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test result
 */
export async function runE2ETest(outputDir, options = {}) {
  const cliPath = path.join(process.cwd(), "dist", "cli.js");
  const recordingDir = path.join(process.cwd(), "recordings");

  const log = (section, msg) => {
    const line = `[${section}] ${msg}`;
    console.log(`  ${line}`);
    return line;
  };

  // Check CLI is built
  if (!fs.existsSync(cliPath)) {
    throw new Error('CLI not built. Run "npm run build" first.');
  }

  // Clean previous recordings
  if (fs.existsSync(recordingDir)) {
    const files = fs.readdirSync(recordingDir).filter(f => f.endsWith('.ndjson'));
    for (const f of files) {
      fs.unlinkSync(path.join(recordingDir, f));
    }
    log("SETUP", `Cleaned ${files.length} previous recording files`);
  }

  log("TEST", "Spawning TUI process...");

  const proc = pty.spawn("node", [cliPath], {
    name: "xterm-256color",
    cols: 120,
    rows: 40,
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "test",
      CHIPILOT_TEST: "true",
      ...(options.apiKey && {
        CHIPILOT_ANTHROPIC_API_KEY: options.apiKey,
        CHIPILOT_ANTHROPIC_BASE_URL: options.baseURL,
        CHIPILOT_MODEL: options.model,
      }),
    },
  });

  let allOutput = "";
  let currentScreen = [];
  const timestampedEvents = [];

  const recordEvent = (type, data) => {
    timestampedEvents.push({
      timestamp: Date.now(),
      type,
      data,
    });
  };

  proc.onData((data) => {
    allOutput += data;
    recordEvent("output", data);

    const lines = data.split("\n");
    for (const line of lines) {
      const clean = line.replace(/\r/g, "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
      if (clean) currentScreen.push(clean);
    }
    if (currentScreen.length > 50) {
      currentScreen = currentScreen.slice(-50);
    }
  });

  // Wait for TUI to initialize
  log("TEST", "Waiting for TUI to initialize...");
  await sleep(options.initDelay || 4000);

  recordEvent("checkpoint", "initial");
  fs.writeFileSync(path.join(outputDir, "screen-initial.txt"), currentScreen.join("\n"));

  // Check initial state
  const hasWelcome = allOutput.includes("Welcome to chipilot") ||
                     currentScreen.some(l => l.includes("Welcome"));
  const hasInitializing = allOutput.includes("Initializing") ||
                          currentScreen.some(l => l.includes("Initializing"));

  log("VERIFY", `Welcome message: ${hasWelcome ? "✓" : "✗"}`);
  log("VERIFY", `Initializing message: ${hasInitializing ? "✓" : "✗"}`);

  // Type test query
  const query = options.query || "What Innovus command shows the current floorplan?";
  log("TEST", `Typing query: "${query}"`);
  recordEvent("input", `TYPING: ${query}`);

  for (const char of query) {
    proc.write(char);
    await sleep(30);
  }

  await sleep(500);
  fs.writeFileSync(path.join(outputDir, "screen-typed.txt"), currentScreen.join("\n"));

  // Submit
  log("TEST", "Pressing Enter to submit...");
  recordEvent("input", "ENTER");
  proc.write("\r");

  // Wait for agent processing
  const waitTime = options.processingDelay || 8000;
  log("TEST", `Waiting for agent processing (${waitTime}ms)...`);

  for (let i = 0; i < waitTime / 1000; i++) {
    await sleep(1000);
    process.stdout.write(`\r  [TEST] Progress: ${i + 1}/${waitTime / 1000}s`);
  }
  console.log();

  recordEvent("checkpoint", "response");
  fs.writeFileSync(path.join(outputDir, "screen-response.txt"), currentScreen.join("\n"));

  // Check for indicators
  const hasProcessing = allOutput.includes("Processing") ||
                        currentScreen.some(l => l.includes("Processing"));
  const hasAIResponse = allOutput.includes("AI:") ||
                        currentScreen.some(l => l.match(/AI:\s+\w+/));
  const hasThinking = allOutput.includes("Thinking") ||
                      currentScreen.some(l => l.includes("Thinking"));

  log("VERIFY", `Processing indicator: ${hasProcessing ? "✓" : "✗"}`);
  log("VERIFY", `AI response present: ${hasAIResponse ? "✓" : "✗"}`);
  log("VERIFY", `Thinking state: ${hasThinking ? "✓" : "✗"}`);

  // Capture full terminal state
  fs.writeFileSync(path.join(outputDir, "full-output.txt"), allOutput);
  fs.writeFileSync(path.join(outputDir, "events.json"), JSON.stringify(timestampedEvents, null, 2));

  // Wait for recordings to be written
  await sleep(2000);

  // Check recordings
  const newRecordingFiles = fs.existsSync(recordingDir)
    ? fs.readdirSync(recordingDir).filter(f => f.endsWith('.ndjson'))
    : [];

  log("VERIFY", `Recording files: ${newRecordingFiles.length}`);

  let llmCallsFound = 0;
  let llmResponsesFound = 0;
  let stateChangesFound = 0;
  let recordingContent = [];
  let actualLLMResponses = [];
  let tokenUsage = { input: 0, output: 0 };

  for (const file of newRecordingFiles) {
    const content = fs.readFileSync(path.join(recordingDir, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        recordingContent.push(record);
        if (record.type === 'llm_call') {
          llmCallsFound++;
          if (record.tokenUsage?.inputTokens) {
            tokenUsage.input += record.tokenUsage.inputTokens;
          }
        }
        if (record.type === 'llm_response') {
          llmResponsesFound++;
          actualLLMResponses.push({
            agentId: record.agentId,
            response: record.output?.response?.slice(0, 500),
            timestamp: record.timestamp,
            duration: record.duration,
          });
          if (record.tokenUsage?.outputTokens) {
            tokenUsage.output += record.tokenUsage.outputTokens;
          }
        }
        if (record.type === 'state_change') stateChangesFound++;
      } catch {}
    }
  }

  log("VERIFY", `LLM calls: ${llmCallsFound}`);
  log("VERIFY", `LLM responses: ${llmResponsesFound}`);
  log("VERIFY", `State changes: ${stateChangesFound}`);
  log("VERIFY", `Token usage: ${tokenUsage.input} in / ${tokenUsage.output} out`);

  // Check for real LLM responses
  const hasRealLLMResponses = actualLLMResponses.some(r =>
    r.response && !r.response.includes("not initialized") && !r.response.includes("API key")
  );

  log("VERIFY", `Real LLM responses: ${hasRealLLMResponses ? "✓ YES" : "✗ NO (using mocks)"}`);

  // Final screen capture
  fs.writeFileSync(path.join(outputDir, "screen-final.txt"), currentScreen.join("\n"));

  // Generate summary
  const summary = {
    timestamp: new Date().toISOString(),
    testQuery: query,
    indicators: {
      welcomeShown: hasWelcome,
      initializingShown: hasInitializing,
      processingShown: hasProcessing,
      aiResponseShown: hasAIResponse,
      thinkingShown: hasThinking,
    },
    telemetry: {
      llmCalls: llmCallsFound,
      llmResponses: llmResponsesFound,
      stateChanges: stateChangesFound,
      recordingFiles: newRecordingFiles.length,
      tokenUsage,
    },
    llmResponses: actualLLMResponses,
    hasRealLLMResponses,
    isMockFree: hasRealLLMResponses,
    outputDir,
  };

  fs.writeFileSync(path.join(outputDir, "test-summary.json"), JSON.stringify(summary, null, 2));

  // Cleanup
  proc.write("\x03");
  await sleep(500);
  proc.kill();

  log("RESULT", `Test ${summary.hasRealLLMResponses ? "✓ PASSED" : "✗ FAILED"}`);

  return {
    passed: summary.hasRealLLMResponses,
    summary,
    artifacts: {
      initialScreen: path.join(outputDir, "screen-initial.txt"),
      typedScreen: path.join(outputDir, "screen-typed.txt"),
      responseScreen: path.join(outputDir, "screen-response.txt"),
      finalScreen: path.join(outputDir, "screen-final.txt"),
      fullOutput: path.join(outputDir, "full-output.txt"),
      events: path.join(outputDir, "events.json"),
      summary: path.join(outputDir, "test-summary.json"),
    },
  };
}

export default runE2ETest;
