// Import polyfill BEFORE any xterm imports
import "./xterm-polyfill.js";

import type { Terminal as TerminalType, SerializeAddon as SerializeAddonType } from "../types/xterm-modules.js";

// Import xterm packages after polyfill
import xtermHeadless from "xterm-headless";
import xtermAddonSerialize from "xterm-addon-serialize";

// Extract constructors
const Terminal = xtermHeadless.Terminal;
const SerializeAddon = xtermAddonSerialize.SerializeAddon;

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
    }) as TerminalType;

    this.serializeAddon = new SerializeAddon() as SerializeAddonType;
    this.terminal.loadAddon(this.serializeAddon);
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
