/**
 * @fileoverview CommandSynthesisAgent - Generates and validates EDA tool commands.
 *
 * This agent translates natural language intents into EDA tool commands (Tcl-based),
 * validates command syntax against known patterns, and retrieves relevant examples
 * from the KnowledgeBase using RAG.
 *
 * Architecture: Specialist Layer - Command Synthesis Agent
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions } from "./BaseAgent";
import { KnowledgeBase, CommandMetadata, VectorIndices } from "./KnowledgeBase";

/**
 * Supported EDA tools for command synthesis
 */
export type EDATool = "innovus" | "genus" | "tempus" | "icc2" | "openroad" | string;

/**
 * Command proposal with metadata
 */
export interface CommandProposal {
  /** The generated command string */
  command: string;

  /** Target EDA tool */
  tool: EDATool;

  /** Human-readable description of what the command does */
  description: string;

  /** Confidence score (0-1) based on KB matches and validation */
  confidence: number;

  /** Alternative command variations */
  alternatives?: string[];

  /** Whether the command requires human verification before execution */
  requiresVerification: boolean;
}

/**
 * Command example retrieved from KnowledgeBase
 */
export interface CommandExample {
  /** The command string */
  command: string;

  /** Tool name */
  tool: string;

  /** Command category (e.g., 'floorplan', 'placement', 'routing') */
  category: string;

  /** Description of what the command does */
  description: string;

  /** Relevance score from vector search */
  relevanceScore: number;

  /** Success rate from historical usage */
  successRate: number;

  /** Usage count from historical data */
  usageCount: number;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Validation result for command syntax
 */
export interface ValidationResult {
  /** Whether the command passed validation */
  valid: boolean;

  /** Validation errors if invalid */
  errors: string[];

  /** Warnings for potentially risky operations */
  warnings: string[];

  /** Suggested fixes if validation failed */
  suggestions?: string[];
}

/**
 * Configuration options for CommandSynthesisAgent
 */
export interface CommandSynthesisOptions extends BaseAgentOptions {
  /** KnowledgeBase instance for RAG queries */
  knowledgeBase: KnowledgeBase;

  /** Confidence threshold for requiring verification (default: 0.7) */
  verificationThreshold?: number;

  /** Maximum number of alternatives to generate (default: 3) */
  maxAlternatives?: number;
}

/**
 * Command Synthesis Agent - Generates and validates EDA tool commands.
 *
 * Responsibilities:
 * - Translate natural language to Tcl commands (NL2SL)
 * - Validate syntax against tool APIs
 * - Generate command sequences for complex operations
 * - Query KnowledgeBase for similar commands and examples
 *
 * @example
 * const agent = new CommandSynthesisAgent({
 *   id: "cmd-synth-1",
 *   name: "Command Synthesis Agent",
 *   knowledgeBase: kb
 * });
 * await agent.initialize();
 * await agent.start();
 *
 * const proposal = await agent.generateCommand(
 *   "run placement optimization",
 *   "innovus"
 * );
 */
export class CommandSynthesisAgent extends BaseAgent {
  private knowledgeBase: KnowledgeBase;
  private verificationThreshold: number;
  private maxAlternatives: number;

  // Tool-specific command patterns for validation
  private readonly commandPatterns: Map<EDATool, RegExp[]> = new Map([
    [
      "innovus",
      [
        /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s+/, // Basic command pattern
        /^\s*set\s+\w+\s+/, // set commands
        /^\s*get\s+\w+\s+/, // get commands
        /^\s*report\w+\s*/, // report commands
      ],
    ],
    [
      "genus",
      [
        /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s+/, // Basic command pattern
        /^\s*set\s+\w+\s+/, // set commands
        /^\s*get\s+\w+\s+/, // get commands
      ],
    ],
    [
      "tempus",
      [
        /^\s*[a-zA-Z_][a-zA-Z0-9_]*\s+/, // Basic command pattern
        /^\s*set\s+\w+\s+/, // set commands
        /^\s*report\w+\s*/, // report commands
        /^\s*check\w+\s*/, // check commands
      ],
    ],
  ]);

