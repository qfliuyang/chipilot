import React, { memo, useEffect, useRef, useCallback } from "react";
import { Box, Text, useInput } from "../../ink.js";
import type { TerminalSession } from "./TerminalSession.js";
import { VirtualTerminal } from "./VirtualTerminal.js";

export interface Props {
  focused: boolean;
  session: TerminalSession;
  width?: number;
  height?: number;
}

/**
 * TerminalPane - Real terminal emulation using xterm.js
 *
 * Renders terminal output with proper ANSI sequence handling,
 * cursor positioning, colors, and scrolling.
 */
export const TerminalPane: React.FC<Props> = memo(({ focused, session, width = 80, height = 24 }) => {
  const virtualTermRef = useRef<VirtualTerminal | null>(null);
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  // Initialize or get VirtualTerminal instance
  const getVirtualTerminal = useCallback(() => {
    if (!virtualTermRef.current) {
      virtualTermRef.current = new VirtualTerminal(width, height);
    }
    return virtualTermRef.current;
  }, [width, height]);

  // Handle resize
  useEffect(() => {
    const vt = getVirtualTerminal();
    vt.resize(width, height);
    session.resize(width, height);
    forceRender();
  }, [width, height, session, getVirtualTerminal]);

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
  const lines = screen.split("\n").slice(0, height);

  // Pad with empty lines if needed
  const paddedLines = [
    ...Array(Math.max(0, height - lines.length)).fill(""),
    ...lines
  ];

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header with focus indicator */}
      <Box paddingX={1} flexShrink={0}>
        <Text bold color="yellow">
          {focused ? "●" : "○"} Terminal
        </Text>
        <Text dimColor> [{session.getShell().split("/").pop()}]</Text>
        {session.isRunning() ? (
          <Text dimColor> - running</Text>
        ) : (
          <Text color="red"> - stopped</Text>
        )}
      </Box>

      {/* Terminal content */}
      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {paddedLines.map((line, i) => (
          <Text key={i}>{line || " "}</Text>
        ))}
      </Box>

      {/* Focus hint */}
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
