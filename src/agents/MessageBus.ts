/**
 * MessageBus - Inter-agent communication layer for chipilot-cli
 *
 * Implements pub/sub pattern with priority queuing, message routing,
 * and agent registration for the multi-agent architecture.
 *
 * Architecture: Section 3.2 - Communication Architecture
 * @module agents/MessageBus
 */

import { EventEmitter } from "events";

/** Agent identifier types from the hierarchy */
export type AgentId =
  | "orchestrator"
  | "planner"
  | "knowledge-curator"
  | "terminal-perception"
  | "command-synthesis"
  | "verification"
  | "learning"
  | "recovery"
  | "execution"
  | "broadcast";

/** Message priority levels */
export type MessagePriority = "low" | "normal" | "high" | "critical";

/** Message types for agent communication */
export type MessageType =
  | "task.assign" // Manager -> Specialist
  | "task.complete" // Specialist -> Manager
  | "task.failed" // Specialist -> Manager
  | "query.knowledge" // Any -> Knowledge Curator
  | "event.terminal" // Terminal Perception -> All
  | "command.propose" // Command Synthesis -> Verification
  | "recovery.request" // Any -> Recovery
  | "learn.capture" // Any -> Learning
  | "orchestrate" // Orchestrator -> All
  | "escalate"; // Any -> Parent

/** Core message structure for agent communication */
export interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId;
  type: MessageType;
  payload: unknown;
  timestamp: number;
  priority: MessagePriority;
  correlationId?: string;
}

/** Message handler function type */
export type MessageHandler = (message: AgentMessage) => Promise<void> | void;

/** Subscription handler for pub/sub pattern */
interface Subscription {
  id: string;
  pattern: string;
  handler: MessageHandler;
}

/** Registered agent information */
interface RegisteredAgent {
  agentId: AgentId;
  handler: MessageHandler;
}

/** Configuration options for MessageBus */
export interface MessageBusOptions {
  /** Maximum number of messages to retain in history (default: 1000) */
  historyLimit?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Default message timeout in ms (default: 30000) */
  defaultTimeout?: number;
}

/** Priority queue entry */
interface QueuedMessage {
  message: AgentMessage;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * MessageBus - Central communication hub for multi-agent system
 *
 * Features:
 * - Pub/sub messaging with pattern matching
 * - Direct and broadcast routing
 * - Priority-based message queuing
 * - Agent registration/deregistration
 * - Message history with configurable retention
 * - Async message handlers
 * - Comprehensive logging for debugging
 */
export class MessageBus extends EventEmitter {
  private agents: Map<AgentId, RegisteredAgent> = new Map();
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHistory: AgentMessage[] = [];
  private priorityQueue: QueuedMessage[] = [];
  private isProcessingQueue = false;

  private historyLimit: number;
  private debug: boolean;
  private defaultTimeout: number;

  constructor(options: MessageBusOptions = {}) {
    super();
    this.historyLimit = options.historyLimit ?? 1000;
    this.debug = options.debug ?? false;
    this.defaultTimeout = options.defaultTimeout ?? 30000;
  }

  /**
   * Register an agent with the message bus
   * @param agentId - Unique identifier for the agent
   * @param handler - Message handler function
   */
  registerAgent(agentId: AgentId, handler: MessageHandler): void {
    if (this.agents.has(agentId)) {
      this.log("warn", `Agent ${agentId} is already registered. Overwriting handler.`);
    }

    this.agents.set(agentId, { agentId, handler });
    this.log("info", `Agent registered: ${agentId}`);
    this.emit("agent:registered", { agentId });
  }

  /**
   * Unregister an agent from the message bus
   * @param agentId - Agent identifier to unregister
   */
  unregisterAgent(agentId: AgentId): void {
    if (this.agents.delete(agentId)) {
      this.log("info", `Agent unregistered: ${agentId}`);
      this.emit("agent:unregistered", { agentId });
    } else {
      this.log("warn", `Attempted to unregister unknown agent: ${agentId}`);
    }
  }

  /**
   * Send a direct message to a specific agent
   * @param message - Message to send
   * @returns Promise that resolves when message is delivered
   */
  async send(message: AgentMessage): Promise<void> {
    // Validate message
    this.validateMessage(message);

    // Add to history
    this.addToHistory(message);

    // Queue the message for processing
    return new Promise((resolve, reject) => {
      const queuedMessage: QueuedMessage = {
        message,
        resolve,
        reject,
      };

      this.insertByPriority(queuedMessage);
      this.processQueue();
    });
  }

