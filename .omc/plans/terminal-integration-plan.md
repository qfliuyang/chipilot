# Claude Code Terminal Integration - Development Plan

## Project Overview

Add a persistent terminal pane to Claude Code alongside the existing chat interface, enabling real PTY sessions with proper xterm.js terminal emulation. This transforms Claude Code from a single-pane chat UI to a two-pane TUI (chat + terminal) similar to chipilot's design.

**Target Repository**: `/Users/luzi/code/chipilot-cli/claude-code`
**Reference Implementation**: `/Users/luzi/code/chipilot-cli/chipilot/src/tui/TerminalPane.tsx`
**Estimated Effort**: 3-4 days
**Risk Level**: Medium (touches core layout and shell execution)

---

## Current State Analysis

### Claude Code Architecture

**Layout Structure** (`screens/REPL.tsx:4565`):
```
FullscreenLayout
├── scrollable: Messages (chat history)
│   ├── TeammateViewHeader
│   ├── Messages (virtualized list)
│   ├── Spinner
│   └── WebBrowserPanel
└── bottom: PromptInput + CompanionSprite
```

**Shell Execution** (`tools/BashTool/BashTool.tsx:31`):
- Commands executed via `exec()` from `utils/Shell.js`
- Output captured and rendered as inline chat messages
- No persistent PTY session

**Key Files**:
- `screens/REPL.tsx` - Main UI screen (~5000 lines)
- `components/FullscreenLayout.tsx` - Layout wrapper
- `tools/BashTool/BashTool.tsx` - Shell command execution
- `utils/Shell.ts` - Shell spawning utilities

### Chipilot Reference Implementation

**TerminalPane** (`src/tui/TerminalPane.tsx`):
- `VirtualTerminal` class wrapping `xterm-headless`
- `TerminalSession` class wrapping `node-pty`
- Event-driven: session emits 'output', pane writes to virtual terminal
- Input handling via `useInput` hook for PTY passthrough

---

## RALPLAN-DR Summary

### Principles
1. **Minimal Invasion**: Preserve existing layout behaviors, add terminal as opt-in feature
2. **Persistent Session**: Terminal maintains state across command execution, unlike current stateless bash tool
3. **Focus Management**: Clear visual indicator of which pane is active
4. **Backward Compatibility**: Existing single-pane mode continues to work
5. **Test Integrity**: All changes validated with MockDetectionEngine per CLAUDE.md requirements

### Decision Drivers
1. **User Experience**: Engineers want to see long-running builds, interact with REPLs, maintain shell context
2. **Layout Real Estate**: Horizontal split reduces chat width; trade-off for functionality
3. **Shell Integration**: Current inline bash output is lossy for interactive programs

### Viable Options

| Option | Description | Pros | Cons | Completeness |
|--------|-------------|------|------|--------------|
| **A. Horizontal Split** (Recommended) | Chat left (60%), Terminal right (40%) | Natural side-by-side, persistent visibility | Reduces chat width | 10/10 |
| B. Modal Overlay | Terminal slides up from bottom on hotkey | Preserves full chat width | Hidden by default, less discoverable | 7/10 |
| C. Tab Switching | Toggle between full-screen chat and terminal | Maximum space for each | No simultaneous visibility | 6/10 |
| D. Inline Terminal | Terminal embeds within message stream | No layout changes | Loses persistence, scrolls away | 4/10 |

**Invalidated**: Option D fails the "persistent session" principle. Option C provides poor UX for monitoring.

**Selected**: Option A with horizontal split, 60/40 default, user-resizable.

---

## Implementation Plan

### Phase 1: Foundation (Day 1)

#### 1.1 Add Dependencies
**File**: `package.json`
```json
{
  "dependencies": {
    "xterm-headless": "^5.3.0",
    "xterm-addon-serialize": "^0.11.0",
    "node-pty": "^1.0.0"
  }
}
```

**Verification**:
```bash
cd /Users/luzi/code/chipilot-cli/claude-code && bun install
```

#### 1.2 Create VirtualTerminal Class
**New File**: `components/Terminal/VirtualTerminal.ts`

