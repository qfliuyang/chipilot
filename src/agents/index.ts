/**
 * @fileoverview Agent System Barrel Exports
 *
 * Central export point for all agents and types in the multi-agent system.
 * Organized by layer: Base, Communication, Knowledge, Specialist, Manager, Strategic.
 *
 * @module agents
 */

// ============================================================================
// Base Layer
// ============================================================================

export {
  BaseAgent,
  type AgentState,
  type AgentMessage,
  type BaseAgentOptions,
  type MessagePriority,
} from "./BaseAgent";

// ============================================================================
// Communication Layer
// ============================================================================

export {
  MessageBus,
  type MessagePriority as BusMessagePriority,
  type AgentId,
  type MessageType,
  type AgentMessage as BusAgentMessage,
  type MessageHandler,
  type MessageBusOptions,
  getMessageBus,
  resetMessageBus,
} from "./MessageBus";

// ============================================================================
// Knowledge Layer
// ============================================================================

export {
  KnowledgeBase,
  type Vector,
  type QueryResult,
  type Pattern,
  type RAGResult,
  type RetrievedContext,
  type KnowledgeBaseConfig,
  type CommandMetadata,
  type ErrorMetadata,
  type WorkflowMetadata,
  VectorIndices,
} from "./KnowledgeBase";

// ============================================================================
// Specialist Agents
// ============================================================================

export {
  TerminalPerceptionAgent,
  type PromptType,
  type TerminalState,
  type TerminalStateEvent,
  type CommandCompleteEvent,
  type ErrorDetectedEvent,
  type TerminalPerceptionOptions,
} from "./TerminalPerceptionAgent";

export {
  CommandSynthesisAgent,
  type CommandProposal,
  type EDATool,
  type CommandExample,
  type ValidationResult,
  type CommandSynthesisOptions,
} from "./CommandSynthesisAgent";

export {
  VerificationAgent,
  type VerificationResult,
  type RiskLevel,
  type CommandProposal as VerifyCommandProposal,
  type ErrorPattern,
  type VerificationAgentOptions,
} from "./VerificationAgent";

export {
  ExecutionAgent,
  type ExecutionResult,
  type ExecutionOptions,
} from "./ExecutionAgent";

export {
  RecoveryAgent,
  type ErrorType,
  type RecoveryStrategyType,
  type ErrorDiagnosis,
  type RecoveryCheckpoint,
  type RecoveryAction as RecoveryAgentAction,
  type RecoveryPlan,
  type RecoveryResult,
  type RecoveryPattern,
  type RecoveryAgentOptions,
  type RecoveryStats,
} from "./RecoveryAgent";

// ============================================================================
// Manager Agents
// ============================================================================

export {
  PlannerAgent,
  type ExecutionPlan,
  type Task,
  type TaskType,
  type TaskStatus,
  type PlanStatus,
  type PlanResult,
  type RecoveryAction,
  type RecoveryActionType,
  type PlanContext,
  type PlannerAgentOptions,
} from "./PlannerAgent";

export { KnowledgeCuratorAgent, type KnowledgeGap, type ExportedKnowledge, type KnowledgeStats } from "./KnowledgeCuratorAgent";

// ============================================================================
// Strategic Agents
// ============================================================================

export {
  OrchestratorAgent,
  type Intent,
  type IntentType,
  type GoalResult,
  type SystemStatus,
  type SystemEvent,
  type SystemEventType,
  type UserContext,
  type OrchestratorAgentOptions,
} from "./OrchestratorAgent";

export {
  LearningAgent,
  type LearnedPattern,
  type Recommendation,
  type ExecutionContext,
  type SuccessOutcome,
  type FailureAnalysis,
  type WorkflowPattern,
  type CommandStats,
  type PatternAnalysis,
  type LearningAgentOptions,
} from "./LearningAgent";
