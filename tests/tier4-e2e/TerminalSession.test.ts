/**
 * @fileoverview TerminalSession Integration Tests
 *
 * Tests for the TerminalSession class which manages PTY processes.
 * Some tests may be skipped if PTY is not available in the test environment.
 *
 * @module src/terminal/__tests__/TerminalSession
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TerminalSession } from "../../src/terminal/session";

describe("TerminalSession", () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = new TerminalSession({
      shell: "/bin/bash",
      cols: 80,
      rows: 24,
    });
  });

  afterEach(() => {
    session.destroy();
  });

  it("should create instance with default options", () => {
    const defaultSession = new TerminalSession();
    expect(defaultSession).toBeDefined();
    expect(defaultSession.isRunning()).toBe(false);
    defaultSession.destroy();
  });

  it("should create instance with custom options", () => {
    const customSession = new TerminalSession({
      shell: "/bin/zsh",
      cwd: "/tmp",
      cols: 120,
      rows: 40,
      env: { CUSTOM_VAR: "value" },
    });
    expect(customSession).toBeDefined();
    expect(customSession.getShell()).toBe("/bin/zsh");
    customSession.destroy();
  });

  it("should return correct shell path", () => {
    expect(session.getShell()).toBe("/bin/bash");
  });

  it("should have EventEmitter methods", () => {
    expect(typeof session.on).toBe("function");
    expect(typeof session.emit).toBe("function");
    expect(typeof session.off).toBe("function");
    expect(typeof session.once).toBe("function");
  });

  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should spawn shell and emit output",
    async () => {
      const outputs: string[] = [];
      session.on("output", (data: string) => outputs.push(data));

      session.start();
      await new Promise((r) => setTimeout(r, 500));

      expect(session.isRunning()).toBe(true);
      expect(outputs.length).toBeGreaterThan(0);
    }
  );

  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should execute command and capture output",
    async () => {
      const outputs: string[] = [];
      session.on("output", (data: string) => outputs.push(data));

      session.start();
      await new Promise((r) => setTimeout(r, 200));

      session.execute('echo "test output"');
      await new Promise((r) => setTimeout(r, 500));

      const combined = outputs.join("");
      expect(combined).toContain("test output");
    }
  );

  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should handle shell exit",
    async () => {
      const exitPromise = new Promise((resolve) => {
        session.once("exit", resolve);
      });

      session.start();
      await new Promise((r) => setTimeout(r, 200));

      session.execute("exit 42");

      const exit: any = await exitPromise;
      expect(exit.exitCode).toBe(42);
    }
  );

  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should resize terminal",
    async () => {
      session.start();
      await new Promise((r) => setTimeout(r, 200));

      // Should not throw
      session.resize(120, 40);
      session.resize(80, 24);

      expect(session.isRunning()).toBe(true);
    }
  );

  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should write raw data to terminal",
    async () => {
      const outputs: string[] = [];
      session.on("output", (data: string) => outputs.push(data));

      session.start();
      await new Promise((r) => setTimeout(r, 200));

      session.write("echo hello\r");
      await new Promise((r) => setTimeout(r, 500));

      const combined = outputs.join("");
      expect(combined.length).toBeGreaterThan(0);
    }
  );

  it("should handle destroy without start", () => {
    // Should not throw
    expect(() => session.destroy()).not.toThrow();
    expect(session.isRunning()).toBe(false);
  });

  it("should handle multiple start calls", () => {
    session.start();
    // Second start should be ignored
    session.start();
    expect(session.isRunning()).toBe(true);
  });

  it("should emit started event", async () => {
    const startedPromise = new Promise((resolve) => {
      session.once("started", resolve);
    });

    session.start();
    await startedPromise;
    expect(session.isRunning()).toBe(true);
  });
});

describe("TerminalSession - Error Handling", () => {
  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should handle invalid shell gracefully",
    async () => {
      const invalidSession = new TerminalSession({
        shell: "/nonexistent/shell",
      });

      const exitPromise = new Promise((resolve) => {
        invalidSession.once("exit", resolve);
      });

      invalidSession.start();
      const exit: any = await exitPromise;

      // Should exit with error since shell doesn't exist
      expect(exit.exitCode).not.toBe(0);
      invalidSession.destroy();
    }
  );

  it("should handle write before start", () => {
    const session = new TerminalSession();
    // Should not throw
    expect(() => session.write("test")).not.toThrow();
    expect(() => session.execute("test")).not.toThrow();
    session.destroy();
  });

  it("should handle resize before start", () => {
    const session = new TerminalSession();
    // Should not throw
    expect(() => session.resize(100, 50)).not.toThrow();
    session.destroy();
  });
});

describe("TerminalSession - Environment", () => {
  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should set custom environment variables",
    async () => {
      const envSession = new TerminalSession({
        env: { TEST_VAR: "test_value_123" },
      });

      const outputs: string[] = [];
      envSession.on("output", (data: string) => outputs.push(data));

      envSession.start();
      await new Promise((r) => setTimeout(r, 200));

      envSession.execute("echo $TEST_VAR");
      await new Promise((r) => setTimeout(r, 500));

      const combined = outputs.join("");
      expect(combined).toContain("test_value_123");
      envSession.destroy();
    }
  );

  it.skipIf(process.env.CI || process.env.SKIP_PTY_TESTS)(
    "should have TERM environment variable set",
    async () => {
      const termSession = new TerminalSession({
        shell: "/bin/bash",
      });

      const outputs: string[] = [];
      termSession.on("output", (data: string) => outputs.push(data));

      termSession.start();
      await new Promise((r) => setTimeout(r, 200));

      termSession.execute("echo $TERM");
      await new Promise((r) => setTimeout(r, 500));

      const combined = outputs.join("");
      expect(combined).toContain("xterm-256color");
      termSession.destroy();
    }
  );
});
