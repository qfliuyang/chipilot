/**
 * @fileoverview TerminalPerceptionAgent - Real-time terminal state analysis for EDA tools
 *
 * This agent monitors terminal output to detect EDA tool prompts, parse tool states,
 * and emit structured events for other agents to consume. It serves as the perception
 * layer for the multi-agent system, translating raw terminal output into meaningful
 * state information.
 *
 * Architecture: Three-tier cognitive architecture (Perception Layer)
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage as BaseAgentMessage, BaseAgentOptions } from "./BaseAgent";
import { MessageBus, AgentId, getMessageBus, AgentMessage as BusAgentMessage } from "./MessageBus";
import { TerminalSession } from "../terminal/session";
import { VirtualTerminal } from "../terminal/virtual";

/**
 * Detected prompt types from EDA tools and shells
 */
export type PromptType =
  | "shell"
  | "tcl"
  | "innovus"
  | "genus"
  | "tempus"
  | "icc2"
  | "openroad"
  | "unknown";

/**
 * Terminal state as perceived by the agent
 */
export type TerminalState = "ready" | "busy" | "error" | "unknown";

/**
 * Event payload for terminal state changes
 */
export interface TerminalStateEvent {
  state: TerminalState;
  promptType: PromptType;
  promptText?: string;
  timestamp: number;
  sessionId?: string;
}

/**
 * Event payload for command completion
 */
export interface CommandCompleteEvent {
  output: string;
  exitCode?: number;
  timestamp: number;
  duration?: number;
}

/**
 * Event payload for error detection
 */
export interface ErrorDetectedEvent {
  error: string;
  errorType: "syntax" | "tool" | "resource" | "logic" | "unknown";
  timestamp: number;
  context?: string;
}

/**
 * Configuration options for TerminalPerceptionAgent
 */
