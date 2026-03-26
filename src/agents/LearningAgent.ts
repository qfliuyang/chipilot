/**
 * @fileoverview LearningAgent - Extracts patterns and learns from execution outcomes.
 *
 * This agent is responsible for:
 * - Extracting patterns from successful command executions
 * - Analyzing failures to identify improvement opportunities
 * - Updating KnowledgeBase with learned patterns
 * - Tracking command success rates and outcomes
 * - Identifying command sequences that form workflows
 * - Providing feedback loop for continuous improvement
 *
 * Architecture: Manager Layer in the hierarchical multi-agent system
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions } from "./BaseAgent";
import KnowledgeBase, { Pattern } from "./KnowledgeBase";
import { AgentId } from "./MessageBus";

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Context in which a command was executed
 */
export interface ExecutionContext {
  /** The tool being used (e.g., 'innovus', 'genus', 'tempus') */
  tool: string;
  /** Current design stage or phase */
  stage?: string;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Previous commands in this session */
  commandHistory?: string[];
  /** Additional context metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Outcome of a successful execution
 */
export interface SuccessOutcome {
  /** Command output */
  output: string;
  /** Execution duration in milliseconds */
  duration: number;
  /** Exit code (0 for success) */
  exitCode: number;
  /** Timestamp of completion */
  timestamp: number;
}

/**
 * A pattern learned from successful executions
 */
export interface LearnedPattern {
  /** Unique identifier for the pattern */
  id: string;
  /** Type of pattern */
  type: "command_sequence" | "error_recovery" | "optimization" | "heuristic";
  /** Pattern signature (command or regex) */
  signature: string;
  /** Human-readable description */
  description: string;
  /** Context where pattern applies */
  context: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Number of times pattern has been used */
  usageCount: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Analysis of a failure for learning purposes
 */
export interface FailureAnalysis {
  /** Unique identifier */
  id: string;
  /** Type of failure */
  failureType: string;
  /** Error message or signature */
  errorSignature: string;
  /** Root cause analysis */
  rootCause: string;
  /** Suggested recovery commands */
  suggestedRecovery: string[];
  /** Whether this failure pattern is now known */
  isNewPattern: boolean;
  /** Confidence in the analysis */
  confidence: number;
}

/**
 * A workflow pattern discovered from command sequences
 */
export interface WorkflowPattern {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this workflow does */
  description: string;
  /** Sequence of commands in the workflow */
  commands: string[];
  /** Tool this workflow applies to */
  tool: string;
  /** Estimated duration in seconds */
  estimatedDuration: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Number of times this workflow has been observed */
  occurrenceCount: number;
  /** Prerequisites for this workflow */
  prerequisites: string[];
  /** Expected outputs */
  outputs: string[];
}

/**
 * Statistics for a specific command
 */
export interface CommandStats {
  /** The command string */
  command: string;
  /** Tool this command belongs to */
  tool: string;
  /** Total number of executions */
  totalExecutions: number;
  /** Number of successful executions */
  successfulExecutions: number;
  /** Number of failed executions */
  failedExecutions: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Average execution duration in milliseconds */
  averageDuration: number;
  /** Last execution timestamp */
  lastExecuted: number;
  /** Contexts where this command was used */
  contexts: string[];
}

/**
 * Analysis result from pattern analysis
 */
export interface PatternAnalysis {
  /** Total patterns learned */
  totalPatterns: number;
  /** Patterns by type */
  patternsByType: Record<string, number>;
  /** Most reliable patterns */
  mostReliablePatterns: LearnedPattern[];
  /** Patterns needing improvement */
  patternsNeedingImprovement: LearnedPattern[];
  /** New patterns discovered recently */
  recentlyDiscoveredPatterns: LearnedPattern[];
  /** Overall system learning statistics */
  learningStats: {
    totalExecutionsAnalyzed: number;
    successRate: number;
    patternsExtracted: number;
    workflowsDiscovered: number;
  };
}

/**
 * A recommendation based on learned patterns
 */
export interface Recommendation {
  /** Type of recommendation */
  type: "command" | "workflow" | "warning" | "optimization";
  /** Recommendation content */
  content: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reasoning for the recommendation */
  reasoning: string;
  /** Source pattern or analysis */
  source: string;
}

/**
 * Configuration options for LearningAgent
 */
export interface LearningAgentOptions extends BaseAgentOptions {
  /** KnowledgeBase instance for storing patterns */
  knowledgeBase: KnowledgeBase;
  /** Minimum confidence threshold for pattern acceptance (default: 0.6) */
  minConfidenceThreshold?: number;
  /** Maximum patterns to store (default: 1000) */
  maxPatterns?: number;
  /** Whether to enable automatic learning (default: true) */
  autoLearn?: boolean;
}

// ============================================================================
// LearningAgent Class
// ============================================================================

/**
 * LearningAgent - Continuously learns from command executions to improve system performance.
 *
 * Responsibilities:
 * - Extract patterns from successful executions
 * - Analyze failures for improvement opportunities
 * - Update KnowledgeBase with learned patterns
 * - Track command success rates
 * - Discover workflow patterns from command sequences
 * - Provide recommendations based on learned knowledge
 *
 * @example
 * const learningAgent = new LearningAgent({
 *   id: "learning",
 *   name: "Learning Agent",
 *   knowledgeBase: kb
 * });
 * await learningAgent.initialize();
 * await learningAgent.start();
 *
 * // Learn from a successful execution
 * const pattern = await learningAgent.learnFromSuccess(
 *   "placeDesign",
 *   { tool: "innovus", stage: "placement" },
 *   { output: "...", duration: 5000, exitCode: 0, timestamp: Date.now() }
 * );
 */
export class LearningAgent extends BaseAgent {
  private knowledgeBase: KnowledgeBase;
  private minConfidenceThreshold: number;
  private maxPatterns: number;
  private autoLearn: boolean;

