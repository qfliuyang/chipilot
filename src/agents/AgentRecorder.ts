/**
 * @fileoverview AgentRecorder - Comprehensive logging and telemetry for multi-agent system
 *
 * Records every input/output of each agent, calculates token usage,
 * and generates detailed reports for analyzing agent performance.
 *
 * Features:
 * - Message recording with timestamps
 * - Token usage estimation and tracking per agent
 * - Activity timeline generation
 * - Performance metrics calculation
 * - Markdown report generation
 * - JSON export for analysis
 */

import { AgentId, AgentMessage } from "./MessageBus";
import { EventEmitter } from "events";
import * as fs from "fs";
import * as path from "path";

/**
 * Record types for agent activities
 */
export type ActivityType =
  | "message_sent"
  | "message_received"
  | "state_change"
  | "task_started"
  | "task_completed"
  | "task_failed"
  | "llm_call"
  | "llm_response"
  | "error"
  | "initialization"
  | "shutdown";

/**
 * Single activity record
 */
export interface ActivityRecord {
  /** Unique record ID */
  id: string;

  /** Agent that performed the activity */
  agentId: string;

  /** Type of activity */
  type: ActivityType;

  /** Timestamp (milliseconds since epoch) */
  timestamp: number;

  /** Duration in milliseconds (if applicable) */
  duration?: number;

  /** Input data (message, prompt, etc.) */
  input?: unknown;

  /** Output data (response, result, etc.) */
  output?: unknown;

  /** Token usage for this activity */
  tokenUsage?: TokenUsage;

  /** Associated message ID (if applicable) */
  messageId?: string;

  /** Correlation ID for tracking related activities */
  correlationId?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Error information (if activity failed) */
  error?: string;
}

/**
 * Token usage statistics
 */
export interface TokenUsage {
  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens generated */
  outputTokens: number;

  /** Total tokens (input + output) */
  totalTokens: number;

  /** Estimated cost in USD (if calculable) */
  estimatedCost?: number;

  /** Token estimation method */
  estimationMethod: "exact" | "tiktoken" | "character_based" | "unknown";
}

/**
 * Aggregated statistics for an agent
 */
export interface AgentStatistics {
  /** Agent identifier */
  agentId: string;

  /** Total activities recorded */
  totalActivities: number;

  /** Total messages sent */
  messagesSent: number;

  /** Total messages received */
  messagesReceived: number;

  /** Total LLM calls made */
  llmCalls: number;

  /** Total tasks completed */
  tasksCompleted: number;

  /** Total tasks failed */
  tasksFailed: number;

  /** Total errors encountered */
  errorCount: number;

  /** Cumulative token usage */
  totalTokenUsage: TokenUsage;

  /** Average response time (ms) */
  averageResponseTime: number;

  /** First activity timestamp */
  firstActivityAt: number;

  /** Last activity timestamp */
  lastActivityAt: number;

  /** Activity breakdown by type */
  activityBreakdown: Record<ActivityType, number>;
}

/**
 * Session-wide recording statistics
 */
export interface SessionStatistics {
  /** Session start timestamp */
  sessionStart: number;

  /** Session end timestamp (if ended) */
  sessionEnd?: number;

  /** Total activities across all agents */
  totalActivities: number;

  /** Total messages exchanged */
  totalMessages: number;

  /** Total token usage across all agents */
  totalTokenUsage: TokenUsage;

  /** Agent participation statistics */
  agentStats: AgentStatistics[];

  /** Coordination score (0-100) */
  coordinationScore: number;
}

/**
 * Configuration options for AgentRecorder
 */
export interface AgentRecorderConfig {
  /** Output directory for recordings (default: ./recordings) */
  outputDir?: string;

  /** Session name/identifier */
  sessionName?: string;

  /** Maximum records to keep in memory (default: 10000) */
  maxMemoryRecords?: number;

  /** Whether to write to disk immediately (default: true) */
  writeImmediately?: boolean;

