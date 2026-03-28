/**
 * @fileoverview BaseAgent - Abstract base class for all multi-agent system agents.
 *
 * This abstract class defines the common interface and lifecycle for all agents
 * in the hierarchical multi-agent system. It provides state management, event
 * emission for state changes, and message handling capabilities.
 *
 * Architecture: Three-tier cognitive architecture (Perception/Cognition/Action)
 * @see docs/architecture/multi-agent-system-final.md
 */

import { EventEmitter } from "events";
import type { AgentRecorder } from "./AgentRecorder";
import { Agent } from "../agent/index.js";

/**
 * Priority levels for agent messages
 */
export type MessagePriority = "low" | "normal" | "high" | "critical";

/**
 * Agent lifecycle states
 */
export type AgentState = "idle" | "running" | "paused" | "error" | "stopped";

/**
 * Standard message interface for inter-agent communication
 */
export interface AgentMessage {
  /** Unique message identifier */
  id: string;

  /** Message type (e.g., 'task.assign', 'query.knowledge', 'event.terminal') */
  type: string;

  /** Sender agent ID */
  sender: string;

  /** Recipient agent ID or 'broadcast' for all agents */
  recipient: string | "broadcast";

  /** Message payload - type-specific data */
  payload: unknown;

  /** Unix timestamp (milliseconds) */
  timestamp: number;

  /** Optional message priority - defaults to 'normal' */
  priority?: MessagePriority;

  /** Optional correlation ID for tracking related messages */
  correlationId?: string;
}

/**
 * Configuration options for BaseAgent initialization
 */
export interface BaseAgentOptions {
  /** Unique identifier for this agent instance */
  id: string;

  /** Human-readable name for this agent */
  name: string;

  /** Optional parent agent ID for hierarchical relationships */
  parentId?: string;

  /** Optional initial state - defaults to 'idle' */
  initialState?: AgentState;

  /** Optional AgentRecorder for activity logging */
  recorder?: AgentRecorder;
}

/**
 * Abstract base class for all agents in the multi-agent system.
 *
 * Provides:
 * - Lifecycle management (initialize, start, pause, resume, stop, cleanup)
 * - State management with event emission
 * - Message handling interface
 * - Event-driven architecture via EventEmitter
 *
 * @example
 * class MyAgent extends BaseAgent {
 *   async handleMessage(message: AgentMessage): Promise<void> {
 *     // Handle incoming messages
 *   }
 * }
 */
export abstract class BaseAgent extends EventEmitter {
  /** Unique agent identifier */
  readonly id: string;

  /** Human-readable agent name */
  readonly name: string;

  /** Optional parent agent ID for hierarchical relationships */
  readonly parentId?: string;

  /** Current agent state */
  private _state: AgentState;

  /** Whether the agent has been initialized */
  private _initialized = false;

  /** Timestamp of last state change */
  private _lastStateChange: number;

  /** Error information if state is 'error' */
  private _errorInfo?: Error;

  /** Optional AgentRecorder for activity logging */
  protected recorder?: AgentRecorder;

  /** LLM agent for making real LLM calls */
  private llmAgent?: Agent;

