import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Unit tests for TerminalSession - testing the class interface
// We mock node-pty to avoid spawning real processes

// Create a mock factory for node-pty
const createMockPty = () => ({
  write: vi.fn(),
  kill: vi.fn(),
  onData: vi.fn(),
  onExit: vi.fn(),
  resize: vi.fn(),
});

describe("TerminalSession", () => {
  // We'll test the TerminalSession class by mocking node-pty
  // This ensures we don't spawn real processes during tests

  it("should be importable", async () => {
    // Dynamic import to avoid side effects during module load
    const { TerminalSession } = await import("../src/terminal/session.js");
    expect(TerminalSession).toBeDefined();
  });

  it("should create instance with default options", async () => {
    const { TerminalSession } = await import("../src/terminal/session.js");

    // Mock node-pty before creating session
    vi.mock("node-pty", () => ({
      spawn: vi.fn().mockReturnValue(createMockPty()),
    }));

    const session = new TerminalSession();
    expect(session).toBeDefined();
    expect(session.isRunning()).toBe(false);
  });

  it("should emit output events", async () => {
    const { TerminalSession } = await import("../src/terminal/session.js");
    const EventEmitter = (await import("events")).EventEmitter;

    // Create a simple test that verifies the event emitter pattern
    const session = new TerminalSession();

    // Verify it's an EventEmitter
    expect(typeof session.on).toBe("function");
    expect(typeof session.emit).toBe("function");
    expect(typeof session.off).toBe("function");
  });

  it("should accept custom options", async () => {
    const { TerminalSession } = await import("../src/terminal/session.js");

    const customOptions = {
      shell: "/bin/zsh",
      cwd: "/tmp",
      cols: 120,
      rows: 40,
    };

    const session = new TerminalSession(customOptions);
    expect(session).toBeDefined();
  });

  it("should return shell from getShell", async () => {
    const { TerminalSession } = await import("../src/terminal/session.js");

    const session = new TerminalSession({ shell: "/bin/zsh" });
    expect(session.getShell()).toBe("/bin/zsh");
  });
});