  // Internal tracking
  private commandStats: Map<string, CommandStats> = new Map();
  private workflowPatterns: Map<string, WorkflowPattern> = new Map();
  private commandSequences: string[][] = [];
  private failureAnalyses: Map<string, FailureAnalysis> = new Map();
  private totalExecutionsAnalyzed = 0;

  /**
   * Creates a new LearningAgent instance.
   *
   * @param options - Configuration options including knowledgeBase reference
   */
  constructor(options: LearningAgentOptions) {
    super({
      id: options.id,
      name: options.name,
      parentId: options.parentId,
      initialState: options.initialState,
    });

    this.knowledgeBase = options.knowledgeBase;
    this.minConfidenceThreshold = options.minConfidenceThreshold ?? 0.6;
    this.maxPatterns = options.maxPatterns ?? 1000;
    this.autoLearn = options.autoLearn ?? true;
  }

  // ============================================================================
  // Lifecycle Hooks
  // ============================================================================

  /**
   * Lifecycle hook: Initialize the agent.
   * Sets up learning state and subscribes to execution events.
   */
  protected async onInitialize(): Promise<void> {
    console.log("[LearningAgent] Initializing...");

    // Load any existing patterns from KnowledgeBase
    const existingPatterns = this.knowledgeBase.getAllReflectivePatterns();
    console.log(`[LearningAgent] Loaded ${existingPatterns.length} existing patterns`);

    console.log("[LearningAgent] Initialization complete");
  }

  /**
   * Lifecycle hook: Start the agent.
   */
  protected async onStart(): Promise<void> {
    console.log("[LearningAgent] Started");
  }

  /**
   * Lifecycle hook: Stop the agent.
   */
  protected async onStop(): Promise<void> {
    console.log("[LearningAgent] Stopped");
  }

  /**
   * Lifecycle hook: Cleanup resources.
   */
  protected async onCleanup(): Promise<void> {
    this.commandStats.clear();
    this.workflowPatterns.clear();
    this.commandSequences = [];
    this.failureAnalyses.clear();
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Handle incoming messages from other agents.
   *
   * Supported message types:
   * - 'learn.capture': Capture learning data from execution
   * - 'learn.analyze': Request pattern analysis
   * - 'learn.recommend': Request recommendations
   * - 'learn.get_stats': Get learning statistics
   *
   * @param message - The message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    console.log(`[LearningAgent] Received message: ${message.type}`);

    switch (message.type) {
      case "learn.capture": {
        const { command, context, outcome, error } = message.payload as {
          command: string;
          context: ExecutionContext;
          outcome?: SuccessOutcome;
          error?: Error;
        };

        if (error) {
          await this.learnFromFailure(command, error, context);
        } else if (outcome) {
          await this.learnFromSuccess(command, context, outcome);
        }

        // Send acknowledgment
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "learn.captured",
          payload: { command, timestamp: Date.now() },
          priority: "low",
          correlationId: message.correlationId,
        });
        break;
      }

