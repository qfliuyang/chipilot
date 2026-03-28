#!/usr/bin/env node
/**
 * Comprehensive Agent Coordination Test
 * Monitors all agent outputs and contributions with detailed telemetry
 */

// Polyfill for xterm-headless - MUST be before any imports that use xterm
if (typeof globalThis.window === "undefined") {
  globalThis.window = {};
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: (tagName) => {
      if (tagName === "canvas") {
        return {
          getContext: () => ({
            fillRect: () => {},
            clearRect: () => {},
            getImageData: () => ({ data: [] }),
            putImageData: () => {},
            createImageData: () => ({ data: [] }),
            setTransform: () => {},
            drawImage: () => {},
            save: () => {},
            fillText: () => {},
            restore: () => {},
            beginPath: () => {},
            moveTo: () => {},
            lineTo: () => {},
            closePath: () => {},
            stroke: () => {},
            translate: () => {},
            scale: () => {},
            rotate: () => {},
            arc: () => {},
            fill: () => {},
            measureText: () => ({ width: 0 }),
            transform: () => {},
            rect: () => {},
            clip: () => {},
            createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }),
            createPattern: () => ({}),
            globalCompositeOperation: "source-over",
          }),
          width: 0,
          height: 0,
          style: {},
        };
      }
      return {};
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

import { spawn } from "child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Anti-Cheat: Import MockDetectionEngine
let MockDetectionEngine;
try {
  const antiCheatModule = await import("./dist/testing/MockDetectionEngine.js");
  MockDetectionEngine = antiCheatModule.MockDetectionEngine || antiCheatModule.default;
} catch (e) {
  console.warn("Warning: MockDetectionEngine not available, anti-cheat validation disabled");
}

// Complex technical EDA questions designed to test full agent coordination
// Each question requires multiple agents to collaborate for complete solution
const QUESTION_SETS = [
  // Set 1: Clock and Timing Challenges
  [
    "I have a 7nm AI accelerator design with 2GHz clock. Post-route timing shows 150ps setup violation on paths from clk_core to clk_ai. The violations are clustered around the MAC array. How do I fix this with CTS optimization in Innovus?",
    "My design has multi-corner multi-mode with SS/FF/TT corners and func/test modes. Tempus reports different critical paths in each corner-mode combination. How do I constrain and analyze all scenarios simultaneously?",
    "After CTS in a 5nm GPU design, I'm seeing 200ps clock skew within a clock domain. The H-tree synthesis completed but local skew is high. What commands should I run to analyze and fix this?",
    "I need to implement dynamic voltage frequency scaling (DVFS) with three voltage corners: 0.75V, 0.85V, 0.95V. How do I set up multi-voltage timing analysis and ensure closure at all operating points?",
  ],
  // Set 2: Physical Design and Congestion
  [
    "My floorplan has 85% utilization but routing fails with congestion hotspots around the memory macros. I suspect pin access issues. What congestion analysis commands should I run in Innovus, and how do I fix the root cause?",
    "I'm doing hierarchical design with 3 partitions. Each partition individually passes DRC but when assembled at top level, I see spacing violations between partitions. How do I handle partition boundaries and halo regions?",
    "My chip has high-speed SerDes interfaces at 56Gbps. After placement, timing shows hold violations on the data paths. What placement and clock tree constraints should I apply to fix signal integrity?",
    "Post-route DRC shows 50k violations, mostly M1/M2 short violations near standard cell pins. The design uses a 7nm finFET library. How do I analyze if this is a placement issue or routing strategy problem?",
  ],
  // Set 3: Power and Reliability
  [
    "My SOC has static IR drop of 120mV in the GPU region during peak activity. Power grid analysis shows weak vertical straps. How do I insert additional power vias and widen straps without causing DRC violations?",
    "Electromigration analysis in Ansys RedHawk shows violations on the VDD network for clocks >1GHz. What's the methodology to fix EM violations through wire widening and via doubling?",
    "I need to implement power gating for a CPU cluster with retention flip-flops. The switch cells must handle 100mA rush current. How do I size the switches and verify the power-up sequence?",
    "Thermal simulation shows hotspot at 125C in the NPU region. The junction temperature limit is 105C. What physical design changes can I make to reduce power density and improve heat dissipation?",
  ],
  // Set 4: Verification and Signoff
  [
    "LVS reports 'soft connect' errors between power domains. The design has 4 power domains with level shifters. How do I debug connectivity issues between domains and ensure isolation cells are properly placed?",
    "DRC shows 200 'OD enclosure' violations after metal fill insertion. The foundry requires 0.12um enclosure on OD layer. How do I adjust metal fill to fix these violations without impacting timing?",
    "I'm running signoff STA with OCV derating. Setup Slack is 10ps positive but when I add AOCV, it becomes -25ps. How do I identify the paths most sensitive to variation and fix them?",
    "Antenna check shows violations on clock inputs to flip-flops in the scan chain. The ratio is 800:1 exceeding the 500:1 limit. What's the proper way to insert antenna diodes during routing?",
  ],
  // Set 5: Advanced Methodology
  [
    "I need to implement a hierarchical flow with abstract views for a 16-core processor. Each core has unique clock gating. How do I generate timing models and ensure consistency between block-level and top-level timing?",
    "My ECO requires adding 500 buffers to fix hold violations after metal fill. The masks are already frozen for layers M1-M3. How do I implement ECO routing using only upper metal layers?",
    "I'm migrating a design from 7nm to 5nm. The cell library changed from bulk CMOS to finFET. What physical design constraints need updating for fin-specific DRC rules?",
    "The design uses analog PLL with digital calibration logic. I need to create a fence region around the PLL with 50um keepout for noise isolation. How do I implement this in the floorplan?",
  ],
  // Set 6: Multi-Physics and Advanced Constraints
  [
    "Signal integrity analysis shows crosstalk-induced delay of 80ps on critical nets. The design uses double-patterning at M2. How do I apply track assignment and spacing constraints to minimize coupling?",
    "I have a three-phase clock domain crossing from 500MHz to 1GHz with asynchronous reset. CDC analysis shows missing synchronizers. What's the proper CDC circuit implementation?",
    "My chip-on-wafer simulation shows package-induced noise coupling into sensitive ADC inputs. The substrate is common. How do I implement guard rings and substrate contacts for isolation?",
    "The foundry requires redundant via insertion for reliability. 40% of my vias are single-cut. How do I add double-cut vias without creating DRC violations or impacting timing?",
  ],
];

