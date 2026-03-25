/**
 * @fileoverview PlannerAgent - Task sequencing and dependency management for multi-agent system.
 *
 * This agent extends BaseAgent to provide planning services for the multi-agent system.
 * It decomposes high-level user goals into executable task sequences, manages task
 * dependencies (DAG structure), coordinates with specialist agents via MessageBus,
 * tracks task progress, handles failures, and generates execution plans with fallback strategies.
 *
 * Architecture: Manager Layer - Planner Agent
 * @see docs/architecture/multi-agent-system-final.md
 */

import { BaseAgent, AgentMessage, BaseAgentOptions } from "./BaseAgent";
import { MessageBus, AgentId, getMessageBus, AgentMessage as BusAgentMessage, MessagePriority } from "./MessageBus";
import { KnowledgeBase } from "./KnowledgeBase";

/**
 * Task types that can be assigned to specialist agents
 */
export type TaskType = "perceive" | "synthesize" | "verify" | "execute" | "query_knowledge";

/**
 * Task status in the execution lifecycle
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed";

/**
 * Plan status in the execution lifecycle
 */
export type PlanStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

/**
 * Recovery action types for task failures
 */
export type RecoveryActionType = "retry" | "skip" | "fallback" | "abort" | "escalate";

/**
 * Individual task in an execution plan
 */
export interface Task {
  /** Unique task identifier */
  id: string;

  /** Type of task - determines which specialist agent handles it */
  type: TaskType;

  /** Human-readable description of the task */
  description: string;

  /** Task-specific payload data */
  payload: unknown;

  /** IDs of tasks that must complete before this task can start */
  dependencies: string[];

  /** Current execution status */
  status: TaskStatus;

  /** Task result data (populated when completed) */
  result?: unknown;

  /** Error message (populated when failed) */
  error?: string;

  /** Number of retry attempts made */
  retryCount: number;

  /** Maximum number of retry attempts allowed */
  maxRetries: number;

  /** Timeout in milliseconds */
  timeout: number;

  /** Timestamp when task started */
  startedAt?: number;

  /** Timestamp when task completed or failed */
  completedAt?: number;
}

/**
 * Execution plan containing tasks and their dependencies
 */
export interface ExecutionPlan {
  /** Unique plan identifier */
  id: string;

  /** High-level goal this plan aims to achieve */
  goal: string;

  /** All tasks in the plan */
  tasks: Task[];

  /** Dependency graph: taskId -> array of dependency taskIds */
  dependencies: Map<string, string[]>;

  /** Index of the current task being executed */
  currentTaskIndex: number;

  /** Overall plan status */
  status: PlanStatus;

  /** Timestamp when plan was created */
  createdAt: number;

  /** Timestamp when plan started execution */
  startedAt?: number;

  /** Timestamp when plan completed or failed */
  completedAt?: number;

  /** Error message if plan failed */
  error?: string;
}

/**
 * Result of plan execution
 */
export interface PlanResult {
  /** Whether the plan executed successfully */
  success: boolean;

  /** The execution plan with final task states */
  plan: ExecutionPlan;

  /** Results from all completed tasks */
  results: Map<string, unknown>;

  /** Error message if plan failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Recovery action for failed tasks
 */
export interface RecoveryAction {
  /** Type of recovery action */
  type: RecoveryActionType;

  /** Human-readable description of the recovery action */
  description: string;

  /** Updated task payload for retry/fallback */
  updatedPayload?: unknown;

  /** Alternative task to execute (for fallback) */
  fallbackTask?: Task;

  /** Reason for choosing this recovery action */
  reasoning: string;
}

/**
 * Context for plan creation
 */
export interface PlanContext {
  /** Target EDA tool (e.g., 'innovus', 'genus', 'tempus') */
  tool?: string;

  /** Additional context about the design or environment */
  designContext?: string;

  /** Whether to allow parallel execution of independent tasks */
  allowParallel?: boolean;

  /** Global timeout for the entire plan */
  planTimeout?: number;

  /** Default timeout for individual tasks */
  taskTimeout?: number;