  /** Whether to include full message payloads (default: true) */
  includePayloads?: boolean;

  /** Maximum payload size in characters (default: 10000) */
  maxPayloadSize?: number;

  /** Enable console logging (default: false) */
  consoleLog?: boolean;
}

/**
 * AgentRecorder - Comprehensive logging and telemetry system
 *
 * Tracks all agent activities, calculates token usage, and generates
 * detailed reports for performance analysis and debugging.
 */
export class AgentRecorder extends EventEmitter {
  private config: Required<AgentRecorderConfig>;
  private activities: ActivityRecord[] = [];
  private sessionStart: number;
  private isRecording = false;
  private writeStream?: fs.WriteStream;

  // Token estimation constants
  private readonly AVG_CHARS_PER_TOKEN = 4;
  private readonly TOKEN_ESTIMATE_OVERHEAD = 10;

  constructor(config: AgentRecorderConfig = {}) {
    super();

    this.config = {
      outputDir: config.outputDir ?? "./recordings",
      sessionName: config.sessionName ?? `session_${Date.now()}`,
      maxMemoryRecords: config.maxMemoryRecords ?? 10000,
      writeImmediately: config.writeImmediately ?? true,
      includePayloads: config.includePayloads ?? true,
      maxPayloadSize: config.maxPayloadSize ?? 10000,
      consoleLog: config.consoleLog ?? false,
    };

    this.sessionStart = Date.now();

    if (this.config.writeImmediately) {
      this.initializeOutputFile();
    }
  }

  /**
   * Start recording agent activities
   */
  startRecording(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.sessionStart = Date.now();

    this.log("info", `Recording started: ${this.config.sessionName}`);

    this.emit("recordingStarted", {
      sessionName: this.config.sessionName,
      timestamp: this.sessionStart,
    });
  }

  /**
   * Stop recording agent activities
   */
  stopRecording(): void {
    if (!this.isRecording) return;

    this.isRecording = false;

    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = undefined;
    }

    this.log("info", `Recording stopped: ${this.config.sessionName}`);

