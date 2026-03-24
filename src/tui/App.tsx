import React, { useState, useCallback, useRef, useMemo } from "react";
import { Box, Text, useApp, useInput, useStdout, render } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { TerminalPane } from "./TerminalPane.js";
import { ApprovalModal } from "./ApprovalModal.js";
import { TerminalSession } from "../terminal/session.js";
import { Agent } from "../agent/index.js";

export interface ChipilotOptions {
  provider?: string;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  debug?: boolean;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ProposedCommand {
  command: string;
  explanation: string;
}

export async function runChipilot(options: ChipilotOptions): Promise<void> {
  render(<App options={options} />);
}

export const App: React.FC<{ options: ChipilotOptions }> = ({ options }) => {
  const { exit } = useApp();
  const { stdout } = useStdout();

  // Get terminal dimensions
  const width = stdout.columns || 120;
  const height = stdout.rows || 40;
  const half = Math.floor(width / 2);

  // Fixed layout proportions
  const headerHeight = 1;
  const inputHeight = 3;
  const mainHeight = Math.max(10, height - headerHeight - inputHeight);

  // State
  const [pane, setPane] = useState<"chat" | "term">("chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState<ProposedCommand | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to chipilot! Ask me about EDA tools." },
  ]);

  // Refs for stable instances (created once)
  const sessionRef = useRef<TerminalSession | null>(null);
  const agentRef = useRef<Agent | null>(null);

  // Initialize session once
  if (!sessionRef.current) {
    sessionRef.current = new TerminalSession({
      cols: Math.max(20, half - 4),
      rows: Math.max(10, mainHeight - 4),
    });
  }

  // Initialize agent once
  if (!agentRef.current) {
    agentRef.current = new Agent({
      provider: options.provider || "anthropic",
      model: options.model,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
    });
  }

  // Global input handler - Tab always switches panes
  useInput((input, key) => {
    if (key.tab) {
      setPane((p) => (p === "chat" ? "term" : "chat"));
      return;
    }

    if (key.ctrl && input === "c") {
      exit();
    }
  });

  // Submit chat message
  const submit = useCallback(async (msg: string) => {
    if (!msg.trim() || loading) return;
    setInput("");
    setLoading(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);

    try {
      const res = await agentRef.current!.chat(msg, {});
      setMessages((m) => [...m, { role: "assistant", content: res.message }]);
      if (res.proposedCommand) setCommand(res.proposedCommand);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e}` }]);
    }
    setLoading(false);
  }, [loading]);

  // Calculate visible messages (scroll to show recent)
  const maxVisibleMessages = Math.max(3, Math.floor((mainHeight - 4) / 3));
  const visibleMessages = useMemo(
    () => messages.slice(-maxVisibleMessages),
    [messages, maxVisibleMessages]
  );

  return (
    <Box flexDirection="column" width={width} height={height} flexShrink={0}>
      {/* Header - fixed */}
      <Box width={width} height={headerHeight} flexShrink={0}>
        <Text bold color="cyan">chipilot</Text>
        <Text dimColor> - Agentic EDA</Text>
        <Box flexGrow={1} />
        <Text dimColor>Tab: switch | Ctrl+C: exit</Text>
      </Box>

      {/* Main content - fixed height */}
      <Box flexDirection="row" width={width} height={mainHeight} flexShrink={0}>
        {/* Chat pane */}
        <Box
          width={half}
          height={mainHeight}
          borderStyle="single"
          borderColor={pane === "chat" ? "cyan" : "gray"}
          flexDirection="column"
        >
          {/* Messages area - scrollable via slice */}
          <Box flexDirection="column" flexGrow={1} paddingX={1} overflow="hidden">
            {visibleMessages.map((m: Message, i: number) => (
              <Box key={i} flexDirection="column" marginBottom={1}>
                <Text bold color={m.role === "user" ? "green" : "cyan"}>
                  {m.role === "user" ? "You:" : "AI:"}
                </Text>
                <Text wrap="truncate">{m.content}</Text>
              </Box>
            ))}
            {loading && (
              <Text dimColor>
                <Spinner type="dots" /> Thinking...
              </Text>
            )}
          </Box>
        </Box>

        {/* Terminal pane - self-contained, no parent state updates */}
        <Box
          width={width - half}
          height={mainHeight}
          borderStyle="single"
          borderColor={pane === "term" ? "cyan" : "gray"}
          flexDirection="column"
        >
          <TerminalPane
            focused={pane === "term"}
            session={sessionRef.current!}
            maxLines={Math.max(5, mainHeight - 4)}
          />
        </Box>
      </Box>

      {/* Input area - fixed */}
      <Box width={width} height={inputHeight} borderStyle="single" borderColor="gray" flexShrink={0}>
        {pane === "chat" ? (
          loading ? (
            <Text dimColor>Waiting for AI...</Text>
          ) : (
            <>
              <Text color="cyan" bold>&gt; </Text>
              <TextInput
                value={input}
                onChange={setInput}
                onSubmit={submit}
                placeholder="Ask about EDA..."
              />
            </>
          )
        ) : (
          <Text dimColor>[Tab to focus terminal]</Text>
        )}
      </Box>

      {/* Approval modal */}
      {command && (
        <ApprovalModal
          command={command.command}
          explanation={command.explanation}
          onApprove={(cmd) => {
            sessionRef.current!.write(cmd + "\r");
            setCommand(null);
            setMessages((m) => [...m, { role: "assistant", content: `Executing: ${cmd}` }]);
          }}
          onReject={() => setCommand(null)}
        />
      )}
    </Box>
  );
};

export default App;
