/**
 * @fileoverview KnowledgeCuratorAgent - Manages EDA knowledge base lifecycle and curation.
 *
 * This agent is responsible for:
 * - Seeding initial EDA tool knowledge into the KnowledgeBase
 * - Monitoring knowledge quality and usage patterns
 * - Triggering learning from successful command sequences
 * - Managing vector index lifecycle in Pinecone
 * - Curating error patterns and recovery strategies
 *
 * Architecture: Manager Layer in the hierarchical multi-agent system
 * @see docs/architecture/multi-agent-system-final.md
 */

import BaseAgent, { AgentMessage, BaseAgentOptions } from "./BaseAgent";
import { MessageBus, AgentId, AgentMessage as BusAgentMessage } from "./MessageBus";
import KnowledgeBase, {
  VectorIndices,
  CommandMetadata,
  ErrorMetadata,
  WorkflowMetadata,
  Pattern,
  Vector,
} from "./KnowledgeBase";

/**
 * Represents a gap in the knowledge base that needs to be filled
 */
export interface KnowledgeGap {
  /** Type of missing knowledge */
  type: "command" | "error_pattern" | "workflow" | "tool_coverage";

  /** Specific tool affected (if applicable) */
  tool?: string;

  /** Description of the gap */
  description: string;

  /** Priority for filling this gap */
  priority: "low" | "medium" | "high" | "critical";

  /** Suggested action to fill the gap */
  suggestedAction: string;
}

/**
 * Exported knowledge structure for backup/sharing
 */
export interface ExportedKnowledge {
  /** Export metadata */
  metadata: {
    exportedAt: string;
    version: string;
    totalCommands: number;
    totalErrorPatterns: number;
    totalWorkflows: number;
    totalPatterns: number;
  };

  /** Command knowledge entries */
  commands: Array<{
    id: string;
    tool: string;
    command: string;
    description: string;
    category: string;
    tags: string[];
    successRate: number;
    usageCount: number;
  }>;

  /** Error pattern entries */
  errorPatterns: Array<{
    id: string;
    errorType: string;
    tool: string;
    symptomPattern: string;
    rootCause: string;
    solutionCommands: string[];
    recoveryStrategy: string;
  }>;

  /** Workflow entries */
  workflows: Array<{
    id: string;
    name: string;
    description: string;
    taskType: string;
    commandSequence: string[];
    prerequisites: string[];
    outputs: string[];
    successRate: number;
  }>;

  /** Learned patterns */
  patterns: Array<{
    id: string;
    type: string;
    signature: string;
    description: string;
    context: string;
    confidence: number;
    usageCount: number;
    successRate?: number;
  }>;
}

/**
 * Statistics about knowledge base usage and quality
 */
export interface KnowledgeStats {
  /** Total commands stored */
  totalCommands: number;

  /** Total error patterns stored */
  totalErrorPatterns: number;

  /** Total workflows stored */
  totalWorkflows: number;

  /** Total learned patterns */
  totalPatterns: number;

  /** Commands by tool */
  commandsByTool: Record<string, number>;

  /** Average success rate across all commands */
  averageSuccessRate: number;

  /** Most frequently used commands */
  topCommands: Array<{ command: string; usageCount: number }>;

  /** Knowledge gaps identified */
  knowledgeGaps: KnowledgeGap[];
}

/**
 * Configuration options for KnowledgeCuratorAgent initialization
 */
export interface KnowledgeCuratorOptions extends BaseAgentOptions {
  /** KnowledgeBase instance for RAG queries */
  knowledgeBase: KnowledgeBase;
  /** MessageBus instance for inter-agent communication */
  messageBus?: MessageBus;
}

/**
 * KnowledgeCuratorAgent manages the lifecycle of EDA knowledge in the system.
 *
 * Responsibilities:
 * - Seed initial knowledge for EDA tools (Innovus, Genus, Tempus, etc.)
 * - Curate and validate knowledge entries
 * - Monitor usage patterns and identify gaps
 * - Export/import knowledge for backup and sharing
 * - Manage vector index lifecycle in Pinecone
 */
export class KnowledgeCuratorAgent extends BaseAgent {
  /** Reference to the KnowledgeBase instance */
  private knowledgeBase: KnowledgeBase;

  /** Reference to the MessageBus instance */
  private messageBus?: MessageBus;

  /** Track seeded status to avoid duplicate seeding */
  private isSeeded = false;

  /**
   * Creates a new KnowledgeCuratorAgent instance.
   *
   * @param options - Configuration options including knowledgeBase
   */
  constructor(options: KnowledgeCuratorOptions) {
    super(options);

    if (!options.knowledgeBase) {
      throw new Error("KnowledgeCuratorAgent requires a KnowledgeBase instance");
    }

    this.knowledgeBase = options.knowledgeBase;
    this.messageBus = options.messageBus;
  }

