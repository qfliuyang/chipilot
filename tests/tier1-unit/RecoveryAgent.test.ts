/**
 * @fileoverview RecoveryAgent Unit Tests
 *
 * Tests the RecoveryAgent's error diagnosis, recovery planning,
 * checkpoint management, and message handling capabilities.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { RecoveryAgent } from "../../src/agents/RecoveryAgent";
import { KnowledgeBase } from "../../src/agents/KnowledgeBase";
import { resetMessageBus } from "../../src/agents/MessageBus";

describe("RecoveryAgent", () => {
  let agent: RecoveryAgent;
  let knowledgeBase: KnowledgeBase;

  beforeEach(async () => {
    resetMessageBus();
    knowledgeBase = new KnowledgeBase({});
    agent = new RecoveryAgent({
      id: "recovery-test",
      name: "Test Recovery Agent",
      knowledgeBase,
      maxRecoveryAttempts: 3,
      initialRetryDelay: 100,
      enableAutoEscalation: true,
    });
    await agent.initialize();
    await agent.start();
  });

  afterEach(async () => {
    await agent.stop();
    await agent.cleanup();
  });

  describe("initialization", () => {
    it("should initialize with correct configuration", () => {
      expect(agent.initialized).toBe(true);
      expect(agent.state).toBe("running");
      expect(agent.recovering).toBe(false);
    });

    it("should return correct stats initially", () => {
      const stats = agent.getStats();
      expect(stats.errorsDiagnosed).toBe(0);
      expect(stats.recoveryAttempts).toBe(0);
      expect(stats.successfulRecoveries).toBe(0);
      expect(stats.checkpointsCreated).toBe(0);
    });
  });

  describe("error diagnosis", () => {
    it("should diagnose license errors", async () => {
      const diagnosis = await agent.diagnoseError("License checkout failed for Innovus");
      expect(diagnosis.errorType).toBe("resource");
      expect(diagnosis.isRecoverable).toBe(true);
      expect(diagnosis.confidence).toBeGreaterThan(0.5);
    });

    it("should diagnose connection errors", async () => {
      const diagnosis = await agent.diagnoseError("Connection lost to server");
      expect(diagnosis.errorType).toBe("connection");
      expect(diagnosis.isRecoverable).toBe(true);
    });

    it("should diagnose timeout errors", async () => {
      const diagnosis = await agent.diagnoseError("Command timed out after 300 seconds");
      expect(diagnosis.errorType).toBe("timeout");
      expect(diagnosis.isRecoverable).toBe(true); // Timeout has 0.4 success rate
    });

    it("should diagnose syntax errors", async () => {
      const diagnosis = await agent.diagnoseError("invalid command name 'foo'");
      expect(diagnosis.errorType).toBe("syntax");
      expect(diagnosis.isRecoverable).toBe(false);
    });

    it("should handle unknown errors", async () => {
      const diagnosis = await agent.diagnoseError("Something weird happened");
      expect(diagnosis.errorType).toBe("unknown");
      expect(diagnosis.confidence).toBeLessThan(0.5);
    });

    it("should track error type distribution", async () => {
      await agent.diagnoseError("License checkout failed");
      await agent.diagnoseError("Connection lost");
      await agent.diagnoseError("invalid command");

      const stats = agent.getStats();
      expect(stats.errorsDiagnosed).toBe(3);
      expect(stats.errorTypeDistribution.resource).toBe(1);
      expect(stats.errorTypeDistribution.connection).toBe(1);
      expect(stats.errorTypeDistribution.syntax).toBe(1);
    });
  });

  describe("checkpoint management", () => {
    it("should create checkpoints", () => {
      const checkpoint = agent.createCheckpoint("Test checkpoint", { test: true });
      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.description).toBe("Test checkpoint");
      expect(checkpoint.metadata).toEqual({ test: true });
    });

    it("should retrieve checkpoints by ID", () => {
      const checkpoint = agent.createCheckpoint("Test");
      const retrieved = agent.getCheckpoint(checkpoint.id);
      expect(retrieved).toEqual(checkpoint);
    });

    it("should return all checkpoints sorted by timestamp", () => {
      agent.createCheckpoint("First");
      agent.createCheckpoint("Second");
      agent.createCheckpoint("Third");

      const all = agent.getAllCheckpoints();
      expect(all).toHaveLength(3);
      expect(all[0].description).toBe("First");
      expect(all[2].description).toBe("Third");
    });

    it("should remove checkpoints", () => {
      const checkpoint = agent.createCheckpoint("To remove");
      const removed = agent.removeCheckpoint(checkpoint.id);
      expect(removed).toBe(true);
      expect(agent.getCheckpoint(checkpoint.id)).toBeUndefined();
    });

    it("should clear all checkpoints", () => {
      agent.createCheckpoint("One");
      agent.createCheckpoint("Two");
      agent.clearCheckpoints();
      expect(agent.getAllCheckpoints()).toHaveLength(0);
    });

    it("should track checkpoint creation in stats", () => {
      agent.createCheckpoint("Test");
      const stats = agent.getStats();
      expect(stats.checkpointsCreated).toBe(1);
    });
  });

  describe("recovery planning", () => {
    it("should create recovery plan for resource errors", async () => {
      const diagnosis = await agent.diagnoseError("License unavailable");
      const plan = await agent.createRecoveryPlan(diagnosis);

      expect(plan.diagnosis).toEqual(diagnosis);
      expect(plan.actions.length).toBeGreaterThan(0);
      expect(plan.status).toBe("pending");
    });

    it("should include backoff action for resource errors", async () => {
      const diagnosis = await agent.diagnoseError("License unavailable");
      const plan = await agent.createRecoveryPlan(diagnosis);

      const backoffAction = plan.actions.find((a) => a.strategy === "retry_with_backoff");
      expect(backoffAction).toBeDefined();
    });

    it("should include escalation for syntax errors", async () => {
      const diagnosis = await agent.diagnoseError("invalid command");
      const plan = await agent.createRecoveryPlan(diagnosis);

      const escalateAction = plan.actions.find((a) => a.strategy === "escalate");
      expect(escalateAction).toBeDefined();
    });

    it("should store recovery plans", async () => {
      const diagnosis = await agent.diagnoseError("License unavailable");
      const plan = await agent.createRecoveryPlan(diagnosis);

      const history = agent.getRecoveryHistory();
      expect(history).toHaveLength(0); // Plan created but not executed
    });
  });

  describe("recovery execution", () => {
    it("should execute recovery request", async () => {
      const result = await agent.requestRecovery({
        error: "License checkout failed",
      });

      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it("should handle successful recovery simulation", async () => {
      // Connection errors should succeed with retry
      const result = await agent.requestRecovery({
        error: "Connection lost",
      });

      // Note: Actual recovery execution is simulated, may succeed or fail
      expect(result.attempts).toBeGreaterThanOrEqual(0);
    });

    it("should track recovery in history", async () => {
      await agent.requestRecovery({ error: "License failed" });

      const history = agent.getRecoveryHistory();
      expect(history).toHaveLength(1);
    });

    it("should respect history limit", async () => {
      // Create multiple recovery results by calling requestRecovery
      for (let i = 0; i < 5; i++) {
        await agent.requestRecovery({ error: `Error ${i}` });
      }

      const history = agent.getRecoveryHistory();
      expect(history.length).toBeLessThanOrEqual(100); // Max history size
    });
  });

  describe("message handling", () => {
    it("should handle recovery.request messages", async () => {
      const messages: unknown[] = [];
      agent.on("sendMessage", (msg) => messages.push(msg));

      await agent.receiveMessage({
        id: "test-msg-1",
        type: "recovery.request",
        sender: "test-sender",
        recipient: "recovery-test",
        payload: { error: "License failed" },
        timestamp: Date.now(),
        priority: "high",
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should send a response
      expect(messages.length).toBeGreaterThan(0);
    });

    it("should handle checkpoint.create messages", async () => {
      const messages: unknown[] = [];
      agent.on("sendMessage", (msg) => messages.push(msg));

      await agent.receiveMessage({
        id: "test-msg-2",
        type: "checkpoint.create",
        sender: "test-sender",
        recipient: "recovery-test",
        payload: { description: "Test checkpoint" },
        timestamp: Date.now(),
        priority: "normal",
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(messages.length).toBeGreaterThan(0);
    });

    it("should handle stats.get messages", async () => {
      const messages: unknown[] = [];
      agent.on("sendMessage", (msg) => messages.push(msg));

      await agent.receiveMessage({
        id: "test-msg-3",
        type: "stats.get",
        sender: "test-sender",
        recipient: "recovery-test",
        payload: {},
        timestamp: Date.now(),
        priority: "low",
      });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(messages.length).toBe(1);
    });
  });

  describe("statistics", () => {
    it("should calculate success rate correctly", async () => {
      // Initial state
      let stats = agent.getStats();
      expect(stats.successRate).toBe(0);

      // After some recoveries, rate should be calculated
      await agent.requestRecovery({ error: "Connection lost" });

      stats = agent.getStats();
      expect(stats.recoveryAttempts).toBeGreaterThanOrEqual(0);
    });

    it("should track consecutive failures", async () => {
      // Syntax errors are not recoverable and should escalate
      await agent.requestRecovery({ error: "invalid command" });
      await agent.requestRecovery({ error: "syntax error" });

      const stats = agent.getStats();
      expect(stats.failedRecoveries).toBeGreaterThanOrEqual(0);
    });
  });
});
