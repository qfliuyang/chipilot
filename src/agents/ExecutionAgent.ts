/**
 * @fileoverview ExecutionAgent - Resource management and safe command execution.
 *
 * This agent manages terminal sessions and compute resources, implementing
 * safety checks before command execution, handling resource contention and
 * queuing, and maintaining execution checkpoints for rollback.
 *
 * Architecture: Section 2.3 - Specialist Layer (Execution Agent)
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions } from "./BaseAgent";
import { TerminalSession } from "../terminal/session";
import { AgentId, MessagePriority, MessageBus, AgentMessage as BusAgentMessage } from "./MessageBus";

/**
 * Options for command execution
 */
export interface ExecutionOptions {
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Whether to wait for command completion (default: true) */
  waitForCompletion?: boolean;
  /** Additional environment variables for this command */
  env?: Record<string, string>;
  /** Working directory for command execution */
  cwd?: string;
  /** Whether this is a TCL command requiring special output handling */
  isTclCommand?: boolean;
  /** Priority level for command execution */
  priority?: MessagePriority;
  /** Correlation ID for tracking related commands */
  correlationId?: string;
}

/**
 * Result of command execution
 */
export interface ExecutionResult {
  /** The command that was executed */
  command: string;
  /** Combined stdout and stderr output */
  output: string;
  /** Exit code if available */
  exitCode?: number;
  /** Execution duration in milliseconds */
  duration: number;
  /** Whether execution was successful */
  success: boolean;
  /** Error message if execution failed */
  error?: string;
  /** Timestamp when execution completed */
  timestamp: number;
}

/**
 * Queued command waiting for execution
 */
interface QueuedCommand {
  id: string;
  command: string;
  options: ExecutionOptions;
  resolve: (result: ExecutionResult) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * Terminal state tracked by ExecutionAgent
 */
interface TerminalState {
  /** Whether terminal is ready for input */
  isReady: boolean;
  /** Whether a command is currently executing */
  isExecuting: boolean;
  /** Current prompt detected */
  currentPrompt?: string;
  /** Last output received */
  lastOutput: string;
  /** Timestamp of last activity */
  lastActivity: number;
}

/**
 * Execution checkpoint for rollback capability
 */
interface ExecutionCheckpoint {
  id: string;
  timestamp: number;
  command: string;
  outputSnapshot: string;
  terminalState: TerminalState;
}

/**
 * ExecutionAgent - Manages PTY resources and executes verified commands.
 *
 * Responsibilities:
 * - Manage terminal sessions and compute resources
 * - Implement safety checks before command execution
 * - Handle resource contention and queuing
 * - Maintain execution checkpoints for rollback
 *
 * @example
 * const executionAgent = new ExecutionAgent({ id: "execution", name: "Execution Agent" });
 * await executionAgent.initialize();
 * executionAgent.attachToSession(terminalSession);
 * const result = await executionAgent.execute("echo hello");
 */
export class ExecutionAgent extends BaseAgent {
  private terminalSession: TerminalSession | null = null;
  private commandQueue: QueuedCommand[] = [];
  private currentExecution: QueuedCommand | null = null;
  private terminalState: TerminalState;
  private outputBuffer: string = "";
  private checkpoints: Map<string, ExecutionCheckpoint> = new Map();
  private executionHistory: ExecutionResult[] = [];
  private maxHistorySize: number = 100;
  private messageBus?: MessageBus;

  // Event handlers bound for cleanup
  private boundOnOutput: (data: string) => void;
  private boundOnExit: (data: { exitCode: number; signal?: number }) => void;

  constructor(options: BaseAgentOptions & { messageBus?: MessageBus }) {
    super(options);

    this.messageBus = options.messageBus;
    this.terminalState = {
      isReady: false,
      isExecuting: false,
      lastOutput: "",
      lastActivity: Date.now(),
    };

    // Bind event handlers for cleanup
    this.boundOnOutput = this.onTerminalOutput.bind(this);
    this.boundOnExit = this.onTerminalExit.bind(this);
  }

  /**
   * Attaches this agent to a TerminalSession for command execution.
   * @param session - The TerminalSession to attach to
   */
  attachToSession(session: TerminalSession): void {
    // Detach from previous session if any
    if (this.terminalSession) {
      this.detachFromSession();
    }

    this.terminalSession = session;

    // Set up event listeners
    this.terminalSession.on("output", this.boundOnOutput);
    this.terminalSession.on("exit", this.boundOnExit);

    this.emit("sessionAttached", {
      agentId: this.id,
      sessionId: session.constructor.name,
      timestamp: Date.now(),
    });

    // Process any queued commands
    this.processQueue();
  }

