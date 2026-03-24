import React, { memo, useEffect, useRef } from "react";
import { Box, Text, useInput } from "ink";
import type { TerminalSession } from "../terminal/session.js";

interface Props {
  focused: boolean;
  session: TerminalSession;
  maxLines?: number;
}

/**
 * TerminalPane - Real terminal feel
 *
 * Key: Keep ALL PTY output raw, only strip truly problematic sequences.
 */
export const TerminalPane: React.FC<Props> = memo(({ focused, session, maxLines = 20 }) => {
  const bufferRef = useRef<string>("");
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    const handleOutput = (data: string) => {
      // Accumulate raw output - keep everything
      bufferRef.current = (bufferRef.current + data).slice(-50000);

      // Force re-render
      forceRender((n) => n + 1);
    };

    session.on("output", handleOutput);

    // Start the session if not already started
    if (!session.isRunning()) {
      session.start();
    }

    return () => {
      session.off("output", handleOutput);
    };
  }, [session]);

  // Input handling - pass through to PTY immediately
  useInput(
    (input, key) => {
      if (!focused) return;

      // Tab switches panes (handled by parent), don't consume it
      if (key.tab) return;

      // Pass everything else directly to PTY - let PTY handle echo
      if (key.return) {
        session.write("\r");
      } else if (key.backspace || key.delete) {
        session.write("\x7f"); // DEL character for backspace
      } else if (key.upArrow) {
        session.write("\x1b[A");
      } else if (key.downArrow) {
        session.write("\x1b[B");
      } else if (key.leftArrow) {
        session.write("\x1b[D");
      } else if (key.rightArrow) {
        session.write("\x1b[C");
      } else if (key.ctrl && input.length === 1) {
        // Ctrl+C is handled by parent, other Ctrl keys pass through
        if (input !== "c") {
          session.write(String.fromCharCode(input.charCodeAt(0) - 96));
        }
      } else if (input.length === 1 && !key.meta) {
        // Regular character - pass to PTY, let it echo back
        session.write(input);
      }
    },
    { isActive: focused }
  );

  // Get display lines - process raw buffer
  const raw = bufferRef.current;

  // Only strip truly problematic sequences
  // Keep cursor movement and color codes
  let processed = raw;
  // Clear screen
  processed = processed.replace(/\x1b\[2J/g, "");
  // Cursor home
  processed = processed.replace(/\x1b\[H/g, "");
  // Clear line
  processed = processed.replace(/\x1b\[K/g, "");
  // OSC sequences
  processed = processed.replace(/\x1b\][^\x07]*\x07/g, "");

  const lines = processed.split("\n");
  const displayLines = lines.slice(-maxLines);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box paddingX={1} flexShrink={0}>
        <Text bold color="yellow">Terminal</Text>
        {focused && <Text dimColor> (active - type normally)</Text>}
      </Box>

      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {displayLines.map((line, i) => (
          <Text key={i}>{line || " "}</Text>
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
});

TerminalPane.displayName = "TerminalPane";
export default TerminalPane;