```typescript
import type { Terminal as TerminalType, SerializeAddon as SerializeAddonType } from './xterm-modules';
import xtermHeadless from 'xterm-headless';
import xtermAddonSerialize from 'xterm-addon-serialize';

const Terminal = xtermHeadless.Terminal;
const SerializeAddon = xtermAddonSerialize.SerializeAddon;

export class VirtualTerminal {
  private terminal: TerminalType;
  private serializeAddon: SerializeAddonType;

  constructor(cols: number, rows: number) {
    this.terminal = new Terminal({
      cols,
      rows,
      cursorBlink: false,
      allowProposedApi: true,
    }) as TerminalType;

    this.serializeAddon = new SerializeAddon() as SerializeAddonType;
    this.terminal.loadAddon(this.serializeAddon);
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  getScreen(): string {
    return this.serializeAddon.serialize();
  }

  getScreenLines(): string[] {
    return this.getScreen().split('\n').slice(0, this.terminal.rows);
  }

  resize(cols: number, rows: number): void {
    this.terminal.resize(cols, rows);
  }

  destroy(): void {
    this.terminal.dispose();
  }
}
```

**Acceptance Criteria**:
- [ ] Class compiles without errors
- [ ] Unit test: write ANSI sequences, verify screen output
- [ ] MockDetectionEngine validates no fake LLM calls

#### 1.3 Create TerminalSession Class
**New File**: `components/Terminal/TerminalSession.ts`

```typescript
import * as pty from 'node-pty';
import { EventEmitter } from 'events';

export interface TerminalSessionOptions {
  shell?: string;
  cwd?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export class TerminalSession extends EventEmitter {
  private ptyProcess: pty.IPty | null = null;
  private shell: string;
  private cwd: string;
  private env: Record<string, string>;
  private cols: number;
  private rows: number;
  private started = false;

  constructor(options: TerminalSessionOptions = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.cwd();
    this.cols = options.cols || 80;
    this.rows = options.rows || 24;
    this.env = {
      ...process.env,
      TERM: 'xterm-256color',
      ...options.env,
    };
  }

  start(): void {
    if (this.started) return;

    this.ptyProcess = pty.spawn(this.shell, [], {
      name: 'xterm-256color',
      cols: this.cols,
      rows: this.rows,
      cwd: this.cwd,
      env: this.env,
    });

    this.ptyProcess.onData((data: string) => this.emit('output', data));
    this.ptyProcess.onExit(({ exitCode, signal }) => {
      this.emit('exit', { exitCode, signal });
      this.reset();
    });

    this.started = true;
    this.emit('started');
  }

  write(data: string): void {
    this.ptyProcess?.write(data);
  }

  execute(command: string): void {
    this.ptyProcess?.write(command + '\r');
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.ptyProcess?.resize(cols, rows);
  }

  destroy(): void {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.reset();
    }
  }

  private reset(): void {
    this.ptyProcess = null;
    this.started = false;
    this.removeAllListeners();
  }

  isRunning(): boolean {
    return this.started && this.ptyProcess !== null;
  }
}
```

**Acceptance Criteria**:
- [ ] PTY spawns successfully
- [ ] 'output' events fire when shell produces output
- [ ] 'exit' event fires when shell exits
- [ ] Resize propagates to PTY
- [ ] MockDetectionEngine: verify real process spawning (no mocks)

#### 1.4 Create TerminalPane Component
**New File**: `components/Terminal/TerminalPane.tsx`

