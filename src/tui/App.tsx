import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { Box, Text, useApp, useInput, useStdout, render } from "ink";
import TextInput from "ink-text-input";
import { TerminalPane } from "./TerminalPane.js";
import { ApprovalModal } from "./ApprovalModal.js";
import { TerminalSession } from "../terminal/session.js";
import { Agent } from "../agent/index.js";
import { OrchestratorAgent, GoalResult } from "../agents/OrchestratorAgent.js";
import { PlannerAgent } from "../agents/PlannerAgent.js";
import { TerminalPerceptionAgent } from "../agents/TerminalPerceptionAgent.js";
import { ExecutionAgent } from "../agents/ExecutionAgent.js";
import { AgentState } from "../agents/BaseAgent.js";
import { getAgentRecorder } from "../agents/AgentRecorder.js";

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
          <Text bold color="yellow">Ctrl+X</Text>
          <Text> - Emergency stop all agents</Text>
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

// Agent status display component
interface AgentStatus {
  agentId: string;
  state: AgentState;
  lastActivity?: number;
}

const AgentPanel: React.FC<{
  statuses: AgentStatus[];
  isProcessing: boolean;
  currentGoal?: string;
}> = ({ statuses, isProcessing, currentGoal }) => {
  const getStateColor = (state: AgentState): string => {
    switch (state) {
      case "running": return "green";
      case "error": return "red";
      case "paused": return "yellow";
      case "idle": return "gray";
      default: return "gray";
    }
  };

  const activeAgents = statuses.filter(s => s.state === "running");

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Agent Status</Text>
        {isProcessing && (
          <Box marginLeft={2}>
            <Text color="yellow">{currentGoal ? `Processing: ${currentGoal}` : "Processing..."}</Text>
          </Box>
        )}
      </Box>
      {activeAgents.length > 0 ? (
        <Box flexDirection="column">
          {activeAgents.map(agent => (
            <Box key={agent.agentId}>
              <Text color={getStateColor(agent.state)}>
                {agent.agentId}: {agent.state}
              </Text>
            </Box>
          ))}
        </Box>
      ) : (
        <Text dimColor>All agents idle</Text>
      )}
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
  const agentPanelHeight = 3;
  const mainHeight = Math.max(10, height - headerHeight - inputHeight - agentPanelHeight);

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
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [currentGoal, setCurrentGoal] = useState<string | undefined>();
  const [, setGoalResult] = useState<GoalResult | null>(null);
  const [agentsReady, setAgentsReady] = useState(false);

  // Refs for stable instances (created once)
  const sessionRef = useRef<TerminalSession | null>(null);
  const agentRef = useRef<Agent | null>(null);
  const orchestratorRef = useRef<OrchestratorAgent | null>(null);
  const plannerRef = useRef<PlannerAgent | null>(null);
  const terminalPerceptionRef = useRef<TerminalPerceptionAgent | null>(null);
  const executionAgentRef = useRef<ExecutionAgent | null>(null);

  // Initialize session once
  if (!sessionRef.current) {
    sessionRef.current = new TerminalSession({
      cols: Math.max(20, half - 4),
      rows: Math.max(10, mainHeight - 4),
    });
    sessionRef.current.start();
  }

  // Initialize the global recorder first (needed by both fallback Agent and orchestrator agents)
  const recorderRef = useRef(getAgentRecorder({
    outputDir: "./recordings",
    sessionName: `tui-session-${Date.now()}`,
    writeImmediately: true,
    includePayloads: true,
    consoleLog: options.debug ?? false,
  }));

  // Initialize agent once (with recorder for telemetry)
  if (!agentRef.current) {
    agentRef.current = new Agent({
      provider: options.provider || "anthropic",
      model: options.model,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      recorder: recorderRef.current,
    });
  }

  // Initialize OrchestratorAgent and other agents
  useEffect(() => {
    if (!orchestratorRef.current) {
      // Get the already-created recorder
      const recorder = recorderRef.current;
      recorder.startRecording();

      // Create agents with recorder
      const planner = new PlannerAgent({
        id: "planner",
        name: "Planner",
        debug: options.debug,
        recorder,
      });

      const orchestrator = new OrchestratorAgent({
        id: "orchestrator",
        name: "Orchestrator",
        planner,
        debug: options.debug,
        recorder,
      });

      const terminalPerception = new TerminalPerceptionAgent({
        id: "terminal-perception",
        name: "Terminal Perception",
        debug: options.debug,
        recorder,
      });

      const executionAgent = new ExecutionAgent({
        id: "execution",
        name: "Execution",
        recorder,
      });

      // Store refs
      orchestratorRef.current = orchestrator;
      plannerRef.current = planner;
      terminalPerceptionRef.current = terminalPerception;
      executionAgentRef.current = executionAgent;

      // Initialize and start agents
      Promise.all([
        planner.initialize(),
        orchestrator.initialize(),
        terminalPerception.initialize(),
        executionAgent.initialize(),
      ]).then(() => {
        return Promise.all([
          planner.start(),
          orchestrator.start(),
          terminalPerception.start(),
          executionAgent.start(),
        ]);
      }).then(() => {
        // Connect terminal to perception and execution agents
        if (sessionRef.current) {
          terminalPerception.attachToSession(sessionRef.current);
          executionAgent.attachToSession(sessionRef.current);
        }

        // Subscribe to orchestrator state changes
        orchestrator.on("stateChange", (event: { agentId: string; newState: AgentState }) => {
          setAgentStatuses((prev) => {
            const existing = prev.find((s) => s.agentId === event.agentId);
            if (existing) {
              return prev.map((s) =>
                s.agentId === event.agentId
                  ? { ...s, state: event.newState, lastActivity: Date.now() }
                  : s
              );
            }
            return [...prev, { agentId: event.agentId, state: event.newState, lastActivity: Date.now() }];
          });
        });

        // Register initial agent statuses
        setAgentStatuses([
          { agentId: "orchestrator", state: "idle", lastActivity: Date.now() },
          { agentId: "planner", state: "idle", lastActivity: Date.now() },
          { agentId: "terminal-perception", state: "idle", lastActivity: Date.now() },
          { agentId: "execution", state: "idle", lastActivity: Date.now() },
        ]);

        // Mark agents as ready
        setAgentsReady(true);
      }).catch((err) => {
        setMessages((m) => [...m, { role: "assistant", content: `Agent initialization error: ${err}` }]);
      });
    }

    // Cleanup on unmount
    return () => {
      if (plannerRef.current) {
        plannerRef.current.stop().catch(() => {});
      }
      if (orchestratorRef.current) {
        orchestratorRef.current.stop().catch(() => {});
      }
      if (terminalPerceptionRef.current) {
        terminalPerceptionRef.current.stop().catch(() => {});
      }
      if (executionAgentRef.current) {
        executionAgentRef.current.stop().catch(() => {});
      }
      if (sessionRef.current) {
        sessionRef.current.destroy();
      }
    };
  }, [options.debug]);

  // Resize terminal session when dimensions change
  useEffect(() => {
    if (sessionRef.current) {
      const cols = Math.max(20, half - 4);
      const rows = Math.max(10, mainHeight - 4);
      sessionRef.current.resize(cols, rows);
    }
  }, [half, mainHeight]);

  // Global input handler - handles global shortcuts and pane switching
  useInput(
    (input, key) => {
      // Global shortcuts (available in all panes)
      if (key.ctrl && input === "c") {
        exit();
        return;
      }
      if (key.ctrl && input === "x") {
        // Emergency stop
        if (orchestratorRef.current) {
          orchestratorRef.current.emergencyStop().then(() => {
            setMessages((m) => [...m, { role: "assistant", content: "Emergency stop executed. All operations halted." }]);
            setLoading(false);
            setCurrentGoal(undefined);
          });
        }
        return;
      }
      if (key.tab) {
        setPane((p) => (p === "chat" ? "term" : "chat"));
        return;
      }
      // Help toggle with ? key (available in all panes, when not showing approval modal)
      if (!command && input === "?") {
        setShowHelp((prev) => !prev);
        return;
      }
      // When help is shown, let HelpOverlay handle all keys
      if (showHelp) {
        return;
      }

      // Chat pane specific shortcuts
      if (pane === "chat") {
        // Scroll handlers
        const totalMessages = messages.length;
        const maxScroll = Math.max(0, totalMessages - maxVisibleMessages);
        if (key.upArrow) {
          setScrollOffset((offset) => Math.min(maxScroll, offset + 1));
        } else if (key.downArrow) {
          setScrollOffset((offset) => Math.max(0, offset - 1));
        } else if (key.pageUp) {
          setScrollOffset((offset) => Math.min(maxScroll, offset + maxVisibleMessages));
        } else if (key.pageDown) {
          setScrollOffset((offset) => Math.max(0, offset - maxVisibleMessages));
        }
        // Don't intercept other keys (let TextInput handle them)
        return;
      }

      // Terminal pane - don't intercept any keys (let TerminalPane handle them)
      if (pane === "term") {
        return;
      }
    }
  );

  // Submit chat message - now uses OrchestratorAgent
  const submit = useCallback(async (msg: string) => {
    if (!msg.trim() || loading) return;
    setInput("");
    setLoading(true);
    setGoalResult(null);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setCurrentGoal(msg);

    try {
      if (agentsReady && orchestratorRef.current) {
        const result = await orchestratorRef.current.processGoal(msg, {
          cwd: process.cwd(),
          sessionId: "tui-session",
        });
        setGoalResult(result);
        setMessages((m) => [...m, { role: "assistant", content: result.message }]);
        if (result.error) {
          setMessages((m) => [...m, { role: "assistant", content: `Error: ${result.error}` }]);
        }
      } else if (!agentsReady) {
        // Agents still initializing
        setMessages((m) => [...m, { role: "assistant", content: "Agents are still initializing. Please wait a moment and try again." }]);
      } else {
        // Fallback to old agent if orchestrator not available
        const res = await agentRef.current!.chat(msg, {});
        setMessages((m) => [...m, { role: "assistant", content: res.message }]);
        if (res.proposedCommand) setCommand(res.proposedCommand);
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e}` }]);
    }
    setLoading(false);
    setCurrentGoal(undefined);
  }, [loading, agentsReady]);

  // Calculate visible messages with scroll support
  const maxVisibleMessages = Math.max(3, Math.floor((mainHeight - 4) / 3));
  const totalMessages = messages.length;

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
        <Text dimColor>Tab: switch | Ctrl+C: exit | Ctrl+X: stop | ?: help</Text>
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
              <Text dimColor>Thinking...</Text>
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
            cols={Math.max(20, half - 4)}
            rows={Math.max(10, mainHeight - 4)}
          />
        </Box>
      </Box>

      {/* Agent status panel */}
      <Box
        width={width}
        height={agentPanelHeight}
        borderStyle="single"
        borderColor="gray"
        flexShrink={0}
      >
        <AgentPanel
          statuses={agentStatuses}
          isProcessing={loading}
          currentGoal={currentGoal}
        />
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
          ) : !agentsReady ? (
            <Text color="yellow">Initializing agents...</Text>
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
