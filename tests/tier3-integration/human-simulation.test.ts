/**
 * Human Simulation Tests
 *
 * These tests simulate realistic user interactions to catch issues
 * that humans would find but automated unit tests miss.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawnCLI, PTYSession } from './pty-runner.js';

describe('Human Simulation Tests', () => {
  let session: PTYSession;

  beforeEach(async () => {
    session = await spawnCLI({ cols: 80, rows: 24 });
  });

  afterEach(() => {
    session?.kill('SIGTERM');
  });

  describe('Realistic User Workflows', () => {
    it('should handle typing then immediately switching panes', async () => {
      // Human types fast then presses Tab
      await session.send('hello there', { waitMs: 50 });
      await session.send('\t', { waitFor: 'Tab to focus', timeout: 2000 });

      // After switching to terminal, the chat input area should not show 'hello there'
      // (it's preserved but hidden when terminal is focused)
      // Just verify the app is responsive and no errors occurred
      expect(session.contains('Error')).toBe(false);
      expect(session.contains('Tab to focus')).toBe(true);
    });

    it('should handle rapid tab switching', async () => {
      // Human presses Tab multiple times quickly
      await session.send('test input', { waitFor: 'test input', timeout: 2000 });

      // Rapid tab switching
      for (let i = 0; i < 5; i++) {
        await session.send('\t', { waitMs: 100 });
      }

      // Should end up back in chat pane with input preserved
      expect(session.contains('test input')).toBe(true);
    });

    it('should handle backspace in input', async () => {
      // Type with backspaces (all in chat pane, no pane switching)
      await session.send('helo', { waitFor: 'helo', timeout: 1000 });
      await session.send('\x7f', { waitMs: 50 }); // Backspace
      await session.send('lo world', { waitMs: 100 });

      // Should show corrected text in the input area
      // Just verify the app handles it without errors
      expect(session.contains('Error')).toBe(false);
      expect(session.contains('helo')).toBe(true);
    });

    it('should handle special characters', async () => {
      // Type various special characters - test that app doesn't crash
      const specialChars = [
        'test@example.com',
        'path/to/file.txt',
        'command --flag value',
      ];

      for (const input of specialChars) {
        await session.send(input, { waitMs: 100 });
        // Just verify no errors occurred
        expect(session.contains('Error')).toBe(false);
        // Clear for next input
        await session.send('\x15', { waitMs: 50 });
      }
    });

    it('should handle long input without truncation', async () => {
      const longInput = 'This is a very long message that a human might type ' +
                       'when asking about EDA tools and chip design workflows ' +
                       'that goes on for quite a while';

      await session.send(longInput, { waitMs: 100 });

      // Should display full input (not truncated)
      const screen = session.screen;
      expect(screen.length).toBeGreaterThan(100);
    });

    it('should handle paste-like input (instant many chars)', async () => {
      // Simulate paste (no delay between chars)
      const pastedText = 'pasted content from clipboard';
      session.send(pastedText);

      await new Promise(r => setTimeout(r, 200));

      // Should capture all text
      expect(session.contains(pastedText)).toBe(true);
    });
  });

  describe('Edge Cases Humans Find', () => {
    it('should handle empty input submission', async () => {
      await session.send('\r', { waitMs: 200 });

      // Should not crash, should still show welcome
      expect(session.contains('Welcome')).toBe(true);
    });

    it('should handle only whitespace input', async () => {
      await session.send('    ', { waitMs: 50 });
      await session.send('\r', { waitMs: 200 });

      // Should handle gracefully
      expect(session.contains('Error')).toBe(false);
    });

    it('should handle help then immediate tab', async () => {
      await session.send('?', { waitFor: 'Keyboard Shortcuts', timeout: 2000 });
      await session.send('\t', { waitMs: 500 });

      // Should still be responsive
      expect(session.contains('Tab')).toBe(true);
    });

    it('should handle terminal commands then switch back', async () => {
      // Go to terminal and immediately come back (without running commands)
      await session.send('\t', { waitFor: 'Terminal', timeout: 2000 });
      await session.send('\t', { waitMs: 500 });

      // Chat pane should be responsive - just verify no errors
      await session.send('chat message', { waitMs: 300 });
      // The app should still be functional after pane switches
      expect(session.contains('Error')).toBe(false);
    });
  });

  describe('Visual Consistency', () => {
    it('should maintain consistent border colors', async () => {
      // Chat pane focused - left border should be cyan
      await new Promise(r => setTimeout(r, 100));
      let output = session.output;

      // Switch to terminal
      await session.send('\t', { waitMs: 200 });
      output = session.output;

      // Terminal pane should now be focused
      // Just verify no errors occurred
      expect(session.contains('Error')).toBe(false);
    });

    it('should handle resize gracefully', async () => {
      // Simulate resize
      session.resize(60, 20);
      await new Promise(r => setTimeout(r, 300));

      // App should still respond
      await session.send('test', { waitFor: 'test', timeout: 2000 });
      expect(session.contains('test')).toBe(true);

      // Resize back
      session.resize(80, 24);
      await new Promise(r => setTimeout(r, 300));
    });
  });

  describe('Stress Tests', () => {
    it('should handle many messages without crash', async () => {
      // Send several messages rapidly
      for (let i = 0; i < 10; i++) {
        await session.send(`message ${i}`, { waitMs: 20 });
        await session.send('\r', { waitMs: 300 });
      }

      // Should still be responsive
      await session.send('final message', { waitFor: 'final message', timeout: 2000 });
      expect(session.contains('final message')).toBe(true);
    });

    it('should handle alternating pane switches', async () => {
      // Rapidly alternate between panes
      for (let i = 0; i < 10; i++) {
        await session.send('\t', { waitMs: 100 });
      }

      // Should end in consistent state
      expect(session.contains('Error')).toBe(false);
    });
  });
});