```typescript
import React, { memo, useEffect, useRef, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import type { TerminalSession } from './TerminalSession';
import { VirtualTerminal } from './VirtualTerminal';

interface TerminalPaneProps {
  focused: boolean;
  session: TerminalSession;
  width: number;
  height: number;
}

export const TerminalPane: React.FC<TerminalPaneProps> = memo(({
  focused,
  session,
  width,
  height
}) => {
  const virtualTermRef = useRef<VirtualTerminal | null>(null);
  const [, forceRender] = React.useReducer((n: number) => n + 1, 0);

  const cols = Math.max(20, Math.floor(width) - 2); // -2 for padding
  const rows = Math.max(5, Math.floor(height) - 2); // -2 for header

  // Initialize VirtualTerminal
  const getVirtualTerminal = useCallback(() => {
    if (!virtualTermRef.current) {
      virtualTermRef.current = new VirtualTerminal(cols, rows);
    }
    return virtualTermRef.current;
  }, [cols, rows]);

  // Handle resize
  useEffect(() => {
    const vt = getVirtualTerminal();
    vt.resize(cols, rows);
    session.resize(cols, rows);
    forceRender();
  }, [cols, rows, session, getVirtualTerminal]);

  // Handle terminal output
  useEffect(() => {
    const vt = getVirtualTerminal();

    const handleOutput = (data: string) => {
      vt.write(data);
      forceRender();
    };

    session.on('output', handleOutput);

    if (!session.isRunning()) {
      session.start();
    }

    return () => {
      session.off('output', handleOutput);
    };
  }, [session, getVirtualTerminal]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (virtualTermRef.current) {
        virtualTermRef.current.destroy();
        virtualTermRef.current = null;
      }
    };
  }, []);

  // Input handling - pass through to PTY
  useInput(
    (input, key) => {
      if (!focused) return;
      if (key.tab) return;

      if (key.return) {
        session.write('\r');
      } else if (key.backspace || key.delete) {
        session.write('\x7f');
      } else if (key.upArrow) {
        session.write('\x1b[A');
      } else if (key.downArrow) {
        session.write('\x1b[B');
      } else if (key.leftArrow) {
        session.write('\x1b[D');
      } else if (key.rightArrow) {
        session.write('\x1b[C');
      } else if (key.ctrl && input.length === 1) {
        if (input !== 'c') { // Ctrl+C handled separately
          session.write(String.fromCharCode(input.charCodeAt(0) - 96));
        }
      } else if (input.length === 1 && !key.meta) {
        session.write(input);
      }
    },
    { isActive: focused }
  );

  // Get rendered screen
  const vt = getVirtualTerminal();
  const screen = vt.getScreen();
  const lines = screen.split('\n').slice(0, rows);

  // Pad with empty lines if needed
  const paddedLines = [
    ...Array(Math.max(0, rows - lines.length)).fill(''),
    ...lines
  ];

  return (
    <Box flexDirection="column" width={width} height={height}>
      <Box paddingX={1} flexShrink={0}>
        <Text bold color={focused ? 'green' : 'gray'}>
          {focused ? '● Terminal' : '○ Terminal'}
        </Text>
        <Text dimColor> {session.isRunning() ? '●' : '○'}</Text>
      </Box>

      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        overflow="hidden"
        borderStyle={focused ? 'single' : undefined}
        borderColor={focused ? 'green' : undefined}
      >
        {paddedLines.map((line, i) => (
          <Text key={i}>{line || ' '}</Text>
        ))}
      </Box>

      {!focused && (
        <Box justifyContent="center" flexShrink={0} paddingBottom={1}>
          <Text dimColor>[Tab to focus terminal]</Text>
        </Box>
      )}
    </Box>
  );
});

TerminalPane.displayName = 'TerminalPane';
export default TerminalPane;
```

**Acceptance Criteria**:
- [ ] Renders terminal output correctly
- [ ] Shows header with focus indicator
- [ ] Keyboard input passes through to PTY when focused
- [ ] Border highlights when focused
- [ ] MockDetectionEngine: verify real xterm.js usage

---

### Phase 2: Layout Integration (Day 2)

#### 2.1 Create TwoPaneLayout Component
**New File**: `components/TwoPaneLayout.tsx`

