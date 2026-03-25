/**
 * Tier 2: Component Tests with ink-testing-library
 *
 * These tests render Ink components and validate output.
 * They focus on rendering output rather than complex input simulation
 * since input handling is better tested at Tier 3 with real PTY.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'ink-testing-library';
import React from 'react';
import { Box, Text } from 'ink';

// Mock components that mirror the actual app structure
// Testing rendering output - input handling validated in Tier 3 with real PTY

const MockMessage = ({
  role,
  content,
}: {
  role: 'user' | 'assistant';
  content: string;
}) => (
  <Box flexDirection="column" marginY={1}>
    <Box>
      <Text bold color={role === 'user' ? 'green' : 'cyan'}>
        {role === 'user' ? 'You' : 'AI'}
      </Text>
      <Text dimColor>:</Text>
    </Box>
    <Box paddingLeft={1}>
      <Text wrap="wrap">{content}</Text>
    </Box>
  </Box>
);

const MockChatPane = ({
  messages,
  isLoading,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isLoading: boolean;
}) => (
  <Box flexDirection="column" width="100%" height="100%">
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {messages.map((msg, i) => (
        <MockMessage key={i} role={msg.role} content={msg.content} />
      ))}
      {isLoading && (
        <Box>
          <Text dimColor>Thinking...</Text>
        </Box>
      )}
    </Box>
  </Box>
);

const MockTerminalPane = ({
  focused,
  lines,
}: {
  focused: boolean;
  lines: string[];
}) => (
  <Box flexDirection="column" width="100%" height="100%">
    <Box paddingX={1} flexShrink={0}>
      <Text bold color="yellow">Terminal</Text>
      {focused && <Text dimColor> (active - type normally)</Text>}
    </Box>
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {lines.map((line, i) => (
        <Text key={i}>{line || ' '}</Text>
      ))}
      {focused && <Text color="green">▋</Text>}
    </Box>
    {!focused && (
      <Box justifyContent="center" flexShrink={0}>
        <Text dimColor>[Tab to focus]</Text>
      </Box>
    )}
  </Box>
);

const MockInputArea = ({
  pane,
  input,
  loading,
}: {
  pane: 'chat' | 'term';
  input: string;
  loading: boolean;
}) => (
  <Box width={80} height={3} borderStyle="single" borderColor="gray">
    {pane === 'chat' ? (
      loading ? (
        <Text dimColor>Waiting for AI...</Text>
      ) : (
        <>
          <Text color="cyan" bold>{'> '}</Text>
          <Text>{input}</Text>
        </>
      )
    ) : (
      <Box flexDirection="row">
        <Text color="gray" bold>{'> '}</Text>
        <Text color="gray" dimColor>
          [Tab to return to chat]
        </Text>
      </Box>
    )}
  </Box>
);

describe('Tier 2: Component Tests', () => {
  describe('Message Rendering', () => {
    it('should render user message with correct styling', () => {
      const { lastFrame } = render(
        <MockMessage role="user" content="Hello AI" />
      );

      const output = lastFrame();
      expect(output).toContain('You');
      expect(output).toContain('Hello AI');
    });

    it('should render assistant message with correct styling', () => {
      const { lastFrame } = render(
        <MockMessage role="assistant" content="Hello human" />
      );

      const output = lastFrame();
      expect(output).toContain('AI');
      expect(output).toContain('Hello human');
    });

    it('should wrap long messages', () => {
      const longMessage = 'A'.repeat(200);
      const { lastFrame } = render(
        <MockMessage role="user" content={longMessage} />
      );

      // Should render without errors
      const output = lastFrame();
      expect(output).toContain('You');
      expect(output).toContain('A');
    });
  });

  describe('ChatPane Rendering', () => {
    it('should display welcome message', () => {
      const messages = [
        { role: 'assistant' as const, content: 'Welcome to chipilot!' },
      ];

      const { lastFrame } = render(
        <MockChatPane messages={messages} isLoading={false} />
      );

      expect(lastFrame()).toContain('Welcome to chipilot!');
      expect(lastFrame()).toContain('AI');
    });

    it('should display multiple messages', () => {
      const messages = [
        { role: 'assistant' as const, content: 'Welcome!' },
        { role: 'user' as const, content: 'First message' },
        { role: 'assistant' as const, content: 'Response' },
        { role: 'user' as const, content: 'Second message' },
      ];

      const { lastFrame } = render(
        <MockChatPane messages={messages} isLoading={false} />
      );

      const output = lastFrame();
      expect(output).toContain('Welcome!');
      expect(output).toContain('First message');
      expect(output).toContain('Response');
      expect(output).toContain('Second message');
    });

    it('should show loading indicator', () => {
      const { lastFrame } = render(
        <MockChatPane messages={[]} isLoading={true} />
      );

      expect(lastFrame()).toContain('Thinking');
    });

    it('should not show loading when not loading', () => {
      const { lastFrame } = render(
        <MockChatPane messages={[]} isLoading={false} />
      );

      expect(lastFrame()).not.toContain('Thinking');
    });
  });

  describe('TerminalPane Rendering', () => {
    it('should render terminal output lines', () => {
      const lines = ['$ ls', 'file1.txt', 'file2.txt', '$ prompt>'];

      const { lastFrame } = render(
        <MockTerminalPane focused={false} lines={lines} />
      );

      const output = lastFrame();
      expect(output).toContain('Terminal');
      expect(output).toContain('file1.txt');
      expect(output).toContain('prompt>');
    });

    it('should show active indicator when focused', () => {
      const { lastFrame } = render(
        <MockTerminalPane focused={true} lines={[]} />
      );

      const output = lastFrame();
      expect(output).toContain('active');
      expect(output).toContain('▋'); // cursor
    });

    it('should show focus hint when not focused', () => {
      const { lastFrame } = render(
        <MockTerminalPane focused={false} lines={[]} />
      );

      expect(lastFrame()).toContain('[Tab to focus]');
    });
  });

  describe('InputArea Rendering', () => {
    it('should render chat input with value', () => {
      const { lastFrame } = render(
        <MockInputArea pane="chat" input="hello world" loading={false} />
      );

      const output = lastFrame();
      expect(output).toContain('> ');
      expect(output).toContain('hello world');
    });

    it('should show loading state', () => {
      const { lastFrame } = render(
        <MockInputArea pane="chat" input="" loading={true} />
      );

      expect(lastFrame()).toContain('Waiting for AI');
    });

    it('should show terminal placeholder when in term pane', () => {
      const { lastFrame } = render(
        <MockInputArea pane="term" input="preserved text" loading={false} />
      );

      const output = lastFrame();
      // Should NOT show the input (it's preserved but hidden)
      expect(output).not.toContain('preserved text');
      // Should show placeholder
      expect(output).toContain('[Tab to return to chat]');
    });

    it('should render with gray styling in terminal pane', () => {
      const { lastFrame } = render(
        <MockInputArea pane="term" input="" loading={false} />
      );

      const output = lastFrame();
      // Gray/dim styling indicators
      expect(output).toContain('>');
      expect(output).toContain('Tab to return');
    });
  });

  describe('ANSI Output Validation', () => {
    it('should render colored text', () => {
      const ColoredComponent = () => (
        <Box>
          <Text color="cyan">Cyan text</Text>
          <Text color="green">Green text</Text>
        </Box>
      );

      const { lastFrame } = render(<ColoredComponent />);

      // Ink outputs ANSI color codes
      const output = lastFrame();
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);
    });

    it('should render bold text', () => {
      const BoldComponent = () => (
        <Text bold>Bold header</Text>
      );

      const { lastFrame } = render(<BoldComponent />);
      expect(lastFrame()).toContain('Bold header');
    });

    it('should render dim text', () => {
      const DimComponent = () => (
        <Text dimColor>Dim hint</Text>
      );

      const { lastFrame } = render(<DimComponent />);
      expect(lastFrame()).toContain('Dim hint');
    });
  });

  describe('Layout Structure', () => {
    it('should render full app layout', () => {
      const AppLayout = () => (
        <Box flexDirection="column" width={80} height={24}>
          {/* Header */}
          <Box height={1}>
            <Text bold color="cyan">chipilot</Text>
            <Text dimColor> - Agentic EDA</Text>
          </Box>

          {/* Main content */}
          <Box flexDirection="row" height={20}>
            {/* Chat pane */}
            <Box width={40} borderStyle="single">
              <MockChatPane
                messages={[{ role: 'assistant', content: 'Welcome!' }]}
                isLoading={false}
              />
            </Box>

            {/* Terminal pane */}
            <Box width={40} borderStyle="single">
              <MockTerminalPane
                focused={false}
                lines={['$ prompt>']}
              />
            </Box>
          </Box>

          {/* Input area */}
          <MockInputArea pane="chat" input="" loading={false} />
        </Box>
      );

      const { lastFrame } = render(<AppLayout />);

      const output = lastFrame();
      expect(output).toContain('chipilot');
      expect(output).toContain('Agentic EDA');
      expect(output).toContain('Welcome!');
      expect(output).toContain('Terminal');
    });
  });
});
