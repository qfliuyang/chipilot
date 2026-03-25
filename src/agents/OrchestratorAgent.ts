/**
 * @fileoverview OrchestratorAgent - Top-level coordination and entry point for user goals.
 *
 * The OrchestratorAgent serves as the strategic layer in the hierarchical multi-agent
 * system. It interprets user intent, decomposes goals into sub-goals, coordinates with
 * the PlannerAgent for execution, manages the lifecycle of all other agents, and provides
 * a unified interface for the TUI/cli.
 *
 * Architecture: Strategic Layer - Orchestrator Agent
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions, AgentState } from "./BaseAgent";
import { MessageBus, AgentId, getMessageBus, AgentMessage as BusAgentMessage } from "./MessageBus";
import { PlannerAgent, ExecutionPlan, PlanResult, PlanContext } from "./PlannerAgent";
import { KnowledgeCuratorAgent } from "./KnowledgeCuratorAgent";

/**
 * Intent types that can be interpreted from user input
 */
export type IntentType =
  | "execute_command"
  | "debug_error"
  | "optimize_design"
  | "query_status"
  | "learn_pattern"
  | "multi_step_task"
  | "conversation"
  | "unknown";

/**
 * Interpreted intent from natural language input
 */
export interface Intent {
  /** Type of intent */
  type: IntentType;

  /** Target tool if specified */
  targetTool?: string;

  /** Human-readable description of the intent */
  description: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Extracted entities from the input */
  entities: Record<string, string>;

  /** Original user input */
  originalInput: string;
}

/**
 * Result of processing a user goal
 */
export interface GoalResult {
  /** Whether the goal was successfully processed */
  success: boolean;

  /** Result message or output */
  message: string;

  /** Execution plan if created */
  plan?: ExecutionPlan;

  /** Plan execution result if executed */
  planResult?: PlanResult;

  /** Execution duration in milliseconds */
  duration: number;

  /** Error information if failed */
  error?: string;
}

/**
 * System event types
 */
export type SystemEventType =
  | "agent.error"
  | "agent.recovered"
  | "resource.low"
  | "knowledge.gap"
  | "user.interrupt"
  | "plan.failed"
  | "terminal.disconnected";

/**
 * System event for high-level handling
 */
export interface SystemEvent {
  /** Event type */
  type: SystemEventType;

  /** Event payload */
  payload: unknown;

  /** Timestamp */
  timestamp: number;

  /** Source agent ID */
  source?: string;
}

/**
 * Status of all agents in the system
 */
export interface SystemStatus {
  /** Orchestrator agent state */
  orchestrator: AgentState;

  /** Planner agent state */
  planner: AgentState;

  /** Knowledge curator agent state */
  knowledgeCurator: AgentState;

  /** Terminal perception agent state */
  terminalPerception: AgentState;

  /** Command synthesis agent state */
  commandSynthesis: AgentState;

  /** Verification agent state */
  verification: AgentState;

  /** Execution agent state */
  execution: AgentState;

  /** Number of active plans */
  activePlans: number;

  /** Current queue depth */
  queueDepth: number;
}

/**
 * User context for goal processing
 */
export interface UserContext {
  /** Current working directory */
  cwd?: string;

  /** Active EDA tool session */
  activeTool?: string;

  /** Previous conversation history */
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;

  /** User preferences */
  preferences?: {
    autoConfirm?: boolean;
    riskThreshold?: "low" | "medium" | "high";
    preferredTool?: string;
  };

  /** Session ID */
  sessionId?: string;
}

/**
 * Configuration options for OrchestratorAgent
 */
export interface OrchestratorAgentOptions extends BaseAgentOptions {
  /** MessageBus instance for agent communication */
  messageBus?: MessageBus;

  /** PlannerAgent instance */
  planner?: PlannerAgent;

  /** KnowledgeCuratorAgent instance */
  knowledgeCurator?: KnowledgeCuratorAgent;

