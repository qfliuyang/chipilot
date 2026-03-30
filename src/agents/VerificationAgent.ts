/**
 * @fileoverview VerificationAgent - Validates commands for safety and correctness.
 *
 * The VerificationAgent extends BaseAgent to provide command validation services
 * for the multi-agent system. It performs:
 * - Safety checks (destructive operations, data loss risks)
 * - Pattern matching against known error patterns in KnowledgeBase
 * - Risk level assessment based on command type and context
 * - Approval/rejection with detailed reasoning
 *
 * Architecture: Specialist layer agent in the hierarchical multi-agent system
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions } from "./BaseAgent";
import { KnowledgeBase, Pattern } from "./KnowledgeBase";
import type { AgentId, AgentMessage as BusAgentMessage } from "./MessageBus";

/**
 * Risk levels for command assessment
 */
export type RiskLevel = "low" | "medium" | "high" | "critical";

/**
 * Command proposal to be verified
 */
export interface CommandProposal {
  /** The command string to execute */
  command: string;

  /** Target EDA tool (e.g., 'innovus', 'genus', 'tempus') */
  tool: string;

  /** Optional context about why this command is being proposed */
  context?: string;

  /** ID of the agent proposing the command */
  proposedBy: string;

  /** Correlation ID for tracking related messages */
  correlationId?: string;
}

/**
 * Error pattern match result
 */
export interface ErrorPattern {
  /** Pattern identifier */
  id: string;

  /** Type of pattern */
  type: string;

  /** Description of the error pattern */
  description: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Suggested mitigation or alternative */
  mitigation?: string;

  /** Historical success rate of recovery */
  successRate?: number;
}

/**
 * Result of command verification
 */
export interface VerificationResult {
  /** Whether the command is approved for execution */
  approved: boolean;

  /** Risk level assessment */
  riskLevel: RiskLevel;

  /** List of concerns if any */
  concerns?: string[];

  /** Suggestions for improvement or alternatives */
  suggestions?: string[];

  /** Whether user confirmation is required */
  requiresUserConfirmation: boolean;

  /** Detailed reasoning for the decision */
  reasoning: string;

  /** Timestamp of verification */
  timestamp: number;

  /** Correlation ID for tracking */
  correlationId?: string;
}

/**
 * Configuration options for VerificationAgent
 */
export interface VerificationAgentOptions extends BaseAgentOptions {
  /** KnowledgeBase instance for pattern lookups */
  knowledgeBase: KnowledgeBase;

  /** Optional MessageBus for inter-agent communication */
  messageBus?: import("./MessageBus").MessageBus;

  /** Whether to require confirmation for medium+ risk commands */
  requireConfirmationForMediumRisk?: boolean;

  /** Custom risk patterns to check */
  customRiskPatterns?: RiskPattern[];
}

/**
 * Risk pattern definition for command analysis
 */
interface RiskPattern {
  /** Pattern name */
  name: string;

  /** Regex or string to match in command */
  pattern: RegExp | string;

  /** Risk level if matched */
  riskLevel: RiskLevel;

  /** Description of the risk */
  description: string;

  /** Whether this requires user confirmation */
  requiresConfirmation: boolean;

  /** Suggested safer alternative */
  suggestion?: string;
}

/**
 * VerificationAgent validates commands for safety and correctness.
 *
 * Responsibilities:
 * - Validate commands for safety (no destructive operations without confirmation)
 * - Check command correctness against known EDA patterns
 * - Query KnowledgeBase for similar error patterns
 * - Assign risk levels to commands
 * - Approve/reject commands with reasoning
 *
 * @example
 * const verifier = new VerificationAgent({
 *   id: 'verifier-1',
 *   name: 'VerificationAgent',
 *   knowledgeBase: kb
 * });
 * await verifier.initialize();
 * await verifier.start();
 *
 * const result = await verifier.verifyCommand({
 *   command: 'rm -rf /design/output',
 *   tool: 'shell',
 *   proposedBy: 'executor-1'
 * });
 * // result.approved === false, result.riskLevel === 'critical'
 */
