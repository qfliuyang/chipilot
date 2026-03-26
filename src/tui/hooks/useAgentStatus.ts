/**
 * @fileoverview useAgentStatus - React hook for monitoring multi-agent system status
 *
 * Provides real-time monitoring of agent states, active plans, recent messages,
 * and system health calculation for the TUI.
 *
 * @module tui/hooks/useAgentStatus
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageBus, AgentMessage, AgentId } from "../../agents/MessageBus";
import { AgentState } from "../../agents/BaseAgent";

/**
 * Status information for a single agent
 */
export interface AgentStatus {
  /** Unique agent identifier */
  id: string;
  /** Human-readable agent name */
  name: string;
  /** Current agent state */
  state: AgentState;
  /** Timestamp of last activity */
  lastActivity: number;
  /** Number of pending messages/tasks */
  queueDepth: number;
  /** Error information if in error state */
  errorInfo?: string;
}

/**
 * Active plan information for monitoring
 */
export interface ActivePlan {
  /** Unique plan identifier */
  id: string;
  /** Plan goal/description */
  goal: string;
  /** Current plan status */
  status: PlanStatus;
  /** Number of tasks in the plan */
  taskCount: number;
  /** Number of completed tasks */
  completedTasks: number;
  /** Timestamp when plan started */
  startedAt?: number;
}

/**
 * System health status levels
 */
export type SystemHealth = "healthy" | "degraded" | "critical";

/**
 * Return type for useAgentStatus hook
 */
export interface UseAgentStatusReturn {
  /** Map of agent IDs to their status */
  agentStatuses: Record<string, AgentStatus>;
  /** Array of currently active plans */
  activePlans: ActivePlan[];
  /** Recent messages (limited to last 50) */
  recentMessages: AgentMessage[];
  /** Overall system health */
  systemHealth: SystemHealth;
  /** Whether any agents are currently processing */
  isProcessing: boolean;
  /** Total error count across all agents */
  errorCount: number;
}

/**
 * Maximum number of recent messages to retain
 */
const MAX_RECENT_MESSAGES = 50;

/**
 * Default agent names for known agent IDs
 */
const DEFAULT_AGENT_NAMES: Record<AgentId, string> = {
  orchestrator: "Orchestrator",
  planner: "Planner",
  "knowledge-curator": "Knowledge Curator",
  "terminal-perception": "Terminal Perception",
  "command-synthesis": "Command Synthesis",
  verification: "Verification",
  learning: "Learning",
  recovery: "Recovery",
  execution: "Execution",
  broadcast: "Broadcast",
};

/**
 * React hook for monitoring multi-agent system status
 *
 * Subscribes to MessageBus events to track:
 * - Agent registration/unregistration
 * - Agent state changes
 * - Message delivery
 * - Plan lifecycle events
 *
 * @param messageBus - The MessageBus instance to subscribe to
 * @returns Current system status including agents, plans, messages, and health
 *
 * @example
 * ```tsx
 * const { agentStatuses, activePlans, systemHealth } = useAgentStatus(messageBus);
 *
 * return (
 *   <div>
 *     <HealthIndicator status={systemHealth} />
 *     <AgentList agents={Object.values(agentStatuses)} />
 *     <PlanList plans={activePlans} />
 *   </div>
 * );
 * ```
 */