export interface TerminalPerceptionOptions extends BaseAgentOptions {
  /** VirtualTerminal instance for rendering output */
  virtualTerminal?: VirtualTerminal;
  /** MessageBus instance (defaults to global) */
  messageBus?: MessageBus;
  /** Buffer size for output history (default: 10000 chars) */
  bufferSize?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * EDA tool prompt patterns for detection
 */
const EDA_PROMPT_PATTERNS: Record<PromptType, RegExp> = {
  // Cadence Innovus
  innovus: /(?:innovus|encounter)\s*>\s*$/i,

  // Cadence Genus
  genus: /(?:genus|rc:)\s*>\s*$/i,

  // Cadence Tempus / PrimeTime
  tempus: /(?:tempus|pt_shell)\s*>\s*$/i,

  // Synopsys ICC2
  icc2: /(?:icc2_shell|icc2)\s*>\s*$/i,

  // OpenROAD
  openroad: /openroad\s*>\s*$/i,

  // Generic TCL
  tcl: /%\s*$/,

  // Shell prompts (various)
  shell: /(?:[$#%>]|\w+@[\w-]+[:~][$#]|\[.*\][$#])\s*$/,

  // Unknown/no match
  unknown: /(?!)/, // Never matches
};

/**
 * Error patterns for detection
 */
const ERROR_PATTERNS: Array<{ pattern: RegExp; type: ErrorDetectedEvent["errorType"] }> = [
  { pattern: /error:|ERROR:|Error:/i, type: "tool" },
  { pattern: /syntax error|invalid command|unknown command/i, type: "syntax" },
  { pattern: /cannot allocate|out of memory|resource unavailable/i, type: "resource" },
  { pattern: /violation|failed|failure|abort/i, type: "logic" },
  { pattern: /segmentation fault|segfault|core dumped/i, type: "tool" },
];

/**
 * TerminalPerceptionAgent - Monitors terminal output and detects EDA tool states
 *
 * Responsibilities:
 * - Parse terminal output (ANSI sequences, tool prompts)
 * - Detect EDA tool states (Innovus, Genus, Tempus, etc.)
 * - Extract structured data from logs
 * - Monitor command execution progress
 * - Emit events: terminal:ready, terminal:busy, terminal:error
 *
 * @example
 * const agent = new TerminalPerceptionAgent({
 *   id: "terminal-perception",
 *   name: "Terminal Perception Agent"
 * });
 * await agent.initialize();
 * await agent.start();
 * agent.attachToSession(terminalSession);
 */
export class TerminalPerceptionAgent extends BaseAgent {
  private terminalSession?: TerminalSession;
  private virtualTerminal?: VirtualTerminal;
  private messageBus: MessageBus;
  private bufferSize: number;
  private debug: boolean;

  // State tracking
  private currentState: TerminalState = "unknown";
  private currentPromptType: PromptType = "unknown";
  private outputBuffer = "";
  private lastPromptTime?: number;
  private commandStartTime?: number;

  // Session tracking
  private sessionOutputHandler?: (data: string) => void;

  constructor(options: TerminalPerceptionOptions) {
    super(options);

    this.virtualTerminal = options.virtualTerminal;
    this.messageBus = options.messageBus ?? getMessageBus();
    this.bufferSize = options.bufferSize ?? 10000;
    this.debug = options.debug ?? false;
  }

  /**
   * Attaches the agent to a TerminalSession for monitoring
   *
   * Sets up event listeners to capture terminal output and analyze
   * it for EDA tool prompts and state changes.
   *
   * @param session - The TerminalSession to monitor
   */
  attachToSession(session: TerminalSession): void {
    if (this.terminalSession) {
      this.detachFromSession();
    }

    this.terminalSession = session;

    // Create bound handler so we can remove it later
    this.sessionOutputHandler = this.handleTerminalOutput.bind(this);
    session.on("output", this.sessionOutputHandler);

    this.log("debug", `Attached to terminal session: ${session.getShell()}`);

    // Emit attachment event
    this.emit("sessionAttached", {
      agentId: this.id,
      sessionId: session.getShell(),
      timestamp: Date.now(),
    });

    // Broadcast via MessageBus
    this.broadcastEvent("event.terminal", {
      event: "sessionAttached",
      sessionId: session.getShell(),
    });
  }

  /**
   * Detaches from the current terminal session
   */
  detachFromSession(): void {
    if (this.terminalSession && this.sessionOutputHandler) {
      this.terminalSession.off("output", this.sessionOutputHandler);
      this.log("debug", "Detached from terminal session");
    }

    this.terminalSession = undefined;
    this.sessionOutputHandler = undefined;
  }

  /**
   * Detects the type of prompt from terminal output
   *
   * Analyzes the output string to identify which EDA tool or shell
   * prompt is present. Returns the most specific match found.
   *
   * @param output - The terminal output to analyze
   * @returns The detected prompt type
   */
  detectPromptType(output: string): PromptType {
    // Check for EDA tool prompts first (more specific)
    const toolPrompts: PromptType[] = [
      "innovus",
      "genus",
      "tempus",
      "icc2",
      "openroad",
      "tcl",
    ];

    for (const promptType of toolPrompts) {
      if (EDA_PROMPT_PATTERNS[promptType].test(output)) {
        return promptType;
      }
    }

    // Check for generic shell prompt
    if (EDA_PROMPT_PATTERNS.shell.test(output)) {
      return "shell";
    }

    return "unknown";
  }

  /**
   * Extracts the prompt text from output
   *
   * @param output - The terminal output
   * @returns The detected prompt text or undefined
   */
  extractPromptText(output: string): string | undefined {
    const lines = output.split("\n");
    const lastLine = lines[lines.length - 1]?.trim();

    if (!lastLine) return undefined;

    // Check if last line looks like a prompt
    for (const [type, pattern] of Object.entries(EDA_PROMPT_PATTERNS)) {
      if (type !== "unknown" && pattern.test(lastLine)) {
        return lastLine;
      }
    }

    return undefined;
  }

  /**
   * Gets the current terminal state
   */
  getTerminalState(): TerminalState {
    return this.currentState;
  }

  /**
   * Gets the current prompt type
   */
  getPromptType(): PromptType {
    return this.currentPromptType;
  }

  /**
   * Gets the current output buffer
   */
  getOutputBuffer(): string {
    return this.outputBuffer;
  }

  /**
   * Clears the output buffer
   */
  clearBuffer(): void {
    this.outputBuffer = "";
  }

  /**
   * Handles incoming messages from other agents
   *
   * Processes messages requesting terminal state information
   * or commanding the agent to perform actions.
   *
   * @param message - The message to handle
   */
  async handleMessage(message: BaseAgentMessage): Promise<void> {
    this.log("debug", `Received message: ${message.type} from ${message.sender}`);

    switch (message.type) {
      case "task.assign": {
        // Handle task assignment from planner
        const payload = message.payload as {
          taskId: string;
          planId: string;
          taskType: string;
          description: string;
          payload: unknown;
        };

        // Respond with current terminal state for perceive tasks
        this.sendMessage({
          recipient: message.sender,
          type: "task.complete",
          payload: {
            taskId: payload.taskId,
            planId: payload.planId,
            result: {
              state: this.currentState,
              promptType: this.currentPromptType,
              outputBuffer: this.outputBuffer.slice(-1000), // Last 1000 chars
              timestamp: Date.now(),
            },
          },
          correlationId: message.correlationId,
        });
        break;
      }

      case "query.terminal.state":
        // Respond with current terminal state
        this.sendMessage({
          recipient: message.sender,
          type: "response.terminal.state",
          payload: {
            state: this.currentState,
            promptType: this.currentPromptType,
            timestamp: Date.now(),
          },
          correlationId: message.correlationId,
        });
        break;

      case "command.clearBuffer":
        this.clearBuffer();
        this.sendMessage({
          recipient: message.sender,
          type: "response.buffer.cleared",
          payload: { timestamp: Date.now() },
          correlationId: message.correlationId,
        });
        break;

      default:
        this.log("debug", `Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Called when the terminal is ready for input
   *
   * Emits state change events and broadcasts to MessageBus
   */
  protected onTerminalReady(): void {
    const previousState = this.currentState;
    this.currentState = "ready";
    this.lastPromptTime = Date.now();

    const event: TerminalStateEvent = {
      state: this.currentState,
      promptType: this.currentPromptType,
      promptText: this.extractPromptText(this.outputBuffer),
      timestamp: Date.now(),
      sessionId: this.terminalSession?.getShell(),
    };

    this.emit("terminal:ready", event);
    this.broadcastEvent("event.terminal", {
      event: "terminal:ready",
      ...event,
    });

    // Calculate command duration if we were busy
    if (previousState === "busy" && this.commandStartTime) {
      const duration = Date.now() - this.commandStartTime;
      this.onCommandComplete(this.outputBuffer, duration);
    }

    this.log("debug", `Terminal ready (${this.currentPromptType})`);
  }

  /**
   * Called when the terminal is busy processing
   *
   * Emits state change events and broadcasts to MessageBus
   */
  protected onTerminalBusy(): void {
    if (this.currentState === "busy") return;

    this.currentState = "busy";
    this.commandStartTime = Date.now();

    const event: TerminalStateEvent = {
      state: this.currentState,
      promptType: this.currentPromptType,
      timestamp: Date.now(),
      sessionId: this.terminalSession?.getShell(),
    };

    this.emit("terminal:busy", event);
    this.broadcastEvent("event.terminal", {
      event: "terminal:busy",
      ...event,
    });

    this.log("debug", "Terminal busy");
  }

  /**
   * Called when a command completes
   *
   * Emits completion event with output and duration
   *
   * @param output - The command output
   * @param duration - Execution duration in milliseconds
   */
  protected onCommandComplete(output: string, duration?: number): void {
    const event: CommandCompleteEvent = {
      output,
      timestamp: Date.now(),
      duration,
    };

    this.emit("terminal:complete", event);
    this.broadcastEvent("event.terminal", {
      event: "terminal:complete",
      ...event,
    });

    this.log("debug", `Command completed in ${duration}ms`);
  }

  /**
   * Called when an error is detected in terminal output
   *
   * Emits error event with classification
   *
   * @param error - The error text
   * @param context - Additional context around the error
   */
  protected onErrorDetected(error: string, context?: string): void {
    this.currentState = "error";

    const errorType = this.classifyError(error);

    const event: ErrorDetectedEvent = {
      error,
      errorType,
      timestamp: Date.now(),
      context,
    };

    this.emit("terminal:error", event);
    this.broadcastEvent("event.terminal", {
      event: "terminal:error",
      ...event,
    });

    // Also send recovery request for tool/resource errors
    if (errorType === "tool" || errorType === "resource") {
      this.sendMessage({
        recipient: "recovery",
        type: "recovery.request",
        payload: {
          error,
          errorType,
          source: "terminal",
          timestamp: Date.now(),
        },
        priority: "high",
      });
    }

    this.log("debug", `Error detected (${errorType}): ${error.substring(0, 100)}`);
  }

  /**
   * Lifecycle hook: Called during initialization
   */
  protected async onInitialize(): Promise<void> {
    this.log("info", "TerminalPerceptionAgent initializing");

    // Register with MessageBus
    this.messageBus.registerAgent("terminal-perception" as AgentId, async (message) => {
      // Convert MessageBus format to BaseAgent format
      const convertedMessage: BaseAgentMessage = {
        id: message.id,
        type: message.type,
        sender: message.from,
        recipient: message.to === "broadcast" ? "broadcast" : message.to,
        payload: message.payload,
        timestamp: message.timestamp,
        priority: message.priority,
        correlationId: message.correlationId,
      };
      await this.receiveMessage(convertedMessage);
    });

    // Set up event forwarding from BaseAgent to MessageBus
    this.on("sendMessage", (message: BaseAgentMessage) => {
      // Convert BaseAgent format to MessageBus format
      const busMessage: BusAgentMessage = {
        id: message.id,
        from: message.sender as AgentId,
        to: message.recipient === "broadcast" ? "broadcast" : (message.recipient as AgentId),
        type: message.type as import("./MessageBus").MessageType,
        payload: message.payload,
        timestamp: message.timestamp,
        priority: message.priority ?? "normal",
        correlationId: message.correlationId,
      };
      this.messageBus.send(busMessage).catch((err) => {
        this.log("error", "Failed to send message via MessageBus:", err);
      });
    });
  }

  /**
   * Lifecycle hook: Called when starting
   */
  protected async onStart(): Promise<void> {
    this.log("info", "TerminalPerceptionAgent started");
  }

  /**
   * Lifecycle hook: Called when pausing
   */
  protected async onPause(): Promise<void> {
    this.log("info", "TerminalPerceptionAgent paused");
  }

  /**
   * Lifecycle hook: Called when resuming
   */
  protected async onResume(): Promise<void> {
    this.log("info", "TerminalPerceptionAgent resumed");
  }

  /**
   * Lifecycle hook: Called when stopping
   */
  protected async onStop(): Promise<void> {
    this.log("info", "TerminalPerceptionAgent stopping");
    this.detachFromSession();
  }

  /**
   * Lifecycle hook: Called during cleanup
   */
  protected async onCleanup(): Promise<void> {
    this.log("info", "TerminalPerceptionAgent cleaning up");

    // Unregister from MessageBus
    this.messageBus.unregisterAgent("terminal-perception" as AgentId);

    // Clear buffers
    this.outputBuffer = "";
    this.virtualTerminal = undefined;
  }

  /**
   * Handles terminal output from the session
   *
   * @param data - Raw output data from terminal
   */
  private handleTerminalOutput(data: string): void {
    // Update output buffer
    this.outputBuffer += data;

    // Trim buffer if it exceeds size limit
    if (this.outputBuffer.length > this.bufferSize) {
      this.outputBuffer = this.outputBuffer.slice(-this.bufferSize);
    }

    // Update virtual terminal if available
    if (this.virtualTerminal) {
      this.virtualTerminal.write(data);
    }

    // Analyze output for state changes
    this.analyzeOutput(data);
  }

  /**
   * Analyzes terminal output for prompts and errors
   *
   * @param data - The output data to analyze
   */
  private analyzeOutput(data: string): void {
    // Check for errors in the new data
    for (const { pattern } of ERROR_PATTERNS) {
      if (pattern.test(data)) {
        // Extract error context (lines around the error)
        const lines = this.outputBuffer.split("\n");
        const errorLineIndex = lines.findIndex((line) => pattern.test(line));
        const contextLines = lines.slice(
          Math.max(0, errorLineIndex - 2),
          Math.min(lines.length, errorLineIndex + 3)
        );

        this.onErrorDetected(data, contextLines.join("\n"));
        break; // Only report first error type found
      }
    }

    // Check for prompt at end of buffer
    const promptType = this.detectPromptType(this.outputBuffer);

    if (promptType !== "unknown") {
      // Prompt detected - terminal is ready
      if (this.currentPromptType !== promptType || this.currentState !== "ready") {
        this.currentPromptType = promptType;
        this.onTerminalReady();
      }
    } else {
      // No prompt detected - terminal is likely busy
      if (this.currentState === "ready") {
        this.onTerminalBusy();
      }
    }
  }

  /**
   * Classifies an error based on its content
   *
   * @param error - The error text
   * @returns The classified error type
   */
  private classifyError(error: string): ErrorDetectedEvent["errorType"] {
    for (const { pattern, type } of ERROR_PATTERNS) {
      if (pattern.test(error)) {
        return type;
      }
    }
    return "unknown";
  }

  /**
   * Broadcasts an event to the MessageBus
   *
   * @param type - The event type
   * @param payload - The event payload
   */
  private broadcastEvent(type: string, payload: unknown): void {
    const eventMessage: BusAgentMessage = {
      id: `${this.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      from: "terminal-perception" as AgentId,
      to: "broadcast",
      type: type as import("./MessageBus").MessageType,
      payload,
      timestamp: Date.now(),
      priority: "normal",
    };

    this.messageBus
      .broadcast(eventMessage)
      .catch((err) => {
        this.log("error", "Failed to broadcast event:", err);
      });
  }

  /**
   * Logs debug messages if debug mode is enabled
   *
   * @param level - Log level
   * @param args - Arguments to log
   */
  private log(level: "debug" | "info" | "warn" | "error", ...args: unknown[]): void {
    if (!this.debug && level === "debug") return;

    const timestamp = new Date().toISOString();
    const prefix = `[TerminalPerception:${level.toUpperCase()}] ${timestamp}`;

    console.log(prefix, ...args);
  }
}

export default TerminalPerceptionAgent;
