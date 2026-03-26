#!/usr/bin/env node

/**
 * Memory usage test for agents
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

import { MessageBus, OrchestratorAgent, PlannerAgent } from './dist/index.js';

const v8 = await import('v8');

console.log('=== Agent Memory Usage Test ===\n');

// Get baseline memory
const baseline = v8.getHeapStatistics().used_heap_size;
console.log(`[Memory] Baseline: ${Math.round(baseline / 1024 / 1024)} MB`);

// Create message bus and agents
const messageBus = new MessageBus({ debug: false });
const orchestrator = new OrchestratorAgent({ id: 'orchestrator', messageBus, debug: false });
const planner = new PlannerAgent({ id: 'planner', messageBus, debug: false });

const afterCreate = v8.getHeapStatistics().used_heap_size;
console.log(`[Memory] After creating agents: ${Math.round(afterCreate / 1024 / 1024)} MB (+${Math.round((afterCreate - baseline) / 1024)} KB)`);

// Initialize agents
await orchestrator.initialize();
await planner.initialize();

const afterInit = v8.getHeapStatistics().used_heap_size;
console.log(`[Memory] After initialization: ${Math.round(afterInit / 1024 / 1024)} MB (+${Math.round((afterInit - afterCreate) / 1024)} KB)`);

// Create multiple plans
const plans = [];
for (let i = 0; i < 10; i++) {
  const plan = await planner.createPlan(`Run placement optimization batch ${i}`, { tool: 'innovus' });
  plans.push(plan);
}

const afterPlans = v8.getHeapStatistics().used_heap_size;
console.log(`[Memory] After creating 10 plans: ${Math.round(afterPlans / 1024 / 1024)} MB (+${Math.round((afterPlans - afterInit) / 1024)} KB)`);
console.log(`[Memory] Per plan overhead: ${Math.round((afterPlans - afterInit) / 10 / 1024)} KB`);

// Cleanup
orchestrator.cleanup();
planner.cleanup();
messageBus.shutdown();

// Force GC if available and get final memory
globalThis.gc && globalThis.gc();
const afterCleanup = v8.getHeapStatistics().used_heap_size;
console.log(`[Memory] After cleanup: ${Math.round(afterCleanup / 1024 / 1024)} MB`);

// Summary
console.log('\n=== Memory Test Summary ===');
console.log(`Total memory growth: ${Math.round((afterPlans - baseline) / 1024)} KB`);
console.log(`Plans created: ${plans.length}`);
console.log(`Tasks per plan: ${plans[0]?.tasks.length || 0}`);
console.log(`Total tasks: ${plans.reduce((sum, p) => sum + p.tasks.length, 0)}`);
console.log(`Memory per task: ${Math.round((afterPlans - afterInit) / plans.reduce((sum, p) => sum + p.tasks.length, 0))} bytes`);