```typescript
import React, { useState, useCallback } from 'react';
import { Box, useInput } from 'ink';
import { useTerminalSize } from '../hooks/useTerminalSize';
import { FullscreenLayout } from './FullscreenLayout';
import { TerminalPane } from './Terminal/TerminalPane';
import type { TerminalSession } from './Terminal/TerminalSession';

interface TwoPaneLayoutProps {
  // Original FullscreenLayout props
  scrollable: React.ReactNode;
  bottom: React.ReactNode;
  overlay?: React.ReactNode;
  bottomFloat?: React.ReactNode;
  modal?: React.ReactNode;
  modalScrollRef?: React.RefObject<any>;
  scrollRef?: React.RefObject<any>;
  dividerYRef?: React.RefObject<number | null>;
  hidePill?: boolean;
  hideSticky?: boolean;
  newMessageCount?: number;
  onPillClick?: () => void;
  // Terminal props
  terminalSession: TerminalSession;
  terminalEnabled: boolean;
  chatWidthPercent?: number; // default 60
}

export const TwoPaneLayout: React.FC<TwoPaneLayoutProps> = ({
  scrollable,
  bottom,
  overlay,
  bottomFloat,
  modal,
  modalScrollRef,
  scrollRef,
  dividerYRef,
  hidePill,
  hideSticky,
  newMessageCount,
  onPillClick,
  terminalSession,
  terminalEnabled,
  chatWidthPercent = 60
}) => {
  const { rows, columns } = useTerminalSize();
  const [activePane, setActivePane] = useState<'chat' | 'terminal'>('chat');

  // Calculate widths
  const chatWidth = terminalEnabled
    ? Math.floor(columns * (chatWidthPercent / 100))
    : columns;
  const termWidth = terminalEnabled ? columns - chatWidth : 0;

  // Handle tab switching
  useInput((input, key) => {
    if (key.tab && terminalEnabled) {
      setActivePane(p => p === 'chat' ? 'terminal' : 'chat');
    }
  });

  if (!terminalEnabled) {
    // Fall back to original single-pane layout
    return (
      <FullscreenLayout
        scrollRef={scrollRef}
        scrollable={scrollable}
        bottom={bottom}
        overlay={overlay}
        bottomFloat={bottomFloat}
        modal={modal}
        modalScrollRef={modalScrollRef}
        dividerYRef={dividerYRef}
        hidePill={hidePill}
        hideSticky={hideSticky}
        newMessageCount={newMessageCount}
        onPillClick={onPillClick}
      />
    );
  }

  return (
    <Box flexDirection="row" width={columns} height={rows}>
      {/* Left: Chat pane */}
      <Box width={chatWidth} height={rows} flexDirection="column">
        <FullscreenLayout
          scrollRef={scrollRef}
          scrollable={scrollable}
          bottom={bottom}
          overlay={overlay}
          bottomFloat={bottomFloat}
          modal={modal}
          modalScrollRef={modalScrollRef}
          dividerYRef={dividerYRef}
          hidePill={hidePill}
          hideSticky={hideSticky}
          newMessageCount={newMessageCount}
          onPillClick={onPillClick}
        />
      </Box>

      {/* Right: Terminal pane */}
      <Box width={termWidth} height={rows}>
        <TerminalPane
          focused={activePane === 'terminal'}
          session={terminalSession}
          width={termWidth}
          height={rows}
        />
      </Box>
    </Box>
  );
};

export default TwoPaneLayout;
```

**Acceptance Criteria**:
- [ ] Horizontal split renders correctly
- [ ] Chat pane maintains FullscreenLayout behavior
- [ ] Terminal pane renders with correct dimensions
- [ ] Tab switches focus between panes
- [ ] When terminal disabled, falls back to single pane

#### 2.2 Create Terminal Session Singleton
**New File**: `state/terminalSession.ts`

```typescript
import { TerminalSession } from '../components/Terminal/TerminalSession';

// Singleton terminal session for app-wide persistence
export const terminalSession = new TerminalSession({
  shell: process.env.SHELL || '/bin/bash',
  cwd: process.cwd(),
  cols: 80,
  rows: 24
});

// Cleanup on process exit
process.on('exit', () => {
  terminalSession.destroy();
});

process.on('SIGINT', () => {
  terminalSession.destroy();
  process.exit(0);
});
```

#### 2.3 Modify REPL.tsx to Use TwoPaneLayout
**File**: `screens/REPL.tsx`

Add imports:
```typescript
import { TwoPaneLayout } from '../components/TwoPaneLayout';
import { terminalSession } from '../state/terminalSession';
```