  /** Maximum retry attempts for tasks */
  maxRetries?: number;

  /** Priority level for plan execution */
  priority?: MessagePriority;
}

/**
 * Configuration options for PlannerAgent
 */
export interface PlannerAgentOptions extends BaseAgentOptions {
  /** MessageBus instance for agent communication */
  messageBus?: MessageBus;

  /** KnowledgeBase instance for workflow templates */
  knowledgeBase?: KnowledgeBase;

  /** Default timeout for tasks in milliseconds (default: 30000) */
  defaultTaskTimeout?: number;

  /** Default maximum retries for tasks (default: 3) */
  defaultMaxRetries?: number;

  /** Whether to enable parallel execution (default: true) */
  enableParallelExecution?: boolean;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * PlannerAgent - Task sequencing and dependency management.
 *
 * Responsibilities:
 * - Decompose high-level user goals into executable task sequences
 * - Manage task dependencies (DAG structure)
 * - Coordinate with specialist agents via MessageBus
 * - Track task progress and handle failures
 * - Generate execution plans with fallback strategies
 *
 * @example
 * const planner = new PlannerAgent({
 *   id: "planner",
 *   name: "Planner Agent",
 *   knowledgeBase: kb
 * });
 * await planner.initialize();
 * await planner.start();
 *
 * const plan = await planner.createPlan("Run placement optimization", {
 *   tool: "innovus",
 *   designContext: "28nm design, floorplan complete"
 * });
 *
 * const result = await planner.executePlan(plan);
 */
export class PlannerAgent extends BaseAgent {
  private messageBus: MessageBus;
  private knowledgeBase?: KnowledgeBase;
  private defaultTaskTimeout: number;
  private defaultMaxRetries: number;
  private enableParallelExecution: boolean;
  private debug: boolean;

  // Plan tracking
  private activePlans: Map<string, ExecutionPlan> = new Map();
  private completedPlans: Map<string, PlanResult> = new Map();
  private taskResolvers: Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }> = new Map();

  // MessageBus subscription
  private messageSubscription?: string;

  constructor(options: PlannerAgentOptions) {
    super(options);

    this.messageBus = options.messageBus ?? getMessageBus();
    this.knowledgeBase = options.knowledgeBase;
    this.defaultTaskTimeout = options.defaultTaskTimeout ?? 30000;
    this.defaultMaxRetries = options.defaultMaxRetries ?? 3;
    this.enableParallelExecution = options.enableParallelExecution ?? true;
    this.debug = options.debug ?? false;
  }

  /**
   * Create an execution plan from a high-level user goal.
   *
   * Decomposes the goal into a sequence of tasks based on the target tool
   * and context. Queries the KnowledgeBase for workflow templates if available.
   *
   * @param goal - High-level user goal (e.g., "Run placement optimization")
   * @param context - Optional context for plan creation
   * @returns Execution plan with tasks and dependencies
   */
  async createPlan(goal: string, context?: PlanContext): Promise<ExecutionPlan> {
    this.log("info", `Creating plan for goal: ${goal}`);

    const planId = this.generatePlanId();
    const tasks: Task[] = [];
    const dependencies = new Map<string, string[]>();

    // Try to retrieve workflow template from KnowledgeBase
    const workflowTemplate = await this.queryWorkflowTemplate(goal, context?.tool);

    if (workflowTemplate) {
      // Use template-based task generation
      this.log("debug", `Using workflow template for: ${goal}`);
      const templateTasks = this.generateTasksFromTemplate(workflowTemplate, context);
      tasks.push(...templateTasks);
    } else {
      // Generate tasks based on goal analysis
      this.log("debug", `Generating tasks from goal analysis: ${goal}`);
      const generatedTasks = this.generateTasksFromGoal(goal, context);
      tasks.push(...generatedTasks);
    }

    // Build dependency graph
    for (const task of tasks) {
      dependencies.set(task.id, task.dependencies);
    }

    const plan: ExecutionPlan = {
      id: planId,
      goal,
      tasks,
      dependencies,
      currentTaskIndex: 0,
      status: "pending",
      createdAt: Date.now(),
    };

    // Store plan
    this.activePlans.set(planId, plan);

    this.log("info", `Created plan ${planId} with ${tasks.length} tasks`);

    // Emit plan created event
    this.emit("planCreated", {
      agentId: this.id,
      planId,
      taskCount: tasks.length,
      timestamp: Date.now(),
    });

    return plan;
  }

