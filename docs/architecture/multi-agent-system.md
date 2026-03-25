# Self-Improving Hierarchical Multi-Agent Architecture for chipilot-cli

## Executive Summary

This document presents a comprehensive architecture for evolving chipilot-cli from a single-agent system to a **self-improving hierarchical multi-agent architecture** capable of full autonomy in EDA (Electronic Design Automation) workflows.

### Core Design Principles

1. **Three-Tier Cognitive Architecture**: Inspired by Mark Ren's Agentrys framework
   - **Perception Layer**: Real-time terminal state analysis, EDA tool detection
   - **Cognition Layer**: Reasoning, planning, and decision-making
   - **Action Layer**: Command execution, tool interaction, recovery

2. **Knowledge-Centric Design**: Compensate for lack of dedicated LLM through:
   - Extensive structured knowledge storage (Pinecone vector DB)
   - Sophisticated retrieval mechanisms
   - Self-learning from execution history
   - Pattern extraction and reuse

3. **Hierarchical Multi-Agent Teams**: 8 specialized agent types in a 3-level hierarchy
   - Strategic (Orchestrator)
   - Manager (Planner, Knowledge Curator)
   - Specialist Workers (Terminal Perception, Command Synthesis, Verification, Learning, Recovery)

### Key Differentiators

- **Graph-Based Task Solving**: Dynamic and static task graphs for workflow orchestration
- **Self-Improving**: Continuous learning from successes, failures, and user feedback
- **EDA-Native**: Deep integration with chip design tools and workflows
- **Autonomous**: Capable of full end-to-end design tasks without human intervention

---

## 1. Agent Roles & Responsibilities

### 1.1 Strategic Layer

#### Orchestrator Agent
- **Purpose**: Central coordination and goal decomposition
- **Responsibilities**:
  - Decompose high-level user goals into executable sub-tasks
  - Assemble dynamic teams of specialist agents
  - Monitor overall progress and handle escalations
  - Manage session lifecycle and resource allocation
- **Pattern**: LangGraph-style state machine orchestrator
- **Cognitive Model**: Tree-of-Thought (ToT) planning with BFS/DFS exploration

### 1.2 Manager Layer

#### Planner Agent
- **Purpose**: Task sequencing and dependency management
- **Responsibilities**:
  - Create task graphs (static or dynamic)
  - Define execution order and dependencies
  - Allocate resources (terminal sessions, compute)
  - Adapt plans based on intermediate results
- **Pattern**: Hierarchical Task Network (HTN) planner
- **Knowledge**: Workflow templates, tool dependency graphs

#### Knowledge Curator Agent
- **Purpose**: Knowledge base management and retrieval optimization
- **Responsibilities**:
  - Manage Pinecone vector DB indices
  - Synthesize patterns from execution history
  - Optimize embeddings for EDA domain
  - Curate and validate knowledge entries
- **Pattern**: RAG (Retrieval-Augmented Generation) coordinator
- **Knowledge**: Semantic search strategies, embedding models, domain taxonomies

### 1.3 Specialist Layer

#### Terminal Perception Agent
- **Purpose**: Real-time terminal state analysis
- **Responsibilities**:
  - Parse terminal output (ANSI sequences, tool prompts)
  - Detect EDA tool states (Innovus, Genus, Tempus, etc.)
  - Extract structured data from logs
  - Monitor command execution progress
- **Pattern**: Multi-modality perception (text + structured)
- **Tools**: VirtualTerminal, regex parsers, state machines

#### Command Synthesis Agent
- **Purpose**: Generate and validate Tcl commands
- **Responsibilities**:
  - Translate natural language to Tcl commands (NL2SL)
  - Validate syntax against tool APIs
  - Generate command sequences for complex operations
  - Optimize commands for performance
- **Pattern**: CrewAI-style role-based generation
- **Knowledge**: Tool command references, Tcl patterns, API specifications

