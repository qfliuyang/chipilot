/**
 * Agent Coordination Test Module
 *
 * Tests multi-agent coordination with detailed telemetry and anti-cheat validation.
 * Previously: test-coordination.mjs
 */

// CRITICAL: Apply polyfill synchronously at module load time
// This must run BEFORE any imports that could trigger xterm code
if (typeof globalThis.window === "undefined") {
  globalThis.window = {};
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: (tagName) => {
      if (tagName === "canvas") {
        return {
          getContext: () => ({
            fillRect: () => {}, clearRect: () => {}, getImageData: () => ({ data: [] }),
            putImageData: () => {}, createImageData: () => ({ data: [] }), setTransform: () => {},
            drawImage: () => {}, save: () => {}, fillText: () => {}, restore: () => {},
            beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {},
            stroke: () => {}, translate: () => {}, scale: () => {}, rotate: () => {},
            arc: () => {}, fill: () => {}, measureText: () => ({ width: 0 }), transform: () => {},
            rect: () => {}, clip: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
            createRadialGradient: () => ({ addColorStop: () => {} }), createPattern: () => ({}),
            globalCompositeOperation: "source-over"
          }), width: 0, height: 0, style: {}
        };
      }
      return {};
    },
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => []
  };
}

import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Run agent coordination test
 * @param {string} outputDir - Output directory for test artifacts
 * @param {Object} options - Test options
 * @returns {Promise<Object>} Test result
 */
export async function runCoordinationTest(outputDir, options = {}) {
  const log = (section, msg) => {
    console.log(`  [${section}] ${msg}`);
  };

  log("SETUP", "Starting agent coordination test...");
  log("SETUP", `Polyfill check - window: ${typeof globalThis.window}, document: ${typeof globalThis.document}`);

  // Import MockDetectionEngine
  let MockDetectionEngine;
  try {
    const antiCheatModule = await import("../../../dist/testing/MockDetectionEngine.js");
    MockDetectionEngine = antiCheatModule.MockDetectionEngine || antiCheatModule.default;
  } catch (e) {
    log("WARN", "MockDetectionEngine not available, anti-cheat validation disabled");
  }

  // Import agents
  let agents = {};
  let recorder;

  try {
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
      AgentRecorder,
    } = await import("../../../dist/index.js");

    // Initialize MessageBus
    const messageBus = getMessageBus();

    // Initialize KnowledgeBase
    const knowledgeBase = new KnowledgeBase({
      pineconeApiKey: process.env.PINECONE_API_KEY,
      pineconeIndex: process.env.PINECONE_INDEX || "chipilot",
    });

    // API configuration
    const apiConfig = {
      apiKey: process.env.ANTHROPIC_API_KEY,
      baseURL: process.env.ANTHROPIC_BASE_URL,
      model: process.env.CHIPILOT_MODEL,
    };

    // Create AgentRecorder
    recorder = new AgentRecorder({
      outputDir: outputDir,
      sessionName: `coordination-test-${Date.now()}`,
      consoleLog: true,
    });
    recorder.startRecording();

    // Create agents
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
      recorder,
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

    log("SETUP", "All 7 agents created");

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

    log("SETUP", "All agents initialized");

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

    log("SETUP", "All agents started");

    // Test scenario - Use a multi-step task that forces delegation and inter-agent communication
    // This ensures the anti-cheat detection sees actual message coordination
    const testQuery = options.query || "Plan a complete placement optimization flow for this design";
    log("TEST", `Processing query: ${testQuery.substring(0, 60)}...`);
    log("TEST", "This query should trigger delegation to PlannerAgent and inter-agent messages");

    const startTime = Date.now();
    const result = await agents.orchestrator.processGoal(testQuery);
    const duration = Date.now() - startTime;

    log("RESULT", `Query processed in ${duration}ms`);
    log("RESULT", `Success: ${result.success}`);
    log("RESULT", `Plan created: ${result.planId ? "YES" : "NO"}`);

    // Stop recording
    recorder.stopRecording();

    // Generate summary
    const summary = {
      timestamp: new Date().toISOString(),
      testQuery,
      duration,
      success: result.success,
      planId: result.planId,
      planCreated: !!result.planId,
      agentCount: Object.keys(agents).length,
      result: result.result?.substring(0, 200),
    };

    writeFileSync(join(outputDir, "test-summary.json"), JSON.stringify(summary, null, 2));

    // Run anti-cheat validation
    log("VERIFY", "Running anti-cheat validation...");

    let antiCheatPassed = true;
    let antiCheatReport = null;

    if (MockDetectionEngine) {
      try {
        const engine = new MockDetectionEngine();
        antiCheatReport = engine.analyzeTestOutput(outputDir);

        writeFileSync(join(outputDir, "anti-cheat-report.json"), JSON.stringify(antiCheatReport, null, 2));

        log("VERIFY", `Anti-Cheat Status: ${antiCheatReport.passed ? "✓ PASSED" : "✗ FAILED"}`);
        log("VERIFY", `Violations: ${antiCheatReport.stats.criticalViolations} critical, ${antiCheatReport.stats.highViolations} high, ${antiCheatReport.stats.mediumViolations} medium, ${antiCheatReport.stats.lowViolations} low`);

        antiCheatPassed = antiCheatReport.passed;

      } catch (antiCheatError) {
        log("ERROR", `Anti-cheat validation error: ${antiCheatError.message}`);
        antiCheatPassed = false;
      }
    } else {
      log("WARN", "Anti-cheat validation skipped - MockDetectionEngine not available");
    }

    // Cleanup
    log("CLEANUP", "Stopping agents...");
    await Promise.all([
      agents.planner.stop(),
      agents.orchestrator.stop(),
      agents.terminalPerception.stop(),
      agents.execution.stop(),
      agents.commandSynthesis.stop(),
      agents.knowledgeCurator.stop(),
      agents.verification.stop(),
    ]);
    log("CLEANUP", "All agents stopped");

    const passed = result.success && antiCheatPassed;
    log("RESULT", `Overall: ${passed ? "✓ PASSED" : "✗ FAILED"}`);

    return {
      passed,
      summary,
      antiCheat: antiCheatReport,
      artifacts: {
        summary: join(outputDir, "test-summary.json"),
        antiCheat: antiCheatReport ? join(outputDir, "anti-cheat-report.json") : null,
      },
    };

  } catch (error) {
    log("ERROR", error.message);
    writeFileSync(join(outputDir, "error.log"), error.stack);
    throw error;
  }
}

export default runCoordinationTest;