  /** Confidence threshold for intent interpretation (default: 0.6) */
  intentConfidenceThreshold?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Agent registry entry
 */
interface AgentRegistryEntry {
  agentId: AgentId;
  state: AgentState;
  lastActivity: number;
}

/**
 * OrchestratorAgent - Central coordination and goal decomposition.
 *
 * Responsibilities:
 * - Serve as the top-level entry point for user goals
 * - Interpret user intent and decompose into sub-goals
 * - Coordinate PlannerAgent for task sequencing
 * - Manage the lifecycle of all other agents
 * - Handle high-level decision making and escalation
 * - Provide unified interface for the TUI/cli
 *
 * @example
 * const orchestrator = new OrchestratorAgent({
 *   id: "orchestrator",
 *   name: "Orchestrator Agent"
 * });
 * await orchestrator.initialize();
 * await orchestrator.start();
 *
 * const result = await orchestrator.processGoal("Run placement optimization", {
 *   activeTool: "innovus"
 * });
 */
export class OrchestratorAgent extends BaseAgent {
  private messageBus: MessageBus;
  private planner?: PlannerAgent;
  private knowledgeCurator?: KnowledgeCuratorAgent;
  private intentConfidenceThreshold: number;
  private debug: boolean;

  // Agent registry
  private agentRegistry: Map<AgentId, AgentRegistryEntry> = new Map();

  // Conversation context
  private conversationContext: Map<string, UserContext> = new Map();

  // MessageBus subscription
  private messageSubscription?: string;

  // Active goal tracking
  private activeGoals: Map<string, { startTime: number; intent: Intent }> = new Map();

  constructor(options: OrchestratorAgentOptions) {
    super(options);

    this.messageBus = options.messageBus ?? getMessageBus();
    this.planner = options.planner;
    this.knowledgeCurator = options.knowledgeCurator;
    this.intentConfidenceThreshold = options.intentConfidenceThreshold ?? 0.6;
    this.debug = options.debug ?? false;

    // Initialize agent registry with known agents
    this.initializeAgentRegistry();
  }