      case "learn.analyze": {
        const analysis = await this.analyzePatterns();
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "learn.analysis_result",
          payload: analysis,
          priority: "normal",
          correlationId: message.correlationId,
        });
        break;
      }

      case "learn.recommend": {
        const { context } = message.payload as { context: string };
        const recommendations = await this.getRecommendations(context);
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "learn.recommendations",
          payload: recommendations,
          priority: "normal",
          correlationId: message.correlationId,
        });
        break;
      }

      case "learn.get_stats": {
        const stats = this.getLearningStats();
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "learn.stats_result",
          payload: stats,
          priority: "normal",
          correlationId: message.correlationId,
        });
        break;
      }

      case "learn.extract_workflow": {
        const { commands, name, description } = message.payload as {
          commands: string[];
          name: string;
          description: string;
        };
        const workflow = await this.extractWorkflow(commands, name, description);
        this.sendMessage({
          recipient: message.sender as AgentId,
          type: "learn.workflow_extracted",
          payload: workflow,
          priority: "normal",
          correlationId: message.correlationId,
        });
        break;
      }

      default:
        console.warn(`[LearningAgent] Unknown message type: ${message.type}`);
    }
  }

  // ============================================================================
  // Core Learning Methods
  // ============================================================================

  /**
   * Learn from a successful command execution.
   *
   * Extracts patterns from the successful execution and updates the knowledge base.
   * Tracks command statistics and identifies potential workflow patterns.
   *
   * @param command - The command that was executed
   * @param context - Execution context (tool, stage, etc.)
   * @param outcome - The successful outcome details
   * @returns The learned pattern
   */
  async learnFromSuccess(
    command: string,
    context: ExecutionContext,
    outcome: SuccessOutcome
  ): Promise<LearnedPattern> {
    console.log(`[LearningAgent] Learning from success: ${command}`);

    // Update command statistics
    await this.updateCommandStats(command, context.tool, true, outcome.duration);

    // Create a learned pattern
    const pattern: LearnedPattern = {
      id: this.generatePatternId(),
      type: this.classifyPatternType(command, context),
      signature: command,
      description: this.generatePatternDescription(command, context, outcome),
      context: this.serializeContext(context),
      confidence: this.calculateInitialConfidence(outcome),
      usageCount: 1,
      successRate: 1.0,
      metadata: {
        tool: context.tool,
        stage: context.stage,
        duration: outcome.duration,
        exitCode: outcome.exitCode,
        timestamp: outcome.timestamp,
      },
    };

    // Store in KnowledgeBase if confidence is high enough
    if (pattern.confidence >= this.minConfidenceThreshold) {
      await this.storePattern(pattern);
    }

    // Track command sequence for workflow discovery
    this.trackCommandSequence(command, context);

    this.totalExecutionsAnalyzed++;

    // Emit learning event
    this.emit("patternLearned", {
      agentId: this.id,
      pattern,
      timestamp: Date.now(),
    });

    return pattern;
  }

  /**
   * Learn from a failed command execution.
   *
   * Analyzes the failure to identify error patterns and potential recovery strategies.
   * Updates command statistics and creates failure analysis records.
   *
   * @param command - The command that failed
   * @param error - The error that occurred
   * @param context - Execution context
   * @returns Analysis of the failure
   */
  async learnFromFailure(
    command: string,
    error: Error,
    context: ExecutionContext
  ): Promise<FailureAnalysis> {
    console.log(`[LearningAgent] Learning from failure: ${command}`);

    // Update command statistics
    await this.updateCommandStats(command, context.tool, false);

    // Analyze the failure
    const analysis: FailureAnalysis = {
      id: this.generatePatternId(),
      failureType: this.classifyFailureType(error),
      errorSignature: this.extractErrorSignature(error),
      rootCause: await this.analyzeRootCause(error, context),
      suggestedRecovery: this.suggestRecoveryCommands(error, context),
      isNewPattern: !this.isKnownErrorPattern(error),
      confidence: this.calculateFailureConfidence(error, context),
    };

    // Store failure analysis
    this.failureAnalyses.set(analysis.id, analysis);

    // If this is a new pattern, store it in KnowledgeBase
    if (analysis.isNewPattern && analysis.confidence >= this.minConfidenceThreshold) {
      const pattern: Pattern = {
        id: analysis.id,
        type: "error_recovery",
        signature: analysis.errorSignature,
        description: analysis.rootCause,
        context: context.tool,
        confidence: analysis.confidence,
        usageCount: 1,
        successRate: 0, // Will be updated when recovery succeeds
        createdAt: new Date(),
        lastUsedAt: new Date(),
        metadata: {
          recoveryCommands: analysis.suggestedRecovery,
          failureType: analysis.failureType,
        },
      };

      await this.knowledgeBase.storeReflective(pattern);
    }

    this.totalExecutionsAnalyzed++;

    // Emit failure analysis event
    this.emit("failureAnalyzed", {
      agentId: this.id,
      analysis,
      timestamp: Date.now(),
    });

    return analysis;
  }

  /**
   * Extract a workflow pattern from a sequence of commands.
   *
   * Analyzes the command sequence to identify a reusable workflow pattern.
   * Calculates estimated duration and success rate based on historical data.
   *
   * @param commands - Array of commands in the sequence
   * @param name - Human-readable name for the workflow
   * @param description - Description of what the workflow does
   * @returns The extracted workflow pattern
   */
  async extractWorkflow(
    commands: string[],
    name: string,
    description: string
  ): Promise<WorkflowPattern> {
    console.log(`[LearningAgent] Extracting workflow: ${name}`);

    // Determine the primary tool from commands
    const tool = this.inferToolFromCommands(commands);

    // Calculate estimated duration from command stats
    let estimatedDuration = 0;
    let totalSuccessRate = 0;

    for (const command of commands) {
      const stats = this.commandStats.get(this.getCommandKey(command, tool));
      if (stats) {
        estimatedDuration += stats.averageDuration / 1000; // Convert to seconds
        totalSuccessRate += stats.successRate;
      } else {
        // Default estimates for unknown commands
        estimatedDuration += 60; // 1 minute default
        totalSuccessRate += 0.8; // 80% default success rate
      }
    }

    const successRate = commands.length > 0 ? totalSuccessRate / commands.length : 0;

    const workflow: WorkflowPattern = {
      id: this.generatePatternId(),
      name,
      description,
      commands,
      tool,
      estimatedDuration: Math.round(estimatedDuration),
      successRate: Math.round(successRate * 100) / 100,
      occurrenceCount: 1,
      prerequisites: this.inferPrerequisites(commands),
      outputs: this.inferOutputs(commands),
    };

    // Store workflow pattern
    this.workflowPatterns.set(workflow.id, workflow);

    // Also store as a reflective pattern in KnowledgeBase
    const pattern: Pattern = {
      id: workflow.id,
      type: "workflow",
      signature: name,
      description,
      context: tool,
      confidence: successRate,
      usageCount: 1,
      successRate,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      metadata: {
        commands,
        estimatedDuration: workflow.estimatedDuration,
        prerequisites: workflow.prerequisites,
        outputs: workflow.outputs,
      },
    };

    await this.knowledgeBase.storeReflective(pattern);

    // Emit workflow extracted event
    this.emit("workflowExtracted", {
      agentId: this.id,
      workflow,
      timestamp: Date.now(),
    });

    return workflow;
  }

  /**
   * Update success statistics for a command.
   *
   * Tracks execution count, success rate, and average duration.
   *
   * @param command - The command executed
   * @param tool - The tool used
   * @param success - Whether execution was successful
   * @param duration - Optional execution duration in milliseconds
   */
  async updateCommandStats(
    command: string,
    tool: string,
    success: boolean,
    duration?: number
  ): Promise<void> {
    const key = this.getCommandKey(command, tool);
    const existing = this.commandStats.get(key);

    if (existing) {
      // Update existing stats
      existing.totalExecutions++;
      if (success) {
        existing.successfulExecutions++;
      } else {
        existing.failedExecutions++;
      }
      existing.successRate = existing.successfulExecutions / existing.totalExecutions;

      if (duration !== undefined) {
        // Update running average
        existing.averageDuration =
          (existing.averageDuration * (existing.totalExecutions - 1) + duration) /
          existing.totalExecutions;
      }

      existing.lastExecuted = Date.now();
    } else {
      // Create new stats entry
      const stats: CommandStats = {
        command,
        tool,
        totalExecutions: 1,
        successfulExecutions: success ? 1 : 0,
        failedExecutions: success ? 0 : 1,
        successRate: success ? 1.0 : 0.0,
        averageDuration: duration ?? 0,
        lastExecuted: Date.now(),
        contexts: [tool],
      };
      this.commandStats.set(key, stats);
    }
  }

  /**
   * Analyze patterns across all learned data.
   *
   * Provides insights into pattern reliability, recent discoveries,
   * and areas needing improvement.
   *
   * @returns Comprehensive pattern analysis
   */
  async analyzePatterns(): Promise<PatternAnalysis> {
    const patterns = this.knowledgeBase.getAllReflectivePatterns();

    // Group patterns by type
    const patternsByType: Record<string, number> = {};
    for (const pattern of patterns) {
      patternsByType[pattern.type] = (patternsByType[pattern.type] || 0) + 1;
    }

    // Sort by success rate for most reliable
    const mostReliablePatterns = patterns
      .filter((p) => p.successRate !== undefined && p.successRate >= 0.8)
      .sort((a, b) => (b.successRate || 0) - (a.successRate || 0))
      .slice(0, 10)
      .map((p) => this.convertToLearnedPattern(p));

    // Patterns needing improvement (low success rate)
    const patternsNeedingImprovement = patterns
      .filter((p) => p.successRate !== undefined && p.successRate < 0.5)
      .sort((a, b) => (a.successRate || 0) - (b.successRate || 0))
      .slice(0, 10)
      .map((p) => this.convertToLearnedPattern(p));

    // Recently discovered patterns (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyDiscoveredPatterns = patterns
      .filter((p) => p.createdAt && p.createdAt > oneDayAgo)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 10)
      .map((p) => this.convertToLearnedPattern(p));

    // Calculate overall success rate
    const allSuccessRates = patterns
      .filter((p) => p.successRate !== undefined)
      .map((p) => p.successRate!);

    const overallSuccessRate =
      allSuccessRates.length > 0
        ? allSuccessRates.reduce((a, b) => a + b, 0) / allSuccessRates.length
        : 0;

    return {
      totalPatterns: patterns.length,
      patternsByType,
      mostReliablePatterns,
      patternsNeedingImprovement,
      recentlyDiscoveredPatterns,
      learningStats: {
        totalExecutionsAnalyzed: this.totalExecutionsAnalyzed,
        successRate: Math.round(overallSuccessRate * 100) / 100,
        patternsExtracted: patterns.length,
        workflowsDiscovered: this.workflowPatterns.size,
      },
    };
  }

  /**
   * Get recommendations based on learned patterns.
   *
   * Provides context-aware recommendations for commands, workflows,
   * warnings, and optimizations.
   *
   * @param context - Current context to base recommendations on
   * @returns Array of recommendations sorted by confidence
   */
  async getRecommendations(context: string): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    // Query reflective patterns from KnowledgeBase
    const patterns = await this.knowledgeBase.queryReflective(context);

    // Convert patterns to recommendations
    for (const pattern of patterns.slice(0, 10)) {
      let type: Recommendation["type"] = "command";
      let content = "";
      let reasoning = "";

      switch (pattern.type) {
        case "command_sequence":
          type = "command";
          content = pattern.signature.toString();
          reasoning = `This command has been used ${pattern.usageCount} times with a ${Math.round((pattern.successRate || 0) * 100)}% success rate.`;
          break;

        case "error_recovery":
          type = "warning";
          content = `Watch for: ${pattern.signature.toString()}`;
          reasoning = `This error pattern has been encountered before. ${pattern.description}`;
          break;

        case "workflow":
          type = "workflow";
          content = pattern.signature.toString();
          reasoning = `This workflow has been successfully used ${pattern.usageCount} times.`;
          break;

        case "heuristic":
          type = "optimization";
          content = pattern.description;
          reasoning = `Learned heuristic with ${Math.round(pattern.confidence * 100)}% confidence.`;
          break;
      }

      recommendations.push({
        type,
        content,
        confidence: pattern.confidence * (pattern.successRate || 0.5),
        reasoning,
        source: pattern.id,
      });
    }

    // Add recommendations based on command stats
    const highSuccessCommands = Array.from(this.commandStats.values())
      .filter((stats) => stats.successRate >= 0.9 && stats.totalExecutions >= 3)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);

    for (const stats of highSuccessCommands) {
      recommendations.push({
        type: "command",
        content: stats.command,
        confidence: stats.successRate,
        reasoning: `High success rate (${Math.round(stats.successRate * 100)}%) over ${stats.totalExecutions} executions.`,
        source: "command_stats",
      });
    }

    // Sort by confidence (descending)
    recommendations.sort((a, b) => b.confidence - a.confidence);

    return recommendations;
  }

  // ============================================================================
  // Public Utility Methods
  // ============================================================================

  /**
   * Get statistics for a specific command.
   *
   * @param command - The command to get stats for
   * @param tool - The tool context
   * @returns Command statistics or undefined if not found
   */
  getCommandStats(command: string, tool: string): CommandStats | undefined {
    return this.commandStats.get(this.getCommandKey(command, tool));
  }

  /**
   * Get all tracked command statistics.
   *
   * @returns Array of all command statistics
   */
  getAllCommandStats(): CommandStats[] {
    return Array.from(this.commandStats.values());
  }

  /**
   * Get a specific workflow pattern by ID.
   *
   * @param workflowId - The workflow ID
   * @returns Workflow pattern or undefined if not found
   */
  getWorkflow(workflowId: string): WorkflowPattern | undefined {
    return this.workflowPatterns.get(workflowId);
  }

  /**
   * Get all discovered workflow patterns.
   *
   * @returns Array of all workflow patterns
   */
  getAllWorkflows(): WorkflowPattern[] {
    return Array.from(this.workflowPatterns.values());
  }

  /**
   * Get learning statistics summary.
   *
   * @returns Learning statistics
   */
  getLearningStats(): {
    totalExecutionsAnalyzed: number;
    patternsLearned: number;
    workflowsDiscovered: number;
    commandStatsCount: number;
    failureAnalysesCount: number;
  } {
    return {
      totalExecutionsAnalyzed: this.totalExecutionsAnalyzed,
      patternsLearned: this.knowledgeBase.getAllReflectivePatterns().length,
      workflowsDiscovered: this.workflowPatterns.size,
      commandStatsCount: this.commandStats.size,
      failureAnalysesCount: this.failureAnalyses.size,
    };
  }

  /**
   * Enable or disable automatic learning.
   *
   * @param enabled - Whether to enable auto-learning
   */
  setAutoLearn(enabled: boolean): void {
    this.autoLearn = enabled;
    console.log(`[LearningAgent] Auto-learn ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Clear all learned data (use with caution).
   */
  async clearLearnedData(): Promise<void> {
    this.commandStats.clear();
    this.workflowPatterns.clear();
    this.commandSequences = [];
    this.failureAnalyses.clear();
    this.totalExecutionsAnalyzed = 0;

    console.log("[LearningAgent] All learned data cleared");
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private generatePatternId(): string {
    return `learn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private getCommandKey(command: string, tool: string): string {
    return `${tool}:${command}`;
  }

  private classifyPatternType(command: string, context: ExecutionContext): LearnedPattern["type"] {
    // Classify based on command content and context
    const cmdLower = command.toLowerCase();

    if (cmdLower.includes("opt") || cmdLower.includes("optimize")) {
      return "optimization";
    }

    if (context.commandHistory && context.commandHistory.length > 1) {
      return "command_sequence";
    }

    return "heuristic";
  }

  private generatePatternDescription(
    command: string,
    context: ExecutionContext,
    outcome: SuccessOutcome
  ): string {
    return `Learned pattern for '${command}' in ${context.tool}` +
           `${context.stage ? ` during ${context.stage}` : ""}` +
           ` (completed in ${outcome.duration}ms)`;
  }

  private serializeContext(context: ExecutionContext): string {
    return `${context.tool}${context.stage ? `:${context.stage}` : ""}`;
  }

  private calculateInitialConfidence(outcome: SuccessOutcome): number {
    // Higher confidence for faster, clean executions
    let confidence = 0.7;

    // Boost for fast execution (under 5 seconds)
    if (outcome.duration < 5000) {
      confidence += 0.1;
    }

    // Boost for clean exit
    if (outcome.exitCode === 0) {
      confidence += 0.1;
    }

    // Reduce confidence for very long executions (potential flakiness)
    if (outcome.duration > 60000) {
      confidence -= 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private async storePattern(pattern: LearnedPattern): Promise<void> {
    // Map LearnedPattern type to KnowledgeBase Pattern type
    // "optimization" maps to "heuristic" in KnowledgeBase
    const kbPatternType: Pattern["type"] =
      pattern.type === "optimization" ? "heuristic" : pattern.type;

    const kbPattern: Pattern = {
      id: pattern.id,
      type: kbPatternType,
      signature: pattern.signature,
      description: pattern.description,
      context: pattern.context,
      confidence: pattern.confidence,
      usageCount: pattern.usageCount,
      successRate: pattern.successRate,
      createdAt: new Date(),
      lastUsedAt: new Date(),
      metadata: pattern.metadata,
    };

    await this.knowledgeBase.storeReflective(kbPattern);
  }

  private trackCommandSequence(command: string, context: ExecutionContext): void {
    // Add to current sequence
    if (!context.commandHistory) {
      context.commandHistory = [];
    }
    context.commandHistory.push(command);

    // Store sequence for workflow discovery
    if (context.commandHistory.length >= 3) {
      this.commandSequences.push([...context.commandHistory]);

      // Keep only recent sequences to prevent memory bloat
      if (this.commandSequences.length > 100) {
        this.commandSequences = this.commandSequences.slice(-50);
      }
    }
  }

  private classifyFailureType(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes("timeout") || message.includes("timed out")) {
      return "timeout";
    }
    if (message.includes("permission") || message.includes("access")) {
      return "permission";
    }
    if (message.includes("not found") || message.includes("does not exist")) {
      return "not_found";
    }
    if (message.includes("syntax") || message.includes("parse")) {
      return "syntax";
    }
    if (message.includes("constraint") || message.includes("violation")) {
      return "constraint";
    }
    if (message.includes("resource") || message.includes("memory")) {
      return "resource";
    }

    return "unknown";
  }

  private extractErrorSignature(error: Error): string {
    // Extract a normalized error signature
    return error.message
      .split("\n")[0] // First line only
      .replace(/\d+/g, "#") // Normalize numbers
      .replace(/['"`][^'"`]*['"`]/g, "'") // Normalize quoted strings
      .substring(0, 200); // Limit length
  }

  private async analyzeRootCause(error: Error, context: ExecutionContext): Promise<string> {
    // Check if we have a known pattern for this error
    const knownPattern = await this.knowledgeBase.findErrorPattern(error.message);
    if (knownPattern) {
      return knownPattern.description;
    }

    // Basic root cause analysis
    const failureType = this.classifyFailureType(error);

    switch (failureType) {
      case "timeout":
        return `Command timed out. Consider increasing timeout or optimizing the command for ${context.tool}.`;
      case "permission":
        return `Permission denied. Check file permissions and user access rights.`;
      case "not_found":
        return `Required resource not found. Verify paths and dependencies for ${context.tool}.`;
      case "syntax":
        return `Syntax error in command. Check command syntax for ${context.tool}.`;
      case "constraint":
        return `Constraint violation detected. Review design constraints and timing requirements.`;
      case "resource":
        return `Resource limitation. Check available memory and disk space.`;
      default:
        return `Unknown error occurred: ${error.message}`;
    }
  }

  private suggestRecoveryCommands(error: Error, context: ExecutionContext): string[] {
    const failureType = this.classifyFailureType(error);
    const suggestions: string[] = [];

    switch (failureType) {
      case "timeout":
        suggestions.push(`# Increase timeout for ${context.tool}`);
        suggestions.push("set_timeout -value 300");
        break;
      case "permission":
        suggestions.push("# Check and fix permissions");
        suggestions.push("ls -la");
        break;
      case "not_found":
        suggestions.push(`# Verify ${context.tool} setup and paths`);
        suggestions.push("which " + context.tool);
        break;
      case "syntax":
        suggestions.push(`# Check ${context.tool} documentation for correct syntax`);
        suggestions.push("help");
        break;
      case "constraint":
        suggestions.push("# Review and adjust constraints");
        suggestions.push("report_constraints");
        break;
      case "resource":
        suggestions.push("# Check system resources");
        suggestions.push("df -h && free -m");
        break;
      default:
        suggestions.push("# Retry the command");
        suggestions.push("# Check logs for more details");
    }

    return suggestions;
  }

  private isKnownErrorPattern(error: Error): boolean {
    const signature = this.extractErrorSignature(error);

    for (const analysis of Array.from(this.failureAnalyses.values())) {
      if (analysis.errorSignature === signature) {
        return true;
      }
    }

    return false;
  }

  private calculateFailureConfidence(error: Error, _context: ExecutionContext): number {
    // Higher confidence for common, well-understood error types
    const failureType = this.classifyFailureType(error);

    switch (failureType) {
      case "timeout":
      case "permission":
      case "not_found":
        return 0.8;
      case "syntax":
      case "constraint":
        return 0.7;
      case "resource":
        return 0.6;
      default:
        return 0.4;
    }
  }

  private inferToolFromCommands(commands: string[]): string {
    // Infer the primary tool from command content
    const allCommands = commands.join(" ").toLowerCase();

    if (allCommands.includes("innovus")) return "innovus";
    if (allCommands.includes("genus")) return "genus";
    if (allCommands.includes("tempus")) return "tempus";
    if (allCommands.includes("icc2")) return "icc2";
    if (allCommands.includes("openroad")) return "openroad";

    // Infer from command patterns
    if (allCommands.includes("place_design") || allCommands.includes("route_design")) {
      return "innovus";
    }
    if (allCommands.includes("syn_generic") || allCommands.includes("syn_map")) {
      return "genus";
    }
    if (allCommands.includes("report_timing")) {
      return "tempus";
    }

    return "unknown";
  }

  private inferPrerequisites(commands: string[]): string[] {
    const prerequisites: string[] = [];
    const allCommands = commands.join(" ").toLowerCase();

    if (allCommands.includes("read_sdc") || allCommands.includes("read_spef")) {
      prerequisites.push("Design database loaded");
      prerequisites.push("Libraries configured");
    }

    if (allCommands.includes("place_design")) {
      prerequisites.push("Floorplan completed");
    }

    if (allCommands.includes("route_design")) {
      prerequisites.push("Placement completed");
      prerequisites.push("CTS completed");
    }

    return prerequisites;
  }

  private inferOutputs(commands: string[]): string[] {
    const outputs: string[] = [];
    const allCommands = commands.join(" ").toLowerCase();

    if (allCommands.includes("save_design")) {
      outputs.push("Design database (.enc)");
    }

    if (allCommands.includes("save_netlist") || allCommands.includes("write_hdl")) {
      outputs.push("Netlist (.v)");
    }

    if (allCommands.includes("report_timing")) {
      outputs.push("Timing reports");
    }

    if (allCommands.includes("verify_drc")) {
      outputs.push("DRC report");
    }

    return outputs;
  }

  private convertToLearnedPattern(pattern: Pattern): LearnedPattern {
    return {
      id: pattern.id,
      type: pattern.type as LearnedPattern["type"],
      signature: pattern.signature.toString(),
      description: pattern.description,
      context: pattern.context,
      confidence: pattern.confidence,
      usageCount: pattern.usageCount,
      successRate: pattern.successRate ?? 0,
      metadata: pattern.metadata || {},
    };
  }
}

export default LearningAgent;
