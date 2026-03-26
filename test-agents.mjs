#!/usr/bin/env node

/**
 * Quick test to observe agent interactions
 */

// Apply polyfill inline BEFORE any other imports
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
            createLinearGradient: () => ({
              addColorStop: () => {},
            }),
            createRadialGradient: () => ({
              addColorStop: () => {},
            }),
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

// Now import the rest
const { MessageBus, OrchestratorAgent, PlannerAgent } = await import('./dist/index.js');

console.log('=== Agent Interaction Test ===\n');

// Create message bus
const messageBus = new MessageBus({ debug: true });
console.log('[Setup] MessageBus created');

// Create agents
const orchestrator = new OrchestratorAgent({
  id: 'orchestrator',
  messageBus,
  debug: true
});
console.log('[Setup] OrchestratorAgent created');

const planner = new PlannerAgent({
  id: 'planner',
  messageBus,
  debug: true
});
console.log('[Setup] PlannerAgent created');

// Listen for messages
console.log('\n=== Registering Message Listeners ===\n');

messageBus.on('message:delivered', ({ message }) => {
  console.log(`[Message] ${message.from} → ${message.to}: ${message.type}`);
});

messageBus.on('stateChange', ({ agentId, newState }) => {
  console.log(`[State] ${agentId} is now ${newState}`);
});

messageBus.on('planStarted', ({ planId, goal }) => {
  console.log(`[Plan] Started: ${planId} - ${goal}`);
});

messageBus.on('planCompleted', ({ planId }) => {
  console.log(`[Plan] Completed: ${planId}`);
});

// Initialize agents
console.log('\n=== Initializing Agents ===\n');

await orchestrator.initialize();
await orchestrator.start();
await planner.initialize();
await planner.start();

// Test: Send a planning request
console.log('\n=== Test: Planning Request ===\n');

const planResult = await planner.createPlan(
  'Create a floorplan for my design',
  { tool: 'innovus', designContext: '28nm test design' }
);

console.log('\n[Result] Plan created:', planResult);

// Test: Send a message between agents
console.log('\n=== Test: Agent Messaging ===\n');

await messageBus.send({
  id: 'msg_test_001',
  from: 'orchestrator',
  to: 'planner',
  type: 'query.knowledge',
  payload: { query: 'floorplan' },
  timestamp: Date.now(),
  priority: 'normal'
});

// Wait a bit for any async processing
await new Promise(r => setTimeout(r, 500));

console.log('\n=== Test Complete ===');

// Cleanup
orchestrator.stop();
orchestrator.cleanup();
planner.stop();
planner.cleanup();
messageBus.shutdown();

console.log('[Cleanup] All agents stopped');