  /**
   * Execute an execution plan by coordinating with specialist agents.
   *
   * Processes tasks in dependency order, sending assignments to appropriate
   * specialist agents via the MessageBus. Handles task completion and failure
   * events, with support for parallel execution of independent tasks.
   *
   * @param plan - The execution plan to execute
   * @returns Result of plan execution
   */
  async executePlan(plan: ExecutionPlan): Promise<PlanResult> {
    const startTime = Date.now();

    this.log("info", `Executing plan ${plan.id}: ${plan.goal}`);

    // Update plan status
    plan.status = "running";
    plan.startedAt = Date.now();

    this.emit("planStarted", {
      agentId: this.id,
      planId: plan.id,
      timestamp: plan.startedAt,
    });

    try {
      // Execute tasks in dependency order
      while (plan.currentTaskIndex < plan.tasks.length) {
        const readyTasks = this.getReadyTasks(plan);

        if (readyTasks.length === 0) {
          // Check for circular dependencies or stuck state
          if (this.hasRunningTasks(plan)) {
            // Wait for running tasks to complete
            await this.waitForTaskCompletion(plan, 1000);
            continue;
          } else {
            throw new Error("Deadlock detected: no ready tasks and no running tasks");
          }
        }

        if (this.enableParallelExecution && readyTasks.length > 1) {
          // Execute independent tasks in parallel
          await this.executeTasksParallel(plan, readyTasks);
        } else {
          // Execute tasks sequentially
          for (const task of readyTasks) {
            await this.executeTask(plan, task);
          }
        }

        // Move to next batch of tasks
        plan.currentTaskIndex++;
      }

      // Plan completed successfully
      plan.status = "completed";
      plan.completedAt = Date.now();

      const result: PlanResult = {
        success: true,
        plan,
        results: this.collectResults(plan),
        duration: Date.now() - startTime,
      };

      this.completedPlans.set(plan.id, result);
      this.activePlans.delete(plan.id);

      this.log("info", `Plan ${plan.id} completed successfully in ${result.duration}ms`);

      this.emit("planCompleted", {
        agentId: this.id,
        planId: plan.id,
        duration: result.duration,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      // Plan failed
      plan.status = "failed";
      plan.completedAt = Date.now();
      plan.error = error instanceof Error ? error.message : String(error);

      const result: PlanResult = {
        success: false,
        plan,
        results: this.collectResults(plan),
        error: plan.error,
        duration: Date.now() - startTime,
      };

      this.completedPlans.set(plan.id, result);

      this.log("error", `Plan ${plan.id} failed: ${plan.error}`);

      this.emit("planFailed", {
        agentId: this.id,
        planId: plan.id,
        error: plan.error,
        timestamp: Date.now(),
      });

      return result;
    }
  }

  /**
   * Handle task failure with recovery strategy.
   *
   * Analyzes the failure and determines the appropriate recovery action:
   * - retry: Retry the same task
   * - skip: Skip the failed task and continue
   * - fallback: Execute an alternative task
   * - abort: Stop plan execution
   * - escalate: Escalate to parent agent or user
   *
   * @param taskId - ID of the failed task
   * @param error - Error that caused the failure
   * @returns Recovery action to take
   */
  async handleTaskFailure(taskId: string, error: Error): Promise<RecoveryAction> {
    this.log("info", `Handling failure for task ${taskId}: ${error.message}`);

    // Find the task in active plans
    let task: Task | undefined;
    let plan: ExecutionPlan | undefined;

    for (const p of Array.from(this.activePlans.values())) {
      const t = p.tasks.find((t) => t.id === taskId);
      if (t) {
        task = t;
        plan = p;
        break;
      }
    }

    if (!task || !plan) {
      return {
        type: "abort",
        description: "Task not found in any active plan",
        reasoning: "Cannot recover from failure - task context lost",
      };
    }

    // Update task status
    task.status = "failed";
    task.error = error.message;
    task.completedAt = Date.now();

    // Determine recovery strategy
    if (task.retryCount < task.maxRetries) {
      // Retry the task
      return {
        type: "retry",
        description: `Retry task ${taskId} (attempt ${task.retryCount + 1}/${task.maxRetries})`,
        reasoning: `Task failed but has ${task.maxRetries - task.retryCount} retries remaining`,
      };
    }

    // Check if task is optional (can be skipped)
    if (this.isOptionalTask(task)) {
      return {
        type: "skip",
        description: `Skip optional task ${taskId}`,
        reasoning: "Task is optional and can be skipped without affecting plan success",
      };
    }

    // Check for fallback strategies
    const fallbackTask = await this.generateFallbackTask(task, plan);
    if (fallbackTask) {
      return {
        type: "fallback",
        description: `Execute fallback task for ${taskId}`,
        fallbackTask,
        reasoning: "Primary task failed, attempting fallback strategy",
      };
    }

    // Critical task failed with no recovery options
    return {
      type: "escalate",
      description: `Escalate failure of critical task ${taskId}`,
      reasoning: `Critical task ${taskId} failed after ${task.maxRetries} retries with no fallback available`,
    };
  }

  /**
   * Get the current status of a plan.
   *
   * @param planId - ID of the plan to check
   * @returns Current plan status
   */
  getPlanStatus(planId: string): PlanStatus {
    const activePlan = this.activePlans.get(planId);
    if (activePlan) {
      return activePlan.status;
    }

    const completedPlan = this.completedPlans.get(planId);
    if (completedPlan) {
      return completedPlan.plan.status;
    }

    return "pending";
  }

  /**
   * Get a plan by ID.
   *
   * @param planId - ID of the plan to retrieve
   * @returns The execution plan or undefined if not found
   */
  getPlan(planId: string): ExecutionPlan | undefined {
    return this.activePlans.get(planId);
  }

  /**
   * Cancel a running plan.
   *
   * @param planId - ID of the plan to cancel
   * @returns Whether the plan was cancelled
   */
  cancelPlan(planId: string): boolean {
    const plan = this.activePlans.get(planId);
    if (!plan || plan.status !== "running") {
      return false;
    }

    plan.status = "cancelled";
    plan.completedAt = Date.now();

    this.emit("planCancelled", {
      agentId: this.id,
      planId,
      timestamp: Date.now(),
    });

    this.log("info", `Plan ${planId} cancelled`);

    return true;
  }

  /**
   * Get all active plans.
   *
   * @returns Array of active execution plans
   */
  getActivePlans(): ExecutionPlan[] {
    return Array.from(this.activePlans.values());
  }

  /**
   * Get completed plan results.
   *
   * @param limit - Maximum number of results to return
   * @returns Array of completed plan results
   */
  getCompletedPlans(limit?: number): PlanResult[] {
    const results = Array.from(this.completedPlans.values());
    if (limit && limit > 0) {
      return results.slice(-limit);
    }
    return results;
  }

  /**
   * Handle incoming messages from other agents.
   *
   * Processes task completion and failure messages from specialist agents.
   *
   * @param message - The message to handle
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    this.log("debug", `Received message: ${message.type} from ${message.sender}`);

    switch (message.type) {
      case "task.complete":
        await this.handleTaskComplete(message);
        break;

      case "task.failed":
        await this.handleTaskFailed(message);
        break;

      case "plan.create":
        await this.handlePlanCreate(message);
        break;

      case "plan.execute":
        await this.handlePlanExecute(message);
        break;

      case "plan.cancel":
        await this.handlePlanCancel(message);
        break;

      case "query.plan.status":
        await this.handleQueryPlanStatus(message);
        break;

      default:
        this.log("debug", `Unhandled message type: ${message.type}`);
    }
  }

  /**
   * Lifecycle hook called during initialization.
   */
  protected async onInitialize(): Promise<void> {
    this.log("info", "PlannerAgent initializing");

    // Register with MessageBus
    this.messageBus.registerAgent("planner" as AgentId, async (message) => {
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
      this.messageBus.send(busMessage).catch((err) => {
        this.log("error", "Failed to send message via MessageBus:", err);
      });
    });

    // Subscribe to task completion events
    this.messageSubscription = this.messageBus.subscribe("task.*", async (message) => {
      if (message.to === "planner" || message.to === "broadcast") {
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
      }
    });
  }

  /**
   * Lifecycle hook called when starting.
   */
  protected async onStart(): Promise<void> {
    this.log("info", "PlannerAgent started");
  }

  /**
   * Lifecycle hook called when pausing.
   */
  protected async onPause(): Promise<void> {
    this.log("info", "PlannerAgent paused");
  }

  /**
   * Lifecycle hook called when resuming.
   */
  protected async onResume(): Promise<void> {
    this.log("info", "PlannerAgent resumed");
  }

  /**
   * Lifecycle hook called when stopping.
   */
  protected async onStop(): Promise<void> {
    this.log("info", "PlannerAgent stopping");

    // Cancel all active plans
    for (const plan of Array.from(this.activePlans.values())) {
      if (plan.status === "running") {
        this.cancelPlan(plan.id);
      }
    }
  }

  /**
   * Lifecycle hook called during cleanup.
   */
  protected async onCleanup(): Promise<void> {
    this.log("info", "PlannerAgent cleaning up");

    // Unsubscribe from MessageBus
    if (this.messageSubscription) {
      this.messageBus.unsubscribe(this.messageSubscription);
    }

    // Unregister from MessageBus
    this.messageBus.unregisterAgent("planner" as AgentId);

    // Clear plan tracking
    this.activePlans.clear();
    this.completedPlans.clear();
    this.taskResolvers.clear();
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Query KnowledgeBase for workflow template matching the goal.
   */
  private async queryWorkflowTemplate(goal: string, tool?: string): Promise<unknown | null> {
    if (!this.knowledgeBase) {
      return null;
    }

    try {
      const results = await this.knowledgeBase.queryReflective(goal, "workflow");
      if (results.length > 0) {
        // Return the highest confidence match
        return results[0];
      }
    } catch (error) {
      this.log("warn", "Failed to query workflow template:", error);
    }

    return null;
  }

  /**
   * Generate tasks from a workflow template.
   */
  private generateTasksFromTemplate(template: unknown, context?: PlanContext): Task[] {
    const tasks: Task[] = [];
    const templateData = template as { command_sequence?: string[]; description?: string };

    if (templateData.command_sequence) {
      for (let i = 0; i < templateData.command_sequence.length; i++) {
        const command = templateData.command_sequence[i];
        const taskId = this.generateTaskId();

        tasks.push({
          id: taskId,
          type: "execute",
          description: `Execute: ${command}`,
          payload: { command, tool: context?.tool },
          dependencies: i > 0 ? [tasks[i - 1].id] : [],
          status: "pending",
          retryCount: 0,
          maxRetries: context?.maxRetries ?? this.defaultMaxRetries,
          timeout: context?.taskTimeout ?? this.defaultTaskTimeout,
        });
      }
    }

    return tasks;
  }

  /**
   * Generate tasks by analyzing the goal.
   */
  private generateTasksFromGoal(goal: string, context?: PlanContext): Task[] {
    const tasks: Task[] = [];
    const goalLower = goal.toLowerCase();

    // Common EDA workflow patterns
    if (goalLower.includes("place")) {
      // Placement workflow
      const perceiveTask = this.createTask("perceive", "Check terminal state", {}, context);
      tasks.push(perceiveTask);

      const synthesizeTask = this.createTask(
        "synthesize",
        "Generate placement command",
        { intent: goal, tool: context?.tool },
        context,
        [perceiveTask.id]
      );
      tasks.push(synthesizeTask);

      const verifyTask = this.createTask(
        "verify",
        "Verify placement command",
        {},
        context,
        [synthesizeTask.id]
      );
      tasks.push(verifyTask);

      const executeTask = this.createTask(
        "execute",
        "Execute placement command",
        {},
        context,
        [verifyTask.id]
      );
      tasks.push(executeTask);
    } else if (goalLower.includes("route")) {
      // Routing workflow
      const perceiveTask = this.createTask("perceive", "Check terminal state", {}, context);
      tasks.push(perceiveTask);

      const synthesizeTask = this.createTask(
        "synthesize",
        "Generate routing command",
        { intent: goal, tool: context?.tool },
        context,
        [perceiveTask.id]
      );
      tasks.push(synthesizeTask);

      const executeTask = this.createTask(
        "execute",
        "Execute routing command",
        {},
        context,
        [synthesizeTask.id]
      );
      tasks.push(executeTask);
    } else if (goalLower.includes("report") || goalLower.includes("check")) {
      // Reporting workflow
      const perceiveTask = this.createTask("perceive", "Check terminal state", {}, context);
      tasks.push(perceiveTask);

      const synthesizeTask = this.createTask(
        "synthesize",
        "Generate report command",
        { intent: goal, tool: context?.tool },
        context,
        [perceiveTask.id]
      );
      tasks.push(synthesizeTask);

      const executeTask = this.createTask(
        "execute",
        "Execute report command",
        {},
        context,
        [synthesizeTask.id]
      );
      tasks.push(executeTask);
    } else {
      // Generic workflow
      const perceiveTask = this.createTask("perceive", "Check terminal state", {}, context);
      tasks.push(perceiveTask);

      const queryTask = this.createTask(
        "query_knowledge",
        "Query knowledge base",
        { query: goal },
        context,
        [perceiveTask.id]
      );
      tasks.push(queryTask);

      const synthesizeTask = this.createTask(
        "synthesize",
        "Generate command",
        { intent: goal, tool: context?.tool },
        context,
        [queryTask.id]
      );
      tasks.push(synthesizeTask);

      const executeTask = this.createTask(
        "execute",
        "Execute command",
        {},
        context,
        [synthesizeTask.id]
      );
      tasks.push(executeTask);
    }

    return tasks;
  }

  /**
   * Create a single task with default values.
   */
  private createTask(
    type: TaskType,
    description: string,
    payload: unknown,
    context?: PlanContext,
    dependencies: string[] = []
  ): Task {
    return {
      id: this.generateTaskId(),
      type,
      description,
      payload,
      dependencies,
      status: "pending",
      retryCount: 0,
      maxRetries: context?.maxRetries ?? this.defaultMaxRetries,
      timeout: context?.taskTimeout ?? this.defaultTaskTimeout,
    };
  }

  /**
   * Get tasks that are ready to execute (dependencies satisfied).
   */
  private getReadyTasks(plan: ExecutionPlan): Task[] {
    const completedTaskIds = new Set(
      plan.tasks.filter((t) => t.status === "completed").map((t) => t.id)
    );

    return plan.tasks.filter((task) => {
      if (task.status !== "pending") return false;

      // Check if all dependencies are completed
      const deps = plan.dependencies.get(task.id) || [];
      return deps.every((depId) => completedTaskIds.has(depId));
    });
  }

  /**
   * Check if any tasks in the plan are currently running.
   */
  private hasRunningTasks(plan: ExecutionPlan): boolean {
    return plan.tasks.some((t) => t.status === "running");
  }

  /**
   * Wait for task completion with timeout.
   */
  private async waitForTaskCompletion(plan: ExecutionPlan, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.hasRunningTasks(plan)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, timeoutMs);
    });
  }