  /**
   * Broadcast a message to all registered agents
   * @param message - Message to broadcast (recipient will be 'broadcast')
   * @returns Promise that resolves when all deliveries complete
   */
  async broadcast(message: Omit<AgentMessage, "to">): Promise<void> {
    const broadcastMessage: AgentMessage = {
      ...message,
      to: "broadcast",
    };

    this.log("debug", `Broadcasting message type ${message.type} from ${message.from}`);

    // Send to all registered agents except sender
    const deliveryPromises: Promise<void>[] = [];

    for (const [agentId, agent] of Array.from(this.agents.entries())) {
      if (agentId !== message.from) {
        deliveryPromises.push(
          this.deliverToAgent(agent, broadcastMessage).catch((error) => {
            this.log("error", `Failed to deliver broadcast to ${agentId}:`, error);
            // Don't throw for broadcast failures - continue to other agents
          })
        );
      }
    }

    // Also notify pattern subscribers
    for (const [subscriptionId, subscription] of Array.from(this.subscriptions.entries())) {
      if (this.matchesPattern(broadcastMessage, subscription.pattern)) {
        deliveryPromises.push(
          Promise.resolve().then(async () => {
            try {
              await subscription.handler(broadcastMessage);
            } catch (error) {
              this.log("error", `Subscription ${subscriptionId} handler failed:`, error);
            }
          })
        );
      }
    }

    this.addToHistory(broadcastMessage);
    await Promise.all(deliveryPromises);
  }

