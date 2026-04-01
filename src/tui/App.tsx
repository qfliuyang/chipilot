import React, { useState, useCallback, useRef, useEffect } from "react";
import { Box, Text, useApp, useInput, useStdout, render } from "ink";
import TextInput from "ink-text-input";
import { TerminalPane } from "../terminal/index.js";
import { TerminalSession } from "../terminal/TerminalSession.js";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export const App: React.FC = () => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions
  const width = stdout.columns || 120;
  const height = stdout.rows || 40;
  const half = Math.floor(width / 2);

  // State
  const [pane, setPane] = useState<"chat" | "term">("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to Claude Code with Terminal! Type your message or Tab to switch to terminal." },
  ]);

  // Initialize session once
  const sessionRef = useRef<TerminalSession | null>(null);
  if (!sessionRef.current) {
    sessionRef.current = new TerminalSession({
      cols: Math.max(20, half - 4),
      rows: Math.max(10, height - 8),
    });
    sessionRef.current.start();
  }

  // Global input handler
  useInput(
    useCallback((input, key) => {
      if (key.ctrl && input === "c") {
        exit();
        return;
      }
      if (key.tab) {
        setPane((p) => (p === "chat" ? "term" : "chat"));
        return;
      }
    }, [exit])
  );

  // Submit chat message
  const submit = useCallback(async (msg: string) => {
    if (!msg.trim()) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);

    // Echo back for now
    setMessages((m) => [...m, { role: "assistant", content: `You said: ${msg}` }]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.destroy();
      }
    };
  }, []);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Header */}
      <Box width={width} height={1} flexShrink={0}>
        <Text bold color="cyan">claude-code + terminal</Text>
        <Box flexGrow={1} />
        <Text dimColor>Tab: switch | Ctrl+C: exit</Text>
      </Box>

      {/* Main content - two pane layout */}
      <Box flexDirection="row" width={width} height={height - 3} flexShrink={0}>
        {/* Chat pane */}
        <Box
          width={half}
          height={height - 3}
          borderStyle="single"
          borderColor={pane === "chat" ? "cyan" : "gray"}
          flexDirection="column"
        >
          <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
            {messages.map((m, i) => (
              <Box key={i} flexDirection="column" marginBottom={1}>
                <Text bold color={m.role === "user" ? "green" : "cyan"}>
                  {m.role === "user" ? "You:" : "Claude:"}
                </Text>
                <Text wrap="wrap">{m.content}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Terminal pane */}
        <Box
          width={width - half}
          height={height - 3}
          borderStyle="single"
          borderColor={pane === "term" ? "cyan" : "gray"}
          flexDirection="column"
        >
          <TerminalPane
            focused={pane === "term"}
            session={sessionRef.current!}
            width={Math.max(20, half - 4)}
            height={Math.max(10, height - 8)}
          />
        </Box>
      </Box>

      {/* Input area */}
      <Box
        width={width}
        height={3}
        borderStyle="single"
        borderColor={pane === "chat" ? "cyan" : "gray"}
        flexShrink={0}
      >
        {pane === "chat" ? (
          <>
            <Text color="cyan" bold>{'> '}</Text>
            <TextInput
              value={input}
              onChange={setInput}
              onSubmit={submit}
              placeholder="Type a message..."
            />
          </>
        ) : (
          <Box flexDirection="row">
            <Text color="gray" bold>{'> '}</Text>
            <Text color="gray" dimColor>
              [Tab to return to chat, type in terminal above]
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export function runApp(): void {
  render(<App />);
}

export default App;