export function useAgentStatus(messageBus: MessageBus): UseAgentStatusReturn {
  // Agent status tracking
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});

  // Active plans tracking
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);

  // Recent messages tracking
  const [recentMessages, setRecentMessages] = useState<AgentMessage[]>([]);

  // Error count tracking
  const [errorCount, setErrorCount] = useState(0);

  // Use refs for batching updates
  const pendingAgentUpdates = useRef<Map<string, Partial<AgentStatus>>>(new Map());
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Calculate system health based on agent states and errors
   */
  const calculateSystemHealth = useCallback((): SystemHealth => {
    const agents = Object.values(agentStatuses);

    if (agents.length === 0) {
      return "healthy";
    }

    // Count agents in various states
    const errorAgents = agents.filter((a) => a.state === "error");
    const pausedAgents = agents.filter((a) => a.state === "paused");
    const stoppedAgents = agents.filter((a) => a.state === "stopped");

    // Critical: Multiple errors or orchestrator stopped
    if (errorAgents.length >= 2 || errorCount >= 3) {
      return "critical";
    }

    // Check if orchestrator is in critical state
    const orchestrator = agentStatuses["orchestrator"];
    if (orchestrator?.state === "stopped" || orchestrator?.state === "error") {
      return "critical";
    }

    // Degraded: Some agents paused, or 1 error, or some stopped but not orchestrator
    if (pausedAgents.length > 0 || errorAgents.length === 1 || stoppedAgents.length > 0) {
      return "degraded";
    }

    // Healthy: All agents idle or running, no errors
    const healthyAgents = agents.filter((a) => a.state === "idle" || a.state === "running");
    if (healthyAgents.length === agents.length) {
      return "healthy";
    }

    return "degraded";
  }, [agentStatuses, errorCount]);

  /**
   * Check if any agents are currently processing
   */
  const isProcessing = useCallback((): boolean => {
    return Object.values(agentStatuses).some(
      (agent) => agent.state === "running" || agent.queueDepth > 0
    );
  }, [agentStatuses]);

  /**
   * Batch update agent statuses
   */
  const flushAgentUpdates = useCallback(() => {
    if (pendingAgentUpdates.current.size === 0) {
      return;
    }

    setAgentStatuses((prev) => {
      const updated = { ...prev };
      const entries = Array.from(pendingAgentUpdates.current.entries());
      for (const [agentId, updates] of entries) {
        if (updated[agentId]) {
          updated[agentId] = { ...updated[agentId], ...updates };
        } else {
          // Create new agent entry if it doesn't exist
          updated[agentId] = {
            id: agentId,
            name: DEFAULT_AGENT_NAMES[agentId as AgentId] || agentId,
            state: "idle",
            lastActivity: Date.now(),
            queueDepth: 0,
            ...updates,
          };
        }
      }
      pendingAgentUpdates.current.clear();
      return updated;
    });
  }, []);

  /**
   * Schedule a batched update
   */
  const scheduleUpdate = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      flushAgentUpdates();
    }, 16); // ~1 frame at 60fps
  }, [flushAgentUpdates]);

  /**
   * Add a message to recent messages (with limit)
   */
  const addRecentMessage = useCallback((message: AgentMessage) => {
    setRecentMessages((prev) => {
      const updated = [...prev, message];
      if (updated.length > MAX_RECENT_MESSAGES) {
        return updated.slice(-MAX_RECENT_MESSAGES);
      }
      return updated;
    });
  }, []);

  /**
   * Update or add an active plan
   */
  const updateActivePlan = useCallback((plan: ActivePlan) => {
    setActivePlans((prev) => {
      const existingIndex = prev.findIndex((p) => p.id === plan.id);
      if (existingIndex >= 0) {
        // Update existing plan
        const updated = [...prev];
        updated[existingIndex] = plan;
        // Remove completed/failed/cancelled plans
        return updated.filter((p) => p.status === "pending" || p.status === "running");
      }
      // Add new plan
      return [...prev, plan];
    });
  }, []);

  useEffect(() => {
    // Handler for agent registration
    const handleAgentRegistered = (event: { agentId: AgentId }) => {
      const { agentId } = event;
      pendingAgentUpdates.current.set(agentId, {
        id: agentId,
        name: DEFAULT_AGENT_NAMES[agentId] || agentId,
        state: "idle",
        lastActivity: Date.now(),
        queueDepth: 0,
      });
      scheduleUpdate();
    };

    // Handler for agent unregistration
    const handleAgentUnregistered = (event: { agentId: AgentId }) => {
      const { agentId } = event;
      setAgentStatuses((prev) => {
        const updated = { ...prev };
        delete updated[agentId];
        return updated;
      });
    };

    // Handler for state changes (from BaseAgent via MessageBus)
    const handleStateChange = (event: {
      agentId: string;
      oldState: AgentState;
      newState: AgentState;
      timestamp: number;
    }) => {
      const { agentId, newState, timestamp } = event;

      // Track errors
      if (newState === "error") {
        setErrorCount((prev) => prev + 1);
      }

      pendingAgentUpdates.current.set(agentId, {
        state: newState,
        lastActivity: timestamp,
      });
      scheduleUpdate();
    };

    // Handler for message delivery
    const handleMessageDelivered = (event: { message: AgentMessage }) => {
      const { message } = event;
      addRecentMessage(message);

      // Update queue depth for recipient
      if (message.to && message.to !== "broadcast") {
        const current = pendingAgentUpdates.current.get(message.to);
        const currentDepth = current?.queueDepth ?? agentStatuses[message.to]?.queueDepth ?? 0;
        pendingAgentUpdates.current.set(message.to, {
          queueDepth: currentDepth + 1,
          lastActivity: message.timestamp,
        });
        scheduleUpdate();
      }
    };

    // Handler for plan started
    const handlePlanStarted = (event: {
      agentId: string;
      planId: string;
      timestamp: number;
      taskCount?: number;
      goal?: string;
    }) => {
      const plan: ActivePlan = {
        id: event.planId,
        goal: event.goal || `Plan ${event.planId}`,
        status: "running",
        taskCount: event.taskCount || 0,
        completedTasks: 0,
        startedAt: event.timestamp,
      };
      updateActivePlan(plan);
    };

    // Handler for plan completed
    const handlePlanCompleted = (event: {
      agentId: string;
      planId: string;
      duration: number;
      timestamp: number;
    }) => {
      setActivePlans((prev) =>
        prev.map((p) =>
          p.id === event.planId ? { ...p, status: "completed" } : p
        )
      );
      // Remove completed plan after a brief delay
      setTimeout(() => {
        setActivePlans((prev) => prev.filter((p) => p.id !== event.planId));
      }, 5000);
    };

    // Handler for plan failed
    const handlePlanFailed = (event: {
      agentId: string;
      planId: string;
      error: string;
      timestamp: number;
    }) => {
      setActivePlans((prev) =>
        prev.map((p) =>
          p.id === event.planId ? { ...p, status: "failed" } : p
        )
      );
      setErrorCount((prev) => prev + 1);
      // Remove failed plan after a brief delay
      setTimeout(() => {
        setActivePlans((prev) => prev.filter((p) => p.id !== event.planId));
      }, 5000);
    };

    // Handler for task completion (to update plan progress)
    const handleTaskCompleted = (event: {
      agentId: string;
      taskId: string;
      planId?: string;
      timestamp: number;
    }) => {
      if (event.planId) {
        setActivePlans((prev) =>
          prev.map((p) =>
            p.id === event.planId
              ? { ...p, completedTasks: p.completedTasks + 1 }
              : p
          )
        );
      }
    };

    // Subscribe to MessageBus events
    messageBus.on("agent:registered", handleAgentRegistered);
    messageBus.on("agent:unregistered", handleAgentUnregistered);
    messageBus.on("stateChange", handleStateChange);
    messageBus.on("message:delivered", handleMessageDelivered);
    messageBus.on("planStarted", handlePlanStarted);
    messageBus.on("planCompleted", handlePlanCompleted);
    messageBus.on("planFailed", handlePlanFailed);
    messageBus.on("taskCompleted", handleTaskCompleted);

    // Initialize with currently registered agents
    const registeredAgents = messageBus.getRegisteredAgents();
    for (const agentId of registeredAgents) {
      pendingAgentUpdates.current.set(agentId, {
        id: agentId,
        name: DEFAULT_AGENT_NAMES[agentId] || agentId,
        state: "idle",
        lastActivity: Date.now(),
        queueDepth: 0,
      });
    }
    flushAgentUpdates();

    // Cleanup subscriptions on unmount
    return () => {
      messageBus.off("agent:registered", handleAgentRegistered);
      messageBus.off("agent:unregistered", handleAgentUnregistered);
      messageBus.off("stateChange", handleStateChange);
      messageBus.off("message:delivered", handleMessageDelivered);
      messageBus.off("planStarted", handlePlanStarted);
      messageBus.off("planCompleted", handlePlanCompleted);
      messageBus.off("planFailed", handlePlanFailed);
      messageBus.off("taskCompleted", handleTaskCompleted);

      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [
    messageBus,
    agentStatuses,
    scheduleUpdate,
    flushAgentUpdates,
    addRecentMessage,
    updateActivePlan,
  ]);

  return {
    agentStatuses,
    activePlans,
    recentMessages,
    systemHealth: calculateSystemHealth(),
    isProcessing: isProcessing(),
    errorCount,
  };
}

export default useAgentStatus;