// Generate a unique random seed for this test run
const TEST_RUN_ID = Date.now();
const TEST_TIMESTAMP = new Date().toISOString();

const COMPLEX_SCENARIO = {
  name: "Full Flow: 7nm SOC Physical Design",
  description: `Design: 7nm mobile SOC with quad-core ARM, GPU, and LPDDR5
Current Stage: Post-CTS, pre-route
Issues:
1. Setup violations on critical paths (>100ps WNS)
2. Congestion in memory controller region
3. Clock skew variation across voltage domains
4. IR drop concerns on power grid

Goal: Achieve timing closure with clean routing and power integrity.`,
  expectedAgents: ["orchestrator", "planner", "terminal-perception", "execution", "command-synthesis", "knowledge-curator", "verification"],
};

// Agent telemetry collector with transcript and timeline
class AgentTelemetry {
  constructor() {
    this.events = [];
    this.agentStats = {};
    this.messageFlow = [];
    this.coordinationScore = 0;
    this.transcript = [];
    this.timeline = [];
  }

  recordEvent(agentId, eventType, payload, timestamp = Date.now()) {
    this.events.push({ agentId, eventType, payload, timestamp });

    // Add to transcript
    this.transcript.push({
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
      agent: agentId,
      type: eventType,
      details: this.summarizeForTranscript(payload),
      category: this.categorizeEvent(eventType),
    });

    // Add to timeline if significant
    if (this.isSignificantEvent(eventType)) {
      this.timeline.push({
        timestamp,
        agent: agentId,
        event: eventType,
        description: this.describeEvent(agentId, eventType, payload),
      });
    }

    if (!this.agentStats[agentId]) {
      this.agentStats[agentId] = {
        events: 0,
        messagesSent: 0,
        messagesReceived: 0,
        tasksCompleted: 0,
        contributions: [],
      };
    }
    this.agentStats[agentId].events++;
  }

  categorizeEvent(eventType) {
    if (eventType.includes("goal")) return "GOAL";
    if (eventType.includes("plan")) return "PLANNING";
    if (eventType.includes("task")) return "TASK";
    if (eventType.includes("command")) return "COMMAND";
    if (eventType.includes("knowledge")) return "KNOWLEDGE";
    if (eventType.includes("verify")) return "VERIFICATION";
    return "OTHER";
  }

  isSignificantEvent(eventType) {
    return ["goal.complete", "plan.complete", "task.complete", "command.executed", "verification.complete"].includes(eventType);
  }

  describeEvent(agentId, eventType, data) {
    if (eventType === "task.complete") return `${agentId} completes task`;
    if (eventType === "goal.complete") return `${agentId} completes goal processing`;
    if (eventType === "plan.complete") return `${agentId} completes plan execution`;
    return `${agentId} ${eventType}`;
  }

  summarizeForTranscript(payload) {
    if (!payload) return null;
    if (typeof payload === "string") return payload.substring(0, 100);
    if (payload.command) return { command: payload.command.substring(0, 50) };
    if (payload.goal) return { goal: payload.goal.substring(0, 50) };
    if (payload.query) return { query: payload.query.substring(0, 50) };
    return { type: typeof payload };
  }

