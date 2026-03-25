import React, { memo, useMemo } from "react";
import { Box, Text } from "ink";
import type { Message } from "./App.js";

interface ChatPaneProps {
  messages: Message[];
  isLoading: boolean;
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
}) => {
  // Visible messages
  const visibleMessages = useMemo(() => messages.slice(-8), [messages]);

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
    </Box>
  );
});

ChatPane.displayName = "ChatPane";

export default ChatPane;
