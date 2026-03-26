/**
 * @fileoverview RecoveryAgent - Error diagnosis and recovery for multi-agent system.
 *
 * The RecoveryAgent extends BaseAgent to provide error recovery services for the
 * multi-agent system. It performs:
 * - Diagnosis of failures and root cause analysis
 * - Proposal of retry strategies with exponential backoff
 * - Escalation of unrecoverable errors to parent agents
 * - Maintenance and management of rollback checkpoints
 * - Recovery pattern matching from KnowledgeBase
 *
 * Architecture: Specialist Layer - Recovery Agent
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions } from "./BaseAgent";
import { MessageBus, getMessageBus } from "./MessageBus";
import { KnowledgeBase } from "./KnowledgeBase";

/**
 * Types of errors that can occur during execution
 */
export type ErrorType =
  | "syntax" // Command syntax errors
  | "tool" // EDA tool errors
  | "resource" // License/server/resource unavailable
  | "timeout" // Command timeout
  | "connection" // Connection lost
  | "logic" // Incorrect command logic
  | "permission" // Permission denied
  | "unknown"; // Unrecognized error

/**
 * Recovery strategy types
 */
export type RecoveryStrategyType =
  | "retry" // Simple retry with same command
  | "retry_with_backoff" // Retry with exponential backoff
  | "rollback" // Rollback to checkpoint and retry
  | "fallback" // Use alternative command
  | "replan" // Request plan modification
  | "escalate"; // Escalate to user/orchestrator

/**
 * Error diagnosis result
 */
export interface ErrorDiagnosis {
  /** Unique diagnosis ID */
  id: string;

  /** Original error message */
  errorMessage: string;

  /** Classified error type */
  errorType: ErrorType;

  /** Confidence in diagnosis (0-1) */
  confidence: number;

  /** Root cause analysis */
  rootCause: string;

  /** Whether this error is recoverable */
  isRecoverable: boolean;

  /** Timestamp of diagnosis */
  timestamp: number;

  /** Related error patterns matched */
  matchedPatterns?: string[];
}

/**
 * Recovery checkpoint for rollback
 */
export interface RecoveryCheckpoint {
  /** Unique checkpoint ID */
  id: string;

  /** Human-readable description */
  description: string;

  /** Timestamp when checkpoint was created */
  timestamp: number;

  /** Snapshot of terminal state */
  terminalSnapshot?: {
    workingDirectory: string;
    environment: Record<string, string>;
    lastOutput: string;
  };

  /** Commands executed since checkpoint */
  commandHistory: string[];

  /** Metadata for context */
  metadata?: Record<string, unknown>;
}

/**
 * Recovery action to attempt
 */
export interface RecoveryAction {
  /** Action ID */
  id: string;

  /** Type of recovery strategy */
  strategy: RecoveryStrategyType;

  /** Description of the recovery action */
  description: string;

  /** Commands to execute for recovery */
  commands?: string[];

  /** Checkpoint ID to rollback to (for rollback strategy) */
  rollbackTarget?: string;

  /** Delay before retry in ms (for backoff strategy) */
  delay?: number;

  /** Maximum retry attempts for this action */
  maxAttempts: number;

  /** Confidence in this recovery action (0-1) */
  confidence: number;

  /** Estimated time to complete in ms */
  estimatedTime: number;
}

/**
 * Recovery plan for a failure
 */
export interface RecoveryPlan {
  /** Plan ID */
  id: string;

  /** Associated error diagnosis */
  diagnosis: ErrorDiagnosis;

  /** Ordered list of recovery actions to attempt */
  actions: RecoveryAction[];

  /** Current action index */
  currentActionIndex: number;

  /** Overall plan status */
  status: "pending" | "in_progress" | "succeeded" | "failed";

  /** Number of attempts made */
  attemptCount: number;

  /** Timestamp when plan was created */
  createdAt: number;

  /** Timestamp when plan completed or failed */
  completedAt?: number;
}

/**
 * Result of recovery attempt
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;

  /** Recovery plan that was executed */
  plan: RecoveryPlan;

  /** Action that succeeded (if any) */
  successfulAction?: RecoveryAction;

  /** Number of attempts made */
  attempts: number;

  /** Error message if recovery failed */
  error?: string;

  /** Duration of recovery attempt in ms */
  duration: number;

  /** Timestamp of completion */
  timestamp: number;

  /** Whether escalation is required */
  requiresEscalation: boolean;
}

