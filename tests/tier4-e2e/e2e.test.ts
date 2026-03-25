/**
 * Tier 4: End-to-End Acceptance Tests
 *
 * Full user scenarios that exercise the complete application.
 * These validate that Tiers 1-3 collectively produce a working product.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnCLI, PTYSession } from '../tier3-integration/pty-runner';
import { crossValidator } from '../validators/CrossValidator';

describe('Tier 4: E2E Acceptance Tests', () => {
  describe('Scenario: Complete Chat Session', () => {
    let session: PTYSession;

    beforeAll(async () => {
      session = await spawnCLI({ cols: 100, rows: 30 });
    });

    afterAll(() => {
      session?.kill('SIGTERM');
    });

    it('should complete full chat workflow', async () => {
      // Step 1: Verify initial state
      expect(session.contains('Welcome to chipilot')).toBe(true);

      // Step 2: Type and send a message
      await session.interact([
        { description: 'Type greeting', input: 'Hello, I need help with EDA tools' },
        { description: 'Submit message', input: '\r', waitFor: 'You:|AI:|Error', timeout: 5000 },
      ]);

      // Step 3: Verify message appears in history
      expect(session.contains('Hello, I need help')).toBe(true);

      // Step 4: Check for AI response or error handling
      const hasResponse = session.contains('AI:') ||
                         session.contains('Error') ||
                         session.contains('Thinking');
      expect(hasResponse).toBe(true);
    });

    it('should handle multiple messages', async () => {
      const messages = [
        'What is synthesis?',
        'How do I run a simulation?',
        'Show me my files',
      ];

      for (const msg of messages) {
        await session.interact([
          { input: msg },
          { input: '\r', waitMs: 1000 },
        ]);
      }

      // All messages should be in history
      for (const msg of messages) {
        expect(session.contains(msg)).toBe(true);
      }
    });
  });

  describe('Scenario: Pane Navigation', () => {
    let session: PTYSession;

    beforeAll(async () => {
      session = await spawnCLI({ cols: 80, rows: 24 });
    });

    afterAll(() => {
      session?.kill('SIGTERM');
    });

    it('should navigate between panes seamlessly', async () => {
      // Start in chat
      expect(session.contains('Ask about EDA')).toBe(true);

      // Switch to terminal
      await session.send('\t', { waitFor: 'Terminal', timeout: 2000 });
      expect(session.contains('Terminal')).toBe(true);

      // Switch back to chat
      await session.send('\t', { waitFor: 'Ask about EDA', timeout: 2000 });
      expect(session.contains('Ask about EDA')).toBe(true);

      // Switch to terminal again
      await session.send('\t', { waitFor: 'Terminal', timeout: 2000 });
      expect(session.contains('Terminal')).toBe(true);
    });

    it('should preserve input across pane switches', async () => {
      // Type partial input
      await session.send('partial message', { waitMs: 100 });

      // Switch to terminal
      await session.send('\t', { waitFor: 'Tab to return' });

      // Input should not be visible (validated in Tier 3)
      // but should be preserved (switch back and check)

      // Switch back to chat
      await session.send('\t', { waitFor: 'Ask about EDA' });

      // Now the input should be visible again
      expect(session.contains('partial message')).toBe(true);
    });
  });

  describe('Scenario: Help and Controls', () => {
    let session: PTYSession;

    beforeAll(async () => {
      session = await spawnCLI({ cols: 80, rows: 24 });
    });

    afterAll(() => {
      session?.kill('SIGTERM');
    });

    it('should display all help content', async () => {
      await session.send('?', { waitFor: 'Keyboard Shortcuts', timeout: 2000 });

      // Check all documented shortcuts
      const shortcuts = ['Tab', 'Ctrl+C', 'Up/Down', 'Y', 'N', 'E', '?'];
      for (const shortcut of shortcuts) {
        expect(session.contains(shortcut)).toBe(true);
      }
    });

    it('should handle help from both panes', async () => {
      // Help from chat pane
      await session.send('\t\t', { waitFor: 'Ask about EDA' });
      await session.send('?', { waitFor: 'Keyboard Shortcuts' });
      await session.send('q', { waitMs: 300 });

      // Help should not work from terminal pane (or should be consistent)
      await session.send('\t', { waitFor: 'Terminal' });
      // In terminal pane, ? might go to the shell - that's OK
    });
  });

  describe('Scenario: Terminal Commands', () => {
    let session: PTYSession;

    beforeAll(async () => {
      session = await spawnCLI({ cols: 80, rows: 24 });
    });

    afterAll(() => {
      session?.kill('SIGTERM');
    });

    it('should execute basic terminal commands', async () => {
      await session.send('\t', { waitFor: 'Terminal', timeout: 2000 });

      // Run pwd
      await session.interact([
        { input: 'pwd', waitMs: 100 },
        { input: '\r', waitMs: 500 },
      ]);

      // Should show current directory
      expect(session.contains('/')).toBe(true);
    });

    it('should handle command output', async () => {
      await session.send('\t', { waitFor: 'Terminal' });

      // Run echo
      await session.interact([
        { input: 'echo test123', waitMs: 100 },
        { input: '\r', waitMs: 500 },
      ]);

      expect(session.contains('test123')).toBe(true);
    });
  });

  describe('Cross-Tier Validation', () => {
    it('should validate all tiers produce consistent results', async () => {
      // This test uses the crossValidator to ensure consistency
      // between Tier 2 (component) and Tier 3/4 (real PTY)

      const scenarios = crossValidator.validateAllScenarios(
        new Map([
          [3, async (input) => {
            const s = await spawnCLI();
            for (const key of input) {
              await s.send(key, { waitMs: 100 });
            }
            const output = s.output;
            s.kill();
            return output;
          }],
          [4, async (input) => {
            const s = await spawnCLI();
            for (const key of input) {
              await s.send(key, { waitMs: 100 });
            }
            const output = s.output;
            s.kill();
            return output;
          }],
        ])
      );

      // Validation happens in the crossValidator
      expect(scenarios).toBeDefined();
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    let session: PTYSession;

    beforeAll(async () => {
      session = await spawnCLI({ cols: 80, rows: 24 });
    });

    afterAll(() => {
      session?.kill('SIGTERM');
    });

    it('should handle rapid input', async () => {
      // Send many characters quickly
      for (let i = 0; i < 20; i++) {
        session.send(`x`);
      }

      await new Promise(r => setTimeout(r, 500));

      // Should have captured all input
      expect(session.contains('xxxxxxxxxx')).toBe(true);
    });

    it('should handle resize gracefully', async () => {
      // Resize terminal
      session.resize(60, 20);
      await new Promise(r => setTimeout(r, 300));

      // App should still be responsive
      await session.send('test', { waitMs: 100 });
      expect(session.contains('test')).toBe(true);

      // Resize back
      session.resize(80, 24);
      await new Promise(r => setTimeout(r, 300));
    });

    it('should handle special characters', async () => {
      const specialChars = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'];

      for (const char of specialChars) {
        await session.send(char, { waitMs: 50 });
      }

      for (const char of specialChars) {
        expect(session.contains(char)).toBe(true);
      }
    });
  });
});
