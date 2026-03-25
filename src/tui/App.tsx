import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
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

// Help overlay component
const HelpOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  useInput(() => {
    onClose();
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      padding={1}
      position="absolute"
      width={60}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Keyboard Shortcuts
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={0}>
          <Text bold color="yellow">Tab</Text>
          <Text> - Switch between chat and terminal panes</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">Ctrl+C</Text>
          <Text> - Exit application</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">Up/Down</Text>
          <Text> - Scroll through messages (chat pane)</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">PageUp/PageDown</Text>
          <Text> - Scroll by page (chat pane)</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">Y</Text>
          <Text> - Approve command (when approval shown)</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">N</Text>
          <Text> - Reject command (when approval shown)</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">E</Text>
          <Text> - Edit command (when approval shown)</Text>
        </Box>
        <Box marginBottom={0}>
          <Text bold color="yellow">?</Text>
          <Text> - Show/hide this help</Text>
        </Box>
      </Box>

      <Box justifyContent="center">
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
};

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
  const [showHelp, setShowHelp] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to chipilot! Ask me about EDA tools." },
  ]);
  const [scrollOffset, setScrollOffset] = useState(0);

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

  // Resize terminal session when dimensions change
  useEffect(() => {
    if (sessionRef.current) {
      const cols = Math.max(20, half - 4);
      const rows = Math.max(10, mainHeight - 4);
      sessionRef.current.resize(cols, rows);
    }
  }, [half, mainHeight]);

  // Global input handler - active everywhere, but ignores keys that TextInput needs
  useInput(
    (input, key) => {
      // Allow backspace/delete to pass through to TextInput when in chat pane
      if (pane === "chat" && (key.backspace || key.delete)) {
        return;
      }

      // Help toggle with ? key (only when not showing approval modal)
      if (!command && input === "?") {
        setShowHelp((prev) => !prev);
        return;
      }

      // When help is shown, any key closes it (handled by HelpOverlay)
      if (showHelp) {
        return;
      }

      if (key.tab) {
        setPane((p) => (p === "chat" ? "term" : "chat"));
        return;
      }

      if (key.ctrl && input === "c") {
        exit();
      }

      // Scroll handlers (only when chat pane is focused)
      if (pane === "chat") {
        const totalMessages = messages.length;
        const maxScroll = Math.max(0, totalMessages - maxVisibleMessages);

        if (key.upArrow) {
          // Scroll up (show older messages)
          setScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        } else if (key.downArrow) {
          // Scroll down (show newer messages)
          setScrollOffset((offset) => Math.max(0, offset - 1));
        } else if (key.pageUp) {
          // Page up - scroll multiple messages
          setScrollOffset((offset) => Math.min(maxScroll, offset + maxVisibleMessages));
        } else if (key.pageDown) {
          // Page down - scroll multiple messages
          setScrollOffset((offset) => Math.max(0, offset - maxVisibleMessages));
        }
      }
    }
    // No isActive - handler runs everywhere but selectively ignores keys
  );

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

  // Calculate visible messages with scroll support
  const maxVisibleMessages = Math.max(3, Math.floor((mainHeight - 4) / 3));
  const totalMessages = messages.length;
  const maxScroll = Math.max(0, totalMessages - maxVisibleMessages);

  // Auto-reset scroll when at bottom and new messages arrive
  const visibleMessages = useMemo(() => {
    const startIndex = Math.max(0, totalMessages - maxVisibleMessages - scrollOffset);
    const endIndex = Math.min(totalMessages, startIndex + maxVisibleMessages);
    return messages.slice(startIndex, endIndex);
  }, [messages, maxVisibleMessages, scrollOffset, totalMessages]);

  // Calculate display range for scroll indicator
  const displayStart = totalMessages > 0 ? Math.max(1, totalMessages - maxVisibleMessages - scrollOffset + 1) : 0;
  const displayEnd = Math.min(totalMessages, displayStart + maxVisibleMessages - 1);
  const isScrolled = scrollOffset > 0;

  return (
    <Box flexDirection="column" width={width} height={height} flexShrink={0}>
      {/* Header - fixed */}
      <Box width={width} height={headerHeight} flexShrink={0}>
        <Text bold color="cyan">chipilot</Text>
        <Text dimColor> - Agentic EDA</Text>
        <Box flexGrow={1} />
        <Text dimColor>Tab: switch | Ctrl+C: exit | ?: help</Text>
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
                <Text wrap="wrap">{m.content}</Text>
              </Box>
            ))}
            {loading && (
              <Text dimColor>
                <Spinner type="dots" /> Thinking...
              </Text>
            )}
          </Box>
          {/* Scroll indicator */}
          {totalMessages > maxVisibleMessages && (
            <Box paddingX={1} height={1}>
              <Text dimColor>
                {isScrolled ? "↑ " : "  "}
                {displayStart}-{displayEnd} of {totalMessages}
                {scrollOffset > 0 && " ↓"}
              </Text>
            </Box>
          )}
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
      <Box
        width={width}
        height={inputHeight}
        borderStyle="single"
        borderColor="gray"
        flexShrink={0}
      >
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
          <Box flexDirection="row">
            <Text color="gray" bold>&gt; </Text>
            <Text color="gray" dimColor>
              [Tab to return to chat]
            </Text>
          </Box>
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

      {/* Help overlay */}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}
    </Box>
  );
};

export default App;