/**
 * Recovery pattern from KnowledgeBase
 */
export interface RecoveryPattern {
  /** Pattern ID */
  id: string;

  /** Error signature (regex or keywords) */
  errorSignature: string;

  /** Error type classification */
  errorType: ErrorType;

  /** Recovery strategy */
  strategy: RecoveryStrategyType;

  /** Commands to execute for recovery */
  recoveryCommands: string[];

  /** Success rate of this pattern (0-1) */
  successRate: number;

  /** Number of times this pattern has been used */
  usageCount: number;
}

/**
 * Configuration options for RecoveryAgent
 */
export interface RecoveryAgentOptions extends BaseAgentOptions {
  /** KnowledgeBase instance for pattern lookups */
  knowledgeBase?: KnowledgeBase;

  /** Maximum number of recovery attempts per failure (default: 3) */
  maxRecoveryAttempts?: number;

  /** Initial retry delay in ms (default: 1000) */
  initialRetryDelay?: number;

  /** Maximum retry delay in ms (default: 30000) */
  maxRetryDelay?: number;

  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;

  /** Whether to enable automatic escalation (default: true) */
  enableAutoEscalation?: boolean;

  /** Threshold for auto-escalation after consecutive failures (default: 3) */
  escalationThreshold?: number;
}

/**
 * Statistics for RecoveryAgent operations
 */
export interface RecoveryStats {
  /** Total number of errors diagnosed */
  errorsDiagnosed: number;

  /** Total number of recovery attempts */
  recoveryAttempts: number;

  /** Number of successful recoveries */
  successfulRecoveries: number;

  /** Number of failed recoveries */
  failedRecoveries: number;

  /** Number of escalations */
  escalations: number;

  /** Number of checkpoints created */
  checkpointsCreated: number;

  /** Number of rollbacks performed */
  rollbacksPerformed: number;

  /** Success rate as percentage */
  successRate: number;

  /** Average recovery time in ms */
  averageRecoveryTime: number;

  /** Error type distribution */
  errorTypeDistribution: Record<ErrorType, number>;
}

/**
 * RecoveryAgent - Error diagnosis and recovery specialist.
 *
 * Responsibilities:
 * - Diagnose failures and root causes
 * - Propose retry strategies with backoff
 * - Escalate unrecoverable errors
 * - Maintain rollback checkpoints
 * - Match errors against recovery patterns
 *
 * @example
 * const recoveryAgent = new RecoveryAgent({
 *   id: "recovery",
 *   name: "Recovery Agent",
 *   knowledgeBase: kb
 * });
 * await recoveryAgent.initialize();
 *
 * // Create checkpoint before risky operation
 * const checkpoint = recoveryAgent.createCheckpoint("pre_optimize");
 *
 * // Request recovery on failure
 * const result = await recoveryAgent.requestRecovery({
 *   error: "License checkout failed",
 *   context: { command: "place_opt_design", tool: "innovus" }
 * });
 */
export class RecoveryAgent extends BaseAgent {
  private knowledgeBase?: KnowledgeBase;
  private messageBus: MessageBus;

  // Configuration
  private maxRecoveryAttempts: number;
  private initialRetryDelay: number;
  private maxRetryDelay: number;
  private backoffMultiplier: number;
  private enableAutoEscalation: boolean;
  private escalationThreshold: number;

  // State
  private checkpoints: Map<string, RecoveryCheckpoint> = new Map();
  private recoveryPlans: Map<string, RecoveryPlan> = new Map();
  private recoveryHistory: RecoveryResult[] = [];
  private consecutiveFailures: number = 0;
  private isRecovering: boolean = false;