  // Risky command patterns that require verification
  private readonly riskyPatterns: RegExp[] = [
    /\b(delete|remove|rm)\b/i,
    /\b(overwrite|replace)\b/i,
    /\b(reset|clear)\s+(all|design|data)\b/i,
    /\b(exit|quit)\b/i,
    /-force\b/i,
    /\bwrite\b.*\.(gds|def|lef|verilog|v)\b/i,
  ];

  constructor(options: CommandSynthesisOptions) {
    super(options);

    if (!options.knowledgeBase) {
      throw new Error("CommandSynthesisAgent requires a KnowledgeBase instance");
    }

    this.knowledgeBase = options.knowledgeBase;
    this.verificationThreshold = options.verificationThreshold ?? 0.7;
    this.maxAlternatives = options.maxAlternatives ?? 3;
  }

  /**
   * Generate a command from natural language intent.
   *
   * Uses RAG to retrieve relevant examples from KnowledgeBase and synthesizes
   * a command proposal with confidence scoring and validation.
   *
   * @param intent - Natural language description of the desired action
   * @param tool - Target EDA tool (e.g., 'innovus', 'genus', 'tempus')
   * @param context - Optional additional context for command generation
   * @returns Command proposal with metadata
   */
  async generateCommand(
    intent: string,
    tool: EDATool,
    context?: string
  ): Promise<CommandProposal> {
    if (!this.isRunning) {
      throw new Error(`Agent ${this.id} must be running to generate commands`);
    }

    // Query KnowledgeBase for relevant command examples
    const examples = await this.queryKnowledgeBase(intent, tool);

    // Use RAG to synthesize command from retrieved context
    const ragResult = await this.knowledgeBase.retrieveAndGenerate(
      `Generate ${tool} command for: ${intent}`,
      context
    );

    // Extract command from synthesized response or examples
    let command = this.extractCommandFromRAG(ragResult.synthesizedResponse, tool);

    // If no command extracted from RAG, construct from best example
    if (!command && examples.length > 0) {
      command = this.adaptCommandFromExample(examples[0], intent);
    }

    // Fallback: generate basic command structure
    if (!command) {
      command = this.generateBasicCommand(intent, tool);
    }

    // Validate the generated command
    const validation = this.validateSyntax(command, tool);

    // Calculate confidence based on KB results and validation
    const confidence = this.calculateConfidence(examples, validation, ragResult.confidence);

    // Generate alternatives if confidence is low
    const alternatives =
      confidence < 0.9 ? this.generateAlternatives(intent, tool, examples) : undefined;

    // Determine if verification is required
    const requiresVerification =
      confidence < this.verificationThreshold || this.isRiskyCommand(command);

    // Build description from RAG or examples
    const description =
      this.extractDescription(ragResult.synthesizedResponse) ||
      examples[0]?.description ||
      `Generated ${tool} command for: ${intent}`;

    const proposal: CommandProposal = {
      command,
      tool,
      description,
      confidence,
      alternatives,
      requiresVerification,
    };

    // Emit event for monitoring
    this.emit("commandGenerated", {
      agentId: this.id,
      proposal,
      timestamp: Date.now(),
    });

    return proposal;
  }

  /**
   * Query KnowledgeBase for similar commands.
   *
   * Searches the commands index in Pinecone for command examples
   * matching the query intent, filtered by tool.
   *
   * @param query - Search query (natural language or command fragment)
   * @param tool - Target EDA tool for filtering
   * @returns Array of matching command examples
   */
  async queryKnowledgeBase(query: string, tool: EDATool): Promise<CommandExample[]> {
    if (!this.knowledgeBase.isPersistentAvailable()) {
      // Fallback: query reflective tier for patterns
      const patterns = await this.knowledgeBase.queryReflective(query, "command_sequence");
      return patterns.map((p) => ({
        command: p.signature.toString(),
        tool,
        category: "general",
        description: p.description,
        relevanceScore: p.confidence,
        successRate: p.successRate ?? 0.5,
        usageCount: p.usageCount,
        tags: [],
      }));
    }

    try {
      // Query Pinecone commands index with tool filter
      const results = await this.knowledgeBase.queryPersistent(
        VectorIndices.COMMANDS,
        query,
        5,
        { tool }
      );

      return results.map((result) => {
        const meta = result.metadata as CommandMetadata;
        return {
          command: meta.command || "",
          tool: meta.tool || tool,
          category: meta.category || "general",
          description: meta.description || "",
          relevanceScore: result.score,
          successRate: meta.success_rate || 0.5,
          usageCount: meta.usage_count || 0,
          tags: meta.tags || [],
        };
      });
    } catch (error) {
      console.warn(`[CommandSynthesisAgent] KB query failed: ${error}`);
      return [];
    }
  }