  /**
   * Detaches from the current TerminalSession.
   */
  detachFromSession(): void {
    if (!this.terminalSession) {
      return;
    }

    // Remove event listeners
    this.terminalSession.off("output", this.boundOnOutput);
    this.terminalSession.off("exit", this.boundOnExit);

    this.emit("sessionDetached", {
      agentId: this.id,
      timestamp: Date.now(),
    });

    this.terminalSession = null;
    this.terminalState.isReady = false;
    this.terminalState.isExecuting = false;
  }

  /**
   * Executes a verified command in the terminal.
   * @param command - The command to execute
   * @param options - Execution options
   * @returns Promise resolving to execution result
   */
  async execute(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<ExecutionResult> {
    if (!this.isRunning) {
      throw new Error(`ExecutionAgent ${this.id} is not running`);
    }

    if (!this.terminalSession) {
      throw new Error("No terminal session attached");
    }

    // Validate command (basic safety check)
    this.validateCommand(command);

    const timeout = options.timeout ?? 30000;
    const waitForCompletion = options.waitForCompletion ?? true;

    return new Promise((resolve, reject) => {
      const queuedCommand: QueuedCommand = {
        id: this.generateExecutionId(),
        command,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      if (waitForCompletion) {
        // Queue for execution when terminal is ready
        this.commandQueue.push(queuedCommand);
        this.processQueue();

        // Set up timeout
        setTimeout(() => {
          const index = this.commandQueue.findIndex(
            (cmd) => cmd.id === queuedCommand.id
          );
          if (index !== -1) {
            this.commandQueue.splice(index, 1);
            reject(
              new Error(`Command execution timed out after ${timeout}ms`)
            );
          }
        }, timeout);
      } else {
        // Fire and forget - execute immediately without waiting
        this.executeCommand(queuedCommand);
        resolve({
          command,
          output: "",
          duration: 0,
          success: true,
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Queues a command for execution when the terminal is ready.
   * @param command - The command to queue
   * @param options - Execution options
   * @returns Promise that resolves when command is queued
   */
  async queueCommand(
    command: string,
    options: ExecutionOptions = {}
  ): Promise<void> {
    if (!this.terminalSession) {
      throw new Error("No terminal session attached");
    }

    this.validateCommand(command);

    const queuedCommand: QueuedCommand = {
      id: this.generateExecutionId(),
      command,
      options,
      resolve: () => {},
      reject: () => {},
      timestamp: Date.now(),
    };

    this.commandQueue.push(queuedCommand);
    this.processQueue();
  }

  /**
   * Waits for the current command to complete.
   * @param timeout - Maximum time to wait in milliseconds
   * @returns Promise resolving to command output
   */
  async waitForCompletion(timeout: number = 30000): Promise<string> {
    if (!this.currentExecution) {
      return this.outputBuffer;
    }

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (!this.currentExecution) {
          clearInterval(checkInterval);
          resolve(this.outputBuffer);
          return;
        }

        if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error(`Wait for completion timed out after ${timeout}ms`));
        }
      }, 100);
    });
  }

  /**
   * Creates an execution checkpoint for potential rollback.
   * @param checkpointId - Unique identifier for this checkpoint
   */
  createCheckpoint(checkpointId: string): void {
    const checkpoint: ExecutionCheckpoint = {
      id: checkpointId,
      timestamp: Date.now(),
      command: this.currentExecution?.command ?? "",
      outputSnapshot: this.outputBuffer,
      terminalState: { ...this.terminalState },
    };

    this.checkpoints.set(checkpointId, checkpoint);

    this.emit("checkpointCreated", {
      agentId: this.id,
      checkpointId,
      timestamp: checkpoint.timestamp,
    });
  }

  /**
   * Restores terminal state to a previous checkpoint.
   * @param checkpointId - The checkpoint to restore
   * @returns Whether restoration was successful
   */
  restoreCheckpoint(checkpointId: string): boolean {
    const checkpoint = this.checkpoints.get(checkpointId);
    if (!checkpoint) {
      return false;
    }

    this.terminalState = { ...checkpoint.terminalState };
    this.outputBuffer = checkpoint.outputSnapshot;

    this.emit("checkpointRestored", {
      agentId: this.id,
      checkpointId,
      timestamp: Date.now(),
    });

    return true;
  }

  /**
   * Gets the current terminal state.
   */
  getTerminalState(): TerminalState {
    return { ...this.terminalState };
  }

  /**
   * Gets execution history.
   * @param limit - Maximum number of results to return
   */
  getExecutionHistory(limit?: number): ExecutionResult[] {
    const history = [...this.executionHistory];
    if (limit && limit > 0) {
      return history.slice(-limit);
    }
    return history;
  }

  /**
   * Clears execution history.
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Handles incoming messages from other agents.
   * @param message - The message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case "task.assign":
        await this.handleTaskAssign(message);
        break;

      case "event.terminal":
        await this.handleTerminalEvent(message);
        break;

      case "recovery.request":
        await this.handleRecoveryRequest(message);
        break;

      default:
        // Unknown message type - log but don't error
        this.emit("messageIgnored", {
          agentId: this.id,
          messageType: message.type,
          timestamp: Date.now(),
        });
    }
  }

  /**
   * Lifecycle hook called during initialization.
   */
  protected async onInitialize(): Promise<void> {
    // Register with MessageBus if available
    if (this.messageBus) {
      this.messageBus.registerAgent("execution" as AgentId, async (message) => {
        // Convert MessageBus format to BaseAgent format
        const convertedMessage: AgentMessage = {
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
      this.on("sendMessage", (message: AgentMessage) => {
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
        this.messageBus!.send(busMessage).catch((err) => {
          console.error("[ExecutionAgent] Failed to send message via MessageBus:", err);
        });
      });
    }
  }

  /**
   * Lifecycle hook called during cleanup.
   */
  protected async onCleanup(): Promise<void> {
    this.detachFromSession();
    this.commandQueue = [];
    this.currentExecution = null;
    this.checkpoints.clear();
    this.executionHistory = [];
  }

  // Private helper methods

  private onTerminalOutput(data: string): void {
    this.outputBuffer += data;
    this.terminalState.lastOutput = data;
    this.terminalState.lastActivity = Date.now();

    // Check for prompt patterns indicating command completion
    this.detectPrompt(data);

    // Emit output event for other agents
    this.sendMessage({
      recipient: "broadcast" as AgentId,
      type: "event.terminal",
      payload: {
        event: "output",
        data,
        agentId: this.id,
        isExecuting: this.terminalState.isExecuting,
      },
      priority: "normal",
    });
  }

  private onTerminalExit(data: { exitCode: number; signal?: number }): void {
    this.terminalState.isExecuting = false;
    this.terminalState.isReady = false;

    // Complete current execution if any
    if (this.currentExecution) {
      const result: ExecutionResult = {
        command: this.currentExecution.command,
        output: this.outputBuffer,
        exitCode: data.exitCode,
        duration: Date.now() - this.currentExecution.timestamp,
        success: data.exitCode === 0,
        timestamp: Date.now(),
      };

      this.addToHistory(result);
      this.currentExecution.resolve(result);
      this.currentExecution = null;

      this.emit("executionComplete", {
        agentId: this.id,
        result,
        timestamp: Date.now(),
      });
    }

    // Process next command in queue
    this.processQueue();
  }

  private detectPrompt(output: string): void {
    // Common EDA tool prompt patterns
    const promptPatterns = [
      /^\s*[\w-]+>\s*$/, // Generic tool prompt: "innovus>"
      /^\s*%\s*$/, // Tcl prompt: "%"
      /^\s*\$\s*$/, // Shell prompt: "$"
      /^\s*#\s*$/, // Root shell prompt: "#"
      /\w+\s*\(\d+\)\s*>/, // Numbered prompt: "innovus(1)>"
    ];

    const lines = output.split("\n");
    const lastLine = lines[lines.length - 1];

    for (const pattern of promptPatterns) {
      if (pattern.test(lastLine)) {
        this.terminalState.currentPrompt = lastLine.trim();
        this.terminalState.isReady = true;
        this.terminalState.isExecuting = false;

        // Complete current execution
        if (this.currentExecution) {
          const result: ExecutionResult = {
            command: this.currentExecution.command,
            output: this.outputBuffer,
            duration: Date.now() - this.currentExecution.timestamp,
            success: true,
            timestamp: Date.now(),
          };

          this.addToHistory(result);
          this.currentExecution.resolve(result);
          this.currentExecution = null;

          this.emit("executionComplete", {
            agentId: this.id,
            result,
            timestamp: Date.now(),
          });

          // Process next command
          this.processQueue();
        }
        break;
      }
    }
  }

  private processQueue(): void {
    if (
      !this.terminalSession ||
      this.currentExecution ||
      this.commandQueue.length === 0
    ) {
      return;
    }

    // Check if terminal is ready
    if (!this.terminalState.isReady && this.terminalState.isExecuting) {
      // Terminal is busy, wait for it to become ready
      return;
    }

    const nextCommand = this.commandQueue.shift();
    if (!nextCommand) {
      return;
    }

    this.executeCommand(nextCommand);
  }

  private executeCommand(queuedCommand: QueuedCommand): void {
    if (!this.terminalSession) {
      queuedCommand.reject(new Error("No terminal session attached"));
      return;
    }

    this.currentExecution = queuedCommand;
    this.terminalState.isExecuting = true;
    this.terminalState.isReady = false;
    this.outputBuffer = "";

    // Prepare command (add TCL wrapper if needed)
    let command = queuedCommand.command;
    if (queuedCommand.options.isTclCommand) {
      command = this.wrapTclCommand(command);
    }

    // Execute the command
    this.terminalSession.execute(command);

    this.emit("executionStart", {
      agentId: this.id,
      commandId: queuedCommand.id,
      command: queuedCommand.command,
      timestamp: Date.now(),
    });

    // Notify other agents
    this.sendMessage({
      recipient: "broadcast" as AgentId,
      type: "event.terminal",
      payload: {
        event: "executionStart",
        command: queuedCommand.command,
        agentId: this.id,
      },
      priority: "normal",
      correlationId: queuedCommand.options.correlationId,
    });
  }

  private wrapTclCommand(command: string): string {
    // For TCL commands, wrap with puts to ensure output is captured
    // This helps capture return values from TCL commands
    if (!command.trim().startsWith("puts ")) {
      return `puts [${command}]`;
    }
    return command;
  }

  private validateCommand(command: string): void {
    // Basic safety checks
    const dangerousPatterns = [
      /rm\s+-rf\s+\//, // rm -rf /
      />\s*\/dev\/null.*<.*\/dev\/random/, // Fork bombs or dangerous redirects
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        throw new Error(`Command failed safety validation: ${command}`);
      }
    }
  }

  private async handleTaskAssign(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      taskId: string;
      planId: string;
      taskType: string;
      description: string;
      payload: {
        command?: string;
        tool?: string;
      };
    };

    // For execute tasks, we need a command to run
    if (payload.taskType === "execute") {
      const command = payload.payload?.command;

      // If no command provided, respond with success (nothing to execute)
      if (!command) {
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "task.complete",
          payload: {
            taskId: payload.taskId,
            planId: payload.planId,
            result: {
              command: "",
              output: "No command to execute",
              duration: 0,
              success: true,
              timestamp: Date.now(),
            },
          },
          priority: "normal",
          correlationId: message.correlationId,
        });
        return;
      }

      try {
        const result = await this.execute(command, { waitForCompletion: false });

        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "task.complete",
          payload: {
            taskId: payload.taskId,
            planId: payload.planId,
            result,
          },
          priority: "normal",
          correlationId: message.correlationId,
        });
      } catch (error) {
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "task.failed",
          payload: {
            taskId: payload.taskId,
            planId: payload.planId,
            error: error instanceof Error ? error.message : String(error),
          },
          priority: "high",
          correlationId: message.correlationId,
        });
      }
    } else {
      // Not an execute task, acknowledge but do nothing
      this.sendMessage({
        recipient: message.sender as AgentId,
        type: "task.complete",
        payload: {
          taskId: payload.taskId,
          planId: payload.planId,
          result: { acknowledged: true },
        },
        priority: "normal",
        correlationId: message.correlationId,
      });
    }
  }

  private async handleTerminalEvent(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      event: string;
      isReady?: boolean;
      prompt?: string;
    };

    if (payload.event === "ready") {
      this.terminalState.isReady = payload.isReady ?? true;
      this.terminalState.currentPrompt = payload.prompt;

      // Process queue if terminal is now ready
      if (this.terminalState.isReady) {
        this.processQueue();
      }
    }
  }

  private async handleRecoveryRequest(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      action: string;
      checkpointId?: string;
    };

    if (payload.action === "restore" && payload.checkpointId) {
      const success = this.restoreCheckpoint(payload.checkpointId);

      this.sendMessage({
        recipient: message.sender as AgentId,
        type: "task.complete",
        payload: {
          action: "restore",
          checkpointId: payload.checkpointId,
          success,
        },
        priority: "high",
        correlationId: message.correlationId,
      });
    }
  }

  private addToHistory(result: ExecutionResult): void {
    this.executionHistory.push(result);

    // Trim history if it exceeds limit
    if (this.executionHistory.length > this.maxHistorySize) {
      this.executionHistory = this.executionHistory.slice(-this.maxHistorySize);
    }
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default ExecutionAgent;