  // Built-in recovery patterns
  private builtInPatterns: RecoveryPattern[] = [
    // License errors
    {
      id: "license_unavailable",
      errorSignature: "license.*unavailable|License checkout failed|Could not get license",
      errorType: "resource",
      strategy: "retry_with_backoff",
      recoveryCommands: [],
      successRate: 0.85,
      usageCount: 0,
    },
    // Connection errors
    {
      id: "connection_lost",
      errorSignature: "connection.*lost|Connection reset|Connection refused|Broken pipe",
      errorType: "connection",
      strategy: "retry",
      recoveryCommands: [],
      successRate: 0.75,
      usageCount: 0,
    },
    // Timeout errors
    {
      id: "command_timeout",
      errorSignature: "timeout|timed out|Command took too long",
      errorType: "timeout",
      strategy: "escalate",
      recoveryCommands: [],
      successRate: 0.4,
      usageCount: 0,
    },
    // Syntax errors
    {
      id: "tcl_syntax_error",
      errorSignature: "invalid command name|syntax error|unexpected|wrong # args",
      errorType: "syntax",
      strategy: "escalate",
      recoveryCommands: [],
      successRate: 0.1,
      usageCount: 0,
    },
    // Tool errors
    {
      id: "tool_internal_error",
      errorSignature: "internal error|fatal error|segmentation fault|core dumped",
      errorType: "tool",
      strategy: "rollback",
      recoveryCommands: [],
      successRate: 0.6,
      usageCount: 0,
    },
    // Resource exhaustion
    {
      id: "memory_exhausted",
      errorSignature: "out of memory|memory exhausted|cannot allocate",
      errorType: "resource",
      strategy: "replan",
      recoveryCommands: [],
      successRate: 0.5,
      usageCount: 0,
    },
    // Permission errors
    {
      id: "permission_denied",
      errorSignature: "permission denied|access denied|not authorized",
      errorType: "permission",
      strategy: "escalate",
      recoveryCommands: [],
      successRate: 0.05,
      usageCount: 0,
    },
  ];

  // Statistics
  private stats: RecoveryStats = {
    errorsDiagnosed: 0,
    recoveryAttempts: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    escalations: 0,
    checkpointsCreated: 0,
    rollbacksPerformed: 0,
    successRate: 0,
    averageRecoveryTime: 0,
    errorTypeDistribution: {
      syntax: 0,
      tool: 0,
      resource: 0,
      timeout: 0,
      connection: 0,
      logic: 0,
      permission: 0,
      unknown: 0,
    },
  };

  /**
   * Creates a new RecoveryAgent instance.
   *
   * @param options - Configuration options including KnowledgeBase reference
   */
  constructor(options: RecoveryAgentOptions) {
    super(options);

    this.knowledgeBase = options.knowledgeBase;
    this.messageBus = getMessageBus();

    // Configuration with defaults
    this.maxRecoveryAttempts = options.maxRecoveryAttempts ?? 3;
    this.initialRetryDelay = options.initialRetryDelay ?? 1000;
    this.maxRetryDelay = options.maxRetryDelay ?? 30000;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.enableAutoEscalation = options.enableAutoEscalation ?? true;
    this.escalationThreshold = options.escalationThreshold ?? 3;
  }

