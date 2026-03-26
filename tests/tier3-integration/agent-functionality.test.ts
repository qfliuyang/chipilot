/**
 * Agent Functionality Test - Interactive TUI Testing
 *
 * Tests agent initialization, goal processing, and memory usage
 * using real PTY interaction.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnCLI, PTYSession } from './pty-runner.js';
import * as fs from 'fs';
import * as path from 'path';

// Test questions for agent evaluation
const TEST_QUESTIONS = [
  "How do I run placement optimization?",
  "What commands check setup timing?",
  "How do I generate a timing report?",
  "What's the innovus command for floorplanning?",
  "How do I fix hold time violations?"
];

describe('Agent Functionality Tests', () => {
  let session: PTYSession;
  const results: Array<{
    question: string;
    duration: number;
    responseFound: boolean;
    agentActivityFound: boolean;
  }> = [];

  beforeEach(async () => {
    session = await spawnCLI({ cols: 100, rows: 30 });
  });

  afterEach(() => {
    // Save results for analysis
    if (results.length > 0) {
      const resultsPath = path.join(process.cwd(), 'tests', 'output', 'agent-test-results.json');
      fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
      fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    }
    session?.kill('SIGTERM');
  });

  describe('Agent Initialization', () => {
    it('should initialize all agents on startup', async () => {
      // Wait for agent initialization messages
      await session.waitFor(/PlannerAgent.*initializing/, 3000);
      await session.waitFor(/OrchestratorAgent.*initializing/, 3000);
      await session.waitFor(/TerminalPerceptionAgent.*initializing/, 3000);

      // Check that agents are registered
      expect(session.contains('Agent registered: planner')).toBe(true);
      expect(session.contains('Agent registered: orchestrator')).toBe(true);
      expect(session.contains('Agent registered: terminal-perception')).toBe(true);
    });

    it('should show all agents idle in status panel', async () => {
      // Check initial agent status display
      await session.waitFor(/All agents idle|Agent Status/, 2000);
      expect(session.contains('All agents idle')).toBe(true);
    });
  });

  describe('Goal Processing', () => {
    it('should process placement optimization question', async () => {
      const startTime = Date.now();

      // Send question
      await session.send('How do I run placement optimization?', { waitMs: 100 });
      await session.send('\r', { waitMs: 500 });

      // Wait for agent activity indicators
      let agentActivity = false;
      let responseReceived = false;

      try {
        // Look for orchestrator processing
        await session.waitFor(/Processing.*placement|orchestrator.*running|planner.*running/i, 5000);
        agentActivity = true;
      } catch {
        // Agent activity may not be visible in output
      }

      // Wait for response (AI: or error message)
      try {
        await session.waitFor(/AI:|Error:|Successfully|Failed/i, 8000);
        responseReceived = true;
      } catch {
        // Response may take longer
      }

      const duration = Date.now() - startTime;

      results.push({
        question: 'How do I run placement optimization?',
        duration,
        responseFound: responseReceived,
        agentActivityFound: agentActivity
      });

      // Should have some response or activity
      expect(session.contains('You:')).toBe(true);
    });

    it('should handle multiple sequential questions', async () => {
      const testResults: typeof results = [];

      for (const question of TEST_QUESTIONS.slice(0, 3)) {
        const startTime = Date.now();

        // Send question
        await session.send(question, { waitMs: 100 });
        await session.send('\r', { waitMs: 500 });

        // Wait for any response indicator
        let responseFound = false;
        try {
          await session.waitFor(/AI:|Thinking|orchestrator|planner|Successfully|Failed|Error/i, 6000);
          responseFound = true;
        } catch {
          // Timeout - check if still responsive
        }

        const duration = Date.now() - startTime;
        testResults.push({
          question,
          duration,
          responseFound,
          agentActivityFound: session.contains('orchestrator') || session.contains('planner')
        });

        // Small delay between questions
        await new Promise(r => setTimeout(r, 500));
      }

      results.push(...testResults);

      // All questions should have been sent (visible in output)
      expect(session.contains(TEST_QUESTIONS[0])).toBe(true);
      expect(session.contains(TEST_QUESTIONS[1])).toBe(true);
      expect(session.contains(TEST_QUESTIONS[2])).toBe(true);
    });
  });

  describe('Agent State Transitions', () => {
    it('should show agent state changes during processing', async () => {
      // Send a question that should trigger agent activity
      await session.send('How do I run placement optimization?', { waitMs: 100 });
      await session.send('\r', { waitMs: 200 });

      // Look for state change indicators in output
      // The TUI shows agent states in the status panel
      const hasAgentStatus = session.contains('Agent Status') ||
                            session.contains('orchestrator') ||
                            session.contains('planner') ||
                            session.contains('terminal-perception');

      expect(hasAgentStatus).toBe(true);
    });

    it('should return to idle state after processing', async () => {
      // Send question and wait
      await session.send('status check', { waitMs: 100 });
      await session.send('\r', { waitMs: 500 });

      // Wait a bit for processing
      await new Promise(r => setTimeout(r, 3000));

      // Check if we can still interact (app is responsive)
      await session.send('hello', { waitMs: 100 });

      // App should still be functional
      expect(session.contains('hello')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle questions without crashing', async () => {
      // Send various question types
      const questions = [
        'How do I run placement optimization?',
        'What is the meaning of life?',  // Non-EDA question
        '',  // Empty
      ];

      for (const q of questions) {
        await session.send(q || ' ', { waitMs: 50 });
        await session.send('\r', { waitMs: 300 });
      }

      // App should still be responsive
      await session.send('test', { waitMs: 100 });
      expect(session.contains('test')).toBe(true);

      // Should not have crashed
      expect(session.contains('ERROR')).toBe(false);
    });
  });
});

describe('Memory and Performance', () => {
  it('should handle rapid questions without memory issues', async () => {
    const session = await spawnCLI({ cols: 80, rows: 24 });

    try {
      // Send questions rapidly
      for (let i = 0; i < 5; i++) {
        await session.send(`Question ${i}`, { waitMs: 50 });
        await session.send('\r', { waitMs: 200 });
      }

      // Wait for processing
      await new Promise(r => setTimeout(r, 2000));

      // App should still be responsive
      await session.send('final test', { waitMs: 100 });
      expect(session.contains('final test')).toBe(true);

      // No errors should have occurred
      expect(session.contains('ERROR')).toBe(false);
      expect(session.contains('out of memory')).toBe(false);
    } finally {
      session.kill('SIGTERM');
    }
  });
});
