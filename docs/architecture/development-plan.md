# chipilot-cli Multi-Agent Architecture Development Plan

## Overview

This document provides a comprehensive, phased development plan for implementing the self-improving hierarchical multi-agent architecture. The plan prioritizes **knowledge infrastructure first**, as the KB is the foundation that enables all other agent capabilities.

---

## Phase 0: Foundation & Infrastructure (Weeks 1-2)

### Goal
Establish the core infrastructure required for multi-agent coordination and knowledge management.

### Deliverables

#### Week 1: Base Infrastructure

**Day 1-2: Project Structure & BaseAgent**
- [ ] Create `src/agents/` directory structure
- [ ] Implement `BaseAgent` abstract class with message handling
- [ ] Define `AgentMessage`, `AgentState`, and `AgentConfig` interfaces
- [ ] Create `AgentRegistry` for agent lifecycle management

**Day 3-4: Message Bus Implementation**
- [ ] Implement `MessageBus` class with pub/sub pattern
- [ ] Add message routing (direct, broadcast, topic-based)
- [ ] Implement message persistence for replay/debugging
- [ ] Add message priority and deadline handling

**Day 5: State Management**
- [ ] Implement `StateMachine` with LangGraph-inspired transitions
- [ ] Create `CheckpointManager` for rollback capabilities
- [ ] Add session state persistence (resume after crash)

**Key Files:**
```
src/agents/
  ├── core/
  │   ├── BaseAgent.ts           # Abstract base class
  │   ├── AgentRegistry.ts       # Agent factory & registry
  │   ├── MessageBus.ts          # Inter-agent communication
  │   └── types.ts               # Shared type definitions
  ├── state/
  │   ├── StateMachine.ts        # State transition logic
  │   └── Checkpoint.ts          # Rollback mechanism
  └── index.ts                   # Public API exports
```

#### Week 2: Knowledge Base Infrastructure

**Day 1-2: Pinecone Integration**
- [ ] Create `KnowledgeBase` class wrapping Pinecone client
- [ ] Implement index initialization (commands, errors, workflows)
- [ ] Add embedding generation with EDA-optimized model
- [ ] Create index management CLI commands

**Day 3-4: Knowledge Storage Layer**
- [ ] Implement `KnowledgeStore` with CRUD operations
- [ ] Create schema validation for knowledge entries
- [ ] Add versioning for knowledge updates
- [ ] Implement batch operations for efficiency

**Day 5: Knowledge Retrieval Pipeline**
- [ ] Implement `KnowledgeRetriever` with semantic search
- [ ] Add structured lookup (tool → category → operation)
- [ ] Create error pattern matching engine
- [ ] Implement contextual retrieval combining multiple sources

**Key Files:**
```
src/knowledge/
  ├── core/
  │   ├── KnowledgeBase.ts       # Pinecone wrapper
  │   ├── KnowledgeStore.ts      # CRUD operations
  │   └── KnowledgeRetriever.ts  # Retrieval pipeline
  ├── embeddings/
  │   ├── EmbeddingGenerator.ts  # Text → vector
  │   └── EDAModel.ts            # Domain-optimized model
  ├── schema/
  │   ├── CommandSchema.ts
  │   ├── ErrorPatternSchema.ts
  │   └── WorkflowSchema.ts
  └── indices/
      ├── commands.ts
      ├── errors.ts
      └── workflows.ts
```

### Milestone 0: Infrastructure Complete
**Verification:**
```typescript
// Test: Agents can communicate
const bus = new MessageBus();
const agent1 = new TestAgent('agent1', bus);
const agent2 = new TestAgent('agent2', bus);

await agent1.send('agent2', { type: 'test', payload: 'hello' });
// agent2 receives message

// Test: Knowledge base operations
const kb = new KnowledgeBase();
await kb.storeCommand({
  tool: 'innovus',
  command: 'place_opt_design',
  description: 'Run placement optimization'
});

const results = await kb.search('placement optimization');
// Returns relevant commands
```

---

## Phase 1: Core Specialist Agents (Weeks 3-5)

### Goal
Implement the four core specialist agents that form the execution backbone.

### Deliverables

#### Week 3: Terminal Perception Agent

