#!/usr/bin/env node
/**
 * Fresh E2E Test Cycle - Verify end-to-end flow with telemetry
 */

import pty from "node-pty";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(process.cwd(), "dist", "cli.js");
const outputDir = path.join(process.cwd(), "tests", "output", `e2e-test-${Date.now()}`);

fs.mkdirSync(outputDir, { recursive: true });

const log = (section, msg) => {
  const line = `[${section}] ${msg}`;
  console.log(line);
  return line;
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

if (!fs.existsSync(cliPath)) {
  log("SETUP", "CLI not built. Run 'npm run build' first.");
  process.exit(1);
}

const recordingDir = path.join(process.cwd(), "recordings");
const recordingFiles = fs.existsSync(recordingDir)
  ? fs.readdirSync(recordingDir).filter(f => f.endsWith('.ndjson'))
  : [];

log("SETUP", `Found ${recordingFiles.length} existing recording files`);

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
    CHIPILOT_MODEL: "claude-sonnet-4-6-20250514",
  },
});

let allOutput = "";
let currentScreen = [];

proc.onData((data) => {
  allOutput += data;
  const lines = data.split("\n");
  for (const line of lines) {
    const clean = line.replace(/\r/g, "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    if (clean) currentScreen.push(clean);
  }
  if (currentScreen.length > 50) {
    currentScreen = currentScreen.slice(-50);
  }
});

proc.onExit((code) => {
  log("EXIT", `TUI exited with code ${code.exitCode}`);
});

// Test sequence
const runTest = async () => {
  log("TEST", "Waiting for TUI to initialize...");
  await sleep(4000);

  log("CAPTURE", "Initial TUI state:");
  fs.writeFileSync(path.join(outputDir, "screen-initial.txt"), currentScreen.join("\n"));

  // Check if agents are initializing
  const hasWelcome = allOutput.includes("Welcome to chipilot") ||
                     currentScreen.some(l => l.includes("Welcome"));
  const hasInitializing = allOutput.includes("Initializing") ||
                          currentScreen.some(l => l.includes("Initializing"));

  log("VERIFY", `Welcome message present: ${hasWelcome}`);
  log("VERIFY", `Initializing message present: ${hasInitializing}`);

  log("TEST", "Typing test query: 'What Innovus command shows the current floorplan?'");
  const query = "What Innovus command shows the current floorplan?";
  for (const char of query) {
    proc.write(char);
    await sleep(50);
  }

  log("CAPTURE", "After typing input:");
  fs.writeFileSync(path.join(outputDir, "screen-typed.txt"), currentScreen.join("\n"));

  // Submit
  log("TEST", "Pressing Enter to submit...");
  proc.write("\r");

  // Wait for agent processing
  log("TEST", "Waiting for agent processing (8s)...");
  await sleep(8000);

  log("CAPTURE", "After agent response:");
  fs.writeFileSync(path.join(outputDir, "screen-response.txt"), currentScreen.join("\n"));

  // Check for agent activity indicators
  const hasProcessing = allOutput.includes("Processing") ||
                        currentScreen.some(l => l.includes("Processing"));
  const hasAIResponse = allOutput.includes("AI:") ||
                        currentScreen.some(l => l.includes("AI:"));

  log("VERIFY", `Processing indicator present: ${hasProcessing}`);
  log("VERIFY", `AI response present: ${hasAIResponse}`);

  // Capture full terminal state
  fs.writeFileSync(path.join(outputDir, "full-output.txt"), allOutput);

  // Check recordings
  await sleep(2000);
  const newRecordingFiles = fs.existsSync(recordingDir)
    ? fs.readdirSync(recordingDir).filter(f => f.endsWith('.ndjson'))
    : [];

  log("VERIFY", `Recording files: ${newRecordingFiles.length}`);

  let llmCallsFound = 0;
  let stateChangesFound = 0;
  let recordingContent = [];

  for (const file of newRecordingFiles) {
    const content = fs.readFileSync(path.join(recordingDir, file), 'utf-8');
    const lines = content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        recordingContent.push(record);
        if (record.type === 'llm_call') llmCallsFound++;
        if (record.type === 'llm_response') llmCallsFound++;
        if (record.type === 'state_change') stateChangesFound++;
      } catch {}
    }
  }

  log("VERIFY", `LLM events found: ${llmCallsFound}`);
  log("VERIFY", `State changes found: ${stateChangesFound}`);

  fs.writeFileSync(path.join(outputDir, "recording-summary.json"), JSON.stringify({
    llmEvents: llmCallsFound,
    stateChanges: stateChangesFound,
    totalRecords: recordingContent.length,
    recordings: recordingContent.slice(0, 20)
  }, null, 2));

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
    },
    telemetry: {
      llmEvents: llmCallsFound,
      stateChanges: stateChangesFound,
      recordingFiles: newRecordingFiles.length,
    },
    outputDir: outputDir,
    passed: hasAIResponse && llmCallsFound > 0
  };

  fs.writeFileSync(path.join(outputDir, "test-summary.json"), JSON.stringify(summary, null, 2));

  log("RESULT", `Test ${summary.passed ? "PASSED" : "FAILED"}`);
  log("RESULT", `LLM calls recorded: ${llmCallsFound}`);
  log("RESULT", `Output saved to: ${outputDir}`);

  // Exit
  proc.write("\x03");
  await sleep(500);
  proc.kill();

  return summary;
};

runTest().then(summary => {
  process.exit(summary.passed ? 0 : 1);
}).catch(err => {
  log("ERROR", err.message);
  proc.kill();
  process.exit(1);
});