  /**
   * Process a user goal (main entry point).
   *
   * This is the primary interface for handling user input. It:
   * 1. Interprets the user's intent
   * 2. Determines if this is a simple command or complex multi-step task
   * 3. Either handles directly or delegates to PlannerAgent
   * 4. Returns the result
   *
   * @param userInput - The user's natural language input
   * @param context - Optional user context (cwd, active tool, etc.)
   * @returns Result of processing the goal
   *
   * @example
   * const result = await orchestrator.processGoal("Run placement optimization", {
   *   activeTool: "innovus",
   *   cwd: "/project/design"
   * });
   */
  async processGoal(userInput: string, context?: UserContext): Promise<GoalResult> {
    const startTime = Date.now();
    const goalId = this.generateGoalId();

    this.log("info", `Processing goal [${goalId}]: ${userInput}`);

    try {
      // Step 1: Interpret intent
      const intent = await this.interpretIntent(userInput);
      this.activeGoals.set(goalId, { startTime, intent });

      // Store conversation context
      if (context?.sessionId) {
        this.conversationContext.set(context.sessionId, context);
      }

      // Step 2: Handle based on intent type
      let result: GoalResult;

      switch (intent.type) {
        case "conversation":
          result = await this.handleConversation(intent, context);
          break;

        case "query_status":
          result = await this.handleStatusQuery(intent, context);
          break;

        case "execute_command":
        case "debug_error":
        case "optimize_design":
          if (this.isSimpleCommand(intent)) {
            result = await this.handleSimpleCommand(intent, context);
          } else {
            result = await this.delegateToPlanner(userInput, intent, context);
          }
          break;

        case "multi_step_task":
          result = await this.delegateToPlanner(userInput, intent, context);
          break;

        case "learn_pattern":
          result = await this.handleLearningRequest(intent, context);
          break;

        case "unknown":
        default:
          result = {
            success: false,
            message: "I'm not sure what you're asking. Could you rephrase?",
            duration: Date.now() - startTime,
            error: "Intent interpretation confidence too low",
          };
      }

      this.activeGoals.delete(goalId);
      return result;
    } catch (error) {
      this.activeGoals.delete(goalId);
      return {
        success: false,
        message: "An error occurred while processing your request.",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Interpret intent from natural language input.
   *
   * Analyzes the input to determine the user's intent, extracting:
   * - Intent type (execute_command, debug_error, etc.)
   * - Target tool if specified
   * - Confidence score
   * - Relevant entities
   *
   * @param input - Natural language input from user
   * @returns Interpreted intent with confidence score
   */
  async interpretIntent(input: string): Promise<Intent> {
    const inputLower = input.toLowerCase();

    // Extract entities
    const entities: Record<string, string> = {};

    // Detect target tool
    const toolPatterns: Record<string, RegExp> = {
      innovus: /\binnovus\b|\bencounter\b/i,
      genus: /\bgenus\b|\brc\b/i,
      tempus: /\btempus\b|\bprime\s*time\b/i,
      icc2: /\bicc2\b|\bicc\b/i,
      openroad: /\bopenroad\b/i,
    };

    let targetTool: string | undefined;
    for (const [tool, pattern] of Object.entries(toolPatterns)) {
      if (pattern.test(input)) {
        targetTool = tool;
        entities.tool = tool;
        break;
      }
    }

    // Detect intent type based on keywords
    let type: IntentType = "unknown";
    let confidence = 0.5;
    let description = input;

    // Multi-step task patterns
    const multiStepPatterns = [
      /\b(run|execute|perform)\s+(the\s+)?(full\s+)?(flow|process|steps?|sequence)/i,
      /\b(from\s+)?(synthesis|floorplan|placement)\s+(to|through|until)\s+(routing|gds|signoff)/i,
      /\bcomplete\s+(design|flow|process)/i,
      /\bdo\s+everything\s+(needed|required)\s+to\b/i,
    ];

    if (multiStepPatterns.some((p) => p.test(input))) {
      type = "multi_step_task";
      confidence = 0.85;
      description = `Multi-step task: ${input}`;
    }
    // Debug/error patterns
    else if (
      /\b(debug|fix|resolve|solve|error|fail|issue|problem|violation)\b/i.test(
        inputLower
      )
    ) {
      type = "debug_error";
      confidence = 0.8;
      description = `Debug/Fix: ${input}`;

      // Extract error type
      if (/\bhold\b/i.test(inputLower)) entities.errorType = "hold";
      if (/\bsetup\b/i.test(inputLower)) entities.errorType = "setup";
      if (/\bcongestion\b/i.test(inputLower)) entities.errorType = "congestion";
      if (/\bdrc\b/i.test(inputLower)) entities.errorType = "drc";
    }
    // Optimization patterns
    else if (
      /\b(optimize|improve|better|reduce|minimize|maximize|tune)\b/i.test(inputLower)
    ) {
      type = "optimize_design";
      confidence = 0.75;
      description = `Optimize: ${input}`;

      // Extract optimization target
      if (/\btiming\b/i.test(inputLower)) entities.target = "timing";
      if (/\barea\b/i.test(inputLower)) entities.target = "area";
      if (/\bpower\b/i.test(inputLower)) entities.target = "power";
      if (/\bcongestion\b/i.test(inputLower)) entities.target = "congestion";
    }
    // Status query patterns
    else if (
      /\b(status|progress|how\s+(is|are)|what\s+is|check|report|show\s+me)\b/i.test(
        inputLower
      )
    ) {
      type = "query_status";
      confidence = 0.7;
      description = `Status query: ${input}`;
    }
    // Learning patterns
    else if (
      /\b(learn|remember|save|capture|store)\s+(this|pattern|workflow|command)\b/i.test(
        inputLower
      )
    ) {
      type = "learn_pattern";
      confidence = 0.75;
      description = `Learning request: ${input}`;
    }
    // Conversation patterns
    else if (
      /\b(hello|hi|hey|help|what|how|why|when|where|who|can\s+you|do\s+you)\b/i.test(
        inputLower
      ) &&
      !/\b(run|execute|perform|debug|fix)\b/i.test(inputLower)
    ) {
      type = "conversation";
      confidence = 0.6;
      description = `Conversation: ${input}`;
    }
    // Default to execute command
    else {
      type = "execute_command";
      confidence = 0.65;
      description = `Execute: ${input}`;
    }

    // Boost confidence if tool was detected
    if (targetTool) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }

    return {
      type,
      targetTool,
      description,
      confidence,
      entities,
      originalInput: input,
    };
  }

  /**
   * Delegate a goal to the PlannerAgent for execution.
   *
   * Creates an execution plan and coordinates with the PlannerAgent
   * to execute the tasks. This is used for complex multi-step goals.
   *
   * @param goal - The high-level goal to achieve
   * @param intent - The interpreted intent
   * @param context - Optional user context
   * @returns Result of plan execution
   */
  async delegateToPlanner(
    goal: string,
    intent: Intent,
    context?: UserContext
  ): Promise<GoalResult> {
    const startTime = Date.now();

    this.log("info", `Delegating to planner: ${goal}`);

    if (!this.planner) {
      return {
        success: false,
        message: "Planner agent not available",
        duration: Date.now() - startTime,
        error: "Planner not initialized",
      };
    }

    try {
      // Create plan context
      const planContext: PlanContext = {
        tool: intent.targetTool || context?.activeTool,
        designContext: context?.cwd,
        priority: "normal",
      };

      // Create execution plan
      const plan = await this.planner.createPlan(goal, planContext);

      this.log("info", `Created plan with ${plan.tasks.length} tasks`);

      // Execute the plan
      const planResult = await this.planner.executePlan(plan);

      return {
        success: planResult.success,
        message: planResult.success
          ? `Successfully completed: ${goal}`
          : `Failed to complete: ${goal}`,
        plan,
        planResult,
        duration: Date.now() - startTime,
        error: planResult.error,
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to execute plan",
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Handle high-level system events.
   *
   * Processes system-wide events such as agent errors, resource issues,
   * and user interrupts. Makes high-level decisions about escalation
   * and recovery.
   *
   * @param event - The system event to handle
   */
  async handleSystemEvent(event: SystemEvent): Promise<void> {
    this.log("info", `Handling system event: ${event.type}`);

    switch (event.type) {
      case "agent.error":
        await this.handleAgentError(event);
        break;

      case "agent.recovered":
        await this.handleAgentRecovered(event);
        break;

      case "resource.low":
        await this.handleResourceLow(event);
        break;

      case "knowledge.gap":
        await this.handleKnowledgeGap(event);
        break;

      case "user.interrupt":
        await this.handleUserInterrupt(event);
        break;

      case "plan.failed":
        await this.handlePlanFailed(event);
        break;

      case "terminal.disconnected":
        await this.handleTerminalDisconnected(event);
        break;

      default:
        this.log("warn", `Unknown system event type: ${event.type}`);
    }
  }

  /**
   * Get system status across all agents.
   *
   * Returns the current state of all registered agents,
   * active plans, and queue depth.
   *
   * @returns System status snapshot
   */
  getSystemStatus(): SystemStatus {
    const getAgentState = (agentId: AgentId): AgentState => {
      return this.agentRegistry.get(agentId)?.state ?? "idle";
    };

    return {
      orchestrator: this.state,
      planner: getAgentState("planner"),
      knowledgeCurator: getAgentState("knowledge-curator"),
      terminalPerception: getAgentState("terminal-perception"),
      commandSynthesis: getAgentState("command-synthesis"),
      verification: getAgentState("verification"),
      execution: getAgentState("execution"),
      activePlans: this.planner?.getActivePlans().length ?? 0,
      queueDepth: this.activeGoals.size,
    };
  }

  /**
   * Emergency stop all operations.
   *
   * Immediately stops all agents and cancels active plans.
   * Use this for critical situations requiring immediate halt.
   */
  async emergencyStop(): Promise<void> {
    this.log("critical", "EMERGENCY STOP initiated");

    // Cancel all active goals
    this.activeGoals.clear();

    // Cancel active plans
    if (this.planner) {
      for (const plan of this.planner.getActivePlans()) {
        this.planner.cancelPlan(plan.id);
      }
    }

    // Broadcast emergency stop to all agents
    this.broadcastEvent("orchestrate", {
      event: "emergency_stop",
      timestamp: Date.now(),
    });

    this.emit("emergencyStop", {
      agentId: this.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Register an agent with the orchestrator.
   *
   * @param agentId - The agent identifier
   * @param initialState - Initial agent state
   */
  registerAgent(agentId: AgentId, initialState: AgentState = "idle"): void {
    this.agentRegistry.set(agentId, {
      agentId,
      state: initialState,
      lastActivity: Date.now(),
    });

    this.log("debug", `Registered agent: ${agentId}`);
  }

  /**
   * Update an agent's state in the registry.
   *
   * @param agentId - The agent identifier
   * @param state - New agent state
   */
  updateAgentState(agentId: AgentId, state: AgentState): void {
    const entry = this.agentRegistry.get(agentId);
    if (entry) {
      entry.state = state;
      entry.lastActivity = Date.now();
    }
  }

  /**
   * Handle incoming messages from other agents.
   *
   * @param message - The message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    this.log("debug", `Received message: ${message.type} from ${message.sender}`);

    switch (message.type) {
      case "escalate":
        await this.handleEscalation(message);
        break;

      case "task.complete":
        await this.handleTaskComplete(message);
        break;

      case "task.failed":
        await this.handleTaskFailed(message);
        break;

      case "event.terminal":
        await this.handleTerminalEvent(message);
        break;

      default:
        this.log("debug", `Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Lifecycle hook called during initialization.
   */
  protected async onInitialize(): Promise<void> {
    this.log("info", "OrchestratorAgent initializing");

    // Register with MessageBus
    this.messageBus.registerAgent("orchestrator" as AgentId, async (message) => {
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

    // Subscribe to relevant events
    this.messageSubscription = this.messageBus.subscribe("escalate", async (message) => {
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

  /**
   * Lifecycle hook called when starting.
   */
  protected async onStart(): Promise<void> {
    this.log("info", "OrchestratorAgent started");
  }

  /**
   * Lifecycle hook called when stopping.
   */
  protected async onStop(): Promise<void> {
    this.log("info", "OrchestratorAgent stopping");

    // Cancel all active goals
    this.activeGoals.clear();
  }

  /**
   * Lifecycle hook called during cleanup.
   */
  protected async onCleanup(): Promise<void> {
    this.log("info", "OrchestratorAgent cleaning up");

    // Unsubscribe from MessageBus
    if (this.messageSubscription) {
      this.messageBus.unsubscribe(this.messageSubscription);
    }

    // Unregister from MessageBus
    this.messageBus.unregisterAgent("orchestrator" as AgentId);

    // Clear registries
    this.agentRegistry.clear();
    this.conversationContext.clear();
    this.activeGoals.clear();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private initializeAgentRegistry(): void {
    const agents: AgentId[] = [
      "orchestrator",
      "planner",
      "knowledge-curator",
      "terminal-perception",
      "command-synthesis",
      "verification",
      "execution",
      "learning",
      "recovery",
    ];

    for (const agentId of agents) {
      this.agentRegistry.set(agentId, {
        agentId,
        state: "idle",
        lastActivity: Date.now(),
      });
    }
  }

  private isSimpleCommand(intent: Intent): boolean {
    // Simple commands are single-step, high-confidence intents
    // that don't require complex planning
    if (intent.confidence < 0.7) return false;

    // Check for multi-step indicators
    const multiStepIndicators = [
      /\band\s+then\b/i,
      /\bfollowed\s+by\b/i,
      /\bafter\s+that\b/i,
      /\bnext\b/i,
      /\bfinally\b/i,
    ];

    return !multiStepIndicators.some((pattern) =>
      pattern.test(intent.originalInput)
    );
  }

  private async handleConversation(
    intent: Intent,
    context?: UserContext
  ): Promise<GoalResult> {
    const input = intent.originalInput.toLowerCase();

    // Handle common conversational intents
    if (/\b(hello|hi|hey)\b/i.test(input)) {
      return {
        success: true,
        message: "Hello! I'm your EDA assistant. How can I help you today?",
        duration: 0,
      };
    }

    if (/\bhelp\b/i.test(input)) {
      return {
        success: true,
        message:
          "I can help you with:\n" +
          "- Running EDA tool commands (placement, routing, timing analysis)\n" +
          "- Debugging errors and violations\n" +
          "- Optimizing your design for timing, area, or power\n" +
          "- Checking status and generating reports\n" +
          "- Learning from successful workflows\n\n" +
          "What would you like to do?",
        duration: 0,
      };
    }

    if (/\b(status|how\s+are\s+you)\b/i.test(input)) {
      const status = this.getSystemStatus();
      return {
        success: true,
        message:
          `System status:\n` +
          `- Orchestrator: ${status.orchestrator}\n` +
          `- Planner: ${status.planner}\n` +
          `- Active plans: ${status.activePlans}\n` +
          `- Queue depth: ${status.queueDepth}`,
        duration: 0,
      };
    }

    return {
      success: true,
      message: "I understand. Please tell me what you'd like to do with your design.",
      duration: 0,
    };
  }

  private async handleStatusQuery(
    intent: Intent,
    context?: UserContext
  ): Promise<GoalResult> {
    const status = this.getSystemStatus();

    return {
      success: true,
      message:
        `Current system status:\n` +
        `Orchestrator: ${status.orchestrator}\n` +
        `Planner: ${status.planner}\n` +
        `Knowledge Curator: ${status.knowledgeCurator}\n` +
        `Terminal Perception: ${status.terminalPerception}\n` +
        `Command Synthesis: ${status.commandSynthesis}\n` +
        `Verification: ${status.verification}\n` +
        `Execution: ${status.execution}\n` +
        `Active plans: ${status.activePlans}\n` +
        `Queue depth: ${status.queueDepth}`,
      duration: 0,
    };
  }

  private async handleSimpleCommand(
    intent: Intent,
    context?: UserContext
  ): Promise<GoalResult> {
    // For simple commands, we could directly interact with CommandSynthesis
    // or Execution agents. For now, delegate to planner for consistency.
    return this.delegateToPlanner(intent.description, intent, context);
  }

  private async handleLearningRequest(
    intent: Intent,
    context?: UserContext
  ): Promise<GoalResult> {
    if (!this.knowledgeCurator) {
      return {
        success: false,
        message: "Knowledge curator not available",
        duration: 0,
        error: "Knowledge curator not initialized",
      };
    }

    // Send learning request to knowledge curator
    this.sendMessage({
      recipient: "knowledge-curator",
      type: "learn.capture",
      payload: {
        intent: intent.originalInput,
        context: context,
      },
    });

    return {
      success: true,
      message: "Learning request captured. I'll remember this pattern for future use.",
      duration: 0,
    };
  }

  private async handleAgentError(event: SystemEvent): Promise<void> {
    const { agentId, error } = event.payload as { agentId: string; error: string };
    this.log("error", `Agent ${agentId} reported error: ${error}`);

    // Update agent state
    this.updateAgentState(agentId as AgentId, "error");

    // Broadcast to other agents
    this.broadcastEvent("orchestrate", {
      event: "agent_error",
      agentId,
      error,
      timestamp: Date.now(),
    });
  }

  private async handleAgentRecovered(event: SystemEvent): Promise<void> {
    const { agentId } = event.payload as { agentId: string };
    this.log("info", `Agent ${agentId} recovered`);

    this.updateAgentState(agentId as AgentId, "idle");
  }

  private async handleResourceLow(event: SystemEvent): Promise<void> {
    const { resource, level } = event.payload as { resource: string; level: number };
    this.log("warn", `Low resource: ${resource} at ${level}%`);

    // Could trigger resource optimization or queuing
    this.broadcastEvent("orchestrate", {
      event: "resource_low",
      resource,
      level,
    });
  }

  private async handleKnowledgeGap(event: SystemEvent): Promise<void> {
    const { query, reason } = event.payload as { query: string; reason: string };
    this.log("info", `Knowledge gap detected: ${reason}`);

    // Could trigger learning or user notification
    this.broadcastEvent("orchestrate", {
      event: "knowledge_gap",
      query,
      reason,
    });
  }

  private async handleUserInterrupt(event: SystemEvent): Promise<void> {
    this.log("info", "User interrupt received");
    await this.emergencyStop();
  }

  private async handlePlanFailed(event: SystemEvent): Promise<void> {
    const { planId, error } = event.payload as { planId: string; error: string };
    this.log("error", `Plan ${planId} failed: ${error}`);

    // Could trigger replanning or escalation
    this.broadcastEvent("orchestrate", {
      event: "plan_failed",
      planId,
      error,
    });
  }

  private async handleTerminalDisconnected(event: SystemEvent): Promise<void> {
    this.log("error", "Terminal disconnected");

    // Pause operations until terminal reconnects
    this.broadcastEvent("orchestrate", {
      event: "terminal_disconnected",
    });
  }

  private async handleEscalation(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      reason: string;
      context?: unknown;
    };

    this.log("info", `Escalation from ${message.sender}: ${payload.reason}`);

    // Emit escalation event for UI handling
    this.emit("escalation", {
      from: message.sender,
      reason: payload.reason,
      context: payload.context,
      timestamp: Date.now(),
    });
  }

  private async handleTaskComplete(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      taskId?: string;
      result?: unknown;
    };

    this.log("debug", `Task ${payload.taskId} completed by ${message.sender}`);

    // Update agent activity
    this.updateAgentState(message.sender as AgentId, "idle");
  }

  private async handleTaskFailed(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      taskId?: string;
      error?: string;
    };

    this.log("error", `Task ${payload.taskId} failed: ${payload.error}`);

    // Update agent state
    this.updateAgentState(message.sender as AgentId, "error");
  }

  private async handleTerminalEvent(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      event: string;
      state?: string;
    };

    // Update terminal perception agent state
    if (payload.state) {
      this.updateAgentState("terminal-perception", payload.state as AgentState);
    }
  }

  private broadcastEvent(type: string, payload: unknown): void {
    const eventMessage: BusAgentMessage = {
      id: `${this.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      from: "orchestrator" as AgentId,
      to: "broadcast",
      type: type as import("./MessageBus").MessageType,
      payload,
      timestamp: Date.now(),
      priority: "high",
    };

    this.messageBus.broadcast(eventMessage).catch((err) => {
      this.log("error", "Failed to broadcast event:", err);
    });
  }

  private generateGoalId(): string {
    return `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private log(level: "debug" | "info" | "warn" | "error" | "critical", ...args: unknown[]): void {
    if (!this.debug && level === "debug") return;

    const timestamp = new Date().toISOString();
    const prefix = `[OrchestratorAgent:${level.toUpperCase()}] ${timestamp}`;

    // eslint-disable-next-line no-console
    console.log(prefix, ...args);
  }
}

export default OrchestratorAgent;