  /**
   * Process a task with LLM reasoning.
   *
   * This method makes real LLM calls using the Anthropic API to perform
   * reasoning tasks. It tracks token usage via the AgentRecorder.
   *
   * @param prompt - The prompt to send to the LLM
   * @param context - Optional context for the LLM call
   * @returns The LLM response text
   */
  public async processWithLLM(
    prompt: string,
    context?: { terminalOutput?: string; cwd?: string }
  ): Promise<string> {
    // Initialize LLM agent if not already done
    if (!this.llmAgent) {
      this.llmAgent = new Agent({
        provider: "anthropic",
        model: process.env.CHIPILOT_MODEL,
        systemPrompt: `You are ${this.name} (${this.id}) in a multi-agent system for EDA tool automation.
You help with physical design tasks using tools like Cadence Innovus, Genus, and Tempus.
Be concise and practical in your responses.`,
        recorder: this.recorder,
      });
    }

    // Record LLM call start with actual model name
    const modelName = process.env.CHIPILOT_MODEL || "claude-sonnet-4-6-20250514";
    this.recorder?.recordLLMCall(this.id, prompt, modelName);

    const startTime = Date.now();

    try {
      const response = await this.llmAgent.chat(prompt, {
        terminalOutput: context?.terminalOutput,
        cwd: context?.cwd,
      });

      const duration = Date.now() - startTime;

      // Record LLM response with token estimation
      const outputTokens = this.recorder?.estimateTokens(response.message) || 0;
      const inputTokens = this.recorder?.estimateTokens(prompt) || 0;

      this.recorder?.recordLLMResponse(
        this.id,
        response.message,
        { input: inputTokens, output: outputTokens },
        undefined,
        duration
      );

      return response.message;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.recorder?.recordError(this.id, `LLM call failed: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Creates a new BaseAgent instance.
   *
   * @param options - Configuration options for the agent
   */
  constructor(options: BaseAgentOptions) {
    super();

    this.id = options.id;
    this.name = options.name;
    this.parentId = options.parentId;
    this._state = options.initialState ?? "idle";
    this._lastStateChange = Date.now();
    this.recorder = options.recorder;

    // Set up event emitter to handle more listeners for high-throughput agents
    this.setMaxListeners(50);
  }

  /**
   * Gets the current agent state.
   */
  get state(): AgentState {
    return this._state;
  }

  /**
   * Gets whether the agent has been initialized.
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Gets the timestamp of the last state change.
   */
  get lastStateChange(): number {
    return this._lastStateChange;
  }

  /**
   * Gets error information if the agent is in an error state.
   */
  get errorInfo(): Error | undefined {
    return this._errorInfo;
  }

  /**
   * Gets whether the agent is currently running.
   */
  get isRunning(): boolean {
    return this._state === "running";
  }

  /**
   * Logs a message with the specified level.
   *
   * @param level - Log level (debug, info, warn, error)
   * @param args - Arguments to log
   */
  protected log(level: "debug" | "info" | "warn" | "error", ...args: unknown[]): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${this.name}:${level.toUpperCase()}] ${timestamp}`;
    console.log(prefix, ...args);
  }

  /**
   * Initializes the agent.
   *
   * Sets up necessary resources, connections, and state.
   * Must be called before start().
   *
   * @throws Error if agent is already initialized or in an invalid state
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      throw new Error(`Agent ${this.id} is already initialized`);
    }

    if (this._state === "stopped") {
      throw new Error(`Agent ${this.id} has been stopped and cannot be reinitialized`);
    }

    await this.onInitialize();

    this._initialized = true;
    this.emit("initialized", { agentId: this.id, timestamp: Date.now() });
  }

  /**
   * Starts the agent.
   *
   * Transitions the agent to the 'running' state and begins processing.
   * Requires initialize() to be called first.
   *
   * @throws Error if agent is not initialized or in an invalid state
   */
  async start(): Promise<void> {
    if (!this._initialized) {
      throw new Error(`Agent ${this.id} must be initialized before starting`);
    }

    if (this._state === "running") {
      return; // Already running
    }

    if (this._state === "stopped") {
      throw new Error(`Agent ${this.id} has been stopped and cannot be restarted`);
    }

    await this.onStart();
    this.transitionState("running");
  }

  /**
   * Pauses the agent.
   *
   * Transitions the agent to the 'paused' state.
   * Processing should be temporarily suspended.
   *
   * @throws Error if agent is not running
   */
  async pause(): Promise<void> {
    if (this._state !== "running") {
      throw new Error(`Agent ${this.id} cannot be paused from state '${this._state}'`);
    }

    await this.onPause();
    this.transitionState("paused");
  }

  /**
   * Resumes the agent.
   *
   * Transitions the agent from 'paused' back to 'running'.
   *
   * @throws Error if agent is not paused
   */
  async resume(): Promise<void> {
    if (this._state !== "paused") {
      throw new Error(`Agent ${this.id} cannot be resumed from state '${this._state}'`);
    }

    await this.onResume();
    this.transitionState("running");
  }

  /**
   * Stops the agent.
   *
   * Transitions the agent to the 'stopped' state.
   * Processing is terminated and resources may be released.
   * This is a terminal state - the agent cannot be restarted.
   */
  async stop(): Promise<void> {
    if (this._state === "stopped") {
      return; // Already stopped
    }

    await this.onStop();
    this.transitionState("stopped");
  }

  /**
   * Cleans up agent resources.
   *
   * Releases all resources, connections, and state.
   * Should be called after stop() for proper cleanup.
   * This is a terminal operation.
   */
  async cleanup(): Promise<void> {
    // Allow cleanup from error state or stopped state
    if (this._state !== "stopped" && this._state !== "error") {
      // Auto-stop if not already stopped
      await this.stop();
    }

    await this.onCleanup();

    this._initialized = false;
    this.removeAllListeners();
    this.emit("cleanedup", { agentId: this.id, timestamp: Date.now() });
  }

  /**
   * Reset agent state from error back to idle.
   *
   * This allows recovery from error state without full re-initialization.
   * Should be called when the error condition has been resolved.
   *
   * @throws Error if agent is not in error state
   */
  async resetState(): Promise<void> {
    if (this._state !== "error") {
      throw new Error(`Agent ${this.id} can only reset from 'error' state, currently in '${this._state}'`);
    }

    this._errorInfo = undefined;
    this.transitionState("idle");
  }

  /**
   * Sends a message to another agent.
   *
   * This method will be integrated with the MessageBus.
   * For now, it emits a 'sendMessage' event that can be intercepted.
   *
   * @param message - The message to send (recipient, type, payload required)
   * @throws Error if agent is not running
   */
  sendMessage(
    message: Omit<AgentMessage, "id" | "sender" | "timestamp">,
  ): void {
    if (!this.isRunning && this._state !== "paused") {
      throw new Error(`Agent ${this.id} cannot send messages while in '${this._state}' state`);
    }

    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      sender: this.id,
      timestamp: Date.now(),
      priority: message.priority ?? "normal",
    };

    // Emit event for MessageBus integration
    this.emit("sendMessage", fullMessage);
  }

  /**
   * Receives and handles a message.
   *
   * This method is called by the MessageBus when a message is delivered.
   * Validates the message and delegates to the abstract handleMessage method.
   *
   * @param message - The received message
   * @throws Error if agent is not running or paused
   */
  async receiveMessage(message: AgentMessage): Promise<void> {
    if (!this.isRunning && this._state !== "paused") {
      throw new Error(
        `Agent ${this.id} cannot receive messages while in '${this._state}' state`,
      );
    }

    // Validate message
    if (!message.id || !message.type || !message.sender) {
      throw new Error("Invalid message format: missing required fields");
    }

    try {
      await this.handleMessage(message);
    } catch (error) {
      this.handleError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Abstract method to handle incoming messages.
   *
   * Subclasses must implement this to define their message handling logic.
   * Called by receiveMessage() after validation.
   *
   * @param message - The message to handle
   */
  abstract handleMessage(message: AgentMessage): Promise<void>;

  /**
   * Lifecycle hook called during initialize().
   *
   * Subclasses can override this to perform custom initialization.
   * Called before the initialized event is emitted.
   */
  protected async onInitialize(): Promise<void> {
    // Default: no-op. Override in subclass if needed.
  }

  /**
   * Lifecycle hook called during start().
   *
   * Subclasses can override this to perform custom start logic.
   * Called before the state transition to 'running'.
   */
  protected async onStart(): Promise<void> {
    // Default: no-op. Override in subclass if needed.
  }

  /**
   * Lifecycle hook called during pause().
   *
   * Subclasses can override this to perform custom pause logic.
   * Called before the state transition to 'paused'.
   */
  protected async onPause(): Promise<void> {
    // Default: no-op. Override in subclass if needed.
  }

  /**
   * Lifecycle hook called during resume().
   *
   * Subclasses can override this to perform custom resume logic.
   * Called before the state transition to 'running'.
   */
  protected async onResume(): Promise<void> {
    // Default: no-op. Override in subclass if needed.
  }

  /**
   * Lifecycle hook called during stop().
   *
   * Subclasses can override this to perform custom stop logic.
   * Called before the state transition to 'stopped'.
   */
  protected async onStop(): Promise<void> {
    // Default: no-op. Override in subclass if needed.
  }

  /**
   * Lifecycle hook called during cleanup().
   *
   * Subclasses can override this to perform custom cleanup logic.
   * Called after stop() but before listeners are removed.
   */
  protected async onCleanup(): Promise<void> {
    // Default: no-op. Override in subclass if needed.
  }

  /**
   * Handles errors that occur during message processing.
   *
   * Transitions the agent to the 'error' state and emits an error event.
   *
   * @param error - The error that occurred
   */
  protected handleError(error: Error): void {
    this._errorInfo = error;
    this.transitionState("error");
    this.emit("error", { agentId: this.id, error, timestamp: Date.now() });
  }

  /**
   * Transitions the agent to a new state.
   *
   * Emits a 'stateChange' event with the old and new states.
   *
   * @param newState - The state to transition to
   */
  private transitionState(newState: AgentState): void {
    const oldState = this._state;
    this._state = newState;
    this._lastStateChange = Date.now();

    this.emit("stateChange", {
      agentId: this.id,
      oldState,
      newState,
      timestamp: this._lastStateChange,
    });

    // Record state change in AgentRecorder
    this.recorder?.recordStateChange(this.id, oldState, newState, { timestamp: this._lastStateChange });
  }

  /**
   * Generates a unique message ID.
   *
   * @returns A unique message identifier
   */
  private generateMessageId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default BaseAgent;
