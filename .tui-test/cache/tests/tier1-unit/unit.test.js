//# hash=b3f2fb45cdbf23efa66a481100eff286
//# sourceMappingURL=unit.test.js.map

/**
 * Tier 1: Unit Tests
 *
 * Pure logic tests with no I/O, mocks, or external dependencies.
 * These form the foundation for upper tiers.
 */ import { describe, it, expect } from 'vitest';
// Example utility functions to test
function parseInput(input) {
    var parts = input.trim().split(/\s+/);
    return {
        command: parts[0] || '',
        args: parts.slice(1)
    };
}
function truncateLines(text, maxLines) {
    var lines = text.split('\n');
    return lines.slice(-maxLines);
}
function stripAnsi(text) {
    return text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}
function calculateScrollOffset(currentOffset, direction, pageSize, maxOffset) {
    if (direction === 'up') {
        return Math.min(maxOffset, currentOffset + 1);
    } else {
        return Math.max(0, currentOffset - 1);
    }
}
describe('Tier 1: Unit Tests', function() {
    describe('Input Parsing', function() {
        it('should parse simple command', function() {
            var result = parseInput('help');
            expect(result.command).toBe('help');
            expect(result.args).toEqual([]);
        });
        it('should parse command with arguments', function() {
            var result = parseInput('ls -la /home');
            expect(result.command).toBe('ls');
            expect(result.args).toEqual([
                '-la',
                '/home'
            ]);
        });
        it('should handle empty input', function() {
            var result = parseInput('');
            expect(result.command).toBe('');
            expect(result.args).toEqual([]);
        });
        it('should handle extra whitespace', function() {
            var result = parseInput('  echo   hello   world  ');
            expect(result.command).toBe('echo');
            expect(result.args).toEqual([
                'hello',
                'world'
            ]);
        });
    });
    describe('Line Truncation', function() {
        it('should return all lines when under limit', function() {
            var text = 'line1\nline2\nline3';
            var result = truncateLines(text, 5);
            expect(result).toEqual([
                'line1',
                'line2',
                'line3'
            ]);
        });
        it('should truncate to last N lines', function() {
            var text = 'a\nb\nc\nd\ne';
            var result = truncateLines(text, 3);
            expect(result).toEqual([
                'c',
                'd',
                'e'
            ]);
        });
        it('should handle single line', function() {
            var result = truncateLines('only', 10);
            expect(result).toEqual([
                'only'
            ]);
        });
        it('should handle empty string', function() {
            var result = truncateLines('', 5);
            expect(result).toEqual([
                ''
            ]);
        });
    });
    describe('ANSI Stripping', function() {
        it('should remove color codes', function() {
            var colored = '\x1b[32mgreen\x1b[0m';
            expect(stripAnsi(colored)).toBe('green');
        });
        it('should remove multiple codes', function() {
            var multi = '\x1b[1mbold\x1b[0m \x1b[31mred\x1b[0m';
            expect(stripAnsi(multi)).toBe('bold red');
        });
        it('should preserve plain text', function() {
            var plain = 'no colors here';
            expect(stripAnsi(plain)).toBe('no colors here');
        });
        it('should handle complex sequences', function() {
            var complex = '\x1b[38;5;123mcolored\x1b[0m';
            expect(stripAnsi(complex)).toBe('colored');
        });
    });
    describe('Scroll Offset Calculation', function() {
        it('should increment on up', function() {
            var result = calculateScrollOffset(0, 'up', 5, 10);
            expect(result).toBe(1);
        });
        it('should decrement on down', function() {
            var result = calculateScrollOffset(5, 'down', 5, 10);
            expect(result).toBe(4);
        });
        it('should not go below zero', function() {
            var result = calculateScrollOffset(0, 'down', 5, 10);
            expect(result).toBe(0);
        });
        it('should not exceed max offset', function() {
            var result = calculateScrollOffset(10, 'up', 5, 10);
            expect(result).toBe(10);
        });
    });
    describe('Message Formatting', function() {
        var formatMessage = function formatMessage(role, content) {
            var prefix = role === 'user' ? 'You:' : 'AI:';
            return "".concat(prefix, " ").concat(content);
        };
        it('should format user message', function() {
            expect(formatMessage('user', 'hello')).toBe('You: hello');
        });
        it('should format assistant message', function() {
            expect(formatMessage('assistant', 'hi there')).toBe('AI: hi there');
        });
        it('should handle multiline content', function() {
            var content = 'line1\nline2';
            expect(formatMessage('user', content)).toBe('You: line1\nline2');
        });
    });
    describe('Pane State Management', function() {
        var switchPane = function switchPane(current) {
            return current === 'chat' ? 'term' : 'chat';
        };
        it('should switch from chat to term', function() {
            expect(switchPane('chat')).toBe('term');
        });
        it('should switch from term to chat', function() {
            expect(switchPane('term')).toBe('chat');
        });
        it('should be reversible', function() {
            expect(switchPane(switchPane('chat'))).toBe('chat');
        });
    });
    describe('Input Validation', function() {
        var isValidInput = function isValidInput(input) {
            return input.trim().length > 0;
        };
        it('should accept non-empty input', function() {
            expect(isValidInput('hello')).toBe(true);
        });
        it('should reject empty input', function() {
            expect(isValidInput('')).toBe(false);
        });
        it('should reject whitespace-only', function() {
            expect(isValidInput('   ')).toBe(false);
        });
        it('should accept input with leading/trailing space', function() {
            expect(isValidInput('  hello  ')).toBe(true);
        });
    });
});
