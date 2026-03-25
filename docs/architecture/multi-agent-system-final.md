# Self-Improving Hierarchical Multi-Agent Architecture for chipilot-cli

## Executive Summary

This document presents the comprehensive architecture for evolving chipilot-cli from a single-agent system to a **fully autonomous, self-improving hierarchical multi-agent system** for EDA (Electronic Design Automation) workflows.

### Core Design Principles

1. **Three-Tier Cognitive Architecture**: Inspired by Mark Ren's Agentrys framework
   - **Perception Layer**: Real-time terminal state analysis, EDA tool detection
   - **Cognition Layer**: Reasoning, planning, and decision-making
   - **Action Layer**: Command execution, tool interaction, recovery

2. **Knowledge-Centric Design**: The knowledge base compensates for lack of dedicated LLM through:
   - **RAG-based expertise injection**: Retrieve domain knowledge at inference time
   - **Structured knowledge storage**: Executable command schemas, not just text
   - **Self-learning from execution**: Capture successful patterns and error recoveries
   - **Few-shot exemplar retrieval**: Past execution traces as in-context learning

3. **Hierarchical Multi-Agent Teams**: 9 specialized agent types in a 3-level hierarchy
   - Strategic (Orchestrator)
   - Manager (Planner, Knowledge Curator)
   - Specialist Workers (Terminal Perception, Command Synthesis, Verification, Learning, Recovery, Execution)

### Key Differentiators

- **Knowledge as Cognitive Prosthetic**: Transform general LLM into EDA expert via retrieval
- **Graph-Based Task Solving**: Dynamic and static task graphs for workflow orchestration
- **Self-Improving**: Continuous learning from successes, failures, and user feedback
- **EDA-Native**: Deep integration with chip design tools and RTL-to-GDS flows
- **Autonomous**: Capable of full end-to-end design tasks without human intervention

---

## 1. The Knowledge Base: Cognitive Prosthetic for Domain Expertise

### 1.1 Core Purpose: LLM Compensation

Without a dedicated EDA-trained model, the general LLM lacks:
- Exact Tcl command syntax for Cadence/Synopsys tools
- Understanding of tool-specific error messages
- Knowledge of valid workflow sequences
- Contextual awareness of physical design constraints

**The knowledge base bridges this gap** by functioning as external structured memory—retrieving domain expertise at inference time rather than relying on the LLM's training.

### 1.2 Four Mechanisms of Compensation

#### Mechanism 1: RAG as Domain Expertise Injection

```
User: "Fix the hold violations in the clock tree"
         ↓
Planner Agent queries KB:
  - semanticSearch: "clock tree synthesis hold fixing"
  - structuredLookup: tool="innovus", category="cts", operation="optDesign -hold"
         ↓
Retrieved context injected into LLM prompt:
  "Related commands: optDesign -postRoute -hold,
   Common causes: clock skew, useful skew disabled,
   Script template: KB-CTS-042"
         ↓
LLM generates accurate command with retrieved syntax
```

**Result**: General LLM + KB context = EDA-capable reasoner without fine-tuning.

#### Mechanism 2: Structured Knowledge Reduces Token Waste

| Approach | Cost | Accuracy |
|----------|------|----------|
| Raw LLM guessing | Multiple retries | Low (hallucinations) |
| KB lookup + generation | Single pass | High (validated schemas) |

The KB stores **executable knowledge**—command schemas with preconditions, parameters, and effects—not just documentation text.

#### Mechanism 3: Error Pattern Matching as Learned Intuition

```typescript
interface ErrorPattern {
  signature: Regex;              // /.*Setup slack.*violated.*\d+\s*ps.*/
  rootCause: string;             // "clock_period_too_tight"
  fixTemplate: string;           // "relax_clock -name {clk} -to {period}"
  confidence: number;            // 0.94 (learned from success rate)
  sourceContexts: string[];      // ["project_a", "project_b"]
}
```

When the Terminal Perception Agent detects:
```
Error: Setup slack violated -120ps in corner typical
```

The KB retrieves the matching pattern instantly—something the general LLM might misinterpret or miss entirely.

#### Mechanism 4: Few-Shot Examples from Execution History

| Task | Commands Used | Outcome | Context |
|------|--------------|---------|---------|
| CTS-001 | `create_ccopt_clock_tree` → `ccopt_design` → `reportClockTree` | Success | 28nm, Innovus 21.1 |
| CTS-002 | `setOptMode -addFillers` → `addFiller` | Failed | 7nm, missing -cell |

Before generating new commands, the Command Synthesis Agent retrieves similar past tasks. This is **in-context learning without model retraining**.

### 1.3 Three-Tier Knowledge Architecture

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

### 1.4 Pinecone Index Schema

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

