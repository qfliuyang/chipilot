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
export interface VirtualTerminalOptions {
  scrollback?: number;
}

export class VirtualTerminal {
  private terminal: TerminalType;
  private serializeAddon: SerializeAddonType;

  constructor(cols: number, rows: number, options?: VirtualTerminalOptions) {
    // Note: scrollback is not in ITerminalOptions type but is accepted at runtime
    const terminalOptions = {
      cols,
      rows,
      cursorBlink: false,
      allowProposedApi: true,
      scrollback: options?.scrollback ?? 1000,
    } as unknown as ConstructorParameters<typeof Terminal>[0];
    this.terminal = new Terminal(terminalOptions) as TerminalType;

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

  /**
   * Returns current selection if any, otherwise empty string.
   * @deprecated Selection tracking not yet implemented - always returns empty string.
   * This is a placeholder for future selection implementation.
   */
  getSelection(): string {
    // TODO: Implement selection tracking for xterm-headless
    // This requires tracking mouse/keyboard selection state manually
    // since xterm-headless doesn't support selection natively
    return "";
  }

  resize(cols: number, rows: number): void {
    this.terminal.resize(cols, rows);
  }

  destroy(): void {
    this.terminal.dispose();
  }
}