export class VerificationAgent extends BaseAgent {
  private knowledgeBase: KnowledgeBase;
  private requireConfirmationForMediumRisk: boolean;
  private riskPatterns: RiskPattern[];

  /**
   * Default risk patterns for command analysis
   */
  private static readonly DEFAULT_RISK_PATTERNS: RiskPattern[] = [
    // File deletion patterns
    {
      name: "file_deletion",
      pattern: /\brm\s+(-[rf]+\s+)?[^|]*$/i,
      riskLevel: "high",
      description: "File deletion command detected",
      requiresConfirmation: true,
      suggestion: "Consider moving to trash or creating a backup first",
    },
    {
      name: "delete_command",
      pattern: /\b(delete|remove)\s+/i,
      riskLevel: "high",
      description: "Delete/remove operation detected",
      requiresConfirmation: true,
    },

    // Overwrite patterns
    {
      name: "shell_redirect_overwrite",
      pattern: />\s*[^>]/,
      riskLevel: "medium",
      description: "File overwrite via shell redirection detected",
      requiresConfirmation: true,
      suggestion: "Use >> for append or confirm the file should be overwritten",
    },
    {
      name: "force_overwrite",
      pattern: /-(force|f)\b/i,
      riskLevel: "high",
      description: "Force flag detected - may overwrite without warning",
      requiresConfirmation: true,
    },

    // EDA-specific destructive patterns
    {
      name: "eda_save_overwrite",
      pattern: /\bsave(design|lib|netlist)?\s+.*-overwrite/i,
      riskLevel: "high",
      description: "EDA save with overwrite flag",
      requiresConfirmation: true,
      suggestion: "Verify the design state before overwriting",
    },
    {
      name: "eda_file_force",
      pattern: /\bfile\s+.*-force/i,
      riskLevel: "high",
      description: "File operation with force flag in EDA tool",
      requiresConfirmation: true,
    },

    // Database/commit patterns
    {
      name: "database_commit",
      pattern: /\bcommit\b/i,
      riskLevel: "medium",
      description: "Database commit operation - changes will be persisted",
      requiresConfirmation: false,
      suggestion: "Ensure all changes have been verified before committing",
    },
    {
      name: "database_write",
      pattern: /\b(write|save)\s+.*\bdb\b/i,
      riskLevel: "medium",
      description: "Database write operation detected",
      requiresConfirmation: false,
    },

    // Tool exit patterns
    {
      name: "tool_exit",
      pattern: /\b(exit|quit)\b/i,
      riskLevel: "medium",
      description: "Tool exit command - may lose unsaved work",
      requiresConfirmation: true,
      suggestion: "Save your work before exiting",
    },

    // Batch/destructive EDA operations
    {
      name: "batch_mode",
      pattern: /\b-batch\b|\bbatch\s+/i,
      riskLevel: "medium",
      description: "Batch mode operation - limited interactivity",
      requiresConfirmation: false,
      suggestion: "Ensure all inputs are properly configured",
    },
    {
      name: "recursive_operation",
      pattern: /\brecursive\b|\b-r\s/i,
      riskLevel: "medium",
      description: "Recursive operation - affects multiple items",
      requiresConfirmation: true,
    },

    // Critical system operations
    {
      name: "system_shutdown",
      pattern: /\b(shutdown|reboot|halt|poweroff)\b/i,
      riskLevel: "critical",
      description: "System shutdown/reboot command detected",
      requiresConfirmation: true,
      suggestion: "This will affect all running processes",
    },
    {
      name: "kill_process",
      pattern: /\bkill\s+(-9\s+)?\d+/i,
      riskLevel: "high",
      description: "Process termination command",
      requiresConfirmation: true,
    },

    // Permission changes
    {
      name: "permission_change",
      pattern: /\bchmod\s+.*(777|666|755)/i,
      riskLevel: "medium",
      description: "Permission change detected",
      requiresConfirmation: false,
      suggestion: "Use minimal necessary permissions",
    },
  ];

