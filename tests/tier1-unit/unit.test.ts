/**
 * Tier 1: Unit Tests
 *
 * Pure logic tests with no I/O, mocks, or external dependencies.
 * These form the foundation for upper tiers.
 */

import { describe, it, expect } from 'vitest';

// Example utility functions to test
function parseInput(input: string): { command: string; args: string[] } {
  const parts = input.trim().split(/\s+/);
  return {
    command: parts[0] || '',
    args: parts.slice(1),
  };
}

function truncateLines(text: string, maxLines: number): string[] {
  const lines = text.split('\n');
  return lines.slice(-maxLines);
}

function stripAnsi(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function calculateScrollOffset(
  currentOffset: number,
  direction: 'up' | 'down',
  pageSize: number,
  maxOffset: number
): number {
  if (direction === 'up') {
    return Math.min(maxOffset, currentOffset + 1);
  } else {
    return Math.max(0, currentOffset - 1);
  }
}

describe('Tier 1: Unit Tests', () => {
  describe('Input Parsing', () => {
    it('should parse simple command', () => {
      const result = parseInput('help');
      expect(result.command).toBe('help');
      expect(result.args).toEqual([]);
    });

    it('should parse command with arguments', () => {
      const result = parseInput('ls -la /home');
      expect(result.command).toBe('ls');
      expect(result.args).toEqual(['-la', '/home']);
    });

    it('should handle empty input', () => {
      const result = parseInput('');
      expect(result.command).toBe('');
      expect(result.args).toEqual([]);
    });

    it('should handle extra whitespace', () => {
      const result = parseInput('  echo   hello   world  ');
      expect(result.command).toBe('echo');
      expect(result.args).toEqual(['hello', 'world']);
    });
  });

  describe('Line Truncation', () => {
    it('should return all lines when under limit', () => {
      const text = 'line1\nline2\nline3';
      const result = truncateLines(text, 5);
      expect(result).toEqual(['line1', 'line2', 'line3']);
    });

    it('should truncate to last N lines', () => {
      const text = 'a\nb\nc\nd\ne';
      const result = truncateLines(text, 3);
      expect(result).toEqual(['c', 'd', 'e']);
    });

    it('should handle single line', () => {
      const result = truncateLines('only', 10);
      expect(result).toEqual(['only']);
    });

    it('should handle empty string', () => {
      const result = truncateLines('', 5);
      expect(result).toEqual(['']);
    });
  });

  describe('ANSI Stripping', () => {
    it('should remove color codes', () => {
      const colored = '\x1b[32mgreen\x1b[0m';
      expect(stripAnsi(colored)).toBe('green');
    });

    it('should remove multiple codes', () => {
      const multi = '\x1b[1mbold\x1b[0m \x1b[31mred\x1b[0m';
      expect(stripAnsi(multi)).toBe('bold red');
    });

    it('should preserve plain text', () => {
      const plain = 'no colors here';
      expect(stripAnsi(plain)).toBe('no colors here');
    });

    it('should handle complex sequences', () => {
      const complex = '\x1b[38;5;123mcolored\x1b[0m';
      expect(stripAnsi(complex)).toBe('colored');
    });
  });

  describe('Scroll Offset Calculation', () => {
    it('should increment on up', () => {
      const result = calculateScrollOffset(0, 'up', 5, 10);
      expect(result).toBe(1);
    });

    it('should decrement on down', () => {
      const result = calculateScrollOffset(5, 'down', 5, 10);
      expect(result).toBe(4);
    });

    it('should not go below zero', () => {
      const result = calculateScrollOffset(0, 'down', 5, 10);
      expect(result).toBe(0);
    });

    it('should not exceed max offset', () => {
      const result = calculateScrollOffset(10, 'up', 5, 10);
      expect(result).toBe(10);
    });
  });

  describe('Message Formatting', () => {
    function formatMessage(role: 'user' | 'assistant', content: string): string {
      const prefix = role === 'user' ? 'You:' : 'AI:';
      return `${prefix} ${content}`;
    }

    it('should format user message', () => {
      expect(formatMessage('user', 'hello')).toBe('You: hello');
    });

    it('should format assistant message', () => {
      expect(formatMessage('assistant', 'hi there')).toBe('AI: hi there');
    });

    it('should handle multiline content', () => {
      const content = 'line1\nline2';
      expect(formatMessage('user', content)).toBe('You: line1\nline2');
    });
  });

  describe('Pane State Management', () => {
    type Pane = 'chat' | 'term';

    function switchPane(current: Pane): Pane {
      return current === 'chat' ? 'term' : 'chat';
    }

    it('should switch from chat to term', () => {
      expect(switchPane('chat')).toBe('term');
    });

    it('should switch from term to chat', () => {
      expect(switchPane('term')).toBe('chat');
    });

    it('should be reversible', () => {
      expect(switchPane(switchPane('chat'))).toBe('chat');
    });
  });

  describe('Input Validation', () => {
    function isValidInput(input: string): boolean {
      return input.trim().length > 0;
    }

    it('should accept non-empty input', () => {
      expect(isValidInput('hello')).toBe(true);
    });

    it('should reject empty input', () => {
      expect(isValidInput('')).toBe(false);
    });

    it('should reject whitespace-only', () => {
      expect(isValidInput('   ')).toBe(false);
    });

    it('should accept input with leading/trailing space', () => {
      expect(isValidInput('  hello  ')).toBe(true);
    });
  });
});