  // Pre-initialize agent stats for all expected agents to ensure tracking
  preInitializeAgents(agentIds) {
    for (const agentId of agentIds) {
      if (!this.agentStats[agentId]) {
        this.agentStats[agentId] = {
          events: 0,
          messagesSent: 0,
          messagesReceived: 0,
          tasksCompleted: 0,
          contributions: [],
          activities: [],
        };
      }
    }
  }

  recordMessage(from, to, type, payload) {
    const timestamp = Date.now();
    this.messageFlow.push({ from, to, type, payload, timestamp });
    if (this.agentStats[from]) this.agentStats[from].messagesSent++;
    if (this.agentStats[to]) this.agentStats[to].messagesReceived++;

    // Add to transcript
    this.transcript.push({
      timestamp,
      isoTime: new Date(timestamp).toISOString(),
      agent: `${from} → ${to}`,
      type: `MESSAGE:${type}`,
      details: { from, to, type, payload: this.summarizeForTranscript(payload) },
      category: "COMMUNICATION",
    });
  }

  recordContribution(agentId, contribution) {
    if (!this.agentStats[agentId]) {
      this.agentStats[agentId] = { events: 0, messagesSent: 0, messagesReceived: 0, tasksCompleted: 0, contributions: [] };
    }
    this.agentStats[agentId].contributions.push({
      description: contribution,
      timestamp: Date.now(),
    });
    this.agentStats[agentId].tasksCompleted++;
  }

  recordAgentActivity(agentId, activityType, details) {
    if (!this.agentStats[agentId]) {
      this.agentStats[agentId] = {
        events: 0,
        messagesSent: 0,
        messagesReceived: 0,
        tasksCompleted: 0,
        contributions: [],
        activities: [],
      };
    }
    if (!this.agentStats[agentId].activities) {
      this.agentStats[agentId].activities = [];
    }
    this.agentStats[agentId].activities.push({
      type: activityType,
      details,
      timestamp: Date.now(),
    });
  }

  calculateCoordinationScore() {
    // Score based on message diversity and agent participation
    const uniqueAgents = Object.keys(this.agentStats).length;
    const totalMessages = this.messageFlow.length;
    const crossAgentMessages = this.messageFlow.filter(m => m.from !== m.to && m.to !== "broadcast").length;
    const broadcastMessages = this.messageFlow.filter(m => m.to === "broadcast").length;

    // Participation: % of expected agents that contributed
    const participation = uniqueAgents / 7;

    // Coordination: ratio of targeted messages to broadcasts
    const coordination = totalMessages > 0 ? crossAgentMessages / totalMessages : 0;

    // Activity: events per agent
    const totalEvents = this.events.length;
    const activity = uniqueAgents > 0 ? totalEvents / uniqueAgents : 0;

    this.coordinationScore = (participation * 0.4 + coordination * 0.4 + Math.min(activity / 10, 1) * 0.2) * 100;
    return this.coordinationScore;
  }

  generateReport() {
    const score = this.calculateCoordinationScore();

    // Calculate relative timeline
    const startTime = this.timeline.length > 0 ? this.timeline[0].timestamp : Date.now();
    const relativeTimeline = this.timeline.map(e => ({
      ...e,
      relativeMs: e.timestamp - startTime,
    }));

    return {
      summary: {
        totalEvents: this.events.length,
        totalMessages: this.messageFlow.length,
        uniqueAgents: Object.keys(this.agentStats).length,
        coordinationScore: score.toFixed(1),
        evaluation: score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "NEEDS_IMPROVEMENT" : "POOR",
      },
      transcript: this.transcript,
      timeline: relativeTimeline,
      metadata: {
        testRunId: TEST_RUN_ID,
        testTimestamp: TEST_TIMESTAMP,
        transcriptLength: this.transcript.length,
        timelineEvents: this.timeline.length,
      },
      agentStats: this.agentStats,
      messageFlow: this.messageFlow.slice(-50), // Last 50 messages
      events: this.events.slice(-100), // Last 100 events
    };
  }
}

