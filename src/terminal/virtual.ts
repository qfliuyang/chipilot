import { Terminal } from "xterm-headless";
import { SerializeAddon } from "xterm-addon-serialize";

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
  private terminal: Terminal;
  private serializeAddon: SerializeAddon;

  constructor(cols: number, rows: number) {
    this.terminal = new Terminal({
      cols,
      rows,
      cursorBlink: false,
      allowProposedApi: true,
    });

    this.serializeAddon = new SerializeAddon();
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
