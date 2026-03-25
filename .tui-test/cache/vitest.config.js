//# hash=daca8fcbd67397ea9b4b5a6fb14b6585
//# sourceMappingURL=vitest.config.js.map

import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: [
            'tests/**/*.test.ts',
            'tests/**/*.test.tsx'
        ],
        // Exclude PTY/TUI tests from default runs - they spawn processes
        exclude: [
            '**/node_modules/**',
            '**/tier2.5-tui-test/**',
            '**/tier3-integration/**',
            '**/tier4-e2e/**'
        ],
        testTimeout: 30000,
        hookTimeout: 30000,
        // Run tests sequentially for PTY/TUI tests to avoid conflicts
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    },
    resolve: {
        alias: {
            '@': '/src'
        }
    }
});