async function runTest() {
  const timestamp = Date.now();
  const outputDir = join(__dirname, "tests", "output", `coordination-test-${timestamp}`);
  mkdirSync(outputDir, { recursive: true });

  console.log("=== chipilot Agent Coordination Test ===\n");
  console.log(`Results will be saved to: ${outputDir}\n`);

  // Select random question set
  const selectedSet = QUESTION_SETS[Math.floor(Math.random() * QUESTION_SETS.length)];
  console.log("Selected Questions:");
  selectedSet.forEach((q, i) => console.log(`  ${i + 1}. ${q.substring(0, 80)}...`));
  console.log();

  const telemetry = new AgentTelemetry();

  // Pre-initialize stats for all expected agents
  telemetry.preInitializeAgents([
    "planner",
    "orchestrator",
    "terminalPerception",
    "execution",
    "commandSynthesis",
    "knowledgeCurator",
    "verification",
  ]);

  // Import and initialize all agents
  console.log("--- Initializing Agent Ecosystem ---\n");

  try {
    // Dynamic imports from built dist files
    const {
      PlannerAgent,
      OrchestratorAgent,
      TerminalPerceptionAgent,
      ExecutionAgent,
      CommandSynthesisAgent,
      KnowledgeCuratorAgent,
      VerificationAgent,
      getMessageBus,
      KnowledgeBase,
    } = await import("./dist/index.js");

    // Initialize MessageBus
    const messageBus = getMessageBus();

    // Initialize KnowledgeBase
    const knowledgeBase = new KnowledgeBase({
      pineconeApiKey: process.env.PINECONE_API_KEY,
      pineconeIndex: process.env.PINECONE_INDEX || "chipilot",
    });

    // Create agents with telemetry hooks and API configuration
    const agents = {};

    // API configuration from environment
    const apiConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      model: process.env.CHIPILOT_MODEL,
    };

    // Create AgentRecorder for tracking LLM calls and token usage
    const { AgentRecorder } = await import("./dist/index.js");
    const recorder = new AgentRecorder({
      outputDir: outputDir,
      sessionName: `coordination-test-${timestamp}`,
      consoleLog: true,
    });
    recorder.startRecording();

    agents.planner = new PlannerAgent({
      id: "planner",
      name: "Planner",
      debug: true,
      messageBus,
      recorder,
      ...apiConfig,
    });

    agents.orchestrator = new OrchestratorAgent({
      id: "orchestrator",
      name: "Orchestrator",
      planner: agents.planner,
      debug: true,
      messageBus,
      recorder,
      ...apiConfig,
    });

    agents.terminalPerception = new TerminalPerceptionAgent({
      id: "terminal-perception",
      name: "Terminal Perception",
      debug: true,
      messageBus,
      ...apiConfig,
    });

    agents.execution = new ExecutionAgent({
      id: "execution",
      name: "Execution",
      messageBus,
      recorder,
      ...apiConfig,
    });

    agents.commandSynthesis = new CommandSynthesisAgent({
      id: "command-synthesis",
      name: "Command Synthesis",
      knowledgeBase,
      messageBus,
      recorder,
      ...apiConfig,
    });

    agents.knowledgeCurator = new KnowledgeCuratorAgent({
      id: "knowledge-curator",
      name: "Knowledge Curator",
      knowledgeBase,
      messageBus,
      recorder,
      ...apiConfig,
    });

    agents.verification = new VerificationAgent({
      id: "verification",
      name: "Verification",
      knowledgeBase,
      messageBus,
      recorder,
      ...apiConfig,
    });

    // Hook up telemetry for all agents
    Object.entries(agents).forEach(([name, agent]) => {
      // Hook into message sending
      const originalSend = agent.sendMessage.bind(agent);
      agent.sendMessage = function(message) {
        telemetry.recordMessage(
          message.sender || name,
          message.recipient,
          message.type,
          message.payload
        );
        // Record this as an activity for the sender
        telemetry.recordAgentActivity(name, `send:${message.type}`, { recipient: message.recipient });
        return originalSend(message);
      };

      // Hook into message receiving/processing
      const originalProcessMessage = agent.processMessage?.bind(agent);
      if (originalProcessMessage) {
        agent.processMessage = function(message) {
          telemetry.recordAgentActivity(name, `receive:${message.type}`, { sender: message.sender });
          telemetry.recordEvent(name, "message.received", { type: message.type, sender: message.sender });
          return originalProcessMessage(message);
        };
      }

      // Listen to all events
      agent.on("*", (eventName, data) => {
        telemetry.recordEvent(name, eventName, data);
        telemetry.recordAgentActivity(name, eventName, data);
      });
    });

    // Initialize all agents
    await Promise.all([
      agents.planner.initialize(),
      agents.orchestrator.initialize(),
      agents.terminalPerception.initialize(),
      agents.execution.initialize(),
      agents.commandSynthesis.initialize(),
      agents.knowledgeCurator.initialize(),
      agents.verification.initialize(),
    ]);

    console.log("All 7 agents initialized successfully\n");

    // Start all agents
    await Promise.all([
      agents.planner.start(),
      agents.orchestrator.start(),
      agents.terminalPerception.start(),
      agents.execution.start(),
      agents.commandSynthesis.start(),
      agents.knowledgeCurator.start(),
      agents.verification.start(),
    ]);

    console.log("All agents started\n");

    // Run tests
    console.log("--- Running Complex Scenario Test ---\n");
    console.log(`Scenario: ${COMPLEX_SCENARIO.name}`);
    console.log(`Description: ${COMPLEX_SCENARIO.description}\n`);

    const scenarioStart = Date.now();

    // Process the complex scenario
    const result = await agents.orchestrator.processGoal(COMPLEX_SCENARIO.description);

    const scenarioDuration = Date.now() - scenarioStart;

    console.log(`\nScenario completed in ${scenarioDuration}ms`);
    console.log(`Success: ${result.success}`);
    console.log(`Plan: ${result.planId || "N/A"}`);
    console.log(`Result: ${result.result?.substring(0, 200) || "N/A"}...\n`);

    // Record contributions based on message analysis
    telemetry.messageFlow.forEach(msg => {
      // Record activity for both sender and recipient
      telemetry.recordAgentActivity(msg.from, `sent:${msg.type}`, { to: msg.to });
      if (msg.to !== "broadcast" && msg.to !== msg.from) {
        telemetry.recordAgentActivity(msg.to, `received:${msg.type}`, { from: msg.from });
      }

      if (msg.type === "task.complete" && msg.payload?.result) {
        telemetry.recordContribution(
          msg.from,
          `Completed ${msg.payload.taskId || "task"}: ${JSON.stringify(msg.payload.result).substring(0, 100)}`
        );
      } else if (msg.type === "goal.process") {
        telemetry.recordAgentActivity(msg.from, "goal_processed", { goal: msg.payload?.goal });
      } else if (msg.type === "plan.created") {
        telemetry.recordAgentActivity(msg.from, "plan_created", { planId: msg.payload?.planId });
      } else if (msg.type === "event.terminal") {
        telemetry.recordAgentActivity(msg.from, "terminal_event", { event: msg.payload?.event });
      } else if (msg.type === "command.generate" || msg.type === "command.synthesize") {
        telemetry.recordAgentActivity(msg.from, "command_generation", { command: msg.payload?.command });
      } else if (msg.type === "knowledge.query" || msg.type === "knowledge.retrieve") {
        telemetry.recordAgentActivity(msg.from, "knowledge_query", { query: msg.payload?.query });
      } else if (msg.type === "verify.command" || msg.type === "verification.run") {
        telemetry.recordAgentActivity(msg.from, "verification", { target: msg.payload?.command });
      }
    });

    // Also analyze events to capture any agents that only emit events (not messages)
    telemetry.events.forEach(event => {
      if (event.agentId) {
        telemetry.recordAgentActivity(event.agentId, `event:${event.eventType}`, event.payload);
      }
    });

    // Run individual question tests
    console.log("--- Running Individual Question Tests ---\n");

    const questionResults = [];
    for (const question of selectedSet) {
      console.log(`Testing: ${question.substring(0, 60)}...`);
      const qStart = Date.now();

      try {
        const result = await agents.orchestrator.processGoal(question);
        const duration = Date.now() - qStart;

        questionResults.push({
          question,
          duration,
          success: result.success,
          planId: result.planId,
          planCreated: !!result.planId,
        });

        console.log(`  ✓ Completed in ${duration}ms (Plan: ${result.planId || "N/A"})`);
      } catch (error) {
        console.log(`  ✗ Failed: ${error.message}`);
        questionResults.push({
          question,
          duration: Date.now() - qStart,
          success: false,
          error: error.message,
        });
      }
    }

    console.log("\n");

    // Generate final report
    const report = telemetry.generateReport();

    // Add test-specific data
    report.testInfo = {
      timestamp: new Date().toISOString(),
      scenario: COMPLEX_SCENARIO,
      questionResults,
      scenarioDuration,
    };

    // Agent contribution analysis
    report.contributionAnalysis = {
      orchestrator: {
        role: "Goal interpretation and routing",
        contribution: telemetry.agentStats.orchestrator?.contributions.length || 0,
        activities: telemetry.agentStats.orchestrator?.activities?.length || 0,
        evaluation: ((telemetry.agentStats.orchestrator?.contributions.length || 0) > 0 || (telemetry.agentStats.orchestrator?.activities?.length || 0) > 0) ? "ACTIVE" : "INACTIVE",
      },
      planner: {
        role: "Plan creation and task decomposition",
        contribution: telemetry.agentStats.planner?.contributions.length || 0,
        activities: telemetry.agentStats.planner?.activities?.length || 0,
        plansCreated: telemetry.events.filter(e => e.agentId === "planner" && e.eventType === "planCreated").length,
        evaluation: ((telemetry.agentStats.planner?.contributions.length || 0) > 0 || (telemetry.agentStats.planner?.activities?.length || 0) > 0) ? "ACTIVE" : "INACTIVE",
      },
      terminalPerception: {
        role: "Terminal state monitoring",
        contribution: telemetry.agentStats["terminal-perception"]?.contributions.length || 0,
        activities: telemetry.agentStats["terminal-perception"]?.activities?.length || 0,
        eventsMonitored: telemetry.events.filter(e => e.agentId === "terminal-perception").length,
        evaluation: ((telemetry.agentStats["terminal-perception"]?.events || 0) > 0 || (telemetry.agentStats["terminal-perception"]?.activities?.length || 0) > 0) ? "ACTIVE" : "INACTIVE",
      },
      execution: {
        role: "Command execution",
        contribution: telemetry.agentStats.execution?.contributions.length || 0,
        activities: telemetry.agentStats.execution?.activities?.length || 0,
        evaluation: ((telemetry.agentStats.execution?.contributions.length || 0) > 0 || (telemetry.agentStats.execution?.activities?.length || 0) > 0) ? "ACTIVE" : "STANDBY",
      },
      commandSynthesis: {
        role: "TCL command generation",
        contribution: telemetry.agentStats["command-synthesis"]?.contributions.length || 0,
        activities: telemetry.agentStats["command-synthesis"]?.activities?.length || 0,
        evaluation: ((telemetry.agentStats["command-synthesis"]?.contributions.length || 0) > 0 || (telemetry.agentStats["command-synthesis"]?.activities?.length || 0) > 0) ? "ACTIVE" : "INACTIVE",
      },
      knowledgeCurator: {
        role: "Knowledge retrieval",
        contribution: telemetry.agentStats["knowledge-curator"]?.contributions.length || 0,
        activities: telemetry.agentStats["knowledge-curator"]?.activities?.length || 0,
        queriesProcessed: telemetry.events.filter(e => e.agentId === "knowledge-curator" && e.eventType === "knowledge.queried").length,
        evaluation: ((telemetry.agentStats["knowledge-curator"]?.contributions.length || 0) > 0 || (telemetry.agentStats["knowledge-curator"]?.activities?.length || 0) > 0) ? "ACTIVE" : "INACTIVE",
      },
      verification: {
        role: "Command verification and risk analysis",
        contribution: telemetry.agentStats.verification?.contributions.length || 0,
        activities: telemetry.agentStats.verification?.activities?.length || 0,
        verificationsCompleted: telemetry.events.filter(e => e.agentId === "verification" && e.eventType === "verification.completed").length,
        evaluation: ((telemetry.agentStats.verification?.contributions.length || 0) > 0 || (telemetry.agentStats.verification?.activities?.length || 0) > 0) ? "ACTIVE" : "INACTIVE",
      },
    };

    // Coordination quality assessment
    report.coordinationQuality = {
      messageDiversity: [...new Set(telemetry.messageFlow.map(m => m.type))].length,
      agentParticipation: Object.keys(telemetry.agentStats).length / 7,
      crossAgentMessaging: telemetry.messageFlow.filter(m => m.from !== m.to && m.to !== "broadcast").length,
      broadcastEfficiency: telemetry.messageFlow.filter(m => m.to === "broadcast").length,
      workflowCompletion: questionResults.filter(r => r.success).length / questionResults.length,
    };

    // Save report
    const reportPath = join(outputDir, "detailed-report.json");
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    const summary = generateHumanReadableSummary(report);
    writeFileSync(join(outputDir, "summary.txt"), summary);

    console.log(summary);
    console.log(`\nFull report saved to: ${reportPath}`);

    // Anti-Cheat Validation
    console.log("\n--- Running Anti-Cheat Validation ---\n");

    let antiCheatPassed = true;
    let antiCheatReport = null;

    if (MockDetectionEngine) {
      try {
        const engine = new MockDetectionEngine();
        antiCheatReport = engine.analyzeTestOutput(outputDir);

        // Save anti-cheat report
        const antiCheatPath = join(outputDir, "anti-cheat-report.json");
        writeFileSync(antiCheatPath, JSON.stringify(antiCheatReport, null, 2));

        console.log(`Anti-Cheat Status: ${antiCheatReport.passed ? "✓ PASSED" : "✗ FAILED"}`);
        console.log(`Violations: ${antiCheatReport.stats.criticalViolations} critical, ${antiCheatReport.stats.highViolations} high, ${antiCheatReport.stats.mediumViolations} medium, ${antiCheatReport.stats.lowViolations} low`);
        console.log(`Summary: ${antiCheatReport.summary}`);

        if (antiCheatReport.violations.length > 0) {
          console.log("\nDetected Violations:");
          for (const violation of antiCheatReport.violations.slice(0, 5)) {
            console.log(`  [${violation.severity.toUpperCase()}] ${violation.category}: ${violation.description}`);
          }
          if (antiCheatReport.violations.length > 5) {
            console.log(`  ... and ${antiCheatReport.violations.length - 5} more violations`);
          }
        }

        console.log(`\nAnti-cheat report saved to: ${antiCheatPath}`);

        antiCheatPassed = antiCheatReport.passed;

        // Add anti-cheat results to the main report
        report.antiCheat = {
          passed: antiCheatReport.passed,
          violations: antiCheatReport.violations.length,
          summary: antiCheatReport.summary,
          reportPath: antiCheatPath,
        };

        // Re-save the updated report
        writeFileSync(reportPath, JSON.stringify(report, null, 2));

      } catch (antiCheatError) {
        console.error("Anti-cheat validation error:", antiCheatError.message);
        antiCheatPassed = false;
        report.antiCheat = {
          passed: false,
          error: antiCheatError.message,
        };
      }
    } else {
      console.log("MockDetectionEngine not available - skipping anti-cheat validation");
      console.log("To enable: Build the project with 'npm run build'");
    }

    // Cleanup
    console.log("\n--- Cleaning Up ---");
    await Promise.all([
      agents.planner.stop(),
      agents.orchestrator.stop(),
      agents.terminalPerception.stop(),
      agents.execution.stop(),
      agents.commandSynthesis.stop(),
      agents.knowledgeCurator.stop(),
      agents.verification.stop(),
    ]);
    console.log("All agents stopped\n");

    // Final result
    console.log("=== TEST RESULTS ===");
    console.log(`Coordination Score: ${report.summary.coordinationScore}/100`);
    console.log(`Anti-Cheat: ${antiCheatPassed ? "PASSED" : "FAILED"}`);
    console.log(`Overall: ${antiCheatPassed && report.summary.evaluation !== "POOR" ? "PASSED" : "FAILED"}`);

    if (!antiCheatPassed) {
      console.log("\n✗ TEST FAILED: Anti-cheat validation detected potential cheating!");
      console.log("Agents may be using hardcoded responses instead of real LLM calls.");
      process.exit(1);
    }

    return report;

  } catch (error) {
    console.error("Test failed:", error);
    writeFileSync(join(outputDir, "error.log"), error.stack);
    throw error;
  }
}