  /**
   * Creates a new VerificationAgent instance.
   *
   * @param options - Configuration options including KnowledgeBase reference
   */
  constructor(options: VerificationAgentOptions) {
    super(options);

    this.knowledgeBase = options.knowledgeBase;
    this.messageBus = options.messageBus;
    this.requireConfirmationForMediumRisk =
      options.requireConfirmationForMediumRisk ?? true;
    this.riskPatterns = [
      ...VerificationAgent.DEFAULT_RISK_PATTERNS,
      ...(options.customRiskPatterns || []),
    ];
  }

  /**
   * Lifecycle hook called during initialization.
   * Validates that KnowledgeBase is available and registers with MessageBus.
   */
  protected async onInitialize(): Promise<void> {
    if (!this.knowledgeBase) {
      throw new Error("VerificationAgent requires a KnowledgeBase instance");
    }

    // Register with MessageBus if available
    if (this.messageBus) {
      this.messageBus.registerAgent(this.id as AgentId, async (message) => {
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
    }

    console.log(`[VerificationAgent:${this.id}] Initialized with ${this.riskPatterns.length} risk patterns`);
  }

  /**
   * Handles incoming messages from other agents.
   *
   * Supported message types:
   * - 'command.verify': Verify a command proposal
   * - 'pattern.query': Query for error patterns
   * - 'risk.assess': Assess risk of a command
   *
   * @param message - The message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    switch (message.type) {
      case "command.verify": {
        const proposal = message.payload as CommandProposal;
        const result = await this.verifyCommand(proposal);

        this.sendMessage({
          recipient: message.sender,
          type: "command.verification.complete",
          payload: result,
          priority: result.riskLevel === "critical" ? "critical" : "high",
          correlationId: message.correlationId,
        });
        break;
      }

      case "pattern.query": {
        const { command, tool } = message.payload as { command: string; tool: string };
        const patterns = await this.checkErrorPatterns(command, tool);

        this.sendMessage({
          recipient: message.sender,
          type: "pattern.query.result",
          payload: { patterns, command, tool },
          correlationId: message.correlationId,
        });
        break;
      }

      case "risk.assess": {
        const { command, tool, context } = message.payload as {
          command: string;
          tool: string;
          context?: string;
        };
        const riskLevel = this.calculateRisk(command, tool, context);

        this.sendMessage({
          recipient: message.sender,
          type: "risk.assessment.result",
          payload: { riskLevel, command, tool },
          correlationId: message.correlationId,
        });
        break;
      }

      case "task.assign": {
        // Handle task assignment from planner - verify command if provided
        const { taskType, payload } = message.payload as { taskType?: string; payload?: { command?: string; tool?: string } };
        if (taskType === "verify" && payload?.command) {
          const proposal: CommandProposal = {
            command: payload.command,
            tool: payload.tool || "unknown",
            context: `Verification task assigned by ${message.sender}`,
            proposedBy: message.sender,
          };
          const result = await this.verifyCommand(proposal);
          this.sendMessage({
            recipient: message.sender,
            type: "task.complete",
            payload: { taskId: (message.payload as { taskId?: string }).taskId, result },
            priority: result.riskLevel === "critical" ? "critical" : "high",
            correlationId: message.correlationId,
          });
        } else {
          // Acknowledge task completion for unhandled task types
          this.sendMessage({
            recipient: message.sender,
            type: "task.complete",
            payload: { taskId: (message.payload as { taskId?: string }).taskId, result: { acknowledged: true } },
            correlationId: message.correlationId,
          });
        }
        break;
      }

      default:
        console.warn(`[VerificationAgent:${this.id}] Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Verify a proposed command for safety and correctness.
   *
   * Performs multiple validation checks:
   * 1. Risk pattern matching against known dangerous operations
   * 2. KnowledgeBase error pattern lookup
   * 3. Risk level calculation
   * 4. Approval decision with reasoning
   *
   * @param proposal - The command proposal to verify
   * @returns Verification result with approval status and reasoning
   *
   * @example
   * const result = await verifier.verifyCommand({
   *   command: 'optDesign -postRoute -hold',
   *   tool: 'innovus',
   *   context: 'Fixing hold violations after routing',
   *   proposedBy: 'synthesis-agent-1'
   * });
   */
  async verifyCommand(proposal: CommandProposal): Promise<VerificationResult> {
    const { command, tool, context, proposedBy, correlationId } = proposal;
    const concerns: string[] = [];
    const suggestions: string[] = [];

    console.log(`[VerificationAgent:${this.id}] Verifying command from ${proposedBy}: ${command}`);

    // Step 1: Check against risk patterns
    const matchedPatterns = this.matchRiskPatterns(command);

    for (const match of matchedPatterns) {
      concerns.push(`${match.pattern.name}: ${match.pattern.description}`);
      if (match.pattern.suggestion) {
        suggestions.push(match.pattern.suggestion);
      }
    }

    // Step 2: Query KnowledgeBase for error patterns
    const errorPatterns = await this.checkErrorPatterns(command, tool);

    for (const pattern of errorPatterns) {
      concerns.push(`Known error pattern: ${pattern.description} (confidence: ${(pattern.confidence * 100).toFixed(0)}%)`);
      if (pattern.mitigation) {
        suggestions.push(pattern.mitigation);
      }
    }

    // Step 3: Calculate risk level
    const baseRiskLevel = this.calculateRisk(command, tool, context);
    const riskLevel = this.adjustRiskForPatterns(baseRiskLevel, matchedPatterns, errorPatterns);

    // Step 4: Determine approval and confirmation requirements
    const { approved, requiresUserConfirmation, reasoning } = this.makeDecision(
      riskLevel,
      matchedPatterns,
      errorPatterns,
      concerns,
      context
    );

    const result: VerificationResult = {
      approved,
      riskLevel,
      concerns: concerns.length > 0 ? concerns : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      requiresUserConfirmation,
      reasoning,
      timestamp: Date.now(),
      correlationId,
    };

    console.log(`[VerificationAgent:${this.id}] Verification complete: ${approved ? 'APPROVED' : 'REJECTED'} (${riskLevel})`);

    // Emit verification event for logging/monitoring
    this.emit("verificationComplete", {
      agentId: this.id,
      proposal,
      result,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Check a command against known error patterns in the KnowledgeBase.
   *
   * Queries the reflective tier for patterns matching the command context
   * and tool type. Returns patterns sorted by confidence.
   *
   * @param command - The command string to check
   * @param tool - The target EDA tool
   * @returns Array of matching error patterns
   */
  async checkErrorPatterns(command: string, tool: string): Promise<ErrorPattern[]> {
    const patterns: ErrorPattern[] = [];

    try {
      // Query reflective tier for error_recovery patterns
      const reflectivePatterns = await this.knowledgeBase.queryReflective(
        `${tool} ${command}`,
        "error_recovery"
      );

      for (const pattern of reflectivePatterns) {
        // Check if pattern signature matches command
        const matches = this.patternMatchesCommand(pattern, command);

        if (matches) {
          patterns.push({
            id: pattern.id,
            type: pattern.type,
            description: pattern.description,
            confidence: pattern.confidence,
            mitigation: pattern.context,
            successRate: pattern.successRate,
          });
        }
      }

      // Also check for direct error pattern matches
      const errorPattern = await this.knowledgeBase.findErrorPattern(command);
      if (errorPattern) {
        patterns.push({
          id: errorPattern.id,
          type: errorPattern.type,
          description: errorPattern.description,
          confidence: errorPattern.confidence,
          mitigation: errorPattern.context,
          successRate: errorPattern.successRate,
        });
      }
    } catch (error) {
      console.warn(`[VerificationAgent:${this.id}] Error querying KnowledgeBase:`, error);
    }

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate the risk level of a command.
   *
   * Analyzes the command for potentially dangerous operations and assigns
   * a risk level based on the severity of potential consequences.
   *
   * @param command - The command string to assess
   * @param tool - The target EDA tool
   * @param context - Optional additional context
   * @returns Risk level assessment
   */
  calculateRisk(command: string, tool: string, context?: string): RiskLevel {
    const matchedPatterns = this.matchRiskPatterns(command);

    if (matchedPatterns.length === 0) {
      return "low";
    }

    // Find highest risk level among matched patterns
    const riskPriority: RiskLevel[] = ["low", "medium", "high", "critical"];
    let highestRiskIndex = 0;

    for (const match of matchedPatterns) {
      const riskIndex = riskPriority.indexOf(match.pattern.riskLevel);
      if (riskIndex > highestRiskIndex) {
        highestRiskIndex = riskIndex;
      }
    }

    // Boost risk for certain tool/context combinations
    if (tool === "shell" && highestRiskIndex < riskPriority.indexOf("high")) {
      // Shell commands are inherently more risky
      const shellRiskBoost = 1;
      highestRiskIndex = Math.min(
        highestRiskIndex + shellRiskBoost,
        riskPriority.length - 1
      );
    }

    // Context-based adjustments
    if (context) {
      const contextLower = context.toLowerCase();

      // Production-related context increases risk
      if (
        contextLower.includes("production") ||
        contextLower.includes("release") ||
        contextLower.includes("final")
      ) {
        highestRiskIndex = Math.min(highestRiskIndex + 1, riskPriority.length - 1);
      }

      // Destructive context keywords
      if (
        contextLower.includes("delete") ||
        contextLower.includes("remove") ||
        contextLower.includes("overwrite")
      ) {
        highestRiskIndex = Math.min(highestRiskIndex + 1, riskPriority.length - 1);
      }
    }

    return riskPriority[highestRiskIndex];
  }

  /**
   * Match command against registered risk patterns.
   *
   * @param command - Command to check
   * @returns Array of matched patterns with match details
   */
  private matchRiskPatterns(command: string): Array<{ pattern: RiskPattern; match: RegExpMatchArray | null }> {
    const matches: Array<{ pattern: RiskPattern; match: RegExpMatchArray | null }> = [];

    for (const pattern of this.riskPatterns) {
      if (pattern.pattern instanceof RegExp) {
        const match = command.match(pattern.pattern);
        if (match) {
          matches.push({ pattern, match });
        }
      } else if (typeof pattern.pattern === "string") {
        if (command.toLowerCase().includes(pattern.pattern.toLowerCase())) {
          matches.push({ pattern, match: null });
        }
      }
    }

    return matches;
  }

  /**
   * Check if a reflective pattern matches the command.
   *
   * @param pattern - The pattern to check
   * @param command - The command to match against
   * @returns Whether the pattern matches
   */
  private patternMatchesCommand(pattern: Pattern, command: string): boolean {
    const signature = pattern.signature;

    if (signature instanceof RegExp) {
      return signature.test(command);
    } else if (typeof signature === "string") {
      return command.toLowerCase().includes(signature.toLowerCase());
    }

    return false;
  }

  /**
   * Adjust risk level based on matched patterns and error patterns.
   *
   * @param baseRisk - Initial risk level
   * @param riskMatches - Matched risk patterns
   * @param errorPatterns - Matched error patterns
   * @returns Adjusted risk level
   */
  private adjustRiskForPatterns(
    baseRisk: RiskLevel,
    riskMatches: Array<{ pattern: RiskPattern }>,
    errorPatterns: ErrorPattern[]
  ): RiskLevel {
    const riskPriority: RiskLevel[] = ["low", "medium", "high", "critical"];
    let riskIndex = riskPriority.indexOf(baseRisk);

    // Boost risk if high-confidence error patterns found
    const highConfidenceErrors = errorPatterns.filter((p) => p.confidence > 0.8);
    if (highConfidenceErrors.length > 0 && riskIndex < riskPriority.indexOf("high")) {
      riskIndex = Math.min(riskIndex + 1, riskPriority.length - 1);
    }

    // Boost risk if multiple critical patterns matched
    const criticalMatches = riskMatches.filter((m) => m.pattern.riskLevel === "critical");
    if (criticalMatches.length > 1) {
      riskIndex = riskPriority.indexOf("critical");
    }

    return riskPriority[riskIndex];
  }

  /**
   * Make the final approval decision based on risk assessment.
   *
   * @param riskLevel - Calculated risk level
   * @param riskMatches - Matched risk patterns
   * @param errorPatterns - Matched error patterns
   * @param concerns - List of concerns
   * @param context - Optional context
   * @returns Decision details
   */
  private makeDecision(
    riskLevel: RiskLevel,
    riskMatches: Array<{ pattern: RiskPattern }>,
    errorPatterns: ErrorPattern[],
    concerns: string[],
    _context?: string
  ): { approved: boolean; requiresUserConfirmation: boolean; reasoning: string } {
    // Critical risk commands are rejected by default
    if (riskLevel === "critical") {
      return {
        approved: false,
        requiresUserConfirmation: true,
        reasoning: `Command rejected due to critical risk level. ${concerns.length} concern(s) identified. Requires explicit user override to proceed.`,
      };
    }

    // High risk requires confirmation
    if (riskLevel === "high") {
      const hasDestructivePattern = riskMatches.some(
        (m) => m.pattern.name === "file_deletion" || m.pattern.name === "system_shutdown"
      );

      return {
        approved: !hasDestructivePattern, // Reject destructive high-risk, allow others with confirmation
        requiresUserConfirmation: true,
        reasoning: hasDestructivePattern
          ? "Command contains destructive operation that requires explicit user approval."
          : "High risk command requires user confirmation before execution.",
      };
    }

    // Medium risk may require confirmation based on configuration
    if (riskLevel === "medium") {
      const hasErrorPatterns = errorPatterns.length > 0;
      return {
        approved: true,
        requiresUserConfirmation: this.requireConfirmationForMediumRisk || hasErrorPatterns,
        reasoning: hasErrorPatterns
          ? "Medium risk with known error patterns - confirmation recommended."
          : "Medium risk command approved with standard safeguards.",
      };
    }

    // Low risk is auto-approved
    return {
      approved: true,
      requiresUserConfirmation: false,
      reasoning: "Low risk command - no concerns identified.",
    };
  }

  /**
   * Add a custom risk pattern at runtime.
   *
   * @param pattern - Risk pattern to add
   */
  addRiskPattern(pattern: RiskPattern): void {
    this.riskPatterns.push(pattern);
    console.log(`[VerificationAgent:${this.id}] Added risk pattern: ${pattern.name}`);
  }

  /**
   * Remove a risk pattern by name.
   *
   * @param patternName - Name of pattern to remove
   * @returns Whether a pattern was removed
   */
  removeRiskPattern(patternName: string): boolean {
    const initialLength = this.riskPatterns.length;
    this.riskPatterns = this.riskPatterns.filter((p) => p.name !== patternName);
    const removed = this.riskPatterns.length < initialLength;

    if (removed) {
      console.log(`[VerificationAgent:${this.id}] Removed risk pattern: ${patternName}`);
    }

    return removed;
  }

  /**
   * Get all registered risk patterns.
   *
   * @returns Array of risk patterns
   */
  getRiskPatterns(): RiskPattern[] {
    return [...this.riskPatterns];
  }

  /**
   * Get verification statistics.
   *
   * @returns Statistics object
   */
  getStats(): {
    riskPatternCount: number;
    requireConfirmationForMediumRisk: boolean;
  } {
    return {
      riskPatternCount: this.riskPatterns.length,
      requireConfirmationForMediumRisk: this.requireConfirmationForMediumRisk,
    };
  }
}

export default VerificationAgent;