Add state for terminal feature toggle:
```typescript
const [terminalEnabled, setTerminalEnabled] = useState(() =>
  isEnvTruthy(process.env.CLAUDE_CODE_TERMINAL)
);
```

Replace FullscreenLayout with TwoPaneLayout (around line 4565):
```typescript
<TwoPaneLayout
  scrollRef={scrollRef}
  scrollable={<>
    <TeammateViewHeader />
    <Messages messages={displayedMessages} ... />
    {/* ... rest of scrollable content ... */}
  </>}
  bottom={<Box ...>...</Box>}
  overlay={toolPermissionOverlay}
  bottomFloat={...}
  modal={centeredModal}
  modalScrollRef={modalScrollRef}
  dividerYRef={dividerYRef}
  hidePill={!!viewedAgentTask}
  hideSticky={!!viewedTeammateTask}
  newMessageCount={unseenDivider?.count ?? 0}
  onPillClick={() => jumpToNew(scrollRef.current)}
  terminalSession={terminalSession}
  terminalEnabled={terminalEnabled}
  chatWidthPercent={60}
/>
```

**Acceptance Criteria**:
- [ ] REPL renders without errors
- [ ] Two-pane layout displays when CLAUDE_CODE_TERMINAL=1
- [ ] Single-pane layout displays when CLAUDE_CODE_TERMINAL is unset
- [ ] Tab key switches focus between panes
- [ ] Terminal shows shell prompt and accepts input

---

### Phase 3: Bash Command Routing (Day 2-3)

#### 3.1 Add Terminal Execution Mode to BashTool
**File**: `tools/BashTool/BashTool.tsx`

Add new execution mode option:
```typescript
interface BashToolOptions {
  // ... existing options
  useTerminalPane?: boolean; // Execute in terminal pane instead of inline
}
```

Modify execute logic:
```typescript
async function executeCommand(
  command: string,
  options: BashToolOptions,
  context: ToolUseContext
): Promise<ExecResult> {
  // If terminal pane is enabled and user wants it, route there
  if (options.useTerminalPane && terminalSession.isRunning()) {
    const executionPromise = new Promise<ExecResult>((resolve) => {
      const outputChunks: string[] = [];

      const onOutput = (data: string) => {
        outputChunks.push(data);
      };

      const onExit = ({ exitCode }: { exitCode: number }) => {
        terminalSession.off('output', onOutput);
        terminalSession.off('exit', onExit);

        resolve({
          stdout: outputChunks.join(''),
          stderr: '',
          exitCode: exitCode || 0,
        });
      };

      terminalSession.on('output', onOutput);
      terminalSession.once('exit', onExit);
      terminalSession.execute(command);
    });

    // Return result after command completes
    return await executionPromise;
  }

  // Fall back to inline execution
  return await exec(command, { ... });
}
```

**Acceptance Criteria**:
- [ ] Commands can route to terminal pane
- [ ] Output captured and returned correctly
- [ ] Exit codes propagate correctly
- [ ] Fallback to inline execution works

#### 3.2 Add User Toggle for Terminal Execution
**File**: `components/PromptInput/PromptInput.tsx`

Add keyboard shortcut to toggle terminal execution mode:
```typescript
useInput((input, key) => {
  if (key.ctrl && input === 't') {
    setUseTerminalPane(p => !p);
    // Show notification
  }
});
```

Add visual indicator in prompt:
```typescript
{useTerminalPane && <Text color="green">[Terminal Mode]</Text>}
```

---

### Phase 4: Polish & Edge Cases (Day 3)

#### 4.1 Terminal Resize Handling
**File**: `components/Terminal/TerminalPane.tsx`

Ensure resize is debounced:
```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    const vt = getVirtualTerminal();
    vt.resize(cols, rows);
    session.resize(cols, rows);
    forceRender();
  }, 100);

  return () => clearTimeout(timeout);
}, [cols, rows, session, getVirtualTerminal]);
```

#### 4.2 Shell Exit Recovery
**File**: `components/Terminal/TerminalSession.ts`