**Day 1-2: EDA Tool Detection**
- [ ] Create `EDAToolDetector` with regex patterns for Innovus, Genus, Tempus, ICC2
- [ ] Implement state machine for tool lifecycle (starting → ready → busy → error)
- [ ] Add prompt detection (identify when tool is waiting for input)

**Day 3-4: Output Parsing**
- [ ] Implement `OutputParser` for structured data extraction
- [ ] Create parsers for: timing reports, error messages, progress indicators
- [ ] Add ANSI sequence handling for clean text extraction

**Day 5: Integration**
- [ ] Integrate with `TerminalSession` events
- [ ] Add real-time output streaming to message bus
- [ ] Create `TerminalState` snapshot for other agents

**Key Files:**
```
src/agents/specialists/
  ├── terminal/
  │   ├── TerminalPerceptionAgent.ts
  │   ├── EDAToolDetector.ts
  │   ├── OutputParser.ts
  │   └── patterns/
  │       ├── innovus.ts
  │       ├── genus.ts
  │       └── tempus.ts
```

#### Week 4: Command Synthesis Agent

**Day 1-2: NL2SL Translation**
- [ ] Implement `CommandGenerator` with few-shot prompting
- [ ] Create prompt templates for different tool categories
- [ ] Add context injection from Knowledge Base

**Day 3-4: Syntax Validation**
- [ ] Implement `TclValidator` for syntax checking
- [ ] Create command schema validation against KB
- [ ] Add dry-run capability (validate without executing)

**Day 5: Command Optimization**
- [ ] Implement `CommandOptimizer` for performance
- [ ] Add history-aware suggestions (respect user style)
- [ ] Create batch command generation for workflows

**Key Files:**
```
src/agents/specialists/
  ├── command/
  │   ├── CommandSynthesisAgent.ts
  │   ├── CommandGenerator.ts
  │   ├── TclValidator.ts
  │   └── CommandOptimizer.ts
```

#### Week 5: Verification & Execution Agents

**Day 1-2: Verification Agent**
- [ ] Implement `VerificationAgent` with success/failure detection
- [ ] Create quality metrics parser (timing, area, power)
- [ ] Add confidence scoring for results

**Day 3-4: Execution Agent**
- [ ] Implement `ExecutionAgent` for safe command execution
- [ ] Add resource management (session allocation, queuing)
- [ ] Create safety gates (destructive operation confirmation)

**Day 5: Integration Testing**
- [ ] End-to-end test: Perception → Synthesis → Execution → Verification
- [ ] Add integration tests with mock terminal

**Key Files:**
```
src/agents/specialists/
  ├── verification/
  │   ├── VerificationAgent.ts
  │   ├── QualityMetrics.ts
  │   └── SuccessCriteria.ts
  └── execution/
      ├── ExecutionAgent.ts
      ├── ResourceManager.ts
      └── SafetyGates.ts
```

### Milestone 1: Core Specialists Complete
**Verification:**
```typescript
// Integration test
const terminal = new TerminalPerceptionAgent(bus);
const command = new CommandSynthesisAgent(bus, knowledgeBase);
const execution = new ExecutionAgent(bus, terminalSession);
const verify = new VerificationAgent(bus);

// User asks for placement
await command.handleTask({ type: 'generate', goal: 'run placement' });
// Command Synthesis queries KB, generates: "place_opt_design"

// Execution runs it
await execution.execute(commandText);

// Terminal Perception detects completion
// Verification checks timing report
```

---

## Phase 2: Manager Agents (Weeks 6-7)

### Goal
Implement the Planner and Knowledge Curator agents for task orchestration.

### Deliverables

#### Week 6: Planner Agent

**Day 1-2: Task Graph Generation**
- [ ] Implement `TaskGraphBuilder` with dependency resolution
- [ ] Create HTN (Hierarchical Task Network) planner
- [ ] Add workflow template instantiation

**Day 3-4: Resource Allocation**
- [ ] Implement `ResourceAllocator` for terminal sessions
- [ ] Add dependency-based scheduling
- [ ] Create parallel execution planning

**Day 5: Dynamic Replanning**
- [ ] Implement `ReplanningEngine` for failure recovery
- [ ] Add partial plan execution and resumption
- [ ] Create plan optimization based on past performance