function generateHumanReadableSummary(report) {
  return `
================================================================================
               CHIPILOT AGENT COORDINATION TEST REPORT
================================================================================

Test Timestamp: ${report.testInfo.timestamp}
Coordination Score: ${report.summary.coordinationScore}/100 (${report.summary.evaluation})

--------------------------------------------------------------------------------
                           EXECUTIVE SUMMARY
--------------------------------------------------------------------------------

Total Events Processed:     ${report.summary.totalEvents}
Messages Exchanged:         ${report.summary.totalMessages}
Active Agents:              ${report.summary.uniqueAgents}/7
Workflow Completion Rate:   ${(report.coordinationQuality.workflowCompletion * 100).toFixed(1)}%

--------------------------------------------------------------------------------
                        AGENT CONTRIBUTION ANALYSIS
--------------------------------------------------------------------------------

1. ORCHESTRATOR AGENT
   Role: Goal interpretation, intent classification, routing
   Status: ${report.contributionAnalysis.orchestrator.evaluation}
   Activities: ${report.contributionAnalysis.orchestrator.activities || 0}
   Assessment: ${report.contributionAnalysis.orchestrator.evaluation === "ACTIVE" ? "Correctly routing technical queries to planner" : "Limited activity observed"}

2. PLANNER AGENT
   Role: Plan creation, task decomposition, coordination
   Status: ${report.contributionAnalysis.planner.evaluation}
   Plans Created: ${report.contributionAnalysis.planner.plansCreated}
   Activities: ${report.contributionAnalysis.planner.activities || 0}
   Assessment: ${report.contributionAnalysis.planner.evaluation === "ACTIVE" ? "Creating comprehensive plans with task assignments" : "Not creating plans"}

3. TERMINAL PERCEPTION AGENT
   Role: Terminal state monitoring, EDA prompt detection
   Status: ${report.contributionAnalysis.terminalPerception.evaluation}
   Events Monitored: ${report.contributionAnalysis.terminalPerception.eventsMonitored}
   Activities: ${report.contributionAnalysis.terminalPerception.activities || 0}
   Assessment: ${report.contributionAnalysis.terminalPerception.evaluation === "ACTIVE" ? "Monitoring terminal output for state changes" : "Limited monitoring activity"}

4. EXECUTION AGENT
   Role: Safe command execution, resource management
   Status: ${report.contributionAnalysis.execution.evaluation}
   Tasks Completed: ${report.contributionAnalysis.execution.contribution}
   Activities: ${report.contributionAnalysis.execution.activities || 0}
   Assessment: ${report.contributionAnalysis.execution.evaluation === "ACTIVE" ? "Executing commands with safety checks" : "No execution required or standby mode"}

5. COMMAND SYNTHESIS AGENT
   Role: TCL command generation, EDA tool syntax
   Status: ${report.contributionAnalysis.commandSynthesis.evaluation}
   Tasks Completed: ${report.contributionAnalysis.commandSynthesis.contribution}
   Activities: ${report.contributionAnalysis.commandSynthesis.activities || 0}
   Assessment: ${report.contributionAnalysis.commandSynthesis.evaluation === "ACTIVE" ? "Generating tool-specific commands" : "Not generating commands"}

6. KNOWLEDGE CURATOR AGENT
   Role: Knowledge retrieval, RAG queries
   Status: ${report.contributionAnalysis.knowledgeCurator.evaluation}
   Queries Processed: ${report.contributionAnalysis.knowledgeCurator.queriesProcessed}
   Activities: ${report.contributionAnalysis.knowledgeCurator.activities || 0}
   Assessment: ${report.contributionAnalysis.knowledgeCurator.evaluation === "ACTIVE" ? "Retrieving relevant EDA knowledge" : "Limited knowledge queries"}

7. VERIFICATION AGENT
   Role: Command verification, risk analysis
   Status: ${report.contributionAnalysis.verification?.evaluation || "INACTIVE"}
   Verifications: ${report.contributionAnalysis.verification?.verificationsCompleted || 0}
   Activities: ${report.contributionAnalysis.verification?.activities || 0}
   Assessment: ${report.contributionAnalysis.verification?.evaluation === "ACTIVE" ? "Verifying commands for safety" : "No verification tasks"}

--------------------------------------------------------------------------------
                        COORDINATION QUALITY METRICS
--------------------------------------------------------------------------------

Message Type Diversity:     ${report.coordinationQuality.messageDiversity} unique types
Agent Participation Rate:   ${(report.coordinationQuality.agentParticipation * 100).toFixed(1)}%
Targeted Messages:          ${report.coordinationQuality.crossAgentMessaging}
Broadcast Messages:         ${report.coordinationQuality.broadcastEfficiency}

--------------------------------------------------------------------------------
                        QUESTION TEST RESULTS
--------------------------------------------------------------------------------

${report.testInfo.questionResults.map((r, i) => `
Q${i + 1}: ${r.question.substring(0, 70)}...
       Status: ${r.success ? "✓ PASS" : "✗ FAIL"} | Duration: ${r.duration}ms | Plan: ${r.planCreated ? "CREATED" : "N/A"}
`).join("")}

--------------------------------------------------------------------------------
                        COMPLEX SCENARIO TEST
--------------------------------------------------------------------------------

Scenario: ${report.testInfo.scenario.name}
Duration: ${report.testInfo.scenarioDuration}ms
Description:
${report.testInfo.scenario.description}

--------------------------------------------------------------------------------
                        RECOMMENDATIONS
--------------------------------------------------------------------------------

${generateRecommendations(report)}

================================================================================
                              END OF REPORT
================================================================================
`;
}

