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
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Randomly selected challenging EDA questions
const QUESTION_SETS = [
  [
    "How do I optimize clock tree synthesis for a 500MHz ARM Cortex design in Innovus?",
    "What are the best practices for handling multi-corner multi-mode analysis in Tempus?",
    "How do I fix congestion issues in the routing stage when utilization is above 85%?",
    "What commands should I use to analyze and fix electromigration violations in ICC2?",
  ],
  [
    "How do I set up low power optimization with clock gating in Genus?",
    "What is the proper way to constrain async clock domain crossings in SDC?",
    "How do I perform ECO placement for cells after metal layer routing is complete?",
    "What steps should I take to close timing on a design with 50ps setup violations?",
  ],
  [
    "How do I generate abstract views for hierarchical floorplanning with macros?",
    "What is the methodology for SI-aware routing with crosstalk prevention?",
    "How do I analyze and fix hold time violations caused by clock skew?",
    "What commands verify LVS and DRC compliance before tapeout?",
  ],
  [
    "How do I optimize power grid insertion for IR drop mitigation?",
    "What is the best approach for scan chain insertion and optimization?",
    "How do I handle ESD protection and guard ring placement around IO cells?",
    "What methodology ensures signal integrity in high-speed DDR interfaces?",
  ],
];

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
  expectedAgents: ["orchestrator", "planner", "terminal-perception", "execution", "command-synthesis", "knowledge-curator"],
};

// Agent telemetry collector
class AgentTelemetry {
  constructor() {
    this.events = [];
    this.agentStats = {};
    this.messageFlow = [];
    this.coordinationScore = 0;
  }

  recordEvent(agentId, eventType, payload, timestamp = Date.now()) {
    this.events.push({ agentId, eventType, payload, timestamp });
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

  recordMessage(from, to, type, payload) {
    this.messageFlow.push({ from, to, type, payload, timestamp: Date.now() });
    if (this.agentStats[from]) this.agentStats[from].messagesSent++;
    if (this.agentStats[to]) this.agentStats[to].messagesReceived++;
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
    const participation = uniqueAgents / 6;

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

    return {
      summary: {
        totalEvents: this.events.length,
        totalMessages: this.messageFlow.length,
        uniqueAgents: Object.keys(this.agentStats).length,
        coordinationScore: score.toFixed(1),
        evaluation: score >= 80 ? "EXCELLENT" : score >= 60 ? "GOOD" : score >= 40 ? "NEEDS_IMPROVEMENT" : "POOR",
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

    // Create agents with telemetry hooks
    const agents = {};

    agents.planner = new PlannerAgent({
      id: "planner",
      name: "Planner",
      debug: true,
      messageBus,
    });

    agents.orchestrator = new OrchestratorAgent({
      id: "orchestrator",
      name: "Orchestrator",
      planner: agents.planner,
      debug: true,
      messageBus,
    });

    agents.terminalPerception = new TerminalPerceptionAgent({
      id: "terminal-perception",
      name: "Terminal Perception",
      debug: true,
      messageBus,
    });

    agents.execution = new ExecutionAgent({
      id: "execution",
      name: "Execution",
      messageBus,
    });

    agents.commandSynthesis = new CommandSynthesisAgent({
      id: "command-synthesis",
      name: "Command Synthesis",
      knowledgeBase,
      messageBus,
    });

    agents.knowledgeCurator = new KnowledgeCuratorAgent({
      id: "knowledge-curator",
      name: "Knowledge Curator",
      knowledgeBase,
      messageBus,
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
        return originalSend(message);
      };

      // Listen to all events
      agent.on("*", (eventName, data) => {
        telemetry.recordEvent(name, eventName, data);
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
    ]);

    console.log("All 6 agents initialized successfully\n");

    // Start all agents
    await Promise.all([
      agents.planner.start(),
      agents.orchestrator.start(),
      agents.terminalPerception.start(),
      agents.execution.start(),
      agents.commandSynthesis.start(),
      agents.knowledgeCurator.start(),
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
      } else {
        telemetry.recordEvent(msg.from, msg.type, msg.payload);
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
    };

    // Coordination quality assessment
    report.coordinationQuality = {
      messageDiversity: [...new Set(telemetry.messageFlow.map(m => m.type))].length,
      agentParticipation: Object.keys(telemetry.agentStats).length / 6,
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

    // Cleanup
    console.log("\n--- Cleaning Up ---");
    await Promise.all([
      agents.planner.stop(),
      agents.orchestrator.stop(),
      agents.terminalPerception.stop(),
      agents.execution.stop(),
      agents.commandSynthesis.stop(),
      agents.knowledgeCurator.stop(),
    ]);
    console.log("All agents stopped\n");

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
Active Agents:              ${report.summary.uniqueAgents}/6
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