  /**
   * Subscribe to messages matching a pattern
   * @param pattern - Pattern to match (supports wildcards with '*')
   * @param handler - Handler function for matching messages
   * @returns Subscription ID for later unsubscribe
   */
  subscribe(pattern: string, handler: MessageHandler): string {
    const subscriptionId = this.generateId("sub");
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      pattern,
      handler,
    });
    this.log("debug", `Subscription created: ${subscriptionId} (pattern: ${pattern})`);
    return subscriptionId;
  }

  /**
   * Unsubscribe from messages
   * @param subscriptionId - Subscription ID returned from subscribe()
   */
  unsubscribe(subscriptionId: string): void {
    if (this.subscriptions.delete(subscriptionId)) {
      this.log("debug", `Subscription removed: ${subscriptionId}`);
    } else {
      this.log("warn", `Attempted to remove unknown subscription: ${subscriptionId}`);
    }
  }

  /**
   * Get message history
   * @param agentId - Optional filter by agent (sender or recipient)
   * @param limit - Maximum number of messages to return
   * @returns Array of messages
   */
  getMessageHistory(agentId?: AgentId, limit?: number): AgentMessage[] {
    let history = this.messageHistory;

    if (agentId) {
      history = history.filter(
        (msg) => msg.from === agentId || msg.to === agentId || msg.to === "broadcast"
      );
    }

    if (limit && limit > 0) {
      history = history.slice(-limit);
    }

    return [...history];
  }

  /**
   * Clear message history
   * @param agentId - Optional agent to clear history for (clears all if omitted)
   */
  clearHistory(agentId?: AgentId): void {
    if (agentId) {
      this.messageHistory = this.messageHistory.filter(
        (msg) => msg.from !== agentId && msg.to !== agentId
      );
      this.log("debug", `Cleared message history for agent: ${agentId}`);
    } else {
      this.messageHistory = [];
      this.log("debug", "Cleared all message history");
    }
  }

  /**
   * Get list of registered agents
   * @returns Array of agent IDs
   */
  getRegisteredAgents(): AgentId[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get active subscription count
   * @returns Number of active subscriptions
   */
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Shutdown the message bus and clean up resources
   */
  shutdown(): void {
    this.log("info", "Shutting down MessageBus");
    this.priorityQueue = [];
    this.agents.clear();
    this.subscriptions.clear();
    this.removeAllListeners();
  }

  // Private helper methods

  private validateMessage(message: AgentMessage): void {
    if (!message.id) throw new Error("Message must have an id");
    if (!message.from) throw new Error("Message must have a sender (from)");
    if (!message.to) throw new Error("Message must have a recipient (to)");
    if (!message.type) throw new Error("Message must have a type");
    if (!message.timestamp) throw new Error("Message must have a timestamp");
    if (!message.priority) throw new Error("Message must have a priority");

    // Validate agent IDs
    const validAgents: AgentId[] = [
      "orchestrator",
      "planner",
      "knowledge-curator",
      "terminal-perception",
      "command-synthesis",
      "verification",
      "learning",
      "recovery",
      "execution",
      "broadcast",
    ];

    if (!validAgents.includes(message.from)) {
      throw new Error(`Invalid sender agent ID: ${message.from}`);
    }

    if (!validAgents.includes(message.to)) {
      throw new Error(`Invalid recipient agent ID: ${message.to}`);
    }
  }

  private addToHistory(message: AgentMessage): void {
    this.messageHistory.push(message);

    // Trim history if it exceeds limit
    if (this.messageHistory.length > this.historyLimit) {
      this.messageHistory = this.messageHistory.slice(-this.historyLimit);
    }
  }

  private insertByPriority(queuedMessage: QueuedMessage): void {
    const priorityValue = this.getPriorityValue(queuedMessage.message.priority);

    // Find insertion point (higher priority = lower index)
    let inserted = false;
    for (let i = 0; i < this.priorityQueue.length; i++) {
      const currentPriority = this.getPriorityValue(this.priorityQueue[i].message.priority);
      if (priorityValue > currentPriority) {
        this.priorityQueue.splice(i, 0, queuedMessage);
        inserted = true;
        break;
      }
    }

    if (!inserted) {
      this.priorityQueue.push(queuedMessage);
    }
  }

  private getPriorityValue(priority: MessagePriority): number {
    switch (priority) {
      case "critical":
        return 4;
      case "high":
        return 3;
      case "normal":
        return 2;
      case "low":
        return 1;
      default:
        return 2;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    try {
      while (this.priorityQueue.length > 0) {
        const queued = this.priorityQueue.shift()!;

        try {
          await this.processMessage(queued.message);
          queued.resolve();
        } catch (error) {
          this.log("error", "Failed to process message:", error);
          queued.reject(error instanceof Error ? error : new Error(String(error)));
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processMessage(message: AgentMessage): Promise<void> {
    this.log("debug", `Processing message ${message.id} (${message.type}) from ${message.from} to ${message.to}`);

    // Handle broadcast
    if (message.to === "broadcast") {
      await this.broadcast(message);
      return;
    }

    // Find target agent
    const targetAgent = this.agents.get(message.to);
    if (!targetAgent) {
      throw new Error(`Agent not found: ${message.to}`);
    }

    // Notify pattern subscribers
    const subscriberPromises: Promise<void>[] = [];
    for (const [subscriptionId, subscription] of Array.from(this.subscriptions.entries())) {
      if (this.matchesPattern(message, subscription.pattern)) {
        subscriberPromises.push(
          Promise.resolve().then(async () => {
            try {
              await subscription.handler(message);
            } catch (error) {
              this.log("error", `Subscription ${subscriptionId} handler failed:`, error);
            }
          })
        );
      }
    }

    // Deliver to target agent
    await this.deliverToAgent(targetAgent, message);

    // Wait for subscribers (don't fail if they fail)
    if (subscriberPromises.length > 0) {
      await Promise.allSettled(subscriberPromises);
    }

    this.emit("message:delivered", { message });
  }

  private async deliverToAgent(agent: RegisteredAgent, message: AgentMessage): Promise<void> {
    this.log("debug", `Delivering message ${message.id} to ${agent.agentId}`);

    try {
      await agent.handler(message);
    } catch (error) {
      this.log("error", `Agent ${agent.agentId} handler failed:`, error);
      throw error;
    }
  }

  private matchesPattern(message: AgentMessage, pattern: string): boolean {
    // Simple pattern matching with wildcards
    // Patterns can match: agent type, message type, or both
    // Examples:
    //   "event.terminal" - matches all terminal events
    //   "*.terminal-perception" - matches all messages to terminal-perception
    //   "task.*" - matches all task messages
    //   "*" - matches all messages

    if (pattern === "*") return true;

    const parts = pattern.split(".");

    if (parts.length === 2) {
      const [typePart, agentPart] = parts;

      // Check message type match
      if (typePart !== "*" && !message.type.startsWith(typePart)) {
        return false;
      }

      // Check agent match
      if (agentPart !== "*" && message.to !== agentPart && message.from !== agentPart) {
        return false;
      }

      return true;
    }

    // Single part pattern - check if it matches type or agent
    return message.type.startsWith(pattern) ||
           message.to === pattern ||
           message.from === pattern;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: "debug" | "info" | "warn" | "error", ...args: unknown[]): void {
    if (!this.debug && level === "debug") return;

    const timestamp = new Date().toISOString();
    const prefix = `[MessageBus:${level.toUpperCase()}] ${timestamp}`;

    console.log(prefix, ...args);
  }
}

/** Singleton instance for application-wide use */
let globalMessageBus: MessageBus | null = null;

/**
 * Get or create the global MessageBus instance
 * @param options - Optional configuration for new instance
 * @returns MessageBus instance
 */
export function getMessageBus(options?: MessageBusOptions): MessageBus {
  if (!globalMessageBus) {
    globalMessageBus = new MessageBus(options);
  }
  return globalMessageBus;
}

/**
 * Reset the global MessageBus instance (useful for testing)
 */
export function resetMessageBus(): void {
  if (globalMessageBus) {
    globalMessageBus.shutdown();
    globalMessageBus = null;
  }
}

export default MessageBus;