  /**
   * Lifecycle hook: Initialize the agent.
   * Sets up knowledge base indices and seeds initial data if needed.
   */
  protected async onInitialize(): Promise<void> {
    console.log("[KnowledgeCuratorAgent] Initializing...");

    // Register with MessageBus if available
    if (this.messageBus) {
      this.messageBus.registerAgent("knowledge-curator" as AgentId, async (message) => {
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
          console.error("[KnowledgeCuratorAgent] Failed to send message via MessageBus:", err);
        });
      });
    }

    // Check if Pinecone is available
    if (!this.knowledgeBase.isPersistentAvailable()) {
      console.warn(
        "[KnowledgeCuratorAgent] Pinecone not available. Knowledge will be stored in-memory only."
      );
    }

    // Seed initial knowledge
    await this.seedInitialKnowledge();

    console.log("[KnowledgeCuratorAgent] Initialization complete");
  }

  /**
   * Lifecycle hook: Start the agent.
   */
  protected async onStart(): Promise<void> {
    console.log("[KnowledgeCuratorAgent] Started");
  }

  /**
   * Lifecycle hook: Stop the agent.
   */
  protected async onStop(): Promise<void> {
    console.log("[KnowledgeCuratorAgent] Stopped");
  }

  /**
   * Handle incoming messages from other agents.
   *
   * Supported message types:
   * - 'knowledge.add_command': Add a new command to the knowledge base
   * - 'knowledge.add_error': Add an error pattern
   * - 'knowledge.capture_workflow': Capture a successful workflow
   * - 'knowledge.query': Query the knowledge base
   * - 'knowledge.export': Export knowledge for backup
   * - 'knowledge.analyze_gaps': Analyze knowledge gaps
   *
   * @param message - The message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    console.log(`[KnowledgeCuratorAgent] Received message: ${message.type}`);

    switch (message.type) {
      case "knowledge.add_command": {
        const { tool, command, description, metadata } = message.payload as {
          tool: string;
          command: string;
          description: string;
          metadata?: Partial<CommandMetadata>;
        };
        await this.addCommandKnowledge(tool, command, description, metadata);
        break;
      }

      case "knowledge.add_error": {
        const { error, solution, tool } = message.payload as {
          error: string;
          solution: string;
          tool: string;
        };
        await this.addErrorPattern(error, solution, tool);
        break;
      }

      case "knowledge.capture_workflow": {
        const { name, steps, tool } = message.payload as {
          name: string;
          steps: string[];
          tool: string;
        };
        await this.captureWorkflow(name, steps, tool);
        break;
      }

      case "task.assign": {
        // Handle task assignment from planner
        const taskPayload = message.payload as {
          taskId: string;
          planId: string;
          taskType: string;
          description: string;
          payload: {
            query?: string;
            context?: string;
          };
        };

        try {
          if (taskPayload.taskType === "query_knowledge") {
            const { query, context } = taskPayload.payload;
            if (query) {
              const result = await this.knowledgeBase.retrieveAndGenerate(query, context);
              this.sendMessage({
                recipient: message.sender,
                type: "task.complete",
                payload: {
                  taskId: taskPayload.taskId,
                  planId: taskPayload.planId,
                  result,
                },
                correlationId: message.correlationId,
                priority: "high",
              });
              return;
            }
          }

          // For other task types or missing data, acknowledge completion
          this.sendMessage({
            recipient: message.sender,
            type: "task.complete",
            payload: {
              taskId: taskPayload.taskId,
              planId: taskPayload.planId,
              result: { acknowledged: true },
            },
            correlationId: message.correlationId,
          });
        } catch (error) {
          this.sendMessage({
            recipient: message.sender,
            type: "task.failed",
            payload: {
              taskId: taskPayload.taskId,
              planId: taskPayload.planId,
              error: error instanceof Error ? error.message : String(error),
            },
            correlationId: message.correlationId,
            priority: "critical",
          });
        }
        break;
      }

      case "knowledge.query": {
        const { query, correlationId } = message.payload as {
          query: string;
          correlationId?: string;
        };
        const result = await this.knowledgeBase.retrieveAndGenerate(query);
        this.sendMessage({
          recipient: message.sender,
          type: "knowledge.query_result",
          payload: result,
          correlationId: correlationId || message.correlationId,
        });
        break;
      }

      case "knowledge.export": {
        const exported = await this.exportKnowledge();
        this.sendMessage({
          recipient: message.sender,
          type: "knowledge.export_result",
          payload: exported,
          correlationId: message.correlationId,
        });
        break;
      }

      case "knowledge.analyze_gaps": {
        const gaps = await this.analyzeKnowledgeGaps();
        this.sendMessage({
          recipient: message.sender,
          type: "knowledge.gaps_result",
          payload: gaps,
          correlationId: message.correlationId,
        });
        break;
      }

      case "knowledge.get_stats": {
        const stats = await this.getKnowledgeStats();
        this.sendMessage({
          recipient: message.sender,
          type: "knowledge.stats_result",
          payload: stats,
          correlationId: message.correlationId,
        });
        break;
      }

      default:
        console.warn(
          `[KnowledgeCuratorAgent] Unknown message type: ${message.type}`
        );
    }
  }

  /**
   * Seed initial EDA tool knowledge into the knowledge base.
   *
   * This method populates the knowledge base with:
   * - Common Innovus commands (floorplan, place, route, etc.)
   * - Common Genus commands (elaborate, synthesize, etc.)
   * - Common Tempus commands (read_sdc, report_timing, etc.)
   * - Error patterns and solutions
   * - Common workflows
   */
  async seedInitialKnowledge(): Promise<void> {
    if (this.isSeeded) {
      console.log("[KnowledgeCuratorAgent] Knowledge already seeded, skipping");
      return;
    }

    console.log("[KnowledgeCuratorAgent] Seeding initial EDA knowledge...");

    try {
      // Always seed reflective tier (works without Pinecone)
      await this.seedReflectiveKnowledge();

      // Seed persistent tier only if Pinecone is available
      if (this.knowledgeBase.isPersistentAvailable()) {
        await this.seedPersistentKnowledge();
      } else {
        console.log(
          "[KnowledgeCuratorAgent] Persistent storage not available. Reflective knowledge seeded."
        );
      }

      this.isSeeded = true;
      console.log("[KnowledgeCuratorAgent] Initial knowledge seeding complete");
    } catch (error) {
      console.error("[KnowledgeCuratorAgent] Error seeding knowledge:", error);
      throw error;
    }
  }

  /**
   * Seed reflective tier with basic EDA command patterns.
   * This works without Pinecone and provides immediate command recognition.
   */
  private async seedReflectiveKnowledge(): Promise<void> {
    const patterns: Array<{
      id: string;
      signature: string;
      description: string;
      context: string;
    }> = [
      // Innovus patterns
      {
        id: "pattern-innovus-placeDesign",
        signature: "placeDesign",
        description: "Run standard cell placement optimization in Innovus",
        context: "innovus",
      },
      {
        id: "pattern-innovus-place_opt_design",
        signature: "place_opt_design",
        description: "Placement optimization with timing and congestion in Innovus",
        context: "innovus",
      },
      {
        id: "pattern-innovus-routeDesign",
        signature: "routeDesign",
        description: "Run global and detailed routing in Innovus",
        context: "innovus",
      },
      {
        id: "pattern-innovus-report_timing",
        signature: "report_timing",
        description: "Generate timing analysis report in Innovus",
        context: "innovus",
      },
      {
        id: "pattern-innovus-report_congestion",
        signature: "report_congestion",
        description: "Report routing congestion analysis in Innovus",
        context: "innovus",
      },
      {
        id: "pattern-innovus-ccopt_design",
        signature: "ccopt_design",
        description: "Run clock tree synthesis and optimization in Innovus",
        context: "innovus",
      },

      // Genus patterns
      {
        id: "pattern-genus-syn_map",
        signature: "syn_map",
        description: "Map generic gates to technology library in Genus",
        context: "genus",
      },
      {
        id: "pattern-genus-syn_opt",
        signature: "syn_opt",
        description: "Optimize mapped design for timing and area in Genus",
        context: "genus",
      },

      // Tempus patterns
      {
        id: "pattern-tempus-report_timing",
        signature: "report_timing",
        description: "Generate setup timing report in Tempus",
        context: "tempus",
      },
      {
        id: "pattern-tempus-report_constraint",
        signature: "report_constraint",
        description: "Report constraint coverage and violations in Tempus",
        context: "tempus",
      },

      // General patterns
      {
        id: "pattern-general-floorplan",
        signature: "floorplan",
        description: "Initialize or modify design floorplan",
        context: "general",
      },
      {
        id: "pattern-general-power_analysis",
        signature: "power analysis",
        description: "Analyze power consumption and distribution",
        context: "general",
      },
      {
        id: "pattern-general-drc_verification",
        signature: "DRC verification",
        description: "Verify design rule compliance",
        context: "general",
      },
    ];

    for (const p of patterns) {
      const pattern: Pattern = {
        id: p.id,
        type: "command_sequence",
        signature: p.signature,
        description: p.description,
        context: p.context,
        confidence: 0.95,
        usageCount: 100,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      };

      await this.knowledgeBase.storeReflective(pattern);
    }

    console.log(
      `[KnowledgeCuratorAgent] Seeded ${patterns.length} reflective patterns`
    );
  }

  /**
   * Seed persistent tier with full EDA knowledge (requires Pinecone).
   */
  private async seedPersistentKnowledge(): Promise<void> {
    // Seed Innovus commands
    await this.seedInnovusCommands();

    // Seed Genus commands
    await this.seedGenusCommands();

    // Seed Tempus commands
    await this.seedTempusCommands();

    // Seed error patterns
    await this.seedErrorPatterns();

    // Seed workflows
    await this.seedWorkflows();
  }

  /**
   * Add a command to the knowledge base.
   *
   * @param tool - The EDA tool name (e.g., 'innovus', 'genus', 'tempus')
   * @param command - The command string
   * @param description - Human-readable description of the command
   * @param metadata - Additional metadata for the command
   */
  async addCommandKnowledge(
    tool: string,
    command: string,
    description: string,
    metadata: Partial<CommandMetadata> = {}
  ): Promise<void> {
    const id = `cmd-${tool}-${this.sanitizeId(command)}-${Date.now()}`;

    // Generate embedding for the command
    const embeddingText = `${tool} ${command} ${description} ${(metadata.tags || []).join(" ")}`;
    const vector = await this.knowledgeBase.generateEmbedding(embeddingText);

    const commandMetadata: CommandMetadata = {
      tool,
      command,
      description,
      category: metadata.category || "general",
      success_rate: metadata.success_rate ?? 1.0,
      usage_count: metadata.usage_count ?? 0,
      tags: metadata.tags || [tool, metadata.category || "general"],
    };

    const vectorData: Vector = {
      id,
      values: vector,
      metadata: commandMetadata,
    };

    await this.knowledgeBase.storePersistent(VectorIndices.COMMANDS, [
      vectorData,
    ]);

    console.log(`[KnowledgeCuratorAgent] Added command: ${tool} -> ${command}`);
  }

  /**
   * Add an error pattern from recovery experience.
   *
   * @param error - The error message or pattern
   * @param solution - The solution or recovery commands
   * @param tool - The EDA tool where this error occurs
   */
  async addErrorPattern(
    error: string,
    solution: string,
    tool: string
  ): Promise<void> {
    const id = `err-${tool}-${this.sanitizeId(error.substring(0, 50))}-${Date.now()}`;

    // Generate embedding for the error pattern
    const vector = await this.knowledgeBase.generateEmbedding(
      `${tool} ${error} ${solution}`
    );

    const errorMetadata: ErrorMetadata = {
      error_type: this.classifyErrorType(error),
      tool,
      symptom_pattern: error.substring(0, 500),
      root_cause: solution,
      solution_commands: this.extractCommandsFromSolution(solution),
      recovery_strategy: solution,
      frequency: 1,
    };

    const vectorData: Vector = {
      id,
      values: vector,
      metadata: errorMetadata,
    };

    await this.knowledgeBase.storePersistent(VectorIndices.ERRORS, [vectorData]);

    // Also store as a reflective pattern for quick matching
    const pattern: Pattern = {
      id: `pattern-${id}`,
      type: "error_recovery",
      signature: error.substring(0, 100),
      description: solution,
      context: tool,
      confidence: 0.8,
      usageCount: 1,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    await this.knowledgeBase.storeReflective(pattern);

    console.log(`[KnowledgeCuratorAgent] Added error pattern: ${tool}`);
  }

  /**
   * Capture a successful workflow for future learning.
   *
   * @param name - Name of the workflow
   * @param steps - Array of command steps
   * @param tool - Primary tool for this workflow
   */
  async captureWorkflow(
    name: string,
    steps: string[],
    tool: string
  ): Promise<void> {
    const id = `wf-${tool}-${this.sanitizeId(name)}-${Date.now()}`;

    // Generate embedding for the workflow
    const workflowText = `${tool} ${name} ${steps.join(" ")}`;
    const vector = await this.knowledgeBase.generateEmbedding(workflowText);

    const workflowMetadata: WorkflowMetadata = {
      name,
      description: `Workflow for ${name} using ${tool}`,
      task_type: this.classifyWorkflowType(name),
      command_sequence: steps,
      estimated_duration: steps.length * 60, // Rough estimate: 1 min per step
      success_rate: 1.0,
      prerequisites: [],
      outputs: [],
    };

    const vectorData: Vector = {
      id,
      values: vector,
      metadata: workflowMetadata,
    };

    await this.knowledgeBase.storePersistent(VectorIndices.WORKFLOWS, [
      vectorData,
    ]);

    // Also store as a reflective pattern
    const pattern: Pattern = {
      id: `pattern-${id}`,
      type: "workflow",
      signature: name,
      description: `Workflow: ${name}`,
      context: tool,
      confidence: 0.9,
      usageCount: 1,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    await this.knowledgeBase.storeReflective(pattern);

    console.log(`[KnowledgeCuratorAgent] Captured workflow: ${name}`);
  }

  /**
   * Analyze the knowledge base for gaps and missing information.
   *
   * @returns Array of identified knowledge gaps
   */
  async analyzeKnowledgeGaps(): Promise<KnowledgeGap[]> {
    const gaps: KnowledgeGap[] = [];

    // Check for tool coverage gaps
    const expectedTools = ["innovus", "genus", "tempus", "icc2", "openroad"];
    const kbStats = this.knowledgeBase.getStats();

    // If we have no persistent storage, we can't analyze gaps meaningfully
    if (!kbStats.persistentAvailable) {
      gaps.push({
        type: "tool_coverage",
        description:
          "Persistent storage (Pinecone) not available. Knowledge is ephemeral only.",
        priority: "high",
        suggestedAction: "Configure PINECONE_API_KEY for persistent storage",
      });
    }

    // Check for low pattern count
    if (kbStats.reflectiveCount < 10) {
      gaps.push({
        type: "workflow",
        description: `Limited learned patterns (${kbStats.reflectiveCount}). More execution experience needed.`,
        priority: "medium",
        suggestedAction: "Execute more tasks to build pattern library",
      });
    }

    // Check for missing tool coverage
    // This would normally query the persistent store for tool coverage
    for (const tool of expectedTools) {
      gaps.push({
        type: "tool_coverage",
        tool,
        description: `Need to verify command coverage for ${tool}`,
        priority: "low",
        suggestedAction: `Run ${tool} command inventory and seed missing commands`,
      });
    }

    return gaps;
  }

  /**
   * Export all knowledge for backup or sharing.
   *
   * @returns Exported knowledge structure
   */
  async exportKnowledge(): Promise<ExportedKnowledge> {
    const now = new Date().toISOString();
    const reflectivePatterns = this.knowledgeBase.getAllReflectivePatterns();

    // Build export structure
    const exported: ExportedKnowledge = {
      metadata: {
        exportedAt: now,
        version: "1.0.0",
        totalCommands: 0,
        totalErrorPatterns: 0,
        totalWorkflows: 0,
        totalPatterns: reflectivePatterns.length,
      },
      commands: [],
      errorPatterns: [],
      workflows: [],
      patterns: reflectivePatterns.map((p) => ({
        id: p.id,
        type: p.type,
        signature: p.signature.toString(),
        description: p.description,
        context: p.context,
        confidence: p.confidence,
        usageCount: p.usageCount,
        successRate: p.successRate,
      })),
    };

    console.log(
      `[KnowledgeCuratorAgent] Exported knowledge: ${exported.patterns.length} patterns`
    );

    return exported;
  }

  /**
   * Get statistics about the knowledge base.
   *
   * @returns Knowledge base statistics
   */
  async getKnowledgeStats(): Promise<KnowledgeStats> {
    const patterns = this.knowledgeBase.getAllReflectivePatterns();

    // Calculate command usage stats from patterns
    const commandPatterns = patterns.filter((p) => p.type === "command_sequence");
    const topCommands = commandPatterns
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
      .slice(0, 10)
      .map((p) => ({
        command: p.signature.toString(),
        usageCount: p.usageCount || 0,
      }));

    // Calculate average success rate
    const successRates = patterns
      .filter((p) => p.successRate !== undefined)
      .map((p) => p.successRate!);

    const averageSuccessRate =
      successRates.length > 0
        ? successRates.reduce((a, b) => a + b, 0) / successRates.length
        : 0;

    // Count by tool (from patterns context)
    const commandsByTool: Record<string, number> = {};
    for (const pattern of patterns) {
      const tool = pattern.context || "unknown";
      commandsByTool[tool] = (commandsByTool[tool] || 0) + 1;
    }

    const gaps = await this.analyzeKnowledgeGaps();

    return {
      totalCommands: commandPatterns.length,
      totalErrorPatterns: patterns.filter((p) => p.type === "error_recovery").length,
      totalWorkflows: patterns.filter((p) => p.type === "workflow").length,
      totalPatterns: patterns.length,
      commandsByTool,
      averageSuccessRate,
      topCommands,
      knowledgeGaps: gaps,
    };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Seed Innovus (Cadence physical design) commands.
   */
  private async seedInnovusCommands(): Promise<void> {
    const commands: Array<{
      command: string;
      description: string;
      category: string;
      tags: string[];
    }> = [
      // Floorplan commands
      {
        command: "floorPlan -site coreSite -s {width} {height} {left} {bottom} {right} {top}",
        description: "Initialize floorplan with die size and core margins",
        category: "floorplan",
        tags: ["floorplan", "initialization", "die"],
      },
      {
        command: "addInst -cell {macro_name} -inst {instance_name} -loc {x} {y} -ori {orientation}",
        description: "Place a macro at specified location with orientation",
        category: "floorplan",
        tags: ["floorplan", "macro", "placement"],
      },
      {
        command: "addRing -spacing {spacing} -width {width} -layer {layer} -center 1 -around core",
        description: "Create power/ground ring around core",
        category: "floorplan",
        tags: ["floorplan", "power", "ring", "pg"],
      },
      {
        command: "addStripe -number_of_sets {n} -spacing {spacing} -width {width} -layer {layer}",
        description: "Create power/ground stripes for distribution",
        category: "floorplan",
        tags: ["floorplan", "power", "stripe", "pg"],
      },

      // Placement commands
      {
        command: "placeDesign",
        description: "Run standard cell placement optimization",
        category: "placement",
        tags: ["placement", "optimize"],
      },
      {
        command: "place_opt_design",
        description: "Placement optimization with timing and congestion",
        category: "placement",
        tags: ["placement", "optimization", "timing"],
      },
      {
        command: "setPlaceMode -congEffort high",
        description: "Set placement congestion effort level",
        category: "placement",
        tags: ["placement", "congestion", "mode"],
      },
      {
        command: "optDesign -preCTS",
        description: "Pre-CTS optimization for timing and area",
        category: "placement",
        tags: ["placement", "optimization", "timing", "preCTS"],
      },

      // CTS commands
      {
        command: "create_ccopt_clock_tree",
        description: "Initialize clock tree synthesis",
        category: "cts",
        tags: ["cts", "clock", "synthesis"],
      },
      {
        command: "set_ccopt_property target_skew {value}",
        description: "Set target skew for clock tree synthesis",
        category: "cts",
        tags: ["cts", "clock", "skew", "constraint"],
      },
      {
        command: "set_ccopt_property target_insertion_delay {value}",
        description: "Set target insertion delay for clock tree",
        category: "cts",
        tags: ["cts", "clock", "delay", "constraint"],
      },
      {
        command: "ccopt_design",
        description: "Run clock tree synthesis and optimization",
        category: "cts",
        tags: ["cts", "clock", "synthesis", "optimization"],
      },
      {
        command: "reportClockTree",
        description: "Generate clock tree analysis report",
        category: "cts",
        tags: ["cts", "clock", "report", "analysis"],
      },

      // Routing commands
      {
        command: "routeDesign",
        description: "Run global and detailed routing",
        category: "routing",
        tags: ["routing", "global", "detailed"],
      },
      {
        command: "optDesign -postRoute",
        description: "Post-route optimization for timing and DRC",
        category: "routing",
        tags: ["routing", "optimization", "postRoute", "timing"],
      },
      {
        command: "optDesign -postRoute -hold",
        description: "Post-route hold fixing",
        category: "routing",
        tags: ["routing", "optimization", "hold", "timing"],
      },
      {
        command: "route_eco",
        description: "ECO routing for engineering changes",
        category: "routing",
        tags: ["routing", "eco", "engineering change"],
      },

      // Timing commands
      {
        command: "timeDesign -prePlace",
        description: "Timing analysis before placement",
        category: "timing",
        tags: ["timing", "analysis", "prePlace"],
      },
      {
        command: "timeDesign -preCTS",
        description: "Timing analysis before clock tree synthesis",
        category: "timing",
        tags: ["timing", "analysis", "preCTS"],
      },
      {
        command: "timeDesign -postCTS",
        description: "Timing analysis after clock tree synthesis",
        category: "timing",
        tags: ["timing", "analysis", "postCTS"],
      },
      {
        command: "timeDesign -postRoute",
        description: "Timing analysis after routing",
        category: "timing",
        tags: ["timing", "analysis", "postRoute"],
      },

      // Physical verification
      {
        command: "verify_drc",
        description: "Run design rule check verification",
        category: "physical",
        tags: ["physical", "verification", "drc"],
      },
      {
        command: "verify_connectivity",
        description: "Verify power/ground connectivity",
        category: "physical",
        tags: ["physical", "verification", "connectivity"],
      },
      {
        command: "verifyGeometry",
        description: "Verify geometric constraints",
        category: "physical",
        tags: ["physical", "verification", "geometry"],
      },

      // ECO commands
      {
        command: "ecoRoute",
        description: "Route ECO changes",
        category: "physical",
        tags: ["physical", "eco", "routing"],
      },
      {
        command: "addFiller -cell {filler_cells} -prefix FILLER",
        description: "Add filler cells to complete rows",
        category: "physical",
        tags: ["physical", "filler", "placement"],
      },

      // Save/restore
      {
        command: "saveDesign {design_name}.enc",
        description: "Save design database to file",
        category: "general",
        tags: ["general", "save", "database"],
      },
      {
        command: "restoreDesign {design_name}.enc",
        description: "Restore design database from file",
        category: "general",
        tags: ["general", "restore", "database"],
      },
      {
        command: "saveNetlist {netlist_name}.v",
        description: "Export verilog netlist",
        category: "general",
        tags: ["general", "netlist", "export"],
      },
    ];

    for (const cmd of commands) {
      await this.addCommandKnowledge("innovus", cmd.command, cmd.description, {
        category: cmd.category,
        tags: cmd.tags,
        success_rate: 0.95,
      });
    }

    console.log(
      `[KnowledgeCuratorAgent] Seeded ${commands.length} Innovus commands`
    );
  }

  /**
   * Seed Genus (Cadence synthesis) commands.
   */
  private async seedGenusCommands(): Promise<void> {
    const commands: Array<{
      command: string;
      description: string;
      category: string;
      tags: string[];
    }> = [
      // Setup commands
      {
        command: "set_db init_hdl_search_path {path}",
        description: "Set search path for HDL files",
        category: "setup",
        tags: ["setup", "hdl", "path"],
      },
      {
        command: "set_db init_lib_search_path {path}",
        description: "Set search path for library files",
        category: "setup",
        tags: ["setup", "library", "path"],
      },
      {
        command: "read_libs {liberty_files}",
        description: "Read Liberty timing libraries",
        category: "setup",
        tags: ["setup", "library", "liberty"],
      },
      {
        command: "read_physical_libs -lef {lef_files}",
        description: "Read LEF physical library files",
        category: "setup",
        tags: ["setup", "physical", "lef"],
      },

      // Elaboration commands
      {
        command: "read_hdl -sv {verilog_files}",
        description: "Read SystemVerilog source files",
        category: "elaboration",
        tags: ["elaboration", "hdl", "systemverilog"],
      },
      {
        command: "read_hdl -vhdl {vhdl_files}",
        description: "Read VHDL source files",
        category: "elaboration",
        tags: ["elaboration", "hdl", "vhdl"],
      },
      {
        command: "elaborate {top_module}",
        description: "Elaborate the design hierarchy",
        category: "elaboration",
        tags: ["elaboration", "hierarchy"],
      },
      {
        command: "set_db current_design {design_name}",
        description: "Set the current design context",
        category: "elaboration",
        tags: ["elaboration", "design", "context"],
      },

      // Constraint commands
      {
        command: "read_sdc {sdc_file}",
        description: "Read timing constraints from SDC file",
        category: "constraints",
        tags: ["constraints", "sdc", "timing"],
      },
      {
        command: "set_db syn_generic_effort {low|medium|high}",
        description: "Set synthesis effort level for generic optimization",
        category: "constraints",
        tags: ["constraints", "effort", "optimization"],
      },
      {
        command: "set_db syn_map_effort {low|medium|high}",
        description: "Set synthesis effort level for technology mapping",
        category: "constraints",
        tags: ["constraints", "effort", "mapping"],
      },
      {
        command: "set_db syn_opt_effort {low|medium|high}",
        description: "Set synthesis effort level for optimization",
        category: "constraints",
        tags: ["constraints", "effort", "optimization"],
      },

      // Synthesis commands
      {
        command: "syn_generic",
        description: "Run generic logic synthesis",
        category: "synthesis",
        tags: ["synthesis", "generic"],
      },
      {
        command: "syn_map",
        description: "Map generic gates to technology library",
        category: "synthesis",
        tags: ["synthesis", "mapping", "technology"],
      },
      {
        command: "syn_opt",
        description: "Optimize mapped design for timing and area",
        category: "synthesis",
        tags: ["synthesis", "optimization"],
      },
      {
        command: "syn_opt -incremental",
        description: "Incremental synthesis optimization",
        category: "synthesis",
        tags: ["synthesis", "optimization", "incremental"],
      },

      // Analysis commands
      {
        command: "report_timing",
        description: "Generate timing analysis report",
        category: "analysis",
        tags: ["analysis", "timing", "report"],
      },
      {
        command: "report_timing -lint",
        description: "Check timing constraints for issues",
        category: "analysis",
        tags: ["analysis", "timing", "lint"],
      },
      {
        command: "report_area",
        description: "Report area utilization statistics",
        category: "analysis",
        tags: ["analysis", "area", "report"],
      },
      {
        command: "report_power",
        description: "Report power estimation",
        category: "analysis",
        tags: ["analysis", "power", "report"],
      },
      {
        command: "report_gates",
        description: "Report gate count statistics",
        category: "analysis",
        tags: ["analysis", "gates", "report"],
      },
      {
        command: "report_qor",
        description: "Report quality of results summary",
        category: "analysis",
        tags: ["analysis", "qor", "report"],
      },

      // Output commands
      {
        command: "write_hdl > {output.v}",
        description: "Write synthesized netlist to file",
        category: "output",
        tags: ["output", "netlist", "verilog"],
      },
      {
        command: "write_sdc > {output.sdc}",
        description: "Write constraints to SDC file",
        category: "output",
        tags: ["output", "constraints", "sdc"],
      },
      {
        command: "write_script > {output.g}",
        description: "Write synthesis script for reference",
        category: "output",
        tags: ["output", "script"],
      },
    ];

    for (const cmd of commands) {
      await this.addCommandKnowledge("genus", cmd.command, cmd.description, {
        category: cmd.category,
        tags: cmd.tags,
        success_rate: 0.95,
      });
    }

    console.log(
      `[KnowledgeCuratorAgent] Seeded ${commands.length} Genus commands`
    );
  }

  /**
   * Seed Tempus (Cadence timing analysis) commands.
   */
  private async seedTempusCommands(): Promise<void> {
    const commands: Array<{
      command: string;
      description: string;
      category: string;
      tags: string[];
    }> = [
      // Setup commands
      {
        command: "read_libs {liberty_files}",
        description: "Read Liberty timing libraries",
        category: "setup",
        tags: ["setup", "library", "liberty"],
      },
      {
        command: "read_verilog {netlist.v}",
        description: "Read gate-level netlist",
        category: "setup",
        tags: ["setup", "netlist", "verilog"],
      },
      {
        command: "read_sdc {constraints.sdc}",
        description: "Read timing constraints",
        category: "setup",
        tags: ["setup", "constraints", "sdc"],
      },
      {
        command: "read_spef {parasitics.spef}",
        description: "Read SPEF parasitics file",
        category: "setup",
        tags: ["setup", "parasitics", "spef"],
      },
      {
        command: "set_top_module {module_name}",
        description: "Set the top-level module for analysis",
        category: "setup",
        tags: ["setup", "design", "top"],
      },

      // Timing analysis commands
      {
        command: "report_timing",
        description: "Generate setup timing report",
        category: "timing",
        tags: ["timing", "analysis", "setup"],
      },
      {
        command: "report_timing -hold",
        description: "Generate hold timing report",
        category: "timing",
        tags: ["timing", "analysis", "hold"],
      },
      {
        command: "report_timing -from {start_point} -to {end_point}",
        description: "Report timing for specific path",
        category: "timing",
        tags: ["timing", "analysis", "path"],
      },
      {
        command: "report_timing -max_points 100",
        description: "Report top 100 timing paths",
        category: "timing",
        tags: ["timing", "analysis", "paths"],
      },
      {
        command: "report_clock_timing",
        description: "Report clock skew and latency",
        category: "timing",
        tags: ["timing", "analysis", "clock"],
      },
      {
        command: "report_constraints",
        description: "Report constraint coverage and violations",
        category: "timing",
        tags: ["timing", "analysis", "constraints"],
      },
      {
        command: "report_analysis_coverage",
        description: "Report timing analysis coverage",
        category: "timing",
        tags: ["timing", "analysis", "coverage"],
      },

      // ECO commands
      {
        command: "eco_add_repeater -name {name} -cell {buf_cell} -location {x} {y}",
        description: "Add repeater/buffer for timing ECO",
        category: "eco",
        tags: ["eco", "timing", "buffer"],
      },
      {
        command: "eco_resize_cell -instance {inst_name} -cell {new_cell}",
        description: "Resize cell for timing optimization",
        category: "eco",
        tags: ["eco", "timing", "resize"],
      },
      {
        command: "eco_delete_repeater -instance {inst_name}",
        description: "Delete repeater for ECO",
        category: "eco",
        tags: ["eco", "timing", "delete"],
      },

      // Advanced analysis
      {
        command: "report_noise",
        description: "Report signal integrity noise analysis",
        category: "analysis",
        tags: ["analysis", "noise", "si"],
      },
      {
        command: "report_power",
        description: "Report power analysis results",
        category: "analysis",
        tags: ["analysis", "power"],
      },
      {
        command: "report_datasheet",
        description: "Generate I/O timing datasheet",
        category: "analysis",
        tags: ["analysis", "datasheet", "io"],
      },
      {
        command: "report_transitive_fanin -to {pin}",
        description: "Report transitive fanin cone",
        category: "analysis",
        tags: ["analysis", "fanin", "cone"],
      },
      {
        command: "report_transitive_fanout -from {pin}",
        description: "Report transitive fanout cone",
        category: "analysis",
        tags: ["analysis", "fanout", "cone"],
      },

      // Variation analysis
      {
        command: "set_analysis_mode -on_chip_variation",
        description: "Enable on-chip variation analysis",
        category: "variation",
        tags: ["variation", "ocv", "analysis"],
      },
      {
        command: "report_aocvm",
        description: "Report advanced OCV analysis",
        category: "variation",
        tags: ["variation", "aocv", "report"],
      },
    ];

    for (const cmd of commands) {
      await this.addCommandKnowledge("tempus", cmd.command, cmd.description, {
        category: cmd.category,
        tags: cmd.tags,
        success_rate: 0.95,
      });
    }

    console.log(
      `[KnowledgeCuratorAgent] Seeded ${commands.length} Tempus commands`
    );
  }

  /**
   * Seed common error patterns and solutions.
   */
  private async seedErrorPatterns(): Promise<void> {
    const errors: Array<{
      error: string;
      solution: string;
      tool: string;
    }> = [
      // Innovus errors
      {
        error: "Error: Setup slack violated",
        solution:
          "Check clock constraints, consider useful skew, or use optDesign -postRoute -setup",
        tool: "innovus",
      },
      {
        error: "Error: Hold slack violated",
        solution:
          "Use optDesign -postRoute -hold or add hold buffers with ecoAddRepeater",
        tool: "innovus",
      },
      {
        error: "Error: Congestion too high",
        solution:
          "Increase placement density target, use congestion-driven placement, or adjust floorplan",
        tool: "innovus",
      },
      {
        error: "Error: DRC violations found",
        solution:
          "Run route_eco to fix DRCs, check antenna rules, or adjust routing resources",
        tool: "innovus",
      },
      {
        error: "Error: Clock tree synthesis failed",
        solution:
          "Check clock constraints in SDC, verify clock sources, adjust target skew",
        tool: "innovus",
      },
      {
        error: "Error: Power grid IR drop violation",
        solution:
          "Add more power vias, increase power stripe width, or add power rings",
        tool: "innovus",
      },

      // Genus errors
      {
        error: "Error: Unresolved reference",
        solution:
          "Check HDL search path, verify all modules are compiled, check for missing libraries",
        tool: "genus",
      },
      {
        error: "Error: Multiple drivers on net",
        solution:
          "Check for conflicting assignments in RTL, verify no internal tristates",
        tool: "genus",
      },
      {
        error: "Error: Latch inferred",
        solution:
          "Check for incomplete case statements or missing else clauses in combinational logic",
        tool: "genus",
      },
      {
        error: "Error: Timing constraint not met",
        solution:
          "Relax constraints if possible, increase synthesis effort, or use retiming",
        tool: "genus",
      },
      {
        error: "Error: Library cell not found",
        solution:
          "Verify library search path, check library file exists, ensure correct PVT corner",
        tool: "genus",
      },

      // Tempus errors
      {
        error: "Error: No clock defined",
        solution:
          "Add create_clock constraint in SDC, verify SDC is loaded correctly",
        tool: "tempus",
      },
      {
        error: "Error: Clock domain crossing violation",
        solution:
          "Add proper synchronizers, use set_clock_groups -asynchronous, or add false_path",
        tool: "tempus",
      },
      {
        error: "Error: Max transition violation",
        solution:
          "Add buffer tree, resize drivers, or relax max_transition constraint if appropriate",
        tool: "tempus",
      },
      {
        error: "Error: Max capacitance violation",
        solution:
          "Insert buffer or resize cell to drive large load, check fanout",
        tool: "tempus",
      },
      {
        error: "Error: Min pulse width violation",
        solution: "Check clock gating, adjust clock constraints, or fix clock tree",
        tool: "tempus",
      },
      {
        error: "Error: Recovery/Removal violation",
        solution:
          "Check asynchronous reset constraints, adjust recovery/removal margins",
        tool: "tempus",
      },
    ];

    for (const err of errors) {
      await this.addErrorPattern(err.error, err.solution, err.tool);
    }

    console.log(
      `[KnowledgeCuratorAgent] Seeded ${errors.length} error patterns`
    );
  }

  /**
   * Seed common workflows.
   */
  private async seedWorkflows(): Promise<void> {
    const workflows: Array<{
      name: string;
      steps: string[];
      tool: string;
    }> = [
      {
        name: "Innovus Floorplan to Placement",
        steps: [
          "floorPlan -site coreSite -s {width} {height} {margin}",
          "addRing -spacing {spacing} -width {width} -layer {layer}",
          "addStripe -number_of_sets {n} -spacing {spacing} -width {width}",
          "placeDesign",
          "optDesign -preCTS",
        ],
        tool: "innovus",
      },
      {
        name: "Innovus CTS Flow",
        steps: [
          "create_ccopt_clock_tree",
          "set_ccopt_property target_skew {skew}",
          "set_ccopt_property target_insertion_delay {delay}",
          "ccopt_design",
          "reportClockTree",
          "optDesign -postCTS",
        ],
        tool: "innovus",
      },
      {
        name: "Innovus Route and Finalize",
        steps: [
          "routeDesign",
          "optDesign -postRoute",
          "optDesign -postRoute -hold",
          "verify_drc",
          "verify_connectivity",
          "addFiller -cell {filler_cells} -prefix FILLER",
        ],
        tool: "innovus",
      },
      {
        name: "Genus Synthesis Flow",
        steps: [
          "set_db init_hdl_search_path {path}",
          "read_libs {liberty}",
          "read_hdl -sv {rtl}",
          "elaborate {top}",
          "read_sdc {constraints}",
          "syn_generic",
          "syn_map",
          "syn_opt",
          "write_hdl > {netlist.v}",
        ],
        tool: "genus",
      },
      {
        name: "Tempus Timing Signoff",
        steps: [
          "read_libs {liberty}",
          "read_verilog {netlist}",
          "read_sdc {constraints}",
          "read_spef {parasitics}",
          "report_timing",
          "report_timing -hold",
          "report_constraints",
          "report_analysis_coverage",
        ],
        tool: "tempus",
      },
    ];

    for (const wf of workflows) {
      await this.captureWorkflow(wf.name, wf.steps, wf.tool);
    }

    console.log(`[KnowledgeCuratorAgent] Seeded ${workflows.length} workflows`);
  }

  /**
   * Sanitize a string for use in an ID.
   */
  private sanitizeId(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 50);
  }

  /**
   * Classify an error message into a type.
   */
  private classifyErrorType(error: string): string {
    const errorLower = error.toLowerCase();

    if (errorLower.includes("setup") || errorLower.includes("slack")) {
      return "timing_setup";
    }
    if (errorLower.includes("hold")) {
      return "timing_hold";
    }
    if (errorLower.includes("congestion")) {
      return "congestion";
    }
    if (errorLower.includes("drc") || errorLower.includes("violation")) {
      return "drc";
    }
    if (errorLower.includes("clock")) {
      return "clock";
    }
    if (errorLower.includes("power") || errorLower.includes("ir drop")) {
      return "power";
    }
    if (errorLower.includes("unresolved") || errorLower.includes("reference")) {
      return "elaboration";
    }

    return "general";
  }

  /**
   * Extract command suggestions from a solution text.
   */
  private extractCommandsFromSolution(solution: string): string[] {
    // Simple extraction: look for backtick-quoted commands or command-like words
    const commands: string[] = [];

    // Match commands in backticks
    const backtickMatches = solution.match(/`([^`]+)`/g);
    if (backtickMatches) {
      commands.push(...backtickMatches.map((m) => m.slice(1, -1)));
    }

    // Match common EDA command patterns
    const commandMatches = solution.match(
      /\b(optDesign|ecoAddRepeater|placeDesign|routeDesign|syn_opt|report_timing)\b/g
    );
    if (commandMatches) {
      commands.push(...commandMatches);
    }

    return Array.from(new Set(commands)); // Remove duplicates
  }

  /**
   * Classify a workflow by its name.
   */
  private classifyWorkflowType(name: string): string {
    const nameLower = name.toLowerCase();

    if (nameLower.includes("floorplan")) {
      return "floorplan";
    }
    if (nameLower.includes("place")) {
      return "placement";
    }
    if (nameLower.includes("cts") || nameLower.includes("clock")) {
      return "cts";
    }
    if (nameLower.includes("route")) {
      return "routing";
    }
    if (nameLower.includes("synthesis") || nameLower.includes("syn")) {
      return "synthesis";
    }
    if (nameLower.includes("timing") || nameLower.includes("signoff")) {
      return "timing";
    }

    return "general";
  }
}

export default KnowledgeCuratorAgent;
