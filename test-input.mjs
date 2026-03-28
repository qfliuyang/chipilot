#!/usr/bin/env node
/**
 * Quick E2E test to verify TUI input handling
 */

import pty from "node-pty";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.join(process.cwd(), "dist", "cli.js");

if (!fs.existsSync(cliPath)) {
  console.error("CLI not built. Run 'npm run build' first.");
  process.exit(1);
}

console.log("Spawning TUI...");

const proc = pty.spawn("node", [cliPath], {
  name: "xterm-256color",
  cols: 100,
  rows: 40,
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "test",
    CHIPILOT_TEST: "true",
  },
});

let output = "";
let screenBuffer = [];

proc.onData((data) => {
  output += data;

  // Simple screen buffer
  const lines = data.split("\n");
  for (const line of lines) {
    const cleanLine = line.replace(/\r/g, "").replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
    if (cleanLine && cleanLine.trim()) {
      screenBuffer.push(cleanLine);
    }
  }
  if (screenBuffer.length > 40) {
    screenBuffer = screenBuffer.slice(-40);
  }
});

// Wait for TUI to start, then test input
setTimeout(() => {
  console.log("\n=== Initial Screen ===");
  console.log(screenBuffer.join("\n"));
  console.log("======================\n");

  // Type "hello"
  console.log("Typing 'hello'...");
  const input = "hello";
  for (const char of input) {
    proc.write(char);
  }

  setTimeout(() => {
    console.log("\n=== Screen After Input ===");
    console.log(screenBuffer.join("\n"));
    console.log("==========================\n");

    // Check if "hello" appears
    const hasInput = output.includes("hello") || screenBuffer.some(line => line.includes("hello"));
    console.log(`Input detected in output: ${hasInput}`);

    // Save full output
    fs.writeFileSync("test-output.txt", output, "utf-8");
    console.log("Full output saved to test-output.txt");

    proc.kill();
    process.exit(hasInput ? 0 : 1);
  }, 1000);
}, 3000);
