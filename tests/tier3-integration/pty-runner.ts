/**
 * PTY Runner - Real terminal interaction for Tier 3/4 tests
 *
 * Uses node-pty to spawn the actual built CLI and interact with it
 * as a real user would. This validates that the TUI works in a
 * genuine terminal environment.
 */

import * as pty from 'node-pty';
import * as path from 'path';
import * as fs from 'fs';

export interface PTYSessionOptions {
  /** Terminal columns (default: 80) */
  cols?: number;
  /** Terminal rows (default: 24) */
  rows?: number;
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Timeout for operations in ms (default: 5000) */
  timeout?: number;
}

export interface PTYInteraction {
  /** Keys to send */
  input?: string;
  /** Wait for this pattern in output before continuing */
  waitFor?: string | RegExp;
  /** Wait this many ms */
  waitMs?: number;
  /** Description for logging */
  description?: string;
}

export interface PTYSession {
  /** Process ID */
  pid: number;
  /** Full output buffer */
  output: string;
  /** Current terminal screen content */
  screen: string;
  /** Send input to the terminal */
  send: (input: string, options?: { waitFor?: string | RegExp; timeout?: number }) => Promise<void>;
  /** Send a sequence of interactions */
  interact: (steps: PTYInteraction[]) => Promise<void>;
  /** Wait for a pattern in output */
  waitFor: (pattern: string | RegExp, timeout?: number) => Promise<void>;
  /** Get recent output (last N lines) */
  getRecentOutput: (lines?: number) => string;
  /** Check if output contains pattern */
  contains: (pattern: string | RegExp) => boolean;
  /** Kill the session */
  kill: (signal?: string) => void;
  /** Resize terminal */
  resize: (cols: number, rows: number) => void;
}

/**
 * Detects if the CLI is built, builds if necessary
 */
function ensureBuilt(): void {
  const distPath = path.join(process.cwd(), 'dist', 'cli.js');

  if (!fs.existsSync(distPath)) {
    throw new Error(
      'CLI not built. Run "npm run build" first. ' +
      'Tier 3+ tests require the actual compiled CLI.'
    );
  }

  // Check if source files are newer than dist
  const srcPath = path.join(process.cwd(), 'src', 'cli.ts');
  if (fs.existsSync(srcPath)) {
    const srcStat = fs.statSync(srcPath);
    const distStat = fs.statSync(distPath);

    if (srcStat.mtime > distStat.mtime) {
      console.warn('⚠️  Source files are newer than dist. Build may be out of date.');
    }
  }
}

/**
 * Spawn the chipilot-cli in a real PTY
 */