---

## 2. Agent Roles & Responsibilities

### 2.1 Strategic Layer

#### Orchestrator Agent
- **Purpose**: Central coordination and goal decomposition
- **Responsibilities**:
  - Decompose high-level user goals into executable sub-tasks
  - Assemble dynamic teams of specialist agents
  - Monitor overall progress and handle escalations
  - Manage session lifecycle and resource allocation
- **Pattern**: LangGraph-style state machine orchestrator
- **Cognitive Model**: Tree-of-Thought (ToT) planning with BFS/DFS exploration

### 2.2 Manager Layer

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
- **Pattern**: RAG coordinator with query routing
- **Knowledge**: Semantic search strategies, embedding models, domain taxonomies

### 2.3 Specialist Layer

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

#### Execution Agent (9th Agent)
- **Purpose**: Resource management and safe command execution
- **Responsibilities**:
  - Manage terminal sessions and compute resources
  - Implement safety checks before command execution
  - Handle resource contention and queuing
  - Maintain execution checkpoints for rollback
- **Pattern**: Resource manager with safety gates
- **Knowledge**: Resource limits, safety policies, checkpoint strategies

---

## 3. Hierarchical Structure & Communication

### 3.1 Three-Level Hierarchy

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
│  ┌──────────┐ ┌──────────┐                                  │
│  │ Recovery │ │ Execution│                                  │
│  │  Agent   │ │  Agent   │                                  │
│  └──────────┘ └──────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Communication Architecture

#### Message Bus Design

```typescript
interface AgentMessage {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  type: MessageType;
  payload: unknown;
  timestamp: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  correlationId?: string;
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

#### LangGraph-Inspired State Machine

```typescript
interface AgentState {
  status: 'idle' | 'planning' | 'executing' | 'verifying' | 'recovering' | 'learning';
  task?: Task;
  history: ExecutionEvent[];
  sharedContext: Map<string, unknown>;
  checkpoint?: StateCheckpoint;
}

const stateGraph = {
  idle: ['planning', 'executing'],
  planning: ['executing', 'idle'],
  executing: ['verifying', 'recovering', 'idle'],
  verifying: ['learning', 'executing', 'recovering', 'idle'],
  recovering: ['executing', 'idle'],
  learning: ['idle']
};
```

### 3.3 Dynamic Team Assembly

| Task Type | Team Composition |
|-----------|------------------|
| Simple Command | Terminal Perception + Command Synthesis + Verification |
| Complex Flow | Full specialist team + Planner coordination |
| Debug Session | Terminal Perception + Recovery + Learning |
| Knowledge Task | Knowledge Curator + Learning + Verification |
| Resource-Intensive | Execution Agent + Planner + Verification |

---

## 4. Self-Improvement Mechanisms

### 4.1 Experience Capture Loop

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

### 4.2 Learning Patterns

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

### 4.3 Knowledge Refinement

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

## 5. Full Autonomy Mechanisms

### 5.1 Goal Decomposition

```typescript
interface GoalDecomposition {
  highLevelGoal: string;
  subGoals: SubGoal[];
  dependencies: DependencyGraph;
}

// Example: Timing Closure
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

### 5.2 Self-Verification Loops

```typescript
interface SelfVerification {
  // Pre-execution validation
  validatePlan(plan: Plan): ValidationResult;

  // Post-command verification
  verifyExecution(result: ExecutionResult): VerificationResult;

  // Quality assessment
  assessQuality(metrics: QualityMetrics): QualityAssessment;

  // Decision on next action
  decideNextAction(verification: VerificationResult): ActionDecision;
}
```

### 5.3 Error Recovery Strategies

| Error Type | Strategy | Example |
|------------|----------|---------|
| Syntax Error | Retry with correction | Missing semicolon in Tcl |
| Tool Error | Alternative command | Try different optimization |
| Resource Error | Wait and retry | License server busy |
| Logic Error | Rollback + replan | Wrong constraint applied |
| Unknown Error | Escalate to user | Unrecognized error message |

### 5.4 Confidence-Based Decision Matrix