**Key Files:**
```
src/agents/managers/
  ├── planner/
  │   ├── PlannerAgent.ts
  │   ├── TaskGraphBuilder.ts
  │   ├── HTNPlanner.ts
  │   ├── ResourceAllocator.ts
  │   └── ReplanningEngine.ts
```

#### Week 7: Knowledge Curator Agent

**Day 1-2: RAG Pipeline**
- [ ] Implement `RAGPipeline` with query routing
- [ ] Create context assembly from multiple KB sources
- [ ] Add relevance ranking and deduplication

**Day 3-4: Knowledge Validation**
- [ ] Implement `KnowledgeValidator` for entry quality
- [ ] Create automated testing for command patterns
- [ ] Add confidence scoring for knowledge entries

**Day 5: Knowledge Maintenance**
- [ ] Implement periodic re-clustering
- [ ] Add stale knowledge detection
- [ ] Create knowledge pruning for low-quality entries

**Key Files:**
```
src/agents/managers/
  └── knowledge/
      ├── KnowledgeCuratorAgent.ts
      ├── RAGPipeline.ts
      ├── KnowledgeValidator.ts
      └── KnowledgeMaintenance.ts
```

### Milestone 2: Manager Agents Complete
**Verification:**
```typescript
// Planner creates task graph
const planner = new PlannerAgent(bus, knowledgeBase);
const plan = await planner.createPlan({
  goal: "Run CTS with 50ps skew target",
  constraints: { maxRuntime: 3600 }
});
// Returns: check_design → create_ccopt_clock_tree → ccopt_design → reportClockTree

// Knowledge Curator provides context
const curator = new KnowledgeCuratorAgent(bus, knowledgeBase);
const context = await curator.retrieveContext({
  task: "clock tree synthesis",
  tool: "innovus"
});
// Returns relevant command docs, error patterns, workflow templates
```

---

## Phase 3: Orchestrator & Hierarchical Control (Weeks 8-9)

### Goal
Implement the Orchestrator agent and dynamic team assembly.

### Deliverables

#### Week 8: Orchestrator Agent

**Day 1-2: Goal Decomposition**
- [ ] Implement `GoalDecomposer` with Tree-of-Thought
- [ ] Create sub-goal identification and sequencing
- [ ] Add goal dependency analysis

**Day 3-4: Team Assembly**
- [ ] Implement `TeamAssembler` for dynamic agent teams
- [ ] Create agent selection based on task requirements
- [ ] Add team lifecycle management (create → execute → dissolve)

**Day 5: Coordination Logic**
- [ ] Implement hierarchical delegation (Orchestrator → Managers → Specialists)
- [ ] Add progress tracking across agent teams
- [ ] Create escalation handling

**Key Files:**
```
src/agents/orchestrator/
  ├── OrchestratorAgent.ts
  ├── GoalDecomposer.ts
  ├── TeamAssembler.ts
  └── CoordinationLogic.ts
```

#### Week 9: Self-Improvement Agents

**Day 1-2: Learning Agent**
- [ ] Implement `LearningAgent` with pattern extraction
- [ ] Create workflow template generation
- [ ] Add user correction capture

**Day 3-4: Recovery Agent**
- [ ] Implement `RecoveryAgent` with error diagnosis
- [ ] Create retry strategy selection
- [ ] Add rollback checkpoint management

**Day 5: Integration**
- [ ] Wire Recovery Agent to Orchestrator escalation
- [ ] Connect Learning Agent to Knowledge Curator
- [ ] End-to-end test with failure injection

**Key Files:**
```
src/agents/specialists/
  ├── learning/
  │   ├── LearningAgent.ts
  │   ├── PatternExtractor.ts
  │   └── TemplateGenerator.ts
  └── recovery/
      ├── RecoveryAgent.ts
      ├── ErrorDiagnoser.ts
      └── RetryStrategies.ts
```

### Milestone 3: Full Hierarchy Complete
**Verification:**
```typescript
// Orchestrator handles high-level goal
const orchestrator = new OrchestratorAgent(bus, registry, knowledgeBase);

const result = await orchestrator.executeGoal({
  goal: "Optimize design for timing closure",
  context: { design: "cpu_core", corner: "typical" }
});

// Internally:
// 1. Decomposes to sub-goals
// 2. Assembles team (Planner + Command Synthesis + Execution + Verification)
// 3. Delegates to Planner for task sequencing
// 4. Monitors progress, handles escalations
// 5. Returns final result with quality metrics
```

