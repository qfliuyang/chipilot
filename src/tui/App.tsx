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

  // Initialize Claude session (left pane) - runs real claude CLI
  const claudeSessionRef = useRef<TerminalSession | null>(null);
  if (!claudeSessionRef.current) {
    claudeSessionRef.current = new TerminalSession({
      cols: Math.max(20, half - 4),
      rows: Math.max(10, height - 8),
      shell: "claude", // Run real Claude Code CLI
      args: [],
    });
    claudeSessionRef.current.start();
  }

  // Initialize Terminal session (right pane) - runs user's shell
  const termSessionRef = useRef<TerminalSession | null>(null);
  if (!termSessionRef.current) {
    termSessionRef.current = new TerminalSession({
      cols: Math.max(20, half - 4),
      rows: Math.max(10, height - 8),
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

      {/* Main content - two pane layout */}
      <Box flexDirection="row" width={width} height={height - 3} flexShrink={0}>
        {/* Claude pane - runs real claude CLI */}
        <Box
          width={half}
          height={height - 3}
          borderStyle="single"
          borderColor={pane === "claude" ? "cyan" : "gray"}
          flexDirection="column"
        >
          <TerminalPane
            focused={pane === "claude"}
            session={claudeSessionRef.current!}
            width={Math.max(20, half - 4)}
            height={Math.max(10, height - 8)}
          />
        </Box>

        {/* Terminal pane - runs user's shell */}
        <Box
          width={width - half}
          height={height - 3}
          borderStyle="single"
          borderColor={pane === "term" ? "cyan" : "gray"}
          flexDirection="column"
        >
          <TerminalPane
            focused={pane === "term"}
            session={termSessionRef.current!}
            width={Math.max(20, half - 4)}
            height={Math.max(10, height - 8)}
          />
        </Box>
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