  /**
   * Lifecycle hook: Initialize the agent.
   * Loads recovery patterns from KnowledgeBase if available.
   */
  protected async onInitialize(): Promise<void> {
    this.log("info", "Initializing RecoveryAgent with built-in patterns", {
      patternCount: this.builtInPatterns.length,
    });

    // Load additional patterns from KnowledgeBase if available
    if (this.knowledgeBase) {
      try {
        const patterns = await this.loadPatternsFromKnowledgeBase();
        this.log("info", `Loaded ${patterns.length} patterns from KnowledgeBase`);
      } catch (error) {
        this.log("warn", "Failed to load patterns from KnowledgeBase, using built-in only", error);
      }
    }

    this.emit("recovery:initialized", {
      agentId: this.id,
      patterns: this.builtInPatterns.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Lifecycle hook: Start the agent.
   */
  protected async onStart(): Promise<void> {
    this.log("info", "RecoveryAgent started and ready");
  }

  /**
   * Lifecycle hook: Pause the agent.
   */
  protected async onPause(): Promise<void> {
    this.log("info", "RecoveryAgent paused");
  }

  /**
   * Lifecycle hook: Resume the agent.
   */
  protected async onResume(): Promise<void> {
    this.log("info", "RecoveryAgent resumed");
  }

  /**
   * Lifecycle hook: Stop the agent.
   */
  protected async onStop(): Promise<void> {
    this.log("info", "RecoveryAgent stopped");
    this.isRecovering = false;
  }

  /**
   * Lifecycle hook: Cleanup resources.
   */
  protected async onCleanup(): Promise<void> {
    this.checkpoints.clear();
    this.recoveryPlans.clear();
    this.log("info", "RecoveryAgent cleanup complete");
  }

  /**
   * Handle incoming messages.
   *
   * @param message - Message from MessageBus
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    this.log("debug", `Received message: ${message.type}`, { from: message.sender });

    switch (message.type) {
      case "recovery.request":
        await this.handleRecoveryRequest(message);
        break;

      case "recovery.diagnose":
        await this.handleDiagnoseRequest(message);
        break;

      case "checkpoint.create":
        await this.handleCheckpointCreate(message);
        break;

      case "checkpoint.rollback":
        await this.handleCheckpointRollback(message);
        break;

      case "pattern.query":
        await this.handlePatternQuery(message);
        break;

      case "stats.get":
        await this.handleStatsRequest(message);
        break;

      default:
        this.log("warn", `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Creates a recovery checkpoint.
   *
   * @param description - Human-readable description of the checkpoint
   * @param metadata - Optional metadata to store with checkpoint
   * @returns The created checkpoint
   */
  createCheckpoint(
    description: string,
    metadata?: Record<string, unknown>
  ): RecoveryCheckpoint {
    const checkpoint: RecoveryCheckpoint = {
      id: this.generateId("chk"),
      description,
      timestamp: Date.now(),
      commandHistory: [],
      metadata,
    };

    this.checkpoints.set(checkpoint.id, checkpoint);
    this.stats.checkpointsCreated++;

    this.log("info", `Checkpoint created: ${checkpoint.id}`, { description });
    this.emit("checkpoint:created", { checkpointId: checkpoint.id, description });

    return checkpoint;
  }

  /**
   * Requests recovery for a failure.
   *
   * @param params - Recovery request parameters
   * @returns Result of recovery attempt
   */
  async requestRecovery(params: {
    error: string;
    context?: Record<string, unknown>;
    correlationId?: string;
  }): Promise<RecoveryResult> {
    const startTime = Date.now();
    this.isRecovering = true;

    this.log("info", "Recovery requested", { error: params.error, correlationId: params.correlationId });

    try {
      // Step 1: Diagnose the error
      const diagnosis = await this.diagnoseError(params.error, params.context);

      // Step 2: Create recovery plan
      const plan = await this.createRecoveryPlan(diagnosis, params.context);

      // Step 3: Execute recovery plan
      const result = await this.executeRecoveryPlan(plan);

      // Update statistics
      this.updateStats(result, startTime);

      // Emit completion event
      this.emit("recovery:complete", {
        success: result.success,
        diagnosis: diagnosis.errorType,
        attempts: result.attempts,
        duration: result.duration,
      });

      return result;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Diagnoses an error to determine type and root cause.
   *
   * @param errorMessage - The error message to diagnose
   * @param context - Additional context about the error
   * @returns Error diagnosis result
   */
  async diagnoseError(
    errorMessage: string,
    _context?: Record<string, unknown>
  ): Promise<ErrorDiagnosis> {
    this.stats.errorsDiagnosed++;

    // Try to match against known patterns
    const matchedPatterns: RecoveryPattern[] = [];

    for (const pattern of this.builtInPatterns) {
      const regex = new RegExp(pattern.errorSignature, "i");
      if (regex.test(errorMessage)) {
        matchedPatterns.push(pattern);
      }
    }

    // Sort by success rate
    matchedPatterns.sort((a, b) => b.successRate - a.successRate);

    // Determine error type and recoverability
    let errorType: ErrorType = "unknown";
    let isRecoverable = false;
    let confidence = 0;
    let rootCause = "Unknown error - manual investigation required";

    if (matchedPatterns.length > 0) {
      const bestMatch = matchedPatterns[0];
      errorType = bestMatch.errorType;
      confidence = bestMatch.successRate;
      isRecoverable = bestMatch.successRate > 0.3;
      rootCause = this.inferRootCause(errorType, errorMessage);
    } else {
      // Heuristic classification
      const classification = this.heuristicClassify(errorMessage);
      errorType = classification.errorType;
      confidence = classification.confidence;
      isRecoverable = classification.isRecoverable;
      rootCause = classification.rootCause;
    }

    // Update error type distribution
    this.stats.errorTypeDistribution[errorType]++;

    const diagnosis: ErrorDiagnosis = {
      id: this.generateId("diag"),
      errorMessage,
      errorType,
      confidence,
      rootCause,
      isRecoverable,
      timestamp: Date.now(),
      matchedPatterns: matchedPatterns.map((p) => p.id),
    };

    this.log("info", `Error diagnosed: ${errorType}`, {
      confidence,
      isRecoverable,
      rootCause,
    });

    return diagnosis;
  }

  /**
   * Creates a recovery plan based on error diagnosis.
   *
   * @param diagnosis - Error diagnosis result
   * @param context - Additional context
   * @returns Recovery plan
   */
  async createRecoveryPlan(
    diagnosis: ErrorDiagnosis,
    context?: Record<string, unknown>
  ): Promise<RecoveryPlan> {
    const actions: RecoveryAction[] = [];

    // Generate actions based on error type
    switch (diagnosis.errorType) {
      case "resource":
        actions.push(this.createBackoffAction(diagnosis, 5));
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "connection":
        actions.push(this.createRetryAction(diagnosis, 3));
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "timeout":
        actions.push(this.createReplanAction(diagnosis));
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "syntax":
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "tool":
        actions.push(this.createRollbackAction(diagnosis, context));
        actions.push(this.createFallbackAction(diagnosis, context));
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "logic":
        actions.push(this.createReplanAction(diagnosis));
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "permission":
        actions.push(this.createEscalateAction(diagnosis));
        break;

      case "unknown":
      default:
        actions.push(this.createRetryAction(diagnosis, 1));
        actions.push(this.createEscalateAction(diagnosis));
        break;
    }

    const plan: RecoveryPlan = {
      id: this.generateId("plan"),
      diagnosis,
      actions,
      currentActionIndex: 0,
      status: "pending",
      attemptCount: 0,
      createdAt: Date.now(),
    };

    this.recoveryPlans.set(plan.id, plan);

    this.log("info", `Recovery plan created: ${plan.id}`, {
      actionCount: actions.length,
      errorType: diagnosis.errorType,
    });

    return plan;
  }

  /**
   * Executes a recovery plan.
   *
   * @param plan - Recovery plan to execute
   * @returns Result of recovery attempt
   */
  async executeRecoveryPlan(plan: RecoveryPlan): Promise<RecoveryResult> {
    const startTime = Date.now();
    plan.status = "in_progress";

    this.log("info", `Executing recovery plan: ${plan.id}`);

    for (let i = 0; i < plan.actions.length; i++) {
      const action = plan.actions[i];
      plan.currentActionIndex = i;

      // Check if we've exceeded max attempts
      if (plan.attemptCount >= this.maxRecoveryAttempts) {
        this.log("warn", "Max recovery attempts exceeded");
        break;
      }

      this.log("info", `Attempting recovery action: ${action.strategy}`, {
        description: action.description,
        confidence: action.confidence,
      });

      try {
        const success = await this.executeRecoveryAction(action, plan);
        plan.attemptCount++;

        if (success) {
          plan.status = "succeeded";
          const result: RecoveryResult = {
            success: true,
            plan,
            successfulAction: action,
            attempts: plan.attemptCount,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
            requiresEscalation: false,
          };

          this.consecutiveFailures = 0;
          this.log("info", "Recovery succeeded", { action: action.strategy });

          return result;
        }
      } catch (error) {
        this.log("error", `Recovery action failed: ${action.strategy}`, error);
        plan.attemptCount++;
      }
    }

    // All actions failed
    plan.status = "failed";
    plan.completedAt = Date.now();

    this.consecutiveFailures++;

    const result: RecoveryResult = {
      success: false,
      plan,
      attempts: plan.attemptCount,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
      requiresEscalation:
        this.enableAutoEscalation && this.consecutiveFailures >= this.escalationThreshold,
    };

    this.log("error", "Recovery failed - all actions exhausted", {
      attempts: plan.attemptCount,
      requiresEscalation: result.requiresEscalation,
    });

    return result;
  }

  /**
   * Gets checkpoint by ID.
   *
   * @param checkpointId - Checkpoint ID
   * @returns Checkpoint or undefined
   */
  getCheckpoint(checkpointId: string): RecoveryCheckpoint | undefined {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * Gets all checkpoints.
   *
   * @returns Array of all checkpoints
   */
  getAllCheckpoints(): RecoveryCheckpoint[] {
    return Array.from(this.checkpoints.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }

  /**
   * Removes a checkpoint.
   *
   * @param checkpointId - Checkpoint ID to remove
   * @returns True if checkpoint was removed
   */
  removeCheckpoint(checkpointId: string): boolean {
    const removed = this.checkpoints.delete(checkpointId);
    if (removed) {
      this.log("info", `Checkpoint removed: ${checkpointId}`);
    }
    return removed;
  }

  /**
   * Clears all checkpoints.
   */
  clearCheckpoints(): void {
    this.checkpoints.clear();
    this.log("info", "All checkpoints cleared");
  }

  /**
   * Gets current statistics.
   *
   * @returns Recovery statistics
   */
  getStats(): RecoveryStats {
    // Calculate success rate
    const total = this.stats.successfulRecoveries + this.stats.failedRecoveries;
    this.stats.successRate = total > 0 ? (this.stats.successfulRecoveries / total) * 100 : 0;

    // Calculate average recovery time
    if (this.recoveryHistory.length > 0) {
      const totalTime = this.recoveryHistory.reduce((sum, r) => sum + r.duration, 0);
      this.stats.averageRecoveryTime = totalTime / this.recoveryHistory.length;
    }

    return { ...this.stats };
  }

  /**
   * Gets recovery history.
   *
   * @param limit - Maximum number of results to return
   * @returns Array of recovery results
   */
  getRecoveryHistory(limit?: number): RecoveryResult[] {
    const history = [...this.recoveryHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Checks if agent is currently performing recovery.
   *
   * @returns True if recovering
   */
  get recovering(): boolean {
    return this.isRecovering;
  }

  // Private helper methods

  private async handleRecoveryRequest(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      error: string;
      context?: Record<string, unknown>;
    };

    const result = await this.requestRecovery({
      error: payload.error,
      context: payload.context,
      correlationId: message.correlationId,
    });

    // Send response back to requester
    this.sendMessage({
      recipient: message.sender,
      type: "recovery.result",
      payload: result,
      priority: "high",
      correlationId: message.correlationId,
    });
  }

  private async handleDiagnoseRequest(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      error: string;
      context?: Record<string, unknown>;
    };

    const diagnosis = await this.diagnoseError(payload.error, payload.context);

    this.sendMessage({
      recipient: message.sender,
      type: "recovery.diagnosis",
      payload: diagnosis,
      priority: "normal",
      correlationId: message.correlationId,
    });
  }

  private async handleCheckpointCreate(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      description: string;
      metadata?: Record<string, unknown>;
    };

    const checkpoint = this.createCheckpoint(payload.description, payload.metadata);

    this.sendMessage({
      recipient: message.sender,
      type: "checkpoint.created",
      payload: { checkpointId: checkpoint.id, checkpoint },
      priority: "normal",
      correlationId: message.correlationId,
    });
  }

  private async handleCheckpointRollback(message: AgentMessage): Promise<void> {
    const payload = message.payload as { checkpointId: string };

    const checkpoint = this.checkpoints.get(payload.checkpointId);
    const success = !!checkpoint;

    if (success) {
      this.stats.rollbacksPerformed++;
      this.log("info", `Rollback to checkpoint: ${payload.checkpointId}`);
    }

    this.sendMessage({
      recipient: message.sender,
      type: "checkpoint.rollbackResult",
      payload: { success, checkpoint },
      priority: "high",
      correlationId: message.correlationId,
    });
  }

  private async handlePatternQuery(message: AgentMessage): Promise<void> {
    const payload = message.payload as { errorType?: ErrorType };

    let patterns = this.builtInPatterns;
    if (payload.errorType) {
      patterns = patterns.filter((p) => p.errorType === payload.errorType);
    }

    this.sendMessage({
      recipient: message.sender,
      type: "pattern.queryResult",
      payload: { patterns },
      priority: "normal",
      correlationId: message.correlationId,
    });
  }

  private async handleStatsRequest(message: AgentMessage): Promise<void> {
    this.sendMessage({
      recipient: message.sender,
      type: "stats.result",
      payload: this.getStats(),
      priority: "low",
      correlationId: message.correlationId,
    });
  }

  private async loadPatternsFromKnowledgeBase(): Promise<RecoveryPattern[]> {
    if (!this.knowledgeBase) return [];

    try {
      // Query for error patterns with recovery strategies
      // Note: Using queryPersistent instead of retrieveAndGenerate for structured results
      const results = await this.knowledgeBase.queryPersistent(
        "errors",
        "error recovery patterns retry rollback",
        20
      );

      // Transform retrieved patterns to RecoveryPattern format
      const patterns: RecoveryPattern[] = [];

      for (const result of results) {
        const metadata = result.metadata as Record<string, unknown>;
        if (metadata.recovery_strategy) {
          patterns.push({
            id: result.id,
            errorSignature: (metadata.symptom_pattern as string) || ".*",
            errorType: this.classifyErrorType(metadata.error_type as string),
            strategy: this.classifyStrategy(metadata.recovery_strategy as string),
            recoveryCommands: (metadata.solution_commands as string[]) || [],
            successRate: (metadata.frequency as number) || 0.5,
            usageCount: 0,
          });
        }
      }

      // Merge with built-in patterns
      this.builtInPatterns = [...this.builtInPatterns, ...patterns];

      return patterns;
    } catch (error) {
      this.log("error", "Failed to load patterns from KnowledgeBase", error);
      return [];
    }
  }

  private classifyErrorType(errorType: string): ErrorType {
    const typeMap: Record<string, ErrorType> = {
      syntax: "syntax",
      tool: "tool",
      resource: "resource",
      timeout: "timeout",
      connection: "connection",
      logic: "logic",
      permission: "permission",
    };
    return typeMap[errorType?.toLowerCase()] || "unknown";
  }

  private classifyStrategy(strategy: string): RecoveryStrategyType {
    const strategyMap: Record<string, RecoveryStrategyType> = {
      retry: "retry",
      rollback: "rollback",
      fallback: "fallback",
      replan: "replan",
      escalate: "escalate",
    };
    return strategyMap[strategy?.toLowerCase()] || "escalate";
  }

  private heuristicClassify(errorMessage: string): {
    errorType: ErrorType;
    confidence: number;
    isRecoverable: boolean;
    rootCause: string;
  } {
    const message = errorMessage.toLowerCase();

    // Resource errors
    if (message.includes("license") || message.includes("resource")) {
      return {
        errorType: "resource",
        confidence: 0.7,
        isRecoverable: true,
        rootCause: "Resource temporarily unavailable",
      };
    }

    // Connection errors
    if (message.includes("connection") || message.includes("network")) {
      return {
        errorType: "connection",
        confidence: 0.75,
        isRecoverable: true,
        rootCause: "Network connectivity issue",
      };
    }

    // Timeout errors
    if (message.includes("timeout") || message.includes("timed out")) {
      return {
        errorType: "timeout",
        confidence: 0.8,
        isRecoverable: false,
        rootCause: "Operation exceeded time limit",
      };
    }

    // Permission errors
    if (message.includes("permission") || message.includes("access")) {
      return {
        errorType: "permission",
        confidence: 0.85,
        isRecoverable: false,
        rootCause: "Insufficient permissions",
      };
    }

    // Syntax errors
    if (message.includes("syntax") || message.includes("invalid command")) {
      return {
        errorType: "syntax",
        confidence: 0.9,
        isRecoverable: false,
        rootCause: "Command syntax error",
      };
    }

    return {
      errorType: "unknown",
      confidence: 0.3,
      isRecoverable: false,
      rootCause: "Unknown error - requires investigation",
    };
  }

  private inferRootCause(errorType: ErrorType, _errorMessage: string): string {
    const rootCauses: Record<ErrorType, string> = {
      syntax: "Command syntax incorrect or command not recognized",
      tool: "EDA tool internal error or crash",
      resource: "Required resource (license/server) unavailable",
      timeout: "Command execution exceeded time limit",
      connection: "Lost connection to tool or server",
      logic: "Command logic incorrect for current context",
      permission: "Insufficient permissions for operation",
      unknown: "Unknown cause - manual investigation required",
    };

    return rootCauses[errorType] || rootCauses.unknown;
  }

  private createRetryAction(diagnosis: ErrorDiagnosis, maxAttempts: number): RecoveryAction {
    return {
      id: this.generateId("act"),
      strategy: "retry",
      description: `Retry operation (${maxAttempts} attempts)`,
      maxAttempts,
      confidence: diagnosis.confidence * 0.8,
      estimatedTime: 5000,
    };
  }

  private createBackoffAction(diagnosis: ErrorDiagnosis, maxAttempts: number): RecoveryAction {
    return {
      id: this.generateId("act"),
      strategy: "retry_with_backoff",
      description: `Retry with exponential backoff (${maxAttempts} attempts)`,
      delay: this.initialRetryDelay,
      maxAttempts,
      confidence: diagnosis.confidence * 0.85,
      estimatedTime: this.maxRetryDelay * maxAttempts,
    };
  }

  private createRollbackAction(
    diagnosis: ErrorDiagnosis,
    context?: Record<string, unknown>
  ): RecoveryAction {
    const checkpointId = context?.lastCheckpointId as string | undefined;

    return {
      id: this.generateId("act"),
      strategy: "rollback",
      description: checkpointId
        ? `Rollback to checkpoint ${checkpointId}`
        : "Rollback to last known good state",
      rollbackTarget: checkpointId,
      maxAttempts: 1,
      confidence: 0.6,
      estimatedTime: 10000,
    };
  }

  private createFallbackAction(
    diagnosis: ErrorDiagnosis,
    context?: Record<string, unknown>
  ): RecoveryAction {
    return {
      id: this.generateId("act"),
      strategy: "fallback",
      description: "Use alternative approach",
      commands: context?.fallbackCommands as string[] | undefined,
      maxAttempts: 1,
      confidence: 0.5,
      estimatedTime: 15000,
    };
  }

  private createReplanAction(_diagnosis: ErrorDiagnosis): RecoveryAction {
    return {
      id: this.generateId("act"),
      strategy: "replan",
      description: "Request plan modification from Planner",
      maxAttempts: 1,
      confidence: 0.4,
      estimatedTime: 30000,
    };
  }

  private createEscalateAction(_diagnosis: ErrorDiagnosis): RecoveryAction {
    return {
      id: this.generateId("act"),
      strategy: "escalate",
      description: "Escalate to user or parent agent",
      maxAttempts: 1,
      confidence: 0.3,
      estimatedTime: 0,
    };
  }

  private async executeRecoveryAction(
    action: RecoveryAction,
    plan: RecoveryPlan
  ): Promise<boolean> {
    this.stats.recoveryAttempts++;

    switch (action.strategy) {
      case "retry":
        // Signal retry to execution agent
        this.emit("recovery:retry", { plan, action });
        // Simulate retry success (actual implementation would coordinate with ExecutionAgent)
        await this.delay(1000);
        return true; // Assume success for now

      case "retry_with_backoff":
        for (let i = 0; i < action.maxAttempts; i++) {
          const delay = Math.min(
            this.initialRetryDelay * Math.pow(this.backoffMultiplier, i),
            this.maxRetryDelay
          );
          this.log("info", `Backoff retry ${i + 1}/${action.maxAttempts}, waiting ${delay}ms`);
          await this.delay(delay);
          this.emit("recovery:retry", { plan, action, attempt: i + 1 });
        }
        return true;

      case "rollback":
        if (action.rollbackTarget) {
          const checkpoint = this.checkpoints.get(action.rollbackTarget);
          if (checkpoint) {
            this.stats.rollbacksPerformed++;
            this.emit("recovery:rollback", { plan, action, checkpoint });
            return true;
          }
        }
        return false;

      case "fallback":
        if (action.commands && action.commands.length > 0) {
          this.emit("recovery:fallback", { plan, action, commands: action.commands });
          return true;
        }
        return false;

      case "replan":
        // Request replan from PlannerAgent
        this.sendMessage({
          recipient: "planner",
          type: "plan.adapt",
          payload: {
            failure: plan.diagnosis,
            context: plan,
          },
          priority: "high",
        });
        return false; // Replanning is async, will trigger new execution

      case "escalate":
        this.stats.escalations++;
        this.emit("recovery:escalate", { plan, action });
        return false; // Escalation is terminal

      default:
        return false;
    }
  }

  private updateStats(result: RecoveryResult, _startTime: number): void {
    this.recoveryHistory.push(result);

    if (result.success) {
      this.stats.successfulRecoveries++;
    } else {
      this.stats.failedRecoveries++;
    }

    // Keep history manageable
    if (this.recoveryHistory.length > 100) {
      this.recoveryHistory = this.recoveryHistory.slice(-100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string,
    meta?: unknown
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[RecoveryAgent:${this.id}:${level.toUpperCase()}] ${timestamp}`;

    if (level === "debug") {
       
      if (process.env.DEBUG) console.log(prefix, message, meta ?? "");
    } else {
       
      console.log(prefix, message, meta ?? "");
    }
  }
}

export default RecoveryAgent;