Auto-restart shell on exit:
```typescript
this.ptyProcess.onExit(({ exitCode, signal }) => {
  this.emit('exit', { exitCode, signal });

  // Auto-restart unless explicitly killed
  if (signal !== 'SIGKILL' && signal !== 'SIGTERM') {
    setTimeout(() => this.start(), 100);
  }
});
```

#### 4.3 Scrollback Buffer
**File**: `components/Terminal/VirtualTerminal.ts`

Add scrollback buffer support:
```typescript
constructor(cols: number, rows: number) {
  this.terminal = new Terminal({
    cols,
    rows,
    scrollback: 1000, // Keep 1000 lines of scrollback
    // ...
  });
}
```

#### 4.4 Copy/Paste Support
**File**: `components/Terminal/TerminalPane.tsx`

Handle clipboard in terminal:
```typescript
useInput((input, key) => {
  if (key.ctrl && input === 'v') {
    // Paste from clipboard to terminal
    const clipboard = await getClipboard();
    session.write(clipboard);
  }
});
```

---

### Phase 5: Testing & Validation (Day 3-4)

#### 5.1 Unit Tests
**New File**: `components/Terminal/__tests__/VirtualTerminal.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { VirtualTerminal } from '../VirtualTerminal';

describe('VirtualTerminal', () => {
  it('should render simple text', () => {
    const vt = new VirtualTerminal(80, 24);
    vt.write('Hello World');
    const screen = vt.getScreen();
    expect(screen).toContain('Hello World');
  });

  it('should handle ANSI colors', () => {
    const vt = new VirtualTerminal(80, 24);
    vt.write('\x1b[32mGreen Text\x1b[0m');
    const screen = vt.getScreen();
    expect(screen).toContain('Green Text');
  });

  it('should resize correctly', () => {
    const vt = new VirtualTerminal(80, 24);
    vt.write('Line 1\nLine 2');
    vt.resize(40, 12);
    const lines = vt.getScreenLines();
    expect(lines.length).toBeLessThanOrEqual(12);
  });
});
```

#### 5.2 Integration Tests
**New File**: `components/Terminal/__tests__/TerminalSession.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { TerminalSession } from '../TerminalSession';

describe('TerminalSession', () => {
  let session: TerminalSession;

  beforeEach(() => {
    session = new TerminalSession({ shell: '/bin/bash' });
  });

  afterEach(() => {
    session.destroy();
  });

  it('should spawn shell and emit output', async () => {
    const outputs: string[] = [];
    session.on('output', (data) => outputs.push(data));

    session.start();
    await new Promise(r => setTimeout(r, 500));

    expect(outputs.length).toBeGreaterThan(0);
  });

  it('should execute command and exit', async () => {
    const exitPromise = new Promise(resolve => {
      session.once('exit', resolve);
    });

    session.start();
    session.execute('exit 42');

    const exit = await exitPromise;
    expect(exit.exitCode).toBe(42);
  });
});
```

#### 5.3 MockDetectionEngine Validation
**New File**: `tests/terminal/anti-cheat.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';
import { MockDetectionEngine } from '../../src/testing/MockDetectionEngine';

describe('Terminal Integration - Anti-Cheat', () => {
  it('should pass MockDetectionEngine validation', async () => {
    const detector = new MockDetectionEngine();
    const result = await detector.analyzeDirectory(
      './tests/output/terminal-test'
    );

    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should record token usage for any LLM calls', async () => {
    // Verify that any agent LLM calls have token usage recorded
    // This is a requirement per CLAUDE.md Anti-Mock Principles
  });

  it('should have realistic response timing', async () => {
    // Verify no suspiciously fast responses (<50ms)
  });
});
```

#### 5.4 E2E Tests
**New File**: `tests/terminal/e2e.test.ts`

