import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useApp, useInput, useStdout, render } from "ink";
import { TerminalPane } from "../terminal/index.js";
import { TerminalSession } from "../terminal/TerminalSession.js";

export const App: React.FC = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions
  const width = stdout.columns || 120;
  const height = stdout.rows || 40;
  const half = Math.floor(width / 2);

  // State
  const [pane, setPane] = useState<"claude" | "term">("claude");

  // Calculate terminal dimensions (full pane size, no borders)
  const claudeWidth = half;
  const claudeHeight = height - 3;
  const termWidth = width - half;
  const termHeight = height - 3;

  // Initialize Claude session (left pane) - runs real claude CLI
  const claudeSessionRef = useRef<TerminalSession | null>(null);
  if (!claudeSessionRef.current) {
    claudeSessionRef.current = new TerminalSession({
      cols: claudeWidth,
      rows: claudeHeight,
      shell: "claude", // Run real Claude Code CLI
      args: [],
    });
    claudeSessionRef.current.start();
  }

  // Initialize Terminal session (right pane) - runs user's shell
  const termSessionRef = useRef<TerminalSession | null>(null);
  if (!termSessionRef.current) {
    termSessionRef.current = new TerminalSession({
      cols: termWidth,
      rows: termHeight,
    });
    termSessionRef.current.start();
  }

  // Global input handler
  useInput(
    useCallback((input, key) => {
      if (key.ctrl && input === "c") {
        exit();
        return;
      }
      if (key.tab) {
        setPane((p) => (p === "claude" ? "term" : "claude"));
        return;
      }
    }, [exit])
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (claudeSessionRef.current) {
        claudeSessionRef.current.destroy();
      }
      if (termSessionRef.current) {
        termSessionRef.current.destroy();
      }
    };
  }, []);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box width={width} height={1} flexShrink={0}>
        <Text bold color="cyan">ChipClaude - Claude Code + Terminal</Text>
        <Box flexGrow={1} />
        <Text dimColor>Tab: switch | Ctrl+C: exit</Text>
      </Box>

      {/* Main content - two pane layout, no borders (terminal handles its own) */}
      <Box flexDirection="row" width={width} height={height - 3} flexShrink={0}>
        {/* Claude pane - runs real claude CLI */}
        <TerminalPane
          focused={pane === "claude"}
          session={claudeSessionRef.current!}
          width={half}
          height={height - 3}
        />

        {/* Terminal pane - runs user's shell */}
        <TerminalPane
          focused={pane === "term"}
          session={termSessionRef.current!}
          width={width - half}
          height={height - 3}
        />
      </Box>

      {/* Status bar */}
      <Box
        width={width}
        height={3}
        borderStyle="single"
        borderColor={pane === "claude" ? "cyan" : "gray"}
        flexShrink={0}
        paddingX={1}
      >
        {pane === "claude" ? (
          <Text color="cyan">Claude Code CLI (left) | Tab to switch to terminal</Text>
        ) : (
          <Text color="gray">Terminal (right) | Tab to switch to Claude</Text>
        )}
      </Box>
    </Box>
  );
};

export function runApp(): void {
  render(<App />);
}

export default App;
