/**
 * @fileoverview Visual E2E Tests for Terminal Integration
 *
 * These tests capture visual snapshots of the terminal integration
 * to provide evidence that the UI works correctly.
 *
 * @module tests/visual/terminal-visual-e2e
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { spawnCLI } from "../tier3-integration/pty-runner";
import type { PTYSession } from "../tier3-integration/pty-runner";

// Create output directory for visual evidence
const EVIDENCE_DIR = path.join(
  process.cwd(),
  "tests/output/visual-evidence",
  `terminal-visual-${Date.now()}`
);

// Ensure evidence directory exists
function ensureEvidenceDir(): void {
  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }
}

// Capture screen snapshot
function captureSnapshot(
  session: PTYSession,
  name: string,
  metadata?: Record<string, unknown>
): void {
  ensureEvidenceDir();

  const timestamp = new Date().toISOString();
  const snapshot = {
    name,
    timestamp,
    screen: session.screen,
    output: session.output,
    metadata: metadata || {},
  };

  const filename = `${name}.json`;
  const filepath = path.join(EVIDENCE_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));

  // Also save as plain text for easy viewing
  const textFilename = `${name}.txt`;
  const textFilepath = path.join(EVIDENCE_DIR, textFilename);
  fs.writeFileSync(
    textFilepath,
    `=== ${name} ===\nTimestamp: ${timestamp}\n\nSCREEN:\n${session.screen}\n\nFULL OUTPUT:\n${session.output}`
  );

  console.log(`📸 Snapshot captured: ${filepath}`);
}

// Generate HTML visualization
function generateHTMLReport(snapshots: string[]): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Terminal Visual Test Report</title>
  <style>
    body { font-family: monospace; background: #1a1a1a; color: #f0f0f0; padding: 20px; }
    .snapshot { background: #2a2a2a; border: 1px solid #444; margin: 20px 0; padding: 15px; border-radius: 5px; }
    .snapshot h2 { margin-top: 0; color: #4af; }
    .timestamp { color: #888; font-size: 0.9em; }
    .screen { background: #000; color: #0f0; padding: 10px; overflow-x: auto; white-space: pre; margin: 10px 0; }
    pre { margin: 0; }
  </style>
</head>
<body>
  <h1>🖥️ Terminal Visual Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <p>Evidence Directory: ${EVIDENCE_DIR}</p>
  ${snapshots
    .map((snapshotFile) => {
      const data = JSON.parse(
        fs.readFileSync(path.join(EVIDENCE_DIR, snapshotFile), "utf8")
      );
      return `
    <div class="snapshot">
      <h2>${data.name}</h2>
      <div class="timestamp">${data.timestamp}</div>
      <div class="screen"><pre>${data.screen}</pre></div>
    </div>
  `;
    })
    .join("\n")}
</body>
</html>`;

  const htmlPath = path.join(EVIDENCE_DIR, "report.html");
  fs.writeFileSync(htmlPath, html);
  console.log(`📊 HTML report generated: ${htmlPath}`);
}

describe("Visual E2E: Terminal Integration", () => {
  let session: PTYSession;
  const snapshots: string[] = [];

  beforeAll(async () => {
    ensureEvidenceDir();
    console.log(`\n📁 Visual evidence will be saved to: ${EVIDENCE_DIR}\n`);
  });

  afterAll(() => {
    if (session) {
      session.kill();
    }

    // Generate HTML report
    const snapshotFiles = fs
      .readdirSync(EVIDENCE_DIR)
      .filter((f) => f.endsWith(".json"));
    if (snapshotFiles.length > 0) {
      generateHTMLReport(snapshotFiles);
    }

    console.log(`\n✅ Visual evidence saved to: ${EVIDENCE_DIR}\n`);
  });

  it("should capture initial TUI state", async () => {
    session = await spawnCLI({ cols: 100, rows: 30 });

    captureSnapshot(session, "01-initial-state", {
      description: "Initial TUI load with two-pane layout",
    });
    snapshots.push("01-initial-state.json");

    // Verify two-pane layout is visible
    expect(session.contains("Terminal")).toBe(true);
    expect(session.contains("Tab to focus")).toBe(true);
  });

  it("should capture terminal after switching focus", async () => {
    // Switch to terminal pane
    await session.send("\t", { waitFor: "Terminal", timeout: 2000 });

    captureSnapshot(session, "02-terminal-focused", {
      description: "Terminal pane is focused",
    });
    snapshots.push("02-terminal-focused.json");

    expect(session.contains("Terminal")).toBe(true);
  });

  it("should capture terminal command execution", async () => {
    // Type a command in terminal
    await session.send("pwd\r", { waitMs: 500 });

    captureSnapshot(session, "03-command-executed", {
      description: "Command executed in terminal",
      command: "pwd",
    });
    snapshots.push("03-command-executed.json");

    // Should show current directory
    expect(session.contains("/")).toBe(true);
  });

  it("should capture chat pane return", async () => {
    // Switch back to chat
    await session.send("\t", { waitMs: 500 });

    captureSnapshot(session, "04-chat-focused", {
      description: "Returned to chat pane",
    });
    snapshots.push("04-chat-focused.json");
  });

  it("should capture terminal with multiple commands", async () => {
    // Switch to terminal
    await session.send("\t", { waitMs: 500 });

    // Execute multiple commands
    await session.send("echo 'Test Output'\r", { waitMs: 500 });
    await session.send("ls -la\r", { waitMs: 500 });

    captureSnapshot(session, "05-multiple-commands", {
      description: "Multiple commands executed",
      commands: ["echo 'Test Output'", "ls -la"],
    });
    snapshots.push("05-multiple-commands.json");

    expect(session.contains("Test Output")).toBe(true);
  });

  it("should capture help menu", async () => {
    // Switch to chat and show help
    await session.send("\t", { waitMs: 500 });
    await session.send("?", { waitMs: 500 });

    captureSnapshot(session, "06-help-menu", {
      description: "Help menu displayed",
    });
    snapshots.push("06-help-menu.json");

    // Close help
    await session.send("q", { waitMs: 300 });
  });

  it("should verify all snapshots were created", () => {
    const files = fs.readdirSync(EVIDENCE_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const txtFiles = files.filter((f) => f.endsWith(".txt"));

    console.log(`\n📸 Snapshots captured: ${jsonFiles.length}`);
    console.log(`📝 Text exports: ${txtFiles.length}`);
    console.log(`📁 Evidence directory: ${EVIDENCE_DIR}\n`);

    // List all evidence files
    files.forEach((file) => {
      const stat = fs.statSync(path.join(EVIDENCE_DIR, file));
      console.log(`   - ${file} (${stat.size} bytes)`);
    });

    expect(jsonFiles.length).toBeGreaterThanOrEqual(6);
    expect(files).toContain("report.html");
  });
});