  /**
   * Execute a single task by sending it to the appropriate specialist agent.
   */
  private async executeTask(plan: ExecutionPlan, task: Task): Promise<void> {
    task.status = "running";
    task.startedAt = Date.now();

    this.log("debug", `Executing task ${task.id}: ${task.description}`);

    // Determine target agent based on task type
    const targetAgent = this.getTargetAgentForTask(task);

    // Create a promise that will resolve when the task completes
    return new Promise((resolve, reject) => {
      // Store resolver for later use when task completes
      this.taskResolvers.set(task.id, {
        resolve: (value: unknown) => {
          task.status = "completed";
          task.result = value;
          task.completedAt = Date.now();
          this.taskResolvers.delete(task.id);
          resolve();
        },
        reject: (error: Error) => {
          task.status = "failed";
          task.error = error.message;
          task.completedAt = Date.now();
          this.taskResolvers.delete(task.id);
          reject(error);
        },
      });

      // Send task assignment to specialist agent
      this.sendMessage({
        recipient: targetAgent,
        type: "task.assign",
        payload: {
          taskId: task.id,
          planId: plan.id,
          taskType: task.type,
          description: task.description,
          payload: task.payload,
        },
        priority: "normal",
        correlationId: `${plan.id}:${task.id}`,
      });

      // Set up timeout
      setTimeout(() => {
        if (task.status === "running") {
          const resolver = this.taskResolvers.get(task.id);
          if (resolver) {
            resolver.reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`));
          }
        }
      }, task.timeout);
    });
  }

  /**
   * Execute multiple tasks in parallel.
   */
  private async executeTasksParallel(plan: ExecutionPlan, tasks: Task[]): Promise<void> {
    this.log("debug", `Executing ${tasks.length} tasks in parallel`);

    const promises = tasks.map((task) => this.executeTask(plan, task));
    await Promise.all(promises);
  }

  /**
   * Get the target agent ID for a task type.
   */
  private getTargetAgentForTask(task: Task): AgentId {
    switch (task.type) {
      case "perceive":
        return "terminal-perception";
      case "synthesize":
        return "command-synthesis";
      case "verify":
        return "verification";
      case "execute":
        return "execution";
      case "query_knowledge":
        return "knowledge-curator";
      default:
        return "orchestrator";
    }
  }

  /**
   * Check if a task is optional (can be skipped on failure).
   */
  private isOptionalTask(task: Task): boolean {
    // Tasks that query knowledge or verify are often optional
    return task.type === "query_knowledge" || task.type === "verify";
  }

  /**
   * Generate a fallback task for a failed task.
   */
  private async generateFallbackTask(task: Task, plan: ExecutionPlan): Promise<Task | null> {
    // Simple fallback strategies
    if (task.type === "synthesize") {
      // Fallback: try with different parameters or simpler approach
      return {
        ...task,
        id: this.generateTaskId(),
        description: `${task.description} (fallback)`,
        payload: { ...(task.payload as Record<string, unknown>), fallback: true },
        status: "pending",
        retryCount: 0,
      };
    }

    if (task.type === "verify") {
      // Verification can be skipped in fallback
      return null; // null means skip
    }

    return null;
  }

  /**
   * Collect results from all completed tasks in a plan.
   */
  private collectResults(plan: ExecutionPlan): Map<string, unknown> {
    const results = new Map<string, unknown>();
    for (const task of plan.tasks) {
      if (task.status === "completed" && task.result !== undefined) {
        results.set(task.id, task.result);
      }
    }
    return results;
  }

  /**
   * Handle task completion message from specialist agent.
   */
  private async handleTaskComplete(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      taskId?: string;
      result?: unknown;
      planId?: string;
    };

    const taskId = payload.taskId;
    if (!taskId) return;

    const resolver = this.taskResolvers.get(taskId);
    if (resolver) {
      resolver.resolve(payload.result);
    }

    this.emit("taskCompleted", {
      agentId: this.id,
      taskId,
      planId: payload.planId,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle task failure message from specialist agent.
   */
  private async handleTaskFailed(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      taskId?: string;
      error?: string;
      planId?: string;
    };

    const taskId = payload.taskId;
    if (!taskId) return;

    const error = new Error(payload.error || "Task failed");

    // Attempt recovery
    const recoveryAction = await this.handleTaskFailure(taskId, error);

    switch (recoveryAction.type) {
      case "retry": {
        // Find and retry the task
        for (const plan of Array.from(this.activePlans.values())) {
          const task = plan.tasks.find((t) => t.id === taskId);
          if (task) {
            task.retryCount++;
            task.status = "pending";
            task.error = undefined;
            await this.executeTask(plan, task);
            break;
          }
        }
        break;
      }

      case "skip": {
        // Mark task as completed with empty result
        const resolver = this.taskResolvers.get(taskId);
        if (resolver) {
          resolver.resolve({ skipped: true });
        }
        break;
      }

      case "fallback": {
        // Execute fallback task
        if (recoveryAction.fallbackTask) {
          for (const plan of Array.from(this.activePlans.values())) {
            const taskIndex = plan.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex !== -1) {
              plan.tasks.splice(taskIndex + 1, 0, recoveryAction.fallbackTask);
              break;
            }
          }
        }
        break;
      }

      case "abort":
      case "escalate":
      default: {
        // Reject the task
        const resolver = this.taskResolvers.get(taskId);
        if (resolver) {
          resolver.reject(error);
        }
        break;
      }
    }

    this.emit("taskFailed", {
      agentId: this.id,
      taskId,
      planId: payload.planId,
      recoveryAction: recoveryAction.type,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle plan creation request message.
   */
  private async handlePlanCreate(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      goal: string;
      context?: PlanContext;
    };

    try {
      const plan = await this.createPlan(payload.goal, payload.context);

      this.sendMessage({
        recipient: message.sender,
        type: "plan.created",
        payload: { planId: plan.id, plan },
        correlationId: message.correlationId,
      });
    } catch (error) {
      this.sendMessage({
        recipient: message.sender,
        type: "plan.failed",
        payload: {
          error: error instanceof Error ? error.message : String(error),
          goal: payload.goal,
        },
        correlationId: message.correlationId,
        priority: "high",
      });
    }
  }

  /**
   * Handle plan execution request message.
   */
  private async handlePlanExecute(message: AgentMessage): Promise<void> {
    const payload = message.payload as {
      plan?: ExecutionPlan;
      planId?: string;
    };

    let plan: ExecutionPlan | undefined;

    if (payload.plan) {
      plan = payload.plan;
      this.activePlans.set(plan.id, plan);
    } else if (payload.planId) {
      plan = this.activePlans.get(payload.planId);
    }

    if (!plan) {
      this.sendMessage({
        recipient: message.sender,
        type: "plan.failed",
        payload: { error: "Plan not found" },
        correlationId: message.correlationId,
        priority: "high",
      });
      return;
    }

    const result = await this.executePlan(plan);

    this.sendMessage({
      recipient: message.sender,
      type: result.success ? "plan.completed" : "plan.failed",
      payload: result,
      correlationId: message.correlationId,
    });
  }

  /**
   * Handle plan cancellation request message.
   */
  private async handlePlanCancel(message: AgentMessage): Promise<void> {
    const payload = message.payload as { planId: string };
    const success = this.cancelPlan(payload.planId);

    this.sendMessage({
      recipient: message.sender,
      type: "plan.cancelled",
      payload: { planId: payload.planId, success },
      correlationId: message.correlationId,
    });
  }

  /**
   * Handle plan status query message.
   */
  private async handleQueryPlanStatus(message: AgentMessage): Promise<void> {
    const payload = message.payload as { planId: string };
    const status = this.getPlanStatus(payload.planId);
    const plan = this.getPlan(payload.planId);

    this.sendMessage({
      recipient: message.sender,
      type: "query.plan.status.response",
      payload: { planId: payload.planId, status, plan },
      correlationId: message.correlationId,
    });
  }

  /**
   * Generate a unique plan ID.
   */
  private generatePlanId(): string {
    return `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate a unique task ID.
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log debug messages if debug mode is enabled.
   */
  private log(level: "debug" | "info" | "warn" | "error", ...args: unknown[]): void {
    if (!this.debug && level === "debug") return;

    const timestamp = new Date().toISOString();
    const prefix = `[PlannerAgent:${level.toUpperCase()}] ${timestamp}`;

    // eslint-disable-next-line no-console
    console.log(prefix, ...args);
  }
}

export default PlannerAgent;
