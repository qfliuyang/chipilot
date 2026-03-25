import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Exclude PTY/TUI tests from default runs - they spawn processes
    exclude: [
      '**/node_modules/**',
      '**/tier2.5-tui-test/**',  // @microsoft/tui-test spawns processes
      '**/tier3-integration/**', // node-pty tests spawn processes
      '**/tier4-e2e/**',         // Full E2E spawns CLI
    ],
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run tests sequentially for PTY/TUI tests to avoid conflicts
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
