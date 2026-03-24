import React, { memo, useMemo, useRef, useEffect } from "react";
import { Box, Text } from "ink";
import type { Message } from "./App.js";

interface ChatPaneProps {
  messages: Message[];
  isLoading: boolean;
  focused: boolean;
  onSubmit: (message: string) => void;
}

// Memoized message - only re-renders if content changes
const MessageItem = memo(({ msg }: { msg: Message }) => (
  <Box flexDirection="column" marginY={1}>
    <Box>
      <Text bold color={msg.role === "user" ? "green" : "cyan"}>
        {msg.role === "user" ? "You" : "AI"}
      </Text>
      <Text dimColor>:</Text>
    </Box>
    <Box paddingLeft={1}>
      <Text wrap="wrap">{msg.content}</Text>
    </Box>
  </Box>
));
MessageItem.displayName = "MessageItem";

export const ChatPane: React.FC<ChatPaneProps> = memo(({
  messages,
  isLoading,
  focused,
  onSubmit,
}) => {
  // Ref-based input - NO React state to avoid re-renders
  const inputRef = useRef("");
  const cursorRef = useRef(0);

  // Handle input directly
  useEffect(() => {
    if (!focused) return;

    const stdin = process.stdin;
    if (!stdin.isTTY) return;

    const onData = (data: Buffer) => {
      const str = data.toString("utf8");

      // Handle special keys
      if (str === "\r" || str === "\n") {
        // Enter - submit
        const value = inputRef.current.trim();
        if (value) {
          onSubmit(value);
          inputRef.current = "";
          cursorRef.current = 0;
        }
        return;
      }

      if (str === "\x7f" || str === "\b") {
        // Backspace
        if (cursorRef.current > 0) {
          inputRef.current =
            inputRef.current.slice(0, cursorRef.current - 1) +
            inputRef.current.slice(cursorRef.current);
          cursorRef.current--;
        }
        return;
      }

      if (str === "\x1b[D") {
        // Left arrow
        cursorRef.current = Math.max(0, cursorRef.current - 1);
        return;
      }

      if (str === "\x1b[C") {
        // Right arrow
        cursorRef.current = Math.min(inputRef.current.length, cursorRef.current + 1);
        return;
      }

      if (str === "\x01") {
        // Ctrl+A - start of line
        cursorRef.current = 0;
        return;
      }

      if (str === "\x05") {
        // Ctrl+E - end of line
        cursorRef.current = inputRef.current.length;
        return;
      }

      if (str === "\x0b") {
        // Ctrl+K - clear line
        inputRef.current = inputRef.current.slice(0, cursorRef.current);
        return;
      }

      if (str === "\x15") {
        // Ctrl+U - clear to start
        inputRef.current = inputRef.current.slice(cursorRef.current);
        cursorRef.current = 0;
        return;
      }

      // Regular character - insert at cursor
      if (str.length === 1 && str.charCodeAt(0) >= 32) {
        inputRef.current =
          inputRef.current.slice(0, cursorRef.current) +
          str +
          inputRef.current.slice(cursorRef.current);
        cursorRef.current++;
      }
    };

    stdin.on("data", onData);

    return () => {
      stdin.off("data", onData);
    };
  }, [focused, onSubmit]);

  // Visible messages
  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

  // Current input display
  const inputDisplay = inputRef.current;
  const cursorPos = cursorRef.current;

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {visibleMessages.map((msg, i) => (
          <MessageItem key={i} msg={msg} />
        ))}

        {isLoading && (
          <Box>
            <Text dimColor>Thinking...</Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      {focused ? (
        <Box borderStyle="single" borderColor="gray" paddingX={1}>
          <Text color="cyan" bold>{">"}</Text>
          <Box marginLeft={1}>
            <Text>
              {inputDisplay.slice(0, cursorPos)}
              <Text inverse color="cyan"> </Text>
              {inputDisplay.slice(cursorPos)}
            </Text>
          </Box>
        </Box>
      ) : (
        <Box borderStyle="single" borderColor="gray" justifyContent="center">
          <Text dimColor>[ Tab to focus ]</Text>
        </Box>
      )}
    </Box>
  );
});

ChatPane.displayName = "ChatPane";

export default ChatPane;