#### Verification Agent
- **Purpose**: Result validation and quality assessment
- **Responsibilities**:
  - Validate command execution results
  - Detect errors, warnings, and anomalies
  - Assess quality metrics (timing, area, power)
  - Report success/failure with confidence scores
- **Pattern**: Multi-AI consensus (Generator-Critic loop)
- **Knowledge**: Success criteria, error patterns, quality thresholds

#### Learning Agent
- **Purpose**: Pattern extraction and knowledge capture
- **Responsibilities**:
  - Extract successful command sequences
  - Identify reusable workflow templates
  - Learn from user corrections
  - Generate training data for model improvement
- **Pattern**: Self-referential learning loop
- **Knowledge**: Experience buffer, pattern library, template store

#### Recovery Agent
- **Purpose**: Error diagnosis and recovery
- **Responsibilities**:
  - Diagnose failures and root causes
  - Propose retry strategies
  - Escalate unrecoverable errors
  - Maintain rollback checkpoints
- **Pattern**: ReAct (Reasoning + Acting) with retry logic
- **Knowledge**: Error recovery patterns, fallback strategies

---

## 2. Hierarchical Structure

### 2.1 Three-Level Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    STRATEGIC LAYER                          │
│                  ┌─────────────────┐                        │
│                  │  Orchestrator   │                        │
│                  │    Agent        │                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │ delegates
┌───────────────────────────┼─────────────────────────────────┐
│                     MANAGER LAYER                           │
│         ┌─────────────────┴─────────────────┐               │
│    ┌────┴────┐                         ┌────┴────┐          │
│    │Planner  │                         │Knowledge│          │
│    │ Agent   │                         │Curator  │          │
│    └────┬────┘                         └────┬────┘          │
└─────────┼───────────────────────────────────┼───────────────┘
          │ assigns                          │ provides
┌─────────┼───────────────────────────────────┼───────────────┐
│                   SPECIALIST LAYER                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Terminal │ │ Command  │ │ Verification│ │ Learning │    │
│  │Perception│ │Synthesis │ │   Agent    │ │  Agent   │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐                                               │
│  │ Recovery │                                               │
│  │  Agent   │                                               │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Communication Patterns

#### Vertical Communication
- **Downward**: Goals, constraints, context
- **Upward**: Results, status, escalations

#### Horizontal Communication
- **Specialist-to-Specialist**: Data sharing via shared memory
- **Manager-to-Manager**: Coordination via message bus

### 2.3 Dynamic Team Assembly

Teams are assembled dynamically based on task requirements:

| Task Type | Team Composition |
|-----------|------------------|
| Simple Command | Terminal Perception + Command Synthesis + Verification |
| Complex Flow | Full specialist team + Planner coordination |
| Debug Session | Terminal Perception + Recovery + Learning |
| Knowledge Task | Knowledge Curator + Learning + Verification |

---

## 3. Communication Architecture

### 3.1 Message Bus Design

```typescript
interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  type: MessageType;
  payload: unknown;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  correlationId?: string; // For request-response patterns
}

type MessageType =
  | 'task.assign'      // Manager -> Specialist
  | 'task.complete'    // Specialist -> Manager
  | 'task.failed'      // Specialist -> Manager
  | 'query.knowledge'  // Any -> Knowledge Curator
  | 'event.terminal'   // Terminal Perception -> All
  | 'command.propose'  // Command Synthesis -> Verification
  | 'recovery.request' // Any -> Recovery
  | 'learn.capture'    // Any -> Learning
  | 'orchestrate'      // Orchestrator -> All
  | 'escalate';        // Any -> Parent
```

### 3.2 LangGraph-Inspired State Machine