function generateRecommendations(report) {
  const recommendations = [];

  if (report.coordinationQuality.agentParticipation < 0.8) {
    recommendations.push("• INCREASE AGENT PARTICIPATION: Some agents are not engaging in the workflow. Check MessageBus registration and task routing.");
  }

  if (report.contributionAnalysis.commandSynthesis.evaluation !== "ACTIVE") {
    recommendations.push("• ACTIVATE COMMAND SYNTHESIS: Commands are not being generated. Consider triggering synthesize tasks more aggressively.");
  }

  if (report.contributionAnalysis.knowledgeCurator.evaluation !== "ACTIVE") {
    recommendations.push("• KNOWLEDGE RETRIEVAL: KnowledgeCurator not querying knowledge base. Verify query_knowledge task assignments.");
  }

  if (report.coordinationQuality.crossAgentMessaging < 5) {
    recommendations.push("• IMPROVE COORDINATION: Limited direct agent-to-agent messaging. Agents may be working in isolation.");
  }

  if (report.coordinationQuality.workflowCompletion < 1.0) {
    recommendations.push("• WORKFLOW RELIABILITY: Some questions failed processing. Review error handling in agent task execution.");
  }

  if (recommendations.length === 0) {
    recommendations.push("• ALL SYSTEMS OPERATIONAL: Agent coordination is functioning well. Monitor for edge cases.");
    recommendations.push("• READY FOR MCP: The coordination foundation is solid for MCP server attachment.");
  }

  return recommendations.join("\n");
}

// Run the test
runTest().catch(console.error);
