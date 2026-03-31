import React, { memo, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import type { TerminalSession } from "../terminal/session.js";
import { VirtualTerminal } from "../terminal/virtual.js";

interface Props {
  focused: boolean;
  session: TerminalSession;
  cols?: number;
  rows?: number;
}

/**
 * TerminalPane - Real terminal emulation using xterm.js
 *
 * Renders terminal output with proper ANSI sequence handling,
 * cursor positioning, colors, and scrolling.
 */
export const TerminalPane: React.FC<Props> = memo(({ focused, session, cols = 80, rows = 24 }) => {
  const virtualTermRef = useRef<VirtualTerminal | null>(null);
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  // Initialize or get VirtualTerminal instance
  const getVirtualTerminal = useCallback(() => {
    if (!virtualTermRef.current) {
      virtualTermRef.current = new VirtualTerminal(cols, rows);
    }
    return virtualTermRef.current;
  }, [cols, rows]);

  // Handle resize (debounced 100ms)
  useEffect(() => {
    const timeout = setTimeout(() => {
      const vt = getVirtualTerminal();
      vt.resize(cols, rows);
      session.resize(cols, rows);
      forceRender();
    }, 100);
    return () => clearTimeout(timeout);
  }, [cols, rows, session, getVirtualTerminal]);

  // Handle terminal output
  useEffect(() => {
    const vt = getVirtualTerminal();

    const handleOutput = (data: string) => {
      vt.write(data);
      forceRender();
    };

    session.on("output", handleOutput);

    if (!session.isRunning()) {
      session.start();
    }

    return () => {
      session.off("output", handleOutput);
    };
  }, [session, getVirtualTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (virtualTermRef.current) {
        virtualTermRef.current.destroy();
        virtualTermRef.current = null;
      }
    };
  }, []);

  // Input handling - pass through to PTY
  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.tab) return;

      // Handle copy (Ctrl+Shift+C)
      if (key.ctrl && key.shift && input === "C") {
        const vt = getVirtualTerminal();
        const selection = vt.getSelection?.() || "";
        if (selection) {
          try {
            if (typeof navigator !== "undefined" && navigator.clipboard) {
              navigator.clipboard.writeText(selection);
            }
          } catch {
            // Clipboard API not available, ignore
          }
        }
        return;
      }

      // Handle paste (Ctrl+Shift+V)
      if (key.ctrl && key.shift && input === "V") {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.readText().then((text) => {
              if (text) session.write(text);
            });
          }
        } catch {
          // Clipboard API not available, ignore
        }
        return;
      }

      if (key.return) {
        session.write("\r");
      } else if (key.backspace || key.delete) {
        session.write("\x7f");
      } else if (key.upArrow) {
        session.write("\x1b[A");
      } else if (key.downArrow) {
        session.write("\x1b[B");
      } else if (key.leftArrow) {
        session.write("\x1b[D");
      } else if (key.rightArrow) {
        session.write("\x1b[C");
      } else if (key.ctrl && input.length === 1) {
        if (input !== "c") {
          session.write(String.fromCharCode(input.charCodeAt(0) - 96));
        }
      } else if (input.length === 1 && !key.meta) {
        session.write(input);
      }
    },
    { isActive: focused }
  );

  // Get rendered screen from VirtualTerminal
  const vt = getVirtualTerminal();
  const screen = vt.getScreen();
  const lines = screen.split("\n").slice(0, rows);

  // Pad with empty lines if needed
  const paddedLines = [
    ...Array(Math.max(0, rows - lines.length)).fill(""),
    ...lines
  ];

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box paddingX={1} flexShrink={0}>
        <Text bold color="yellow">Terminal</Text>
        {focused && <Text dimColor> (active)</Text>}
      </Box>

      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {paddedLines.map((line, i) => (
          <Text key={i}>{line || " "}</Text>
        ))}
      </Box>

      {!focused && (
        <Box justifyContent="center" flexShrink={0} paddingBottom={1}>
          <Text dimColor>[Tab to focus]</Text>
        </Box>
      )}
    </Box>
  );
});

TerminalPane.displayName = "TerminalPane";
export default TerminalPane;