```typescript
interface DecisionMatrix {
  thresholds: {
    commandGeneration: 0.9;    // High confidence for command gen
    errorRecovery: 0.7;        // Moderate for recovery
    planAdaptation: 0.8;       // High for plan changes
    resourceAllocation: 0.95;  // Very high for resources
  };

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

## 6. RTL-to-GDS Flow Agent Mapping

### Concrete Agent Responsibilities by Stage

| Stage | Primary Agents | Supporting Agents | Knowledge Base Queries |
|-------|---------------|-------------------|----------------------|
| **Synthesis** | Command Synthesis, Verification | Knowledge Curator, Terminal Perception | Genus commands, timing constraints |
| **Floorplan** | Planner, Command Synthesis | Verification, Terminal Perception | Die area, utilization rules, macro placement |
| **Placement** | Command Synthesis, Execution | Verification, Terminal Perception | Placement options, congestion estimation |
| **CTS** | Planner, Command Synthesis | Verification, Terminal Perception | Clock specs, skew targets, CTS recipes |
| **Routing** | Command Synthesis, Execution | Verification, Terminal Perception | Route options, DRC rules, antenna fixing |
| **Timing** | Command Synthesis, Verification | Knowledge Curator, Recovery | Timing corners, ECO commands, SI analysis |
| **Physical Ver** | Verification, Terminal Perception | Recovery, Learning | DRC/LVS decks, fixing strategies |
| **GDS** | Command Synthesis, Execution | Verification | Stream out options, layer mapping |

### Example: CTS Stage Execution

```
User Goal: "Build the clock tree with 50ps skew target"
         ↓
Orchestrator: Decompose to CTS stage task
         ↓
Planner: Query KB for CTS workflow template
         ↓
Command Synthesis: Retrieve commands:
         - create_ccopt_clock_tree
         - set_ccopt_property target_skew 50ps
         - ccopt_design
         ↓
Execution Agent: Run commands in terminal
         ↓
Terminal Perception: Monitor output, detect completion
         ↓
Verification: Check timing report, confirm skew < 50ps
         ↓
Learning: Capture successful command sequence to KB
```

---

## 7. Integration with Current Codebase

### 7.1 Evolution Strategy

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

### 7.2 File Mapping

| Current File | Refactoring | New Location |
|--------------|-------------|--------------|
| `src/agent/index.ts` | Refactor to `BaseAgent` | `src/agents/BaseAgent.ts` |
| `src/terminal/session.ts` | Extend with events | `src/terminal/TerminalSession.ts` |
| `src/terminal/virtual.ts` | Enhance output capture | `src/terminal/VirtualTerminal.ts` |
| `src/tui/App.tsx` | Integrate orchestrator | `src/tui/App.tsx` (updated) |

### 7.3 Backward Compatibility

```typescript
// Maintain backward compatibility during transition
class AgentFacade {
  private orchestrator: OrchestratorAgent;

  // Legacy chat() interface
  async chat(message: string, context: Context): Promise<Response> {
    return this.orchestrator.handleUserMessage(message, context);
  }

  // New: Full access to multi-agent capabilities
  async executeGoal(goal: Goal): Promise<ExecutionResult> {
    return this.orchestrator.executeGoal(goal);
  }
}
```

---

## 8. Performance Targets

Based on Mark Ren's Marco framework achievements:

| Metric | Target | Marco Reference |
|--------|--------|-----------------|
| Timing Analysis | 30× speedup vs manual | 60× achieved |
| Command Generation Success | 85% first-try | 94.2% achieved |
| Error Recovery | 70% auto-recovery | 86% achieved |
| Workflow Completion | 80% full auto | Comparable |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Pinecone dependency unavailable | Fallback to local vector DB (FAISS) |
| LLM API failures | Retry with backoff, cache responses |
| Knowledge base pollution | Validation gates, human review for new patterns |
| Agent coordination overhead | Async message passing, state machine checkpointing |
| Terminal state inconsistency | Robust parsing, state machine validation |

---

## 10. References

1. **Mark Ren's Work**
   - [Marco Framework Paper](https://arxiv.org/abs/2504.01962)
   - [NVIDIA Developer Blog on Marco](https://developer.nvidia.com/blog/configurable-graph-based-task-solving-with-the-marco-multi-ai-agent-framework-for-chip-design/)
   - [HotChips 2024 Tutorial](https://www.hc2024.hotchips.org/assets/program/tutorials/6-HC2024.nvidia.MarkRen.agent.v04.pdf)
   - [Agentrys](https://agentrys.ai/)

2. **Multi-Agent Frameworks**
   - [CrewAI](https://github.com/joaomdmoura/crewAI)
   - [AutoGen (Microsoft)](https://github.com/microsoft/autogen)
   - [LangGraph](https://github.com/langchain-ai/langgraph)

---

## Conclusion

This architecture transforms chipilot-cli through:

1. **Knowledge-Centric Design**: The KB compensates for lack of dedicated LLM via RAG, structured storage, and continuous learning
2. **Hierarchical Organization**: 9 specialized agents in 3-tier structure for scalable complexity management
3. **Self-Improvement**: Continuous learning from execution history and user feedback
4. **Full Autonomy**: Confidence-based decision making with escalation gates

The knowledge base is not merely storage—it is the **cognitive prosthetic** that enables a general LLM to function as an EDA domain expert.