    this.emit("recordingStopped", {
      sessionName: this.config.sessionName,
      timestamp: Date.now(),
      totalActivities: this.activities.length,
    });
  }

  /**
   * Record a message sent by an agent
   */
  recordMessageSent(
    agentId: string,
    message: AgentMessage,
    tokenUsage?: TokenUsage
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "message_sent",
      timestamp: Date.now(),
      messageId: message.id,
      correlationId: message.correlationId,
      input: this.sanitizePayload({
        to: message.to,
        type: message.type,
        payload: message.payload,
      }),
      tokenUsage,
      metadata: {
        priority: message.priority,
        recipient: message.to,
        messageType: message.type,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record a message received by an agent
   */
  recordMessageReceived(
    agentId: string,
    message: AgentMessage,
    tokenUsage?: TokenUsage
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "message_received",
      timestamp: Date.now(),
      messageId: message.id,
      correlationId: message.correlationId,
      input: this.sanitizePayload({
        from: message.from,
        type: message.type,
        payload: message.payload,
      }),
      tokenUsage,
      metadata: {
        sender: message.from,
        messageType: message.type,
        priority: message.priority,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record an agent state change
   */
  recordStateChange(
    agentId: string,
    oldState: string,
    newState: string,
    metadata?: Record<string, unknown>
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "state_change",
      timestamp: Date.now(),
      input: { state: oldState },
      output: { state: newState },
      metadata: {
        previousState: oldState,
        newState,
        ...metadata,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record the start of a task
   */
  recordTaskStarted(
    agentId: string,
    taskId: string,
    taskType: string,
    input?: unknown
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "task_started",
      timestamp: Date.now(),
      correlationId: taskId,
      input: this.sanitizePayload(input),
      metadata: {
        taskId,
        taskType,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record task completion
   */
  recordTaskCompleted(
    agentId: string,
    taskId: string,
    output?: unknown,
    duration?: number,
    tokenUsage?: TokenUsage
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "task_completed",
      timestamp: Date.now(),
      correlationId: taskId,
      duration,
      output: this.sanitizePayload(output),
      tokenUsage,
      metadata: {
        taskId,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record task failure
   */
  recordTaskFailed(
    agentId: string,
    taskId: string,
    error: string,
    duration?: number
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "task_failed",
      timestamp: Date.now(),
      correlationId: taskId,
      duration,
      error,
      metadata: {
        taskId,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record an LLM API call
   */
  recordLLMCall(
    agentId: string,
    prompt: string,
    model?: string,
    correlationId?: string
  ): void {
    const inputTokens = this.estimateTokens(prompt);

    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "llm_call",
      timestamp: Date.now(),
      correlationId,
      input: this.sanitizePayload({ prompt, model }),
      tokenUsage: {
        inputTokens,
        outputTokens: 0,
        totalTokens: inputTokens,
        estimationMethod: "character_based",
      },
      metadata: {
        model,
        promptLength: prompt.length,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record an LLM response
   */
  recordLLMResponse(
    agentId: string,
    response: string,
    actualTokenUsage?: { input: number; output: number },
    correlationId?: string,
    duration?: number
  ): void {
    const outputTokens = actualTokenUsage
      ? actualTokenUsage.output
      : this.estimateTokens(response);
    const inputTokens = actualTokenUsage?.input ?? 0;

    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "llm_response",
      timestamp: Date.now(),
      correlationId,
      duration,
      output: this.sanitizePayload({ response }),
      tokenUsage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        estimationMethod: actualTokenUsage ? "exact" : "character_based",
      },
      metadata: {
        responseLength: response.length,
      },
    };

    this.addRecord(record);
  }

  /**
   * Record an error
   */
  recordError(
    agentId: string,
    error: Error | string,
    context?: Record<string, unknown>
  ): void {
    const record: ActivityRecord = {
      id: this.generateRecordId(),
      agentId,
      type: "error",
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : error,
      metadata: context,
    };

    this.addRecord(record);
  }

  /**
   * Estimate token count from text
   * Uses character-based estimation as fallback
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / this.AVG_CHARS_PER_TOKEN) + this.TOKEN_ESTIMATE_OVERHEAD;
  }

  /**
   * Calculate actual token usage from TikToken encoding (if available)
   */
  calculateTokensWithTikToken(text: string): number | null {
    // This would require the @anthropic-ai/tokenizer or tiktoken library
    // For now, return null to indicate estimation is needed
    return null;
  }

  /**
   * Get activities for a specific agent
   */
  getAgentActivities(agentId: string, limit?: number): ActivityRecord[] {
    const filtered = this.activities.filter((a) => a.agentId === agentId);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get activities by type
   */
  getActivitiesByType(type: ActivityType, limit?: number): ActivityRecord[] {
    const filtered = this.activities.filter((a) => a.type === type);
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get activities within a time range
   */
  getActivitiesInRange(startTime: number, endTime: number): ActivityRecord[] {
    return this.activities.filter(
      (a) => a.timestamp >= startTime && a.timestamp <= endTime
    );
  }

  /**
   * Get all activities
   */
  getAllActivities(): ActivityRecord[] {
    return [...this.activities];
  }

  /**
   * Get statistics for a specific agent
   */
  getAgentStatistics(agentId: string): AgentStatistics {
    const agentActivities = this.activities.filter((a) => a.agentId === agentId);

    if (agentActivities.length === 0) {
      return this.createEmptyAgentStats(agentId);
    }

    const messagesSent = agentActivities.filter((a) => a.type === "message_sent").length;
    const messagesReceived = agentActivities.filter((a) => a.type === "message_received").length;
    const llmCalls = agentActivities.filter((a) => a.type === "llm_call").length;
    const tasksCompleted = agentActivities.filter((a) => a.type === "task_completed").length;
    const tasksFailed = agentActivities.filter((a) => a.type === "task_failed").length;
    const errorCount = agentActivities.filter((a) => a.type === "error").length;

    // Calculate token usage
    const totalTokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimationMethod: "exact",
    };

    let hasEstimates = false;
    for (const activity of agentActivities) {
      if (activity.tokenUsage) {
        totalTokenUsage.inputTokens += activity.tokenUsage.inputTokens;
        totalTokenUsage.outputTokens += activity.tokenUsage.outputTokens;
        totalTokenUsage.totalTokens += activity.tokenUsage.totalTokens;
        if (activity.tokenUsage.estimationMethod !== "exact") {
          hasEstimates = true;
        }
      }
    }

    if (hasEstimates) {
      totalTokenUsage.estimationMethod = "character_based";
    }

    // Calculate average response time
    const activitiesWithDuration = agentActivities.filter((a) => a.duration);
    const averageResponseTime =
      activitiesWithDuration.length > 0
        ? activitiesWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) /
          activitiesWithDuration.length
        : 0;

    // Activity breakdown
    const activityBreakdown = {} as Record<ActivityType, number>;
    for (const activity of agentActivities) {
      activityBreakdown[activity.type] = (activityBreakdown[activity.type] || 0) + 1;
    }

    return {
      agentId,
      totalActivities: agentActivities.length,
      messagesSent,
      messagesReceived,
      llmCalls,
      tasksCompleted,
      tasksFailed,
      errorCount,
      totalTokenUsage,
      averageResponseTime,
      firstActivityAt: agentActivities[0]?.timestamp || 0,
      lastActivityAt: agentActivities[agentActivities.length - 1]?.timestamp || 0,
      activityBreakdown,
    };
  }

  /**
   * Get session-wide statistics
   */
  getSessionStatistics(): SessionStatistics {
    const agentIds = [...new Set(this.activities.map((a) => a.agentId))];
    const agentStats = agentIds.map((id) => this.getAgentStatistics(id));

    const totalMessages = this.activities.filter(
      (a) => a.type === "message_sent" || a.type === "message_received"
    ).length;

    const totalTokenUsage: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimationMethod: "exact",
    };

    let hasEstimates = false;
    for (const stats of agentStats) {
      totalTokenUsage.inputTokens += stats.totalTokenUsage.inputTokens;
      totalTokenUsage.outputTokens += stats.totalTokenUsage.outputTokens;
      totalTokenUsage.totalTokens += stats.totalTokenUsage.totalTokens;
      if (stats.totalTokenUsage.estimationMethod !== "exact") {
        hasEstimates = true;
      }
    }

    if (hasEstimates) {
      totalTokenUsage.estimationMethod = "character_based";
    }

    // Calculate coordination score (0-100)
    // Based on: message diversity, agent participation, task completion rate
    const coordinationScore = this.calculateCoordinationScore(agentStats);

    return {
      sessionStart: this.sessionStart,
      sessionEnd: this.isRecording ? undefined : Date.now(),
      totalActivities: this.activities.length,
      totalMessages,
      totalTokenUsage,
      agentStats,
      coordinationScore,
    };
  }

  /**
   * Generate a detailed Markdown report
   */
  generateMarkdownReport(): string {
    const stats = this.getSessionStatistics();

    let report = `# Agent Activity Report\n\n`;
    report += `**Session:** ${this.config.sessionName}\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Duration:** ${this.formatDuration((stats.sessionEnd || Date.now()) - stats.sessionStart)}\n\n`;

    // Executive Summary
    report += `## Executive Summary\n\n`;
    report += `- **Total Activities:** ${stats.totalActivities.toLocaleString()}\n`;
    report += `- **Total Messages:** ${stats.totalMessages.toLocaleString()}\n`;
    report += `- **Total Token Usage:** ${stats.totalTokenUsage.totalTokens.toLocaleString()}\n`;
    report += `  - Input: ${stats.totalTokenUsage.inputTokens.toLocaleString()}\n`;
    report += `  - Output: ${stats.totalTokenUsage.outputTokens.toLocaleString()}\n`;
    report += `  - Estimation: ${stats.totalTokenUsage.estimationMethod}\n`;
    report += `- **Coordination Score:** ${stats.coordinationScore.toFixed(1)}/100\n\n`;

    // Agent Statistics Table
    report += `## Agent Performance\n\n`;
    report += `| Agent | Activities | Messages | LLM Calls | Tasks | Errors | Avg Response | Tokens |\n`;
    report += `|-------|------------|----------|-----------|-------|--------|--------------|--------|\n`;

    for (const agent of stats.agentStats.sort(
      (a, b) => b.totalActivities - a.totalActivities
    )) {
      const name = agent.agentId.padEnd(15);
      const acts = agent.totalActivities.toString().padStart(10);
      const msgs = (agent.messagesSent + agent.messagesReceived).toString().padStart(8);
      const llm = agent.llmCalls.toString().padStart(9);
      const tasks = `${agent.tasksCompleted}/${agent.tasksFailed}`.padStart(5);
      const errs = agent.errorCount.toString().padStart(6);
      const avg = `${agent.averageResponseTime.toFixed(0)}ms`.padStart(12);
      const tokens = agent.totalTokenUsage.totalTokens.toLocaleString().padStart(10);

      report += `| ${name} | ${acts} | ${msgs} | ${llm} | ${tasks} | ${errs} | ${avg} | ${tokens} |\n`;
    }

    report += `\n`;

    // Detailed Agent Breakdown
    report += `## Detailed Agent Analysis\n\n`;

    for (const agent of stats.agentStats.sort(
      (a, b) => b.totalActivities - a.totalActivities
    )) {
      report += `### ${agent.agentId}\n\n`;
      report += `- **Status:** ${agent.errorCount > 0 ? "⚠️ Has Errors" : "✅ Active"}\n`;
      report += `- **Activities:** ${agent.totalActivities}\n`;
      report += `- **Messages Sent:** ${agent.messagesSent}\n`;
      report += `- **Messages Received:** ${agent.messagesReceived}\n`;
      report += `- **LLM Calls:** ${agent.llmCalls}\n`;
      report += `- **Tasks Completed:** ${agent.tasksCompleted}\n`;
      report += `- **Tasks Failed:** ${agent.tasksFailed}\n`;
      report += `- **Errors:** ${agent.errorCount}\n`;
      report += `- **Average Response Time:** ${agent.averageResponseTime.toFixed(2)}ms\n`;
      report += `- **Token Usage:**\n`;
      report += `  - Input: ${agent.totalTokenUsage.inputTokens.toLocaleString()}\n`;
      report += `  - Output: ${agent.totalTokenUsage.outputTokens.toLocaleString()}\n`;
      report += `  - Total: ${agent.totalTokenUsage.totalTokens.toLocaleString()}\n`;

      // Activity breakdown
      report += `- **Activity Breakdown:**\n`;
      for (const [type, count] of Object.entries(agent.activityBreakdown).sort(
        (a, b) => b[1] - a[1]
      )) {
        const percentage = ((count / agent.totalActivities) * 100).toFixed(1);
        report += `  - ${type}: ${count} (${percentage}%)\n`;
      }
      report += `\n`;
    }

    // Activity Timeline
    report += `## Activity Timeline\n\n`;
    report += this.generateActivityTimeline();

    // Recommendations
    report += `## Recommendations\n\n`;
    report += this.generateRecommendations(stats);

    return report;
  }

  /**
   * Generate activity timeline in Markdown format
   */
  generateActivityTimeline(maxEntries = 100): string {
    const activities = this.activities.slice(-maxEntries);

    let timeline = `| Time | Agent | Activity | Duration | Tokens | Details |\n`;
    timeline += `|------|-------|----------|----------|--------|---------|\n`;

    for (const activity of activities) {
      const time = new Date(activity.timestamp).toISOString().split("T")[1].split(".")[0];
      const agent = activity.agentId;
      const type = activity.type;
      const duration = activity.duration ? `${activity.duration}ms` : "-";
      const tokens = activity.tokenUsage ? activity.tokenUsage.totalTokens.toString() : "-";

      let details = "";
      if (activity.error) {
        details = `Error: ${activity.error.substring(0, 50)}...`;
      } else if (activity.metadata?.taskId) {
        details = `Task: ${activity.metadata.taskId}`;
      } else if (activity.metadata?.messageType) {
        details = `Type: ${activity.metadata.messageType}`;
      }

      timeline += `| ${time} | ${agent} | ${type} | ${duration} | ${tokens} | ${details} |\n`;
    }

    return timeline;
  }

  /**
   * Generate recommendations based on statistics
   */
  private generateRecommendations(stats: SessionStatistics): string {
    const recommendations: string[] = [];

    // Check for inactive agents
    const inactiveAgents = stats.agentStats.filter((s) => s.totalActivities === 0);
    if (inactiveAgents.length > 0) {
      recommendations.push(
        `- **Inactive Agents:** ${inactiveAgents.map((a) => a.agentId).join(", ")} have no recorded activities. Verify they are properly initialized.`
      );
    }

    // Check for high error rates
    const highErrorAgents = stats.agentStats.filter(
      (s) => s.errorCount > 0 && s.errorCount / s.totalActivities > 0.1
    );
    if (highErrorAgents.length > 0) {
      recommendations.push(
        `- **High Error Rates:** ${highErrorAgents
          .map((a) => a.agentId)
          .join(", ")} have error rates >10%. Investigate root causes.`
      );
    }

    // Check for token usage
    const highTokenAgents = stats.agentStats.filter(
      (s) => s.totalTokenUsage.totalTokens > 10000
    );
    if (highTokenAgents.length > 0) {
      recommendations.push(
        `- **High Token Usage:** ${highTokenAgents
          .map((a) => a.agentId)
          .join(", ")} have high token consumption. Consider optimization.`
      );
    }

    // Check coordination
    if (stats.coordinationScore < 50) {
      recommendations.push(
        `- **Low Coordination:** Coordination score is ${stats.coordinationScore.toFixed(
          1
        )}/100. Improve inter-agent communication patterns.`
      );
    }

    return recommendations.length > 0
      ? recommendations.join("\n\n") + "\n"
      : "- All agents are performing within normal parameters.\n";
  }

  /**
   * Export all activities as JSON
   */
  exportToJSON(): string {
    return JSON.stringify(
      {
        sessionName: this.config.sessionName,
        sessionStart: this.sessionStart,
        sessionEnd: this.isRecording ? null : Date.now(),
        statistics: this.getSessionStatistics(),
        activities: this.activities,
      },
      null,
      2
    );
  }

  /**
   * Save report to file
   */
  saveReport(format: "markdown" | "json" = "markdown"): string {
    const outputDir = path.resolve(this.config.outputDir);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${this.config.sessionName}_${timestamp}.${format === "markdown" ? "md" : "json"}`;
    const filepath = path.join(outputDir, filename);

    const content = format === "markdown" ? this.generateMarkdownReport() : this.exportToJSON();

    fs.writeFileSync(filepath, content, "utf-8");

    this.log("info", `Report saved to: ${filepath}`);

    return filepath;
  }

  /**
   * Clear all recorded activities
   */
  clear(): void {
    this.activities = [];
    this.sessionStart = Date.now();
    this.log("info", "Recording cleared");
  }

  /**
   * Get recording status
   */
  get isActive(): boolean {
    return this.isRecording;
  }

  // Private helper methods

  private addRecord(record: ActivityRecord): void {
    this.activities.push(record);

    // Trim if exceeds memory limit
    if (this.activities.length > this.config.maxMemoryRecords) {
      this.activities = this.activities.slice(-this.config.maxMemoryRecords);
    }

    // Write to disk if enabled
    if (this.config.writeImmediately && this.writeStream) {
      this.writeStream.write(JSON.stringify(record) + "\n");
    }

    // Console log if enabled
    if (this.config.consoleLog) {
      console.log(
        `[Recorder] ${record.agentId} - ${record.type} at ${new Date(
          record.timestamp
        ).toISOString()}`
      );
    }

    this.emit("activityRecorded", record);
  }

  private initializeOutputFile(): void {
    try {
      const outputDir = path.resolve(this.config.outputDir);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filename = `${this.config.sessionName}.ndjson`;
      const filepath = path.join(outputDir, filename);

      this.writeStream = fs.createWriteStream(filepath, { flags: "a" });

      this.writeStream.write(
        JSON.stringify({
          type: "session_start",
          sessionName: this.config.sessionName,
          timestamp: this.sessionStart,
        }) + "\n"
      );

      this.log("info", `Output file initialized: ${filepath}`);
    } catch (error) {
      this.log("error", "Failed to initialize output file:", error);
    }
  }

  private generateRecordId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private sanitizePayload(payload: unknown): unknown {
    if (!this.config.includePayloads) {
      return undefined;
    }

    const stringified = JSON.stringify(payload);
    if (stringified.length > this.config.maxPayloadSize) {
      return {
        _truncated: true,
        _originalSize: stringified.length,
        preview: stringified.substring(0, this.config.maxPayloadSize) + "...",
      };
    }

    return payload;
  }

  private createEmptyAgentStats(agentId: string): AgentStatistics {
    return {
      agentId,
      totalActivities: 0,
      messagesSent: 0,
      messagesReceived: 0,
      llmCalls: 0,
      tasksCompleted: 0,
      tasksFailed: 0,
      errorCount: 0,
      totalTokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimationMethod: "unknown",
      },
      averageResponseTime: 0,
      firstActivityAt: 0,
      lastActivityAt: 0,
      activityBreakdown: {} as Record<ActivityType, number>,
    };
  }

  private calculateCoordinationScore(agentStats: AgentStatistics[]): number {
    if (agentStats.length === 0) return 0;

    // Factors:
    // 1. Agent participation rate (agents with activity / total agents)
    // 2. Message diversity (different message types used)
    // 3. Task completion rate (completed / total tasks)
    // 4. Error rate (lower is better)

    const activeAgents = agentStats.filter((s) => s.totalActivities > 0).length;
    const participationRate = activeAgents / agentStats.length;

    const totalTasks = agentStats.reduce(
      (sum, s) => sum + s.tasksCompleted + s.tasksFailed,
      0
    );
    const completedTasks = agentStats.reduce((sum, s) => sum + s.tasksCompleted, 0);
    const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 0.5;

    const totalErrors = agentStats.reduce((sum, s) => sum + s.errorCount, 0);
    const totalActivities = agentStats.reduce((sum, s) => sum + s.totalActivities, 0);
    const errorRate = totalActivities > 0 ? totalErrors / totalActivities : 0;

    // Weighted score
    const score =
      participationRate * 30 + taskCompletionRate * 40 + (1 - errorRate) * 30;

    return Math.min(Math.max(score, 0), 100);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private log(
    level: "debug" | "info" | "warn" | "error",
    ...args: unknown[]
  ): void {
    if (!this.config.consoleLog && level === "debug") return;

    const timestamp = new Date().toISOString();
    const prefix = `[AgentRecorder:${level.toUpperCase()}] ${timestamp}`;

    console.log(prefix, ...args);
  }
}

/** Singleton instance */
let globalRecorder: AgentRecorder | null = null;

/**
 * Get or create the global AgentRecorder instance
 */
export function getAgentRecorder(config?: AgentRecorderConfig): AgentRecorder {
  if (!globalRecorder) {
    globalRecorder = new AgentRecorder(config);
  }
  return globalRecorder;
}

/**
 * Reset the global AgentRecorder instance
 */
export function resetAgentRecorder(): void {
  if (globalRecorder) {
    globalRecorder.stopRecording();
    globalRecorder = null;
  }
}

export default AgentRecorder;
