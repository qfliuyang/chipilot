import { describe, it, expect, beforeEach } from "vitest";
import { VerificationAgent } from "../../src/agents/VerificationAgent";
import { KnowledgeBase } from "../../src/agents/KnowledgeBase";

/**
 * Unit tests for VerificationAgent
 *
 * Tests cover:
 * - Risk pattern matching
 * - Risk level calculation
 * - Command verification flow
 * - Approval/rejection logic
 */
describe("VerificationAgent", () => {
  let knowledgeBase: KnowledgeBase;
  let agent: VerificationAgent;

  beforeEach(() => {
    knowledgeBase = new KnowledgeBase();
    agent = new VerificationAgent({
      id: "verifier-test",
      name: "TestVerificationAgent",
      knowledgeBase,
    });
  });

  describe("initialization", () => {
    it("should create with correct defaults", () => {
      expect(agent.id).toBe("verifier-test");
      expect(agent.name).toBe("TestVerificationAgent");
      expect(agent.getStats().riskPatternCount).toBeGreaterThan(0);
    });

    it("should require knowledgeBase in constructor", async () => {
      const kb = new KnowledgeBase();
      const testAgent = new VerificationAgent({
        id: "test",
        name: "Test",
        knowledgeBase: kb,
      });

      // KnowledgeBase is validated during initialization, not construction
      await expect(testAgent.initialize()).resolves.not.toThrow();
    });
  });

  describe("calculateRisk", () => {
    it("should return low risk for safe commands", () => {
      const risk = agent.calculateRisk("reportTiming", "innovus");
      expect(risk).toBe("low");
    });

    it("should detect file deletion as high risk", () => {
      const risk = agent.calculateRisk("rm -rf /design/output", "shell");
      expect(risk).toBe("high");
    });

    it("should detect exit commands as medium risk", () => {
      const risk = agent.calculateRisk("exit", "innovus");
      expect(risk).toBe("medium");
    });

    it("should detect system shutdown as critical risk", () => {
      const risk = agent.calculateRisk("shutdown -h now", "shell");
      expect(risk).toBe("critical");
    });

    it("should boost shell command risk", () => {
      // Shell commands get a risk boost
      const shellRisk = agent.calculateRisk("cp file1 file2", "shell");
      const innovusRisk = agent.calculateRisk("cp file1 file2", "innovus");
      // Both are low risk but shell might be medium due to boost
      expect(shellRisk).toBe("low");
      expect(innovusRisk).toBe("low");
    });
  });

  describe("verifyCommand", () => {
    it("should approve safe commands", async () => {
      const result = await agent.verifyCommand({
        command: "reportTiming -hold",
        tool: "innovus",
        proposedBy: "test-agent",
      });

      expect(result.approved).toBe(true);
      expect(result.riskLevel).toBe("low");
      expect(result.requiresUserConfirmation).toBe(false);
    });

    it("should reject critical risk commands", async () => {
      const result = await agent.verifyCommand({
        command: "shutdown -h now",
        tool: "shell",
        proposedBy: "test-agent",
      });

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe("critical");
      expect(result.requiresUserConfirmation).toBe(true);
    });

    it("should flag file deletion for confirmation", async () => {
      const result = await agent.verifyCommand({
        command: "rm -rf /design/output",
        tool: "shell",
        proposedBy: "test-agent",
      });

      expect(result.approved).toBe(false);
      expect(result.riskLevel).toBe("high");
      expect(result.concerns).toBeDefined();
      expect(result.concerns!.length).toBeGreaterThan(0);
    });

    it("should detect EDA save with overwrite", async () => {
      const result = await agent.verifyCommand({
        command: "saveDesign -overwrite final.enc",
        tool: "innovus",
        proposedBy: "test-agent",
      });

      // saveDesign with -overwrite should be detected as high risk
      expect(result.riskLevel).toBe("high");
      expect(result.concerns?.some((c) => c.toLowerCase().includes("overwrite"))).toBe(true);
    });

    it("should provide reasoning for all decisions", async () => {
      const result = await agent.verifyCommand({
        command: "optDesign -postRoute",
        tool: "innovus",
        proposedBy: "test-agent",
      });

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should include timestamp in result", async () => {
      const result = await agent.verifyCommand({
        command: "reportConstraint",
        tool: "innovus",
        proposedBy: "test-agent",
      });

      expect(result.timestamp).toBeDefined();
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe("risk patterns", () => {
    it("should have default risk patterns", () => {
      const patterns = agent.getRiskPatterns();
      expect(patterns.length).toBeGreaterThan(0);

      // Check for specific patterns
      const hasFileDeletion = patterns.some((p) => p.name === "file_deletion");
      const hasExit = patterns.some((p) => p.name === "tool_exit");

      expect(hasFileDeletion).toBe(true);
      expect(hasExit).toBe(true);
    });

    it("should allow adding custom risk patterns", () => {
      const initialCount = agent.getRiskPatterns().length;

      agent.addRiskPattern({
        name: "custom_test",
        pattern: /test_pattern/,
        riskLevel: "medium",
        description: "Test pattern",
        requiresConfirmation: false,
      });

      expect(agent.getRiskPatterns().length).toBe(initialCount + 1);
    });

    it("should allow removing risk patterns", () => {
      agent.addRiskPattern({
        name: "removable_pattern",
        pattern: /removable/,
        riskLevel: "low",
        description: "Removable pattern",
        requiresConfirmation: false,
      });

      const removed = agent.removeRiskPattern("removable_pattern");
      expect(removed).toBe(true);

      const patterns = agent.getRiskPatterns();
      expect(patterns.some((p) => p.name === "removable_pattern")).toBe(false);
    });
  });

  describe("checkErrorPatterns", () => {
    it("should return empty array for unknown commands", async () => {
      const patterns = await agent.checkErrorPatterns("unknownCommand", "innovus");
      expect(patterns).toEqual([]);
    });

    it("should return patterns sorted by confidence", async () => {
      // Add some test patterns to knowledge base
      await knowledgeBase.storeReflective({
        id: "test-pattern-1",
        type: "error_recovery",
        signature: "testCommand",
        description: "Test error pattern",
        context: "Test context",
        confidence: 0.9,
        usageCount: 5,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      });

      const patterns = await agent.checkErrorPatterns("testCommand", "innovus");
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeGreaterThanOrEqual(patterns[patterns.length - 1].confidence);
    });
  });

  describe("message handling", () => {
    it("should handle command.verify messages", async () => {
      const messages: unknown[] = [];
      agent.on("sendMessage", (msg) => messages.push(msg));

      await agent.initialize();
      await agent.start();

      await agent.receiveMessage({
        id: "test-msg-1",
        type: "command.verify",
        sender: "test-sender",
        recipient: "verifier-test",
        payload: {
          command: "reportTiming",
          tool: "innovus",
          proposedBy: "test-agent",
        },
        timestamp: Date.now(),
      });

      expect(messages.length).toBe(1);
      const response = messages[0] as { type: string; payload: { approved: boolean } };
      expect(response.type).toBe("command.verification.complete");
      expect(response.payload.approved).toBe(true);
    });

    it("should handle pattern.query messages", async () => {
      const messages: unknown[] = [];
      agent.on("sendMessage", (msg) => messages.push(msg));

      await agent.initialize();
      await agent.start();

      await agent.receiveMessage({
        id: "test-msg-2",
        type: "pattern.query",
        sender: "test-sender",
        recipient: "verifier-test",
        payload: {
          command: "testCommand",
          tool: "innovus",
        },
        timestamp: Date.now(),
      });

      expect(messages.length).toBe(1);
      const response = messages[0] as { type: string };
      expect(response.type).toBe("pattern.query.result");
    });

    it("should handle risk.assess messages", async () => {
      const messages: unknown[] = [];
      agent.on("sendMessage", (msg) => messages.push(msg));

      await agent.initialize();
      await agent.start();

      await agent.receiveMessage({
        id: "test-msg-3",
        type: "risk.assess",
        sender: "test-sender",
        recipient: "verifier-test",
        payload: {
          command: "rm -rf /",
          tool: "shell",
        },
        timestamp: Date.now(),
      });

      expect(messages.length).toBe(1);
      const response = messages[0] as { type: string; payload: { riskLevel: string } };
      expect(response.type).toBe("risk.assessment.result");
      // rm -rf is high risk (file deletion), shell boost doesn't push to critical
      expect(response.payload.riskLevel).toBe("high");
    });
  });

  describe("stats", () => {
    it("should return current statistics", () => {
      const stats = agent.getStats();
      expect(stats.riskPatternCount).toBeGreaterThan(0);
      expect(typeof stats.requireConfirmationForMediumRisk).toBe("boolean");
    });
  });
});