```typescript
import { describe, it, expect } from 'bun:test';

describe('Terminal E2E', () => {
  it('should display terminal alongside chat', async () => {
    // Launch app with CLAUDE_CODE_TERMINAL=1
    // Verify terminal pane renders
    // Verify chat pane renders
  });

  it('should switch focus with Tab', async () => {
    // Send Tab key
    // Verify terminal shows focus indicator
    // Send Tab again
    // Verify chat shows focus indicator
  });

  it('should execute command in terminal', async () => {
    // Focus terminal
    // Type command
    // Verify output appears
  });
});
```

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| node-pty build failures on some platforms | Medium | High | Document platform requirements, provide graceful fallback |
| Layout breaks on narrow terminals | High | Medium | Set minimum terminal width (60 cols), auto-disable below threshold |
| PTY process leaks | Medium | High | Implement proper cleanup in session.destroy(), add process.exit hooks |
| Focus management conflicts with existing | Medium | Medium | Use ink's focus context, test with existing dialogs |
| Performance with large terminal output | Medium | Medium | Virtualize rendering, limit scrollback buffer |
| Breaking change to FullscreenLayout API | Low | High | Maintain backward compatibility, TwoPaneLayout is additive |

---

## Acceptance Criteria

### Must Have (P0)
- [ ] Terminal pane renders alongside chat with horizontal split
- [ ] Persistent PTY session with node-pty
- [ ] xterm.js handles ANSI sequences correctly
- [ ] Tab key switches focus between panes
- [ ] All changes pass MockDetectionEngine validation
- [ ] No regressions to single-pane mode

### Should Have (P1)
- [ ] User can toggle terminal execution mode for bash commands
- [ ] Terminal auto-restarts on shell exit
- [ ] Visual focus indicators
- [ ] Resizable split (via config)

### Nice to Have (P2)
- [ ] Mouse support for terminal
- [ ] Terminal color scheme matches app theme
- [ ] Copy/paste integration
- [ ] Multiple terminal tabs

---

## Verification Steps

1. **Build Check**: `bun run build` completes without errors
2. **Type Check**: `bun run typecheck` passes
3. **Unit Tests**: `bun test components/Terminal` all pass
4. **Anti-Cheat**: MockDetectionEngine reports zero violations
5. **Manual Test**:
   ```bash
   CLAUDE_CODE_TERMINAL=1 bun run start
   # Verify: Two panes visible
   # Press Tab: Focus switches
   # Type in terminal: Shell responds
   ```
6. **Regression Test**: Without CLAUDE_CODE_TERMINAL, single pane works as before

---

## ADR (Architecture Decision Record)

### Decision
Implement horizontal split layout (Option A) with TwoPaneLayout wrapper component.

### Drivers
1. User need for persistent shell context
2. Current inline bash output is lossy for interactive programs
3. Chipilot proves two-pane TUI is viable and useful

### Alternatives Considered
- Modal overlay (B): Less discoverable, blocks chat view when open
- Tab switching (C): Cannot monitor terminal while viewing chat
- Inline terminal (D): Loses persistence, scrolls away

### Why Chosen
Horizontal split provides simultaneous visibility of chat and terminal, matching successful chipilot design. 60/40 split preserves adequate chat width while giving usable terminal space.

### Consequences
- Chat width reduced from 100% to 60%
- New keyboard shortcut (Tab) for pane switching
- Additional dependency on node-pty (native module)

### Follow-ups
- Monitor user feedback on default split ratio
- Consider draggable divider for dynamic resize
- Evaluate performance impact on low-width terminals

---

## Appendix: File Inventory

### New Files
```
components/Terminal/
├── TerminalPane.tsx          # Main terminal UI component
├── TerminalSession.ts        # PTY session management
├── VirtualTerminal.ts        # xterm.js wrapper
├── xterm-polyfill.ts         # Module polyfills
├── xterm-modules.ts          # Type definitions
└── __tests__/
    ├── TerminalPane.test.tsx
    ├── TerminalSession.test.ts
    └── VirtualTerminal.test.ts

components/TwoPaneLayout.tsx   # Split layout wrapper
state/terminalSession.ts       # Singleton session
```

### Modified Files
```
screens/REPL.tsx               # Use TwoPaneLayout, add imports
package.json                   # Add xterm/node-pty deps
tools/BashTool/BashTool.tsx    # Add terminal execution mode
components/PromptInput/
└── PromptInput.tsx            # Add terminal mode toggle
```

---

**Plan Version**: 1.0
**Created**: 2026-03-31
**Status**: Ready for Implementation