  /**
   * Validate command syntax against known patterns.
   *
   * Checks command structure against tool-specific patterns and
   * identifies common syntax errors.
   *
   * @param command - Command string to validate
   * @param tool - Target EDA tool
   * @returns Validation result with errors, warnings, and suggestions
   */
  validateSyntax(command: string, tool: EDATool): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Basic Tcl syntax checks
    if (!command || command.trim().length === 0) {
      errors.push("Command is empty");
      return { valid: false, errors, warnings };
    }

    const trimmedCommand = command.trim();

    // Check for balanced braces
    const openBraces = (trimmedCommand.match(/\{/g) || []).length;
    const closeBraces = (trimmedCommand.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced braces: ${openBraces} open, ${closeBraces} close`);
      suggestions.push("Ensure all '{' have matching '}'");
    }

    // Check for balanced brackets
    const openBrackets = (trimmedCommand.match(/\[/g) || []).length;
    const closeBrackets = (trimmedCommand.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      errors.push(`Unbalanced brackets: ${openBrackets} open, ${closeBrackets} close`);
      suggestions.push("Ensure all '[' have matching ']'");
    }

    // Check for balanced quotes
    const quoteMatches = trimmedCommand.match(/"/g);
    if (quoteMatches && quoteMatches.length % 2 !== 0) {
      errors.push("Unbalanced quotes: odd number of double quotes");
      suggestions.push("Ensure all quotes are properly closed");
    }

    // Tool-specific pattern validation
    const patterns = this.commandPatterns.get(tool);
    if (patterns) {
      const matchesPattern = patterns.some((pattern) => pattern.test(trimmedCommand));
      if (!matchesPattern) {
        warnings.push(`Command may not follow ${tool} syntax conventions`);
        suggestions.push(`Check ${tool} documentation for correct command format`);
      }
    }

    // Check for common Tcl issues
    if (trimmedCommand.includes("$\\")) {
      warnings.push("Possible escaped variable reference");
    }

    if (trimmedCommand.includes(";;")) {
      warnings.push("Double semicolon detected");
      suggestions.push("Remove duplicate semicolons");
    }

    // Check for risky operations
    if (this.isRiskyCommand(trimmedCommand)) {
      warnings.push("Command contains potentially destructive operations");
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Handle incoming messages from other agents.
   *
   * Processes message types:
   * - 'command.generate': Generate command from intent
   * - 'command.validate': Validate command syntax
   * - 'query.examples': Query for command examples
   *
   * @param message - Agent message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    const { type, payload, sender, correlationId } = message;

    switch (type) {
      case "command.generate": {
        const { intent, tool, context } = payload as {
          intent: string;
          tool: EDATool;
          context?: string;
        };

        try {
          const proposal = await this.generateCommand(intent, tool, context);
          this.sendMessage({
            recipient: sender,
            type: "command.proposal",
            payload: proposal,
            correlationId,
            priority: "high",
          });
        } catch (error) {
          this.sendMessage({
            recipient: sender,
            type: "command.failed",
            payload: {
              error: error instanceof Error ? error.message : String(error),
              intent,
              tool,
            },
            correlationId,
            priority: "critical",
          });
        }
        break;
      }

      case "command.validate": {
        const { command, tool } = payload as { command: string; tool: EDATool };
        const validation = this.validateSyntax(command, tool);
        this.sendMessage({
          recipient: sender,
          type: "command.validation",
          payload: validation,
          correlationId,
        });
        break;
      }

      case "query.examples": {
        const { query, tool } = payload as { query: string; tool: EDATool };
        const examples = await this.queryKnowledgeBase(query, tool);
        this.sendMessage({
          recipient: sender,
          type: "query.results",
          payload: examples,
          correlationId,
        });
        break;
      }

      default:
        console.warn(`[CommandSynthesisAgent] Unhandled message type: ${type}`);
    }
  }

  /**
   * Lifecycle hook - called during initialization.
   */
  protected async onInitialize(): Promise<void> {
    console.log(`[CommandSynthesisAgent] Initialized with KB: ${this.knowledgeBase.getStats()}`);
  }

  /**
   * Lifecycle hook - called during cleanup.
   */
  protected async onCleanup(): Promise<void> {
    // No additional cleanup needed
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Extract command from RAG synthesized response.
   */
  private extractCommandFromRAG(response: string, _tool: EDATool): string | null {
    // Look for code blocks with command
    const codeBlockMatch = response.match(/```(?:tcl)?\s*\n?([^`]+)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Look for inline code
    const inlineMatch = response.match(/`([^`]+)`/);
    if (inlineMatch) {
      return inlineMatch[1].trim();
    }

    // Look for command pattern in text
    const lines = response.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      // Check if line looks like a command (starts with lowercase, contains args)
      if (/^[a-z][a-zA-Z0-9_]*\s+/.test(trimmed) && !trimmed.startsWith("http")) {
        return trimmed;
      }
    }

    return null;
  }

  /**
   * Adapt a command example to match the current intent.
   */
  private adaptCommandFromExample(example: CommandExample, _intent: string): string {
    // For now, return the example command as-is
    // Future: parse intent and substitute parameters
    return example.command;
  }

  /**
   * Generate a basic command structure when no examples are available.
   */
  private generateBasicCommand(intent: string, tool: EDATool): string {
    const intentLower = intent.toLowerCase();

    // Map common intents to basic command structures
    if (intentLower.includes("place")) {
      return `${tool === "innovus" ? "place_opt_design" : "place_design"}`;
    }
    if (intentLower.includes("route")) {
      return `${tool === "innovus" ? "route_design" : "route_design"}`;
    }
    if (intentLower.includes("report")) {
      const reportType = intentLower.includes("timing") ? "timing" : "constraints";
      return `report_${reportType}`;
    }
    if (intentLower.includes("set") || intentLower.includes("configure")) {
      return `set <option> <value>`;
    }

    // Generic fallback
    return `# TODO: Implement command for: ${intent}`;
  }

  /**
   * Calculate confidence score based on multiple factors.
   */
  private calculateConfidence(
    examples: CommandExample[],
    validation: ValidationResult,
    ragConfidence: number
  ): number {
    let score = 0;

    // Base confidence from RAG
    score += ragConfidence * 0.3;

    // Validation score
    if (validation.valid) {
      score += 0.3;
    } else {
      score += 0.1 * (1 - validation.errors.length * 0.2);
    }

    // Example quality score
    if (examples.length > 0) {
      const bestExample = examples[0];
      score += bestExample.relevanceScore * 0.2;
      score += (bestExample.successRate || 0.5) * 0.1;
      score += Math.min(bestExample.usageCount / 100, 1) * 0.1;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Generate alternative command variations.
   */
  private generateAlternatives(intent: string, tool: EDATool, examples: CommandExample[]): string[] {
    const alternatives: string[] = [];

    // Use next best examples as alternatives
    for (let i = 1; i < Math.min(examples.length, this.maxAlternatives + 1); i++) {
      alternatives.push(examples[i].command);
    }

    // Add tool-specific variations if needed
    if (alternatives.length < this.maxAlternatives) {
      const basic = this.generateBasicCommand(intent, tool);
      if (!alternatives.includes(basic) && basic !== alternatives[0]) {
        alternatives.push(basic);
      }
    }

    return alternatives;
  }

  /**
   * Check if a command contains risky operations.
   */
  private isRiskyCommand(command: string): boolean {
    return this.riskyPatterns.some((pattern) => pattern.test(command));
  }

  /**
   * Extract description from RAG response.
   */
  private extractDescription(response: string): string | null {
    // Look for description in the response
    const lines = response.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.length > 10 &&
        !trimmed.startsWith("-") &&
        !trimmed.startsWith("*") &&
        !trimmed.startsWith("`") &&
        !trimmed.includes(":")
      ) {
        return trimmed;
      }
    }
    return null;
  }
}

export default CommandSynthesisAgent;
