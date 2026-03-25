import { defineConfig } from 'vitest/config';

/**
 * Vitest config for tiered tests (2.5, 3, 4)
 * Uses inline execution to avoid process conflicts with @microsoft/tui-test
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['**/node_modules/**'],
    testTimeout: 60000,
    hookTimeout: 60000,
    // Inline execution to avoid process.send() conflicts
    pool: 'vmThreads',
    poolOptions: {
      vmThreads: {
        execArgv: [],
      },
    },
    // Don't isolate - allows process.spawn to work
    isolate: false,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