```typescript
interface AgentState {
  // Current state in the state machine
  status: 'idle' | 'planning' | 'executing' | 'verifying' | 'recovering' | 'learning';

  // Current task context
  task?: Task;

  // Execution history for this session
  history: ExecutionEvent[];

  // Shared memory for specialist collaboration
  sharedContext: Map<string, unknown>;

  // Checkpoint for rollback
  checkpoint?: StateCheckpoint;
}

// State transitions
const stateGraph = {
  idle: ['planning', 'executing'],
  planning: ['executing', 'idle'],
  executing: ['verifying', 'recovering', 'idle'],
  verifying: ['learning', 'executing', 'recovering', 'idle'],
  recovering: ['executing', 'idle'],
  learning: ['idle']
};
```

### 3.3 CrewAI-Style Role-Based Delegation

```typescript
interface AgentRole {
  name: string;
  goal: string;
  backstory: string;
  tools: Tool[];
  allowDelegation: boolean;
  memory: boolean;
}

// Example: Command Synthesis Agent Role
const commandSynthesisRole: AgentRole = {
  name: 'CommandSynthesizer',
  goal: 'Generate accurate, efficient Tcl commands for EDA tools',
  backstory: `You are an expert in EDA tool scripting with deep knowledge of
    Cadence, Synopsys, and open-source EDA tools. You excel at translating
    natural language requirements into precise Tcl commands.`,
  tools: [syntaxValidator, apiReference, nl2slTranslator],
  allowDelegation: false,
  memory: true
};
```

---

## 4. Knowledge Architecture

### 4.1 Three-Tier Knowledge System

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 1: EPHEMERAL                            │
│              (In-Memory, Session-Scoped)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Terminal    │  │   Current    │  │   Agent      │          │
│  │   Buffer     │  │    Task      │  │   Context    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (extract)
┌─────────────────────────────────────────────────────────────────┐
│                   TIER 2: PERSISTENT                            │
│              (Pinecone Vector DB)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Command    │  │    Error     │  │   Pattern    │          │
│  │  Embeddings  │  │   Patterns   │  │   Clusters   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Workflow   │  │    Tool      │                            │
│  │   Templates  │  │    Docs      │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (synthesize)
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 3: REFLECTIVE                           │
│              (Learned Patterns & Rules)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Skill      │  │   Domain     │  │   Meta-      │          │
│  │   Library    │  │   Heuristics │  │   Learning   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Pinecone Index Design

```typescript
// Index: commands
interface CommandEmbedding {
  id: string;
  values: number[]; // embedding vector
  metadata: {
    tool: 'innovus' | 'genus' | 'tempus' | 'icc2' | 'openroad';
    category: 'floorplan' | 'placement' | 'routing' | 'timing' | 'physical';
    description: string;
    command: string;
    success_rate: number;
    usage_count: number;
    tags: string[];
  };
}

// Index: errors
interface ErrorPatternEmbedding {
  id: string;
  values: number[];
  metadata: {
    error_type: string;
    tool: string;
    symptom_pattern: string;
    root_cause: string;
    solution_commands: string[];
    recovery_strategy: string;
    frequency: number;
  };
}

// Index: workflows
interface WorkflowEmbedding {
  id: string;
  values: number[];
  metadata: {
    name: string;
    description: string;
    task_type: string;
    command_sequence: string[];
    estimated_duration: number;
    success_rate: number;
    prerequisites: string[];
    outputs: string[];
  };
}
```

### 4.3 Structured Knowledge Base

```yaml
# knowledge/tools/cadence/innovus.yaml
tool:
  name: Cadence Innovus
  version: "23.1"
  categories:
    floorplan:
      commands:
        - name: initialize_floorplan
          syntax: initialize_floorplan -core_utilization <val> -aspect_ratio <val>
          description: Initialize floorplan with utilization and aspect ratio
          parameters:
            - name: core_utilization
              type: float
              range: [0.0, 1.0]
              default: 0.7
          common_patterns:
            - initialize_floorplan -die_area {0 0 1000 1000} -core_area {10 10 990 990}

    placement:
      commands:
        - name: place_opt_design
          syntax: place_opt_design
          description: Run placement optimization
          stages:
            - pre_place_opt
            - place_opt
            - post_place_opt
```