---

## Phase 4: Knowledge Seeding & Learning (Weeks 10-11)

### Goal
Seed the knowledge base with initial EDA knowledge and implement learning pipelines.

### Deliverables

#### Week 10: Knowledge Seeding

**Day 1-3: EDA Tool Documentation**
- [ ] Extract command references from Cadence/Synopsys docs
- [ ] Create structured YAML files for tool commands
- [ ] Add common workflow templates (synthesis, placement, CTS, routing)

**Day 4-5: Error Pattern Library**
- [ ] Compile common error patterns and solutions
- [ ] Create regex patterns for error detection
- [ ] Add recovery strategy mappings

**Key Files:**
```
knowledge/
  ├── tools/
  │   ├── cadence/
  │   │   ├── innovus_commands.yaml
  │   │   ├── genus_commands.yaml
  │   │   └── tempus_commands.yaml
  │   └── synopsys/
  │       ├── icc2_commands.yaml
  │       └── dc_commands.yaml
  ├── workflows/
  │   ├── rtl_to_gds.yaml
  │   ├── timing_closure.yaml
  │   └── cts_recipes.yaml
  └── errors/
      ├── innovus_errors.yaml
      ├── genus_errors.yaml
      └── recovery_strategies.yaml
```

#### Week 11: Experience Capture Pipeline

**Day 1-2: Execution Logging**
- [ ] Implement comprehensive execution logging
- [ ] Create log structured data extraction
- [ ] Add automatic tagging and categorization

**Day 3-4: Pattern Extraction**
- [ ] Implement `PatternExtractor` for command sequences
- [ ] Create success/failure pattern identification
- [ ] Add template generalization from specific instances

**Day 5: Knowledge Refinement Jobs**
- [ ] Implement scheduled knowledge refinement
- [ ] Create embedding re-clustering pipeline
- [ ] Add knowledge quality scoring

**Key Files:**
```
src/learning/
  ├── capture/
  │   ├── ExecutionLogger.ts
  │   └── LogExtractor.ts
  ├── extraction/
  │   ├── PatternExtractor.ts
  │   └── TemplateGeneralizer.ts
  └── refinement/
      ├── KnowledgeRefiner.ts
      └── QualityScorer.ts
```

### Milestone 4: Knowledge Base Operational
**Verification:**
```bash
# Seed knowledge base
npm run kb:seed

# Verify commands indexed
curl -X POST "$PINECONE_ENDPOINT/query" \
  -H "Api-Key: $PINECONE_API_KEY" \
  -d '{"vector": [...], "topK": 5}'
# Returns: place_opt_design, route_design, etc.

# Test pattern matching
npm run test:pattern "Error: Setup slack violated"
# Returns: matching error pattern with recovery strategy
```

---

## Phase 5: TUI Integration & Polish (Weeks 12-13)

### Goal
Integrate multi-agent system with existing TUI and add polish.

### Deliverables

#### Week 12: TUI Integration

**Day 1-2: Agent Status Display**
- [ ] Add agent status panel to TUI
- [ ] Show active agents and their states
- [ ] Create task progress visualization

**Day 3-4: Knowledge Inspector**
- [ ] Add knowledge base query interface
- [ ] Create workflow visualization
- [ ] Add knowledge entry editor

**Day 5: Session Management**
- [ ] Implement session save/restore
- [ ] Add checkpoint visualization
- [ ] Create rollback UI

**Key Files:**
```
src/tui/
  ├── components/
  │   ├── AgentStatusPanel.tsx
  │   ├── TaskProgress.tsx
  │   └── KnowledgeInspector.tsx
  └── hooks/
      ├── useAgents.ts
      └── useKnowledge.ts
```

#### Week 13: Testing & Documentation

**Day 1-3: Testing**
- [ ] Unit tests for all agents
- [ ] Integration tests for agent coordination
- [ ] End-to-end tests with mock EDA tools
- [ ] Performance benchmarks

**Day 4-5: Documentation**
- [ ] API documentation for all agents
- [ ] User guide for multi-agent features
- [ ] Architecture decision records (ADRs)

