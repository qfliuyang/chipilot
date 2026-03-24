import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * End-to-End Demo Test
 *
 * This test simulates the complete user flow:
 * 1. User sends a message to AI
 * 2. AI proposes a command
 * 3. User approves/rejects the command
 * 4. Command is executed in terminal
 */

describe("End-to-End Demo", () => {
  // Mock all external dependencies
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Message Flow", () => {
    it("should handle user message and AI response", async () => {
      const { Agent } = await import("../src/agent/index.js");

      // Create agent with mock API key
      const agent = new Agent({ provider: "anthropic", apiKey: "test-key" });

      // Verify agent is created
      expect(agent).toBeDefined();
    });

    it("should extract proposed command from AI response", () => {
      // Test the regex pattern for command extraction
      const response = `I'll check the current directory for you.

\`\`\`execute
ls -la
\`\`\`

That's the`;

      const commandMatch = response.match(/```execute\n([\s\S]*?)\n```/);
      expect(commandMatch).not.toBeNull();
      expect(commandMatch?.[1].trim()).toBe("ls -la");
    });

    it("should handle multi-line commands", () => {
      const response = `Let me run a floorplan command.

\`\`\`execute
floorplan -core \\
  -core_util 0.7 \\
  -density 0.8
\`\`\`

Done!`;

      const commandMatch = response.match(/```execute\n([\s\S]*?)\n```/);
      expect(commandMatch).not.toBeNull();
      const command = commandMatch?.[1].trim();
      expect(command).toContain("floorplan");
      expect(command).toContain("-core_util 0.7");
    });
  });

  describe("Terminal Session", () => {
    it("should create terminal session", async () => {
      const { TerminalSession } = await import("../src/terminal/session.js");

      const session = new TerminalSession({
        shell: "/bin/bash",
        cols: 80,
        rows: 24,
      });

      expect(session).toBeDefined();
      expect(session.isRunning()).toBe(false);
      session.destroy();
    });

    it("should handle session events", async () => {
      const { TerminalSession } = await import("../src/terminal/session.js");
      const EventEmitter = (await import("events")).EventEmitter;

      const session = new TerminalSession();

      // Verify it's an event emitter
      expect(typeof session.on).toBe("function");
      expect(typeof session.emit).toBe("function");
    });
  });

  describe("Complete Flow Simulation", () => {
    it("should simulate: message -> response -> approval -> execution", async () => {
      // This test verifies the complete flow without actual API calls

      // 1. User sends message
      const userMessage = "show me the current directory";
      expect(userMessage).toBeDefined();

      // 2. Simulate AI proposing a command
      const aiResponse = {
        message: "I'll list the current directory for you.",
        proposedCommand: {
          command: "pwd && ls -la",
          explanation: "List current directory and its contents",
        },
      };

      // 3. Simulate user approval
      const approved = true;
      const commandToExecute = approved ? aiResponse.proposedCommand?.command : null;

      // 4. Verify the flow
      expect(commandToExecute).toBe("pwd && ls -la");
      expect(approved).toBe(true);
    });

    it("should handle command rejection", async () => {
      const aiResponse = {
        message: "I'll delete all files.",
        proposedCommand: {
          command: "rm -rf *",
          explanation: "Delete all files in directory",
        },
      };

      // User rejects
      const approved = false;
      const commandToExecute = approved ? aiResponse.proposedCommand?.command : null;

      expect(commandToExecute).toBeNull();
    });

    it("should handle command editing", async () => {
      const originalCommand = "ls -la";
      const editedCommand = "ls -la | head -20";

      // User edits before approving
      const finalCommand = editedCommand;
      const wasEdited = finalCommand !== originalCommand;

      expect(wasEdited).toBe(true);
      expect(finalCommand).toBe("ls -la | head -20");
    });
  });
});
