#!/usr/bin/env node
/**
 * Interactive chipilot test - Random questions with agent output recording
 */

// Polyfill MUST be first before any xterm imports
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {};
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: (tagName) => {
      if (tagName === 'canvas') {
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
            globalCompositeOperation: 'source-over',
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

if (typeof globalThis.navigator === 'undefined') {
  Object.defineProperty(globalThis, 'navigator', {
    value: { platform: 'node' },
    writable: true,
    configurable: true,
  });
}

// Use dynamic imports after polyfills are set up
async function main() {
  const [{ Agent, MessageBus, OrchestratorAgent, PlannerAgent, TerminalPerceptionAgent, ExecutionAgent, KnowledgeCuratorAgent, KnowledgeBase, CommandSynthesisAgent }, fs, path] = await Promise.all([
    import('./dist/index.js'),
    import('fs'),
    import('path'),
  ]);

  const TEST_QUESTIONS = [
    "How do I run placement optimization in Innovus?",
    "What command checks setup timing violations?",
    "How do I generate a timing report in Tempus?",
    "What's the best practice for floorplanning a 28nm design?",
    "How do I fix hold time violations after CTS?",
    "What commands do I use to analyze congestion?",
    "How do I set up multi-corner multi-mode analysis?",
    "What is the difference between set_dont_touch and set_size_only?",
    "How do I optimize power during placement?",
    "What are the key steps in physical design closure?",
  ];

  const RESULTS_DIR = path.join(process.cwd(), 'tests', 'output', 'interactive-test-' + Date.now());
  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  console.log('=== chipilot Interactive Test ===\n');
  console.log(`Results will be saved to: ${RESULTS_DIR}\n`);

  const results = {
    startTime: new Date().toISOString(),
    agentTests: [],
    orchestratorTests: [],
    summary: {},
  };

  // Test 1: Direct Agent tests
  console.log('--- Test 1: Direct Agent Chat Tests ---\n');

  const agent = new Agent({
    provider: 'anthropic',
    model: 'claude-sonnet-4-6-20250514',
  });

  const agentQuestions = TEST_QUESTIONS.slice(0, 3);

  for (const question of agentQuestions) {
    console.log(`[Agent Test] Question: ${question}`);
    const startTime = Date.now();

    try {
      const response = await agent.chat(question, { cwd: process.cwd() });
      const duration = Date.now() - startTime;

      const testResult = {
        question,
        duration,
        timestamp: new Date().toISOString(),
        response: response.message,
        proposedCommand: response.proposedCommand || null,
        hasProposedCommand: !!response.proposedCommand,
        responseLength: response.message.length,
      };

      results.agentTests.push(testResult);
      console.log(`  ✓ Response received (${duration}ms, ${response.message.length} chars)`);
      if (response.proposedCommand) {
        console.log(`  ✓ Proposed command: ${response.proposedCommand.command.substring(0, 50)}...`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      results.agentTests.push({
        question,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Test 2: Multi-Agent Orchestration tests
  console.log('\n--- Test 2: Multi-Agent Orchestration Tests ---\n');

  const messageBus = new MessageBus({ debug: false });
  const planner = new PlannerAgent({ id: 'planner', name: 'Planner', messageBus, debug: false });
  const orchestrator = new OrchestratorAgent({ id: 'orchestrator', name: 'Orchestrator', planner, messageBus, debug: false });
  const terminalPerception = new TerminalPerceptionAgent({ id: 'terminal-perception', name: 'Terminal Perception', messageBus, debug: false });
  const executionAgent = new ExecutionAgent({ id: 'execution', name: 'Execution', messageBus, debug: false });
  const knowledgeBase = new KnowledgeBase({});
  const knowledgeCurator = new KnowledgeCuratorAgent({ id: 'knowledge-curator', name: 'Knowledge Curator', knowledgeBase, messageBus });
  const commandSynthesis = new CommandSynthesisAgent({ id: 'command-synthesis', name: 'Command Synthesis', knowledgeBase, messageBus });

  const agentEvents = [];
  messageBus.on('stateChange', (event) => {
    agentEvents.push({ type: 'stateChange', ...event, timestamp: Date.now() });
  });
  messageBus.on('message:delivered', (event) => {
    agentEvents.push({ type: 'message:delivered', ...event, timestamp: Date.now() });
  });

  // Listen for plan events directly on the planner agent
  planner.on('planStarted', (event) => {
    agentEvents.push({ type: 'planStarted', ...event, timestamp: Date.now() });
  });
  planner.on('planCompleted', (event) => {
    agentEvents.push({ type: 'planCompleted', ...event, timestamp: Date.now() });
  });

  console.log('Initializing agents...');
  await Promise.all([
    planner.initialize(),
    orchestrator.initialize(),
    terminalPerception.initialize(),
    executionAgent.initialize(),
    knowledgeCurator.initialize(),
    commandSynthesis.initialize(),
  ]);

  await Promise.all([
    planner.start(),
    orchestrator.start(),
    terminalPerception.start(),
    executionAgent.start(),
    knowledgeCurator.start(),
    commandSynthesis.start(),
  ]);
  console.log('All agents initialized and started\n');

  const orchestratorGoals = TEST_QUESTIONS.slice(3, 6);

  for (const goal of orchestratorGoals) {
    console.log(`[Orchestrator Test] Goal: ${goal}`);
    const startTime = Date.now();

    try {
      const result = await orchestrator.processGoal(goal, {
        cwd: process.cwd(),
        sessionId: 'test-session',
      });

      const duration = Date.now() - startTime;

      const testResult = {
        goal,
        duration,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message,
        error: result.error || null,
        hasError: !!result.error,
      };

      results.orchestratorTests.push(testResult);
      console.log(`  ✓ Goal processed (${duration}ms) - Success: ${result.success}`);
      console.log(`    Response: ${result.message.substring(0, 100)}...`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      results.orchestratorTests.push({
        goal,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\nCleaning up agents...');
  orchestrator.stop();
  planner.stop();
  terminalPerception.stop();
  executionAgent.stop();
  knowledgeCurator.stop();
  commandSynthesis.stop();
  messageBus.shutdown();

  console.log('\n--- Evaluation ---\n');

  const agentSuccessCount = results.agentTests.filter(t => !t.error).length;
  const avgAgentResponseTime = results.agentTests
    .filter(t => t.duration)
    .reduce((sum, t) => sum + t.duration, 0) / results.agentTests.filter(t => t.duration).length || 0;
  const commandsProposed = results.agentTests.filter(t => t.hasProposedCommand).length;

  const orchSuccessCount = results.orchestratorTests.filter(t => t.success).length;
  const orchErrorCount = results.orchestratorTests.filter(t => t.hasError).length;
  const avgOrchTime = results.orchestratorTests
    .filter(t => t.duration)
    .reduce((sum, t) => sum + t.duration, 0) / results.orchestratorTests.filter(t => t.duration).length || 0;

  const stateChanges = agentEvents.filter(e => e.type === 'stateChange');
  const messagesDelivered = agentEvents.filter(e => e.type === 'message:delivered');
  const plansStarted = agentEvents.filter(e => e.type === 'planStarted');
  const plansCompleted = agentEvents.filter(e => e.type === 'planCompleted');

  results.summary = {
    agentTests: {
      total: results.agentTests.length,
      successful: agentSuccessCount,
      failed: results.agentTests.length - agentSuccessCount,
      avgResponseTime: Math.round(avgAgentResponseTime),
      commandsProposed,
    },
    orchestratorTests: {
      total: results.orchestratorTests.length,
      successful: orchSuccessCount,
      failed: orchErrorCount,
      avgProcessingTime: Math.round(avgOrchTime),
    },
    agentEvents: {
      stateChanges: stateChanges.length,
      messagesDelivered: messagesDelivered.length,
      plansStarted: plansStarted.length,
      plansCompleted: plansCompleted.length,
    },
  };

  console.log('Agent Tests:');
  console.log(`  Total: ${results.agentTests.length}`);
  console.log(`  Successful: ${agentSuccessCount} ✓`);
  console.log(`  Failed: ${results.agentTests.length - agentSuccessCount} ✗`);
  console.log(`  Avg Response Time: ${Math.round(avgAgentResponseTime)}ms`);
  console.log(`  Commands Proposed: ${commandsProposed}`);

  console.log('\nOrchestrator Tests:');
  console.log(`  Total: ${results.orchestratorTests.length}`);
  console.log(`  Successful: ${orchSuccessCount} ✓`);
  console.log(`  Failed: ${orchErrorCount} ✗`);
  console.log(`  Avg Processing Time: ${Math.round(avgOrchTime)}ms`);

  console.log('\nAgent Events:');
  console.log(`  State Changes: ${stateChanges.length}`);
  console.log(`  Messages Delivered: ${messagesDelivered.length}`);
  console.log(`  Plans Started: ${plansStarted.length}`);
  console.log(`  Plans Completed: ${plansCompleted.length}`);

  console.log('\n--- Quality Evaluation ---\n');

  const evaluation = {
    agentQuality: 'PASS',
    orchestratorQuality: 'PASS',
    overall: 'PASS',
    issues: [],
  };

  if (avgAgentResponseTime > 10000) {
    evaluation.issues.push('Agent response time is slow (>10s)');
    evaluation.agentQuality = 'WARNING';
  }

  if (commandsProposed === 0) {
    evaluation.issues.push('No commands were proposed by agents');
    evaluation.agentQuality = 'WARNING';
  }

  if (orchErrorCount > 0) {
    evaluation.issues.push(`Orchestrator had ${orchErrorCount} errors`);
    evaluation.orchestratorQuality = 'WARNING';
  }

  if (plansStarted.length === 0) {
    evaluation.issues.push('No plans were started by orchestrator');
    evaluation.orchestratorQuality = 'FAIL';
  }

  if (evaluation.agentQuality === 'FAIL' || evaluation.orchestratorQuality === 'FAIL') {
    evaluation.overall = 'FAIL';
  } else if (evaluation.agentQuality === 'WARNING' || evaluation.orchestratorQuality === 'WARNING') {
    evaluation.overall = 'WARNING';
  }

  console.log(`Agent Quality: ${evaluation.agentQuality}`);
  console.log(`Orchestrator Quality: ${evaluation.orchestratorQuality}`);
  console.log(`Overall: ${evaluation.overall}`);

  if (evaluation.issues.length > 0) {
    console.log('\nIssues:');
    evaluation.issues.forEach(issue => console.log(`  - ${issue}`));
  }

  results.evaluation = evaluation;
  results.endTime = new Date().toISOString();

  const resultsPath = path.join(RESULTS_DIR, 'test-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Full results saved to: ${resultsPath}`);

  const summaryPath = path.join(RESULTS_DIR, 'summary.txt');
  const summaryText = `chipilot Interactive Test Results
==================================

Date: ${results.startTime}
Duration: ${new Date(results.endTime) - new Date(results.startTime)}ms

AGENT TESTS
-----------
Total Questions: ${results.summary.agentTests.total}
Successful: ${results.summary.agentTests.successful}
Failed: ${results.summary.agentTests.failed}
Avg Response Time: ${results.summary.agentTests.avgResponseTime}ms
Commands Proposed: ${results.summary.agentTests.commandsProposed}

Questions Asked:
${results.agentTests.map((t, i) => `${i + 1}. ${t.question}\n   Response: ${t.response?.substring(0, 150)}...`).join('\n\n')}

ORCHESTRATOR TESTS
------------------
Total Goals: ${results.summary.orchestratorTests.total}
Successful: ${results.summary.orchestratorTests.successful}
Failed: ${results.summary.orchestratorTests.failed}
Avg Processing Time: ${results.summary.orchestratorTests.avgProcessingTime}ms

Goals Processed:
${results.orchestratorTests.map((t, i) => `${i + 1}. ${t.goal}\n   Result: ${t.success ? 'SUCCESS' : 'FAILED'}\n   Response: ${t.message?.substring(0, 150)}...`).join('\n\n')}

AGENT EVENTS
------------
State Changes: ${results.summary.agentEvents.stateChanges}
Messages Delivered: ${results.summary.agentEvents.messagesDelivered}
Plans Started: ${results.summary.agentEvents.plansStarted}
Plans Completed: ${results.summary.agentEvents.plansCompleted}

EVALUATION
----------
Overall: ${evaluation.overall}
Agent Quality: ${evaluation.agentQuality}
Orchestrator Quality: ${evaluation.orchestratorQuality}

Issues: ${evaluation.issues.length > 0 ? evaluation.issues.join(', ') : 'None'}
`;

  fs.writeFileSync(summaryPath, summaryText);
  console.log(`✓ Summary saved to: ${summaryPath}`);

  console.log('\n=== Test Complete ===');
  process.exit(evaluation.overall === 'FAIL' ? 1 : 0);
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
