import React from "react";
import { Box, Text, Spacer } from "ink";
import type { AgentState } from "../agents/BaseAgent.js";
import type { AgentMessage } from "../agents/MessageBus.js";

/** Agent status information for display */
export interface AgentStatus {
  id: string;
  name: string;
  state: AgentState;
  lastActivity: number;
  queueDepth?: number;
}

/** Active plan information for display */
export interface ActivePlan {
  id: string;
  goal: string;
  progress: number; // 0-100
  currentTask: string;
  status: "pending" | "running" | "completed" | "failed";
}

/** Props for the AgentPanel component */
export interface AgentPanelProps {
  agentStatuses: Record<string, AgentStatus>;
  activePlans: ActivePlan[];
  recentMessages: AgentMessage[];
  systemHealth: "healthy" | "degraded" | "critical";
  width?: number;
  maxMessages?: number;
}

/** Get color for agent state */
const getStateColor = (state: AgentState): string => {
  switch (state) {
    case "running":
      return "green";
    case "idle":
      return "gray";
    case "paused":
      return "yellow";
    case "error":
      return "red";
    case "stopped":
      return "dim";
    default:
      return "white";
  }
};

/** Get indicator character for agent state */
const getStateIndicator = (state: AgentState): string => {
  switch (state) {
    case "running":
      return "●";
    case "idle":
      return "○";
    case "paused":
      return "◐";
    case "error":
      return "✖";
    case "stopped":
      return "■";
    default:
      return "?";
  }
};

/** Get color for system health */
const getHealthColor = (health: "healthy" | "degraded" | "critical"): string => {
  switch (health) {
    case "healthy":
      return "green";
    case "degraded":
      return "yellow";
    case "critical":
      return "red";
    default:
      return "white";
  }
};

/** Get color for plan status */
const getPlanStatusColor = (status: ActivePlan["status"]): string => {
  switch (status) {
    case "running":
      return "cyan";
    case "completed":
      return "green";
    case "failed":
      return "red";
    case "pending":
      return "yellow";
    default:
      return "white";
  }
};

/** Format timestamp to relative time */
const formatRelativeTime = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s`;
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};

/** Truncate text to fit within width */
const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
};

/**
 * AgentPanel - Multi-agent system status display component
 *
 * Displays:
 * - Agent status grid with all agents and their states
 * - Active plans with progress indicators
 * - Recent inter-agent messages
 * - System health indicator
 *
 * Designed as a compact side panel (30-40 columns wide)
 */
export const AgentPanel: React.FC<AgentPanelProps> = ({
  agentStatuses,
  activePlans,
  recentMessages,
  systemHealth,
  width = 35,
  maxMessages = 20,
}) => {
  const contentWidth = Math.max(20, width - 4);
  const agents = Object.values(agentStatuses);
  const messages = recentMessages.slice(-maxMessages);

  return (
    <Box
      flexDirection="column"
      width={width}
      height="100%"
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
    >
      {/* Header with system health */}
      <Box flexDirection="row" marginBottom={1}>
        <Text bold color="cyan">Agents</Text>
        <Spacer />
        <Text color={getHealthColor(systemHealth)}>
          {getStateIndicator(
            systemHealth === "healthy"
              ? "running"
              : systemHealth === "degraded"
                ? "paused"
                : "error"
          )}
        </Text>
      </Box>

      {/* Agent Status Grid */}
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor bold underline>
          Status
        </Text>
        {agents.length === 0 ? (
          <Text dimColor>No agents registered</Text>
        ) : (
          agents.map((agent) => (
            <Box key={agent.id} flexDirection="row" height={1}>
              <Text color={getStateColor(agent.state)}>
                {getStateIndicator(agent.state)}
              </Text>
              <Text> </Text>
              <Text
                color={agent.state === "running" ? "white" : "gray"}
              >
                {truncate(agent.name, contentWidth - 8)}
              </Text>
              <Spacer />
              {agent.queueDepth !== undefined && agent.queueDepth > 0 && (
                <Text dimColor>({agent.queueDepth})</Text>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Active Plans Panel */}
      {activePlans.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor bold underline>
            Plans
          </Text>
          {activePlans.map((plan) => (
            <Box key={plan.id} flexDirection="column" marginBottom={1}>
              <Box flexDirection="row" height={1}>
                <Text color={getPlanStatusColor(plan.status)}>
                  {plan.status === "running"
                    ? "▶"
                    : plan.status === "completed"
                      ? "✓"
                      : plan.status === "failed"
                        ? "✗"
                        : "○"}
                </Text>
                <Text> </Text>
                <Text wrap="truncate" color="white">
                  {truncate(plan.goal, contentWidth - 6)}
                </Text>
              </Box>
              {/* Progress bar */}
              <Box flexDirection="row" height={1}>
                <Text dimColor>[</Text>
                <Text color={getPlanStatusColor(plan.status)}>
                  {"█".repeat(Math.floor(plan.progress / 10))}
                  {plan.progress % 10 >= 5 ? "▌" : ""}
                </Text>
                <Text dimColor>
                  {"░".repeat(
                    10 -
                      Math.floor(plan.progress / 10) -
                      (plan.progress % 10 >= 5 ? 1 : 0)
                  )}
                </Text>
                <Text dimColor>]</Text>
                <Text> </Text>
                <Text dimColor>{plan.progress}%</Text>
              </Box>
              {plan.currentTask && (
                <Box height={1}>
                  <Text dimColor wrap="truncate">
                    {truncate(plan.currentTask, contentWidth - 2)}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Message Log Viewer */}
      {messages.length > 0 && (
        <Box flexDirection="column" flexGrow={1} overflow="hidden">
          <Text dimColor bold underline>
            Messages ({messages.length})
          </Text>
          <Box flexDirection="column" overflow="hidden">
            {messages.map((msg, idx) => (
              <Box key={`${msg.id}-${idx}`} flexDirection="row" height={1}>
                <Text dimColor>
                  {formatRelativeTime(msg.timestamp)}
                </Text>
                <Text> </Text>
                <Text color="cyan" wrap="truncate">
                  {truncate(msg.from, 8)}
                </Text>
                <Text dimColor>→</Text>
                <Text color="yellow" wrap="truncate">
                  {truncate(msg.to, 8)}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Footer with agent count */}
      <Box flexDirection="row" marginTop={1} flexShrink={0}>
        <Text dimColor>
          {agents.filter((a) => a.state === "running").length}/{agents.length} active
        </Text>
        <Spacer />
        <Text dimColor>{messages.length} msgs</Text>
      </Box>
    </Box>
  );
};

export default AgentPanel;
