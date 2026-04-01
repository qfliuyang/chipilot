// Import polyfill BEFORE any xterm imports
import "./xterm-polyfill.js";

// Import xterm packages after polyfill
import xtermHeadless from "xterm-headless";
import xtermAddonSerialize from "xterm-addon-serialize";

// Extract constructors from CommonJS modules
const { Terminal } = xtermHeadless;
const { SerializeAddon } = xtermAddonSerialize;

// Type definitions for xterm.js internals
interface IDisposable {
  dispose(): void;
}

type TerminalType = InstanceType<typeof Terminal>;
type SerializeAddonType = InstanceType<typeof SerializeAddon>;

/**
 * VirtualTerminal - Proper terminal emulation using xterm.js
 *
 * This renders the PTY output correctly, handling:
 * - Cursor positioning
 * - Colors and styles
 * - Scrolling
 * - Screen clearing
 */
export class VirtualTerminal {
  private terminal: TerminalType;
  private serializeAddon: SerializeAddonType;

  constructor(cols: number, rows: number) {
    this.terminal = new Terminal({
      cols,
      rows,
      cursorBlink: false,
      allowProposedApi: true,
      scrollback: 1000,
    }) as unknown as TerminalType;

    this.serializeAddon = new SerializeAddon() as unknown as SerializeAddonType;
    this.terminal.loadAddon(this.serializeAddon as unknown as { dispose(): void; activate(terminal: unknown): void });
  }

  write(data: string): void {
    this.terminal.write(data);
  }

  getScreen(): string {
    // Get the visible screen as plain text
    return this.serializeAddon.serialize();
  }

  getScreenLines(): string[] {
    const screen = this.getScreen();
    return screen.split("\n").slice(0, this.terminal.rows);
  }

  resize(cols: number, rows: number): void {
    this.terminal.resize(cols, rows);
  }

  destroy(): void {
    this.terminal.dispose();
  }
}