### 4.4 Knowledge Retrieval Pipeline

```typescript
interface KnowledgeRetrieval {
  // Semantic search for similar commands/workflows
  semanticSearch(query: string, index: string, topK: number): Promise<SearchResult[]>;

  // Structured lookup for tool documentation
  structuredLookup(tool: string, category: string, operation: string): Promise<CommandDoc>;

  // Pattern matching for error recovery
  errorPatternMatch(errorOutput: string): Promise<ErrorPattern[]>;

  // Context-aware retrieval combining multiple sources
  contextualRetrieve(context: TaskContext): Promise<KnowledgeBundle>;
}
```

---

## 5. Self-Improvement Mechanisms

### 5.1 Experience Capture Loop

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Execute   │────▶│   Verify    │────▶│   Extract   │────▶│    Store    │
│   Command   │     │   Result    │     │  Knowledge  │     │  Knowledge  │
└─────────────┘     └──────┬──────┘     └─────────────┘     └─────────────┘
                           │
                           ▼ (if failed)
                    ┌─────────────┐
                    │   Recovery  │
                    │   Attempt   │
                    └─────────────┘
```

### 5.2 Learning Patterns

#### Pattern 1: Successful Command Sequences
- Capture command sequences that achieve goals
- Store as reusable workflow templates
- Index by goal description and context

#### Pattern 2: Error Recovery
- Capture failed command + recovery command pairs
- Build error pattern database
- Learn most effective recovery strategies

#### Pattern 3: User Corrections
- Capture user corrections to agent suggestions
- Learn user preferences and style
- Improve future suggestions

#### Pattern 4: Timing Correlations
- Correlate commands with timing/area/power results
- Learn optimization strategies
- Build PPA prediction models

### 5.3 Knowledge Refinement

```typescript
interface KnowledgeRefinement {
  // Periodic re-clustering of embeddings
  reclusterEmbeddings(index: string): Promise<void>;

  // Update embeddings based on new patterns
  updateEmbeddings(experiences: Experience[]): Promise<void>;

  // Template evolution based on usage
  evolveTemplates(): Promise<void>;

  // Prune low-quality or outdated knowledge
  pruneKnowledge(threshold: number): Promise<void>;
}
```

---

## 6. Full Autonomy Mechanisms

### 6.1 Goal Decomposition

```typescript
interface GoalDecomposition {
  // High-level goal from user
  highLevelGoal: string;

  // Decomposed into sub-goals
  subGoals: SubGoal[];

  // Dependencies between sub-goals
  dependencies: DependencyGraph;
}

// Example decomposition
const exampleDecomposition: GoalDecomposition = {
  highLevelGoal: "Optimize design for timing closure",
  subGoals: [
    { id: "1", task: "Analyze current timing", tool: "tempus", estimatedTime: 300 },
    { id: "2", task: "Identify critical paths", tool: "tempus", estimatedTime: 180, dependsOn: ["1"] },
    { id: "3", task: "Apply optimization strategy", tool: "innovus", estimatedTime: 600, dependsOn: ["2"] },
    { id: "4", task: "Verify timing closure", tool: "tempus", estimatedTime: 300, dependsOn: ["3"] }
  ],
  dependencies: {
    "1": [],
    "2": ["1"],
    "3": ["2"],
    "4": ["3"]
  }
};
```

### 6.2 Self-Verification Loops

```typescript
interface SelfVerification {
  // Pre-execution validation
  validatePlan(plan: Plan): ValidationResult;

  // Post-command verification
  verifyExecution(result: ExecutionResult): VerificationResult;

  // Quality assessment
  assessQuality(metrics: QualityMetrics): QualityAssessment;

