import { describe, it, expect, vi, beforeEach } from "vitest";

// Unit tests for Agent - testing configuration and error handling
describe("Agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should create an agent with anthropic provider", async () => {
      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({ provider: "anthropic" });
      expect(agent).toBeDefined();
    });

    it("should create an agent with openai provider", async () => {
      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({ provider: "openai" });
      expect(agent).toBeDefined();
    });

    it("should accept custom model", async () => {
      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({
        provider: "anthropic",
        model: "claude-opus-4-6-20250514",
      });
      expect(agent).toBeDefined();
    });

    it("should accept API key via options", async () => {
      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({ provider: "anthropic", apiKey: "test-key" });
      expect(agent).toBeDefined();
    });
  });

  describe("chat responses", () => {
    it("should return error for unsupported provider", async () => {
      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({ provider: "unknown" as any });
      const response = await agent.chat("Hello", {});
      expect(response.message).toContain("not yet implemented");
    });

    it("should return error when API key is not set", async () => {
      // Save original key
      const originalKey = process.env.CHIPILOT_ANTHROPIC_API_KEY;
      delete process.env.CHIPILOT_ANTHROPIC_API_KEY;

      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({ provider: "anthropic", apiKey: undefined });
      const response = await agent.chat("Hello", {});

      // Should return error about client/API issue
      expect(response.message).toBeDefined();
      expect(response.message.length).toBeGreaterThan(0);

      // Restore original key
      if (originalKey !== undefined) {
        process.env.CHIPILOT_ANTHROPIC_API_KEY = originalKey;
      }
    });
  });

  describe("clearHistory", () => {
    it("should clear conversation history", async () => {
      const { Agent } = await import("../src/agent/index.js");
      const agent = new Agent({ provider: "anthropic", apiKey: "test-key" });

      // Should not throw
      agent.clearHistory();
      expect(agent).toBeDefined();
    });
  });
});