export async function spawnCLI(
  options: PTYSessionOptions = {}
): Promise<PTYSession> {
  ensureBuilt();

  const {
    cols = 80,
    rows = 24,
    cwd = process.cwd(),
    env = process.env,
    timeout = 5000,
  } = options;

  const cliPath = path.join(cwd, 'dist', 'cli.js');

  // Spawn the CLI in test mode
  const proc = pty.spawn('node', [cliPath], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: {
      ...env,
      NODE_ENV: 'test',
      CHIPILOT_TEST: 'true',
      // Prevent any real API keys from being used
      ANTHROPIC_API_KEY: 'test-key',
      OPENAI_API_KEY: 'test-key',
    },
  });

  let output = '';
  let screenBuffer: string[] = [];

  proc.onData((data) => {
    output += data;

    // Maintain screen buffer (last 'rows' lines)
    const lines = data.split('\n');
    for (const line of lines) {
      // Handle clear screen
      if (line.includes('\x1b[2J')) {
        screenBuffer = [];
      }
      // Handle carriage return (overwrite line)
      else if (line.includes('\r') && !line.includes('\n')) {
        const cleanLine = line.replace(/\r/g, '');
        if (screenBuffer.length > 0) {
          screenBuffer[screenBuffer.length - 1] = cleanLine;
        } else {
          screenBuffer.push(cleanLine);
        }
      } else {
        const cleanLine = line.replace(/\r/g, '');
        if (cleanLine) {
          screenBuffer.push(cleanLine);
        }
      }
    }

    // Keep only visible rows
    if (screenBuffer.length > rows) {
      screenBuffer = screenBuffer.slice(-rows);
    }
  });

  // Create session interface
  const session: PTYSession = {
    pid: proc.pid,
    get output() { return output; },
    get screen() { return screenBuffer.join('\n'); },

    async send(input: string, options: { waitFor?: string | RegExp; timeout?: number } = {}) {
      proc.write(input);

      if (options.waitFor) {
        await session.waitFor(options.waitFor, options.timeout ?? timeout);
      }
    },

    async interact(steps: PTYInteraction[]) {
      for (const step of steps) {
        if (step.description) {
          console.log(`  → ${step.description}`);
        }

        if (step.input) {
          proc.write(step.input);
        }

        if (step.waitMs) {
          await sleep(step.waitMs);
        }

        if (step.waitFor) {
          await session.waitFor(step.waitFor, timeout);
        }
      }
    },

    async waitFor(pattern: string | RegExp, waitTimeout: number = timeout) {
      const startTime = Date.now();
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

      return new Promise<void>((resolve, reject) => {
        const check = () => {
          // Check both raw output and screen buffer
          const screenContent = screenBuffer.join('\n');
          if (regex.test(output) || regex.test(screenContent)) {
            resolve();
            return;
          }

          if (Date.now() - startTime > waitTimeout) {
            reject(
              new Error(
                `Timeout waiting for pattern "${pattern}". ` +
                `Recent output:\n${session.getRecentOutput(10)}`
              )
            );
            return;
          }

          setTimeout(check, 50);
        };

        check();
      });
    },

    getRecentOutput(lines: number = 10): string {
      const allLines = output.split('\n');
      return allLines.slice(-lines).join('\n');
    },

    contains(pattern: string | RegExp): boolean {
      const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
      // Check both raw output and current screen buffer
      // Screen buffer captures current visible state (needed for ink-text-input)
      return regex.test(output) || regex.test(screenBuffer.join('\n'));
    },

    kill(signal: string = 'SIGTERM') {
      proc.kill(signal);
    },

    resize(cols: number, rows: number) {
      proc.resize(cols, rows);
    },
  };

  // Wait for initial render
  await session.waitFor(/Welcome to chipilot|chipilot.*EDA/, timeout);

  return session;
}

/**
 * Create a mock CLI mode for testing (no API dependencies)
 */
export async function spawnMockCLI(
  mockResponses: Map<string, string> = new Map(),
  options: PTYSessionOptions = {}
): Promise<PTYSession & { getLastPrompt(): string }> {
  const session = await spawnCLI(options);

  // Track prompts and responses
  let lastPrompt = '';

  const originalSend = session.send.bind(session);
  session.send = async (input: string, opts = {}) => {
    lastPrompt = input;

    // Check if this is a known mock input
    if (input === '\r' && mockResponses.has(lastPrompt)) {
      // Wait for AI response simulation
      await sleep(100);
    }

    return originalSend(input, opts);
  };

  return {
    ...session,
    getLastPrompt: () => lastPrompt,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate ANSI output contains expected sequences
 */
export function validateANSISequences(output: string): {
  hasColor: boolean;
  hasCursor: boolean;
  hasClear: boolean;
  sequences: string[];
} {
  const sequences: string[] = [];

  // Extract ANSI sequences
  const ansiRegex = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g;
  let match;
  while ((match = ansiRegex.exec(output)) !== null) {
    sequences.push(match[0]);
  }

  return {
    hasColor: /\x1b\[[0-9;]*m/.test(output),
    hasCursor: /\x1b\[[0-9]*[ABCDEFGH]/.test(output),
    hasClear: /\x1b\[2J/.test(output),
    sequences,
  };
}