  // Decision on whether to continue, retry, or escalate
  decideNextAction(verification: VerificationResult): ActionDecision;
}
```

### 6.3 Error Recovery Strategies

| Error Type | Strategy | Example |
|------------|----------|---------|
| Syntax Error | Retry with correction | Missing semicolon in Tcl |
| Tool Error | Alternative command | Try different optimization |
| Resource Error | Wait and retry | License server busy |
| Logic Error | Rollback + replan | Wrong constraint applied |
| Unknown Error | Escalate to user | Unrecognized error message |

### 6.4 Decision Making Without Human Approval

Confidence-based decision matrix:

```typescript
interface DecisionMatrix {
  // Confidence thresholds for autonomous action
  thresholds: {
    commandGeneration: 0.9;    // High confidence needed for command gen
    errorRecovery: 0.7;        // Moderate confidence for recovery
    planAdaptation: 0.8;       // High confidence for plan changes
    resourceAllocation: 0.95;  // Very high for resource decisions
  };

  // Escalation triggers
  escalateWhen: [
    'confidence_below_threshold',
    'repeated_failure',
    'resource_intensive_operation',
    'destructive_operation',
    'unknown_error_pattern'
  ];
}
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goals**: Establish base infrastructure

**Deliverables**:
- [ ] Refactor `Agent` class to `BaseAgent` with message bus integration
- [ ] Implement Pinecone knowledge base client
- [ ] Create agent registry and factory
- [ ] Implement state machine framework

**Key Files**:
```
src/agents/
  ├── BaseAgent.ts           # Refactored from current Agent
  ├── AgentRegistry.ts       # Agent creation and management
  ├── MessageBus.ts          # Inter-agent communication
  └── state/
      ├── StateMachine.ts    # LangGraph-inspired state management
      └── Checkpoint.ts      # Rollback mechanism
```

### Phase 2: Core Specialist Agents (Weeks 3-4)

**Goals**: Build specialist agents for core functionality

**Deliverables**:
- [ ] Terminal Perception Agent with EDA tool detection
- [ ] Command Synthesis Agent with NL2SL translation
- [ ] Verification Agent with quality assessment
- [ ] Integration with existing TerminalSession

**Key Files**:
```
src/agents/specialists/
  ├── TerminalPerceptionAgent.ts
  ├── CommandSynthesisAgent.ts
  └── VerificationAgent.ts
```

### Phase 3: Hierarchical Control (Weeks 5-6)

**Goals**: Implement orchestration and planning

**Deliverables**:
- [ ] Orchestrator Agent with goal decomposition
- [ ] Planner Agent with task graph generation
- [ ] Knowledge Curator Agent with RAG pipeline
- [ ] Dynamic team assembly

**Key Files**:
```
src/agents/
  ├── orchestrator/
  │   └── OrchestratorAgent.ts
  ├── managers/
  │   ├── PlannerAgent.ts
  │   └── KnowledgeCuratorAgent.ts
  └── teams/
      └── TeamAssembler.ts
```

### Phase 4: Self-Improvement (Weeks 7-8)

**Goals**: Implement learning and knowledge refinement

**Deliverables**:
- [ ] Learning Agent with pattern extraction
- [ ] Recovery Agent with error handling
- [ ] Experience capture pipeline
- [ ] Knowledge refinement jobs

**Key Files**:
```
src/agents/specialists/
  ├── LearningAgent.ts
  └── RecoveryAgent.ts
src/learning/
  ├── ExperienceCapture.ts
  ├── PatternExtractor.ts
  └── KnowledgeRefiner.ts
```

---

## 8. Integration with Current Codebase

### 8.1 Evolution Strategy

```
Current State:
┌─────────────────────────────────────────┐
│              CLI Entry                  │
│                   │                     │
│              ┌────┴────┐                │
│              │  Agent  │ (single)       │
│              └────┬────┘                │
│                   │                     │
│            TerminalSession              │
│                   │                     │
│              VirtualTerminal            │
└─────────────────────────────────────────┘

Target State (Evolutionary):
┌─────────────────────────────────────────┐
│              CLI Entry                  │
│                   │                     │
│           ┌───────┴───────┐             │
│           │ Orchestrator  │             │
│           └───────┬───────┘             │
│        ┌─────────┼─────────┐            │
│   ┌────┴───┐ ┌───┴───┐ ┌──┴────┐       │
│   │Planner │ │Knowledge│ │Terminal │   │
│   └───┬────┘ └───┬───┘ └───┬───┘       │
│       │          │         │            │
│   Specialist Team (dynamic)             │
│       │          │         │            │
│            TerminalSession              │
│                   │                     │
│              VirtualTerminal            │
└─────────────────────────────────────────┘
```