**Key Files:**
```
tests/
  ├── unit/agents/
  ├── integration/
  │   ├── agent-coordination.test.ts
  │   └── knowledge-base.test.ts
  └── e2e/
      └── workflow.test.ts

docs/
  ├── api/
  ├── user-guide/
  └── adr/
```

### Milestone 5: Production Ready
**Verification:**
```bash
# Run full test suite
npm test
# All tests pass

# Performance benchmarks
npm run benchmark
# Meets targets: <100ms agent response, <500ms KB query

# Build for production
npm run build
# No errors, bundle size acceptable
```

---

## Phase 6: Advanced Features (Weeks 14-16)

### Goal
Add advanced features for full autonomy and self-improvement.

### Deliverables

#### Week 14: Autonomous Mode

**Day 1-2: Confidence-Based Execution**
- [ ] Implement confidence scoring for all agent decisions
- [ ] Create autonomous execution mode (no human approval)
- [ ] Add escalation thresholds

**Day 3-4: Continuous Optimization**
- [ ] Implement background optimization jobs
- [ ] Create automatic workflow improvement
- [ ] Add resource usage optimization

**Day 5: Safety & Guardrails**
- [ ] Implement comprehensive safety checks
- [ ] Add audit logging for all actions
- [ ] Create emergency stop mechanism

#### Week 15: Advanced Learning

**Day 1-2: Cross-Project Learning**
- [ ] Implement knowledge sharing across projects
- [ ] Create project-agnostic pattern extraction
- [ ] Add organization-wide knowledge base

**Day 3-4: Predictive Optimization**
- [ ] Implement PPA prediction models
- [ ] Create proactive optimization suggestions
- [ ] Add trend analysis for design metrics

**Day 5: Meta-Learning**
- [ ] Implement agent strategy optimization
- [ ] Create learning rate adaptation
- [ ] Add exploration vs exploitation balancing

#### Week 16: Integration & Scale

**Day 1-2: CI/CD Integration**
- [ ] Create CLI commands for CI/CD pipelines
- [ ] Add batch mode execution
- [ ] Implement parallel workflow execution

**Day 3-4: Monitoring & Observability**
- [ ] Add comprehensive metrics collection
- [ ] Create agent performance dashboards
- [ ] Implement alerting for anomalies

**Day 5: Documentation & Training**
- [ ] Create video tutorials
- [ ] Write advanced user guide
- [ ] Add example workflows for common tasks

---

## Dependency Graph

```
Phase 0: Foundation
    │
    ├── Week 1: BaseAgent, MessageBus, StateMachine
    │       │
    │       ▼
    └── Week 2: KnowledgeBase, KnowledgeRetriever
            │
            ▼
Phase 1: Core Specialists
    │
    ├── Week 3: TerminalPerceptionAgent
    │       │
    │       ▼
    ├── Week 4: CommandSynthesisAgent
    │       │
    │       ▼
    └── Week 5: VerificationAgent, ExecutionAgent
            │
            ▼
Phase 2: Manager Agents
    │
    ├── Week 6: PlannerAgent
    │       │
    │       ▼
    └── Week 7: KnowledgeCuratorAgent
            │
            ▼
Phase 3: Orchestrator
    │
    ├── Week 8: OrchestratorAgent, TeamAssembler
    │       │
    │       ▼
    └── Week 9: LearningAgent, RecoveryAgent
            │
            ▼
Phase 4: Knowledge Seeding
    │
    ├── Week 10: Seed EDA knowledge
    │       │
    │       ▼
    └── Week 11: Experience capture pipeline
            │
            ▼
Phase 5: Integration & Polish
    │
    ├── Week 12: TUI integration
    │       │
    │       ▼
    └── Week 13: Testing & documentation
            │
            ▼
Phase 6: Advanced Features (optional)
```

---

## Risk Management

### High Priority Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Pinecone unavailable | Medium | High | Implement FAISS fallback; local SQLite for dev |
| LLM API rate limits | Medium | High | Implement caching, request batching, backoff |
| Agent coordination bugs | Medium | High | Comprehensive logging, deterministic replay |
| KB quality issues | Medium | Medium | Validation gates, human review workflow |

