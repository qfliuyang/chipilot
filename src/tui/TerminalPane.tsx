import React, { memo, useEffect, useRef, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { TerminalSession } from "../terminal/session.js";

interface Props {
  focused: boolean;
  session: TerminalSession;
  maxLines?: number;
}

/**
 * TerminalPane is self-contained - it manages its own output buffer
 * to prevent parent re-renders from causing flickering.
 */
export const TerminalPane: React.FC<Props> = memo(({ focused, session, maxLines = 15 }) => {
  // Local state only for this component
  const [lines, setLines] = useState<string[]>([]);
  const bufferRef = useRef<string>("");
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const handleOutput = (data: string) => {
      // Accumulate in buffer
      bufferRef.current = (bufferRef.current + data).slice(-10000);

      // Use requestAnimationFrame for smooth updates without excessive re-renders
      if (rafRef.current) return;

      rafRef.current = setTimeout(() => {
        rafRef.current = 0;

        // Clean ANSI codes and split into lines
        const cleaned = bufferRef.current
          .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
          .replace(/\x1b\][^\x07]*\x07/g, "")
          .replace(/\x1b[()][AB012]/g, "")
          .replace(/\r\n/g, "\n")
          .replace(/\r/g, "");

        const allLines = cleaned.split("\n");
        setLines(allLines.slice(-maxLines));
      }, 16); // ~60fps
    };

    session.on("output", handleOutput);
    return () => {
      session.off("output", handleOutput);
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [session, maxLines]);

  // Input handling - Tab is passed through to parent
  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.tab) return; // Let parent handle tab

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
        session.write(String.fromCharCode(input.charCodeAt(0) - 96));
      } else if (input.length === 1 && !key.meta) {
        session.write(input);
      }
    },
    { isActive: focused }
  );

  // Show last N lines
  const visibleLines = lines.slice(-maxLines);

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box paddingX={1} flexShrink={0}>
        <Text bold color="yellow">Terminal</Text>
        {focused && <Text dimColor> (active)</Text>}
      </Box>

      <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
        {visibleLines.map((line, i) => (
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