### 8.2 File Mapping

| Current File | Refactoring | New Location |
|--------------|-------------|--------------|
| `src/agent/index.ts` | Refactor to `BaseAgent` | `src/agents/BaseAgent.ts` |
| `src/terminal/session.ts` | Extend with events | `src/terminal/TerminalSession.ts` |
| `src/terminal/virtual.ts` | Enhance output capture | `src/terminal/VirtualTerminal.ts` |
| `src/tui/App.tsx` | Integrate orchestrator | `src/tui/App.tsx` (updated) |

### 8.3 Backward Compatibility

```typescript
// Maintain backward compatibility during transition
class AgentFacade {
  private orchestrator: OrchestratorAgent;

  // Legacy chat() interface
  async chat(message: string, context: Context): Promise<Response> {
    // Delegate to orchestrator
    return this.orchestrator.handleUserMessage(message, context);
  }

  // New: Full access to multi-agent capabilities
  async executeGoal(goal: Goal): Promise<ExecutionResult> {
    return this.orchestrator.executeGoal(goal);
  }
}
```

---

## 9. Performance Targets

Based on Mark Ren's Marco framework achievements:

| Metric | Target | Marco Reference |
|--------|--------|-----------------|
| Timing Analysis | 30× speedup vs manual | 60× achieved |
| Command Generation Success | 85% first-try | 94.2% achieved |
| Error Recovery | 70% auto-recovery | 86% achieved |
| Workflow Completion | 80% full auto | Comparable |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Pinecone dependency unavailable | Fallback to local vector DB (FAISS) |
| LLM API failures | Retry with backoff, cache responses |
| Knowledge base pollution | Validation gates, human review for new patterns |
| Agent coordination overhead | Async message passing, state machine checkpointing |
| Terminal state inconsistency | Robust parsing, state machine validation |

---

## References

1. **Mark Ren's Work**
   - [Marco Framework Paper](https://arxiv.org/abs/2504.01962)
   - [NVIDIA Developer Blog on Marco](https://developer.nvidia.com/blog/configurable-graph-based-task-solving-with-the-marco-multi-ai-agent-framework-for-chip-design/)
   - [HotChips 2024 Tutorial on LLM Agents for Chip Design](https://www.hc2024.hotchips.org/assets/program/tutorials/6-HC2024.nvidia.MarkRen.agent.v04.pdf)
   - [Agentrys](https://agentrys.ai/)

2. **Multi-Agent Frameworks**
   - [CrewAI](https://github.com/joaomdmoura/crewAI)
   - [AutoGen (Microsoft)](https://github.com/microsoft/autogen)
   - [LangGraph](https://github.com/langchain-ai/langgraph)

3. **Academic References**
   - Hierarchical Reinforcement Learning for Multi-Agent Systems
   - Self-Improving AI Agents (Voyager, etc.)
   - EDA Tool Scripting References (Cadence, Synopsys)

---

## Conclusion

This architecture provides a blueprint for transforming chipilot-cli from a simple single-agent assistant into a fully autonomous, self-improving multi-agent system capable of handling complex EDA workflows. The design leverages:

- **Mark Ren's proven patterns** from the Marco framework
- **Knowledge-centric design** to compensate for lack of dedicated LLM
- **Hierarchical organization** for scalable complexity management
- **Continuous learning** for improvement over time

The phased implementation approach allows for incremental delivery while maintaining backward compatibility with the existing codebase.