### Contingency Plans

**If Phase 0 takes longer than 2 weeks:**
- Scope reduction: Use in-memory message bus instead of persisted
- Simplified state machine with fewer transitions

**If knowledge seeding is incomplete:**
- Focus on single tool (Innovus) first
- Add other tools incrementally in maintenance sprints

**If performance targets not met:**
- Profile and optimize hot paths
- Consider agent pooling for reuse
- Implement request batching

---

## Success Metrics

### Phase Completion Criteria

| Phase | Completion Criteria | Verification Method |
|-------|--------------------|--------------------|
| 0 | All base classes functional | Unit tests pass |
| 1 | End-to-end command execution | Integration test passes |
| 2 | Complex workflow planning | CTS workflow test passes |
| 3 | Full autonomous execution | RTL-to-GDS test passes |
| 4 | Knowledge queries return results | KB query latency < 500ms |
| 5 | Production deployment ready | All tests pass, docs complete |

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Agent message latency | < 10ms | Message round-trip time |
| KB query latency | < 500ms | Vector search + retrieval |
| Command generation | < 2s | NL input → command output |
| Workflow planning | < 5s | Goal input → task graph |
| Error recovery | < 30s | Error detection → retry |

---

## Development Guidelines

### Code Standards

1. **Agent Implementation Pattern:**
```typescript
class MyAgent extends BaseAgent {
  async onMessage(msg: AgentMessage): Promise<void> {
    switch (msg.type) {
      case 'task.assign':
        await this.handleTask(msg.payload);
        break;
      case 'query.request':
        await this.handleQuery(msg.payload);
        break;
    }
  }

  private async handleTask(payload: TaskPayload): Promise<void> {
    // Implementation
    await this.sendResult(result);
  }
}
```

2. **Knowledge Entry Pattern:**
```typescript
const commandEntry: CommandEntry = {
  id: 'innovus_place_opt_v1',
  tool: 'innovus',
  category: 'placement',
  command: 'place_opt_design',
  description: 'Run placement optimization',
  parameters: [
    { name: '-area', type: 'boolean', optional: true }
  ],
  successIndicators: ['Placement complete', '0 errors'],
  relatedCommands: ['optDesign', 'place_design'],
  metadata: {
    createdAt: new Date(),
    verified: true,
    usageCount: 42
  }
};
```

### Testing Requirements

- All agents must have unit tests with mocked dependencies
- Integration tests for agent coordination
- End-to-end tests with recorded terminal sessions
- Performance benchmarks for KB operations

### Documentation Requirements

- JSDoc for all public APIs
- Architecture Decision Records for major choices
- User-facing documentation for new features

---

## Appendix: Quick Reference

### Agent Responsibilities

| Agent | Primary Role | Key Methods |
|-------|-------------|-------------|
| Orchestrator | Goal decomposition | `executeGoal()`, `assembleTeam()` |
| Planner | Task sequencing | `createPlan()`, `replan()` |
| KnowledgeCurator | RAG coordination | `retrieveContext()`, `storeKnowledge()` |
| TerminalPerception | State detection | `detectTool()`, `parseOutput()` |
| CommandSynthesis | NL2SL translation | `generateCommand()`, `validateSyntax()` |
| Verification | Result validation | `verify()`, `assessQuality()` |
| Execution | Safe execution | `execute()`, `manageResources()` |
| Learning | Pattern extraction | `extractPattern()`, `updateKnowledge()` |
| Recovery | Error handling | `diagnose()`, `proposeRecovery()` |

### Knowledge Base Indices

| Index | Purpose | Key Fields |
|-------|---------|------------|
| commands | Command retrieval | tool, category, command, description |
| errors | Error recovery | error_type, symptom_pattern, solution |
| workflows | Template retrieval | task_type, command_sequence, success_rate |
| patterns | Learned patterns | pattern_type, context, confidence |

### Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| `task.assign` | Manager → Specialist | Assign work |
| `task.complete` | Specialist → Manager | Report completion |
| `query.knowledge` | Any → KnowledgeCurator | Request information |
| `event.terminal` | TerminalPerception → All | State change notification |
| `recovery.request` | Any → Recovery | Ask for help |
| `learn.capture` | Any → Learning | Share experience |
